// src/quests/manifest.js
// СПИСОК ФАЙЛОВ квестовой системы в порядке подключения — один на всех: его читает загрузчик в браузере
// (src/quests/load.js) и тесты в Node (tests/). Новый файл ядра, содержания или адаптера — строка сюда.
//
//   core     ядро (src/core): чистая логика, работает и в Node
//   content  содержание: факты, персонажи, квесты — только данные
//   adapter  подключение к игре: только в браузере, после движка

(function (root) {
  const manifest = {
    core: [
      'src/core/registry.js',
      'src/core/conditions.js',
      'src/core/effects.js',
      'src/core/game.js',
      'src/core/dialogs.js',
      'src/core/puzzles.js',
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
      'src/content/quests/1-03-bridge.js',
      'src/content/quests/1-06-treehouse.js',
      'src/content/quests/2-05-elixir.js',
    ],
    adapter: [
      'src/quests/host.js',
      'src/quests/places.js',
      'src/quests/hooks.js',
      'src/quests/journal-ui.js',
      'src/quests/puzzle-ui.js',
      'src/quests/start.js',
    ],
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = manifest;
  else root.QUEST_MANIFEST = manifest;
})(globalThis);
