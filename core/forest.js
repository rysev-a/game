// core/forest.js
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
      const tree = { x, z, s: rand(0.8, 1.5) };
      trees.push(tree);
      const key = Math.floor(x / treeCell) + ',' + Math.floor(z / treeCell);
      if (!treeGrid.has(key)) treeGrid.set(key, []);
      treeGrid.get(key).push(tree);
    } else if (dist > worldRadius + 3) {
      outerTrees.push({ x, z, s: rand(0.8, 1.5) });
    }
  }
}

// Все деревья — три InstancedMesh (ствол и два яруса кроны): три draw call
{
  const all = trees.concat(outerTrees);
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.6, 5);
  trunkGeo.translate(0, 0.8, 0);
  const lowGeo = new THREE.ConeGeometry(1.9, 3.4, 6);
  lowGeo.translate(0, 2.9, 0);
  const highGeo = new THREE.ConeGeometry(1.4, 2.8, 6);
  highGeo.translate(0, 4.6, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshBasicMaterial({ color: 0x5a3d26 }), all.length);
  const lows = new THREE.InstancedMesh(lowGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), all.length);
  const highs = new THREE.InstancedMesh(highGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), all.length);
  const greens = [0x2f6b3a, 0x3a7a42, 0x265a33, 0x4a8a3c];
  const m4 = new THREE.Matrix4();
  const tint = new THREE.Color();
  all.forEach((t, i) => {
    m4.makeScale(t.s, t.s, t.s).setPosition(t.x, 0, t.z);
    trunks.setMatrixAt(i, m4);
    lows.setMatrixAt(i, m4);
    highs.setMatrixAt(i, m4);
    tint.setHex(pick(greens));
    lows.setColorAt(i, tint);
    highs.setColorAt(i, tint);
  });
  for (const mesh of [trunks, lows, highs]) {
    mesh.frustumCulled = false; // bounding sphere у InstancedMesh не учитывает инстансы
    cityGroup.add(mesh);
  }
}
