// src/ui/main-menu.js
// ГЛАВНОЕ МЕНЮ. Классический экран при запуске игры: «Новая игра», «Загрузить», «Настройки». Появляется только на странице основного мира
// (GAME_LOCATION === 'main') и только при настоящем запуске: не при переходе между локациями (sessionStorage 'game.transit') и не с ?nomenu в адресе.
// Пока меню открыто, игра стоит (gameFrozen в src/quests/supers-ui.js смотрит на mainMenuOpen): телефон не звонит, таймеры и время не идут.
//
// Фон: картинка assets/menu/cover.png (16:9, герои справа, слева свободное место под кнопки; описание — docs/art/menu-art-prompt.md).
// Пока файла нет, рисуется запасная пиксельная сцена: ночной город, Максим, Вера, Штерн и киборг.
//
// «Новая игра» просто закрывает меню (страница и так начинает историю заново). «Загрузить» показывает знаки браслета (src/player/saves.js):
// клик по знаку возвращает в то мгновение, как и в игре, только браслет на руке для этого не нужен: он восстановится из сохранения.
// «Настройки» открывают обычное окно настроек поверх меню (src/engine/settings.js).

let mainMenuOpen = false;

(function () {
  if (typeof GAME_LOCATION === 'undefined' || GAME_LOCATION !== 'main') return;
  try {
    if (sessionStorage.getItem('game.transit')) return; // переход из другой локации или загрузка слота оттуда
  } catch (e) {
    /* без sessionStorage меню просто покажется */
  }
  if (/[?&]nomenu\b/.test(location.search)) return;

  const GAME_TITLE = 'Дело Веры';
  const GAME_TAGLINE = 'Максим вернулся, чтобы узнать, что случилось на самом деле';
  const COVER_URL = 'assets/menu/cover.png';

  mainMenuOpen = true;

  const css = document.createElement('style');
  css.textContent = `
    #mainMenu { position: fixed; inset: 0; z-index: 90; display: flex; align-items: center; background: #0a0d16; color: var(--c-text, #f1f3f5);
      font-family: var(--font, monospace); user-select: none; overflow: hidden; }
    #mainMenu.off { display: none; }
    #mainMenu .art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 92% 50%; image-rendering: pixelated; }
    #mainMenu .shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(6, 8, 14, 0.94) 0%, rgba(6, 8, 14, 0.82) 36%, rgba(6, 8, 14, 0.32) 52%, rgba(6, 8, 14, 0) 66%),
      linear-gradient(0deg, rgba(6, 8, 14, 0.7) 0%, rgba(6, 8, 14, 0) 28%); pointer-events: none; }
    #mainMenu .col { position: relative; width: min(440px, 86vw); margin-left: clamp(18px, 7vw, 110px); display: flex; flex-direction: column; gap: 10px; }
    #mainMenu h1 { margin: 0; font-size: clamp(32px, 6.4vw, 64px); line-height: 1.02; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 800;
      text-shadow: 0 3px 0 #000, 0 0 26px rgba(143, 208, 255, 0.35); }
    #mainMenu .tag { margin: 0 0 18px; color: var(--c-dim, rgba(241, 243, 245, 0.62)); font-size: var(--fs-text, 13px); line-height: 1.5; max-width: 34ch; }
    #mainMenu .btn { display: block; width: 100%; box-sizing: border-box; padding: 13px 18px; text-align: left; cursor: pointer; border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.28); background: rgba(12, 16, 22, 0.72); color: inherit; font: 700 var(--fs-h2, 16px) var(--font, monospace);
      letter-spacing: 0.06em; text-transform: uppercase; transition: background 0.12s, border-color 0.12s, transform 0.12s; }
    #mainMenu .btn:hover, #mainMenu .btn.sel { background: rgba(143, 208, 255, 0.22); border-color: var(--c-accent, #8fd0ff); transform: translateX(6px); }
    #mainMenu .btn[disabled] { opacity: 0.4; cursor: default; transform: none; background: rgba(12, 16, 22, 0.72); border-color: rgba(255, 255, 255, 0.18); }
    #mainMenu .ver { position: absolute; left: 14px; bottom: 10px; font-size: var(--fs-small, 11px); color: var(--c-dim, rgba(241, 243, 245, 0.62)); }
    #mainMenu .slots { display: grid; gap: 6px; max-height: 52vh; overflow-y: auto; scrollbar-width: thin; }
    #mainMenu .slot { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: var(--fs-text, 13px); line-height: 1.35;
      border: 1px solid rgba(255, 255, 255, 0.28); background: rgba(12, 16, 22, 0.78); }
    #mainMenu .slot:hover { background: rgba(143, 208, 255, 0.22); border-color: var(--c-accent, #8fd0ff); }
    #mainMenu .slot img.px { width: 32px; height: 32px; image-rendering: pixelated; flex: none; }
    #mainMenu .slot .t { opacity: 0.6; font-size: var(--fs-small, 11px); display: block; }
    #mainMenu .empty { color: var(--c-dim, rgba(241, 243, 245, 0.62)); font-size: var(--fs-text, 13px); line-height: 1.5; }
  `;
  document.head.appendChild(css);

  const root = document.createElement('div');
  root.id = 'mainMenu';
  document.body.appendChild(root);
  const art = document.createElement('canvas');
  art.className = 'art';
  root.appendChild(art);
  root.insertAdjacentHTML('beforeend', '<div class="shade"></div><div class="col"></div><div class="ver"></div>');
  const col = root.querySelector('.col');
  const verEl = root.querySelector('.ver');
  verEl.textContent = typeof GAME_VERSION === 'string' ? GAME_VERSION : '';

  // Номер версии (читаем тот же version.json, что окно версий в настройках; локально его пишет node tools/version.js)
  fetch('version.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((v) => (verEl.textContent = 'Версия ' + v.version + ' от ' + v.date))
    .catch(() => {});

  // ---------- Фон ----------
  const ctx = art.getContext('2d');
  const W = 320;
  const H = 180;
  art.width = W;
  art.height = H;
  ctx.imageSmoothingEnabled = false;
  const rect = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  // Запасная сцена: ночной город под луной и четверо героев справа
  function drawFallback() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#120f2a');
    sky.addColorStop(0.6, '#2a2150');
    sky.addColorStop(1, '#6a3a5a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) rect((i * 97) % W, (i * 53) % 90, 1, 1, i % 5 ? '#6f6aa0' : '#e8e2ff');
    ctx.fillStyle = '#e9e4d4';
    ctx.beginPath();
    ctx.arc(214, 40, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cfc9b6';
    for (const [cx, cy, r] of [[208, 36, 4], [220, 47, 3], [215, 30, 2]]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Город: два ряда силуэтов с горящими окнами
    for (const [layer, col2, top] of [[0, '#1a1634', 96], [1, '#0f0d22', 112]]) {
      for (let x = -4; x < W; x += 15 + ((x * 7) % 9)) {
        const h = 24 + ((x * 13 + layer * 31) % 46);
        const w = 11 + ((x * 5) % 8);
        rect(x, top + 58 - h - layer * 8, w, h + 40, col2);
        for (let wy = top + 60 - h - layer * 8; wy < top + 90; wy += 5) {
          for (let wx = x + 2; wx < x + w - 2; wx += 4) if (((wx * 31 + wy * 17) >> 2) % 5 === 0) rect(wx, wy, 2, 2, layer ? '#d9a24a' : '#8fd0ff');
        }
      }
    }
    rect(0, 140, W, 40, '#0b0a18');
    rect(0, 138, W, 2, '#3a2f5a');
    // Мокрая дорога с бликами
    for (let i = 0; i < 40; i++) rect((i * 71) % W, 144 + ((i * 11) % 30), 10 + (i % 5) * 4, 1, i % 3 ? '#1b1838' : '#3a2f5a');
    // Герои: [x, подошвы y, размер]
    const person = (x, y, s, o) => {
      const u = (n) => n * s;
      rect(x - u(3), y - u(18), u(2.4), u(18), o.legs); // ноги
      rect(x + u(0.6), y - u(18), u(2.4), u(18), o.legs);
      rect(x - u(3.4), y - u(2), u(3), u(2), '#101018'); // ботинки
      rect(x + u(0.4), y - u(2), u(3), u(2), '#101018');
      rect(x - u(4.4), y - u(36), u(8.8), u(19), o.torso); // туловище
      rect(x - u(6.4), y - u(35), u(2.2), u(16), o.arm || o.torso); // руки
      rect(x + u(4.2), y - u(35), u(2.2), u(16), o.arm || o.torso);
      rect(x - u(6.4), y - u(19.4), u(2.2), u(2.2), o.skin);
      rect(x + u(4.2), y - u(19.4), u(2.2), u(2.2), o.skin);
      rect(x - u(3), y - u(46), u(6), u(9), o.skin); // голова
      if (o.extra) o.extra(x, y, u);
    };
    // Вера: белый халат, русая коса, джинсы
    person(176, 158, 1.9, {
      legs: '#3a5a86', torso: '#e8ecef', skin: '#e2b08a',
      extra: (x, y, u) => {
        rect(x - u(3.4), y - u(48), u(6.8), u(4), '#7a4a32');
        rect(x + u(2.4), y - u(46), u(2), u(14), '#7a4a32');
        rect(x - u(1.4), y - u(36), u(2.8), u(18), '#8fb8d8');
        rect(x - u(2.2), y - u(41), u(1), u(1), '#1b1b22');
        rect(x + u(1.2), y - u(41), u(1), u(1), '#1b1b22');
      },
    });
    // Максим: красная кепка, черная футболка, джинсы
    person(206, 162, 2.1, {
      legs: '#3f6aa0', torso: '#17181c', arm: '#17181c', skin: '#d9a27a',
      extra: (x, y, u) => {
        rect(x - u(3.4), y - u(49), u(6.8), u(4), '#c43a3a');
        rect(x - u(3.4), y - u(46), u(8), u(1.4), '#a82f2f');
        rect(x - u(2.2), y - u(41), u(1), u(1), '#1b1b22');
        rect(x + u(1.2), y - u(41), u(1), u(1), '#1b1b22');
        rect(x - u(2), y - u(29), u(4), u(2), '#303238');
      },
    });
    // Штерн: серые волосы, очки, белый халат поверх черной водолазки
    person(238, 156, 2, {
      legs: '#1b1c22', torso: '#eef0f1', skin: '#dcb394',
      extra: (x, y, u) => {
        rect(x - u(3.4), y - u(48), u(6.8), u(3.6), '#b9bcc2');
        rect(x - u(1.6), y - u(37), u(3.2), u(17), '#16171b');
        rect(x - u(3), y - u(42), u(6), u(1.6), '#101015');
        rect(x - u(2.6), y - u(41.4), u(2), u(1.6), '#9ad0ff');
        rect(x + u(0.6), y - u(41.4), u(2), u(1.6), '#9ad0ff');
      },
    });
    // Киборг: высокий, в серой броне, красный визор, светящиеся голубые линии
    {
      const x = 272;
      const y = 164;
      const u = (n) => n * 2.6;
      rect(x - u(3.4), y - u(22), u(3), u(22), '#3d424b');
      rect(x + u(0.4), y - u(22), u(3), u(22), '#3d424b');
      rect(x - u(4.2), y - u(3), u(4), u(3), '#1a1c22');
      rect(x + u(0.2), y - u(3), u(4), u(3), '#1a1c22');
      rect(x - u(5.6), y - u(44), u(11.2), u(23), '#5a606b');
      rect(x - u(8), y - u(45), u(3), u(4), '#8a909c');
      rect(x + u(5), y - u(45), u(3), u(4), '#8a909c');
      rect(x - u(8), y - u(41), u(2.6), u(20), '#454a54');
      rect(x + u(5.4), y - u(41), u(2.6), u(20), '#454a54');
      rect(x - u(1), y - u(40), u(2), u(14), '#4ff0e0');
      rect(x - u(4.4), y - u(33), u(1), u(10), '#4ff0e0');
      rect(x + u(3.4), y - u(33), u(1), u(10), '#4ff0e0');
      rect(x - u(3.4), y - u(55), u(6.8), u(10.5), '#6a707c');
      rect(x - u(3), y - u(52), u(6), u(2.4), '#ff3b2f');
      rect(x - u(1.4), y - u(46), u(2.8), u(1), '#2a2d34');
    }
    // Дымка у земли
    const fog = ctx.createLinearGradient(0, 120, 0, H);
    fog.addColorStop(0, 'rgba(120, 90, 160, 0)');
    fog.addColorStop(1, 'rgba(120, 90, 160, 0.28)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 120, W, 60);
  }
  drawFallback();
  // Если рядом лежит готовая картинка, она закрывает запасную сцену
  const cover = new Image();
  cover.onload = () => {
    art.width = cover.naturalWidth;
    art.height = cover.naturalHeight;
    art.getContext('2d').drawImage(cover, 0, 0);
  };
  cover.src = COVER_URL;

  // ---------- Кнопки ----------
  let view = 'main';
  let sel = 0;
  const btn = (text, fn, disabled = false) => {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = text;
    if (disabled) b.disabled = true;
    else b.addEventListener('click', fn);
    return b;
  };
  const savedSlots = () => {
    const out = [];
    for (let i = 0; i < SAVE_SLOTS; i++) if (getSave(i)) out.push(i);
    return out;
  };
  function close() {
    mainMenuOpen = false;
    root.classList.add('off');
    window.removeEventListener('keydown', onKey, true);
  }
  function showMain() {
    view = 'main';
    col.innerHTML = '';
    const h = document.createElement('h1');
    h.textContent = GAME_TITLE;
    const tag = document.createElement('p');
    tag.className = 'tag';
    tag.textContent = GAME_TAGLINE;
    col.append(h, tag);
    const hasSaves = savedSlots().length > 0;
    col.append(
      btn('Новая игра', close),
      btn('Загрузить', showSlots, !hasSaves),
      btn('Настройки', () => {
        if (typeof setSettingsOpen === 'function') setSettingsOpen(true);
      }),
    );
    sel = 0;
    markSel();
  }
  function showSlots() {
    view = 'slots';
    col.innerHTML = '';
    const h = document.createElement('h1');
    h.textContent = 'Загрузить';
    const tag = document.createElement('p');
    tag.className = 'tag';
    tag.textContent = 'Нажмите на знак, и вы окажетесь в том мгновении, которое запомнил браслет.';
    col.append(h, tag);
    const list = document.createElement('div');
    list.className = 'slots';
    for (const i of savedSlots()) {
      const s = document.createElement('div');
      s.className = 'slot';
      s.appendChild(pixelIcon(glyphIconId(i)));
      const t = document.createElement('div');
      const [first, ...rest] = saveTitle(i).split(' · ');
      t.textContent = first + ' · ' + (rest[0] || '');
      const sub = document.createElement('span');
      sub.className = 't';
      sub.textContent = rest.slice(1).join(' · ');
      t.appendChild(sub);
      s.appendChild(t);
      s.addEventListener('click', () => {
        const data = getSave(i);
        if (!data || data.version !== SAVE_VERSION) return;
        close();
        applyGame(data); // из меню браслет на руке не нужен: он вернется вместе с сохранением
      });
      list.appendChild(s);
    }
    if (!list.children.length) {
      const e = document.createElement('div');
      e.className = 'empty';
      e.textContent = 'Знаков пока нет: браслет Веры запомнит мгновения, когда вы его найдете.';
      list.appendChild(e);
    }
    col.append(list, btn('Назад', showMain));
    sel = -1;
  }
  const buttons = () => [...col.querySelectorAll('.btn:not([disabled])')];
  function markSel() {
    buttons().forEach((b, i) => b.classList.toggle('sel', i === sel));
  }
  function onKey(e) {
    if (typeof settingsOpen !== 'undefined' && settingsOpen) return; // в окне настроек клавиши свои
    if (e.code === 'ArrowDown' || e.code === 'KeyS') sel = Math.min(buttons().length - 1, sel + 1);
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') sel = Math.max(0, sel - 1);
    else if (e.code === 'Enter' || e.code === 'Space') {
      const b = buttons()[Math.max(0, sel)];
      if (b) b.click();
    } else if (e.code === 'Escape' && view === 'slots') showMain();
    else if (e.code === 'KeyO') return; // настройки открываются и клавишей
    markSel();
    e.stopImmediatePropagation(); // пока меню открыто, игра клавиш не получает
    e.preventDefault();
  }
  window.addEventListener('keydown', onKey, true);
  // Окно настроек и история версий должны быть выше меню
  const raise = () => {
    const sm = document.getElementById('settingsMenu');
    if (sm) sm.style.zIndex = 95;
    const vh = document.getElementById('versionHistory');
    if (vh) vh.style.zIndex = 96;
  };
  raise();
  setTimeout(raise, 1500);
  showMain();
})();
