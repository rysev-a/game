// src/demo/race.js
// ДЕМО: ГОНОЧНЫЙ ТРЕК (docs/mechanics/demo.md#гоночный-трек). Северо-западнее дома героя, за дорогой, —
// кольцо-стадион: две прямые и два полукруга, по краям поребрики и стенки из покрышек. На стартовой прямой
// стоят четыре машины разных видов (VEHICLE_KINDS, src/world/vehicles.js): гоночная, джип, трактор и БТР.
// Садятся без ключей. Проехали через линию старта — пошел секундомер круга; круг засчитывается, только если
// машина побывала на дальней прямой. Из кольца на дорогу ведет выезд на юге.
//
// Гоночная машина на телефоне рулит наклоном телефона, пока она на треке (onRaceTrack, src/engine/gyro-steer.js).
// БТР уезжает с трека к вольеру лаборатории: там начинается испытание — из ворот выходят биосущества
// (их можно давить), а за ними роботы, которые быстро подбивают БТР.
// Подключается после src/demo/tutorial.js.

let onRaceTrack = () => false;
{
  const cx = -82; // центр стадиона
  const cz = -62;
  const R = 22; // радиус осевой линии в поворотах
  const L = 24; // половина длины прямых
  const W = 12; // ширина полотна
  const ri = R - W / 2;
  const ro = R + W / 2;
  const P = 4 * L + 2 * Math.PI * R; // длина осевой линии

  // Точка осевой линии по пройденному пути s (0..P): позиция, нормаль наружу и касательная.
  // Старт — юг восточной прямой, едут на север (против часовой стрелки на карте)
  const frame = (s) => {
    s = ((s % P) + P) % P;
    const arc = Math.PI * R;
    if (s < 2 * L) return { x: cx + R, z: cz + L - s, nx: 1, nz: 0, tx: 0, tz: -1 };
    s -= 2 * L;
    if (s < arc) {
      const a = s / R;
      return { x: cx + R * Math.cos(a), z: cz - L - R * Math.sin(a), nx: Math.cos(a), nz: -Math.sin(a), tx: -Math.sin(a), tz: -Math.cos(a) };
    }
    s -= arc;
    if (s < 2 * L) return { x: cx - R, z: cz - L + s, nx: -1, nz: 0, tx: 0, tz: 1 };
    s -= 2 * L;
    const a = s / R;
    return { x: cx - R * Math.cos(a), z: cz + L + R * Math.sin(a), nx: -Math.cos(a), nz: Math.sin(a), tx: Math.sin(a), tz: Math.cos(a) };
  };
  // Насколько точка далеко от оси стадиона (отрезка между центрами поворотов)
  const radial = (x, z) => Math.hypot(x - cx, z - Math.max(cz - L, Math.min(cz + L, z)));
  onRaceTrack = (x, z) => {
    const d = radial(x, z);
    return d > ri - 1.5 && d < ro + 1.5;
  };

  // ---------- Полотно ----------
  // Стадион с дыркой: в плоскости XY (y = −z), потом кладем на землю
  const stadium = (r, hole) => {
    const sh = hole ? new THREE.Path() : new THREE.Shape();
    sh.absarc(cx, -(cz + L), r, Math.PI, 2 * Math.PI, false); // юг
    sh.lineTo(cx + r, -(cz - L));
    sh.absarc(cx, -(cz - L), r, 0, Math.PI, false); // север
    sh.lineTo(cx - r, -(cz + L));
    return sh;
  };
  const outer = stadium(ro, false);
  outer.holes.push(stadium(ri, true));
  const asphalt = new THREE.Mesh(new THREE.ShapeGeometry(outer, 24), new LitMaterial({ color: 0x404044, side: THREE.DoubleSide }));
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.y = 0.014;
  cityGroup.add(asphalt);
  addHoverInfo(asphalt, {
    kind: 'ДЕМО',
    name: 'Гоночный трек',
    desc: 'Кольцо с четырьмя машинами на старте: гоночная, джип, трактор и БТР. Линия старта запускает секундомер круга. На телефоне гоночная машина на треке рулит наклоном телефона.',
  });
  // Карта: полотно — цепочка квадратов по осевой линии
  for (let s = 0; s < P; s += 4) {
    const f = frame(s);
    mapObjects.push({ x: f.x, z: f.z, hx: W / 2, hz: W / 2, color: '#56565c', ground: true });
  }

  // Поребрики: красно-белые полоски по обоим краям
  const curbMats = [new LitMaterial({ color: 0xc8302a }), new LitMaterial({ color: 0xeeeeee })];
  const curbGeo = new THREE.PlaneGeometry(0.8, 2.05);
  let k = 0;
  for (let s = 0; s < P; s += 2, k++) {
    const f = frame(s + 1);
    for (const off of [-(W / 2 - 0.4), W / 2 - 0.4]) {
      const m = new THREE.Mesh(curbGeo, curbMats[k % 2]);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = Math.atan2(-f.tx, -f.tz); // длинной стороной вдоль трассы
      m.position.set(f.x + f.nx * off, 0.018, f.z + f.nz * off);
      cityGroup.add(m);
    }
  }

  // Линия старта: шашечки поперек восточной прямой
  {
    const cv = document.createElement('canvas');
    cv.width = 96;
    cv.height = 16;
    const g = cv.getContext('2d');
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 2; j++) {
        g.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f4';
        g.fillRect(i * 8, j * 8, 8, 8);
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(W, 1.6), new LitMaterial({ map: tex, side: THREE.DoubleSide }));
    line.rotation.x = -Math.PI / 2;
    line.position.set(cx + R, 0.02, cz);
    cityGroup.add(line);
  }

  // Стенки из покрышек по внешнему и внутреннему краю. В внешней на юге — выезд к дороге
  const exitHalf = 6;
  const tires = [];
  const tireStep = 1.7;
  for (const [off, step] of [[W / 2 + 0.8, tireStep], [-(W / 2 + 0.8), tireStep * 0.9]]) {
    const n = Math.round((2 * Math.PI * (R + off) + 4 * L) / step);
    for (let i = 0; i < n; i++) {
      // Покрышки идут по своей линии: длина пути по ней в поворотах другая, поэтому шаг пересчитываем
      const f = frame((i / n) * P);
      const x = f.x + f.nx * off;
      const z = f.z + f.nz * off;
      if (off > 0 && z > cz + L && Math.abs(x - cx) < exitHalf) continue; // выезд
      tires.push({ x, z, red: i % 2 === 0 });
    }
  }
  const tireGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.95, 10);
  const tireMesh = new THREE.InstancedMesh(tireGeo, new LitMaterial({ color: 0xffffff }), tires.length);
  const tm = new THREE.Matrix4();
  const black = new THREE.Color(0x1c1c1e);
  const red = new THREE.Color(0xb83a2e);
  tires.forEach((t, i) => {
    tm.makeTranslation(t.x, 0.475, t.z);
    tireMesh.setMatrixAt(i, tm);
    tireMesh.setColorAt(i, t.red ? red : black);
    addObstacle({ x: t.x, z: t.z, hx: 0.5, hz: 0.5 });
  });
  tireMesh.instanceMatrix.needsUpdate = true;
  tireMesh.instanceColor.needsUpdate = true;
  cityGroup.add(tireMesh);
  addHoverInfo(tireMesh, { kind: 'ДЕМО', name: 'Стенка из покрышек', desc: 'Ограждение трека. Выезд к дороге — на юге кольца.' });

  // Выезд: асфальт от кольца до дороги
  const exitZ1 = cz + L + ro - 0.5;
  flatRect(exitHalf * 2 - 1, -3.5 - exitZ1, 0x404044, 0.013, cx, (exitZ1 - 3.5) / 2);
  mapObjects.push({ x: cx, z: (exitZ1 - 3.5) / 2, hx: exitHalf - 0.5, hz: (-3.5 - exitZ1) / 2, color: '#56565c', ground: true });

  // ---------- Машины на старте ----------
  // Два ряда за линией старта, носом на север (по ходу)
  const sx = cx + R;
  addVehicle('race', sx - 2.8, cz + 6, 0, { open: true });
  addVehicle('jeep', sx + 2.8, cz + 6, 0, { open: true });
  addVehicle('tractor', sx - 2.8, cz + 14, 0, { open: true });
  addVehicle('apc', sx + 2.6, cz + 15, 0, { open: true });

  // ---------- Секундомер круга ----------
  const lap = { car: null, started: 0, half: false, best: {}, lastZ: 0 };
  const fmt = (ms) => {
    const s = ms / 1000;
    return Math.floor(s / 60) + ':' + (s % 60).toFixed(1).padStart(4, '0').replace('.', ',');
  };
  demoUpdates.push(() => {
    const car = drivingCar;
    if (!car || !car.kind || !onRaceTrack(car.x, car.z)) {
      if (lap.car && car !== lap.car) lap.car = null; // вышли из машины — круг сброшен
      if (car) lap.lastZ = car.z;
      return;
    }
    if (lap.car !== car) {
      lap.car = car;
      lap.started = 0;
      lap.half = false;
      lap.lastZ = car.z;
    }
    if (car.x < cx - ri) lap.half = true; // на дальней (западной) прямой
    // Линия старта: восточная прямая, z = cz, едем на север (z уменьшается)
    const crossed = lap.lastZ > cz && car.z <= cz && car.x > cx + ri - 1 && car.x < cx + ro + 1;
    lap.lastZ = car.z;
    if (!crossed) return;
    const now = performance.now();
    const id = car.kind.id;
    if (lap.started && lap.half) {
      const t = now - lap.started;
      const best = lap.best[id];
      const record = !best || t < best;
      if (record) lap.best[id] = t;
      showToast(car.kind.name + ': круг ' + fmt(t) + (record ? (best ? ' — новый рекорд!' : '') : ' · лучший ' + fmt(best)), 4500);
    } else if (!lap.started) showToast('Круг пошел! Секундомер остановится на этой линии', 3000);
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
      if (performance.now() - trialToldAt > 60000 && Math.hypot(car.x - (cx + R), car.z - cz) < 30) {
        trialToldAt = performance.now();
        showToast('БТР: давит биосуществ. Езжайте к вольеру лаборатории на юго-востоке — там его испытание', 6000);
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
