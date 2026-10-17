// src/demo/range.js
// ДЕМО: ТИР (docs/mechanics/weapons.md). В боевой зоне на востоке — стойка со всем оружием из WEAPONS
// (E или клик — взять; взятое со стойки исчезает), линия огня и мишени: манекены (обычный, бронированный,
// движущийся), тройка роботов (для разрядника) и ящики, которые двигают удары (для гаусса). Манекены — обычные цели боевой платформы (addCombatTarget, src/engine/combat.js):
// полоска здоровья (летящих цифр урона нет); упавший манекен через пару секунд встает, а не тронутый 4 секунды —
// восстанавливает здоровье. Подключается после src/demo/demo.js.

{
  // Тир стоит в боевой зоне, стреляют на восток (+X)
  const rackX = 70 + combatShift.x; // боевая зона на востоке (combatShift — src/demo/demo.js)
  const rangeZ = 38 + combatShift.z;
  const ids = Object.keys(WEAPONS);
  const step = 3;
  const z0 = rangeZ - ((ids.length - 1) * step) / 2;
  const rackLen = Math.max(4, ids.length * step + 1);
  const rack = boxWithEdges(1.2, 1.0, rackLen, 0x3a3f4a);
  rack.position.set(rackX, 0.5, rangeZ);
  cityGroup.add(rack);
  addHoverInfo(rack, { kind: 'ДЕМО', name: 'Тир: стойка с оружием', desc: 'E — взять оружие, Q — достать, R — сменить, ЛКМ — огонь по манекенам.' });
  addObstacle({ x: rackX, z: rangeZ, hx: 0.6, hz: rackLen / 2 });
  mapObjects.push({ x: rackX, z: rangeZ, hx: 0.6, hz: rackLen / 2, color: '#3a3f4a' });

  const onRack = []; // { id, mesh }
  ids.forEach((id, i) => {
    const w = WEAPONS[id];
    const z = z0 + i * step;
    // Модель оружия лежит на стойке, чуть крупнее, чем в руке
    const mesh = new THREE.Group();
    const model = w.model ? w.model() : createItemModel(id, 0.9);
    // Лежит вдоль стойки стволом на север, по центру своего места (начало модели — приклад)
    model.scale.setScalar(1.3);
    model.position.z = 1;
    mesh.add(model);
    mesh.position.set(rackX, 1.15, z);
    cityGroup.add(mesh);
    onRack.push({ id, mesh });
    // Взятое оружие со стойки исчезает (как вещи со стола); выбросили из инвентаря — снова на стойке
    const take = () => {
      if (hasItem(id)) return;
      if (addItem(id)) setTimeout(() => showToast(w.name + ': Q — достать, R — сменить, ЛКМ — огонь', 4000), 1200);
      else showToast('Инвентарь полон');
    };
    addInteractable({
      priority: 2,
      near: () => !drivingCar && !insideBuilding() && !hasItem(id) && Math.hypot(playerWorldX - rackX, playerWorldZ - z) < 2.4,
      prompt: () => 'E — взять: ' + w.name,
      act: take,
    });
    addPickable({ id, mesh, canPick: () => !drivingCar && !insideBuilding() && !hasItem(id), pick: take });
  });
  rack.onBeforeRender = () => {
    for (const t of onRack) t.mesh.visible = !hasItem(t.id);
  };

  // Линия огня: полоса на земле, дальше — манекены
  flatRect(0.4, 40, 0xe8e2d0, 0.02, rackX + 4, rangeZ);
  const dummyX = rackX + 26;
  flatRect(10, 44, 0x6b5a3a, 0.012, dummyX, rangeZ); // утоптанная площадка под манекенами

  const DUMMIES = [
    { x: dummyX, z: rangeZ - 12, name: 'Манекен', note: 'обычный' },
    { x: dummyX, z: rangeZ, name: 'Бронированный', note: 'энергия и кинетика — ×0,25, плазма прожигает броню', armor: true, weak: { energy: 0.25, kinetic: 0.25 } },
    { x: dummyX, z: rangeZ + 12, name: 'Движущийся', note: 'ходит туда-сюда — для тахионного пистолета', move: 6 },
    // Тройка роботов стоит плотно: на ней видно, как разряд перескакивает с цели на цель
    { x: dummyX - 4, z: rangeZ + 21, name: 'Робот-мишень', note: 'робот — ток и импульс ×2; огонь, плазма огнемета, пули и дробь не берут', robot: true, hp: 80 },
    { x: dummyX - 1, z: rangeZ + 24, name: 'Робот-мишень', note: 'робот — ток и импульс ×2; огонь, плазма огнемета, пули и дробь не берут', robot: true, hp: 80 },
    { x: dummyX - 4, z: rangeZ + 27, name: 'Робот-мишень', note: 'робот — ток и импульс ×2; огонь, плазма огнемета, пули и дробь не берут', robot: true, hp: 80 },
  ];
  flatRect(12, 12, 0x5a5048, 0.012, dummyX - 2.5, rangeZ + 24); // площадка роботов
  for (const d of DUMMIES) {
    const mesh = d.robot ? createRobotDummy() : createTrainingDummy({ armor: d.armor });
    mesh.rotation.y = Math.PI / 2; // лицом к линии огня (на запад)
    const pivot = new THREE.Group(); // наклон при попадании и падении — назад, от стрелка
    pivot.add(mesh);
    pivot.position.set(d.x, 0, d.z);
    cityGroup.add(pivot);
    if (d.move) flatRect(0.3, d.move * 2 + 1.5, 0x444444, 0.02, d.x, d.z); // рельс
    const shape = addObstacle({ x: d.x, z: d.z, hx: 0.35, hz: 0.35 });
    let fall = 0; // 0 — стоит, 1 — лежит
    let downUntil = 0; // когда встанет (performance.now)
    let frame = 0;
    addCombatTarget({
      name: d.name,
      desc: (d.robot ? 'Мишень для стрельбы: ' : 'Манекен для стрельбы: ') + d.note + '.',
      x: d.x,
      z: d.z,
      r: d.robot ? 0.5 : 0.6,
      height: d.robot ? 1.9 : 2.5,
      hp: d.hp || 120,
      kind: d.robot ? 'robot' : undefined, // роботы-мишени — вид robot (ENEMY_KINDS)
      weak: d.weak || {},
      mesh: pivot,
      onHit: () => {
        pivot.rotation.z = -0.12; // качнулся от попадания
      },
      onDeath: () => {
        downUntil = performance.now() + 2500;
      },
      update: (t) => {
        // Едет по рельсу, только пока может двигаться (не во льду, не под током, не сбит с шага)
        if (d.move && canMove(t)) {
          frame++;
          t.z = d.z + Math.sin(frame / 70) * d.move;
        }
        // Толчки и притяжение сдвигают с места, но манекен пружинит обратно (t.off)
        pivot.position.set(t.x + t.off.x, 0, t.z + t.off.z);
        shape.x = t.x + t.off.x;
        shape.z = t.z + t.off.z;
        // Упал — лежит, потом встает с полным здоровьем
        if (t.dead) {
          fall = Math.min(1, fall + 0.06);
          if (performance.now() > downUntil) reviveTarget(t);
        } else {
          fall = Math.max(0, fall - 0.04);
          // Не трогали 4 секунды — здоровье снова полное
          if (t.hp < t.maxHp && performance.now() - t.lastHit > 4000) reviveTarget(t);
        }
        if (t.hpBar) t.hpBar.visible = !t.dead && fall === 0;
        // Наклон вокруг оси Z: отрицательный — верх уходит на восток, от стрелка; сбитый с шага — дрожит
        const wobble = t.status.stagger > 0 ? Math.sin(t.status.stagger * 0.9) * 0.08 : 0;
        pivot.rotation.z += ((fall ? -fall * 1.45 : wobble) - pivot.rotation.z) * (fall ? 1 : 0.15);
      },
    });
  }

  // Ящики между манекенами: их толкают удары и стягивает к линии схлопнувшийся коридор гаусса
  for (const z of [rangeZ - 6, rangeZ - 3, rangeZ + 3, rangeZ + 6]) {
    const mesh = createRangeCrate();
    mesh.position.set(dummyX - 2, 0, z);
    cityGroup.add(mesh);
    addHoverInfo(mesh, { kind: 'ДЕМО', name: 'Ящик', desc: 'Пустой ящик. Его двигают удары и вакуумный коридор гаусс-пушки.' });
    addLooseObject({ mesh, x: dummyX - 2, z, r: 0.45 });
  }
}
