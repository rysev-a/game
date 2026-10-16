// src/world/people.js
// Люди: палитры и конструктор человечка, прогулка туда-сюда по отрезку, обычные прохожие.

// Мужчины и женщины — те же человечки, что и игрок, только с прическами и в разной одежде
const npcShirts = [0x3a7bd5, 0x3fa35b, 0xe0c341, 0x8a5fc4, 0xe58a2f, 0xdad6c8, 0x4a8a9a];
const npcDresses = [0xc4506a, 0x8a5fc4, 0xe0c341, 0x3fa35b, 0x4a8a9a, 0xe58a2f, 0xd23c3c];
const npcPants = [0x2f2f2f, 0x3a4a6a, 0x5a4a3a, 0x4a4a4a];
const npcHair = [0x1a1a1a, 0x5a3a22, 0x8a6a3a, 0xc9a24a, 0x7a2a1a];
const npcSkins = [0xd9a066, 0xf0c8a0, 0xa66e3c, 0x7a4a2a];
const npcBags = [0x5a4632, 0x2a2a2a, 0x8a2a2a, 0x2a4a6a, 0x4a6a3a];
const npcJackets = [0x5a4632, 0x2a2c34, 0x6a2a2a, 0x3a4a5a, 0x8a7a5a];
const npcHats = [0x2a2a2a, 0x8a2a2a, 0x2a4a6a, 0xc9a24a, 0x4a6a3a];

// Какой это человек: набор из PERSON_PRESETS (src/models/person.js) и мелкие детали.
// Полицейский — kind 'police' или изредка обычный прохожий в городе
function personType(kind) {
  if (kind === 'police') return 'police';
  const r = Math.random();
  if (kind === 'passerby' && r < 0.06) return 'police';
  if (r < 0.16) return 'elder';
  if (r < 0.26) return 'child';
  if (r < 0.42) return 'office';
  if (r < 0.56) return 'student';
  if (r < 0.66) return 'worker';
  return 'casual';
}

function makePerson(gender, type = personType()) {
  const opts = {
    gender,
    shirtColor: pick(npcShirts),
    dressColor: pick(npcDresses),
    skinColor: pick(npcSkins),
    hairColor: pick(npcHair),
    bagColor: pick(npcBags),
    hatColor: pick(npcHats),
  };
  if (gender === 'male') opts.pantsColor = pick(npcPants);
  // Детали поверх набора: очки, борода, шапка
  if (type !== 'child') {
    if (Math.random() < 0.18) opts.glasses = true;
    if (gender === 'male' && type !== 'police' && Math.random() < 0.2) opts.beard = true;
  }
  if (type === 'casual' && Math.random() < 0.2) opts.hat = 'beanie';
  // Прически, куртки и толстовки — как у персонажей с листа docs/art/characters.png
  if (gender === 'female') opts.hair = type === 'elder' ? 'bun' : pick(['long', 'long', 'bob', 'ponytail']);
  else if (type === 'elder' && Math.random() < 0.4) opts.hair = 'bald';
  if (gender === 'male' && Math.random() < 0.15) opts.mustache = true;
  if ((type === 'casual' || type === 'office') && Math.random() < 0.3) opts.jacket = pick(npcJackets);
  else if ((type === 'casual' || type === 'student') && Math.random() < 0.15) opts.hoodie = true;
  // У набора свои цвета формы, прически и т. п. — случайные цвета их не перекрывают
  const preset = PERSON_PRESETS[type] || {};
  for (const key in preset) delete opts[key];
  const mesh = createPerson(type, opts);
  mesh.personType = type;
  return mesh;
}

// kind — кто это: 'passerby' (прохожий), 'resident' (житель поселка), 'police' (полицейский)
function addNpc(seg, gender, kind = 'passerby') {
  const type = personType(kind);
  const mesh = makePerson(gender, type);

  // Отрезок прогулки: на длинном тротуаре берем кусок 30–60 юнитов
  let { x1, z1, x2, z2 } = seg;
  const len = Math.hypot(x2 - x1, z2 - z1);
  if (len > 60) {
    const walk = rand(30, 60);
    const t0 = rand(0, (len - walk) / len);
    const t1 = t0 + walk / len;
    [x1, z1, x2, z2] = [x1 + (x2 - x1) * t0, z1 + (z2 - z1) * t0, x1 + (x2 - x1) * t1, z1 + (z2 - z1) * t1];
  }
  const t = Math.random();
  const npc = {
    mesh,
    gender,
    kind,
    a: { x: x1, z: z1 },
    b: { x: x2, z: z2 },
    x: x1 + (x2 - x1) * t,
    z: z1 + (z2 - z1) * t,
    dir: Math.random() < 0.5 ? 1 : -1, // 1 — к точке b, -1 — к точке a
    type,
    speed: type === 'elder' ? rand(0.04, 0.06) : rand(0.07, 0.12), // пожилые ходят медленнее
    phase: rand(0, 6),
    amp: 0,
    wait: 0,
    yaw: 0,
  };
  mesh.position.set(npc.x, 0, npc.z);
  cityGroup.add(mesh);
  npcs.push(npc);
}
// Прохожего задерживают машина, игрок или другой прохожий на пути
function npcBlocked(self, x, z) {
  for (const c of cars) {
    if (circleHitsShape(x, z, 0.5, carShape(c.x, c.z, c.heading, c.half))) return true;
  }
  if (!insideBuilding() && Math.hypot(x - playerWorldX, z - playerWorldZ) < 1) return true;
  for (const o of npcs) {
    if (o !== self && Math.hypot(x - o.x, z - o.z) < 0.9) return true;
  }
  return false;
}

// Один шаг прогулки туда-сюда по отрезку a—b. isBlocked(человек, x, z) — мешает ли
// что-то на пути: тогда он ждет, а если долго — идет назад
function stepPatrol(n, isBlocked) {
  const target = n.dir > 0 ? n.b : n.a;
  const dx = target.x - n.x;
  const dz = target.z - n.z;
  const dist = Math.hypot(dx, dz);
  if (dist < n.speed * 2) {
    n.dir = -n.dir; // дошел до конца отрезка — разворот
  } else {
    const ux = dx / dist;
    const uz = dz / dist;
    if (isBlocked(n, n.x + ux * n.speed, n.z + uz * n.speed)) {
      n.wait++;
      if (n.wait > 90) {
        n.dir = -n.dir; // долго стоит — идет назад
        n.wait = 0;
      }
    } else {
      n.wait = 0;
      n.x += ux * n.speed;
      n.z += uz * n.speed;
      n.phase += 0.2;
    }
    // Плавно поворачиваемся лицом по ходу движения (модель смотрит в -Z)
    let dyaw = Math.atan2(-ux, -uz) - n.yaw;
    dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    n.yaw += dyaw * 0.15;
  }
  n.amp += ((n.wait > 0 ? 0 : 1) - n.amp) * 0.15;
  n.mesh.position.set(n.x, 0, n.z);
  n.mesh.rotation.y = n.yaw;
  n.mesh.updateWalk(n.phase, n.amp);
}

function updateNpcs() {
  for (const n of npcs) if (!n.hold && !n.talking) stepPatrol(n, npcBlocked); // разговаривающий стоит
}
