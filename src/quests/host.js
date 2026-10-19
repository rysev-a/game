// src/quests/host.js
// ХОСТ ЯДРА В БРАУЗЕРЕ. Ядро квестов (src/core) ничего не знает про игру; здесь оно получает мир: инвентарь,
// положение игрока, игровые часы, сообщения и окно диалога. Создает единственную игру историй — questGame.
// (Тот же интерфейс для тестов — src/core/testhost.js.)

// Рассказчик для узлов без собеседника (воспоминание): окну диалога нужен «человек», но не нужно его тело
const questNarrator = { talking: false, seated: true };

// Идет входящий звонок (телефон героя звонит, src/quests/journal-ui.js): игра на паузе
let questCallOpen = false;

// Сообщения ядра идут по очереди: «Новое задание» и сообщение на телефон не должны затирать друг друга
const questToasts = [];
let questToastBusy = false;
function questShowNextToast() {
  const text = questToasts.shift();
  if (text === undefined) {
    questToastBusy = false;
    return;
  }
  questToastBusy = true;
  showToast(text, 3200);
  setTimeout(questShowNextToast, 3300);
}

// Короткое затемнение экрана (перенос героя, ночь у сервера): тот же слой, что у перемещения по карте
function questFade() {
  travelFadeEl.style.transition = 'none';
  travelFadeEl.style.opacity = '0.85';
  void travelFadeEl.offsetWidth;
  travelFadeEl.style.transition = 'opacity 0.8s';
  travelFadeEl.style.opacity = '0';
}

// Перенос героя (и машины) в место этой же страницы
function questTeleportLocal(placeId, opts = {}) {
  const p = Core.registry.places[placeId];
  if (!p) return;
  questFade();
  // car: true — вместе с машиной героя; если он сейчас за рулем другого транспорта (мотороллер курьера, 2.15) — вместе с ним
  if (opts.car && garage.car) {
    const ride = drivingCar && drivingCar !== garage.car && drivingCar.questVehicle ? drivingCar : null;
    if (drivingCar && drivingCar !== garage.car && !ride) releaseCar();
    const car = ride || garage.car;
    car.x = p.x;
    car.z = p.z;
    car.heading = opts.heading === undefined ? -Math.PI / 2 : opts.heading;
    car.speed = 0;
    car.slip = 0;
    car.fuel = Math.max(car.fuel, ride ? 0.4 : 0.6);
    enterCar(car);
  } else {
    if (drivingCar) exitCar(true);
    playerWorldX = p.x;
    playerWorldZ = p.z;
  }
  walkAmp = 0;
  if (typeof clickMoveStop === 'function') clickMoveStop();
}

// Переход в другую локацию: состояние игры (как сохранение) кладется в sessionStorage и открывается страница локации; она восстановит его
// (src/quests/transit.js) и поставит героя в место payload.to. payload: { to, opts, extra } или { load: данные слота }
let questTraveling = false;
function questTravelToLocation(loc, payload) {
  if (questTraveling || !LOCATIONS[loc]) return;
  questTraveling = true;
  const data = payload.load || captureGame();
  try {
    sessionStorage.setItem('game.transit', JSON.stringify({ ...payload, load: !!payload.load, data }));
  } catch (e) {
    questTraveling = false;
    showToast('Не удалось перейти в другую локацию: хранилище браузера недоступно');
    return;
  }
  questFade();
  setTimeout(() => (window.location.href = LOCATIONS[loc].page), 450);
}

// Доля бака, которой хватает от дома героя до реки по трассе: длина пути (highwayLengthToRiver, если дорога ее задала, иначе прямая и 15% на изгибы)
// плюс запас 4% на выезд из гаража, торможения и разворот. fuelRange — src/player/driving.js
function questFuelToRiver() {
  const home = Core.registry.places['village.home'];
  const straight = riverX - (home ? home.x : villageX);
  const len = typeof highwayLengthToRiver === 'number' ? highwayLengthToRiver : straight * 1.15;
  return Math.min(1, len / (fuelRange * ((garage.car && garage.car.fuelEconomy) || 1)) + 0.04);
}

const questHost = {
  now: () => gameMinutes,
  seconds: () => performance.now() / 1000, // таймеры квестов считают реальные секунды (src/core/game.js)
  hour: () => gameHour(),
  itemCount: (id) => (hasItem(id) ? 1 : 0),
  giveItem: (id) => addItem(id),
  takeItem: (id) => removeItem(id),
  playerPos: () => ({ x: playerWorldX, z: playerWorldZ }),
  zone: () => currentZone().id,
  inside: () => insideBuilding(),
  driving: (kind) => (kind ? !!(drivingCar && drivingCar.kind && drivingCar.kind.id === kind) : !!drivingCar),
  raining: () => rainOn,
  toast: (text) => {
    questToasts.push(text);
    if (!questToastBusy) questShowNextToast();
  },
  openDialog: (node) => startDialogue(questNarrator, node),
  openPuzzle: (session) => session && openPuzzleUi(session), // окно головоломки: src/quests/puzzle-ui.js
  setCarLimp: (on) => {
    if (!garage.car) return;
    garage.car.limp = !!on;
    showToast(on ? 'Мотор троит и дымит: машина еле едет. Нужен ремонт.' : 'Машина починена: едет как новая.', 4000);
  },
  swapPlayerCar: (kindId) => questSwapPlayerCar(kindId),
  // Бак машины героя: доля 0…1; 'river' — ровно хватит от дома до реки по трассе (с небольшим запасом)
  setFuel: (v) => {
    const car = garage.car;
    if (!car) return;
    car.fuel = v === 'river' ? questFuelToRiver() : Math.max(0, Math.min(1, v));
  },
  fuel: () => (garage.car ? garage.car.fuel : 1),
  setFuelEconomy: (n) => {
    if (garage.car) garage.car.fuelEconomy = n;
    if (n > 1) showToast('Расход топлива настроен: бензина хватит надолго (в ' + n + ' раз).', 4000);
  },
  killHero: () => {
    questFade();
    if (drivingCar) exitCar(true);
    heroStats.hp = heroStats.maxHp; // герой приходит в себя: прежнее поражение игры (src/engine/enemy-attacks.js) — wake
    renderEquipHud();
    showToast('Люди в черном догнали вас. Темнота... и снова старт.', 4500);
  },
  paused: () => dialogueOpen || settingsOpen || questCallOpen || (typeof mainMenuOpen !== 'undefined' && mainMenuOpen) || (typeof questSuperOpen !== 'undefined' && questSuperOpen), // в разговоре, журнале, головоломке и меню таймеры стоят
  elixir: () => heroStats.elixir,
  advanceTime: (min) => {
    advanceGameTime(min);
    clockShown = '';
    questFade();
  },
  // opts.car — вместе с машиной героя: она встает на место лицом к opts.heading (по умолчанию на восток), герой садится за руль.
  // Место в другой локации — переход на ее страницу (машина едет с героем, если он за рулем или просит car)
  teleport: (placeId, opts = {}) => {
    const p = Core.registry.places[placeId];
    if (!p) return;
    const loc = p.location || 'main';
    if (loc !== GAME_LOCATION) {
      questTravelToLocation(loc, { to: placeId, opts: { car: opts.car !== undefined ? opts.car : !!drivingCar, heading: opts.heading }, extra: opts.extra });
      return;
    }
    questTeleportLocal(placeId, opts);
  },
  location: () => GAME_LOCATION,
  heal: (n) => {
    heroStats.hp = Math.min(heroStats.maxHp, heroStats.hp + n);
    renderEquipHud();
  },
  addElixir: (n) => {
    heroStats.elixir = Math.max(0, Math.min(heroStats.maxElixir, heroStats.elixir + n));
    renderEquipHud();
  },
};

// Подарить герою другую машину вместо его: старая убирается, новая встает на ее место (герой остается за рулем, если сидел)
function questSwapPlayerCar(kindId) {
  const old = garage.car;
  if (!old || !VEHICLE_KINDS[kindId] || (old.kind && old.kind.id === kindId)) return;
  const wasDriving = drivingCar === old;
  const { x, z, heading } = old;
  if (wasDriving) drivingCar = null;
  cityGroup.remove(old.mesh);
  cars.splice(cars.indexOf(old), 1);
  const car = addVehicle(kindId, x, z, heading, { fuel: 1, keyId: 'keys' });
  if (!car) {
    cars.push(old); // нет места: оставляем старую
    cityGroup.add(old.mesh);
    if (wasDriving) drivingCar = old;
    return;
  }
  car.isPlayerCar = true;
  car.fuelEconomy = questGame.state.fuelEconomy || 1;
  markPlayerCar(car);
  garage.car = car;
  if (wasDriving) enterCar(car);
}

const questGame = Core.createGame({ registry: Core.registry, host: questHost });
