// src/models/vehicles.js
// Процедурные low-poly модели транспорта для гоночного трека ДЕМО: гоночная машина, джип, трактор и БТР.
// Стиль — как у машины игрока (src/models/car.js): плоские цвета (LitMaterial) и темные контуры.
// Интерфейс у всех тот же, что у createCar, поэтому ими управляет обычное вождение (src/player/driving.js):
//
//   const m = createRaceCar({ bodyColor: 0xd8282a });   // createJeep, createTractor, createApc
//   m.spinWheels(dist);    // прокрутка колес на пройденную дистанцию (у каждого колеса свой радиус)
//   m.steerWheels(angle);  // поворот передних колес рулем, рад (плюс — налево)
//   m.updateCar(t, amp);   // вибрация корпуса: t — секунды, amp 0..1
//   m.setDoor(open);       // дверей нет: ничего не делает (нужно для совместимости)
//   m.userData.exhaust     // точка выхлопа (Object3D): отсюда идет дым подбитой машины
//
// Модель смотрит в -Z. Зависимость: глобальный THREE (three.js r128+) и LitMaterial (src/engine/materials.js).

function vehicleKit(options) {
  const edgeMat = new THREE.LineBasicMaterial({ color: options.edgeColor || 0x111111 });
  const root = new THREE.Group();
  const body = new THREE.Group(); // качается на ходу; колеса — отдельно, на root
  root.add(body);
  const wheels = [];

  // Деталь-коробка с контуром
  function part(w, h, d, color, parent = body) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, new LitMaterial({ color }));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    parent.add(mesh);
    return mesh;
  }

  // Призма: профиль (точки [z, y] по часовой) выдавлен по ширине w — скошенные носы, капоты, клинья
  function wedge(w, profile, color, parent = body) {
    const shape = new THREE.Shape();
    profile.forEach(([z, y], i) => (i ? shape.lineTo(z, y) : shape.moveTo(z, y)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
    geo.rotateY(-Math.PI / 2); // профиль в плоскости ZY, выдавливание — вдоль X
    geo.translate(w / 2, 0, 0);
    const mesh = new THREE.Mesh(geo, new LitMaterial({ color }));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    parent.add(mesh);
    return mesh;
  }

  // Колесо: шина и диск, ось вдоль X. Крутится группа-ступица
  function wheel(x, z, r, width, tireColor = 0x151515, hubColor = 0x8a8f96) {
    // pivot — поворот колеса рулем вокруг вертикали (передние, z < 0), hub внутри него — вращение вперед-назад
    const pivot = new THREE.Group();
    pivot.position.set(x, r, z);
    const hub = new THREE.Group();
    pivot.add(hub);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, width, 14), new LitMaterial({ color: tireColor }));
    tire.rotation.z = Math.PI / 2;
    hub.add(tire);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, width + 0.04, 8), new LitMaterial({ color: hubColor }));
    disc.rotation.z = Math.PI / 2;
    hub.add(disc);
    root.add(pivot);
    wheels.push({ hub, pivot, r, front: z < 0 });
    return hub;
  }

  // Фара или фонарь: светятся сами (MeshBasicMaterial)
  function lamp(x, y, z, color, w = 0.3, h = 0.16) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), new THREE.MeshBasicMaterial({ color }));
    m.position.set(x, y, z);
    body.add(m);
    return m;
  }

  let wheelTravel = 0;
  root.spinWheels = (distance) => {
    wheelTravel += distance;
    for (const w of wheels) w.hub.rotation.x = -wheelTravel / w.r; // катим вперед (в -Z)
  };
  // Передние колеса поворачиваются рулем: angle — рад, плюс — налево (updateCarMeshes, src/player/driving.js)
  root.steerWheels = (angle) => {
    for (const w of wheels) if (w.front) w.pivot.rotation.y = angle;
  };
  root.setDoor = () => {};
  root.updateCar = (t, amp = 0) => {
    body.position.y = Math.sin(t * (options.shakeRate || 22)) * (options.shake || 0.02) * amp;
    body.rotation.z = Math.sin(t * 11) * 0.012 * amp;
  };
  const exhaust = new THREE.Object3D();
  body.add(exhaust);
  root.userData.exhaust = exhaust;

  return { root, body, part, wedge, wheel, lamp, exhaust };
}

// ГОНОЧНАЯ МАШИНА: низкая, широкая, клиновидный нос, открытая кабина с дугой, переднее и заднее антикрылья,
// широкие задние колеса-слики
function createRaceCar(options = {}) {
  const o = Object.assign({ bodyColor: 0xd8282a, stripeColor: 0xf2f2f2, wingColor: 0x1b1b1f }, options);
  const k = vehicleKit({ shake: 0.012, shakeRate: 30 });
  // Корпус: середина и клин носа
  k.part(1.3, 0.42, 2.4, o.bodyColor).position.set(0, 0.42, 0.5);
  k.wedge(1.0, [[-0.7, 0.21], [-2.55, 0.08], [-2.55, 0.26], [-0.7, 0.63]], o.bodyColor);
  // Боковые понтоны с воздухозаборниками
  for (const x of [-0.78, 0.78]) {
    k.part(0.45, 0.36, 1.8, o.bodyColor).position.set(x, 0.38, 0.6);
    k.part(0.3, 0.2, 0.06, 0x111114).position.set(x, 0.44, -0.32);
  }
  // Белая полоса по оси
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 4.2), new LitMaterial({ color: o.stripeColor }));
  stripe.position.set(0, 0.645, -0.6);
  stripe.rotation.x = -0.035;
  k.body.add(stripe);
  // Открытая кабина: темный вырез, шлем пилота виден, дуга безопасности за ним
  k.part(0.62, 0.06, 0.9, 0x18181c).position.set(0, 0.65, 0.05);
  const helmet = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new LitMaterial({ color: 0xf2d23a }));
  helmet.position.set(0, 0.82, 0.25);
  k.body.add(helmet);
  k.part(0.5, 0.36, 0.14, o.wingColor).position.set(0, 0.85, 0.62);
  // Капот двигателя к заднему крылу
  k.wedge(0.7, [[0.65, 0.63], [0.65, 0.95], [1.9, 0.7], [1.9, 0.63]], o.bodyColor);
  // Переднее антикрыло
  k.part(1.9, 0.06, 0.45, o.wingColor).position.set(0, 0.16, -2.45);
  for (const x of [-0.95, 0.95]) k.part(0.05, 0.22, 0.5, o.wingColor).position.set(x, 0.2, -2.45);
  // Заднее антикрыло на двух стойках
  k.part(1.8, 0.07, 0.55, o.wingColor).position.set(0, 1.18, 2.05);
  for (const x of [-0.9, 0.9]) k.part(0.05, 0.42, 0.62, o.wingColor).position.set(x, 1.08, 2.05);
  for (const x of [-0.3, 0.3]) k.part(0.06, 0.5, 0.1, o.wingColor).position.set(x, 0.9, 1.95);
  // Стоп-сигнал
  k.lamp(0, 0.55, 2.12, 0xff3030, 0.2, 0.08);
  // Колеса: узкие передние, широкие задние; без крыльев — видны полностью
  k.wheel(-1.05, -1.55, 0.36, 0.34);
  k.wheel(1.05, -1.55, 0.36, 0.34);
  k.wheel(-1.08, 1.45, 0.42, 0.5);
  k.wheel(1.08, 1.45, 0.42, 0.5);
  k.exhaust.position.set(0, 0.6, 2.0);
  return k.root;
}

// ДЖИП: высокая посадка, большие колеса с зубастыми шинами, открытый верх с дугой, кенгурятник,
// запаска на задней двери и канистра
function createJeep(options = {}) {
  const o = Object.assign({ bodyColor: 0x5d6e3c, trimColor: 0x2a2c26 }, options);
  const k = vehicleKit({ shake: 0.03, shakeRate: 18 });
  k.part(1.95, 0.75, 4.0, o.bodyColor).position.set(0, 1.0, 0);
  // Капот чуть ниже, лобовое стекло наклонено
  k.part(1.8, 0.1, 1.4, o.bodyColor).position.set(0, 1.42, -1.25);
  const glass = k.part(1.8, 0.6, 0.06, 0x2c4a5e);
  glass.position.set(0, 1.68, -0.5);
  glass.rotation.x = -0.25;
  // Салон открытый: сиденья и дуга безопасности
  for (const x of [-0.45, 0.45]) {
    k.part(0.6, 0.5, 0.5, o.trimColor).position.set(x, 1.55, 0.15);
    k.part(0.6, 0.15, 0.6, o.trimColor).position.set(x, 1.4, 1.05);
  }
  const bar = new LitMaterial({ color: o.trimColor });
  for (const x of [-0.88, 0.88]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.85, 0.09), bar);
    post.position.set(x, 1.8, 0.75);
    k.body.add(post);
  }
  k.part(1.85, 0.09, 0.09, o.trimColor).position.set(0, 2.22, 0.75);
  // Кенгурятник и фары
  k.part(1.7, 0.1, 0.1, o.trimColor).position.set(0, 0.9, -2.15);
  for (const x of [-0.6, 0.6]) k.part(0.1, 0.55, 0.1, o.trimColor).position.set(x, 1.05, -2.15);
  for (const x of [-0.65, 0.65]) k.lamp(x, 1.15, -2.02, 0xfff2b0, 0.28, 0.22);
  for (const x of [-0.8, 0.8]) k.lamp(x, 1.05, 2.02, 0xd02020, 0.16, 0.16);
  // Запаска сзади и канистра
  const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.28, 14), new LitMaterial({ color: 0x151515 }));
  spare.rotation.x = Math.PI / 2;
  spare.position.set(0, 1.2, 2.15);
  k.body.add(spare);
  k.part(0.3, 0.45, 0.18, 0x8a2a1a).position.set(0.7, 1.55, 1.75);
  // Крылья над колесами
  for (const x of [-1.0, 1.0]) for (const z of [-1.35, 1.35]) k.part(0.3, 0.08, 1.15, o.trimColor).position.set(x, 1.38, z);
  k.wheel(-1.0, -1.35, 0.55, 0.42, 0x1a1a1a, 0x6a6e5a);
  k.wheel(1.0, -1.35, 0.55, 0.42, 0x1a1a1a, 0x6a6e5a);
  k.wheel(-1.0, 1.35, 0.55, 0.42, 0x1a1a1a, 0x6a6e5a);
  k.wheel(1.0, 1.35, 0.55, 0.42, 0x1a1a1a, 0x6a6e5a);
  k.exhaust.position.set(0.6, 0.7, 2.05);
  return k.root;
}

// ТРАКТОР: огромные задние колеса, маленькие передние, узкий капот с трубой выхлопа, кабина со стеклами
function createTractor(options = {}) {
  const o = Object.assign({ bodyColor: 0x2f8a3a, wheelHub: 0xe0c341, cabColor: 0x2f8a3a }, options);
  const k = vehicleKit({ shake: 0.035, shakeRate: 14 });
  // Рама и капот
  k.part(0.9, 0.5, 3.4, 0x2a2a2a).position.set(0, 0.75, -0.2);
  k.part(1.0, 0.8, 1.9, o.bodyColor).position.set(0, 1.35, -0.95);
  k.part(1.0, 0.5, 0.1, 0x1c1c1c).position.set(0, 1.3, -1.92); // решетка радиатора
  k.lamp(-0.3, 1.62, -1.93, 0xfff2b0, 0.2, 0.14);
  k.lamp(0.3, 1.62, -1.93, 0xfff2b0, 0.2, 0.14);
  // Выхлопная труба
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 8), new LitMaterial({ color: 0x2a2a2a }));
  pipe.position.set(0.32, 2.2, -1.2);
  k.body.add(pipe);
  k.exhaust.position.set(0.32, 2.75, -1.2);
  // Кабина: пол, крыша на стойках, стекла
  k.part(1.5, 0.12, 1.5, 0x2a2a2a).position.set(0, 1.25, 0.75);
  k.part(1.7, 0.1, 1.7, o.cabColor).position.set(0, 2.95, 0.75);
  const glassMat = new LitMaterial({ color: 0x9cc4d8, transparent: true, opacity: 0.55 });
  for (const x of [-0.72, 0.72]) {
    for (const z of [0.05, 1.45]) k.part(0.08, 1.65, 0.08, 0x1c1c1c).position.set(x, 2.1, z);
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 1.3), glassMat);
    side.position.set(x, 2.2, 0.75);
    k.body.add(side);
  }
  const front = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.04), glassMat);
  front.position.set(0, 2.2, 0.05);
  k.body.add(front);
  k.part(0.5, 0.45, 0.5, 0x1c1c1c).position.set(0, 1.55, 0.95); // сиденье
  // Крылья над задними колесами
  for (const x of [-0.95, 0.95]) k.part(0.65, 0.08, 1.9, o.bodyColor).position.set(x, 1.98, 0.85);
  // Сцепка сзади
  k.part(0.3, 0.15, 0.5, 0x2a2a2a).position.set(0, 0.6, 1.75);
  k.wheel(-0.75, -1.4, 0.48, 0.32, 0x151515, o.wheelHub);
  k.wheel(0.75, -1.4, 0.48, 0.32, 0x151515, o.wheelHub);
  k.wheel(-1.0, 0.85, 0.9, 0.55, 0x151515, o.wheelHub);
  k.wheel(1.0, 0.85, 0.9, 0.55, 0x151515, o.wheelHub);
  return k.root;
}

// БТР: длинный бронекорпус со скошенным носом и бортами, восемь колес, башенка с пулеметом, люки
function createApc(options = {}) {
  const o = Object.assign({ bodyColor: 0x55603e, darkColor: 0x3a4230 }, options);
  const k = vehicleKit({ shake: 0.02, shakeRate: 16 });
  // Корпус: нижняя часть, верх с наклонными бортами (клин по профилю — нос и корма скошены)
  k.part(2.5, 0.7, 5.6, o.bodyColor).position.set(0, 1.05, 0.1);
  k.wedge(2.5, [[-2.8, 0.7], [-3.2, 1.05], [-2.8, 1.4], [-1.6, 1.85], [2.7, 1.85], [3.0, 1.4], [3.0, 0.7]], o.bodyColor);
  // Бортовые наклонные листы
  for (const s of [-1, 1]) {
    const slope = k.part(0.08, 0.6, 5.0, o.bodyColor);
    slope.position.set(s * 1.18, 1.6, 0.35);
    slope.rotation.z = s * 0.35;
  }
  // Смотровые щели и фары
  k.part(1.4, 0.12, 0.05, 0x111111).position.set(0, 1.6, -2.42);
  for (const x of [-0.85, 0.85]) k.lamp(x, 1.2, -3.0, 0xfff2b0, 0.22, 0.14);
  // Люки на крыше
  for (const z of [-0.9, 1.4]) {
    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 10), new LitMaterial({ color: o.darkColor }));
    hatch.position.set(z < 0 ? -0.6 : 0.5, 1.89, z);
    k.body.add(hatch);
  }
  // Башенка с пулеметом
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.55, 8), new LitMaterial({ color: o.bodyColor }));
  turret.position.set(0, 2.12, 0.2);
  k.body.add(turret);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 8), new LitMaterial({ color: 0x1c1c1c }));
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 2.2, -1.0);
  k.body.add(barrel);
  // Ящики на корме и буксирные крюки
  k.part(0.7, 0.35, 0.5, o.darkColor).position.set(-0.7, 2.02, 2.2);
  k.part(0.7, 0.35, 0.5, o.darkColor).position.set(0.7, 2.02, 2.2);
  for (const x of [-0.8, 0.8]) k.part(0.15, 0.15, 0.25, 0x1c1c1c).position.set(x, 0.8, -3.0);
  // Восемь колес, по четыре с борта
  for (const z of [-2.1, -0.75, 0.75, 2.1]) {
    k.wheel(-1.32, z, 0.58, 0.42, 0x151515, o.darkColor);
    k.wheel(1.32, z, 0.58, 0.42, 0x151515, o.darkColor);
  }
  k.exhaust.position.set(1.0, 1.7, 2.6);
  return k.root;
}
