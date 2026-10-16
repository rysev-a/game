// src/models/weapons.js
// Модели для боя: оружие в руке героя и манекены для тира.
//
//   const gun = createPulseLaserModel();   // импульсный лазер — винтовка: ствол в -Z, приклад в начале координат.
//                                          // gun.userData.glow — светящиеся детали: их цвет меняется от нагрева
//   player.attach('rifle', gun);           // к груди, приклад у правого плеча; руки — player.setAim('rifle')
//   createGaussCannonModel(), createPlasmaFlamerModel(), createCryoRifleModel(), createArcDischargerModel() —
//                                          // остальные винтовки (так же к груди); createTachyonPistolModel() — в руку
//   createPlasmaGunModel(), createMinigunModel() (userData.spin — блок стволов), createShotgunModel()
//   const d = createTrainingDummy({ armor: true });  // манекен на столбе, лицом в -Z, стоит на y = 0
//   createRobotDummy(), createRangeCrate() — робот-мишень и ящик для тира
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

// Импульсный лазер — компактная винтовка длиной ~1,55, держат как автомат. Начало координат — торец приклада
// (у плеча), ствол смотрит в -Z. Пистолетная рукоять со спуском под правую кисть (z ≈ −0,45), снизу у
// цевья — упор под левую (z ≈ −0,7): туда тянутся руки в позе setAim('rifle') (src/models/person.js).
// Сверху — накопитель (светится при заряде), прицел; на стволе в кожухе четыре голубые катушки и
// широкий излучатель. Светящиеся материалы — в userData.glow, дуло — userData.muzzle, шар заряда у дула —
// userData.chargeOrb (растет, пока зажата кнопка)
function createPulseLaserModel() {
  const g = new THREE.Group();
  const body = 0x2d3340;
  const dark = 0x1f232c;
  const metal = 0x8a96a8;
  const blue = 0x4ec8ff;
  weaponPart(g, 0.09, 0.17, 0.3, dark, 0, -0.03, -0.15); // приклад
  weaponPart(g, 0.1, 0.07, 0.05, 0x3a3f4a, 0, -0.03, -0.01); // затыльник (упирается в плечо)
  weaponPart(g, 0.13, 0.18, 0.5, body, 0, 0, -0.55); // ствольная коробка
  const grip = weaponPart(g, 0.08, 0.2, 0.1, dark, 0, -0.18, -0.45); // рукоять под правую руку
  grip.rotation.x = 0.25;
  weaponPart(g, 0.02, 0.06, 0.04, metal, 0, -0.12, -0.53); // спуск
  weaponPart(g, 0.07, 0.12, 0.08, dark, 0, -0.15, -0.7); // упор под левую руку
  weaponPart(g, 0.11, 0.12, 0.26, metal, 0, -0.01, -0.92); // цевье
  weaponPart(g, 0.06, 0.06, 0.2, dark, 0, 0.13, -0.45); // прицел
  weaponPart(g, 0.1, 0.07, 0.25, dark, 0, 0.13, -0.73); // накопитель
  weaponPart(g, 0.09, 0.09, 0.36, 0x3a3f4a, 0, 0.01, -1.22); // кожух ствола
  weaponPart(g, 0.05, 0.05, 0.12, metal, 0, 0.01, -1.44); // ствол
  weaponPart(g, 0.13, 0.13, 0.05, metal, 0, 0.01, -1.51); // раструб излучателя
  const glow = [];
  glow.push(weaponPart(g, 0.05, 0.05, 0.02, blue, 0, 0.13, -0.555, { glow: true }).material); // линза прицела
  glow.push(weaponPart(g, 0.07, 0.04, 0.21, blue, 0, 0.17, -0.73, { glow: true }).material); // окно накопителя
  glow.push(weaponPart(g, 0.02, 0.08, 0.32, blue, 0.07, 0, -0.6, { glow: true }).material); // энергоячейка
  for (let i = 0; i < 4; i++) {
    glow.push(weaponPart(g, 0.11, 0.11, 0.03, blue, 0, 0.01, -1.1 - i * 0.08, { glow: true }).material);
  }
  glow.push(weaponPart(g, 0.1, 0.1, 0.02, 0xd8f6ff, 0, 0.01, -1.54, { glow: true }).material); // излучатель
  g.userData.glow = glow;
  g.userData.muzzle = new THREE.Vector3(0, 0.01, -1.56);
  // Шар заряда у дула: невидим, пока не начали копить
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xd8f6ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  orb.position.copy(g.userData.muzzle);
  orb.visible = false;
  g.add(orb);
  g.userData.chargeOrb = orb;
  return g;
}

// Общая основа винтовок под хват двумя руками (как у лазера): приклад, рукоять под правую кисть
// (z ≈ −0,44), передняя рукоять под левую (z ≈ −0,72). Ствол и всё остальное каждая модель дорисовывает сама
function rifleBase(g, bodyColor, stockColor = 0x1f232c) {
  weaponPart(g, 0.09, 0.15, 0.32, stockColor, 0, -0.03, -0.14); // приклад
  const grip = weaponPart(g, 0.08, 0.18, 0.1, stockColor, 0, -0.15, -0.44); // рукоять
  grip.rotation.x = 0.25;
  weaponPart(g, 0.07, 0.11, 0.08, stockColor, 0, -0.11, -0.72); // передняя рукоять
}

// Вакуумная гаусс-пушка: длинная, два медных рельса вдоль ствола, между ними светится канал,
// на коробке — кольца конденсаторов
function createGaussCannonModel() {
  const g = new THREE.Group();
  const steel = 0x3a4048;
  const copper = 0xb87333;
  const glowC = 0xd6dcff;
  rifleBase(g, steel);
  weaponPart(g, 0.15, 0.19, 0.6, steel, 0, 0, -0.5); // коробка
  weaponPart(g, 0.12, 0.1, 0.36, 0x2a2e34, 0, -0.02, -0.9); // цевье
  weaponPart(g, 0.06, 0.06, 0.2, 0x2a2e34, 0, 0.14, -0.45); // прицел
  weaponPart(g, 0.04, 0.04, 1.15, copper, 0, 0.08, -1.3); // верхний рельс
  weaponPart(g, 0.04, 0.04, 1.15, copper, 0, -0.06, -1.3); // нижний рельс
  weaponPart(g, 0.12, 0.2, 0.04, steel, 0, 0.01, -0.95); // держатели рельсов
  weaponPart(g, 0.12, 0.2, 0.04, steel, 0, 0.01, -1.85);
  const glow = [];
  glow.push(weaponPart(g, 0.02, 0.06, 1.05, glowC, 0, 0.01, -1.32, { glow: true }).material); // канал
  for (let i = 0; i < 3; i++) glow.push(weaponPart(g, 0.17, 0.21, 0.025, 0x8fa8ff, 0, 0, -0.32 - i * 0.12, { glow: true }).material);
  g.userData.glow = glow;
  g.userData.muzzle = new THREE.Vector3(0, 0.01, -1.9);
  return g;
}

// Плазменный огнемет: тяжелый корпус, снизу бак с плазмой (светящееся окно), широкое сопло
// с кольцами магнитной ловушки и запальником
function createPlasmaFlamerModel() {
  const g = new THREE.Group();
  const body = 0x4a3a32;
  const metal = 0x8a8278;
  rifleBase(g, body, 0x2a2420);
  weaponPart(g, 0.17, 0.2, 0.62, body, 0, 0.01, -0.52); // корпус
  weaponPart(g, 0.16, 0.16, 0.36, metal, 0, -0.17, -0.86); // бак
  weaponPart(g, 0.1, 0.1, 0.3, metal, 0, 0.02, -1.0); // ствол
  weaponPart(g, 0.18, 0.18, 0.14, 0x3a3430, 0, 0.02, -1.2); // сопло
  const glow = [];
  glow.push(weaponPart(g, 0.17, 0.08, 0.2, 0xff6a2a, 0, -0.17, -0.86, { glow: true }).material); // окно бака
  for (let i = 0; i < 2; i++) glow.push(weaponPart(g, 0.21, 0.21, 0.025, 0xff8a3a, 0, 0.02, -1.15 - i * 0.08, { glow: true }).material);
  glow.push(weaponPart(g, 0.03, 0.03, 0.05, 0x8ad8ff, 0, -0.08, -1.27, { glow: true }).material); // запальник
  g.userData.glow = glow;
  g.userData.muzzle = new THREE.Vector3(0, 0.02, -1.3);
  return g;
}

// Крио-осколочная винтовка: белый корпус, бирюзовые вставки, барабан с капсулами азота (светятся
// голубым), короткий толстый ствол
function createCryoRifleModel() {
  const g = new THREE.Group();
  const white = 0xdfe6ea;
  const teal = 0x2a8a9a;
  rifleBase(g, white, 0x3a4a52);
  weaponPart(g, 0.15, 0.17, 0.55, white, 0, 0, -0.5); // корпус
  weaponPart(g, 0.04, 0.05, 0.5, teal, 0.08, 0.03, -0.5); // вставка
  weaponPart(g, 0.24, 0.24, 0.2, 0xb8c4ca, 0, -0.06, -0.62); // барабан
  weaponPart(g, 0.13, 0.13, 0.4, white, 0, 0.01, -1.0); // ствол
  weaponPart(g, 0.16, 0.16, 0.06, teal, 0, 0.01, -1.2); // дульный срез
  const glow = [];
  for (const [x, y] of [[0.125, -0.06], [-0.125, -0.06], [0, 0.065], [0, -0.185]]) {
    glow.push(weaponPart(g, x ? 0.01 : 0.12, x ? 0.12 : 0.01, 0.12, 0x9ff3ff, x, y, -0.62, { glow: true }).material);
  }
  glow.push(weaponPart(g, 0.09, 0.09, 0.02, 0xdff9ff, 0, 0.01, -1.235, { glow: true }).material);
  g.userData.glow = glow;
  g.userData.muzzle = new THREE.Vector3(0, 0.01, -1.25);
  return g;
}

// Дуговой разрядник: темный корпус, обмотка катушки, спереди три зубца и шар-разрядник
function createArcDischargerModel() {
  const g = new THREE.Group();
  const body = 0x2a2a34;
  const metal = 0x9a9aa8;
  rifleBase(g, body);
  weaponPart(g, 0.15, 0.18, 0.55, body, 0, 0, -0.5); // корпус
  weaponPart(g, 0.1, 0.1, 0.3, metal, 0, 0.01, -0.95); // ствол
  for (const [x, y] of [[0.07, 0.07], [-0.07, 0.07], [0, -0.08]]) weaponPart(g, 0.03, 0.03, 0.22, metal, x, y + 0.01, -1.18); // зубцы
  const glow = [];
  for (let i = 0; i < 5; i++) glow.push(weaponPart(g, 0.18, 0.21, 0.02, 0xc8a8ff, 0, 0, -0.32 - i * 0.07, { glow: true }).material); // обмотка
  glow.push(weaponPart(g, 0.1, 0.1, 0.1, 0xe8dcff, 0, 0.01, -1.26, { glow: true }).material); // шар
  g.userData.glow = glow;
  g.userData.muzzle = new THREE.Vector3(0, 0.01, -1.32);
  return g;
}

// Тахионный пистолет — в одной руке (как первый лазер): короткий корпус, кольцо-излучатель
// пурпурного свечения, рукоять в начале координат
function createTachyonPistolModel() {
  const g = new THREE.Group();
  const body = 0x2d2238;
  weaponPart(g, 0.09, 0.2, 0.11, 0x1a1420, 0, -0.06, 0.02); // рукоять
  weaponPart(g, 0.13, 0.14, 0.42, body, 0, 0.1, -0.1); // корпус
  weaponPart(g, 0.07, 0.07, 0.18, 0x7a6a8a, 0, 0.1, -0.38); // ствол
  const glow = [];
  glow.push(weaponPart(g, 0.025, 0.06, 0.3, 0xff4dd2, 0.07, 0.1, -0.08, { glow: true }).material); // полоса
  // Кольцо-излучатель из четырех планок вокруг ствола
  for (const [x, y, w, h] of [[0, 0.19, 0.2, 0.03], [0, 0.01, 0.2, 0.03], [0.085, 0.1, 0.03, 0.2], [-0.085, 0.1, 0.03, 0.2]]) {
    glow.push(weaponPart(g, w, h, 0.03, 0xff4dd2, x, y, -0.5, { glow: true }).material);
  }
  glow.push(weaponPart(g, 0.05, 0.05, 0.02, 0xffd8f4, 0, 0.1, -0.48, { glow: true }).material);
  g.userData.glow = glow;
  g.userData.muzzle = new THREE.Vector3(0, 0.1, -0.52);
  return g;
}

// Плазмомет — как в Unreal: короткий массивный корпус, сверху прозрачная колба с зеленой плазмой,
// спереди три зеленых кольца-ускорителя и широкое дуло
function createPlasmaGunModel() {
  const g = new THREE.Group();
  const body = 0x3a4436;
  const green = 0x5cff6a;
  rifleBase(g, body);
  weaponPart(g, 0.19, 0.22, 0.62, body, 0, 0, -0.55); // корпус
  weaponPart(g, 0.15, 0.14, 0.34, 0x2a3028, 0, -0.03, -0.98); // цевье
  weaponPart(g, 0.13, 0.13, 0.3, 0x2a3028, 0, 0.01, -1.28); // ствол
  weaponPart(g, 0.2, 0.2, 0.06, 0x2a3028, 0, 0.01, -1.45); // дуло
  const glow = [];
  glow.push(weaponPart(g, 0.11, 0.08, 0.36, green, 0, 0.16, -0.58, { glow: true }).material); // колба
  for (let i = 0; i < 3; i++) glow.push(weaponPart(g, 0.17, 0.17, 0.03, green, 0, 0.01, -1.16 - i * 0.1, { glow: true }).material);
  glow.push(weaponPart(g, 0.12, 0.12, 0.02, 0xc8ffc8, 0, 0.01, -1.49, { glow: true }).material); // дуло светится
  g.userData.glow = glow;
  g.userData.muzzle = new THREE.Vector3(0, 0.01, -1.5);
  return g;
}

// Пулемет — шестиствольный, как у Терминатора: короб с лентой сбоку, мотор, блок из шести стволов
// вокруг оси (userData.spin — его крутят при стрельбе), рукоять сверху для левой руки
function createMinigunModel() {
  const g = new THREE.Group();
  const steel = 0x3a3d42;
  const dark = 0x1f2226;
  rifleBase(g, steel);
  weaponPart(g, 0.2, 0.24, 0.55, steel, 0, 0, -0.5); // корпус с мотором
  weaponPart(g, 0.16, 0.2, 0.3, 0x4a4f2a, 0.18, -0.06, -0.5); // короб с лентой
  for (let i = 0; i < 5; i++) weaponPart(g, 0.04, 0.03, 0.05, 0xc89a3a, 0.12, -0.17 - i * 0.03, -0.42 + i * 0.012, { edges: false }); // патроны ленты
  weaponPart(g, 0.18, 0.18, 0.1, dark, 0, 0.01, -0.82); // передний подшипник
  const spin = new THREE.Group();
  spin.position.set(0, 0.01, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    weaponPart(spin, 0.035, 0.035, 0.85, 0x55595f, Math.cos(a) * 0.06, Math.sin(a) * 0.06, -1.25, { edges: false });
  }
  weaponPart(spin, 0.17, 0.17, 0.04, dark, 0, 0, -1.05);
  weaponPart(spin, 0.17, 0.17, 0.04, dark, 0, 0, -1.6);
  g.add(spin);
  g.userData.spin = spin;
  g.userData.glow = [];
  g.userData.muzzle = new THREE.Vector3(0, 0.01, -1.68);
  return g;
}

// Дробовик — помповый: деревянный приклад и цевье-помпа, длинный ствол и под ним трубчатый магазин
function createShotgunModel() {
  const g = new THREE.Group();
  const wood = 0x7a4a26;
  const steel = 0x2e3136;
  weaponPart(g, 0.09, 0.16, 0.36, wood, 0, -0.04, -0.16); // приклад
  const grip = weaponPart(g, 0.08, 0.17, 0.1, wood, 0, -0.14, -0.44); // шейка приклада под правую руку
  grip.rotation.x = 0.35;
  weaponPart(g, 0.11, 0.15, 0.36, steel, 0, 0, -0.5); // ствольная коробка
  weaponPart(g, 0.11, 0.1, 0.26, wood, 0, -0.08, -0.74); // помпа под левую руку
  weaponPart(g, 0.06, 0.06, 0.95, steel, 0, 0.03, -1.12); // ствол
  weaponPart(g, 0.05, 0.05, 0.75, steel, 0, -0.04, -1.0); // трубчатый магазин
  weaponPart(g, 0.02, 0.03, 0.02, 0xd0d0d0, 0, 0.07, -1.56, { edges: false }); // мушка
  g.userData.glow = [];
  g.userData.muzzle = new THREE.Vector3(0, 0.03, -1.6);
  return g;
}

// Ящик для тира: его двигают удары и стягивает схлопнувшийся коридор гаусса
function createRangeCrate() {
  const g = new THREE.Group();
  weaponPart(g, 0.8, 0.8, 0.8, 0x9a7a4a, 0, 0.4, 0);
  weaponPart(g, 0.82, 0.1, 0.82, 0x6a5232, 0, 0.6, 0);
  weaponPart(g, 0.82, 0.1, 0.82, 0x6a5232, 0, 0.2, 0);
  return g;
}

// Робот-мишень: низкий корпус на треноге с антенной и красным глазом — электроника, ток бьет по ней сильнее
function createRobotDummy() {
  const g = new THREE.Group();
  const shell = 0x6a7480;
  weaponPart(g, 0.9, 0.1, 0.12, 0x3a3f46, 0, 0.05, 0);
  weaponPart(g, 0.12, 0.1, 0.9, 0x3a3f46, 0, 0.05, 0);
  weaponPart(g, 0.12, 0.7, 0.12, 0x3a3f46, 0, 0.4, 0);
  weaponPart(g, 0.7, 0.6, 0.55, shell, 0, 1.05, 0); // корпус
  weaponPart(g, 0.5, 0.35, 0.45, 0x8a949e, 0, 1.53, 0); // голова
  weaponPart(g, 0.03, 0.35, 0.03, 0x222222, 0.15, 1.88, 0); // антенна
  weaponPart(g, 0.2, 0.08, 0.02, 0xff3a3a, 0, 1.56, -0.235, { glow: true }); // глаз
  weaponPart(g, 0.4, 0.2, 0.02, 0x2a2e34, 0, 1.05, -0.285); // панель
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
