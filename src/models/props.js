// src/models/props.js
// Уличные мелочи в стиле игры (плоские цвета + темные контуры): скамейка, фонарь,
// лиственное дерево и куст.
//
// Подключение:
//   <script src="src/models/props.js"></script>
// Использование:
//   const bench = createBench();        // сиденье вдоль X, спинка сзади (+Z): сидящий смотрит в -Z
//   const lamp = createStreetLamp();    // столб 4,6 юнита, плафон вынесен в -Z
//   setStreetLampsNight(k);             // k 0..1: 0 — день (плафоны серые), 1 — ночь (горят, на земле пятно света)
//   const tree = createLeafyTree();     // круглая крона, ~5 юнитов в высоту
//   const bush = createBush();
// Геометрия и материалы общие: модели дешевые, а setStreetLampsNight меняет все фонари сразу.
//
// Зависимость: глобальный THREE (three.js r128+).

const propEdgeMat = new THREE.LineBasicMaterial({ color: 0x111111 });
const propGeoCache = new Map();
const propMatCache = new Map();

// Бокс с контуром; геометрия и материал переиспользуются по размеру и цвету
function propPart(w, h, d, color, edges = true) {
  const key = w + ',' + h + ',' + d;
  if (!propGeoCache.has(key)) {
    const geo = new THREE.BoxGeometry(w, h, d);
    propGeoCache.set(key, { geo, edges: new THREE.EdgesGeometry(geo) });
  }
  if (!propMatCache.has(color)) propMatCache.set(color, new LitMaterial({ color }));
  const g = propGeoCache.get(key);
  const mesh = new THREE.Mesh(g.geo, propMatCache.get(color));
  if (edges) mesh.add(new THREE.LineSegments(g.edges, propEdgeMat));
  return mesh;
}

function createBench() {
  const root = new THREE.Group();
  const wood = 0x8a5a32;
  const iron = 0x2a2a2a;
  const seat = propPart(1.8, 0.08, 0.5, wood);
  seat.position.y = 0.48;
  root.add(seat);
  const back = propPart(1.8, 0.4, 0.07, wood);
  back.position.set(0, 0.78, 0.24);
  back.rotation.x = -0.12;
  root.add(back);
  for (const x of [-0.75, 0.75]) {
    const leg = propPart(0.08, 0.46, 0.46, iron);
    leg.position.set(x, 0.23, 0);
    root.add(leg);
    const post = propPart(0.06, 0.45, 0.06, iron);
    post.position.set(x, 0.72, 0.26);
    root.add(post);
  }
  return root;
}

// Плафоны и пятна света всех фонарей — общие материалы
const lampDayColor = new THREE.Color(0x9a9a8a);
const lampNightColor = new THREE.Color(0xffe9a0);
const lampBulbMat = new THREE.MeshBasicMaterial({ color: lampDayColor.clone() });
const lampGlowMat = new THREE.MeshBasicMaterial({
  color: 0xffd77a,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const lampGlowGeo = new THREE.CircleGeometry(3.2, 20).rotateX(-Math.PI / 2);
const lampBulbGeo = new THREE.BoxGeometry(0.42, 0.1, 0.42);

function createStreetLamp() {
  const root = new THREE.Group();
  const metal = 0x3a3d42;
  const base = propPart(0.4, 0.3, 0.4, metal);
  base.position.y = 0.15;
  root.add(base);
  const pole = propPart(0.14, 4.4, 0.14, metal);
  pole.position.y = 2.5;
  root.add(pole);
  const arm = propPart(0.1, 0.1, 0.9, metal);
  arm.position.set(0, 4.62, -0.4);
  root.add(arm);
  const head = propPart(0.5, 0.18, 0.5, metal);
  head.position.set(0, 4.55, -0.85);
  root.add(head);
  const bulb = new THREE.Mesh(lampBulbGeo, lampBulbMat);
  bulb.position.set(0, 4.43, -0.85);
  root.add(bulb);
  const glow = new THREE.Mesh(lampGlowGeo, lampGlowMat);
  glow.position.set(0, 0.03, -0.85);
  glow.renderOrder = 1;
  root.add(glow);
  return root;
}

function setStreetLampsNight(k) {
  lampBulbMat.color.copy(lampDayColor).lerp(lampNightColor, k);
  lampGlowMat.opacity = 0.45 * k;
}

// Лиственное дерево: ствол и крона из двух «шаров» (низкополигональные икосаэдры)
const leafyTrunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 2.2, 5).translate(0, 1.1, 0);
const leafyCrownGeo = new THREE.IcosahedronGeometry(1.6, 0).translate(0, 3.4, 0);
const leafyTopGeo = new THREE.IcosahedronGeometry(1.1, 0).translate(0.4, 4.4, 0.2);
const bushGeo = new THREE.IcosahedronGeometry(0.75, 0).scale(1.2, 0.75, 1).translate(0, 0.45, 0);
const leafyTrunkMat = new LitMaterial({ color: 0x5a3d26 });
const leafyGreens = [0x4f8a3a, 0x5f9a42, 0x3f7a35, 0x7a9a3a];

function createLeafyTree(color = leafyGreens[0]) {
  const root = new THREE.Group();
  const leaves = new LitMaterial({ color });
  root.add(new THREE.Mesh(leafyTrunkGeo, leafyTrunkMat));
  for (const geo of [leafyCrownGeo, leafyTopGeo]) {
    const crown = new THREE.Mesh(geo, leaves);
    crown.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), propEdgeMat));
    root.add(crown);
  }
  return root;
}

function createBush(color = leafyGreens[2]) {
  const bush = new THREE.Mesh(bushGeo, new LitMaterial({ color }));
  bush.add(new THREE.LineSegments(new THREE.EdgesGeometry(bushGeo), propEdgeMat));
  return bush;
}
