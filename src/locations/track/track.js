// src/locations/track/track.js
// ГОНОЧНЫЙ ТРЕК за городом (квест 3.05 «Крутая тачка»): замкнутая кольцевая дорога-прямоугольник 300 × 180 к югу от трассы,
// между поселком и лабораторией, и подъездная дорога к трассе. Рустам любит здесь кататься и принимает зачет у тех, кто умеет водить:
// проехать круг за отведенное время и пройти все контрольные точки по порядку (места track.cp1…cp8 и track.start — src/quests/places.js).
//
//   trackX, trackZ — центр; старт и финиш — на северной стороне посередине (trackX, trackZ − 90), гонка идет на восток по часовой стрелке.
//   Координаты — src/locations/shared/coords.js. Это отдельная локация (страница locations/track.html): в основной мир с нее выезжают
//   по подъездной дороге на север (переход track.exit → основной мир), а в основном мире у съезда с трассы стоит вход (src/locations/entrances).
//
// Подключается только на странице locations/track.html: после src/locations/shared/location.js, до location-finish.js (дороги строятся там).

{
  const rect = { x1: trackX - trackHalfW - 30, x2: trackX + trackHalfW + 30, z1: -60, z2: trackZ + trackHalfD + 30 };
  registerZone('track', 'Гоночный трек', { x1: rect.x1, x2: rect.x2, z1: trackZ - trackHalfD - 20, z2: rect.z2 }, {});
  clearZones.push(rect); // и сам трек, и подъездная дорога к трассе

  const x1 = trackX - trackHalfW;
  const x2 = trackX + trackHalfW;
  const z1 = trackZ - trackHalfD;
  const z2 = trackZ + trackHalfD;
  // Четыре стороны кольца и четыре угла (асфальт без разметки)
  roadH(x1, x2, z1, 'asphalt', [], trackRoadW);
  roadH(x1, x2, z2, 'asphalt', [], trackRoadW);
  for (const x of [x1, x2]) {
    // боковые стороны той же ширины, что и горизонтальные (roadV кладет дорогу стандартной ширины)
    pushQuad(roadBatches.asphalt.verts, x, (z1 + z2) / 2, trackRoadW / 2, (z2 - z1) / 2, 0.02);
    mapRoads.push({ x1: x, z1, x2: x, z2, color: roadBatches.asphalt.mapColor, width: trackRoadW });
  }
  for (const [cx, cz] of [[x1, z1], [x2, z1], [x1, z2], [x2, z2]]) {
    pushQuad(roadBatches.asphalt.verts, cx, cz, trackRoadW / 2, trackRoadW / 2, 0.02);
  }
  // Подъезд: от стартовой прямой на север до выезда из локации (в основной мир)
  roadV(-40, z1 - trackRoadW / 2, trackX, 'asphalt', []);
  // Внутри и вокруг кольца — утоптанная земля, а не лес
  flatRect(trackHalfW * 2 - trackRoadW, trackHalfD * 2 - trackRoadW, 0x4f6a3c, 0.012, trackX, trackZ);
  mapObjects.push({ x: trackX, z: trackZ, hx: trackHalfW, hz: trackHalfD, color: '#4f6a3c', ground: true });
}
