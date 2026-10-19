// src/quests/supers-ui.js
// ОКНО СУПЕР-ПРЕДМЕТА. Когда герой впервые получает супер-предмет (телефон, рюкзак, браслет, прибор тканей, погодный прибор, артефакт, любое оружие),
// на весь экран открывается окно, время останавливается: слева предмет нарисован очень крупно (пиксельный рисунок с подсветкой), справа подробно
// рассказано, что он умеет и как им пользоваться. Тексты — данные (src/content/supers.js), условия показа — как у квестов (when), показанные запоминаются
// в сохранении (state.supers). Закрыть: кнопка «Понятно», Enter, E, пробел или Esc. Пока окно открыто, игровой цикл стоит (gameFrozen, src/engine/game.js),
// таймеры квестов тоже (host.paused). Если телефон должен зазвонить, а окно еще не показано, звонок ждет, пока окно закроют.
//
// Рисунки: SUPER_ART[id](pix) рисует на сетке 32×32 простыми фигурами; потом рисунок сам получает свет и тень по краям и темный контур,
// и растягивается без сглаживания (CSS image-rendering: pixelated). Оружие и прочие вещи рисуются из значков инвентаря (PIXEL_ART), вдвое крупнее.

let questSuperOpen = false;
const gameFrozen = () => questSuperOpen; // главный цикл (src/engine/game.js) на это время не двигает мир

(function () {
  const g = questGame;
  const N = 32;

  // ---------- Холст-сетка ----------
  function makePix() {
    const cells = new Array(N * N).fill(null);
    const inside = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
    const pix = {
      cells,
      set(x, y, c) {
        x = Math.round(x);
        y = Math.round(y);
        if (inside(x, y)) cells[y * N + x] = c;
      },
      rect(x, y, w, h, c) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pix.set(x + i, y + j, c);
      },
      circle(cx, cy, r, c) {
        for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) pix.set(x, y, c);
      },
      ellipse(cx, cy, rx, ry, r0, c, test) {
        // кольцо между долями r0 и 1 радиуса эллипса; test(x, y) — ограничение (например, только нижняя половина)
        for (let y = 0; y < N; y++) {
          for (let x = 0; x < N; x++) {
            const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
            if (d <= 1 && d >= r0 * r0 && (!test || test(x, y))) pix.set(x, y, c);
          }
        }
      },
      line(x1, y1, x2, y2, c) {
        const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
        for (let i = 0; i <= n; i++) pix.set(x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n, c);
      },
      poly(points, c) {
        // заливка многоугольника
        for (let y = 0; y < N; y++) {
          for (let x = 0; x < N; x++) {
            let inPoly = false;
            for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
              const [xi, yi] = points[i];
              const [xj, yj] = points[j];
              if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inPoly = !inPoly;
            }
            if (inPoly) pix.set(x, y, c);
          }
        }
      },
    };
    return pix;
  }

  const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const shade = (hex, k) => {
    const [r, gr, b] = hexToRgb(hex);
    const f = (v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
    return '#' + [f(r), f(gr), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
  };

  // Свет сверху-слева, тень снизу-справа, потом темный контур вокруг всего рисунка
  function finish(pix) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = N;
    const c = cv.getContext('2d');
    const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? null : pix.cells[y * N + x]);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const col = at(x, y);
        if (!col) continue;
        let k = 0;
        if (!at(x, y - 1)) k += 0.32;
        else if (at(x, y - 1) !== col) k += 0.12;
        if (!at(x - 1, y)) k += 0.14;
        if (!at(x, y + 1)) k -= 0.3;
        else if (at(x, y + 1) !== col) k -= 0.1;
        if (!at(x + 1, y)) k -= 0.14;
        c.fillStyle = k ? shade(col, k) : col;
        c.fillRect(x, y, 1, 1);
      }
    }
    c.fillStyle = '#0a0d13';
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (at(x, y)) continue;
        if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) c.fillRect(x, y, 1, 1);
      }
    }
    return cv;
  }

  // ---------- Рисунки ----------
  const SUPER_ART = {
    phone(p) {
      p.rect(9, 2, 14, 28, '#2b3242'); // корпус
      p.rect(10, 5, 12, 20, '#15305c'); // экран
      p.rect(10, 5, 12, 2, '#0d1b33'); // строка состояния
      p.rect(11, 5, 3, 1, '#c8ced6');
      p.rect(19, 5, 2, 1, '#37ff7a');
      p.rect(10, 7, 12, 14, '#2f6fb0'); // карта
      p.rect(11, 9, 4, 3, '#3f86c8');
      p.rect(17, 12, 4, 4, '#3f86c8');
      p.rect(11, 15, 3, 4, '#3f86c8');
      p.line(11, 19, 14, 17, '#37ff7a'); // путь к цели
      p.line(14, 17, 16, 14, '#37ff7a');
      p.line(16, 14, 19, 11, '#37ff7a');
      p.rect(19, 9, 3, 3, '#ffe27a'); // метка цели
      p.rect(10, 21, 12, 4, '#15305c'); // значки
      for (const x of [11, 14, 17, 20]) p.rect(x, 22, 2, 2, '#8fd0ff');
      p.circle(16, 27.5, 1.2, '#c8ced6'); // кнопка
      p.rect(14, 3, 4, 1, '#0d1018'); // динамик
    },
    bracelet(p) {
      // Ремешок — эллиптическое кольцо, сверху модуль с экраном
      p.ellipse(16, 18, 13, 9, 0.62, '#aeb6c2');
      p.ellipse(16, 18, 13, 9, 0.62, '#c9d0da', (x, y) => y < 14 && x < 16);
      p.rect(9, 5, 14, 11, '#3b4251'); // модуль
      p.rect(10, 6, 12, 9, '#0f2a1a'); // экран
      p.rect(11, 7, 10, 7, '#14402a');
      p.line(11, 11, 13, 11, '#37ff7a'); // «пульс»
      p.line(13, 11, 14, 8, '#37ff7a');
      p.line(14, 8, 16, 13, '#37ff7a');
      p.line(16, 13, 17, 11, '#37ff7a');
      p.line(17, 11, 20, 11, '#37ff7a');
      p.set(21, 6, '#8fd0ff'); // светодиод
      p.rect(8, 16, 2, 2, '#e0b840'); // заклепки
      p.rect(22, 16, 2, 2, '#e0b840');
      p.rect(14, 26, 4, 3, '#e0b840'); // застежка
    },
    backpack(p) {
      p.ellipse(16, 6.5, 5, 3.6, 0.58, '#3d4520', (x, y) => y <= 7); // ручка
      p.rect(7, 10, 18, 19, '#7c8a3c'); // корпус
      p.rect(5, 13, 3, 13, '#4f5a26'); // лямки
      p.rect(24, 13, 3, 13, '#4f5a26');
      p.rect(7, 10, 18, 9, '#65732f'); // клапан
      p.ellipse(16, 17.5, 9, 3, 0, '#65732f', (x, y) => y >= 18);
      p.rect(10, 21, 12, 7, '#566326'); // карман
      p.line(10, 22, 21, 22, '#d9c9a0'); // молния
      p.rect(14, 17, 4, 3, '#e0b840'); // пряжка
      // знак бесконечности на клапане
      p.ellipse(13.5, 13, 2.6, 2.2, 0.55, '#ffe27a');
      p.ellipse(18.5, 13, 2.6, 2.2, 0.55, '#ffe27a');
      p.set(16, 13, '#ffe27a');
    },
    regen(p) {
      // электроды сверху
      p.rect(9, 3, 2, 9, '#c8ced6');
      p.rect(21, 3, 2, 9, '#c8ced6');
      p.circle(10, 3.5, 1.8, '#ffe27a');
      p.circle(22, 3.5, 1.8, '#ffe27a');
      p.line(11, 6, 21, 6, '#e0732f'); // провод
      p.rect(5, 12, 22, 16, '#3a5a6b'); // корпус
      p.rect(7, 14, 10, 10, '#0e2a2a'); // экран
      p.rect(11, 15, 2, 8, '#37ff7a'); // крест
      p.rect(8, 18, 8, 2, '#37ff7a');
      p.circle(22, 18, 3.4, '#c8ced6'); // циферблат
      p.circle(22, 18, 2.4, '#10161f');
      p.line(22, 18, 23, 16, '#ffe27a');
      p.rect(19, 23, 6, 2, '#8a5fc4'); // индикатор эликсира
      p.rect(19, 23, 3, 2, '#c8a0f0');
      p.rect(6, 28, 3, 2, '#2a3340');
      p.rect(23, 28, 3, 2, '#2a3340');
    },
    weather(p) {
      p.line(22, 13, 25, 3, '#c8ced6'); // антенна
      p.line(23, 13, 26, 3, '#c8ced6');
      p.circle(25.5, 3.2, 2, '#ffe27a');
      p.rect(5, 13, 22, 15, '#2f4a6b'); // корпус
      p.rect(7, 15, 18, 9, '#102338'); // экран
      p.circle(12, 19, 3.2, '#ffd84a'); // солнце
      for (const [dx, dy] of [[0, -5], [0, 5], [-5, 0], [5, 0]]) p.set(12 + dx, 19 + dy, '#ffd84a');
      p.circle(20, 20, 2.4, '#e8eef5'); // облако
      p.circle(23, 19, 2, '#e8eef5');
      p.rect(18, 20, 6, 3, '#e8eef5');
      p.line(19, 23, 18, 25, '#8fd0ff'); // дождь
      p.line(22, 23, 21, 25, '#8fd0ff');
      p.rect(8, 25, 4, 2, '#e0732f'); // ручки
      p.rect(14, 25, 4, 2, '#37ff7a');
      p.rect(6, 28, 3, 2, '#1c2a40');
      p.rect(23, 28, 3, 2, '#1c2a40');
    },
    artifact(p) {
      // задняя половина кольца, кристалл, передняя половина кольца
      p.ellipse(16, 17, 14, 4.5, 0.82, '#8fd0ff', (x, y) => y < 17);
      p.poly([[16, 2], [25, 16], [16, 30], [7, 16]], '#a05cf0');
      p.poly([[16, 2], [16, 30], [7, 16]], '#c490ff');
      p.poly([[16, 8], [20, 16], [16, 24], [12, 16]], '#e8d4ff');
      p.line(16, 2, 16, 30, '#7a3fc0');
      p.ellipse(16, 17, 14, 4.5, 0.82, '#8fd0ff', (x, y) => y >= 17);
      for (const [x, y] of [[3, 6], [28, 8], [4, 26], [27, 25]]) {
        p.set(x, y, '#ffffff');
        p.set(x - 1, y, '#ffe27a');
        p.set(x + 1, y, '#ffe27a');
        p.set(x, y - 1, '#ffe27a');
        p.set(x, y + 1, '#ffe27a');
      }
    },
  };

  // Любой другой предмет и оружие: значок инвентаря 12×12, вдвое крупнее, по центру
  function iconArt(iconId) {
    return (p) => {
      const art = PIXEL_ART[iconId] || PIXEL_ART.keys;
      art.rows.forEach((row, y) => {
        for (let x = 0; x < 12; x++) {
          const ch = row[x];
          if (ch === '.' || !art.palette[ch]) continue;
          p.rect(4 + x * 2, 4 + y * 2, 2, 2, art.palette[ch]);
        }
      });
    };
  }

  const artCanvas = (name, iconId) => {
    const pix = makePix();
    (SUPER_ART[name] || iconArt(iconId || 'keys'))(pix);
    return finish(pix);
  };

  window.questSuperArt = artCanvas; // для проверок: холст рисунка по имени

  // ---------- Окно ----------
  const css = document.createElement('style');
  css.textContent = `
    #superModal { position: fixed; inset: 0; z-index: 95; display: none; align-items: center; justify-content: center; padding: var(--sp-4);
      box-sizing: border-box; background: radial-gradient(ellipse at 30% 50%, rgba(30, 44, 70, 0.96), rgba(5, 8, 12, 0.98)); color: var(--c-text); font-family: var(--font); }
    #superModal.on { display: flex; }
    #superModal .frame { width: min(1180px, 100%); height: min(720px, 100%); display: grid; grid-template-columns: minmax(280px, 2fr) 3fr; gap: var(--sp-5);
      box-sizing: border-box; padding: var(--sp-5); background: var(--c-bg); border: var(--bw) solid var(--c-border); border-radius: var(--r-lg); box-shadow: var(--shadow); }
    #superModal .left { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: var(--sp-3); min-height: 0; }
    #superModal .stage { position: relative; width: min(100%, 44vh, 400px); aspect-ratio: 1; display: flex; align-items: center; justify-content: center; }
    #superModal .stage::before { content: ''; position: absolute; inset: 6%; border-radius: 50%; background: radial-gradient(circle, rgba(143, 208, 255, 0.28), rgba(143, 208, 255, 0) 70%);
      animation: ui-pulse var(--pulse) ease-in-out infinite; }
    #superModal canvas { position: relative; width: 100%; height: 100%; image-rendering: pixelated; animation: ui-bob var(--pulse) ease-in-out infinite;
      filter: drop-shadow(0 10px 0 rgba(0, 0, 0, 0.35)); }
    #superModal .kicker { font-size: var(--fs-small); letter-spacing: 0.12em; text-transform: uppercase; color: var(--c-warm); }
    #superModal .name { font-size: var(--fs-h1); line-height: var(--lh-h1); font-weight: var(--fw-h1); }
    #superModal .tagline { font-size: var(--fs-text); line-height: var(--lh-text); color: var(--c-dim); max-width: 34ch; }
    #superModal .right { display: flex; flex-direction: column; min-height: 0; }
    #superModal .scroll { flex: 1; overflow-y: auto; padding-right: var(--sp-3); touch-action: pan-y; }
    #superModal .scroll h2 { margin: var(--sp-4) 0 var(--sp-2); font-size: var(--fs-h2); line-height: var(--lh-h2); font-weight: var(--fw-h2); color: var(--c-accent); }
    #superModal .scroll h2:first-child { margin-top: 0; }
    #superModal .scroll p { margin: 0 0 var(--sp-2); font-size: var(--fs-text); line-height: var(--lh-text); }
    #superModal .foot { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); padding-top: var(--sp-3); margin-top: var(--sp-3); border-top: var(--bw) solid var(--c-border); }
    #superModal .foot span { font-size: var(--fs-small); color: var(--c-dim); }
    #superModal button { padding: var(--sp-2) var(--sp-5); border: var(--bw) solid var(--c-accent); border-radius: var(--r); background: var(--c-bg-hover); color: var(--c-text);
      font: var(--fw-h2) var(--fs-h2) var(--font); cursor: pointer; transition: background var(--dur) var(--ease); }
    #superModal button:hover { background: rgba(143, 208, 255, 0.4); }
    @media (max-width: 760px) { #superModal .frame { grid-template-columns: 1fr; overflow-y: auto; height: 100%; } #superModal .scroll { overflow: visible; } }
  `;
  document.head.appendChild(css);

  const root = document.createElement('div');
  root.id = 'superModal';
  root.innerHTML =
    '<div class="frame"><div class="left"><div class="stage"></div><div class="kicker"></div><div class="name"></div><div class="tagline"></div></div>' +
    '<div class="right"><div class="scroll"></div><div class="foot"><span>Время остановлено · Enter или E — закрыть</span><button type="button">Понятно</button></div></div></div>';
  document.body.appendChild(root);
  const stage = root.querySelector('.stage');
  const kickerEl = root.querySelector('.kicker');
  const nameEl = root.querySelector('.name');
  const taglineEl = root.querySelector('.tagline');
  const scrollEl = root.querySelector('.scroll');
  const okBtn = root.querySelector('button');

  // ---------- Очередь ----------
  // Что нужно показать: супер-предметы из данных и любое оружие, которое появилось у героя (по образцу weapon)
  function pending() {
    const out = g.pendingSupers().map((id) => ({ key: id, sp: Core.registry.supers[id], icon: null }));
    const tpl = Core.registry.supers.weapon;
    if (tpl && typeof WEAPONS !== 'undefined') {
      for (const id of Object.keys(WEAPONS)) {
        const key = 'weapon:' + id;
        if (g.state.supers[key] || !hasItem(id)) continue;
        const w = WEAPONS[id];
        out.push({ key, icon: (ITEMS[id] && ITEMS[id].icon) || w.icon || id, sp: { ...tpl, title: w.name, tagline: w.desc || '', art: 'weapon' } });
      }
    }
    return out;
  }

  let heldCall = null; // звонок, который ждет, пока окно закроют
  function show(item) {
    const { sp, key } = item;
    g.seeSuper(key);
    questSuperOpen = true;
    for (const k of Object.keys(keys)) keys[k] = false;
    if (document.exitPointerLock) document.exitPointerLock();
    dialogueOpen = true;
    stage.replaceChildren(artCanvas(sp.art, item.icon));
    kickerEl.textContent = sp.kicker || 'Супер-предмет';
    nameEl.textContent = sp.title;
    taglineEl.textContent = sp.tagline || '';
    scrollEl.textContent = '';
    for (const sec of sp.sections || []) {
      const h = document.createElement('h2');
      h.textContent = sec.title;
      scrollEl.appendChild(h);
      for (const line of sec.lines || []) {
        const p = document.createElement('p');
        p.textContent = line;
        scrollEl.appendChild(p);
      }
    }
    scrollEl.scrollTop = 0;
    root.classList.add('on');
  }

  function close() {
    if (!questSuperOpen) return;
    questSuperOpen = false;
    root.classList.remove('on');
    dialogueOpen = false;
    const next = pending()[0];
    if (next) show(next);
    else if (heldCall) {
      const call = heldCall;
      heldCall = null;
      origIncomingCall(call);
    }
  }
  okBtn.addEventListener('click', close);
  window.addEventListener(
    'keydown',
    (e) => {
      if (!questSuperOpen) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (['Enter', 'KeyE', 'Space', 'Escape'].includes(e.code) && !e.repeat) close();
    },
    true,
  );

  // Звонок телефона ждет окно: сначала рассказ о телефоне, потом звонок
  const origIncomingCall = questHost.incomingCall;
  questHost.incomingCall = (call) => {
    if (questSuperOpen || pending().length) heldCall = call;
    else origIncomingCall(call);
  };

  setInterval(() => {
    if (questSuperOpen || questCallOpen) return;
    const next = pending()[0];
    if (next) show(next);
  }, 250);
})();
