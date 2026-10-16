// src/demo/race.js
// ДЕМО: АВТОДРОМ (docs/mechanics/demo.md#автодром). Западнее площадки, за ее краем, — большой автодром из пяти
// разных трасс с широким полотном (18 юнитов). Трассы соединены подъездами с продольной дорогой вдоль края
// площадки, она выходит на дорогу ДЕМО. У этой дороги — стоянка с четырьмя машинами разных видов
// (VEHICLE_KINDS, src/world/vehicles.js): болид, джип, трактор и БТР, а севернее — гоночный парк из шести
// машин с разными разгоном, заносом и торможением (купе GT, хэтчбек, маслкар, дрифт-купе, прототип, карт).
// Садятся без ключей.
//
//   1. «Восьмерка» — две петли с перекрестком посередине
//   2. «Овал» — две длинные прямые и два поворота: на скорость
//   3. «Шикана» — скругленный прямоугольник с зигзагом на прямой
//   4. «Серпантин» — извилистое кольцо с крутыми поворотами
//   5. «Грунтовка» — ухабистое грунтовое кольцо для джипа и трактора
//
// Каждая трасса — замкнутая осевая линия (точки через ~2 юнита); полотно, поребрики и стенки из покрышек
// строятся по ней одинаково. Где полотно одной дороги заходит на другую (перекресток восьмерки, подъезды),
// стенок и поребриков нет — там проезд. Линия старта — шашечки в начале осевой линии: проехали ее — пошел
// секундомер круга; круг засчитывается, если машина прошла половину трассы.
//
// Гоночная машина на телефоне рулит наклоном телефона, пока она на трассе (onRaceTrack, src/engine/gyro-steer.js).
// БТР уезжает к вольеру лаборатории: там начинается испытание — из ворот выходят биосущества (их можно давить),
// а за ними роботы, которые быстро подбивают БТР. Подключается после src/demo/tutorial.js.

let onRaceTrack = () => false;
{
  const trackW = 18; // ширина полотна трасс
  const TAU = Math.PI * 2;

  // Замкнутая кривая по функции f(u) → [x, z] (u от 0 до 1): точки через равные ~2 юнита пути
  const closedCurve = (f, step = 2) => {
    const raw = [];
    for (let i = 0; i < 2000; i++) raw.push(f(i / 2000));
    let len = 0;
    const acc = [0];
    for (let i = 1; i <= raw.length; i++) {
      const a = raw[i - 1];
      const b = raw[i % raw.length];
      len += Math.hypot(b[0] - a[0], b[1] - a[1]);
      acc.push(len);
    }
    const n = Math.round(len / step);
    const pts = [];
    let j = 0;
    for (let k = 0; k < n; k++) {
      const s = (k / n) * len;
      while (acc[j + 1] < s) j++;
      const a = raw[j];
      const b = raw[(j + 1) % raw.length];
      const t = (s - acc[j]) / (acc[j + 1] - acc[j] || 1);
      pts.push({ x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t });
    }
    return pts;
  };
  // Отрезок дороги (подъезд): точки через ~2 юнита
  const line = (x1, z1, x2, z2) => {
    const n = Math.max(1, Math.round(Math.hypot(x2 - x1, z2 - z1) / 2));
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push({ x: x1 + ((x2 - x1) * i) / n, z: z1 + ((z2 - z1) * i) / n });
    return pts;
  };

  // ---------- Трассы ----------
  const asphaltColor = 0x404044;
  const TRACKS = [
    {
      id: 'eight', name: 'Восьмерка', start: 0.12,
      desc: 'Две петли с перекрестком посередине: на перекрестке трасса пересекает сама себя.',
      // Лемниската Жероно: петли на запад и восток, перекресток в центре под прямым углом
      pts: closedCurve((u) => [-280 + 115 * Math.cos(TAU * u + Math.PI / 2), -135 + 62 * Math.sin(2 * (TAU * u + Math.PI / 2))]),
    },
    {
      id: 'oval', name: 'Овал', start: 0.25,
      desc: 'Две длинные прямые и два широких поворота: трасса на максимальную скорость.',
      pts: closedCurve((u) => {
        const a = TAU * u;
        // Суперэллипс: почти прямые борта, скругленные концы
        const c = Math.cos(a);
        const s = Math.sin(a);
        return [-500 + 92 * Math.sign(c) * Math.abs(c) ** 0.45, -135 + 40 * Math.sign(s) * Math.abs(s) ** 0.8];
      }),
    },
    {
      id: 'chicane', name: 'Шикана', start: 0.75,
      desc: 'Скругленный прямоугольник с зигзагом на южной прямой: перед ним нужно тормозить.',
      pts: closedCurve((u) => {
        const a = TAU * u;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const x = -285 + 85 * Math.sign(c) * Math.abs(c) ** 0.5;
        let z = 20 + 55 * Math.sign(s) * Math.abs(s) ** 0.5;
        if (s > 0) z -= 22 * Math.exp(-(((x + 285) / 16) ** 2)); // зигзаг на южной прямой
        return [x, z];
      }),
    },
    {
      id: 'serpentine', name: 'Серпантин', start: 0.6,
      desc: 'Извилистое кольцо: поворот за поворотом, прямых почти нет.',
      pts: closedCurve((u) => {
        const a = TAU * u;
        const r = 62 + 14 * Math.sin(3 * a) + 7 * Math.cos(5 * a);
        return [-505 + r * Math.cos(a) * 1.25, 15 + r * Math.sin(a) * 0.95];
      }),
    },
    {
      id: 'dirt', name: 'Грунтовка', start: 0.5,
      desc: 'Грунтовое кольцо с волнистыми поворотами — для джипа и трактора.',
      color: 0x7a5a3a,
      curbs: false,
      pts: closedCurve((u) => {
        const a = TAU * u;
        const r = 64 + 9 * Math.sin(4 * a + 0.6) + 6 * Math.cos(7 * a);
        return [-340 + r * Math.cos(a) * 1.15, 178 + r * Math.sin(a) * 0.95];
      }),
    },
  ];

  // Линия старта — в начале осевой линии: сдвигаем начало на прямую, подальше от перекрестков и подъездов
  for (const t of TRACKS) {
    const k = Math.round(t.start * t.pts.length);
    t.pts = t.pts.slice(k).concat(t.pts.slice(0, k));
  }

  // Подъезды: продольная дорога вдоль западного края площадки (выходит на дорогу ДЕМО), от нее — к каждой трассе
  const spineX = -148;
  const ROADS = [
    { pts: line(-118, 0, spineX, 0), w: 12 }, // от дороги площадки
    { pts: line(spineX, -150, spineX, 178), w: 12 }, // продольная
    { pts: line(spineX, -135, -160, -135), w: 12 }, // к восьмерке (ее восточный край)
    { pts: line(-400, -135, -404, -135), w: 12 }, // восьмерка → овал
    { pts: line(spineX, 20, -195, 20), w: 12 }, // к шикане
    { pts: line(-376, 20, -414, 20), w: 12 }, // шикана → серпантин
    { pts: line(spineX, 178, -262, 178), w: 12, color: 0x7a5a3a }, // к грунтовке
  ];

  // Все полотна — один список: осевая линия, полуширина, замкнута ли
  const surfaces = [
    ...TRACKS.map((t) => ({ pts: t.pts, hw: trackW / 2, closed: true, color: t.color || asphaltColor, track: t })),
    ...ROADS.map((r) => ({ pts: r.pts, hw: r.w / 2, closed: false, color: r.color || asphaltColor })),
  ];

  // Сетка отрезков (ячейка 12): где какие полотна — для стенок, поребриков, «на трассе ли» и секундомера
  const cell = 12;
  const grid = new Map();
  const segKey = (i, j) => i + ',' + j;
  surfaces.forEach((sf, si) => {
    const n = sf.pts.length;
    const m = sf.closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const a = sf.pts[i];
      const b = sf.pts[(i + 1) % n];
      const seg = { a, b, hw: sf.hw, si, i };
      const i1 = Math.floor(Math.min(a.x, b.x) / cell);
      const i2 = Math.floor(Math.max(a.x, b.x) / cell);
      const j1 = Math.floor(Math.min(a.z, b.z) / cell);
      const j2 = Math.floor(Math.max(a.z, b.z) / cell);
      for (let ci = i1; ci <= i2; ci++) {
        for (let cj = j1; cj <= j2; cj++) {
          const k = segKey(ci, cj);
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(seg);
        }
      }
    }
  });
  const segDist = (x, z, s) => {
    const dx = s.b.x - s.a.x;
    const dz = s.b.z - s.a.z;
    const t = Math.max(0, Math.min(1, ((x - s.a.x) * dx + (z - s.a.z) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - s.a.x - dx * t, z - s.a.z - dz * t);
  };
  // Отрезки рядом с точкой (3×3 ячейки)
  const nearSegs = (x, z) => {
    const out = [];
    const ci = Math.floor(x / cell);
    const cj = Math.floor(z / cell);
    for (let i = ci - 1; i <= ci + 1; i++) {
      for (let j = cj - 1; j <= cj + 1; j++) {
        const g = grid.get(segKey(i, j));
        if (g) for (const s of g) out.push(s);
      }
    }
    return out;
  };
  // Лежит ли точка на чужом полотне (своя трасса рядом с индексом own — не в счет): там проезд, стенок нет
  const onOtherSurface = (x, z, si, own, margin) => {
    const n = surfaces[si].pts.length;
    for (const s of nearSegs(x, z)) {
      if (s.si === si) {
        const d = Math.abs(s.i - own);
        if (Math.min(d, n - d) < 18) continue;
      }
      if (segDist(x, z, s) < s.hw + margin) return true;
    }
    return false;
  };
  onRaceTrack = (x, z) => nearSegs(x, z).some((s) => surfaces[s.si].track && segDist(x, z, s) < s.hw + 1.5);

  // Нормаль к осевой линии в точке i
  const normalAt = (sf, i) => {
    const n = sf.pts.length;
    const a = sf.pts[sf.closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const b = sf.pts[sf.closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return { nx: -(b.z - a.z) / len, nz: (b.x - a.x) / len, tx: (b.x - a.x) / len, tz: (b.z - a.z) / len };
  };

  // ---------- Земля автодрома ----------
  const area = { x1: -630, x2: -125, z1: -220, z2: 270 };
  flatRect(area.x2 - area.x1, area.z2 - area.z1, 0x46703e, 0.005, (area.x1 + area.x2) / 2, (area.z1 + area.z2) / 2);
  mapObjects.push({ x: (area.x1 + area.x2) / 2, z: (area.z1 + area.z2) / 2, hx: (area.x2 - area.x1) / 2, hz: (area.z2 - area.z1) / 2, color: '#35583a', ground: true });
  registerZone('autodrome', 'Автодром', area, { birds: 0.3 });

  // ---------- Полотно ----------
  // Лента по осевой линии. Вторая половина каждой трассы чуть выше: на перекрестке восьмерки не мерцает
  surfaces.forEach((sf, si) => {
    const n = sf.pts.length;
    const m = sf.closed ? n + 1 : n;
    const pos = [];
    for (let k = 0; k < m; k++) {
      const i = k % n;
      const p = sf.pts[i];
      const { nx, nz } = normalAt(sf, i);
      const y = sf.track ? (k > n / 2 ? 0.02 : 0.016) : 0.012;
      pos.push(p.x + nx * sf.hw, y, p.z + nz * sf.hw, p.x - nx * sf.hw, y, p.z - nz * sf.hw);
    }
    const idx = [];
    for (let k = 0; k < m - 1; k++) {
      const l = k * 2;
      idx.push(l, l + 1, l + 2, l + 1, l + 3, l + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new LitMaterial({ color: sf.color, side: THREE.DoubleSide }));
    cityGroup.add(mesh);
    if (sf.track) {
      addHoverInfo(mesh, { kind: 'Автодром', name: 'Трасса «' + sf.track.name + '»', desc: sf.track.desc + ' Линия старта — шашечки: с нее идет секундомер круга.' });
    } else addHoverInfo(mesh, { kind: 'Автодром', name: 'Подъезд', desc: 'Дорога между трассами автодрома и площадкой.' });
    const mapColor = sf.color === asphaltColor ? '#56565c' : '#8a6a48';
    for (let i = 0; i < n; i += 2) {
      mapObjects.push({ x: sf.pts[i].x, z: sf.pts[i].z, hx: sf.hw, hz: sf.hw, color: mapColor, ground: true });
    }
  });

  // ---------- Поребрики, стенки из покрышек, линии старта ----------
  const curbs = [];
  const tires = [];
  surfaces.forEach((sf, si) => {
    if (!sf.track) return;
    const n = sf.pts.length;
    for (let i = 0; i < n; i++) {
      const p = sf.pts[i];
      const { nx, nz, tx, tz } = normalAt(sf, i);
      for (const side of [-1, 1]) {
        // Поребрик — у края полотна, полоска вдоль трассы
        if (sf.track.curbs !== false) {
          const cx = p.x + nx * side * (sf.hw - 0.45);
          const cz = p.z + nz * side * (sf.hw - 0.45);
          if (!onOtherSurface(cx, cz, si, i, 0.3)) curbs.push({ x: cx, z: cz, a: Math.atan2(tx, tz), red: i % 2 === 0 });
        }
        // Покрышки — сразу за краем, через одну точку (каждые ~2,2 юнита на прямой)
        const x = p.x + nx * side * (sf.hw + 0.9);
        const z = p.z + nz * side * (sf.hw + 0.9);
        if (!onOtherSurface(x, z, si, i, 1.2)) tires.push({ x, z, red: (i >> 1) % 2 === 0 });
      }
    }
    // Линия старта — шашечки поперек полотна в начале осевой линии
    const p = sf.pts[0];
    const { tx, tz } = normalAt(sf, 0);
    const cv = document.createElement('canvas');
    cv.width = 144;
    cv.height = 16;
    const g = cv.getContext('2d');
    for (let i = 0; i < 18; i++) {
      for (let j = 0; j < 2; j++) {
        g.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f4';
        g.fillRect(i * 8, j * 8, 8, 8);
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter;
    const startLine = new THREE.Mesh(new THREE.PlaneGeometry(sf.hw * 2, 1.8), new LitMaterial({ map: tex, side: THREE.DoubleSide }));
    startLine.rotation.order = 'YXZ';
    startLine.rotation.y = Math.atan2(tx, tz);
    startLine.rotation.x = -Math.PI / 2;
    startLine.position.set(p.x, 0.03, p.z);
    cityGroup.add(startLine);
  });

  // Покрышки не ставим теснее 2,3 юнита: во внутренних поворотах точки краев сгущаются; машина в щель не пройдет
  const tireCell = new Map();
  const keptTires = [];
  for (const t of tires) {
    const ci = Math.floor(t.x / 2);
    const cj = Math.floor(t.z / 2);
    let close = false;
    for (let i = ci - 1; i <= ci + 1 && !close; i++) {
      for (let j = cj - 1; j <= cj + 1 && !close; j++) {
        const g = tireCell.get(i + ',' + j);
        if (g && g.some((o) => Math.hypot(o.x - t.x, o.z - t.z) < 2.3)) close = true;
      }
    }
    if (close) continue;
    const k = ci + ',' + cj;
    if (!tireCell.has(k)) tireCell.set(k, []);
    tireCell.get(k).push(t);
    keptTires.push(t);
  }

  const m4 = new THREE.Matrix4();
  const black = new THREE.Color(0x1c1c1e);
  const red = new THREE.Color(0xb83a2e);
  const white = new THREE.Color(0xeeeeee);
  const tireMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.55, 0.55, 0.95, 10), new LitMaterial({ color: 0xffffff }), keptTires.length);
  keptTires.forEach((t, i) => {
    m4.makeTranslation(t.x, 0.475, t.z);
    tireMesh.setMatrixAt(i, m4);
    tireMesh.setColorAt(i, t.red ? red : black);
    addObstacle({ x: t.x, z: t.z, hx: 0.5, hz: 0.5 });
  });
  tireMesh.instanceMatrix.needsUpdate = true;
  tireMesh.instanceColor.needsUpdate = true;
  cityGroup.add(tireMesh);
  addHoverInfo(tireMesh, { kind: 'Автодром', name: 'Стенка из покрышек', desc: 'Ограждение трассы. Проезды — там, где к трассе подходит дорога.' });

  const curbMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.06, 2.1), new LitMaterial({ color: 0xffffff }), curbs.length);
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1);
  const at = new THREE.Vector3();
  curbs.forEach((c, i) => {
    q.setFromAxisAngle(up, c.a);
    at.set(c.x, 0.03, c.z);
    m4.compose(at, q, one);
    curbMesh.setMatrixAt(i, m4);
    curbMesh.setColorAt(i, c.red ? red : white);
  });
  curbMesh.instanceMatrix.needsUpdate = true;
  curbMesh.instanceColor.needsUpdate = true;
  cityGroup.add(curbMesh);

  // ---------- Стоянка с машинами ----------
  // У продольной дороги, к востоку от нее, на краю площадки: носом на север
  const lotX = -133;
  const lotZ = -36;
  flatRect(16, 34, 0x505054, 0.011, lotX, lotZ);
  mapObjects.push({ x: lotX, z: lotZ, hx: 8, hz: 17, color: '#56565c', ground: true });
  addVehicle('race', lotX - 3.5, lotZ - 10, 0, { open: true });
  addVehicle('jeep', lotX + 3.5, lotZ - 10, 0, { open: true });
  addVehicle('tractor', lotX - 3.5, lotZ + 6, 0, { open: true });
  addVehicle('apc', lotX + 3.5, lotZ + 6, 0, { open: true });

  // Гоночный парк — севернее, на своей стоянке у продольной дороги: шесть машин с разной ездой
  // (VEHICLE_KINDS: gt, rally, muscle, drift, proto, kart). Садятся без ключей
  const pitZ = -88;
  flatRect(16, 44, 0x505054, 0.011, lotX, pitZ);
  mapObjects.push({ x: lotX, z: pitZ, hx: 8, hz: 22, color: '#56565c', ground: true });
  ['gt', 'rally', 'muscle', 'drift', 'proto', 'kart'].forEach((id, i) => {
    addVehicle(id, lotX + (i % 2 ? 3.5 : -3.5), pitZ - 13 + Math.floor(i / 2) * 13, 0, { open: true });
  });

  // ---------- Секундомер круга ----------
  // Где машина на трассе: ближайшая точка осевой линии. Ищем рядом с прошлой (на перекрестке восьмерки
  // иначе перепутаем ветки); потеряли трассу — ищем заново по всем
  const lap = { car: null, si: -1, i: 0, half: false, started: 0, best: {} };
  const fmt = (ms) => {
    const s = ms / 1000;
    return Math.floor(s / 60) + ':' + (s % 60).toFixed(1).padStart(4, '0').replace('.', ',');
  };
  const nearestOnTrack = (x, z) => {
    let best = null;
    let bd = Infinity;
    for (const s of nearSegs(x, z)) {
      if (!surfaces[s.si].track) continue;
      const d = segDist(x, z, s);
      if (d < bd && d < s.hw + 2) (bd = d), (best = s);
    }
    return best;
  };
  demoUpdates.push(() => {
    const car = drivingCar;
    if (!car || !car.kind) {
      lap.car = null;
      return;
    }
    if (lap.car !== car) {
      lap.car = car;
      lap.si = -1;
    }
    if (lap.si < 0) {
      const s = nearestOnTrack(car.x, car.z);
      if (!s) return;
      lap.si = s.si;
      lap.i = s.i;
      lap.half = false;
      lap.started = 0;
      return;
    }
    const sf = surfaces[lap.si];
    const n = sf.pts.length;
    let bi = lap.i;
    let bd = Infinity;
    for (let k = -8; k <= 8; k++) {
      const i = (lap.i + k + n) % n;
      const d = Math.hypot(sf.pts[i].x - car.x, sf.pts[i].z - car.z);
      if (d < bd) (bd = d), (bi = i);
    }
    if (bd > sf.hw + 4) {
      lap.si = -1; // съехали с трассы
      return;
    }
    const prev = lap.i;
    lap.i = bi;
    if (bi > n * 0.4 && bi < n * 0.6) lap.half = true;
    // Линия старта — переход с конца осевой линии на начало (по ходу) или обратно (против хода)
    const forward = prev > n * 0.9 && bi < n * 0.1;
    const backward = prev < n * 0.1 && bi > n * 0.9;
    if (!forward && !backward) return;
    const now = performance.now();
    const key = sf.track.id + '|' + car.kind.id;
    const name = car.kind.name + ', «' + sf.track.name + '»';
    if (lap.started && lap.half) {
      const t = now - lap.started;
      const best = lap.best[key];
      const record = !best || t < best;
      if (record) lap.best[key] = t;
      showToast(name + ': круг ' + fmt(t) + (record ? (best ? ' — новый рекорд!' : '') : ' · лучший ' + fmt(best)), 4500);
    } else if (!lap.started) showToast('«' + sf.track.name + '»: круг пошел! Секундомер остановится на линии старта', 3000);
    lap.started = now;
    lap.half = false;
  });

  // ---------- Испытание БТР у вольера ----------
  // Подъехали на БТР к вольеру, а обучение не идет — лаборатория выпускает волну: сначала биосущества
  // (давить!), за ними роботы
  const penCenter = { x: 101, z: 87 };
  let trialToldAt = 0;
  let trialArmed = true; // новое испытание — только после того, как БТР отъехал от вольера
  demoUpdates.push(() => {
    const car = drivingCar;
    if (!car || !car.kind || car.kind.id !== 'apc' || !startPenWave) return;
    if (Math.hypot(car.x - penCenter.x, car.z - penCenter.z) > 40) {
      trialArmed = true;
      if (performance.now() - trialToldAt > 60000 && Math.hypot(car.x - lotX, car.z - lotZ) < 30) {
        trialToldAt = performance.now();
        showToast('БТР: давит биосуществ. Езжайте по дороге на восток к вольеру лаборатории — там его испытание', 6000);
      }
      return;
    }
    if (!trialArmed || penWaveRunning()) return;
    trialArmed = false;
    startPenWave({
      wave: ['strider', 'hound', 'hound', 'drone', 'stilt'],
      intro: 'Испытание БТР: из лаборатории выходят биосущества — давите их на ходу! Следом идут роботы: их ракеты и молнии пробивают броню',
      done: 'Испытание БТР окончено. Подбитый БТР чинится E рядом с ним',
    });
  });
}
