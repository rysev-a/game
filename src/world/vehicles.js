// src/world/vehicles.js
// ВИДЫ ТРАНСПОРТА. Обычная легковушка — createCar (src/models/car.js) с ездой по умолчанию (src/player/driving.js).
// Остальной транспорт — запись в VEHICLE_KINDS: своя модель (src/models/vehicles.js), размер кузова для
// столкновений (half — полуразмеры), езда (разгон, торможение, максимальная скорость, руль) и особенности:
//   gyro: true    — на телефоне на трассах автодрома руль — наклон телефона (src/engine/gyro-steer.js)
//   crush: true   — давит биосуществ на ходу (crushUnder, src/player/driving.js)
//   armored: true — бронемашина: враги видят в ней цель, попадания роботов отнимают ее прочность (hp);
//                   прочность кончилась — машина подбита: дымит, герой выбирается наружу, сесть нельзя,
//                   пока ее не починят (repairVehicle)
//
//   addVehicle('apc', x, z, heading, opts)  — поставить транспорт (то же, что addCar с opts.kind)
//   damageVehicle(car, damage)               — попадание по бронемашине (src/engine/enemy-attacks.js)
//   repairVehicle(car)                       — починить подбитую

const VEHICLE_KINDS = {
  race: {
    id: 'race', name: 'Гоночная машина', make: createRaceCar, color: 0xd8282a,
    desc: 'Болид для трека: очень быстрый и резкий в поворотах. На телефоне на трассах автодрома рулят наклоном телефона.',
    half: { w: 1.25, l: 2.6 },
    accel: 0.03, brake: 0.05, drag: 0.005, maxSpeed: 1.35, maxReverse: -0.3, turnRate: 0.05,
    gyro: true,
  },
  jeep: {
    id: 'jeep', name: 'Джип', make: createJeep, color: 0x5d6e3c,
    desc: 'Внедорожник на больших колесах: быстрый разгон, тяжелый руль.',
    half: { w: 1.1, l: 2.15 },
    accel: 0.022, brake: 0.04, drag: 0.006, maxSpeed: 0.9, maxReverse: -0.35, turnRate: 0.04,
  },
  tractor: {
    id: 'tractor', name: 'Трактор', make: createTractor, color: 0x2f8a3a,
    desc: 'Медленный, зато разворачивается почти на месте.',
    half: { w: 1.3, l: 2.0 },
    accel: 0.008, brake: 0.03, drag: 0.008, maxSpeed: 0.32, maxReverse: -0.18, turnRate: 0.06,
  },
  apc: {
    id: 'apc', name: 'БТР', make: createApc, color: 0x55603e,
    desc: 'Бронетранспортер: давит биосуществ, клыки и плевки его не берут. Но роботы пробивают броню за пару попаданий: подбитый БТР дымит, и приходится выбираться.',
    half: { w: 1.45, l: 3.15 },
    accel: 0.012, brake: 0.035, drag: 0.007, maxSpeed: 0.6, maxReverse: -0.25, turnRate: 0.032,
    crush: true, armored: true, hp: 30,
  },
};

function addVehicle(kindId, x, z, heading, opts = {}) {
  const kind = VEHICLE_KINDS[kindId];
  const car = addCar(x, z, heading, { fuel: 1, ...opts, kind });
  if (!car) return null;
  if (kind.hp) car.hp = car.maxHp = kind.hp;
  car.update = updateVehicle;
  addHoverInfo(car.mesh, { kind: 'Транспорт', name: kind.name, desc: kind.desc });
  return car;
}

// Попадание по бронемашине: вспышка корпуса, тряска; прочность кончилась — подбита. Возвращает урон
function damageVehicle(car, damage) {
  if (car.broken || !car.maxHp) return 0;
  const dmg = Math.max(1, Math.round(damage));
  car.hp = Math.max(0, car.hp - dmg);
  car.hitFlash = 8;
  if (car.hp <= 0) breakVehicle(car);
  else if (car.hp <= car.maxHp * 0.5 && !car.smoking) {
    car.smoking = true; // уже дымит
    if (car === drivingCar) showToast(car.kind.name + ': броня пробита, еще попадание — и машине конец', 3000);
  }
  return dmg;
}

function breakVehicle(car) {
  car.broken = true;
  car.smoking = true;
  car.speed = 0;
  if (typeof spawnBlast === 'function') spawnBlast(car.x, car.z, 1.2, 0xffa040);
  if (car === drivingCar) {
    exitCar(true);
    showToast(car.kind.name + ' подбит роботами! Дымит и не заводится — вы выбрались наружу', 5000);
  }
}

function repairVehicle(car) {
  car.broken = false;
  car.smoking = false;
  car.hp = car.maxHp;
}

// Подбитую машину в ДЕМО можно починить сразу: E рядом
addInteractable({
  priority: 2,
  near: () => {
    if (drivingCar || insideBuilding()) return false;
    const car = nearestCar();
    return !!car && !!car.broken;
  },
  prompt: () => 'E — починить: ' + nearestCar().kind.name.toLowerCase(),
  act: () => {
    const car = nearestCar();
    repairVehicle(car);
    showToast(car.kind.name + ' снова на ходу', 2500);
  },
});

// ---------- Дым и вспышки ----------
// Дым — серые клубы из выхлопа: поднимаются, растут и тают. Не светится — LitMaterial
const vehicleSmokeGeo = new THREE.IcosahedronGeometry(0.35, 0);
const smokePuffs = [];
const vehicleSmokePos = new THREE.Vector3();
const vehicleHitColor = new THREE.Color(0xff5a3a);

function updateVehicle(car) {
  if (car.smoking && Math.random() < (car.broken ? 0.5 : 0.18)) {
    car.mesh.userData.exhaust.getWorldPosition(vehicleSmokePos);
    cityGroup.worldToLocal(vehicleSmokePos);
    const dark = car.broken ? 0x2a2a2a : 0x6a6a6a;
    const m = new THREE.Mesh(vehicleSmokeGeo, new LitMaterial({ color: dark, transparent: true, opacity: 0.8, depthWrite: false }));
    m.position.copy(vehicleSmokePos);
    m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    cityGroup.add(m);
    smokePuffs.push({ m, life: 90, vx: (Math.random() - 0.5) * 0.02, vz: (Math.random() - 0.5) * 0.02 });
  }
  // Попадание: корпус на миг краснеет
  if (car.hitFlash > 0 || car.flashShown) {
    car.hitFlash = Math.max(0, (car.hitFlash || 0) - 1);
    const k = car.hitFlash / 8;
    car.mesh.traverse((o) => {
      if (!o.isMesh || !o.material || !o.material.isMeshPhongMaterial) return;
      if (!o.userData.baseColor) {
        o.material = o.material.clone();
        o.userData.baseColor = o.material.color.clone();
      }
      o.material.color.copy(o.userData.baseColor).lerp(vehicleHitColor, k * 0.7);
    });
    car.flashShown = k > 0;
  }
}

// Раз в кадр (из updateCarMeshes, src/player/driving.js): клубы дыма поднимаются, растут и тают
function updateVehicleFx() {
  for (let i = smokePuffs.length - 1; i >= 0; i--) {
    const p = smokePuffs[i];
    p.life--;
    p.m.position.x += p.vx;
    p.m.position.z += p.vz;
    p.m.position.y += 0.035;
    p.m.scale.setScalar(1 + (90 - p.life) * 0.03);
    p.m.material.opacity = Math.min(0.8, p.life / 60);
    if (p.life <= 0) {
      cityGroup.remove(p.m);
      p.m.material.dispose();
      smokePuffs.splice(i, 1);
    }
  }
}
