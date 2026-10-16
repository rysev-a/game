// src/locations/bridge/incident.js
// СЦЕНА У РЕКИ — завязка детектива. Когда игрок в первый раз подходит к реке, на западном
// берегу у моста лежит накрытое простыней тело, вокруг него за лентой стоят 5 полицейских и
// почти не двигаются: смотрят на тело. На трассе — две полицейские машины и скорая.
// Один раз звучит фраза audio/peoples/policeman.mp3 (остальной звук на это время тише).
// Когда игрок отошел и вернулся — всё пропало насовсем.
// Машины в общем списке cars (на них действуют столкновения), но заперты: сесть нельзя.

const incident = {
  x: riverX - 21, // тело
  z: 18,
  state: 'waiting', // waiting → active → done
  arrived: false, // подошел ближе incidentArriveDist
  phraseStarted: false,
  cars: [],
  officers: [],
  props: [], // тело, лента, метки
  shapes: [], // препятствия в obstacleShapes
  lights: [], // мигалки: { mat, kind, side }
};
const incidentSpawnDist = 150; // на каком расстоянии сцена появляется (дальше ее скрывает туман)
const incidentArriveDist = 60; // «подошел»
const incidentPhraseDist = 40; // здесь звучит фраза
const incidentLeaveDist = 130; // после «подошел» отошел дальше — сцена пропадает навсегда
const incidentAbortDist = 220; // ушел, так и не дойдя, — сцена уберется и дождется следующего раза
let incidentTick = 0;

const incidentDistance = () => Math.hypot(playerWorldX - incident.x, playerWorldZ - incident.z);

function addEmergencyCar(kind, x, z, heading) {
  const police = kind === 'police';
  const mesh = createCar(
    police
      ? { bodyColor: 0x1b2a4a, cabinColor: 0x15202e }
      : { bodyColor: 0xf1ede2, cabinColor: 0xc9d6e0 },
  );
  const box = (w, h, d, color, px, py, pz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new LitMaterial({ color }));
    m.position.set(px, py, pz);
    mesh.add(m);
    return m;
  };
  // Полосы по бортам: у полиции белые, у скорой красные
  for (const side of [-1, 1]) {
    box(0.05, 0.3, police ? 2.2 : 3.2, police ? 0xf1ede2 : 0xd23c3c, side * 0.97, 0.62, 0);
  }
  // Мигалки на крыше
  for (const side of [0, 1]) {
    const lamp = box(0.45, 0.18, 0.3, 0xd23c3c, side ? 0.35 : -0.35, 1.52, 0.25);
    incident.lights.push({ mat: lamp.material, kind, side });
  }
  if (!police) {
    // Красный крест на крыше скорой
    box(0.9, 0.04, 0.25, 0xd23c3c, 0, 1.45, -0.4);
    box(0.25, 0.04, 0.9, 0xd23c3c, 0, 1.45, -0.4);
  }
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  cityGroup.add(mesh);
  const car = { mesh, x, z, heading, speed: 0, color: police ? 0x1b2a4a : 0xf1ede2, locked: true };
  car.info = police
    ? { kind: 'Машина', name: 'Полицейская машина', desc: 'Мигалки включены. Закрыта.' }
    : { kind: 'Машина', name: 'Скорая помощь', desc: 'Приехала слишком поздно.' };
  cars.push(car);
  incident.cars.push(car);
}

// Накрытое простыней тело: голова на севере (−Z), ноги на юге
function addBody(x, z) {
  const g = new THREE.Group();
  const edge = new THREE.LineBasicMaterial({ color: 0x7a766a });
  const piece = (w, h, d, px, py, pz) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, new LitMaterial({ color: 0xdcd8cb }));
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge));
    m.position.set(px, py, pz);
    g.add(m);
  };
  piece(0.45, 0.28, 0.45, 0, 0.14, -0.78); // голова
  piece(0.85, 0.36, 0.95, 0, 0.18, -0.05); // туловище
  piece(0.55, 0.22, 0.9, 0, 0.11, 0.85); // ноги
  g.position.set(x, 0, z);
  cityGroup.add(g);
  addHoverInfo(g, { kind: 'Улика', name: 'Тело под простыней', desc: 'Девушку нашли у моста. Полиция говорит — самоубийство.' });
  incident.props.push(g);
  const shape = { x, z, ux: 1, uz: 0, vx: 0, vz: 1, hu: 0.5, hv: 1.3 };
  obstacleShapes.push(shape); // игрок и машины тело не переедут
  incident.shapes.push(shape);
}

// Оцепление: желтая лента на четырех столбиках вокруг тела и желтые метки улик
function addCordon(cx, cz, half) {
  const g = new THREE.Group();
  const tape = new LitMaterial({ color: 0xe8c82a });
  const post = new LitMaterial({ color: 0x555555 });
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  corners.forEach(([sx, sz], i) => {
    const [ex, ez] = corners[(i + 1) % 4];
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), post);
    pole.position.set(cx + sx * half, 0.55, cz + sz * half);
    g.add(pole);
    const alongX = sz === ez;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(alongX ? half * 2 : 0.04, 0.08, alongX ? 0.04 : half * 2), tape);
    strip.position.set(cx + ((sx + ex) / 2) * half, 0.9, cz + ((sz + ez) / 2) * half);
    g.add(strip);
  });
  for (const [mx, mz, r] of [[-1.5, 0.6, 0.3], [1.3, -1.0, -0.5], [0.9, 1.9, 0.8], [-1.0, -2.1, 0.1]]) {
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.14), new LitMaterial({ color: 0xf0d020 }));
    mark.position.set(cx + mx, 0.15, cz + mz);
    mark.rotation.y = r;
    g.add(mark);
  }
  cityGroup.add(g);
  incident.props.push(g);
}

// Полицейский стоит на своем месте лицом к телу, раз в 5–15 секунд делает пару шагов
function addOfficer(x, z, gender) {
  const mesh = createPerson('police', { gender, skinColor: pick(npcSkins), hairColor: 0x1a1a1a });
  const o = {
    mesh,
    gender,
    kind: 'officer',
    hold: true, // его не двигает общий патруль прохожих (updateNpcs)
    home: { x, z },
    x,
    z,
    moving: false,
    target: null,
    timer: rand(120, 900),
    speed: 0.035,
    phase: rand(0, 6),
    amp: 0,
    yaw: Math.atan2(-(incident.x - x), -(incident.z - z)),
  };
  mesh.position.set(x, 0, z);
  mesh.rotation.y = o.yaw;
  mesh.updateWalk(0, 0);
  cityGroup.add(mesh);
  npcs.push(o); // игрок и машины обходят его так же, как прохожих
  incident.officers.push(o);
}

function updateOfficers() {
  for (const o of incident.officers) {
    let faceX = incident.x - o.x;
    let faceZ = incident.z - o.z;
    if (o.moving) {
      const dx = o.target.x - o.x;
      const dz = o.target.z - o.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.06) {
        o.moving = false;
        o.timer = rand(300, 900);
      } else {
        o.x += (dx / dist) * o.speed;
        o.z += (dz / dist) * o.speed;
        o.phase += 0.1;
        faceX = dx;
        faceZ = dz;
      }
    } else if (--o.timer <= 0) {
      // Пара шагов рядом со своим местом
      o.target = { x: o.home.x + rand(-0.7, 0.7), z: o.home.z + rand(-0.7, 0.7) };
      o.moving = true;
    }
    let dyaw = Math.atan2(-faceX, -faceZ) - o.yaw;
    dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    o.yaw += dyaw * 0.1;
    o.amp += ((o.moving ? 1 : 0) - o.amp) * 0.12;
    o.mesh.position.set(o.x, 0, o.z);
    o.mesh.rotation.y = o.yaw;
    o.mesh.updateWalk(o.phase, o.amp);
  }
}

function spawnIncident() {
  const carsX = riverX - 28; // машины на трассе перед мостом
  addEmergencyCar('police', carsX - 6, -6, Math.PI / 2 - 0.3);
  addEmergencyCar('police', carsX + 6, -6.2, Math.PI / 2 + 0.4);
  addEmergencyCar('ambulance', carsX, 6, -Math.PI / 2 + 0.2);
  addBody(incident.x, incident.z);
  addCordon(incident.x, incident.z, 4);
  const { x, z } = incident;
  addOfficer(x - 2.6, z - 0.5, 'male');
  addOfficer(x - 1.8, z + 2.4, 'female');
  addOfficer(x + 2.4, z + 1.8, 'male');
  addOfficer(x + 2.5, z - 1.6, 'male');
  addOfficer(x + 0.4, z - 2.9, 'male');
  incident.state = 'active';
}

function despawnIncident(permanently) {
  for (const car of incident.cars) {
    cityGroup.remove(car.mesh);
    cars.splice(cars.indexOf(car), 1);
  }
  for (const o of incident.officers) {
    cityGroup.remove(o.mesh);
    npcs.splice(npcs.indexOf(o), 1);
  }
  for (const g of incident.props) cityGroup.remove(g);
  for (const shape of incident.shapes) obstacleShapes.splice(obstacleShapes.indexOf(shape), 1);
  incident.cars = [];
  incident.officers = [];
  incident.props = [];
  incident.shapes = [];
  incident.lights = [];
  incident.arrived = false;
  incident.state = permanently ? 'done' : 'waiting';
}

function updateIncident() {
  const d = incidentDistance();
  if (incident.state === 'waiting') {
    if (d < incidentSpawnDist) spawnIncident();
    return;
  }
  if (incident.state !== 'active') return;
  if (d < incidentArriveDist) incident.arrived = true;
  if (incident.arrived && d > incidentLeaveDist) return despawnIncident(true);
  if (!incident.arrived && d > incidentAbortDist) return despawnIncident(false);

  // Фраза — один раз, когда игрок подошел; если звук еще не разрешен или выключен — ждем
  if (!incident.phraseStarted && d < incidentPhraseDist && audioUnlocked && !muted) {
    incident.phraseStarted = true;
    phrase.play().catch(() => (incident.phraseStarted = false));
  }

  updateOfficers();

  // Мигалки: полиция красная/синяя по очереди, скорая красная/белая
  incidentTick++;
  const phase = Math.floor(incidentTick / 14) % 2;
  for (const l of incident.lights) {
    const on = (phase + l.side) % 2 === 0;
    l.mat.color.setHex(l.kind === 'police' ? (on ? 0xd23c3c : 0x3a7bff) : on ? 0xd23c3c : 0xffffff);
  }
}

// Лес не растет у места происшествия
clearZones.push({ x1: riverX - 36, x2: riverX - 16, z1: 9, z2: 34 });
