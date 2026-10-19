// tools/export-track.js
// Сохраняет конфигурацию гоночного трека «Складки» (src/locations/shared/coords.js: trackPath, trackCheckpoints) в src/locations/track/track-layout.json:
// параметры змеек, линия старта, контрольные точки и вся ось с полуширинами. Запасная копия «на всякий случай»: по ней трек можно восстановить, даже если
// код расчета изменится. Запуск: `node tools/export-track.js`.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src/locations/shared/coords.js'), 'utf8');
// coords.js — классический скрипт для браузера: берем его константы в отдельном контексте (const → var, чтобы они стали свойствами контекста)
const ctx = { riverX: 350, riverHalf: 16, LOCATION_WORLDS: { track: {}, lab: {}, tower: {} } };
vm.createContext(ctx);
vm.runInContext(src.replace(/^const /gm, 'var '), ctx);

const r1 = (v) => Math.round(v * 10) / 10;
const layout = {
  name: 'Складки',
  note: 'Гоночный трек: четыре змейки одна под другой, замыкающая дуга на восток. Координаты — мировые (x на восток, z на юг); гонка идет по часовой стрелке (если смотреть на карту): северная змейка — на восток от линии старта, точки пути идут в порядке движения.',
  params: {
    trackX: ctx.trackX,
    laneX1: ctx.trackLaneX1,
    laneX2: ctx.trackLaneX2,
    laneZ: ctx.trackLaneZ,
    laneHalfWidth: ctx.trackLaneHalfW,
    wave: ctx.trackWave,
    startX: ctx.trackStartX,
  },
  length: r1(ctx.trackPath.total),
  start: { x: ctx.trackPath.start.x, z: ctx.trackPath.start.z, s: r1(ctx.trackPath.start.s) },
  checkpoints: ctx.trackCheckpoints.map((c, i) => ({ id: 'track.cp' + (i + 1), x: r1(c.x), z: r1(c.z) })),
  points: ctx.trackPath.pts.map((p) => [r1(p.x), r1(p.z), r1(p.hw)]), // [x, z, полуширина полотна]
};
const out = path.join(root, 'src/locations/track/track-layout.json');
fs.writeFileSync(out, JSON.stringify(layout) + '\n');
console.log('сохранено ' + path.relative(root, out) + ': ' + layout.points.length + ' точек, длина ' + layout.length);
