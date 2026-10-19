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
//   man.attach('back', createBackpackModel()); // рюкзак за спиной
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
//   Для боссов: helmet: 0xe4e8ec, visor: 0xff7a2a — шлем со светящимся визором (вместо лица и прически);
//   pads, padMark — наплечники с метками; emblem, emblemShape: 'triangle' | 'hex' — светящийся знак на груди;
//   cape, capeOpacity, capeGlow — плащ (полупрозрачный — голограмма) со светящимися искрами;
//   jets — реактивные струи у пояса; antennas — антенны за головой; shoeTip — цветной носок ботинка;
//   gauntletColor, gauntletRing — цвет перчаток gauntlets и светящееся кольцо; bulk: 1.5 — массивнее (робот)
//   Телосложение: height: 1.2 — выше (тянется вся фигура, голова остается круглой), width: 0.8 — худее
//   или 1.2 — шире; belly: 0..1.3 — живот (толстяк), руки разводятся шире; head: 0.85 — размер головы
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
      helmet: null,
      visor: 0x3ad8ff,
      pads: null,
      padMark: null,
      emblem: null,
      emblemShape: 'triangle',
      cape: null,
      capeOpacity: 1,
      capeGlow: null,
      jets: null,
      antennas: null,
      shoeTip: null,
      gauntletColor: 0x8a9096,
      gauntletRing: null,
      bulk: 1,
      height: 1,
      width: 1,
      belly: 0,
      head: 1,
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
  // Шлем закрывает всю голову, как маска: без прически и лица, только светящийся визор
  if (o.helmet !== null) {
    o.mask = o.helmet;
    o.face = false;
  }
  const K = o.bulk; // массивность: во сколько раз шире корпус, руки и ноги (робот-громила)
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
  function glow(w, h, d, color = o.neon) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
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
  // Рост и ширина тянут всю фигуру; голову ниже растягиваем обратно, чтобы она осталась круглой
  root.scale.set(o.scale * o.width, o.scale * o.height, o.scale * o.width);
  const hips = new THREE.Group(); // качается вверх при ходьбе
  root.add(hips);

  // ---------- Ноги: вращается группа-«бедро», граненая нога сужается к щиколотке ----------
  const KL = K * (1 + 0.3 * o.belly); // у толстяка ноги толще и стоят шире
  function makeLeg(sideX) {
    const leg = new THREE.Group();
    leg.position.set(sideX, 0.95, 0);
    at(prism(0.13 * KL, 0.84, 0.15 * KL, o.pantsColor, 0.19 * KL, 0.2 * KL), 0, -0.42, 0, leg);
    // Ботинок или кроссовок: носок вперед
    if (o.sneakers) {
      at(part(0.15, 0.1, 0.28, o.sneakerColor, 0.13, 0.2), 0, -0.86, -0.05, leg);
      at(part(0.16, 0.035, 0.29, personShade(o.sneakerColor, 0.25)), 0, -0.925, -0.05, leg);
      at(part(0.01, 0.04, 0.16, o.sneakerStripeColor), sideX > 0 ? 0.078 : -0.078, -0.86, -0.06, leg);
    } else {
      at(part(0.16 * K, 0.12, 0.3 * K, o.shoeColor, 0.13 * K, 0.2 * K), 0, -0.88, -0.05, leg);
      if (o.shoeTip !== null) at(part(0.165 * K, 0.05, 0.08, o.shoeTip), 0, -0.9, -0.17 * K, leg);
    }
    if (o.stripes !== null) {
      const st = at(part(0.012, 0.8, 0.04, o.stripes), sideX > 0 ? 0.08 : -0.08, -0.42, 0, leg);
      st.rotation.z = sideX > 0 ? 0.03 : -0.03;
    }
    if (o.neon !== null) at(glow(0.014, 0.5, 0.03), sideX > 0 ? 0.085 : -0.085, -0.5, -0.02, leg);
    return leg;
  }
  const legL = makeLeg(-0.1 * KL);
  const legR = makeLeg(0.1 * KL);
  hips.add(legL);
  hips.add(legR);
  // Таз связывает ноги с корпусом
  at(prism(0.38 * KL, 0.14, 0.22 * KL, o.pantsColor, 0.4 * KL, 0.24 * KL), 0, 0.98, 0, hips);

  // ---------- Корпус с руками и головой ----------
  const body = new THREE.Group();
  hips.add(body);

  // Торс: грудь (пояс уже, грудь шире) и покатые плечи, сходящиеся к шее. Ребро спереди делит грудь
  // на светлую и темную половины, как на листе. Под пальто и пиджаком торс цвета верхней одежды
  const torsoColor = outer !== null ? outer : o.shirtColor;
  const waistW = (female ? 0.34 : 0.36) * K;
  const chestW = (female ? 0.42 : 0.46) * K;
  const chestY0 = 1.02;
  const chestY1 = 1.5;
  at(prism(waistW, chestY1 - chestY0, 0.24 * K, torsoColor, chestW, 0.28 * K), 0, (chestY0 + chestY1) / 2, 0, body);
  at(prism(chestW, 0.14, 0.28 * K, torsoColor, 0.24 * K, 0.2 * K), 0, chestY1 + 0.07, 0, body);
  const shoulder = chestW / 2; // где крепятся руки
  // Живот толстяка: граненый овал на поясе выпирает вперед и в стороны
  if (o.belly > 0) {
    const b = o.belly;
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), personMat(torsoColor));
    belly.scale.set(chestW / 2 + 0.05 * b, 0.3 + 0.06 * b, 0.16 * K + 0.16 * b);
    belly.rotation.y = Math.PI / 8;
    at(belly, 0, 1.16, -0.05 * b, body);
  }
  // Перед живота на высоте y (чуть снаружи граней): на нем лежат знаки, когда живот закрывает грудь
  const bellyFrontZ = (y) => {
    const b = o.belly;
    const t = (y - 1.16) / (0.3 + 0.06 * b);
    return -0.05 * b - (0.16 * K + 0.16 * b) * Math.sqrt(Math.max(0, 1 - t * t)) - 0.01;
  };
  const armSplay = 0.28 + 0.3 * o.belly; // руки разведены, у толстяка — шире, чтобы не тонули в животе
  // Шея
  at(prism(0.1 * K, 0.12, 0.1 * K, o.helmet !== null ? personShade(o.helmet, 0.25) : o.skinColor, 0.1 * K, 0.1 * K), 0, 1.68, 0, body);

  // Передняя поверхность груди: z на смещении x и высоте y, и наклон грани (детали лежат на ней)
  function chest(y) {
    const t = Math.min(1, Math.max(0, (y - chestY0) / (chestY1 - chestY0)));
    return { hw: (waistW + (chestW - waistW) * t) / 2, hd: ((0.24 + 0.04 * t) * K) / 2 };
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
  if (o.emblem !== null) {
    // Светящийся знак на груди: треугольник (Магнит) или шестиугольник (Гидра)
    const sides = o.emblemShape === 'hex' ? 6 : 3;
    const em = new THREE.Mesh(new THREE.CircleGeometry(0.06 * K, sides), new THREE.MeshBasicMaterial({ color: o.emblem, side: THREE.DoubleSide }));
    em.userData.noFlash = true;
    if (sides === 3) em.rotation.z = Math.PI / 2;
    if (o.belly > 0) at(em, 0, 1.2, bellyFrontZ(1.2), body);
    else at(em, 0, 1.4, frontZ(0, 1.4) - 0.012, body);
  }
  if (o.pads !== null) {
    // Наплечники брони, с метками
    [-1, 1].forEach((s) => {
      const pad = at(prism(0.2 * K, 0.12, 0.26 * K, o.pads, 0.14 * K, 0.2 * K), s * (chestW / 2 + 0.01), 1.6, 0, body);
      pad.rotation.z = -s * 0.35;
      if (o.padMark !== null) at(part(0.06 * K, 0.04, 0.012, o.padMark), s * (chestW / 2 + 0.03), 1.6, -0.13 * K, body);
    });
  }
  if (o.cape !== null) {
    // Плащ: два граненых полотнища от плеч до колен, за руками, расходятся книзу. Полупрозрачный — голограмма
    const capeMat =
      o.capeOpacity < 1
        ? new LitMaterial({ color: o.cape, transparent: true, opacity: o.capeOpacity, side: THREE.DoubleSide, depthWrite: false })
        : personMat(o.cape);
    [-1, 1].forEach((s) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.05, 0.02), capeMat);
      const pos = panel.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) pos.setX(i, pos.getX(i) * 1.7 + s * 0.12);
      panel.rotation.set(0.06, -s * 0.5, -s * 0.1);
      at(panel, s * (chestW / 2 + 0.02), 1.06, 0.08, body);
      if (o.capeGlow !== null) {
        // Светящиеся прожилки и искры по плащу
        at(glow(0.015, 0.4, 0.025, o.capeGlow), s * 0.06, 0.05, -0.012, panel);
        for (const [x, y] of [[0.14, -0.25], [-0.02, -0.38], [0.2, 0.1]]) at(glow(0.025, 0.025, 0.025, o.capeGlow), s * x, y, -0.012, panel);
      }
    });
  }
  if (o.jets !== null) {
    // Реактивные струи у пояса: светящиеся конусы вниз
    [-1, 1].forEach((s) => {
      const jet = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18, 5), new THREE.MeshBasicMaterial({ color: o.jets }));
      jet.userData.noFlash = true;
      jet.rotation.x = Math.PI;
      at(jet, s * (waistW / 2 + 0.06), 0.98, 0.1, body);
    });
  }
  if (o.wings !== null) {
    // Механические крылья: два граненых щита за плечами, разведены в стороны
    [-1, 1].forEach((s) => {
      const wing = new THREE.Group();
      wing.position.set(s * 0.16, 1.55, 0.16);
      wing.rotation.set(0.1, s * 0.3, s * 0.6); // нижний край крыла уходит в сторону
      at(prism(0.12, 0.95, 0.05, o.wings, 0.42, 0.04), s * 0.12, -0.42, 0, wing);
      at(part(0.06, 0.5, 0.02, o.padMark !== null ? o.padMark : personShade(o.wings, -0.4)), s * 0.2, -0.3, -0.03, wing);
      body.add(wing);
    });
  }

  // ---------- Руки: pivot в плече, внутри — рука чуть разведена в стороны (A-поза) ----------
  const handColor = o.gloves !== null ? o.gloves : o.skinColor;
  // Рука от плеча до кисти — 0,62, локоть на 0,34 от плеча. Рукав и голая рука — из двух частей:
  // плечо (в inner) и предплечье (в fore), сужаются от плеча к запястью (wTop/dTop — у плеча)
  const ELBOW = 0.34;
  function limb(w, h, d, color, wTop, dTop, inner, fore) {
    const k = ELBOW / h;
    const wE = wTop + (w - wTop) * k;
    const dE = dTop + (d - dTop) * k;
    at(prism(wE, ELBOW, dE, color, wTop, dTop), 0, -ELBOW / 2, 0, inner);
    at(prism(w, h - ELBOW, d, color, wE, dE), 0, -(ELBOW + h) / 2 + ELBOW, 0, fore);
  }
  function makeArm(side) {
    const arm = new THREE.Group();
    arm.position.set(side * (shoulder + 0.02 * K), 1.56, 0);
    const inner = new THREE.Group();
    inner.rotation.z = side * armSplay; // руки разведены, как на листе
    arm.add(inner);
    // Локоть: предплечье с кистью — отдельная группа fore, ее можно согнуть (setAim('rifle'))
    const fore = new THREE.Group();
    fore.position.y = -ELBOW;
    inner.add(fore);
    if (bareArms) {
      limb(0.09, 0.62, 0.1, o.skinColor, 0.12, 0.12, inner, fore);
      if (o.tshirt) at(prism(0.13, 0.22, 0.14, o.shirtColor, 0.15, 0.15), 0, -0.09, 0, inner);
    } else {
      limb(0.11 * K, 0.62, 0.12 * K, sleeveColor, 0.14 * K, 0.15 * K, inner, fore);
      at(prism(0.115, 0.05, 0.125, personShade(sleeveColor, 0.15)), 0, -0.6, 0, inner); // манжета
    }
    if (o.gauntlets) {
      const g = o.gauntletColor;
      at(prism(0.2 * K, 0.3, 0.2 * K, g, 0.16 * K, 0.16 * K, 8), 0, -0.6, 0, inner);
      at(prism(0.21 * K, 0.05, 0.21 * K, o.gauntletColor === 0x8a9096 ? 0xd88a2a : personShade(g, 0.3), 0.21 * K, 0.21 * K, 8), 0, -0.52, 0, inner);
      at(prism(0.17 * K, 0.16, 0.17 * K, personShade(g, 0.2), 0.18 * K, 0.18 * K, 8), 0, -0.8, 0, inner);
      if (o.gauntletRing !== null) {
        // Светящееся кольцо-магнит на тыльной стороне перчатки
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075 * K, 0.015, 6, 12), new THREE.MeshBasicMaterial({ color: o.gauntletRing }));
        ring.userData.noFlash = true;
        ring.rotation.y = Math.PI / 2;
        at(ring, side * 0.105 * K, -0.62, 0, inner);
      }
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
    // Всё, что ниже локтя (манжета, перчатка, кисть, полоски на предплечье), переезжает в предплечье
    for (const c of [...inner.children]) {
      if (c === fore || c.position.y > -ELBOW - 0.02) continue;
      inner.remove(c);
      c.position.y += ELBOW;
      fore.add(c);
    }
    return { arm, inner, fore };
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
  const headStart = body.children.length; // все, что добавлено отсюда до юбки, — голова и головные уборы
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

  if (o.helmet !== null) {
    // Шлем: светящийся визор во всю ширину лица, к краям чуть уже
    [-1, 1].forEach((s) => {
      const v = at(glow(0.13, 0.055, 0.012, o.visor), s * 0.06, headY + 0.01, faceZ(s * 0.06, headY + 0.01) - 0.006, body);
      v.rotation.y = s * 0.25;
    });
  } else if (o.mask !== null) {
    // Балаклава: открыта полоска глаз
    onFace(0.2, 0.05, o.skinColor, 0, headY + 0.01);
  }
  if (o.antennas !== null) {
    // Две антенны за головой (Туча ловит ими погоду)
    [-1, 1].forEach((s) => {
      const ant = at(part(0.025, 0.42, 0.025, o.antennas), s * 0.13, headY + 0.08, 0.16, body);
      ant.rotation.z = -s * 0.12;
    });
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
      onFace(0.055, 0.04, o.glassesLens !== undefined ? o.glassesLens : 0xbcd8e8, x, headY + 0.01, 0.01);
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

  // Голова в своей группе с опорой на шее: снимаем растяжение роста и ширины, задаем размер головы
  const head = new THREE.Group();
  head.position.y = 1.68;
  head.scale.set(o.head / o.width, o.head / o.height, o.head / o.width);
  body.children.slice(headStart).forEach((m) => {
    m.position.y -= head.position.y;
    head.add(m);
  });
  body.add(head);

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
  // Согнуть руку в локте так, чтобы кисть пришла в точку p корпуса (две кости: плечо ELBOW, предплечье до
  // кисти HAND_FORE). Локоть уходит вниз, наружу и назад (pole), как у стрелка, прижавшего приклад
  const HAND_FORE = 0.7 - ELBOW;
  const _v = new THREE.Vector3();
  const _m = new THREE.Matrix4();
  function bendArm(side, a, p, pole) {
    const S = new THREE.Vector3().copy(a.arm.position);
    const H = new THREE.Vector3(p[0], p[1], p[2]);
    const u = H.clone().sub(S);
    const d = Math.min(u.length(), ELBOW + HAND_FORE - 0.001);
    u.normalize();
    // Где локоть: на расстоянии x вдоль плеча-кисти и h в сторону pole
    const x = (ELBOW * ELBOW - HAND_FORE * HAND_FORE + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, ELBOW * ELBOW - x * x));
    const pv = new THREE.Vector3(pole[0], pole[1], pole[2]);
    pv.sub(u.clone().multiplyScalar(pv.dot(u))).normalize();
    const E = S.clone().add(u.clone().multiplyScalar(x)).add(pv.multiplyScalar(h));
    // Плечо — на локоть; предплечье — на кисть (в осях плеча)
    pointArm(a.arm, a.inner, [E.x, E.y, E.z]);
    a.inner.scale.y = 1;
    a.arm.updateMatrix();
    a.inner.updateMatrix();
    _m.multiplyMatrices(a.arm.matrix, a.inner.matrix).invert();
    _v.set(H.x, H.y, H.z).applyMatrix4(_m).sub(a.fore.position).normalize();
    a.fore.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), _v);
  }
  function straightArm(a) {
    a.fore.quaternion.identity();
  }

  // Винтовка — как у солдата с автоматом: корпус развернут левым плечом вперед (RIFLE_YAW), приклад упирается
  // в правое плечо, правая кисть на рукояти со спуском, левая далеко впереди держит ствол снизу. Точки — в
  // осях героя (стоит, смотрит в -Z); в оси корпуса их переводит toBody. Хват на модели: рукоять — 0,45
  // от торца приклада, цевье — 0,7 (src/models/weapons.js)
  const RIFLE_YAW = -0.45;
  const RIFLE_AT = [0.24, 1.34, 0.12];
  const RIFLE_GRIP_R = [0.24, 1.2, -0.33];
  const RIFLE_GRIP_L = [0.22, 1.25, -0.5];
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
      // Обе руки согнуты в локтях, как у стрелка на фото: правый локоть отведен в сторону и чуть вниз,
      // левый — под цевьем, смотрит вниз
      bendArm(1, R, toBody(RIFLE_GRIP_R), toBody([1, -0.35, 0.25]));
      bendArm(-1, L, toBody(RIFLE_GRIP_L), toBody([-0.35, -1, 0]));
      return;
    }
    straightArm(R);
    straightArm(L);
    R.inner.scale.y = L.inner.scale.y = 1;
    armR.rotation.set(aiming ? 1.5 : 0, 0, 0);
    armL.rotation.set(0, 0, 0);
    R.inner.rotation.z = aiming ? 0 : armSplay;
    L.inner.rotation.z = -armSplay;
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
  const WEAR_SLOTS = { wristL: [L.fore, -0.56 + ELBOW, 0], wristR: [R.fore, -0.56 + ELBOW, 0], handR: [R.fore, -0.7 + ELBOW, -Math.PI / 2] };
  root.attach = function (slot, obj) {
    root.userData.rig.attached.push([slot, obj]);
    if (slot === 'rifle') {
      obj.position.fromArray(toBody(RIFLE_AT));
      obj.rotation.y = -RIFLE_YAW; // корпус развернут, а ствол смотрит прямо вперед
      body.add(obj);
      return obj;
    }
    if (slot === 'back') {
      obj.position.set(0, 1.28, 0.2); // рюкзак на спине, лямки к лопаткам
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
  // 10. Михалыч, слесарь: лысина, усы, синий рабочий фартук, защитные очки на лбу, перчатки, рабочие ботинки
  mihalych: {
    hair: 'bald', hairColor: 0xb8b8b4, mustache: true, goggles: true, shirtColor: 0x34363c, apron: 0x2f4a6b,
    gloves: 0x8a8e94, pantsColor: 0x30323a, shoeColor: 0x5a4636, skinColor: 0xd9a27a,
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
  // Помощники Барона — по листу docs/art/bosses.png (номер — порядок на листе). У каждого свое телосложение
  // (рост, ширина, живот) и ядовито-яркие цвета на черном, чтобы издалека было видно: это враг
  // Б1. Вспышка (сверхскорость): худой и высокий бегун, кислотно-желтый костюм, красные полосы и визор
  flash: {
    height: 1.16, width: 0.8, head: 0.92,
    helmet: 0x16161a, visor: 0xff2a14, shirtColor: 0xd8f000, pantsColor: 0x16161a, stripes: 0xff2a14,
    shoeColor: 0x16161a, shoeTip: 0xd8f000, gloves: 0x16161a, belt: 0xff2a14, skinColor: 0xc8946a,
  },
  // Б2. Эхо (копии-иллюзии): маленький, кислотно-розовый, голографический бирюзовый плащ, бирюзовый визор
  echo: {
    scale: 0.8, width: 1.05, head: 1.12,
    helmet: 0x1a1020, visor: 0x1affe8, shirtColor: 0xff1aa8, pantsColor: 0x2a0a24, coat: true, coatColor: 0xe0148f,
    cape: 0x1affe8, capeOpacity: 0.45, capeGlow: 0xff7ae0, shoeColor: 0x1a1020, gloves: 0x1a1020, skinColor: 0xc8946a,
  },
  // Б3. Сокол (летает): высокий и поджарый, кроваво-красный летный костюм, черные крылья с желтым
  falcon: {
    height: 1.12, width: 0.84,
    shirtColor: 0xd0101e, pantsColor: 0x1a0a0c, hairColor: 0x16161a, goggles: true, wings: 0x1e1012,
    pads: 0x1e1012, padMark: 0xffd400, belt: 0xffd400, jets: 0xff7a1a, shoeColor: 0x16161a, skinColor: 0xd9a27a,
  },
  // Б4. Магнит (притягивает железо): широкий квадратный крепыш, багровый экзоскелет, синие кольца и знак
  magnet: {
    bulk: 1.4, width: 1.12, height: 0.94, head: 0.9,
    helmet: 0x16161a, visor: 0x2ad4ff, shirtColor: 0xa00c1a, pantsColor: 0x1a1a1e, pads: 0x16161a, padMark: 0x2ad4ff,
    emblem: 0x2ad4ff, emblemShape: 'triangle', gauntlets: true, gauntletColor: 0xa00c1a, gauntletRing: 0x2ad4ff,
    shoeColor: 0x16161a, skinColor: 0xc8946a,
  },
  // Б5. Тень (невидимость): самый высокий и тощий, маленькая голова, черный костюм, ядовито-фиолетовые искры
  shadow: {
    height: 1.26, width: 0.7, head: 0.82,
    helmet: 0x0e0e12, visor: 0xc02aff, shirtColor: 0x141018, pantsColor: 0x0e0e12, gloves: 0x0e0e12,
    cape: 0x5a0a9a, capeGlow: 0xd04aff, shoeColor: 0x0e0e12, skinColor: 0xc8946a,
  },
  // Б6. Туча (погода): очень толстый, грозово-фиолетовый плащ, бирюзовая рубашка на животе, белые волосы
  cloud: {
    belly: 1.1, bulk: 1.15, height: 0.94,
    coat: true, coatColor: 0x6a1ab8, shirtColor: 0x1affd0, pantsColor: 0x2a0a4a, hair: 'long', hairColor: 0xf0f4f8,
    antennas: 0x16161a, shoeColor: 0x16161a, shoeTip: 0x1affd0, watch: true, skinColor: 0xe0b48a,
  },
  // Б7. Искра (электроника): низкий и коренастый, кислотно-зеленая куртка, желтые светящиеся линии
  spark: {
    scale: 0.78, width: 1.12, head: 1.1,
    shirtColor: 0x141414, pantsColor: 0x141414, neon: 0xeaff00, goggles: true, hairColor: 0x39ff14, hair: 'spiky',
    jacket: 0x2ee01a, skinColor: 0xd9a27a,
  },
  // Б8. Шепот (гипноз голосом): худой и длинный, алый плащ, черный шарф, бледная кожа, белые волосы
  whisper: {
    height: 1.18, width: 0.76, head: 0.9,
    coat: true, coatColor: 0xd0142a, shirtColor: 0x16161a, pantsColor: 0x16161a, scarf: 0x0e0e12, hairColor: 0xf4f4f0,
    shoeColor: 0x0e0e12, skinColor: 0xe8dccc,
  },
  // Б9. Глыба (сверхсила и броня): огромный широкий и тучный робот, огненно-оранжевая броня, желтый визор
  block: {
    bulk: 1.6, scale: 1.2, width: 1.08, belly: 0.7, head: 0.8,
    helmet: 0x1e1e22, visor: 0xffe01a, shirtColor: 0xff4a0a, pantsColor: 0x2a2a30, pads: 0x1e1e22, padMark: 0xffe01a,
    gauntlets: true, gauntletColor: 0xff4a0a, belt: 0x1e1e22, shoeColor: 0x1e1e22, skinColor: 0x1e1e22,
  },
  // Б10. Гидра (регенерация): очень толстая туша, ядовито-зеленая наноброня, розовый светящийся шестиугольник
  hydra: {
    belly: 1.3, bulk: 1.3, width: 1.06, height: 0.9, head: 0.9,
    helmet: 0x0e3a12, visor: 0xff2a9a, shirtColor: 0x4aff2a, pantsColor: 0x0e3a12, emblem: 0xff2a9a, emblemShape: 'hex',
    neon: 0xff2a9a, gloves: 0x0e3a12, shoeColor: 0x0e2a10, skinColor: 0xc8946a,
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
// Человек в черном: черный костюм и галстук, черные очки (квест 1.03: у моста работают «странные люди»)
PERSON_PRESETS.mib = {
  jacket: 0x0b0b0d, shirtColor: 0x0b0b0d, pantsColor: 0x0b0b0d, tie: true, tieColor: 0x050505, glasses: true, glassesLens: 0x050505,
  hairColor: 0x141414, shoeColor: 0x050505, skinColor: 0xd9a888, buttons: true,
};
PERSON_PRESETS.geek = PERSON_PRESETS.maxim; // старое имя набора игрока

function createPerson(type, options = {}) {
  const man = createWalkingMan(Object.assign({}, PERSON_PRESETS[type] || {}, options));
  // Если для набора есть готовая 3D-модель (src/models/person-models.js), она заменит человечка
  if (typeof attachPersonModel === 'function') attachPersonModel(man, type === 'geek' ? 'maxim' : type);
  return man;
}
