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
