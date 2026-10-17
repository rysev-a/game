// src/world/highway.js
// ТРАССА: сельский участок между Сосновкой и торговым центром — извилистый и холмистый. Ось, высоту и ширину дает
// src/world/highway-path.js (highwayZ, highwayY, highwayHalfWidth); здесь — меши (полотно, разметка, насыпь), высота земли для
// машины и пешехода (groundHeightAt, src/player/driving.js), зона без леса и кусты по обочинам.
//
//   buildHighway(xStart, xEnd) — уложить всю трассу (вызывает src/world/world.js вместо одной прямой roadH)
//   highwayGroundHeight(x, z)  — высота земли в точке: полотно, насыпь по краям (сходит к 0), вне трассы 0
//   highwayLengthToRiver       — длина пути от дома героя до моста, юнитов (для расчета бензина и таймеров)
//
// Кусты — упругие препятствия, точно как бочки на гоночных трассах (addObstacle … bouncy: true, src/engine/collisions.js): машина
// замедляется и отскакивает. Рисуются одним InstancedMesh. Возле заправок, съездов и торгового центра кусты не растут.

const highwayStep = 2; // шаг выборки оси по X, юнитов
const bankBase = 2.5; // насыпь по краям: ширина у земли = bankBase + bankSlope × высота полотна
const bankSlope = 3.2; // откос 1 : 3,2 — пологий, по нему можно съехать и подняться
const bushGap = 22; // у заправки кусты не растут на ее стороне в этих пределах от центра
let highwaySamples = null; // выборка оси: { x, z, y, hw, nx, nz, s } на каждом шаге
let highwayRange = null; // границы выборки по z — чтобы быстро отсеять точки вдали от кривой

function highwayBuildSamples() {
  const c = highwayCurve;
  const out = [];
  let s = 0;
  for (let x = c.x1; x <= c.x2 + 0.001; x += highwayStep) {
    const dz = (highwayZ(x + 0.25) - highwayZ(x - 0.25)) / 0.5;
    const len = Math.hypot(1, dz);
    const p = { x, z: highwayZ(x), y: highwayY(x), hw: highwayHalfWidth(x), nx: -dz / len, nz: 1 / len, s: 0 };
    if (out.length) {
      const q = out[out.length - 1];
      s += Math.hypot(p.x - q.x, p.z - q.z);
    }
    p.s = s;
    out.push(p);
  }
  return out;
}

// Положение, высота и нормаль на оси по длине пути s от начала кривой
function highwayAtArc(s) {
  const a = highwaySamples;
  let lo = 0;
  let hi = a.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (a[mid].s <= s) lo = mid;
    else hi = mid;
  }
  const p = a[lo];
  const q = a[hi];
  const t = q.s > p.s ? Math.max(0, Math.min(1, (s - p.s) / (q.s - p.s))) : 0;
  const mix = (k) => p[k] + (q[k] - p[k]) * t;
  const nl = Math.hypot(mix('nx'), mix('nz')) || 1;
  return { x: mix('x'), z: mix('z'), y: mix('y'), hw: mix('hw'), nx: mix('nx') / nl, nz: mix('nz') / nl };
}

// Высота земли в точке (x, z). Рядом с кривой ищем ближайший отрезок оси: на полотне — высота полотна, дальше от края — насыпь,
// линейно сходящая к земле; вне насыпи — 0
function highwayGroundHeight(x, z) {
  const a = highwaySamples;
  if (!a) return 0;
  const c = highwayCurve;
  if (x < c.x1 - 2 || x > c.x2 + 2 || z < highwayRange.z1 || z > highwayRange.z2) return 0;
  const i0 = Math.max(0, Math.floor((x - 40 - c.x1) / highwayStep));
  const i1 = Math.min(a.length - 2, Math.ceil((x + 40 - c.x1) / highwayStep));
  let bestD = Infinity;
  let bestY = 0;
  let bestHw = 0;
  for (let i = i0; i <= i1; i++) {
    const p = a[i];
    const q = a[i + 1];
    const dx = q.x - p.x;
    const dz = q.z - p.z;
    const t = Math.max(0, Math.min(1, ((x - p.x) * dx + (z - p.z) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - (p.x + dx * t), z - (p.z + dz * t));
    if (d < bestD) {
      bestD = d;
      bestY = p.y + (q.y - p.y) * t;
      bestHw = p.hw + (q.hw - p.hw) * t;
    }
  }
  if (bestD <= bestHw) return bestY;
  const bank = bankBase + bankSlope * bestY;
  return bestD < bestHw + bank ? bestY * (1 - (bestD - bestHw) / bank) : 0;
}

// Пуск треугольника по трем точкам (x, y, z)
const pushTri = (verts, a, b, c) => verts.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);

function buildHighway(xStart, xEnd) {
  const c = highwayCurve;
  // Прямые участки: от поселка до кривой и от кривой до конца трассы
  roadH(xStart, c.x1, 0, 'asphalt', cityCrossXs);
  roadH(c.x2, xEnd, 0, 'asphalt', cityCrossXs);

  highwaySamples = highwayBuildSamples();
  const a = highwaySamples;
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const p of a) {
    const reach = p.hw + bankBase + bankSlope * p.y + 6;
    zMin = Math.min(zMin, p.z - reach);
    zMax = Math.max(zMax, p.z + reach);
  }
  highwayRange = { z1: zMin, z2: zMax };

  // Полотно, разметка по оси и насыпь по краям
  roadBatches.bank = { color: 0x2c4f2d, verts: [] };
  const asphalt = roadBatches.asphalt.verts;
  const bank = roadBatches.bank.verts;
  const edge = (p, side, w, y) => [p.x + p.nx * side * w, y, p.z + p.nz * side * w];
  for (let i = 0; i < a.length - 1; i++) {
    const p = a[i];
    const q = a[i + 1];
    const bp = bankBase + bankSlope * p.y;
    const bq = bankBase + bankSlope * q.y;
    for (const side of [-1, 1]) {
      const r1 = edge(p, side, p.hw, p.y + 0.02);
      const r2 = edge(q, side, q.hw, q.y + 0.02);
      const b1 = edge(p, side, p.hw + bp, 0.012);
      const b2 = edge(q, side, q.hw + bq, 0.012);
      pushTri(bank, r1, b1, b2);
      pushTri(bank, r1, b2, r2);
    }
    pushTri(asphalt, edge(p, -1, p.hw, p.y + 0.02), edge(p, 1, p.hw, p.y + 0.02), edge(q, 1, q.hw, q.y + 0.02));
    pushTri(asphalt, edge(p, -1, p.hw, p.y + 0.02), edge(q, 1, q.hw, q.y + 0.02), edge(q, -1, q.hw, q.y + 0.02));
  }
  const total = a[a.length - 1].s;
  for (let s = 3; s <= total - 3; s += 6) {
    const p = highwayAtArc(s - 1.2);
    const q = highwayAtArc(s + 1.2);
    const dx = q.x - p.x;
    const dz = q.z - p.z;
    const l = Math.hypot(dx, dz) || 1;
    const nx = (-dz / l) * 0.3;
    const nz = (dx / l) * 0.3;
    const pa = [p.x - nx, p.y + 0.05, p.z - nz];
    const pb = [p.x + nx, p.y + 0.05, p.z + nz];
    const qa = [q.x - nx, q.y + 0.05, q.z - nz];
    const qb = [q.x + nx, q.y + 0.05, q.z + nz];
    pushTri(roadBatches.mark.verts, pa, pb, qb);
    pushTri(roadBatches.mark.verts, pa, qb, qa);
  }

  // На карте: кривая отрезками
  for (let i = 0; i < a.length - 1; i += 4) {
    const p = a[i];
    const q = a[Math.min(a.length - 1, i + 4)];
    mapRoads.push({ x1: p.x, z1: p.z, x2: q.x, z2: q.z, color: roadBatches.asphalt.mapColor, width: 2 * p.hw });
  }

  // Лес вдоль кривой не растет: полоса по насыпи
  for (let i = 0; i < a.length - 1; i += 8) {
    const part = a.slice(i, Math.min(a.length, i + 9));
    let z1 = Infinity;
    let z2 = -Infinity;
    for (const p of part) {
      const reach = p.hw + bankBase + bankSlope * p.y + 7;
      z1 = Math.min(z1, p.z - reach);
      z2 = Math.max(z2, p.z + reach);
    }
    clearZones.push({ x1: part[0].x - 1, x2: part[part.length - 1].x + 1, z1, z2 });
  }

  // Земля: по высоте полотна едут машины, ходит игрок (walkOnHills, src/player/player.js)
  groundHeightAt = highwayGroundHeight;
  walkOnHills = true;

  plantHighwayBushes(xStart);
}

// Длина пути от дома героя (по улице поселка и трассе) до моста — для расчета бензина и таймеров квестов
const highwayHomeX = (villageHouses.find((h) => h.mine) || { x: villageX }).x;
const highwayLengthToRiver = Math.round(18 + highwayLength(highwayHomeX, riverX));

// КУСТЫ по обеим сторонам. Каждый — упругое препятствие (как бочка на трассе) и экземпляр одного InstancedMesh; рядом, чуть дальше, —
// такие же без препятствий для густоты. Не растут: возле заправок (на их стороне), у съездов на трек и в лабораторию, у торгового
// центра, а также на других препятствиях и стоящих машинах
function plantHighwayBushes(xStart) {
  const gaps = []; // { x, side, half }: side −1 — северная сторона (z < 0), +1 — южная, 0 — обе
  for (const g of typeof gasStations !== 'undefined' ? gasStations : []) {
    if (Math.abs(g.z) < 20) gaps.push({ x: g.x, side: Math.cos(g.rot) > 0 ? -1 : 1, half: bushGap });
  }
  for (const x of [trackX, labX]) gaps.push({ x, side: 1, half: 10 });
  gaps.push({ x: 0, side: -1, half: shopW / 2 + 8 }); // парковка торгового центра
  for (let i = 0; i < 5; i++) gaps.push({ x: -600 + i * 70, side: 0, half: 5.5 }); // заграждения погони (src/content/world.js, chase_b1…5; места chase.b* в src/quests/places.js)
  const blocked = (x, z, side) => {
    if (gaps.some((g) => (g.side === side || g.side === 0) && Math.abs(x - g.x) < g.half)) return true;
    if (obstacleShapes.some((s) => !s.bouncy && Math.abs(s.x - x) < s.hu + 1.4 && Math.abs(s.z - z) < s.hv + 1.4)) return true;
    return cars.some((car) => Math.hypot(car.x - x, car.z - z) < 4.5);
  };

  const endX = cityXs[0] - cityEdge - 30; // кусты кончаются перед первым городом (у въезда — место происшествия city.inc1, x ≈ 112)
  const list = []; // { x, y, z, s, v, r, c }
  const greens = [0x3f7a35, 0x4f8a3a, 0x356b30, 0x5c9a42, 0x2f5f2e];
  for (const side of [-1, 1]) {
    for (let x = xStart + 2; x < endX; ) {
      const zc = highwayZ(x);
      const dz = (highwayZ(x + 0.25) - highwayZ(x - 0.25)) / 0.5;
      const len = Math.hypot(1, dz);
      const hw = highwayHalfWidth(x);
      const s = rand(0.75, 1.45);
      const lateral = hw + 1.0 + s * 0.9 + rand(0, 0.8);
      const bx = x + ((-dz / len) * side * lateral);
      const bz = zc + ((1 / len) * side * lateral);
      if (bx < endX && !blocked(bx, bz, side)) {
        list.push({ x: bx, z: bz, y: highwayGroundHeight(bx, bz), s, v: rand(0.6, 1.3), r: rand(0, 6.3), c: greens[Math.floor(rand(0, greens.length))], solid: true });
        // Второй ряд — чуть дальше от дороги, для густоты (без препятствий; в машину не попадает)
        if (Math.random() < 0.55) {
          const l2 = lateral + rand(2.2, 3.4);
          const cx = x + ((-dz / len) * side * l2) + rand(-1, 1);
          const cz = zc + ((1 / len) * side * l2);
          if (!blocked(cx, cz, side)) {
            list.push({ x: cx, z: cz, y: highwayGroundHeight(cx, cz), s: rand(0.8, 1.6), v: rand(0.7, 1.5), r: rand(0, 6.3), c: greens[Math.floor(rand(0, greens.length))], solid: false });
          }
        }
      }
      x += rand(4, 6) / len; // шаг ~4–6 юнитов по дороге
    }
  }

  const geo = new THREE.IcosahedronGeometry(1, 0);
  geo.scale(1, 0.75, 1);
  geo.translate(0, 0.45, 0);
  const mesh = new THREE.InstancedMesh(geo, new LitMaterial({ color: 0xffffff }), list.length);
  const m4 = new THREE.Matrix4();
  const tint = new THREE.Color();
  list.forEach((b, i) => {
    m4.makeRotationY(b.r).scale(new THREE.Vector3(b.s, b.s * b.v, b.s)).setPosition(b.x, b.y, b.z);
    mesh.setMatrixAt(i, m4);
    mesh.setColorAt(i, tint.setHex(b.c));
    if (b.solid) addObstacle({ x: b.x, z: b.z, hx: 0.8 * b.s, hz: 0.8 * b.s, bouncy: true });
  });
  mesh.frustumCulled = false; // bounding sphere у InstancedMesh не учитывает инстансы
  cityGroup.add(mesh);
}
