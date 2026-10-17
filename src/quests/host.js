// src/quests/host.js
// ХОСТ ЯДРА В БРАУЗЕРЕ. Ядро квестов (src/core) ничего не знает про игру; здесь оно получает мир: инвентарь,
// положение игрока, игровые часы, сообщения и окно диалога. Создает единственную игру историй — questGame.
// (Тот же интерфейс для тестов — src/core/testhost.js.)

// Рассказчик для узлов без собеседника (воспоминание): окну диалога нужен «человек», но не нужно его тело
const questNarrator = { talking: false, seated: true };

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

const questHost = {
  now: () => gameMinutes,
  hour: () => gameHour(),
  itemCount: (id) => (hasItem(id) ? 1 : 0),
  giveItem: (id) => addItem(id),
  takeItem: (id) => removeItem(id),
  playerPos: () => ({ x: playerWorldX, z: playerWorldZ }),
  zone: () => currentZone().id,
  inside: () => insideBuilding(),
  driving: () => !!drivingCar,
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
  killHero: () => {
    questFade();
    if (drivingCar) exitCar(true);
    heroStats.hp = heroStats.maxHp; // герой приходит в себя: прежнее поражение игры (src/engine/enemy-attacks.js) — wake
    renderEquipHud();
    showToast('Люди в черном догнали вас. Темнота... и снова старт.', 4500);
  },
  paused: () => dialogueOpen || settingsOpen, // в разговоре, журнале, головоломке и меню таймеры стоят
  elixir: () => heroStats.elixir,
  advanceTime: (min) => {
    advanceGameTime(min);
    clockShown = '';
    questFade();
  },
  // opts.car — вместе с машиной героя: она встает на место лицом к opts.heading (по умолчанию на восток), герой садится за руль
  teleport: (placeId, opts = {}) => {
    const p = Core.registry.places[placeId];
    if (!p) return;
    questFade();
    if (opts.car && garage.car) {
      if (drivingCar && drivingCar !== garage.car) releaseCar();
      const car = garage.car;
      car.x = p.x;
      car.z = p.z;
      car.heading = opts.heading === undefined ? -Math.PI / 2 : opts.heading;
      car.speed = 0;
      car.slip = 0;
      car.fuel = Math.max(car.fuel, 0.6);
      enterCar(car);
    } else {
      if (drivingCar) exitCar(true);
      playerWorldX = p.x;
      playerWorldZ = p.z;
    }
    walkAmp = 0;
    if (typeof clickMoveStop === 'function') clickMoveStop();
  },
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
  markPlayerCar(car);
  garage.car = car;
  if (wasDriving) enterCar(car);
}

const questGame = Core.createGame({ registry: Core.registry, host: questHost });
