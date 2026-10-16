// src/models/items.js
// ВЕЩИ В МИРЕ — объемные пиксельные модели. Каждая вещь собирается из кубиков по своему значку
// 12×12 из инвентаря (PIXEL_ART в src/player/icons.js): каждый пиксель значка становится кубиком,
// толщина модели — два кубика. Поэтому ключи на столе выглядят так же, как в инвентаре.
//
// Подключение (после src/player/icons.js):
//   <script src="src/models/items.js"></script>
// Использование:
//   const keys = createItemModel('keys');          // ~0,6 юнита в высоту, стоит на y = 0
//   const big = createItemModel('canister', 1.0);  // size — ширина значка (12 пикселей) в юнитах
// Модель — Group с одной сеткой (цвета в вершинах) и темным контуром по силуэту.
// Геометрия кешируется по значку и размеру; материал у каждой модели свой (его меняет подсветка
// при наведении мышью — src/engine/interact.js).
//
// Зависимость: глобальный THREE (three.js r128+), PIXEL_ART и ITEMS (берется ITEMS[id].icon).

const itemEdgeMat = new THREE.LineBasicMaterial({ color: 0x111111 });
const itemGeoCache = new Map();
const itemVoxelDepth = 2; // толщина модели в кубиках

// Яркость граней: свет «сверху-спереди», так кубики читаются объемными без освещения сцены
const itemFaceShade = { front: 1, back: 0.8, top: 1.08, bottom: 0.6, side: 0.78 };

function itemModelGeometry(icon, size) {
  const key = icon + '|' + size;
  if (itemGeoCache.has(key)) return itemGeoCache.get(key);
  const art = PIXEL_ART[icon] || PIXEL_ART.keys;
  const n = art.rows.length;
  const filled = (x, y) => y >= 0 && y < n && x >= 0 && x < 12 && art.palette[art.rows[y][x]] !== undefined;

  // Габариты закрашенных пикселей: модель по центру по X и стоит нижним пикселем на y = 0
  let minX = 12, maxX = -1, maxY = -1;
  art.rows.forEach((row, y) => {
    for (let x = 0; x < 12; x++) {
      if (!filled(x, y)) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  });
  const s = size / 12;
  const cx = (minX + maxX + 1) / 2;
  const depth = itemVoxelDepth * s;

  const pos = [];
  const col = [];
  const c = new THREE.Color();
  // Грань-квадрат из двух треугольников; a, b, cc, d — углы по кругу
  function quad(a, b, cc, d, color, shade) {
    for (const v of [a, b, cc, a, cc, d]) {
      pos.push(v[0], v[1], v[2]);
      col.push(color.r * shade, color.g * shade, color.b * shade);
    }
  }

  art.rows.forEach((row, y) => {
    for (let x = 0; x < 12; x++) {
      if (!filled(x, y)) continue;
      c.set(art.palette[row[x]]);
      const x0 = (x - cx) * s, x1 = x0 + s;
      const y1 = (maxY + 1 - y) * s, y0 = y1 - s; // строка 0 значка — верх модели
      const z0 = -depth / 2, z1 = depth / 2;
      quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], c, itemFaceShade.front);
      quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], c, itemFaceShade.back);
      // Боковые грани — только там, где соседнего пикселя нет
      if (!filled(x, y - 1)) quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], c, itemFaceShade.top);
      if (!filled(x, y + 1)) quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], c, itemFaceShade.bottom);
      if (!filled(x - 1, y)) quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], c, itemFaceShade.side);
      if (!filled(x + 1, y)) quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], c, itemFaceShade.side);
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  // Контур: ребра между гранями под углом (плоские стыки соседних кубиков не рисуются)
  const entry = { geo, edges: new THREE.EdgesGeometry(geo, 30) };
  itemGeoCache.set(key, entry);
  return entry;
}

function createItemModel(id, size = 0.6) {
  const icon = (ITEMS[id] && ITEMS[id].icon) || id;
  const { geo, edges } = itemModelGeometry(icon, size);
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(geo, new LitMaterial({ vertexColors: true }));
  mesh.add(new THREE.LineSegments(edges, itemEdgeMat));
  root.add(mesh);
  return root;
}
