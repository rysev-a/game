// Тесты разбиения мира на локации: страницы locations/*.html собраны программой tools/build-locations.js из index.html и не устарели;
// у каждой страницы свой id, круглый мир и нужные скрипты; все скрипты существуют.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildAll, LOCATIONS } = require('../tools/build-locations.js');

const root = path.join(__dirname, '..');

test('страницы locations/*.html совпадают с тем, что собирает tools/build-locations.js (иначе: node tools/build-locations.js)', () => {
  for (const [file, html] of Object.entries(buildAll())) {
    assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), html, 'устарела страница ' + file);
  }
});

test('на странице локации свой GAME_LOCATION, свой круглый мир и нет большого мира', () => {
  for (const [file, html] of Object.entries(buildAll())) {
    const id = path.basename(file, '.html');
    assert.ok(html.includes("const GAME_LOCATION = '" + id + "';"), file + ': нет id локации');
    assert.ok(html.includes('const demoWorldRadius = ' + LOCATIONS[id].radius), file + ': нет радиуса мира');
    assert.ok(!html.includes('src/locations/village/village.js'), file + ': в локации не должно быть поселка');
    assert.ok(!html.includes('src/world/world.js'), file + ': в локации не строится трасса основного мира');
    assert.ok(html.includes('src/locations/shared/location.js') && html.includes('src/locations/shared/location-finish.js'));
    assert.ok(html.includes('src/locations/' + id + '/' + id + '.js'), file + ': нет скрипта самой локации');
  }
});

test('index.html: основной мир, без скриптов трека, лаборатории и этажей башни, но со входами', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(index.includes("const GAME_LOCATION = 'main';"));
  for (const gone of ['locations/lab/lab.js', 'locations/tower/tower.js', 'locations/track/track.js']) assert.ok(!index.includes(gone), 'в основном мире не должно быть ' + gone);
  assert.ok(index.includes('src/locations/entrances/entrances.js'));
  assert.ok(index.includes('src/locations/shared/coords.js'));
});

test('все скрипты страниц-локаций существуют', () => {
  for (const html of Object.values(buildAll())) {
    for (const m of html.matchAll(/<script src="(src\/[^"]+)"/g)) assert.ok(fs.existsSync(path.join(root, m[1])), 'нет файла ' + m[1]);
  }
});

test('координаты локаций в coords.js и в tools/build-locations.js согласованы (центр и радиус)', () => {
  const coords = fs.readFileSync(path.join(root, 'src/locations/shared/coords.js'), 'utf8');
  for (const [id, loc] of Object.entries(LOCATIONS)) {
    assert.ok(coords.includes('radius: ' + loc.radius), id + ': радиус в coords.js другой');
  }
});
