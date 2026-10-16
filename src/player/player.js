// src/player/player.js
// ИГРОК — гик в черной футболке, синих джинсах, кепке и кроссовках (набор 'geek' в src/models/person.js), зафиксирован в центре экрана. Модель смотрит в -Z.
// Здесь же: состояние игрока в мире (playerWorldX/Z, вращение вида), ходьба с коллизиями,
// прыжок, анимация шагов и камера.

const player = createPerson('maxim');
player.position.set(0, 0, 0);
scene.add(player);

let walkPhase = 0; // фаза цикла шага
let walkAmp = 0; // амплитуда 0..1 — плавный старт/остановка шагов
let playerYaw = 0; // куда повернут человечек (в экранных осях)
let playerHeading = 0; // куда смотрит игрок в мире (как heading у машины: плюс — налево)
const playerTurnRate = 0.05; // поворот за кадр (рад)
const playerBackFactor = 0.6; // назад идем медленнее


// НАСТРОЙКИ ПОЗИЦИОНИРОВАНИЯ
let cameraDistance = 25;
let cameraHeight = 25;
let zoom = 1; // общий масштаб камеры (колесо мыши)
const zoomMin = 0.35;
const zoomMax = 2.5;
const cameraHeightMin = 2;
const cameraHeightMax = 60;
let playerSpeed = 0.3;

// БОЕВОЙ РЕЖИМ (docs/mechanics/combat.md): пока оружие в руках, герой по умолчанию бежит (быстрее в
// combatRunFactor раз, шаги чаще и шире), зажатый Shift — идти шагом. Камера плавно отъезжает чуть дальше
const combatRunFactor = 1.8;
const combatCameraZoom = 1.15;
const inCombatMode = () => !drivingCar && !pushingCar && !!heroWeapon.id;
const isRunning = () => inCombatMode() && !keys['ShiftLeft'] && !keys['ShiftRight'];
let combatCamera = 0; // 0..1 — насколько камера отъехала для боя
let rotationSpeed = 0.025;

// Простая физика прыжка (в кадрах, не в секундах).
// Человечек стоит на земле корнями в y = 0
const playerGroundY = 0;
const jumpForce = 0.5;
const gravity = 0.025;
let jumpVelocity = 0;

// Виртуальные координаты игрока на карте города
let playerWorldX = 0;
let playerWorldZ = 0;
let worldRotation = 0;

// КЛАВИШИ УПРАВЛЕНИЯ
//   W / S — вперед / назад      A / D — поворот (налево / направо)
//   E — действие               F — выйти из машины / отпустить   стрелки — камера (←→ вращать, ↑↓ наклон)
//   Shift — в боевом режиме (оружие в руках) идти шагом, а не бежать
// За рулем и при толкании машины A/D — руль: left/right
function readControls() {
  return {
    up: keys['KeyW'],
    down: keys['KeyS'],
    left: keys['KeyA'], // руль машины
    right: keys['KeyD'],
    turnLeft: keys['KeyA'], // пешком A/D поворачивают
    turnRight: keys['KeyD'],
  };
}

// КАМЕРА СТРЕЛКАМИ: ←/→ крутят вид (или зажатое колесо мыши, src/engine/input.js). Пока крутите
// (и еще чуть-чуть после), камера не возвращается за игроком; потом плавно встает обратно за спину
const cameraHoldDelay = 90; // кадров паузы после последнего нажатия стрелки
let cameraHoldFrames = 0;
function updateRotationKeys() {
  let held = false;
  if (keys['ArrowLeft']) {
    worldRotation += rotationSpeed;
    held = true;
  }
  if (keys['ArrowRight']) {
    worldRotation -= rotationSpeed;
    held = true;
  }
  cameraHoldFrames = held ? cameraHoldDelay : Math.max(0, cameraHoldFrames - 1);
}

// ХОДЬБА ПЕШКОМ. A/D поворачивают игрока на месте, W/S — вперед/назад вдоль взгляда (назад медленнее).
// Камера поворачивается вместе с игроком (followCamera из src/player/driving.js),
// так что он смотрит «вверх по экрану». Возвращает { moving, dir, turn } для анимации шагов
function updateWalking(c) {
  let vx = 0;
  let vz = 0;
  let dir = 1; // 1 — шагает вперед, −1 — пятится назад
  let turn = 0;
  const onFoot = !drivingCar && !pushingCar;
  if (onFoot) {
    turn = ((c.turnLeft ? 1 : 0) - (c.turnRight ? 1 : 0)) * playerTurnRate; // налево — плюс, как у машины
    const f = (c.up ? 1 : 0) - (c.down ? 1 : 0);
    const speed = playerSpeed * (isRunning() ? combatRunFactor : 1);
    const fwd = f > 0 ? speed : f < 0 ? -speed * playerBackFactor : 0;
    // Вперед в мире — (−sin h, −cos h), как у машины
    vx = -Math.sin(playerHeading + turn) * fwd;
    vz = -Math.cos(playerHeading + turn) * fwd;
    if (f < 0) dir = -1;
  }
  playerHeading += turn;
  if (onFoot) followCamera({ heading: playerHeading }, turn);

  const dx = vx;
  const dz = vz;
  if (insideBuilding()) {
    // Внутри есть стены и мебель: двигаем по осям отдельно, чтобы можно было скользить вдоль препятствий
    if (!blockedInside(playerWorldX + dx, playerWorldZ)) playerWorldX += dx;
    if (!blockedInside(playerWorldX, playerWorldZ + dz)) playerWorldZ += dz;
  } else {
    // Здания и машины — твердые. Если игрок уже внутри препятствия (например, после спавна), даем ему выйти
    const stuck = blockedOutside(playerWorldX, playerWorldZ);
    if (stuck || !blockedOutside(playerWorldX + dx, playerWorldZ)) playerWorldX += dx;
    if (stuck || !blockedOutside(playerWorldX, playerWorldZ + dz)) playerWorldZ += dz;
  }
  return { moving: vx !== 0 || vz !== 0, dir, turn };
}

// ВРАЩЕНИЕ ГОРОДА ВОКРУГ ИГРОКА (Pivot Point). Город преобразуется как v -> R(θ)·(v − p):
// сначала точка под игроком переносится в центр экрана, затем поворот вокруг нее.
// Поэтому при вращении город крутится строго вокруг игрока, а сам он остается на месте.
function applyWorldTransform() {
  const cos = Math.cos(worldRotation);
  const sin = Math.sin(worldRotation);
  cityGroup.rotation.y = worldRotation;
  cityGroup.position.set(
    -playerWorldX * cos - playerWorldZ * sin,
    0,
    playerWorldX * sin - playerWorldZ * cos,
  );
}

// Прыжок, поворот и анимация шагов человечка
let playerPushPose = false; // сейчас на человечке поза «толкает»
function updatePlayerBody(move) {
  // Поза «толкает» включается и выключается вместе с толканием
  if (!!pushingCar !== playerPushPose) {
    playerPushPose = !!pushingCar;
    player.setPush(playerPushPose ? 'side' : false); // водитель толкает сбоку у открытой двери
  }
  // Толкает машину: стоит сзади лицом по ходу, шагает, пока катится
  if (pushingCar) {
    const moving = Math.abs(pushingCar.speed) > 0.005;
    playerYaw = pushingCar.heading + worldRotation;
    player.rotation.y = playerYaw;
    // Шаги подстроены под скорость машины (с помощником она катится в разы быстрее)
    if (moving) walkPhase += Math.min(0.5, 0.12 + Math.abs(pushingCar.speed) * 0.35) * Math.sign(pushingCar.speed);
    walkAmp += ((moving ? 1 : 0) - walkAmp) * 0.18;
    player.updateWalk(walkPhase, walkAmp);
    return;
  }
  // Человечек смотрит туда же, куда игрок. Когда камера идет за ним, на экране это «вверх»;
  // если вид повернут (стрелками или колесом мыши), человечек развернут относительно экрана
  playerYaw = playerHeading + worldRotation;
  player.rotation.y = playerYaw;

  // ПРЫЖОК: импульс по Space, дальше гравитация
  if (keys['Space'] && !drivingCar && player.position.y <= playerGroundY) {
    jumpVelocity = jumpForce;
  }
  jumpVelocity -= gravity;
  player.position.y += jumpVelocity;
  if (player.position.y < playerGroundY) {
    player.position.y = playerGroundY;
    jumpVelocity = 0;
  }

  // АНИМАЦИЯ ШАГОВ: идет вперед/назад — шагает; только поворачивается — переступает на месте
  const onGround = player.position.y <= playerGroundY + 0.01;
  const moving = move.moving && onGround;
  const turning = move.turn !== 0 && onGround;
  // Бег: шаги чаще и шире
  const run = isRunning() && moving;
  if (moving) walkPhase += 0.18 * (run ? 1.55 : 1) * move.dir; // шаги подстроены под скорость (пятится — в обратную сторону)
  else if (turning) walkPhase += 0.11;
  const targetAmp = moving ? (run ? 1.35 : 1) : turning ? 0.55 : 0;
  walkAmp += (targetAmp - walkAmp) * 0.18;
  player.updateWalk(walkPhase, walkAmp);
  updateFootsteps(moving || turning);
}

// НАКЛОН ГОРИЗОНТА (↑/↓) и положение камеры
function updateCamera() {
  if (keys['ArrowUp']) cameraHeight = Math.min(cameraHeight + 0.5, cameraHeightMax);
  if (keys['ArrowDown']) cameraHeight = Math.max(cameraHeight - 0.5, cameraHeightMin);
  combatCamera += ((inCombatMode() ? 1 : 0) - combatCamera) * 0.05;
  const z = zoom * (1 + (combatCameraZoom - 1) * combatCamera);
  camera.position.set(0, cameraHeight * z, cameraDistance * z);
  camera.lookAt(0, 1, 0);
}
