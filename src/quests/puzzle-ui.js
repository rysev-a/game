// src/quests/puzzle-ui.js
// ОКНО ГОЛОВОЛОМКИ поверх игры (docs/mechanics/puzzles.md). Логику ведет ядро (src/core/puzzles.js), окно только
// показывает: котел с выбранным по порядку и кнопки частей. Пока окно открыто, игровые клавиши не работают
// (как в разговоре), Esc закрывает. Открывает его действие { puzzle: '2.05.elixir' } через host.openPuzzle.

(function () {
  const css = document.createElement('style');
  css.textContent = `
    #puzzle { position: absolute; inset: 0; z-index: 15; display: none; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.65); font-family: sans-serif; color: #fff; }
    #puzzle.on { display: flex; }
    #puzzle .panel { width: min(640px, 94vw); box-sizing: border-box; padding: 16px 18px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.4); background: rgba(10,14,20,0.97); }
    #puzzle .head { display: flex; align-items: center; margin-bottom: 10px; }
    #puzzle h2 { margin: 0; font-size: 20px; color: #8fd0ff; flex: 1; }
    #puzzle .x { cursor: pointer; padding: 2px 10px; border-radius: 6px; font-size: 18px; }
    #puzzle .x:hover { background: rgba(255,255,255,0.15); }
    #puzzle .pot { min-height: 74px; padding: 8px; border-radius: 8px; background: rgba(160,92,240,0.14);
      border: 1px dashed rgba(160,92,240,0.6); display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start; }
    #puzzle .chip { padding: 5px 9px; border-radius: 14px; background: #7a3fb0; font-size: 14px; }
    #puzzle .slot { padding: 5px 9px; border-radius: 14px; border: 1px dashed rgba(255,255,255,0.25); font-size: 14px; opacity: 0.5; }
    #puzzle .pieces { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin: 12px 0; }
    #puzzle button.piece { padding: 10px 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.3);
      background: rgba(255,255,255,0.09); color: #fff; font-size: 15px; cursor: pointer; }
    #puzzle button.piece:hover { background: rgba(143,208,255,0.3); }
    #puzzle button.piece.gone { visibility: hidden; }
    #puzzle .msg { min-height: 22px; font-size: 14px; }
    #puzzle .msg.bad { color: #ff9a8a; }
    #puzzle .msg.good { color: #7fd48a; }
    #puzzle .foot { display: flex; align-items: center; gap: 12px; font-size: 13px; opacity: 0.9; }
    #puzzle .hintBtn { cursor: pointer; padding: 3px 10px; border-radius: 6px; background: rgba(255,255,255,0.12); }
    #puzzle .hint { margin-top: 8px; font-size: 13px; line-height: 1.4; opacity: 0.85; display: none; }
    #puzzle .hint.on { display: block; }
    #puzzle .track { position: relative; height: 38px; margin: 6px 0 14px; border-radius: 19px; background: rgba(255,255,255,0.1); }
    #puzzle .zone { position: absolute; top: 0; bottom: 0; border-radius: 19px; background: rgba(127,212,138,0.35); border: 1px solid #7fd48a; }
    #puzzle .runner { position: absolute; top: 3px; width: 8px; height: 32px; margin-left: -4px; border-radius: 4px; background: #ffd84a; }
    #puzzle button.hit { grid-column: 1 / -1; padding: 14px; font-size: 17px; }
    #puzzle .dots { text-align: center; font-size: 20px; letter-spacing: 4px; margin: 6px 0; }
    #puzzle .shake { animation: puzzleShake 0.25s; }
    @keyframes puzzleShake { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
  `;
  document.head.appendChild(css);

  const root = document.createElement('div');
  root.id = 'puzzle';
  root.innerHTML = '<div class="panel"><div class="head"><h2></h2><div class="x" title="Закрыть (Esc)">✕</div></div>' +
    '<div class="pot"></div><div class="pieces"></div><div class="msg"></div>' +
    '<div class="foot"><span class="hintBtn">? Подсказка</span><span class="miss"></span></div><div class="hint"></div></div>';
  document.body.appendChild(root);
  const panel = root.querySelector('.panel');
  const titleEl = root.querySelector('h2');
  const potEl = root.querySelector('.pot');
  const piecesEl = root.querySelector('.pieces');
  const msgEl = root.querySelector('.msg');
  const missEl = root.querySelector('.miss');
  const hintEl = root.querySelector('.hint');

  let session = null;
  let runnerEl = null;
  let raf = 0;
  let t0 = 0;
  const phaseNow = () => (1 - Math.cos(((performance.now() - t0) / 1000 / session.tempo) * Math.PI * 2)) / 2; // 0..1..0 по косинусу

  const say = (text, cls) => {
    msgEl.textContent = text;
    msgEl.className = 'msg' + (cls ? ' ' + cls : '');
  };

  function renderRhythm() {
    titleEl.textContent = session.title;
    potEl.replaceChildren();
    const dots = document.createElement('div');
    dots.className = 'dots';
    dots.textContent = '●'.repeat(session.progress) + '○'.repeat(session.total - session.progress);
    const track = document.createElement('div');
    track.className = 'track';
    const zone = document.createElement('div');
    zone.className = 'zone';
    zone.style.left = (0.5 - session.tolerance) * 100 + '%';
    zone.style.width = session.tolerance * 200 + '%';
    runnerEl = document.createElement('div');
    runnerEl.className = 'runner';
    track.append(zone, runnerEl);
    potEl.style.display = 'block';
    potEl.append(dots, track);
    piecesEl.replaceChildren();
    const b = document.createElement('button');
    b.className = 'piece hit';
    b.textContent = 'Качнуть мехи (Пробел)';
    b.addEventListener('click', hit);
    piecesEl.appendChild(b);
    missEl.textContent = 'Ошибок: ' + session.mistakes + ' из ' + (session.mistakesAllowed + 1);
    hintEl.textContent = session.hint;
  }

  function animate() {
    if (!session || session.kind !== 'rhythm') return;
    raf = requestAnimationFrame(animate);
    if (runnerEl) runnerEl.style.left = phaseNow() * 100 + '%';
  }

  // Нажатие в ритме: смотрим, где сейчас бегунок
  function hit() {
    if (!session || session.kind !== 'rhythm') return;
    const result = session.pick(phaseNow());
    if (result === 'wrong') {
      say('Мимо. Бейте, когда бегунок в зеленой зоне.', 'bad');
      panel.classList.remove('shake');
      void panel.offsetWidth;
      panel.classList.add('shake');
    } else if (result === 'reset') {
      say('Сбились с ритма. Начинайте сначала.', 'bad');
    } else if (result === 'solved') {
      renderRhythm();
      say('Ровно! Горн раскалился.', 'good');
      setTimeout(close, 900);
      return;
    } else {
      say('');
    }
    renderRhythm();
  }

  function render() {
    if (session.kind === 'rhythm') return renderRhythm();
    potEl.style.display = '';
    titleEl.textContent = session.title;
    potEl.replaceChildren();
    const label = (id) => session.pieces.find((p) => p.id === id).label;
    session.picked.forEach((id, i) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = i + 1 + '. ' + label(id);
      potEl.appendChild(chip);
    });
    for (let i = session.picked.length; i < session.total; i++) {
      const slot = document.createElement('span');
      slot.className = 'slot';
      slot.textContent = i + 1 + '.';
      potEl.appendChild(slot);
    }
    piecesEl.replaceChildren();
    for (const p of session.pieces) {
      const b = document.createElement('button');
      b.className = 'piece' + (session.picked.includes(p.id) ? ' gone' : '');
      b.textContent = p.label;
      b.addEventListener('click', () => choose(p.id));
      piecesEl.appendChild(b);
    }
    missEl.textContent = 'Ошибок: ' + session.mistakes + ' из ' + (session.mistakesAllowed + 1);
    hintEl.textContent = session.hint;
  }

  function choose(id) {
    if (!session) return;
    const result = session.pick(id);
    if (result === 'wrong') {
      say('Не то. Что-то должно быть раньше или позже.', 'bad');
      panel.classList.remove('shake');
      void panel.offsetWidth;
      panel.classList.add('shake');
    } else if (result === 'reset') {
      say('Все скисло. Начинайте сначала.', 'bad');
    } else if (result === 'solved') {
      render();
      say('Получилось!', 'good');
      setTimeout(close, 900);
      return;
    } else {
      say('');
    }
    render();
  }

  function close() {
    if (!session) return;
    cancelAnimationFrame(raf);
    session = null;
    root.classList.remove('on');
    if (!dialogueNode) dialogueOpen = false; // если в это время не начался настоящий разговор
  }

  // Окно открывает ядро (действие { puzzle }): сюда приходит сеанс головоломки
  window.openPuzzleUi = function openPuzzleUi(s) {
    if (session || dialogueOpen) return;
    session = s;
    for (const k of Object.keys(keys)) keys[k] = false; // отпускаем зажатые клавиши
    if (document.exitPointerLock) document.exitPointerLock();
    dialogueOpen = true; // пауза ввода, как у журнала (src/quests/journal-ui.js)
    hintEl.classList.remove('on');
    say('');
    render();
    root.classList.add('on');
    if (session.kind === 'rhythm') {
      t0 = performance.now();
      animate();
    }
  };

  root.querySelector('.x').addEventListener('click', close);
  root.querySelector('.hintBtn').addEventListener('click', () => hintEl.classList.toggle('on'));

  // Пока окно открыто, до игры доходит только Esc (закрыть)
  window.addEventListener(
    'keydown',
    (e) => {
      if (!session) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (e.code === 'Escape') close();
      else if (e.code === 'Space' && !e.repeat) hit();
    },
    true,
  );
})();
