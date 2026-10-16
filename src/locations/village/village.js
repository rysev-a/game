// src/locations/village/village.js
// ПОСЕЛОК: 6 двухэтажных домов — по три с каждой стороны грунтовой улицы. Все дома разные
// (цвет стен и крыши, размер, форма крыши). У каждого дома свой участок: газон с травой и
// деревьями, забор (у каждого свой: белый штакетник, деревянный или железный), калитка,
// дорожка к двери и машина у обочины напротив дома.
//
// Жизнь на участках: на одних никого нет, на других жилец сидит на стуле у дома, на третьих
// ходит по двору. Один из домов — дом игрока (северная сторона, средний): к нему пристроен
// гараж, все остальное про него — в src/player/home.js.
//
//   улица (грунт, ось X)
//   ┌ участок 34 × 40 ───────┐   дом у дальнего края, перед ним — двор, у фасада — дорожка;
//   │ забор, калитка         │   по краям и сзади растут деревья, везде трава
//   └────────────────────────┘

const streetW = 12; // ширина улицы
const plotW = 34;
const plotD = 40;
const villageHalfW = 90; // половина длины поселка по X
const villagePlotXs = [-36, 0, 36].map((dx) => villageX + dx);
const villageWallColors = [
  0xd9c9a8, 0xf0ead8, 0xe8d28a, 0xb7cfe0, 0xc4d9b0, 0xe0b0a0, 0xbd6a50, 0xaeb4bc, 0xe5c9d0, 0x9fb59a,
];
const villageRoofColors = [0x8a3b2e, 0x4a4a52, 0x3f5a6b, 0x6b3a3a, 0x7a6a3a, 0x2f4a3a, 0x5a3a5a, 0x9a6a3a];
const villageLawns = [0x3a6b3d, 0x34633a, 0x3f7040, 0x2f5f36, 0x447a43];
const shuffled = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);

// Земля поселка, улица, зона звука и зона без леса
flatRect(villageHalfW * 2, 112, 0x2f5233, 0.008, villageX, 0);
mapObjects.push({ x: villageX, z: 0, hx: villageHalfW, hz: 56, color: '#2f5233', ground: true });
roadH(villageX - villageHalfW, villageX + villageHalfW, 0, 'dirt', [], streetW);
const villageRect = { x1: villageX - villageHalfW - 5, x2: villageX + villageHalfW + 5, z1: -62, z2: 62 };
registerZone('village', 'Поселок', villageRect, { birds: 0.6, birds_2: 0.35 });
clearZones.push(villageRect);

// ---------- Заборы: три вида, каждая деталь — экземпляр общего бокса (InstancedMesh на вид) ----------
const fenceStyles = {
  white: { color: 0xf2f1ea, parts: [] }, // белый штакетник
  wood: { color: 0x8a6a3c, parts: [] }, // деревянный: столбы и три жерди
  iron: { color: 0x25252b, parts: [] }, // железный: тонкие прутья, верхняя и нижняя перекладины
};
const fencePart = (style, x, y, z, sx, sy, sz) => fenceStyles[style].parts.push([x, y, z, sx, sy, sz]);

// Кусок забора вдоль оси (x1,z1)—(x2,z2); твердый для игрока и машин
function fenceSeg(x1, z1, x2, z2, style) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  if (len < 0.3) return;
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  const alongX = Math.abs(z2 - z1) < 1e-6;
  // Вдоль забора смещаемся по X или по Z; «толщина» — по другой оси
  const at = (t) => (alongX ? [x1 + (x2 - x1) * t, z1] : [x1, z1 + (z2 - z1) * t]);
  const box = (t, y, along, h, thick) => {
    const [px, pz] = at(t);
    fencePart(style, px, y, pz, alongX ? along : thick, h, alongX ? thick : along);
  };
  if (style === 'white') {
    const n = Math.floor(len / 0.45);
    for (let i = 0; i < n; i++) box((i + 0.5) / n, 0.55, 0.14, 1.1, 0.06); // штакетины
    box(0.5, 0.3, len, 0.08, 0.07); // две перекладины
    box(0.5, 0.8, len, 0.08, 0.07);
  } else if (style === 'wood') {
    const n = Math.max(1, Math.round(len / 3));
    for (let i = 0; i <= n; i++) box(i / n, 0.65, 0.2, 1.3, 0.2); // столбы
    for (const y of [0.35, 0.7, 1.05]) box(0.5, y, len, 0.12, 0.08); // жерди
  } else {
    const n = Math.floor(len / 0.32);
    for (let i = 0; i < n; i++) box((i + 0.5) / n, 0.8, 0.04, 1.6, 0.04); // прутья
    box(0.5, 0.12, len, 0.07, 0.07); // нижняя и верхняя перекладины
    box(0.5, 1.55, len, 0.09, 0.09);
    const m = Math.max(1, Math.round(len / 4));
    for (let i = 0; i <= m; i++) box(i / m, 0.9, 0.14, 1.8, 0.14); // столбы повыше
  }
  const w = alongX ? len : 0.2;
  const d = alongX ? 0.2 : len;
  addObstacle({ x: cx, z: cz, hx: w / 2, hz: d / 2 });
}

// Забор вдоль X с проемами gaps: [{ x, w }] (калитка, въезд)
function fenceLineX(x1, x2, z, gaps, style) {
  let cursor = x1;
  for (const g of [...gaps].sort((a, b) => a.x - b.x)) {
    fenceSeg(cursor, z, g.x - g.w / 2, z, style);
    cursor = g.x + g.w / 2;
  }
  fenceSeg(cursor, z, x2, z, style);
}

// ---------- Деревья на участках (круглая крона) и трава ----------
const yardTrees = []; // { x, z, s, color }
const yardTreeColors = [0x3f7a3a, 0x4a8a3c, 0x2f6b3a, 0x5a8a3a, 0x7a9a3a, 0xa8a03a];
const tufts = []; // { x, z, color }

// ---------- Мебель двора и посадка жителя ----------
function createChair() {
  const g = new THREE.Group();
  const wood = new LitMaterial({ color: 0x8a5a2e });
  const part = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood);
    m.position.set(x, y, z);
    g.add(m);
  };
  part(0.55, 0.07, 0.55, 0, 0.46, 0); // сиденье (верх на высоте 0,5)
  part(0.55, 0.6, 0.07, 0, 0.82, 0.24); // спинка сзади (модель смотрит в −Z)
  for (const [x, z] of [[-0.23, -0.23], [0.23, -0.23], [-0.23, 0.23], [0.23, 0.23]]) part(0.06, 0.45, 0.06, x, 0.22, z);
  return g;
}

function createTable() {
  const g = new THREE.Group();
  const wood = new LitMaterial({ color: 0xb98a52 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.8), wood);
  top.position.y = 0.7;
  g.add(top);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.68, 0.1), wood);
  leg.position.y = 0.34;
  g.add(leg);
  const mug = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), new LitMaterial({ color: 0xe0c341 }));
  mug.position.set(0.1, 0.8, 0.05);
  g.add(mug);
  return g;
}

// Жилец сидит на стуле у фасада лицом к улице, рядом столик с кружкой
function addSeatedResident(houseX, houseW, side, gender) {
  const cx = houseX + (Math.random() < 0.5 ? -1 : 1) * (houseW / 2 - 2.8);
  const cz = side * 16.6;
  const yaw = side < 0 ? Math.PI : 0; // к улице
  const chair = createChair();
  chair.position.set(cx, 0, cz);
  chair.rotation.y = yaw;
  cityGroup.add(chair);
  const table = createTable();
  table.position.set(cx + 1.2, 0, cz);
  cityGroup.add(table);
  addObstacle({ x: cx + 1.2, z: cz, hx: 0.4, hz: 0.4 });

  const mesh = makePerson(gender);
  mesh.position.set(cx, 0, cz);
  mesh.rotation.y = yaw;
  mesh.setSit(true);
  cityGroup.add(mesh);
  // hold: общий патруль его не трогает; остальное — чтобы его обходили и видели на карте
  npcs.push({ mesh, gender, kind: 'resident', seated: true, hold: true, x: cx, z: cz });
}

// Жилец гуляет по участку: во дворе перед домом или на заднем дворе
function addWalkingResident(px, side, gender, front) {
  const z = side * (front ? 11 : 38);
  addNpc({ x1: px - 12, z1: z, x2: px + 12, z2: z }, gender, 'resident');
}

// Кто живет на участке: пусто / сидит / ходит / и то и другое. У дома игрока — никого.
// Перемешиваем так, чтобы были и пустые участки, и сидящие, и гуляющие
const plotScenarios = shuffled(['empty', 'sit', 'sit', 'walk', 'sit_walk']);

const villageHouses = []; // { x, z, side, mine }
const MY_PLOT = { side: -1, index: 1 }; // северная сторона, средний участок — дом игрока
const plotFenceStyles = shuffled(['white', 'wood', 'iron', 'white', 'wood', 'iron']);
let plotCounter = 0;
let scenarioCounter = 0;

for (const side of [-1, 1]) {
  villagePlotXs.forEach((px, index) => {
    const mine = side === MY_PLOT.side && index === MY_PLOT.index;
    const plotZ = side * (streetW / 2 + plotD / 2); // центр участка
    const frontEdge = side * (streetW / 2 + 0.4); // забор со стороны улицы
    const houseFront = side * 18; // фасад (стена, обращенная к улице)

    // Каждый дом свой: размеры, высота, форма и цвет. У дома игрока размеры равны интерьеру
    const w = mine ? homeW : rand(13, 22);
    const d = mine ? homeD : rand(10, 14);
    const houseX = mine ? px - 4 : px; // у дома игрока место справа под гараж
    const houseZ = side * (18 + d / 2);
    const style = plotFenceStyles[plotCounter];

    // Газон участка
    flatRect(plotW - 0.6, plotD - 0.6, villageLawns[plotCounter % villageLawns.length], 0.012, px, plotZ);

    // Дом: двухэтажный; фасад модели смотрит в +Z, южный ряд разворачиваем к улице
    const house = createHouse({
      width: w,
      depth: d,
      wallHeight: mine ? 7.2 : rand(6.4, 8.2),
      roofRise: mine ? 3.4 : rand(2.4, 4.2),
      roofOverhang: mine ? 1.0 : rand(0.7, 1.3),
      floors: 2,
      windows: mine ? 4 : Math.max(2, Math.round(w / 4.3)),
      roof: mine || Math.random() < 0.65 ? 'gable' : 'hip',
      ridgeAlongX: mine || Math.random() < 0.6,
      wallColor: mine ? 0xd9c9a8 : villageWallColors[(plotCounter * 3 + index) % villageWallColors.length],
      roofColor: mine ? 0x8a3b2e : pick(villageRoofColors),
    });
    house.position.set(houseX, 0, houseZ);
    if (side > 0) house.rotation.y = Math.PI;
    cityGroup.add(house);
    addObstacle({ x: houseX, z: houseZ, hx: w / 2, hz: d / 2 });
    mapObjects.push({ x: houseX, z: houseZ, hx: w / 2, hz: d / 2, color: mine ? '#d9a066' : '#8a8a8a' });
    villageHouses.push({ x: houseX, z: houseZ, side, mine, w, d });
    if (mine) mapIcons.push({ x: houseX, z: houseZ, icon: 'home' });

    // Дорожка от калитки к двери
    const pathLen = Math.abs(houseFront - frontEdge);
    pushQuad(roadBatches.dirt.verts, houseX, (houseFront + frontEdge) / 2, 0.9, pathLen / 2, 0.02);

    // Дом игрока: гараж, машина в нем, кнопка, внутренние двери; проем в заборе под въезд
    const gaps = [{ x: houseX, w: 4 }];
    if (mine) {
      const exterior = buildHomeExterior({ houseX, houseZ, side });
      gaps.push({ x: exterior.garageCenterX, w: 7 });
      const driveLen = Math.abs(exterior.frontZ - frontEdge);
      flatRect(6.6, driveLen, 0x555555, 0.018, exterior.garageCenterX, (exterior.frontZ + frontEdge) / 2);
    }

    // Забор участка своего вида: спереди с калиткой (и въездом), сзади и по бокам сплошной
    const backZ = side * (streetW / 2 + plotD);
    fenceLineX(px - plotW / 2, px + plotW / 2, frontEdge, gaps, style);
    fenceLineX(px - plotW / 2, px + plotW / 2, backZ, [], style);
    fenceSeg(px - plotW / 2, frontEdge, px - plotW / 2, backZ, style);
    fenceSeg(px + plotW / 2, frontEdge, px + plotW / 2, backZ, style);

    // Деревья: 4–7 штук по краям и в глубине участка (не на линиях, где ходят жильцы)
    const spots = [
      [-14.5, 9], [14.5, 9], [-14.5, 15], [14.5, 15],
      [-14.5, 28], [14.5, 28], [-14.5, 35], [14.5, 35], [-14.5, 42], [14.5, 42],
      [-8, 43], [0, 43.5], [8, 43],
    ];
    for (const [dx, dz] of shuffled(spots).slice(0, 4 + Math.floor(Math.random() * 4))) {
      const tx = px + dx;
      const tz = side * dz;
      const s = rand(0.8, 1.3);
      yardTrees.push({ x: tx, z: tz, s, color: pick(yardTreeColors) });
      addTreeCollider(tx, tz, s * 0.9);
    }

    // Трава: пучки по всему газону, кроме дома и дорожки
    for (let i = 0; i < 40; i++) {
      const tx = px + rand(-16, 16);
      const tz = side * rand(7, 45);
      const insideHouse = Math.abs(tx - houseX) < w / 2 + 1 && Math.abs(tz) > 17 && Math.abs(tz) < 19 + d;
      const onPath = Math.abs(tx - houseX) < 1.4 && Math.abs(tz) < 18.5;
      if (insideHouse || onPath) continue;
      tufts.push({ x: tx, z: tz, color: pick([0x2f6b3a, 0x3f7a3a, 0x58903f, 0x6aa04a]) });
    }

    // Машина у обочины напротив дома (на парковке у дома). Закрыта
    const parkX = houseX + (mine ? 5 : 4);
    const parkZ = side * 4.3;
    flatRect(6.6, 3.2, 0x555555, 0.019, parkX, parkZ);
    addCar(parkX, parkZ, side < 0 ? Math.PI / 2 : -Math.PI / 2, {
      locked: true,
      lockedMsg: 'Эта машина закрыта',
    });

    // Жители
    const scenario = mine ? 'empty' : plotScenarios[scenarioCounter++ % plotScenarios.length];
    const genders = Math.random() < 0.5 ? ['male', 'female'] : ['female', 'male'];
    if (scenario === 'sit' || scenario === 'sit_walk') addSeatedResident(houseX, w, side, genders[0]);
    if (scenario === 'walk') addWalkingResident(px, side, genders[0], Math.random() < 0.5);
    if (scenario === 'sit_walk') addWalkingResident(px, side, genders[1], false);

    plotCounter++;
  });
}

// ---------- Сборка экземпляров: заборы, деревья, трава ----------
{
  const m4 = new THREE.Matrix4();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const unit = new THREE.BoxGeometry(1, 1, 1);

  for (const fs of Object.values(fenceStyles)) {
    if (!fs.parts.length) continue;
    const mesh = new THREE.InstancedMesh(unit, new LitMaterial({ color: fs.color }), fs.parts.length);
    fs.parts.forEach(([x, y, z, sx, sy, sz], i) => {
      mesh.setMatrixAt(i, m4.compose(pos.set(x, y, z), quat, scale.set(sx, sy, sz)));
    });
    mesh.frustumCulled = false; // bounding sphere у InstancedMesh не учитывает инстансы
    cityGroup.add(mesh);
  }

  // Деревья участков: ствол + низкополигональная круглая крона
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 2.2, 6).translate(0, 1.1, 0);
  const crownGeo = new THREE.IcosahedronGeometry(1.7, 0).translate(0, 3.3, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new LitMaterial({ color: 0x5a3d26 }), yardTrees.length);
  const crowns = new THREE.InstancedMesh(crownGeo, new LitMaterial({ color: 0xffffff }), yardTrees.length);
  const tint = new THREE.Color();
  yardTrees.forEach((t, i) => {
    m4.makeScale(t.s, t.s, t.s).setPosition(t.x, 0, t.z);
    trunks.setMatrixAt(i, m4);
    crowns.setMatrixAt(i, m4);
    crowns.setColorAt(i, tint.setHex(t.color));
  });
  for (const mesh of [trunks, crowns]) {
    mesh.frustumCulled = false;
    cityGroup.add(mesh);
  }

  // Трава: маленькие конусы-пучки
  const tuftGeo = new THREE.ConeGeometry(0.16, 0.5, 4).translate(0, 0.25, 0);
  const grass = new THREE.InstancedMesh(tuftGeo, new LitMaterial({ color: 0xffffff }), tufts.length);
  tufts.forEach((t, i) => {
    const s = 0.7 + Math.random() * 0.8;
    m4.makeScale(s, s, s).setPosition(t.x, 0.01, t.z);
    grass.setMatrixAt(i, m4);
    grass.setColorAt(i, tint.setHex(t.color));
  });
  grass.frustumCulled = false;
  cityGroup.add(grass);
}
