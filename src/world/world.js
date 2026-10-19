// src/world/world.js
// СБОРКА МИРА после того, как все локации построены: трасса между ними, меши дорог
// и земля под лесом (с провалом под реку). Потом src/world/forest.js сажает лес, src/world/fence.js
// ставит забор.

// ТРАССА соединяет поселок, торговый центр и оба города. Поселок далеко на западе,
// поэтому на машине до города ехать долго, а пешком — очень долго
// Два участка между Сосновкой и торговым центром извилистые и холмистые (src/world/highway.js), остальное — прямая z = 0
buildHighway(villageX + villageHalfW, highwayEnd);
// Вдоль прямых участков лес не растет, вдоль кривых — полосы по насыпи (то и другое кладет buildHighway)

buildRoadMeshes();

// Земля под лесом: темно-зеленая, две части (русло реки между ними — провал)
{
  const forestGroundD = worldBounds.maxZ - worldBounds.minZ + 120;
  const groundX1 = worldBounds.minX - 60;
  const groundX2 = worldBounds.maxX + 60;
  flatRect(riverX - riverHalf - groundX1, forestGroundD, 0x1f3a26, 0.004, (groundX1 + riverX - riverHalf) / 2, 0);
  // Восточнее реки в земле прогал для оврага (ravineGap, src/locations/shared/coords.js)
  const eastX = riverX + riverHalf;
  const northD = forestGroundD / 2 + ravineGap.z1;
  const southD = forestGroundD / 2 - ravineGap.z2;
  flatRect(groundX2 - eastX, northD, 0x1f3a26, 0.004, (eastX + groundX2) / 2, (ravineGap.z1 - forestGroundD / 2) / 2);
  flatRect(groundX2 - eastX, southD, 0x1f3a26, 0.004, (eastX + groundX2) / 2, (ravineGap.z2 + forestGroundD / 2) / 2);
}
