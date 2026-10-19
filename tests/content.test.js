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
definePlace('village.home', { x: -1318, z: 0, r: 14, name: 'Дом, Сосновка' });
definePlace('road.city', { x: 200, z: 0, r: 14, name: 'Трасса у города' });
definePlace('zarechye.road', { x: 606, z: 230, r: 12, name: 'Улица Заречья' });
definePlace('pizza.shop', { x: -104, z: -22, r: 14, name: 'Пиццерия' });
for (const [i, [x, z]] of [[0, -29], [70, 56], [232, 6], [398, -9], [448, -8]].entries()) definePlace('pizza.c' + (i + 1), { x, z, r: 14, name: 'Заказ ' + (i + 1) });
definePlace('zarechye.parking', { x: 588.3, z: 247.3, r: 6, name: 'Парковка у дома Анны Петровны' });
definePlace('gas.zarechye', { x: 398, z: -9, r: 14, name: 'Заправка «Заречье»' });
definePlace('zarechye.house', { x: 400, z: 900, r: 34, name: 'Дом Анны Петровны' });
definePlace('zarechye.tree', { x: 400, z: 950, r: 14, name: 'Дерево с домиком' });
definePlace('mall.entrance', { x: 0, z: -29, r: 14, name: 'Торговый центр' });
definePlace('village.denis', { x: -1318, z: 7, r: 24, name: 'Сосновка, улица' });
definePlace('city.library', { x: 220, z: -20, r: 34, name: 'Библиотека' });
definePlace('yard.forge', { x: -150, z: -27, r: 12, name: 'Слесарная мастерская Михалыча' });
definePlace('yard.garage', { x: -128, z: -27, r: 12, name: 'Автомастерская Рустама' });
definePlace('yard.nikolai', { x: -129, z: -18, r: 10, name: 'Заправка' });
definePlace('village.loft', { x: -1238, z: 9, r: 8, name: 'Старая голубятня' });
definePlace('village.server', { x: -1258, z: 9, r: 8, name: 'Домашний сервер' });
for (const [id, x, z] of [
  ['lab.gate', -330, 90], ['lab.desk', -344, 118], ['lab.hatch', -316, 118], ['lab.basement', -330, 218], ['lab.arsenal', -360, 234],
  ['lab.hall', -330, 250], ['lab.assembly', -330, 302], ['lab.office', -300, 322],
]) definePlace(id, { x, z, r: 10, name: id });
definePlace('chase.start', { x: -700, z: 3, r: 10, name: 'Старт погони' });
for (let i = 1; i <= 5; i++) definePlace('chase.b' + i, { x: -600 + (i - 1) * 70, z: 0, r: 6, name: 'Поваленное дерево' });
definePlace('mall.stalls', { x: 40, z: -18, r: 12, name: 'Прилавки' });
definePlace('tower.base', { x: 70, z: 70, r: 40, name: 'Башня' });
definePlace('tower.door', { x: 70, z: 56, r: 8, name: 'Вход в башню' });
definePlace('tower.pad', { x: 90, z: 54, r: 8, name: 'Площадка' });
for (let i = 1; i <= 9; i++) definePlace('tower.f' + i, { x: -130 + (i - 1) * 38, z: 250, r: 16, name: i + ' этаж' });
for (const id of ['track.salon', 'track.entrance', 'track.gate', 'track.exit', 'track.back', 'lab.entrance', 'lab.exit', 'lab.back']) definePlace(id, { x: 0, z: 0, r: 10, name: id });
definePlace('track.start', { x: -620, z: 190, r: 16, name: 'Старт' });
definePlace('track.pre', { x: -590, z: 190, r: 14, name: 'Разгон' });
for (let i = 1; i <= 8; i++) definePlace('track.cp' + i, { x: -770 + i * 20, z: 200 + i, r: 16, name: 'КП ' + i });
definePlace('river.yacht', { x: 350, z: -90, r: 24, name: 'Яхта' });
definePlace('city.inc1', { x: 112, z: 9, r: 8, name: 'Оцепление 1' });
definePlace('city.inc2', { x: 415, z: -9, r: 8, name: 'Оцепление 2' });
require('./scenarios/1-03-bridge.js');
require('./scenarios/1-06-treehouse.js');
require('./scenarios/2-05-elixir.js');
require('./scenarios/2-act2.js');
require('./scenarios/act-3-5.js');
require('./scenarios/act-2b.js');
require('./scenarios/4-12-tower.js');
require('./scenarios/3-05-car.js');
require('./scenarios/3-12-yacht.js');
require('./scenarios/3-06-13-weather.js');
require('./scenarios/2-15-pizza.js');

const reg = Core.registry;

test('все файлы из manifest.js существуют', () => {
  for (const file of [...manifest.core, ...manifest.content, ...manifest.contentBrowser, ...manifest.adapter.map((f) => f.replace(/^main:/, ''))]) {
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
  assert.equal(result.game.state.calls[0].from, 'denis'); // звонок в истории телефона
});

test('перепись meta: ключи квеста 1.03 видны', () => {
  assert.ok(Core.metaCensus(reg)['design.theme'] >= 1);
});
