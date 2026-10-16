// src/quests/journal-ui.js
// ЖУРНАЛ И ПОДСКАЗКА О ЦЕЛИ. Окно журнала (клавиша J или нажатие на строку цели вверху) рисует то, что отдает
// questGame.journal() (src/core/journal.js): задания, выполненные, выводы, люди, сообщения. Игровые клавиши, пока
// журнал открыт, не работают (как в разговоре), Esc закрывает журнал. Под часами всегда видна текущая цель
// и расстояние до метки на карте.

(function () {
  const g = questGame;
  const css = document.createElement('style');
  css.textContent = `
    #questGoal { position: absolute; top: 62px; left: 50%; transform: translateX(-50%); z-index: 10; max-width: min(420px, 92vw);
      box-sizing: border-box; padding: 5px 12px; border-radius: 8px; background: rgba(0, 0, 0, 0.5); color: white;
      font: 13px/1.35 sans-serif; text-align: center; cursor: pointer; display: none; }
    #questGoal .title { font-size: 11px; opacity: 0.65; }
    #questGoal .dist { opacity: 0.7; }
    #questGoal:hover { background: rgba(40, 40, 40, 0.7); }
    #journal { position: fixed; inset: 0; z-index: 70; display: none; align-items: center; justify-content: center;
      background: rgba(0, 0, 0, 0.55); font-family: sans-serif; }
    #journal.on { display: flex; }
    #journal .win { width: min(640px, calc(100% - 24px)); height: min(520px, calc(100% - 24px)); display: flex; flex-direction: column;
      box-sizing: border-box; padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.4);
      background: rgba(10, 14, 20, 0.97); color: white; }
    #journal .head { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
    #journal .head .name { font-weight: bold; font-size: 16px; margin-right: auto; }
    #journal .tab { padding: 5px 9px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, 0.06); color: white; font: 13px sans-serif; cursor: pointer; }
    #journal .tab.on { background: rgba(143, 208, 255, 0.28); border-color: rgba(143, 208, 255, 0.7); }
    #journal .close { width: 32px; height: 32px; padding: 0; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.4);
      background: rgba(255, 255, 255, 0.08); color: white; font-size: 17px; cursor: pointer; }
    #journal .body { flex: 1; overflow-y: auto; touch-action: pan-y; -webkit-overflow-scrolling: touch; padding-right: 4px; }
    #journal .card { padding: 10px 12px; margin-bottom: 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.06); }
    #journal .card h3 { margin: 0 0 2px; font-size: 15px; color: #8fd0ff; }
    #journal .card .goal { font-size: 13px; opacity: 0.85; margin-bottom: 6px; }
    #journal .step { font-size: 14px; padding: 2px 0; }
    #journal .step.done { opacity: 0.6; }
    #journal .step .hint { display: block; font-size: 12px; opacity: 0.6; margin-left: 20px; }
    #journal .meta { font-size: 12px; opacity: 0.6; margin-top: 6px; }
    #journal .track { margin-left: 6px; padding: 1px 7px; border-radius: 5px; border: 1px solid rgba(255, 216, 74, 0.7);
      background: none; color: #ffd84a; font-size: 11px; cursor: pointer; }
    #journal .row { padding: 8px 0; border-top: 1px solid rgba(255, 255, 255, 0.12); font-size: 14px; line-height: 1.45; }
    #journal .row .when { display: block; font-size: 11px; opacity: 0.55; }
    #journal .empty { opacity: 0.55; font-size: 14px; padding: 8px 0; }
  `;
  document.head.appendChild(css);

  const tabs = [
    ['tasks', 'Задания'],
    ['done', 'Выполненные'],
    ['facts', 'Выводы'],
    ['people', 'Люди'],
    ['messages', 'Сообщения'],
  ];
  let tab = 'tasks';
  let open = false;
  let drawnVersion = -1;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const root = el('div');
  root.id = 'journal';
  const win = el('div', 'win');
  const head = el('div', 'head');
  head.appendChild(el('span', 'name', 'Журнал'));
  const tabButtons = {};
  for (const [id, label] of tabs) {
    const b = el('button', 'tab', label);
    b.addEventListener('click', () => {
      tab = id;
      render();
    });
    tabButtons[id] = b;
    head.appendChild(b);
  }
  const closeBtn = el('button', 'close', '✕');
  closeBtn.title = 'Закрыть (J или Esc)';
  closeBtn.addEventListener('click', () => setOpen(false));
  head.appendChild(closeBtn);
  const body = el('div', 'body');
  win.append(head, body);
  root.appendChild(win);
  root.addEventListener('mousedown', (e) => {
    if (e.target === root) setOpen(false);
  });
  document.body.appendChild(root);

  const when = (min) => formatGameDateShort(min) + ', ' + formatGameTime(min);

  function card(t, done) {
    const c = el('div', 'card');
    const h = el('h3', '', t.title);
    if (!done && t.tracked) h.appendChild(el('span', 'meta', '  ★ текущее'));
    else if (!done) {
      const b = el('button', 'track', 'Сделать текущим');
      b.addEventListener('click', () => g.track(t.id));
      h.appendChild(b);
    }
    c.appendChild(h);
    if (t.goal) c.appendChild(el('div', 'goal', t.goal));
    for (const s of t.steps) {
      const row = el('div', 'step' + (s.done ? ' done' : ''), (s.done ? '✓ ' : '○ ') + s.text);
      if (s.hint) row.appendChild(el('span', 'hint', s.hint));
      c.appendChild(row);
    }
    if (t.giver) c.appendChild(el('div', 'meta', 'Выдал: ' + t.giver));
    return c;
  }

  function render() {
    drawnVersion = g.version;
    for (const [id] of tabs) tabButtons[id].classList.toggle('on', id === tab);
    const j = g.journal();
    body.textContent = '';
    const empty = (text) => body.appendChild(el('div', 'empty', text));
    if (tab === 'tasks') {
      j.tasks.forEach((t) => body.appendChild(card(t, false)));
      if (!j.tasks.length) empty('Сейчас заданий нет.');
    } else if (tab === 'done') {
      j.done.forEach((t) => body.appendChild(card(t, true)));
      if (!j.done.length) empty('Выполненных заданий пока нет.');
    } else if (tab === 'facts') {
      for (const f of j.facts) {
        const row = el('div', 'row', f.text);
        row.appendChild(el('span', 'when', when(f.at)));
        body.appendChild(row);
      }
      if (!j.facts.length) empty('Выводов пока нет: они появляются, когда вы узнаете что-то важное.');
    } else if (tab === 'people') {
      for (const p of j.people) {
        const row = el('div', 'row', p.name + (p.title ? ' — ' + p.title : ''));
        if (p.desc) row.appendChild(el('span', 'when', p.desc));
        body.appendChild(row);
      }
      if (!j.people.length) empty('Вы пока ни с кем не говорили.');
    } else {
      for (const m of j.messages.slice().reverse()) {
        const row = el('div', 'row', m.name + ': ' + m.text);
        row.appendChild(el('span', 'when', when(m.at)));
        body.appendChild(row);
      }
      if (!j.messages.length) empty('Сообщений нет.');
    }
  }

  // Пока журнал открыт, он считается «открытым разговором» (dialogueOpen): так игра не принимает ввод, а Esc в
  // src/engine/mouse-look.js закрывает открытое окно, а не открывает настройки (его проверка escOverlayOpen — константа,
  // обернуть ее нельзя). При переносе в основные файлы здесь будет свой флаг journalOpen в escOverlayOpen.
  function setOpen(value) {
    if (value === open || (value && (dialogueOpen || settingsOpen))) return;
    open = value;
    root.classList.toggle('on', open);
    if (open) {
      for (const k of Object.keys(keys)) keys[k] = false; // отпускаем зажатые клавиши
      if (document.exitPointerLock) document.exitPointerLock();
      dialogueOpen = true;
      render();
    } else if (!dialogueNode) {
      dialogueOpen = false; // если в это время не начался настоящий разговор
    }
  }

  // Пока журнал открыт, игровые клавиши не доходят до игры: слушатель на перехвате стоит раньше остальных
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.code === 'KeyJ' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.stopImmediatePropagation();
        setOpen(!open);
        return;
      }
      if (!open) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (e.code === 'Escape') setOpen(false);
    },
    true,
  );

  // ---------- Цель под часами ----------
  const goal = el('div');
  goal.id = 'questGoal';
  goal.title = 'Журнал (J)';
  goal.addEventListener('click', () => setOpen(true));
  document.body.appendChild(goal);

  const goalTitle = el('div', 'title');
  const goalText = el('div');
  const goalDist = el('span', 'dist');
  goal.append(goalTitle, goalText);
  let goalShown = '';

  function updateGoal() {
    const id = g.state.tracked;
    const step = id && g.currentStep(id);
    if (!step) {
      goal.style.display = 'none';
      goalShown = '';
      return;
    }
    const marker = g.currentMarker();
    const dist = marker ? Math.round(Math.hypot(marker.x - playerWorldX, marker.z - playerWorldZ)) : null;
    const text = step.text + (dist !== null && dist > marker.r ? ' · ' + dist + ' м' : '');
    const shown = id + '|' + text;
    goal.style.display = 'block';
    if (shown === goalShown) return;
    goalShown = shown;
    goalTitle.textContent = Core.registry.quests[id].title;
    goalText.textContent = text;
  }

  // Раз в полсекунды: цель под часами и, если журнал открыт, его содержимое
  setInterval(() => {
    updateGoal();
    if (open && drawnVersion !== g.version) render();
  }, 500);
  updateGoal();
})();
