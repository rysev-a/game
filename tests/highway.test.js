// Тесты оси трассы (src/world/highway-path.js): сельские участки извилистые и холмистые, но все, что привязано к прямой z = 0
// (заправки, съезды, торговый центр, города), стоит на прямом ровном участке.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src/world/highway-path.js'), 'utf8');
const hw = vm.runInNewContext(src + '\n({ highwaySections, highwayChaseXs, highwayMinRadius, highwaySlopeMax, highwayZ, highwayY, highwayHalfWidth, highwayVerge, highwayLength })');
const { highwaySections: sections, highwayZ: z, highwayY: y } = hw;

// Что привязано к трассе: [название, x1, x2] — на этих участках z = 0 и высота 0
const coords = fs.readFileSync(path.join(root, 'src/locations/shared/coords.js'), 'utf8');
const coord = (name) => Number(new RegExp('const ' + name + ' = (-?\\d+)').exec(coords)[1]);
const fixed = [
  ['заправка «Сосновка»', -1110 - 32, -1110 + 32],
  ['заправка «Лесная»', -700 - 32, -700 + 32],
  ['съезд на трек', coord('trackX') - 10, coord('trackX') + 10],
  ['съезд в лабораторию', coord('labX') - 10, coord('labX') + 10],
  ['заправка «Перекресток»', -290 - 32, -290 + 32],
  ['заправка у торгового центра', -140 - 32, -140 + 32],
  ['торговый центр', -45, 45],
  ['город 1 и все дальше', 112, 600],
  ['хвост у поселка', -1300, -1100],
];
const inSection = (x) => sections.some((s) => x > s.x1 && x < s.x2);

test('кривые лежат между закрепленными участками', () => {
  for (const [name, x1, x2] of fixed) {
    for (let x = x1; x <= x2; x += 1) assert.ok(!inSection(x), name + ': x = ' + x + ' внутри кривой');
  }
});

test('на закрепленных участках трасса прямая и ровная (z = 0, высота 0)', () => {
  for (const [name, x1, x2] of fixed) {
    for (let x = x1; x <= x2; x += 1) {
      assert.equal(z(x), 0, name + ': z ≠ 0 при x = ' + x);
      assert.equal(y(x), 0, name + ': высота ≠ 0 при x = ' + x);
    }
  }
});

test('кривая начинается и кончается плавно: z = 0, высота 0, курс вдоль оси', () => {
  for (const s of sections) {
    for (const [p, q] of [[s.pts[0], s.pts[1]], [s.pts[s.pts.length - 1], s.pts[s.pts.length - 2]]]) {
      assert.ok(Math.abs(p.z) < 1e-6, 'z на краю ' + p.z);
      assert.ok(Math.abs(p.z - q.z) / Math.abs(p.x - q.x) < 0.02, 'у края дорога должна идти вдоль оси');
    }
    assert.ok(Math.abs(y(s.x1 + 1e-6)) < 1e-6 && Math.abs(y(s.x2 - 1e-6)) < 1e-6);
  }
});

test('x растет вдоль всего пути, радиус дуг не меньше 55, дорога заметно отклоняется от оси', () => {
  for (const s of sections) {
    let minR = Infinity;
    let zMin = 0;
    let zMax = 0;
    const p = s.pts;
    for (let i = 1; i < p.length; i++) assert.ok(p[i].x > p[i - 1].x, 'x должен расти');
    for (let i = 2; i < p.length; i++) {
      const a = Math.atan2(p[i - 1].z - p[i - 2].z, p[i - 1].x - p[i - 2].x);
      const b = Math.atan2(p[i].z - p[i - 1].z, p[i].x - p[i - 1].x);
      const k = Math.abs(b - a) / Math.hypot(p[i].x - p[i - 1].x, p[i].z - p[i - 1].z);
      if (k > 1e-6) minR = Math.min(minR, 1 / k);
      zMin = Math.min(zMin, p[i].z);
      zMax = Math.max(zMax, p[i].z);
    }
    assert.ok(minR >= 55, s.x1 + ': минимальный радиус ' + minR.toFixed(1));
    assert.ok(Math.max(-zMin, zMax) > 15, s.x1 + ': кривая должна отклоняться от оси: ' + zMin.toFixed(1) + '…' + zMax.toFixed(1));
    assert.ok(Math.abs(zMin) < 60 && zMax < 60, 'кривая не уходит далеко от оси');
  }
});

test('холмы: высота до 4, уклон не круче 0,07', () => {
  let top = 0;
  let steepest = 0;
  for (const s of sections) {
    for (let x = s.x1; x < s.x2; x += 0.5) {
      top = Math.max(top, y(x));
      steepest = Math.max(steepest, Math.abs(y(x + 0.5) - y(x)) / 0.5);
    }
  }
  assert.ok(top >= 3.5 && top <= 4.0001, 'высота ' + top);
  assert.ok(steepest <= 0.07, 'уклон ' + steepest);
});

test('дорога к городам 3–6 входит в трассу на нулевой высоте: x = −882 и −432', () => {
  for (const x of [-882, -432]) {
    assert.ok(y(x) < 0.01, 'высота при x = ' + x + ' ' + y(x));
  }
});

test('заграждения погони: пять, стоят на земле там, где дорога параллельна оси X, не теснее 50', () => {
  const xs = hw.highwayChaseXs;
  assert.equal(xs.length, 5);
  for (let i = 0; i < 5; i++) {
    if (i) assert.ok(xs[i] - xs[i - 1] >= 50, 'заграждения ' + i + ' и ' + (i + 1) + ' слишком близко');
    assert.ok(y(xs[i]) < 0.01, 'заграждение ' + (i + 1) + ' на высоте ' + y(xs[i]));
    const slope = Math.abs(z(xs[i] + 1) - z(xs[i] - 1)) / 2;
    assert.ok(slope < 0.05, 'заграждение ' + (i + 1) + ': дорога идет под углом, уклон по z ' + slope);
    assert.ok(hw.highwayHalfWidth(xs[i]) >= 3.1);
  }
});

test('полотно широкое: полуширина 7,5 на кривой, обычная на концах и у заграждений; обочина сходит на нет вместе с ним', () => {
  for (const s of sections) {
    assert.ok(Math.abs(hw.highwayHalfWidth(s.x1 + 0.01) - 3.5) < 0.01 && Math.abs(hw.highwayHalfWidth(s.x2 - 0.01) - 3.5) < 0.01);
    assert.equal(hw.highwayVerge(s.x1 + 0.01) < 0.01, true);
    let widest = 0;
    for (let x = s.x1 + 1; x < s.x2; x += 1) widest = Math.max(widest, hw.highwayHalfWidth(x));
    assert.ok(widest >= 7.4 && widest <= 7.51, s.x1 + ': самое широкое место ' + widest);
  }
  for (const x of hw.highwayChaseXs) assert.ok(hw.highwayHalfWidth(x) <= 3.51, 'у заграждения полуширина ' + hw.highwayHalfWidth(x));
});

test('путь от дома до моста 1700–1800 (не короче: таймеры квестов считаны по нему)', () => {
  for (const s of sections) assert.ok(s.length > s.x2 - s.x1, s.x1 + ': длина ' + s.length);
  const len = 18 + hw.highwayLength(-1304, 350);
  assert.ok(len > 1700 && len < 1800, 'длина пути от дома до моста ' + len);
});

test('скрипты основного мира (src/locations/shared/locations.js): ось до поселка, а кусты и меши трассы — до world.js', () => {
  const list = fs.readFileSync(path.join(root, 'src/locations/shared/locations.js'), 'utf8');
  const at = (s) => list.indexOf("'" + s + "'");
  assert.ok(at('src/world/highway-path.js') >= 0 && at('src/world/highway-path.js') < at('src/locations/village/village.js'));
  assert.ok(at('src/world/highway.js') > at('src/locations/entrances/entrances.js') && at('src/world/highway.js') < at('src/world/world.js'));
});
