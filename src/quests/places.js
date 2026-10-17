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
