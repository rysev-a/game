// src/models/house.js
// Процедурный low-poly дом со скошенной крышей в стиле игры:
// плоские цвета + темные контуры по ребрам.
//
// Подключение:
//   <script src="src/models/house.js"></script>
// Использование:
//   const house = createHouse({ wallColor: 0xd9c9a8, roof: 'gable' });
//   scene.add(house);   // фасад с дверью смотрит в +Z, центр основания в (0, 0, 0)
//
// Параметры:
//   width, depth, wallHeight — размеры стен (юниты)
//   roof        — 'gable' (двускатная) или 'hip' (четырехскатная)
//   ridgeAlongX — для 'gable': коньок вдоль X (иначе вдоль Z, фронтоном к улице)
//   floors      — 1 или 2 этажа: у двухэтажного окна в два ряда и пояс между этажами
//                 (wallHeight задавайте на оба этажа, например 7)
//   windows     — сколько окон в верхнем ряду (floors = 2)
//
// Зависимость: глобальный THREE (three.js r128+).

function createHouse(options = {}) {
  if (typeof THREE === 'undefined') {
    throw new Error('house.js требует глобальный THREE');
  }

  const o = Object.assign(
    {
      width: 7,
      depth: 6,
      wallHeight: 3.4,
      roofRise: 2.3,
      roofOverhang: 0.9,
      wallColor: 0xd9c9a8,
      roofColor: 0x8a3b2e,
      doorColor: 0x4a3826,
      windowColor: 0x1d2b3a,
      edgeColor: 0x111111,
      roof: 'gable',
      ridgeAlongX: true,
      floors: 1,
      windows: 4,
    },
    options,
  );

  const edgeMat = new THREE.LineBasicMaterial({ color: o.edgeColor });

  function withEdges(geo, color) {
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    return mesh;
  }

  function part(w, h, d, color) {
    return withEdges(new THREE.BoxGeometry(w, h, d), color);
  }

  const root = new THREE.Group();
  const { width: w, depth: d, wallHeight: wh, roofRise: rise } = o;

  const walls = part(w, wh, d, o.wallColor);
  walls.position.y = wh / 2;
  root.add(walls);

  // Фасад (+Z): дверь по центру и окна
  const door = part(1.3, 2.3, 0.12, o.doorColor);
  door.position.set(0, 1.15, d / 2 + 0.03);
  root.add(door);
  const groundWindows = o.floors > 1 ? [-0.38, -0.2, 0.2, 0.38] : [-0.3, 0.3];
  groundWindows.forEach((k) => {
    const win = part(1.0, 0.9, 0.12, o.windowColor);
    win.position.set(k * w, 1.9, d / 2 + 0.03);
    root.add(win);
  });

  // Второй этаж: ряд окон и пояс между этажами
  if (o.floors > 1) {
    const band = part(w + 0.15, 0.25, d + 0.15, 0xb9ab8e);
    band.position.y = wh / 2;
    root.add(band);
    for (let i = 0; i < o.windows; i++) {
      const win = part(1.2, 1.1, 0.12, o.windowColor);
      win.position.set(-w / 2 + (w * (i + 0.5)) / o.windows, wh * 0.74, d / 2 + 0.03);
      root.add(win);
    }
  }

  // Крыша
  let roof;
  if (o.roof === 'hip') {
    // Четырехскатная: пирамида из 4 граней со стороной 1, растянутая под размер дома
    const geo = new THREE.ConeGeometry(Math.SQRT1_2, rise, 4, 1);
    geo.rotateY(Math.PI / 4);
    roof = withEdges(geo, o.roofColor);
    roof.scale.set(w + o.roofOverhang * 2, 1, d + o.roofOverhang * 2);
    roof.position.y = wh + rise / 2;
  } else {
    // Двускатная: треугольная призма (профиль выдавлен вдоль коньковой балки)
    const span = (o.ridgeAlongX ? d : w) + o.roofOverhang * 2;
    const length = (o.ridgeAlongX ? w : d) + o.roofOverhang * 2;
    const shape = new THREE.Shape();
    shape.moveTo(-span / 2, 0);
    shape.lineTo(span / 2, 0);
    shape.lineTo(0, rise);
    shape.lineTo(-span / 2, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
    geo.translate(0, 0, -length / 2); // коньок вдоль Z
    if (o.ridgeAlongX) geo.rotateY(Math.PI / 2);
    roof = withEdges(geo, o.roofColor);
    roof.position.y = wh;
  }
  root.add(roof);

  // Труба на коньке
  const chimney = part(0.6, 1.4, 0.6, 0x5a4a44);
  chimney.position.set(o.ridgeAlongX ? w * 0.22 : 0, wh + rise * 0.6, o.ridgeAlongX ? 0 : d * 0.2);
  if (o.roof === 'hip') chimney.position.set(w * 0.2, wh + rise * 0.55, -d * 0.1);
  root.add(chimney);

  return root;
}
