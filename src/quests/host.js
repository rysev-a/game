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
  addElixir: (n) => {
    heroStats.elixir = Math.min(heroStats.maxElixir, heroStats.elixir + n);
    renderEquipHud();
  },
};

const questGame = Core.createGame({ registry: Core.registry, host: questHost });
