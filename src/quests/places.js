// src/quests/places.js
// МЕСТА ДЛЯ КВЕСТОВ. Данные квестов не знают координат, они ссылаются на имена (docs/mechanics/core.md, «Места»).
// Здесь имена привязываются к настоящему миру. Когда квестовая система переедет в код локаций,
// каждое место будет объявлено рядом со своей локацией.

// Сцена у реки: тело и оцепление. «Подошел» — с того же расстояния, с которого игра считает, что игрок на месте
definePlace('bridge.scene', { x: incident.x, z: incident.z, r: incidentArriveDist, name: 'Мост' });

// Заречье: место берем у здания, поставленного в src/locations/zarechye/grandma.js (координаты там локальные)
const questBuildingAt = (id) => placedBuildings.find((b) => b.id === id);
{
  const house = questBuildingAt('grandma_house');
  const tree = questBuildingAt('treehouse');
  definePlace('zarechye.house', { x: house.x, z: house.z, r: 34, name: 'Дом Анны Петровны' }); // двор, калитка и крыльцо
  definePlace('zarechye.tree', { x: tree.x, z: tree.z, r: 14, name: 'Дерево с домиком' }); // за оврагом
}

// Торговый центр: у входа снаружи (метка для квестов; сама Людмила стоит внутри, src/quests/hooks.js)
definePlace('mall.entrance', { x: shopDoorOutside.x, z: shopDoorOutside.z, r: 14, name: 'Торговый центр' });

// Сосновка: Денис ждет на улице поселка недалеко от дома героя (квест 2.02)
definePlace('village.denis', { x: villageX - 18, z: 7, r: 24, name: 'Сосновка, улица' });

// Библиотека в городе 1 (здание-заготовка, src/locations/city/city-buildings.js)
{
  const lib = questBuildingAt('library');
  definePlace('city.library', { x: lib.x, z: lib.z, r: 34, name: 'Библиотека' });
}

// Двор у заправки: к северу от бетонной площадки (gasX, gasPumpZ — src/locations/city/gas-station.js) стоят кузница
// Михалыча и мастерская Рустама, на самой заправке — Николай Палыч. Пока вместо Каменки и города: ближе к трассе
definePlace('yard.forge', { x: gasX - 10, z: -27, r: 12, name: 'Кузница Михалыча' });
definePlace('yard.garage', { x: gasX + 12, z: -27, r: 12, name: 'Автомастерская Рустама' });
definePlace('yard.nikolai', { x: gasX + 11, z: -18, r: 10, name: 'Заправка' });

// Сосновка: старая голубятня (тайник Веры) и домашний сервер героя, оба на краю улицы (квест 3.04)
definePlace('village.loft', { x: villageX + 62, z: 9, r: 8, name: 'Старая голубятня' });
definePlace('village.server', { x: villageX + 42, z: 9, r: 8, name: 'Домашний сервер' });

// Лаборатория (src/locations/lab/lab.js): территория, потайной люк, подвал с залом капсул, сборочный зал и кабинет Штерна
definePlace('lab.gate', { x: labX, z: labZ - 40, r: 14, name: 'Ворота лаборатории' });
definePlace('lab.desk', { x: labX - 14, z: labZ - 12, r: 6, name: 'Рабочий стол Веры' });
definePlace('lab.hatch', { x: labX + 14, z: labZ - 12, r: 6, name: 'Потайной люк' });
definePlace('lab.basement', { x: labX, z: labBasementZ1 + 8, r: 10, name: 'Подвал лаборатории' });
definePlace('lab.arsenal', { x: labX - 30, z: labBasementZ1 + 24, r: 8, name: 'Арсенал цеха' });
definePlace('lab.hall', { x: labX, z: labBasementZ1 + 40, r: 22, name: 'Зал капсул' });
definePlace('lab.assembly', { x: labX, z: labWallZ + 30, r: 22, name: 'Сборочный зал' });
definePlace('lab.office', { x: labX + 30, z: labWallZ + 50, r: 8, name: 'Кабинет Штерна' });

// Погоня (квест 2.12): старт на трассе западнее заправки и пять заграждений-шикан, которые не проехать без заноса
definePlace('chase.start', { x: -700, z: 3, r: 10, name: 'Старт погони' });
for (let i = 0; i < 5; i++) definePlace('chase.b' + (i + 1), { x: -600 + i * 70, z: 0, r: 6, name: 'Заграждение' });

// Прилавки у торгового центра (квест 2.13): справа от парковки
definePlace('mall.stalls', { x: 40, z: -18, r: 12, name: 'Прилавки у торгового центра' });

// Башня в центре (src/locations/tower/tower.js): подножие, вход, площадка вертолетика и девять площадок-этажей (квест 4.12)
definePlace('tower.base', { x: towerX, z: towerZ, r: 40, name: 'Башня' });
definePlace('tower.door', { x: towerX, z: towerZ - 14, r: 8, name: 'Вход в башню' });
definePlace('tower.pad', { x: towerX + 20, z: towerZ - 16, r: 8, name: 'Площадка вертолетика' });
for (let i = 1; i <= 9; i++) definePlace('tower.f' + i, { x: towerFloorX(i), z: towerFloorZ, r: 16, name: i + ' этаж башни' });

// Гоночный трек (src/locations/track/track.js): старт и финиш, восемь контрольных точек по кольцу по часовой стрелке (квест 3.05)
definePlace('track.start', { x: trackX, z: trackZ - trackHalfD, r: 16, name: 'Старт и финиш трека' });
{
  const x1 = trackX - trackHalfW;
  const x2 = trackX + trackHalfW;
  const z1 = trackZ - trackHalfD;
  const z2 = trackZ + trackHalfD;
  const points = [[x1 + 100, z1], [x2, z1 + 40], [x2, z2 - 40], [x2 - 50, z2], [trackX, z2], [x1 + 50, z2], [x1, z2 - 40], [x1, z1 + 40]];
  points.forEach(([x, z], i) => definePlace('track.cp' + (i + 1), { x, z, r: 16, name: 'Контрольная точка ' + (i + 1) }));
}
