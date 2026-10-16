// src/demo/tutorial.js
// ДЕМО: ОБУЧЕНИЕ БОЮ (docs/mechanics/demo.md#обучение-бою). У линии огня вольера — пульт лаборатории.
// E у пульта — взять оружие шага: оно встает в ячейку и сразу в руки. Ворота лаборатории открываются,
// лампа мигает красным, и существа этого шага по одному выходят в вольер (не больше двух сразу).
// Побежденные растворяются. Вольер чист — пульт дает оружие следующего шага:
//   1. роботы — дуговой разрядник (ток и импульс берут роботов, огонь, плазма огнемета, пули и дробь — нет);
//   2. биосущества — плазменный огнемет (огонь берет живое, ток и импульс — нет);
//   3. все вместе — плазмомет, он поражает всех.
// После третьего шага обучение можно пройти заново. Виды и иммунитеты — ENEMY_KINDS (src/engine/combat.js),
// существа и лаборатория — src/demo/range-creatures.js. Подключается после него.

{
  const STAGES = [
    {
      weapon: 'arc_discharger',
      wave: ['drone', 'stilt', 'cain'],
      intro: 'Шаг 1 из 3 — роботы. Дуговой разрядник бьет их вдвое, импульсный лазер тоже. Огонь, плазма огнемета, пули и дробь роботов не берут.',
      done: 'Роботы побеждены! Подойдите к пульту за следующим оружием.',
    },
    {
      weapon: 'plasma_flamer',
      wave: ['hound', 'strider', 'hound'],
      intro: 'Шаг 2 из 3 — биосущества. Огонь жжет живую ткань вдвое, а ток и импульс по ней не проходят.',
      done: 'Биосущества побеждены! У пульта — последнее оружие.',
    },
    {
      weapon: 'plasma_gun',
      wave: ['drone', 'hound', 'stilt', 'strider', 'cain'],
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
    const st = STAGES[tut.stage];
    tut.fighting = false;
    tut.stage = (tut.stage + 1) % STAGES.length;
    showToast(st.done, 5000);
  };

  addInteractable({
    priority: 2,
    near: () => !drivingCar && !insideBuilding() && !tut.fighting && Math.hypot(playerWorldX - consoleX, playerWorldZ - consoleZ) < 2.6,
    prompt: () => {
      const st = STAGES[tut.stage];
      const name = WEAPONS[st.weapon].name;
      return tut.stage === 0 ? 'E — начать обучение бою: взять ' + name : 'E — шаг ' + (tut.stage + 1) + ' из 3: взять ' + name;
    },
    act: startStage,
  });

  // Раз в кадр: ворота, лампа, выход существ
  const clock = new THREE.Clock();
  demoUpdates.push(() => {
    const now = performance.now();
    const releasing = tut.fighting && tut.queue.length > 0;
    tut.door += ((releasing ? 1 : 0) - tut.door) * 0.05;
    penLab.userData.setDoor(tut.door);
    penLab.userData.setAlarm(releasing, clock.getElapsedTime());
    screenMat.color.setHex(tut.fighting ? 0xff5a3a : 0x5aff7a);
    if (releasing && tut.door > 0.9 && now >= tut.nextAt && tut.alive < maxAlive) {
      tut.alive++;
      spawnPenCreature(tut.queue.shift(), onGone);
      tut.nextAt = now + spawnEvery;
    }
  });
}
