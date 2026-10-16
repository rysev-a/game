// src/engine/touch.js
// СЕНСОРНОЕ УПРАВЛЕНИЕ (телефон, планшет). Включается само на сенсорных экранах (touchUI из
// src/engine/scene.js), на компьютере — с ?touch в адресе. Клавиатура и мышь при этом работают как раньше.
//
//   только горизонтально: при первом касании — на весь экран с закрепленным поворотом (Android),
//                         держат вертикально — просьба повернуть телефон
//   левая часть экрана  — джойстик: где коснулись, там его центр. Вверх/вниз — W/S, влево/вправо — A/D
//                         (за рулем — руль). В боевом режиме: отклонили до упора — бег, чуть-чуть — шаг (Shift)
//   правая часть экрана — провести пальцем: вращать камеру и наклонять горизонт (как зажатое колесо мыши);
//                         два пальца — масштаб; короткое касание — что это (панель слева), взять вещь,
//                         а с оружием в руках — выстрел в эту точку
//   кнопки справа внизу — действие (E), огонь (зажать — очередь / накопление заряда), прыжок, выйти из машины (F)
//                         и значок оружия: касание — лента оружия, листается свайпом
//   слева внизу         — значок инвентаря (раскрывает его на весь экран) и тонкие полоски жизни и эликсира
//   справа внизу        — мелко дата и время: 01.01.2030 - 15:20
//
// Кнопки не дублируют логику игры: они шлют те же keydown/keyup, что и клавиатура, поэтому всё,
// что висит на клавишах (src/engine/input.js, weapons.js, driving.js, inventory.js, dialogue.js), работает само.

if (touchUI) {
  document.body.classList.add('touch');


  // ---------- Вид на телефоне ----------
  // Только горизонтально. На экране — минимум: тонкие полоски жизни и эликсира слева снизу (рядом значок
  // инвентаря), мелкие дата и время справа снизу, миникарта справа сверху и кнопки справа внизу.
  // Инвентарь и ячейки снаряжения открываются на весь экран по значку
  const touchStyle = document.createElement('style');
  touchStyle.textContent = `
    html, body.touch { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
    body.touch canvas { touch-action: none; }
    body.touch #fullscreenBtn { padding: 4px 9px; font-size: 16px; top: max(8px, env(safe-area-inset-top)); }
    body.touch #settingsBtn { top: max(8px, env(safe-area-inset-top)); bottom: auto; left: auto; right: 58px;
      width: 34px; height: 34px; font-size: 20px; }
    body.touch #settingsMenu { top: 50px; bottom: auto; left: auto; right: 10px; }
    body.touch #minimapWrap { top: 50px; width: 120px; height: 120px; }
    body.touch #minimap { width: 120px; height: 120px; }
    body.touch #mmInfo, body.touch #clock, body.touch #mouseHint { display: none; }
    body.touch #hud { top: 176px; max-width: 150px; font-size: 10px; padding: 2px 8px; }
    /* Инвентарь и нижняя панель снаряжения (src/player/equipment.js) — только на весь экран по значку */
    body.touch #topLeft, body.touch #equipHud { display: none; }
    /* Раскрытый инвентарь — на весь экран: слева вещи (прокручиваются), справа неподвижная панель
       того, что сейчас на герое: браслет, броня, ботинки, оружие в ячейках и что в руках */
    body.touch.invOpen #topLeft {
      display: block; position: fixed; left: 0; top: 0; bottom: 0; right: 236px; z-index: 30; box-sizing: border-box;
      padding: max(12px, env(safe-area-inset-top)) 12px 12px max(12px, env(safe-area-inset-left));
      overflow-y: auto; -webkit-overflow-scrolling: touch; touch-action: pan-y; background: rgba(5, 8, 12, 0.92);
    }
    body.touch.invOpen #inventory.open { width: auto; max-width: 372px; margin: 0 auto; }
    #mEquip {
      position: fixed; top: 0; right: 0; bottom: 0; width: 236px; z-index: 31; box-sizing: border-box; display: none;
      flex-direction: column; gap: 10px; padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 12px 12px;
      background: rgba(14, 18, 26, 0.97); border-left: 1px solid rgba(255, 255, 255, 0.25); color: white; font: 13px sans-serif;
    }
    body.touch.invOpen #mEquip { display: flex; }
    #mEquip .head { display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 15px; }
    #mEquip .close { width: 32px; height: 32px; padding: 0; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.4);
      background: rgba(255, 255, 255, 0.08); color: white; font-size: 18px; }
    #mEquip .label { font-size: 11px; opacity: 0.6; margin-bottom: -4px; }
    #mHand { display: flex; align-items: center; gap: 10px; min-height: 44px; }
    #mHand .slot { width: 44px; height: 44px; box-sizing: border-box; border: 1px solid #ffd84a; border-radius: 6px;
      background: rgba(255, 216, 74, 0.18); display: flex; align-items: center; justify-content: center; }
    #mHand .px { width: 30px; height: 30px; image-rendering: pixelated; }
    body.touch #mEquip #equipHud {
      display: flex; position: static; transform: none; flex-direction: column; align-items: flex-start; gap: 10px;
      padding: 0; margin: 0; background: none; border: none; box-shadow: none;
    }
    body.touch #mEquip #equipHud .stat { display: none; }
    body.touch #mEquip #equipHud .group { padding-left: 0; border-left: none; flex-wrap: wrap; }
    body.touch #mEquip #equipHud .group::before { display: block; width: 100%; font-size: 11px; opacity: 0.6; margin-bottom: 2px; }
    body.touch #mEquip #equipHud .group:nth-of-type(3)::before { content: 'Снаряжение'; }
    body.touch #mEquip #equipHud .group:nth-of-type(4)::before { content: 'Оружие под рукой'; }
    body.touch.invOpen #touchPad, body.touch.invOpen #mStats, body.touch.invOpen #infoPanel { display: none; }
    /* Панель оружия (src/engine/weapons.js) — сверху по центру, без подсказок для мыши и клавиатуры */
    body.touch #weaponHud { top: 8px !important; bottom: auto !important; left: 50% !important; right: auto !important;
      transform: translateX(-50%); min-width: 140px !important; padding: 4px 8px !important; font-size: 11px !important; }
    body.touch #weaponHud > div:nth-child(2), body.touch #weaponHint { display: none; }
    /* «Что это» — слева сверху: справа внизу кнопки */
    body.touch #infoPanel { left: max(10px, env(safe-area-inset-left)); right: auto; top: 10px !important; width: 180px;
      font-size: 11px; padding: 6px 8px 8px; }
    body.touch #fuel { bottom: 34px; left: 12px; font-size: 13px; padding: 4px 8px; }
    body.touch #dialogue { bottom: 12px; }
    body.touch #prompt { bottom: 40px; font-size: 13px; }
    body.touch #toast { bottom: 64px; max-width: 60vw; text-align: center; }
    #mStats {
      position: fixed; z-index: 20; left: max(10px, env(safe-area-inset-left)); bottom: max(8px, env(safe-area-inset-bottom));
      display: flex; align-items: center; gap: 8px;
    }
    #mInvBtn {
      width: 34px; height: 34px; padding: 0; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.4);
      background: rgba(10, 14, 20, 0.6); display: flex; align-items: center; justify-content: center;
    }
    #mInvBtn .px { width: 22px; height: 22px; image-rendering: pixelated; pointer-events: none; }
    #mStats .bars { display: flex; flex-direction: column; gap: 3px; }
    #mStats .bar { width: 96px; height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.18); overflow: hidden; }
    #mStats .bar div { height: 100%; }
    #mClock {
      position: fixed; z-index: 20; right: max(12px, env(safe-area-inset-right)); bottom: max(4px, env(safe-area-inset-bottom));
      color: rgba(255, 255, 255, 0.75); font: 10px sans-serif; font-variant-numeric: tabular-nums;
      text-shadow: 0 0 3px rgba(0, 0, 0, 0.9); pointer-events: none;
    }
    #rotateNote {
      position: fixed; inset: 0; z-index: 100; display: none; align-items: center; justify-content: center; text-align: center;
      padding: 24px; background: #111; color: white; font: 18px/1.4 sans-serif;
    }
    #rotateNote .big { font-size: 56px; display: block; margin-bottom: 12px; }
    @media (orientation: portrait) { #rotateNote { display: flex; } }
    #joyBase {
      position: fixed; z-index: 20; width: 112px; height: 112px; margin: -56px 0 0 -56px; border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.35); background: rgba(0, 0, 0, 0.2); pointer-events: none; display: none;
    }
    #joyBase.on { display: block; }
    #joyKnob {
      position: absolute; left: 32px; top: 32px; width: 44px; height: 44px; border-radius: 50%;
      background: rgba(255, 255, 255, 0.45); border: 2px solid rgba(255, 255, 255, 0.7);
    }
    #touchPad {
      position: fixed; z-index: 20; right: max(12px, env(safe-area-inset-right)); bottom: max(22px, calc(env(safe-area-inset-bottom) + 14px));
      display: grid; grid-template-columns: repeat(3, 52px); grid-auto-rows: 52px; gap: 8px; direction: rtl;
    }
    .touchBtn {
      width: 52px; height: 52px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.45);
      background: rgba(10, 14, 20, 0.55); color: white; font: bold 22px sans-serif; padding: 0;
      display: flex; align-items: center; justify-content: center;
      touch-action: none; -webkit-tap-highlight-color: transparent;
    }
    .touchBtn .px { width: 32px; height: 32px; image-rendering: pixelated; pointer-events: none; }
    .touchBtn.down { background: rgba(255, 216, 74, 0.45); border-color: #ffd84a; }
    #tbFire { background: rgba(160, 30, 30, 0.6); }
    #tbAct { background: rgba(30, 90, 50, 0.6); }
    /* Выбор оружия: лента на весь экран, листается свайпом; что посередине — то и в руках */
    #weaponPicker {
      position: fixed; inset: 0; z-index: 40; display: none; flex-direction: column; justify-content: center;
      background: rgba(5, 8, 12, 0.82); color: white; font-family: sans-serif;
    }
    #weaponPicker.on { display: flex; }
    #wpStrip {
      display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 10px calc(50vw - 55px);
      scrollbar-width: none; touch-action: pan-x;
    }
    #wpStrip::-webkit-scrollbar { display: none; }
    .wpItem {
      flex: 0 0 110px; height: 110px; scroll-snap-align: center; border-radius: 12px; box-sizing: border-box;
      border: 2px solid rgba(255, 255, 255, 0.25); background: rgba(255, 255, 255, 0.06);
      display: flex; align-items: center; justify-content: center; opacity: 0.55; transition: opacity 0.15s, transform 0.15s;
    }
    .wpItem .px { width: 64px; height: 64px; image-rendering: pixelated; pointer-events: none; }
    .wpItem.center { opacity: 1; transform: scale(1.12); border-color: #ffd84a; background: rgba(255, 216, 74, 0.18); }
    #wpName { text-align: center; margin-top: 14px; font-size: 16px; font-weight: bold; min-height: 20px; }
  `;
  document.head.appendChild(touchStyle);

  const pressKey = (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code }));
  const releaseKey = (code) => window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  const canPlay = () => !settingsOpen && !dialogueOpen;
  const canvas = renderer.domElement;

  // Подсказки для клавиатуры на телефоне не нужны: внизу — кнопки, в #hud остается только зона и звук
  mouseHint.style.display = 'none';
  const hudEl = document.getElementById('hud');
  for (const n of [...hudEl.childNodes]) if (n.nodeType === Node.TEXT_NODE) n.remove();
  fullscreenBtn.textContent = '⛶';
  const fsChange = () => (fullscreenBtn.textContent = isFullscreen ? '✕' : '⛶');
  document.addEventListener('fullscreenchange', fsChange);
  document.addEventListener('webkitfullscreenchange', fsChange);

  // ---------- Джойстик ----------
  const joyRadius = 56; // насколько можно увести палец от центра (px)
  const joyDead = 0.3; // меньше этого — не идем
  const joyWalk = 0.75; // в боевом режиме меньше этого — шаг, больше — бег
  const joyBase = document.createElement('div');
  joyBase.id = 'joyBase';
  const joyKnob = document.createElement('div');
  joyKnob.id = 'joyKnob';
  joyBase.appendChild(joyKnob);
  document.body.appendChild(joyBase);

  let joyTouch = null; // { id, x, y } — палец джойстика и центр
  const joyKeys = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ShiftLeft'];
  const clearJoyKeys = () => joyKeys.forEach((k) => (keys[k] = false));

  function setJoy(dx, dy) {
    const len = Math.hypot(dx, dy);
    const k = len > joyRadius ? joyRadius / len : 1;
    joyKnob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    const nx = (dx * k) / joyRadius;
    const ny = (dy * k) / joyRadius;
    if (!canPlay()) return clearJoyKeys();
    keys['KeyW'] = ny < -joyDead;
    keys['KeyS'] = ny > joyDead;
    keys['KeyA'] = nx < -joyDead;
    keys['KeyD'] = nx > joyDead;
    keys['ShiftLeft'] = Math.min(1, len / joyRadius) < joyWalk; // слабо отклонили — в бою идем шагом
  }

  // ---------- Камера пальцем ----------
  const lookSensitivity = 0.008; // рад на пиксель
  const lookTiltSensitivity = 0.12;
  const tapMove = 12; // сдвинули палец меньше — это касание, а не поворот камеры
  const tapTime = 300; // мс
  let lookTouch = null; // { id, x, y, startX, startY, t, moved }
  let pinch = null; // { dist, zoom }
  const lookTouches = new Map(); // id → { x, y } — все пальцы на правой половине (для щипка)

  const toNdc = (x, y) => new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);

  // Короткое касание сцены: показать, что это, взять вещь, а с оружием — выстрелить туда
  function onTap(x, y) {
    if (!canPlay()) return;
    pickMouse = toNdc(x, y);
    updatePickHover(pickMouse);
    if (pickHovered()) return;
    if (heroWeapon.id) {
      const w = WEAPONS[heroWeapon.id];
      heroWeapon.holdAt = performance.now();
      if (!w.charge && !w.spinUp) fireWeapon(mouseAimPoint()); // с зарядом и раскруткой — кнопкой огня
    }
  }

  canvas.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault(); // без прокрутки, зума страницы и «мышиных» событий после касания
      if (settingsOpen) setSettingsOpen(false); // касание мимо меню закрывает его, как клик мышью
      for (const t of e.changedTouches) {
        if (!joyTouch && t.clientX < window.innerWidth * 0.45) {
          joyTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
          joyBase.style.left = t.clientX + 'px';
          joyBase.style.top = t.clientY + 'px';
          joyBase.classList.add('on');
          setJoy(0, 0);
          continue;
        }
        lookTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
        if (lookTouches.size === 1) {
          lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY, startX: t.clientX, startY: t.clientY, t: performance.now(), moved: false };
        } else if (lookTouches.size === 2) {
          const [a, b] = [...lookTouches.values()];
          pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom };
          lookTouch = null; // двумя пальцами камеру не крутим, только масштаб
        }
      }
    },
    { passive: false },
  );

  canvas.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (joyTouch && t.identifier === joyTouch.id) {
          setJoy(t.clientX - joyTouch.x, t.clientY - joyTouch.y);
          continue;
        }
        const p = lookTouches.get(t.identifier);
        if (!p) continue;
        p.x = t.clientX;
        p.y = t.clientY;
        if (lookTouch && t.identifier === lookTouch.id) {
          const dx = t.clientX - lookTouch.x;
          const dy = t.clientY - lookTouch.y;
          lookTouch.x = t.clientX;
          lookTouch.y = t.clientY;
          if (!lookTouch.moved && Math.hypot(t.clientX - lookTouch.startX, t.clientY - lookTouch.startY) < tapMove) continue;
          lookTouch.moved = true;
          pickMouse = null; // крутим камеру — подсветка вещи под пальцем уже не к месту
          worldRotation += dx * lookSensitivity;
          cameraHeight = Math.min(Math.max(cameraHeight - dy * lookTiltSensitivity, cameraHeightMin), cameraHeightMax);
          cameraHoldFrames = cameraHoldDelay; // как с мышью: после паузы камера сама встанет за игрока
        }
      }
      if (pinch && lookTouches.size >= 2) {
        const [a, b] = [...lookTouches.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        zoom = Math.min(Math.max((pinch.zoom * pinch.dist) / d, zoomMin), zoomMax); // развели пальцы — ближе
      }
    },
    { passive: false },
  );

  function onTouchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (joyTouch && t.identifier === joyTouch.id) {
        joyTouch = null;
        joyBase.classList.remove('on');
        clearJoyKeys();
        continue;
      }
      if (lookTouch && t.identifier === lookTouch.id) {
        const quick = performance.now() - lookTouch.t < tapTime;
        if (!lookTouch.moved && quick && e.type === 'touchend') onTap(t.clientX, t.clientY);
        lookTouch = null;
      }
      lookTouches.delete(t.identifier);
      if (lookTouches.size < 2) pinch = null;
    }
  }
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

  // В меню и разговоре ходить нельзя: отпускаем джойстик
  window.addEventListener('blur', clearJoyKeys);

  // ---------- Кнопки ----------
  const pad = document.createElement('div');
  pad.id = 'touchPad';
  document.body.appendChild(pad);

  // hold — кнопку держат (keydown при касании, keyup при отпускании), иначе — одно нажатие
  function addButton(id, label, code, hold) {
    const b = document.createElement('button');
    b.id = id;
    b.className = 'touchBtn';
    b.textContent = label;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      b.classList.add('down');
      pressKey(code);
      if (!hold) releaseKey(code);
    });
    const up = () => {
      if (!b.classList.contains('down')) return;
      b.classList.remove('down');
      if (hold) releaseKey(code);
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault()); // долгое нажатие — без меню
    pad.appendChild(b);
    return b;
  }

  const btnFire = addButton('tbFire', '🎯', 'KeyK', true); // K — огонь по взгляду с доводом (src/engine/weapons.js)
  addButton('tbAct', '✋', 'KeyE', false); // E — действие
  addButton('tbJump', '⤒', 'Space', true);
  const btnExit = addButton('tbExit', '🚪', 'KeyF', false); // F — выйти из машины / отпустить толкаемую

  // Кнопка оружия: значок того, что в руках (или в активной ячейке). Касание — выбор оружия
  const btnWeapon = document.createElement('button');
  btnWeapon.id = 'tbWeapon';
  btnWeapon.className = 'touchBtn';
  // По click, а не pointerdown: иначе тот же click попадет в только что открытую ленту и закроет ее
  btnWeapon.addEventListener('click', () => {
    if (canPlay()) openWeaponPicker();
  });
  pad.appendChild(btnWeapon);

  // ---------- Выбор оружия свайпом ----------
  // Лента из «убрать оружие» и оружия в пяти ячейках снаряжения. Что остановилось посередине — то в руках;
  // касание по значку — сразу его. Касание мимо ленты закрывает выбор
  const picker = document.createElement('div');
  picker.id = 'weaponPicker';
  picker.innerHTML = '<div id="wpStrip"></div><div id="wpName"></div>';
  document.body.appendChild(picker);
  const strip = picker.querySelector('#wpStrip');
  const wpName = picker.querySelector('#wpName');
  let pickerIds = []; // null — убрать оружие
  let pickerCenter = -1;
  let pickerTimer = 0;

  function applyPick(id) {
    if (id === (heroWeapon.id || null)) return;
    if (id) drawWeapon(id);
    else holsterWeapon();
  }

  function centeredIndex() {
    const mid = strip.scrollLeft + strip.clientWidth / 2;
    let best = 0;
    let bestD = Infinity;
    [...strip.children].forEach((el, i) => {
      const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      if (d < bestD) (bestD = d), (best = i);
    });
    return best;
  }

  function markCenter(i) {
    if (i === pickerCenter) return;
    pickerCenter = i;
    [...strip.children].forEach((el, k) => el.classList.toggle('center', k === i));
    const id = pickerIds[i];
    wpName.textContent = id ? WEAPONS[id].name : 'Без оружия';
  }

  function openWeaponPicker() {
    const ids = weaponSlotIds();
    if (!ids.length) return toggleWeapon(); // подскажет, где взять оружие
    pickerIds = [null, ...ids];
    strip.innerHTML = '';
    pickerIds.forEach((id, i) => {
      const el = document.createElement('div');
      el.className = 'wpItem';
      if (id) el.appendChild(pixelIcon((ITEMS[id] || {}).icon || id));
      else el.textContent = '✋';
      el.style.fontSize = '44px';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        applyPick(id);
        closeWeaponPicker();
      });
      strip.appendChild(el);
    });
    picker.classList.add('on');
    clearJoyKeys();
    const cur = Math.max(0, pickerIds.indexOf(heroWeapon.id || null));
    pickerCenter = -1;
    const el = strip.children[cur];
    strip.scrollLeft = el.offsetLeft + el.offsetWidth / 2 - strip.clientWidth / 2;
    markCenter(cur);
  }

  function closeWeaponPicker() {
    clearTimeout(pickerTimer);
    picker.classList.remove('on');
  }

  strip.addEventListener('scroll', () => {
    if (!picker.classList.contains('on')) return;
    markCenter(centeredIndex());
    // Лента остановилась — берем то, что посередине
    clearTimeout(pickerTimer);
    pickerTimer = setTimeout(() => applyPick(pickerIds[centeredIndex()]), 180);
  });
  picker.addEventListener('click', (e) => {
    if (e.target === picker || e.target === wpName) closeWeaponPicker();
  });

  // ---------- Полоски жизни и эликсира, значок инвентаря, дата и время ----------
  PIXEL_ART.bag = PIXEL_ART.bag || {
    palette: { b: '#8a5a2b', d: '#5c3a1a', y: '#e0b040' },
    rows: [
      '............',
      '....dddd....',
      '...d....d...',
      '...d....d...',
      '.bbbbbbbbbb.',
      '.bdbbbbbbdb.',
      '.bbbbyybbbb.',
      '.bbbbyybbbb.',
      '.bbbbbbbbbb.',
      '.bbbbbbbbbb.',
      '.dddddddddd.',
      '............',
    ],
  };
  const stats = document.createElement('div');
  stats.id = 'mStats';
  stats.innerHTML =
    '<button id="mInvBtn"></button><div class="bars">' +
    '<div class="bar"><div id="mHp" style="background:#e0483a"></div></div>' +
    '<div class="bar"><div id="mElixir" style="background:#a05cf0"></div></div></div>';
  document.body.appendChild(stats);
  const invBtn = stats.querySelector('#mInvBtn');
  invBtn.appendChild(pixelIcon('bag'));
  invBtn.addEventListener('click', () => setInventoryOpen(!inventoryOpen));
  const hpEl = stats.querySelector('#mHp');
  const elixirEl = stats.querySelector('#mElixir');

  const clockEl = document.createElement('div');
  clockEl.id = 'mClock';
  document.body.appendChild(clockEl);
  const pad2 = (n) => String(n).padStart(2, '0');
  // «01.01.2030 - 15:20»
  function formatTouchClock() {
    const d = gameDateTime();
    return (
      pad2(d.getUTCDate()) + '.' + pad2(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear() + ' - ' +
      pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes())
    );
  }

  // Правая половина раскрытого инвентаря: что в руках и панель снаряжения (переезжает сюда целиком)
  const equipPanel = document.createElement('div');
  equipPanel.id = 'mEquip';
  equipPanel.innerHTML =
    '<div class="head"><span>На герое</span><button class="close">✕</button></div>' +
    '<div class="label">В руках</div><div id="mHand"></div>';
  document.body.appendChild(equipPanel);
  equipPanel.appendChild(document.getElementById('equipHud'));
  equipPanel.querySelector('.close').addEventListener('click', () => setInventoryOpen(false));
  const handEl = equipPanel.querySelector('#mHand');
  let handShown;
  function updateHand() {
    const id = heroWeapon.id || null;
    if (id === handShown) return;
    handShown = id;
    handEl.innerHTML = '';
    const c = document.createElement('div');
    c.className = 'slot';
    c.appendChild(pixelIcon(id ? (ITEMS[id] || {}).icon || id : 'weaponSlot'));
    handEl.appendChild(c);
    const name = document.createElement('span');
    name.textContent = id ? WEAPONS[id].name : 'Ничего';
    handEl.appendChild(name);
  }

  const rotateNote = document.createElement('div');
  rotateNote.id = 'rotateNote';
  rotateNote.innerHTML = '<div><span class="big">⟳</span>Поверните телефон горизонтально</div>';
  document.body.appendChild(rotateNote);

  // Игра всегда горизонтальная: при первом касании — на весь экран и закрепить поворот
  // (так умеет Android; на iPhone остается подсказка повернуть телефон)
  function lockLandscape() {
    const root = document.documentElement;
    const lock = () => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {});
    if (getFullscreenElement()) return lock();
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!req) return;
    const r = req.call(root);
    if (r && r.then) r.then(lock).catch(() => {});
  }
  window.addEventListener('touchend', lockLandscape, { once: true });

  // Раз в кадр: какие кнопки нужны, значок оружия, полоски, часы, раскрыт ли инвентарь
  let padState = '';
  let statsState = '';
  let clockShownTouch = '';
  function updateTouchPad() {
    const armed = !!heroWeapon.id;
    const inCar = !!(drivingCar || pushingCar);
    const shown = heroWeapon.id || heroEquip.weapons[heroEquip.active] || weaponSlotIds()[0] || null;
    const state = armed + '|' + inCar + '|' + shown;
    if (state !== padState) {
      padState = state;
      btnFire.style.display = armed ? '' : 'none';
      btnExit.style.display = inCar ? '' : 'none';
      btnWeapon.innerHTML = '';
      btnWeapon.appendChild(pixelIcon(shown ? (ITEMS[shown] || {}).icon || shown : 'weaponSlot'));
      btnWeapon.style.opacity = armed ? '1' : '0.7';
    }
    const st = Math.ceil(heroStats.hp) + '|' + Math.ceil(heroStats.elixir);
    if (st !== statsState) {
      statsState = st;
      hpEl.style.width = Math.max(0, Math.min(100, (heroStats.hp / heroStats.maxHp) * 100)) + '%';
      elixirEl.style.width = Math.max(0, Math.min(100, (heroStats.elixir / heroStats.maxElixir) * 100)) + '%';
    }
    const t = formatTouchClock();
    if (t !== clockShownTouch) clockEl.textContent = clockShownTouch = t;
    document.body.classList.toggle('invOpen', inventoryOpen);
    if (inventoryOpen) updateHand();
    requestAnimationFrame(updateTouchPad);
  }
  updateTouchPad();
}
