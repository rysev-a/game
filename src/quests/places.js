// src/quests/places.js
// МЕСТА ДЛЯ КВЕСТОВ. Данные квестов не знают координат, они ссылаются на имена (docs/mechanics/core.md, «Места»).
// Здесь имена привязываются к настоящему миру. Когда квестовая система переедет в код локаций,
// каждое место будет объявлено рядом со своей локацией.

// Сцена у реки: тело и оцепление. «Подошел» — с того же расстояния, с которого игра считает, что игрок на месте
definePlace('bridge.scene', { x: incident.x, z: incident.z, r: incidentArriveDist, name: 'Мост' });

const questBuildingAt = (id) => placedBuildings.find((b) => b.id === id);

// Дом героя в Сосновке: машина стоит в гараже носом к улице; место — на улице напротив гаража, отсюда начинаются все «не успел — на старт»
definePlace('village.home', { x: garage.car ? garage.car.x : villageX, z: 0, r: 14, name: 'Дом, Сосновка' });

// Места на дороге для «не успел — вернули и дали еще попытку» (таймеры квестов): машину можно поставить без помех
definePlace('road.city', { x: 200, z: 0, r: 14, name: 'Трасса у города' });
definePlace('zarechye.road', { x: questBuildingAt('grandma_house').x, z: questBuildingAt('grandma_house').z - 31, r: 12, name: 'Улица Заречья' }); // перед участком бабушки

// Пиццерия «Тесто» (квест 2.15) во дворе у заправки и пять адресов заказов (места на карте)
definePlace('pizza.shop', { x: -104, z: -22, r: 14, name: 'Пиццерия «Тесто»' });
definePlace('pizza.c1', { x: 0, z: -29, r: 14, name: 'Заказ 1: торговый центр' });
definePlace('pizza.c2', { x: 70, z: 56, r: 12, name: 'Заказ 2: башня' });
definePlace('pizza.c3', { x: 220, z: -20, r: 18, name: 'Заказ 3: библиотека' });
definePlace('pizza.c4', { x: 398, z: -9, r: 14, name: 'Заказ 4: заправка «Заречье»' });
definePlace('pizza.c5', { x: 448, z: -8, r: 14, name: 'Заказ 5: дом в кирпичном городе' }); // у дома на западном краю города 2

// Парковка у дома Анны Петровны (src/locations/zarechye/grandma.js): свободное место на подъездной дорожке перед гаражом, рядом с машиной бабушки
definePlace('zarechye.parking', { x: questBuildingAt('grandma_house').x - 17.7, z: questBuildingAt('grandma_house').z - 13.7, r: 6, name: 'Парковка у дома Анны Петровны' });

// Заправка «Заречье» за мостом (src/locations/city/gas-station.js): колонки к северу от трассы
definePlace('gas.zarechye', { x: 398, z: -9, r: 14, name: 'Заправка «Заречье»' });

// Заречье: место берем у здания, поставленного в src/locations/zarechye/grandma.js (координаты там локальные)
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
definePlace('yard.forge', { x: gasX - 10, z: -27, r: 12, name: 'Слесарная мастерская Михалыча' });
definePlace('yard.garage', { x: gasX + 12, z: -27, r: 12, name: 'Автомастерская Рустама' });
definePlace('yard.nikolai', { x: gasX + 11, z: -18, r: 10, name: 'Заправка' });

// Сосновка: старая голубятня (тайник Веры) и домашний сервер героя, оба на краю улицы (квест 3.04)
definePlace('village.loft', { x: villageX + 62, z: 9, r: 8, name: 'Старая голубятня' });
definePlace('village.server', { x: villageX + 42, z: 9, r: 8, name: 'Домашний сервер' });

// Погоня (квест 2.12): старт на трассе западнее заправки и пять заграждений-шикан, которые не проехать без заноса
definePlace('chase.start', { x: -700, z: 3, r: 10, name: 'Старт погони' });
// Заграждения стоят на трассе там, где дорога параллельна оси X и на земле (highwayChaseXs, src/world/highway-path.js)
highwayChaseXs.forEach((x, i) => definePlace('chase.b' + (i + 1), { x, z: highwayZ(x), r: 6, name: 'Поваленное дерево' }));

// Прилавки у торгового центра (квест 2.13): справа от парковки
definePlace('mall.stalls', { x: 40, z: -18, r: 12, name: 'Прилавки у торгового центра' });

// Башня в центре (src/locations/tower/tower.js): подножие, вход, площадка вертолетика и девять площадок-этажей (квест 4.12)
definePlace('tower.base', { x: towerX, z: towerZ, r: 40, name: 'Башня' });
definePlace('tower.door', { x: towerX, z: towerZ - 14, r: 8, name: 'Вход в башню' });
definePlace('tower.pad', { x: towerX + 20, z: towerZ - 16, r: 8, name: 'Площадка вертолетика' });

// Река и яхта Барона (квест 3.12): стоянка у моста выше по течению, два места происшествий у трассы между городами
definePlace('river.yacht', { x: riverX, z: -90, r: 24, name: 'Яхта Барона' });
definePlace('city.inc1', { x: 112, z: 9, r: 8, name: 'Место происшествия у города' });
definePlace('city.inc2', { x: 415, z: -9, r: 8, name: 'Место происшествия за рекой' });
