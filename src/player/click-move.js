// src/player/click-move.js
// ХОДЬБА КЛИКОМ ПО ЗЕМЛЕ (только компьютер, мирный режим, пешком). Клик левой кнопкой по земле — герой сам
// идет туда: поворачивается к точке и шагает, камера идет за ним. Пока кнопка зажата, точку можно вести мышью.
// Любая из W/A/S/D, разговор, оружие в руках или машина — и герой останавливается. Уперся в стену — тоже стоп.
//   Клик по зданию с дверью (запись в interactables с clickObject и walkTo, src/engine/interact.js): герой идет
//   к двери; если не дошел за clickDoorFrames (2 секунды) — сразу оказывается внутри, а время уходит так,
//   будто он дошел (оставшийся путь / скорость, как при перемещении по карте, src/player/travel.js).
//   Клик по противнику (живая запись в combatTargets) — сразу боевой режим: герой достает оружие (последнее,
//   что доставал, иначе из активной ячейки или первое) и разворачивается к нему вместе с камерой; мышь
//   захватывается для прицела тем же кликом (src/engine/mouse-look.js).
// Клик по вещи берет вещь (src/engine/input.js); в боевом режиме клик — огонь (src/engine/weapons.js).
// clickMoveSteer() зовет updateWalking (src/player/player.js), updateClickMove() — главный цикл.

const clickDoorFrames = 120; // 2 секунды идем к двери, потом — сразу внутрь
const clickArriveDist = 0.4;
const clickTurnRate = 0.18; // поворот к точке за кадр (рад) — быстрее, чем A/D
let clickTarget = null; // { x, z } — куда идем (мир)
let clickDoor = null; // { entry, frames } — идем к двери этого входа
let clickHeld = false; // левая кнопка зажата — точку ведем мышью
let clickStuck = { d: Infinity, frames: 0 };

// Метка на земле: светящееся кольцо там, куда идем
const clickMarker = new THREE.Mesh(
  new THREE.RingGeometry(0.35, 0.55, 24),
  new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.85, depthWrite: false }),
);
clickMarker.rotation.x = -Math.PI / 2;
clickMarker.visible = false;
cityGroup.add(clickMarker);

const clickMoveAllowed = () =>
  !touchUI && !drivingCar && !pushingCar && !inCombatMode() && !settingsOpen && !dialogueOpen && !inventoryOpen &&
  !(typeof mapFull !== 'undefined' && mapFull.open);

function clickMoveStop() {
  clickTarget = null;
  clickDoor = null;
  clickMarker.visible = false;
}

function clickMoveTo(x, z) {
  clickTarget = { x, z };
  clickStuck = { d: Infinity, frames: 0 };
  clickMarker.position.set(x, 0.06, z);
  clickMarker.visible = true;
}

// Точка мира под курсором на земле (y = 0) или null
const clickRaycaster = new THREE.Raycaster();
const clickPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const clickHit = new THREE.Vector3();
function clickGroundPoint(e) {
  const m = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  clickRaycaster.setFromCamera(m, camera);
  if (!clickRaycaster.ray.intersectPlane(clickPlane, clickHit)) return null;
  cityGroup.updateMatrixWorld();
  const p = cityGroup.worldToLocal(clickHit.clone()); // сцена → мир (город крутится вокруг игрока)
  return { x: p.x, z: p.z };
}

// Вход, по зданию которого кликнули (луч до первого непрозрачного попадания), или null
function clickDoorEntry() {
  if (insideBuilding()) return null;
  const entries = interactables.filter((it) => it.clickObject && it.walkTo && hoverShown(it.clickObject));
  if (!entries.length) return null;
  for (const hit of clickRaycaster.intersectObjects(entries.map((it) => it.clickObject), true)) {
    if (!hit.object.isMesh || !hoverShown(hit.object) || hoverSeeThrough(hit.object)) continue;
    for (let o = hit.object; o; o = o.parent) {
      const it = entries.find((en) => en.clickObject === o);
      if (it) return it;
    }
  }
  return null;
}

// Живой противник под курсором (луч уже направлен clickGroundPoint) или null
function clickEnemy() {
  const meshes = combatTargets.filter((t) => !t.dead && t.mesh && hoverShown(t.mesh)).map((t) => t.mesh);
  if (!meshes.length) return null;
  const hit = clickRaycaster.intersectObjects(meshes, true)[0];
  if (!hit) return null;
  for (let o = hit.object; o; o = o.parent) {
    const t = combatTargets.find((c) => c.mesh === o);
    if (t) return t;
  }
  return null;
}

// Клик по противнику: оружие в руки и лицом к нему. Без оружия — подсказка, где его взять (toggleWeapon)
function clickStartCombat(t) {
  clickMoveStop();
  const ids = weaponSlotIds();
  const id = ids.includes(heroWeapon.last) ? heroWeapon.last : heroEquip.weapons[heroEquip.active] || ids[0];
  if (!id) return toggleWeapon();
  if (!drawWeapon(id)) return;
  playerHeading = Math.atan2(-(t.x - playerWorldX), -(t.z - playerWorldZ));
  worldRotation = -playerHeading; // камера за спиной, противник впереди
}

// Слушатель стоит раньше, чем в input.js: клик по подсвеченной вещи — взять вещь, а не идти
renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button !== 0 || !clickMoveAllowed() || hoveredPickable) return;
  const p = clickGroundPoint(e);
  if (!p) return;
  const enemy = clickEnemy();
  if (enemy) {
    clickStartCombat(enemy);
    return;
  }
  const entry = clickDoorEntry();
  if (entry) {
    clickMoveTo(entry.walkTo.x, entry.walkTo.z);
    clickDoor = { entry, frames: 0 };
    return;
  }
  clickDoor = null;
  clickMoveTo(p.x, p.z);
  clickHeld = true;
});
renderer.domElement.addEventListener('mousemove', (e) => {
  if (!clickHeld || !clickTarget || clickDoor) return;
  if (!(e.buttons & 1)) {
    clickHeld = false;
    return;
  }
  const p = clickGroundPoint(e);
  if (p) clickMoveTo(p.x, p.z);
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 0) clickHeld = false;
});

// Для updateWalking: { turn, go } — повернуть на turn и идти ли вперед; null — кликом никуда не идем.
// c — клавиши этого кадра: любая из W/A/S/D отменяет ходьбу кликом
function clickMoveSteer(c) {
  if (!clickTarget) return null;
  if (c.up || c.down || c.turnLeft || c.turnRight || !clickMoveAllowed()) {
    clickMoveStop();
    return null;
  }
  const dx = clickTarget.x - playerWorldX;
  const dz = clickTarget.z - playerWorldZ;
  const dist = Math.hypot(dx, dz);
  if (dist < clickArriveDist) {
    if (!clickDoor) clickMoveStop();
    return null;
  }
  // Вперед в мире — (−sin h, −cos h)
  const want = Math.atan2(-dx, -dz);
  const d = Math.atan2(Math.sin(want - playerHeading), Math.cos(want - playerHeading));
  const turn = Math.max(-clickTurnRate, Math.min(clickTurnRate, d));
  return { turn, go: Math.abs(d - turn) < 1.2, step: Math.min(playerSpeed, dist) };
}

// Раз в кадр из главного цикла: дошли ли, не уперлись ли, пора ли входить в дверь
function updateClickMove() {
  if (!clickTarget) return;
  if (clickDoor) {
    clickDoor.frames++;
    const it = clickDoor.entry;
    if (it.near()) {
      clickMoveStop();
      it.act(); // дошли до двери сами — просто входим
    } else if (clickDoor.frames >= clickDoorFrames) {
      clickEnterFar(it);
    }
    return;
  }
  // Уперлись: за 40 кадров не приблизились — стоп
  const dist = Math.hypot(clickTarget.x - playerWorldX, clickTarget.z - playerWorldZ);
  if (dist < clickStuck.d - 0.05) clickStuck = { d: dist, frames: 0 };
  else if (++clickStuck.frames > 40) clickMoveStop();
}

// Не дошли за 2 секунды — сразу у двери и внутри; время — как на оставшийся путь пешком
function clickEnterFar(it) {
  const dist = Math.hypot(it.walkTo.x - playerWorldX, it.walkTo.z - playerWorldZ);
  const minutes = travelMinutes(dist, false);
  clickMoveStop();
  travelFadeEl.style.transition = 'none';
  travelFadeEl.style.opacity = '0.85';
  void travelFadeEl.offsetWidth;
  travelFadeEl.style.transition = 'opacity 0.6s';
  travelFadeEl.style.opacity = '0';
  playerWorldX = it.walkTo.x;
  playerWorldZ = it.walkTo.z;
  walkAmp = 0;
  advanceGameTime(minutes);
  clockShown = '';
  it.act(); // если заперто — скажет и оставит у двери
  if (minutes >= 1) showToast('Пешком до двери: ' + Math.round(dist) + ' м, ушло ' + formatDuration(minutes) + '. Сейчас ' + formatGameTime() + '.', 4000);
}
