// Тесты разбиения мира на локации: игра — одна страница index.html (адрес не меняется), мир выбирается при загрузке
// (src/locations/shared/locations.js); все скрипты миров существуют, а у отдельных локаций есть свой скрипт.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const locations = read('src/locations/shared/locations.js');

test('отдельных страниц локаций нет: игра — одна index.html', () => {
  assert.ok(!fs.existsSync(path.join(root, 'locations')), 'папка locations/ с отдельными страницами не нужна');
  const index = read('index.html');
  assert.ok(index.includes('src/locations/shared/locations.js') && index.includes('writeWorldScripts();'));
  assert.ok(!index.includes("const GAME_LOCATION = 'main';"));
});

test('все скрипты основного мира и локаций существуют', () => {
  const srcs = [...locations.matchAll(/'(src\/[^']+\.js)'/g)].map((m) => m[1]);
  assert.ok(srcs.length > 15);
  for (const f of srcs) assert.ok(fs.existsSync(path.join(root, f)), 'нет файла ' + f);
});

test('у каждой отдельной локации свой скрипт, центр и радиус мира', () => {
  for (const id of ['track', 'lab', 'tower']) {
    assert.ok(locations.includes(id + (id === 'tower' ? "' + i" : ': {')), id + ': нет в LOCATION_WORLDS');
    assert.ok(locations.includes('src/locations/' + id + '/' + id + '.js'), id + ': нет скрипта локации');
  }
  assert.ok(!/world\.js|village\.js/.test(locations.slice(locations.indexOf('const LOCATION_WORLDS'))), 'в мирах локаций не должно быть большого мира');
});

test('основной мир собирает входы в локации', () => {
  assert.ok(locations.includes('src/locations/entrances/entrances.js'));
  assert.ok(read('index.html').includes('src/locations/shared/coords.js'));
});
