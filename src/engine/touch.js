// src/engine/touch.js
// СЕНСОРНОЕ УПРАВЛЕНИЕ (телефон, планшет). Включается само на сенсорных экранах (touchUI из
// src/engine/scene.js), на компьютере — с ?touch в адресе. Клавиатура и мышь при этом работают как раньше.
//
//   левая часть экрана  — джойстик: где коснулись, там его центр. Вверх/вниз — W/S, влево/вправо — A/D
//                         (за рулем — руль). В боевом режиме: отклонили до упора — бег, чуть-чуть — шаг (Shift)
//   правая часть экрана — провести пальцем: вращать камеру и наклонять горизонт (как зажатое колесо мыши);
//                         два пальца — масштаб; короткое касание — что это (панель справа), взять вещь,
//                         а с оружием в руках — выстрел в эту точку
//   кнопки справа внизу — E действие, огонь (зажать — очередь / накопление заряда), прыжок,
//                         Q достать/убрать оружие, R следующее оружие, F выйти из машины, инвентарь
//
// Кнопки не дублируют логику игры: они шлют те же keydown/keyup, что и клавиатура, поэтому всё,
// что висит на клавишах (src/engine/input.js, weapons.js, driving.js, inventory.js, dialogue.js), работает само.

if (touchUI) {
  document.body.classList.add('touch');


  // ---------- Вид на телефоне ----------
  // Миникарта и панели поменьше, подсказки для клавиатуры скрыты, внизу справа — кнопки
  const touchStyle = document.createElement('style');
  touchStyle.textContent = `
    html, body.touch { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
    body.touch canvas { touch-action: none; }
    body.touch #fullscreenBtn { padding: 6px 10px; font-size: 18px; top: max(8px, env(safe-area-inset-top)); }
    body.touch #minimapWrap { top: 46px; width: 120px; height: 120px; }
    body.touch #minimap { width: 120px; height: 120px; }
    body.touch #mmInfo { display: none; }
    body.touch #hud { top: 172px; max-width: 150px; font-size: 11px; padding: 3px 8px; }
    /* Здоровье, эликсир и слоты оружия (src/player/equipment.js) — сверху под часами: низ экрана для пальцев */
    body.touch #equipHud { top: 44px; bottom: auto; transform: translateX(-50%) scale(0.7); transform-origin: top center; }
    /* Панель оружия (src/engine/weapons.js) — под ними, без подсказок для мыши и клавиатуры */
    body.touch #weaponHud { top: 92px !important; bottom: auto !important; left: 50% !important; right: auto !important;
      transform: translateX(-50%); min-width: 140px !important; padding: 4px 8px !important; font-size: 11px !important; }
    body.touch #weaponHud > div:nth-child(2), body.touch #weaponHint { display: none; }
    /* «Что это» — слева под инвентарем: справа внизу кнопки. Раскрыли инвентарь — панель прячется */
    body.touch #infoPanel { left: 10px; right: auto; top: 84px !important; width: 180px; font-size: 11px; padding: 6px 8px 8px; }
    body.touch #topLeft:has(#inventory.open) ~ #infoPanel { display: none; }
    /* Вертикально экран узкий: часы — под инвентарем, панели — колонкой под миникартой */
    @media (orientation: portrait) {
      body.touch #clock { top: 80px; left: 10px; transform: none; }
      body.touch #equipHud { top: 172px; transform: translateX(-50%) scale(0.5); }
      body.touch #weaponHud { top: 202px !important; }
      body.touch #hud { top: 240px; }
      body.touch #infoPanel { top: 240px !important; width: 170px; }
    }
    body.touch #clock { padding: 2px 10px; }
    body.touch #clockTime { font-size: 16px; }
    body.touch #inventory.open { width: min(372px, calc(100vw - 20px)); max-height: calc(100vh - 90px); overflow-y: auto; }
    body.touch #dialogue { bottom: 12px; }
    body.touch #prompt { bottom: 12px; font-size: 13px; }
    body.touch #toast { bottom: 64px; max-width: 60vw; text-align: center; }
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
      position: fixed; z-index: 20; right: max(12px, env(safe-area-inset-right)); bottom: max(12px, env(safe-area-inset-bottom));
      display: grid; grid-template-columns: repeat(4, 50px); grid-auto-rows: 50px; gap: 8px; direction: rtl;
    }
    .touchBtn {
      width: 50px; height: 50px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.45);
      background: rgba(10, 14, 20, 0.55); color: white; font: bold 20px sans-serif; padding: 0;
      touch-action: none; -webkit-tap-highlight-color: transparent;
    }
    .touchBtn.down { background: rgba(255, 216, 74, 0.45); border-color: #ffd84a; }
    #tbFire { background: rgba(160, 30, 30, 0.6); font-size: 24px; }
    #tbAct.big { background: rgba(30, 90, 50, 0.6); }
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
  const btnAct = addButton('tbAct', 'E', 'KeyE', false);
  addButton('tbJump', '⤒', 'Space', true);
  addButton('tbWeapon', 'Q', 'KeyQ', false);
  const btnNext = addButton('tbNext', 'R', 'KeyR', false);
  const btnExit = addButton('tbExit', 'F', 'KeyF', false);
  addButton('tbInv', 'I', 'KeyI', false);

  // Кнопки, которые нужны не всегда: огонь и смена оружия — с оружием в руках, F — в машине или у толкаемой
  let padState = '';
  function updateTouchPad() {
    const armed = !!heroWeapon.id;
    const inCar = !!(drivingCar || pushingCar);
    const state = armed + '|' + inCar;
    if (state !== padState) {
      padState = state;
      btnFire.style.display = armed ? '' : 'none';
      btnNext.style.display = armed ? '' : 'none';
      btnExit.style.display = inCar ? '' : 'none';
      btnAct.classList.toggle('big', !armed); // без оружия главная кнопка — действие
    }
    requestAnimationFrame(updateTouchPad);
  }
  updateTouchPad();

  // Держать телефон лучше горизонтально: один раз подскажем
  if (window.innerHeight > window.innerWidth) setTimeout(() => showToast('Удобнее играть, повернув телефон горизонтально', 4000), 1500);
}
