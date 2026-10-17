// src/quests/portals.js
// ПЕРЕХОДЫ МЕЖДУ ЛОКАЦИЯМИ как данные (definePortal, src/content/portals.js): герой пришел в место at (пешком или на машине) — его переносит в место to
// другой страницы-локации (трек, лаборатория, этажи башни и обратно). Машина едет с ним, если он за рулем. Проверка — четыре раза в секунду.

(function () {
  const g = questGame;
  const reg = Core.registry;
  setInterval(() => {
    for (const po of Object.values(reg.portals)) {
      const at = reg.places[po.at];
      if (!at || (at.location || 'main') !== GAME_LOCATION || !g.check(po.if)) continue;
      const d = g.placeDistance(po.at);
      if (d === null || d > (po.r || at.r || 12)) continue;
      if (dialogueOpen || settingsOpen) continue;
      questHost.teleport(po.to, { car: !!drivingCar, heading: po.heading });
      return;
    }
  }, 250);
})();
