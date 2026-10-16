// core/ground.js
// Земля: две плоскости с провалом между ними под русло реки (ее ровно riverX ± riverHalf).
// Плоскости квадратные (описанный квадрат круглого мира с запасом): за забором все равно лес и туман.

const floorMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
const floorDepth = worldBounds.maxZ - worldBounds.minZ + 920;
for (const [x1, x2] of [
  [worldBounds.minX - 460, riverX - riverHalf],
  [riverX + riverHalf, worldBounds.maxX + 460],
]) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, floorDepth), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.x = (x1 + x2) / 2;
  cityGroup.add(floor);
}
