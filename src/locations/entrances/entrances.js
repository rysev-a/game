// src/locations/entrances/entrances.js
// ВХОДЫ В ОТДЕЛЬНЫЕ ЛОКАЦИИ И БАШНЯ СНАРУЖИ — основной мир. Трек, лаборатория и этажи башни — отдельные страницы со своим небольшим миром
// (locations/*.html, src/locations/shared/location.js): так большой мир и память браузера не раздуваются. Здесь, в основном мире:
//   • к югу от трассы уходят две дороги — к гоночному треку (по оси trackX) и к лаборатории (по оси labX); у каждой у съезда знак, а дальше по дороге
//     точка перехода (src/content/portals.js: проехал — оказался в мире локации, дорога там продолжается);
//   • башня в центре (ее площадка и зона; сама башня и бомба на крыше — объекты мира src/content/world.js), площадка вертолетика.
// Координаты — src/locations/shared/coords.js. Подключается после src/locations/bridge/incident.js, до src/world/world.js.

{
  // Дороги от трассы: асфальт на юг, лес по краям не растет. Дорога идет дальше точки перехода и никак не кончается: едешь — и в какой-то момент
  // мир сменяется на мир локации (src/content/portals.js), а дорога там продолжается. Трек дальше от трассы: его дорога длиннее
  for (const [x, label, endZ] of [[trackX, 'Гоночный трек', 190], [labX, 'Лаборатория', 96]]) {
    roadV(9, endZ, x, 'asphalt', []);
    clearZones.push({ x1: x - 14, x2: x + 14, z1: 9, z2: endZ + 12 });
    // Знак у съезда: столб и табличка (цвета: трек — синяя, лаборатория — серая)
    const post = boxWithEdges(0.3, 3.2, 0.3, 0x3a3e44);
    post.position.set(x + 9, 1.6, 22);
    cityGroup.add(post);
    const board = boxWithEdges(5.6, 1.6, 0.3, x === trackX ? 0x3a7bd5 : 0x6a6e72);
    board.position.set(x + 9, 3.6, 22);
    cityGroup.add(board);
    addHoverInfo(board, { kind: 'Знак', name: label, desc: 'Съезд с трассы на юг. Дорога ведет в «' + label + '».' });
  }

  // Башня в центре: земля вокруг и зона; сама башня — объект мира (src/content/world.js)
  registerZone('tower', 'Башня', { x1: towerX - 34, x2: towerX + 34, z1: towerZ - 30, z2: towerZ + 30 }, {});
  clearZones.push({ x1: towerX - 34, x2: towerX + 34, z1: towerZ - 30, z2: towerZ + 30 });
  flatRect(60, 56, 0x6a6e72, 0.012, towerX, towerZ);
  mapObjects.push({ x: towerX, z: towerZ, hx: 30, hz: 28, color: '#6a6e72', ground: true });
}
