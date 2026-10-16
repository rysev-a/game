// src/world/cars.js
// Машины: общий список, размеры и постановка на землю (с проверкой места).
// ПРАВИЛО: машины не стоят на дорогах. Они припаркованы только у торгового центра, у домов
// поселка и у зданий в городе; на дороге бывает лишь машина, которой управляет игрок.

// МАШИНЫ: стоят в мировых координатах (внутри cityGroup), как здания.
// Модель смотрит в -Z; heading — поворот вокруг Y (плюс = налево),
// вперед в мире это (-sin h, -cos h)
const cars = [];
const npcs = []; // прохожие: в столкновениях — круги радиуса 0.45
const carColors = [0xd07a2f, 0x3a7bd5, 0xc43a3a, 0x3fa35b, 0xe0c341, 0x8a5fc4];
const carSize = { w: 1.9, l: 4.2 };
const carHalf = { w: 1.0, l: 2.1 }; // полуразмеры кузова для столкновений

// Ставит машину на землю, если место свободно. opts: { color, fuel, model, keyId, locked, lockedMsg }.
// У каждой машины есть keyId — id ключей, которыми она открывается (по умолчанию уникальный:
// такого ключа у игрока нет, пока история не даст ему ключи от этой машины). model — доп. параметры createCar
// Возвращает машину или null (место занято)
function addCar(x, z, heading, opts = {}) {
  // Не ставим машину поверх зданий и других машин
  const shape = carShape(x, z, heading);
  if (!insideWorld(shape)) return null;
  if (nearbyTrees(x, z).some((t) => circleHitsShape(t.x, t.z, 0.4 * t.s, shape))) return null;
  if (obstacleShapes.some((s) => shapesOverlap(shape, s))) return null;
  if (cars.some((o) => shapesOverlap(shape, carShape(o.x, o.z, o.heading)))) return null;
  const color = opts.color !== undefined ? opts.color : carColors[cars.length % carColors.length];
  const mesh = createCar({ bodyColor: color, ...(opts.model || {}) });
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  cityGroup.add(mesh);
  // fuel: 0..1 — сколько бензина в баке (у чужих машин случайно)
  const car = { mesh, x, z, heading, speed: 0, color, keyId: opts.keyId || 'car-key-' + cars.length, fuel: opts.fuel !== undefined ? opts.fuel : 0.4 + Math.random() * 0.6 };
  if (opts.locked) {
    car.locked = true; // сесть нельзя
    car.lockedMsg = opts.lockedMsg;
  }
  cars.push(car);
  return car;
}
