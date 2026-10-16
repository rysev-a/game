// src/engine/mouse-look.js
// ВИД И ПРИЦЕЛ МЫШЬЮ В БОЕВОМ РЕЖИМЕ (только компьютер; на телефоне целится кнопка огня, src/engine/touch.js).
// Как в 3D-шутерах: пока оружие в руках, мышь захвачена (Pointer Lock) — курсора нет, движение мыши влево-вправо
// крутит камеру, и герой поворачивается вместе с ней; вверх-вниз — наклон прицела (aimPitch в
// src/engine/weapons.js): заряд летит чуть выше или чуть ниже. Камера опускается ниже, как за плечом,
// и следует за наклоном. Перед героем — перекрестие: куда полетит выстрел; красное — заряд попадет в цель.
//   Захват: достали оружие (Q, R) или кликнули по сцене в боевом режиме.
//   Отпустить: Esc (так устроены браузеры), убрать оружие, открыть инвентарь, карту, меню, разговор.
//   Колесо мыши в боевом режиме меняет оружие (src/engine/input.js).
// updateMouseLook() — раз в кадр из главного цикла, после камеры (src/engine/game.js).

const mouseLookYawSens = 0.0025; // рад на пиксель движения мыши
const mouseLookPitchSens = 0.0015;
const aimPitchMax = 0.16; // ≈9°: на 20 шагах заряд пройдет на 3 единицы выше или ниже
let mouseLookBlend = 0; // 0..1 — насколько камера перешла в положение «за плечом» (updateCamera в src/player/player.js)

// Можно ли сейчас держать мышь захваченной
const mouseLookAllowed = () =>
  !touchUI && inCombatMode() && !settingsOpen && !dialogueOpen && !inventoryOpen && !(typeof mapFull !== 'undefined' && mapFull.open);

function requestMouseLook() {
  if (mouseLookActive() || !mouseLookAllowed() || !renderer.domElement.requestPointerLock) return;
  const r = renderer.domElement.requestPointerLock();
  if (r && r.catch) r.catch(() => {}); // браузер может отказать (например, сразу после Esc) — захватим по клику
}

function releaseMouseLook() {
  if (mouseLookActive()) document.exitPointerLock();
}

// Достали или сменили оружие клавишей — сразу захватываем мышь (обработчик оружия в weapons.js уже отработал)
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyQ' || e.code === 'KeyR') {
    if (heroWeapon.id) requestMouseLook();
    else releaseMouseLook();
  }
});
// Клик по сцене в боевом режиме без захвата (например, после Esc) — снова захватить
renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button === 0) requestMouseLook();
});

document.addEventListener('pointerlockchange', () => {
  if (!mouseLookActive()) aimPitch = 0; // отпустили — прицел снова горизонтальный
  if (typeof updateWeaponHud === 'function') updateWeaponHud(); // подсказка на панели оружия
  updateMouseHint();
});

document.addEventListener('mousemove', (e) => {
  if (!mouseLookActive()) return;
  // Бывают редкие скачки движения при захвате — их отбрасываем
  const mx = Math.max(-150, Math.min(150, e.movementX || 0));
  const my = Math.max(-150, Math.min(150, e.movementY || 0));
  worldRotation += mx * mouseLookYawSens; // вправо — поворот направо (герой идет за камерой, src/player/player.js)
  aimPitch = Math.max(-aimPitchMax, Math.min(aimPitchMax, aimPitch - my * mouseLookPitchSens)); // вверх — выше
});

// ---------- Перекрестие ----------
const crosshair = document.createElement('div');
crosshair.id = 'crosshair';
crosshair.style.cssText =
  'position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;z-index:15;pointer-events:none;display:none';
crosshair.innerHTML =
  '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
  '<circle cx="11" cy="11" r="6" stroke-width="1.5"/><path d="M11 1v5M11 16v5M1 11h5M16 11h5"/></svg>';
document.body.appendChild(crosshair);
const crosshairPoint = new THREE.Vector3();
const crosshairDist = 14; // где рисовать перекрестие, если цели впереди нет

function updateMouseLook() {
  if (mouseLookActive() && !mouseLookAllowed()) releaseMouseLook(); // сел в машину, открыл меню, убрал оружие
  const on = mouseLookActive() && !!heroWeapon.id;
  if (on) cameraHoldFrames = cameraHoldDelay; // камеру ведет мышь — не возвращаем ее за спину
  if (!on) {
    crosshair.style.display = 'none';
    return;
  }
  // Куда полетит выстрел: по взгляду героя, с тем же доводом, что у оружия (assistTarget в weapons.js)
  const w = WEAPONS[heroWeapon.id];
  const m = muzzleAt(w, playerHeading);
  const t = assistTarget(w, playerHeading);
  let x, z, d;
  if (t) {
    d = Math.hypot(t.x - m.x, t.z - m.z);
    x = t.x;
    z = t.z;
  } else {
    d = crosshairDist;
    x = m.x - Math.sin(playerHeading) * d;
    z = m.z - Math.cos(playerHeading) * d;
  }
  const y = m.y + aimSlope() * d;
  const onTarget = t && y >= 0 && y <= t.height;
  cityGroup.updateMatrixWorld();
  camera.updateMatrixWorld();
  crosshairPoint.set(x, Math.max(0, y), z);
  cityGroup.localToWorld(crosshairPoint); // мир → сцена (город крутится вокруг игрока)
  crosshairPoint.project(camera);
  if (crosshairPoint.z > 1) {
    crosshair.style.display = 'none';
    return;
  }
  crosshair.style.display = 'block';
  crosshair.style.color = onTarget ? '#ff5a4a' : 'rgba(255,255,255,0.9)';
  crosshair.style.transform =
    'translate(' + ((crosshairPoint.x + 1) / 2) * window.innerWidth + 'px,' + ((1 - crosshairPoint.y) / 2) * window.innerHeight + 'px)';
}
