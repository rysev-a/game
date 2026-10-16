// src/models/person.js
// Процедурная low-poly модель человека в стиле листа персонажей (docs/art/characters.png):
// граненые детали без контуров, плоская заливка, которую оттеняет свет сцены (LitMaterial).
//
// Подключение:
//   <script src="src/models/person.js"></script>
// Использование:
//   const man = createWalkingMan({ shirtColor: 0x3a7bd5 });
//   scene.add(man);                 // рост ~2 юнита, модель смотрит в -Z
//   man.rotation.y = Math.PI;       // развернуть при необходимости
//   // в цикле анимации:
//   man.updateWalk(elapsed * 6);    // 6 — частота шагов (рад/сек фазы)
//   man.setSit(true);               // сесть (на стул высотой 0.5); setSit(false) — встать
//   man.setPush('rear');            // толкает сзади: корпус вперед, руки упираются в багажник
//   man.setPush('side');            // водитель толкает сбоку у открытой двери, одной рукой рулит
//   man.setPush(false);             // выпрямиться. В позах толкания updateWalk шагает только ногами
//   man.attach('wristL', mesh);     // надеть вещь на левое запястье (браслет), качается с рукой
//   man.attach('handR', gun);       // вложить оружие в правую руку: ствол (-Z модели) идет вдоль руки
//   man.setAim(true);               // правая рука вытянута вперед (держит оружие); setAim(false) — опустить
//   man.attach('rifle', gun);       // винтовка у груди: приклад у правого плеча, ствол (-Z модели) вперед
//   man.setAim('rifle');            // хват как у солдата: корпус левым плечом вперед, приклад в плече,
//                                   // правая — на рукояти со спуском, левая держит ствол
//
// Прохожие: gender 'female' добавляет юбку и длинные волосы,
// hairColor включает прическу (без него человечек лысый):
//   createWalkingMan({ gender: 'female', hairColor: 0x5a3a22, dressColor: 0xc4506a });
//
// Детали (все необязательны):
//   face: false        — без лица (по умолчанию глаза, брови, нос и рот спереди)
//   hair: 'short' | 'long' | 'bob' | 'bun' | 'ponytail' | 'spiky' | 'bald' — прическа (цвет — hairColor);
//                         по умолчанию 'short' у мужчин и 'long' у женщин; 'bald' — лысина с венчиком
//   hat: 'fedora' | 'cap' | 'police' | 'beanie', hatColor
//   hood: true          — капюшон на голове (цвет — shirtColor, с кофтой hoodie)
//   hoodie: true        — толстовка: карман-кенгуру, шнурки (цвет — shirtColor)
//   mask: 0x1c1c20      — маска-балаклава на всю голову, открыты только глаза
//   coat: true, coatColor — длинное пальто или халат до колен, распахнуто: видна рубашка (shirtColor)
//   jacket: 0x8a5a32    — короткий пиджак или куртка нараспашку поверх рубашки
//   tie: true, tieColor — галстук (с пиджаком, пальто или на рубашке)
//   tshirt: true        — футболка: короткий рукав, руки ниже открыты (цвет — shirtColor)
//   sleeveless: true    — майка: руки открыты целиком
//   buttons: true, pockets: true — планка с пуговицами и нагрудные карманы
//   sweater: true, sweaterStripeColor — вязаный свитер: полосы на груди и рукавах, резинка по низу
//   stripes: 0x1c1c1e   — спортивный костюм: продольные полосы на груди, рукавах и штанах
//   neon: 0x3ad8ff      — светящиеся линии по костюму (на свету и ночью одинаково яркие)
//   apron: 0x7a5232     — фартук от груди до колен
//   scarf: 0xe8e4da     — шарф, концы висят спереди
//   collar: 0xd8c8a8    — меховой воротник
//   belt: 0x2a2a2a      — ремень
//   nametag: true       — бейдж на груди; badge: true — жетон полицейского
//   skirt: 'knee' | 'long', dressColor — юбка (у женщин по умолчанию 'knee')
//   sneakers: true, sneakerColor, sneakerStripeColor — кроссовки с толстой подошвой
//   shoeColor           — ботинки (по умолчанию почти черные)
//   gloves: 0x6a4a2a    — перчатки; gauntlets: true — массивные механические перчатки
//   glasses, goggles (очки-консервы на лбу), beard, mustache (цвет — hairColor или beardColor)
//   holding: 'clipboard' | 'phone' | 'book' — вещь в руке; watch: true — часы на левом запястье
//   wings: 0x6a7480     — механические крылья за спиной
//   bag: 'backpack' | 'tote', bagColor — рюкзак за спиной или сумка в левой руке
//   cane: true          — трость в правой руке; stoop: 0..0.3 — сутулость (наклон корпуса)
//   dress: false        — женщина без юбки (в брюках)
//   scale: 0.7          — ребенок
// Готовые наборы: createPerson('maxim' | 'denis' | 'police' | 'elder' | ..., опции) ниже.
//
// Зависимость: глобальный THREE (three.js r128+), LitMaterial (src/engine/materials.js).

// Материалы общие по цвету: подсветка и вспышка попадания клонируют их перед изменением
const personMatCache = new Map();
function personMat(color) {
  if (!personMatCache.has(color)) personMatCache.set(color, new LitMaterial({ color }));
  return personMatCache.get(color);
}

// Цвет темнее на долю k (для складок, манжет, подошв)
function personShade(color, k) {
  // k < 0 — светлее: смешиваем с белым, чтобы цвет не «пересвечивался»
  if (k < 0) return new THREE.Color(color).lerp(new THREE.Color(0xffffff), -k).getHex();
  return new THREE.Color(color).multiplyScalar(1 - k).getHex();
}

function createWalkingMan(options = {}) {
  if (typeof THREE === 'undefined') {
    throw new Error('person.js требует глобальный THREE');
  }

  const o = Object.assign(
    {
      shirtColor: 0x3a7bd5,
      pantsColor: 0x2f2f2f,
      skinColor: 0xd9a066,
      shoeColor: 0x24262b,
      gender: 'male', // 'male' | 'female'
      hairColor: null, // null — без прически
      hair: null,
      dressColor: 0xc4506a, // юбка (только для 'female')
      dress: true, // false — женщина в брюках
      skirt: null,
      face: true,
      hat: null, // 'fedora' | 'cap' | 'police' | 'beanie'
      hatColor: 0x3a3226,
      hood: false,
      hoodie: false,
      mask: null,
      coat: false,
      coatColor: 0x8a7350,
      jacket: null,
      tie: false,
      tieColor: 0x7a1f1f,
      tshirt: false,
      sleeveless: false,
      sweater: false,
      buttons: false,
      pockets: false,
      sweaterStripeColor: 0xd8d2c0,
      stripes: null,
      neon: null,
      apron: null,
      scarf: null,
      collar: null,
      belt: null,
      nametag: false,
      badge: false,
      sneakers: false,
      sneakerColor: 0xe8e8e4,
      sneakerStripeColor: 0xd23c3c,
      gloves: null,
      gauntlets: false,
      glasses: false,
      goggles: false,
      beard: false,
      mustache: false,
      beardColor: null,
      holding: null,
      watch: false,
      wings: null,
      bag: null, // 'backpack' | 'tote'
      bagColor: 0x5a4632,
      cane: false,
      stoop: 0,
      scale: 1,
    },
    options,
  );

  const female = o.gender === 'female';
  const skirt = o.skirt || (female && o.dress ? 'knee' : null);
  // Под юбкой без своих брюк ноги открыты: цвет кожи
  if (skirt && !('pantsColor' in options)) o.pantsColor = o.skinColor;
  const outer = o.coat ? o.coatColor : o.jacket; // верхняя одежда, если есть
  const sleeveColor = outer !== null ? outer : o.shirtColor;
  const bareArms = outer === null && (o.tshirt || o.sleeveless);
  const hairStyle = o.hairColor === null ? null : o.hair || (female ? 'long' : 'short');
  const beardColor = o.beardColor !== null ? o.beardColor : o.hairColor !== null ? o.hairColor : 0x3a2a1a;

  // Бокс; wTop — ширина верхней грани (трапеция: плечи шире пояса, бедро шире щиколотки)
  function part(w, h, d, color, wTop = w, dTop = d) {
    const geo = new THREE.BoxGeometry(w, h, d);
    if (wTop !== w || dTop !== d) {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        if (pos.getY(i) > 0) {
          pos.setX(i, pos.getX(i) * (wTop / w));
          pos.setZ(i, pos.getZ(i) * (dTop / d));
        }
      }
    }
    return new THREE.Mesh(geo, personMat(color));
  }
  function at(mesh, x, y, z, parent) {
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  // Граненый шар или «шапочка» из него (низкополигональная голова, волосы, капюшон)
  function ball(r, color, thetaLength = Math.PI, seg = 9) {
    const geo = new THREE.SphereGeometry(r, seg, Math.max(4, Math.round(seg * 0.7)), 0, Math.PI * 2, 0, thetaLength);
    const mat = thetaLength < Math.PI ? new LitMaterial({ color, side: THREE.DoubleSide }) : personMat(color);
    return new THREE.Mesh(geo, mat);
  }
  // Светящаяся деталь (неон): не зависит от освещения
  function glow(w, h, d) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: o.neon }));
    m.userData.noFlash = true;
    return m;
  }
  // Граненая призма (6 граней, ребро смотрит вперед, как на листе): ширина w и глубина d внизу,
  // wTop и dTop наверху. Из таких призм собраны торс, руки, ноги и кисти — без грубых коробок
  function prism(w, h, d, color, wTop = w, dTop = d, sides = 6) {
    const geo = new THREE.CylinderGeometry(1, 1, h, sides);
    let maxX = 0;
    for (let k = 0; k < sides; k++) maxX = Math.max(maxX, Math.abs(Math.sin((k * Math.PI * 2) / sides)));
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const top = pos.getY(i) > 0;
      pos.setX(i, (pos.getX(i) / maxX) * ((top ? wTop : w) / 2));
      pos.setZ(i, pos.getZ(i) * ((top ? dTop : d) / 2));
    }
    return new THREE.Mesh(geo, personMat(color));
  }

  const root = new THREE.Group();
  root.scale.setScalar(o.scale);
  const hips = new THREE.Group(); // качается вверх при ходьбе
  root.add(hips);

  // ---------- Ноги: вращается группа-«бедро», граненая нога сужается к щиколотке ----------
  function makeLeg(sideX) {
    const leg = new THREE.Group();
    leg.position.set(sideX, 0.95, 0);
    at(prism(0.13, 0.84, 0.15, o.pantsColor, 0.19, 0.2), 0, -0.42, 0, leg);
    // Ботинок или кроссовок: носок вперед
    if (o.sneakers) {
      at(part(0.15, 0.1, 0.28, o.sneakerColor, 0.13, 0.2), 0, -0.86, -0.05, leg);
      at(part(0.16, 0.035, 0.29, personShade(o.sneakerColor, 0.25)), 0, -0.925, -0.05, leg);
      at(part(0.01, 0.04, 0.16, o.sneakerStripeColor), sideX > 0 ? 0.078 : -0.078, -0.86, -0.06, leg);
    } else {
      at(part(0.16, 0.12, 0.3, o.shoeColor, 0.13, 0.2), 0, -0.88, -0.05, leg);
    }
    if (o.stripes !== null) {
      const st = at(part(0.012, 0.8, 0.04, o.stripes), sideX > 0 ? 0.08 : -0.08, -0.42, 0, leg);
      st.rotation.z = sideX > 0 ? 0.03 : -0.03;
    }
    return leg;
  }
  const legL = makeLeg(-0.1);
  const legR = makeLeg(0.1);
  hips.add(legL);
  hips.add(legR);
  // Таз связывает ноги с корпусом
  at(prism(0.38, 0.14, 0.22, o.pantsColor, 0.4, 0.24), 0, 0.98, 0, hips);

  // ---------- Корпус с руками и головой ----------
  const body = new THREE.Group();
  hips.add(body);

  // Торс: грудь (пояс уже, грудь шире) и покатые плечи, сходящиеся к шее. Ребро спереди делит грудь
  // на светлую и темную половины, как на листе. Под пальто и пиджаком торс цвета верхней одежды
  const torsoColor = outer !== null ? outer : o.shirtColor;
  const waistW = female ? 0.34 : 0.36;
  const chestW = female ? 0.42 : 0.46;
  const chestY0 = 1.02;
  const chestY1 = 1.5;
  at(prism(waistW, chestY1 - chestY0, 0.24, torsoColor, chestW, 0.28), 0, (chestY0 + chestY1) / 2, 0, body);
  at(prism(chestW, 0.14, 0.28, torsoColor, 0.24, 0.2), 0, chestY1 + 0.07, 0, body);
  const shoulder = chestW / 2; // где крепятся руки
  // Шея
  at(prism(0.1, 0.12, 0.1, o.skinColor, 0.1, 0.1), 0, 1.68, 0, body);

  // Передняя поверхность груди: z на смещении x и высоте y, и наклон грани (детали лежат на ней)
  function chest(y) {
    const t = Math.min(1, Math.max(0, (y - chestY0) / (chestY1 - chestY0)));
    return { hw: (waistW + (chestW - waistW) * t) / 2, hd: (0.24 + 0.04 * t) / 2 };
  }
  const frontZ = (x, y) => {
    const c = chest(y);
    return -c.hd + (c.hd / 2) * Math.min(1, Math.abs(x) / c.hw);
  };
  const faceTilt = (y) => {
    const c = chest(y);
    return Math.atan2(c.hd / 2, c.hw);
  };
  // Плоская деталь на груди (w x h, отступ out от поверхности). Если она пересекает ребро посередине,
  // собирается из двух половин, каждая лежит на своей грани
  function onChest(w, h, color, x, y, out = 0.006, wTop = w, mk = part) {
    const halves = x - w / 2 < -0.001 && x + w / 2 > 0.001 ? [[x - w / 2, 0], [0, x + w / 2]] : [[x - w / 2, x + w / 2]];
    const k = wTop / w;
    return halves.map(([x0, x1]) => {
      const cx = (x0 + x1) / 2;
      const m = mk === glow ? glow(x1 - x0, h, 0.012) : part(x1 - x0, h, 0.012, color, (x1 - x0) * k);
      const side = cx === 0 ? 0 : Math.sign(cx);
      m.rotation.y = side * faceTilt(y);
      return at(m, cx, y, frontZ(cx, y) - out, body);
    });
  }
  // Полоса вокруг торса (резинка свитера, ремень)
  const wrap = (y, h, color, extra = 0.012) => {
    const c = chest(y);
    return at(prism(c.hw * 2 + extra, h, c.hd * 2 + extra, color), 0, y, 0, body);
  };

  if (outer !== null) {
    // Распахнутая верхняя одежда: спереди полоса рубашки, лацканы по бокам
    onChest(0.14, 0.46, o.shirtColor, 0, 1.3, 0.004, 0.18);
    const lapelColor = personShade(outer, 0.12);
    [-1, 1].forEach((s) => {
      onChest(0.06, 0.24, lapelColor, s * 0.1, 1.42, 0.01).forEach((m) => (m.rotation.z = s * 0.3));
    });
  }
  // Рубашка: воротник уголками; планка с пуговицами и нагрудные карманы — по опциям
  const shirtShows = !o.tshirt && !o.sleeveless && !o.hoodie && o.stripes === null && o.neon === null && o.mask === null;
  if (shirtShows) {
    const collarColor = personShade(o.shirtColor, -0.15);
    [-1, 1].forEach((s) => {
      const tip = at(part(0.07, 0.045, 0.02, collarColor), s * 0.04, 1.6, -0.1, body);
      tip.rotation.z = s * -0.6;
    });
  }
  if (o.buttons) {
    const placket = outer !== null ? outer : o.shirtColor;
    onChest(0.022, 0.5, personShade(placket, 0.18), 0, 1.28, 0.003);
    for (const y of [1.46, 1.34, 1.22, 1.1]) onChest(0.022, 0.022, personShade(placket, 0.35), 0, y, 0.008);
  }
  if (o.pockets) {
    const c = personShade(outer !== null ? outer : o.shirtColor, 0.12);
    [-1, 1].forEach((s) => onChest(0.09, 0.09, c, s * 0.12, 1.38));
  }
  if (o.tie) onChest(0.05, 0.38, o.tieColor, 0, 1.36, 0.012, 0.035);
  if (o.sweater) {
    for (const y of [1.34, 1.43]) wrap(y, 0.045, o.sweaterStripeColor);
    wrap(1.06, 0.08, personShade(o.shirtColor, 0.15));
  }
  if (o.stripes !== null) {
    // Спортивный костюм: две полосы по груди и молния
    [-0.1, 0.1].forEach((x) => onChest(0.045, 0.46, o.stripes, x, 1.26));
    onChest(0.018, 0.46, o.stripes, 0, 1.26);
  }
  if (o.hoodie) {
    // Карман-кенгуру и шнурки капюшона
    onChest(0.24, 0.14, personShade(o.shirtColor, 0.12), 0, 1.12, 0.005, 0.2);
    [-0.045, 0.045].forEach((x) => onChest(0.014, 0.15, 0xe8e8e4, x, 1.48));
  }
  if (o.neon !== null) {
    // Светящиеся «схемы» по груди
    [-1, 1].forEach((s) => {
      onChest(0.018, 0.26, null, s * 0.09, 1.38, 0.008, 0.018, glow);
      onChest(0.07, 0.018, null, s * 0.125, 1.24, 0.008, 0.07, glow);
      onChest(0.018, 0.14, null, s * 0.16, 1.16, 0.008, 0.018, glow);
    });
  }
  if (o.apron !== null) {
    onChest(0.26, 0.44, o.apron, 0, 1.26, 0.008, 0.2);
    wrap(1.07, 0.05, personShade(o.apron, 0.2)); // завязки на поясе
  }
  if (o.scarf !== null) {
    [-0.05, 0.05].forEach((x) => onChest(0.08, 0.44, o.scarf, x, 1.34, 0.016));
    at(prism(0.24, 0.07, 0.2, o.scarf), 0, 1.64, 0, body);
  }
  if (o.collar !== null) at(prism(0.42, 0.1, 0.3, o.collar, 0.3, 0.24), 0, 1.6, 0, body);
  if (o.belt !== null) {
    wrap(1.04, 0.05, o.belt);
    onChest(0.055, 0.04, 0xb8bcc0, 0, 1.04, 0.014); // пряжка
  }
  if (o.badge) onChest(0.055, 0.065, 0xe8c547, -0.12, 1.42, 0.008);
  if (o.nametag) onChest(0.075, 0.028, 0xf2f0e8, 0.12, 1.4, 0.008);
  if (o.bag === 'backpack') {
    at(prism(0.34, 0.44, 0.18, o.bagColor, 0.32, 0.16), 0, 1.3, 0.2, body);
    [-0.12, 0.12].forEach((x) => onChest(0.045, 0.42, o.bagColor, x, 1.3, 0.004));
  }
  if (o.wings !== null) {
    // Механические крылья: два граненых щита за плечами, разведены в стороны
    [-1, 1].forEach((s) => {
      const wing = new THREE.Group();
      wing.position.set(s * 0.12, 1.45, 0.15);
      wing.rotation.set(0.15, s * 0.5, s * -0.35);
      at(prism(0.24, 0.9, 0.05, o.wings, 0.1, 0.03), s * 0.14, 0, 0, wing);
      at(part(0.06, 0.78, 0.02, personShade(o.wings, -0.4)), s * 0.1, 0, -0.02, wing);
      body.add(wing);
    });
  }

  // ---------- Руки: pivot в плече, внутри — рука чуть разведена в стороны (A-поза) ----------
  const handColor = o.gloves !== null ? o.gloves : o.skinColor;
  function makeArm(side) {
    const arm = new THREE.Group();
    arm.position.set(side * (shoulder + 0.02), 1.56, 0);
    const inner = new THREE.Group();
    inner.rotation.z = side * 0.28; // руки разведены, как на листе
    arm.add(inner);
    if (bareArms) {
      at(prism(0.09, 0.62, 0.1, o.skinColor, 0.12, 0.12), 0, -0.31, 0, inner);
      if (o.tshirt) at(prism(0.13, 0.22, 0.14, o.shirtColor, 0.15, 0.15), 0, -0.09, 0, inner);
    } else {
      at(prism(0.11, 0.62, 0.12, sleeveColor, 0.14, 0.15), 0, -0.31, 0, inner);
      at(prism(0.115, 0.05, 0.125, personShade(sleeveColor, 0.15)), 0, -0.6, 0, inner); // манжета
    }
    if (o.gauntlets) {
      at(prism(0.2, 0.3, 0.2, 0x8a9096, 0.16, 0.16, 8), 0, -0.6, 0, inner);
      at(prism(0.21, 0.05, 0.21, 0xd88a2a, 0.21, 0.21, 8), 0, -0.52, 0, inner);
      at(prism(0.17, 0.16, 0.17, 0x6a7076, 0.18, 0.18, 8), 0, -0.8, 0, inner);
    } else {
      // Кисть: граненая, к пальцам уже, большой палец смотрит вперед
      at(prism(0.07, 0.15, 0.1, handColor, 0.1, 0.11), 0, -0.7, 0, inner);
      at(prism(0.035, 0.07, 0.035, handColor), -side * 0.03, -0.67, -0.055, inner);
    }
    if (o.sweater) {
      at(prism(0.13, 0.045, 0.14, o.sweaterStripeColor), 0, -0.24, 0, inner);
    }
    if (o.stripes !== null) at(part(0.012, 0.6, 0.04, o.stripes), side * 0.058, -0.31, 0, inner);
    if (o.neon !== null) {
      at(glow(0.012, 0.5, 0.03), side * 0.056, -0.32, 0, inner);
      at(glow(0.12, 0.018, 0.13), 0, -0.58, 0, inner);
    }
    return { arm, inner };
  }
  const L = makeArm(-1);
  const R = makeArm(1);
  const armL = L.arm;
  const armR = R.arm;
  body.add(armL);
  body.add(armR);

  // Сумка, папка, часы — в левой руке; трость, телефон — в правой. Качаются вместе с руками
  if (o.bag === 'tote') at(part(0.08, 0.3, 0.3, o.bagColor), -0.04, -0.88, 0, L.inner);
  if (o.watch) at(part(0.11, 0.04, 0.12, 0x1c1c20), 0, -0.6, 0, L.inner);
  if (o.cane) at(part(0.04, 0.95, 0.04, 0x4a3020), 0, -1.1, -0.06, R.inner);
  if (o.holding === 'clipboard') {
    const board = at(part(0.03, 0.3, 0.22, 0x8a6a42), 0.06, -0.78, -0.06, R.inner);
    at(part(0.005, 0.24, 0.17, 0xf2f0e8), -0.018, 0, 0, board);
  } else if (o.holding === 'book') {
    at(part(0.05, 0.26, 0.2, 0x3a5a4a), 0.06, -0.78, -0.04, R.inner);
  } else if (o.holding === 'phone') {
    at(part(0.025, 0.16, 0.09, 0x1c1c20), 0.06, -0.76, -0.04, R.inner);
  }

  // ---------- Голова: граненый купол сверху и сужающаяся к подбородку восьмигранная призма снизу ----------
  // headY — центр купола (уровень глаз), headR — его радиус; лицо — плоская передняя грань
  const headR = 0.19;
  const headY = 1.86;
  const chinR = 0.15;
  const jawH = 0.15;
  const headColor = o.mask !== null ? o.mask : o.skinColor;
  // Лицо чуть «светится» своим цветом: грани головы под разными углами не уходят в темные пятна, как на листе
  const headMat = new LitMaterial({ color: headColor, emissive: new THREE.Color(headColor).multiplyScalar(0.28) });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(headR, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), headMat);
  const jaw = new THREE.Mesh(new THREE.CylinderGeometry(headR, chinR, jawH, 8), headMat);
  dome.rotation.y = jaw.rotation.y = Math.PI / 8; // грань, а не ребро, смотрит вперед
  at(dome, 0, headY, 0, body);
  at(jaw, 0, headY - jawH / 2, 0, body);
  // Радиус головы на высоте y и точка на ее передней поверхности при смещении x (чуть снаружи)
  const headRAt = (y) =>
    y >= headY ? Math.sqrt(Math.max(0, headR * headR - (y - headY) ** 2)) : chinR + ((headR - chinR) * (y - headY + jawH)) / jawH;
  const faceZ = (x, y) => {
    const a = headRAt(y) * Math.cos(Math.PI / 8); // расстояние до грани
    let z = -Infinity;
    for (const phi of [Math.PI * 0.75, Math.PI, Math.PI * 1.25]) z = Math.max(z, (a - x * Math.sin(phi)) / Math.cos(phi));
    return z - 0.004;
  };
  const onFace = (w, h, color, x, y, dz = 0) => at(part(w, h, 0.01, color), x, y, faceZ(x, y) - dz, body);

  if (o.mask !== null) {
    // Балаклава: открыта полоска глаз
    onFace(0.2, 0.05, o.skinColor, 0, headY + 0.01);
  }
  if (o.face) {
    [-0.065, 0.065].forEach((x) => {
      onFace(0.035, 0.022, 0x15151a, x, headY + 0.005, 0.003);
      if (o.mask === null) onFace(0.065, 0.016, o.hairColor !== null ? o.hairColor : 0x5a4030, x, headY + 0.05);
    });
    if (o.mask === null) {
      onFace(0.035, 0.07, personShade(o.skinColor, 0.1), 0, headY - 0.035, 0.008); // нос
      // Улыбка: рот с приподнятыми уголками
      onFace(0.07, 0.014, 0x8a4a3a, 0, headY - 0.1);
      [-1, 1].forEach((s) => onFace(0.018, 0.014, 0x8a4a3a, s * 0.042, headY - 0.092));
      // Уши
      [-1, 1].forEach((s) => at(part(0.03, 0.07, 0.06, personShade(o.skinColor, 0.05)), s * 0.193, headY - 0.03, 0.0, body));
    }
  }
  if (o.glasses) {
    [-0.055, 0.055].forEach((x) => {
      onFace(0.075, 0.06, 0x202020, x, headY + 0.01, 0.006);
      onFace(0.055, 0.04, 0xbcd8e8, x, headY + 0.01, 0.01);
    });
  }
  if (o.beard) {
    // Борода — передняя половина призмы челюсти чуть шире головы, с подбородком
    const beard = new THREE.Mesh(
      new THREE.CylinderGeometry(headR * 0.8 + chinR * 0.2 + 0.01, chinR + 0.015, jawH * 0.55, 8, 1, true, Math.PI / 2, Math.PI),
      new LitMaterial({ color: beardColor, side: THREE.DoubleSide }),
    );
    beard.rotation.y = Math.PI / 8;
    at(beard, 0, headY - jawH * 0.72, 0, body);
    at(part(0.12, 0.05, 0.1, beardColor, 0.16), 0, headY - jawH - 0.01, -0.06, body);
  }
  if (o.mustache || o.beard) onFace(0.11, 0.03, beardColor, 0, headY - 0.065, 0.01);

  // Прическа: шапочка, сдвинутая к затылку (затылок — в +Z). Под шляпой и капюшоном — только то, что торчит
  if (hairStyle !== null && o.mask === null && !o.hood) {
    if (hairStyle === 'bald') {
      // Лысина: венчик над ушами и на затылке
      const fringe = ball(headR + 0.01, o.hairColor, Math.PI * 0.3);
      fringe.rotation.x = 1.75;
      fringe.position.y = headY - 0.01;
      body.add(fringe);
      [-1, 1].forEach((s) => at(part(0.03, 0.08, 0.11, o.hairColor), s * 0.187, headY - 0.01, 0.03, body));
    } else {
      if (!o.hat) {
        const cap = ball(headR + 0.014, o.hairColor, Math.PI * 0.42);
        cap.rotation.x = 0.4; // макушка и затылок закрыты, лоб открыт
        cap.position.y = headY + 0.01;
        body.add(cap);
      }
      const back = ball(headR + 0.01, o.hairColor, Math.PI * 0.35);
      back.rotation.x = 1.4;
      back.position.y = headY;
      body.add(back);
      // Виски
      [-1, 1].forEach((s) => at(part(0.03, 0.1, 0.13, o.hairColor), s * 0.183, headY + 0.03, 0.02, body));
    }
    if (hairStyle === 'long') at(part(0.3, 0.42, 0.08, o.hairColor, 0.3), 0, headY - 0.14, 0.13, body);
    if (hairStyle === 'bob') {
      at(part(0.3, 0.3, 0.1, o.hairColor), 0, headY - 0.06, 0.1, body);
      [-1, 1].forEach((s) => at(part(0.05, 0.28, 0.2, o.hairColor), s * 0.16, headY - 0.06, 0.02, body));
    }
    if (hairStyle === 'bun' && !o.hat) {
      at(ball(0.085, o.hairColor), 0, headY + 0.17, 0.09, body);
    }
    if (hairStyle === 'ponytail') {
      at(ball(0.05, o.hairColor), 0, headY + 0.06, 0.19, body);
      const tail = at(part(0.06, 0.4, 0.06, o.hairColor, 0.08), 0, headY - 0.14, 0.22, body);
      tail.rotation.x = 0.12;
    }
    if (hairStyle === 'spiky' && !o.hat) {
      // Торчащие пряди: конусы на макушке, наклонены назад
      [[0, 0.17, -0.02, 0], [-0.08, 0.14, 0.02, 0.5], [0.08, 0.14, 0.02, -0.5], [0, 0.13, 0.1, 0], [-0.05, 0.16, -0.08, 0.3]].forEach(
        ([x, y, z, rz]) => {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), personMat(o.hairColor));
          spike.position.set(x, headY + y, z);
          spike.rotation.set(-0.35, 0, rz); // кончик вверх и чуть вперед, как чуб
          body.add(spike);
        },
      );
    }
  }

  if (o.hood) {
    // Капюшон: шапочка из шара, обращенная открытой стороной вперед
    const hood = ball(headR + 0.04, o.shirtColor, Math.PI * 0.62);
    hood.rotation.x = Math.PI / 2 + 0.2;
    hood.position.set(0, headY + 0.01, 0.02);
    body.add(hood);
  }
  if (o.goggles) {
    // Очки-консервы, поднятые на лоб
    at(part(0.34, 0.035, 0.3, 0x3a2a1a), 0, headY + 0.1, 0.01, body); // ремешок
    [-0.06, 0.06].forEach((x) => {
      onFace(0.08, 0.07, 0x8a6a3a, x, headY + 0.1, 0.01);
      onFace(0.055, 0.045, 0x7ab8d0, x, headY + 0.1, 0.02);
    });
  }

  // Головные уборы
  if (o.hat === 'fedora') {
    at(part(0.46, 0.035, 0.44, o.hatColor), 0, headY + 0.13, 0, body);
    at(part(0.26, 0.15, 0.26, o.hatColor, 0.22, 0.22), 0, headY + 0.22, 0, body);
    at(part(0.265, 0.035, 0.265, 0x15151a), 0, headY + 0.165, 0, body);
  } else if (o.hat === 'cap') {
    // Кепка по форме головы: купол и козырек
    const crown = ball(headR + 0.02, o.hatColor, Math.PI * 0.42);
    crown.position.y = headY + 0.03;
    body.add(crown);
    at(part(0.24, 0.025, 0.16, o.hatColor), 0, headY + 0.085, -0.22, body);
    at(part(0.04, 0.03, 0.04, personShade(o.hatColor, 0.2)), 0, headY + 0.2, 0, body); // пуговка
  } else if (o.hat === 'police') {
    at(part(0.4, 0.1, 0.4, o.hatColor, 0.44, 0.44), 0, headY + 0.18, 0, body);
    at(part(0.34, 0.05, 0.34, 0x15151a), 0, headY + 0.12, 0, body);
    at(part(0.28, 0.025, 0.14, 0x15151a), 0, headY + 0.1, -0.21, body);
    at(part(0.06, 0.06, 0.01, 0xe8c547), 0, headY + 0.18, -0.21, body);
  } else if (o.hat === 'beanie') {
    const beanie = ball(headR + 0.022, o.hatColor, Math.PI * 0.45);
    beanie.position.y = headY + 0.03;
    body.add(beanie);
  }

  // ---------- Юбка и полы пальто: висят на бедрах и не качаются вместе с ногами ----------
  if (skirt) {
    const long = skirt === 'long';
    const h = long ? 0.82 : 0.42;
    at(prism(long ? 0.52 : 0.46, h, long ? 0.4 : 0.34, o.dressColor, 0.38, 0.26), 0, 1.04 - h / 2, 0, hips);
  }
  if (o.coat) {
    // Полы пальто: две половины, между ними видны брюки
    [-1, 1].forEach((s) => {
      at(prism(0.24, 0.6, 0.3, o.coatColor, 0.2, 0.25), s * 0.105, 0.74, 0, hips);
    });
  }
  if (o.apron !== null) at(part(0.34, 0.5, 0.012, o.apron, 0.26), 0, 0.8, -0.13, hips);
  if (o.hoodie || o.jacket !== null || o.stripes !== null) {
    // Низ кофты или куртки чуть шире пояса
    at(prism(waistW + 0.03, 0.08, 0.27, personShade(torsoColor, 0.1)), 0, 1.04, 0, hips);
  }

  // Цикл шага: t — фаза в радианах, полный шаг за 2*PI.
  // amp — амплитуда 0..1 (0 — стоит на месте), для плавного старта/остановки.
  // Положительный угол X поворачивает конечность вперед (в -Z)
  let sitting = false;
  let pushing = false;
  let aiming = false; // false | 'hand' — правая рука вытянута с оружием | 'rifle' — винтовка двумя руками
  root.updateWalk = function (t, amp = 1) {
    if (sitting) return; // сидящий не шагает
    const swing = Math.sin(t) * amp;
    if (pushing) {
      // Толкает: ноги отставлены назад и переступают, руки неподвижно упираются вперед
      legL.rotation.x = pushPose.legBase + swing * 0.45;
      legR.rotation.x = pushPose.legBase - swing * 0.45;
      body.rotation.z = Math.sin(t) * 0.03 * amp;
      body.rotation.y = pushPose.yaw + Math.cos(t) * 0.04 * amp;
      hips.position.y = Math.abs(Math.cos(t)) * 0.03 * amp;
      return;
    }
    legL.rotation.x = swing * 0.75;
    legR.rotation.x = -swing * 0.75;
    if (aiming !== 'rifle') armL.rotation.x = -swing * 0.55; // с винтовкой руки держат оружие
    if (!aiming) armR.rotation.x = swing * 0.55;
    body.rotation.z = Math.sin(t) * 0.04 * amp; // легкое покачивание корпуса
    body.rotation.y = poseYaw + Math.cos(t) * 0.06 * amp;
    hips.position.y = Math.abs(Math.cos(t)) * 0.04 * amp; // «подпрыгивание» шага
  };

  // Позы «толкает машину». Корпус (body) вращается вокруг своей точки y = 0, а бедра на высоте
  // 0,95, поэтому к наклону добавляем сдвиг, чтобы поворот шел именно вокруг бедер.
  // Наклон вперед — отрицательный угол.
  //   'rear' — сзади: корпус сильно наклонен, обе руки упираются в багажник
  //   'side' — водитель сбоку у открытой двери: корпус развернут к машине, одна рука (правая,
  //            ближняя к машине) тянется внутрь и держит руль, другая упирается в стойку двери
  const PUSH_POSES = {
    rear: { tilt: -0.75, yaw: 0, armL: [0.9 + 0.75, 0], armR: [0.9 + 0.75, 0], legBase: -0.35 },
    side: { tilt: -0.4, yaw: -0.5, armL: [1.2, 0.25], armR: [1.05, 0.1], legBase: -0.12 },
  };
  let pushPose = null;
  root.setPush = function (mode) {
    if (mode === true) mode = 'rear'; // совместимость: setPush(true)
    pushPose = mode ? PUSH_POSES[mode] : null;
    pushing = !!pushPose;
    const p = pushPose || { tilt: -o.stoop, yaw: 0, armL: [0, 0], armR: [0, 0], legBase: 0 };
    const hipY = 0.95;
    body.rotation.x = p.tilt;
    body.rotation.y = p.yaw;
    body.position.set(0, hipY * (1 - Math.cos(p.tilt)), -hipY * Math.sin(p.tilt));
    armL.rotation.set(p.armL[0], 0, p.armL[1]);
    armR.rotation.set(p.armR[0], 0, p.armR[1]);
    legL.rotation.x = legR.rotation.x = p.legBase;
    if (!pushing) {
      body.rotation.z = 0;
      hips.position.y = 0;
    }
  };

  // Направить руку (pivot в плече) кистью в точку p корпуса: рука смотрит вниз (-Y), поворот X — вперед,
  // Z — вбок. Кисть на длине ~0,69 от плеча; если точка дальше, рука чуть вытягивается (до ×1,3)
  function pointArm(arm, inner, p) {
    const dx = p[0] - arm.position.x;
    const dy = p[1] - arm.position.y;
    const dz = p[2] - arm.position.z;
    const len = Math.hypot(dx, dy, dz);
    arm.rotation.set(Math.atan2(-dz, -dy), 0, Math.asin(dx / len));
    inner.rotation.z = 0;
    inner.scale.y = Math.min(1.3, Math.max(1, len / 0.69));
  }
  // Винтовка — как у солдата с автоматом: корпус развернут левым плечом вперед (RIFLE_YAW), приклад упирается
  // в правое плечо, правая кисть на рукояти со спуском, левая далеко впереди держит ствол снизу. Точки — в
  // осях героя (стоит, смотрит в -Z); в оси корпуса их переводит toBody. Хват на модели: рукоять — 0,45
  // от торца приклада, цевье — 0,7 (src/models/weapons.js)
  const RIFLE_YAW = -0.45;
  const RIFLE_AT = [0.24, 1.44, -0.02];
  const RIFLE_GRIP_R = [0.24, 1.3, -0.47];
  const RIFLE_GRIP_L = [0.22, 1.33, -0.72];
  const toBody = ([x, y, z]) => [
    x * Math.cos(-RIFLE_YAW) + z * Math.sin(-RIFLE_YAW),
    y,
    -x * Math.sin(-RIFLE_YAW) + z * Math.cos(-RIFLE_YAW),
  ];
  let poseYaw = 0; // базовый поворот корпуса (с винтовкой — RIFLE_YAW), шаг качает вокруг него

  // Позы «целится»: on = true ('hand') — правая рука вытянута вперед на уровне плеча (держит оружие),
  // левая шагает как обычно; 'rifle' — винтовка двумя руками; false — опустить
  root.setAim = function (on) {
    aiming = on === true ? 'hand' : on;
    poseYaw = aiming === 'rifle' ? RIFLE_YAW : 0;
    body.rotation.y = poseYaw;
    if (aiming === 'rifle') {
      pointArm(armR, R.inner, toBody(RIFLE_GRIP_R));
      pointArm(armL, L.inner, toBody(RIFLE_GRIP_L));
      return;
    }
    R.inner.scale.y = L.inner.scale.y = 1;
    armR.rotation.set(aiming ? 1.5 : 0, 0, 0);
    armL.rotation.set(0, 0, 0);
    R.inner.rotation.z = aiming ? 0 : 0.28;
    L.inner.rotation.z = -0.28;
  };

  // Поза «сидит»: таз опускается на высоту сиденья, ноги вытянуты вперед, руки на коленях
  root.setSit = function (on) {
    sitting = on;
    hips.position.y = on ? -0.45 : 0;
    legL.rotation.x = legR.rotation.x = on ? 1.45 : 0;
    armL.rotation.x = armR.rotation.x = on ? 0.9 : 0;
    body.rotation.z = 0;
    body.rotation.y = 0;
  };

  // Надетые вещи (браслет на запястье и т.п.): attach('wristL' | 'wristR', obj) — вещь качается вместе с рукой.
  // Запястье — чуть выше кисти (кисть на y = −0,69 в группе руки). Снять: obj.parent.remove(obj)
  // handR — в кулак: вещь повернута так, что ее -Z смотрит вдоль руки (из кулака), а +Y — от груди вверх
  // при вытянутой вперед руке
  // rifle — к корпусу: начало координат вещи — приклад у правого плеча, -Z — ствол вперед
  const WEAR_SLOTS = { wristL: [L.inner, -0.56, 0], wristR: [R.inner, -0.56, 0], handR: [R.inner, -0.7, -Math.PI / 2] };
  root.attach = function (slot, obj) {
    root.userData.rig.attached.push([slot, obj]);
    if (slot === 'rifle') {
      obj.position.fromArray(toBody(RIFLE_AT));
      obj.rotation.y = -RIFLE_YAW; // корпус развернут, а ствол смотрит прямо вперед
      body.add(obj);
      return obj;
    }
    const [arm, y, rx] = WEAR_SLOTS[slot];
    obj.position.set(0, y, 0);
    obj.rotation.x = rx;
    arm.add(obj);
    return obj;
  };

  root.setPush(false); // применить сутулость (stoop)
  // Для готовой 3D-модели из файла (person-models.js): что прятать и что перевешивать на кости
  root.userData.rig = { hips, attached: [] };
  return root;
}

// Готовые наборы людей. createPerson(тип, опции): опции перекрывают набор.
// Персонажи сюжета нарисованы по листу docs/art/characters.png (номер карточки в комментарии).
const PERSON_PRESETS = {
  // 1. Максим, главный герой: черная футболка, синие джинсы, красная кепка, черные ботинки
  maxim: {
    tshirt: true, shirtColor: 0x1c1c1e, pantsColor: 0x3d5f8e, hat: 'cap', hatColor: 0xc8463c,
    hairColor: 0x2a1c12, skinColor: 0xd9a27a,
  },
  // 2. Денис, полицейский
  denis: {
    shirtColor: 0x2a3d66, pantsColor: 0x1e2a48, hat: 'police', hatColor: 0x23305a, badge: true,
    belt: 0x2a2a2a, hairColor: 0x3a2a1a, skinColor: 0xe0b48a, buttons: true, pockets: true,
  },
  // 3. Анна Петровна, бабушка Веры: седой пучок, коричневая кофта с меховым воротником, длинная юбка
  anna: {
    gender: 'female', hair: 'bun', hairColor: 0xbdbdb8, jacket: 0x9a5c32, shirtColor: 0x9a5c32,
    collar: 0xd8c8a8, buttons: true, skirt: 'long', dressColor: 0x45464c, shoeColor: 0x7a6656, skinColor: 0xe0b48a, stoop: 0.08,
  },
  // 4. Вера: белый халат, голубая рубашка, джинсы, белые кроссовки, каштановый хвост
  vera: {
    gender: 'female', dress: false, hair: 'ponytail', hairColor: 0x7a3e24, coat: true, coatColor: 0xeeeeea,
    shirtColor: 0xa9cbe0, pantsColor: 0x3d5f8e, sneakers: true, sneakerColor: 0xeeeeea,
    sneakerStripeColor: 0xb8c4cc, skinColor: 0xe8b890,
  },
  // 5. Виктор Штерн: белый халат, черная водолазка, круглые очки, седина
  stern: {
    coat: true, coatColor: 0xeeeeea, shirtColor: 0x1c1c20, pantsColor: 0x2a2c34, glasses: true,
    hairColor: 0xb8b8b4, skinColor: 0xd9a888,
  },
  // 6. Барон: светлый костюм, жилет, красный галстук, седая бородка
  baron: {
    jacket: 0xeee8d8, shirtColor: 0xc8bea8, pantsColor: 0xdcd4c0, tie: true, tieColor: 0x8a1e22,
    hairColor: 0x8a8a86, beard: true, skinColor: 0xd9a27a,
  },
  // 7. Людмила Сергеевна: бордовый жакет, черная юбка, рыжее каре, папка с бумагами
  lyudmila: {
    gender: 'female', hair: 'bob', hairColor: 0xa04a2a, shirtColor: 0x7a2a3e, jacket: 0x7a2a3e,
    nametag: true, skirt: 'knee', dressColor: 0x24262e, holding: 'clipboard', skinColor: 0xe8b890,
  },
  // 8. Семён Аркадьевич: лысина, очки, седая борода, коричневый пиджак, книга
  semyon: {
    hair: 'bald', hairColor: 0xd0d0cc, glasses: true, beard: true, jacket: 0x7a5236, shirtColor: 0xc8a878,
    pantsColor: 0x6a6c70, holding: 'book', skinColor: 0xe0b48a,
  },
  // 9. Олег Борисович: голубая рубашка, телефон и часы, щетина
  oleg: {
    shirtColor: 0x9cbcd8, pantsColor: 0x34384a, belt: 0x2a2a2a, hairColor: 0x2a2a30, beard: true,
    beardColor: 0x5a4a40, holding: 'phone', watch: true, buttons: true, pockets: true, skinColor: 0xd9a27a,
  },
  // 10. Михалыч, кузнец: лысина, усы, кожаный фартук, перчатки, рабочие ботинки
  mihalych: {
    hair: 'bald', hairColor: 0xb8b8b4, mustache: true, shirtColor: 0x34363c, apron: 0x8a5a36,
    gloves: 0x9a7a52, pantsColor: 0x30323a, shoeColor: 0x5a4636, skinColor: 0xd9a27a,
  },
  // 11. Рустам, автомеханик: майка, оранжевые рабочие штаны, борода
  rustam: {
    sleeveless: true, shirtColor: 0x7a7c80, pantsColor: 0xd8742a, hairColor: 0x1c1c1e, beard: true,
    shoeColor: 0x5a4636, skinColor: 0xb87a50,
  },
  // 12. Николай Палыч, начальник заправки: красная куртка, белый шарф, седые усы
  nikolay: {
    jacket: 0xb8403a, shirtColor: 0xb8403a, scarf: 0xeeeae2, nametag: true, pantsColor: 0x2c3040,
    hairColor: 0xc0c0bc, mustache: true, skinColor: 0xd9a27a,
  },
  // 13. Павел Андреевич Громов: темное пальто, синий костюм, серый галстук, седина
  gromov: {
    coat: true, coatColor: 0x262a36, shirtColor: 0x2a3a6a, pantsColor: 0x24305a, tie: true, tieColor: 0x9a9ca0,
    hairColor: 0xc8c8c4, skinColor: 0xe0b48a,
  },
  // 14. Вспышка (сверхскорость): желтый спортивный костюм с черными полосами
  flash: {
    stripes: 0x1c1c1e, shirtColor: 0xe8c43a, pantsColor: 0x24262c, hair: 'spiky', hairColor: 0x7a4a24,
    sneakers: true, sneakerColor: 0xe8c43a, sneakerStripeColor: 0x1c1c1e, skinColor: 0xd9a27a,
  },
  // 15. Эхо (копии-иллюзии): серая толстовка с капюшоном
  echo: {
    hoodie: true, hood: true, shirtColor: 0x7a7c82, pantsColor: 0x45474e, hairColor: 0x1c1c1e, skinColor: 0xe0b48a,
  },
  // 16. Тень (невидимость): черный костюм и маска
  shadow: {
    shirtColor: 0x2a2c32, pantsColor: 0x24262c, mask: 0x2a2c32, gloves: 0x1c1c20, skinColor: 0xd9a27a,
  },
  // 17. Сокол (летает): кожаная куртка, шарф, очки-консервы, механические крылья
  falcon: {
    jacket: 0x6a4630, shirtColor: 0x6a4630, scarf: 0xc8bca0, goggles: true, wings: 0x707a84,
    pantsColor: 0x4e5a48, hairColor: 0x7a4a24, skinColor: 0xd9a27a,
  },
  // 18. Магнит (притягивает железо): красная рубашка, механические перчатки
  magnet: {
    shirtColor: 0xb04a32, pantsColor: 0x3c3e44, gauntlets: true, buttons: true, pockets: true, hairColor: 0x2a2a2e, skinColor: 0xb87a50,
  },
  // 19. Туча (погода): длинный серо-голубой плащ, синие торчащие волосы
  cloud: {
    coat: true, coatColor: 0x9aa6b4, shirtColor: 0x7a8696, tie: true, tieColor: 0x4a5a70, pantsColor: 0x5a6a80,
    belt: 0x4a5464, hair: 'spiky', hairColor: 0x5a8ab0, skinColor: 0xe8c0a0,
  },
  // 20. Искра (электроника): темный костюм со светящимися голубыми линиями
  spark: {
    shirtColor: 0x1e2a3a, pantsColor: 0x1e2636, neon: 0x3ad8ff, hairColor: 0x1c1c1e, skinColor: 0xc8946a,
  },

  // Прохожие и типы
  coat: { coat: true, coatColor: 0x9a8058, hat: 'fedora', hatColor: 0x4a3c2a, tie: true, shirtColor: 0xf2f0e8, pantsColor: 0x3a3428, shoeColor: 0x2a1a10 },
  police: { buttons: true, pockets: true, shirtColor: 0x2a3d66, pantsColor: 0x1e2a48, hat: 'police', hatColor: 0x23305a, badge: true, belt: 0x2a2a2a, dress: false },
  elder: { hairColor: 0xc8c8c0, cane: true, stoop: 0.18 },
  child: { scale: 0.68 },
  casual: {},
  office: { tie: true, bag: 'tote', bagColor: 0x2a2a2a },
  student: { bag: 'backpack' },
  worker: { hat: 'cap', shirtColor: 0xe58a2f, pantsColor: 0x3a4a6a },
};
PERSON_PRESETS.geek = PERSON_PRESETS.maxim; // старое имя набора игрока

function createPerson(type, options = {}) {
  const man = createWalkingMan(Object.assign({}, PERSON_PRESETS[type] || {}, options));
  // Если для набора есть готовая 3D-модель (src/models/person-models.js), она заменит человечка
  if (typeof attachPersonModel === 'function') attachPersonModel(man, type === 'geek' ? 'maxim' : type);
  return man;
}
