// src/engine/collisions.js
// СТОЛКНОВЕНИЯ. Все тела — повернутые прямоугольники (OBB) на плоскости XZ:
// центр, две оси (u, v) и полуразмеры вдоль них (hu, hv).
// Здания — прямоугольники вдоль осей мира, машины — повернуты по курсу.
// Машины пересекаются по теореме о разделяющей оси (SAT); пешеходы — круги.

const treeCell = 8;
const treeGrid = new Map(); // ячейка → деревья, для быстрых столкновений

// Дерево как препятствие (ствол): для деревьев, которые рисует не лес, а сама локация.
// Лес складывает свои деревья в тот же treeGrid
function addTreeCollider(x, z, s) {
  const key = Math.floor(x / treeCell) + ',' + Math.floor(z / treeCell);
  if (!treeGrid.has(key)) treeGrid.set(key, []);
  treeGrid.get(key).push({ x, z, s });
}

// Все непроходимые объекты вне зданий. Добавлять можно в любой момент (и убирать — splice)
const obstacleShapes = [];
function addObstacle(o) {
  obstacles.push(o);
  const shape = { x: o.x, z: o.z, ux: 1, uz: 0, vx: 0, vz: 1, hu: o.hx, hv: o.hz };
  obstacleShapes.push(shape);
  return shape;
}

// half — полуразмеры кузова (у каждой машины свои: car.half; по умолчанию — обычная легковушка)
function carShape(x, z, heading, half = carHalf) {
  const cs = Math.cos(heading);
  const sn = Math.sin(heading);
  // u — вправо от машины, v — вперед
  return { x, z, ux: cs, uz: -sn, vx: -sn, vz: -cs, hu: half.w, hv: half.l };
}

function shapesOverlap(a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  if (Math.abs(dx) > 25 || Math.abs(dz) > 25) return false; // слишком далеко
  for (const [ax, az] of [[a.ux, a.uz], [a.vx, a.vz], [b.ux, b.uz], [b.vx, b.vz]]) {
    const dist = Math.abs(dx * ax + dz * az);
    const ra = a.hu * Math.abs(a.ux * ax + a.uz * az) + a.hv * Math.abs(a.vx * ax + a.vz * az);
    const rb = b.hu * Math.abs(b.ux * ax + b.uz * az) + b.hv * Math.abs(b.vx * ax + b.vz * az);
    if (dist >= ra + rb) return false;
  }
  return true;
}

// Деревья рядом с точкой (x, z): из сетки ячеек 3×3
function nearbyTrees(x, z) {
  const out = [];
  const cx = Math.floor(x / treeCell);
  const cz = Math.floor(z / treeCell);
  for (let i = cx - 1; i <= cx + 1; i++) {
    for (let j = cz - 1; j <= cz + 1; j++) {
      const cell = treeGrid.get(i + ',' + j);
      if (cell) out.push(...cell);
    }
  }
  return out;
}

// Круг (cx, cz, r) касается машины-прямоугольника
function circleHitsShape(cx, cz, r, s) {
  const lu = (cx - s.x) * s.ux + (cz - s.z) * s.uz;
  const lv = (cx - s.x) * s.vx + (cz - s.z) * s.vz;
  return Math.abs(lu) < s.hu + r && Math.abs(lv) < s.hv + r;
}

// Кузов целиком внутри границы мира (забора)?
function insideWorld(s) {
  const ex = s.hu * Math.abs(s.ux) + s.hv * Math.abs(s.vx);
  const ez = s.hu * Math.abs(s.uz) + s.hv * Math.abs(s.vz);
  const m = 0.5; // столбы и перекладины
  // Мир круглый: все четыре угла описанного прямоугольника кузова должны быть внутри круга
  return (
    insideWorldCircle(s.x - ex, s.z - ez, m) &&
    insideWorldCircle(s.x + ex, s.z - ez, m) &&
    insideWorldCircle(s.x - ex, s.z + ez, m) &&
    insideWorldCircle(s.x + ex, s.z + ez, m)
  );
}

// Можно ли поставить машину car в позу (x, z, heading). Препятствия, с которыми
// она уже пересекается (например, при спавне), игнорируем — иначе не выехать
function carFree(car, x, z, heading) {
  const now = carShape(car.x, car.z, car.heading, car.half);
  const next = carShape(x, z, heading, car.half);
  if (!insideWorld(next) && insideWorld(now)) return false;
  for (const t of nearbyTrees(x, z)) {
    const r = 0.45 * t.s;
    if (circleHitsShape(t.x, t.z, r, next) && !circleHitsShape(t.x, t.z, r, now)) return false;
  }
  for (const n of npcs) {
    if (n.helping) continue; // помощник толкает эту машину и ей не мешает
    if (circleHitsShape(n.x, n.z, 0.45, next) && !circleHitsShape(n.x, n.z, 0.45, now)) return false;
  }
  for (const s of obstacleShapes) {
    if (car.crush && s.creature === 'bio') continue; // БТР наезжает на биосущество (давит его, src/player/driving.js)
    if (shapesOverlap(next, s) && !shapesOverlap(now, s)) return false;
  }
  for (const o of cars) {
    if (o === car) continue;
    const os = carShape(o.x, o.z, o.heading, o.half);
    if (shapesOverlap(next, os) && !shapesOverlap(now, os)) return false;
  }
  return true;
}

// Пешеход — круг радиусом r: можно ли стоять в точке (x, z) на улице (границы мира, деревья, люди, здания, машины)
function blockedOutside(x, z, r = 0.45) {
  const m = 0.5 + r; // граница мира: забор
  if (!insideWorldCircle(x, z, m)) return true;
  for (const t of nearbyTrees(x, z)) {
    if (Math.hypot(x - t.x, z - t.z) < r + 0.4 * t.s) return true;
  }
  for (const n of npcs) {
    if (n.helping) continue;
    if (Math.hypot(x - n.x, z - n.z) < r + 0.45) return true;
  }
  for (const s of obstacleShapes) {
    if (Math.abs(x - s.x) < s.hu + r && Math.abs(z - s.z) < s.hv + r) return true;
  }
  for (const c of cars) {
    const s = carShape(c.x, c.z, c.heading, c.half);
    const lu = (x - s.x) * s.ux + (z - s.z) * s.uz;
    const lv = (x - s.x) * s.vx + (z - s.z) * s.vz;
    if (Math.abs(lu) < s.hu + r && Math.abs(lv) < s.hv + r) return true;
  }
  return false;
}
