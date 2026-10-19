// src/quests/guide.js
// ПОДСКАЗКИ ПО КВЕСТУ — две настройки вкладки «Игра» (src/engine/settings.js), обе включены по умолчанию:
//
//   showPath     «Показывать направление»: от героя до цели текущего шага идут небольшие зеленые стрелки прямо по земле, и такая же
//                линия со стрелками лежит на миникарте и большой карте. Путь ищется заново поиском A*: не через здания, кусты, деревья
//                и реку, а по дороге, улице, тропинке и тротуару (по ним дешевле), поэтому стрелки ведут по настоящему проходимому пути.
//   Двери и кнопки: когда на дверь, лестницу или кнопку гаража наведена мышь, сам объект чуть ярчает (тянется к теплому цвету), а в сканере
//   он подписан («Вход в гараж»). Это не настройка: так игрок видит, с чем можно взаимодействовать (клик или E). Пока так сделано для входа
//   в гараж, кнопки гаража и лестницы дома; остальные входы без сеток объекта подсвечивать пока не начали (DOOR_FALLBACK_PANELS).
//   showObjects  «Подсвечивать объекты»: то, к чему нужно подойти или применить действие (человек, вход в здание, вещь, место, а также объект, на который
//                сейчас нацелено действие активного квеста: ноутбук Веры, верстак, горн — записи interactions квеста), помечено покачивающимся
//                ромбом с кольцом на земле — так же, как ромб над машиной героя (src/player/driving.js).
//
// Цель берется из квеста: метка текущего шага (game.currentMarker), а вещь — из условия шага has:<вещь>. Поиск пути идет кусками по кадрам,
// чтобы игра не подвисала; путь пересчитывается, когда сменилась цель или герой ушел с пути. Внутри зданий стрелок нет.

(function () {
  const g = questGame;

  // ---------- Проходимость ----------
  const CELL = 3; // клетка поиска, юнитов
  const BUCKET = 16; // корзина индекса препятствий
  const R = 0.45; // запас от препятствий: радиус героя; узкие калитки проходятся, а бревно через овраг — по navLinks
  let obsIndex = null;
  let obsCount = -1;
  let roadIndex = null;
  let roadCount = -1;

  const bucketKey = (i, j) => i * 100003 + j;

  function indexObstacles() {
    obsIndex = new Map();
    obsCount = obstacleShapes.length;
    for (const s of obstacleShapes) {
      if (s.creature) continue; // существа ходят
      const ex = Math.abs(s.ux) * s.hu + Math.abs(s.vx) * s.hv;
      const ez = Math.abs(s.uz) * s.hu + Math.abs(s.vz) * s.hv;
      const i1 = Math.floor((s.x - ex - R) / BUCKET);
      const i2 = Math.floor((s.x + ex + R) / BUCKET);
      const j1 = Math.floor((s.z - ez - R) / BUCKET);
      const j2 = Math.floor((s.z + ez + R) / BUCKET);
      for (let i = i1; i <= i2; i++) {
        for (let j = j1; j <= j2; j++) {
          const k = bucketKey(i, j);
          if (!obsIndex.has(k)) obsIndex.set(k, []);
          obsIndex.get(k).push(s);
        }
      }
    }
  }

  // Дороги и тротуары: по ним идти дешевле. Корзины по отрезкам с запасом на ширину
  function indexRoads() {
    roadIndex = new Map();
    roadCount = mapRoads.length + sidewalks.length;
    const add = (seg) => {
      const pad = seg.hw + 1;
      const i1 = Math.floor((Math.min(seg.x1, seg.x2) - pad) / BUCKET);
      const i2 = Math.floor((Math.max(seg.x1, seg.x2) + pad) / BUCKET);
      const j1 = Math.floor((Math.min(seg.z1, seg.z2) - pad) / BUCKET);
      const j2 = Math.floor((Math.max(seg.z1, seg.z2) + pad) / BUCKET);
      for (let i = i1; i <= i2; i++) {
        for (let j = j1; j <= j2; j++) {
          const k = bucketKey(i, j);
          if (!roadIndex.has(k)) roadIndex.set(k, []);
          roadIndex.get(k).push(seg);
        }
      }
    };
    for (const r of mapRoads) add({ x1: r.x1, z1: r.z1, x2: r.x2, z2: r.z2, hw: (r.width || roadWidth) / 2 + 0.6, cost: 1 });
    for (const s of sidewalks) add({ x1: s.x1, z1: s.z1, x2: s.x2, z2: s.z2, hw: 2, cost: 1.15 });
  }

  function blockedAt(x, z, r = R) {
    if (!insideWorldCircle(x, z, 3)) return true;
    if (obstacleShapes.length !== obsCount) indexObstacles();
    const bucket = obsIndex.get(bucketKey(Math.floor(x / BUCKET), Math.floor(z / BUCKET)));
    if (bucket) {
      for (const s of bucket) {
        const lu = (x - s.x) * s.ux + (z - s.z) * s.uz;
        const lv = (x - s.x) * s.vx + (z - s.z) * s.vz;
        if (Math.abs(lu) < s.hu + r && Math.abs(lv) < s.hv + r) return true;
      }
    }
    for (const t of nearbyTrees(x, z)) {
      if (Math.hypot(x - t.x, z - t.z) < r + 0.4 * t.s) return true;
    }
    return false;
  }

  // Цена шага по клетке: дорога и тротуар — 1, остальное — дороже (трава, лес)
  const OFFROAD = 5; // вне дороги путь в разы дороже: идем по дорогам, улицам, тротуарам и тропинкам, а траву и лес пересекаем только когда иначе нельзя
  function stepCost(x, z) {
    if (mapRoads.length + sidewalks.length !== roadCount) indexRoads();
    const bucket = roadIndex.get(bucketKey(Math.floor(x / BUCKET), Math.floor(z / BUCKET)));
    if (bucket) {
      for (const s of bucket) {
        const dx = s.x2 - s.x1;
        const dz = s.z2 - s.z1;
        const len2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - s.x1) * dx + (z - s.z1) * dz) / len2));
        if (Math.hypot(x - (s.x1 + dx * t), z - (s.z1 + dz * t)) <= s.hw) return s.cost;
      }
    }
    return OFFROAD;
  }

  // ---------- Поиск пути A* (кусками по кадрам) ----------
  // Путь не самый короткий, зато простой и предсказуемый: идет там, где можно пройти пешком (не через здания, воду, кусты и деревья),
  // держится дорог и тропинок (трава и лес в несколько раз дороже), не жмется к стенам (рядом с препятствием штраф) и не виляет
  // (за каждый поворот штраф, поэтому длинные прямые участки предпочтительнее зигзагов). Состояние поиска — клетка и направление.
  class Heap {
    constructor() {
      this.a = [];
    }
    push(item, f) {
      const a = this.a;
      a.push({ item, f });
      let i = a.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (a[p].f <= a[i].f) break;
        [a[p], a[i]] = [a[i], a[p]];
        i = p;
      }
    }
    pop() {
      const a = this.a;
      const top = a[0];
      const last = a.pop();
      if (a.length) {
        a[0] = last;
        let i = 0;
        for (;;) {
          let m = i;
          const l = i * 2 + 1;
          const r = l + 1;
          if (l < a.length && a[l].f < a[m].f) m = l;
          if (r < a.length && a[r].f < a[m].f) m = r;
          if (m === i) break;
          [a[m], a[i]] = [a[i], a[m]];
          i = m;
        }
      }
      return top.item;
    }
    get size() {
      return this.a.length;
    }
  }

  const OFF = 700;
  const cellKey = (i, j) => (i + OFF) * 2000 + (j + OFF);
  const stateKey = (i, j, d) => cellKey(i, j) * 9 + d; // d: 0..7 направление, 8 — старт
  const cellCenter = (i, j) => ({ x: (i + 0.5) * CELL, z: (j + 0.5) * CELL });
  const NEIGHBOURS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]; // по кругу: соседние номера — поворот на 45°
  const TURN_COST = [0, 1, 3, 6, 9]; // штраф за поворот на 0, 45, 90, 135, 180°: чем резче, тем дороже
  const NEAR_WALL = 1.8; // ближе этого к препятствию — штраф
  const WALL_COST = 1.2;

  function startJob(from, to, goalR) {
    const job = {
      to, goalR, open: new Heap(), cost: new Map(), came: new Map(), blocked: new Map(), tight: new Map(),
      expansions: 0, done: false, path: null, best: null, bestD: Infinity,
    };
    const isBlocked = (i, j) => {
      const k = cellKey(i, j);
      let b = job.blocked.get(k);
      if (b === undefined) {
        const c = cellCenter(i, j);
        b = blockedAt(c.x, c.z);
        job.blocked.set(k, b);
      }
      return b;
    };
    const isTight = (i, j) => {
      const k = cellKey(i, j);
      let b = job.tight.get(k);
      if (b === undefined) {
        const c = cellCenter(i, j);
        b = blockedAt(c.x, c.z, NEAR_WALL);
        job.tight.set(k, b);
      }
      return b;
    };
    job.isBlocked = isBlocked;
    job.isTight = isTight;
    // Узкие проходы, которые сетка не видит (бревно через овраг): записи navLinks [{ a, b }] — двусторонние «мостики» между клетками
    job.links = new Map();
    for (const l of globalThis.navLinks || []) {
      const ca = [Math.floor(l.a.x / CELL), Math.floor(l.a.z / CELL)];
      const cb = [Math.floor(l.b.x / CELL), Math.floor(l.b.z / CELL)];
      const cost = Math.hypot(l.a.x - l.b.x, l.a.z - l.b.z);
      for (const [fr, to2] of [[ca, cb], [cb, ca]]) {
        const k = cellKey(fr[0], fr[1]);
        if (!job.links.has(k)) job.links.set(k, []);
        job.links.get(k).push([to2[0], to2[1], cost]);
      }
    }
    // Старт: ближайшая свободная клетка
    const si = Math.floor(from.x / CELL);
    const sj = Math.floor(from.z / CELL);
    let start = null;
    for (let rad = 0; rad <= 6 && !start; rad++) {
      for (let di = -rad; di <= rad && !start; di++) {
        for (let dj = -rad; dj <= rad; dj++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== rad) continue;
          if (!isBlocked(si + di, sj + dj)) {
            start = [si + di, sj + dj];
            break;
          }
        }
      }
    }
    if (!start) {
      job.done = true;
      return job;
    }
    job.start = start;
    job.cost.set(stateKey(start[0], start[1], 8), 0);
    job.open.push([start[0], start[1], 8], 0);
    return job;
  }

  // Шаг поиска: до budget расширений за вызов
  function stepJob(job, budget) {
    const W = 1.6 + Math.min(0.8, Math.hypot(job.to.x - job.start[0] * CELL, job.to.z - job.start[1] * CELL) / 2500); // жадный поиск: путь не самый короткий, но находится быстро и ведет прямо к цели; чем дальше цель, тем жаднее
    const relax = (cur, ni, nj, nd, add) => {
      const nk = stateKey(ni, nj, nd);
      const g = job.cost.get(stateKey(cur[0], cur[1], cur[2])) + add;
      const old = job.cost.get(nk);
      if (old !== undefined && old <= g) return;
      job.cost.set(nk, g);
      job.came.set(nk, stateKey(cur[0], cur[1], cur[2]));
      const nc = cellCenter(ni, nj);
      job.open.push([ni, nj, nd], g + (W * Math.hypot(nc.x - job.to.x, nc.z - job.to.z)) / CELL);
    };
    for (let n = 0; n < budget && !job.done; n++) {
      if (!job.open.size) {
        job.done = true;
        break;
      }
      const cur = job.open.pop();
      const [ci, cj, cd] = cur;
      const cc = cellCenter(ci, cj);
      const dGoal = Math.hypot(cc.x - job.to.x, cc.z - job.to.z);
      if (dGoal < job.bestD) {
        job.bestD = dGoal;
        job.best = cur;
      }
      if (dGoal <= job.goalR) {
        job.best = cur;
        job.found = true;
        job.done = true;
        break;
      }
      if (++job.expansions > 700000) {
        job.done = true;
        break;
      }
      for (let nd = 0; nd < 8; nd++) {
        const [di, dj] = NEIGHBOURS[nd];
        const ni = ci + di;
        const nj = cj + dj;
        if (job.isBlocked(ni, nj)) continue;
        if (di && dj && (job.isBlocked(ci + di, cj) || job.isBlocked(ci, cj + dj))) continue; // не режем углы
        const nc = cellCenter(ni, nj);
        let turn = 0;
        if (cd !== 8) {
          const diff = Math.abs(nd - cd);
          turn = TURN_COST[Math.min(diff, 8 - diff)];
        }
        const add = (di && dj ? 1.414 : 1) * stepCost(nc.x, nc.z) + turn + (job.isTight(ni, nj) ? WALL_COST : 0);
        relax(cur, ni, nj, nd, add);
      }
      for (const [ni, nj, c] of job.links.get(cellKey(ci, cj)) || []) relax(cur, ni, nj, 8, c);
    }
    if (job.done && job.best && !job.path) {
      // Путь назад от лучшей клетки (до цели или самой близкой к ней)
      const cells = [];
      let k = stateKey(job.best[0], job.best[1], job.best[2]);
      let guard = 0;
      while (k !== undefined && guard++ < 40000) {
        const ck = Math.floor(k / 9);
        const i = Math.floor(ck / 2000) - OFF;
        const j = (ck % 2000) - OFF;
        cells.push(cellCenter(i, j));
        k = job.came.get(k);
      }
      cells.reverse();
      job.path = smooth(simplify(cells, job));
    }
  }

  // Упрощение: убираем лишние точки, пока отрезок между ними чист (на расстоянии от препятствий) и не уходит с дороги на траву, если шел по дороге.
  // Остаются только точки поворотов, поэтому путь — несколько прямых, а не лесенка по клеткам
  function simplify(cells, job) {
    if (cells.length < 3) return cells;
    const classOf = (p) => stepCost(p.x, p.z);
    const clear = (a, b) => {
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len > 80) return false;
      const ca = Math.min(classOf(a), classOf(b));
      const n = Math.ceil(len / 1.2);
      for (let i = 1; i < n; i++) {
        const x = a.x + ((b.x - a.x) * i) / n;
        const z = a.z + ((b.z - a.z) * i) / n;
        if (blockedAt(x, z, 1.1)) return false;
        if (ca < OFFROAD && classOf({ x, z }) > ca + 0.2) return false; // не срезаем дорогу по траве
      }
      return true;
    };
    const out = [cells[0]];
    let i = 0;
    while (i < cells.length - 1) {
      let j = cells.length - 1;
      while (j > i + 1 && !clear(cells[i], cells[j])) j--;
      out.push(cells[j]);
      i = j;
    }
    return out;
  }

  // Мягко скругляем углы (один проход Чайкина): путь без острых изломов, но почти по тем же линиям
  function smooth(points) {
    let p = points;
    for (let it = 0; it < 2 && p.length > 2; it++) {
      const q = [p[0]];
      for (let i = 0; i < p.length - 1; i++) {
        const a = p[i];
        const b = p[i + 1];
        q.push({ x: a.x * 0.8 + b.x * 0.2, z: a.z * 0.8 + b.z * 0.2 }, { x: a.x * 0.2 + b.x * 0.8, z: a.z * 0.2 + b.z * 0.8 });
      }
      q.push(p[p.length - 1]);
      p = q;
    }
    // Точки через ~1,5 юнита: стрелки и линия на карте идут ровно
    const dense = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i];
      const b = p[i + 1];
      const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 1.5));
      for (let k = 1; k <= n; k++) dense.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
    }
    return dense;
  }

  // ---------- Цель ----------
  // Вещи из условия шага («has:keys») и метка места текущего шага
  function itemIdsOf(cond, out = []) {
    if (!cond) return out;
    if (typeof cond === 'string') {
      const m = /^has:([^>=<]+)/.exec(cond.trim());
      if (m) out.push(m[1]);
    } else if (Array.isArray(cond)) cond.forEach((c) => itemIdsOf(c, out));
    return out;
  }

  const tmp = new THREE.Vector3();
  const localOf = (mesh) => {
    mesh.getWorldPosition(tmp);
    return cityGroup.worldToLocal(tmp.clone());
  };

  let objectTargets = []; // [{ x, z, y }] — что подсвечено ромбами (до четырех)
  function resolveGoalObject() {
    const id = g.state.tracked;
    const step = id && g.currentStep(id);
    if (!step) return null;
    // 1. вещь, которую нужно взять
    for (const item of itemIdsOf(step.done)) {
      for (const p of pickables) {
        if (p.id !== item || !p.mesh || !p.mesh.visible || (p.canPick && !p.canPick())) continue;
        const pos = localOf(p.mesh);
        if (Math.hypot(pos.x - playerWorldX, pos.z - playerWorldZ) < 40) return { x: pos.x, z: pos.z, y: pos.y + 1.3 };
      }
    }
    const marker = g.currentMarker();
    if (!marker || insideBuilding()) return null;
    // 2. человек у места
    let best = null;
    let bestD = marker.r + 14;
    for (const n of npcs) {
      if (!(n.charId || n.kind === 'story' || n.kind === 'friend')) continue;
      const d = Math.hypot(n.x - marker.x, n.z - marker.z);
      if (d < bestD) {
        best = n;
        bestD = d;
      }
    }
    if (best) return { x: best.x, z: best.z, y: 3.4 };
    // 3. вход в здание у места
    let door = null;
    bestD = marker.r + 18;
    for (const it of interactables) {
      if (!it.walkTo) continue;
      const d = Math.hypot(it.walkTo.x - marker.x, it.walkTo.z - marker.z);
      if (d < bestD) {
        door = it.walkTo;
        bestD = d;
      }
    }
    if (door) return { x: door.x, z: door.z, y: 4.6 };
    // 4. само место
    return { x: marker.x, z: marker.z, y: 3.2 };
  }

  // Объект, на который нацелено действие активного квеста (interactions: [{ on: 'station:laptop', if, do }]): станция здания или объект мира
  function interactionTargets() {
    const out = [];
    for (const q of Object.values(Core.registry.quests)) {
      if (!g.isActive(q.id)) continue;
      for (const it of q.interactions || []) {
        if (!it.on || !g.check(it.if)) continue;
        let pos = null;
        if (it.on.startsWith('station:')) {
          const id = it.on.slice(8);
          let bestD = 80;
          for (const st of interactables) {
            if (st.stationId !== id || !st.stationPos) continue;
            const p = st.stationPos();
            const d = Math.hypot(p.x - playerWorldX, p.z - playerWorldZ);
            if (d < bestD) {
              bestD = d;
              pos = { x: p.x, z: p.z, y: 2.3 };
            }
          }
        } else if (it.on.startsWith('spot:')) {
          const sp = window.questSpots && window.questSpots.get(it.on.slice(5));
          if (sp && Math.hypot(sp.x - playerWorldX, sp.z - playerWorldZ) < 80) pos = { x: sp.x, z: sp.z, y: 3.2 };
        }
        if (pos && !out.some((o) => Math.hypot(o.x - pos.x, o.z - pos.z) < 1.5)) out.push(pos);
      }
    }
    return out;
  }

  function resolveObjects() {
    const out = [];
    const goal = resolveGoalObject();
    if (goal) out.push(goal);
    for (const t of interactionTargets()) if (!out.some((o) => Math.hypot(o.x - t.x, o.z - t.z) < 2)) out.push(t);
    return out.slice(0, 4);
  }

  // ---------- Путь ----------
  const nav = { key: '', job: null, path: null, cum: null, lastAsk: 0 };

  function goalKey(marker) {
    return marker ? marker.id + '|' + Math.round(marker.x) + '|' + Math.round(marker.z) : '';
  }

  function setPath(points) {
    nav.path = points;
    nav.cum = [0];
    for (let i = 1; i < points.length; i++) nav.cum.push(nav.cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  }

  // Ближайшая к герою точка пути (индекс и расстояние)
  function nearestOnPath() {
    let bi = 0;
    let bd = Infinity;
    for (let i = 0; i < nav.path.length; i++) {
      const d = Math.hypot(nav.path[i].x - playerWorldX, nav.path[i].z - playerWorldZ);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    }
    return { i: bi, d: bd };
  }

  function updateNav() {
    const marker = settings.showPath && !insideBuilding() ? g.currentMarker() : null;
    if (!marker) {
      nav.key = '';
      nav.job = null;
      nav.path = null;
      return;
    }
    const key = goalKey(marker);
    const now = performance.now();
    let need = key !== nav.key;
    if (!need && nav.path) {
      const np = nearestOnPath();
      // Ушел с пути (в сторону, в машину, телепорт) — ищем заново, но не чаще раза в 1,5 секунды
      const nearGoal = Math.hypot(marker.x - playerWorldX, marker.z - playerWorldZ) < marker.r;
      if (!nearGoal && np.d > 14 && now - nav.lastAsk > 1500) need = true;
    }
    if (need) {
      nav.key = key;
      nav.lastAsk = now;
      nav.job = startJob({ x: playerWorldX, z: playerWorldZ }, { x: marker.x, z: marker.z }, Math.max(4, Math.min(12, marker.r * 0.6)));
    }
    if (nav.job) {
      const t0 = performance.now();
      while (!nav.job.done && performance.now() - t0 < 6) stepJob(nav.job, 400);
      if (nav.job.done) {
        const p = nav.job.path;
        nav.job = null;
        if (p && p.length > 1) setPath(p);
        else nav.path = null;
      }
    }
  }

  // ---------- Стрелки на земле ----------
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.9);
  arrowShape.lineTo(0.8, -0.6);
  arrowShape.lineTo(0, -0.15);
  arrowShape.lineTo(-0.8, -0.6);
  arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape).rotateX(-Math.PI / 2); // вперед — в −Z, как у моделей игры
  const ARROWS = 32;
  const arrows = new THREE.InstancedMesh(
    arrowGeo,
    new THREE.MeshBasicMaterial({ color: DESIGN.color.path, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }),
    ARROWS,
  );
  arrows.frustumCulled = false;
  arrows.visible = false;
  cityGroup.add(arrows);
  const mat = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const scl = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const SPACING = 5;
  const AHEAD = 90;

  function updateArrows(t) {
    if (!nav.path || !settings.showPath || insideBuilding()) {
      arrows.visible = false;
      return;
    }
    // Проекция героя на путь: ближайшая точка и длина пути до нее
    const np = nearestOnPath();
    const s0 = nav.cum[np.i];
    const total = nav.cum[nav.cum.length - 1];
    const phase = (t * 2.2) % SPACING; // стрелки «текут» вперед
    let count = 0;
    let seg = np.i;
    for (let s = s0 + phase + 2; s < Math.min(total, s0 + AHEAD) && count < ARROWS; s += SPACING) {
      while (seg < nav.cum.length - 2 && nav.cum[seg + 1] < s) seg++;
      const a = nav.path[seg];
      const b = nav.path[seg + 1];
      const len = nav.cum[seg + 1] - nav.cum[seg] || 1;
      const k = Math.max(0, Math.min(1, (s - nav.cum[seg]) / len));
      const x = a.x + (b.x - a.x) * k;
      const z = a.z + (b.z - a.z) * k;
      const h = Math.atan2(-(b.x - a.x), -(b.z - a.z));
      const fade = 1 - Math.max(0, (s - s0 - AHEAD * 0.6) / (AHEAD * 0.4)); // дальние тают
      const pulse = 0.85 + 0.15 * Math.sin(t * 5 - (s - s0) * 0.2);
      quat.setFromAxisAngle(up, h);
      scl.setScalar(Math.max(0.2, fade) * pulse * 0.9);
      pos.set(x, groundHeightAt(x, z, 9) + 0.14, z);
      mat.compose(pos, quat, scl);
      arrows.setMatrixAt(count++, mat);
    }
    arrows.count = count;
    arrows.instanceMatrix.needsUpdate = true;
    arrows.visible = count > 0;
  }

  // ---------- Подсвеченные объекты ----------
  // Пул из четырех меток: ромб над объектом и кольцо на земле
  const marks = [];
  for (let i = 0; i < 4; i++) {
    const group = new THREE.Group();
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshBasicMaterial({ color: DESIGN.color.warm }));
    diamond.scale.y = 1.4;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.2, 28).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: DESIGN.color.warm, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }),
    );
    group.add(diamond, ring);
    group.visible = false;
    cityGroup.add(group);
    marks.push({ group, diamond, ring });
  }

  function updateMark(t) {
    marks.forEach((m, i) => {
      const o = settings.showObjects ? objectTargets[i] : null;
      if (!o) {
        m.group.visible = false;
        return;
      }
      m.group.visible = true;
      const gy = insideBuilding() ? 0 : groundHeightAt(o.x, o.z, 9);
      m.group.position.set(o.x, 0, o.z);
      m.diamond.position.y = (o.y > 2.5 ? gy : 0) + o.y + Math.sin(t * DESIGN.motion.bob) * 0.2;
      m.diamond.rotation.y = t * DESIGN.motion.spin;
      m.ring.position.y = gy + 0.15;
      const pulse = 1 + 0.25 * Math.sin(t * DESIGN.motion.bob);
      m.ring.scale.set(pulse, 1, pulse);
      m.ring.material.opacity = 0.45 + 0.3 * Math.sin(t * DESIGN.motion.bob + 1);
    });
  }

  // ---------- Подсветка входов при наведении ----------
  // Дверь, лестница или кнопка, которыми можно воспользоваться сейчас, чуть ярчают, когда на них наведена мышь: цвет сетки объекта
  // становится светлее и теплее и плавно возвращается (записи interactables с glowMeshes() — список сеток объекта). Сканер подписывает
  // вход («Вход в гараж»). Запасная плашка для дверей без сеток отключена (DOOR_FALLBACK_PANELS): сначала проверяем на гараже.
  const DOOR_FALLBACK_PANELS = false;
  let lastMouse = null; // координаты мыши -1..1 из главного цикла (updateHoverInfo, src/engine/hoverinfo.js)
  const origUpdateHoverInfo = updateHoverInfo;
  updateHoverInfo = function (mouse) {
    lastMouse = mouse;
    origUpdateHoverInfo(mouse);
  };
  const glowRay = new THREE.Raycaster();
  const hitGeo = new THREE.BoxGeometry(1, 1, 1);
  const GLOW = new THREE.Color(DESIGN.color.accent); // подсветка при наведении: светлее и чуть голубее
  const glows = new Map(); // interactable → { panel, tinted: Set }
  const doorWord = { 'войти': 'Вход', 'выйти': 'Выход', 'подняться': 'Подъем', 'спуститься': 'Спуск' };

  function doorName(it) {
    if (it.doorName) return it.doorName;
    const text = String(typeof it.prompt === 'function' ? it.prompt() : it.prompt || '').replace(/^E\s*[—-]\s*/, '');
    const [first, ...rest] = text.split(' ');
    return (doorWord[first] || first.charAt(0).toUpperCase() + first.slice(1)) + (rest.length ? ' ' + rest.join(' ') : '');
  }

  function doorSpot(it) {
    if (it.glowAt) return it.glowAt();
    if (it.clickPoint) return it.clickPoint();
    if (it.clickObject && it.walkTo && !insideBuilding()) return it.walkTo;
    return null;
  }

  // Мягкая плашка: градиент по краям, складывается со светом сцены
  function softTexture(w, h) {
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 64;
    const c = cv.getContext('2d');
    const grd = c.createRadialGradient(32, 32, 4, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,226,122,0.85)');
    grd.addColorStop(1, 'rgba(255,226,122,0)');
    c.fillStyle = grd;
    c.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  }
  const softTex = softTexture();
  const doorPanelGeo = new THREE.PlaneGeometry(1.7, 2.7);
  const floorPanelGeo = new THREE.PlaneGeometry(3, 3).rotateX(-Math.PI / 2);

  function makePanel(it) {
    const mat = new THREE.MeshBasicMaterial({ map: softTex, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const panel = new THREE.Mesh(it.glowKind === 'floor' ? floorPanelGeo : doorPanelGeo, mat);
    panel.visible = false;
    cityGroup.add(panel);
    addHoverInfo(panel, () => hoverOf(it));
    return panel;
  }

  const hoverOf = (it) => ({
    kind: it.glowAt ? 'Кнопка' : it.glowKind === 'floor' ? 'Лестница' : 'Вход',
    name: doorName(it),
    desc: it.glowAt ? 'Клик или E — нажать' : 'Клик или E — пройти',
  });

  // Цвет сеток тянется к желтому на amount (0 — вернуть как было); материал копируется один раз, чтобы не красить чужие вещи
  function tint(meshes, amount) {
    for (const root of meshes) {
      root.traverse((o) => {
        if (!o.isMesh || !o.material || !o.material.color || o.userData.noGlow) return;
        if (!o.userData.glowBase) {
          o.material = o.material.clone();
          o.userData.glowBase = o.material.color.clone();
        }
        o.material.color.copy(o.userData.glowBase);
        if (amount > 0) {
          const c = o.material.color.lerp(GLOW, amount * 0.9).multiplyScalar(1 + amount * 1.1); // светлее и чуть голубее
          c.r = Math.min(1, c.r);
          c.g = Math.min(1, c.g);
          c.b = Math.min(1, c.b);
        }
      });
    }
  }

  const camWorld = new THREE.Vector3();
  function updateDoors(t) {
    for (const it of interactables) {
      if (!it.clickPoint && !it.glowAt && !(it.clickObject && it.walkTo)) continue;
      let glow = glows.get(it);
      const spot = !drivingCar && !dialogueOpen && (!it.canEnter || it.canEnter()) ? doorSpot(it) : null;
      const near = spot && Math.hypot(spot.x - playerWorldX, spot.z - playerWorldZ) < 45;
      if (!glow && near) {
        glow = { panel: null, tinted: null, reg: null };
        glows.set(it, glow);
      }
      if (!glow) continue;
      const meshes = near && it.glowMeshes ? it.glowMeshes().filter(Boolean) : null;
      // Сетки объекта: ярчают при наведении мыши; к ним же привязана подпись сканера
      if (it.glowMeshes) {
        if (glow.tinted && (!meshes || meshes.some((m) => !glow.tinted.includes(m)))) tint(glow.tinted, 0);
        glow.tinted = meshes;
        // Мелкие предметы (кнопка) трудно поймать мышью: вокруг них невидимая коробка побольше (glowHit — ее размер), она же показывает подпись в сканере
        if (meshes && it.glowHit && spot) {
          if (!glow.hitBox) {
            glow.hitBox = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
            cityGroup.add(glow.hitBox);
            addHoverInfo(glow.hitBox, () => (glow.tinted ? hoverOf(it) : null));
          }
          glow.hitBox.scale.setScalar(it.glowHit);
          glow.hitBox.position.set(spot.x, spot.y !== undefined ? spot.y : 1.2, spot.z);
          glow.hitBox.visible = true;
        } else if (glow.hitBox) glow.hitBox.visible = false;
        let hovered = false;
        if (meshes && lastMouse && !dialogueOpen && !settingsOpen) {
          glowRay.setFromCamera(lastMouse, camera);
          const targets = glow.hitBox && glow.hitBox.visible ? [...meshes, glow.hitBox] : meshes;
          const hit = glowRay.intersectObjects(targets, true).find((h) => h.object.isMesh && hoverShown(h.object));
          hovered = !!hit;
        }
        glow.amt = (glow.amt || 0) + ((hovered ? 0.2 : 0) - (glow.amt || 0)) * 0.25; // плавно: туда и обратно
        if (glow.amt < 0.005) glow.amt = 0;
        if (meshes) {
          tint(meshes, glow.amt);
          glow.reg = glow.reg || new Set();
          for (const m of meshes) {
            if (glow.reg.has(m)) continue;
            glow.reg.add(m);
            addHoverInfo(m, () => (glows.get(it) && glows.get(it).tinted ? hoverOf(it) : null));
          }
        }
      }
      // Плашка — только когда сеток нет
      const needPanel = DOOR_FALLBACK_PANELS && near && !(it.glowMeshes && meshes && meshes.length);
      if (needPanel && !glow.panel) glow.panel = makePanel(it);
      if (glow.panel) {
        glow.panel.visible = !!needPanel;
        if (needPanel) {
          const gy = insideBuilding() ? 0 : groundHeightAt(spot.x, spot.z, 9);
          if (it.glowKind === 'floor') glow.panel.position.set(spot.x, gy + 0.08, spot.z);
          else {
            glow.panel.position.set(spot.x, gy + 1.35, spot.z);
            camWorld.copy(camera.position);
            cityGroup.worldToLocal(camWorld);
            glow.panel.rotation.y = Math.atan2(camWorld.x - spot.x, camWorld.z - spot.z); // плашка лицом к камере
          }
          glow.panel.material.opacity = 0.3 + 0.18 * Math.sin(t * 2.6);
        }
      }
    }
  }

  // ---------- Карта ----------
  const origDrawMapView = drawMapView;
  drawMapView = function (ctx, W, H, cx, cz, mmScale, rot, ci, highlight) {
    origDrawMapView(ctx, W, H, cx, cz, mmScale, rot, ci, highlight);
    if (!settings.showPath || ci || !nav.path) return;
    const toScreen = (p) => {
      const dx = p.x - cx;
      const dz = p.z - cz;
      return { x: W / 2 + (dx * Math.cos(rot) + dz * Math.sin(rot)) * mmScale, y: H / 2 + (-dx * Math.sin(rot) + dz * Math.cos(rot)) * mmScale };
    };
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = DESIGN.css(DESIGN.color.path);
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    let first = true;
    const heads = [];
    let acc = 0;
    let prev = null;
    for (let i = 0; i < nav.path.length; i += 2) {
      const s = toScreen(nav.path[i]);
      if (first) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
      first = false;
      if (prev) {
        acc += Math.hypot(s.x - prev.x, s.y - prev.y);
        if (acc > 38) {
          heads.push({ x: s.x, y: s.y, a: Math.atan2(s.y - prev.y, s.x - prev.x) });
          acc = 0;
        }
      }
      prev = s;
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = DESIGN.css(DESIGN.color.path);
    for (const h of heads) {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.a);
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  // ---------- Цикл ----------
  let lastObject = 0;
  (function loop(t) {
    requestAnimationFrame(loop);
    const sec = t / 1000;
    try {
      updateNav();
      updateArrows(sec);
      if (t - lastObject > 250) {
        lastObject = t;
        objectTargets = settings.showObjects ? resolveObjects() : [];
      }
      updateMark(sec);
      updateDoors(sec);
    } catch (e) {
      console.warn('Подсказки по квесту:', e);
    }
  })(0);

  nav.frame = (sec) => {
    updateNav();
    updateArrows(sec);
    objectTargets = settings.showObjects ? resolveObjects() : [];
    updateMark(sec);
    updateDoors(sec);
  };
  nav.ray = glowRay; // луч наведения на двери и кнопки (для проверок: подменяют intersectObjects)
  window.questGuide = nav; // для отладки: путь, цель, nav.frame(секунды) — один кадр подсказок вручную
})();
