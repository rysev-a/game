// src/models/car.js
// Процедурная low-poly машина в стиле игры: плоские цвета + темные контуры.
//
// Подключение:
//   <script src="src/models/car.js"></script>
// Использование:
//   const car = createCar({ bodyColor: 0xd07a2f });
//   // узнаваемая машина: createCar({ bodyColor: 0x1fb3a6, stripeColor: 0xffffff, roofRack: true, plateText: 'ДЕТ 001' })
//   scene.add(car);            // модель смотрит в -Z, длина ~4.2 юнита
//   car.spinWheels(dist);      // прокрутка колес на пройденную дистанцию
//   car.steerWheels(angle);    // поворот передних колес рулем, рад (плюс — налево)
//   car.updateCar(t, amp);     // вибрация корпуса: t — секунды, amp 0..1; заодно плавно двигает дверь
//   car.setDoor(true);         // распахнуть водительскую дверь (false — закрыть)
//   style: 'almera'            // Nissan Almera Classic (B10, 2006–2011): седан с узнаваемым профилем, решеткой с логотипом, большими фарами и фонарями
//
// Зависимость: глобальный THREE (three.js r128+).


// ТЕЛО NISSAN ALMERA CLASSIC (B10, 2006–2011). Пропорции сняты с настоящей 3D-модели (файл nissan-almera-classic_ModLandNet.usdz): профиль
// кузова по высоте капота, крыши и багажника, развал стекол, положение фар, зеркал и колес. Единица модели переведена в юниты игры: ALM = 0,0082
// (бампер до бампера 4,3), низ порога на высоте 0,32; перед в −Z. Кузов собран слоями: нижняя часть (ширина 1,62), салон уже (1,40, развал стенок),
// стекла полосой чуть шире салона, лобовое и заднее — наклонные пластины по скатам.
function buildAlmeraBody(body, o, part, edgeMat) {
  const ALM = 0.0082;
  const glassMat = new LitMaterial({ color: o.cabinColor });
  const chrome = 0xc8ced6;
  const black = 0x0e0f12;
  // Точка модели (z вперед, y вверх, в единицах оригинала) → точка игры [z, y]
  const P = (zm, ym) => [-(zm + 14.4) * ALM, (ym - 22) * ALM + 0.32];
  const Zg = (zm) => -(zm + 14.4) * ALM;
  const Yg = (ym) => (ym - 22) * ALM + 0.32;

  const extrude = (profile, width, color) => {
    const shape = new THREE.Shape();
    profile.forEach(([z, y], k) => (k ? shape.lineTo(z, y) : shape.moveTo(z, y)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
    geo.rotateY(-Math.PI / 2); // профиль в плоскости ZY, выдавливание — вдоль X
    geo.translate(width / 2, 0, 0);
    const mesh = new THREE.Mesh(geo, new LitMaterial({ color }));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), edgeMat));
    body.add(mesh);
    return mesh;
  };
  const put = (mesh, x, y, z, ry = 0, rx = 0) => {
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, 0);
    body.add(mesh);
    return mesh;
  };
  const basic = (w, h, d, color) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
  // Наклонная пластина между двумя точками профиля (лобовое и заднее стекло): ширина w, чуть выше поверхности
  const slab = (z1, y1, z2, y2, w, mat, lift = 0.012) => {
    const [a, b] = [P(z1, y1), P(z2, y2)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, len), mat);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); // наклон к горизонту
    m.position.set(0, (a[1] + b[1]) / 2 + lift, (a[0] + b[0]) / 2);
    m.rotation.x = Math.atan2(b[1] - a[1], a[0] - b[0]);
    body.add(m);
    return m;
  };

  // Нижняя часть: перед и капот, пояс по бокам, палуба багажника и зад
  extrude(
    [
      P(246, 24), P(248, 48), P(245, 70), P(233, 86), P(209, 92), P(185, 97), P(149, 103), P(113, 108), P(101, 110), // перед и капот до основания лобового
      P(60, 109), P(-140, 111), P(-175, 121), P(-199, 124), P(-235, 121), P(-261, 118), P(-271, 109), // пояс, палуба багажника
      P(-276, 80), P(-277, 44), P(-270, 24), // зад
    ],
    1.62,
    o.bodyColor,
  );
  // Салон: капсула от лобового до заднего стекла, чуть уже нижней части; крыша почти плоская, лобовое круче, заднее короче и круче
  extrude(
    [
      P(101, 108), P(101, 112), P(77, 125), P(53, 143), P(41, 150), P(17, 157.5), P(-7, 161), P(-31, 164.8), P(-67, 165.4), P(-103, 162.9),
      P(-127, 158.5), P(-151, 148.8), P(-175, 134.5), P(-190, 126), P(-190, 108),
    ],
    1.34,
    o.bodyColor,
  );
  // Боковые стекла: полоса шире салона, видна только по бокам; перед ней — наклон A-стойки, за ней — C-стойка
  extrude([P(66, 108), P(34, 150), P(-103, 160), P(-135, 153), P(-149, 147), P(-149, 112), P(-48, 109)], 1.4, o.cabinColor);
  // Лобовое и заднее стекла
  slab(101, 112.5, 30, 154, 1.28, glassMat);
  slab(-127, 157, -188, 128, 1.2, glassMat);
  // Стойки: B (между дверями) и по краям боковых стекол
  put(part(1.43, 0.46, 0.09, o.bodyColor), 0, Yg(130), Zg(-47));
  for (const sx of [-1, 1]) put(part(0.06, 0.4, 0.07, o.bodyColor), sx * 0.69, Yg(130), Zg(-150));
  // Стыки дверей и ручки на боку
  for (const sx of [-1, 1]) {
    for (const zm of [93, -48, -158]) put(basic(0.012, 0.5, 0.012, 0x1b1d22), sx * 0.812, Yg(70), Zg(zm));
    for (const zm of [20, -88]) put(basic(0.014, 0.025, 0.16, chrome), sx * 0.814, Yg(106), Zg(zm));
  }

  // Перед: решетка со значком, большие фары на крыльях, туманки, воздухозаборник
  put(basic(0.95, 0.2, 0.05, black), 0, Yg(64), Zg(247));
  put(basic(0.9, 0.05, 0.05, chrome), 0, Yg(70), Zg(248));
  put(basic(0.14, 0.14, 0.05, chrome), 0, Yg(66), Zg(250)); // значок
  put(basic(1.2, 0.13, 0.05, black), 0, Yg(40), Zg(246));
  for (const sx of [-1, 1]) {
    put(basic(0.62, 0.17, 0.07, 0x2a2d33), sx * 0.58, Yg(77), Zg(233), sx * 0.32); // оправа
    put(basic(0.56, 0.12, 0.08, o.lampColor), sx * 0.58, Yg(77), Zg(236), sx * 0.32); // фара: уходит на крыло
    put(basic(0.15, 0.09, 0.06, o.lampColor), sx * 0.62, Yg(38), Zg(247)); // туманка
  }
  // Зад: широкие фонари, фонари заднего хода, планка над номером, низ бампера
  for (const sx of [-1, 1]) {
    put(basic(0.5, 0.2, 0.07, 0xc0262c), sx * 0.58, Yg(96), Zg(-271), sx * -0.3);
    put(basic(0.13, 0.08, 0.06, 0xf4f4f4), sx * 0.3, Yg(96), Zg(-277));
  }
  put(basic(0.8, 0.05, 0.05, chrome), 0, Yg(98), Zg(-277));
  put(basic(1.4, 0.12, 0.05, black), 0, Yg(36), Zg(-276));
  // Зеркала: на стыке двери и стойки, чуть выше пояса
  for (const sx of [-1, 1]) put(part(0.16, 0.11, 0.2, o.bodyColor), sx * 0.86, Yg(112), Zg(58));
  // Колесные арки: темные диски на боку за колесами
  for (const sx of [-1, 1]) {
    for (const zm of [145, -152]) {
      const arch = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), new THREE.MeshBasicMaterial({ color: black, side: THREE.DoubleSide }));
      arch.position.set(sx * 0.812, 0.36, Zg(zm));
      arch.rotation.y = Math.PI / 2;
      body.add(arch);
    }
  }
}

function createCar(options = {}) {
  if (typeof THREE === 'undefined') {
    throw new Error('car.js требует глобальный THREE');
  }

  const o = Object.assign(
    {
      bodyColor: 0xd07a2f,
      cabinColor: 0x22384a,
      wheelColor: 0x151515,
      lampColor: 0xfff2b0,
      edgeColor: 0x111111,
      stripeColor: null, // цвет двух продольных полос по капоту, крыше и багажнику (null — без полос)
      roofRack: false, // багажник на крыше
      plateText: null, // номер на переднем и заднем бампере
      door: true, // левая (водительская) дверь, которую можно открыть: car.setDoor(true)
      style: null, // null — обычная легковушка из боксов; 'almera' — Nissan Almera Classic, машина героя
    },
    options,
  );

  const edgeMat = new THREE.LineBasicMaterial({ color: o.style === 'almera' ? 0x4a505c : o.edgeColor }); // у черной машины контур светлее, чтобы был виден

  function part(w, h, d, color) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, new LitMaterial({ color }));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    return mesh;
  }

  const root = new THREE.Group();
  const body = new THREE.Group(); // качается на ходу
  root.add(body);

  const almera = o.style === 'almera';
  if (almera) buildAlmeraBody(body, o, part, edgeMat);
  else {
    const hull = part(1.9, 0.55, 4.2, o.bodyColor);
    hull.position.y = 0.62;
    body.add(hull);

    const cabin = part(1.7, 0.55, 2.0, o.cabinColor);
    cabin.position.set(0, 1.15, 0.25); // салон чуть ближе к заду (перед — в -Z)
    body.add(cabin);

    const lampMat = new THREE.MeshBasicMaterial({ color: o.lampColor });
    [-0.6, 0.6].forEach((x) => {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.12), lampMat);
      lamp.position.set(x, 0.62, -2.14);
      body.add(lamp);
    });
  }

  // Левая (водительская) дверь на шарнире у передней кромки проема. Закрытая — вровень с боком
  // кузова, открытая (setDoor(true)) — распахнута наружу влево
  let doorGroup = null;
  let doorOpen = 0; // 0 — закрыта, 1 — открыта (плавно догоняет doorTarget)
  let doorTarget = 0;
  if (o.door) {
    doorGroup = new THREE.Group();
    doorGroup.position.set(almera ? -0.82 : -0.98, almera ? 0.73 : 0.85, almera ? -0.88 : -0.3);
    const panel = part(0.05, almera ? 0.62 : 0.85, almera ? 1.16 : 1.1, o.bodyColor);
    panel.position.set(0, 0, almera ? 0.58 : 0.55);
    const glass = part(0.06, almera ? 0.4 : 0.36, almera ? 1.0 : 0.9, o.cabinColor);
    glass.position.set(0, almera ? 0.5 : 0.33, almera ? 0.55 : 0.55);
    doorGroup.add(panel);
    doorGroup.add(glass);
    body.add(doorGroup);
  }

  // Отличительные детали: полосы, багажник на крыше, номерные знаки
  if (o.stripeColor !== null) {
    const stripeMat = new LitMaterial({ color: o.stripeColor });
    for (const x of [-0.2, 0.2]) {
      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 4.2), stripeMat);
      hood.position.set(x, 0.9, 0); // по капоту и багажнику (в середине закрыта салоном)
      body.add(hood);
      const roofStripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 2.0), stripeMat);
      roofStripe.position.set(x, 1.43, 0.25); // по крыше
      body.add(roofStripe);
    }
  }
  if (o.roofRack) {
    const rackMat = new LitMaterial({ color: 0x1a1a1e });
    for (const x of [-0.7, 0.7]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 1.8), rackMat);
      rail.position.set(x, 1.52, 0.25);
      body.add(rail);
    }
    for (const z of [-0.45, 0.25, 0.95]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.07), rackMat);
      bar.position.set(0, 1.55, z);
      body.add(bar);
    }
  }
  if (o.plateText) {
    const cv = document.createElement('canvas');
    cv.width = 128;
    cv.height = 64;
    const c = cv.getContext('2d');
    c.fillStyle = '#f4f1e6';
    c.fillRect(0, 0, 128, 64);
    c.strokeStyle = '#1a1a1e';
    c.lineWidth = 4;
    c.strokeRect(2, 2, 124, 60);
    c.fillStyle = '#1a1a1e';
    c.font = 'bold 30px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(o.plateText, 64, 34);
    const plateMat = new LitMaterial({ map: new THREE.CanvasTexture(cv) });
    const plateGeo = new THREE.PlaneGeometry(0.62, 0.31);
    const front = new THREE.Mesh(plateGeo, plateMat);
    front.position.set(0, almera ? 0.5 : 0.5, almera ? -2.19 : -2.115);
    front.rotation.y = Math.PI; // лицом вперед (в -Z)
    body.add(front);
    const rear = new THREE.Mesh(plateGeo, plateMat);
    rear.position.set(0, almera ? 0.72 : 0.5, almera ? 2.2 : 2.115);
    body.add(rear);
  }

  // Колеса: цилиндр осью вдоль X внутри группы-ступицы, крутим группу
  const wheelR = almera ? 0.34 : 0.38;
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, almera ? 0.24 : 0.3, 14);
  const wheelMat = new LitMaterial({ color: o.wheelColor });
  const wheels = [];
  const frontPivots = [];
  (almera
    ? [[-0.76, -1.19], [0.76, -1.19], [-0.76, 1.25], [0.76, 1.25]] // колесная база и колея по настоящей модели
    : [[-1.05, -1.35], [1.05, -1.35], [-1.05, 1.45], [1.05, 1.45]]
  ).forEach(([x, z]) => {
    const pivot = new THREE.Group(); // поворот руля — у передних колес (z < 0)
    pivot.position.set(x, wheelR, z);
    const hub = new THREE.Group();
    const cyl = new THREE.Mesh(wheelGeo, wheelMat);
    cyl.rotation.z = Math.PI / 2;
    hub.add(cyl);
    pivot.add(hub);
    root.add(pivot);
    wheels.push(hub);
    if (z < 0) frontPivots.push(pivot);
  });
  root.steerWheels = function (angle) {
    for (const p of frontPivots) p.rotation.y = angle; // плюс — налево
  };

  let wheelAngle = 0;
  root.spinWheels = function (distance) {
    wheelAngle -= distance / wheelR; // катим вперед (в -Z)
    for (const w of wheels) w.rotation.x = wheelAngle;
  };

  // Легкая вибрация корпуса на скорости
  root.setDoor = function (open) {
    doorTarget = open ? 1 : 0;
  };
  root.updateCar = function (t, amp = 0) {
    if (doorGroup) {
      doorOpen += (doorTarget - doorOpen) * 0.12;
      doorGroup.rotation.y = -1.25 * doorOpen; // наружу влево (отрицательный угол)
    }
    body.position.y = Math.sin(t * 22) * 0.02 * amp;
    body.rotation.z = Math.sin(t * 11) * 0.012 * amp;
  };

  return root;
}
