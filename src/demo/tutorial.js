// src/demo/tutorial.js
// ДЕМО: ОБУЧЕНИЕ БОЮ (docs/mechanics/demo.md#обучение-бою). У линии огня вольера — пульт лаборатории.
// E у пульта — взять оружие шага: оно встает в ячейку и сразу в руки. Ворота лаборатории открываются,
// лампа мигает красным, и существа этого шага по одному выходят в вольер (не больше двух сразу).
// Побежденные растворяются. Вольер чист — пульт дает оружие следующего шага:
//   1. роботы — дуговой разрядник (ток и импульс берут роботов, огонь, плазма огнемета, пули и дробь — нет);
//   2. биосущества — плазменный огнемет (огонь берет живое, ток и импульс — нет);
//   3. все вместе — плазмомет, он поражает всех.
// После третьего шага обучение можно пройти заново.
// Рядом — красный пульт DANGER: E — существа и боссы (помощники Барона с оружием) идут из лаборатории
// один за другим без конца, всё чаще; каждый пятый — босс. Еще раз E или герой упал — поток стоп. Виды и иммунитеты — ENEMY_KINDS (src/engine/combat.js),
// существа и лаборатория — src/demo/range-creatures.js. Подключается после него.
//
//   startPenWave({ wave: ['hound', ...], intro, done }) — выпустить свою волну (испытание БТР, src/demo/race.js);
//                                                          шаг обучения при этом не меняется
//   penWaveRunning() — идет ли сейчас обучение или своя волна

let startPenWave = null;
let penWaveRunning = () => false;

{
  const STAGES = [
    {
      weapon: 'arc_discharger',
      wave: ['drone', 'crawler', 'stilt', 'cyborg', 'cain'],
      intro: 'Шаг 1 из 3 — роботы. Дуговой разрядник бьет их вдвое, импульсный лазер тоже. Огонь, плазма огнемета, пули и дробь роботов не берут.',
      done: 'Роботы побеждены! Подойдите к пульту за следующим оружием.',
    },
    {
      weapon: 'plasma_flamer',
      wave: ['hound', 'maw', 'strider', 'hound'],
      intro: 'Шаг 2 из 3 — биосущества. Огонь жжет живую ткань вдвое, а ток и импульс по ней не проходят.',
      done: 'Биосущества побеждены! У пульта — последнее оружие.',
    },
    {
      weapon: 'plasma_gun',
      wave: ['drone', 'hound', 'crawler', 'maw', 'stilt', 'cyborg', 'strider', 'cain'],
      intro: 'Шаг 3 из 3 — все вместе. Плазмомет поражает всех: и роботов, и биосуществ.',
      done: 'Обучение пройдено! У пульта его можно пройти заново.',
    },
  ];
  const maxAlive = 2;
  const spawnEvery = 3500; // мс между выходами из ворот

  // Пульт: тумба со светящимся экраном у северного конца линии огня вольера
  const consoleX = 76;
  const consoleZ = 76;
  const stand = boxWithEdges(1.2, 1.1, 0.8, 0x4a5058);
  stand.position.set(consoleX, 0.55, consoleZ);
  cityGroup.add(stand);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x5aff7a });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 0.06), screenMat);
  screen.position.set(0, 0.75, 0);
  screen.rotation.x = -0.5;
  stand.add(screen);
  addObstacle({ x: consoleX, z: consoleZ, hx: 0.6, hz: 0.4 });
  mapObjects.push({ x: consoleX, z: consoleZ, hx: 0.6, hz: 0.4, color: '#4a5058' });
  addHoverInfo(stand, {
    kind: 'ДЕМО',
    name: 'Пульт лаборатории',
    desc: 'Обучение бою: E — взять оружие шага, и из лаборатории выйдут существа, против которых оно работает. Три шага: роботы, биосущества, все вместе.',
  });

  const tut = {
    stage: 0, // какой шаг следующий (или идет)
    fighting: false,
    queue: [], // кто еще не вышел
    alive: 0,
    nextAt: 0, // когда выпустить следующего (performance.now)
    door: 0, // 0..1 — насколько открыты ворота
    custom: null, // своя волна вместо шага обучения
  };

  // Оружие шага: в ячейку оружия (если его нет — сначала в инвентарь) и сразу в руки
  const giveWeapon = (id) => {
    if (!hasItem(id) && inventory.items.length < inventory.size) inventory.items.push(id);
    if (!heroEquip.weapons.includes(id)) equipItem(id);
    if (heroEquip.weapons.includes(id) && heroWeapon.id !== id) drawWeapon(id);
    renderInventory();
    renderEquipHud();
  };

  const startStage = () => {
    const st = STAGES[tut.stage];
    giveWeapon(st.weapon);
    tut.fighting = true;
    tut.queue = st.wave.slice();
    tut.alive = 0;
    tut.nextAt = performance.now() + 2500;
    showToast(WEAPONS[st.weapon].name + ' в руках. ' + st.intro, 7000);
  };

  const onGone = () => {
    tut.alive--;
    if (tut.queue.length || tut.alive > 0) return;
    tut.fighting = false;
    if (tut.custom) {
      showToast(tut.custom.done, 5000);
      tut.custom = null;
      return;
    }
    const st = STAGES[tut.stage];
    tut.stage = (tut.stage + 1) % STAGES.length;
    showToast(st.done, 5000);
  };

  startPenWave = (st) => {
    if (tut.fighting || danger.on) return false;
    tut.custom = st;
    tut.fighting = true;
    tut.queue = st.wave.slice();
    tut.alive = 0;
    tut.nextAt = performance.now() + 1500;
    if (st.intro) showToast(st.intro, 6000);
    return true;
  };
  penWaveRunning = () => tut.fighting;

  addInteractable({
    priority: 2,
    near: () => !drivingCar && !insideBuilding() && !tut.fighting && !danger.on && Math.hypot(playerWorldX - consoleX, playerWorldZ - consoleZ) < 2.6,
    prompt: () => {
      const st = STAGES[tut.stage];
      const name = WEAPONS[st.weapon].name;
      return tut.stage === 0 ? 'E — начать обучение бою: взять ' + name : 'E — шаг ' + (tut.stage + 1) + ' из 3: взять ' + name;
    },
    act: startStage,
  });

  // Пульт DANGER: красная тумба рядом с пультом обучения. Существа и боссы идут без конца
  const dangerX = consoleX;
  const dangerZ = consoleZ + 6;
  const dStand = boxWithEdges(1.2, 1.1, 0.8, 0x5a2a2a);
  dStand.position.set(dangerX, 0.55, dangerZ);
  cityGroup.add(dStand);
  const dScreenMat = new THREE.MeshBasicMaterial({ color: 0xff3a2a });
  const dScreen = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 0.06), dScreenMat);
  dScreen.position.set(0, 0.75, 0);
  dScreen.rotation.x = -0.5;
  dStand.add(dScreen);
  // Желто-черная полоса опасности по низу тумбы
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.02), new LitMaterial({ color: i % 2 ? 0x1c1c1c : 0xf2c230 }));
    stripe.position.set(-0.45 + i * 0.3, -0.38, -0.41);
    dStand.add(stripe);
  }
  addObstacle({ x: dangerX, z: dangerZ, hx: 0.6, hz: 0.4 });
  mapObjects.push({ x: dangerX, z: dangerZ, hx: 0.6, hz: 0.4, color: '#a03a2a' });
  addHoverInfo(dStand, {
    kind: 'ДЕМО',
    name: 'Пульт DANGER',
    desc: 'E — из лаборатории без конца идут существа всех видов и боссы — помощники Барона с оружием: кто-то летает, кто-то бьет лазером. Чем дольше держитесь, тем чаще выходят. Еще раз E — остановить.',
  });

  const danger = { on: false, alive: 0, released: 0, beaten: 0, nextAt: 0 };
  const dangerMaxAlive = 6;
  const creatureIds = () => Object.keys(PEN_CREATURES).filter((id) => !PEN_CREATURES[id].boss);
  const bossIds = () => Object.keys(PEN_CREATURES).filter((id) => PEN_CREATURES[id].boss);
  const startDanger = () => {
    danger.on = true;
    danger.released = 0;
    danger.beaten = 0;
    danger.nextAt = performance.now() + 2000;
    giveWeapon('plasma_gun');
    showToast('DANGER! Из лаборатории идут существа и боссы — один за другим, всё чаще. Плазмомет в руках. Еще раз E у пульта — остановить.', 7000);
  };
  const stopDanger = (why) => {
    danger.on = false;
    showToast(why + ' Побеждено: ' + danger.beaten + '. Кто уже вышел — остается в вольере.', 6000);
  };
  const onDangerGone = () => {
    danger.alive--;
    danger.beaten++;
  };
  addInteractable({
    priority: 2,
    near: () => !drivingCar && !insideBuilding() && !tut.fighting && Math.hypot(playerWorldX - dangerX, playerWorldZ - dangerZ) < 2.6,
    prompt: () => (danger.on ? 'E — остановить DANGER (побеждено: ' + danger.beaten + ')' : 'E — DANGER: существа и боссы без конца'),
    act: () => (danger.on ? stopDanger('DANGER остановлен.') : startDanger()),
  });
  penWaveRunning = () => tut.fighting || danger.on;

  // Раз в кадр: ворота, лампа, выход существ
  const clock = new THREE.Clock();
  demoUpdates.push(() => {
    const now = performance.now();
    if (danger.on && now < heroDownUntil) stopDanger('Герой упал — DANGER остановлен.');
    const releasing = (tut.fighting && tut.queue.length > 0) || danger.on;
    tut.door += ((releasing ? 1 : 0) - tut.door) * 0.05;
    penLab.userData.setDoor(tut.door);
    penLab.userData.setAlarm(releasing, clock.getElapsedTime());
    screenMat.color.setHex(tut.fighting ? 0xff5a3a : 0x5aff7a);
    if (tut.fighting && tut.queue.length && tut.door > 0.9 && now >= tut.nextAt && tut.alive < maxAlive) {
      tut.alive++;
      spawnPenCreature(tut.queue.shift(), onGone);
      tut.nextAt = now + spawnEvery;
    }
    dScreenMat.color.setHex(danger.on && Math.sin(now / 120) > 0 ? 0xffd040 : 0xff3a2a);
    // DANGER: каждый пятый — босс; выходят всё чаще (от 4 до 1,5 секунды)
    if (danger.on && tut.door > 0.9 && now >= danger.nextAt && danger.alive < dangerMaxAlive) {
      const boss = danger.released % 5 === 4;
      danger.alive++;
      danger.released++;
      spawnPenCreature(pick(boss ? bossIds() : creatureIds()), onDangerGone);
      danger.nextAt = now + Math.max(1500, 4000 - danger.released * 100);
    }
  });
}
