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
definePlace('zarechye.house', { x: 400, z: 900, r: 34, name: 'Дом Анны Петровны' });
definePlace('zarechye.tree', { x: 400, z: 950, r: 14, name: 'Дерево с домиком' });
definePlace('mall.entrance', { x: 0, z: -29, r: 14, name: 'Торговый центр' });
definePlace('village.denis', { x: -1318, z: 7, r: 24, name: 'Сосновка, улица' });
definePlace('city.library', { x: 220, z: -20, r: 34, name: 'Библиотека' });
definePlace('yard.forge', { x: -150, z: -27, r: 12, name: 'Кузница Михалыча' });
definePlace('yard.garage', { x: -128, z: -27, r: 12, name: 'Автомастерская Рустама' });
definePlace('yard.nikolai', { x: -129, z: -18, r: 10, name: 'Заправка' });
definePlace('village.loft', { x: -1238, z: 9, r: 8, name: 'Старая голубятня' });
definePlace('village.server', { x: -1258, z: 9, r: 8, name: 'Домашний сервер' });
for (const [id, x, z] of [
  ['lab.gate', -330, 90], ['lab.desk', -344, 118], ['lab.hatch', -316, 118], ['lab.basement', -330, 218], ['lab.arsenal', -360, 234],
  ['lab.hall', -330, 250], ['lab.assembly', -330, 302], ['lab.office', -300, 322],
]) definePlace(id, { x, z, r: 10, name: id });
require('./scenarios/1-03-bridge.js');
require('./scenarios/1-06-treehouse.js');
require('./scenarios/2-05-elixir.js');
require('./scenarios/2-act2.js');
require('./scenarios/act-3-5.js');

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
  assert.deepEqual(journal.done.map((q) => q.title), ['У моста']);
  assert.deepEqual(journal.tasks.map((q) => q.title), ['Домик на дереве']); // следующий квест выдан
  assert.deepEqual(journal.facts.map((f) => f.id), ['Ф1', 'Ф2', 'Ф3']);
  assert.equal(journal.people[0].name, 'Денис');
  assert.equal(journal.messages[0].name, 'Денис');
});

test('перепись meta: ключи квеста 1.03 видны', () => {
  assert.ok(Core.metaCensus(reg)['design.theme'] >= 1);
});
