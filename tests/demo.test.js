// Страницы ДЕМО (demo/*.html) собираются из index.html программой tools/build-demo.js и не должны отставать от игры.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildAll } = require('../tools/build-demo.js');

const root = path.join(__dirname, '..');

test('страницы demo/*.html совпадают с тем, что собирает tools/build-demo.js (иначе: node tools/build-demo.js)', () => {
  for (const [file, html] of Object.entries(buildAll())) {
    assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), html, 'устарела страница ' + file);
  }
});

test('у страницы ДЕМО нет квестов и большого мира, но есть площадка и все скрипты существуют', () => {
  for (const [file, html] of Object.entries(buildAll())) {
    assert.ok(!html.includes('src/quests/load.js'), file + ': в ДЕМО нет квестов');
    assert.ok(!html.includes('src/world/world.js') && !html.includes('writeWorldScripts'), file + ': нет большого мира');
    assert.ok(html.includes('src/demo/demo.js'), file + ': нет площадки ДЕМО');
    for (const m of html.matchAll(/<script src="(src\/[^"]+)"/g)) assert.ok(fs.existsSync(path.join(root, m[1])), file + ': нет файла ' + m[1]);
  }
});
