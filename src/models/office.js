// src/models/office.js
// Процедурное здание небольшой IT-компании: современная двухэтажная коробка, ленточные окна,
// стеклянный вход с козырьком, вывеска на фасаде, кондиционеры на крыше. Отдельно —
// дизельный генератор во дворе (createGenerator).
//
// Подключение:
//   <script src="src/models/office.js"></script>   (после src/engine/buildings.js — нужен createSign)
// Использование:
//   const office = createOffice({ width: 18, depth: 14 });
//   scene.add(office);   // фасад смотрит в +Z, центр основания в (0, 0, 0)
//   office.userData.fade — стены для затухания (src/engine/fade.js)
//
// Зависимость: глобальный THREE (three.js r128+).

function createOffice(options = {}) {
  const o = Object.assign(
    {
      width: 18,
      depth: 14,
      height: 8,
      wallColor: 0x5a6470,
      bandColor: 0x2b3a4a,
      accent: 0x3fa35b,
      sign: 'IT-КОМПАНИЯ',
      signSub: 'проекты на заказ',
    },
    options,
  );
  const { width: w, depth: d, height: h } = o;
  const root = new THREE.Group();
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111 });
  const part = (pw, ph, pd, color, x, y, z) => {
    const geo = new THREE.BoxGeometry(pw, ph, pd);
    const mesh = new THREE.Mesh(geo, new LitMaterial({ color }));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };

  const wallMat = new LitMaterial({ color: o.wallColor, transparent: true });
  const lineMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true });
  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  const body = new THREE.Mesh(bodyGeo, wallMat);
  body.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), lineMat));
  body.position.y = h / 2;
  root.add(body);
  root.userData.fade = [{ mesh: body, mats: [wallMat, lineMat], half: [w / 2, h / 2, d / 2] }];

  // Ленточные окна на каждом этаже (фасад и бока) — в некоторых горит свет
  for (const y of [2.2, 5.8]) {
    part(w - 1.2, 1.5, 0.12, o.bandColor, 0, y, d / 2 + 0.04);
    for (const side of [-1, 1]) part(0.12, 1.5, d - 1.2, o.bandColor, side * (w / 2 + 0.04), y, 0);
    for (let i = 0; i < 6; i++) {
      if (Math.random() < 0.5) continue;
      part(1.6, 1.2, 0.14, 0xe8d98a, -w / 2 + 1.8 + i * ((w - 3.6) / 5), y, d / 2 + 0.05);
    }
  }
  // Зеленая полоса фирменного цвета и плоская крыша
  part(w + 0.2, 0.35, d + 0.2, o.accent, 0, 4.0, 0);
  part(w + 0.4, 0.4, d + 0.4, 0x3a3f46, 0, h + 0.2, 0);
  part(2.2, 1.2, 1.6, 0xbfc4c8, -w / 4, h + 1.0, -d / 5); // кондиционеры
  part(2.2, 1.2, 1.6, 0xbfc4c8, w / 5, h + 1.0, -d / 4);
  part(0.15, 2.6, 0.15, 0x888888, w / 2 - 1.2, h + 1.7, -d / 2 + 1.2); // антенна

  // Вход: стеклянная дверь и козырек
  part(3.2, 2.6, 0.14, 0x7fb0c8, 0, 1.3, d / 2 + 0.06);
  part(0.08, 2.6, 0.16, 0x333333, 0, 1.3, d / 2 + 0.08);
  part(4.6, 0.25, 2.0, 0x3a3f46, 0, 3.0, d / 2 + 1.0);

  // Вывеска над козырьком, во всю ширину второго этажа
  if (o.sign) {
    const sign = createSign(o.sign, { width: 9, height: 1.5, bg: '#14202c', fg: '#7fe0a0', sub: o.signSub, border: '#3fa35b' });
    sign.position.set(0, h - 0.6, d / 2 + 0.2);
    root.add(sign);
  }
  return root;
}

// Дизельный генератор на бетонной площадке (в квестах 4.02 его заправляют дизелем с заправки)
function createGenerator() {
  const root = new THREE.Group();
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111 });
  const part = (pw, ph, pd, color, x, y, z) => {
    const geo = new THREE.BoxGeometry(pw, ph, pd);
    const mesh = new THREE.Mesh(geo, new LitMaterial({ color }));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };
  part(4.2, 0.2, 2.6, 0x8a8a88, 0, 0.1, 0);
  part(3.6, 1.6, 1.8, 0xe0c341, 0, 1.0, 0);
  part(3.62, 0.25, 1.82, 0x333333, 0, 1.85, 0);
  for (let i = 0; i < 5; i++) part(0.08, 0.9, 0.05, 0x333333, -1.2 + i * 0.3, 1.0, 0.93); // решетка
  part(0.3, 0.9, 0.3, 0x444444, 1.3, 2.4, -0.4); // выхлопная труба
  part(0.8, 0.5, 0.06, 0x14202c, 0.8, 1.2, 0.93); // панель
  return root;
}
