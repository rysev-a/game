// src/models/creatures.js
// Существа из лаборатории (docs/mechanics/combat.md): граненые low-poly модели без контуров, как люди.
// Детали освещаются (LitMaterial); светящиеся (споры, глаза, пламя, искры) — MeshBasicMaterial.
//
//   const m = createChimericStriderModel();   // химерный ходок: четыре длинные ноги, мешок-яйцо сверху
//   createCleanUpDroneModel()                 // дрон-уборщик: купол на юбке с тремя дюзами, сопло сбоку
//   createCainModel()                         // «Каин-02»: тяжелый боевой робот, кулак и пулемет
//   createSporeHoundModel()                   // спорогончая: бледная гончая с горящими спорами на спине
//   createStiltVanguardModel()                // ходульный авангард: высокий желтый робот на ходулях
//
// Все модели смотрят в -Z и стоят на y = 0. Анимация — m.userData.animate(phase, move, time):
// phase — фаза шага (растет, пока существо идет), move 0..1 — насколько оно сейчас идет, time — секунды.
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
  g.userData.animate = (phase, move, time) => {
    // Ноги шагают по диагонали (как у паука): левая передняя с правой задней
    for (const leg of legs) {
      const p = phase + (leg.front === leg.side < 0 ? 0 : Math.PI);
      swingLeg(leg, p, move, 0.32, 0.35);
    }
    body.position.y = 2.55 + Math.abs(Math.sin(phase)) * 0.08 * move;
    body.rotation.z = Math.sin(phase) * 0.05 * move;
    // Мешок дышит
    const k = 1 + Math.sin(time * 2.2) * 0.04;
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
  g.userData.animate = (phase, move, time) => {
    // Парит: покачивается и наклоняется вперед на ходу
    shell.position.y = 0.55 + Math.sin(time * 2.4) * 0.07;
    shell.rotation.x = -0.12 * move + Math.sin(time * 1.7) * 0.02;
    shell.rotation.z = Math.sin(time * 1.3) * 0.03;
    const f = 0.8 + Math.random() * 0.4;
    flame.scale.set(f, f, 0.8 + Math.random() * 0.5);
    for (const j of jets) j.scale.y = 0.7 + Math.random() * 0.6;
    for (const s of sparks) s.visible = Math.random() < 0.35;
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
  g.userData.spin = 0; // скорость вращения блока стволов: растет, когда в робота попали
  g.userData.animate = (phase, move, time) => {
    for (const leg of legs) {
      const p = phase + (leg.s < 0 ? 0 : Math.PI);
      swingLeg(leg, p, move, 0.28, 0.3);
    }
    torso.position.y = 1.9 + Math.abs(Math.sin(phase)) * 0.06 * move - 0.03 * move;
    torso.rotation.y = Math.sin(phase) * 0.06 * move;
    armR.rotation.x = 0.25 + Math.sin(phase) * 0.12 * move;
    barrels.rotation.y += g.userData.spin;
    g.userData.spin *= 0.97;
    for (const s of sparks) s.visible = Math.random() < 0.3;
    head.rotation.y = Math.sin(time * 0.6) * 0.25 * (1 - move);
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
  cCyl(body, 0.04, 0.16, 0.8, 4, 0xa8c0cc, 0, 0.18, 0.95, { rot: [-1.15, Math.PI / 4, 0] });
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
  g.userData.animate = (phase, move, time) => {
    for (const leg of legs) swingLeg(leg, phase + leg.phaseOff, move, 0.55, 0.6);
    body.position.y = 1.05 + Math.abs(Math.sin(phase)) * 0.08 * move;
    body.rotation.x = Math.sin(phase * 2) * 0.03 * move;
    jaw.rotation.x = -0.45 - Math.sin(time * 3) * 0.1; // пасть раскрыта вниз
    head.rotation.y = Math.sin(time * 0.9) * 0.2 * (1 - move);
    for (let i = 0; i < spores.length; i++) {
      const k = 1 + Math.sin(time * 3 + i) * 0.08;
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
  for (const s of [-1, 1]) {
    cCyl(torso, 0.2, 0.2, 0.14, 6, 0x6a7678, s * 0.7, 1.3, 0, { rot: [Math.PI / 2, 0, 0] });
    cCyl(torso, 0.13, 0.13, 0.15, 6, 0xfff2c8, s * 0.7, 1.3, -0.02, { glow: true, rot: [Math.PI / 2, 0, 0] });
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
    arms.push(arm);
  }
  g.userData.animate = (phase, move, time) => {
    for (const leg of legs) swingLeg(leg, phase + (leg.s < 0 ? 0 : Math.PI), move, 0.3, 0.4);
    torso.position.y = 3.2 + Math.abs(Math.sin(phase)) * 0.1 * move - 0.05 * move;
    torso.rotation.z = Math.sin(phase) * 0.04 * move;
    for (const a of arms) a.rotation.x = -Math.sin(phase + (a.s < 0 ? Math.PI : 0)) * 0.3 * move;
    head.rotation.y = Math.sin(time * 0.7) * 0.4 * (1 - move);
  };
  return g;
}
