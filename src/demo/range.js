// src/demo/range.js
// ДЕМО: ТИР (docs/mechanics/weapons.md). За подставкой приборов — стойка со всем оружием из WEAPONS
// (E или клик — взять, запас бесконечный), линия огня и манекены: обычный, бронированный и
// движущийся. Манекены — обычные цели боевой платформы (addCombatTarget, src/engine/combat.js):
// полоска здоровья, цифры урона; упавший манекен через пару секунд встает, а не тронутый 4 секунды —
// восстанавливает здоровье. Подключается после src/demo/demo.js.

{
  const rackZ = 50;
  const ids = Object.keys(WEAPONS);
  const step = 3;
  const x0 = -((ids.length - 1) * step) / 2;
  const rackW = Math.max(4, ids.length * step + 1);
  const rack = boxWithEdges(rackW, 1.0, 1.2, 0x3a3f4a);
  rack.position.set(0, 0.5, rackZ);
  cityGroup.add(rack);
  addObstacle({ x: 0, z: rackZ, hx: rackW / 2, hz: 0.6 });
  mapObjects.push({ x: 0, z: rackZ, hx: rackW / 2, hz: 0.6, color: '#3a3f4a' });
  demoLabel('ТИР — возьмите оружие (E), Q — достать, ЛКМ — огонь', 0, 3.6, rackZ, { size: 1.2, color: '#ff9aa4' });

  ids.forEach((id, i) => {
    const w = WEAPONS[id];
    const x = x0 + i * step;
    // Модель оружия лежит на стойке боком, крупнее, чем в руке
    const mesh = new THREE.Group();
    const model = w.model ? w.model() : createItemModel(id, 0.9);
    model.rotation.y = Math.PI / 2;
    model.scale.setScalar(2.2);
    mesh.add(model);
    mesh.position.set(x, 1.15, rackZ);
    cityGroup.add(mesh);
    demoLabel(w.name, x, 2.3, rackZ, { size: 0.85 });
    const take = () => {
      if (hasItem(id)) showToast('Уже в инвентаре: ' + w.name + '. Q — достать');
      else if (addItem(id)) setTimeout(() => showToast(w.name + ': Q — достать, ЛКМ — огонь', 4000), 1200);
      else showToast('Инвентарь полон');
    };
    addInteractable({
      priority: 2,
      near: () => !drivingCar && !insideBuilding() && Math.hypot(playerWorldX - x, playerWorldZ - rackZ) < 2.4,
      prompt: () => 'E — взять: ' + w.name,
      act: take,
    });
    addPickable({ mesh, canPick: () => !drivingCar && !insideBuilding(), pick: take });
  });

  // Линия огня: полоса на земле, дальше — манекены
  flatRect(40, 0.4, 0xe8e2d0, 0.02, 0, rackZ + 4);
  const dummyZ = rackZ + 24;
  flatRect(44, 10, 0x6b5a3a, 0.012, 0, dummyZ); // утоптанная площадка под манекенами

  const DUMMIES = [
    { x: -12, name: 'Манекен', note: 'обычный' },
    { x: 0, name: 'Бронированный', note: 'энергия — ×0,25', armor: true, weak: { energy: 0.25 } },
    { x: 12, name: 'Движущийся', note: 'ходит туда-сюда', move: 6 },
  ];
  for (const d of DUMMIES) {
    const mesh = createTrainingDummy({ armor: d.armor });
    mesh.position.set(d.x, 0, dummyZ);
    cityGroup.add(mesh);
    demoLabel(d.name + '\n' + d.note, d.x, 5.3, dummyZ, { size: 0.75 });
    if (d.move) flatRect(d.move * 2 + 1.5, 0.3, 0x444444, 0.02, d.x, dummyZ); // рельс
    const shape = addObstacle({ x: d.x, z: dummyZ, hx: 0.35, hz: 0.35 });
    let fall = 0; // 0 — стоит, 1 — лежит
    let downUntil = 0; // когда встанет (performance.now)
    let frame = 0;
    addCombatTarget({
      name: d.name,
      x: d.x,
      z: dummyZ,
      r: 0.6,
      height: 2.5,
      hp: 120,
      weak: d.weak || {},
      mesh,
      onHit: (t) => {
        mesh.rotation.x = -0.12; // качнулся от попадания
      },
      onDeath: () => {
        downUntil = performance.now() + 2500;
        showToast(d.name + ' повержен — сейчас встанет');
      },
      update: (t) => {
        frame++;
        if (d.move && !t.dead) {
          t.x = d.x + Math.sin(frame / 70) * d.move;
          mesh.position.x = t.x;
          shape.x = t.x;
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
        mesh.rotation.x += ((fall ? fall * 1.45 : 0) - mesh.rotation.x) * (fall ? 1 : 0.15);
      },
    });
  }
}
