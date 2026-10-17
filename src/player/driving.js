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
const kmhPerSpeed = 250 / 1.5; // скорость за кадр → км/ч (прототип, 1,5 за кадр, — 250 км/ч; гиперкар 2,1 — 350; Бугатти 2,4 — 400)
const carMaxSpeed = 0.8;
const carMaxReverse = -0.3;
const carTurnRate = 0.045;
// Езда обычной легковушки; у гоночной, джипа, трактора и БТР — свои числа (VEHICLE_KINDS, src/world/vehicles.js)
// drift — насколько машину заносит на ручнике (1 — как гоночную)
const carDrive = { acc: [100, 10], accel: carAccel, brake: carBrake, drag: carDrag, maxSpeed: carMaxSpeed, maxReverse: carMaxReverse, turnRate: carTurnRate, drift: 0.6 };

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
// ИНЕРЦИЯ ДРИФТА. Вышли из заноса (отпустили ручник или газ) — машина еще катится: скорость не падает ниже
// «планки» car.coast, а планка плавно затухает (coastDecay за кадр, при инерции 1 — за ~2 с до трети).
// Настоящее торможение (S на ходу, педаль тормоза), удар и новый занос планку сбрасывают.
// Инерция — kind.inertia машины и настройка «Инерция после дрифта» (settings.driftInertia, 0 — выкл.)
const coastDecay = 0.016;
const coastMinSpeed = 0.15; // из заноса медленнее — планки нет
// ОТСКОК. Врезались в упругое препятствие (покрышки трассы, бочки: shape.bouncy, src/engine/collisions.js) — машина не
// встает, а мягко отталкивается: скорость в сторону препятствия гаснет (потеря — настройка) и частично меняет знак, плюс
// толчок от препятствия (car.push), который плавно затухает за несколько кадров. Чем прямее удар, тем сильнее все это. Толчок идет по линии от препятствия к машине. Все три числа — в настройках
// «Вождение»: жесткость отскока (settings.bounce — как далеко отбросит), потеря скорости при ударе (settings.bounceLoss),
// мягкость (settings.bounceSoft — как долго длится толчок). Остальные стены гасят скорость как раньше
const bouncePushDist = 3; // на сколько юнитов отбрасывает прямой удар на скорости 1 при жесткости 100%
const bouncePushDecay = 0.86; // затухание толчка за кадр при мягкости 100%
const bounceMaxTurn = 0.3; // наибольший доворот машины от препятствия за удар, рад (~17°)
const bounceCooldown = 8; // кадров после удара, пока новый удар о то же препятствие не считается новым
// ПОДЪЕМЫ И СПУСКИ. Высоту земли под машиной дает groundHeightAt(x, z, y) — на трассах гоночного комплекса ДЕМО
// (src/demo/race.js) полотно поднимается на холмы, насыпи и мост, везде остальное — 0. Машина едет по полотну
// (car.y), в гору тянет хуже и медленнее, под гору сама набирает скорость (slopeGravity). Если земля уходит
// вниз быстрее, чем машина падает (вершина горба, край трамплина), — машина летит: car.vy, гравитация airGravity;
// в полете руль и газ почти не действуют. Нос машины наклоняется по склону (car.pitch, updateCarMeshes)
let groundHeightAt = () => 0;
const slopeGravity = 0.02; // ускорение вдоль склона на единицу уклона (юнитов за кадр²)
const airGravity = 0.012; // падение в полете (юнитов за кадр²)
const steerMaxAngle = 0.7; // наибольший угол поворота передних колес на экране, рад
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
  wheelBrakeMode = wheelHandbrake = false;
  car.slip = 0;
  car.coast = 0;
  car.push = null;
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
  if ((drivingCar.y || 0) > 0.3 && !force) {
    showToast('Здесь не выйти: машина на насыпи. Спуститесь с горки', 2500);
    return;
  }
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
  drivingCar.coast = 0;
  drivingCar.steerInput = 0;
  wheelBrakeMode = wheelHandbrake = rightHandbrake = false;
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
  // Уклон под машиной вдоль носа: плюс — в гору. В гору предел скорости ниже, под гору — выше
  car.y = car.y || 0;
  const slope = car.airborne ? 0 : slopeAt(car);
  const k = {
    ...base,
    maxSpeed: base.maxSpeed * Math.max(0.45, 1 - 2 * Math.max(0, slope) + 1.5 * Math.max(0, -slope)),
    // Обычная езда — кривая разгона машины (accelAt); дрифт и спецслучаи — прежнее ровное ускорение (driftAccel)
    accel: (base.acc ? accelAt(base, car.speed) : base.accel * launchFactor(base, car.speed)) * settings.accelSharp * (car.airborne ? 0 : 1),
    driftAccel: base.accel * settings.accelSharp * launchFactor(base, car.speed) * (car.airborne ? 0 : 1),
    brake: base.brake * settings.brakeSharp,
    turnRate: base.turnRate * settings.steerSens,
    // Накат: без газа и тормоза машина катится и теряет скорость плавно — качение плюс сопротивление воздуха (растет с квадратом скорости),
    // а не «встает» за секунды. Базу берем от drag машины, множитель — настройка «Накат» (coastInertia)
    coast: coastDecel(base, car.speed),
    // Задний ход гоночных быстрее: предел и ускорение — на множитель настройки «Скорость заднего хода» (reverseSpeed)
    revMul: base.powerDrift ? settings.reverseSpeed : 1,
    maxReverse: base.maxReverse * (base.powerDrift ? settings.reverseSpeed : 1),
  };
  if (settings.infiniteFuel) car.fuel = 1; // «Бесконечный бензин»: бак всегда полный
  const hasFuel = car.fuel > 0;
  const onTouch = touchUI && typeof touchDrive !== 'undefined';
  const handLever = onTouch ? touchDrive.handbrake : keys['Space'] || wheelHandbrake || rightHandbrake; // Space, правая кнопка мыши или зажатое колесо в режиме ручника (двойной клик колесом — вкл/выкл режим)
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
    if (car.speed < top) car.speed = Math.min(top, car.speed + k.driftAccel * 0.9);
    else car.speed -= k.coast;
  } else if (powerDrift) {
    // Задом: так же, но к пределу заднего хода
    const top = k.maxReverse * 0.9;
    if (car.speed > top) car.speed = Math.max(top, car.speed - k.driftAccel * 0.7 * k.revMul);
  } else if (onTouch && typeof touchDriveStep === 'function' && touchDriveStep(car, k, hasFuel)) {
    // На телефоне — педали и коробка передач (src/engine/touch-drive.js), на компьютере — клавиши
    // скорость уже посчитана
  } else if (c.up && hasFuel && (!handbrake || engineOn)) car.speed += car.speed < 0 ? k.brake : k.accel; // на ручнике газ не тянет (кроме гоночных)
  else if (c.down && hasFuel) car.speed -= car.speed > 0 ? k.brake : k.accel * 0.7 * k.revMul;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), k.coast);
  // Ручник тормозит; у гоночных с газом — нет: с места это старт с пробуксовкой, на скорости — дрифт
  if ((keys['Space'] || handLever) && !(engineOn && handLever)) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), k.brake * (handbrake ? handbrakeBrake : 1));
  // Склон тянет вниз — и вперед, и задним ходом. Тянет настолько же, насколько мощна машина: у слабой по разгону (легковушка,
  // джип, трактор) тяга склона меньше, иначе она не въехала бы на холм (peakAccel — разгон с места по кривой)
  const hillPull = base.acc ? (accelScale(base) * accelShapeAt(base, 0)) / base.accel : 1;
  car.speed -= slope * slopeGravity * hillPull;
  car.speed = Math.min(Math.max(car.speed, k.maxReverse), Math.max(k.maxSpeed, base.maxSpeed));
  if (car.speed > k.maxSpeed) car.speed -= Math.min(car.speed - k.maxSpeed, k.accel + k.drag * 2); // в гору быстро не едет

  // Поворачивать можно только в движении; задним ходом руль работает наоборот.
  // Руль на телефоне — кнопки ◀ ▶ (src/engine/touch-drive.js) или наклон телефона (src/engine/gyro-steer.js), −1..1
  let steer = (c.left ? 1 : 0) - (c.right ? 1 : 0);
  if (!steer && typeof touchDriveSteer === 'function') steer = touchDriveSteer();
  if (!steer && typeof gyroSteer === 'function') steer = gyroSteer(car) || 0;
  // Выше 1,5 за кадр (250 км/ч) руль тупеет: у гиперкара и Бугатти на предельной скорости поворот в разы слабее
  const fastSteer = 1 / (1 + Math.max(0, Math.abs(car.speed) - 1.5) * 1.6);
  car.steerInput = steer; // для анимации поворота колес (updateCarMeshes)
  let turn = steer * k.turnRate * fastSteer * Math.min(1, Math.abs(car.speed) / 0.15) * Math.sign(car.speed) * (car.airborne ? 0.15 : 1);
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

  const { appliedTurn, blockedX, blockedZ, vx, vz, hitShape } = moveCarWithCollisions(car, turn, grip, maxSlip);
  car.speed *= 1 - slideFriction * (powerDrift ? 0.6 : 1) * Math.abs(Math.sin(car.slip)); // боком машина быстро теряет скорость
  car.drifting = powerDrift;
  applyDriftCoast(car, base, powerDrift, brakingHard(c, car, onTouch, powerDrift));
  updateCarHeight(car);
  updateTireMarks(car, (handbrake || powerDrift) && !car.airborne);
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
  if (car.bounceCd > 0) car.bounceCd--;
  applyBouncePush(car);
  if ((blockedX || blockedZ) && hitShape) bounceOff(car, hitShape, vx, vz);
  else if (blockedX && blockedZ) car.speed *= -0.25;
  else if (blockedX || blockedZ) car.speed *= 0.85;
  if (blockedX || blockedZ) {
    if (!hitShape) car.slip *= 0.5; // ударились — занос гаснет (об упругое — нет: машина отскакивает и едет дальше)
    car.coast = 0;
  }
  if (car.crush) crushUnder(car);
  playerWorldX = car.x;
  playerWorldZ = car.z;
  followCamera(car, appliedTurn);
}

// Удар об упругое препятствие shape: часть скорости гаснет, а машину мягко отталкивает от препятствия (car.push)
function bounceOff(car, shape, vx, vz) {
  const along = Math.hypot(vx, vz);
  if (!along) return;
  if (car.bounceCd > 0) {
    car.speed *= 0.95; // еще упираемся в то же препятствие — только чуть гасим
    car.bounceCd = bounceCooldown;
    return;
  }
  car.bounceCd = bounceCooldown;
  // Нормаль — от препятствия к ближайшей точке кузова (а не к центру машины): носом — прямой удар, бортом — касательный
  const box = carShape(car.x, car.z, car.heading, car.half);
  const du = (shape.x - car.x) * box.ux + (shape.z - car.z) * box.uz;
  const dv = (shape.x - car.x) * box.vx + (shape.z - car.z) * box.vz;
  const gu = Math.max(-box.hu, Math.min(box.hu, du)) - du;
  const gv = Math.max(-box.hv, Math.min(box.hv, dv)) - dv;
  let nx = gu * box.ux + gv * box.vx;
  let nz = gu * box.uz + gv * box.vz;
  if (Math.hypot(nx, nz) < 1e-6) {
    nx = car.x - shape.x; // центр препятствия внутри кузова
    nz = car.z - shape.z;
  }
  let nl = Math.hypot(nx, nz) || 1;
  nx /= nl;
  nz /= nl;
  // Задели углом или бортом (препятствие сбоку от оси машины, а не перед носом) — отскок больше вбок, чем назад: чем дальше от оси,
  // тем нормаль ближе к боковой, и машина продолжает ехать вперед
  const side = Math.max(0, Math.min(1, (Math.abs(du) - 0.3 * box.hu) / (0.7 * box.hu + 0.5)));
  const g = side * side * (3 - 2 * side);
  nx = nx * (1 - g) - Math.sign(du) * box.ux * g;
  nz = nz * (1 - g) - Math.sign(du) * box.uz * g;
  nl = Math.hypot(nx, nz) || 1;
  nx /= nl;
  nz /= nl;
  const into = Math.max(0, -(vx * nx + vz * nz)); // скорость в сторону препятствия, юнитов за кадр
  const share = into / along;
  // Траектория: задели боком — движение отклоняется от препятствия (отражение со скруглением), машина едет дальше вперед;
  // чем прямее удар, тем меньше доворот (лоб в лоб не разворачивает), не больше bounceMaxTurn
  const e = 0.4 * settings.bounce;
  const want = Math.atan2(-(vx + (1 + e) * into * nx), -(vz + (1 + e) * into * nz)) - Math.atan2(-vx, -vz);
  const kick = Math.max(-bounceMaxTurn, Math.min(bounceMaxTurn, 0.5 * Math.atan2(Math.sin(want), Math.cos(want)))) * (1 - share);
  if (carFree(car, car.x, car.z, car.heading + kick)) {
    car.heading += kick;
    worldRotation -= kick; // камера поворачивается вместе с машиной (followCamera)
  }
  car.speed *= 1 - share * (2 - settings.bounceLoss); // прямой удар: потеря 100% — встали, 0% — отскок без потерь (скорость сменила знак)
  const decay = Math.pow(bouncePushDecay, 1 / settings.bounceSoft);
  const pv = bouncePushDist * into * settings.bounce * (1 - decay); // сумма толчка за все кадры — bouncePushDist·into·bounce юнитов
  car.push = { x: nx * pv, z: nz * pv, decay };
}

// Толчок от препятствия: машину сдвигает, пока он не затух или она не упрется во что-то еще
function applyBouncePush(car) {
  const p = car.push;
  if (!p) return;
  if (carFree(car, car.x + p.x, car.z, car.heading)) car.x += p.x;
  else p.x = 0;
  if (carFree(car, car.x, car.z + p.z, car.heading)) car.z += p.z;
  else p.z = 0;
  p.x *= p.decay;
  p.z *= p.decay;
  if (Math.hypot(p.x, p.z) < 0.01) car.push = null;
}

// Потеря скорости за кадр при накате (без газа и тормоза): 0,2·drag·(0,4 + 1,6·v²) — качение плюс сопротивление воздуха (~ v², v в
// единицах 167 км/ч — у гиперкара на 300 км/ч оно сильно тормозит, на низкой скорости катится долго); настройка «Накат» делит ее: больше накат — меньше потеря. Легковушка со 100 км/ч
// катится до 50 км/ч около 7 с, до остановки — около 15 с (раньше — за 3 с)
function coastDecel(base, speed) {
  const s = Math.min(2.5, Math.abs(speed)); // скорость за кадр: 1 — это 167 км/ч
  return (base.drag * 0.2 * (0.4 + 1.6 * s * s)) / settings.coastInertia;
}

// Игрок тормозит по-настоящему: S на ходу вперед (или W при заднем ходе), на телефоне — педаль тормоза
function brakingHard(c, car, onTouch, powerDrift) {
  if (powerDrift) return false;
  if (onTouch) return !!touchDrive.brake;
  return (c.down && car.speed > 0) || (c.up && car.speed < 0);
}

// Инерция дрифта: пока едем в дрифте (газ и ручник) — запоминаем скорость; вышли (отпустили газ, ручник
// или оба) — не даем ей упасть ниже затухающей планки. Обычный ручник без дрифта тормозит как раньше
function applyDriftCoast(car, base, drifting, braking) {
  const inertia = (base.inertia === undefined ? 1 : base.inertia) * settings.driftInertia;
  if (drifting) {
    car.coast = Math.abs(car.speed) > coastMinSpeed ? car.speed : 0;
    car.driftWas = true;
    return;
  }
  if (car.driftWas) {
    car.driftWas = false;
    car.coast = inertia > 0 && Math.abs(car.speed) > coastMinSpeed ? car.speed : 0;
  }
  if (!car.coast) return;
  if (braking || inertia <= 0) {
    car.coast = 0;
    return;
  }
  car.coast *= 1 - coastDecay / inertia;
  if (Math.abs(car.coast) < coastMinSpeed * 0.5) car.coast = 0;
  else if (car.coast > 0) car.speed = Math.max(car.speed, car.coast);
  else car.speed = Math.min(car.speed, car.coast);
}

// Уклон вдоль носа машины: высота земли на метр впереди минус на метр сзади, пополам
function slopeAt(car) {
  const fx = -Math.sin(car.heading);
  const fz = -Math.cos(car.heading);
  const ahead = groundHeightAt(car.x + fx, car.z + fz, car.y);
  const behind = groundHeightAt(car.x - fx, car.z - fz, car.y);
  return (ahead - behind) / 2;
}

// Высота машины: едет по земле или летит. Приземлилась — чуть теряет скорость
function updateCarHeight(car) {
  const ground = groundHeightAt(car.x, car.z, car.y);
  car.vy = car.vy || 0;
  const next = car.y + car.vy - airGravity;
  if (next > ground + 0.02) {
    car.y = next;
    car.vy -= airGravity;
    car.flying = true;
    car.airborne = car.y - ground > 0.12; // подскок на стыке склона — еще не полет: руль и газ работают
  } else {
    if (car.flying && car.vy < -0.15) car.speed *= 0.93; // жесткая посадка
    car.vy = car.flying ? 0 : ground - car.y;
    car.y = ground;
    car.flying = car.airborne = false;
  }
  // Нос по склону, в полете — по траектории
  const pitch = car.airborne ? Math.atan2(car.vy, Math.abs(car.speed) + 0.01) * Math.sign(car.speed || 1) : Math.atan(slopeAt(car));
  car.pitch = (car.pitch || 0) + (pitch - (car.pitch || 0)) * 0.3;
}

// РАЗГОН. У каждой машины своя динамика: kind.acc = [км/ч, секунд] — за сколько секунд она разгоняется с места
// до этой скорости (обычная легковушка — до 100 за 10 с, джип — за 7, гоночные — за 3–4,5). Разгон не линейный:
// сильный с места, слабеет с ростом скорости (1 − s³, s — доля максимальной скорости) и «пилой» по передачам —
// на каждой передаче тяга сначала выше, к переключению слабеет. Множитель кривой подбирается один раз так,
// чтобы время до заданной скорости сошлось (accelScale). У машины без kind.acc — прежнее ровное ускорение
const accelShape = 3; // у машины можно задать свой (kind.accShape): чем больше, тем дольше тяга держится у максимума — гиперкар и Бугатти доходят до предела за секунды, а не минуты
const gearTops = [0.18, 0.34, 0.5, 0.66, 0.82, 1]; // верхние границы передач — доли максимальной скорости
function accelShapeAt(kind, speed) {
  const s = Math.max(0, speed) / kind.maxSpeed;
  if (s >= 1) return 0;
  let lo = 0;
  for (const top of gearTops) {
    if (s < top) return (1 - Math.pow(s, kind.accShape || accelShape)) * (1.12 - 0.24 * ((s - lo) / (top - lo)));
    lo = top;
  }
  return 0;
}
function accelScale(kind) {
  if (!kind.accScale) {
    const to = Math.min(kind.acc[0] / kmhPerSpeed, kind.maxSpeed * 0.97);
    const steps = 400;
    let frames = 0;
    for (let i = 0; i < steps; i++) frames += to / steps / accelShapeAt(kind, ((i + 0.5) * to) / steps);
    kind.accScale = frames / (kind.acc[1] * 60);
  }
  return kind.accScale;
}
// Ускорение за кадр на скорости speed (юниты за кадр²)
function accelAt(kind, speed) {
  return accelScale(kind) * accelShapeAt(kind, speed);
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

function addTireMark(x1, z1, x2, z2, y = 0) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  if (len < 0.01) return;
  tireMarkPos.set((x1 + x2) / 2, y + 0.06, (z1 + z2) / 2);
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
    for (let i = 0; i < 2; i++) addTireMark(car.lastWheels[i][0], car.lastWheels[i][1], wheels[i][0], wheels[i][1], car.y || 0);
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
  carHitBouncy = null;
  if (carFree(car, car.x + vx, car.z, heading)) car.x += vx;
  else blockedX = true;
  if (carFree(car, car.x, car.z + vz, heading)) car.z += vz;
  else blockedZ = true;
  car.heading = heading;
  return { appliedTurn, blockedX, blockedZ, vx, vz, hitShape: carHitBouncy };
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
    c.mesh.position.set(c.x, c.y || 0, c.z);
    c.mesh.rotation.order = 'YXZ';
    c.mesh.rotation.y = c.heading;
    c.mesh.rotation.x = c.pitch || 0;
    c.mesh.spinWheels(c.speed);
    // Руль: передние колеса поворачиваются к направлению поворота, а в заносе смотрят туда, куда едет машина (контрруль)
    if (c.mesh.steerWheels) {
      const driven = c === drivingCar;
      const moving = Math.abs(c.speed) > 0.08 ? 1 : 0;
      const target = driven ? Math.max(-steerMaxAngle, Math.min(steerMaxAngle, (c.steerInput || 0) * 0.5 + (c.slip || 0) * 0.7 * moving)) : 0;
      c.steerVis = (c.steerVis || 0) + (target - (c.steerVis || 0)) * 0.3;
      c.mesh.steerWheels(c.steerVis);
    }
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
// СПИДОМЕТР рядом с топливом: скорость за кадр (car.speed) в км/ч. Самая быстрая машина (maxSpeed 1,5 — прототип)
// на пределе дает 250 км/ч, остальные — свои максимумы: обычная легковушка ~133, трактор ~53
// Скорость машины в км/ч (спидометр здесь и на телефоне, src/engine/touch-drive.js)
function carSpeedKmh(car) {
  return Math.min(450, Math.round(Math.abs(car.speed) * kmhPerSpeed));
}
const speedoEl = document.getElementById('speedo');
// Кнопка «⛽∞» (бесконечный бензин) рядом со спидометром; то же — галочка в настройках
const infFuelBtn = document.getElementById('infFuel');
infFuelBtn.addEventListener('click', () => setSetting('infiniteFuel', !settings.infiniteFuel));
infFuelBtn.addEventListener('mousedown', (e) => e.stopPropagation());
const speedoValue = document.getElementById('speedoValue');
let speedoShown = -1;
function updateFuelHud() {
  fuelEl.style.display = drivingCar ? 'flex' : 'none';
  speedoEl.style.display = drivingCar ? 'flex' : 'none';
  infFuelBtn.style.display = drivingCar ? 'block' : 'none';
  infFuelBtn.classList.toggle('on', settings.infiniteFuel);
  if (!drivingCar) return;
  const kmh = carSpeedKmh(drivingCar);
  if (kmh !== speedoShown) {
    speedoShown = kmh;
    speedoValue.textContent = kmh;
  }
  const f = drivingCar.fuel;
  fuelFill.style.width = Math.round(f * 100) + '%';
  fuelFill.style.background = f <= fuelLow ? '#d23c3c' : f < 0.4 ? '#e0a82a' : '#3fa35b';
}
