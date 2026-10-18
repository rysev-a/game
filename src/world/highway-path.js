// src/world/highway-path.js
// ОСЬ ТРАССЫ. Трасса идет вдоль оси X (z = 0), и почти вся геометрия мира привязана к этой прямой: заправки, съезды на трек и в
// лабораторию, торговый центр, города. Между ними трасса «сельская»: на двух участках (highwaySections) она вьется плавными
// дугами и идет по пологим холмам, а полотно широкое (две полосы и запас — на скорости 0,8 можно входить в поворот заносом).
// Остальное — прямая z = 0 на высоте 0 и обычной ширины (у заправок и съездов).
// Здесь только математика (без сцены), чтобы ее проверял тест (tests/highway.test.js); меши, кусты и высота земли — src/world/highway.js.
//
//   highwayZ(x)           — z оси трассы при данном x (0 на прямых участках); x всегда растет вдоль пути, трасса — график z(x)
//   highwayY(x)           — высота полотна
//   highwayHalfWidth(x)   — половина ширины полотна
//   highwayLength(xa, xb) — длина пути по оси между x = xa и x = xb (по горизонтали)
//   highwaySection(x)     — участок-кривая, на котором лежит x, или null
//   highwayChaseXs        — x пяти заграждений погони (места chase.b1…5, src/quests/places.js): стоят там, где дорога параллельна оси X и на земле
//
// Участок собирается из дуг радиуса highwayMinRadius: курс (угол пути к оси X, градусов) поочередно достигает набора крайних значений
// heads (до ±50°), между ними дорога идет по дуге, на стыках дуг кривизна сглажена. Набор подобран перебором: путь длиннее прямой
// при данных x1…x2 при радиусе не меньше highwayMinRadius. Холмы: между «нулями» (zeros и местами заграждений) высота — синус в
// квадрате, уклон не круче highwaySlopeMax. Ширина: на кривой highwayWide, плавно сходит к обычной на концах участка и у заграждений погони.
// Закреплены прямые ровные участки: заправки −1110, −700, −290, −140 (±32), торговый центр (±45), съезды на трек (−620) и в
// лабораторию (−330), город 1 (x ≥ 112); дорога от трассы к городам 3–6 входит в трассу под углом (city.js берет z у highwayZ).

const highwayMinRadius = 60; // радиус дуг, юнитов
const highwaySlopeMax = 0.065; // наибольший уклон холма
const highwaySections = [
  // x1…x2 — от заправки «Сосновка» до заправки «Лесная»; zeros: высота 0 (здесь стыкуется дорога к городам 3 и 5, x = −882)
  { x1: -1076, x2: -736, heads: [-50, 40.6, -40.6, 50], hillMax: 4, zeros: [-882] },
  // между съездом на трек и съездом в лабораторию; zeros: дорога к городам 4 и 6 (x = −432); chase: на трех переходах курса через ноль стоят заграждения
  { x1: -590, x2: -342, heads: [-30, 34, -34, 30], hillMax: 4, zeros: [-432], chase: true },
];
const highwayHalf = 3.5; // половина обычной ширины дороги на прямых (у заправок и съездов)
const highwayWide = 7.5; // половина ширины на кривой: две полосы и запас
const highwayRamp = 30; // на стольких юнитах от конца участка полотно сужается до обычного
const highwayShoulder = 1.8; // грунтовая обочина за полотном с каждой стороны; за ней — трава и насыпь

// Сглаженная кривизна и интегрирование курса: точки пути через каждые 0,5 юнита длины
function highwayIntegrate(heads) {
  const R = highwayMinRadius;
  const step = 0.5;
  const rad = (d) => (d * Math.PI) / 180;
  const arcs = [];
  let th = 0;
  for (const h of [...heads, 0]) {
    const d = rad(h) - th;
    arcs.push({ len: Math.abs(d) * R, k: Math.sign(d) / R });
    th = rad(h);
  }
  const total = arcs.reduce((a, b) => a + b.len, 0);
  const n = Math.ceil(total / step);
  const ds = total / n;
  // кривизна по дугам, потом скользящее среднее (окно 14 юнитов) — на стыках дуг руль меняется плавно
  // средняя кривизна каждой ячейки: дуги режутся по границам ячеек, поэтому курс в конце ровно ноль
  const k = new Array(n).fill(0);
  let from = 0;
  for (const arc of arcs) {
    const to = from + arc.len;
    for (let i = Math.floor(from / ds); i < n && i * ds < to; i++) {
      const overlap = Math.min(to, (i + 1) * ds) - Math.max(from, i * ds);
      if (overlap > 0) k[i] += (arc.k * overlap) / ds;
    }
    from = to;
  }
  const half = Math.round(7 / ds);
  const smooth = k.map((_, i) => {
    const w = Math.min(half, i, n - 1 - i); // у краев окно уже: кривизна не «вытекает» за концы участка
    let sum = 0;
    for (let j = i - w; j <= i + w; j++) sum += k[j];
    return sum / (2 * w + 1);
  });
  // курс в конце ровно ноль: остаток размазываем по всему участку (меньше процента кривизны)
  const rest = smooth.reduce((a, b) => a + b, 0) / n;
  for (let i = 0; i < n; i++) smooth[i] -= rest;
  let heading = 0;
  let x = 0;
  let z = 0;
  const raw = [{ x: 0, z: 0, s: 0, th: 0 }];
  for (let i = 0; i < n; i++) {
    const th2 = heading + smooth[i] * ds;
    const tm = (heading + th2) / 2;
    x += Math.cos(tm) * ds;
    z += Math.sin(tm) * ds;
    heading = th2;
    raw.push({ x, z, s: (i + 1) * ds, th: heading });
  }
  return raw;
}

function highwayBuildSection(sec) {
  // Сглаживание сдвигает конец пути по z: подбираем один из крайних курсов (средний) так, чтобы путь вернулся на ось (деление пополам)
  const j = sec.heads.length >> 1;
  const endZ = (delta) => {
    const heads = sec.heads.slice();
    heads[j] += delta;
    return highwayIntegrate(heads);
  };
  let lo = -8;
  let hi = 8;
  const zLo = endZ(lo);
  const sign = Math.sign(zLo[zLo.length - 1].z);
  for (let it = 0; it < 24; it++) {
    const mid = (lo + hi) / 2;
    const r = endZ(mid);
    if (Math.sign(r[r.length - 1].z) === sign) lo = mid;
    else hi = mid;
  }
  const raw = endZ((lo + hi) / 2);
  // Замыкание: растянуть по X до x2 − x1 и стянуть z к нулю на конце (поправка меньше градуса)
  const end = raw[raw.length - 1];
  const fx = (sec.x2 - sec.x1) / end.x;
  sec.pts = raw.map((p) => ({ x: sec.x1 + p.x * fx, z: p.z - (end.z * p.x) / end.x, s: 0, th: p.th }));
  sec.pts.forEach((p, i) => {
    p.s = i ? sec.pts[i - 1].s + Math.hypot(p.x - sec.pts[i - 1].x, p.z - sec.pts[i - 1].z) : 0;
  });
  sec.length = sec.pts[sec.pts.length - 1].s;
  // x переходов курса через ноль (там дорога параллельна оси X)
  sec.crossXs = [];
  for (let i = 1; i < raw.length; i++) {
    if (raw[i - 1].th * raw[i].th < 0 && sec.pts[i].x > sec.x1 + 10 && sec.pts[i].x < sec.x2 - 10) sec.crossXs.push(sec.pts[i].x);
  }
  // Холмы: «нули» — концы участка, zeros и (если chase) места заграждений, не ближе 14 друг к другу
  const zeroXs = [sec.x1, ...sec.zeros, ...(sec.chase ? sec.crossXs : []), sec.x2].sort((a, b) => a - b);
  const bounds = [zeroXs[0]];
  for (const v of zeroXs.slice(1)) {
    if (v - bounds[bounds.length - 1] >= 14) bounds.push(v);
    else if (v === sec.x2) bounds[bounds.length - 1] = v;
  }
  sec.hills = [];
  for (let i = 0; i + 1 < bounds.length; i++) {
    const len = bounds[i + 1] - bounds[i];
    sec.hills.push({ x1: bounds[i], x2: bounds[i + 1], h: Math.min(sec.hillMax, (highwaySlopeMax * len) / Math.PI) });
  }
}
highwaySections.forEach(highwayBuildSection);

// Места заграждений погони: первое и последнее — на прямых по краям, остальные — на переходах курса через ноль второго участка
const highwayChaseXs = [-600, ...highwaySections[1].crossXs, -320];

function highwaySection(x) {
  for (const sec of highwaySections) if (x > sec.x1 && x < sec.x2) return sec;
  return null;
}

// Индекс точки участка, левее которой лежит x (по x точки растут)
function highwayIndex(pts, x) {
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].x <= x) lo = mid;
    else hi = mid;
  }
  return lo;
}

function highwayZ(x) {
  const sec = highwaySection(x);
  if (!sec) return 0;
  const i = highwayIndex(sec.pts, x);
  const p = sec.pts[i];
  const q = sec.pts[i + 1];
  return p.z + ((q.z - p.z) * (x - p.x)) / (q.x - p.x);
}

function highwayY(x) {
  const sec = highwaySection(x);
  if (!sec) return 0;
  for (const hill of sec.hills) {
    if (x > hill.x1 && x < hill.x2) {
      const s = Math.sin((Math.PI * (x - hill.x1)) / (hill.x2 - hill.x1));
      return hill.h * s * s;
    }
  }
  return 0;
}

function highwayHalfWidth(x) {
  const sec = highwaySection(x);
  if (!sec) return highwayHalf;
  const smooth = (t) => {
    const u = Math.max(0, Math.min(1, t));
    return u * u * (3 - 2 * u);
  };
  let w = highwayHalf + (highwayWide - highwayHalf) * smooth((x - sec.x1) / highwayRamp) * smooth((sec.x2 - x) / highwayRamp);
  // у заграждений погони — обычная ширина: шиканы рассчитаны на нее
  if (sec.chase) {
    for (const cx of sec.crossXs) w = Math.min(w, highwayHalf + (w - highwayHalf) * smooth((Math.abs(x - cx) - 6) / 14));
  }
  return w;
}

// Грунтовая обочина за полотном: полной ширины на кривой, сходит на нет вместе с шириной полотна (у заграждений и на прямых ее нет)
function highwayVerge(x) {
  return highwayShoulder * Math.max(0, Math.min(1, (highwayHalfWidth(x) - highwayHalf) / (highwayWide - highwayHalf)));
}

// Длина пути по оси между x = xa и x = xb: прямая плюс добавка кривых (путь минус проекция на X)
function highwayExtra(x) {
  let extra = 0;
  for (const sec of highwaySections) {
    if (x >= sec.x2) extra += sec.length - (sec.x2 - sec.x1);
    else if (x > sec.x1) {
      const i = highwayIndex(sec.pts, x);
      extra += sec.pts[i].s - (sec.pts[i].x - sec.x1);
    }
  }
  return extra;
}
function highwayLength(xa, xb) {
  return xb - xa + highwayExtra(xb) - highwayExtra(xa);
}
