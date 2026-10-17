// src/world/highway.js
// ТРАССА: сельские участки между Сосновкой и торговым центром — извилистые и холмистые. Ось, высоту и ширину дает
// src/world/highway-path.js (highwayZ, highwayY, highwayHalfWidth, highwaySections); здесь — меши (полотно, разметка, насыпь), высота
// земли для машины и пешехода (groundHeightAt, src/player/driving.js), зона без леса и кусты по обочинам.
//
//   buildHighway(xStart, xEnd) — уложить всю трассу (вызывает src/world/world.js вместо одной прямой roadH)
//   highwayGroundHeight(x, z)  — высота земли в точке: полотно, насыпь по краям (сходит к 0), вне трассы 0
//   highwayLengthToRiver       — длина пути от дома героя до моста, юнитов (для расчета бензина и таймеров)
//
// Кусты — упругие препятствия, точно как бочки на гоночных трассах (addObstacle … bouncy: true, src/engine/collisions.js): машина
// замедляется и отскакивает. Рисуются одним InstancedMesh. Возле заправок, съездов, дорог к городам, торгового центра и
// заграждений погони кусты не растут.

const bankBase = 2.5; // насыпь по краям: ширина у земли = bankBase + bankSlope × высота полотна
const bankSlope = 3.2; // откос 1 : 3,2 — пологий, по нему можно съехать и подняться
const bushGap = 22; // у заправки кусты не растут на ее стороне в этих пределах от центра
let highwaySamples = null; // выборка оси по участкам: [{ sec, pts: [{ x, z, y, hw, nx, nz, s }], z1, z2 }]

// Выборка оси через ~2,5 юнита пути: положение, высота, ширина и нормаль (в сторону +z)
function highwayBuildSamples() {
  return highwaySections.map((sec) => {
    const pts = [];
    sec.pts.forEach((p, i) => {
      if (i % 5 && i !== sec.pts.length - 1) return;
      pts.push({ x: p.x, z: p.z, y: highwayY(p.x), hw: highwayHalfWidth(p.x), nx: -Math.sin(p.th), nz: Math.cos(p.th), s: p.s });
    });
    let zMin = Infinity;
    let zMax = -Infinity;
    for (const p of pts) {
      const reach = p.hw + bankBase + bankSlope * p.y + 6;
      zMin = Math.min(zMin, p.z - reach);
      zMax = Math.max(zMax, p.z + reach);
    }
    return { sec, pts, z1: zMin, z2: zMax };
  });
}

// Высота земли в точке (x, z). Рядом с кривой ищем ближайший отрезок оси: на полотне — высота полотна, дальше от края — насыпь,
// линейно сходящая к земле; вне насыпи — 0
function highwayGroundHeight(x, z) {
  if (!highwaySamples) return 0;
  for (const part of highwaySamples) {
    if (x < part.sec.x1 - 30 || x > part.sec.x2 + 30 || z < part.z1 || z > part.z2) continue;
    const a = part.pts;
    // Окно по X: ось не уходит от точки по X дальше, чем на 40
    let i0 = 0;
    let i1 = a.length - 2;
    while (i0 < i1 && a[i0 + 1].x < x - 40) i0++;
    while (i1 > i0 && a[i1].x > x + 40) i1--;
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
    if (bestD < bestHw + bank) return bestY * (1 - (bestD - bestHw) / bank);
  }
  return 0;
}

// Пуск треугольника по трем точкам (x, y, z)
const pushTri = (verts, a, b, c) => verts.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);

function buildHighway(xStart, xEnd) {
  // Прямые участки: между кривыми, от поселка до первой и от последней до конца трассы; вдоль них лес не растет
  let from = xStart;
  for (const sec of highwaySections) {
    roadH(from, sec.x1, 0, 'asphalt', cityCrossXs);
    clearZones.push({ x1: from, x2: sec.x1, z1: -9, z2: 9 });
    from = sec.x2;
  }
  roadH(from, xEnd, 0, 'asphalt', cityCrossXs);
  clearZones.push({ x1: from, x2: worldBounds.maxX, z1: -9, z2: 9 });
  clearZones.push({ x1: worldBounds.minX, x2: xStart, z1: -9, z2: 9 });

  highwaySamples = highwayBuildSamples();

  // Полотно, разметка по оси и насыпь по краям
  roadBatches.bank = { color: 0x2c4f2d, verts: [] };
  const asphalt = roadBatches.asphalt.verts;
  const bank = roadBatches.bank.verts;
  const edge = (p, side, w, y) => [p.x + p.nx * side * w, y, p.z + p.nz * side * w];
  for (const part of highwaySamples) {
    const a = part.pts;
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
    // Пунктир по оси — по длине пути, без разметки на перекрестках (дорога к городам входит в трассу)
    const at = (s) => {
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
      return { x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t, y: p.y + (q.y - p.y) * t };
    };
    const total = a[a.length - 1].s;
    for (let s = 3; s <= total - 3; s += 6) {
      const p = at(s - 1.2);
      const q = at(s + 1.2);
      if (cityCrossXs.some((c) => Math.abs((p.x + q.x) / 2 - c) < highwayHalf + 2)) continue;
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
    // Лес вдоль кривой не растет: полосы по насыпи
    for (let i = 0; i < a.length - 1; i += 6) {
      const seg = a.slice(i, Math.min(a.length, i + 7));
      let x1 = Infinity;
      let x2 = -Infinity;
      let z1 = Infinity;
      let z2 = -Infinity;
      for (const p of seg) {
        const reach = p.hw + bankBase + bankSlope * p.y + 7;
        x1 = Math.min(x1, p.x - reach);
        x2 = Math.max(x2, p.x + reach);
        z1 = Math.min(z1, p.z - reach);
        z2 = Math.max(z2, p.z + reach);
      }
      clearZones.push({ x1, x2, z1, z2 });
    }
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
// такие же без препятствий для густоты. Не растут: возле заправок (на их стороне), у съездов на трек и в лабораторию, у дорог к
// городам, у торгового центра и заграждений погони, а также на других препятствиях и стоящих машинах
function plantHighwayBushes(xStart) {
  const gaps = []; // { x, side, half }: side −1 — северная сторона (z < 0), +1 — южная, 0 — обе
  for (const g of typeof gasStations !== 'undefined' ? gasStations : []) {
    if (Math.abs(g.z) < 20) gaps.push({ x: g.x, side: Math.cos(g.rot) > 0 ? -1 : 1, half: bushGap });
  }
  for (const x of [trackX, labX]) gaps.push({ x, side: 1, half: 10 });
  for (const c of cities) if (c.z !== 0) gaps.push({ x: c.x + cityStep / 2, side: 0, half: 9 }); // дороги к городам 3–6
  gaps.push({ x: 0, side: -1, half: shopW / 2 + 8 }); // парковка торгового центра
  for (const x of highwayChaseXs) gaps.push({ x, side: 0, half: 6 }); // заграждения погони (src/content/world.js, chase_b1…5)
  const blocked = (x, z, side) => {
    if (gaps.some((g) => (g.side === side || g.side === 0) && Math.abs(x - g.x) < g.half)) return true;
    if (obstacleShapes.some((s) => !s.bouncy && Math.abs(s.x - x) < s.hu + 1.4 && Math.abs(s.z - z) < s.hv + 1.4)) return true;
    return cars.some((car) => Math.hypot(car.x - x, car.z - z) < 4.5);
  };

  const endX = cityXs[0] - cityEdge - 30; // кусты кончаются перед первым городом (у въезда — место происшествия city.inc1, x ≈ 112)
  const list = []; // { x, y, z, s, v, r, c, solid }
  const greens = [0x3f7a35, 0x4f8a3a, 0x356b30, 0x5c9a42, 0x2f5f2e];
  for (const side of [-1, 1]) {
    for (let x = xStart + 2; x < endX; ) {
      const zc = highwayZ(x);
      const dz = highwayZ(x + 0.5) - highwayZ(x - 0.5);
      const len = Math.hypot(1, dz);
      const hw = highwayHalfWidth(x);
      const s = rand(0.75, 1.45);
      const lateral = hw + 1.0 + s * 0.9 + rand(0, 0.8);
      const bx = x + (-dz / len) * side * lateral;
      const bz = zc + (1 / len) * side * lateral;
      if (bx < endX && !blocked(bx, bz, side)) {
        list.push({ x: bx, z: bz, y: highwayGroundHeight(bx, bz), s, v: rand(0.6, 1.3), r: rand(0, 6.3), c: greens[Math.floor(rand(0, greens.length))], solid: true });
        // Второй ряд — чуть дальше от дороги, для густоты (без препятствий; в машину не попадает)
        if (Math.random() < 0.55) {
          const l2 = lateral + rand(2.2, 3.4);
          const cx = x + (-dz / len) * side * l2 + rand(-1, 1);
          const cz = zc + (1 / len) * side * l2;
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
