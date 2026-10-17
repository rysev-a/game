// src/locations/shared/coords.js
// КООРДИНАТЫ ЛОКАЦИЙ. Трек, лаборатория и этажи башни — отдельные локации (отдельные страницы locations/*.html, у каждой свой
// небольшой мир), чтобы большой мир и память браузера не раздувались. Координаты — одни и те же для страницы локации, для входов
// в основном мире (src/locations/entrances/entrances.js) и для мест квестов (src/content/places-locations.js), поэтому лежат здесь.
// Подключается сразу после src/engine/layout.js на всех страницах.

// Гоночный трек (location: 'track'): кольцо 300 × 180, старт и финиш на северной стороне посередине
const trackX = -620;
const trackZ = 280;
const trackHalfW = 150;
const trackHalfD = 90;
const trackRoadW = 22;

// Лаборатория (location: 'lab'): территория с воротами на севере и подвал дальше на юг
const labX = -330;
const labZ = 130;
const labHalfW = 30; // половина ширины главной территории
const labBasementZ1 = labZ + 80;
const labBasementZ2 = labZ + 200;
const labWallZ = labZ + 142; // внутренняя стена подвала: зал капсул — сборочный зал

// Башня в центре: сама башня стоит в основном мире (main), девять площадок-этажей — отдельная локация (location: 'tower')
const towerX = 70;
const towerZ = 70;
const towerFloorZ = 250;
const towerFloorX = (i) => -130 + (i - 1) * 38;

// Локации: страница, название, круглый мир (центр и радиус) и точка, где окажется игрок, если страницу открыли напрямую
const LOCATIONS = {
  main: { page: 'index.html', name: 'Мир' },
  track: { page: 'locations/track.html', name: 'Гоночный трек', center: { x: trackX, z: 200 }, radius: 290, start: { x: trackX, z: 30, heading: Math.PI } },
  lab: { page: 'locations/lab.html', name: 'Лаборатория', center: { x: labX, z: 215 }, radius: 175, start: { x: labX, z: 90, heading: Math.PI } },
  tower: { page: 'locations/tower.html', name: 'Башня: этажи', center: { x: -130 + 4 * 38, z: towerFloorZ }, radius: 200, start: { x: towerFloorX(1) - 6, z: towerFloorZ, heading: -Math.PI / 2 } },
};
