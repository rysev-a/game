// src/engine/helpers.js
// Общие списки и мелкие помощники мира: данные для миникарты, препятствия, бокс с контуром,
// случайные числа, плоский прямоугольник на земле.

const roadWidth = 7;
const mapObjects = []; // для миникарты: { x, z, hx, hz, color, ground? }
const obstacles = []; // непроходимые прямоугольники (оси мира): { x, z, hx, hz }
const mapRoads = []; // для миникарты: { x1, z1, x2, z2, color, width?, round? }
const mapIcons = []; // значки мест на миникарте: { x, z, icon: 'home' | 'gas' }
const clearZones = []; // где лес не растет: { x1, x2, z1, z2 } — модули мира добавляют свои зоны

const cityEdgeMat = new THREE.LineBasicMaterial({ color: 0x111111 });
// Добавки к высоте земли для героя (бревно через овраг и т. п.): функции (x, z) → высота или null. Трасса учитывает их вместе со своей (src/world/highway.js)
const groundExtras = [];
function groundExtraHeight(x, z, base) {
  let h = base;
  for (const f of groundExtras) {
    const v = f(x, z);
    if (v !== null && v !== undefined && v > h) h = v;
  }
  return h;
}

function boxWithEdges(w, h, d, color) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, new LitMaterial({ color }));
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), cityEdgeMat));
  return mesh;
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => min + Math.random() * (max - min);

// Плоский прямоугольник на земле (двор, площадка, парковка)
function flatRect(w, d, color, y, x, z) {
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new LitMaterial({ color, side: THREE.DoubleSide }),
  );
  quad.rotation.x = -Math.PI / 2;
  quad.position.set(x, y, z);
  cityGroup.add(quad);
  return quad;
}
