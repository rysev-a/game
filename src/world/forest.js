// src/world/forest.js
// ЛЕС. Внутри забора деревья растут вокруг локаций (стволы — препятствия, их ищут по
// сетке treeGrid), снаружи забора — декоративные. Все деревья — три InstancedMesh.

const inClearZone = (x, z) => clearZones.some((c) => x > c.x1 && x < c.x2 && z > c.z1 && z < c.z2);

const trees = []; // деревья внутри забора: { x, z, s }
const outerTrees = []; // снаружи, только для вида
const wb = worldBounds;
const treeSpacing = 12; // мир большой: сетка реже, чтобы деревьев было не слишком много
for (let gx = wb.minX - 56; gx < wb.maxX + 56; gx += treeSpacing) {
  for (let gz = wb.minZ - 56; gz < wb.maxZ + 56; gz += treeSpacing) {
    if (Math.random() < 0.15) continue;
    const x = gx + rand(-4, 4);
    const z = gz + rand(-4, 4);
    const dist = Math.hypot(x - worldCenter.x, z - worldCenter.z);
    if (dist > worldRadius + 56) continue; // за кольцом леса вокруг забора ничего не растет
    if (Math.abs(x - riverX) < 18) continue;
    if (dist < worldRadius - 3) {
      if (inClearZone(x, z)) continue;
      const tree = { x, z, s: rand(0.8, 1.5), leafy: Math.random() < 0.3 };
      trees.push(tree);
      const key = Math.floor(x / treeCell) + ',' + Math.floor(z / treeCell);
      if (!treeGrid.has(key)) treeGrid.set(key, []);
      treeGrid.get(key).push(tree);
    } else if (dist > worldRadius + 3) {
      outerTrees.push({ x, z, s: rand(0.8, 1.5), leafy: Math.random() < 0.3 });
    }
  }
}

// Ели (30% деревьев — лиственные, src/models/props.js) и кусты: у каждой части свой InstancedMesh,
// всего семь draw call на весь лес
{
  const all = trees.concat(outerTrees);
  const firs = all.filter((t) => !t.leafy);
  const leafy = all.filter((t) => t.leafy);
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.6, 5);
  trunkGeo.translate(0, 0.8, 0);
  const lowGeo = new THREE.ConeGeometry(1.9, 3.4, 6);
  lowGeo.translate(0, 2.9, 0);
  const highGeo = new THREE.ConeGeometry(1.4, 2.8, 6);
  highGeo.translate(0, 4.6, 0);
  const trunkMat = new THREE.MeshBasicMaterial({ color: 0x5a3d26 });
  const white = () => new THREE.MeshBasicMaterial({ color: 0xffffff }); // цвет задает setColorAt
  const greens = [0x2f6b3a, 0x3a7a42, 0x265a33, 0x4a8a3c];
  const m4 = new THREE.Matrix4();
  const tint = new THREE.Color();

  // parts: [геометрия, материал, красить ли в зеленый]; list: { x, z, s }
  function plant(list, parts, palette) {
    const meshes = parts.map(([geo, mat]) => new THREE.InstancedMesh(geo, mat, list.length));
    list.forEach((t, i) => {
      m4.makeRotationY(t.r || 0).scale(new THREE.Vector3(t.s, t.s, t.s)).setPosition(t.x, 0, t.z);
      tint.setHex(pick(palette));
      meshes.forEach((mesh, k) => {
        mesh.setMatrixAt(i, m4);
        if (parts[k][2]) mesh.setColorAt(i, tint);
      });
    });
    for (const mesh of meshes) {
      mesh.frustumCulled = false; // bounding sphere у InstancedMesh не учитывает инстансы
      cityGroup.add(mesh);
    }
  }
  plant(firs, [[trunkGeo, trunkMat], [lowGeo, white(), true], [highGeo, white(), true]], greens);
  for (const t of leafy) t.r = rand(0, Math.PI * 2);
  plant(
    leafy,
    [[leafyTrunkGeo, trunkMat], [leafyCrownGeo, white(), true], [leafyTopGeo, white(), true]],
    leafyGreens,
  );

  // Кусты — только для вида (не препятствия): на опушках рядом с деревьями внутри забора
  const bushes = [];
  for (const t of trees) {
    if (Math.random() < 0.35) {
      const a = rand(0, Math.PI * 2);
      const x = t.x + Math.cos(a) * rand(2.5, 4.5);
      const z = t.z + Math.sin(a) * rand(2.5, 4.5);
      if (!inClearZone(x, z) && Math.abs(x - riverX) >= 18) bushes.push({ x, z, s: rand(0.7, 1.3), r: rand(0, 6.3) });
    }
  }
  plant(bushes, [[bushGeo, white(), true]], [0x3f7a35, 0x4f8a3a, 0x356b30]);
}
