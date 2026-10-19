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

// Земля всего круга — зеленая: ни в мире, ни на карте нет пустых темных полей. Этаж башни (GAME_INDOORS) — без земли: вокруг только темнота
if (!GAME_INDOORS) {
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
    color: 0x22252c, // та же черная Nissan Almera Classic, что в гараже героя (src/player/home.js)
    fuel: 0.65,
    keyId: 'keys',
    model: { style: 'almera', cabinColor: 0x5d6488, plateText: 'ДЕТ 001' },
  });
  car.isPlayerCar = true;
  markPlayerCar(car);
  garage.car = car;
}
const demoStart = { x: LOCATIONS[GAME_LOCATION].start.x + 5, z: LOCATIONS[GAME_LOCATION].start.z }; // точка старта игрока (src/engine/game.js)

// Плоская табличка с текстом (Canvas): для вывесок и номеров ворот
function makeTextPlane(text, w, h, color, bg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(64, Math.round((512 * h) / w));
  const ctx = canvas.getContext('2d');
  if (bg && bg !== 'rgba(0,0,0,0)') {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = color;
  ctx.font = '700 ' + Math.round(canvas.height * 0.62) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
  return mesh;
}
