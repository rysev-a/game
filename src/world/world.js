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
  flatRect(groundX2 - riverX - riverHalf, forestGroundD, 0x1f3a26, 0.004, (riverX + riverHalf + groundX2) / 2, 0);
}
