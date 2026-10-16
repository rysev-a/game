// src/player/driving.js
// Машина игрока и вождение: посадка/выход (ключи!), физика езды со столкновениями, камера за рулем.
// Все остальные машины мира живут в общем списке cars (src/world/cars.js); в машину игрока можно
// сесть, только если в инвентаре есть ключи.

let drivingCar = null; // машина, в которой сидит игрок
const enterRadius = 4; // на каком расстоянии от машины можно сесть
const exitMaxSpeed = 0.03; // выйти можно, только когда машина почти стоит
const carAccel = 0.02;
const carBrake = 0.04;
const carDrag = 0.006;
const carMaxSpeed = 0.8;
const carMaxReverse = -0.3;
const carTurnRate = 0.045;
// Езда обычной легковушки; у гоночной, джипа, трактора и БТР — свои числа (VEHICLE_KINDS, src/world/vehicles.js)
// drift — насколько машину заносит на ручнике (1 — как гоночную)
const carDrive = { accel: carAccel, brake: carBrake, drag: carDrag, maxSpeed: carMaxSpeed, maxReverse: carMaxReverse, turnRate: carTurnRate, drift: 0.6 };

// ЗАНОС. Space на компьютере (на телефоне — кнопка «ручник», src/engine/touch-drive.js) на ходу — ручник: задние колеса скользят, тормозит он слабее обычного тормоза,
// руль поворачивает кузов сильнее, а машина по инерции едет прежним курсом — ее заносит (car.slip — угол
// между носом и направлением движения). Отпустили — шины снова цепляются, и машина выравнивается.
// Пока заносит, шины оставляют на земле темные следы (updateTireMarks). Глубина заноса — настройка
// «Глубина заноса» (settings.driftLevel), резкость торможения, разгона и руля — тоже в настройках (вкладка «Вождение»).
// На телефоне Space — просто тормоз (им останавливает кнопка выхода), а занос — кнопкой ручника.
// Шкала «Глубина заноса» 1–100% — это прежние 1–20%: регулировать можно мелко (driftScale).
//
// ДРИФТ (у гоночных, kind.powerDrift): газ и ручник вместе на ходу (W+Space, на телефоне — газ и «ручник») — задние
// колеса срываются, мотор держит скорость, и машина едет боком, пока держите оба. Задним ходом (S+Space,
// на телефоне — R, газ и ручник) — дрифт задом. Рулем держат угол:
// в сторону поворота — заносит глубже, против — выравнивается. Угол и легкость срыва — от глубины заноса
// в настройках и от kind.drift машины.
//
// ПЛАВНЫЙ СТАРТ: у машины с kind.launch с места разгон слабее (launch — доля от полного), к launchUntil
// доле максимальной скорости — полный (launchFactor).
const handbrakeBrake = 0.3; // ручник тормозит слабее тормоза (доля от k.brake)
const handbrakeMinSpeed = 0.06; // медленнее — ручник просто держит машину
const slideFriction = 0.025; // потеря скорости боком (на радиан заноса)
const driftScale = 0.2; // 100% на шкале «Глубина заноса» — это прежние 20%
const powerDriftMinSpeed = 0.15; // медленнее — газ с ручником просто разгоняют (старт с пробуксовкой)
const cameraFollowEase = 0.04; // как быстро камера возвращается за машину (0..1 за кадр)
let carTime = 0;

// ТОПЛИВО. Полного бака хватает на fuelRange юнитов пути. У машины игрока в начале 65%.
// Закончился бензин — мотор не тянет; заправиться можно у колонки на заправке (src/locations/city/gas-station.js)
const fuelRange = 2800;
const fuelLow = 0.15; // ниже — предупреждение
const refuelRate = 1 / 240; // доля бака за кадр (≈4 секунды на полный бак)
let lowFuelWarned = false;
let emptyFuelWarned = false;

// Ближайшая машина в радиусе enterRadius (с закрытыми — для подсказки «машина закрыта»)
function nearestCar() {
  let best = null;
  let bestDist = enterRadius;
  for (const c of cars) {
    const d = Math.hypot(c.x - playerWorldX, c.z - playerWorldZ) - (c.half.l - carHalf.l); // длинный БТР — с любого конца
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}

// ПРАВИЛО: сесть можно только в свою машину или в ту, от которой есть ключи. Каждая машина
// открывается ключами со своим car.keyId (у машины игрока это 'keys' — «Ключи от машины»),
// служебные (полиция, скорая) закрыты всегда. Возвращает причину отказа или null
function carBlockedReason(car) {
  if (car.locked) return car.lockedMsg || 'Эта машина закрыта';
  if (car.broken) return car.kind.name + ' подбит и не заводится';
  if (car.open || hasItem(car.keyId)) return null;
  return car.isPlayerCar ? 'Ваша машина закрыта — нужны ключи от машины' : 'Эта машина закрыта: у вас нет от нее ключей';
}

addInteractable({
  priority: -1, // у двери/кнопки/вещей приоритет выше
  near: () => !drivingCar && !insideBuilding() && nearestCar() !== null,
  prompt: () => {
    const car = nearestCar();
    if (carBlockedReason(car)) return carBlockedReason(car);
    if (car.kind) return 'E — сесть: ' + car.kind.name.toLowerCase();
    return car.isPlayerCar ? 'E — сесть в свою машину' : 'E — сесть в машину (есть ключи)';
  },
  act: () => {
    const car = nearestCar();
    if (!carBlockedReason(car)) enterCar(car);
  },
});

// Канистра с бензином (от соседа): E рядом со своей машиной заливает бензин — катить не нужно
const canisterFuel = 0.45; // сколько бака доливает канистра
addInteractable({
  priority: 3, // важнее «толкать» и «сесть»
  near: () => {
    if (drivingCar || insideBuilding() || !hasItem('canister')) return false;
    const car = nearestCar();
    return !!car && car.isPlayerCar && car.fuel < 0.55;
  },
  prompt: () => 'E — залить бензин из канистры',
  act: () => {
    const car = nearestCar();
    car.fuel = Math.min(1, car.fuel + canisterFuel);
    removeItem('canister');
    showToast('Бензин залит: +' + Math.round(canisterFuel * 100) + '%. Можно ехать', 4000);
  },
});

// Сесть за руль
function enterCar(car) {
  drivingCar = car;
  car.slip = 0;
  playerWorldX = car.x;
  playerWorldZ = car.z;
  player.visible = false;
  player.position.y = playerGroundY;
  jumpVelocity = 0;
  walkAmp = 0;
}

// Выйти: только когда машина почти стоит (force — выбраться сразу: подбитый БТР)
function exitCar(force = false) {
  if (Math.abs(drivingCar.speed) > exitMaxSpeed && !force) return;
  const h = drivingCar.heading;
  const side = drivingCar.half.w + 1.4;
  const end = drivingCar.half.l + 1.1;
  // Выходим с левой стороны; если там стена или другая машина — справа, сзади, спереди
  const sides = [
    [-Math.cos(h) * side, Math.sin(h) * side],
    [Math.cos(h) * side, -Math.sin(h) * side],
    [Math.sin(h) * end, Math.cos(h) * end],
    [-Math.sin(h) * end, -Math.cos(h) * end],
  ];
  const spot = sides.find(([ox, oz]) => !blockedOutside(drivingCar.x + ox, drivingCar.z + oz)) || sides[0];
  playerWorldX = drivingCar.x + spot[0];
  playerWorldZ = drivingCar.z + spot[1];
  playerHeading = h; // вышел — смотрит туда же, куда машина
  playerYaw = h + worldRotation;
  drivingCar.speed = 0;
  drivingCar.slip = 0;
  drivingCar = null;
  player.visible = true;
}

// ЕЗДА: W/S — газ и тормоз/задний ход, A/D — руль, Space — ручник.
// Игрок «приклеен» к машине, камера остается на нем и поворачивается вместе с рулем
function updateDriving(c) {
  carTime += 1 / 60;
  if (!drivingCar) return;
  const car = drivingCar;
  const base = car.kind || carDrive;
  // Резкость разгона, торможения и руля — множители из настроек (src/engine/settings.js)
  const k = {
    ...base,
    accel: base.accel * settings.accelSharp * launchFactor(base, car.speed),
    brake: base.brake * settings.brakeSharp,
    turnRate: base.turnRate * settings.steerSens,
  };
  const hasFuel = car.fuel > 0;
  const onTouch = touchUI && typeof touchDrive !== 'undefined';
  const handLever = onTouch ? touchDrive.handbrake : keys['Space'];
  const carDrift = base.drift === undefined ? carDrive.drift : base.drift;
  const driftLevel = settings.driftLevel * carDrift; // 0..1 по шкале настроек
  const depth = driftLevel * driftScale;
  // Дрифт: газ (или задний ход) и ручник вместе на скорости
  const gasHeld = onTouch ? touchDrive.gas && (touchDrive.gear === 'D' || touchDrive.gear === 'M') : c.up;
  const backHeld = onTouch ? touchDrive.gas && touchDrive.gear === 'R' : c.down && !c.up;
  const engineOn = !!base.powerDrift && hasFuel && (gasHeld || backHeld); // у гоночных газ на ручнике тянет
  const powerDrift = engineOn && handLever &&
    ((gasHeld && car.speed > powerDriftMinSpeed) || (backHeld && car.speed < -powerDriftMinSpeed * 0.5));
  const handbrake = handLever && !powerDrift && Math.abs(car.speed) > handbrakeMinSpeed;
  if (powerDrift && car.speed > 0) {
    // Мотор почти держит скорость; потерю на боковом скольжении восполняет газ
    const top = k.maxSpeed * 0.8;
    if (car.speed < top) car.speed = Math.min(top, car.speed + k.accel * 0.9);
    else car.speed -= k.drag;
  } else if (powerDrift) {
    // Задом: так же, но к пределу заднего хода
    const top = k.maxReverse * 0.9;
    if (car.speed > top) car.speed = Math.max(top, car.speed - k.accel * 0.7);
  } else if (onTouch && typeof touchDriveStep === 'function' && touchDriveStep(car, k, hasFuel)) {
    // На телефоне — педали и коробка передач (src/engine/touch-drive.js), на компьютере — клавиши
    // скорость уже посчитана
  } else if (c.up && hasFuel && (!handbrake || engineOn)) car.speed += car.speed < 0 ? k.brake : k.accel; // на ручнике газ не тянет (кроме гоночных)
  else if (c.down && hasFuel) car.speed -= car.speed > 0 ? k.brake : k.accel * 0.7;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), k.drag);
  // Ручник тормозит; у гоночных с газом — нет: с места это старт с пробуксовкой, на скорости — дрифт
  if ((keys['Space'] || handLever) && !(engineOn && handLever)) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), k.brake * (handbrake ? handbrakeBrake : 1));
  car.speed = Math.min(Math.max(car.speed, k.maxReverse), k.maxSpeed);

  // Поворачивать можно только в движении; задним ходом руль работает наоборот.
  // Руль на телефоне — кнопки ◀ ▶ (src/engine/touch-drive.js) или наклон телефона (src/engine/gyro-steer.js), −1..1
  let steer = (c.left ? 1 : 0) - (c.right ? 1 : 0);
  if (!steer && typeof touchDriveSteer === 'function') steer = touchDriveSteer();
  if (!steer && typeof gyroSteer === 'function') steer = gyroSteer(car) || 0;
  let turn = steer * k.turnRate * Math.min(1, Math.abs(car.speed) / 0.15) * Math.sign(car.speed);
  // На ручнике кузов поворачивает резче, а шины держат слабо — заносит тем сильнее, чем больше глубина заноса.
  // Без ручника шины цепляются почти сразу (у гоночной на большой глубине — чуть скользит и в обычных поворотах)
  if (handbrake) turn *= 1 + 1.3 * depth;
  let grip = handbrake ? 0.12 - 0.1 * depth : 0.55 - 0.3 * depth;
  let maxSlip = 0.35 + 0.9 * depth;
  // Дрифт: кузов поворачивает резче, шины почти не держат — машина идет боком (до ~70° на полной глубине)
  if (powerDrift) {
    const d = Math.min(1.2, 0.15 + driftLevel);
    turn *= 1.2 + 0.8 * d;
    grip = Math.max(0.004, 0.04 - 0.04 * d);
    maxSlip = 0.45 + 0.7 * d;
  }

  const { appliedTurn, blockedX, blockedZ, vx, vz } = moveCarWithCollisions(car, turn, grip, maxSlip);
  car.speed *= 1 - slideFriction * (powerDrift ? 0.6 : 1) * Math.abs(Math.sin(car.slip)); // боком машина быстро теряет скорость
  car.drifting = powerDrift;
  updateTireMarks(car, handbrake || powerDrift);
  // Бензин расходуется на пройденный путь
  const travelled = Math.hypot(vx, vz);
  car.fuel = Math.max(0, car.fuel - travelled / fuelRange);
  if (car.fuel > fuelLow) lowFuelWarned = false;
  if (car.fuel > 0) emptyFuelWarned = false;
  if (car.fuel <= fuelLow && !lowFuelWarned && car.fuel > 0) {
    lowFuelWarned = true;
    showToast('Бензин на исходе. Заправка — на трассе у торгового центра', 5000);
  }
  if (car.fuel <= 0 && !emptyFuelWarned) {
    emptyFuelWarned = true;
    showToast('Бензин закончился. F — выйти, потом E у машины — толкать', 6000);
  }
  if (blockedX && blockedZ) car.speed *= -0.25;
  else if (blockedX || blockedZ) car.speed *= 0.85;
  if (blockedX || blockedZ) car.slip *= 0.5; // ударились — занос гаснет
  if (car.crush) crushUnder(car);
  playerWorldX = car.x;
  playerWorldZ = car.z;
  followCamera(car, appliedTurn);
}

// Плавный старт: доля разгона на скорости speed (1 — полный). launch — доля с места, launchUntil — к какой доле
// максимальной скорости разгон уже полный
function launchFactor(kind, speed) {
  if (!kind.launch || speed <= 0) return 1;
  const t = Math.min(1, speed / (kind.maxSpeed * (kind.launchUntil || 0.35)));
  return kind.launch + (1 - kind.launch) * t * t * (3 - 2 * t);
}

// СЛЕДЫ ШИН: пока машину заносит (или она скользит на ручнике), под задними колесами остаются темные полосы.
// Полосы — один InstancedMesh на весь мир: новые занимают место самых старых (tireMarkCount штук)
const tireMarkCount = 2400;
const tireMarkWidth = 0.32;
const tireMarks = new THREE.InstancedMesh(
  new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  new LitMaterial({ color: 0x141414, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  tireMarkCount,
);
tireMarks.count = 0;
tireMarks.frustumCulled = false;
tireMarks.renderOrder = 1;
cityGroup.add(tireMarks);
let tireMarkNext = 0;
const tireMarkMatrix = new THREE.Matrix4();
const tireMarkPos = new THREE.Vector3();
const tireMarkQuat = new THREE.Quaternion();
const tireMarkScale = new THREE.Vector3();
const tireMarkUp = new THREE.Vector3(0, 1, 0);

function addTireMark(x1, z1, x2, z2) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  if (len < 0.01) return;
  tireMarkPos.set((x1 + x2) / 2, 0.06, (z1 + z2) / 2);
  tireMarkQuat.setFromAxisAngle(tireMarkUp, Math.atan2(x2 - x1, z2 - z1));
  tireMarkScale.set(tireMarkWidth, 1, len + 0.05); // чуть внахлест, чтобы полоса была сплошной
  tireMarks.setMatrixAt(tireMarkNext, tireMarkMatrix.compose(tireMarkPos, tireMarkQuat, tireMarkScale));
  tireMarkNext = (tireMarkNext + 1) % tireMarkCount;
  tireMarks.count = Math.max(tireMarks.count, tireMarkNext === 0 ? tireMarkCount : tireMarkNext);
  tireMarks.instanceMatrix.needsUpdate = true;
}

function updateTireMarks(car, handbrake) {
  const sliding = Math.abs(car.speed) > 0.08 && (handbrake || Math.abs(car.slip) > 0.12);
  car.sliding = sliding; // визг шин на заносе (src/engine/sound.js)
  // Задние колеса: сзади от центра (нос машины — по -z модели) и по бокам
  const h = car.heading;
  const back = car.half.l * 0.65;
  const side = car.half.w * 0.78;
  const bx = car.x + Math.sin(h) * back;
  const bz = car.z + Math.cos(h) * back;
  const wheels = [
    [bx + Math.cos(h) * side, bz - Math.sin(h) * side],
    [bx - Math.cos(h) * side, bz + Math.sin(h) * side],
  ];
  if (sliding && car.lastWheels) {
    for (let i = 0; i < 2; i++) addTireMark(car.lastWheels[i][0], car.lastWheels[i][1], wheels[i][0], wheels[i][1]);
  }
  car.lastWheels = sliding ? wheels : null;
}

// БТР ДАВИТ БИОСУЩЕСТВ: на ходу живое существо, которого коснулся корпус, погибает сразу (броня и
// иммунитеты не важны). Роботы — железо: в них БТР упирается (src/engine/collisions.js)
const crushMinSpeed = 0.08;
function crushUnder(car) {
  if (Math.abs(car.speed) < crushMinSpeed) return;
  const shape = carShape(car.x, car.z, car.heading, car.half);
  for (const t of combatTargets) {
    if (t.dead || t.kind !== 'bio') continue;
    if (!circleHitsShape(t.x + t.off.x, t.z + t.off.z, t.r * 0.8, shape)) continue;
    hitTarget(t, { damage: t.hp + 1, type: 'crush', hitsAll: true, x: car.x, z: car.z });
    if (typeof spawnWeaponFx === 'function') spawnWeaponFx(t.x, 0.4, t.z, 0x8a2a1a, t.r, 24, 1.05);
    car.speed *= 0.9; // тряхнуло
  }
}

// Поворот и движение машины на car.speed с учетом столкновений: упираясь в стену, машина
// скользит вдоль нее (по осям отдельно). Возвращает, что получилось, — вызывающий решает,
// как гасить скорость при ударе.
// grip (0..1) — как держат шины: 1 — машина едет туда, куда смотрит нос; меньше — по инерции продолжает
// прежний курс, и нос уходит в сторону (занос, car.slip не больше maxSlip радиан)
function moveCarWithCollisions(car, turn, grip = 1, maxSlip = 1) {
  let heading = car.heading + turn;
  if (!carFree(car, car.x, car.z, heading)) heading = car.heading;
  const appliedTurn = heading - car.heading;
  car.slip = Math.max(-maxSlip, Math.min(maxSlip, ((car.slip || 0) - appliedTurn) * (1 - grip)));
  const dir = heading + car.slip; // куда на самом деле едет машина
  const vx = -Math.sin(dir) * car.speed;
  const vz = -Math.cos(dir) * car.speed;
  let blockedX = false;
  let blockedZ = false;
  if (carFree(car, car.x + vx, car.z, heading)) car.x += vx;
  else blockedX = true;
  if (carFree(car, car.x, car.z + vz, heading)) car.z += vz;
  else blockedZ = true;
  car.heading = heading;
  return { appliedTurn, blockedX, blockedZ, vx, vz };
}

// Камера поворачивается вместе с машиной: нос смотрит вверх экрана. Поворот передаем камере
// как есть, а остаток (после посадки или ручного вращения колесом мыши/стрелками) плавно доворачиваем к нулю
function followCamera(car, appliedTurn) {
  worldRotation -= appliedTurn;
  if (viewDragging || cameraHoldFrames > 0) return; // вид крутят мышью или стрелками
  const offset = worldRotation + car.heading;
  worldRotation -= Math.atan2(Math.sin(offset), Math.cos(offset)) * cameraFollowEase;
}

// ТОЛКАНИЕ. Если машина «села» (кончился бензин), ее можно толкать: подойти, E — игрок встает
// слева у открытой водительской двери: одной рукой рулит, другой толкает. W — толкать вперед,
// S — тянуть назад, A/D — направлять, E или F — отпустить.
// Если человека попросили помочь (диалог, src/player/talk.js), он толкает сзади, и машина катится
// очень быстро. Докатить машину до заправки можно и самому — медленно
const pushSpeed = 0.1; // толкать вперед одному (юнитов за кадр)
const pushBackSpeed = 0.07; // тянуть назад
const pushAccel = 0.004; // машина разгоняется тяжело
const helperPushSpeed = 0.75; // вдвоем с помощником — быстро
const helperPushBackSpeed = 0.35;
const helperPushAccel = 0.03;
const pushTurnRate = 0.02;
const pushSideX = 1.2; // водитель стоит слева от центра машины на этом расстоянии…
const pushSideZ = 0.3; // …и чуть позади центра, у проема двери
const pushRearOffset = carHalf.l + 0.9; // помощник стоит сзади (руки упираются в багажник)
let pushingCar = null;

const canPush = (car) => !!car && !car.locked && car.fuel <= 0;
const helperIsPushing = (car) => !!car && !!car.helper && car.helper.ready;

addInteractable({
  priority: 1,
  near: () => !drivingCar && !pushingCar && !insideBuilding() && canPush(nearestCar()),
  prompt: () => 'У машины кончился бензин. E — толкать',
  act: () => startPush(nearestCar()),
});
addInteractable({
  priority: 5, // пока толкаете, это главное действие
  near: () => !!pushingCar,
  prompt: () => 'E или F — отпустить машину. W — толкать, S — тянуть, A/D — направлять',
  act: () => releaseCar(),
});

function startPush(car) {
  pushingCar = car;
  player.visible = true;
  jumpVelocity = 0;
  car.mesh.setDoor(true); // водительская дверь открыта, пока толкаем
}

function releaseCar() {
  if (pushingCar) {
    playerHeading = pushingCar.heading; // отпустил — смотрит туда же, куда машина
    pushingCar.speed = 0;
    pushingCar.mesh.setDoor(false);
  }
  pushingCar = null;
}

// Где стоит водитель при толкании: слева у двери (мир)
function pushDriverSpot(car) {
  const h = car.heading;
  return {
    x: car.x - Math.cos(h) * pushSideX + Math.sin(h) * pushSideZ,
    z: car.z + Math.sin(h) * pushSideX + Math.cos(h) * pushSideZ,
  };
}

// Где стоит помощник при толкании: сзади машины (мир)
function pushHelperSpot(car) {
  return {
    x: car.x + Math.sin(car.heading) * pushRearOffset,
    z: car.z + Math.cos(car.heading) * pushRearOffset,
  };
}

function updatePushing(c) {
  if (!pushingCar) return;
  const car = pushingCar;
  const fast = helperIsPushing(car);
  const forward = fast ? helperPushSpeed : pushSpeed;
  const backward = fast ? helperPushBackSpeed : pushBackSpeed;
  const accel = fast ? helperPushAccel : pushAccel;
  const target = c.up ? forward : c.down ? -backward : 0;
  car.speed += Math.sign(target - car.speed) * Math.min(Math.abs(target - car.speed), accel);
  // Направлять можно, только когда катится; задним ходом руль наоборот, как у настоящей машины
  const steer = (c.left ? 1 : 0) - (c.right ? 1 : 0);
  const turn = steer * (fast ? pushTurnRate * 2 : pushTurnRate) * Math.min(1, Math.abs(car.speed) / 0.04) * Math.sign(car.speed);
  const { appliedTurn, blockedX, blockedZ } = moveCarWithCollisions(car, turn);
  if (blockedX && blockedZ) car.speed = 0; // уперлись — стоит
  else if (blockedX || blockedZ) car.speed *= 0.7;

  // Водитель — слева у двери, лицом по ходу: поворачивается вместе с машиной
  const spot = pushDriverSpot(car);
  playerWorldX = spot.x;
  playerWorldZ = spot.z;
  followCamera(car, appliedTurn);
}

// Метка над машиной игрока: покачивающийся бирюзовый ромб, виден, пока вы не за рулем
let playerCarMarker = null;
function markPlayerCar(car) {
  playerCarMarker = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.45, 0),
    new THREE.MeshBasicMaterial({ color: 0x4ff0e0 }),
  );
  playerCarMarker.scale.y = 1.4;
  car.mesh.add(playerCarMarker);
}

// Положение моделей всех машин, вращение колес и вибрация
function updateCarMeshes() {
  if (playerCarMarker) {
    playerCarMarker.visible = !drivingCar;
    playerCarMarker.position.y = 3.2 + Math.sin(carTime * 3) * 0.2;
    playerCarMarker.rotation.y = carTime * 1.5;
  }
  for (const c of cars) {
    c.mesh.position.set(c.x, 0, c.z);
    c.mesh.rotation.y = c.heading;
    c.mesh.spinWheels(c.speed);
    c.mesh.updateCar(carTime, Math.abs(c.speed) / (c.kind || carDrive).maxSpeed);
    if (c.update) c.update(c); // дым подбитого БТР и т. п. (src/world/vehicles.js)
  }
  if (typeof updateVehicleFx === 'function') updateVehicleFx();
}

// F — выйти из машины или отпустить толкаемую (E у колонки заправляет, поэтому выходим по F)
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyF' && !e.repeat && !settingsOpen && !dialogueOpen) {
    if (drivingCar) exitCar();
    else if (pushingCar) releaseCar();
  }
});

// Указатель топлива внизу слева: виден только за рулем
const fuelEl = document.getElementById('fuel');
const fuelFill = document.getElementById('fuelFill');
function updateFuelHud() {
  fuelEl.style.display = drivingCar ? 'flex' : 'none';
  if (!drivingCar) return;
  const f = drivingCar.fuel;
  fuelFill.style.width = Math.round(f * 100) + '%';
  fuelFill.style.background = f <= fuelLow ? '#d23c3c' : f < 0.4 ? '#e0a82a' : '#3fa35b';
}
