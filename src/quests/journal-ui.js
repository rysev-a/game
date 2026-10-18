// src/quests/journal-ui.js
// ТЕЛЕФОН ГЕРОЯ: ЖУРНАЛ, ЗВОНКИ И ПОДСКАЗКА О ЦЕЛИ. Журнал — это телефон героя: всё, что он знает о задании, он смотрит в нём (клавиша J
// или нажатие на строку цели вверху). Экран телефона рисует то, что отдает questGame.journal() (src/core/journal.js): задания,
// выполненные, выводы, люди, сообщения. Входящий звонок (действие { call }) — тот же телефон: звонит, герой отвечает, и открывается разговор;
// пока телефон звонит, игра на паузе (таймеры стоят). Игровые клавиши, пока
// журнал открыт, не работают (как в разговоре), Esc закрывает журнал. Под часами всегда видна текущая цель
// и расстояние до метки на карте.

(function () {
  const g = questGame;
  const css = document.createElement('style');
  css.textContent = `
    #questGoal { display: none !important; position: absolute; top: 62px; left: 50%; transform: translateX(-50%); z-index: 10; max-width: min(420px, 92vw);
      box-sizing: border-box; padding: 5px 12px; border-radius: 8px; background: rgba(0, 0, 0, 0.5); color: white;
      font: 13px/1.35 sans-serif; text-align: center; cursor: pointer; display: none; }
    #questGoal .title { font-size: 11px; opacity: 0.65; }
    #questGoal .dist { opacity: 0.7; }
    #questGoal:hover { background: rgba(40, 40, 40, 0.7); }
    #journal { position: fixed; inset: 0; z-index: 70; display: none; align-items: center; justify-content: center;
      background: rgba(0, 0, 0, 0.55); font-family: sans-serif; }
    #journal.on { display: flex; }
    .phoneShell { position: relative; width: min(440px, calc(100% - 16px)); height: min(900px, calc(100% - 16px)); display: flex; flex-direction: column;
      box-sizing: border-box; padding: 8px; border-radius: 40px; border: 2px solid #3a3f4a; background: #12151b; color: white;
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.7), inset 0 0 0 2px #05070a; }
    .phoneScreen { position: relative; flex: 1; display: flex; flex-direction: column; min-height: 0; border-radius: 32px; overflow: hidden;
      background: linear-gradient(180deg, #0d141f, #080c13); }
    .phoneStatus { display: flex; align-items: center; justify-content: space-between; padding: 9px 22px 4px; font-size: 12px; font-weight: bold; }
    .phoneNotch { position: absolute; top: 7px; left: 50%; transform: translateX(-50%); width: 84px; height: 18px; border-radius: 10px; background: #000; }
    .phoneHome { align-self: center; width: 110px; height: 4px; margin: 6px 0 7px; border-radius: 3px; background: rgba(255, 255, 255, 0.45); }
    #journal .head { display: flex; align-items: center; gap: 6px; padding: 8px 14px 8px; }
    #journal .head .name { font-weight: bold; font-size: 18px; margin-right: auto; }
    #journal .close { width: 30px; height: 30px; padding: 0; border-radius: 15px; border: 1px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.08); color: white; font-size: 15px; cursor: pointer; }
    #journal .body { flex: 1; overflow-y: auto; touch-action: pan-y; -webkit-overflow-scrolling: touch; padding: 0 12px 6px; }
    #journal .dock { display: flex; border-top: 1px solid rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.04); }
    #journal .tab { flex: 1; padding: 7px 0 5px; border: 0; background: none; color: rgba(255, 255, 255, 0.55); font: 10px sans-serif; cursor: pointer; }
    #journal .tab .ico { display: block; font-size: 19px; line-height: 1.2; }
    #journal .tab.on { color: #8fd0ff; background: rgba(143, 208, 255, 0.1); }
    #journal .card { padding: 10px 12px; margin-bottom: 10px; border-radius: 14px; background: rgba(255, 255, 255, 0.07); }
    #journal .card h3 { margin: 0 0 2px; font-size: 15px; color: #8fd0ff; }
    #journal .card .goal { font-size: 13px; opacity: 0.85; margin-bottom: 6px; }
    #journal .step { font-size: 14px; padding: 2px 0; }
    #journal .step.done { opacity: 0.6; }
    #journal .step .hint { display: block; font-size: 12px; opacity: 0.6; margin-left: 20px; }
    #journal .meta { font-size: 12px; opacity: 0.6; margin-top: 6px; }
    #journal .track { margin-left: 6px; padding: 1px 7px; border-radius: 9px; border: 1px solid rgba(255, 216, 74, 0.7);
      background: none; color: #ffd84a; font-size: 11px; cursor: pointer; }
    #journal .row { padding: 8px 10px; margin-bottom: 6px; border-radius: 12px; background: rgba(255, 255, 255, 0.06); font-size: 14px; line-height: 1.45; }
    #journal .row .when { display: block; font-size: 11px; opacity: 0.55; }
    #journal .empty { opacity: 0.55; font-size: 14px; padding: 8px 0; }
    #phoneCall { position: fixed; inset: 0; z-index: 80; display: none; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.6); font-family: sans-serif; }
    #phoneCall.on { display: flex; }
    #phoneCall .phoneShell { animation: phoneShake 0.9s infinite; height: min(560px, calc(100% - 24px)); width: min(360px, calc(100% - 16px)); }
    #phoneCall .callScreen { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 70px 20px 24px; text-align: center; }
    #phoneCall .avatar { width: 96px; height: 96px; border-radius: 48px; display: flex; align-items: center; justify-content: center; font-size: 44px;
      background: linear-gradient(135deg, #3a7bd5, #2a3d66); box-shadow: 0 0 0 0 rgba(143, 208, 255, 0.6); animation: phonePulse 1.4s infinite; }
    #phoneCall .who { margin-top: 16px; font-size: 26px; font-weight: bold; }
    #phoneCall .sub { margin-top: 4px; opacity: 0.65; font-size: 14px; }
    #phoneCall .answer { margin-top: auto; width: 72px; height: 72px; border-radius: 36px; border: 0; background: #2fbf5f; color: white; font-size: 32px; cursor: pointer; }
    #phoneCall .hint { margin-top: 10px; font-size: 12px; opacity: 0.6; }
    #journal .appGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 4px; }
    #journal .app { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 4px 10px; border: 0; border-radius: 18px;
      background: rgba(255, 255, 255, 0.07); color: white; font: 12px sans-serif; cursor: pointer; }
    #journal .app:hover { background: rgba(143, 208, 255, 0.16); }
    #journal .app .ico { font-size: 34px; line-height: 1.1; }
    #journal .app.hot { box-shadow: 0 0 0 2px #ffd84a; animation: phonePulse 1.4s infinite; }
    #journal .sect { margin: 10px 2px 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.55; }
    #journal .bubble { max-width: 86%; margin: 0 0 8px; padding: 8px 11px; border-radius: 16px 16px 16px 4px; background: rgba(255, 255, 255, 0.1); font-size: 14px; line-height: 1.4; }
    #journal .bubble small { display: block; font-size: 10px; opacity: 0.55; margin-bottom: 2px; }
    #journal .bubble.me { margin-left: auto; border-radius: 16px 16px 4px 16px; background: rgba(60, 130, 220, 0.45); }
    #journal .bigBtn { display: block; width: 100%; margin: 8px 0; padding: 12px; border: 0; border-radius: 14px; background: #2f7fd5; color: white; font: bold 15px sans-serif; cursor: pointer; }
    #journal .bigTimer { font: bold 54px/1.1 sans-serif; text-align: center; font-variant-numeric: tabular-nums; padding: 10px 0; }
    #journal .bigTimer.low { color: #ff6b5b; }
    #phoneBtnWrap { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; pointer-events: auto; }
    #phoneBtn { position: relative; width: 44px; height: 44px; padding: 0; border: 2px solid rgba(255, 255, 255, 0.55); border-radius: 10px; background: rgba(20, 24, 32, 0.8); cursor: pointer; display: none; align-items: center; justify-content: center; }
    #phoneBtn:hover { background: rgba(40, 60, 90, 0.9); }
    #phoneBtn.ring::after { content: ''; position: absolute; top: -4px; right: -4px; width: 12px; height: 12px; border-radius: 6px; background: #ff5a4a; }
    #phoneBtn img { width: 32px; height: 32px; image-rendering: pixelated; }
      @keyframes phoneShake { 0%, 100% { transform: translateX(0) rotate(0); } 10% { transform: translateX(-3px) rotate(-1deg); } 20% { transform: translateX(3px) rotate(1deg); } 30% { transform: translateX(-3px) rotate(-1deg); } 40% { transform: translateX(3px) rotate(1deg); } 50% { transform: translateX(0); } }
    @keyframes phonePulse { 0% { box-shadow: 0 0 0 0 rgba(143, 208, 255, 0.55); } 70% { box-shadow: 0 0 0 22px rgba(143, 208, 255, 0); } 100% { box-shadow: 0 0 0 0 rgba(143, 208, 255, 0); } }
  `;
  document.head.appendChild(css);

  // Приложения телефона: всё, что герой знает и умеет, лежит здесь (нужно записывать звонки, чтобы ничего не забыть)
  const apps = [
    ['calls', 'Звонки', '📞'],
    ['messages', 'Сообщения', '💬'],
    ['notes', 'Заметки', '📝'],
    ['tasks', 'Задания', '📋'],
    ['nav', 'Навигатор', '🧭'],
    ['timer', 'Таймер', '⏱'],
  ];
  const appTitle = Object.fromEntries(apps.map(([id, label]) => [id, label]));
  let screen = 'home'; // 'home' | id приложения | 'call:<номер звонка>'
  let open = false;
  let drawnVersion = -1;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  // Телефон: статус-строка с часами, заголовок экрана и содержимое
  const clockText = () => (typeof formatGameTime === 'function' ? formatGameTime(gameMinutes) : '');
  function phoneShell(inner) {
    const shell = el('div', 'phoneShell');
    const screenEl = el('div', 'phoneScreen');
    const status = el('div', 'phoneStatus');
    const time = el('span', '', clockText());
    status.append(time, el('span', '', '▂▄▆ 📶 🔋'));
    screenEl.append(el('div', 'phoneNotch'), status, ...inner);
    const home = el('div', 'phoneHome');
    shell.append(screenEl, home);
    return { shell, time, home };
  }

  const root = el('div');
  root.id = 'journal';
  const head = el('div', 'head');
  const backBtn = el('button', 'close', '‹');
  backBtn.title = 'Назад';
  backBtn.addEventListener('click', () => go(screen.startsWith('call:') ? 'calls' : 'home'));
  const headName = el('span', 'name', 'Телефон');
  const closeBtn = el('button', 'close', '✕');
  closeBtn.title = 'Закрыть (J или Esc)';
  closeBtn.addEventListener('click', () => setOpen(false));
  head.append(backBtn, headName, closeBtn);
  const body = el('div', 'body');
  const phone = phoneShell([head, body]);
  phone.home.title = 'На главный экран';
  phone.home.style.cursor = 'pointer';
  phone.home.addEventListener('click', () => go('home'));
  root.appendChild(phone.shell);
  root.addEventListener('mousedown', (e) => {
    if (e.target === root) setOpen(false);
  });
  document.body.appendChild(root);

  function go(next) {
    screen = next;
    // Навигатор — уже открыт в телефоне: с этого момента появляется миникарта (флаг nav, src/quests/gates.js)
    if (next === 'nav' && !g.state.flags.nav) g.run([{ flag: 'nav' }]);
    render();
  }

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
    // Кнопки квеста (quest.actions): тренировка, ожидание утра и т. п.; нажали — телефон закрывается и действие выполняется
    for (const a of t.actions || []) {
      const b = el('button', 'track', a.text);
      b.style.marginTop = '6px';
      b.style.display = 'block';
      b.addEventListener('click', () => {
        setOpen(false);
        g.doAction(t.id, a.id);
      });
      c.appendChild(b);
    }
    if (t.giver) c.appendChild(el('div', 'meta', 'Выдал: ' + t.giver));
    return c;
  }

  // Текущая цель и расстояние до метки (для главного экрана и навигатора)
  function goalInfo() {
    const id = g.state.tracked;
    const step = id && g.currentStep(id);
    if (!step) return null;
    const marker = g.currentMarker();
    const dist = marker ? Math.round(Math.hypot(marker.x - playerWorldX, marker.z - playerWorldZ)) : null;
    return { quest: Core.registry.quests[id].title, text: step.text, hint: step.hint || '', dist: dist !== null && dist > marker.r ? dist : null };
  }

  const fmtTimer = (left) => {
    const sec = Math.ceil(left);
    return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
  };

  function render() {
    drawnVersion = g.version;
    phone.time.textContent = clockText();
    const isCall = screen.startsWith('call:');
    headName.textContent = isCall ? 'Звонок' : screen === 'home' ? 'Телефон' : appTitle[screen];
    backBtn.style.visibility = screen === 'home' ? 'hidden' : 'visible';
    const j = g.journal();
    body.textContent = '';
    const empty = (text) => body.appendChild(el('div', 'empty', text));
    const row = (text, sub) => {
      const r = el('div', 'row', text);
      if (sub) r.appendChild(el('span', 'when', sub));
      body.appendChild(r);
      return r;
    };

    if (screen === 'home') {
      const gi = goalInfo();
      const banner = el('div', 'card');
      banner.appendChild(el('h3', '', gi ? gi.quest : 'Телефон'));
      banner.appendChild(el('div', 'goal', gi ? gi.text + (gi.dist !== null ? ' · ' + gi.dist + ' м' : '') : 'Сейчас заданий нет.'));
      if (gi && gi.hint) banner.appendChild(el('div', 'meta', gi.hint));
      body.appendChild(banner);
      const grid = el('div', 'appGrid');
      for (const [id, label, icon] of apps) {
        const b = el('button', 'app');
        b.append(el('span', 'ico', icon), document.createTextNode(label));
        if (id === 'nav' && !g.state.flags.nav) b.classList.add('hot');
        b.addEventListener('click', () => go(id));
        grid.appendChild(b);
      }
      body.appendChild(grid);
    } else if (screen === 'calls') {
      for (const c of g.state.calls.slice().reverse()) {
        const ch = Core.registry.characters[c.from];
        const r = el('div', 'row call');
        r.appendChild(el('b', '', (ch ? ch.name : c.from) + ' · входящий'));
        r.appendChild(el('span', 'when', when(c.at)));
        const b = el('button', 'track', '▶ Прослушать');
        b.addEventListener('click', () => go('call:' + c.id));
        r.appendChild(b);
        body.appendChild(r);
      }
      if (!g.state.calls.length) empty('Звонков пока не было. Все звонки записываются, чтобы ничего не забыть.');
    } else if (isCall) {
      const c = g.state.calls.find((x) => String(x.id) === screen.slice(5));
      if (c) {
        const ch = Core.registry.characters[c.from];
        row('Запись звонка: ' + (ch ? ch.name : c.from), when(c.at));
        for (const line of c.lines) {
          const b = el('div', 'bubble' + (line.me ? ' me' : ''), line.text);
          if (!line.me && line.who) b.insertBefore(el('small', '', line.who), b.firstChild);
          body.appendChild(b);
        }
        if (!c.lines.length) empty('Запись пуста.');
      }
    } else if (screen === 'messages') {
      for (const m of j.messages.slice().reverse()) row(m.name + ': ' + m.text, when(m.at));
      if (!j.messages.length) empty('Сообщений нет.');
    } else if (screen === 'notes') {
      if (j.facts.length) body.appendChild(el('div', 'sect', 'Выводы'));
      for (const f of j.facts) row(f.text, when(f.at));
      if (j.people.length) body.appendChild(el('div', 'sect', 'Люди'));
      for (const p of j.people) row(p.name + (p.title ? ' — ' + p.title : ''), p.desc);
      if (!j.facts.length && !j.people.length) empty('Заметок пока нет: выводы и знакомые появляются, когда вы узнаете что-то важное.');
    } else if (screen === 'tasks') {
      j.tasks.forEach((t) => body.appendChild(card(t, false)));
      if (!j.tasks.length) empty('Сейчас заданий нет.');
      if (j.done.length) body.appendChild(el('div', 'sect', 'Выполненные'));
      j.done.forEach((t) => body.appendChild(card(t, true)));
    } else if (screen === 'nav') {
      const gi = goalInfo();
      const card1 = el('div', 'card');
      card1.appendChild(el('h3', '', gi ? gi.quest : 'Навигатор'));
      card1.appendChild(el('div', 'goal', gi ? gi.text : 'Цели нет: заданий сейчас нет.'));
      if (gi && gi.dist !== null) card1.appendChild(el('div', 'step', 'До цели: ' + gi.dist + ' м'));
      if (gi && gi.hint) card1.appendChild(el('div', 'meta', gi.hint));
      body.appendChild(card1);
      const b = el('button', 'bigBtn', '🗺 Открыть карту');
      b.addEventListener('click', () => {
        setOpen(false);
        if (typeof setMapFullOpen === 'function') setMapFullOpen(true);
      });
      body.appendChild(b);
      body.appendChild(el('div', 'meta', 'Миникарта в углу экрана — это навигатор телефона: она показывает, куда ехать.'));
    } else if (screen === 'timer') {
      const t = g.currentTimer();
      if (t) {
        const c = el('div', 'card');
        c.appendChild(el('h3', '', t.text));
        const big = el('div', 'bigTimer', fmtTimer(t.left));
        if (t.left < t.total * 0.25) big.classList.add('low');
        c.appendChild(big);
        body.appendChild(c);
      } else empty('Таймер не запущен. Когда нужно будет успеть, герой заведет его на телефоне.');
    }
  }

  // Пока журнал открыт, он считается «открытым разговором» (dialogueOpen): так игра не принимает ввод, а Esc в
  // src/engine/mouse-look.js закрывает открытое окно, а не открывает настройки (его проверка escOverlayOpen — константа,
  // обернуть ее нельзя). При переносе в основные файлы здесь будет свой флаг journalOpen в escOverlayOpen.
  function setOpen(value, startScreen) {
    if (value && open && startScreen) {
      go(startScreen);
      return;
    }
    if (value === open || (value && (dialogueOpen || settingsOpen))) return;
    open = value;
    root.classList.toggle('on', open);
    if (open) {
      for (const k of Object.keys(keys)) keys[k] = false; // отпускаем зажатые клавиши
      if (document.exitPointerLock) document.exitPointerLock();
      dialogueOpen = true;
      screen = startScreen && !startScreen.startsWith('call:') ? startScreen : 'home';
      if (screen === 'nav' && !g.state.flags.nav) g.run([{ flag: 'nav' }]);
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
        if (!open && !hasItem('phone')) showToast('Телефон остался на столике в гостиной.', 2500);
        else setOpen(!open);
        return;
      }
      if (!open) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (e.code === 'Escape') {
        if (screen === 'home') setOpen(false);
        else go(screen.startsWith('call:') ? 'calls' : 'home');
      }
    },
    true,
  );

  // ---------- Значок телефона рядом с инвентарем ----------
  // Телефон героя — не просто инвентарь: в нем звонки, сообщения, заметки, задания, навигатор и таймер. Значок виден, когда телефон у героя
  const phoneWrap = el('div');
  phoneWrap.id = 'phoneBtnWrap';
  const phoneBtn = el('button');
  phoneBtn.id = 'phoneBtn';
  phoneBtn.title = 'Телефон (J)';
  phoneBtn.appendChild(pixelIcon(ITEMS.phone.icon));
  phoneBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(true);
  });
  phoneBtn.addEventListener('mousedown', (e) => e.stopPropagation());
  const timerSlot = el('span');
  timerSlot.id = 'phoneTimerSlot';
  phoneWrap.append(phoneBtn, timerSlot);
  const topLeftBox = document.getElementById('topLeft');
  topLeftBox.insertBefore(phoneWrap, topLeftBox.firstChild);
  setInterval(() => {
    phoneBtn.style.display = hasItem('phone') ? 'flex' : 'none';
  }, 300);

  // ---------- Запись звонков ----------
  // Пока идет разговор по телефону, каждая реплика и каждый выбранный ответ попадают в запись звонка (g.state.calls)
  let recording = null;
  const origRenderDialogue = renderDialogue;
  renderDialogue = function () {
    origRenderDialogue();
    if (recording && dialogueNode) {
      recording.lines.push({ who: dialogueNode.speaker || '', text: dialogueNode.text });
      g.bump();
    }
  };
  const origChooseOption = chooseDialogueOption;
  chooseDialogueOption = function (i) {
    const opt = recording && dialogueNode && (dialogueNode.options || [])[i];
    if (opt) recording.lines.push({ who: 'Максим', text: opt.text, me: true });
    origChooseOption(i);
  };
  const origEndDialogue = endDialogue;
  endDialogue = function () {
    recording = null;
    origEndDialogue();
  };

  // ---------- Входящий звонок ----------
  // Действие { call: { from, dialog } } (src/core/effects.js): телефон звонит и трясется, пока герой не ответит (кнопка, Enter, E или Пробел);
  // после ответа открывается разговор. Пока звонит, игра на паузе (questCallOpen) — таймеры квестов стоят.
  const callRoot = el('div');
  callRoot.id = 'phoneCall';
  const callScreen = el('div', 'callScreen');
  const callAvatar = el('div', 'avatar', '☎');
  const callWho = el('div', 'who');
  const callAnswer = el('button', 'answer', '📞');
  callAnswer.title = 'Ответить (Enter)';
  callScreen.append(callAvatar, callWho, el('div', 'sub', 'Входящий звонок…'), callAnswer, el('div', 'hint', 'Enter или E — ответить'));
  callRoot.appendChild(phoneShell([callScreen]).shell);
  document.body.appendChild(callRoot);

  let ringCtx = null;
  let ringTimer = null;
  let pendingCall = null;
  function ringOnce() {
    try {
      if (typeof muted !== 'undefined' && muted) return;
      if (!ringCtx) ringCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (ringCtx.state === 'suspended') ringCtx.resume();
      const t = ringCtx.currentTime;
      [[0, 880], [0.18, 1040], [0.36, 880], [0.54, 1040]].forEach(([off, freq]) => {
        const osc = ringCtx.createOscillator();
        const gain = ringCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t + off);
        gain.gain.exponentialRampToValueAtTime(0.16, t + off + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.15);
        osc.connect(gain).connect(ringCtx.destination);
        osc.start(t + off);
        osc.stop(t + off + 0.17);
      });
    } catch (e) {
      /* звука нет — телефон звонит молча */
    }
  }

  function answerCall() {
    if (!pendingCall) return;
    const call = pendingCall;
    pendingCall = null;
    clearInterval(ringTimer);
    callRoot.classList.remove('on');
    questCallOpen = false;
    dialogueOpen = false;
    recording = call.record || null;
    g.host.openDialog(call.node);
  }
  callAnswer.addEventListener('click', answerCall);

  questHost.incomingCall = (call) => {
    if (pendingCall) return;
    pendingCall = call;
    const ch = Core.registry.characters[call.from];
    callWho.textContent = ch ? ch.name : call.from;
    callAvatar.textContent = ch && ch.name ? ch.name[0] : '☎';
    for (const k of Object.keys(keys)) keys[k] = false;
    if (document.exitPointerLock) document.exitPointerLock();
    questCallOpen = true;
    dialogueOpen = true;
    callRoot.classList.add('on');
    ringOnce();
    ringTimer = setInterval(ringOnce, 1500);
  };

  window.addEventListener(
    'keydown',
    (e) => {
      if (!pendingCall) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (e.code === 'Enter' || e.code === 'KeyE' || e.code === 'Space') answerCall();
    },
    true,
  );

  // ---------- Цель под часами ----------
  const goal = el('div');
  goal.id = 'questGoal';
  goal.title = 'Телефон (J)';
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
