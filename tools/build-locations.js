// tools/build-locations.js
// Собирает страницы локаций locations/<id>.html из index.html: все тот же HTML и те же скрипты, но блок мира (между <!-- world:begin --> и
// <!-- world:end -->) заменен на мир локации (src/locations/shared/location.js, скрипты самой локации, лес и забор), а в начале страницы
// задаются id локации и ее круглый мир (демо-страницы работают так же, src/engine/layout.js). Запуск: `node tools/build-locations.js`.
// Тест tests/locations.test.js проверяет, что страницы совпадают с тем, что собирает эта программа.

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

// id локации → скрипты ее мира (после общей основы src/locations/shared/location.js)
const LOCATIONS = {
  track: { title: 'Гоночный трек', scripts: ['src/locations/track/track.js'], center: { x: -620, z: 200 }, radius: 290 },
  lab: { title: 'Лаборатория', scripts: ['src/locations/lab/lab.js'], center: { x: -330, z: 215 }, radius: 175 },
  tower: { title: 'Башня: этажи', scripts: ['src/locations/tower/tower.js'], center: { x: 22, z: 250 }, radius: 200 },
};

function build(id, index) {
  const loc = LOCATIONS[id];
  const begin = index.indexOf('    <!-- world:begin');
  const end = index.indexOf('<!-- world:end -->') + '<!-- world:end -->'.length;
  if (begin < 0 || end < begin) throw new Error('В index.html нет блока world:begin … world:end');
  const script = (src) => '    <script src="' + src + '"></script>';
  const world = [
    '    <!-- мир локации «' + loc.title + '» (собрано tools/build-locations.js) -->',
    script('src/locations/shared/location.js'),
    ...loc.scripts.map(script),
    script('src/locations/shared/location-finish.js'),
    script('src/world/forest.js'),
    script('src/world/fence.js'),
  ].join('\n');
  let html = index.slice(0, begin) + world + index.slice(end);
  html = html.replace("const GAME_LOCATION = 'main';", "const GAME_LOCATION = '" + id + "';");
  html = html.replace('    <script src="https://unpkg.com/three@0.128.0/build/three.min.js">',
    '    <script>const demoWorldRadius = ' + loc.radius + '; const demoWorldCenter = { x: ' + loc.center.x + ', z: ' + loc.center.z + ' }; // круглый мир локации (src/engine/layout.js)</script>\n' +
    '    <script src="https://unpkg.com/three@0.128.0/build/three.min.js">');
  html = html.replace('<head>', '<head>\n    <base href="../" />');
  html = html.replace(/<title>[^<]*<\/title>/, '<title>' + loc.title + '</title>');
  return html;
}

function buildAll() {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const out = {};
  for (const id of Object.keys(LOCATIONS)) out['locations/' + id + '.html'] = build(id, index);
  return out;
}

if (require.main === module) {
  fs.mkdirSync(path.join(root, 'locations'), { recursive: true });
  for (const [file, html] of Object.entries(buildAll())) {
    fs.writeFileSync(path.join(root, file), html);
    console.log('собрано ' + file);
  }
}
module.exports = { buildAll, LOCATIONS };
