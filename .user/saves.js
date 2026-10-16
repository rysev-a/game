// .user/saves.js
// СОХРАНЕНИЯ. 16 слотов (две строки по 8 в панели инвентаря), хранятся в браузере (localStorage).
// В слот записывается:
//   • положение игрока (и поворот вида), за рулем ли он был;
//   • машина игрока: где стоит, сколько в ней бензина, открыта ли дверь гаража;
//   • инвентарь;
//   • погода: идет ли дождь, его силу;
//   • игровое время и дата (time.gameMinutes — минут с начала истории, 18.09.2043; по ним идет и расписание дождей).
// Остальное (прохожие, чужие машины, сцена у реки) при загрузке не восстанавливается — мир живет дальше.
//
//   saveToSlot(i), loadFromSlot(i), clearSave(i), getSave(i)

const SAVE_SLOTS = 16;
const SAVES_KEY = 'game.saves';
const SAVE_VERSION = 1;

function readSaves() {
  try {
    const list = JSON.parse(localStorage.getItem(SAVES_KEY));
    if (Array.isArray(list)) return list.slice(0, SAVE_SLOTS);
  } catch (e) {
    // localStorage недоступен или данные повреждены — начинаем с пустых слотов
  }
  return [];
}

let saves = readSaves();
while (saves.length < SAVE_SLOTS) saves.push(null);

function persistSaves() {
  try {
    localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
  } catch (e) {
    showToast('Не удалось записать сохранение (хранилище недоступно)');
  }
}

const getSave = (i) => saves[i] || null;

// Подсказка к слоту: номер, место, дата
function saveTitle(i) {
  const s = getSave(i);
  if (!s) return 'Пустой слот ' + (i + 1);
  const d = new Date(s.savedAt);
  const when = d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  // Время в игре: «18 сентября 2043, 09:41» (в старых сохранениях его нет)
  const story = s.time ? ' · в игре ' + s.time.label : '';
  return 'Слот ' + (i + 1) + ' · ' + s.place + story + ' · сохранено ' + when;
}

// Снимок игры
function captureGame() {
  const car = garage.car;
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    place: currentZone().name,
    player: { x: playerWorldX, z: playerWorldZ, rotation: worldRotation, heading: playerHeading, driving: drivingCar === car },
    car: { x: car.x, z: car.z, heading: car.heading, fuel: car.fuel, garageOpen: garage.open },
    inventory: [...inventory.items],
    weather: { gameTime, rainOn, weather, rainManual, rainEndedAt },
    // Игровое время обязательно сохраняется: минуты от старта истории и то же в виде даты
    time: {
      gameMinutes,
      gameStartDate: clockConfig.gameStartDate,
      label: formatGameDateShort() + ', ' + formatGameTime(),
    },
  };
}

// Применить снимок: прерываем всё, что идет, и расставляем сохраненное
function applyGame(data) {
  if (dialogueOpen) endDialogue();
  releaseCar();
  if (typeof endHelp === 'function') endHelp();
  drivingCar = null;
  player.visible = true;
  walkAmp = 0;
  jumpVelocity = 0;

  // Машина игрока: где стоит, сколько бензина, дверь гаража
  const car = garage.car;
  car.x = data.car.x;
  car.z = data.car.z;
  car.heading = data.car.heading;
  car.speed = 0;
  car.fuel = data.car.fuel;
  car.refuelling = false;
  car.mesh.setDoor(false);
  setGarageDoorInstant(!!data.car.garageOpen);

  // Инвентарь и вещи, лежащие в доме (взятые — исчезают, остальные на месте)
  inventory.items = data.inventory.filter((id) => ITEMS[id]);
  renderInventory();
  syncHomePickups();

  // Время и погода: возвращаем игровые часы и дождь. В старых сохранениях игрового времени не было —
  // тогда считаем его от реального времени игры (gameTime) с обычной скоростью хода
  const w = data.weather;
  gameMinutes = data.time ? data.time.gameMinutes : w.gameTime * clockConfig.minutesPerSecond;
  clockShown = '';
  gameTime = w.gameTime;
  lastFrameTime = performance.now();
  scheduledNow = rainScheduled(gameMinutes);
  rainManual = w.rainManual;
  rainEndedAt = w.rainEndedAt;
  rainOn = w.rainOn;
  weather = w.weather;

  // Игрок: положение и вид; если ехал — снова за рулем
  playerWorldX = data.player.x;
  playerWorldZ = data.player.z;
  worldRotation = data.player.rotation;
  // Куда смотрел игрок (в старых сохранениях не было: тогда смотрим «вверх по экрану»)
  playerHeading = data.player.heading !== undefined ? data.player.heading : -worldRotation;
  if (data.player.driving) enterCar(car);
}

function saveToSlot(i) {
  saves[i] = captureGame();
  persistSaves();
  showToast('Сохранено: слот ' + (i + 1));
}

function clearSave(i) {
  saves[i] = null;
  persistSaves();
}

function loadFromSlot(i) {
  const data = getSave(i);
  if (!data || data.version !== SAVE_VERSION) {
    showToast('Это сохранение не подходит к текущей версии игры');
    return;
  }
  applyGame(data);
  showToast('Загружено: слот ' + (i + 1));
}
