// sprites/shop.js
// Процедурный low-poly магазин: плоская крыша, витрины, полосатый навес
// и вывеска на крыше (текст рисуется на canvas).
//
// Подключение:
//   <script src="sprites/shop.js"></script>
// Использование:
//   const shop = createShop({ title: 'МАГАЗИН' });
//   // торговый центр: createShop({ width: 56, depth: 26, height: 9.5, doorWidth: 8,
//   //   signWidth: 22, signHeight: 5.5, title: 'ТОРГОВЫЙ ЦЕНТР' })  — с 7 м высоты видны 2 этажа
//   scene.add(shop);   // фасад с входом смотрит в +Z, центр основания в (0, 0, 0)
//
// Зависимость: глобальный THREE (three.js r128+).

function createShop(options = {}) {
  if (typeof THREE === 'undefined') {
    throw new Error('shop.js требует глобальный THREE');
  }

  const o = Object.assign(
    {
      width: 28,
      depth: 12,
      height: 5.5,
      title: 'МАГАЗИН',
      doorWidth: 4.2,
      signWidth: 12,
      signHeight: 3,
      wallColor: 0xe6dfcc,
      roofColor: 0x8c8c8c,
      glassColor: 0x2c5a78,
      doorColor: 0x1d3446,
      awningColors: [0xc43a3a, 0xf1ede2],
      signColor: 0xb02a2a,
      edgeColor: 0x111111,
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
  const { width: w, depth: d, height: h } = o;
  const front = d / 2;

  const body = part(w, h, d, o.wallColor);
  body.position.y = h / 2;
  root.add(body);

  // Плоская крыша с небольшим бортиком
  const roof = part(w + 0.6, 0.35, d + 0.6, o.roofColor);
  roof.position.y = h + 0.175;
  root.add(roof);

  // Двухэтажное здание: перекрытие между этажами и окна второго этажа
  if (h > 7) {
    const slab = part(w + 0.4, 0.3, d + 0.4, 0xc9c1ad);
    slab.position.y = 4.9;
    root.add(slab);
    const panels = Math.floor(w / 6);
    const pw = w / panels - 1.2;
    for (let i = 0; i < panels; i++) {
      const glass2 = part(pw, 1.9, 0.14, o.glassColor);
      glass2.position.set(-w / 2 + (w / panels) * (i + 0.5), 6.7, front + 0.03);
      root.add(glass2);
    }
  }

  // Витрины по бокам от входа и двойные двери по центру
  const doorW = o.doorWidth;
  const sideW = (w - doorW) / 2 - 1.6;
  [-1, 1].forEach((side) => {
    const glass = part(sideW, 2.4, 0.14, o.glassColor);
    glass.position.set(side * (doorW / 2 + 0.8 + sideW / 2), 1.7, front + 0.03);
    root.add(glass);
  });
  const door = part(doorW, 2.6, 0.14, o.doorColor);
  door.position.set(0, 1.4, front + 0.03);
  root.add(door);

  // Полосатый навес над входом
  const awningW = doorW + 6;
  const stripes = Math.round(awningW);
  const stripeW = awningW / stripes;
  for (let i = 0; i < stripes; i++) {
    const stripe = part(stripeW, 0.16, 2.2, o.awningColors[i % o.awningColors.length]);
    stripe.position.set(-awningW / 2 + stripeW * (i + 0.5), 3.5, front + 1.1);
    root.add(stripe);
  }

  // Вывеска на крыше, лицом к улице (+Z)
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = Math.round(512 * (o.signHeight / o.signWidth));
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#' + o.signColor.toString(16).padStart(6, '0');
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.strokeStyle = '#f1ede2';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, cv.width - 12, cv.height - 12);
  ctx.fillStyle = '#f1ede2';
  let fontSize = 76;
  ctx.font = 'bold ' + fontSize + 'px sans-serif';
  while (ctx.measureText(o.title).width > cv.width - 50 && fontSize > 20) {
    fontSize -= 4;
    ctx.font = 'bold ' + fontSize + 'px sans-serif';
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(o.title, cv.width / 2, cv.height / 2 + 4);
  const tex = new THREE.CanvasTexture(cv);

  const signW = o.signWidth;
  const signH = o.signHeight;
  const sign = part(signW, signH, 0.4, 0x222222);
  sign.position.set(0, h + 0.35 + signH / 2 + 0.4, front - 1);
  root.add(sign);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(signW - 0.2, signH - 0.2),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  face.position.set(0, sign.position.y, front - 1 + 0.22);
  root.add(face);

  // Две стойки под вывеской
  [-1, 1].forEach((side) => {
    const post = part(0.3, 0.8, 0.3, 0x333333);
    post.position.set(side * (signW / 2 - 1), h + 0.35 + 0.4, front - 1);
    root.add(post);
  });

  return root;
}
