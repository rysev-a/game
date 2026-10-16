// src/world/roads.js
// Дороги: вся геометрия копится по цветам и собирается в один меш на цвет.
// roadH/roadV кладут полотно (и разметку) в списки, buildRoadMeshes() — один раз в конце.

// ДОРОГИ: вся геометрия копится по цветам и собирается в один меш на цвет
// (общий BufferGeometry), чтобы не плодить draw calls
const roadBatches = {
  asphalt: { color: 0x3a3a3a, mapColor: '#3a3a3a', verts: [] },
  dirt: { color: 0x7a5638, mapColor: '#7a5638', verts: [] },
  mark: { color: 0xcccccc, verts: [] }, // разметка и линии парковки
};

function pushQuad(verts, cx, cz, halfW, halfH, y) {
  verts.push(
    cx - halfW, y, cz + halfH,
    cx + halfW, y, cz + halfH,
    cx + halfW, y, cz - halfH,

    cx - halfW, y, cz + halfH,
    cx + halfW, y, cz - halfH,
    cx - halfW, y, cz - halfH,
  );
}

// Дорога вдоль X: от x1 до x2 на высоте z, шириной width. Пунктир — только на асфальте,
// с пропуском перекрестков (crossXs — координаты пересекающих дорог)
function roadH(x1, x2, z, kind, crossXs = [], width = roadWidth) {
  const batch = roadBatches[kind];
  pushQuad(batch.verts, (x1 + x2) / 2, z, (x2 - x1) / 2, width / 2, 0.02);
  mapRoads.push({ x1, z1: z, x2, z2: z, color: batch.mapColor, width });
  if (kind !== 'asphalt') return;
  for (let t = x1 + 3; t <= x2 - 3; t += 6) {
    if (crossXs.some((c) => Math.abs(t - c) < width / 2 + 2)) continue;
    pushQuad(roadBatches.mark.verts, t, z, 1.2, 0.3, 0.05);
  }
}

// Дорога вдоль Z: от z1 до z2 на координате x
function roadV(z1, z2, x, kind, crossZs = []) {
  const batch = roadBatches[kind];
  pushQuad(batch.verts, x, (z1 + z2) / 2, roadWidth / 2, (z2 - z1) / 2, 0.02);
  mapRoads.push({ x1: x, z1, x2: x, z2, color: batch.mapColor });
  if (kind !== 'asphalt') return;
  for (let t = z1 + 3; t <= z2 - 3; t += 6) {
    if (crossZs.some((c) => Math.abs(t - c) < roadWidth / 2 + 2)) continue;
    pushQuad(roadBatches.mark.verts, x, t, 0.3, 1.2, 0.05);
  }
}

// Собирает накопленные квадраты дорог в меши (вызывается один раз, когда все дороги уложены)
function buildRoadMeshes() {
  for (const batch of Object.values(roadBatches)) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(batch.verts, 3));
    cityGroup.add(
      new THREE.Mesh(geo, new LitMaterial({ color: batch.color, side: THREE.DoubleSide })),
    );
  }
}
