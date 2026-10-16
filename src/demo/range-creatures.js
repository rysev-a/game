// src/demo/range-creatures.js
// ДЕМО: ВОЛЬЕР С СУЩЕСТВАМИ В ТИРЕ (docs/mechanics/weapons.md#демо-тир). Южнее роботов-мишеней —
// огороженная с трех сторон площадка, открытая к линии огня (на запад). В ней ходят пять существ из
// лаборатории (модели — src/models/creatures.js): каждое — обычная цель боевой платформы (addCombatTarget,
// src/engine/combat.js) со своим здоровьем и множителями урона, так что всё оружие тира по ним бьет,
// а лед, ток и шатание их останавливают. На героя они пока не нападают.
//
// Поведения: wander — бродит по случайным точкам вольера; patrol — ходит по своим точкам с остановками;
// hover — парит (дрон). Попали — существо оборачивается к герою (гончая — отбегает), упавшее через
// 3 секунды встает, не тронутое 5 секунд — восстанавливает здоровье. Подключается после src/demo/range.js.

{
  const penX = 101; // центр вольера
  const penZ = 87;
  const penHX = 16; // полуширина по X (на восток от линии огня)
  const penHZ = 13;
  flatRect(penHX * 2, penHZ * 2, 0x5a5a44, 0.012, penX, penZ); // вытоптанная земля
  flatRect(0.4, penHZ * 2, 0xe8e2d0, 0.02, penX - penHX - 6, penZ); // своя линия огня

  // Низкая ограда: север, юг и восток; запад открыт к стрелку
  const railColor = 0x6a6a5e;
  const rails = [
    { x: penX, z: penZ - penHZ, hx: penHX, hz: 0.12 },
    { x: penX, z: penZ + penHZ, hx: penHX, hz: 0.12 },
    { x: penX + penHX, z: penZ, hx: 0.12, hz: penHZ },
  ];
  for (const r of rails) {
    const rail = boxWithEdges(r.hx * 2, 0.12, r.hz * 2, railColor);
    rail.position.set(r.x, 0.9, r.z);
    cityGroup.add(rail);
    const n = Math.round(Math.max(r.hx, r.hz) / 2);
    for (let i = 0; i <= n; i++) {
      const k = i / n - 0.5;
      const post = boxWithEdges(0.2, 1.0, 0.2, 0x4a4a40);
      post.position.set(r.x + (r.hx > r.hz ? k * r.hx * 2 : 0), 0.5, r.z + (r.hz > r.hx ? k * r.hz * 2 : 0));
      cityGroup.add(post);
    }
    addHoverInfo(rail, { kind: 'ДЕМО', name: 'Вольер', desc: 'Существа из лаборатории. Стрелять с линии на западе.' });
    addObstacle(r);
    mapObjects.push({ ...r, color: '#6a6a5e' });
  }

  // Существа. speed — шаг за кадр; stride — сколько фазы шага на единицу пути; weak — множители урона
  const CREATURES = [
    {
      make: createChimericStriderModel,
      name: 'Химерный ходок',
      desc: 'Сшит из нескольких тварей: красное тело с клыками на четырех длинных ногах, сверху — мешок-яйцо. Живая ткань: огонь и плазма ×1,5, холод ×1,5 — быстро коченеет.',
      hp: 150, r: 0.9, height: 3.6, speed: 0.035, stride: 2.2,
      weak: { fire: 1.5, plasma: 1.5, cold: 1.5 },
      behavior: 'wander',
      at: [-6, -7],
    },
    {
      make: createCleanUpDroneModel,
      name: 'Дрон-уборщик',
      desc: 'Парящий дрон, выжигает следы опытов соплом. Электроника — ток ×2; гладкий купол держит пули и лазер (×0,6).',
      hp: 90, r: 0.95, height: 1.9, speed: 0.045, stride: 0,
      weak: { electric: 2, energy: 0.6, kinetic: 0.6 },
      behavior: 'hover',
      route: [[-8, 6], [-8, -6], [0, -6], [0, 6]],
    },
    {
      make: createCainModel,
      name: 'Проект «Каин-02»',
      desc: 'Тяжелый боевой робот: кулак и шестиствольный пулемет. Толстая броня — лазер и кинетика ×0,5, огнемет ее прожигает; через трещину у плеча ток бьет ×1,5.',
      hp: 400, r: 1.3, height: 4.2, speed: 0.02, stride: 2.4,
      weak: { energy: 0.5, kinetic: 0.5, shrapnel: 0.5, electric: 1.5 },
      behavior: 'patrol',
      route: [[6, -6], [6, 6]],
      wait: 180,
    },
    {
      make: createSporeHoundModel,
      name: 'Спорогончая',
      desc: 'Быстрая бледная гончая, на спине зреют горящие споры. Огонь ×2 — споры вспыхивают; от попадания отбегает.',
      hp: 70, r: 0.8, height: 1.7, speed: 0.08, stride: 4.5,
      weak: { fire: 2, plasma: 2 },
      behavior: 'wander',
      at: [2, 8],
      flee: true,
    },
    {
      make: createStiltVanguardModel,
      name: 'Ходульный авангард',
      desc: 'Высокий разведчик на ходулях: обходит периметр широким шагом. Электроника — ток ×2; тонкие ноги не держат удар — кинетика ×1,5.',
      hp: 180, r: 0.8, height: 4.9, speed: 0.04, stride: 1.6,
      weak: { electric: 2, kinetic: 1.5, energy: 0.75 },
      behavior: 'patrol',
      route: [[12, -10], [12, 10], [-2, 10], [-2, -10]],
      wait: 60,
    },
  ];

  const inPen = (x, z, r) => ({
    x: Math.max(penX - penHX + r + 1, Math.min(penX + penHX - r - 1, x)),
    z: Math.max(penZ - penHZ + r + 1, Math.min(penZ + penHZ - r - 1, z)),
  });
  const randomInPen = (r) => inPen(penX + rand(-penHX, penHX), penZ + rand(-penHZ, penHZ), r);
  const angleTo = (dx, dz) => Math.atan2(-dx, -dz); // поворот модели (смотрит в -Z) к направлению
  const turn = (from, to, k) => {
    let d = to - from;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return from + d * k;
  };
  const clock = new THREE.Clock();

  for (const c of CREATURES) {
    const model = c.make();
    const body = new THREE.Group(); // поворот и падение; полоска здоровья — на pivot, она не крутится
    body.add(model);
    const pivot = new THREE.Group();
    pivot.add(body);
    const route = (c.route || []).map(([x, z]) => ({ x: penX + x, z: penZ + z }));
    const start = route[0] || { x: penX + c.at[0], z: penZ + c.at[1] };
    pivot.position.set(start.x, 0, start.z);
    cityGroup.add(pivot);
    const shape = addObstacle({ x: start.x, z: start.z, hx: c.r * 0.6, hz: c.r * 0.6 });

    const s = {
      heading: -Math.PI / 2, // лицом на запад, к линии огня
      goal: null,
      leg: 0, // какая точка маршрута следующая
      wait: 60 + Math.random() * 120,
      phase: 0,
      move: 0,
      fall: 0,
      downUntil: 0,
      alert: 0, // кадры: смотрит на героя после попадания
      flee: 0, // кадры: убегает (гончая)
    };

    const nextGoal = (t) => {
      if (c.behavior === 'wander') s.goal = randomInPen(c.r);
      else {
        s.leg = (s.leg + 1) % route.length;
        s.goal = route[s.leg];
      }
    };

    addCombatTarget({
      name: c.name,
      desc: c.desc,
      x: start.x,
      z: start.z,
      r: c.r,
      height: c.height,
      hp: c.hp,
      weak: c.weak,
      mesh: pivot,
      onHit: (t) => {
        s.alert = 120;
        if (model.userData.spin !== undefined) model.userData.spin = 0.5; // «Каин» раскручивает пулемет
        if (c.flee && !t.dead) {
          // Отбегает от героя в глубину вольера
          const dx = t.x - playerWorldX;
          const dz = t.z - playerWorldZ;
          const d = Math.hypot(dx, dz) || 1;
          s.goal = inPen(t.x + (dx / d) * 8 + rand(-3, 3), t.z + (dz / d) * 8 + rand(-3, 3), c.r);
          s.flee = 90;
          s.wait = 0;
        }
      },
      onDeath: () => {
        s.downUntil = performance.now() + 3000;
      },
      update: (t) => {
        const time = clock.getElapsedTime();
        if (s.alert > 0) s.alert--;
        if (s.flee > 0) s.flee--;
        let moving = false;
        if (!t.dead && canMove(t)) {
          if (s.wait > 0 && !s.flee) {
            s.wait--;
            if (s.alert) s.heading = turn(s.heading, angleTo(playerWorldX - t.x, playerWorldZ - t.z), 0.08);
          } else {
            if (!s.goal) nextGoal(t);
            const dx = s.goal.x - t.x;
            const dz = s.goal.z - t.z;
            const d = Math.hypot(dx, dz);
            const speed = c.speed * (s.flee ? 1.8 : 1);
            if (d < speed * 2) {
              s.goal = null;
              s.wait = c.wait !== undefined ? c.wait : 40 + Math.random() * 160;
            } else {
              s.heading = turn(s.heading, angleTo(dx, dz), c.behavior === 'hover' ? 0.04 : 0.08);
              // Идет, когда почти развернулся; героя не толкает
              const facing = Math.cos(s.heading - angleTo(dx, dz));
              const nx = t.x + (dx / d) * speed * Math.max(0, facing);
              const nz = t.z + (dz / d) * speed * Math.max(0, facing);
              if (Math.hypot(nx - playerWorldX, nz - playerWorldZ) > c.r + 0.7) {
                t.x = nx;
                t.z = nz;
                moving = facing > 0.3;
                s.phase += speed * c.stride * (s.flee ? 1.3 : 1);
              }
            }
          }
        }
        s.move += ((moving ? 1 : 0) - s.move) * 0.1;
        // Анимация стоит, пока существо во льду или под током
        if (!t.status.frozen && !t.status.shock) model.userData.animate(s.phase, s.move, time);

        // Падение и подъем
        if (t.dead) {
          s.fall = Math.min(1, s.fall + 0.04);
          if (performance.now() > s.downUntil) {
            reviveTarget(t);
            s.goal = null;
            s.wait = 60;
          }
        } else {
          s.fall = Math.max(0, s.fall - 0.03);
          if (t.hp < t.maxHp && performance.now() - t.lastHit > 5000) reviveTarget(t);
        }
        if (t.hpBar) t.hpBar.visible = !t.dead && s.fall === 0;
        const wobble = t.status.stagger > 0 ? Math.sin(t.status.stagger * 0.9) * 0.08 : 0;
        body.rotation.y = s.heading;
        if (c.behavior === 'hover') {
          // Дрон падает на землю и заваливается набок
          body.position.y = -s.fall * 0.55;
          body.rotation.z = s.fall * 0.35 + wobble;
        } else {
          body.rotation.z = s.fall * 1.45 + wobble;
        }
        pivot.position.set(t.x + t.off.x, 0, t.z + t.off.z);
        shape.x = t.x + t.off.x;
        shape.z = t.z + t.off.z;
      },
    });
  }
}
