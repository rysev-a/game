// src/engine/layout.js
// Раскладка мира: главные координаты. Мир круглый (радиус worldRadius), в центре — трасса вдоль оси X,
// с запада на восток: поселок (дом игрока) → … очень далеко … → торговый центр → город 1 → река с мостом → город 2.
// От трассы на север и на юг уходят две дороги к четырем другим городам (города 3–6, см. src/locations/city/city.js).
// Поселок нарочно далеко: на машине до города ехать долго, пешком — очень долго.
const villageX = -1300; // центр поселка
const riverX = 350; // центр реки (совпадает с cityXs[0] + cityEdge + 40)
const riverHalf = 16; // половина ширины русла по верху берегов

// Граница мира — круг, по нему идет сетчатый забор, дальше выйти нельзя
const worldCenter = typeof demoWorldCenter === 'object' ? demoWorldCenter : { x: -375, z: 0 }; // в ДЕМО — центр своей локации (demo/*.html)
// В ДЕМО у каждой локации свой круглый мир (demoWorldRadius и demoWorldCenter задают demo/races.html, lab.html, characters.html)
const worldRadius = typeof demoWorldRadius === 'number' ? demoWorldRadius : 1100;
// Описанный квадрат (для земли, леса и миникарты): карта получается квадратной
const worldBounds = {
  minX: worldCenter.x - worldRadius,
  maxX: worldCenter.x + worldRadius,
  minZ: worldCenter.z - worldRadius,
  maxZ: worldCenter.z + worldRadius,
};
// Точка внутри круга мира, не ближе margin к забору
const insideWorldCircle = (x, z, margin = 0) =>
  Math.hypot(x - worldCenter.x, z - worldCenter.z) <= worldRadius - margin;
