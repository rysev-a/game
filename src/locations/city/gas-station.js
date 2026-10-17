// src/locations/city/gas-station.js
// ЗАПРАВКИ. Несколько заправок вдоль трассы и дорог к городам: площадка у обочины, навес с двумя колонками и магазин-будка.
// Подъезжаете к колонке, останавливаетесь и нажимаете E — бак наполняется. У будки (E у двери) можно купить канистру с бензином:
// она кладется в багажник вашей машины (car.trunk.canisters, до trunkMax — src/player/driving.js) или, если машины рядом нет, — в инвентарь.
// Деньги — счетчик money квестовой системы (questGame, src/quests); без нее (в ДЕМО) канистры бесплатные.
//
//   buildGasStation({ x, z, rot, name }) — поставить заправку. (x, z) — точка на обочине у дороги, с которой начинается заправка;
//   rot: 0 — к северу от трассы (колонки севернее дороги), Math.PI — к югу; ±π/2 — у дороги, идущей с севера на юг:
//   −π/2 — заправка к востоку от дороги, +π/2 — к западу. Локальные координаты (lx вдоль дороги, lz от дороги: −lz — вглубь) переводит toWorld.

const gasX = -140; // центр первой заправки по X (двор с кузницей и мастерской у нее: src/quests/places.js)
const gasPumpZ = -11; // колонки стоят здесь, машина — между ними и дорогой
const gasPumps = []; // колонки всех заправок: { x, z }
const gasKiosks = []; // двери будок: { x, z, name }
const canisterPrice = 60; // цена канистры с бензином
const pumpInfo = { kind: 'Устройство', name: 'Топливная колонка', desc: 'Подъезжайте, останавливайтесь и жмите E — бак наполнится.' };

function buildGasStation({ x: ox, z: oz, rot = 0, name = 'Заправка', yard = false }) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const toWorld = (lx, lz) => ({ x: ox + lx * c + lz * s, z: oz - lx * s + lz * c });
  const turned = Math.abs(Math.sin(rot)) > 0.5; // вдоль Z: стороны площадки меняются местами
  const gasInfo = {
    kind: 'Здание',
    name: name,
    desc: yard ? 'Заправка у трассы. Начальник — Николай Палыч. В будке — канистры с бензином.' : 'Заправка. В будке (E у двери) продают канистры с бензином в багажник.',
  };
  // Предмет в локальных координатах заправки: позиция по toWorld и поворот вместе с ней
  const put = (mesh, lx, ly, lz) => {
    const p = toWorld(lx, lz);
    mesh.position.set(p.x, ly, p.z);
    mesh.rotation.y = rot;
    cityGroup.add(mesh);
    return mesh;
  };
  const obstacle = (lx, lz, hx, hz) => {
    const p = toWorld(lx, lz);
    addObstacle({ x: p.x, z: p.z, hx: turned ? hz : hx, hz: turned ? hx : hz });
  };

  // Площадка (бетон), значок на карте и зона без леса
  const pad = toWorld(0, -9.5);
  flatRect(turned ? 13 : 30, turned ? 30 : 13, 0x4a4a4e, 0.016, pad.x, pad.z);
  mapObjects.push({ x: pad.x, z: pad.z, hx: turned ? 6.5 : 15, hz: turned ? 15 : 6.5, color: '#4a4a4e', ground: true });
  mapIcons.push({ x: pad.x, z: pad.z, icon: 'gas' });
  const a = toWorld(-20, -36);
  const b = toWorld(20, 4);
  clearZones.push({ x1: Math.min(a.x, b.x), x2: Math.max(a.x, b.x), z1: Math.min(a.z, b.z), z2: Math.max(a.z, b.z) });

  // Навес: плоская крыша на четырех стойках; полупрозрачная, когда загораживает вид
  {
    const roofGeo = new THREE.BoxGeometry(16, 0.4, 8);
    const roofMat = new LitMaterial({ color: 0xd23c3c, transparent: true });
    const roofLine = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.add(new THREE.LineSegments(new THREE.EdgesGeometry(roofGeo), roofLine));
    put(roof, 0, 4.6, -11);
    addHoverInfo(roof, gasInfo);
    fadeBoxes.push({ mesh: roof, mats: [roofMat, roofLine], half: turned ? [4, 0.2, 8] : [8, 0.2, 4], fade: 1 });
    for (const dx of [-7, 7]) {
      for (const dz of [-3, 3]) put(boxWithEdges(0.4, 4.4, 0.4, 0xf1ede2), dx, 2.2, -11 + dz);
    }
  }

  // Колонки
  for (const dx of [-4.5, 4.5]) {
    const pump = put(boxWithEdges(0.9, 1.7, 0.6, 0xd23c3c), dx, 0.85, -11);
    addHoverInfo(pump, pumpInfo);
    addHoverInfo(put(boxWithEdges(0.5, 0.35, 0.05, 0x15202e), dx, 1.3, -11 + 0.32), pumpInfo);
    obstacle(dx, -11, 0.5, 0.35);
    gasPumps.push(toWorld(dx, -11));
  }

  // Будка-магазин: дверь — на стороне дороги
  {
    const kioskLz = -25;
    addHoverInfo(put(boxWithEdges(10, 4, 6, 0xe6dfcc), 0, 2, kioskLz), gasInfo);
    obstacle(0, kioskLz, 5, 3);
    const k = toWorld(0, kioskLz);
    mapObjects.push({ x: k.x, z: k.z, hx: turned ? 3 : 5, hz: turned ? 5 : 3, color: '#c9c9c9' });
    addHoverInfo(put(boxWithEdges(1.4, 2.3, 0.12, 0x1d3446), 0, 1.15, kioskLz + 3.05), gasInfo);
    addHoverInfo(put(boxWithEdges(3, 1.4, 0.12, 0x2c5a78), 3, 1.8, kioskLz + 3.05), gasInfo);
    const door = toWorld(0, kioskLz + 3.05);
    gasKiosks.push({ x: door.x, z: door.z, name });
    // Вывеска над дверью: «КАНИСТРЫ»
    const sign = put(boxWithEdges(4.2, 0.6, 0.15, 0xd23c3c), 0, 3.3, kioskLz + 3.1);
    addHoverInfo(sign, gasInfo);
  }
}

// Первая заправка — на трассе к западу от торгового центра, к северу от дороги; у нее двор (src/quests/places.js: yard.*)
buildGasStation({ x: gasX, z: 0, rot: 0, yard: true });
// Остальные: у въезда в Сосновку, на трассе между городами, перед вторым городом (за рекой) и на дорогах к северным и южным городам
buildGasStation({ x: -1110, z: 0, rot: 0, name: 'Заправка «Сосновка»' });
buildGasStation({ x: -700, z: 0, rot: Math.PI, name: 'Заправка «Лесная»' });
buildGasStation({ x: -290, z: 0, rot: Math.PI, name: 'Заправка «Перекресток»' });
buildGasStation({ x: 398, z: 0, rot: 0, name: 'Заправка «Заречье»' });
// У дорог к городам 3–6: станция стоит к востоку от дороги (linkX = x города + 18), на полпути между трассой и городом
for (const [cx, cz] of [[-900, -600], [-450, -600], [-900, 600], [-450, 600]]) {
  buildGasStation({ x: cx + cityStep / 2 + 8, z: cz / 2, rot: -Math.PI / 2, name: 'Заправка ' + (cz < 0 ? 'северная' : 'южная') });
}

// ЗАПРАВКА. Машина должна стоять у колонки (в 4,8 юнитах), игрок — либо за рулем, либо стоять
// у колонки пешком (это нужно, когда машину без бензина докатили до заправки: толкать ее — по E,
// а у колонки E заправляет). Чем бы ни заправляли, бак наполняется за ~4 секунды.
const pumpReach = 4.8;
const carAtPump = (car) => gasPumps.some((p) => Math.hypot(car.x - p.x, car.z - p.z) < pumpReach);

// Машина, которую сейчас можно заправить: та, в которой сидим, или ближайшая к игроку у колонки
function pumpCar() {
  if (drivingCar) return Math.abs(drivingCar.speed) < 0.05 && carAtPump(drivingCar) ? drivingCar : null;
  if (pushingCar || insideBuilding()) return null;
  if (!gasPumps.some((p) => Math.hypot(playerWorldX - p.x, playerWorldZ - p.z) < 3.4)) return null;
  let best = null;
  let bestDist = pumpReach + 3;
  for (const c of cars) {
    if (c.locked || !carAtPump(c)) continue;
    const d = Math.hypot(c.x - playerWorldX, c.z - playerWorldZ);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}

const refuelInteractable = (driving) => ({
  driving,
  priority: 2,
  near: () => {
    const car = pumpCar();
    return !!car && (car.fuel < 0.995 || car.refuelling);
  },
  prompt: () => {
    const car = pumpCar();
    if (car.refuelling) return 'Заправка… ' + Math.round(car.fuel * 100) + '%';
    return 'E — заправить машину (' + Math.round(car.fuel * 100) + '%)' + (driving ? '. F — выйти' : '');
  },
  act: () => {
    const car = pumpCar();
    if (!car.refuelling) car.refuelling = true;
  },
});
addInteractable(refuelInteractable(true)); // за рулем
addInteractable(refuelInteractable(false)); // пешком у колонки

// КАНИСТРЫ. E у двери будки — купить канистру с бензином. Деньги — questGame (счетчик money); в ДЕМО (нет questGame) бесплатно.
// Канистра идет в багажник машины героя, если она не дальше gasTrunkReach от будки; иначе — в инвентарь (E у машины — залить)
const gasTrunkReach = 80;
const gasKioskNear = () => {
  if (drivingCar || pushingCar || insideBuilding() || dialogueOpen) return null;
  return gasKiosks.find((k) => Math.hypot(playerWorldX - k.x, playerWorldZ - k.z) < 3.4) || null;
};
const canPayCanister = () => typeof questGame === 'undefined' || !questGame || questGame.check('count:money>=' + canisterPrice);
function buyCanister() {
  if (!canPayCanister()) {
    showToast('Не хватает денег: канистра стоит ' + canisterPrice, 3000);
    return;
  }
  const mine = cars.find((c) => c.isPlayerCar);
  const toTrunk = !!mine && Math.hypot(mine.x - playerWorldX, mine.z - playerWorldZ) < gasTrunkReach;
  if (toTrunk && trunkOf(mine).canisters >= trunkMax) {
    showToast('Багажник полон: ' + trunkMax + ' канистр', 3000);
    return;
  }
  if (!toTrunk && hasItem('canister')) {
    showToast('Канистра у вас уже есть', 3000);
    return;
  }
  if (typeof questGame !== 'undefined' && questGame) questGame.run({ add: { money: -canisterPrice } });
  if (toTrunk) {
    trunkOf(mine).canisters++;
    showToast('Канистра в багажнике (' + trunkOf(mine).canisters + '/' + trunkMax + ')', 3500);
  } else if (addItem('canister')) {
    showToast('Канистра с бензином — в инвентаре (машины рядом нет)', 3500);
  }
}
addInteractable({
  priority: 2,
  near: () => !!gasKioskNear(),
  prompt: () => {
    const price = typeof questGame === 'undefined' || !questGame ? 'бесплатно' : canisterPrice;
    return 'E — купить канистру с бензином (' + price + ')';
  },
  act: buyCanister,
});

// Тик заправки: каждый кадр доливает бак; уехали от колонки — прекращается
function updateGasStation() {
  for (const car of cars) {
    if (!car.refuelling) continue;
    if (!carAtPump(car) || Math.abs(car.speed) > 0.02) {
      car.refuelling = false;
      continue;
    }
    car.fuel = Math.min(1, car.fuel + refuelRate);
    if (car.fuel >= 1) {
      car.refuelling = false;
      showToast('Бак полный');
    }
  }
}
