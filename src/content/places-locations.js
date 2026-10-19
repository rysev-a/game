// src/content/places-locations.js
// МЕСТА ОТДЕЛЬНЫХ ЛОКАЦИЙ (трек, лаборатория, этажи башни) и входы в них из основного мира. У места поле location: на какой странице оно
// существует (по умолчанию 'main'); на другой странице расстояния до него нет (src/core/game.js). Координаты — src/locations/shared/coords.js.

// ---- Гоночный трек (отдельный мир, src/locations/shared/locations.js): старт и финиш, восемь контрольных точек по «Складкам», автосалон (квест 3.05)
definePlace('track.start', { location: 'track', x: trackPath.start.x, z: trackPath.start.z, r: 16, name: 'Старт и финиш трека' });
// Восемь контрольных ворот по «колбаскам» (змейкам) — точки на оси трека, считаются по порядку (src/locations/shared/coords.js: trackCheckpoints)
trackCheckpoints.forEach((c, i) => definePlace('track.cp' + (i + 1), { location: 'track', x: Math.round(c.x), z: Math.round(c.z), r: 16, name: 'Контрольная точка ' + (i + 1) }));
// Разгон перед линией старта: сюда ставят героя перед новой попыткой (лицом на восток), в счет контрольных точек она не входит
definePlace('track.pre', { location: 'track', x: trackPath.start.x - 30, z: trackPath.start.z, r: 14, name: 'Разгон перед стартом' });
// Автосалон при въезде на трек (его директор стоит у входа)
definePlace('track.salon', { location: 'track', x: trackX + 58, z: 100, r: 10, name: 'Автосалон на треке' });
definePlace('track.gate', { location: 'track', x: trackX, z: 158, r: 10, name: 'Въезд на трек' }); // сюда приезжают из основного мира
definePlace('track.exit', { location: 'track', x: trackX, z: trackExitZ, r: 12, name: 'Выезд с трека' }); // отсюда уезжают в основной мир
// В основном мире: конец съезда с трассы (въезд на трек) и место, где выезжают с трека
definePlace('track.entrance', { x: trackX, z: 150, r: 12, name: 'Дорога к гоночному треку' });
definePlace('track.back', { x: trackX, z: 30, r: 8, name: 'Дорога с трека' });

// ---- Лаборатория (отдельный мир): территория, потайной люк, подвал с залом капсул, сборочный зал и кабинет Штерна (квесты 4.09, 4.11)
definePlace('lab.gate', { location: 'lab', x: labX, z: labZ - 40, r: 14, name: 'Ворота лаборатории' });
definePlace('lab.exit', { location: 'lab', x: labX, z: labExitZ, r: 12, name: 'Выезд из лаборатории' }); // на дороге севернее ворот, внутри забора мира (раньше стоял за забором и был недостижим)
definePlace('lab.desk', { location: 'lab', x: labX - 14, z: labZ - 12, r: 6, name: 'Рабочий стол Веры' });
definePlace('lab.hatch', { location: 'lab', x: labX + 14, z: labZ - 12, r: 6, name: 'Потайной люк' });
definePlace('lab.basement', { location: 'lab', x: labX, z: labBasementZ1 + 8, r: 10, name: 'Подвал лаборатории' });
definePlace('lab.arsenal', { location: 'lab', x: labX - 30, z: labBasementZ1 + 24, r: 8, name: 'Арсенал цеха' });
definePlace('lab.hall', { location: 'lab', x: labX, z: labBasementZ1 + 40, r: 22, name: 'Зал капсул' });
definePlace('lab.assembly', { location: 'lab', x: labX, z: labWallZ + 30, r: 22, name: 'Сборочный зал' });
definePlace('lab.office', { location: 'lab', x: labX + 30, z: labWallZ + 50, r: 8, name: 'Кабинет Штерна' });
definePlace('lab.entrance', { x: labX, z: 58, r: 12, name: 'Дорога к лаборатории' }); // основной мир
definePlace('lab.back', { x: labX, z: 30, r: 8, name: 'Съезд от лаборатории' });

// ---- Девять площадок-этажей башни (отдельный мир, квест 4.12)
for (let i = 1; i <= 9; i++) {
  const loc = 'tower' + i; // каждый этаж — свой мир (src/locations/tower/tower.js)
  definePlace('tower.f' + i, { location: loc, x: 0, z: 0, r: 16, name: i + ' этаж башни' });
  // Площадки перед лестницами: сюда выходит герой, поднявшись снизу (перед лестницей вниз) или спустившись сверху (перед лестницей вверх); на них метки шагов
  definePlace('tower.up' + i, { location: loc, x: towerFloor.up.x - 9, z: towerFloor.up.z, r: 6, name: 'Лестница вверх, ' + i + ' этаж' });
  definePlace('tower.down' + i, { location: loc, x: towerFloor.down.x + 9, z: towerFloor.down.z, r: 6, name: 'Лестница вниз, ' + i + ' этаж' });
}
definePlace('tower.exit9', { location: 'tower9', x: -44, z: -36, r: 6, name: 'Аварийный выход, 9 этаж' });
