// src/world/highway.js
// ТРАССА: сельская дорога от поселка до первого города. Ось, высоту и ширину дает src/world/highway-path.js (highwayZ, highwayY,
// highwayHalfWidth, highwayVerge, highwaySections); здесь — меши, высота земли для машины и пешехода (groundHeightAt,
// src/player/driving.js), зона без леса и кусты по обочинам.
//
//   buildHighway(xStart, xEnd) — уложить всю трассу (вызывает src/world/world.js вместо одной прямой roadH)
//   highwayGroundHeight(x, z)  — высота земли в точке: полотно, обочина, насыпь по краям (сходит к 0), вне трассы 0
//   highwayLengthToRiver       — длина пути от дома героя до моста, юнитов (для расчета бензина и таймеров)
//
// ВИД. Не городской асфальт: потертое светло-серо-бурое полотно, колея в две полосы, пара светлых заплаток, пятна гравия, грунтовая
// обочина и трава по краям, осевая — бледная и редкая. Все это плоские цветные пятна в тех же общих мешах, что и остальные дороги
// (roadBatches, src/world/roads.js): лишних draw call нет. Кривая и прямые между кривыми (у заправок и съездов) оформлены одинаково;
// у города (ruralEnd) начинается обычный городской асфальт.
//
// Кусты — упругие препятствия, точно как бочки на гоночных трассах (addObstacle … bouncy: true, src/engine/collisions.js): машина
// замедляется и отскакивает. Стоят за обочиной, на краю полотна с запасом: по полотну можно ехать и входить в поворот заносом, не
// задевая их. Рисуются одним InstancedMesh. Возле заправок, съездов, дорог к городам, торгового центра и заграждений погони не растут.

const bankBase = 2.5; // насыпь по краям: ширина у земли = bankBase + bankSlope × высота полотна
const bankSlope = 3.2; // откос 1 : 3,2 — пологий, по нему можно съехать и подняться
const bushGap = 22; // у заправки кусты не растут на ее стороне в этих пределах от центра
let highwaySamples = null; // выборка оси по кривым участкам: [{ sec, pts: [{ x, z, y, hw, sh, nx, nz, s }], z1, z2 }]

// Выборка оси через ~2,5 юнита пути: положение, высота, ширина полотна и обочины, нормаль (в сторону +z)
function highwayBuildSamples() {
  return highwaySections.map((sec) => {
    const pts = [];
    sec.pts.forEach((p, i) => {
      if (i % 5 && i !== sec.pts.length - 1) return;
      pts.push({ x: p.x, z: p.z, y: highwayY(p.x), hw: highwayHalfWidth(p.x), sh: highwayVerge(p.x), nx: -Math.sin(p.th), nz: Math.cos(p.th), s: p.s });
    });
    let zMin = Infinity;
    let zMax = -Infinity;
    for (const p of pts) {
      const reach = p.hw + p.sh + bankBase + bankSlope * p.y + 6;
      zMin = Math.min(zMin, p.z - reach);
      zMax = Math.max(zMax, p.z + reach);
    }
    return { sec, pts, z1: zMin, z2: zMax };
  });
}

// Высота земли в точке (x, z). Рядом с кривой ищем ближайший отрезок оси: на полотне и обочине — высота полотна, дальше от края —
// насыпь, линейно сходящая к земле; вне насыпи — 0
function highwayGroundHeight(x, z) {
  if (!highwaySamples) return 0;
  for (const part of highwaySamples) {
    if (x < part.sec.x1 - 50 || x > part.sec.x2 + 50 || z < part.z1 || z > part.z2) continue;
    const a = part.pts;
    // Окно по X: ось не уходит от точки по X дальше, чем на 50
    let i0 = 0;
    let i1 = a.length - 2;
    while (i0 < i1 && a[i0 + 1].x < x - 50) i0++;
    while (i1 > i0 && a[i1].x > x + 50) i1--;
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
        bestHw = p.hw + p.sh + (q.hw + q.sh - p.hw - p.sh) * t;
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

// Цвета сельской дороги (просто в духе деревни, общих токенов нет)
const ruralColors = {
  rural: 0x7b776d, // потертое светло-серо-бурое полотно
  shoulder: 0x7a6446, // грунтовая обочина
  rut: 0x68645b, // колея
  patch: 0x93907f, // светлая заплатка
  gravelDark: 0x58544c,
  gravelLight: 0xa39d8b,
  paleMark: 0xc2bba0, // бледная осевая
  bank: 0x2c4f2d, // трава на насыпи
};

function buildHighway(xStart, xEnd) {
  const ruralEnd = cityXs[0] - cityEdge - 18; // здесь начинается городской асфальт (город 1, x ≥ 130)
  // Части трассы по порядку: прямые между кривыми и сами кривые
  highwaySamples = highwayBuildSamples();
  const parts = [];
  let from = xStart;
  const straight = (a, b) => {
    const pts = [];
    for (let x = a; x < b; x += 5) pts.push({ x, z: 0, y: 0, hw: highwayHalf, sh: 0, nx: 0, nz: 1, s: x - a });
    pts.push({ x: b, z: 0, y: 0, hw: highwayHalf, sh: 0, nx: 0, nz: 1, s: b - a });
    parts.push({ pts, curved: false });
    clearZones.push({ x1: a, x2: b, z1: -9, z2: 9 }); // вдоль прямой лес не растет
  };
  highwaySamples.forEach((part) => {
    straight(from, part.sec.x1);
    parts.push({ pts: part.pts, curved: true });
    from = part.sec.x2;
  });
  straight(from, ruralEnd);
  roadH(ruralEnd, xEnd, 0, 'asphalt', cityCrossXs); // дальше — город
  clearZones.push({ x1: ruralEnd, x2: worldBounds.maxX, z1: -9, z2: 9 });
  clearZones.push({ x1: worldBounds.minX, x2: xStart, z1: -9, z2: 9 });

  for (const name of ['rural', 'shoulder', 'rut', 'patch', 'gravelDark', 'gravelLight', 'paleMark', 'bank']) {
    roadBatches[name] = { color: ruralColors[name], mapColor: name === 'rural' ? '#7b776d' : undefined, verts: [] };
  }
  const V = (name) => roadBatches[name].verts;
  const edge = (p, lat, y) => [p.x + p.nx * lat, y, p.z + p.nz * lat];
  const rnd = (a, b) => a + Math.random() * (b - a);

  for (const part of parts) {
    const a = part.pts;
    // Положение, высота, ширина и нормаль в точке пути s (по выборке)
    const frame = (s) => {
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
      return { x: mix('x'), z: mix('z'), y: mix('y'), hw: mix('hw'), sh: mix('sh'), nx: mix('nx') / nl, nz: mix('nz') / nl };
    };
    // Плоское пятно: вдоль пути от s0 до s1, поперек от l0 до l1, чуть выше полотна на off
    const patchQuad = (name, s0, s1, l0, l1, off) => {
      const f0 = frame(s0);
      const f1 = frame(s1);
      const c = (f, l) => [f.x + f.nx * l, f.y + off, f.z + f.nz * l];
      pushTri(V(name), c(f0, l0), c(f0, l1), c(f1, l1));
      pushTri(V(name), c(f0, l0), c(f1, l1), c(f1, l0));
    };

    for (let i = 0; i < a.length - 1; i++) {
      const p = a[i];
      const q = a[i + 1];
      const road = V('rural');
      pushTri(road, edge(p, -p.hw, p.y + 0.02), edge(p, p.hw, p.y + 0.02), edge(q, q.hw, q.y + 0.02));
      pushTri(road, edge(p, -p.hw, p.y + 0.02), edge(q, q.hw, q.y + 0.02), edge(q, -q.hw, q.y + 0.02));
      // Колея: две полосы, в каждой два следа колес
      for (const lane of [-1, 1]) {
        for (const wheel of [-0.85, 0.85]) {
          const lp = lane * p.hw * 0.5 + wheel;
          const lq = lane * q.hw * 0.5 + wheel;
          pushTri(V('rut'), edge(p, lp - 0.22, p.y + 0.03), edge(p, lp + 0.22, p.y + 0.03), edge(q, lq + 0.22, q.y + 0.03));
          pushTri(V('rut'), edge(p, lp - 0.22, p.y + 0.03), edge(q, lq + 0.22, q.y + 0.03), edge(q, lq - 0.22, q.y + 0.03));
        }
      }
      if (!part.curved) continue;
      // Обочина и насыпь по краям
      const bp = bankBase + bankSlope * p.y;
      const bq = bankBase + bankSlope * q.y;
      for (const side of [-1, 1]) {
        const r1 = edge(p, side * p.hw, p.y + 0.018);
        const r2 = edge(q, side * q.hw, q.y + 0.018);
        const s1 = edge(p, side * (p.hw + p.sh), p.y + 0.018);
        const s2 = edge(q, side * (q.hw + q.sh), q.y + 0.018);
        const b1 = edge(p, side * (p.hw + p.sh + bp), 0.012);
        const b2 = edge(q, side * (q.hw + q.sh + bq), 0.012);
        pushTri(V('shoulder'), r1, s1, s2);
        pushTri(V('shoulder'), r1, s2, r2);
        pushTri(V('bank'), s1, b1, b2);
        pushTri(V('bank'), s1, b2, s2);
      }
    }

    const total = a[a.length - 1].s;
    // Бледная осевая: короткие редкие штрихи; на перекрестках с дорогами к городам ее нет
    for (let s = 4; s <= total - 4; s += 13) {
      const f = frame(s);
      if (cityCrossXs.some((c) => Math.abs(f.x - c) < f.hw + 3)) continue;
      patchQuad('paleMark', s - 1.1, s + 1.1, -0.12, 0.12, 0.05);
    }
    // Две-три светлые заплатки на каждые ~100 юнитов
    for (let s = rnd(15, 40); s < total - 6; s += rnd(45, 95)) {
      const f = frame(s);
      const lat = rnd(-0.5, 0.5) * f.hw;
      const len = rnd(2.5, 5);
      const wid = rnd(0.8, 1.4);
      patchQuad('patch', s, s + len, lat - wid, lat + wid, 0.036);
    }
    // Пятна гравия на обочине (и редкие на самом полотне): мелкие темные и светлые
    for (let s = 1; s < total - 1; s += 2.2) {
      const f = frame(s);
      for (const side of [-1, 1]) {
        const onRoad = Math.random() < 0.22;
        if (!onRoad && Math.random() > 0.75) continue;
        const lat = onRoad ? rnd(-f.hw, f.hw) : side * (f.hw + rnd(-0.5, Math.max(0.6, f.sh + 0.3)));
        const half = rnd(0.15, 0.45);
        patchQuad(Math.random() < 0.55 ? 'gravelDark' : 'gravelLight', s - half, s + half, lat - half, lat + half, 0.04);
      }
    }
    // На карте
    if (part.curved) {
      for (let i = 0; i < a.length - 1; i += 4) {
        const p = a[i];
        const q = a[Math.min(a.length - 1, i + 4)];
        mapRoads.push({ x1: p.x, z1: p.z, x2: q.x, z2: q.z, color: roadBatches.rural.mapColor, width: 2 * p.hw });
      }
    } else {
      mapRoads.push({ x1: a[0].x, z1: 0, x2: a[a.length - 1].x, z2: 0, color: roadBatches.rural.mapColor, width: 2 * highwayHalf });
    }
    // Лес вдоль кривой не растет: полосы по насыпи
    if (!part.curved) continue;
    for (let i = 0; i < a.length - 1; i += 6) {
      const seg = a.slice(i, Math.min(a.length, i + 7));
      let x1 = Infinity;
      let x2 = -Infinity;
      let z1 = Infinity;
      let z2 = -Infinity;
      for (const p of seg) {
        const reach = p.hw + p.sh + bankBase + bankSlope * p.y + 7;
        x1 = Math.min(x1, p.x - reach);
        x2 = Math.max(x2, p.x + reach);
        z1 = Math.min(z1, p.z - reach);
        z2 = Math.max(z2, p.z + reach);
      }
      clearZones.push({ x1, x2, z1, z2 });
    }
  }

  // Земля: по высоте полотна едут машины, ходит игрок (walkOnHills, src/player/player.js)
  groundHeightAt = (x, z) => groundExtraHeight(x, z, highwayGroundHeight(x, z));
  walkOnHills = true;

  plantHighwayBushes(xStart, ruralEnd);
}

// Длина пути от дома героя (по улице поселка и трассе) до моста — для расчета бензина и таймеров квестов
const highwayHomeX = (villageHouses.find((h) => h.mine) || { x: villageX }).x;
const highwayLengthToRiver = Math.round(18 + highwayLength(highwayHomeX, riverX));

// КУСТЫ по обеим сторонам. Каждый — упругое препятствие (как бочка на трассе) и экземпляр одного InstancedMesh; рядом, чуть дальше, —
// такие же без препятствий для густоты. Стоят за обочиной: ближний край куста — в 0,4 от обочины. Не растут: возле заправок (на их
// стороне), у съездов на трек и в лабораторию, у дорог к городам, у торгового центра и заграждений погони, а также на других
// препятствиях и стоящих машинах
function plantHighwayBushes(xStart, ruralEnd) {
  const gaps = []; // { x, side, half }: side −1 — северная сторона (z < 0), +1 — южная, 0 — обе
  for (const g of typeof gasStations !== 'undefined' ? gasStations : []) {
    if (Math.abs(g.z) < 20) gaps.push({ x: g.x, side: Math.cos(g.rot) > 0 ? -1 : 1, half: bushGap });
  }
  for (const x of [trackX, labX]) gaps.push({ x, side: 1, half: 10 });
  for (const c of cities) if (c.z !== 0) gaps.push({ x: c.x + cityStep / 2, side: 0, half: 12 }); // дороги к городам 3–6
  gaps.push({ x: 0, side: -1, half: shopW / 2 + 8 }); // парковка торгового центра
  for (const x of highwayChaseXs) gaps.push({ x, side: 0, half: 8 }); // заграждения погони (src/content/world.js, chase_b1…5)
  const blocked = (x, z, side) => {
    if (gaps.some((g) => (g.side === side || g.side === 0) && Math.abs(x - g.x) < g.half)) return true;
    if (obstacleShapes.some((s) => !s.bouncy && Math.abs(s.x - x) < s.hu + 1.4 && Math.abs(s.z - z) < s.hv + 1.4)) return true;
    return cars.some((car) => Math.hypot(car.x - x, car.z - z) < 4.5);
  };

  const endX = ruralEnd - 12; // кусты кончаются перед городом (у въезда — место происшествия city.inc1, x ≈ 112)
  const list = []; // { x, y, z, s, v, r, c, solid }
  const greens = [0x3f7a35, 0x4f8a3a, 0x356b30, 0x5c9a42, 0x2f5f2e];
  for (const side of [-1, 1]) {
    for (let x = xStart + 2; x < endX; ) {
      const zc = highwayZ(x);
      const dz = highwayZ(x + 0.5) - highwayZ(x - 0.5);
      const len = Math.hypot(1, dz);
      const edgeW = Math.max(highwayHalfWidth(x) + highwayVerge(x), highwayHalf + highwayShoulder); // край полотна с обочиной (на прямых — условная обочина)
      const s = rand(0.75, 1.45);
      const lateral = edgeW + 0.4 + s * 0.8 + rand(0, 0.8);
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
