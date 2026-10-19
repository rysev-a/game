// tools/build-demo.js
// Собирает страницы ДЕМО demo/<страница>.html из index.html: тот же HTML, стили и скрипты, что и в игре (поэтому демо не отстает от игры), но
// без квестов, а вместо мира игры — площадка ДЕМО (src/demo/*.js) со своим круглым миром. Меню выбора (demo/index.html, demo/races.html) пишутся вручную.
// Запуск: `node tools/build-demo.js`. Тест tests/demo.test.js проверяет, что страницы совпадают с тем, что собирает эта программа.

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

// страница → название, локация, участок гонок, круглый мир и скрипты площадки (после src/demo/demo.js)
const PAGES = {
  characters: { title: 'персонажи', loc: 'characters', radius: 230, center: { x: 0, z: -10 }, scripts: [] },
  lab: { title: 'лаборатория', loc: 'lab', radius: 190, center: { x: 50, z: 70 }, scripts: ['src/demo/range.js', 'src/demo/range-creatures.js', 'src/demo/tutorial.js'] },
  'races-city': { title: 'гоночные трассы: города и складки', loc: 'races', section: 'city', radius: 1000, center: { x: -720, z: 0 } },
  'races-relief': { title: 'гоночные трассы: подъемы и спуски', loc: 'races', section: 'relief', radius: 900, center: { x: -460, z: -170 } },
  'races-shapes': { title: 'гоночные трассы: фигуры', loc: 'races', section: 'shapes', radius: 750, center: { x: -690, z: -1150 } },
  'races-rings-small': { title: 'гоночные трассы: малые кольца', loc: 'races', section: 'rings-small', radius: 1000, center: { x: -700, z: -2050 } },
  'races-rings-big': { title: 'гоночные трассы: крупные кольца', loc: 'races', section: 'rings-big', radius: 1000, center: { x: 400, z: -2250 } },
  'races-eights-west': { title: 'гоночные трассы: восьмерки (запад)', loc: 'races', section: 'eights-west', radius: 1450, center: { x: -1070, z: 2130 } },
  'races-eights-east': { title: 'гоночные трассы: восьмерки (восток)', loc: 'races', section: 'eights-east', radius: 1450, center: { x: 765, z: 2130 } },
};
for (const p of Object.values(PAGES)) if (p.loc === 'races') p.scripts = ['src/demo/race.js', 'src/demo/fuel-can.js'];

function replaceOnce(html, from, to) {
  if (!html.includes(from)) throw new Error('В index.html нет: ' + from);
  return html.replace(from, () => to);
}

function build(id, index) {
  const p = PAGES[id];
  let html = index;
  html = replaceOnce(html, '<head>', '<head>\n    <!-- ДЕМО лежит в /demo/, а файлы игры (src, audio, game.json) — в корне: все относительные пути от корня (собрано tools/build-demo.js) -->\n    <base href="../" />');
  html = html.replace(/<title>[^<]*<\/title>/, '<title>ДЕМО — ' + p.title + '</title>');
  const vars =
    "const GAME_LOCATION = 'demo'; const demoLocation = '" + p.loc + "';" + (p.section ? " const demoRaceSection = '" + p.section + "';" : '') +
    ' const demoWorldRadius = ' + p.radius + '; const demoWorldCenter = { x: ' + p.center.x + ', z: ' + p.center.z + ' }; // ДЕМО: локация и ее круглый мир (src/engine/layout.js, src/demo/demo.js)';
  html = replaceOnce(html, '<script src="src/locations/shared/locations.js"></script>', '<script>' + vars + '</script>');
  html = replaceOnce(html, '    <script src="src/locations/shared/coords.js"></script>\n', ''); // координаты мест большого мира в ДЕМО не нужны
  html = replaceOnce(html, '    <script src="src/models/weapons.js"></script>\n', '    <script src="src/models/weapons.js"></script>\n    <script src="src/models/creatures.js"></script>\n');
  const script = (src) => '    <script src="' + src + '"></script>';
  const world = ['src/demo/demo.js', ...p.scripts, 'src/world/forest.js', 'src/world/fence.js'].map(script).join('\n');
  html = replaceOnce(html, '    <script>\n      writeWorldScripts();\n    </script>', world);
  html = replaceOnce(html, '    <script src="src/quests/load.js"></script>\n', '');
  return html;
}

function buildAll() {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const out = {};
  for (const id of Object.keys(PAGES)) out['demo/' + id + '.html'] = build(id, index);
  return out;
}

if (require.main === module) {
  for (const [file, html] of Object.entries(buildAll())) {
    fs.writeFileSync(path.join(root, file), html);
    console.log('собрано ' + file);
  }
}
module.exports = { buildAll, PAGES };
