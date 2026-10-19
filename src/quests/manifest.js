// src/quests/manifest.js
// СПИСОК ФАЙЛОВ квестовой системы в порядке подключения — один на всех: его читает загрузчик в браузере
// (src/quests/load.js) и тесты в Node (tests/). Новый файл ядра, содержания или адаптера — строка сюда.
//
//   core     ядро (src/core): чистая логика, работает и в Node
//   content  содержание: факты, персонажи, квесты — только данные
//   contentBrowser  данные, которым нужны координаты локаций (src/locations/shared/coords.js): только в браузере, после content
//   adapter  подключение к игре: только в браузере, после движка; файлы с приставкой main: — только на странице основного мира
//            (на страницах-локациях locations/*.html, GAME_LOCATION != 'main', их нет: там нет большого мира)

(function (root) {
  const manifest = {
    core: [
      'src/core/registry.js',
      'src/core/conditions.js',
      'src/core/effects.js',
      'src/core/game.js',
      'src/core/dialogs.js',
      'src/core/puzzles.js',
      'src/core/shops.js',
      'src/core/fights.js',
      'src/core/journal.js',
      'src/core/check-content.js',
      'src/core/testhost.js',
      'src/core/scenario.js',
      'src/core/boot.js',
    ],
    content: [
      'src/content/facts.js',
      'src/content/characters/denis.js',
      'src/content/characters/anna.js',
      'src/content/characters/lyudmila.js',
      'src/content/characters/people.js',
      'src/content/characters/gennady.js',
      'src/content/supers.js',
      'src/content/world.js',
      'src/content/portals.js',
      'src/content/quests/1-03-bridge.js',
      'src/content/quests/1-06-treehouse.js',
      'src/content/quests/2-02-case.js',
      'src/content/quests/2-05-elixir.js',
      'src/content/quests/2-06-ticket.js',
      'src/content/quests/2-08-analyzer.js',
      'src/content/quests/2-09-brakes.js',
      'src/content/quests/2-10-van.js',
      'src/content/quests/2-12-chase.js',
      'src/content/quests/2-15-pizza.js',
      'src/content/quests/2-13-weapons.js',
      'src/content/quests/2-14-night.js',
      'src/content/quests/2-11-flash.js',
      'src/content/quests/3-04-bracelet.js',
      'src/content/quests/3-05-car.js',
      'src/content/quests/3-06-weather.js',
      'src/content/quests/3-12-yacht.js',
      'src/content/quests/3-13-robots.js',
      'src/content/quests/4-09-lab.js',
      'src/content/quests/4-12-tower.js',
      'src/content/quests/4-11-artifact.js',
      'src/content/quests/5-02-stern.js',
    ],
    contentBrowser: ['src/content/places-locations.js'],
    adapter: [
      'src/quests/host.js',
      'src/quests/common-hooks.js',
      'src/quests/gates.js',
      'src/quests/weather-story.js',
      'src/quests/guide.js',
      'main:src/quests/places.js',
      'main:src/quests/hooks.js',
      'src/quests/world.js',
      'src/models/creatures.js',
      'src/quests/fights.js',
      'src/quests/heli.js',
      'src/quests/practice.js',
      'src/quests/portals.js',
      'src/quests/journal-ui.js',
      'src/quests/timers-ui.js',
      'src/quests/supers-ui.js',
      'src/quests/puzzle-ui.js',
      'src/quests/shop-ui.js',
      'src/quests/transit.js',
      'src/quests/start.js',
    ],
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = manifest;
  else root.QUEST_MANIFEST = manifest;
})(globalThis);
