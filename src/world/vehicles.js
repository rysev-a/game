// src/world/vehicles.js
// ВИДЫ ТРАНСПОРТА. Обычная легковушка — createCar (src/models/car.js) с ездой по умолчанию (src/player/driving.js).
// Остальной транспорт — запись в VEHICLE_KINDS: своя модель (src/models/vehicles.js), размер кузова для
// столкновений (half — полуразмеры), езда (разгон, торможение, максимальная скорость, руль) и особенности:
//   drift         — насколько заносит на ручнике (Space на компьютере, src/player/driving.js): 1 — как гоночную
//   sound, pitch  — чей звук мотора (engineSounds, src/engine/sound.js; иначе — по id) и тон (1 — как записан)
//   powerDrift    — дрифт: газ и ручник вместе на ходу — машина едет боком (задним ходом — задом) (src/player/driving.js)
//   acc           — разгон: [км/ч, секунд] — за сколько секунд машина разгоняется с места до этой скорости (болид — до 100 за 3,2 с,
//                   джип — за 7, трактор — до 30 за 6); кривая нелинейная, по передачам (accelAt, src/player/driving.js).
//                   accel тогда нужен только для дрифта (газ с ручником), launch и launchUntil — тоже
//   launch, launchUntil — плавный старт: с места разгон — доля launch от полного, полный — к доле launchUntil
//                   максимальной скорости (launchFactor, src/player/driving.js)
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
  // Гоночный парк: у всех дрифт (газ+тормоз), плавный старт и звук гоночной (sound: 'race', pitch — тон мотора).
  // Числа разные: болид — быстрый и цепкий, купе GT — ровное, хэтчбек — резвый старт и юркий, маслкар —
  // мощный, но со слабыми тормозами и легко срывается, дрифт-купе — заносит сильнее всех, прототип — самый
  // быстрый и с лучшими тормозами, но держит дорогу и неохотно идет боком, карт — крошечный и вертлявый.
  // Все подчиняются настройкам вкладки «Вождение» (src/player/driving.js)
  race: {
    id: 'race', name: 'Болид', make: createRaceCar, color: 0xd8282a,
    desc: 'Болид для трека: очень быстрый и резкий в поворотах. Газ с ручником — дрифт. На телефоне на трассах автодрома рулят наклоном телефона.',
    half: { w: 1.25, l: 2.6 },
    cockpit: [0, 1.05, 0.3], // глаза водителя в салоне (вид от первого лица, src/player/driving.js)
    acc: [100, 3.2], accel: 0.03, brake: 0.05, drag: 0.005, maxSpeed: 1.35, maxReverse: -0.3, turnRate: 0.05, drift: 1,
    launch: 0.12, launchUntil: 0.6, powerDrift: true, gyro: true, sound: 'race',
  },
  gt: {
    id: 'gt', name: 'Купе GT', make: createGtCar, color: 0x1f5fd0,
    desc: 'Закрытое гоночное купе: ровный разгон, хорошие тормоза, послушно в заносе. Газ с ручником — дрифт.',
    half: { w: 1.15, l: 2.35 },
    cockpit: [-0.4, 1.0, 0.4], // глаза водителя в салоне (вид от первого лица, src/player/driving.js)
    acc: [100, 4], accel: 0.026, brake: 0.055, drag: 0.005, maxSpeed: 1.28, maxReverse: -0.3, turnRate: 0.048, drift: 0.85,
    launch: 0.18, launchUntil: 0.55, powerDrift: true, gyro: true, sound: 'race', pitch: 0.95,
  },
  rally: {
    id: 'rally', name: 'Раллийный хэтчбек', make: createRallyCar, color: 0xf0f0ea,
    desc: 'Короткий и юркий: резво трогается, быстро поворачивает, охотно идет боком, но максималка ниже. Газ с ручником — дрифт.',
    half: { w: 1.05, l: 2.0 },
    cockpit: [-0.4, 1.3, 0.4], // глаза водителя в салоне (вид от первого лица, src/player/driving.js)
    acc: [100, 3.8], accel: 0.032, brake: 0.05, drag: 0.006, maxSpeed: 1.1, maxReverse: -0.32, turnRate: 0.056, drift: 1.15,
    launch: 0.32, launchUntil: 0.4, powerDrift: true, gyro: true, sound: 'race', pitch: 1.1,
  },
  muscle: {
    id: 'muscle', name: 'Маслкар', make: createMuscleCar, color: 0xe07a12,
    desc: 'Тяжелый и мощный: долго раскачивается, а потом летит. Тормоза слабые, задок срывается легко. Газ с ручником — дрифт.',
    half: { w: 1.1, l: 2.5 },
    cockpit: [-0.4, 1.2, 0.5], // глаза водителя в салоне (вид от первого лица, src/player/driving.js)
    acc: [100, 4.6], accel: 0.033, brake: 0.038, drag: 0.005, maxSpeed: 1.4, maxReverse: -0.3, turnRate: 0.042, drift: 1.3,
    launch: 0.08, launchUntil: 0.7, powerDrift: true, gyro: true, sound: 'race', pitch: 0.82,
  },
  drift: {
    id: 'drift', name: 'Дрифт-купе', make: createDriftCar, color: 0x8a2be0,
    desc: 'Построено для дрифта: заносит сильнее всех и держит угол, руль острый. Газ с ручником — дрифт.',
    half: { w: 1.15, l: 2.25 },
    cockpit: [-0.4, 1.1, 0.5], // глаза водителя в салоне (вид от первого лица, src/player/driving.js)
    acc: [100, 4.2], accel: 0.027, brake: 0.048, drag: 0.005, maxSpeed: 1.2, maxReverse: -0.3, turnRate: 0.058, drift: 1.6,
    launch: 0.2, launchUntil: 0.5, powerDrift: true, gyro: true, sound: 'race', pitch: 1.04,
  },
  proto: {
    id: 'proto', name: 'Прототип', make: createProtoCar, color: 0x14a35a,
    desc: 'Самый быстрый и с лучшими тормозами: прижимается к трассе и неохотно идет боком. Газ с ручником — дрифт.',
    half: { w: 1.1, l: 2.6 },
    cockpit: [0, 0.85, 0.3], // глаза водителя в салоне (вид от первого лица, src/player/driving.js)
    acc: [100, 3], accel: 0.028, brake: 0.065, drag: 0.004, maxSpeed: 1.5, maxReverse: -0.28, turnRate: 0.047, drift: 0.55,
    launch: 0.12, launchUntil: 0.65, powerDrift: true, gyro: true, sound: 'race', pitch: 1.15,
  },
  kart: {
    id: 'kart', name: 'Карт', make: createKart, color: 0xffd21e,
    desc: 'Крошечный карт: мгновенный старт, поворачивает на пятачке, но едет медленнее всех. Газ с ручником — дрифт.',
    half: { w: 0.85, l: 1.2 },
    cockpit: [0, 0.95, 0.15], // глаза водителя в салоне (вид от первого лица, src/player/driving.js)
    acc: [100, 3.5], accel: 0.035, brake: 0.06, drag: 0.007, maxSpeed: 0.95, maxReverse: -0.25, turnRate: 0.066, drift: 0.9,
    launch: 0.4, launchUntil: 0.35, powerDrift: true, gyro: true, sound: 'race', pitch: 1.3,
  },
  scooter: {
    id: 'scooter', name: 'Мотороллер', make: createScooter, color: 0xd8282a,
    desc: 'Мотороллер доставщика пиццы с термобоксом сзади: юркий и неторопливый, бензина берет мало.',
    half: { w: 0.5, l: 0.95 },
    cockpit: [0, 1.65, 0.3], // глаза водителя в салоне (вид от первого лица, src/player/driving.js)
    acc: [60, 3.5], accel: 0.03, brake: 0.05, drag: 0.007, maxSpeed: 0.62, maxReverse: -0.2, turnRate: 0.06, drift: 0.45,
    launch: 0.5, launchUntil: 0.3, sound: 'race', pitch: 1.4,
  },
  hyper: {
    id: 'hyper', name: 'Гиперкар', make: createHyperCar, color: 0xf0a010,
    desc: 'Гиперкар до 350 км/ч: рвет с места, на скорости руль вялый — поворачивать надо заранее. Газ с ручником — дрифт.',
    half: { w: 1.2, l: 2.5 },
    cockpit: [-0.4, 0.95, 0.3], // глаза водителя в салоне (вид от первого лица, src/player/driving.js)
    acc: [100, 2.9], accShape: 6, accel: 0.03, brake: 0.075, drag: 0.004, maxSpeed: 2.1, maxReverse: -0.3, turnRate: 0.04, drift: 0.5,
    launch: 0.12, launchUntil: 0.6, powerDrift: true, gyro: true, sound: 'race', pitch: 1.2,
  },
  bugatti: {
    id: 'bugatti', name: 'Бугатти', make: createBugatti, color: 0x0f2a6b,
    desc: 'Бугатти: до 400 км/ч, сотня за 2,4 секунды. Тяжелый и очень быстрый: тормозить и входить в поворот надо заранее. Газ с ручником — дрифт.',
    half: { w: 1.25, l: 2.7 },
    cockpit: [-0.4, 1.2, 0.4], // глаза водителя в салоне (вид от первого лица, src/player/driving.js)
    acc: [100, 2.4], accShape: 6, accel: 0.034, brake: 0.08, drag: 0.004, maxSpeed: 2.4, maxReverse: -0.3, turnRate: 0.036, drift: 0.45,
    launch: 0.1, launchUntil: 0.65, powerDrift: true, gyro: true, sound: 'race', pitch: 0.9,
  },
  jeep: {
    id: 'jeep', name: 'Джип', make: createJeep, color: 0x5d6e3c,
    desc: 'Внедорожник на больших колесах: быстрый разгон, тяжелый руль.',
    half: { w: 1.1, l: 2.15 },
    cockpit: [-0.4, 1.95, 0.25], // глаза водителя в салоне (вид от первого лица, src/player/driving.js)
    acc: [100, 7], accel: 0.022, brake: 0.04, drag: 0.006, maxSpeed: 0.9, maxReverse: -0.35, turnRate: 0.04, drift: 0.7,
  },
  tractor: {
    id: 'tractor', name: 'Трактор', make: createTractor, color: 0x2f8a3a,
    desc: 'Медленный, зато разворачивается почти на месте.',
    half: { w: 1.3, l: 2.0 },
    cockpit: [0, 2.5, 0.95], // глаза водителя в салоне (вид от первого лица, src/player/driving.js)
    acc: [30, 6], accel: 0.008, brake: 0.03, drag: 0.008, maxSpeed: 0.32, maxReverse: -0.18, turnRate: 0.06, drift: 0.25,
  },
  apc: {
    id: 'apc', name: 'БТР', make: createApc, color: 0x55603e,
    desc: 'Бронетранспортер: давит биосуществ, клыки и плевки его не берут. Но роботы пробивают броню за пару попаданий: подбитый БТР дымит, и приходится выбираться.',
    half: { w: 1.45, l: 3.15 },
    cockpit: [-0.5, 2.1, 0.0], // глаза водителя в салоне (вид от первого лица, src/player/driving.js)
    acc: [50, 7], accel: 0.012, brake: 0.035, drag: 0.007, maxSpeed: 0.6, maxReverse: -0.25, turnRate: 0.032, drift: 0.35,
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
