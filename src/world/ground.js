// src/world/ground.js
// Земля: две плоскости с провалом между ними под русло реки (ее ровно riverX ± riverHalf).
// Плоскости квадратные (описанный квадрат круглого мира с запасом): за забором все равно лес и туман.

const floorMat = new LitMaterial({ color: typeof demoWorldRadius === 'number' ? 0x1f3a26 : 0x222222 }); // в ДЕМО за забором — темная зелень, а не черные поля
const floorDepth = worldBounds.maxZ - worldBounds.minZ + 920;
// В ДЕМО реки нет — земля одной плоскостью
const floorParts = typeof demoWorldRadius === 'number'
  ? [[worldBounds.minX - 460, worldBounds.maxX + 460]]
  : [
      [worldBounds.minX - 460, riverX - riverHalf],
      [riverX + riverHalf, worldBounds.maxX + 460],
    ];
const floorZ1 = -floorDepth / 2;
const floorZ2 = floorDepth / 2;
// Часть земли восточнее реки режется полосой оврага (он вырыт ниже земли): две плоскости, север и юг от полосы
const addFloor = (x1, x2, z1, z2) => {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
  cityGroup.add(floor);
};
for (const [x1, x2] of floorParts) {
  if (typeof demoWorldRadius !== 'number' && x1 >= ravineGap.x1 - 0.01) {
    addFloor(x1, x2, floorZ1, ravineGap.z1);
    addFloor(x1, x2, ravineGap.z2, floorZ2);
  } else addFloor(x1, x2, floorZ1, floorZ2);
}
// Перемычка: на ней земля в полосе оврага не прерывается (по ней проезжает машина)
if (typeof demoWorldRadius !== 'number') addFloor(ravineCross.x1, ravineCross.x2, ravineGap.z1, ravineGap.z2);
