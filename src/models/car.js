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
//   car.updateCar(t, amp);     // вибрация корпуса: t — секунды, amp 0..1; заодно плавно двигает дверь
//   car.setDoor(true);         // распахнуть водительскую дверь (false — закрыть)
//
// Зависимость: глобальный THREE (three.js r128+).

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
    },
    options,
  );

  const edgeMat = new THREE.LineBasicMaterial({ color: o.edgeColor });

  function part(w, h, d, color) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    return mesh;
  }

  const root = new THREE.Group();
  const body = new THREE.Group(); // качается на ходу
  root.add(body);

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

  // Левая (водительская) дверь на шарнире у передней кромки проема. Закрытая — вровень с боком
  // кузова, открытая (setDoor(true)) — распахнута наружу влево
  let doorGroup = null;
  let doorOpen = 0; // 0 — закрыта, 1 — открыта (плавно догоняет doorTarget)
  let doorTarget = 0;
  if (o.door) {
    doorGroup = new THREE.Group();
    doorGroup.position.set(-0.98, 0.85, -0.3);
    const panel = part(0.05, 0.85, 1.1, o.bodyColor);
    panel.position.set(0, 0, 0.55);
    const glass = part(0.06, 0.36, 0.9, o.cabinColor);
    glass.position.set(0, 0.33, 0.55);
    doorGroup.add(panel);
    doorGroup.add(glass);
    body.add(doorGroup);
  }

  // Отличительные детали: полосы, багажник на крыше, номерные знаки
  if (o.stripeColor !== null) {
    const stripeMat = new THREE.MeshBasicMaterial({ color: o.stripeColor });
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
    const rackMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1e });
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
    const plateMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) });
    const plateGeo = new THREE.PlaneGeometry(0.62, 0.31);
    const front = new THREE.Mesh(plateGeo, plateMat);
    front.position.set(0, 0.5, -2.115);
    front.rotation.y = Math.PI; // лицом вперед (в -Z)
    body.add(front);
    const rear = new THREE.Mesh(plateGeo, plateMat);
    rear.position.set(0, 0.5, 2.115);
    body.add(rear);
  }

  // Колеса: цилиндр осью вдоль X внутри группы-ступицы, крутим группу
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14);
  const wheelMat = new THREE.MeshBasicMaterial({ color: o.wheelColor });
  const wheels = [];
  [
    [-1.05, -1.35],
    [1.05, -1.35],
    [-1.05, 1.45],
    [1.05, 1.45],
  ].forEach(([x, z]) => {
    const hub = new THREE.Group();
    hub.position.set(x, 0.38, z);
    const cyl = new THREE.Mesh(wheelGeo, wheelMat);
    cyl.rotation.z = Math.PI / 2;
    hub.add(cyl);
    root.add(hub);
    wheels.push(hub);
  });

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
