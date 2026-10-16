// src/models/weapons.js
// Модели для боя: оружие в руке героя и манекены для тира.
//
//   const gun = createPulseLaserModel();   // импульсный лазер-винтовка: ствол смотрит в -Z, приклад в начале координат.
//                                          // gun.userData.glow — светящиеся детали: их цвет меняется от нагрева
//   player.attach('rifle', gun);           // к груди, приклад у правого плеча; руки — player.setAim('rifle')
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

// Импульсный лазер — винтовка, держат двумя руками. Начало координат — торец приклада (у плеча),
// ствол смотрит в -Z, длина ~1,55. Пистолетная рукоять под правую кисть (z ≈ −0,44), цевье под левую
// (z ≈ −0,7) — туда тянутся руки в позе setAim('rifle') (src/models/person.js). На стволе четыре голубые
// катушки и излучатель, сбоку энергоячейка, сверху прицел. Светящиеся материалы — в userData.glow
// (их цвет меняется от нагрева), дуло — userData.muzzle
function createPulseLaserModel() {
  const g = new THREE.Group();
  const body = 0x2d3340;
  const dark = 0x1f232c;
  const metal = 0x8a96a8;
  const blue = 0x4ec8ff;
  weaponPart(g, 0.09, 0.15, 0.32, dark, 0, -0.03, -0.14); // приклад
  weaponPart(g, 0.13, 0.17, 0.5, body, 0, 0, -0.5); // ствольная коробка
  const grip = weaponPart(g, 0.08, 0.18, 0.1, dark, 0, -0.15, -0.44); // рукоять под правую руку
  grip.rotation.x = 0.25;
  weaponPart(g, 0.11, 0.12, 0.4, metal, 0, -0.01, -0.92); // цевье
  weaponPart(g, 0.07, 0.11, 0.08, dark, 0, -0.11, -0.72); // передняя рукоять под левую руку
  weaponPart(g, 0.07, 0.07, 0.26, dark, 0, 0.13, -0.5); // прицел
  weaponPart(g, 0.07, 0.07, 0.44, metal, 0, 0.01, -1.3); // ствол
  const glow = [];
  glow.push(weaponPart(g, 0.06, 0.06, 0.02, blue, 0, 0.13, -0.635, { glow: true }).material); // линза прицела
  glow.push(weaponPart(g, 0.03, 0.07, 0.32, blue, 0.075, 0, -0.5, { glow: true }).material); // энергоячейка
  for (let i = 0; i < 4; i++) {
    glow.push(weaponPart(g, 0.11, 0.11, 0.03, blue, 0, 0.01, -1.14 - i * 0.08, { glow: true }).material);
  }
  glow.push(weaponPart(g, 0.1, 0.1, 0.04, 0xd8f6ff, 0, 0.01, -1.53, { glow: true }).material); // излучатель
  g.userData.glow = glow;
  g.userData.muzzle = new THREE.Vector3(0, 0.01, -1.56);
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
