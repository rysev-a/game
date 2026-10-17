// src/demo/range-creatures.js
// ДЕМО: ВОЛЬЕР С СУЩЕСТВАМИ В ТИРЕ И ЛАБОРАТОРИЯ (docs/mechanics/weapons.md#демо-тир). Южнее
// роботов-мишеней — огороженная с трех сторон площадка, открытая к линии огня (на запад). За южной
// оградой — лаборатория: из ее ворот через калитку в вольер выходят существа (модели —
// src/models/creatures.js). Вольер стоит пустой, пока обучение (src/demo/tutorial.js) не позовет
// spawnPenCreature(id). Каждое существо — обычная цель боевой платформы (addCombatTarget,
// src/engine/combat.js) со своим видом (kind: robot | bio — иммунитеты и слабости, ENEMY_KINDS) и
// здоровьем, так что всё оружие тира по нему бьет (или не бьет), а лед, ток и шатание его останавливают.
// Побежденное существо падает и растворяется: его больше нет.
//
//   spawnPenCreature(id, onGone) — выпустить существо из лаборатории; onGone() — когда оно исчезло
//   PEN_CREATURES — записи существ по id (у боссов boss: true);  penLab — модель лаборатории (ворота, лампа)
//
// Спокойно: wander — бродит по случайным точкам вольера; patrol — ходит по своим точкам с остановками;
// hover — парит (дрон; на точке маршрута крутится и выжигает пол). Попали — оборачивается к герою
// (гончая — отбегает). Не тронутое 5 секунд — восстанавливает здоровье.
//
// БОЙ. Герой подошел ближе aggro (или выстрелил) — существо нападает: держит свою дистанцию от героя
// (keep) и бьет атаками из attacks (замах charge кадров, потом shots выстрелов через every кадров,
// перезарядка cd). Снаряды, молнии и лужи — src/engine/enemy-attacks.js, они бьют героя через hitHero.
// Из вольера существа отходят только к линии огня (дальше — поводок). Герой упал — приходит в себя
// у стойки с оружием. Подключается после src/demo/range.js.

const PEN_CREATURES = {};
let spawnPenCreature = null;
let penLab = null;
{
  const penX = 101 + combatShift.x; // центр вольера (боевая зона на востоке, combatShift — src/demo/demo.js)
  const penZ = 87 + combatShift.z;
  const penHX = 16; // полуширина по X (на восток от линии огня)
  const penHZ = 13;
  flatRect(penHX * 2, penHZ * 2, 0x5a5a44, 0.012, penX, penZ); // вытоптанная земля
  flatRect(0.4, penHZ * 2, 0xe8e2d0, 0.02, penX - penHX - 6, penZ); // своя линия огня

  // Низкая ограда: север, юг и восток; запад открыт к стрелку
  const railColor = 0x6a6a5e;
  // В южной ограде — калитка напротив ворот лаборатории
  const gateHalf = 3;
  const southHalf = (penHX - gateHalf) / 2;
  const rails = [
    { x: penX, z: penZ - penHZ, hx: penHX, hz: 0.12 },
    { x: penX - penHX + southHalf, z: penZ + penHZ, hx: southHalf, hz: 0.12 },
    { x: penX + penHX - southHalf, z: penZ + penHZ, hx: southHalf, hz: 0.12 },
    { x: penX + penHX, z: penZ, hx: 0.12, hz: penHZ },
  ];
  for (const r of rails) {
    const rail = boxWithEdges(r.hx * 2, 0.12, r.hz * 2, railColor);
    rail.position.set(r.x, 0.9, r.z);
    cityGroup.add(rail);
    const n = Math.round(Math.max(r.hx, r.hz) / 2);
    for (let i = 0; i <= n; i++) {
      const k = i / n - 0.5;
      const post = boxWithEdges(0.2, 1.0, 0.2, 0x4a4a40);
      post.position.set(r.x + (r.hx > r.hz ? k * r.hx * 2 : 0), 0.5, r.z + (r.hz > r.hx ? k * r.hz * 2 : 0));
      cityGroup.add(post);
    }
    addHoverInfo(rail, { kind: 'ДЕМО', name: 'Вольер', desc: 'Сюда из лаборатории выходят существа. Стрелять с линии на западе.' });
    addObstacle(r);
    mapObjects.push({ ...r, color: '#6a6a5e' });
  }

  // Лаборатория за южной оградой, воротами к калитке вольера
  const labX = penX;
  const labZ = penZ + penHZ + 13;
  penLab = createDemoLabModel();
  penLab.position.set(labX, 0, labZ);
  cityGroup.add(penLab);
  addHoverInfo(penLab, {
    kind: 'ДЕМО',
    name: 'Лаборатория',
    desc: 'Здесь выращивают существ и собирают роботов. Когда идет обучение, ворота открываются и существа по одному выходят в вольер.',
  });
  addObstacle({ x: labX, z: labZ, hx: 10.4, hz: 5.4 });
  mapObjects.push({ x: labX, z: labZ, hx: 10, hz: 5, color: '#d8dcd6' });
  addObstacle({ x: labX + 11.6, z: labZ + 1.5, hx: 1.2, hz: 1.2 }); // резервуар
  const labDoor = { x: labX, z: labZ - 6.2 }; // у ворот, снаружи
  flatRect(6, labDoor.z - (penZ + penHZ) + 2, 0x5a5a44, 0.013, labX, (labDoor.z + penZ + penHZ) / 2); // тропа к калитке

  // Где герой приходит в себя, если существа его свалили: у стойки с оружием, вне их досягаемости
  heroWakePoint = { x: 74 + combatShift.x, z: 38 + combatShift.z };

  // Выстрел из точки модели (дуло, пасть) в героя. Снаряд летит туда, где герой сейчас, — от него
  // можно уйти шагом в сторону
  const muzzlePos = new THREE.Vector3();
  const fromMuzzle = (model, name) => {
    model.userData.muzzles[name].getWorldPosition(muzzlePos);
    cityGroup.worldToLocal(muzzlePos);
    return { x: muzzlePos.x, y: muzzlePos.y, z: muzzlePos.z };
  };
  const shoot = (model, muzzle, o) => {
    const m = fromMuzzle(model, muzzle);
    return fireEnemyShot({ x: m.x, y: m.y, z: m.z, tx: playerWorldX + rand(-0.3, 0.3), ty: 1.1, tz: playerWorldZ + rand(-0.3, 0.3), ...o });
  };

  // Существа. speed — шаг за кадр (fightSpeed — в бою); stride — сколько фазы шага на единицу пути;
  // weak — множители урона по нему; keep — на каком расстоянии от героя держится в бою;
  // attacks — чем бьет: { name, min, max (дальность), charge, shots, every, cd, fire(model, t, i) }
  const CREATURES = [
    {
      id: 'strider',
      make: createChimericStriderModel,
      name: 'Химерный ходок',
      kind: 'bio',
      desc: 'Биосущество, сшитое из нескольких тварей: красное тело с клыками на четырех длинных ногах, сверху — мешок-яйцо. Подкрадывается и бьет вблизи: встает на дыбы и обрушивает клыки. Огонь и плазма огнемета ×2, холод ×1,5; ток и импульс его не берут.',
      hp: 150, r: 0.9, height: 3.6, speed: 0.035, fightSpeed: 0.075, stride: 2.2,
      weak: { cold: 1.5 },
      behavior: 'wander',
      keep: [0, 1.6],
      attacks: [
        {
          name: 'stab', max: 2.9, charge: 30, shots: 1, cd: 75,
          fire: (m, t) => {
            if (Math.hypot(playerWorldX - t.x, playerWorldZ - t.z) < t.r + 2.2) hitHero({ damage: 12, type: 'melee', x: t.x, z: t.z });
          },
        },
      ],
    },
    {
      id: 'drone',
      make: createCleanUpDroneModel,
      name: 'Дрон-уборщик',
      kind: 'robot',
      desc: 'Робот: маленький парящий дрон, очень быстрый. Кружит вокруг цели, бьет молнией издалека и поливает огнем из сопла. Ток и импульсный лазер ×2; огонь, плазма огнемета, пули и дробь его не берут.',
      hp: 90, r: 0.95, height: 1.9, speed: 0.045, fightSpeed: 0.17, stride: 0,
      behavior: 'hover',
      route: [[-8, 6], [-8, -6], [0, -6], [0, 6]],
      keep: [6, 11],
      strafe: true,
      attacks: [
        { name: 'zap', max: 18, charge: 35, shots: 1, cd: 95, fire: (m) => zapHero(fromMuzzle(m, 'top'), 8) },
        {
          name: 'flame', max: 10, charge: 14, shots: 22, every: 2, cd: 220,
          fire: (m) => shoot(m, 'nozzle', { kind: 'fire', speed: 0.36, life: 30, damage: 1, type: 'fire' }),
        },
      ],
    },
    {
      id: 'cain',
      make: createCainModel,
      name: 'Проект «Каин-02»',
      kind: 'robot',
      desc: 'Тяжелый боевой робот, медленный, но бьет издалека: зеленая плазма из шестиствольника, ракеты с плеча, а вблизи поднимает кулак и жжет огнем прямо из руки. Огонь, плазма огнемета, пули и дробь его броню не берут; ток и импульсный лазер ×2.',
      hp: 400, r: 1.3, height: 4.2, speed: 0.02, fightSpeed: 0.026, stride: 2.4,
      behavior: 'patrol',
      route: [[6, -6], [6, 6]],
      wait: 180,
      keep: [7, 16],
      attacks: [
        { name: 'fire', max: 9, charge: 32, shots: 26, every: 2, cd: 160, fire: (m) => shoot(m, 'fist', { kind: 'fire', speed: 0.34, life: 30, damage: 1, type: 'fire' }) },
        { name: 'rocket', min: 6, max: 28, charge: 40, shots: 2, every: 14, cd: 380, fire: (m) => shoot(m, 'pod', { kind: 'rocket', speed: 0.26, life: 160, damage: 12, area: 2.2, type: 'area' }) },
        { name: 'plasma', max: 22, charge: 30, shots: 3, every: 9, cd: 150, fire: (m) => shoot(m, 'gun', { kind: 'plasma', speed: 0.34, life: 110, damage: 7, area: 0.8, type: 'plasma' }) },
      ],
    },
    {
      id: 'hound',
      make: createSporeHoundModel,
      name: 'Спорогончая',
      kind: 'bio',
      desc: 'Биосущество: быстрая бледная гончая, на спине зреют горящие споры. Держится на расстоянии и рыгает оранжевой жидкостью: попадание жжет, на земле остается горящая лужа; вблизи кусает. Огонь ×2 — споры вспыхивают; ток и импульс ее не берут; от попадания отбегает.',
      hp: 70, r: 0.8, height: 1.7, speed: 0.08, fightSpeed: 0.12, stride: 4.5,
      behavior: 'wander',
      flee: true,
      keep: [5, 9],
      strafe: true,
      attacks: [
        {
          name: 'bite', max: 2.3, charge: 10, shots: 1, cd: 55,
          fire: (m, t) => {
            if (Math.hypot(playerWorldX - t.x, playerWorldZ - t.z) < t.r + 1.6) hitHero({ damage: 7, type: 'melee', x: t.x, z: t.z });
          },
        },
        { name: 'spit', min: 3, max: 13, charge: 26, shots: 1, cd: 110, fire: (m) => shoot(m, 'mouth', { kind: 'spit', speed: 0.3, life: 160, damage: 9, type: 'fire' }) },
      ],
    },
    {
      id: 'stilt',
      make: createStiltVanguardModel,
      name: 'Ходульный авангард',
      kind: 'robot',
      desc: 'Робот-разведчик на ходулях: обходит периметр широким шагом, а заметив цель — бьет очередями из рук-стволов и ракетами из плечевых ламп. Ток и импульсный лазер ×2; огонь, плазма огнемета, пули и дробь его не берут.',
      hp: 180, r: 0.8, height: 4.9, speed: 0.04, fightSpeed: 0.05, stride: 1.6,
      behavior: 'patrol',
      route: [[12, -10], [12, 10], [-2, 10], [-2, -10]],
      wait: 60,
      keep: [9, 18],
      attacks: [
        { name: 'rocket', min: 5, max: 26, charge: 36, shots: 2, every: 12, cd: 340, fire: (m, t, i) => shoot(m, i ? 'lampR' : 'lampL', { kind: 'rocket', speed: 0.3, life: 150, damage: 10, area: 1.8, type: 'area' }) },
        { name: 'bullet', max: 22, charge: 16, shots: 6, every: 5, cd: 120, fire: (m, t, i) => shoot(m, i % 2 ? 'armR' : 'armL', { kind: 'bullet', speed: 0.75, life: 50, damage: 3, type: 'kinetic' }) },
      ],
    },
    {
      id: 'cyborg',
      make: createCyborgOutcastModel,
      name: 'Киборг-изгой',
      kind: 'robot',
      desc: 'Робот, когда-то бывший человеком: половина лица — металл с оранжевым глазом, левая рука — тяжелая пушка, за спиной рваный плащ. Ходит дозором, бьет издалека оранжевыми сгустками и очередями, а вблизи — живым кулаком. Ток и импульсный лазер ×2; огонь, плазма огнемета, пули и дробь его не берут.',
      hp: 220, r: 0.7, height: 2.5, speed: 0.035, fightSpeed: 0.05, stride: 3.2,
      behavior: 'patrol',
      route: [[-10, -8], [-10, 8], [4, 8]],
      wait: 120,
      keep: [6, 14],
      attacks: [
        {
          name: 'punch', max: 2.2, charge: 16, shots: 1, cd: 60,
          fire: (m, t) => {
            if (Math.hypot(playerWorldX - t.x, playerWorldZ - t.z) < t.r + 1.6) hitHero({ damage: 10, type: 'melee', x: t.x, z: t.z });
          },
        },
        { name: 'blast', min: 3, max: 20, charge: 36, shots: 1, cd: 130, fire: (m) => shoot(m, 'cannon', { kind: 'plasma', color: 0xff8a3a, speed: 0.32, life: 110, damage: 13, area: 1.2, type: 'plasma' }) },
        { name: 'burst', max: 18, charge: 14, shots: 4, every: 6, cd: 100, fire: (m) => shoot(m, 'cannon', { kind: 'bullet', color: 0xffa04a, speed: 0.7, life: 50, damage: 3, type: 'kinetic' }) },
      ],
    },
    {
      id: 'maw',
      make: createMireMawModel,
      name: 'Болотная пасть',
      kind: 'bio',
      desc: 'Биосущество из болота: круглое тело, почти целиком — пасть с кривыми зубами, три янтарных глаза и шипы на макушке. Ходит вперевалку, плюется едкой зеленой слизью (на земле остается жгучая лужа), а подобравшись — кусает. Огонь ×2; ток и импульс ее не берут.',
      hp: 160, r: 1.0, height: 2.2, speed: 0.03, fightSpeed: 0.06, stride: 3.0,
      behavior: 'wander',
      keep: [2, 8],
      attacks: [
        {
          name: 'bite', max: 2.6, charge: 22, shots: 1, cd: 70,
          fire: (m, t) => {
            if (Math.hypot(playerWorldX - t.x, playerWorldZ - t.z) < t.r + 1.7) hitHero({ damage: 14, type: 'melee', x: t.x, z: t.z });
          },
        },
        { name: 'spit', min: 3, max: 12, charge: 30, shots: 3, every: 8, cd: 140, fire: (m) => shoot(m, 'mouth', { kind: 'spit', color: 0x9adc4a, speed: 0.28, life: 160, damage: 6, type: 'fire' }) },
      ],
    },
    {
      id: 'crawler',
      make: createScrapCrawlerModel,
      name: 'Ломовой краулер',
      kind: 'robot',
      desc: 'Робот-паук, собранный из лома: рыжий корпус на шести ногах и один огромный желтый глаз. Быстро семенит вокруг цели, стреляет из глаза короткими лазерными очередями и бьет разрядом с антенн. Ток и импульсный лазер ×2; огонь, плазма огнемета, пули и дробь его не берут.',
      hp: 120, r: 1.1, height: 2.4, speed: 0.05, fightSpeed: 0.09, stride: 3.5,
      behavior: 'wander',
      keep: [5, 12],
      strafe: true,
      attacks: [
        { name: 'laser', max: 20, charge: 24, shots: 5, every: 4, cd: 110, fire: (m) => shoot(m, 'eye', { kind: 'bullet', color: 0xffe07a, speed: 0.8, life: 45, damage: 2, type: 'energy' }) },
        { name: 'zap', max: 14, charge: 28, shots: 1, cd: 100, fire: (m) => zapHero(fromMuzzle(m, Math.random() < 0.5 ? 'antL' : 'antR'), 7) },
      ],
    },
  ];

  // Боссы — помощники Барона (docs/story/characters/bosses.md) с оружием в руках. Пока без своих
  // способностей: у каждого свое оружие и манера, кто-то летает (fly — высота над землей), у кого-то
  // лазер. Вид не задан — их берет любое оружие. Выходят только в режиме DANGER (src/demo/tutorial.js)
  const bossModel = (type, weapon, fly) => () => {
    const g = new THREE.Group();
    const man = createPerson(type, { gender: 'male' });
    g.add(man);
    const w = WEAPONS[weapon];
    const gun = w.model();
    man.attach(w.hold === 'rifle' ? 'rifle' : 'handR', gun);
    const mz = gun.userData.muzzle || new THREE.Vector3(0, 0, -1);
    g.userData.muzzles = { gun: creatureMarker(gun, mz.x, mz.y, mz.z) };
    let aiming = false;
    // Идет, как человек; в бою держит оружие на герое, на выстреле его чуть отбрасывает. Летун
    // парит и покачивается, ноги свисают
    g.userData.animate = ({ phase, move, time, fight = 0, alert, strike = 0 }) => {
      const aim = !!(fight || alert > 0);
      if (aim !== aiming) {
        aiming = aim;
        man.setAim(aim ? (w.hold === 'rifle' ? 'rifle' : true) : false);
      }
      man.updateWalk(phase, fly ? 0.15 : move);
      man.rotation.x = -strike * 0.06 + (fly ? 0.12 * move : 0);
      if (fly) man.rotation.z = Math.sin(time * 1.3) * 0.06;
      if (gun.userData.spin) gun.userData.spin.rotation.z += strike * 0.6;
    };
    return g;
  };
  const gunShot = (o) => (m) => shoot(m, 'gun', o);
  const BOSSES = [
    {
      id: 'boss_flash', type: 'flash', weapon: 'pulse_laser', name: 'Вспышка',
      desc: 'Босс, помощник Барона: сверхскорость. Носится вокруг героя и бьет короткими очередями из импульсного лазера.',
      hp: 220, speed: 0.09, fightSpeed: 0.17, stride: 5, keep: [5, 10], strafe: true,
      attacks: [{ name: 'bolt', max: 18, charge: 12, shots: 3, every: 5, cd: 70, fire: gunShot({ kind: 'bullet', color: 0xff4a5a, speed: 0.9, life: 40, damage: 3, type: 'energy' }) }],
    },
    {
      id: 'boss_echo', type: 'echo', weapon: 'plasma_gun', name: 'Эхо',
      desc: 'Босс, помощник Барона: копии-иллюзии (пока без них). Держится на расстоянии и стреляет сгустками зеленой плазмы.',
      hp: 260, speed: 0.04, fightSpeed: 0.06, stride: 3, keep: [8, 15],
      attacks: [{ name: 'plasma', max: 22, charge: 26, shots: 2, every: 10, cd: 110, fire: gunShot({ kind: 'plasma', speed: 0.34, life: 110, damage: 8, area: 1, type: 'plasma' }) }],
    },
    {
      id: 'boss_falcon', type: 'falcon', weapon: 'minigun', name: 'Сокол', fly: 3.2,
      desc: 'Босс, помощник Барона: летает. Кружит над вольером на механических крыльях и поливает героя сверху из пулемета.',
      hp: 240, speed: 0.06, fightSpeed: 0.1, stride: 2, keep: [6, 12], strafe: true,
      attacks: [{ name: 'burst', max: 22, charge: 20, shots: 12, every: 3, cd: 120, fire: gunShot({ kind: 'bullet', speed: 0.8, life: 50, damage: 2, type: 'kinetic' }) }],
    },
    {
      id: 'boss_magnet', type: 'magnet', weapon: 'gauss_cannon', name: 'Магнит',
      desc: 'Босс, помощник Барона: притягивает железо. Долго наводит гаусс-пушку, потом бьет синим лазерным лучом — успейте уйти с линии.',
      hp: 320, speed: 0.035, fightSpeed: 0.05, stride: 2.8, keep: [9, 18],
      attacks: [{ name: 'beam', max: 26, charge: 50, shots: 1, cd: 140, fire: (m) => beamHero(fromMuzzle(m, 'gun'), 16, 0x6ad8ff) }],
    },
    {
      id: 'boss_shadow', type: 'shadow', weapon: 'tachyon_pistol', name: 'Тень',
      desc: 'Босс, помощник Барона: невидимость (пока видна). Подкрадывается и стреляет фиолетовым лазером из тахионного пистолета.',
      hp: 200, speed: 0.06, fightSpeed: 0.11, stride: 3.5, keep: [4, 9], strafe: true,
      attacks: [{ name: 'beam', max: 16, charge: 24, shots: 2, every: 10, cd: 90, fire: (m) => beamHero(fromMuzzle(m, 'gun'), 6, 0xc070ff) }],
    },
    {
      id: 'boss_cloud', type: 'cloud', weapon: 'arc_discharger', name: 'Туча', fly: 2.4,
      desc: 'Босс, помощник Барона: погода. Парит над землей и бьет молниями из дугового разрядника.',
      hp: 240, speed: 0.04, fightSpeed: 0.07, stride: 2, keep: [7, 14],
      attacks: [{ name: 'zap', max: 18, charge: 30, shots: 2, every: 14, cd: 120, fire: (m) => zapHero(fromMuzzle(m, 'gun'), 7) }],
    },
    {
      id: 'boss_spark', type: 'spark', weapon: 'pulse_laser', name: 'Искра',
      desc: 'Босс, помощник Барона: управляет электроникой. Режет героя частыми желтыми лазерными лучами.',
      hp: 230, speed: 0.05, fightSpeed: 0.08, stride: 3.2, keep: [6, 13], strafe: true,
      attacks: [{ name: 'beam', max: 20, charge: 20, shots: 5, every: 6, cd: 110, fire: (m) => beamHero(fromMuzzle(m, 'gun'), 3, 0xffd84a) }],
    },
    {
      id: 'boss_whisper', type: 'whisper', weapon: 'cryo_rifle', name: 'Шепот',
      desc: 'Босс, помощник Барона: гипноз голосом (пока молчит). Стреляет ледяными капсулами из крио-винтовки.',
      hp: 220, speed: 0.04, fightSpeed: 0.06, stride: 3, keep: [8, 16],
      attacks: [{ name: 'ice', max: 22, charge: 28, shots: 3, every: 8, cd: 110, fire: gunShot({ kind: 'bullet', color: 0x9fe6ff, speed: 0.6, life: 60, damage: 5, type: 'kinetic' }) }],
    },
    {
      id: 'boss_block', type: 'block', weapon: 'bazooka', name: 'Глыба',
      desc: 'Босс, помощник Барона: сверхсила и броня. Медленный и очень крепкий: стреляет ракетами из базуки, вблизи бьет кулаком.',
      hp: 600, r: 0.9, speed: 0.025, fightSpeed: 0.035, stride: 2.4, keep: [0, 12],
      attacks: [
        {
          name: 'punch', max: 2.4, charge: 20, shots: 1, cd: 70,
          fire: (m, t) => {
            if (Math.hypot(playerWorldX - t.x, playerWorldZ - t.z) < t.r + 1.6) hitHero({ damage: 18, type: 'melee', x: t.x, z: t.z });
          },
        },
        { name: 'rocket', min: 5, max: 24, charge: 40, shots: 1, cd: 160, fire: gunShot({ kind: 'rocket', speed: 0.26, life: 160, damage: 14, area: 2.2, type: 'area' }) },
      ],
    },
    {
      id: 'boss_hydra', type: 'hydra', weapon: 'plasma_flamer', name: 'Гидра',
      desc: 'Босс, помощник Барона: регенерация. Идет напролом и жжет струей пламени; раны затягиваются быстрее, чем у других.',
      hp: 380, speed: 0.04, fightSpeed: 0.06, stride: 3, keep: [3, 7], heal: 3000,
      attacks: [{ name: 'fire', max: 9, charge: 20, shots: 24, every: 2, cd: 140, fire: gunShot({ kind: 'fire', speed: 0.34, life: 30, damage: 1, type: 'fire' }) }],
    },
  ];
  for (const b of BOSSES) {
    CREATURES.push(
      Object.assign({ r: 0.6, height: (b.fly || 0) + 2.3, behavior: 'wander', boss: true, make: bossModel(b.type, b.weapon, b.fly) }, b),
    );
  }

  const leash = { x1: penX - penHX - 20, x2: penX + penHX, z1: penZ - penHZ, z2: penZ + penHZ };
  const inPen = (x, z, r) => ({
    x: Math.max(penX - penHX + r + 1, Math.min(penX + penHX - r - 1, x)),
    z: Math.max(penZ - penHZ + r + 1, Math.min(penZ + penHZ - r - 1, z)),
  });
  const inLeash = (x, z, r) => ({
    x: Math.max(leash.x1 + r, Math.min(leash.x2 - r - 1, x)),
    z: Math.max(leash.z1 + r + 1, Math.min(leash.z2 - r - 1, z)),
  });
  const randomInPen = (r) => inPen(penX + rand(-penHX, penHX), penZ + rand(-penHZ, penHZ), r);
  const angleTo = (dx, dz) => Math.atan2(-dx, -dz); // поворот модели (смотрит в -Z) к направлению
  const angleDiff = (a, b) => {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  const turn = (from, to, k) => from + angleDiff(from, to) * k;
  const clock = new THREE.Clock();
  const aggro = 30; // заметил героя
  const giveUp = 42; // потерял

  // Удар, который не прошел (иммунитет вида), — подсказка, чем бить; не чаще раза в 4 секунды
  let immuneHintAt = 0;
  const immuneHint = (t) => {
    if (performance.now() - immuneHintAt < 4000) return;
    immuneHintAt = performance.now();
    showToast(
      t.kind === 'robot'
        ? t.name + ': броню робота не берут огонь, плазма огнемета, пули и дробь. Бейте током (дуговой разрядник) или импульсным лазером'
        : t.name + ': по живой ткани ток и импульс не проходят. Жгите огнем (плазменный огнемет)',
      3500,
    );
  };

  for (const c of CREATURES) PEN_CREATURES[c.id] = c;

  // Выпустить существо из ворот лаборатории: выходит через калитку в вольер, дальше — как обычно.
  // Побежденное падает, растворяется и исчезает совсем; тогда зовется onGone
  spawnPenCreature = (id, onGone) => {
    const c = PEN_CREATURES[id];
    const model = c.make();
    const body = new THREE.Group(); // поворот и падение; полоска здоровья — на pivot, она не крутится
    body.add(model);
    const pivot = new THREE.Group();
    pivot.add(body);
    const route = (c.route || []).map(([x, z]) => ({ x: penX + x, z: penZ + z }));
    const start = { x: labDoor.x + rand(-1, 1), z: labDoor.z };
    pivot.position.set(start.x, 0, start.z);
    cityGroup.add(pivot);
    const ob = { x: start.x, z: start.z, hx: c.r * 0.6, hz: c.r * 0.6 };
    const shape = addObstacle(ob);
    shape.creature = c.kind || true; // свои снаряды сквозь него пролетают; БТР наезжает на биосущества

    const s = {
      heading: 0, // лицом на север: выходит из ворот к калитке
      enter: { x: penX + rand(-3, 3), z: penZ + penHZ - 4 }, // куда дойти, прежде чем драться
      gone: 0, // 0..1 — растворяется после поражения
      goal: null,
      leg: 0, // какая точка маршрута следующая
      wait: 60 + Math.random() * 120,
      phase: 0,
      move: 0,
      idle: 0,
      fall: 0,
      downUntil: 0,
      alert: 0, // кадры: смотрит на героя после попадания
      flee: 0, // кадры: убегает (гончая)
      sweep: 0, // кадры: дрон крутится и выжигает пол
      fight: false,
      atk: null, // текущая атака: { def, t, shot }
      cd: {}, // перезарядка атак, кадры
      busy: 30, // общая пауза между атаками
      strike: 0,
      strafe: Math.random() < 0.5 ? 1 : -1,
    };

    const nextGoal = () => {
      if (c.behavior === 'wander') s.goal = randomInPen(c.r);
      else {
        s.leg = (s.leg + 1) % route.length;
        s.goal = route[s.leg];
      }
    };

    // Идти к точке: разворот, потом шаг (рывками — по pace модели). true — дошел
    const walkTo = (t, goal, speed) => {
      const dx = goal.x - t.x;
      const dz = goal.z - t.z;
      const d = Math.hypot(dx, dz);
      if (d < Math.max(0.15, speed * 2)) return true;
      s.heading = turn(s.heading, angleTo(dx, dz), c.behavior === 'hover' ? 0.06 : 0.08);
      const facing = Math.cos(angleDiff(s.heading, angleTo(dx, dz)));
      const pace = model.userData.pace ? model.userData.pace(s.phase) : 1;
      const step = Math.min(d, speed * pace * Math.max(0, facing));
      const nx = t.x + (dx / d) * step;
      const nz = t.z + (dz / d) * step;
      if (Math.hypot(nx - playerWorldX, nz - playerWorldZ) > c.r + 0.7) {
        t.x = nx;
        t.z = nz;
        if (facing > 0.3) {
          s.moving = true;
          s.phase += speed * c.stride * (s.flee ? 1.3 : 1);
        }
      }
      return false;
    };

    // Бой: держать дистанцию, повернуться к герою, бить
    const fightStep = (t) => {
      const hx = playerWorldX - t.x;
      const hz = playerWorldZ - t.z;
      const dist = Math.hypot(hx, hz) || 0.01;
      const toHero = angleTo(hx, hz);
      if (s.atk) {
        // Замах и выстрелы: стоит и смотрит на героя
        s.heading = turn(s.heading, toHero, c.behavior === 'hover' ? 0.15 : 0.1);
        const a = s.atk;
        a.t++;
        const def = a.def;
        if (a.t >= def.charge && a.shot < def.shots && (a.t - def.charge) % (def.every || 1) === 0) {
          enemyAttackerKind = c.kind; // броня БТР держит удары биосуществ, но не роботов
          def.fire(model, t, a.shot);
          enemyAttackerKind = null;
          a.shot++;
          s.strike = 1;
        }
        if (a.shot >= def.shots) {
          s.cd[def.name] = def.cd;
          s.busy = 20 + Math.random() * 30;
          s.atk = null;
        }
        return;
      }
      // Выбрать атаку: какая достает и перезарядилась
      const facing = Math.cos(angleDiff(s.heading, toHero));
      if (s.busy <= 0 && (facing > 0.85 || c.strafe)) {
        const ready = c.attacks.filter((a) => !(s.cd[a.name] > 0) && dist <= a.max && dist >= (a.min || 0));
        if (ready.length) {
          s.atk = { def: pick(ready), t: 0, shot: 0 };
          return;
        }
      }
      // Держать дистанцию: подойти, отойти или кружить вокруг героя
      const [kMin, kMax] = c.keep;
      let want = Math.max(kMin, Math.min(kMax, dist));
      const ux = -hx / dist;
      const uz = -hz / dist;
      let gx = playerWorldX + ux * want;
      let gz = playerWorldZ + uz * want;
      if (c.strafe && dist <= kMax + 1) {
        gx += -uz * s.strafe * 3;
        gz += ux * s.strafe * 3;
        if (Math.random() < 0.004) s.strafe = -s.strafe;
      }
      const goal = inLeash(gx, gz, c.r);
      const there = Math.hypot(goal.x - t.x, goal.z - t.z) < 0.4;
      if (there || dist <= kMax) {
        // На месте — развернуться к герою (и шагнуть, если надо отойти или кружить)
        if (!there && (dist < kMin || c.strafe)) walkTo(t, goal, c.fightSpeed);
        else s.heading = turn(s.heading, toHero, 0.08);
      } else walkTo(t, goal, c.fightSpeed);
    };

    addCombatTarget({
      name: c.name,
      desc: c.desc,
      x: start.x,
      z: start.z,
      r: c.r,
      height: c.height,
      hp: c.hp,
      kind: c.kind,
      weak: c.weak || {},
      mesh: pivot,
      onHit: (t, hit, dmg) => {
        if (dmg === 0 && hit.weapon) immuneHint(t);
        s.alert = 120;
        if (model.userData.spin !== undefined) model.userData.spin = 0.5; // «Каин» раскручивает пулемет
        if (c.flee && !t.dead && !s.atk) {
          // Отбегает от героя в сторону
          const dx = t.x - playerWorldX;
          const dz = t.z - playerWorldZ;
          const d = Math.hypot(dx, dz) || 1;
          s.goal = inLeash(t.x + (dx / d) * 6 + rand(-3, 3), t.z + (dz / d) * 6 + rand(-3, 3), c.r);
          s.flee = 60;
          s.wait = 0;
        }
      },
      onDeath: () => {
        s.downUntil = performance.now() + 1500; // полежит и растворится
        s.atk = null;
      },
      update: (t) => {
        const time = clock.getElapsedTime();
        if (s.alert > 0) s.alert--;
        if (s.flee > 0) s.flee--;
        if (s.busy > 0) s.busy--;
        for (const k in s.cd) if (s.cd[k] > 0) s.cd[k]--;
        s.strike = Math.max(0, s.strike - 0.08);
        const before = s.heading;
        s.moving = false;

        // Заметил героя (или в него выстрелили) — бой; ушел далеко или упал — успокоился
        const heroDist = Math.hypot(playerWorldX - t.x, playerWorldZ - t.z);
        const canFight = heroIsTarget();
        if (!s.fight && canFight && (heroDist < aggro || (s.alert > 0 && heroDist < giveUp))) s.fight = true;
        if (s.fight && (!canFight || heroDist > giveUp)) {
          s.fight = false;
          s.atk = null;
          s.goal = null;
          s.wait = 30;
        }

        if (!t.dead && canMove(t)) {
          if (s.enter) {
            // Выход из лаборатории: прямо через калитку в вольер, на героя пока не смотрит
            if (walkTo(t, s.enter, c.fightSpeed)) s.enter = null;
          } else if (s.flee > 0 && s.goal) {
            if (walkTo(t, s.goal, c.fightSpeed * 1.5)) s.flee = 0;
          } else if (s.fight) fightStep(t);
          else if (s.sweep > 0) {
            // Дрон на точке маршрута: крутится на месте, выжигает пол
            s.sweep--;
            s.heading += 0.06;
          } else if (s.wait > 0) {
            s.wait--;
            if (s.alert) s.heading = turn(s.heading, angleTo(playerWorldX - t.x, playerWorldZ - t.z), 0.08);
          } else {
            if (!s.goal) nextGoal();
            // Вернуться в вольер после боя: цель всегда внутри
            if (walkTo(t, s.goal, c.speed)) {
              s.goal = null;
              s.wait = c.wait !== undefined ? c.wait : 40 + Math.random() * 160;
              if (c.behavior === 'hover') s.sweep = 105;
            }
          }
        } else if (s.atk && !canMove(t)) s.atk = null; // лед, ток, шатание сбивают замах
        const turnRate = angleDiff(before, s.heading);
        // Разворот на месте — ноги переступают
        if (!s.moving && Math.abs(turnRate) > 0.01 && c.stride) s.phase += Math.abs(turnRate) * 2.5;
        s.move += ((s.moving || Math.abs(turnRate) > 0.02 ? 1 : 0) - s.move) * 0.1;
        s.idle = s.moving ? 0 : s.idle + 1;

        // Анимация стоит, пока существо во льду или под током
        if (!t.status.frozen && !t.status.shock) {
          const a = s.atk;
          model.userData.animate({
            phase: s.phase,
            move: s.move,
            time,
            turn: turnRate,
            idle: s.idle,
            alert: s.alert / 120,
            sweep: s.sweep > 0 ? Math.min(1, s.sweep / 20, (105 - s.sweep) / 10) : 0,
            fight: s.fight ? 1 : 0,
            attack: a ? a.def.name : s.strike > 0 ? s.lastAttack : null,
            charge: a && a.t < a.def.charge ? a.t / a.def.charge : a && a.def.shots > 1 ? 1 : 0,
            strike: s.strike,
          });
          if (a) s.lastAttack = a.def.name;
        }

        // Падение; полежало — растворяется зеленым облаком и исчезает совсем
        if (t.dead) {
          s.fall = Math.min(1, s.fall + 0.04);
          if (performance.now() > s.downUntil) {
            if (s.gone === 0) {
              spawnWeaponFx(t.x, 0.8, t.z, 0x7aff9a, c.r * 0.8, 30, 1.03);
              spawnShockRing(t.x, 0.15, t.z, 0x7aff9a, 0.4, 20, 1.12);
            }
            s.gone = Math.min(1, s.gone + 0.025);
            if (s.gone >= 1) {
              // Убрать после кадра: сейчас идет обход целей
              queueMicrotask(() => {
                removeCombatTarget(t);
                cityGroup.remove(pivot);
                const i = obstacles.indexOf(ob);
                if (i >= 0) obstacles.splice(i, 1);
                const j = obstacleShapes.indexOf(shape);
                if (j >= 0) obstacleShapes.splice(j, 1);
                if (onGone) onGone();
              });
              t.update = null;
            }
          }
        } else {
          s.fall = Math.max(0, s.fall - 0.03);
          if (t.hp < t.maxHp && performance.now() - t.lastHit > (c.heal || 5000)) reviveTarget(t);
        }
        if (t.hpBar) t.hpBar.visible = !t.dead && s.fall === 0;
        const wobble = t.status.stagger > 0 ? Math.sin(t.status.stagger * 0.9) * 0.08 : 0;
        body.rotation.y = s.heading;
        if (c.fly) body.position.y = (c.fly + Math.sin(time * 2) * 0.2) * (1 - s.fall); // летун падает на землю
        if (c.behavior === 'hover') {
          // Дрон падает на землю и заваливается набок
          body.position.y = -s.fall * 0.55;
          body.rotation.z = s.fall * 0.35 + wobble;
        } else {
          body.rotation.z = s.fall * 1.45 + wobble;
        }
        pivot.position.set(t.x + t.off.x, -s.gone * 1.2, t.z + t.off.z);
        pivot.scale.setScalar(1 - s.gone * 0.6);
        shape.x = t.x + t.off.x;
        shape.z = t.z + t.off.z;
      },
    });
  };
}
