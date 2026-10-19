// src/locations/shared/coords.js
// КООРДИНАТЫ ЛОКАЦИЙ. Трек, лаборатория и этажи башни — отдельные локации (у каждой свой небольшой мир, src/locations/shared/locations.js), чтобы большой мир и память браузера не раздувались. Координаты — одни и те же для страницы локации, для входов
// в основном мире (src/locations/entrances/entrances.js) и для мест квестов (src/content/places-locations.js), поэтому лежат здесь.
// Подключается сразу после src/engine/layout.js.

// Гоночный трек (location: 'track'): «Складки» — четыре змейки друг под другом, одна перетекает в другую (как в ДЕМО, src/demo/race.js), потом замыкающая дуга.
// Мир трека — круг радиусом 290 с центром (trackX, 200); подъездная дорога идет к нему с севера по оси trackX
const trackX = -620;
const trackZ = 300; // середина змеек по z
const trackLaneX1 = trackX + 120; // восточный край змеек (x)
const trackLaneX2 = trackX - 120; // западный край
const trackLaneZ = [216, 272, 328, 384]; // оси змеек по z (север → юг)
const trackLaneHalfW = [15, 14, 13, 12]; // полуширина полотна змейки: чем южнее, тем уже
const trackWave = { amp: 14, n: 2 }; // волна: амплитуда и число периодов на длину змейки; у всех змеек одна фаза по x, поэтому расстояние между ними постоянно
const trackStartX = trackX + 80; // линия старта и финиша на первой змейке, где дорога еще прямая

// Ось трека: замкнутая ломаная [{ x, z, hw, s }] с шагом около 2 юнитов (s — длина пути от начала), а также длина и s линии старта.
// Строится от первой змейки на запад (змейка 1 → разворот → змейка 2 на восток → … → змейка 4 → замыкающая дуга), а потом ось разворачивается: гонка идет по часовой
// стрелке: северная змейка на восток, замыкающая дуга вниз по восточной стороне, южная змейка на запад и дальше вверх по западным разворотам
function buildTrackPath() {
  const L = trackLaneX1 - trackLaneX2;
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  // смещение оси по z в точке x: у восточного края (первые 70) дорога прямая, у западного — 20
  const off = (x) => trackWave.amp * Math.sin((2 * Math.PI * trackWave.n * (x - trackLaneX2)) / L) * smooth((trackLaneX1 - 70 - x) / 45) * smooth((x - trackLaneX2 - 20) / 45);
  const pts = [];
  const push = (x, z, hw) => pts.push({ x, z, hw });
  const lane = (k, west) => {
    const hw = trackLaneHalfW[k];
    const n = Math.round(L / 2);
    for (let i = 0; i <= n; i++) {
      const x = west ? trackLaneX1 - (L * i) / n : trackLaneX2 + (L * i) / n;
      push(x, trackLaneZ[k] + off(x), hw);
    }
  };
  const turn = (k, eastSide) => {
    // полукруг из конца змейки k в начало змейки k + 1: центр между ними, ширина плавно меняется
    const zc = (trackLaneZ[k] + trackLaneZ[k + 1]) / 2;
    const r = (trackLaneZ[k + 1] - trackLaneZ[k]) / 2;
    const x0 = eastSide ? trackLaneX1 : trackLaneX2;
    const n = Math.round((Math.PI * r) / 2);
    for (let i = 1; i < n; i++) {
      const a = (Math.PI * i) / n;
      const hw = trackLaneHalfW[k] + ((trackLaneHalfW[k + 1] - trackLaneHalfW[k]) * i) / n;
      push(x0 + (eastSide ? 1 : -1) * r * Math.sin(a), zc - r * Math.cos(a), hw);
    }
  };
  lane(0, true);
  turn(0, false);
  lane(1, false);
  turn(1, true);
  lane(2, true);
  turn(2, false);
  lane(3, false);
  // замыкающая дуга: из конца змейки 4 на восток, на север и в начало змейки 1 (кубическая кривая Безье), ширина плавно растет до ширины змейки 1
  const p0 = { x: trackLaneX1, z: trackLaneZ[3] };
  const p3 = { x: trackLaneX1, z: trackLaneZ[0] };
  const reach = 100;
  const nb = 140;
  for (let i = 1; i < nb; i++) {
    const t = i / nb;
    const u = 1 - t;
    const x = u * u * u * p0.x + 3 * u * u * t * (p0.x + reach) + 3 * u * t * t * (p3.x + reach) + t * t * t * p3.x;
    const z = u * u * u * p0.z + 3 * u * u * t * p0.z + 3 * u * t * t * p3.z + t * t * t * p3.z;
    push(x, z, trackLaneHalfW[3] + (trackLaneHalfW[0] - trackLaneHalfW[3]) * t);
  }
  pts.reverse(); // гонка идет по часовой стрелке (если смотреть на карту): первая змейка — на восток, потом вниз по восточной дуге и обратно по нижним змейкам
  // накопленная длина пути
  let s = 0;
  pts[0].s = 0;
  for (let i = 1; i < pts.length; i++) {
    s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    pts[i].s = s;
  }
  const total = s + Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].z - pts[pts.length - 1].z);
  let start = pts[0];
  for (const p of pts) if (p.z < trackLaneZ[0] + 2 && Math.abs(p.x - trackStartX) < Math.abs(start.x - trackStartX)) start = p;
  return { pts, total, start };
}
const trackPath = buildTrackPath();
// Точка пути на расстоянии s от начала (по кругу)
function trackPointAt(s) {
  const { pts, total } = trackPath;
  s = ((s % total) + total) % total;
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].s <= s) lo = mid;
    else hi = mid;
  }
  const a = pts[lo];
  const b = pts[hi];
  const k = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
  return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, hw: a.hw + (b.hw - a.hw) * k, dx: b.x - a.x, dz: b.z - a.z };
}
// Восемь контрольных точек через равные промежутки после линии старта
const trackCheckpoints = Array.from({ length: 8 }, (_, i) => trackPointAt(trackPath.start.s + ((i + 1) * trackPath.total) / 9));

// Лаборатория (location: 'lab'): территория с воротами на севере и подвал дальше на юг
const labX = -330;
const labZ = 130;
const labHalfW = 30; // половина ширины главной территории
const labBasementZ1 = labZ + 80;
const labBasementZ2 = labZ + 200;
const labWallZ = labZ + 142; // внутренняя стена подвала: зал капсул — сборочный зал

// Башня в центре: сама башня стоит в основном мире (main), девять площадок-этажей — отдельная локация (location: 'tower')
const towerX = 70;
const towerZ = 70;
const towerFloorZ = 250;
const towerFloorX = (i) => -130 + (i - 1) * 38;

// Овраг с ручьем за домом бабушки в Заречье (src/locations/zarechye/grandma.js): тянется с востока от реки до забора мира. Он вырыт в земле, поэтому
// в земле (src/world/ground.js, src/world/world.js) для него оставлен прогал; ось овраги ravineZ и полуширина ravineHalf — общие числа
const ravineZ = 304; // южнее поселка Заречье: участок бабушки кончается за 8 юнитов до оврага (grandma.js проверяет это числом)
const ravineHalf = 4;
// Перемычка через овраг для машины: земляная насыпь с трубой для ручья, по ней идет тайная объездная дорога к домику Веры (grandma.js)
const ravineCross = { x1: 461, x2: 471 };
const ravineGap = { z1: ravineZ - ravineHalf - 1, z2: ravineZ + ravineHalf + 1, x1: riverX + riverHalf }; // восточнее реки земля не покрывает полосу оврага

// Локации: название, круглый мир (центр и радиус, src/locations/shared/locations.js) и точка, где окажется игрок, если локацию загрузили напрямую (?loc=)
const LOCATIONS = {
  main: { name: 'Мир' },
  track: { name: 'Гоночный трек', ...LOCATION_WORLDS.track, start: { x: trackX, z: 158, heading: Math.PI } },
  lab: { name: 'Лаборатория', ...LOCATION_WORLDS.lab, start: { x: labX, z: 90, heading: Math.PI } },
  tower: { name: 'Башня: этажи', ...LOCATION_WORLDS.tower, start: { x: towerFloorX(1) - 6, z: towerFloorZ, heading: -Math.PI / 2 } },
};
