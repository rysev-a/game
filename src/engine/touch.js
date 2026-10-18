// src/engine/touch.js
// СЕНСОРНОЕ УПРАВЛЕНИЕ (телефон, планшет). Включается само на сенсорных экранах (touchUI из
// src/engine/scene.js), на компьютере — с ?touch в адресе. Клавиатура и мышь при этом работают как раньше.
//
//   только горизонтально: при первом касании — на весь экран с закрепленным поворотом (Android),
//                         держат вертикально — просьба повернуть телефон
//   слева               — джойстик: стоит на месте, очерчен кругами; берется касанием его круга. Вверх/вниз — W/S, влево/вправо — A/D
//                         (за рулем — руль). В боевом режиме: отклонили до упора — бег, чуть-чуть — шаг (Shift)
//   правая часть экрана — провести пальцем: вращать камеру и наклонять горизонт (как зажатое колесо мыши);
//                         два пальца — масштаб; короткое касание — что это (сканер справа сверху, гаснет сам; с оружием в руках его нет), взять вещь
//   мирный режим        — справа внизу одна кнопка «в бой». Коснулись человека, двери, машины рядом — сразу
//                         действие (разговор, войти, сесть / выйти из машины); несколько действий рядом (этажи,
//                         дверь и машина) — меню выбора на весь экран; подсказка внизу — тоже кнопка.
//                         Разговор — на весь экран, ответы — крупными кнопками
//   боевой режим        — та же кнопка — прицел: зажать — огонь, не отпуская палец влево/вправо — камера,
//                         вверх/вниз — смена оружия. Слева внизу кнопка 🕊 — в мирный режим
//   внизу по центру     — оружие в ячейках маленькими значками: касание — в бой с ним, свайп — смена оружия
//   слева внизу         — значок инвентаря (раскрывает его на весь экран) и тонкие полоски жизни и эликсира
//   справа внизу        — мелко дата и время: 01.01.2030 - 15:20
//   наклон телефона     — гироскоп: точная доводка прицела, пока оружие в руках (выключается в настройках)
//
// Кнопки не дублируют логику игры: зовут то же, что клавиши (onInteract, drawWeapon, holsterWeapon, fireWeapon).

// Подсказка действия без клавиш: «E — войти» → «Войти» (зовется из updatePrompt, src/engine/game.js)
function touchPromptText(t) {
  t = t
    .replace('W/S — газ, A/D — руль, Space или правая кнопка мыши — ручник (занос). ', '')
    .replace(/\. F — [^.]*/, '')
    .replace(/^[EF](?: или F)? — /, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

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
    body.touch #fullscreenBtn { padding: 4px 9px; font-size: var(--fs-h2); top: max(8px, env(safe-area-inset-top)); }
    body.touch #settingsBtn { top: max(8px, env(safe-area-inset-top)); bottom: auto; left: auto; right: 58px;
      width: 34px; height: 34px; font-size: var(--fs-h1); }
    body.touch #settingsMenu { top: 50px; bottom: auto; left: auto; right: 10px; z-index: 40; max-height: calc(100vh - 60px); }
    body.touch #minimapWrap { top: 50px; width: 120px; height: 120px; }
    body.touch #minimap { width: 120px; height: 120px; }
    body.touch #mmInfo, body.touch #clock, body.touch #mouseHint { display: none; }
    body.touch #hud { top: 176px; max-width: 150px; font-size: var(--fs-small); padding: 2px 8px; }
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
    body.touch.invOpen #inventory .invGrid.items { max-height: none; overflow: visible; } /* прокручивается вся панель */
    /* Сохранения — полоса на всю ширину сверху (10 слотов), под ней вещи слева и снаряжение справа */
    body.touch.invOpen #inventory .invSaves {
      position: fixed; top: 0; left: 0; right: 0; height: 64px; z-index: 32; box-sizing: border-box;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      padding: max(8px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 8px max(12px, env(safe-area-inset-left));
      background: rgba(14, 18, 26, 0.98); border-bottom: 1px solid rgba(255, 255, 255, 0.25);
    }
    body.touch.invOpen #inventory .invSaves .invTools { margin: 0; padding: 0; border: none; }
    body.touch.invOpen #inventory .invSaves .invGrid.saves { margin: 0; }
    body.touch #inventory .invGrid.saves .px.dim { opacity: 0.3; }
    body.touch.invOpen.invSavesOn #topLeft, body.touch.invOpen.invSavesOn #mEquip { top: 64px; }
    #mEquip {
      position: fixed; top: 0; right: 0; bottom: 0; width: 236px; z-index: 31; box-sizing: border-box; display: none;
      flex-direction: column; gap: 10px; padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 12px 12px;
      background: rgba(14, 18, 26, 0.97); border-left: 1px solid rgba(255, 255, 255, 0.25); color: white; font: var(--fs-text) var(--font);
    }
    body.touch.invOpen #mEquip { display: flex; }
    #mEquip .head { display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: var(--fs-h2); }
    #mEquip .close { width: 32px; height: 32px; padding: 0; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.4);
      background: rgba(255, 255, 255, 0.08); color: white; font-size: var(--fs-h2); }
    #mEquip .label { font-size: var(--fs-small); opacity: 0.6; margin-bottom: -4px; }
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
    body.touch #mEquip #equipHud .group::before { display: block; width: 100%; font-size: var(--fs-small); opacity: 0.6; margin-bottom: 2px; }
    body.touch #mEquip #equipHud .group:nth-of-type(3)::before { content: 'Снаряжение'; }
    body.touch #mEquip #equipHud .group:nth-of-type(4)::before { content: 'Оружие под рукой'; }
    body.touch.invOpen #touchPad, body.touch.invOpen #mStats, body.touch.invOpen #infoPanel { display: none; }
    /* Панель оружия (src/engine/weapons.js) — сверху по центру, без подсказок для мыши и клавиатуры */
    body.touch #weaponHud { top: 8px !important; bottom: auto !important; left: 50% !important; right: auto !important;
      transform: translateX(-50%); min-width: 140px !important; padding: 4px 8px !important; font-size: var(--fs-small) !important; }
    body.touch #weaponHud > div:nth-child(2), body.touch #weaponHint { display: none; }
    /* Сканер (панель «что это») — маленький и полупрозрачный справа сверху, рядом с кнопками; только по касанию
       объекта, а в боевом режиме (оружие в руках) не появляется вовсе */
    body.touch #infoPanel {
      left: auto; right: max(104px, calc(env(safe-area-inset-right) + 96px)); top: 8px !important; width: 160px;
      font-size: var(--fs-small); line-height: 1.3; padding: 4px 6px 5px; opacity: 0.72; border-width: 1px;
    }
    body.touch #infoPanel #ipName { font-size: var(--fs-text); letter-spacing: 0; }
    body.touch #infoPanel.empty, body.touch.armed #infoPanel { display: none; }
    body.touch #fuel { bottom: 34px; left: 12px; font-size: var(--fs-text); padding: 4px 8px; }
    body.touch #infFuel { bottom: 70px; left: 12px; font-size: var(--fs-text); padding: 3px 8px; }
    body.touch #speedo { display: none !important; } /* на телефоне скорость — над педалями (touch-drive.js) */
    /* Разговор на телефоне — на весь экран, ответы — крупные кнопки; без ответов — коснуться, чтобы продолжить */
    body.touch #dialogue {
      position: fixed; inset: 0; width: auto; max-width: none; transform: none; z-index: 45; border: none; border-radius: 0;
      padding: max(18px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) 18px max(24px, env(safe-area-inset-left));
      overflow-y: auto; background: rgba(8, 11, 16, 0.96);
    }
    body.touch #dialogue .text { font-size: var(--fs-h2); }
    body.touch #dialogue .option { padding: 12px 14px; margin-top: 8px; font-size: var(--fs-h2); border: 1px solid rgba(255, 255, 255, 0.2); }
    body.touch #dialogue .hint { font-size: 0; }
    body.touch #dialogue .hint::after { content: 'Коснитесь, чтобы продолжить'; font-size: var(--fs-text); }
    /* Выбор из нескольких действий рядом (например, этаж) — меню на весь экран */
    #choiceMenu {
      position: fixed; inset: 0; z-index: 46; display: none; flex-direction: column; align-items: center; justify-content: center;
      gap: 10px; padding: 18px; background: rgba(8, 11, 16, 0.94); color: white; font-family: var(--font);
    }
    #choiceMenu.on { display: flex; }
    #choiceMenu .title { font-size: var(--fs-h2); opacity: 0.7; margin-bottom: 6px; }
    #choiceMenu button {
      min-width: min(420px, 80vw); padding: 14px 18px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.08); color: white; font-size: var(--fs-h2);
    }
    #choiceMenu button.cancel { background: none; border-color: transparent; opacity: 0.7; font-size: var(--fs-h2); }
    body.touch #prompt { bottom: 40px; font-size: var(--fs-text); }
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
      color: rgba(255, 255, 255, 0.75); font: var(--fs-small) var(--font); font-variant-numeric: tabular-nums;
      text-shadow: 0 0 3px rgba(0, 0, 0, 0.9); pointer-events: none;
    }
    #rotateNote {
      position: fixed; inset: 0; z-index: 100; display: none; align-items: center; justify-content: center; text-align: center;
      padding: 24px; background: #111; color: white; font: var(--fs-h2)/1.4 var(--font);
    }
    #rotateNote .big { font-size: var(--fs-display); display: block; margin-bottom: 12px; }
    @media (orientation: portrait) { #rotateNote { display: flex; } }
    /* Джойстик стоит на месте слева: внешний круг — сколько можно отклонить, внутренний — «мертвая зона» */
    #joyBase {
      position: fixed; z-index: 20; width: 112px; height: 112px; border-radius: 50%; box-sizing: border-box;
      left: max(36px, calc(env(safe-area-inset-left) + 24px)); bottom: max(64px, calc(env(safe-area-inset-bottom) + 56px));
      border: 2px solid rgba(255, 255, 255, 0.35); background: rgba(0, 0, 0, 0.2); pointer-events: none;
    }
    #joyBase::before {
      content: ''; position: absolute; left: 50%; top: 50%; width: 38px; height: 38px; margin: -19px 0 0 -19px;
      border-radius: 50%; border: 1px dashed rgba(255, 255, 255, 0.35);
    }
    #joyBase.on { border-color: rgba(255, 255, 255, 0.6); }
    #joyKnob {
      position: absolute; left: 32px; top: 32px; width: 44px; height: 44px; border-radius: 50%; box-sizing: border-box;
      background: rgba(255, 255, 255, 0.4); border: 2px solid rgba(255, 255, 255, 0.7);
    }
    /* Оружие в ячейках — маленькими значками внизу по центру; касание — взять в руки (или убрать) */
    #mGuns {
      touch-action: none; position: fixed; z-index: 20; left: 50%; transform: translateX(-50%); bottom: max(8px, env(safe-area-inset-bottom));
      display: flex; gap: 6px;
    }
    #mGuns .g {
      width: 34px; height: 34px; padding: 0; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.3);
      background: rgba(10, 14, 20, 0.55); display: flex; align-items: center; justify-content: center;
      -webkit-tap-highlight-color: transparent;
    }
    #mGuns .g .px { width: 24px; height: 24px; image-rendering: pixelated; pointer-events: none; }
    #mGuns .g.drawn { border-color: #ffd84a; background: rgba(255, 216, 74, 0.3); }
    body.touch.invOpen #mGuns { display: none; }
    #touchPad {
      position: fixed; z-index: 20; right: max(12px, env(safe-area-inset-right)); bottom: max(22px, calc(env(safe-area-inset-bottom) + 14px));
      display: grid; display: flex; gap: 8px;
    }
    .touchBtn {
      width: 52px; height: 52px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.45);
      background: rgba(10, 14, 20, 0.55); color: white; font: bold var(--fs-h1) var(--font); padding: 0;
      display: flex; align-items: center; justify-content: center;
      touch-action: none; -webkit-tap-highlight-color: transparent;
    }
    .touchBtn .px { width: 32px; height: 32px; image-rendering: pixelated; pointer-events: none; }
    .touchBtn.down { background: rgba(255, 216, 74, 0.45); border-color: #ffd84a; }
    /* Одна кнопка справа внизу: в мирном режиме — «в бой», в боевом — прицел (зажать — огонь) */
    #tbMain { width: 72px; height: 72px; background: rgba(10, 14, 20, 0.6); }
    #tbMain svg { width: 46px; height: 46px; pointer-events: none; }
    #tbMain.fire { border-color: rgba(255, 70, 70, 0.9); background: radial-gradient(circle, rgba(255, 60, 60, 0.35), rgba(60, 0, 0, 0.6));
      box-shadow: 0 0 14px rgba(255, 50, 50, 0.6); }
    #tbMain.fire.down { box-shadow: 0 0 22px rgba(255, 120, 60, 0.95); background: radial-gradient(circle, rgba(255, 160, 60, 0.55), rgba(90, 10, 0, 0.7)); }
    #tbMain.fire svg { filter: drop-shadow(0 0 4px rgba(255, 80, 80, 0.9)); }
    /* Мирный режим — кнопка между полосками и оружием, видна только в бою */
    #mPeace {
      width: 34px; height: 34px; padding: 0; border-radius: 8px; border: 1px solid rgba(140, 220, 255, 0.6);
      background: rgba(10, 14, 20, 0.6); color: white; font-size: var(--fs-h2); display: none;
    }
    body.touch.armed #mPeace { display: block; }
    /* За рулем — кнопка «выйти» там же, рядом с оружием; надписи «остановитесь, чтобы выйти» на телефоне нет */
    #mExit {
      width: 34px; height: 34px; padding: 0; border-radius: 8px; border: 1px solid rgba(255, 216, 74, 0.7);
      background: rgba(10, 14, 20, 0.6); color: white; font-size: var(--fs-h2); display: none;
    }
    body.touch.driving #mExit { display: block; }
    #mExit.wait { background: rgba(255, 216, 74, 0.35); }
    /* Подсказка действия на телефоне — тоже кнопка: касание делает то, что в ней написано */
    body.touch #prompt { pointer-events: auto; cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.35); }
  `;
  document.head.appendChild(touchStyle);

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
  const joyGrab = 1.6; // касание дальше joyRadius × joyGrab от центра — не джойстик, а камера
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

  // Короткое касание сцены: показать, что это, взять вещь, рядом — действие. Не стреляет: огонь — только кнопкой прицела
  // Касание пришлось на землю у героя (он всегда в центре сцены)? Дальше tapReach — только сканер
  const tapReach = 9;
  const tapRay = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const tapGround = new THREE.Vector3();
  function tapNearHero(ndc) {
    tapRay.setFromCamera(ndc, camera);
    if (!tapRay.ray.intersectPlane(groundPlane, tapGround)) return false;
    return Math.hypot(tapGround.x, tapGround.z) < tapReach;
  }

  // Сканер (панель «что это») на телефоне не висит: появляется по касанию объекта и через scanShowMs гаснет
  const scanShowMs = 4000;
  let scanTimer = 0;
  function onTap(x, y) {
    if (!canPlay()) return;
    pickMouse = toNdc(x, y);
    clearTimeout(scanTimer);
    const tapped = pickMouse;
    scanTimer = setTimeout(() => {
      if (pickMouse === tapped) pickMouse = null;
    }, scanShowMs);
    updatePickHover(pickMouse);
    if (pickHovered()) return;
    // Мирный режим: коснулись человека, двери, машины рядом с героем — сразу действие (как E):
    // разговор, войти, сесть в машину; за рулем касание своей машины — выйти, у толкаемой — отпустить
    if (!heroWeapon.id && findHovered(pickMouse) && tapNearHero(pickMouse)) {
      touchAct();
      return;
    }
  }

  canvas.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault(); // без прокрутки, зума страницы и «мышиных» событий после касания
      if (settingsOpen) setSettingsOpen(false); // касание мимо меню закрывает его, как клик мышью
      for (const t of e.changedTouches) {
        // Джойстик берем, только коснувшись его круга (с запасом joyGrab); остальное слева — камера
        const r = joyBase.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        if (!joyTouch && !drivingCar && Math.hypot(t.clientX - cx, t.clientY - cy) < joyRadius * joyGrab) { // в машине — педали
          joyTouch = { id: t.identifier, x: cx, y: cy };
          joyBase.classList.add('on');
          setJoy(t.clientX - cx, t.clientY - cy);
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
        joyKnob.style.transform = '';
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

  // Мирный и боевой режим. Мирный — оружие убрано: справа внизу одна кнопка «в бой» (достает оружие из
  // активной ячейки), с людьми, дверями и машинами — касанием (onTap). Боевой — оружие в руках: та же кнопка
  // становится прицелом. Зажали — огонь (как зажатая левая кнопка мыши; целится в прицел гироскопа, без
  // гироскопа — по взгляду с доводом); не отпуская, повели палец влево/вправо — камера и герой
  // поворачиваются, вверх/вниз — следующее/предыдущее оружие. В мирный режим — кнопка слева снизу (#mPeace)
  const swordSvg =
    '<svg viewBox="0 0 48 48"><g fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round">' +
    '<path d="M10 38 L34 14 M34 14 l4-6 -6 4 M14 30 l4 4 M38 38 L14 14 M14 14 l-4-6 6 4 M34 30 l-4 4"/></g></svg>';
  const crosshairSvg =
    '<svg viewBox="0 0 48 48"><g fill="none" stroke="#ff4646" stroke-width="2.5" stroke-linecap="round">' +
    '<circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="7" stroke-width="1.5"/>' +
    '<path d="M24 3 v9 M24 36 v9 M3 24 h9 M36 24 h9"/></g><circle cx="24" cy="24" r="2.5" fill="#ffd0a0"/></svg>';
  const btnMain = document.createElement('button');
  btnMain.id = 'tbMain';
  btnMain.className = 'touchBtn';
  pad.appendChild(btnMain);

  const weaponSwipe = 45; // px пальцем вверх/вниз на кнопке огня — смена оружия
  let fireTouch = null; // { x, y } — где палец на кнопке огня

  // Следующее (dir = 1) или предыдущее (−1) оружие из ячеек; огонь, если зажат, продолжается новым
  function cycleWeapon(dir) {
    const ids = weaponSlotIds();
    if (!ids.length) return;
    const i = ids.indexOf(heroWeapon.id);
    const id = ids[(i + dir + ids.length) % ids.length];
    if (id === heroWeapon.id) return;
    const held = heroWeapon.mouseHeld;
    if (drawWeapon(id)) {
      heroWeapon.mouseHeld = held;
      showToast(WEAPONS[id].name, 1200);
    }
  }

  function startFire() {
    heroWeapon.mouseHeld = true;
    heroWeapon.holdAt = performance.now();
    const w = WEAPONS[heroWeapon.id];
    if (!w.charge && !w.spinUp) fireWeapon(mouseAimPoint()); // с накоплением — когда отпустят, пулемет — когда раскрутится
  }

  btnMain.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!canPlay()) return;
    if (!heroWeapon.id) {
      toggleWeapon(); // в бой: достаем оружие (нет оружия — подсказка, где его взять)
      return;
    }
    btnMain.setPointerCapture(e.pointerId);
    btnMain.classList.add('down');
    fireTouch = { x: e.clientX, y: e.clientY };
    startFire();
  });
  btnMain.addEventListener('pointermove', (e) => {
    if (!fireTouch || !heroWeapon.id) return;
    const dx = e.clientX - fireTouch.x;
    fireTouch.x = e.clientX;
    worldRotation += dx * lookSensitivity; // как правый палец на экране: в бою герой поворачивается вслед
    cameraHoldFrames = cameraHoldDelay;
    const dy = e.clientY - fireTouch.y;
    if (Math.abs(dy) > weaponSwipe) {
      cycleWeapon(dy < 0 ? 1 : -1); // вверх — следующее, вниз — предыдущее
      fireTouch.y = e.clientY;
    }
  });
  const fireUp = () => {
    fireTouch = null;
    btnMain.classList.remove('down');
    heroWeapon.mouseHeld = false;
  };
  btnMain.addEventListener('pointerup', fireUp);
  btnMain.addEventListener('pointercancel', fireUp);
  btnMain.addEventListener('contextmenu', (e) => e.preventDefault());

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
    '<div class="bar"><div id="mElixir" style="background:#a05cf0"></div></div></div>' +
    '<button id="mPeace">🕊</button><button id="mExit">🚪</button>';
  document.body.appendChild(stats);
  const invBtn = stats.querySelector('#mInvBtn');
  invBtn.appendChild(pixelIcon('bag'));
  invBtn.addEventListener('click', () => setInventoryOpen(!inventoryOpen));
  stats.querySelector('#mPeace').addEventListener('click', () => {
    if (heroWeapon.id) holsterWeapon(); // в мирный режим
  });
  // Выйти из машины: стоит — сразу; едет — сама тормозит до остановки и тогда выходит
  const exitBtn = stats.querySelector('#mExit');
  let exitPending = false;
  exitBtn.addEventListener('click', () => {
    if (drivingCar) exitPending = true;
  });
  function updateExit() {
    if (exitPending && drivingCar) {
      keys['Space'] = true; // ручник, пока машина не встанет
      if (Math.abs(drivingCar.speed) <= exitMaxSpeed) {
        keys['Space'] = false;
        exitPending = false;
        exitCar();
      }
    } else if (exitPending) {
      keys['Space'] = false;
      exitPending = false;
    }
    exitBtn.classList.toggle('wait', exitPending);
  }
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


  // ---------- Гироскоп: доводка прицела наклоном телефона ----------
  // Пальцем справа — грубый разворот камеры и героя, наклоном телефона — точная доводка. Пока оружие в руках,
  // на земле перед героем горит прицел: повернули телефон (как руль или как камеру влево-вправо) — прицел
  // ушел в сторону от взгляда героя, не дальше gyroMaxYaw. Кнопка огня стреляет в прицел. Возле цели прицел
  // слегка «прилипает» к ней. Оружие убрали — прицел плавно возвращается по центру.
  // На iPhone датчик дает данные только после разрешения (спрашиваем при первом касании).
  // Выключается в настройках, а без датчика (компьютер, отказ) огонь по взгляду с доводом, как раньше
  const gyroSensitivity = 1.3; // во сколько раз прицел поворачивается сильнее телефона
  const gyroMaxYaw = 0.7; // рад: дальше от взгляда прицел не уходит
  const gyroSnap = 0.07; // рад: ближе к цели — прицел на ней
  const gyroAimDistance = 14; // где прицел, если цели нет (не дальше дальности оружия)
  let gyroOn = true;
  try {
    gyroOn = localStorage.getItem('game.gyro') !== 'off';
  } catch (e) {
    // не страшно: гироскоп включен
  }
  let gyroActive = false; // датчик прислал хоть что-то
  let gyroYaw = 0; // насколько прицел повернут от взгляда героя (плюс — налево, как heading)
  let gyroLastT = 0;

  window.addEventListener('devicemotion', (e) => {
    const r = e.rotationRate;
    const now = performance.now();
    const dt = gyroLastT ? Math.min(0.1, (now - gyroLastT) / 1000) : 0;
    gyroLastT = now;
    if (!r || r.alpha === null || r.beta === null) return;
    gyroActive = true;
    if (!gyroOn || !heroWeapon.id || !canPlay()) {
      gyroYaw *= 0.9; // без оружия прицел возвращается по центру
      return;
    }
    // Горизонтально ось x телефона смотрит вверх (поворот 90°) или вниз (270°): повернуть телефон влево
    // вокруг нее — прицел влево. И «руль» (поворот вокруг оси экрана z) против часовой — тоже влево
    const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    const pan = angle === 90 ? r.beta : angle === 270 || angle === -90 ? -r.beta : r.gamma;
    const rate = ((pan + r.alpha) * Math.PI) / 180; // град/с → рад/с
    gyroYaw = Math.max(-gyroMaxYaw, Math.min(gyroMaxYaw, gyroYaw + rate * dt * gyroSensitivity));
  });

  function requestGyro() {
    const DM = window.DeviceMotionEvent;
    if (gyroOn && DM && typeof DM.requestPermission === 'function') DM.requestPermission().catch(() => {});
  }

  // Прицел: светящееся кольцо на земле (светится — поэтому MeshBasicMaterial, а не LitMaterial)
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.3, 28),
    new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }),
  );
  reticle.rotation.x = -Math.PI / 2;
  reticle.renderOrder = 5;
  reticle.visible = false;
  cityGroup.add(reticle);
  const reticleDot = new THREE.Mesh(new THREE.CircleGeometry(0.25, 12), reticle.material);
  reticle.add(reticleDot);

  // Точка прицела в мире или null (гироскопа нет или выключен — тогда огонь по взгляду с доводом)
  function gyroAimPoint() {
    if (!gyroOn || !gyroActive || !heroWeapon.id) return null;
    const w = WEAPONS[heroWeapon.id];
    const heading = playerHeading + gyroYaw;
    let best = null;
    let bestDa = gyroSnap;
    for (const t of combatTargets) {
      if (t.dead) continue;
      const dx = t.x - playerWorldX;
      const dz = t.z - playerWorldZ;
      const d = Math.hypot(dx, dz);
      if (d > w.range || d < 0.5) continue;
      let da = Math.atan2(-dx, -dz) - heading;
      da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
      if (da < bestDa) (bestDa = da), (best = t);
    }
    if (best) return { x: best.x, z: best.z };
    const d = Math.min(gyroAimDistance, w.range);
    return { x: playerWorldX - Math.sin(heading) * d, z: playerWorldZ - Math.cos(heading) * d };
  }
  heroWeapon.touchAim = gyroAimPoint;

  function updateReticle() {
    const p = gyroAimPoint();
    reticle.visible = !!p;
    if (p) reticle.position.set(p.x, 0.06, p.z);
  }

  // Выключатель в настройках
  const gyroRow = document.createElement('label');
  gyroRow.className = 'check';
  gyroRow.innerHTML = '<input type="checkbox" /> Гироскоп: доводка прицела наклоном';
  const gyroToggle = gyroRow.querySelector('input');
  gyroToggle.checked = gyroOn;
  gyroToggle.addEventListener('change', () => {
    gyroOn = gyroToggle.checked;
    gyroYaw = 0;
    requestGyro(); // касание по галочке — подходящий момент спросить разрешение на iPhone
    try {
      localStorage.setItem('game.gyro', gyroOn ? 'on' : 'off');
    } catch (e) {
      // не запомнится — не страшно
    }
  });
  settingsMenu.insertBefore(gyroRow, settingsMenu.querySelector('.hint'));

  // Подсказка действия — кнопка: касание делает то же, что E (или F — отпустить толкаемую машину)
  document.getElementById('prompt').addEventListener('click', () => {
    if (canPlay()) touchAct();
  });

  // Разговор: касание окна без вариантов ответа — дальше (как E); ответы — касанием самих вариантов
  document.getElementById('dialogue').addEventListener('click', (e) => {
    if (e.target.closest('.option')) return;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
  });

  // Действие касанием. Рядом одно действие — сразу его (как E). Несколько (лестница вверх и вниз, этажи,
  // дверь и машина) — меню на весь экран: какое выбрать. У толкаемой машины без других действий — отпустить
  const choiceMenu = document.createElement('div');
  choiceMenu.id = 'choiceMenu';
  document.body.appendChild(choiceMenu);
  const closeChoice = () => choiceMenu.classList.remove('on');
  choiceMenu.addEventListener('click', (e) => {
    if (e.target === choiceMenu) closeChoice();
  });

  function nearActions() {
    const driving = !!drivingCar;
    return interactables.filter((it) => !!it.driving === driving && it.act && it.near());
  }

  function touchAct() {
    const list = nearActions();
    if (list.length <= 1) {
      if (pushingCar && !list.length) releaseCar();
      else onInteract();
      return;
    }
    list.sort((a, b) => b.priority - a.priority);
    choiceMenu.innerHTML = '<div class="title">Что сделать?</div>';
    for (const it of list) {
      const b = document.createElement('button');
      b.textContent = touchPromptText(it.prompt() || 'Действие');
      b.addEventListener('click', () => {
        closeChoice();
        if (it.near()) it.act();
      });
      choiceMenu.appendChild(b);
    }
    const cancel = document.createElement('button');
    cancel.className = 'cancel';
    cancel.textContent = 'Отмена';
    cancel.addEventListener('click', closeChoice);
    choiceMenu.appendChild(cancel);
    choiceMenu.classList.add('on');
    clearJoyKeys();
  }

  const gunsEl = document.createElement('div');
  gunsEl.id = 'mGuns';
  document.body.appendChild(gunsEl);
  // Свайп по ряду влево/вправо — предыдущее/следующее оружие (в мирном режиме — сразу в бой)
  let gunsSwipeX = null;
  let gunsSwiped = false;
  gunsEl.addEventListener('pointerdown', (e) => {
    gunsSwipeX = e.clientX;
    gunsSwiped = false;
  });
  gunsEl.addEventListener('pointermove', (e) => {
    if (gunsSwipeX === null || !canPlay()) return;
    const dx = e.clientX - gunsSwipeX;
    if (Math.abs(dx) < 30) return;
    gunsSwiped = true;
    gunsSwipeX = e.clientX;
    if (!heroWeapon.id) toggleWeapon();
    else cycleWeapon(dx > 0 ? 1 : -1);
  });
  const gunsUp = () => {
    gunsSwipeX = null;
    setTimeout(() => (gunsSwiped = false), 0); // click после свайпа не выбирает оружие
  };
  gunsEl.addEventListener('pointerup', gunsUp);
  gunsEl.addEventListener('pointercancel', gunsUp);
  let gunsShown = '';
  function updateGuns() {
    const ids = weaponSlotIds();
    const key = ids.join(',') + '|' + heroWeapon.id;
    if (key === gunsShown) return;
    gunsShown = key;
    gunsEl.innerHTML = '';
    for (const id of ids) {
      const b = document.createElement('button');
      b.className = 'g' + (heroWeapon.id === id ? ' drawn' : '');
      b.appendChild(pixelIcon((ITEMS[id] || {}).icon || id));
      b.addEventListener('click', () => {
        if (gunsSwiped || !canPlay() || heroWeapon.id === id) return;
        drawWeapon(id); // касание оружия — в бой с ним
      });
      gunsEl.appendChild(b);
    }
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
  window.addEventListener(
    'touchend',
    () => {
      lockLandscape();
      requestGyro();
    },
    { once: true },
  );

  // Раз в кадр: какие кнопки нужны, значок оружия, полоски, часы, раскрыт ли инвентарь
  let padState = '';
  let statsState = '';
  let clockShownTouch = '';
  function updateTouchPad() {
    const armed = !!heroWeapon.id;
    if (armed + '' !== padState) {
      padState = armed + '';
      btnMain.classList.toggle('fire', armed);
      btnMain.innerHTML = armed ? crosshairSvg : swordSvg;
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
    updateReticle();
    updateGuns();
    document.body.classList.toggle('armed', !!heroWeapon.id);
    document.body.classList.toggle('driving', !!drivingCar);
    updateExit();
    requestAnimationFrame(updateTouchPad);
  }
  updateTouchPad();
}
