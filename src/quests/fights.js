// src/quests/fights.js
// БОИ ИЗ ДАННЫХ (docs: src/core/fights.js). Пока у активного квеста истинно when боя, здесь стоят его враги; побеждены
// все — бой выигран (game.winFight), выполняются onWin. Враг — обычная цель боевой платформы (addCombatTarget,
// src/engine/combat.js) со своим видом robot/bio и оружием героя; нападает через src/engine/enemy-attacks.js.
// Это упрощенная версия существ из ДЕМО (src/demo/range-creatures.js): подходят на свою дистанцию, замахиваются и бьют
// атаками вида; без маршрутов и привязи к вольеру. Модели — src/models/creatures.js.
//
// Новый вид врага — запись в FOES ниже и его название в Core.foeKinds (src/core/fights.js).

(function () {
  const g = questGame;
  const reg = Core.registry;

  // ---------- Помощники (как в ДЕМО) ----------
  const angleTo = (dx, dz) => Math.atan2(-dx, -dz); // поворот модели (смотрит в -Z) к направлению
  const angleDiff = (a, b) => {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  const turn = (from, to, k) => from + angleDiff(from, to) * k;
  const clock = new THREE.Clock();

  const muzzlePos = new THREE.Vector3();
  const fromMuzzle = (model, name) => {
    model.userData.muzzles[name].getWorldPosition(muzzlePos);
    cityGroup.worldToLocal(muzzlePos);
    return { x: muzzlePos.x, y: muzzlePos.y, z: muzzlePos.z };
  };
  const shoot = (model, muzzle, o) => {
    const m = fromMuzzle(model, muzzle);
    return fireEnemyShot({ x: m.x, y: m.y, z: m.z, tx: playerWorldX + rand(-0.3, 0.3), ty: 1.1, tz: playerWorldZ + rand(-0.3, 0.3), ...o });
  };
  const melee = (damage, reach) => (m, t) => {
    if (Math.hypot(playerWorldX - t.x, playerWorldZ - t.z) < t.r + reach) hitHero({ damage, type: 'melee', x: t.x, z: t.z });
  };

  // ---------- Виды врагов ----------
  // speed — шаг за кадр в бою, stride — фаза шага на единицу пути, keep — [мин, макс] дистанция от героя,
  // attacks — { name, min, max, charge, shots, every, cd, fire(model, target, i) }
  const FOES = {
    cyborg: {
      make: createCyborgOutcastModel, name: 'Киборг-изгой', kind: 'robot',
      hp: 220, r: 0.7, height: 2.5, speed: 0.05, stride: 3.2, keep: [6, 14],
      attacks: [
        { name: 'punch', max: 2.2, charge: 16, shots: 1, cd: 60, fire: melee(10, 1.6) },
        { name: 'blast', min: 3, max: 20, charge: 36, shots: 1, cd: 130, fire: (m) => shoot(m, 'cannon', { kind: 'plasma', color: 0xff8a3a, speed: 0.32, life: 110, damage: 13, area: 1.2, type: 'plasma' }) },
        { name: 'burst', max: 18, charge: 14, shots: 4, every: 6, cd: 100, fire: (m) => shoot(m, 'cannon', { kind: 'bullet', color: 0xffa04a, speed: 0.7, life: 50, damage: 3, type: 'kinetic' }) },
      ],
    },
    // Химерный ходок: красное тело с клыками на четырех длинных ногах, сверху мешок-яйцо. Подкрадывается и бьет вблизи: встает на дыбы и обрушивает клыки
    strider: {
      make: createChimericStriderModel, name: 'Химерный ходок', kind: 'bio', voice: 'strider',
      hp: 150, r: 0.9, height: 3.6, speed: 0.045, stride: 2.2, keep: [0, 1.6],
      attacks: [{ name: 'stab', max: 2.9, charge: 30, shots: 1, cd: 75, fire: (m, t) => { if (Math.hypot(playerWorldX - t.x, playerWorldZ - t.z) < t.r + 2.2) hitHero({ damage: 12, type: 'melee', x: t.x, z: t.z }); } }],
    },
    // Болотная пасть: круглое тело-пасть, три глаза, шипы; плюется едкой слизью, вблизи кусает
    maw: {
      make: createMireMawModel, name: 'Болотная пасть', kind: 'bio', voice: 'maw',
      hp: 160, r: 1.0, height: 2.2, speed: 0.04, stride: 3.0, keep: [2, 8],
      attacks: [
        { name: 'bite', max: 2.6, charge: 22, shots: 1, cd: 70, fire: (m, t) => { if (Math.hypot(playerWorldX - t.x, playerWorldZ - t.z) < t.r + 1.7) hitHero({ damage: 14, type: 'melee', x: t.x, z: t.z }); } },
        { name: 'spit', min: 3, max: 12, charge: 30, shots: 3, every: 8, cd: 140, fire: (m) => shoot(m, 'mouth', { kind: 'spit', color: 0x9adc4a, speed: 0.28, life: 160, damage: 6, type: 'fire' }) },
      ],
    },
    hound: {
      make: createSporeHoundModel, name: 'Спорогончая', kind: 'bio', voice: 'hound',
      hp: 70, r: 0.8, height: 1.7, speed: 0.12, stride: 4.5, keep: [5, 9], strafe: true,
      attacks: [
        { name: 'bite', max: 2.3, charge: 10, shots: 1, cd: 55, fire: melee(7, 1.6) },
        { name: 'spit', min: 3, max: 13, charge: 26, shots: 1, cd: 110, fire: (m) => shoot(m, 'mouth', { kind: 'spit', speed: 0.3, life: 160, damage: 9, type: 'fire' }) },
      ],
    },
    cain: {
      make: createCainModel, name: 'Проект «Каин-02»', kind: 'robot',
      hp: 400, r: 1.3, height: 4.2, speed: 0.026, stride: 2.4, keep: [7, 16],
      attacks: [
        { name: 'fire', max: 9, charge: 32, shots: 26, every: 2, cd: 160, fire: (m) => shoot(m, 'fist', { kind: 'fire', speed: 0.34, life: 30, damage: 1, type: 'fire' }) },
        { name: 'rocket', min: 6, max: 28, charge: 40, shots: 2, every: 14, cd: 380, fire: (m) => shoot(m, 'pod', { kind: 'rocket', speed: 0.26, life: 160, damage: 12, area: 2.2, type: 'area' }) },
        { name: 'plasma', max: 22, charge: 30, shots: 3, every: 9, cd: 150, fire: (m) => shoot(m, 'gun', { kind: 'plasma', speed: 0.34, life: 110, damage: 7, area: 0.8, type: 'plasma' }) },
      ],
    },
    drone: {
      make: createCleanUpDroneModel, name: 'Дрон-уборщик', kind: 'robot',
      hp: 90, r: 0.95, height: 1.9, speed: 0.17, stride: 0, keep: [6, 11], strafe: true,
      attacks: [{ name: 'zap', max: 18, charge: 35, shots: 1, cd: 95, fire: (m) => zapHero(fromMuzzle(m, 'top'), 8) }],
    },
    stilt: {
      make: createStiltVanguardModel, name: 'Ходульный авангард', kind: 'robot',
      hp: 180, r: 0.8, height: 4.9, speed: 0.05, stride: 1.6, keep: [9, 18],
      attacks: [
        { name: 'bullet', max: 22, charge: 16, shots: 6, every: 5, cd: 120, fire: (m, t, i) => shoot(m, i % 2 ? 'armR' : 'armL', { kind: 'bullet', speed: 0.75, life: 50, damage: 3, type: 'kinetic' }) },
      ],
    },
  };

  // ---------- Один враг ----------
  function createFoe(spec, c, x, z, onDead) {
    const model = c.make();
    if (spec.scale) model.scale.setScalar(spec.scale);
    const body = new THREE.Group(); // поворот и падение; полоска здоровья — на pivot, она не крутится
    body.add(model);
    const pivot = new THREE.Group();
    pivot.add(body);
    pivot.position.set(x, 0, z);
    cityGroup.add(pivot);
    const ob = { x, z, hx: c.r * 0.6, hz: c.r * 0.6 };
    const shape = addObstacle(ob);
    shape.creature = c.kind;

    const aggro = spec.aggro || 26;
    const giveUp = aggro + 30;
    const s = {
      heading: Math.PI, phase: 0, move: 0, idle: 0, fall: 0, gone: 0, alert: 0, fight: false, strike: 0,
      atk: null, cd: {}, busy: 40, roared: false, voiceIn: 40 + Math.random() * 200, downUntil: 0, strafe: Math.random() < 0.5 ? 1 : -1, moving: false, lastAttack: null,
    };
    const home = { x, z };
    // Обход: враг ходит по точкам spec.patrol ([[dx, dz], ...] от места появления), пока не заметил героя; потом снова идет по кругу
    const patrol = (spec.patrol || []).map(([dx, dz]) => ({ x: x + dx, z: z + dz }));
    let patrolAt = 0;

    const walkTo = (t, goal, speed) => {
      const dx = goal.x - t.x;
      const dz = goal.z - t.z;
      const d = Math.hypot(dx, dz);
      if (d < Math.max(0.15, speed * 2)) return true;
      s.heading = turn(s.heading, angleTo(dx, dz), 0.1);
      const facing = Math.cos(angleDiff(s.heading, angleTo(dx, dz)));
      const pace = model.userData.pace ? model.userData.pace(s.phase) : 1;
      const step = Math.min(d, speed * pace * Math.max(0, facing));
      const nx = t.x + (dx / d) * step;
      const nz = t.z + (dz / d) * step;
      if (Math.hypot(nx - playerWorldX, nz - playerWorldZ) > c.r + 0.7) {
        t.x = nx;
        t.z = nz;
        if (facing > 0.3) {
          s.moving = true;
          s.phase += speed * c.stride;
        }
      }
      return false;
    };

    const fightStep = (t) => {
      const hx = playerWorldX - t.x;
      const hz = playerWorldZ - t.z;
      const dist = Math.hypot(hx, hz) || 0.01;
      const toHero = angleTo(hx, hz);
      if (s.atk) {
        s.heading = turn(s.heading, toHero, 0.12);
        const a = s.atk;
        a.t++;
        const def = a.def;
        if (a.t >= def.charge && a.shot < def.shots && (a.t - def.charge) % (def.every || 1) === 0) {
          enemyAttackerKind = c.kind;
          if (c.voice && typeof playCreatureSound === 'function' && a.shot === 0) playCreatureSound(c.voice, 'attack', dist);
          def.fire(model, t, a.shot);
          enemyAttackerKind = null;
          a.shot++;
          s.strike = 1;
        }
        if (a.shot >= def.shots) {
          s.cd[def.name] = def.cd;
          s.busy = 20 + Math.random() * 30;
          s.atk = null;
        }
        return;
      }
      const facing = Math.cos(angleDiff(s.heading, toHero));
      if (s.busy <= 0 && (facing > 0.85 || c.strafe)) {
        const ready = c.attacks.filter((a) => !(s.cd[a.name] > 0) && dist <= a.max && dist >= (a.min || 0));
        if (ready.length) {
          s.atk = { def: pick(ready), t: 0, shot: 0 };
          return;
        }
      }
      const [kMin, kMax] = c.keep;
      const want = Math.max(kMin, Math.min(kMax, dist));
      const ux = -hx / dist;
      const uz = -hz / dist;
      let gx = playerWorldX + ux * want;
      let gz = playerWorldZ + uz * want;
      if (c.strafe && dist <= kMax + 1) {
        gx += -uz * s.strafe * 3;
        gz += ux * s.strafe * 3;
        if (Math.random() < 0.004) s.strafe = -s.strafe;
      }
      const there = Math.hypot(gx - t.x, gz - t.z) < 0.4;
      if (there || dist <= kMax) {
        if (!there && (dist < kMin || c.strafe)) walkTo(t, { x: gx, z: gz }, c.speed);
        else s.heading = turn(s.heading, toHero, 0.08);
      } else walkTo(t, { x: gx, z: gz }, c.speed);
    };

    const t = addCombatTarget({
      name: spec.name || c.name,
      x, z, r: c.r, height: c.height,
      hp: spec.hp || c.hp,
      kind: c.kind,
      mesh: pivot,
      onHit: () => {
        s.alert = 120;
        if (model.userData.spin !== undefined) model.userData.spin = 0.5;
      },
      onDeath: () => {
        if (c.voice && typeof playCreatureSound === 'function') playCreatureSound(c.voice, 'death', Math.hypot(playerWorldX - t.x, playerWorldZ - t.z));
        s.downUntil = performance.now() + 1500;
        s.atk = null;
        onDead();
      },
      update: (t) => {
        const time = clock.getElapsedTime();
        if (s.alert > 0) s.alert--;
        if (s.busy > 0) s.busy--;
        for (const k in s.cd) if (s.cd[k] > 0) s.cd[k]--;
        s.strike = Math.max(0, s.strike - 0.08);
        const before = s.heading;
        s.moving = false;

        const heroDist = Math.hypot(playerWorldX - t.x, playerWorldZ - t.z);
        const canFight = heroIsTarget();
        // Голос: заметил героя — вой или визг, потом время от времени рычит и шипит, пока герой поблизости
        if (c.voice && typeof playCreatureSound === 'function' && !t.dead) {
          if (s.fight && !s.roared) {
            s.roared = true;
            playCreatureSound(c.voice, 'roar', heroDist);
          }
          if (!s.fight) s.roared = false;
          if (--s.voiceIn <= 0) {
            s.voiceIn = 150 + Math.random() * 280;
            if (heroDist < 55) playCreatureSound(c.voice, s.fight ? 'snarl' : 'idle', heroDist);
          }
        }
        if (!s.fight && canFight && (heroDist < aggro || (s.alert > 0 && heroDist < giveUp))) s.fight = true;
        if (s.fight && (!canFight || heroDist > giveUp)) {
          s.fight = false;
          s.atk = null;
        }
        const movable = typeof canMove === 'function' ? canMove(t) : !t.dead;
        if (!t.dead && movable) {
          if (s.fight) fightStep(t);
          else if (patrol.length) {
            if (walkTo(t, patrol[patrolAt], c.speed * 0.7)) patrolAt = (patrolAt + 1) % patrol.length;
          } else if (Math.hypot(home.x - t.x, home.z - t.z) > 1.5) walkTo(t, home, c.speed * 0.6); // вернуться на место
        } else if (s.atk && !movable) s.atk = null;
        const turnRate = angleDiff(before, s.heading);
        if (!s.moving && Math.abs(turnRate) > 0.01 && c.stride) s.phase += Math.abs(turnRate) * 2.5;
        s.move += ((s.moving || Math.abs(turnRate) > 0.02 ? 1 : 0) - s.move) * 0.1;
        s.idle = s.moving ? 0 : s.idle + 1;

        if (!t.status.frozen && !t.status.shock) {
          const a = s.atk;
          model.userData.animate({
            phase: s.phase, move: s.move, time, turn: turnRate, idle: s.idle, alert: s.alert / 120, sweep: 0,
            fight: s.fight ? 1 : 0,
            attack: a ? a.def.name : s.strike > 0 ? s.lastAttack : null,
            charge: a && a.t < a.def.charge ? a.t / a.def.charge : a && a.def.shots > 1 ? 1 : 0,
            strike: s.strike,
          });
          if (a) s.lastAttack = a.def.name;
        }

        if (t.dead) {
          s.fall = Math.min(1, s.fall + 0.04);
          if (performance.now() > s.downUntil) {
            s.gone = Math.min(1, s.gone + 0.025);
            if (s.gone >= 1) t.update = null;
          }
        }
        if (t.hpBar) t.hpBar.visible = !t.dead && s.fall === 0;
        body.rotation.y = s.heading;
        body.rotation.z = s.fall * 1.45;
        pivot.position.set(t.x + t.off.x, -s.gone * 1.2, t.z + t.off.z);
        pivot.scale.setScalar(1 - s.gone * 0.6);
        shape.x = t.x + t.off.x;
        shape.z = t.z + t.off.z;
      },
    });
    return {
      target: t,
      remove() {
        removeCombatTarget(t);
        cityGroup.remove(pivot);
        const i = obstacles.indexOf(ob);
        if (i >= 0) obstacles.splice(i, 1);
        const j = obstacleShapes.indexOf(shape);
        if (j >= 0) obstacleShapes.splice(j, 1);
      },
    };
  }

  // ---------- Мир следит за боями ----------
  const live = new Map(); // ref → { foes: [{ spec, dead, obj }] }

  function removeFight(ref) {
    const f = live.get(ref);
    if (!f) return;
    for (const foe of f.foes) if (foe.obj) foe.obj.remove();
    live.delete(ref);
  }

  function sync() {
    const active = g.activeFights();
    const activeRefs = new Set(active.map((f) => f.ref));
    for (const ref of [...live.keys()]) if (!activeRefs.has(ref)) removeFight(ref);
    // Бой с panic: true — пока он идет, горожане бегают (src/world/people.js)
    npcPanic = GAME_LOCATION === 'main' && active.some((f) => f.def.panic && !(live.get(f.ref) && live.get(f.ref).finishing));
    for (const { ref, def } of active) {
      if (!live.has(ref)) live.set(ref, { foes: def.foes.map((spec) => ({ spec, dead: false, obj: null })) });
      const f = live.get(ref);
      if (f.finishing) continue;
      // Текущая волна: самая ранняя, где еще есть живые
      const wave = Math.min(Infinity, ...f.foes.filter((x) => !x.dead).map((x) => x.spec.wave || 0));
      for (const foe of f.foes) {
        if (foe.dead || foe.obj || (foe.spec.wave || 0) > wave) continue;
        const place = reg.places[foe.spec.at];
        if (!place || (place.location || 'main') !== GAME_LOCATION) continue; // враги этого боя стоят в другой локации
        const kind = FOES[foe.spec.kind];
        foe.obj = createFoe(foe.spec, kind, place.x + (foe.spec.dx || 0), place.z + (foe.spec.dz || 0), () => (foe.dead = true));
      }
      if (f.foes.every((x) => x.dead)) {
        // Подождать, пока последний упадет, и выиграть бой
        setTimeout(() => {
          removeFight(ref);
          g.winFight(ref);
        }, 1200);
        f.foes.forEach((x) => (x.dead = true));
        f.finishing = true;
      }
    }
  }

  setInterval(sync, 300);
})();
