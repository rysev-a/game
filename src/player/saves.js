// src/player/saves.js
// СОХРАНЕНИЯ. 16 слотов (две строки по 8 в панели инвентаря), хранятся в браузере (localStorage).
// В слот записывается:
//   • положение игрока (и поворот вида), за рулем ли он был;
//   • машина игрока: где стоит, сколько в ней бензина, открыта ли дверь гаража;
//   • инвентарь, надетые приборы (браслет возврата) и снаряжение в ячейках нижней панели;
//   • погода: идет ли дождь, его силу;
//   • игровое время и дата (time.gameMinutes — минут с начала истории, 18.09.2043; по ним идет и расписание дождей).
// Сохраняться можно только с браслетом возврата на руке (hasDeviceTag('saves'), src/player/devices.js).
// Остальное (прохожие, чужие машины, сцена у реки) при загрузке не восстанавливается — мир живет дальше.
//
//   saveToSlot(i), loadFromSlot(i), clearSave(i), getSave(i)

const SAVE_SLOTS = 16;
const SAVES_KEY = window.SAVES_KEY || 'game.saves'; // в ДЕМО свой ключ (demo/index.html)
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
    showToast('Браслет не смог запомнить этот миг (память недоступна)');
  }
}

const getSave = (i) => saves[i] || null;

// Подсказка к слоту: номер, место, дата
function saveTitle(i) {
  const s = getSave(i);
  if (!s) return 'Пустая клетка ' + (i + 1);
  const d = new Date(s.savedAt);
  const when = d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  // Время в игре: «18 сентября 2043, 09:41» (в старых сохранениях его нет)
  const story = s.time ? ' · в игре ' + s.time.label : '';
  return 'Знак ' + (i + 1) + ' · ' + s.place + story + ' · запомнено ' + when;
}

// Снимок игры
function captureGame() {
  const car = garage.car;
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    place: currentZone().name,
    player: { x: playerWorldX, z: playerWorldZ, rotation: worldRotation, heading: playerHeading, driving: drivingCar === car },
    car: { x: car.x, z: car.z, heading: car.heading, fuel: car.fuel, trunk: car.trunk ? car.trunk.canisters : 0, garageOpen: garage.open }, // trunk — канистры в багажнике
    inventory: [...inventory.items],
    devices: [...heroDevices.worn],
    equip: captureEquip(), // броня, ботинки, оружие в ячейках (src/player/equipment.js)
    weather: { gameTime, rainOn, snowOn, weather, rainManual, snowManual, rainEndedAt },
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
  car.y = groundHeightAt(car.x, car.z, 9); // машина на холме трассы стоит на полотне (src/world/highway.js)
  car.vy = 0;
  car.fuel = data.car.fuel;
  car.trunk = { canisters: Math.max(0, Math.min(trunkMax, data.car.trunk || 0)) }; // багажник (в старых сохранениях пуст)
  car.refuelling = false;
  car.mesh.setDoor(false);
  setGarageDoorInstant(!!data.car.garageOpen);

  // Инвентарь и вещи, лежащие в доме (взятые — исчезают, остальные на месте)
  // Удостоверение (badge) из старых сохранений стало пропуском в IT-компанию
  inventory.items = data.inventory.map((id) => (id === 'badge' ? 'itpass' : id)).filter((id) => ITEMS[id]);
  // Приборы: возврат идет с памятью, поэтому надетое сейчас не снимается, а надетое тогда — надевается
  for (const id of data.devices || []) if (DEVICES[id]) wearDevice(id, true);
  applyEquip(data.equip);
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
  snowOn = !!w.snowOn;
  snowManual = w.snowManual === undefined ? null : w.snowManual;
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
  if (!hasDeviceTag('saves')) return;
  saves[i] = captureGame();
  persistSaves();
  showToast('Знак вспыхнул: браслет запомнил этот миг');
}

function clearSave(i) {
  saves[i] = null;
  persistSaves();
}

function loadFromSlot(i) {
  const data = getSave(i);
  if (!hasDeviceTag('saves')) return false;
  if (!data || data.version !== SAVE_VERSION) {
    showToast('Знак выцвел: он остался от другого мира (другая версия игры)');
    return false;
  }
  applyGame(data);
  showToast('Время пошло назад. Мир забыл, что было потом, а вы нет.');
  return true;
}
