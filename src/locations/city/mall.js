// src/locations/city/mall.js
// ТОРГОВЫЙ ЦЕНТР: большое двухэтажное здание, парковка на два ряда мест, интерьер (два этажа),
// люди внутри и очереди на кассы.

const shopW = 56;
const shopD = 26;
const shopZ = -45; // центр здания; вход (фасад) на z = shopZ + shopD / 2 = -32
const shop = createShop({
  width: shopW,
  depth: shopD,
  height: 9.5,
  doorWidth: 8,
});
shop.position.set(0, 0, shopZ);
cityGroup.add(shop);
addHoverInfo(shop, {
  kind: 'Здание',
  name: 'Торговый центр',
  desc: 'Два этажа: супермаркет, бутики и фудкорт. У входа — парковка.',
});
mapObjects.push({ x: 0, z: shopZ, hx: shopW / 2, hz: shopD / 2, color: '#c9c9c9' });
addObstacle({ x: 0, z: shopZ, hx: shopW / 2, hz: shopD / 2 });

const lotZ = -17.5;
flatRect(72, 27, 0x333333, 0.015, 0, lotZ);
mapObjects.push({ x: 0, z: lotZ, hx: 36, hz: 13.5, color: '#333333', ground: true });
const stallZ = -27; // ряд мест вдоль здания (машины носом к фасаду)
const stallZ2 = -8.5; // ряд мест у дороги (носом к дороге)
for (let k = 0; k <= 24; k++) {
  pushQuad(roadBatches.mark.verts, -36 + k * 3, stallZ, 0.08, 2.75, 0.05);
  pushQuad(roadBatches.mark.verts, -36 + k * 3, stallZ2, 0.08, 2.75, 0.05);
}

// ИНТЕРЬЕР ТОРГОВОГО ЦЕНТРА: две комнаты (этажи) за пределами карты
const mall = createMall();
const mallFloorZ = [1500, 2200]; // центры комнат 1 и 2 этажа по Z (x = 0)
const mallPeople = []; // люди внутри; координаты локальные (внутри этажа), меш — ребенок группы этажа
const mallInterior = registerInterior({
  id: 'mall',
  name: (floor) => 'Торговый центр, ' + (floor + 1) + ' этаж',
  floorZ: mallFloorZ,
  bounds: mall.bounds,
  playerRadius: mall.playerRadius,
  floors: mall.floors,
  people: mallPeople,
  minimapRange: 90,
});
mall.floors.forEach((floor, i) => {
  floor.group.position.set(0, 0, mallFloorZ[i]);
  cityGroup.add(floor.group);
  registerHoverTree(floor.group); // таблички отделов
  for (const f of floor.fadeBoxes) fadeBoxes.push(f);
  for (const m of floor.mapShapes) mapObjects.push({ ...m, z: m.z + mallFloorZ[i] });
});
const shopDoorOutside = { x: 0, z: shopZ + shopD / 2 + 3 }; // у двери снаружи, перед навесом
const insideMall = () => {
  const ci = currentInterior();
  return !!ci && ci.def === mallInterior;
};
const mallFloor = () => (playerWorldZ > (mallFloorZ[0] + mallFloorZ[1]) / 2 ? 1 : 0);

addInteriorDoor(mallInterior, {
  outside: shopDoorOutside,
  door: mall.door,
  enterLabel: 'E — войти в торговый центр',
  exitLabel: 'E — выйти из торгового центра',
  object: shop,
});
addInteriorStairs(mallInterior, mall.stairs);
zoneSounds.mall = { shop: 0.9 };

// Магазин — не лес
clearZones.push({ x1: -42, x2: 42, z1: -80, z2: 4 });

// Машины стоят только на местах парковки: вдоль здания носом к фасаду и вдоль дороги
for (const k of [1, 4, 5, 8, 15, 19, 22]) addCar(-34.5 + k * 3, stallZ, 0);
for (const k of [2, 7, 11, 16, 20]) addCar(-34.5 + k * 3, stallZ2, Math.PI);

function addMallPerson(floor, x, z, gender, props) {
  const mesh = makePerson(gender);
  mesh.position.set(x, 0, z);
  mall.floors[floor].group.add(mesh);
  const p = { floor, x, z, mesh, gender, yaw: 0, phase: rand(0, 6), amp: 0, wait: 0, ...props };
  mesh.rotation.y = p.yaw;
  mesh.updateWalk(0, 0);
  mallPeople.push(p);
  return p;
}

mall.floors.forEach((floor, fi) => {
  floor.statics.forEach((st, i) => {
    addMallPerson(fi, st.x, st.z, Math.random() < 0.5 ? 'male' : 'female', { role: st.role, yaw: st.yaw });
  });
  floor.patrols.forEach((seg, i) => {
    const t = Math.random();
    addMallPerson(fi, seg.x1 + (seg.x2 - seg.x1) * t, seg.z1 + (seg.z2 - seg.z1) * t, i % 2 ? 'male' : 'female', {
      role: 'shopper',
      a: { x: seg.x1, z: seg.z1 },
      b: { x: seg.x2, z: seg.z2 },
      dir: Math.random() < 0.5 ? 1 : -1,
      speed: rand(0.07, 0.12),
    });
  });
});

// Очереди на кассы: у каждой кассы свой ряд, вытянутый от прилавка вдоль +Z.
// Раз в несколько секунд первого обслуживают: он уходит в сторону и по коридору
// у входа встает в самую короткую очередь, остальные подходят ближе к кассе
const registers = mall.registers.map((r) => ({ ...r, queue: [], timer: rand(200, 500) }));
const slotPos = (reg, i) => ({ x: reg.x, z: reg.slot0 + i * reg.step });

registers.forEach((reg, ri) => {
  const count = 2 + Math.floor(Math.random() * 4); // 2–5 человек
  for (let i = 0; i < count; i++) {
    const pos = slotPos(reg, i);
    const c = addMallPerson(0, pos.x, pos.z, (ri + i) % 2 ? 'male' : 'female', {
      role: 'customer',
      reg,
      route: [],
      state: 'queue',
      speed: rand(0.08, 0.11),
      atSlot: true,
    });
    reg.queue.push(c);
  }
});

function serveCustomer(reg) {
  const c = reg.queue.shift();
  c.state = 'leaving';
  c.route = [
    { x: reg.x + 2.4, z: reg.slot0 },
    { x: reg.x + 2.4, z: mall.exitLaneZ },
  ];
  reg.timer = rand(300, 700);
}

function stepCustomer(c) {
  let target;
  if (c.route.length) {
    target = c.route[0];
  } else if (c.state === 'queue') {
    target = slotPos(c.reg, c.reg.queue.indexOf(c));
  } else {
    // Расплатился и дошел до коридора у входа — встает в самую короткую очередь
    const reg = registers.reduce((a, b) => (b.queue.length < a.queue.length ? b : a));
    if (reg.queue.length < reg.max) {
      c.reg = reg;
      reg.queue.push(c);
      c.state = 'queue';
      c.route = [{ x: reg.x, z: mall.exitLaneZ }];
    }
    return;
  }
  const dx = target.x - c.x;
  const dz = target.z - c.z;
  const dist = Math.hypot(dx, dz);
  let moving = false;
  c.atSlot = false;
  if (dist < 0.08) {
    if (c.route.length) c.route.shift();
    else c.atSlot = true;
  } else {
    const step = Math.min(c.speed, dist);
    const ux = dx / dist;
    const uz = dz / dist;
    // Покупатели друг друга не задерживают: у каждого свое место в очереди, а в коридоре
    // у входа встречные иначе блокировали бы друг друга. Ждут только игрока
    if (!mallPlayerBlocks(c, c.x + ux * step, c.z + uz * step)) {
      c.x += ux * step;
      c.z += uz * step;
      c.phase += 0.2;
      moving = true;
      let dyaw = Math.atan2(-ux, -uz) - c.yaw;
      dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
      c.yaw += dyaw * 0.2;
    }
  }
  if (!moving && c.state === 'queue' && !c.route.length) {
    c.yaw += (0 - c.yaw) * 0.2; // стоит лицом к кассе (на север)
  }
  c.amp += ((moving ? 1 : 0) - c.amp) * 0.15;
  c.mesh.position.set(c.x, 0, c.z);
  c.mesh.rotation.y = c.yaw;
  c.mesh.updateWalk(c.phase, c.amp);
}

// Человека задерживает другой человек или игрок на пути
function mallPlayerBlocks(self, x, z) {
  const f = mallFloor();
  return f === self.floor && Math.hypot(x - playerWorldX, z - (playerWorldZ - mallFloorZ[f])) < 1;
}

function mallBlocked(self, x, z) {
  for (const o of mallPeople) {
    if (o === self || o.floor !== self.floor) continue;
    if (Math.hypot(x - o.x, z - o.z) < 0.9) return true;
  }
  return mallPlayerBlocks(self, x, z);
}

// Люди оживают, только пока игрок в торговом центре на их этаже
function updateMallPeople() {
  if (!insideMall()) return;
  const f = mallFloor();
  for (const p of mallPeople) {
    if (p.floor !== f) continue;
    if (p.talking) continue; // разговаривающий стоит
    if (p.role === 'shopper') stepPatrol(p, mallBlocked);
    else if (p.role === 'customer') stepCustomer(p);
  }
  if (f === 0) {
    for (const reg of registers) {
      const front = reg.queue[0];
      if (front && front.atSlot && --reg.timer <= 0) serveCustomer(reg);
    }
  }
}
