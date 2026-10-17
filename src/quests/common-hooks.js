// src/quests/common-hooks.js
// ОБЩИЕ ОБЕРТКИ над функциями игры (на всех страницах: основной мир и локации). Это временная мера, пока старые файлы нельзя править на месте:
//
//   captureGame / applyGame    src/player/saves.js     в слот пишется и читается story (questGame.snapshot / restore) и локация,
//                                                       где сохранились; загрузка слота из другой локации сначала переходит на ее страницу
//   rootDialogue, personTitle  src/player/talk.js      разговор с именованным персонажем берется из данных

(function () {
  const g = questGame;

  // ---------- Сохранения: story едет в слоте вместе с игрой ----------
  // Версия сохранения прежняя: слот без story (старый) просто начинает историю заново
  const origCaptureGame = captureGame;
  captureGame = function () {
    const data = origCaptureGame();
    data.story = g.snapshot();
    data.location = GAME_LOCATION;
    return data;
  };
  const origApplyGame = applyGame;
  applyGame = function (data) {
    // Слот из другой локации: переходим на ее страницу, а загрузит слот уже она (src/quests/transit.js)
    if (data.location && data.location !== GAME_LOCATION && !data.arriving) {
      questTravelToLocation(data.location, { load: data });
      return;
    }
    origApplyGame(data);
    g.restore(data.story);
    if (g.state.playerCar) questSwapPlayerCar(g.state.playerCar); // подаренная машина после загрузки сохранения
    if (garage.car) garage.car.fuelEconomy = g.state.fuelEconomy || 1; // и настроенный расход
  };

  // ---------- Разговоры с именованными персонажами ----------
  const origRootDialogue = rootDialogue;
  rootDialogue = function (person) {
    if (person.charId && g.hasDialog(person.charId)) {
      const node = g.dialogue(person.charId);
      if (node) return node;
    }
    return origRootDialogue(person);
  };
  const origPersonTitle = personTitle;
  personTitle = (p) => p.title || origPersonTitle(p);
})();
