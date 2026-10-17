// src/locations/entrances/entrances.js
// ВХОДЫ В ОТДЕЛЬНЫЕ ЛОКАЦИИ И БАШНЯ СНАРУЖИ — основной мир. Трек, лаборатория и этажи башни — отдельные страницы со своим небольшим миром
// (locations/*.html, src/locations/shared/location.js): так большой мир и память браузера не раздуваются. Здесь, в основном мире:
//   • к югу от трассы уходят две дороги — к гоночному треку (по оси trackX) и к лаборатории (по оси labX); у каждой на конце знак и
//     точка перехода (src/content/portals.js: на конце дороги въезд переносит в локацию);
//   • башня в центре (ее площадка и зона; сама башня и бомба на крыше — объекты мира src/content/world.js), площадка вертолетика.
// Координаты — src/locations/shared/coords.js. Подключается после src/locations/bridge/incident.js, до src/world/world.js.

{
  // Дороги от трассы: асфальт на 60 вниз, лес по краям не растет
  for (const [x, label] of [[trackX, 'Гоночный трек'], [labX, 'Лаборатория']]) {
    roadV(9, 64, x, 'asphalt', []);
    clearZones.push({ x1: x - 14, x2: x + 14, z1: 9, z2: 76 });
    // Знак у съезда: столб и табличка (цвета: трек — синяя, лаборатория — серая)
    const post = boxWithEdges(0.3, 3.2, 0.3, 0x3a3e44);
    post.position.set(x + 9, 1.6, 22);
    cityGroup.add(post);
    const board = boxWithEdges(5.6, 1.6, 0.3, x === trackX ? 0x3a7bd5 : 0x6a6e72);
    board.position.set(x + 9, 3.6, 22);
    cityGroup.add(board);
    addHoverInfo(board, { kind: 'Знак', name: label, desc: 'Съезд с трассы на юг. В конце дороги въезд в «' + label + '».' });
    // Шлагбаум на конце дороги: красно-белая полоса (декор: переход срабатывает при въезде)
    const bar = boxWithEdges(9, 0.3, 0.3, 0xd23c3c);
    bar.position.set(x, 1.3, 66);
    cityGroup.add(bar);
  }

  // Башня в центре: земля вокруг и зона; сама башня — объект мира (src/content/world.js)
  registerZone('tower', 'Башня', { x1: towerX - 34, x2: towerX + 34, z1: towerZ - 30, z2: towerZ + 30 }, {});
  clearZones.push({ x1: towerX - 34, x2: towerX + 34, z1: towerZ - 30, z2: towerZ + 30 });
  flatRect(60, 56, 0x6a6e72, 0.012, towerX, towerZ);
  mapObjects.push({ x: towerX, z: towerZ, hx: 30, hz: 28, color: '#6a6e72', ground: true });
}
