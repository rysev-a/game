// src/models/weapons.js
// Модели для боя: оружие в руке героя и манекены для тира.
//
//   const gun = createPulseLaserModel();   // импульсный лазер: ствол смотрит в -Z, рукоять в начале координат.
//                                          // gun.userData.glow — материалы катушек: их цвет меняется от нагрева
//   player.attach('handR', gun);           // в руку (src/models/person.js сам повернет ствол вдоль руки)
//   const d = createTrainingDummy({ armor: true });  // манекен на столбе, лицом в -Z, стоит на y = 0
//
// Зависимость: глобальный THREE (three.js r128+), LitMaterial (src/engine/materials.js).

// Деталь-коробка. Обычные детали освещаются (LitMaterial); светящиеся (glow: катушки, излучатель) —
// MeshBasicMaterial без контура: свет им не нужен
function weaponPart(g, w, h, d, color, x, y, z, { edges = true, glow = false } = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, glow ? new THREE.MeshBasicMaterial({ color }) : new LitMaterial({ color }));
  if (glow) edges = false;
  m.position.set(x, y, z);
  if (edges) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x111111 })));
  g.add(m);
  return m;
}

// Импульсный лазер: графитовый корпус, ствол с тремя светящимися катушками и излучателем на конце,
// сбоку — энергоячейка. Размер под руку человечка (кисть 0,17)
function createPulseLaserModel() {
  const g = new THREE.Group();
  const body = 0x2d3340;
  const metal = 0x8a96a8;
  weaponPart(g, 0.09, 0.2, 0.11, 0x1f232c, 0, -0.06, 0.02); // рукоять (в кулаке)
  weaponPart(g, 0.15, 0.15, 0.5, body, 0, 0.1, -0.12); // корпус
  weaponPart(g, 0.1, 0.05, 0.3, metal, 0, 0.2, -0.1); // планка сверху
  weaponPart(g, 0.08, 0.08, 0.32, metal, 0, 0.1, -0.52); // ствол
  // Энергоячейка сбоку: светится тем же цветом, что катушки
  const glow = [];
  const cell = weaponPart(g, 0.03, 0.07, 0.22, 0xff4a5a, 0.09, 0.1, -0.08, { glow: true });
  glow.push(cell.material);
  // Катушки на стволе
  for (let i = 0; i < 3; i++) {
    const coil = weaponPart(g, 0.11, 0.11, 0.035, 0xff4a5a, 0, 0.1, -0.42 - i * 0.08, { glow: true });
    glow.push(coil.material);
  }
  // Излучатель на конце ствола
  const tip = weaponPart(g, 0.1, 0.1, 0.04, 0xffd0d4, 0, 0.1, -0.7, { glow: true });
  glow.push(tip.material);
  g.userData.glow = glow;
  g.userData.muzzle = new THREE.Vector3(0, 0.1, -0.74);
  return g;
}

// Манекен для тира: столб на крестовине, мешок-туловище с мишенью на груди, перекладина-руки и голова.
// armor: true — туловище и голова в стальных пластинах с заклепками
function createTrainingDummy({ armor = false } = {}) {
  const g = new THREE.Group();
  const wood = 0x7a5a36;
  const sack = armor ? 0x7a8290 : 0xc9a85a;
  const dark = armor ? 0x4a505c : 0x9a7e3e;
  weaponPart(g, 1.2, 0.12, 0.2, wood, 0, 0.06, 0); // крестовина
  weaponPart(g, 0.2, 0.12, 1.2, wood, 0, 0.06, 0);
  weaponPart(g, 0.14, 1.2, 0.14, wood, 0, 0.6, 0); // столб
  weaponPart(g, 0.75, 0.95, 0.45, sack, 0, 1.55, 0); // туловище
  weaponPart(g, 1.5, 0.14, 0.14, wood, 0, 1.85, 0); // перекладина-руки
  weaponPart(g, 0.42, 0.42, 0.4, sack, 0, 2.27, 0); // голова
  weaponPart(g, 0.6, 0.08, 0.47, dark, 0, 1.12, 0); // пояс
  // Мишень на груди спереди и сзади: красное кольцо, белое, красный центр
  for (const side of [-1, 1]) {
    const z = side * 0.235;
    weaponPart(g, 0.44, 0.44, 0.01, 0xd03a2e, 0, 1.6, z, { edges: false });
    weaponPart(g, 0.28, 0.28, 0.012, 0xf2efe6, 0, 1.6, z + side * 0.002, { edges: false });
    weaponPart(g, 0.12, 0.12, 0.014, 0xd03a2e, 0, 1.6, z + side * 0.004, { edges: false });
  }
  if (armor) {
    // Пластины и заклепки
    for (const [x, y] of [[-0.3, 1.95], [0.3, 1.95], [-0.3, 1.18], [0.3, 1.18]]) {
      weaponPart(g, 0.06, 0.06, 0.5, 0xd8dce2, x, y, 0, { edges: false });
    }
    weaponPart(g, 0.82, 0.12, 0.5, 0x5a606c, 0, 2.02, 0);
    weaponPart(g, 0.46, 0.1, 0.44, 0x5a606c, 0, 2.45, 0);
  }
  return g;
}
