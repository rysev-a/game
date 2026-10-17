// src/core/testhost.js
// ПРОБНЫЙ МИР для сценариев и тестов: игра без экрана. Хранит инвентарь, положение игрока, время и все, что ядро
// показало бы на экране (сообщения, окна диалога). Игровой host (src/quests/host.js) умеет то же на настоящем мире.

(function (root) {
  const Core = (root.Core = root.Core || {});

  Core.createTestHost = function createTestHost(registry) {
    const h = {
      time: 0, // игровых минут с начала истории
      items: {},
      pos: null, // { x, z }
      zoneId: null,
      elixirAmount: 0,
      toasts: [],
      dialogs: [],
    };
    h.now = () => h.time;
    h.itemCount = (id) => h.items[id] || 0;
    h.giveItem = (id, n = 1) => (h.items[id] = (h.items[id] || 0) + n);
    h.takeItem = (id, n = 1) => (h.items[id] = Math.max(0, (h.items[id] || 0) - n));
    h.playerPos = () => h.pos;
    h.zone = () => h.zoneId;
    h.elixir = () => h.elixirAmount;
    h.addElixir = (n) => (h.elixirAmount = Math.max(0, h.elixirAmount + n));
    h.advanceTime = (min) => (h.time += min);
    h.teleport = (id, opts) => {
      h.teleported = id;
      h.teleportOpts = opts;
      const place = registry && registry.places[id];
      if (place) h.pos = { x: place.x, z: place.z }; // герой действительно оказывается на месте
    };
    h.startHeli = (opts) => (h.heli = opts);
    h.driving = () => h.isDriving;
    h.setCarLimp = (v) => (h.limp = v);
    h.swapPlayerCar = (kind) => (h.playerCarKind = kind);
    h.setFuelEconomy = (n) => (h.fuelEconomy = n);
    h.killHero = () => (h.killed = (h.killed || 0) + 1);
    h.startPractice = (opts) => (h.practice = opts);
    h.endPractice = () => (h.practice = null);
    h.heal = (n) => (h.healed = (h.healed || 0) + n);
    h.openPuzzle = (session) => h.dialogs.push(session);
    h.toast = (text) => h.toasts.push(text);
    h.openDialog = (node) => h.dialogs.push(node);
    h.random = () => 0; // всегда первая реплика из списка: тесты не зависят от случая
    return h;
  };
})(globalThis);
