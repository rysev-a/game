// src/core/testhost.js
// ПРОБНЫЙ МИР для сценариев и тестов: игра без экрана. Хранит инвентарь, положение игрока, время и все, что ядро
// показало бы на экране (сообщения, окна диалога). Игровой host (src/quests/host.js) умеет то же на настоящем мире.

(function (root) {
  const Core = (root.Core = root.Core || {});

  Core.createTestHost = function createTestHost() {
    const h = {
      time: 0, // игровых минут с начала истории
      items: {},
      pos: null, // { x, z }
      zoneId: null,
      elixir: 0,
      toasts: [],
      dialogs: [],
    };
    h.now = () => h.time;
    h.itemCount = (id) => h.items[id] || 0;
    h.giveItem = (id, n = 1) => (h.items[id] = (h.items[id] || 0) + n);
    h.takeItem = (id, n = 1) => (h.items[id] = Math.max(0, (h.items[id] || 0) - n));
    h.playerPos = () => h.pos;
    h.zone = () => h.zoneId;
    h.addElixir = (n) => (h.elixir += n);
    h.openPuzzle = (session) => h.dialogs.push(session);
    h.toast = (text) => h.toasts.push(text);
    h.openDialog = (node) => h.dialogs.push(node);
    h.random = () => 0; // всегда первая реплика из списка: тесты не зависят от случая
    return h;
  };
})(globalThis);
