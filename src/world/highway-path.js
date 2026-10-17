// src/world/highway-path.js
// ОСЬ ТРАССЫ. Трасса идет вдоль оси X (z = 0), и почти вся геометрия мира привязана к этой прямой: заправки, съезды на трек и в
// лабораторию, торговый центр, заграждения погони, города. Единственный участок, где она уходит с прямой — «сельский» между
// Сосновкой и торговым центром: S-образные повороты (радиус не меньше highwayMinRadius) и два холма (уклон до ~0,1), дорога уже обычной.
// Здесь только математика (без сцены), чтобы ее проверял тест (tests/highway.test.js); меши, кусты и высота земли — src/world/highway.js.
//
//   highwayZ(x)          — z оси трассы при данном x (0 на прямых участках)
//   highwayY(x)          — высота полотна
//   highwayHalfWidth(x)  — половина ширины полотна
//   highwayLength(xa, xb) — длина пути по оси между x = xa и x = xb (по горизонтали)
//
// Закреплены прямые ровные участки (z = 0, высота 0): заправки −1110, −700, −290, −140 (±32), торговый центр (±45), съезды на
// трек (−620) и в лабораторию (−330), заграждения погони −600…−320, город 1 (x ≥ 130). Кривая лежит между x = −1076 и −736.

const highwayCurve = {
  x1: -1076, // начало кривой (к востоку от заправки «Сосновка»)
  x2: -736, // конец (к западу от заправки «Лесная»)
  amp: 15.3, // размах поворотов, юнитов: при нем радиус на самых крутых дугах ≈ highwayMinRadius
  waves: 2, // полных S-образных волн на участке
  hills: [
    { x1: -1076, x2: -906, h: 5.8 },
    { x1: -906, x2: -736, h: 4.4 },
  ],
  halfWidth: 3.5, // у входа и выхода: обычная ширина дороги (roadWidth / 2)
  narrow: 0.5, // посередине дорога уже на столько с каждой стороны
};
const highwayMinRadius = 45; // меньше радиус дуги быть не должен

// Доля пути по кривой: 0 в начале, 1 в конце; вне кривой — null
function highwayU(x) {
  const c = highwayCurve;
  if (x <= c.x1 || x >= c.x2) return null;
  return (x - c.x1) / (c.x2 - c.x1);
}

function highwayZ(x) {
  const u = highwayU(x);
  if (u === null) return 0;
  const c = highwayCurve;
  const s = Math.sin(Math.PI * u);
  return c.amp * s * s * Math.sin(2 * Math.PI * c.waves * u);
}

function highwayY(x) {
  for (const hill of highwayCurve.hills) {
    if (x > hill.x1 && x < hill.x2) {
      const s = Math.sin((Math.PI * (x - hill.x1)) / (hill.x2 - hill.x1));
      return hill.h * s * s;
    }
  }
  return 0;
}

function highwayHalfWidth(x) {
  const u = highwayU(x);
  const c = highwayCurve;
  if (u === null) return c.halfWidth;
  const s = Math.sin(Math.PI * u);
  return c.halfWidth - c.narrow * s * s;
}

// Длина пути по оси между x = xa и x = xb: интеграл по маленьким шагам
function highwayLength(xa, xb) {
  const step = 0.5;
  let len = 0;
  for (let x = xa; x < xb; x += step) {
    const x2 = Math.min(xb, x + step);
    len += Math.hypot(x2 - x, highwayZ(x2) - highwayZ(x));
  }
  return len;
}
