// src/player/click-move.js
// КЛИК ПО МЕСТАМ, КОТОРЫЕ МЕНЯЮТ ЛОКАЦИЮ (только компьютер, мирный режим, пешком). Клик по земле ничего не делает: герой пешком
// ходит клавишами, маркера «идем сюда» нет. Зато клик по зданию с дверью, по лестнице, по выходу из здания, по человеку или машине:
//   герой полсекунды идет туда, и тут же меняется локация (вошел, поднялся, заговорил, сел), а время уходит так, будто он
//   шел пешком (оставшийся путь / скорость, как при перемещении по карте, src/player/travel.js) — даже если вход далеко.
// Любая из W/A/S/D, разговор, оружие в руках или машина — и герой останавливается. Уперся в стену — тоже стоп.
//   Клик по зданию с дверью (запись в interactables с clickObject и walkTo, src/engine/interact.js) и клик рядом с точкой
//   записи с clickPoint() (лестница, выход из здания): идем clickDoorFrames (полсекунды), потом — сразу на месте.
//   Клик по противнику (живая запись в combatTargets) — сразу боевой режим: герой достает оружие (последнее,
//   что доставал, иначе из активной ячейки или первое) и разворачивается к нему вместе с камерой; мышь
//   захватывается для прицела тем же кликом (src/engine/mouse-look.js).
//   Клик по человеку или машине (настройка «Клик по человеку, двери и машине», settings.clickInteract, по умолчанию
//   включена; выключили — клик по людям и машинам ведет по земле, а дверь — к точке перед зданием): герой подходит и
//   заговаривает или садится (закрытую или без ключей — говорит почему, как по E). Правило то же, что у двери:
//   идем clickDoorFrames (2 секунды), а если не дошли — сразу рядом, и время уходит как на дорогу пешком.
// Клик по вещи берет вещь (src/engine/input.js); в боевом режиме клик — огонь (src/engine/weapons.js).
// clickMoveSteer() зовет updateWalking (src/player/player.js), updateClickMove() — главный цикл.

const clickDoorFrames = 30; // полсекунды идем к двери, потом — сразу внутрь
const clickArriveDist = 0.4;
const clickTurnRate = 0.18; // поворот к точке за кадр (рад) — быстрее, чем A/D
let clickTarget = null; // { x, z } — куда идем (мир)
let clickDoor = null; // { entry, frames } — идем к двери этого входа
let clickHeld = false; // левая кнопка зажата — точку ведем мышью
let clickStuck = { d: Infinity, frames: 0 };
let clickGoal = null; // { kind: 'person' | 'car', ref, frames } — к кому или к чему идем, чтобы заговорить или сесть
const clickTalkReach = 2.2; // с какого расстояния начинаем разговор (nearestPerson берет до 2.8)

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
  clickGoal = null;
  clickMarker.visible = false;
}

function clickMoveTo(x, z) {
  clickTarget = { x, z };
  clickStuck = { d: Infinity, frames: 0 };
  clickMarker.position.set(x, 0.06, z); // метки на земле нет: куда идем, не показываем
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

// Лестница или выход из здания рядом с кликом: запись с clickPoint() (возвращает { x, z, r } или null, если сейчас не подходит)
// Дверь стоит вертикально: луч по ней попадает в землю за ней, поэтому кроме расстояния по земле смотрим, где дверь на экране
// (точка двери на высоте cp.y, по умолчанию 1,2, переводится в пиксели и сравнивается с кликом)
const clickProbe = new THREE.Vector3();
function clickScreenDist(e, cp) {
  clickProbe.set(cp.x, cp.y === undefined ? 1.2 : cp.y, cp.z);
  cityGroup.localToWorld(clickProbe);
  clickProbe.project(camera);
  if (!(clickProbe.z <= 1)) return Infinity;
  const d = Math.hypot((clickProbe.x * 0.5 + 0.5) * window.innerWidth - e.clientX, (-clickProbe.y * 0.5 + 0.5) * window.innerHeight - e.clientY);
  return Number.isFinite(d) ? d : Infinity;
}
const clickDoorPixels = 60;

function clickPointEntry(p, e) {
  let best = null;
  let bestScore = Infinity;
  for (const it of interactables) {
    if (!it.clickPoint) continue;
    const cp = it.clickPoint();
    if (!cp) continue;
    const ground = Math.hypot(p.x - cp.x, p.z - cp.z) / (cp.r || 2.2); // меньше 1 — клик у двери на земле
    const screen = e ? clickScreenDist(e, cp) / clickDoorPixels : Infinity; // меньше 1 — клик по самой двери на экране
    const score = Math.min(ground, screen);
    if (score < 1 && score < bestScore) {
      bestScore = score;
      best = { near: it.near, act: it.act, walkTo: { x: cp.x, z: cp.z } };
    }
  }
  return best;
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
  const id = ids.includes(heroWeapon.last) ? heroWeapon.last : activeWeaponId();
  if (!id) return toggleWeapon();
  if (!drawWeapon(id)) return;
  playerHeading = Math.atan2(-(t.x - playerWorldX), -(t.z - playerWorldZ));
  worldRotation = -playerHeading; // камера за спиной, противник впереди
}

// Кого или что показывает уже направленный луч: человека или машину (ближайшее попадание) или null
function clickPeopleAndCars() {
  const ci = currentInterior();
  const people = ci ? ci.def.people.filter((p) => p.floor === ci.floor) : npcs;
  const cand = people.filter((p) => p.mesh && !p.helping && hoverShown(p.mesh)).map((p) => ({ kind: 'person', ref: p, mesh: p.mesh }));
  if (!insideBuilding() && !drivingCar) {
    for (const c of cars) if (c.mesh && hoverShown(c.mesh)) cand.push({ kind: 'car', ref: c, mesh: c.mesh });
  }
  if (!cand.length) return null;
  const hit = clickRaycaster.intersectObjects(cand.map((c) => c.mesh), true)[0];
  if (!hit) return null;
  for (let o = hit.object; o; o = o.parent) {
    const t = cand.find((c) => c.mesh === o);
    if (t) return t;
  }
  return null;
}

// Где сейчас цель клика: человек ходит, у людей в здании координаты этажа
const clickGoalPos = (g) => (g.kind === 'person' ? personWorld(g.ref) : { x: g.ref.x, z: g.ref.z });
const clickCarDist = (c) => Math.hypot(c.x - playerWorldX, c.z - playerWorldZ) - (c.half.l - carHalf.l); // длинный БТР — с любого конца

// Слушатель стоит раньше, чем в input.js: клик по подсвеченной вещи — взять вещь, а не идти
renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  clickGoal = null; // любой новый клик отменяет прежнюю цель
  if (!clickMoveAllowed() || hoveredPickable) return;
  const p = clickGroundPoint(e);
  if (!p) return;
  const enemy = clickEnemy();
  if (enemy) {
    clickStartCombat(enemy);
    return;
  }
  const who = settings.clickInteract ? clickPeopleAndCars() : null;
  if (who) {
    const pos = clickGoalPos(who);
    clickGoal = { kind: who.kind, ref: who.ref, frames: 0 };
    clickDoor = null;
    clickHeld = false;
    clickMoveTo(pos.x, pos.z);
    e.stopImmediatePropagation(); // дальше input.js этот клик не видит
    return;
  }
  const entry = settings.clickInteract ? clickDoorEntry() : null;
  if (entry) {
    clickMoveTo(entry.walkTo.x, entry.walkTo.z);
    clickDoor = { entry, frames: 0 };
    return;
  }
  const point = settings.clickInteract ? clickPointEntry(p, e) : null;
  if (point) {
    clickMoveTo(point.walkTo.x, point.walkTo.z);
    clickDoor = { entry: point, frames: 0 };
  }
  // Клик по земле никуда не ведет
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

// Дошли до человека или машины: разговор или посадка
function clickInteractNow(g) {
  clickMoveStop();
  if (g.kind === 'person') {
    const pos = clickGoalPos(g);
    playerHeading = Math.atan2(-(pos.x - playerWorldX), -(pos.z - playerWorldZ)); // лицом к собеседнику
    startDialogue(g.ref, rootDialogue(g.ref));
  } else {
    const why = carBlockedReason(g.ref);
    if (why) showToast(why, 3000);
    else enterCar(g.ref);
  }
}

// Не дошли за 2 секунды — сразу рядом; время — как на оставшийся путь пешком (как у двери, clickEnterFar)
function clickInteractFar(g) {
  const pos = clickGoalPos(g);
  const dist = Math.hypot(pos.x - playerWorldX, pos.z - playerWorldZ);
  const back = (g.kind === 'person' ? 1.8 : g.ref.half.l + 1.5) / (dist || 1); // встаем со стороны игрока
  const spot = findFreeSpot(pos.x + (playerWorldX - pos.x) * back, pos.z + (playerWorldZ - pos.z) * back, (x, z) => !blockedOutside(x, z));
  const minutes = travelMinutes(dist, false);
  clickMoveStop();
  travelFadeEl.style.transition = 'none';
  travelFadeEl.style.opacity = '0.85';
  void travelFadeEl.offsetWidth;
  travelFadeEl.style.transition = 'opacity 0.6s';
  travelFadeEl.style.opacity = '0';
  playerWorldX = spot.x;
  playerWorldZ = spot.z;
  walkAmp = 0;
  advanceGameTime(minutes);
  clockShown = '';
  clickInteractNow(g);
  if (minutes * 60 >= 10) showToast('Пешком: ' + Math.round(dist) + ' м, ушло ' + formatDuration(minutes) + '. Сейчас ' + formatGameTime() + '.', 4000);
}

// Раз в кадр: цель-человек ходит, поэтому точку обновляем; дошли — говорим или садимся
function updateClickGoal() {
  const g = clickGoal;
  if (!g) return;
  if (!clickTarget || !clickMoveAllowed()) {
    clickGoal = null; // остановили сами (клавиши, оружие, разговор) или уперлись
    return;
  }
  const pos = clickGoalPos(g);
  if (!pos || (g.kind === 'car' && !cars.includes(g.ref))) {
    clickMoveStop();
    return;
  }
  const arrived = g.kind === 'car'
    ? clickCarDist(g.ref) <= enterRadius - 0.6
    : Math.hypot(pos.x - playerWorldX, pos.z - playerWorldZ) <= clickTalkReach;
  if (arrived) {
    clickInteractNow(g);
    return;
  }
  clickTarget.x = pos.x;
  clickTarget.z = pos.z;
  clickMarker.position.set(pos.x, 0.06, pos.z);
  // Ходьба кликом идет по прямой и упирается в первое препятствие; как у двери, это не обрывает путь:
  // через 2 секунды герой все равно окажется рядом (иначе проверка «уперлись» остановила бы его за 40 кадров)
  clickStuck = { d: Infinity, frames: 0 };
  // Внутри здания пол маленький — доходим сами; снаружи после 2 секунд переносимся
  if (++g.frames >= clickDoorFrames && !insideBuilding()) {
    clickGoal = null;
    clickInteractFar(g);
  }
}

// Раз в кадр из главного цикла: дошли ли, не уперлись ли, пора ли входить в дверь
function updateClickMove() {
  updateClickGoal();
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
  if (minutes * 60 >= 10) showToast('Пешком до двери: ' + Math.round(dist) + ' м, ушло ' + formatDuration(minutes) + '. Сейчас ' + formatGameTime() + '.', 4000);
}
