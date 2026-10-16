// src/locations/city/gas-station.js
// ЗАПРАВКА на трассе к западу от торгового центра, на северной стороне: площадка у обочины,
// навес с двумя колонками и магазин-будка с вывеской «АЗС». Подъезжаете к колонке, останавливаетесь
// и нажимаете R — бак наполняется (это единственное место, где можно заправиться).

const gasX = -140; // центр заправки по X
const gasPumpZ = -11; // колонки стоят здесь, машина — между ними и дорогой
const gasPumps = [-4.5, 4.5].map((dx) => ({ x: gasX + dx, z: gasPumpZ }));

// Площадка (бетон) и зона без леса
flatRect(30, 13, 0x4a4a4e, 0.016, gasX, -9.5);
mapObjects.push({ x: gasX, z: -9.5, hx: 15, hz: 6.5, color: '#4a4a4e', ground: true });
clearZones.push({ x1: gasX - 20, x2: gasX + 20, z1: -36, z2: 4 });

// Навес: плоская крыша на четырех стойках; полупрозрачная, когда загораживает вид
{
  const roofGeo = new THREE.BoxGeometry(16, 0.4, 8);
  const roofMat = new THREE.MeshBasicMaterial({ color: 0xd23c3c, transparent: true });
  const roofLine = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.add(new THREE.LineSegments(new THREE.EdgesGeometry(roofGeo), roofLine));
  roof.position.set(gasX, 4.6, gasPumpZ);
  cityGroup.add(roof);
  fadeBoxes.push({ mesh: roof, mats: [roofMat, roofLine], half: [8, 0.2, 4], fade: 1 });
  for (const dx of [-7, 7]) {
    for (const dz of [-3, 3]) {
      const post = boxWithEdges(0.4, 4.4, 0.4, 0xf1ede2);
      post.position.set(gasX + dx, 2.2, gasPumpZ + dz);
      cityGroup.add(post);
    }
  }
}

// Колонки
for (const p of gasPumps) {
  const pump = boxWithEdges(0.9, 1.7, 0.6, 0xd23c3c);
  pump.position.set(p.x, 0.85, p.z);
  cityGroup.add(pump);
  const screen = boxWithEdges(0.5, 0.35, 0.05, 0x15202e);
  screen.position.set(p.x, 1.3, p.z + 0.32);
  cityGroup.add(screen);
  addObstacle({ x: p.x, z: p.z, hx: 0.5, hz: 0.35 });
}

// Будка с вывеской «АЗС»
{
  const kioskZ = -25;
  const kiosk = boxWithEdges(10, 4, 6, 0xe6dfcc);
  kiosk.position.set(gasX, 2, kioskZ);
  cityGroup.add(kiosk);
  addObstacle({ x: gasX, z: kioskZ, hx: 5, hz: 3 });
  mapObjects.push({ x: gasX, z: kioskZ, hx: 5, hz: 3, color: '#c9c9c9' });
  const door = boxWithEdges(1.4, 2.3, 0.12, 0x1d3446);
  door.position.set(gasX, 1.15, kioskZ + 3.05);
  cityGroup.add(door);
  const win = boxWithEdges(3, 1.4, 0.12, 0x2c5a78);
  win.position.set(gasX + 3, 1.8, kioskZ + 3.05);
  cityGroup.add(win);

  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 96;
  const c = cv.getContext('2d');
  c.fillStyle = '#d23c3c';
  c.fillRect(0, 0, 256, 96);
  c.strokeStyle = '#f1ede2';
  c.lineWidth = 6;
  c.strokeRect(5, 5, 246, 86);
  c.fillStyle = '#f1ede2';
  c.font = 'bold 60px sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('АЗС', 128, 52);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 1.9),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }),
  );
  sign.position.set(gasX, 4.9, kioskZ + 3.06);
  cityGroup.add(sign);
}

// ЗАПРАВКА. Машина должна стоять у колонки (в 4,8 юнитах), игрок — либо за рулем, либо стоять
// у колонки пешком (это нужно, когда машину без бензина докатили до заправки: толкать ее — по R,
// а у колонки R заправляет). Чем бы ни заправляли, бак наполняется за ~4 секунды.
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
    return 'R — заправить машину (' + Math.round(car.fuel * 100) + '%)' + (driving ? '. F — выйти' : '');
  },
  act: () => {
    const car = pumpCar();
    if (!car.refuelling) car.refuelling = true;
  },
});
addInteractable(refuelInteractable(true)); // за рулем
addInteractable(refuelInteractable(false)); // пешком у колонки

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
