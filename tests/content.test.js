// Тесты настоящего содержания игры (src/content): ссылки целы, сценарии проходятся, у каждого квеста есть сценарий.
// Файлы содержания — те же, что грузит браузер (список в src/quests/manifest.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadContent, manifest, root } = require('./helpers.js');

const Core = loadContent();

// Место сцены у реки в игре задает src/quests/places.js по координатам сцены; для теста — те же числа:
// река x = 350, тело в riverX − 21, z = 18, «подошел» с 60 юнитов
definePlace('bridge.scene', { x: 329, z: 18, r: 60, name: 'Мост' });
require('./scenarios/1-03-bridge.js');

const reg = Core.registry;

test('все файлы из manifest.js существуют', () => {
  for (const file of [...manifest.core, ...manifest.content, ...manifest.adapter]) {
    assert.ok(fs.existsSync(path.join(root, file)), 'нет файла ' + file);
  }
});

test('checkContent: в содержании нет ошибок', () => {
  assert.deepEqual(Core.checkContent(reg), []);
});

test('у каждого квеста есть сценарий с его id', () => {
  for (const id of Object.keys(reg.quests)) assert.ok(reg.scenarios[id], 'нет сценария для квеста ' + id);
});

for (const scenario of Object.values(reg.scenarios)) {
  test('сценарий: ' + (scenario.title || scenario.id), () => {
    const result = Core.runScenario(reg, scenario);
    assert.deepEqual(result.failures, []);
  });
}

test('квест 1.03: журнал после прохождения', () => {
  const result = Core.runScenario(reg, reg.scenarios['1.03']);
  const journal = result.game.journal();
  assert.equal(journal.tasks.length, 0);
  assert.deepEqual(journal.done.map((q) => q.title), ['У моста']);
  assert.deepEqual(journal.facts.map((f) => f.id), ['Ф1', 'Ф2', 'Ф3']);
  assert.equal(journal.people[0].name, 'Денис');
  assert.equal(journal.messages[0].name, 'Денис');
});

test('перепись meta: ключи квеста 1.03 видны', () => {
  assert.ok(Core.metaCensus(reg)['design.theme'] >= 1);
});
