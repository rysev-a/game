// src/engine/mouse-look.js
// ВИД И ПРИЦЕЛ МЫШЬЮ В БОЕВОМ РЕЖИМЕ (только компьютер; на телефоне целится кнопка огня, src/engine/touch.js).
// Как в 3D-шутерах: пока оружие в руках, мышь захвачена (Pointer Lock) — курсора нет, движение мыши влево-вправо
// крутит камеру, и герой поворачивается вместе с ней; вверх-вниз — наклон прицела (aimPitch в
// src/engine/weapons.js): заряд летит чуть выше или чуть ниже. Камера опускается ниже, как за плечом,
// и следует за наклоном. Перекрестия нет — стреляют на глаз (оно есть только от первого лица). Герой
// поворачивается вместе с мышью сразу, без сглаживания (src/player/player.js): выстрел летит ровно по взгляду
//   Захват: достали оружие (Q, R) или кликнули по сцене в боевом режиме.
//   Отпустить: убрать оружие, открыть инвентарь, карту, меню, разговор. Esc — выйти из боевого режима
//   совсем: оружие убирается, мышь отпускается (escapeCombat ниже).
//   Колесо мыши в боевом режиме меняет оружие (src/engine/input.js).
// updateMouseLook() — раз в кадр из главного цикла, после камеры (src/engine/game.js).
//
// ВИД ОТ ПЕРВОГО ЛИЦА (галочка в настройках, src/engine/settings.js): пока мышь захвачена в бою, камера — в глазах
// героя. Мышь крутит взгляд сразу, без сглаживания, и сильнее, чем от третьего лица, вверх-вниз — почти до неба
// и до ног. Тела не видно, только оружие в руках внизу справа. Перекрестие всегда в центре экрана; довода на
// цель нет: заряд летит в ту точку, на которую смотрит перекрестие (firstPersonSlope, aimSlope в weapons.js).

const mouseLookYawSens = 0.0025; // рад на пиксель движения мыши (умножается на чувствительность из настроек)
const mouseLookPitchSens = 0.0015;
const aimPitchMax = 0.16; // ≈9°: на 20 шагах заряд пройдет на 3 единицы выше или ниже
const firstPersonYawSens = 0.0022; // от первого лица: взгляд без сглаживания, вверх-вниз так же резво, как вбок
const firstPersonPitchSens = 0.0022;
const firstPersonPitchMax = 1.2; // ≈70° вверх и вниз
const firstPersonEye = 1.7; // высота глаз над землей
const firstPersonFov = 72; // от первого лица обзор чуть шире
let firstPersonBlend = 0; // 0..1 — насколько камера перешла в глаза героя (updateCamera в src/player/player.js)
let firstPersonSlope = 0; // наклон выстрела от первого лица: от дула до точки под перекрестием
const firstPersonOn = () => !!settings.firstPerson && mouseLookActive() && !!heroWeapon.id;
let mouseLookBlend = 0; // 0..1 — насколько камера перешла в положение «за плечом» (updateCamera в src/player/player.js)

// Можно ли сейчас держать мышь захваченной
const mouseLookAllowed = () =>
  !touchUI && inCombatMode() && !settingsOpen && !dialogueOpen && !inventoryOpen && !(typeof mapFull !== 'undefined' && mapFull.open);

function requestMouseLook() {
  if (mouseLookActive() || !mouseLookAllowed() || !renderer.domElement.requestPointerLock) return;
  const r = renderer.domElement.requestPointerLock();
  if (r && r.catch) r.catch(() => {}); // браузер может отказать (например, сразу после Esc) — захватим по клику
}

let mouseLookReleasing = false; // мышь отпускает сама игра (убрали оружие, открыли окно), а не Esc
function releaseMouseLook() {
  if (!mouseLookActive()) return;
  mouseLookReleasing = true;
  document.exitPointerLock();
}

// ESC — ВЫЙТИ ИЗ БОЕВОГО РЕЖИМА: оружие убирается, мышь отпускается, камера возвращается за спину.
// Сначала Esc закрывает то, что открыто поверх игры (меню, инвентарь, карта, разговор), и отменяет
// вещь в руке (armedItem, src/player/equipment.js) — тогда из боя не выходим
function escapeCombat() {
  if (heroWeapon.id && mouseLookAllowed() && !(typeof armedItem !== 'undefined' && armedItem)) holsterWeapon();
}
// ESC ПО ПОРЯДКУ: закрыть открытое (меню, инвентарь, карту, разговор, историю версий) → отменить вещь в руке →
// выйти из боя → а если ничего этого нет — открыть меню настроек (еще Esc — закрыть, src/engine/settings.js).
// Мышь не захвачена — Esc приходит обычной клавишей. Ловим в фазе захвата, пока обработчики меню
// и инвентаря его не закрыли: состояние окон — до нажатия
const escOverlayOpen = () =>
  settingsOpen || inventoryOpen || dialogueOpen || (typeof mapFull !== 'undefined' && mapFull.open) ||
  historyEl.classList.contains('on') || (typeof armedItem !== 'undefined' && !!armedItem);
window.addEventListener(
  'keydown',
  (e) => {
    if (e.code !== 'Escape' || e.repeat) return;
    if (!escOverlayOpen() && !heroWeapon.id) {
      setSettingsOpen(true);
      e.stopImmediatePropagation(); // иначе обработчик меню тут же закроет его тем же нажатием
      return;
    }
    escapeCombat();
  },
  true,
);

// Достали или сменили оружие клавишей — сразу захватываем мышь (обработчик оружия в weapons.js уже отработал)
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyQ' || e.code === 'KeyR') {
    if (heroWeapon.id) requestMouseLook();
    else releaseMouseLook();
  }
});
// Клик по сцене в боевом режиме без захвата (браузер не дал захватить сразу) — захватить
renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button === 0) requestMouseLook();
});

document.addEventListener('pointerlockchange', () => {
  if (!mouseLookActive()) {
    aimPitch = 0; // отпустили — прицел снова горизонтальный
    // Захваченную мышь браузер отпускает по Esc сам, и клавиша до страницы не доходит. Если отпустила
    // не игра и окно не потеряло фокус (переключились в другую программу) — это Esc: выходим из боя
    const byGame = mouseLookReleasing;
    mouseLookReleasing = false;
    if (!byGame) setTimeout(() => document.hasFocus() && !mouseLookActive() && escapeCombat(), 60);
  }
  if (typeof updateWeaponHud === 'function') updateWeaponHud(); // подсказка на панели оружия
  updateMouseHint();
});

document.addEventListener('mousemove', (e) => {
  if (!mouseLookActive()) return;
  // Бывают редкие скачки движения при захвате — их отбрасываем
  const mx = Math.max(-150, Math.min(150, e.movementX || 0));
  const my = Math.max(-150, Math.min(150, e.movementY || 0));
  if (firstPersonOn()) {
    worldRotation += mx * firstPersonYawSens * settings.mouseSens; // чувствительность мыши — в настройках
    aimPitch = Math.max(-firstPersonPitchMax, Math.min(firstPersonPitchMax, aimPitch - my * firstPersonPitchSens * settings.mouseSens));
    return;
  }
  worldRotation += mx * mouseLookYawSens * settings.mouseSens; // вправо — поворот направо (герой идет за камерой, src/player/player.js)
  aimPitch = Math.max(-aimPitchMax, Math.min(aimPitchMax, aimPitch - my * mouseLookPitchSens * settings.mouseSens)); // вверх — выше
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

function updateMouseLook() {
  if (mouseLookActive() && !mouseLookAllowed()) releaseMouseLook(); // сел в машину, открыл меню, убрал оружие
  const on = mouseLookActive() && !!heroWeapon.id;
  if (on) cameraHoldFrames = cameraHoldDelay; // камеру ведет мышь — не возвращаем ее за спину
  updateFirstPersonView();
  if (!on) {
    crosshair.style.display = 'none';
    return;
  }
  if (firstPersonOn()) return updateFirstPersonAim();
  aimPitch = Math.max(-aimPitchMax, Math.min(aimPitchMax, aimPitch)); // вышли из вида от первого лица
  crosshair.style.display = 'none'; // от третьего лица перекрестия нет: стреляют на глаз
}

// ---------- Вид от первого лица ----------
// Тело прячем, а оружие из руки переносим к камере: внизу справа, стволом вперед. Вышли из вида — возвращаем
// в руку (или кость готовой модели) с тем же положением. Отдачу и покачивание при ходьбе рисуем здесь же
let firstPersonGun = null; // { mesh, parent, position, quaternion, scale } — откуда взяли оружие
let firstPersonBodyHidden = false;
// От камеры: вправо, вниз, вперед; оружие уменьшено, чтобы не закрывало пол-экрана
const firstPersonGunAt = { rifle: [0.2, -0.21, -0.3], hand: [0.17, -0.18, -0.34] };
const firstPersonGunScale = 0.5;
function updateFirstPersonView() {
  const on = firstPersonOn() && firstPersonBlend > 0.5;
  const mesh = on ? heroWeapon.mesh : null;
  if (firstPersonGun && (firstPersonGun.mesh !== mesh || mesh.parent !== camera)) {
    const g = firstPersonGun;
    // Оружие все еще в руках — вернуть на место; сменили или убрали — его уже сняли (holsterWeapon)
    if (g.mesh === heroWeapon.mesh && g.mesh.parent === camera) {
      g.parent.add(g.mesh);
      g.mesh.position.copy(g.position);
      g.mesh.quaternion.copy(g.quaternion);
      g.mesh.scale.copy(g.scale);
    }
    firstPersonGun = null;
  }
  if (mesh && !firstPersonGun) {
    firstPersonGun = { mesh, parent: mesh.parent, position: mesh.position.clone(), quaternion: mesh.quaternion.clone(), scale: mesh.scale.clone() };
    if (!camera.parent) scene.add(camera); // вещи на камере рисуются, только если она в сцене
    camera.add(mesh);
    mesh.rotation.set(0, 0.03, 0); // ствол чуть к центру экрана
    mesh.scale.setScalar(player.scale.x * firstPersonGunScale);
  }
  if (firstPersonGun) {
    const w = WEAPONS[heroWeapon.id];
    const [x, y, z] = firstPersonGunAt[w && w.hold === 'rifle' ? 'rifle' : 'hand'];
    const kick = Math.max(0, 1 - heroWeapon.sinceShot / 8); // отдача: назад и чуть вверх, за 8 кадров
    const bob = walkAmp * 0.006;
    mesh.position.set(x + Math.cos(walkPhase) * bob, y + Math.abs(Math.sin(walkPhase)) * bob + kick * 0.01, z + kick * 0.035);
    mesh.rotation.x = kick * 0.06;
  }
  if (on !== firstPersonBodyHidden) {
    firstPersonBodyHidden = on;
    player.visible = !on && !drivingCar; // за рулем героя прячет src/player/driving.js
  }
}

// Куда смотрит центр экрана: первая цель на луче, иначе земля, иначе точка на дальности оружия.
// По ней — наклон выстрела (заряд выходит из дула ниже глаз) и цвет перекрестия
const firstPersonRay = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const firstPersonHit = new THREE.Vector3();
function updateFirstPersonAim() {
  const w = WEAPONS[heroWeapon.id];
  camera.updateMatrixWorld();
  cityGroup.updateMatrixWorld();
  firstPersonRay.setFromCamera(screenCenter, camera);
  const meshes = combatTargets.filter((t) => !t.dead && t.mesh).map((t) => t.mesh);
  const hit = meshes.length ? firstPersonRay.intersectObjects(meshes, true)[0] : null;
  let onTarget = false;
  if (hit && hit.distance <= w.range + 3) {
    firstPersonHit.copy(hit.point);
    onTarget = true;
  } else if (!firstPersonRay.ray.intersectPlane(groundPlane, firstPersonHit) || firstPersonHit.length() > w.range) {
    firstPersonRay.ray.at(w.range, firstPersonHit);
  }
  cityGroup.worldToLocal(firstPersonHit); // сцена → мир (город крутится вокруг игрока)
  const m = muzzleAt(w, playerHeading);
  const d = Math.max(1, Math.hypot(firstPersonHit.x - m.x, firstPersonHit.z - m.z));
  firstPersonSlope = (firstPersonHit.y - m.y) / d;
  crosshair.style.display = 'block';
  crosshair.style.color = onTarget ? '#ff5a4a' : 'rgba(255,255,255,0.9)';
  crosshair.style.transform = 'translate(' + window.innerWidth / 2 + 'px,' + window.innerHeight / 2 + 'px)';
}
