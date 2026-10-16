// src/player/weapons.js
// ОРУЖИЕ ГЕРОЯ — данные (платформа — src/engine/weapons.js, правила — docs/mechanics/weapons.md).
// Новое оружие — новая запись defineWeapon: значок, модель и цифры. В ДЕМО оно появится само
// (на столе предметов и в тире).

// Импульсный лазер — первое оружие, винтовка: держат двумя руками. Стреляет голубыми импульсами —
// каждый летит как электромагнитная волна (две синусоиды вокруг светящейся оси, длина ~5). Патронов нет:
// ограничение — нагрев. Шесть-семь выстрелов подряд, дальше перегрев и пауза, пока ствол не остынет.
// Урон энергией: обычным целям — полный, бронированным — четверть (броню надо сначала снять прибором).
defineWeapon('pulse_laser', {
  name: 'Импульсный лазер',
  desc: 'Винтовка. Сверхкороткие голубые импульсы-волны: микровзрыв на поверхности и ударная волна — цель шатается. Перегревается.',
  kind: 'pulse',
  hold: 'rifle',
  damage: 12,
  type: 'energy',
  fireRate: 5, // выстрелов в секунду при зажатой кнопке
  range: 45,
  speed: 2.2, // юнитов за кадр — заряд долетает до манекена в тире за десяток кадров
  heat: { perShot: 0.15, coolPerSec: 0.45, delay: 0.35, resumeBelow: 0.4 },
  aimAssist: 0.22,
  // Сверхкороткая вспышка испаряет поверхность: микровзрыв и ударная волна — цель пошатывается и отлетает
  effects: { stagger: 20 },
  push: 0.12,
  hitFx: 'microburst',
  color: 0x4ec8ff,
  bolt: 'wave',
  wave: { length: 5, amplitude: 0.34, wavelength: 1 },
  muzzle: { forward: 1.6, right: 0.14, up: 1.37 }, // дуло винтовки у груди (src/models/person.js, RIFLE_AT)
  model: () => createPulseLaserModel(),
  iconArt: {
    // вид сбоку: приклад слева, графитовый корпус с голубой ячейкой, длинный ствол с излучателем вправо
    palette: { d: '#2d3340', b: '#1f232c', g: '#8a96a8', c: '#4ec8ff', C: '#d8f6ff' },
    rows: [
      '............',
      '............',
      '....bbc.....',
      'b.dddddd....',
      'bbdccccdgggC',
      'bbdddddddgcC',
      'b...b..d....',
      '....b.......',
      '....bb......',
      '............',
      '............',
      '............',
    ],
  },
});

// Вакуумная гаусс-пушка — рельсотрон: металлический сердечник на гиперзвуке прошивает все цели на линии.
// За ним остается вакуумный коридор; через долю секунды он схлопывается и стягивает к линии выстрела
// цели рядом и незакрепленные вещи. Медленная и горячая: один-два выстрела, пауза.
defineWeapon('gauss_cannon', {
  name: 'Вакуумная гаусс-пушка',
  desc: 'Рельсотрон. Сердечник прошивает всех на линии; вакуумный коридор схлопывается и стягивает врагов и вещи к линии выстрела.',
  kind: 'rail',
  hold: 'rifle',
  damage: 40,
  type: 'kinetic',
  fireRate: 0.8,
  range: 70,
  speed: 7,
  heat: { perShot: 0.55, coolPerSec: 0.3, delay: 0.6, resumeBelow: 0.3 },
  aimAssist: 0.15,
  color: 0xb8c8ff,
  push: 0.1,
  rail: { pull: 4, pullForce: 0.45, collapseAfter: 16 },
  muzzle: { forward: 1.92, right: 0.14, up: 1.37 },
  sound: null, // свой звук — в виде 'rail'
  model: () => createGaussCannonModel(),
  iconArt: {
    palette: { d: '#3a4048', b: '#1f232c', o: '#b87333', c: '#d6dcff', p: '#8fa8ff' },
    rows: [
      '............',
      '............',
      '...bb.......',
      'b.ddpdooooo.',
      'bbddpdccccc.',
      'bbddpdooooo.',
      'b...b.d.....',
      '....b.......',
      '....bb......',
      '............',
      '............',
      '............',
    ],
  },
});

// Плазменный огнемет — тяжелое оружие ближнего боя: липкий поток ионизированного газа, удержанный
// магнитным полем. Прожигает броню (с каждым попаданием множители брони тянутся к 1), поджигает,
// а на земле и у стен оставляет горящие лужи плазмы, которые жгут всех, кто в них зайдет.
defineWeapon('plasma_flamer', {
  name: 'Плазменный огнемет',
  desc: 'Поток липкой плазмы на 10–12 шагов. Прожигает броню, поджигает и оставляет горящие лужи на земле.',
  kind: 'stream',
  hold: 'rifle',
  damage: 3,
  type: 'plasma',
  fireRate: 15,
  range: 12,
  heat: { perShot: 0.022, coolPerSec: 0.35, delay: 0.4, resumeBelow: 0.35 },
  aimAssist: 0.25,
  color: 0xff6a2a,
  effects: { melt: 0.04, burn: { frames: 150, dps: 6 } },
  stream: {
    perShot: 3, spread: 0.13, speed: 0.75, drag: 0.94, life: 30,
    pool: { chance: 0.08, r: 1.4, life: 360, damage: 3, every: 20 },
  },
  noFlash: true,
  sound: null,
  muzzle: { forward: 1.32, right: 0.14, up: 1.39 },
  model: () => createPlasmaFlamerModel(),
  iconArt: {
    palette: { d: '#4a3a32', b: '#2a2420', m: '#8a8278', o: '#ff6a2a', y: '#ffe08a' },
    rows: [
      '............',
      '............',
      '..........oy',
      'b.dddddmm.oo',
      'bbddddddmmmy',
      'bbdddddmm.oo',
      'b...bmoom..y',
      '....bmoom...',
      '....bb......',
      '............',
      '............',
      '............',
    ],
  },
});

// Крио-осколочная винтовка — тактическая: капсула с жидким азотом под давлением. Попадание
// замораживает цель и всё рядом (4 секунды во льду, не двигается). Замороженная цель хрупкая: следующий
// удар kinetic (капсула, сердечник гаусса) — двойной урон, лед раскалывается, осколки бьют соседей.
defineWeapon('cryo_rifle', {
  name: 'Крио-осколочная винтовка',
  desc: 'Капсулы с жидким азотом замораживают цель и соседей. Второй удар по льду раскалывает его — осколки ранят всех рядом.',
  kind: 'canister',
  hold: 'rifle',
  damage: 8,
  type: 'kinetic',
  fireRate: 1.6,
  range: 40,
  speed: 1.3,
  heat: { perShot: 0.3, coolPerSec: 0.4, delay: 0.5, resumeBelow: 0.35 },
  aimAssist: 0.2,
  color: 0x9ff3ff,
  canister: { freezeR: 2.2, freeze: 240 },
  sound: null,
  muzzle: { forward: 1.27, right: 0.14, up: 1.37 },
  model: () => createCryoRifleModel(),
  iconArt: {
    palette: { w: '#dfe6ea', t: '#2a8a9a', b: '#3a4a52', c: '#9ff3ff', g: '#b8c4ca' },
    rows: [
      '............',
      '............',
      '............',
      'b.wwwwwwww..',
      'bbwtttwwwwtc',
      'bbwwggwwwwtc',
      'b...gcg.....',
      '....gcg.....',
      '....bb......',
      '............',
      '............',
      '............',
    ],
  },
});

// Дуговой разрядник — против толпы: молния бьет в цель у курсора и перескакивает на соседей (до четырех,
// каждый следующий получает меньше). Парализует на секунду; по электронике (роботы) — двойной урон.
defineWeapon('arc_discharger', {
  name: 'Дуговой разрядник',
  desc: 'Молния перескакивает между целями (до четырех), парализует их. По роботам и электронике бьет вдвое сильнее.',
  kind: 'arc',
  hold: 'rifle',
  damage: 10,
  type: 'electric',
  fireRate: 5,
  range: 22,
  heat: { perShot: 0.11, coolPerSec: 0.4, delay: 0.4, resumeBelow: 0.4 },
  aimAssist: 0.5,
  color: 0xc8a8ff,
  effects: { shock: 60 },
  arc: { chains: 4, jump: 8, falloff: 0.8, seek: 3.5 },
  noFlash: true,
  sound: null,
  muzzle: { forward: 1.34, right: 0.14, up: 1.38 },
  model: () => createArcDischargerModel(),
  iconArt: {
    palette: { d: '#2a2a34', b: '#1f232c', v: '#c8a8ff', m: '#9a9aa8', w: '#e8dcff' },
    rows: [
      '............',
      '..........m.',
      '...........w',
      'b.dvvvvdmm.w',
      'bbdvvvvdmmww',
      'bbdddddd.mm.',
      'b...b.d...m.',
      '....b.......',
      '....bb......',
      '............',
      '............',
      '............',
    ],
  },
});

// Тахионный пистолет — компактный, в одной руке. Тахионы летят назад во времени: заряд попадает туда,
// где цель была полсекунды назад (пока пистолет в руках, это место видно пурпурным силуэтом). Промах
// оставляет на линии выстрела «эхо» на три секунды: цель, которая пересечет линию, получит удар заранее.
defineWeapon('tachyon_pistol', {
  name: 'Тахионный пистолет',
  desc: 'Стреляет в прошлое: попадает туда, где враг был полсекунды назад. Промах оставляет эхо — удар по тому, кто пересечет линию.',
  kind: 'tachyon',
  hold: 'hand',
  damage: 22,
  type: 'tachyon',
  fireRate: 2.5,
  range: 40,
  heat: { perShot: 0.2, coolPerSec: 0.45, delay: 0.35, resumeBelow: 0.4 },
  aimAssist: 0.1,
  color: 0xff4dd2,
  tachyon: { pastFrames: 30, echo: 180 },
  sound: null,
  muzzle: { forward: 1.25, right: 0.39, up: 1.35 },
  model: () => createTachyonPistolModel(),
  iconArt: {
    palette: { d: '#2d2238', b: '#1a1420', p: '#ff4dd2', P: '#ffd8f4', m: '#7a6a8a' },
    rows: [
      '............',
      '............',
      '.......p....',
      '..ddddddp...',
      '..dppppdmP..',
      '..dddddd.p..',
      '...bbd......',
      '...bb.......',
      '...bb.......',
      '............',
      '............',
      '............',
    ],
  },
});
