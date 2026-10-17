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
// Южнее, по продолжению продольной дороги, — гоночный комплекс; севернее — «Гран-при». Эти трассы уже (16)
// и с рельефом: высота — третья координата осевой линии (опорные точки сплайна или функция), полотно
// поднимается на насыпи с бетонными стенками, машина едет по высоте (groundHeightAt, src/player/driving.js):
//   6. «Холм» — через холм 8 метров, шпильки наверху
//   7. «Мост» — восьмерка с путепроводом 7 метров: одна ветка над другой
//   8. «Горки» — кольцо с тремя горбами: на скорости машина взлетает
//   9. «Трамплин» — быстрая трасса с трамплином на прямой
//   10. «Гран-при» — длинная трасса как настоящий автодром, пологие подъемы
//   11–17. «Змейки 1–7» — дрифт-полигон к западу от гоночного комплекса: широкая дорога (44 → 28) волнами туда и обратно
//   18–20. «Змейки 8–10» — самые узкие (26 → 22) и длинные, южнее «Гран-при»
//   21–30. «Фигуры» — к востоку от ДЕМО-площадки, по дороге на восток: скидпад, треугольник, ромб, буква L, зигзаг, подкова, гантель,
//           звезда, боб и цветок (разной формы и ширины 16–26)
// Все трассы — внутри круга мира (забор, src/engine/layout.js).
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

  // Замкнутая кривая по функции f(u) → [x, z] или [x, z, высота] (u от 0 до 1): точки через равные ~2 юнита пути
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
      const y = a.length > 2 ? Math.max(0, a[2] + (b[2] - a[2]) * t) : 0;
      pts.push({ x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, y });
    }
    return pts;
  };
  // Гладкое кольцо через опорные точки [x, z, высота] (сплайн Катмулла — Рома) — функция f(u) для closedCurve
  const spline = (ctrl) => (u) => {
    const n = ctrl.length;
    const f = u * n;
    const i = Math.floor(f) % n;
    const t = f - Math.floor(f);
    const [p0, p1, p2, p3] = [ctrl[(i - 1 + n) % n], ctrl[i], ctrl[(i + 1) % n], ctrl[(i + 2) % n]];
    return p1.map((_, c) => 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t * t +
      (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t * t * t));
  };
  const gauss = (d, w) => Math.exp(-((d / w) ** 2));
  const angDist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  const smooth01 = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  // Отрезок дороги (подъезд): точки через ~2 юнита
  const line = (x1, z1, x2, z2) => {
    const n = Math.max(1, Math.round(Math.hypot(x2 - x1, z2 - z1) / 2));
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push({ x: x1 + ((x2 - x1) * i) / n, z: z1 + ((z2 - z1) * i) / n, y: 0 });
    return pts;
  };

  // ---------- Дрифт-полигон: десять змеек ----------
  // Широкая дорога волнами (змейка) туда и обратно: вторая полоса — та же волна, сдвинутая в сторону, концы замыкают развороты
  // в полукруг. Ширина полотна — от 22 до 44 юнитов, наибольший угол пути — от ~20° (широкая пологая синусоида, два изгиба) до ~40° (узкий
  // зигзаг, девять изгибов); заданные в таблице угол и число волн — верхняя граница, итог подбирается (snakePts).
  // Для змейки задают ширину w, наибольший угол пути theta (градусов), число волн (полуволн) n и форму: 'sine' — плавная
  // синусоида, 'zig' — зигзаг с закругленными вершинами (длиннее прямые куски и резче углы). Чем шире дорога, тем плавнее она может
  // изгибаться: поэтому число волн и угол подбираются (snakePts) — снаружи поворота должен остаться радиус больше половины ширины,
  // иначе стенка из покрышек окажется на самой дороге. Расстояние между полосами — чтобы даже на самом крутом участке между
  // краями оставалось 14 юнитов.
  // Радиус поворота оси в точке i (по трем точкам через step), юнитов
  const minRadius = (raw, step = 4) => {
    let best = Infinity;
    for (let i = step; i < raw.length - step; i += 2) {
      const a = raw[i - step];
      const b = raw[i];
      const c = raw[i + step];
      const ab = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const bc = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const ca = Math.hypot(a[0] - c[0], a[1] - c[1]);
      const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
      if (area > 1e-6) best = Math.min(best, (ab * bc * ca) / (4 * area));
    }
    return best;
  };
  const snakeBuild = ({ w, theta, n, shape, span }) => {
    const th = (theta * Math.PI) / 180;
    const gap = Math.min(120, (w + 14) / Math.cos(th)); // расстояние между осями полос
    const L = span - gap - w; // длина волнистого участка
    const env = (s) => smooth01(s / 18) * smooth01((L - s) / 18); // у разворотов дорога идет ровно
    const wave1 = (s) => {
      const a = Math.sin((Math.PI * n * s) / L);
      return env(s) * (shape === 'zig' ? Math.asin(0.92 * a) / Math.asin(0.92) : a);
    };
    let peak = 0;
    for (let s = 0; s < L; s += 0.5) peak = Math.max(peak, Math.abs(wave1(s + 0.5) - wave1(s)) / 0.5);
    const amp = Math.tan(th) / peak; // амплитуда, при которой самый крутой участок идет под углом theta
    // Ось змейки в локальных координатах: x от 0 до L (западный край), z от -gap/2 (прямая полоса) до +gap/2 (обратная)
    const raw = [];
    const R = gap / 2;
    for (let s = 0; s <= L; s += 0.5) raw.push([s, -R + amp * wave1(s)]);
    const lane = raw.slice();
    for (let a = -Math.PI / 2; a < Math.PI / 2; a += 0.01) raw.push([L + R * Math.cos(a), R * Math.sin(a)]);
    for (let s = L; s >= 0; s -= 0.5) raw.push([s, R + amp * wave1(s)]);
    for (let a = Math.PI / 2; a < (3 * Math.PI) / 2; a += 0.01) raw.push([R * Math.cos(a), R * Math.sin(a)]);
    return { raw, gap, L, amp, theta, n, minR: minRadius(lane), height: 2 * amp + gap + w + 4 };
  };
  // Змейка с наибольшим числом волн (не больше n) при заданном угле; не получается — угол убавляем
  const snakePts = (spec) => {
    for (let theta = spec.theta; theta >= 10; theta -= 2) {
      for (let n = spec.n; n >= 1; n--) {
        const sn = snakeBuild({ ...spec, theta, n });
        if (sn.minR >= spec.w / 2 + 2.5) return sn;
      }
    }
    return snakeBuild({ ...spec, theta: 10, n: 1 });
  };
  // Две площадки. «Север» (к западу от подъездной дороги x = -790) — семь змеек, «юг» (южнее «Гран-при», к западу от продольной
  // дороги) — три самые узкие и самые длинные. Змейки ставятся друг под другом: восточным краем к дороге, разворотом к ней, а к
  // этому развороту — подъезд. Длина змейки (span) — по X от края до края полотна
  const driftRoadN = -790;
  const driftParks = [
    {
      roadX: driftRoadN, span: 480, maxSpan: 620, z0: -470, z1: 470, gapZ: 9,
      specs: [
        { id: 'snake1', name: 'Змейка 1 · Простор', w: 44, theta: 20, n: 6, shape: 'sine', desc: 'Самая широкая и самая пологая — для первого дрифта.' },
        { id: 'snake2', name: 'Змейка 2 · Широкая', w: 40, theta: 24, n: 7, shape: 'sine', desc: 'Широкая дорога и мягкие волны.' },
        { id: 'snake3', name: 'Змейка 3 · Ровная', w: 36, theta: 28, n: 7, shape: 'sine', desc: 'Ровная синусоида.' },
        { id: 'snake4', name: 'Змейка 4 · Плавная', w: 34, theta: 32, n: 8, shape: 'sine', desc: 'Плавные волны средней ширины.' },
        { id: 'snake5', name: 'Змейка 5 · Средняя', w: 32, theta: 36, n: 8, shape: 'sine', desc: 'Золотая середина: углы уже заметные.' },
        { id: 'snake6', name: 'Змейка 6 · Резкая', w: 30, theta: 40, n: 8, shape: 'zig', desc: 'Зигзаг: между поворотами — прямые куски.' },
        { id: 'snake7', name: 'Змейка 7 · Острая', w: 28, theta: 44, n: 9, shape: 'zig', desc: 'Острый зигзаг.' },
      ],
    },
    {
      roadX: -148, span: 640, maxSpan: 860, z0: 592, z1: 1000, gapZ: 12,
      specs: [
        { id: 'snake8', name: 'Змейка 8 · Крутая', w: 26, theta: 50, n: 12, shape: 'zig', desc: 'Длинный крутой зигзаг.' },
        { id: 'snake9', name: 'Змейка 9 · Шпильки', w: 24, theta: 55, n: 13, shape: 'zig', desc: 'Узкий зигзаг со шпильками.' },
        { id: 'snake10', name: 'Змейка 10 · Экстрим', w: 22, theta: 60, n: 15, shape: 'zig', desc: 'Самая узкая и самая крутая.' },
      ],
    },
  ];
  // Самый западный x, куда еще можно ставить змейку на высоте z: внутри круга мира с запасом 35 на забор и покрышки
  const westLimit = (z) => worldCenter.x - Math.sqrt(Math.max(0, (worldRadius - 35) ** 2 - z * z));
  const driftTracks = [];
  const driftSpurs = [];
  const driftRoads = [];
  for (const park of driftParks) {
    // Змейки — друг под другом, стопка по центру площадки. Длина (span) у каждой своя: чем дальше от середины по z, тем
    // ближе к забору ее западный край, поэтому длину подбираем по ряду, а ряды зависят от длин — несколько проходов
    const spans = park.specs.map(() => park.span);
    let built = [];
    let tops = [];
    for (let pass = 0; pass < 4; pass++) {
      built = park.specs.map((spec, i) => ({ spec, span: spans[i], sn: snakePts({ ...spec, span: spans[i] }) }));
      const total = built.reduce((acc, b) => acc + b.sn.height, 0) + park.gapZ * (built.length - 1);
      let zTop = (park.z0 + park.z1) / 2 - total / 2;
      tops = built.map((b) => {
        const top = zTop;
        zTop += b.sn.height + park.gapZ;
        return top;
      });
      built.forEach((b, i) => {
        const zFar = Math.max(Math.abs(tops[i]), Math.abs(tops[i] + b.sn.height));
        const avail = park.roadX - 20 - westLimit(zFar);
        spans[i] = Math.max(park.span * 0.8, Math.min(park.maxSpan, avail));
      });
    }
    built.forEach(({ spec, sn }, i) => {
      const zc = tops[i] + sn.height / 2;
      // Восточный край полотна — в 14 юнитах от края дороги (ее полуширина 6)
      const x0 = park.roadX - 6 - 14 - spec.w / 2 - sn.gap / 2 - sn.L;
      const pts = closedCurve((u) => {
        const p = sn.raw[Math.min(sn.raw.length - 1, Math.floor(u * sn.raw.length))];
        return [x0 + p[0], zc + p[1]];
      });
      driftTracks.push({
        id: spec.id, name: spec.name, start: 0.04, w: spec.w,
        desc: spec.desc + ' Ширина ' + spec.w + ', ' + sn.n + ' ' + (sn.n === 1 ? 'изгиб' : sn.n < 5 ? 'изгиба' : 'изгибов') + ' на полосе, наибольший угол пути ' + Math.round(sn.theta) + '°, самый тесный поворот — радиус ' + Math.round(sn.minR) + '.',
        pts, snake: sn, zc, x0,
      });
      // Подъезд — от дороги к крайней точке ближнего (восточного) разворота, по центру между полосами
      driftSpurs.push({ pts: line(park.roadX, zc, x0 + sn.L + sn.gap / 2, zc), w: 12 });
    });
    driftRoads.push({ pts: line(park.roadX, park.z0 - 10, park.roadX, park.z1 + 10), w: 12 });
  }

  // ---------- Дрифт-полигон «Фигуры»: десять трасс разной формы ----------
  // К востоку от ДЕМО-площадки (x от 160), по обе стороны дороги, что идет на восток от дороги площадки (z = 0), и вдоль продольной
  // дороги x = 360: слева — шесть фигур, справа — четыре. Форма — ломаная с закругленными углами (roundedPolygon), кривая по формуле
  // или сплайн; в каждую фигуру укладывается квадрат около 180 × 180. Подъезд — от дороги x = 360 к ближайшей к ней точке полотна.
  // Радиус поворота оси везде не меньше половины ширины + 2,5 (иначе стенка из покрышек окажется на самой дороге)
  const roundedPolygon = (verts, r) => {
    const n = verts.length;
    const out = [];
    const unit = (a, b) => {
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return [(b[0] - a[0]) / l, (b[1] - a[1]) / l, l];
    };
    const arcs = verts.map((cur, i) => {
      const prev = verts[(i - 1 + n) % n];
      const next = verts[(i + 1) % n];
      const [ax, az, al] = unit(cur, prev);
      const [bx, bz, bl] = unit(cur, next);
      const A = Math.acos(Math.max(-1, Math.min(1, ax * bx + az * bz)));
      const d = Math.min(r / Math.tan(A / 2), (al / 2) * 0.999, (bl / 2) * 0.999);
      const rr = d * Math.tan(A / 2);
      const bis = unit([0, 0], [ax + bx, az + bz]);
      const c = [cur[0] + bis[0] * (rr / Math.sin(A / 2)), cur[1] + bis[1] * (rr / Math.sin(A / 2))];
      const t1 = [cur[0] + ax * d, cur[1] + az * d];
      const t2 = [cur[0] + bx * d, cur[1] + bz * d];
      return { c, rr, a1: Math.atan2(t1[1] - c[1], t1[0] - c[0]), a2: Math.atan2(t2[1] - c[1], t2[0] - c[0]) };
    });
    arcs.forEach((a, i) => {
      let d = a.a2 - a.a1;
      d = Math.atan2(Math.sin(d), Math.cos(d)); // короткая дуга
      const steps = Math.max(2, Math.ceil((Math.abs(d) * a.rr) / 0.5));
      for (let k = 0; k <= steps; k++) out.push([a.c[0] + a.rr * Math.cos(a.a1 + (d * k) / steps), a.c[1] + a.rr * Math.sin(a.a1 + (d * k) / steps)]);
    });
    // Между дугами — прямые куски: добавляем промежуточные точки, чтобы линия была плотной (шаг 0,5)
    const dense = [];
    for (let i = 0; i < out.length; i++) {
      const a = out[i];
      const b = out[(i + 1) % out.length];
      const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.5));
      for (let k = 0; k < steps; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / steps, a[1] + ((b[1] - a[1]) * k) / steps]);
    }
    return dense;
  };
  const polar = (f) => {
    const raw = [];
    for (let i = 0; i < 4000; i++) {
      const a = (TAU * i) / 4000;
      const r = f(a);
      raw.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return raw;
  };
  const splineRaw = (ctrl) => {
    const f = spline(ctrl);
    const raw = [];
    for (let i = 0; i < 4000; i++) raw.push(f(i / 4000));
    return raw;
  };
  const SHAPES = [
    // [колонка (1 — слева от дороги x = 360, -1 — справа), ряд по z, id, название, ширина, описание, точки]
    [1, -543, 'shape_circle', 'Скидпад', 26, 'Кольцо для «бубликов»: можно кружить в дрифте бесконечно.', () => polar(() => 72)],
    [1, -327, 'shape_triangle', 'Треугольник', 20, 'Три закругленных угла: после каждого — прямая, на которой можно разогнаться.', () => roundedPolygon([[-78, 62], [78, 62], [0, -70]], 30)],
    [1, -111, 'shape_diamond', 'Ромб', 22, 'Четыре одинаковых поворота по 90°: хорошо отрабатывать вход в занос.', () => roundedPolygon([[0, -80], [80, 0], [0, 80], [-80, 0]], 26)],
    [1, 111, 'shape_l', 'Буква L', 20, 'Г-образная трасса: длинная прямая, поворот и вогнутый угол внутри.', () => roundedPolygon([[-78, -78], [0, -78], [0, 10], [78, 10], [78, 78], [-78, 78]], 24)],
    [1, 327, 'shape_s', 'Зигзаг', 18, 'Уступами: чередуются левые и правые повороты.', () => roundedPolygon([[-78, -78], [30, -78], [30, -20], [78, -20], [78, 78], [-30, 78], [-30, 20], [-78, 20]], 22)],
    [1, 543, 'shape_u', 'Подкова', 20, 'Кольцо вокруг П-образной вставки: две длинные параллельные прямые.', () => roundedPolygon([[-78, -78], [-28, -78], [-28, 28], [28, 28], [28, -78], [78, -78], [78, 78], [-78, 78]], 20)],
    [-1, -327, 'shape_dumbbell', 'Гантель', 18, 'Две площадки по краям и узкая перемычка посередине: два поворота подряд, потом проход в узкое место.', () => roundedPolygon([[-78, -56], [-32, -56], [-32, -20], [32, -20], [32, -56], [78, -56], [78, 56], [32, 56], [32, 20], [-32, 20], [-32, 56], [-78, 56]], 18)],
    [-1, -111, 'shape_star', 'Звезда', 16, 'Пять лепестков: поворот за поворотом, без передышки.', () => polar((a) => 66 + 8 * Math.cos(5 * a))],
    [-1, 111, 'shape_bean', 'Боб', 22, 'Сердцевидная форма: двойная вогнутая дуга сверху и острая нижняя часть.', () => roundedPolygon([[-78, -24], [-40, -62], [0, -34], [40, -62], [78, -24], [56, 62], [-56, 62]], 26)],
    [-1, 327, 'shape_flower', 'Цветок', 18, 'Четыре лепестка: длинные плавные дуги и впадины между ними.', () => polar((a) => 62 + 8 * Math.cos(4 * a))],
  ];
  const shapeRoadX = 360;
  const shapeTracks = [];
  const shapeSpurs = [];
  for (const [col, zc, id, name, w, desc, build] of SHAPES) {
    const raw = build();
    const hw = w / 2;
    let minx = Infinity;
    let maxx = -Infinity;
    let minz = Infinity;
    let maxz = -Infinity;
    for (const p of raw) {
      minx = Math.min(minx, p[0]);
      maxx = Math.max(maxx, p[0]);
      minz = Math.min(minz, p[1]);
      maxz = Math.max(maxz, p[1]);
    }
    // Колонка слева: внешний край полотна в 20 юнитах от дороги (ее полуширина 6, поребрик, покрышки); справа — зеркально
    const dx = col > 0 ? shapeRoadX - 6 - 14 - hw - maxx : shapeRoadX + 6 + 14 + hw - minx;
    const dz = zc - (minz + maxz) / 2;
    const pts = closedCurve((u) => {
      const p = raw[Math.min(raw.length - 1, Math.floor(u * raw.length))];
      return [p[0] + dx, p[1] + dz];
    });
    // Подъезд — от дороги к точке полотна, ближайшей к ней, ближе всего к середине фигуры по z
    let best = null;
    for (const p of raw) {
      const x = p[0] + dx;
      const z = p[1] + dz;
      const edge = col > 0 ? x : -x;
      if (!best || edge > best.edge + 0.5 || (Math.abs(edge - best.edge) <= 0.5 && Math.abs(z - zc) < Math.abs(best.z - zc))) best = { edge, x, z };
    }
    shapeSpurs.push({ pts: line(shapeRoadX, best.z, best.x, best.z), w: 12 });
    shapeTracks.push({
      id, name, start: 0, w,
      desc: desc + ' Ширина ' + w + ', длина круга около ' + Math.round(pts.length * 2) + '.',
      pts, rawShape: raw,
    });
  }
  const shapeRoads = [
    { pts: line(119, 0, shapeRoadX, 0), w: 12 }, // от дороги площадки на восток
    { pts: line(shapeRoadX, -580, shapeRoadX, 580), w: 12 }, // продольная дорога фигур
    ...shapeSpurs,
  ];

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
    // ---- Гоночный комплекс (южнее автодрома) и «Гран-при» (севернее): трассы уже (16), с подъемами и спусками ----
    {
      id: 'hill', name: 'Холм', start: 0, w: 16,
      desc: 'Трасса через холм высотой 8 метров: затяжной подъем, вершина с крутыми шпильками и спуск, где машина сама набирает скорость.',
      pts: closedCurve(spline([
        [-190, -300, 0], [-190, -400, 0], [-195, -490, 0], [-225, -535, 0], [-285, -535, 1], [-330, -512, 3], [-370, -525, 6],
        [-425, -530, 8], [-440, -480, 8], [-415, -440, 6], [-360, -430, 3], [-300, -455, 1], [-255, -420, 0], [-290, -375, 1],
        [-370, -370, 4], [-430, -340, 5], [-420, -290, 4], [-350, -282, 2], [-260, -282, 0],
      ])),
    },
    {
      id: 'bridge', name: 'Мост', start: 0.5, w: 16,
      desc: 'Восьмерка с путепроводом: одна ветка поднимается на мост высотой 7 метров и проходит над другой.',
      // Лемниската, вытянутая с севера на юг; перекресток при a = π/2 — там мост, при 3π/2 — проезд под ним
      pts: closedCurve((u) => {
        const a = TAU * u;
        return [-630 + 100 * Math.sin(2 * a), -410 + 132 * Math.cos(a), 7 * smooth01(1 - angDist(a, Math.PI / 2))];
      }),
    },
    {
      id: 'coaster', name: 'Горки', start: 0.08, w: 16,
      desc: 'Кольцо с тремя горбами по 5 метров: на скорости с вершины машина взлетает и приземляется на спуске.',
      pts: closedCurve((u) => {
        const a = TAU * u;
        const r = 108 + 14 * Math.sin(2 * a);
        let h = 0;
        for (const c of [Math.PI / 3, Math.PI, (5 * Math.PI) / 3]) h += 5 * gauss(angDist(a, c) * r, 30);
        return [-630 + r * Math.cos(a) * 1.1, -740 + r * Math.sin(a) * 1.15, h];
      }),
    },
    {
      id: 'jump', name: 'Трамплин', start: 0, w: 16,
      desc: 'Быстрая трасса с трамплином на западной прямой: разгонитесь — и машина пролетит несколько десятков метров.',
      pts: closedCurve(spline([
        [-190, -625, 0], [-190, -740, 0], [-195, -840, 0], [-235, -872, 0], [-300, -860, 0], [-350, -835, 0], [-410, -860, 0],
        [-440, -825, 0], [-440, -800, 0], [-440, -780, 1.4], [-440, -762, 3], [-440, -758, 0], [-440, -700, 0], [-415, -618, 0],
        [-360, -615, 0], [-320, -645, 0], [-270, -615, 0], [-225, -610, 0],
      ])),
    },
    {
      id: 'gp', name: 'Гран-при', start: 0.04, w: 16,
      desc: 'Длинная трасса как настоящий автодром: главная прямая, шпильки, связки поворотов для дрифта и пологие подъемы.',
      pts: closedCurve(spline([
        [-650, 300, 1], [-450, 300, 0], [-250, 300, 0], [-195, 325, 0], [-192, 385, 0], [-225, 425, 0], [-300, 395, 1],
        [-350, 350, 2], [-410, 360, 3], [-430, 425, 3], [-380, 465, 2], [-280, 465, 1], [-212, 483, 0], [-198, 515, 0], [-240, 537, 0],
        [-330, 535, 1], [-470, 530, 2], [-560, 495, 3], [-610, 445, 4], [-560, 395, 4], [-485, 370, 3], [-500, 330, 2],
        [-600, 340, 2], [-700, 375, 3], [-720, 445, 3], [-690, 485, 3], [-712, 528, 2], [-760, 520, 1], [-772, 465, 1],
        [-770, 345, 1], [-740, 307, 1],
      ])),
    },
    ...driftTracks,
    ...shapeTracks,
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
    { pts: line(spineX, -745, spineX, 385), w: 12 }, // продольная (на юг — к гоночному комплексу, на север — к «Гран-при»)
    { pts: line(spineX, -135, -160, -135), w: 12 }, // к восьмерке (ее восточный край)
    { pts: line(-400, -135, -404, -135), w: 12 }, // восьмерка → овал
    { pts: line(spineX, 20, -195, 20), w: 12 }, // к шикане
    { pts: line(-376, 20, -414, 20), w: 12 }, // шикана → серпантин
    { pts: line(spineX, 178, -262, 178), w: 12, color: 0x7a5a3a }, // к грунтовке
    // Гоночный комплекс: поперечная дорога на запад, дорога между столбцами трасс и подъезды
    { pts: line(spineX, -250, -640, -250), w: 12 },
    { pts: line(-475, -250, -475, -745), w: 12 },
    { pts: line(spineX, -400, -190, -400), w: 12 }, // к «Холму»
    { pts: line(-630, -250, -630, -279), w: 12 }, // к «Мосту»
    { pts: line(-475, -740, -497, -740), w: 12 }, // к «Горкам»
    { pts: line(spineX, -740, -190, -740), w: 12 }, // к «Трамплину»
    { pts: line(spineX, 385, -192, 385), w: 12 }, // к «Гран-при»
    // Дрифт-полигон: поперечная дорога на запад (от дороги на запад гоночного комплекса) к северной площадке, продолжение продольной дороги
    // на юг к южной площадке, их дороги и подъезды к змейкам
    { pts: line(-640, -250, driftRoadN, -250), w: 12 },
    { pts: line(spineX, 385, spineX, 1010), w: 12 },
    ...driftRoads,
    ...driftSpurs,
    // «Фигуры»: дорога на восток от площадки, продольная дорога и подъезды
    ...shapeRoads,
  ];

  // Все полотна — один список: осевая линия, полуширина, замкнута ли
  const surfaces = [
    ...TRACKS.map((t) => ({ pts: t.pts, hw: (t.w || trackW) / 2, closed: true, color: t.color || asphaltColor, track: t })),
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
  // Высота полотна под точкой (groundHeightAt, src/player/driving.js): из полотен, что под ней, — самое высокое, но не выше y + 1,5 (на мосту — мост,
  // под мостом — нижняя дорога). Вне полотна — земля (0). Считаем только по отрезкам, рядом с которыми точка лежит «сбоку» (проекция
  // внутри отрезка): иначе в круг попадали отрезки впереди по трассе, и на подъеме высота росла ступеньками — машина прыгала. Если сбоку
  // ничего нет (внешняя сторона поворота, конец дороги) — берем ближайший отрезок целиком
  groundHeightAt = (x, z, y = 0) => {
    let best = 0;
    let beside = false;
    let nearH = 0;
    let nearD = Infinity;
    for (const s of nearSegs(x, z)) {
      const d = segDist(x, z, s);
      if (d > s.hw + 0.3) continue;
      const dx = s.b.x - s.a.x;
      const dz = s.b.z - s.a.z;
      const raw = ((x - s.a.x) * dx + (z - s.a.z) * dz) / (dx * dx + dz * dz || 1);
      const t = Math.max(0, Math.min(1, raw));
      const h = s.a.y + (s.b.y - s.a.y) * t;
      if (h > y + 1.5) continue;
      if (raw >= 0 && raw <= 1) {
        beside = true;
        if (h > best) best = h;
      } else if (d < nearD) {
        nearD = d;
        nearH = h;
      }
    }
    return beside ? best : nearH;
  };

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
  const area4 = { x1: -1300, x2: -785, z1: -495, z2: 495 }; // дрифт-полигон, север
  const area5 = { x1: -830, x2: -120, z1: 575, z2: 1005 }; // дрифт-полигон, юг
  const area6 = { x1: 150, x2: 600, z1: -650, z2: 650 }; // дрифт-полигон «Фигуры»
  for (const [ar, id, name] of [[area4, 'driftpark', 'Дрифт-полигон'], [area5, 'driftpark_south', 'Дрифт-полигон: длинные змейки'], [area6, 'driftshapes', 'Дрифт-полигон: фигуры']]) {
    flatRect(ar.x2 - ar.x1, ar.z2 - ar.z1, 0x46703e, 0.005, (ar.x1 + ar.x2) / 2, (ar.z1 + ar.z2) / 2);
    mapObjects.push({ x: (ar.x1 + ar.x2) / 2, z: (ar.z1 + ar.z2) / 2, hx: (ar.x2 - ar.x1) / 2, hz: (ar.z2 - ar.z1) / 2, color: '#35583a', ground: true });
    registerZone(id, name, ar, { birds: 0.3 });
  }
  const area2 = { x1: -790, x2: -125, z1: -900, z2: -220 }; // гоночный комплекс
  const area3 = { x1: -790, x2: -125, z1: 270, z2: 560 }; // «Гран-при»
  flatRect(area3.x2 - area3.x1, area3.z2 - area3.z1, 0x46703e, 0.005, (area3.x1 + area3.x2) / 2, (area3.z1 + area3.z2) / 2);
  mapObjects.push({ x: (area3.x1 + area3.x2) / 2, z: (area3.z1 + area3.z2) / 2, hx: (area3.x2 - area3.x1) / 2, hz: (area3.z2 - area3.z1) / 2, color: '#35583a', ground: true });
  registerZone('grandprix', 'Гран-при', area3, { birds: 0.3 });
  flatRect(area2.x2 - area2.x1, area2.z2 - area2.z1, 0x46703e, 0.005, (area2.x1 + area2.x2) / 2, (area2.z1 + area2.z2) / 2);
  mapObjects.push({ x: (area2.x1 + area2.x2) / 2, z: (area2.z1 + area2.z2) / 2, hx: (area2.x2 - area2.x1) / 2, hz: (area2.z2 - area2.z1) / 2, color: '#35583a', ground: true });
  registerZone('circuits', 'Гоночный комплекс', area2, { birds: 0.3 });

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
      const y = p.y + (sf.track ? (k > n / 2 ? 0.02 : 0.016) : 0.012);
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

  // ---------- Насыпи и мост ----------
  // Где полотно поднято, по краям — бетонные стенки до земли (насыпь). Над другим полотном (мост «Моста») —
  // только кромка пролета толщиной 0,8, под ней проезд
  const skirtMat = new LitMaterial({ color: 0x8c8a84, side: THREE.DoubleSide });
  surfaces.forEach((sf, si) => {
    if (!sf.track || !sf.pts.some((p) => p.y > 0.05)) return;
    const n = sf.pts.length;
    for (const side of [-1, 1]) {
      const pos = [];
      const idx = [];
      for (let k = 0; k <= n; k++) {
        const i = k % n;
        const p = sf.pts[i];
        const { nx, nz } = normalAt(sf, i);
        const x = p.x + nx * side * sf.hw;
        const z = p.z + nz * side * sf.hw;
        const over = p.y > 1.5 && onOtherSurface(p.x, p.z, si, i, 0);
        pos.push(x, p.y + 0.02, z, x, over ? p.y - 0.8 : 0, z);
        const a = sf.pts[(i + 1) % n];
        if (k < n && (p.y > 0.05 || a.y > 0.05)) {
          const l = k * 2;
          idx.push(l, l + 1, l + 2, l + 1, l + 3, l + 2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, skirtMat);
      cityGroup.add(mesh);
      addHoverInfo(mesh, { kind: 'Автодром', name: 'Насыпь трассы «' + sf.track.name + '»', desc: 'Полотно поднято на насыпь: съехать с него можно только по трассе.' });
    }
    // Опоры моста: под краями пролета, где внизу другое полотно, — по паре колонн по бокам проезда
    for (let i = 0; i < n; i += 6) {
      const p = sf.pts[i];
      if (p.y < 3 || !onOtherSurface(p.x, p.z, si, i, 0)) continue;
      const { nx, nz } = normalAt(sf, i);
      for (const side of [-1, 1]) {
        const x = p.x + nx * side * (sf.hw - 0.6);
        const z = p.z + nz * side * (sf.hw - 0.6);
        if (onOtherSurface(x, z, si, i, 1.5)) continue; // на проезжей части внизу колонн нет
        const col = new THREE.Mesh(new THREE.BoxGeometry(1, p.y - 0.8, 1), skirtMat);
        col.position.set(x, (p.y - 0.8) / 2, z);
        cityGroup.add(col); // не препятствие: стенки задаются на плоскости, а по мосту над колонной едут
      }
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
          if (!onOtherSurface(cx, cz, si, i, 0.3)) curbs.push({ x: cx, z: cz, y: p.y, a: Math.atan2(tx, tz), red: i % 2 === 0 });
        }
        // Покрышки — сразу за краем, через одну точку (каждые ~2,2 юнита на прямой)
        const x = p.x + nx * side * (sf.hw + 0.9);
        const z = p.z + nz * side * (sf.hw + 0.9);
        if (!onOtherSurface(x, z, si, i, 1.2)) tires.push({ x, z, y: p.y, red: (i >> 1) % 2 === 0 });
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
    startLine.position.set(p.x, p.y + 0.03, p.z);
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
    m4.makeTranslation(t.x, t.y + 0.475, t.z);
    tireMesh.setMatrixAt(i, m4);
    tireMesh.setColorAt(i, t.red ? red : black);
    addObstacle({ x: t.x, z: t.z, hx: 0.5, hz: 0.5, bouncy: true }); // покрышки упругие: машина отскакивает
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
    at.set(c.x, c.y + 0.03, c.z);
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

  // Гоночный парк — севернее, на своей стоянке у продольной дороги: восемь машин с разной ездой
  // (VEHICLE_KINDS: gt, rally, muscle, drift, proto, kart, hyper — до 350 км/ч, bugatti — до 400). Садятся без ключей
  const pitZ = -88;
  flatRect(16, 57, 0x505054, 0.011, lotX, pitZ + 6.5);
  mapObjects.push({ x: lotX, z: pitZ + 6.5, hx: 8, hz: 28.5, color: '#56565c', ground: true });
  ['gt', 'rally', 'muscle', 'drift', 'proto', 'kart', 'hyper', 'bugatti'].forEach((id, i) => {
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
