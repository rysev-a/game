// src/models/creatures.js
// Существа из лаборатории (docs/mechanics/combat.md): граненые low-poly модели без контуров, как люди.
// Детали освещаются (LitMaterial); светящиеся (споры, глаза, пламя, искры) — MeshBasicMaterial.
//
//   const m = createChimericStriderModel();   // химерный ходок: четыре длинные ноги, мешок-яйцо сверху
//   createCleanUpDroneModel()                 // дрон-уборщик: купол на юбке с тремя дюзами, сопло сбоку
//   createCainModel()                         // «Каин-02»: тяжелый боевой робот, кулак и пулемет
//   createSporeHoundModel()                   // спорогончая: бледная гончая с горящими спорами на спине
//   createStiltVanguardModel()                // ходульный авангард: высокий желтый робот на ходулях
//   createDemoLabModel()                      // лаборатория ДЕМО: корпус с раздвижными воротами, из них выходят существа
//
// Все модели смотрят в -Z и стоят на y = 0. Анимация — m.userData.animate(a), раз в кадр:
//   a.phase — фаза шага (растет, пока существо идет или топчется на развороте)
//   a.move  — 0..1, насколько оно сейчас идет;  a.time — секунды;  a.turn — поворот за кадр (рад)
//   a.idle  — сколько кадров стоит на месте;     a.alert — 0..1, в него только что попали
//   a.sweep — 0..1, дрон крутится на месте и выжигает пол (только у дрона)
//   a.fight — 0/1, дерется с героем;  a.attack — имя атаки, a.charge — 0..1 замах перед ней,
//   a.strike — 1..0 сразу после удара или выстрела
// Откуда стреляет — m.userData.muzzles: { имя: Object3D } (позицию берут через getWorldPosition).
// У каждого существа своя манера: m.userData.pace(phase) — множитель скорости по фазе шага
// (рывки, тяжелый шаг), без него скорость ровная.
//
// Зависимость: глобальный THREE (three.js r128+), LitMaterial (src/engine/materials.js).

// Деталь: геометрия, цвет, место; glow — светится (MeshBasicMaterial), rot — [x, y, z] поворот
function creaturePart(parent, geo, color, x, y, z, { glow = false, rot = null, scale = null } = {}) {
  const m = new THREE.Mesh(geo, glow ? new THREE.MeshBasicMaterial({ color }) : new LitMaterial({ color }));
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  if (scale) m.scale.set(scale[0], scale[1], scale[2]);
  parent.add(m);
  return m;
}
const cBox = (p, w, h, d, color, x, y, z, o) => creaturePart(p, new THREE.BoxGeometry(w, h, d), color, x, y, z, o);
// Граненый «цилиндр»: sides граней, rTop/rBot — радиусы сверху и снизу (конус, призма, клин)
const cCyl = (p, rTop, rBot, h, sides, color, x, y, z, o) =>
  creaturePart(p, new THREE.CylinderGeometry(rTop, rBot, h, sides), color, x, y, z, o);
// Граненый камень: икосаэдр, растянутый по осям
const cGem = (p, r, color, x, y, z, o = {}) => creaturePart(p, new THREE.IcosahedronGeometry(r, o.detail || 0), color, x, y, z, o);

// Пустая точка в модели: дуло, пасть, сопло — откуда летят выстрелы
function creatureMarker(parent, x, y, z) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

// Нога из двух звеньев: бедро (группа hip) и голень (группа knee на конце бедра). Детали звеньев
// строят build.thigh(g) и build.shin(g) вдоль -Y. splay — развал ноги в сторону (вокруг Z)
function creatureLeg(parent, x, y, z, thighLen, build, splay = 0) {
  const hip = new THREE.Group();
  hip.position.set(x, y, z);
  parent.add(hip);
  const spread = new THREE.Group();
  spread.rotation.z = splay;
  hip.add(spread);
  build.thigh(spread);
  const knee = new THREE.Group();
  knee.position.y = -thighLen;
  spread.add(knee);
  const shinSpread = new THREE.Group();
  shinSpread.rotation.z = -splay * (build.unsplay ?? 1);
  knee.add(shinSpread);
  build.shin(shinSpread);
  return { hip, knee };
}

// Шаг ноги: бедро качается вперед-назад, колено сгибается, когда нога идет вперед
function swingLeg(leg, phase, move, amp, kneeAmp) {
  leg.hip.rotation.x = Math.sin(phase) * amp * move;
  leg.knee.rotation.x = -Math.max(0, Math.cos(phase)) * kneeAmp * move;
}

// ---------- Химерный ходок ----------
// Небольшое красное тело с рогами и клыками, над ним — бледный мешок-яйцо; четыре длинные темные ноги
// широко расставлены, колени выше тела, на ступнях светятся зеленые подушки
function createChimericStriderModel() {
  const g = new THREE.Group();
  const red = 0xc4524a;
  const redDark = 0x8a3532;
  const dark = 0x2e3639;
  const darkLight = 0x4a5452;
  const body = new THREE.Group();
  body.position.y = 2.55;
  body.scale.setScalar(1.3);
  g.add(body);
  cCyl(body, 0.42, 0.34, 0.75, 6, red, 0, 0.05, 0); // тело
  cCyl(body, 0.36, 0.04, 0.55, 4, dark, 0, -0.55, 0, { rot: [0, Math.PI / 4, 0] }); // темный киль снизу
  cBox(body, 0.5, 0.12, 0.08, redDark, 0, -0.12, -0.36); // складки «лица»
  cBox(body, 0.56, 0.1, 0.08, dark, 0, 0.08, -0.38);
  cBox(body, 0.12, 0.05, 0.05, 0x1a1e20, -0.13, 0.2, -0.41); // глаза-щели
  cBox(body, 0.12, 0.05, 0.05, 0x1a1e20, 0.13, 0.2, -0.41);
  // Клыки — светлые конусы вниз
  for (const [x, h] of [[-0.18, 0.2], [-0.07, 0.13], [0.07, 0.13], [0.18, 0.2]]) {
    cCyl(body, 0.035, 0, h, 4, 0xe8dcc0, x, -0.02 - h / 2, -0.4);
  }
  // Темные наплечники и рога, загнутые к мешку
  for (const s of [-1, 1]) {
    cGem(body, 0.2, dark, s * 0.42, 0.25, 0, { scale: [1, 1.4, 1.2] });
    cBox(body, 0.07, 0.42, 0.07, 0x7a5848, s * 0.26, 0.48, -0.12, { rot: [0.2, 0, -s * 0.5] });
    cBox(body, 0.06, 0.3, 0.06, 0x6a4a3c, s * 0.18, 0.72, -0.18, { rot: [0.3, 0, s * 0.45] });
  }
  // Мешок-яйцо
  const sac = cGem(body, 0.5, 0xeae6d6, 0, 0.95, 0.05, { detail: 1, scale: [1, 1.3, 1] });
  // Ноги: бедро уходит вверх-в сторону к колену, голень — длинная вниз
  const legs = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    // Передние ноги расставлены шире задних; голень чуть отклонена наружу и достает до земли
    const splay = sx * (sz < 0 ? 1.05 : 0.8);
    const unsplay = 0.9;
    const kneeY = 2.45 - 0.95 * Math.cos(splay);
    const shin = kneeY / Math.cos(splay * (1 - unsplay));
    const leg = creatureLeg(
      g,
      sx * 0.3,
      2.45,
      sz * 0.22,
      0.95,
      {
        thigh: (p) => {
          cBox(p, 0.17, 0.95, 0.17, darkLight, 0, -0.47, 0);
          cBox(p, 0.06, 0.8, 0.12, redDark, sx * 0.1, -0.45, 0);
          cGem(p, 0.15, darkLight, 0, -0.95, 0, { scale: [1.1, 1, 1] }); // колено
        },
        shin: (p) => {
          cBox(p, 0.13, shin * 0.6, 0.13, dark, 0, -shin * 0.3, 0);
          cBox(p, 0.04, shin * 0.5, 0.09, redDark, -sx * 0.08, -shin * 0.27, 0);
          cBox(p, 0.08, shin * 0.42, 0.08, 0x3c4648, 0, -shin * 0.78, 0);
          cCyl(p, 0.06, 0.16, 0.16, 4, dark, 0, -shin + 0.1, -0.04, { rot: [0, Math.PI / 4, 0] }); // ступня
          cBox(p, 0.3, 0.05, 0.3, 0x9ccc5a, 0, -shin + 0.025, -0.04, { glow: true }); // зеленая подушка
        },
        unsplay,
      },
      splay,
    );
    leg.side = sx;
    leg.front = sz < 0;
    legs.push(leg);
  }
  // Походка паука: ноги переставляются по одной (левая передняя, правая задняя, правая передняя,
  // левая задняя), колено высоко поднимается; тело качается, мешок отстает и колышется.
  // Идет рывками-подкрадываниями. Стоит — переминается, время от времени встает на дыбы
  // (и сразу, если в него попали): передние ноги вверх, клыки к стрелку
  const order = { '-1true': 0, '1false': 1, '1true': 2, '-1false': 3 };
  let rear = 0;
  let sacSwing = 0;
  let sacVel = 0;
  g.userData.pace = (phase) => 0.3 + 0.7 * Math.max(0, Math.sin(phase * 2));
  // Удар: встает на дыбы (замах) и обрушивает передние ноги и клыки вперед
  g.userData.animate = ({ phase, move, time, idle, alert, charge = 0, strike = 0 }) => {
    const wantRear = charge > 0 ? 1.3 : alert > 0.3 || (idle > 120 && time % 7 < 1.6) ? 1 : 0;
    rear += (wantRear - rear) * (charge > 0 ? 0.15 : strike > 0 ? 0.4 : 0.06);
    for (const leg of legs) {
      const p = phase + (order[leg.side + String(leg.front)] * Math.PI) / 2;
      const lift = Math.pow(Math.max(0, Math.sin(p)), 2); // нога в воздухе
      const shift = idle > 0 ? Math.max(0, Math.sin(time * 1.3 + order[leg.side + String(leg.front)] * 1.6)) * 0.25 : 0;
      leg.hip.rotation.x = Math.cos(p) * 0.3 * move + (leg.front ? rear * 0.75 : -rear * 0.15);
      leg.knee.rotation.x = -(lift * 0.8 * move + shift * (1 - move) + (leg.front ? rear * 0.9 : 0));
    }
    body.position.y = 2.55 + Math.sin(phase * 2) * 0.06 * move + rear * 0.25;
    body.position.x = Math.sin(phase) * 0.08 * move;
    body.rotation.z = Math.sin(phase) * 0.07 * move + Math.sin(time * 0.8) * 0.03 * (1 - move);
    body.rotation.x = rear * 0.45 - strike * 0.35;
    body.position.z = -strike * 0.6;
    // Мешок отстает от тела и колышется (пружина)
    sacVel += (-body.rotation.z * 3 - sacSwing) * 0.08;
    sacVel *= 0.88;
    sacSwing += sacVel;
    sac.rotation.z = sacSwing * 0.5;
    const k = 1 + Math.sin(time * (2.2 + rear * 4)) * (0.04 + rear * 0.04);
    sac.scale.set(k, 1.3 * (2 - k), k);
  };
  return g;
}

// ---------- Дрон-уборщик ----------
// Белый граненый купол на оранжевой юбке, по краю темная полоса; снизу три дюзы, сбоку сопло с
// огнем; над куполом трещат голубые искры
function createCleanUpDroneModel() {
  const g = new THREE.Group();
  const shell = new THREE.Group();
  shell.position.y = 0.55;
  g.add(shell);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), new LitMaterial({ color: 0xeeeee2 }));
  dome.scale.y = 0.95;
  dome.position.y = 0.34;
  shell.add(dome);
  cCyl(shell, 0.92, 0.92, 0.09, 7, 0x34505a, 0, 0.3, 0); // темная полоса
  cCyl(shell, 0.93, 0.93, 0.05, 7, 0x7a9298, 0, 0.23, 0);
  cCyl(shell, 0.93, 0.86, 0.22, 7, 0xe8893a, 0, 0.1, 0); // оранжевая юбка
  cCyl(shell, 0.86, 0.72, 0.08, 7, 0xb8602e, 0, -0.05, 0);
  // Дюзы снизу: темные стаканы с серым кольцом и голубым огоньком
  const jets = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const x = Math.sin(a) * 0.5;
    const z = Math.cos(a) * 0.5;
    cCyl(shell, 0.15, 0.12, 0.22, 6, 0x2f4550, x, -0.18, z);
    cCyl(shell, 0.1, 0.1, 0.05, 6, 0x8a9ea2, x, -0.3, z);
    jets.push(cCyl(shell, 0.07, 0.01, 0.2, 5, 0x8ee0ff, x, -0.42, z, { glow: true }));
  }
  // Сопло сбоку: серый корпус и темный ствол вперед (-Z), из него — огонь
  cCyl(shell, 0.2, 0.2, 0.18, 6, 0x7a9298, 0.55, 0.32, -0.62, { rot: [Math.PI / 2, 0, 0] });
  cCyl(shell, 0.08, 0.08, 0.2, 6, 0xa8b8bc, 0.55, 0.32, -0.72, { rot: [Math.PI / 2, 0, 0] });
  cBox(shell, 0.2, 0.18, 0.55, 0x22394a, 0.55, 0.32, -0.95);
  cCyl(shell, 0.1, 0.12, 0.08, 6, 0x1a2a36, 0.55, 0.32, -1.25, { rot: [Math.PI / 2, 0, 0] });
  const flame = new THREE.Group();
  flame.position.set(0.55, 0.32, -1.3);
  shell.add(flame);
  cCyl(flame, 0.13, 0, 0.45, 5, 0xf08a32, 0, 0, -0.22, { glow: true, rot: [-Math.PI / 2, 0, 0] });
  cCyl(flame, 0.06, 0, 0.25, 5, 0x9ee8ff, 0, 0, -0.12, { glow: true, rot: [-Math.PI / 2, 0, 0] });
  // Искры над куполом: ломаные голубые линии, мигают
  const sparks = [];
  const sparkMat = new THREE.LineBasicMaterial({ color: 0x6ab8dc });
  for (const [x, z] of [[-0.35, -0.1], [0.05, 0.1], [0.38, -0.05]]) {
    const pts = [];
    for (let k = 0; k < 6; k++) pts.push(new THREE.Vector3(x + (k % 2 ? 0.1 : -0.08), 1.3 + k * 0.14, z));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), sparkMat);
    shell.add(line);
    sparks.push(line);
  }
  g.userData.shell = shell;
  g.userData.muzzles = { nozzle: creatureMarker(shell, 0.55, 0.32, -1.55), top: creatureMarker(shell, 0, 1.4, 0) };
  // Парит и плавно скользит; в повороте кренится, как вертолет, разгоняясь — клюет носом.
  // На точке маршрута крутится на месте и выжигает пол длинным пламенем. Попали — подскакивает
  // выше, искры трещат без остановки
  let lift = 0;
  let bank = 0;
  g.userData.animate = ({ move, time, turn, alert, sweep, attack, charge = 0, strike = 0 }) => {
    const zap = attack === 'zap' ? Math.max(charge, strike) : 0;
    const burn = attack === 'flame' ? Math.max(charge, strike) : 0;
    sweep = Math.max(sweep, burn);
    lift += (Math.max(alert, zap) * 0.45 - lift) * 0.05;
    bank += (Math.max(-0.4, Math.min(0.4, -turn * 9)) - bank) * 0.1;
    shell.position.y = 0.55 + lift + Math.sin(time * (2.4 + alert * 4)) * (0.07 + alert * 0.04);
    shell.rotation.x = -0.14 * move + Math.sin(time * 1.7) * 0.02 + sweep * 0.12;
    shell.rotation.z = bank + Math.sin(time * 1.3) * 0.03 - sweep * 0.1;
    const f = (0.8 + Math.random() * 0.4) * (1 + sweep * 0.9);
    flame.scale.set(f, f, (0.8 + Math.random() * 0.5) * (1 + sweep * 1.6));
    for (const j of jets) j.scale.y = (0.7 + Math.random() * 0.6) * (1 + move * 0.6 + lift);
    for (const s of sparks) s.visible = Math.random() < 0.3 + Math.max(alert, zap) * 0.6;
    for (const s of sparks) s.scale.y = 1 + zap * 1.5;
  };
  return g;
}

// ---------- «Каин-02» ----------
// Тяжелый боевой робот: широкий граненый корпус в царапинах и ржавых пятнах, красный визор,
// правая рука — огромный кулак (у плеча трещат искры), левая — шестиствольный пулемет с лентой.
// Ноги — массивные блоки с гусеничными ребрами
function createCainModel() {
  const g = new THREE.Group();
  const gray = 0x6c7a80;
  const grayLight = 0x9aa6a2;
  const grayDark = 0x3a464c;
  const rust = 0x8a5a3a;
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = creatureLeg(g, s * 0.5, 1.85, 0, 0.6, {
      thigh: (p) => {
        cBox(p, 0.42, 0.6, 0.45, grayDark, 0, -0.3, 0);
        cBox(p, 0.46, 0.4, 0.2, 0x6e7c80, 0, -0.35, -0.2); // щиток
        cBox(p, 0.08, 0.32, 0.03, 0xb8c2c0, s * 0.1, -0.36, -0.31);
      },
      shin: (p) => {
        cCyl(p, 0.38, 0.5, 1.15, 4, grayDark, 0, -0.62, 0, { rot: [0, Math.PI / 4, 0], scale: [1, 1, 1.25] });
        cBox(p, 0.12, 0.85, 0.5, 0x7c8a8a, s * 0.35, -0.65, 0); // боковина
        // Гусеничные ребра спереди
        for (let k = 0; k < 7; k++) cBox(p, 0.5, 0.06, 0.12, 0x22292d, -s * 0.03, -0.25 - k * 0.12, -0.5);
        cBox(p, 0.85, 0.12, 1.05, 0x2e383c, 0, -1.19, -0.05); // ступня
      },
    });
    leg.s = s;
    legs.push(leg);
  }
  const torso = new THREE.Group();
  torso.position.y = 1.9;
  g.add(torso);
  cBox(torso, 1.0, 0.4, 0.75, 0x34404a, 0, 0.05, 0); // таз
  cCyl(torso, 0.62, 0.3, 0.45, 4, grayDark, 0, 0.42, -0.05, { rot: [0, Math.PI / 4, 0], scale: [1.3, 1, 1] });
  cBox(torso, 1.9, 1.2, 1.2, gray, 0, 1.15, 0); // корпус
  cBox(torso, 1.25, 1.0, 0.1, 0x6a787c, -0.25, 1.15, -0.62); // светлая панель спереди
  cBox(torso, 1.9, 0.18, 1.0, 0x7a8688, 0, 1.82, 0); // плечевой пояс
  cBox(torso, 0.1, 0.32, 0.03, 0xe0e2da, -0.75, 1.4, -0.66); // белая полоса
  // Знак опасности: желтый треугольник с темной серединой
  cCyl(torso, 0.16, 0.16, 0.02, 3, 0xe2b84a, 0.25, 0.95, -0.67, { rot: [Math.PI / 2, 0, 0] });
  cCyl(torso, 0.08, 0.08, 0.025, 3, 0x2a2e30, 0.25, 0.93, -0.675, { rot: [Math.PI / 2, 0, 0] });
  cBox(torso, 0.45, 0.1, 0.04, 0xb05040, 0.85, 1.45, -0.55, { rot: [0, 0, 0.35] }); // красная полоса сбоку
  cBox(torso, 0.14, 0.12, 0.04, rust, 0.6, 0.75, -0.64, { rot: [0, 0, 0.6] }); // ржавчина
  cBox(torso, 0.12, 0.1, 0.04, rust, -0.85, 1.75, -0.6, { rot: [0, 0, 0.4] });
  // Трещина с искрами у правого плеча
  cBox(torso, 0.03, 0.4, 0.03, 0xb05040, 0.95, 0.85, -0.5, { rot: [0, 0, 0.3] });
  const sparks = [];
  for (const [x, y, r] of [[1.05, 0.75, 0.5], [1.15, 0.6, -0.4], [1.0, 0.55, 1.1]]) {
    sparks.push(cCyl(torso, 0.05, 0, 0.18, 3, 0xf2c040, x, y, -0.55, { glow: true, rot: [0, 0, r] }));
  }
  // Голова: граненый шлем, темная челюсть, красный визор
  const head = new THREE.Group();
  head.position.y = 2.1;
  torso.add(head);
  cCyl(head, 0.32, 0.38, 0.32, 6, grayLight, 0, 0.25, 0);
  cCyl(head, 0.36, 0.26, 0.2, 6, 0x2e3a42, 0, 0.0, 0);
  cBox(head, 0.46, 0.1, 0.06, 0xd03a3a, 0, 0.24, -0.33, { glow: true });
  cBox(head, 0.3, 0.03, 0.065, 0xff8c80, 0, 0.26, -0.335, { glow: true });
  cBox(head, 0.03, 0.4, 0.03, 0xa8b0ae, -0.3, 0.05, -0.15, { rot: [0.2, 0, 0.3] }); // кабель
  // Наплечники
  for (const s of [-1, 1]) {
    cCyl(torso, 0.5, 0.55, 0.5, 6, 0x6e7c80, s * 1.2, 1.75, 0);
    cCyl(torso, 0.42, 0.5, 0.12, 6, grayLight, s * 1.2, 2.05, 0);
  }
  // Ракетная установка на левом плече: короб с двумя трубами
  cBox(torso, 0.5, 0.38, 0.6, 0x4a565c, -1.15, 2.3, 0.1);
  cBox(torso, 0.14, 0.14, 0.04, 0x1a2228, -1.26, 2.33, -0.21);
  cBox(torso, 0.14, 0.14, 0.04, 0x1a2228, -1.04, 2.33, -0.21);
  const podFlash = cBox(torso, 0.4, 0.14, 0.05, 0xff8a2a, -1.15, 2.33, -0.24, { glow: true });
  podFlash.visible = false;
  cBox(torso, 0.16, 0.12, 0.04, rust, -1.1, 1.85, -0.5, { rot: [0, 0, 0.5] });
  // Правая рука (+X) — кулак
  const armR = new THREE.Group();
  armR.position.set(1.25, 1.55, 0);
  torso.add(armR);
  cBox(armR, 0.42, 0.65, 0.45, 0x6a787c, 0.05, -0.35, 0);
  cBox(armR, 0.06, 0.4, 0.04, 0xb8c2c0, 0.05, -0.35, -0.24, { rot: [0, 0, -0.2] });
  const fist = cBox(armR, 0.75, 0.75, 0.75, 0x5e7a86, 0.12, -1.05, -0.05, { rot: [0, 0.15, 0] });
  cBox(armR, 0.4, 0.06, 0.04, 0x22292d, 0.12, -0.95, -0.44);
  cBox(armR, 0.4, 0.06, 0.04, 0x22292d, 0.12, -1.1, -0.44);
  cBox(armR, 0.4, 0.3, 0.3, 0x8a9a9e, -0.12, -0.75, -0.28); // светлая грань
  cBox(armR, 0.12, 0.12, 0.04, rust, 0.3, -1.25, -0.44, { rot: [0, 0, 0.5] });
  // Левая рука (-X) — пулемет с лентой
  const armL = new THREE.Group();
  armL.position.set(-1.25, 1.55, 0);
  torso.add(armL);
  cBox(armL, 0.38, 0.6, 0.42, grayDark, -0.05, -0.3, 0);
  for (let k = 0; k < 5; k++) cBox(armL, 0.22, 0.08, 0.14, 0xc05a48, -0.3, -0.1 - k * 0.12, 0.12, { rot: [0, 0, 0.4] }); // лента
  cCyl(armL, 0.32, 0.3, 0.75, 7, 0x2e3e48, -0.05, -0.95, 0);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI - Math.PI / 2;
    cBox(armL, 0.04, 0.6, 0.04, 0xa8b8bc, -0.05 + Math.sin(a) * 0.32, -0.95, Math.cos(a) * -0.32 + 0.0);
  }
  const barrels = new THREE.Group();
  barrels.position.set(-0.05, -1.4, 0);
  armL.add(barrels);
  cCyl(barrels, 0.3, 0.3, 0.18, 7, 0x9aa4a6, 0, 0, 0);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    cCyl(barrels, 0.06, 0.06, 0.04, 6, 0x1a2228, Math.sin(a) * 0.18, -0.08, Math.cos(a) * 0.18);
  }
  cCyl(barrels, 0.06, 0.06, 0.05, 6, 0x5a6668, 0, -0.08, 0);
  // Пулемет и кулак смотрят вперед: рука согнута в локте
  armL.rotation.x = 0.35;
  armR.rotation.x = 0.25;
  const fistGlow = cBox(armR, 0.5, 0.06, 0.5, 0xff8a2a, 0.12, -1.44, -0.05, { glow: true }); // огонь из кулака
  fistGlow.visible = false;
  g.userData.muzzles = {
    gun: creatureMarker(barrels, 0, -0.3, 0),
    fist: creatureMarker(armR, 0.12, -1.55, -0.05),
    pod: creatureMarker(torso, -1.15, 2.33, -0.4),
  };
  g.userData.spin = 0; // скорость вращения блока стволов: растет, когда в робота попали
  // Тяжелый шаг: нога поднимается высоко и впечатывается, корпус проседает на каждом шаге,
  // плечи поворачиваются навстречу ногам; между шагами почти замирает. Стоит — водит головой.
  // Попали — вскидывает пулемет на стрелка и раскручивает стволы
  let aim = 0;
  g.userData.pace = (phase) => 0.2 + 0.8 * Math.abs(Math.sin(phase));
  // В бою: пулемет поднят на героя и плюется зеленой плазмой; огонь — поднимает кулак и бьет
  // струей пламени прямо из руки; ракеты — откидывается назад, из короба на плече вспышка
  let fistUp = 0;
  g.userData.animate = ({ phase, move, time, idle, alert, fight = 0, attack, charge = 0, strike = 0 }) => {
    aim += ((alert > 0 || fight ? 1 : 0) - aim) * 0.06;
    const fire = attack === 'fire' ? Math.max(charge, strike) : 0;
    fistUp += (fire - fistUp) * 0.15;
    fistGlow.visible = attack === 'fire' && (strike > 0 || charge > 0.6) && Math.random() < 0.8;
    podFlash.visible = attack === 'rocket' && (charge > 0.5 || strike > 0) && Math.random() < 0.7;
    for (const leg of legs) {
      const p = phase + (leg.s < 0 ? 0 : Math.PI);
      const swing = Math.max(0, Math.sin(p));
      leg.hip.rotation.x = (Math.sin(p) * 0.22 + swing * 0.25) * move;
      leg.knee.rotation.x = -swing * 0.6 * move;
    }
    const stomp = Math.pow(Math.abs(Math.cos(phase)), 8); // нога ударила в землю
    torso.position.y = 1.9 - stomp * 0.12 * move - 0.03 * move;
    torso.rotation.y = -Math.sin(phase) * 0.1 * move + aim * 0.15;
    torso.rotation.z = Math.sin(phase) * 0.04 * move;
    torso.rotation.x = -aim * 0.06 - (attack === 'rocket' ? Math.max(charge, strike) * 0.12 : 0);
    armR.rotation.x = 0.25 + Math.sin(phase) * 0.22 * move * (1 - fistUp) + fistUp * 1.3;
    armL.rotation.x = 0.35 - Math.sin(phase) * 0.15 * move + aim * 1.05;
    if (attack === 'plasma' && charge > 0) g.userData.spin = Math.max(g.userData.spin, 0.5 * charge);
    barrels.rotation.y += g.userData.spin;
    g.userData.spin *= 0.97;
    for (const s of sparks) s.visible = Math.random() < 0.3;
    // Голова: осматривается рывками с паузами
    const scan = Math.sin(time * 0.6);
    head.rotation.y = (Math.abs(scan) > 0.6 ? Math.sign(scan) * 0.45 : scan * 0.75) * (1 - move) * (1 - aim);
  };
  return g;
}

// ---------- Спорогончая ----------
// Бледная, серо-голубая гончая; по хребту и на боку — оранжевые светящиеся споры, пасть раскрыта и
// светится изнутри, с нее капает
function createSporeHoundModel() {
  const g = new THREE.Group();
  const pale = 0xd4e2e8;
  const paleDark = 0x9fb6c2;
  const cream = 0xeeeee2;
  const body = new THREE.Group();
  body.position.y = 1.05;
  g.add(body);
  cBox(body, 0.62, 0.55, 1.35, pale, 0, 0, 0.05); // туловище
  cBox(body, 0.5, 0.2, 1.1, paleDark, 0, -0.3, 0.1); // брюхо
  cBox(body, 0.66, 0.5, 0.5, 0xdfe6e4, 0, 0.08, -0.5); // грудь
  // Хвост — сужается назад и вверх
  const tail = new THREE.Group();
  tail.position.set(0, 0.15, 0.7);
  body.add(tail);
  cCyl(tail, 0.04, 0.16, 0.8, 4, 0xa8c0cc, 0, 0.2, 0.35, { rot: [1.05, 0, 0] });
  // Шея и голова
  const head = new THREE.Group();
  head.position.set(0, 0.25, -0.75);
  body.add(head);
  cBox(head, 0.4, 0.4, 0.45, pale, 0, 0.05, 0.05, { rot: [0.5, 0, 0] }); // шея
  cBox(head, 0.56, 0.3, 0.6, cream, 0, 0.34, -0.32); // череп
  cBox(head, 0.46, 0.08, 0.45, 0x7a2e2a, 0, 0.18, -0.38); // нёбо
  const jaw = new THREE.Group();
  jaw.position.set(0, 0.12, -0.12);
  head.add(jaw);
  cBox(jaw, 0.42, 0.12, 0.5, 0xd8e2e2, 0, -0.06, -0.26);
  cBox(jaw, 0.3, 0.05, 0.38, 0xff9a3a, 0, 0.02, -0.26, { glow: true }); // горящее нутро
  const mouthGlow = cBox(head, 0.3, 0.14, 0.05, 0xffb050, 0, 0.11, -0.2, { glow: true });
  for (let k = 0; k < 4; k++) {
    const x = -0.15 + k * 0.1;
    cCyl(head, 0.03, 0, 0.09, 4, 0xf4ecd8, x, 0.1, -0.6); // верхние зубы
    cCyl(jaw, 0, 0.03, 0.08, 4, 0xf4ecd8, x, 0.02, -0.48); // нижние
  }
  g.userData.muzzles = { mouth: creatureMarker(head, 0, 0.15, -0.7) };
  const drool = cBox(head, 0.04, 0.22, 0.04, 0xff9a3a, 0.12, -0.08, -0.58, { glow: true });
  // Споры: по хребту и одна на боку, пульсируют
  const spores = [];
  for (const [x, y, z, r] of [[0, 0.36, -0.45, 0.13], [0, 0.4, -0.15, 0.15], [0, 0.4, 0.15, 0.15], [0, 0.36, 0.42, 0.13], [0.34, 0.0, 0.2, 0.11], [-0.34, 0.05, -0.1, 0.1]]) {
    cGem(body, r * 0.95, 0xc0603a, x * 0.97, y - r * 0.35, z, { scale: [x ? 0.6 : 1, 0.8, 1] }); // темное основание
    spores.push(cGem(body, r, 0xffa64a, x * 1.06, y + r * 0.15, z, { glow: true, scale: [x ? 0.6 : 1, 1.2, 1] }));
  }
  // Ноги
  const legs = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const front = sz < 0;
    const leg = creatureLeg(g, sx * 0.24, 0.95, front ? -0.42 : 0.5, 0.5, {
      thigh: (p) => cBox(p, 0.2, 0.55, 0.26, front ? 0xdfe6e4 : pale, 0, -0.25, 0),
      shin: (p) => {
        cBox(p, 0.13, 0.42, 0.14, paleDark, 0, -0.2, front ? 0 : 0.05);
        cBox(p, 0.2, 0.06, 0.3, 0xe4ecea, 0, -0.43, -0.06); // лапа
      },
    });
    leg.phaseOff = (front ? 0 : Math.PI) + (sx < 0 ? 0 : Math.PI * 0.5);
    legs.push(leg);
  }
  // Галоп: передние лапы вместе, задние вместе, спина то сгибается, то вытягивается, хвост
  // хлещет. Бежит толчками. Стоит — нюхает землю и щелкает пастью; попали — отряхивается
  let shake = 0;
  g.userData.pace = (phase) => 0.65 + 0.35 * Math.sin(phase);
  // Плевок: задирает голову и широко раскрывает пасть, потом выбрасывает голову вперед
  g.userData.animate = ({ phase, move, time, idle, alert, charge = 0, strike = 0 }) => {
    if (alert > 0.95) shake = 1;
    shake = Math.max(0, shake - 0.015);
    for (const leg of legs) {
      const front = leg.phaseOff % (Math.PI * 2) < Math.PI; // передние: 0 и π/2
      const p = phase + (front ? 0 : Math.PI) + (leg.phaseOff > Math.PI * 0.4 && leg.phaseOff < Math.PI * 0.6 ? 0.35 : 0);
      swingLeg(leg, p, move, 0.75, 0.8);
    }
    body.position.y = 1.05 + Math.max(0, Math.sin(phase)) * 0.18 * move;
    body.rotation.x = Math.cos(phase) * 0.14 * move;
    body.rotation.z = Math.sin(time * 40) * 0.08 * shake;
    tail.rotation.y = Math.sin(time * (move > 0.5 ? 14 : 3)) * (0.25 + move * 0.35);
    tail.rotation.x = -0.3 * move;
    // Голова: на бегу вытянута вперед, стоя — опущена к земле, нюхает
    const sniff = idle > 30 ? 1 : 0;
    head.rotation.x = -0.35 * move - sniff * (0.45 + Math.sin(time * 6) * 0.06) * (1 - move) * (1 - charge) + charge * 0.5 - strike * 0.4;
    body.rotation.x += charge * -0.12 + strike * 0.1;
    head.rotation.y = Math.sin(time * 0.9) * 0.3 * (1 - move) + Math.sin(time * 45) * 0.25 * shake;
    const snap = Math.max(0, Math.sin(time * 1.7)) > 0.97 ? 0.3 : 0;
    jaw.rotation.x = -0.45 - Math.sin(time * 3) * 0.1 - move * 0.15 - snap - Math.max(charge, strike) * 0.5;
    for (let i = 0; i < spores.length; i++) {
      const k = 1 + Math.sin(time * (3 + move * 5) + i) * 0.08;
      spores[i].scale.set((i > 3 ? 0.6 : 1) * k, 1.2 * k, k);
    }
    drool.scale.y = 0.6 + ((time * 0.8) % 1) * 0.9;
    mouthGlow.visible = Math.sin(time * 9) > -0.6;
  };
  return g;
}

// ---------- Ходульный авангард ----------
// Высокий тонкий робот: желтая грудь с решеткой, круглые лампы на плечах, короткие руки с когтями,
// очень длинные ноги с черно-желтой разметкой, шарнирные колени и широкие ступни
function createStiltVanguardModel() {
  const g = new THREE.Group();
  const yellow = 0xf2c850;
  const yellowDark = 0xcaa23a;
  const gray = 0x6e7c80;
  const dark = 0x3a4448;
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = creatureLeg(g, s * 0.32, 3.2, 0, 1.55, {
      thigh: (p) => {
        cBox(p, 0.22, 1.4, 0.24, dark, 0, -0.7, 0);
        cBox(p, 0.16, 1.1, 0.06, yellow, 0, -0.6, -0.14);
        // Черные полосы разметки
        for (let k = 0; k < 4; k++) cBox(p, 0.17, 0.07, 0.07, 0x22292d, 0, -0.25 - k * 0.25, -0.15, { rot: [0, 0, 0.6] });
        cBox(p, 0.05, 1.1, 0.05, 0xb8c2c0, -s * 0.13, -0.7, -0.05);
        // Колено: темная шестигранная шайба с серым ободом
        cCyl(p, 0.24, 0.24, 0.16, 6, 0x8a9692, 0, -1.55, 0, { rot: [0, 0, Math.PI / 2] });
        cCyl(p, 0.14, 0.14, 0.2, 6, 0x22292d, 0, -1.55, 0, { rot: [0, 0, Math.PI / 2] });
      },
      shin: (p) => {
        cBox(p, 0.26, 0.6, 0.3, gray, 0, -0.35, 0);
        cBox(p, 0.2, 1.0, 0.24, dark, 0, -1.0, 0);
        cBox(p, 0.1, 0.65, 0.05, yellow, s * 0.03, -1.0, -0.13);
        for (let k = 0; k < 6; k++) cBox(p, 0.24, 0.04, 0.1, 0x1e2428, 0, -0.65 - k * 0.12, 0.1);
        cBox(p, 0.06, 1.2, 0.05, 0xb8c2c0, -s * 0.12, -0.85, -0.06);
        // Ступня: пятка и три пальца
        cBox(p, 0.38, 0.14, 0.3, 0x9aa6a4, 0, -1.55, 0);
        cBox(p, 0.12, 0.08, 0.4, 0x5a6668, -0.16, -1.6, -0.25, { rot: [0, 0.3, 0] });
        cBox(p, 0.12, 0.08, 0.42, 0x5a6668, 0.16, -1.6, -0.25, { rot: [0, -0.3, 0] });
        cBox(p, 0.12, 0.08, 0.3, 0x5a6668, 0, -1.6, 0.2);
      },
    });
    leg.s = s;
    legs.push(leg);
  }
  const torso = new THREE.Group();
  torso.position.y = 3.2;
  g.add(torso);
  cBox(torso, 0.5, 0.3, 0.4, dark, 0, 0.05, 0); // таз
  cCyl(torso, 0.4, 0.2, 0.35, 4, yellowDark, 0, 0.3, 0, { rot: [0, Math.PI / 4, 0], scale: [1.2, 1, 0.9] });
  cCyl(torso, 0.62, 0.42, 0.75, 4, yellow, 0, 0.8, 0, { rot: [0, Math.PI / 4, 0], scale: [1.35, 1, 0.8] }); // грудь
  cBox(torso, 0.5, 0.22, 0.06, dark, 0, 0.85, -0.42); // решетка
  for (let k = 0; k < 4; k++) cBox(torso, 0.05, 0.15, 0.07, 0x8a9692, -0.15 + k * 0.1, 0.85, -0.43);
  cBox(torso, 0.06, 0.06, 0.04, 0x8a5a3a, 0.5, 1.0, -0.33); // ржавчина
  cBox(torso, 0.06, 0.06, 0.04, 0x8a5a3a, -0.5, 1.0, -0.33);
  cBox(torso, 1.15, 0.12, 0.5, yellowDark, 0, 1.2, 0); // плечи
  // Голова: серый шлем, желтая рамка визора, светлая щель
  const head = new THREE.Group();
  head.position.y = 1.35;
  torso.add(head);
  cBox(head, 0.2, 0.15, 0.2, dark, 0, 0.05, 0);
  cCyl(head, 0.2, 0.28, 0.4, 6, 0x7e8a86, 0, 0.35, 0);
  cBox(head, 0.3, 0.2, 0.08, yellowDark, 0, 0.3, -0.25);
  cBox(head, 0.22, 0.05, 0.06, 0x9ad0e0, 0, 0.34, -0.29, { glow: true });
  // Плечевые лампы и руки
  const arms = [];
  const lamps = [];
  for (const s of [-1, 1]) {
    cCyl(torso, 0.2, 0.2, 0.14, 6, 0x6a7678, s * 0.7, 1.3, 0, { rot: [Math.PI / 2, 0, 0] });
    lamps.push(cCyl(torso, 0.13, 0.13, 0.15, 6, 0xfff2c8, s * 0.7, 1.3, -0.02, { glow: true, rot: [Math.PI / 2, 0, 0] }));
    const arm = new THREE.Group();
    arm.position.set(s * 0.72, 1.12, 0.05);
    torso.add(arm);
    cBox(arm, 0.32, 0.25, 0.3, yellow, 0, 0, 0); // наплечник
    cBox(arm, 0.14, 0.35, 0.14, dark, 0, -0.3, 0);
    cBox(arm, 0.22, 0.32, 0.18, yellow, 0, -0.6, 0); // предплечье
    cBox(arm, 0.18, 0.2, 0.12, 0x5a6668, 0, -0.85, 0);
    cCyl(arm, 0.06, 0, 0.16, 4, 0x9aa6a4, s * 0.05, -1.0, 0); // когти
    cCyl(arm, 0.06, 0, 0.16, 4, 0x9aa6a4, -s * 0.05, -1.0, 0);
    arm.rotation.z = s * 0.15;
    arm.s = s;
    arm.muzzle = creatureMarker(arm, 0, -1.1, 0);
    arms.push(arm);
  }
  // Шагает, как цапля: бедро высоко вверх, голень свисает, потом нога выпрямляется и ставится
  // далеко вперед; руки прижаты, корпус почти не качается. На остановке поворачивает корпус и
  // осматривает вольер плечевыми лампами (они мигают). Попали — приседает на ходулях
  let crouch = 0;
  let aimUp = 0;
  g.userData.muzzles = {
    armL: arms[0].muzzle,
    armR: arms[1].muzzle,
    lampL: creatureMarker(torso, -0.7, 1.3, -0.15),
    lampR: creatureMarker(torso, 0.7, 1.3, -0.15),
  };
  // В бою вскидывает руки-стволы на героя и стреляет очередями; ракеты летят из плечевых ламп
  g.userData.pace = (phase) => 0.35 + 0.65 * Math.abs(Math.cos(phase));
  g.userData.animate = ({ phase, move, time, idle, alert, fight = 0, attack, charge = 0, strike = 0 }) => {
    crouch += ((alert > 0 || (attack === 'rocket' && charge > 0) ? 1 : 0) - crouch) * 0.08;
    aimUp += ((fight ? 1 : 0) - aimUp) * 0.08;
    for (const leg of legs) {
      const p = phase + (leg.s < 0 ? 0 : Math.PI);
      const up = Math.max(0, Math.sin(p)); // нога в воздухе
      leg.hip.rotation.x = (Math.sin(p) * 0.15 + up * 0.55) * move + crouch * 0.35;
      leg.knee.rotation.x = -(up * Math.max(0, Math.cos(p - 0.4)) * 1.3 * move + crouch * 0.7);
    }
    torso.position.y = 3.2 + Math.abs(Math.cos(phase)) * 0.08 * move - 0.08 * move - crouch * 0.35;
    torso.rotation.x = 0.05 * move;
    // Осмотр: корпус медленно поворачивается, голова идет чуть впереди
    const look = idle > 40 ? Math.sin(time * 0.7) * 0.6 : 0;
    torso.rotation.y += (look - torso.rotation.y) * 0.04;
    head.rotation.y += (look * 0.6 - head.rotation.y) * 0.06;
    for (const a of arms) {
      const kick = attack === 'bullet' ? strike * 0.15 : 0;
      a.rotation.x = (-0.35 * move - 0.15 + Math.sin(time * 1.2 + a.s) * 0.04) * (1 - aimUp) + aimUp * 1.45 + kick;
    }
    if (aimUp > 0.5) torso.rotation.y += (0 - torso.rotation.y) * 0.2;
    const blink = (idle > 40 && Math.sin(time * 5) > 0.2) || (attack === 'rocket' && charge > 0 && Math.sin(time * 30) > 0);
    for (const l of lamps) l.visible = !blink || l.position.x * Math.sin(time * 0.7) > 0;
  };
  return g;
}

// ---------- Лаборатория ДЕМО ----------
// Низкий бетонный корпус 20 × 10 с синей полосой, фасадом (воротами) в -Z. Ворота — две створки на
// рельсе, они разъезжаются в стороны (m.userData.setDoor(0..1)); за ними темный проем. По бокам от
// ворот — окна, за стеклом светятся зеленые капсулы с существами. Над воротами — лампа:
// m.userData.setAlarm(on, time) — мигает красным, пока из лаборатории выходят существа, иначе зеленая.
function createDemoLabModel() {
  const g = new THREE.Group();
  const W = 20;
  const D = 10;
  const H = 5;
  const front = -D / 2;
  cBox(g, W + 0.8, 0.4, D + 0.8, 0x6a6e70, 0, 0.2, 0); // цоколь
  cBox(g, W, H, D, 0xd8dcd6, 0, 0.4 + H / 2, 0); // корпус
  cBox(g, W + 0.06, 0.55, D + 0.06, 0x2f6fa8, 0, H - 0.4, 0); // синяя полоса
  cBox(g, W + 0.4, 0.45, D + 0.4, 0xb4b8b2, 0, H + 0.6, 0); // парапет
  cBox(g, W - 0.6, 0.1, D - 0.6, 0x7a7e80, 0, H + 0.62, 0); // крыша
  // На крыше: вентиляция, вытяжка, антенна с огоньком
  cBox(g, 2.4, 1.1, 1.8, 0x9aa2a6, -5.5, H + 1.2, 1.5);
  cBox(g, 2.6, 0.2, 2, 0x7d858a, -5.5, H + 1.8, 1.5);
  cCyl(g, 0.9, 1, 1.2, 8, 0x8a9296, 4.5, H + 1.25, 2);
  cCyl(g, 1.05, 1.05, 0.15, 8, 0x5a6266, 4.5, H + 1.9, 2);
  cCyl(g, 0.07, 0.1, 3.2, 5, 0x5a6266, 8, H + 2.4, -2.5);
  cGem(g, 0.18, 0xff4a3a, 8, H + 4.05, -2.5, { glow: true });

  // Ворота: темный проем, рама, рельс сверху и две створки с желто-черной полосой внизу
  const doorW = 5.2;
  const doorH = 3.9;
  cBox(g, doorW, doorH, 0.1, 0x0e1214, 0, 0.4 + doorH / 2, front - 0.02); // проем
  cBox(g, 0.35, doorH + 0.3, 0.3, 0x3a3f46, -doorW / 2 - 0.17, 0.4 + doorH / 2, front - 0.1);
  cBox(g, 0.35, doorH + 0.3, 0.3, 0x3a3f46, doorW / 2 + 0.17, 0.4 + doorH / 2, front - 0.1);
  cBox(g, doorW * 2 + 1.4, 0.3, 0.3, 0x3a3f46, 0, 0.55 + doorH, front - 0.12); // рельс
  const leaves = [];
  for (const s of [-1, 1]) {
    const leaf = new THREE.Group();
    leaf.position.set((s * doorW) / 4, 0, front - 0.22);
    g.add(leaf);
    cBox(leaf, doorW / 2, doorH, 0.14, 0x7a838c, 0, 0.4 + doorH / 2, 0);
    cBox(leaf, doorW / 2 - 0.3, 0.12, 0.06, 0x5a636c, 0, 0.4 + doorH * 0.62, -0.08); // ребро
    for (let i = 0; i < 4; i++) cBox(leaf, doorW / 8, 0.4, 0.05, i % 2 ? 0x1c1c1c : 0xf2c230, -doorW / 4 + doorW / 16 + (i * doorW) / 8, 0.65, -0.09);
    leaves.push({ leaf, s });
  }
  // Лампа над воротами и полоса света в проеме
  const lamp = creaturePart(g, new THREE.BoxGeometry(1.2, 0.35, 0.3), 0x5aff7a, 0, 0.95 + doorH, front - 0.2, { glow: true });
  const inner = creaturePart(g, new THREE.BoxGeometry(doorW - 0.4, 0.12, 0.05), 0x2a6a40, 0, 0.5 + doorH, front - 0.06, { glow: true });

  // Окна по бокам: темное стекло в раме, за ним капсула со светящимся раствором
  for (const x of [-7, -3.8, 3.8, 7]) {
    cBox(g, 2.2, 1.9, 0.12, 0x3a3f46, x, 2.6, front - 0.05);
    cBox(g, 1.9, 1.6, 0.06, 0x1c2a32, x, 2.6, front - 0.1);
    cCyl(g, 0.38, 0.38, 1.3, 8, 0x5cff8a, x, 2.5, front - 0.14, { glow: true, scale: [1, 1, 0.15] });
    cBox(g, 2.4, 0.14, 0.3, 0xb4b8b2, x, 1.58, front - 0.12); // отлив
  }
  // Сбоку — резервуар с трубой в стену
  cCyl(g, 1.2, 1.2, 3.4, 10, 0x9aa4ac, W / 2 + 1.6, 2.1, 1.5);
  cCyl(g, 1.25, 1.25, 0.2, 10, 0x6a7276, W / 2 + 1.6, 3.85, 1.5);
  cBox(g, 1.4, 0.3, 0.3, 0x6a7276, W / 2 + 0.5, 3.1, 1.5);
  // Желто-черная разметка перед воротами
  for (let i = 0; i < 6; i++) cBox(g, 0.7, 0.03, 1.6, i % 2 ? 0x1c1c1c : 0xf2c230, -2.1 + i * 0.84, 0.02, front - 1.2);

  const green = new THREE.Color(0x5aff7a);
  const red = new THREE.Color(0xff3a2a);
  const dimRed = red.clone().multiplyScalar(0.35);
  g.userData.setDoor = (k) => {
    for (const { leaf, s } of leaves) leaf.position.x = s * (doorW / 4 + k * (doorW / 2 + 0.2));
  };
  g.userData.setAlarm = (on, time) => {
    const blink = on && Math.sin(time * 12) > 0;
    lamp.material.color.copy(on ? (blink ? red : dimRed) : green);
    inner.material.color.setHex(on ? 0x6a2a20 : 0x2a6a40);
  };
  g.userData.door = { x: 0, z: front - 1, w: doorW };
  return g;
}
