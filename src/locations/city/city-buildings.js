// src/locations/city/city-buildings.js
// Здания-заготовки в городе на трассе (город 1, x = 220): библиотека на центральной улице
// и IT-компания через дорогу. Участки под них оставлены пустыми в src/locations/city/city.js (reserved).
// Подключается после city.js.
{
  const city = cities[0];
  for (const [i, row] of city.reserved) flatRect(22, 22, 0x3c3c3c, 0.015, city.x + i * cityStep, city.z + row);
  // Библиотека: северная сторона главной улицы, фасад с колоннами к дороге
  placeBuilding('library', { x: city.x, z: city.z - 20, heading: 0 });
  // IT-компания: южная сторона, фасад к дороге (на север), генератор во дворе за зданием
  placeBuilding('it_company', { x: city.x + cityStep, z: city.z + 19, heading: Math.PI });
}
