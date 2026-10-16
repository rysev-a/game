// core/world.js
// СБОРКА МИРА после того, как все локации построены: трасса между ними, меши дорог
// и земля под лесом (с провалом под реку). Потом core/forest.js сажает лес, core/fence.js
// ставит забор.

// ТРАССА соединяет поселок, торговый центр и оба города. Поселок далеко на западе,
// поэтому на машине до города ехать долго, а пешком — очень долго
roadH(villageX + villageHalfW, highwayEnd, 0, 'asphalt', cityCrossXs);
clearZones.push({ x1: worldBounds.minX, x2: worldBounds.maxX, z1: -9, z2: 9 }); // вдоль трассы лес не растет

buildRoadMeshes();

// Земля под лесом: темно-зеленая, две части (русло реки между ними — провал)
{
  const forestGroundD = worldBounds.maxZ - worldBounds.minZ + 120;
  const groundX1 = worldBounds.minX - 60;
  const groundX2 = worldBounds.maxX + 60;
  flatRect(riverX - riverHalf - groundX1, forestGroundD, 0x1f3a26, 0.004, (groundX1 + riverX - riverHalf) / 2, 0);
  flatRect(groundX2 - riverX - riverHalf, forestGroundD, 0x1f3a26, 0.004, (riverX + riverHalf + groundX2) / 2, 0);
}
