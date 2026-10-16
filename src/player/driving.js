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
    const d = Math.hypot(c.x - playerWorldX, c.z - playerWorldZ);
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
  if (hasItem(car.keyId)) return null;
  return car.isPlayerCar ? 'Ваша машина закрыта — нужны ключи от машины' : 'Эта машина закрыта: у вас нет от нее ключей';
}

addInteractable({
  priority: -1, // у двери/кнопки/вещей приоритет выше
  near: () => !drivingCar && !insideBuilding() && nearestCar() !== null,
  prompt: () => {
    const car = nearestCar();
    return carBlockedReason(car) || (car.isPlayerCar ? 'E — сесть в свою машину' : 'E — сесть в машину (есть ключи)');
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
  playerWorldX = car.x;
  playerWorldZ = car.z;
  player.visible = false;
  player.position.y = playerGroundY;
  jumpVelocity = 0;
  walkAmp = 0;
}

// Выйти: только когда машина почти стоит
function exitCar() {
  if (Math.abs(drivingCar.speed) > exitMaxSpeed) return;
  const h = drivingCar.heading;
  // Выходим с левой стороны; если там стена или другая машина — справа, сзади, спереди
  const sides = [
    [-Math.cos(h) * 2.4, Math.sin(h) * 2.4],
    [Math.cos(h) * 2.4, -Math.sin(h) * 2.4],
    [Math.sin(h) * 3.2, Math.cos(h) * 3.2],
    [-Math.sin(h) * 3.2, -Math.cos(h) * 3.2],
  ];
  const spot = sides.find(([ox, oz]) => !blockedOutside(drivingCar.x + ox, drivingCar.z + oz)) || sides[0];
  playerWorldX = drivingCar.x + spot[0];
  playerWorldZ = drivingCar.z + spot[1];
  playerHeading = h; // вышел — смотрит туда же, куда машина
  playerYaw = h + worldRotation;
  drivingCar.speed = 0;
  drivingCar = null;
  player.visible = true;
}

// ЕЗДА: W/S — газ и тормоз/задний ход, A/D — руль, Space — ручник.
// Игрок «приклеен» к машине, камера остается на нем и поворачивается вместе с рулем
function updateDriving(c) {
  carTime += 1 / 60;
  if (!drivingCar) return;
  const car = drivingCar;
  const hasFuel = car.fuel > 0;
  if (c.up && hasFuel) car.speed += car.speed < 0 ? carBrake : carAccel;
  else if (c.down && hasFuel) car.speed -= car.speed > 0 ? carBrake : carAccel * 0.7;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), carDrag);
  if (keys['Space']) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), carBrake);
  car.speed = Math.min(Math.max(car.speed, carMaxReverse), carMaxSpeed);

  // Поворачивать можно только в движении; задним ходом руль работает наоборот
  const steer = (c.left ? 1 : 0) - (c.right ? 1 : 0);
  const turn = steer * carTurnRate * Math.min(1, Math.abs(car.speed) / 0.15) * Math.sign(car.speed);

  const { appliedTurn, blockedX, blockedZ, vx, vz } = moveCarWithCollisions(car, turn);
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
  playerWorldX = car.x;
  playerWorldZ = car.z;
  followCamera(car, appliedTurn);
}

// Поворот и движение машины на car.speed с учетом столкновений: упираясь в стену, машина
// скользит вдоль нее (по осям отдельно). Возвращает, что получилось, — вызывающий решает,
// как гасить скорость при ударе
function moveCarWithCollisions(car, turn) {
  let heading = car.heading + turn;
  if (!carFree(car, car.x, car.z, heading)) heading = car.heading;
  const appliedTurn = heading - car.heading;
  const vx = -Math.sin(heading) * car.speed;
  const vz = -Math.cos(heading) * car.speed;
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
    c.mesh.updateCar(carTime, Math.abs(c.speed) / carMaxSpeed);
  }
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
