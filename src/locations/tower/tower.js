// src/locations/tower/tower.js
// БАШНЯ В ЦЕНТРЕ (квест 4.12 «Бомба на крыше»): десятиэтажное здание у трассы между торговым центром и первым городом и,
// южнее, ряд из девяти площадок-этажей. Бои не идут внутри зданий (src/engine/enemy-attacks.js), поэтому каждый этаж — открытая
// площадка со стенами; лестница на этаже переносит героя на следующий. Сама башня снаружи — высокая коробка с бомбой на крыше
// (objects: src/content/world.js), до крыши добирается радиоуправляемый вертолетик (src/quests/heli.js).
//
//   towerFloorX(i), towerFloorZ — центр площадки i-го этажа (i от 1 до 9); координаты — src/locations/shared/coords.js. Это отдельная
//   локация (страница locations/tower.html): сюда переносит дверь башни из основного мира, аварийный выход с девятого этажа ведет обратно.
//   Сама башня снаружи (высокая коробка с бомбой) и площадка вертолетика — в основном мире (src/locations/entrances/entrances.js).
//
// Подключается только на странице locations/tower.html: после src/locations/shared/location.js, до location-finish.js.

{
  const strip = { x1: towerFloorX(1) - 24, x2: towerFloorX(9) + 24, z1: towerFloorZ - 22, z2: towerFloorZ + 22 };
  registerZone('tower_floors', 'Башня: этажи', strip, {});
  clearZones.push(strip);

  const wall = (x1, z1, x2, z2, h, color, thick = 0.8) => {
    const w = Math.max(Math.abs(x2 - x1), thick);
    const d = Math.max(Math.abs(z2 - z1), thick);
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    const box = boxWithEdges(w, h, d, color);
    box.position.set(cx, h / 2, cz);
    cityGroup.add(box);
    addObstacle({ x: cx, z: cz, hx: w / 2, hz: d / 2 });
    mapObjects.push({ x: cx, z: cz, hx: w / 2, hz: d / 2, color: '#' + color.toString(16).padStart(6, '0') });
  };

  // Девять площадок-этажей: пол разного оттенка, высокие стены без проемов (входят и выходят только по лестнице-переносу)
  const floorColors = [0x8a8f96, 0x84898f, 0x7e838a, 0x787d84, 0x72777e, 0x6c7178, 0x666b72, 0x60656c, 0x5a5f66];
  for (let i = 1; i <= 9; i++) {
    const x = towerFloorX(i);
    flatRect(30, 26, floorColors[i - 1], 0.012, x, towerFloorZ);
    mapObjects.push({ x, z: towerFloorZ, hx: 15, hz: 13, color: '#' + floorColors[i - 1].toString(16), ground: true });
    wall(x - 15, towerFloorZ - 13, x + 15, towerFloorZ - 13, 4, 0x4a4e56);
    wall(x - 15, towerFloorZ + 13, x + 15, towerFloorZ + 13, 4, 0x4a4e56);
    wall(x - 15, towerFloorZ - 13, x - 15, towerFloorZ + 13, 4, 0x4a4e56);
    wall(x + 15, towerFloorZ - 13, x + 15, towerFloorZ + 13, 4, 0x4a4e56);
  }
}
