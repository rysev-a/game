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


// ТЕЛО NISSAN ALMERA CLASSIC (B10, 2006–2011): боковой профиль выдавлен по ширине кузова, отдельно стекла, решетка с логотипом, фары, фонари, зеркала.
// Профиль (z, y): капот ниже и длиннее, крутое лобовое, высокая ровная крыша, короткое заднее стекло, высокая палуба багажника — классический трехобъемный седан
function buildAlmeraBody(body, o, part, edgeMat) {
  const glassMat = new LitMaterial({ color: o.cabinColor });
  const chrome = 0xc8ced6;
  const black = 0x0e0f12;

  const extrude = (profile, width, color) => {
    const shape = new THREE.Shape();
    profile.forEach(([z, y], i) => (i ? shape.lineTo(z, y) : shape.moveTo(z, y)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
    geo.rotateY(-Math.PI / 2); // профиль в плоскости ZY, выдавливание — вдоль X
    geo.translate(width / 2, 0, 0);
    const mesh = new THREE.Mesh(geo, new LitMaterial({ color }));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
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

  // Кузов
  extrude(
    [
      [-2.1, 0.38], [-2.13, 0.52], [-2.07, 0.74], [-1.85, 0.84], [-1.25, 0.9], [-0.92, 0.94], // перед и капот
      [-0.1, 1.42], [0.08, 1.46], [0.95, 1.44], // лобовое и крыша
      [1.4, 1.08], [1.55, 1.04], [2.05, 1.03], // заднее стекло и палуба багажника
      [2.13, 0.86], [2.13, 0.46], [2.05, 0.38], // зад
    ],
    1.86,
    o.bodyColor,
  );
  // Боковые стекла: полоса шире кузова, видна только по бокам
  extrude([[-0.9, 0.99], [-0.14, 1.38], [0.1, 1.41], [0.9, 1.4], [1.38, 1.06], [1.38, 0.99]], 1.92, o.cabinColor);
  // Лобовое и заднее стекло: тонкие наклонные пластины по скатам
  put(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 0.9), glassMat), 0, 1.2, -0.5, 0, -0.52);
  put(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 0.74), glassMat), 0, 1.28, 1.17, 0, 0.6);
  // Стойки между стеклами
  for (const x of [-0.93, 0.93]) put(part(0.05, 0.42, 0.08, o.bodyColor), x, 1.2, 0.97);

  // Перед: решетка с хромированной планкой и логотипом, большие фары, туманки, нижняя воздухозаборная щель
  put(basic(1.1, 0.24, 0.05, black), 0, 0.68, -2.14);
  put(basic(1.0, 0.08, 0.05, chrome), 0, 0.72, -2.16);
  put(basic(0.16, 0.16, 0.05, chrome), 0, 0.72, -2.185); // логотип
  put(basic(1.3, 0.14, 0.05, black), 0, 0.46, -2.14);
  for (const sx of [-1, 1]) {
    put(basic(0.66, 0.2, 0.06, 0x2a2d33), sx * 0.66, 0.77, -2.1, sx * 0.22); // оправа фары
    put(basic(0.58, 0.15, 0.08, o.lampColor), sx * 0.66, 0.77, -2.12, sx * 0.22); // фара: большая, уходит на крыло
    put(basic(0.16, 0.1, 0.06, o.lampColor), sx * 0.72, 0.47, -2.13); // туманка
  }
  // Зад: широкие фонари, белые фонари заднего хода, хромированная планка над номером
  for (const sx of [-1, 1]) {
    put(basic(0.62, 0.2, 0.08, 0xc0262c), sx * 0.66, 0.9, 2.12, sx * -0.18);
    put(basic(0.14, 0.1, 0.06, 0xf4f4f4), sx * 0.34, 0.9, 2.15);
  }
  put(basic(0.8, 0.05, 0.05, chrome), 0, 0.96, 2.14);
  put(basic(1.4, 0.12, 0.05, black), 0, 0.45, 2.14); // нижняя часть заднего бампера
  // Боковые зеркала и ручки
  for (const sx of [-1, 1]) {
    put(part(0.13, 0.11, 0.22, o.bodyColor), sx * 1.0, 1.0, -0.62);
    put(basic(0.16, 0.035, 0.035, chrome), sx * 0.945, 0.9, 0.38);
    put(basic(0.16, 0.035, 0.035, chrome), sx * 0.945, 0.9, 1.0);
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
    doorGroup.position.set(almera ? -0.96 : -0.98, almera ? 0.72 : 0.85, almera ? -0.75 : -0.3);
    const panel = part(0.05, almera ? 0.55 : 0.85, almera ? 1.2 : 1.1, o.bodyColor);
    panel.position.set(0, 0, almera ? 0.6 : 0.55);
    const glass = part(0.06, almera ? 0.4 : 0.36, almera ? 1.0 : 0.9, o.cabinColor);
    glass.position.set(0, almera ? 0.46 : 0.33, almera ? 0.6 : 0.55);
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
    front.position.set(0, almera ? 0.52 : 0.5, almera ? -2.17 : -2.115);
    front.rotation.y = Math.PI; // лицом вперед (в -Z)
    body.add(front);
    const rear = new THREE.Mesh(plateGeo, plateMat);
    rear.position.set(0, almera ? 0.68 : 0.5, almera ? 2.17 : 2.115);
    body.add(rear);
  }

  // Колеса: цилиндр осью вдоль X внутри группы-ступицы, крутим группу
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14);
  const wheelMat = new LitMaterial({ color: o.wheelColor });
  const wheels = [];
  const frontPivots = [];
  [
    [-1.05, -1.35],
    [1.05, -1.35],
    [-1.05, 1.45],
    [1.05, 1.45],
  ].forEach(([x, z]) => {
    const pivot = new THREE.Group(); // поворот руля — у передних колес (z < 0)
    pivot.position.set(x, 0.38, z);
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
    wheelAngle -= distance / 0.38; // катим вперед (в -Z)
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
