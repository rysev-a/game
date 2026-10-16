// src/models/person.js
// Процедурная low-poly модель идущего человека в стиле игры:
// плоские цвета + темные контуры по ребрам (как у зданий).
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
//
// Прохожие: gender 'female' добавляет платье и длинные волосы,
// hairColor включает прическу (без него человечек лысый, как игрок):
//   createWalkingMan({ gender: 'female', hairColor: 0x5a3a22, dressColor: 0xc4506a });
//
// Детали (все необязательны):
//   face: false        — без лица (по умолчанию глаза и брови спереди, видно, куда смотрит)
//   hat: 'fedora' | 'cap' | 'police' | 'beanie', hatColor
//   coat: true, coatColor — длинный плащ до колен (поверх рубашки, с воротником и поясом)
//   tie: true, tieColor   — белая рубашка и галстук спереди
//   tshirt: true         — футболка: короткий рукав, руки ниже открыты (цвет — shirtColor)
//   sweater: true, sweaterStripeColor — вязаный свитер (цвет — shirtColor): полосы на груди и рукавах,
//                         резинка по низу и на манжетах
//   sneakers: true, sneakerStripeColor — белые кроссовки с толстой подошвой и цветной полосой сбоку
//   glasses, beard (цвет бороды — hairColor), badge (жетон на груди)
//   bag: 'backpack' | 'tote', bagColor — рюкзак за спиной или сумка в левой руке
//   cane: true          — трость в правой руке; stoop: 0..0.3 — сутулость (наклон корпуса)
//   dress: false        — женщина без платья (в брюках)
//   scale: 0.7          — ребенок
// Готовые наборы: createPerson('geek' | 'coat' | 'police' | 'elder' | 'child' | ..., опции) ниже.
//
// Зависимость: глобальный THREE (three.js r128+).

function createWalkingMan(options = {}) {
  if (typeof THREE === 'undefined') {
    throw new Error('person.js требует глобальный THREE');
  }

  const o = Object.assign(
    {
      shirtColor: 0x3a7bd5,
      pantsColor: 0x2f2f2f,
      skinColor: 0xd9a066,
      shoeColor: 0x1a1a1a,
      edgeColor: 0x111111,
      gender: 'male', // 'male' | 'female'
      hairColor: null, // null — без прически
      dressColor: 0xc4506a, // платье (только для 'female')
      dress: true, // false — женщина в брюках
      face: true,
      hat: null, // 'fedora' | 'cap' | 'police' | 'beanie'
      hatColor: 0x3a3226,
      coat: false,
      coatColor: 0x8a7350,
      tie: false,
      tshirt: false,
      sweater: false,
      sweaterStripeColor: 0xd8d2c0,
      sneakers: false,
      sneakerStripeColor: 0xd23c3c,
      tieColor: 0x7a1f1f,
      glasses: false,
      beard: false,
      badge: false,
      bag: null, // 'backpack' | 'tote'
      bagColor: 0x5a4632,
      cane: false,
      stoop: 0,
      scale: 1,
    },
    options,
  );

  const female = o.gender === 'female';
  const dressed = female && o.dress;
  // У женщины в платье без своих брюк ноги открыты: цвет кожи
  if (dressed && !('pantsColor' in options)) o.pantsColor = o.skinColor;
  // В плаще рукава тоже плащевые
  const sleeveColor = o.coat ? o.coatColor : o.shirtColor;

  const edgeMat = new THREE.LineBasicMaterial({ color: o.edgeColor });

  // Бокс с четким контуром по ребрам — в одном стиле со зданиями
  function part(w, h, d, color) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    return mesh;
  }
  // Мелкая деталь без контура (глаза, пуговицы): у крошечных боксов контур съедает цвет
  function flat(w, h, d, color) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
  }

  const root = new THREE.Group();
  root.scale.setScalar(o.scale);
  const hips = new THREE.Group(); // качается вверх при ходьбе
  root.add(hips);

  // Нога: вращается группа-«бедро», бокс смещен вниз от точки вращения
  function makeLeg(sideX) {
    const leg = new THREE.Group();
    leg.position.set(sideX, 0.95, 0);
    const shin = part(0.22, 0.85, 0.22, o.pantsColor);
    shin.position.y = -0.425;
    leg.add(shin);
    const foot = part(0.24, 0.12, 0.34, o.sneakers ? 0xcfcac0 : o.shoeColor);
    foot.position.set(0, -0.79, -0.06); // носок вперед — модель смотрит в -Z
    leg.add(foot);
    if (o.sneakers) {
      // Кроссовок: толстая светлая подошва и цветная полоса по внешнему боку
      const sole = flat(0.26, 0.05, 0.36, 0x6a6660);
      sole.position.set(0, -0.86, -0.06);
      leg.add(sole);
      const stripe = flat(0.01, 0.05, 0.2, o.sneakerStripeColor);
      stripe.position.set(sideX > 0 ? 0.122 : -0.122, -0.78, -0.07);
      leg.add(stripe);
    }
    return leg;
  }
  const legL = makeLeg(-0.14);
  const legR = makeLeg(0.14);
  hips.add(legL);
  hips.add(legR);

  // Корпус с руками и головой
  const body = new THREE.Group();
  hips.add(body);

  const torso = part(0.62, 0.68, 0.3, o.coat ? o.coatColor : o.shirtColor);
  torso.position.y = 1.29;
  body.add(torso);

  // Перед корпуса — плоскость z = -0.15 (модель смотрит в -Z)
  const front = -0.155;
  if (o.sweater) {
    // Вязаный свитер: две полосы на груди, резинка по низу и под горлом
    const rib = Math.max(0, o.shirtColor - 0x141414);
    for (const y of [1.36, 1.46]) {
      const band = flat(0.63, 0.05, 0.31, o.sweaterStripeColor);
      band.position.y = y;
      body.add(band);
    }
    const hem = part(0.64, 0.08, 0.32, rib);
    hem.position.y = 0.98;
    body.add(hem);
    const collar = part(0.3, 0.05, 0.3, rib);
    collar.position.y = 1.645;
    body.add(collar);
  }
  if (o.tie) {
    const shirt = flat(o.coat ? 0.2 : 0.16, o.coat ? 0.5 : 0.3, 0.01, 0xf2f0e8);
    shirt.position.set(0, o.coat ? 1.38 : 1.48, front);
    body.add(shirt);
    const tie = flat(0.07, o.coat ? 0.42 : 0.28, 0.012, o.tieColor);
    tie.position.set(0, o.coat ? 1.37 : 1.47, front - 0.004);
    body.add(tie);
  }
  if (o.coat) {
    // Воротник-лацканы и пояс
    const collarMat = Math.max(0, o.coatColor - 0x181818);
    [-1, 1].forEach((s) => {
      const lapel = part(0.12, 0.3, 0.04, collarMat);
      lapel.position.set(s * 0.17, 1.5, front - 0.01);
      lapel.rotation.z = s * 0.25;
      body.add(lapel);
    });
    const belt = part(0.64, 0.07, 0.32, collarMat);
    belt.position.y = 1.05;
    body.add(belt);
  }
  if (o.badge) {
    const badge = flat(0.09, 0.11, 0.012, 0xe8c547);
    badge.position.set(-0.16, 1.45, front - 0.004);
    body.add(badge);
  }
  if (o.bag === 'backpack') {
    const pack = part(0.46, 0.52, 0.2, o.bagColor);
    pack.position.set(0, 1.3, 0.26);
    body.add(pack);
    [-0.17, 0.17].forEach((x) => {
      const strap = flat(0.06, 0.5, 0.01, o.bagColor);
      strap.position.set(x, 1.33, front - 0.004);
      body.add(strap);
    });
  }

  function makeArm(sideX) {
    const arm = new THREE.Group();
    arm.position.set(sideX, 1.55, 0);
    // В футболке короткий рукав, ниже — голая рука
    const limb = part(0.16, 0.62, 0.16, o.tshirt ? o.skinColor : sleeveColor);
    limb.position.y = -0.31;
    arm.add(limb);
    if (o.tshirt) {
      const sleeve = part(0.18, 0.24, 0.18, o.shirtColor);
      sleeve.position.y = -0.1;
      arm.add(sleeve);
    }
    const hand = part(0.17, 0.14, 0.17, o.skinColor);
    hand.position.y = -0.68;
    arm.add(hand);
    if (o.sweater) {
      const stripe = flat(0.17, 0.05, 0.17, o.sweaterStripeColor);
      stripe.position.y = -0.22;
      arm.add(stripe);
      const cuff = part(0.17, 0.07, 0.17, Math.max(0, o.shirtColor - 0x141414));
      cuff.position.y = -0.58;
      arm.add(cuff);
    }
    return arm;
  }
  const armL = makeArm(-0.39);
  const armR = makeArm(0.39);
  body.add(armL);
  body.add(armR);

  // Сумка в левой руке и трость в правой качаются вместе с руками
  if (o.bag === 'tote') {
    const tote = part(0.1, 0.32, 0.34, o.bagColor);
    tote.position.set(-0.06, -0.86, 0);
    armL.add(tote);
  }
  if (o.cane) {
    const cane = part(0.05, 0.95, 0.05, 0x4a3020);
    cane.position.set(0, -1.1, -0.06);
    armR.add(cane);
  }

  // Голова — низкополигональный шар (центр headY, радиус headR); волосы — шапочка из того же шара
  const headR = 0.175;
  const headY = 1.82;
  function ball(r, color, thetaLength = Math.PI) {
    const geo = new THREE.SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, thetaLength);
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  }
  const head = ball(headR, o.skinColor);
  head.position.y = headY;
  body.add(head);
  // Точка на лице: z передней поверхности шара на высоте y и смещении x (чуть снаружи)
  const faceZ = (x, y) => -Math.sqrt(Math.max(0, headR * headR - x * x - (y - headY) ** 2)) - 0.004;

  if (o.face) {
    [-0.07, 0.07].forEach((x) => {
      const eye = flat(0.05, 0.05, 0.01, 0x15151a);
      eye.position.set(x, 1.83, faceZ(x, 1.83));
      body.add(eye);
      const brow = flat(0.08, 0.02, 0.01, o.hairColor !== null ? o.hairColor : 0x5a4030);
      brow.position.set(x, 1.885, faceZ(x, 1.885));
      body.add(brow);
    });
    const mouth = flat(0.09, 0.02, 0.01, 0x7a3a2a);
    mouth.position.set(0, 1.74, faceZ(0, 1.74));
    body.add(mouth);
  }
  if (o.glasses) {
    const frame = flat(0.27, 0.07, 0.01, 0x202020);
    frame.position.set(0, 1.83, faceZ(0.07, 1.83) - 0.006);
    body.add(frame);
    [-0.07, 0.07].forEach((x) => {
      const lens = flat(0.08, 0.05, 0.01, 0x9fc4d8);
      lens.position.set(x, 1.83, faceZ(0.07, 1.83) - 0.012);
      body.add(lens);
    });
  }
  if (o.beard) {
    // Борода — нижняя половина шара чуть больше головы, сдвинутая вперед
    const beard = ball(headR + 0.012, o.hairColor !== null ? o.hairColor : 0x3a2a1a, Math.PI * 0.42);
    beard.rotation.x = Math.PI * 0.75; // «шапочка» перевернута вниз и вперед, к подбородку
    beard.position.set(0, headY - 0.01, -0.01);
    body.add(beard);
  }

  // Прическа: шапочка, сдвинутая к затылку (модель смотрит в -Z, затылок — в +Z). Под шляпой — только затылок
  if (o.hairColor !== null) {
    if (!o.hat) {
      const cap = ball(headR + 0.012, o.hairColor, Math.PI * 0.4);
      cap.rotation.x = 0.45; // макушка и затылок закрыты, лоб открыт
      cap.position.y = headY;
      body.add(cap);
    }
    if (female) {
      const back = part(0.32, 0.5, 0.1, o.hairColor);
      back.position.set(0, 1.72, 0.14);
      body.add(back);
    } else {
      const back = ball(headR + 0.01, o.hairColor, Math.PI * 0.35);
      back.rotation.x = 1.4; // затылок
      back.position.y = headY;
      body.add(back);
    }
  }

  // Головные уборы
  if (o.hat === 'fedora') {
    const brim = part(0.52, 0.04, 0.5, o.hatColor);
    brim.position.y = 1.98;
    body.add(brim);
    const crown = part(0.32, 0.17, 0.32, o.hatColor);
    crown.position.y = 2.08;
    body.add(crown);
    const band = flat(0.33, 0.04, 0.33, 0x15151a);
    band.position.y = 2.02;
    body.add(band);
  } else if (o.hat === 'cap') {
    // Кепка по форме головы: купол и козырек
    const crown = ball(headR + 0.02, o.hatColor, Math.PI * 0.42);
    crown.position.y = headY + 0.02;
    body.add(crown);
    const visor = part(0.26, 0.025, 0.16, o.hatColor);
    visor.position.set(0, headY + 0.08, -0.22);
    body.add(visor);
  } else if (o.hat === 'police') {
    const crown = part(0.38, 0.12, 0.38, o.hatColor);
    crown.position.y = 2.03;
    body.add(crown);
    const band = flat(0.335, 0.05, 0.335, 0x15151a);
    band.position.y = 1.98;
    body.add(band);
    const visor = part(0.3, 0.03, 0.14, 0x15151a);
    visor.position.set(0, 1.96, -0.22);
    body.add(visor);
    const cockade = flat(0.07, 0.06, 0.01, 0xe8c547);
    cockade.position.set(0, 2.03, -0.195);
    body.add(cockade);
  } else if (o.hat === 'beanie') {
    const beanie = ball(headR + 0.022, o.hatColor, Math.PI * 0.45);
    beanie.position.y = headY + 0.03;
    body.add(beanie);
  }

  // Платье: юбка поверх верха ног, не качается вместе с ними. Плащ — так же, но длиннее
  if (dressed) {
    const skirt = part(0.6, 0.42, 0.36, o.dressColor);
    skirt.position.y = 1.0;
    hips.add(skirt);
  }
  if (o.coat) {
    const tail = part(0.66, 0.5, 0.36, o.coatColor);
    tail.position.y = 0.78;
    hips.add(tail);
    const slit = flat(0.02, 0.5, 0.01, 0x15151a); // разрез плаща спереди
    slit.position.set(0, 0.78, -0.185);
    hips.add(slit);
  }

  // Цикл шага: t — фаза в радианах, полный шаг за 2*PI.
  // amp — амплитуда 0..1 (0 — стоит на месте), для плавного старта/остановки.
  // Положительный угол X поворачивает конечность вперед (в -Z)
  let sitting = false;
  let pushing = false;
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
    armL.rotation.x = -swing * 0.55;
    armR.rotation.x = swing * 0.55;
    body.rotation.z = Math.sin(t) * 0.04 * amp; // легкое покачивание корпуса
    body.rotation.y = Math.cos(t) * 0.06 * amp;
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

  // Поза «сидит»: таз опускается на высоту сиденья, ноги вытянуты вперед, руки на коленях
  root.setSit = function (on) {
    sitting = on;
    hips.position.y = on ? -0.45 : 0;
    legL.rotation.x = legR.rotation.x = on ? 1.45 : 0;
    armL.rotation.x = armR.rotation.x = on ? 0.9 : 0;
    body.rotation.z = 0;
    body.rotation.y = 0;
  };

  root.setPush(false); // применить сутулость (stoop)
  return root;
}

// Готовые наборы людей. createPerson(тип, опции): опции перекрывают набор.
//   'geek'      — игрок: черная футболка, синие джинсы, красная кепка, белые кроссовки
//   'coat'      — длинный плащ, шляпа, рубашка с галстуком (начальники, ученые)
//   'police'    — полицейский: синяя форма, фуражка, жетон
//   'elder'     — пожилой: седина, трость, сутулится
//   'child'     — ребенок (уменьшенная модель)
//   'casual', 'office', 'student', 'worker' — обычные прохожие
const PERSON_PRESETS = {
  geek: {
    tshirt: true, shirtColor: 0x1c1c1e, pantsColor: 0x34558a, hat: 'cap', hatColor: 0xb03030,
    sneakers: true, sneakerStripeColor: 0xd23c3c, hairColor: 0x2a1c12,
  },

  coat: { coat: true, coatColor: 0x9a8058, hat: 'fedora', hatColor: 0x4a3c2a, tie: true, pantsColor: 0x3a3428, shoeColor: 0x2a1a10 },
  police: { shirtColor: 0x2c4a7a, pantsColor: 0x1c2848, hat: 'police', hatColor: 0x1c2848, badge: true, dress: false },
  elder: { hairColor: 0xc8c8c0, cane: true, stoop: 0.18 },
  child: { scale: 0.68 },
  casual: {},
  office: { tie: true, bag: 'tote', bagColor: 0x2a2a2a },
  student: { bag: 'backpack' },
  worker: { hat: 'cap', shirtColor: 0xe58a2f, pantsColor: 0x3a4a6a },
};

function createPerson(type, options = {}) {
  return createWalkingMan(Object.assign({}, PERSON_PRESETS[type] || {}, options));
}
