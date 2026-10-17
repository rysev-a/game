// Тесты оси трассы (src/world/highway-path.js): сельский участок извилистый и холмистый, но все, что привязано к прямой z = 0
// (заправки, съезды, торговый центр, заграждения погони, города), стоит на прямом ровном участке.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src/world/highway-path.js'), 'utf8');
const hw = vm.runInNewContext(src + '\n({ highwayCurve, highwayMinRadius, highwayZ, highwayY, highwayHalfWidth, highwayLength })');
const { highwayCurve: curve, highwayZ: z, highwayY: y } = hw;

// Что привязано к трассе: [название, x1, x2] — на этих участках z = 0 и высота 0
const coords = fs.readFileSync(path.join(root, 'src/locations/shared/coords.js'), 'utf8');
const coord = (name) => Number(new RegExp('const ' + name + ' = (-?\\d+)').exec(coords)[1]);
const fixed = [
  ['заправка «Сосновка»', -1110 - 32, -1110 + 32],
  ['заправка «Лесная», съезд на трек, заграждения погони, съезд в лабораторию, заправка «Перекресток»', -700 - 32, -290 + 32],
  ['заправка у торгового центра', -140 - 32, -140 + 32],
  ['торговый центр', -45, 45],
  ['съезд на трек', coord('trackX') - 10, coord('trackX') + 10],
  ['съезд в лабораторию', coord('labX') - 10, coord('labX') + 10],
  ['город 1 и все дальше', 112, 600],
];

test('кривая лежит между заправками «Сосновка» и «Лесная»', () => {
  assert.ok(curve.x1 >= -1110 + 32 && curve.x2 <= -700 - 32);
});

test('на закрепленных участках трасса прямая и ровная (z = 0, высота 0)', () => {
  for (const [name, x1, x2] of fixed) {
    for (let x = x1; x <= x2; x += 1) {
      assert.equal(z(x), 0, name + ': z ≠ 0 при x = ' + x);
      assert.equal(y(x), 0, name + ': высота ≠ 0 при x = ' + x);
    }
  }
});

test('кривая начинается и кончается плавно: z = 0, высота 0, касательная горизонтальна', () => {
  for (const x of [curve.x1, curve.x2]) {
    assert.ok(Math.abs(z(x)) < 1e-9 && Math.abs(y(x)) < 1e-9);
  }
  for (const [x, dir] of [[curve.x1 + 0.5, 1], [curve.x2 - 0.5, -1]]) {
    assert.ok(Math.abs(z(x + dir * 0.5) - z(x - dir * 0.5)) < 0.01, 'у края кривая должна идти вдоль оси');
  }
});

test('радиус дуг не меньше highwayMinRadius, повороты есть в обе стороны', () => {
  let minR = Infinity;
  let zMin = 0;
  let zMax = 0;
  const h = 0.5;
  for (let x = curve.x1 + 1; x < curve.x2 - 1; x += 0.5) {
    const zp = (z(x + h) - z(x - h)) / (2 * h);
    const zpp = (z(x + h) - 2 * z(x) + z(x - h)) / (h * h);
    const k = Math.abs(zpp) / Math.pow(1 + zp * zp, 1.5);
    if (k > 0) minR = Math.min(minR, 1 / k);
    zMin = Math.min(zMin, z(x));
    zMax = Math.max(zMax, z(x));
  }
  assert.ok(minR >= hw.highwayMinRadius - 0.5, 'минимальный радиус ' + minR.toFixed(1));
  assert.ok(zMin < -8 && zMax > 8, 'S-образные повороты: отклонения ' + zMin.toFixed(1) + '…' + zMax.toFixed(1));
});

test('холмы: высота 5–6 юнитов, уклон не круче 0,12', () => {
  let top = 0;
  let steepest = 0;
  for (let x = curve.x1; x < curve.x2; x += 0.5) {
    top = Math.max(top, y(x));
    steepest = Math.max(steepest, Math.abs(y(x + 0.5) - y(x)) / 0.5);
  }
  assert.ok(top >= 5 && top <= 6, 'высота ' + top);
  assert.ok(steepest <= 0.12, 'уклон ' + steepest);
});

test('дорога уже обычной (7), но не уже 5,5; длина пути больше прямой, но ненамного', () => {
  for (let x = curve.x1 + 1; x < curve.x2; x += 5) {
    const w = 2 * hw.highwayHalfWidth(x);
    assert.ok(w >= 5.5 && w <= 7.0001, 'ширина ' + w);
  }
  const len = hw.highwayLength(curve.x1, curve.x2);
  assert.ok(len > curve.x2 - curve.x1 && len < (curve.x2 - curve.x1) * 1.1, 'длина ' + len);
});

test('index.html подключает ось и кусты трассы до world.js, внутри блока мира', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const at = (s) => index.indexOf('src/world/' + s);
  assert.ok(at('highway-path.js') > 0 && at('highway-path.js') < at('highway.js') && at('highway.js') < at('world.js'));
  assert.ok(at('highway.js') > index.indexOf('world:begin') && at('world.js') < index.indexOf('world:end'));
});
