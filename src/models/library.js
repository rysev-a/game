// src/models/library.js
// Процедурное здание библиотеки в стиле игры: старое двухэтажное здание из светлого камня,
// портик с колоннами и ступенями, треугольный фронтон, вывеска над входом.
//
// Подключение:
//   <script src="src/models/library.js"></script>   (после src/engine/buildings.js — нужен createSign)
// Использование:
//   const lib = createLibrary({ width: 22, depth: 16 });
//   scene.add(lib);   // фасад смотрит в +Z, центр основания (без портика) в (0, 0, 0)
//   lib.userData.fade — стены для затухания (src/engine/fade.js)
//
// Зависимость: глобальный THREE (three.js r128+).

function createLibrary(options = {}) {
  const o = Object.assign(
    {
      width: 22,
      depth: 16,
      height: 9,
      wallColor: 0xd8cfb8,
      trimColor: 0xf1ede2,
      roofColor: 0x5c5c60,
      windowColor: 0x1d2b3a,
      doorColor: 0x5a3a22,
      sign: 'БИБЛИОТЕКА',
      signSub: 'информационный центр',
    },
    options,
  );
  const { width: w, depth: d, height: h } = o;
  const root = new THREE.Group();
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111 });
  const part = (pw, ph, pd, color, x, y, z, parent = root) => {
    const geo = new THREE.BoxGeometry(pw, ph, pd);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  // Корпус: прозрачный материал, чтобы стены затухали, когда заслоняют игрока
  const wallMat = new THREE.MeshBasicMaterial({ color: o.wallColor, transparent: true });
  const lineMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true });
  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  const body = new THREE.Mesh(bodyGeo, wallMat);
  body.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), lineMat));
  body.position.y = h / 2;
  root.add(body);
  root.userData.fade = [{ mesh: body, mats: [wallMat, lineMat], half: [w / 2, h / 2, d / 2] }];

  // Цоколь, карниз между этажами и под крышей
  part(w + 0.4, 0.8, d + 0.4, 0xb9ab8e, 0, 0.4, 0);
  part(w + 0.3, 0.3, d + 0.3, o.trimColor, 0, h / 2, 0);
  part(w + 0.8, 0.6, d + 0.8, o.trimColor, 0, h + 0.3, 0);
  part(w * 0.9, 0.9, d * 0.85, o.roofColor, 0, h + 1.05, 0); // плоская кровля с парапетом

  // Высокие окна в два ряда на фасаде и по бокам
  const cols = 6;
  for (let i = 0; i < cols; i++) {
    const x = -w / 2 + (w * (i + 0.5)) / cols;
    if (Math.abs(x) < 3) continue; // в центре — портик
    for (const y of [2.4, 6.6]) {
      part(1.2, 2.0, 0.12, o.windowColor, x, y, d / 2 + 0.04);
      part(1.5, 0.2, 0.2, o.trimColor, x, y + 1.15, d / 2 + 0.08);
    }
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = -d / 2 + (d * (i + 0.5)) / 4;
      for (const y of [2.4, 6.6]) part(0.12, 2.0, 1.2, o.windowColor, side * (w / 2 + 0.04), y, z);
    }
  }

  // Портик: ступени, четыре колонны, антаблемент и фронтон
  const pw = 9;
  const pd = 3.2;
  const pz = d / 2 + pd / 2;
  for (let s = 0; s < 3; s++) part(pw + 1.6 - s * 0.5, 0.2, pd + 1.2 - s * 0.6, 0xc9c1b0, 0, 0.1 + s * 0.2, pz + 0.3 - s * 0.3);
  const colGeo = new THREE.CylinderGeometry(0.35, 0.42, h - 1.2, 8);
  [-3.6, -1.2, 1.2, 3.6].forEach((x) => {
    const col = new THREE.Mesh(colGeo, new THREE.MeshBasicMaterial({ color: o.trimColor }));
    col.add(new THREE.LineSegments(new THREE.EdgesGeometry(colGeo), edgeMat));
    col.position.set(x, 0.6 + (h - 1.2) / 2, pz + 0.6);
    root.add(col);
    part(0.9, 0.3, 0.9, o.trimColor, x, h - 0.45, pz + 0.6); // капитель
  });
  part(pw + 0.6, 0.8, pd + 0.4, o.trimColor, 0, h + 0.1, pz);
  {
    const shape = new THREE.Shape();
    shape.moveTo(-(pw + 0.6) / 2, 0);
    shape.lineTo((pw + 0.6) / 2, 0);
    shape.lineTo(0, 2.2);
    shape.lineTo(-(pw + 0.6) / 2, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: pd + 0.4, bevelEnabled: false });
    geo.translate(0, 0, -(pd + 0.4) / 2);
    const ped = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: o.trimColor }));
    ped.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    ped.position.set(0, h + 0.5, pz);
    root.add(ped);
  }
  // Двустворчатая дверь
  part(2.4, 3.4, 0.14, o.doorColor, 0, 0.6 + 1.7, d / 2 + 0.05);
  part(0.06, 3.3, 0.16, 0x2a1a10, 0, 0.6 + 1.7, d / 2 + 0.07);

  // Вывеска на антаблементе портика
  if (o.sign) {
    const sign = createSign(o.sign, { width: 8.8, height: 1.4, bg: '#2a3a5a', fg: '#f4e7c0', sub: o.signSub, font: 'serif' });
    sign.position.set(0, h + 0.1, pz + pd / 2 + 0.3);
    root.add(sign);
  }
  root.userData.porch = { x: 0, z: pz + 0.6, columns: [-3.6, -1.2, 1.2, 3.6] };
  return root;
}
