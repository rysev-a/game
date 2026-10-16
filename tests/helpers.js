// tests/helpers.js
// Общее для тестов: загрузка ядра и содержания в Node. Файлы игры — классические скрипты, которые кладут себя в
// globalThis (Core, defineQuest…), поэтому достаточно подключить их по порядку из src/quests/manifest.js.

const path = require('node:path');
const manifest = require('../src/quests/manifest.js');

const root = path.join(__dirname, '..');
const load = (files) => files.forEach((f) => require(path.join(root, f)));

function loadCore() {
  load(manifest.core);
  return globalThis.Core;
}

function loadContent() {
  const Core = loadCore();
  load(manifest.content);
  return Core;
}

// Маленькая игра с пустым хостом и своим реестром: define(reg) наполняет его данными теста
function makeGame(define) {
  const Core = loadCore();
  const registry = Core.createRegistry();
  define(registry);
  const host = Core.createTestHost();
  const game = Core.createGame({ registry, host });
  game.settle();
  return { Core, registry, host, game };
}

module.exports = { manifest, root, loadCore, loadContent, makeGame };
