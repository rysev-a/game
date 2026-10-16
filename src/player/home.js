// src/player/home.js
// ДОМ ИГРОКА. Двухэтажный дом в поселке с гаражом, пристроенным сбоку.
//   Снаружи: buildHomeExterior() рисует гараж с автоматической дверью (она поднимается),
//            ставит в гараж машину игрока и кнопку двери; сам дом — createHouse() из village.js.
//   Внутри:  интерьер (2 этажа) — отдельные комнаты за картой (как торговый центр), вещи,
//            которые можно взять в инвентарь (ключи, кошелек, телефон, удостоверение, блокнот,
//            фонарик), лестница и дверь из дома в гараж.
// Чтобы поехать: взять ключи в доме → пройти в гараж → нажать кнопку двери → сесть в машину.
//
// Классический скрипт: подключается ПЕРЕД src/locations/village/village.js (тот вызывает buildHomeExterior).

const homeW = 18; // размеры дома — одни и те же снаружи и внутри
const homeD = 12;
const homeFloorZ = [3000, 3600]; // центры комнат 1 и 2 этажа по Z (x = 0)
const homeStairsX = -7.6; // ось лестницы (у западной стены)
const homeStairs = [{ x: -5.4, z: 4.2 }]; // точка у подножия лестницы, E (одинаково на обоих этажах)
const homeGaragePoint = { x: 8.0, z: 2.5 }; // 1 этаж: у двери в гараж (на восточной стене)

const homePickups = []; // вещи, лежащие в доме: { id, floor, x, z, y, mesh }

// ---------- Интерьер ----------

function createHomeInterior() {
  const hw = homeW / 2;
  const hd = homeD / 2;
  const wallH = 3.4;
  const playerRadius = 0.45;
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111 });

  function plankTexture() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const c = cv.getContext('2d');
    c.fillStyle = '#a8814f';
    c.fillRect(0, 0, 64, 64);
    c.strokeStyle = '#8a6a3c';
    c.lineWidth = 2;
    for (let y = 0; y < 64; y += 16) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(64, y);
      c.stroke();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    tex.repeat.set(homeW / 4, homeD / 4);
    return tex;
  }

  function buildFloor(level) {
    const group = new THREE.Group();
    const solids = [];
    const fade = [];
    const mapShapes = [];
    const pickups = [];

    function part(w, h, d, color, x, y, z) {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    }
    const addSolid = (x, z, hx, hz, color) => {
      solids.push({ x, z, hx, hz });
      mapShapes.push({ x, z, hx, hz, color: color || '#7a6a58' });
    };
    // Мебель: бокс + запись для столкновений и миникарты
    const furniture = (w, h, d, color, x, z, mapColor) => {
      part(w, h, d, color, x, h / 2, z);
      addSolid(x, z, w / 2, d / 2, mapColor);
    };
    // Вещь, которую можно взять: x, z — позиция, y — высота поверхности, на которой лежит.
    // Модель — объемный пиксельный значок вещи (src/models/items.js)
    function pickup(id, x, z, y) {
      const mesh = createItemModel(id);
      mesh.position.set(x, y, z);
      group.add(mesh);
      pickups.push({ id, floor: level, x, z, y, mesh });
    }

    // Пол
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(homeW, homeD),
      new THREE.MeshBasicMaterial({ map: plankTexture() }),
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0.01;
    group.add(floorMesh);
    mapShapes.push({ x: 0, z: 0, hx: hw, hz: hd, color: '#a8814f', ground: true });

    // Стены (полупрозрачные, когда между камерой и игроком)
    function wall(w, d, x, z) {
      const geo = new THREE.BoxGeometry(w, wallH, d);
      const wallMat = new THREE.MeshBasicMaterial({ color: 0xe6dfcc, transparent: true });
      const lineMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true });
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat));
      mesh.position.set(x, wallH / 2, z);
      group.add(mesh);
      fade.push({ mesh, mats: [wallMat, lineMat], half: [w / 2, wallH / 2, d / 2], fade: 1 });
    }
    const t = 0.4;
    wall(homeW + t * 2, t, 0, -hd - t / 2);
    wall(t, homeD, -hw - t / 2, 0);
    wall(t, homeD, hw + t / 2, 0);
    if (level === 0) {
      const doorGap = 2.6;
      const piece = (homeW - doorGap) / 2;
      wall(piece, t, -(doorGap / 2 + piece / 2), hd + t / 2);
      wall(piece, t, doorGap / 2 + piece / 2, hd + t / 2);
      // Коврик у двери
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshBasicMaterial({ color: 0x5a3a2a }));
      mat.rotation.x = -Math.PI / 2;
      mat.position.set(0, 0.02, hd - 1);
      group.add(mat);
    } else {
      wall(homeW + t * 2, t, 0, hd + t / 2);
    }

    // Лестница: ступени поднимаются на север (−Z), по бокам перила
    {
      const sx = homeStairsX;
      const base = 5.3; // южный край
      for (let i = 0; i < 6; i++) part(2.6, 0.3 * (i + 1), 0.6, 0xb5ada0, sx, 0.15 * (i + 1), base - 0.3 - i * 0.6);
      for (const side of [-1, 1]) part(0.15, 1.3, 3.6, 0x777777, sx + side * 1.4, 0.65, base - 1.8);
      addSolid(sx, base - 1.8, 1.5, 1.9, '#a09888');
    }

    if (level === 0) {
      // Прихожая: консоль у двери (на ней лежат ключи) и вешалка
      furniture(2.2, 0.9, 0.6, 0x6b4a2e, -3.5, 5.3, '#6b4a2e');
      furniture(0.4, 1.8, 0.4, 0x4a3826, 3.4, 5.4, '#4a3826');
      pickup('keys', -3.5, 5.3, 0.95);

      // Гостиная (запад): телевизор, диван, журнальный столик с телефоном
      furniture(0.6, 0.8, 3.0, 0x2a2a30, -8.5, -1.0, '#2a2a30'); // тумба с телевизором
      part(0.12, 0.9, 2.2, 0x15151a, -8.55, 1.25, -1.0);
      furniture(1.3, 0.95, 3.8, 0x3a5a8a, -4.8, -1.0, '#3a5a8a'); // диван
      furniture(1.1, 0.5, 1.7, 0x8a6a3c, -6.7, -1.0, '#8a6a3c'); // столик
      pickup('phone', -6.7, -1.0, 0.55);

      // Кухня (север и восток): стол с кошельком, шкафы, холодильник
      furniture(7.4, 0.95, 0.8, 0xc9c1b0, 4.0, -5.5, '#c9c1b0');
      furniture(1.0, 2.0, 0.9, 0xdfeaf0, 8.3, -5.4, '#dfeaf0');
      furniture(2.2, 0.8, 1.4, 0xa07850, 3.4, -1.4, '#a07850'); // обеденный стол
      for (const cx of [-1.6, 1.6]) part(0.6, 0.5, 0.6, 0x8a6a3c, 3.4 + cx, 0.25, -1.4); // стулья
      pickup('wallet', 3.4, -1.4, 0.85);

      // Дверь в гараж на восточной стене
      part(0.2, 2.3, 1.2, 0x4a3826, hw - 0.1, 1.15, homeGaragePoint.z);
    } else {
      // Спальня (восток): кровать и тумбочка с удостоверением
      furniture(2.1, 0.6, 2.3, 0x8a3b3b, 6.6, -3.6, '#8a3b3b');
      part(2.1, 1.1, 0.2, 0x5a3a2a, 6.6, 0.55, -4.85); // изголовье
      furniture(0.7, 0.65, 0.7, 0x6b4a2e, 8.4, -4.5, '#6b4a2e');
      pickup('badge', 8.4, -4.5, 0.72);
      furniture(2.4, 2.2, 0.8, 0x6b4a2e, 4.0, -5.5, '#6b4a2e'); // шкаф
      pickup('flashlight', 2.4, -5.5, 1.1);
      furniture(0.5, 1.2, 1.0, 0x6b4a2e, 2.4, -5.5, '#6b4a2e'); // тумба под фонарик (под предметом)

      // Кабинет (северо-запад): письменный стол с блокнотом, книжный шкаф
      furniture(1.4, 0.8, 3.0, 0xa07850, -8.0, -3.0, '#a07850');
      part(0.6, 0.5, 0.6, 0x3a5a8a, -6.7, 0.25, -3.0); // кресло
      pickup('notebook', -8.0, -3.0, 0.85);
      furniture(3.0, 2.0, 0.5, 0x5a3a2a, -3.6, -5.7, '#5a3a2a'); // книжный шкаф у северной стены
      // Браслет возврата на том же столе. Пока голубятни (3.04) нет, он лежит дома; взять — надеть на руку
      pickup('bracelet', -8.0, -4.1, 0.85);
    }

    return { group, solids, fadeBoxes: fade, mapShapes, pickups };
  }

  const floors = [buildFloor(0), buildFloor(1)];
  return {
    floors,
    bounds: { minX: -hw + playerRadius, maxX: hw - playerRadius, minZ: -hd + playerRadius, maxZ: hd - playerRadius },
    playerRadius,
    door: { x: 0, z: hd - playerRadius }, // у входной двери (1 этаж)
  };
}

const home = createHomeInterior();
const homeInterior = registerInterior({
  id: 'home',
  name: (floor) => 'Дом, ' + (floor + 1) + ' этаж',
  floorZ: homeFloorZ,
  bounds: home.bounds,
  playerRadius: home.playerRadius,
  floors: home.floors,
  minimapRange: 28,
  footsteps: true, // дома слышны шаги (src/player/footsteps.js)
});
zoneSounds.home = {}; // дома тихо (дождь по крыше слышно из src/engine/sound.js)

home.floors.forEach((floor, i) => {
  floor.group.position.set(0, 0, homeFloorZ[i]);
  cityGroup.add(floor.group);
  for (const f of floor.fadeBoxes) fadeBoxes.push(f);
  for (const m of floor.mapShapes) mapObjects.push({ ...m, z: m.z + homeFloorZ[i] });
});
addInteriorStairs(homeInterior, homeStairs);

// Вещи: подсвечены вращением и покачиванием, E рядом — взять в инвентарь. Можно и мышью:
// навести (вещь подсветится) и кликнуть — на том же этаже дома (src/engine/interact.js)
// Прибор (DEVICES) не кладется в инвентарь, а надевается (src/player/devices.js)
const pickupName = (id) => (DEVICES[id] || ITEMS[id]).name;
const pickupTaken = (id) => (DEVICES[id] ? isWorn(id) : hasItem(id));

function takeHomePickup(p) {
  if (DEVICES[p.id] ? !wearDevice(p.id) : !addItem(p.id)) return;
  p.mesh.visible = false;
  removeInteractable(p.interactable);
  p.interactable = null;
}

function makePickupInteractable(p) {
  return addInteractable({
    priority: 2,
    near: () => {
      const ci = currentInterior();
      return (
        !!ci && ci.def === homeInterior && ci.floor === p.floor &&
        Math.hypot(playerWorldX - p.x, playerWorldZ - homeFloorZ[p.floor] - p.z) < 2.4
      );
    },
    prompt: () => (DEVICES[p.id] ? 'E — надеть: ' : 'E — взять: ') + pickupName(p.id),
    act: () => takeHomePickup(p),
  });
}

for (const p of home.floors.flatMap((f) => f.pickups)) {
  p.baseY = p.y;
  homePickups.push(p);
  p.interactable = makePickupInteractable(p);
  addPickable({
    mesh: p.mesh,
    canPick: () => {
      const ci = currentInterior();
      return !!ci && ci.def === homeInterior && ci.floor === p.floor && !pickupTaken(p.id);
    },
    pick: () => takeHomePickup(p),
  });
}

// После загрузки сохранения: взятые вещи (они есть в инвентаре или надеты) исчезают, остальные лежат на месте
function syncHomePickups() {
  for (const p of homePickups) {
    const taken = pickupTaken(p.id);
    p.mesh.visible = !taken;
    if (taken && p.interactable) {
      removeInteractable(p.interactable);
      p.interactable = null;
    } else if (!taken && !p.interactable) {
      p.interactable = makePickupInteractable(p);
    }
  }
}

// Покачивание вещей
function updateHome() {
  const t = performance.now() / 1000;
  for (const p of homePickups) {
    if (!p.mesh.visible) continue;
    p.mesh.position.y = p.baseY + 0.08 + Math.sin(t * 2.5 + p.x) * 0.05;
    p.mesh.rotation.y = t * 1.2;
  }
}

// ---------- Снаружи: гараж ----------
// info: { houseX, houseZ, side, frontZ } — где стоит дом игрока в поселке.
// Гараж пристроен к дому с востока, дверь гаража — на фасаде (в сторону улицы).
const garage = {
  open: false, // цель: открыть/закрыть
  progress: 0, // 0 — закрыта, 1 — открыта
  doorGroup: null,
  doorShape: null, // препятствие, пока дверь закрыта
  doorCenterX: 0,
  car: null, // машина игрока
  button: null, // точка кнопки (мир)
  insidePoint: null, // у двери в дом (мир)
};

function buildHomeExterior(info) {
  const { houseX, houseZ, side } = info;
  const gw = 8; // ширина гаража
  const gh = 4.2; // высота
  const x0 = houseX + homeW / 2; // общая стена с домом
  const x1 = x0 + gw;
  const cx = (x0 + x1) / 2;
  const frontZ = houseZ - side * (homeD / 2); // фасад, сторона улицы
  const backZ = houseZ - (frontZ - houseZ);
  const doorW = 5.6;
  const t = 0.4;
  garage.doorCenterX = cx;

  // Пол: бетон
  flatRect(gw, homeD, 0x6b6b6b, 0.02, cx, houseZ);
  mapObjects.push({ x: cx, z: houseZ, hx: gw / 2, hz: homeD / 2, color: '#6b6b6b', ground: true });

  // Стены и крыша полупрозрачные, когда между камерой и игроком (видно, что внутри)
  function fadeWall(w, h, d, color, x, y, z) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
    const lineMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat));
    mesh.position.set(x, y, z);
    cityGroup.add(mesh);
    fadeBoxes.push({ mesh, mats: [mat, lineMat], half: [w / 2, h / 2, d / 2], fade: 1 });
  }
  const wallColor = 0xcfc6b0;
  fadeWall(gw, gh, t, wallColor, cx, gh / 2, backZ); // задняя
  fadeWall(t, gh, homeD, wallColor, x1 - t / 2, gh / 2, houseZ); // восточная
  const sideW = (gw - doorW) / 2;
  fadeWall(sideW, gh, t, wallColor, x0 + sideW / 2, gh / 2, frontZ); // фасад слева от двери
  fadeWall(sideW, gh, t, wallColor, x1 - sideW / 2, gh / 2, frontZ); // фасад справа
  fadeWall(doorW, gh - 3.6, t, wallColor, cx, 3.6 + (gh - 3.6) / 2, frontZ); // перемычка над дверью
  fadeWall(gw + 0.6, 0.35, homeD + 0.6, 0x7a7a80, cx, gh + 0.175, houseZ); // плоская крыша

  // Столкновения: стены гаража (дом с западной стороны уже препятствие)
  addObstacle({ x: cx, z: backZ, hx: gw / 2, hz: t / 2 });
  addObstacle({ x: x1 - t / 2, z: houseZ, hx: t / 2, hz: homeD / 2 });
  addObstacle({ x: x0 + sideW / 2, z: frontZ, hx: sideW / 2, hz: t / 2 });
  addObstacle({ x: x1 - sideW / 2, z: frontZ, hx: sideW / 2, hz: t / 2 });

  // Автоматическая дверь: секционные панели; поднимается — группа сжимается к верху проема
  const doorGroup = new THREE.Group();
  doorGroup.position.set(cx, 3.6, frontZ + (frontZ > houseZ ? 0.12 : -0.12)); // чуть снаружи стены
  const slatColors = [0xd9d5c8, 0xcfcabc];
  for (let i = 0; i < 4; i++) {
    const slat = boxWithEdges(doorW, 0.9, 0.18, slatColors[i % 2]);
    slat.position.y = -0.45 - i * 0.9;
    doorGroup.add(slat);
  }
  cityGroup.add(doorGroup);
  garage.doorGroup = doorGroup;
  garage.doorShape = { x: cx, z: frontZ, ux: 1, uz: 0, vx: 0, vz: 1, hu: doorW / 2, hv: 0.3 };
  obstacleShapes.push(garage.doorShape);

  // Кнопка двери — на внутренней стороне восточной стены у фасада
  garage.button = { x: x1 - 0.7, z: frontZ + (frontZ > houseZ ? -1.6 : 1.6) };
  const buttonMesh = boxWithEdges(0.15, 0.3, 0.15, 0xd23c3c);
  buttonMesh.position.set(garage.button.x + 0.3, 1.3, garage.button.z);
  cityGroup.add(buttonMesh);
  addInteractable({
    priority: 3,
    near: () => !insideBuilding() && Math.hypot(playerWorldX - garage.button.x, playerWorldZ - garage.button.z) < 2.4,
    prompt: () => (garage.open ? 'E — закрыть дверь гаража' : 'E — открыть дверь гаража'),
    act: () => (garage.open = !garage.open),
  });

  // Дверь из гаража в дом: на общей стене у задней стены гаража
  const doorZ = backZ + (backZ < houseZ ? 2.4 : -2.4);
  garage.insidePoint = { x: x0 + 1.2, z: doorZ };
  const innerDoor = boxWithEdges(0.15, 2.3, 1.2, 0x4a3826);
  innerDoor.position.set(x0 + 0.1, 1.15, doorZ);
  cityGroup.add(innerDoor);
  addInteractable({
    priority: 3,
    near: () => !insideBuilding() && Math.hypot(playerWorldX - garage.insidePoint.x, playerWorldZ - garage.insidePoint.z) < 2.3,
    prompt: () => 'E — войти в дом',
    act: () => {
      playerWorldX = homeGaragePoint.x - 1.2;
      playerWorldZ = homeFloorZ[0] + homeGaragePoint.z;
    },
  });
  // И обратно — из дома в гараж
  addInteractable({
    priority: 3,
    near: () => {
      const ci = currentInterior();
      return (
        !!ci && ci.def === homeInterior && ci.floor === 0 &&
        Math.hypot(playerWorldX - homeGaragePoint.x, playerWorldZ - homeFloorZ[0] - homeGaragePoint.z) < 2.3
      );
    },
    prompt: () => 'E — выйти в гараж',
    act: () => {
      playerWorldX = garage.insidePoint.x + 1.0;
      playerWorldZ = garage.insidePoint.z;
    },
  });

  // Машина игрока — в гараже носом к двери
  const heading = frontZ > houseZ ? Math.PI : 0; // нос к улице
  const car = addCar(cx, houseZ, heading, {
    color: 0x1fb3a6, // бирюзовая, такого цвета нет ни у одной другой машины
    fuel: 0.65, // бак заполнен на 65%
    keyId: 'keys',
    model: { stripeColor: 0xf4f1e6, roofRack: true, plateText: 'ДЕТ 001' }, // белые полосы, багажник, номер
  });
  car.isPlayerCar = true;
  markPlayerCar(car);
  garage.car = car;

  // Входная дверь дома: перед ней на улице; внутри — у выхода
  const doorOutside = { x: houseX, z: frontZ + (frontZ > houseZ ? 1.6 : -1.6) };
  addInteriorDoor(homeInterior, {
    outside: doorOutside,
    door: home.door,
    enterLabel: 'E — войти в дом',
    exitLabel: 'E — выйти из дома',
  });
  return { doorOutside, garageCenterX: cx, frontZ };
}

// Мгновенно поставить дверь гаража в положение «открыта/закрыта» (загрузка сохранения)
function setGarageDoorInstant(open) {
  garage.open = open;
  garage.progress = open ? 1 : 0;
  if (garage.doorGroup) garage.doorGroup.scale.y = 1 - 0.96 * garage.progress;
  const blocked = obstacleShapes.includes(garage.doorShape);
  if (open && blocked) obstacleShapes.splice(obstacleShapes.indexOf(garage.doorShape), 1);
  if (!open && !blocked) obstacleShapes.push(garage.doorShape);
}

// Дверь гаража едет вверх/вниз; пока не поднята — препятствие
function updateGarage() {
  if (!garage.doorGroup) return;
  const target = garage.open ? 1 : 0;
  if (garage.progress === target) return;
  garage.progress += Math.sign(target - garage.progress) * (1 / 90); // 1,5 секунды
  garage.progress = Math.min(1, Math.max(0, garage.progress));
  garage.doorGroup.scale.y = 1 - 0.96 * garage.progress; // сжимается к верху проема
  const blocked = obstacleShapes.includes(garage.doorShape);
  if (garage.progress > 0.6 && blocked) obstacleShapes.splice(obstacleShapes.indexOf(garage.doorShape), 1);
  if (garage.progress <= 0.6 && !blocked) obstacleShapes.push(garage.doorShape);
}
