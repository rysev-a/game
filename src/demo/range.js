// src/demo/range.js
// ДЕМО: ТИР (docs/mechanics/weapons.md). Восточнее стола предметов — стойка со всем оружием из WEAPONS
// (E или клик — взять; взятое со стойки исчезает), линия огня и манекены: обычный, бронированный и
// движущийся. Манекены — обычные цели боевой платформы (addCombatTarget, src/engine/combat.js):
// полоска здоровья, цифры урона; упавший манекен через пару секунд встает, а не тронутый 4 секунды —
// восстанавливает здоровье. Подключается после src/demo/demo.js.

{
  // Тир стоит восточнее стола предметов и подставки приборов, стреляют на восток (+X)
  const rackX = 70;
  const rangeZ = 38;
  const ids = Object.keys(WEAPONS);
  const step = 3;
  const z0 = rangeZ - ((ids.length - 1) * step) / 2;
  const rackLen = Math.max(4, ids.length * step + 1);
  const rack = boxWithEdges(1.2, 1.0, rackLen, 0x3a3f4a);
  rack.position.set(rackX, 0.5, rangeZ);
  cityGroup.add(rack);
  addObstacle({ x: rackX, z: rangeZ, hx: 0.6, hz: rackLen / 2 });
  mapObjects.push({ x: rackX, z: rangeZ, hx: 0.6, hz: rackLen / 2, color: '#3a3f4a' });
  demoLabel('ТИР — возьмите оружие (E), Q — достать, ЛКМ — огонь', rackX, 3.6, rangeZ, { size: 1.2, color: '#ff9aa4' });

  const onRack = []; // { id, mesh, label }
  ids.forEach((id, i) => {
    const w = WEAPONS[id];
    const z = z0 + i * step;
    // Модель оружия лежит на стойке стволом к мишеням, крупнее, чем в руке
    const mesh = new THREE.Group();
    const model = w.model ? w.model() : createItemModel(id, 0.9);
    model.rotation.y = -Math.PI / 2;
    model.scale.setScalar(2.2);
    mesh.add(model);
    mesh.position.set(rackX, 1.15, z);
    cityGroup.add(mesh);
    const label = demoLabel(w.name, rackX, 2.3, z, { size: 0.85 });
    onRack.push({ id, mesh, label });
    // Взятое оружие со стойки исчезает (как вещи со стола); выбросили из инвентаря — снова на стойке
    const take = () => {
      if (hasItem(id)) return;
      if (addItem(id)) setTimeout(() => showToast(w.name + ': Q — достать, ЛКМ — огонь', 4000), 1200);
      else showToast('Инвентарь полон');
    };
    addInteractable({
      priority: 2,
      near: () => !drivingCar && !insideBuilding() && !hasItem(id) && Math.hypot(playerWorldX - rackX, playerWorldZ - z) < 2.4,
      prompt: () => 'E — взять: ' + w.name,
      act: take,
    });
    addPickable({ mesh, canPick: () => !drivingCar && !insideBuilding() && !hasItem(id), pick: take });
  });
  rack.onBeforeRender = () => {
    for (const t of onRack) t.mesh.visible = t.label.visible = !hasItem(t.id);
  };

  // Линия огня: полоса на земле, дальше — манекены
  flatRect(0.4, 40, 0xe8e2d0, 0.02, rackX + 4, rangeZ);
  const dummyX = rackX + 26;
  flatRect(10, 44, 0x6b5a3a, 0.012, dummyX, rangeZ); // утоптанная площадка под манекенами

  const DUMMIES = [
    { z: rangeZ - 12, name: 'Манекен', note: 'обычный' },
    { z: rangeZ, name: 'Бронированный', note: 'энергия — ×0,25', armor: true, weak: { energy: 0.25 } },
    { z: rangeZ + 12, name: 'Движущийся', note: 'ходит туда-сюда', move: 6 },
  ];
  for (const d of DUMMIES) {
    const mesh = createTrainingDummy({ armor: d.armor });
    mesh.position.set(dummyX, 0, d.z);
    mesh.rotation.y = Math.PI / 2; // лицом к линии огня (на запад)
    const pivot = new THREE.Group(); // наклон при попадании и падении — назад, от стрелка
    pivot.add(mesh);
    mesh.position.set(0, 0, 0);
    pivot.position.set(dummyX, 0, d.z);
    cityGroup.add(pivot);
    demoLabel(d.name + '\n' + d.note, dummyX, 5.3, d.z, { size: 0.75 });
    if (d.move) flatRect(0.3, d.move * 2 + 1.5, 0x444444, 0.02, dummyX, d.z); // рельс
    const shape = addObstacle({ x: dummyX, z: d.z, hx: 0.35, hz: 0.35 });
    let fall = 0; // 0 — стоит, 1 — лежит
    let downUntil = 0; // когда встанет (performance.now)
    let frame = 0;
    addCombatTarget({
      name: d.name,
      x: dummyX,
      z: d.z,
      r: 0.6,
      height: 2.5,
      hp: 120,
      weak: d.weak || {},
      mesh: pivot,
      onHit: () => {
        pivot.rotation.z = -0.12; // качнулся от попадания
      },
      onDeath: () => {
        downUntil = performance.now() + 2500;
        showToast(d.name + ' повержен — сейчас встанет');
      },
      update: (t) => {
        frame++;
        if (d.move && !t.dead) {
          t.z = d.z + Math.sin(frame / 70) * d.move;
          pivot.position.z = t.z;
          shape.z = t.z;
        }
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
        // Наклон вокруг оси Z: отрицательный — верх уходит на восток, от стрелка
        pivot.rotation.z += ((fall ? -fall * 1.45 : 0) - pivot.rotation.z) * (fall ? 1 : 0.15);
      },
    });
  }
}
