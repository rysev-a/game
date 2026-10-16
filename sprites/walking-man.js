// sprites/walking-man.js
// Процедурная low-poly модель идущего человека в стиле игры:
// плоские цвета + темные контуры по ребрам (как у зданий).
//
// Подключение:
//   <script src="sprites/walking-man.js"></script>
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
// Зависимость: глобальный THREE (three.js r128+).

function createWalkingMan(options = {}) {
  if (typeof THREE === 'undefined') {
    throw new Error('walking-man.js требует глобальный THREE');
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
    },
    options,
  );

  const female = o.gender === 'female';
  // У женщины без своих брюк ноги открыты: цвет кожи
  if (female && !('pantsColor' in options)) o.pantsColor = o.skinColor;

  const edgeMat = new THREE.LineBasicMaterial({ color: o.edgeColor });

  // Бокс с четким контуром по ребрам — в одном стиле со зданиями
  function part(w, h, d, color) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    return mesh;
  }

  const root = new THREE.Group();
  const hips = new THREE.Group(); // качается вверх при ходьбе
  root.add(hips);

  // Нога: вращается группа-«бедро», бокс смещен вниз от точки вращения
  function makeLeg(sideX) {
    const leg = new THREE.Group();
    leg.position.set(sideX, 0.95, 0);
    const shin = part(0.22, 0.85, 0.22, o.pantsColor);
    shin.position.y = -0.425;
    leg.add(shin);
    const foot = part(0.24, 0.12, 0.34, o.shoeColor);
    foot.position.set(0, -0.79, -0.06); // носок вперед — модель смотрит в -Z
    leg.add(foot);
    return leg;
  }
  const legL = makeLeg(-0.14);
  const legR = makeLeg(0.14);
  hips.add(legL);
  hips.add(legR);

  // Корпус с руками и головой
  const body = new THREE.Group();
  hips.add(body);

  const torso = part(0.62, 0.68, 0.3, o.shirtColor);
  torso.position.y = 1.29;
  body.add(torso);

  function makeArm(sideX) {
    const arm = new THREE.Group();
    arm.position.set(sideX, 1.55, 0);
    const limb = part(0.16, 0.62, 0.16, o.shirtColor);
    limb.position.y = -0.31;
    arm.add(limb);
    const hand = part(0.17, 0.14, 0.17, o.skinColor);
    hand.position.y = -0.68;
    arm.add(hand);
    return arm;
  }
  const armL = makeArm(-0.39);
  const armR = makeArm(0.39);
  body.add(armL);
  body.add(armR);

  const head = part(0.3, 0.32, 0.3, o.skinColor);
  head.position.y = 1.81;
  body.add(head);

  // Прическа: шапка сверху и сзади (модель смотрит в -Z, затылок — в +Z)
  if (o.hairColor !== null) {
    const cap = part(0.32, 0.1, 0.32, o.hairColor);
    cap.position.y = 1.97;
    body.add(cap);
    const back = female ? part(0.34, 0.55, 0.1, o.hairColor) : part(0.32, 0.22, 0.06, o.hairColor);
    back.position.set(0, female ? 1.7 : 1.88, 0.17);
    body.add(back);
  }

  // Платье: юбка поверх верха ног, не качается вместе с ними
  if (female) {
    const skirt = part(0.6, 0.42, 0.36, o.dressColor);
    skirt.position.y = 1.0;
    hips.add(skirt);
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
    const p = pushPose || { tilt: 0, yaw: 0, armL: [0, 0], armR: [0, 0], legBase: 0 };
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

  return root;
}
