// src/locations/shared/location.js
// ОСНОВА МИРА-ЛОКАЦИИ (трек, лаборатория, этажи башни: src/locations/shared/locations.js выбирает, какой мир строить). Вместо большого мира
// страница строит один небольшой круглый мир (центр и радиус — LOCATIONS в src/locations/shared/coords.js): зеленая земля внутри
// забора, сам забор и лес снаружи (src/world/fence.js, forest.js), и только своя локация (src/locations/<id>/<id>.js).
// Здесь — заглушки того, что главный цикл спрашивает у большого мира (как в src/demo/demo.js), и машина героя: у локации ее
// выдает основной мир при переходе (src/quests/transit.js), а если страницу открыли напрямую — она стоит на старте.
// GAME_LOCATION (id локации), demoWorldRadius и demoWorldCenter задает src/locations/shared/locations.js до layout.js.

const incident = { arrived: false, state: 'waiting' };
function updateIncident() {}
function updateGasStation() {}
function updateMallPeople() {}

// Земля всего круга — зеленая: ни в мире, ни на карте нет пустых темных полей
{
  const disc = new THREE.Mesh(new THREE.CircleGeometry(worldRadius + 450, 160), new LitMaterial({ color: 0x356b3a, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(worldCenter.x, 0.003, worldCenter.z);
  cityGroup.add(disc);
  registerZone('loc_' + GAME_LOCATION, LOCATIONS[GAME_LOCATION].name, { x1: worldBounds.minX, x2: worldBounds.maxX, z1: worldBounds.minZ, z2: worldBounds.maxZ }, { birds: 0.5 });
}

// Двери гаража у героя в этой локации нет, но сохранение и загрузка трогают garage: заглушка вдали от мира
garage.doorShape = { x: worldCenter.x, z: worldCenter.z - worldRadius - 500, ux: 1, uz: 0, vx: 0, vz: 1, hu: 0.1, hv: 0.1 };

// Машина героя: у старта локации (если игрок пришел из другой локации, ее переставят на место прибытия)
{
  const start = LOCATIONS[GAME_LOCATION].start;
  const car = addCar(start.x, start.z - 6, start.heading, {
    color: 0x1fb3a6,
    fuel: 0.65,
    keyId: 'keys',
    model: { stripeColor: 0xf4f1e6, roofRack: true, plateText: 'ДЕТ 001' },
  });
  car.isPlayerCar = true;
  markPlayerCar(car);
  garage.car = car;
}
const demoStart = { x: LOCATIONS[GAME_LOCATION].start.x + 5, z: LOCATIONS[GAME_LOCATION].start.z }; // точка старта игрока (src/engine/game.js)
