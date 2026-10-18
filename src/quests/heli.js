// src/quests/heli.js
// РАДИОУПРАВЛЯЕМЫЙ ВЕРТОЛЕТИК (как в миссиях GTA Vice City). Действие { heli: { from, goal, goalY, goalR, onGoal } } запускает его
// с места from: герой стоит и держит пульт, камера идет за вертолетиком. Управление: W/S — вперед и назад, A/D — поворот,
// Пробел — выше, Shift — ниже, E — у цели (меньше goalR от точки goal на высоте goalY) выполняет onGoal, Esc — убрать вертолетик.
// Врезаться в стену башни нельзя: она отталкивает, пока вертолетик ниже крыши. Таймер квеста идет, пока вы летите.
// Как это устроено: мир вращается вокруг героя (applyWorldTransform), поэтому на время полета «положением игрока» (playerWorldX/Z)
// становится вертолетик, сам герой спрятан и неуязвим, а камера поднимается вслед за высотой (оболочка над updateCamera).

(function () {
  const g = questGame;
  const reg = Core.registry;

  // ---------- Модель ----------
  function createHeliModel() {
    const m = new THREE.Group();
    const add = (w, h, d, color, x, y, z) => {
      const b = boxWithEdges(w, h, d, color);
      b.position.set(x, y, z);
      m.add(b);
      return b;
    };
    add(1.4, 0.7, 0.9, 0xd23c3c, 0, 0.55, 0); // корпус
    add(0.9, 0.5, 0.7, 0x3a7bd5, 0, 0.85, -0.45); // кабина
    add(0.22, 0.22, 1.7, 0x8a2020, 0, 0.7, 1.1); // хвост
    add(0.05, 0.7, 0.3, 0x2a2a30, 0.14, 0.75, 1.9); // хвостовой винт
    add(0.1, 0.35, 0.1, 0x2a2a30, 0, 1.0, 0); // мачта
    add(0.1, 0.1, 1.5, 0x2a2a30, -0.5, 0.05, 0); // полозья
    add(0.1, 0.1, 1.5, 0x2a2a30, 0.5, 0.05, 0);
    const rotor = new THREE.Group();
    rotor.position.set(0, 1.25, 0);
    for (const rot of [0, Math.PI / 2]) {
      const blade = boxWithEdges(3.4, 0.04, 0.22, 0x2a2a30);
      blade.rotation.y = rot;
      rotor.add(blade);
    }
    m.add(rotor);
    m.userData.rotor = rotor;
    m.scale.setScalar(1.6);
    return m;
  }

  // ---------- Состояние полета ----------
  let rc = null;
  const down = {};
  const hud = document.createElement('div');
  hud.style.cssText =
    'position:absolute;left:50%;bottom:96px;transform:translateX(-50%);z-index:12;padding:8px 14px;border-radius:8px;' +
    'background:rgba(0,0,0,0.6);color:#fff;font: var(--fs-text)/1.4 var(--font);text-align:center;display:none;pointer-events:none';
  document.body.appendChild(hud);

  const towerBox = () => ({ x: towerX, z: towerZ, h: 10.8, top: 61.2 }); // башня: полуширина 10, крыша на высоте 61,2

  function start(opts) {
    if (rc) return;
    const from = reg.places[opts.from];
    const goal = reg.places[opts.goal];
    if (!from || !goal) return;
    const model = createHeliModel();
    cityGroup.add(model);
    rc = {
      opts, goal, model,
      x: from.x, y: 1.2, z: from.z, yaw: Math.PI, vy: 0,
      hero: { x: playerWorldX, z: playerWorldZ, heading: playerHeading, rotation: worldRotation, hurtUntil: heroDownUntil },
      last: performance.now(),
    };
    player.visible = false;
    heroDownUntil = performance.now() + 1e9; // вертолетик управляется с земли: героя в это время не бьют
    for (const k of Object.keys(keys)) keys[k] = false;
    if (document.exitPointerLock) document.exitPointerLock();
    showToast('Вертолетик: W/S, A/D, Пробел — выше, Shift — ниже, E — у цели, Esc — убрать', 5000);
    requestAnimationFrame(frame);
  }

  function stop() {
    if (!rc) return;
    const r = rc;
    rc = null;
    cityGroup.remove(r.model);
    playerWorldX = r.hero.x;
    playerWorldZ = r.hero.z;
    playerHeading = r.hero.heading;
    worldRotation = r.hero.rotation;
    heroDownUntil = r.hero.hurtUntil;
    player.visible = !drivingCar;
    hud.style.display = 'none';
    for (const k of Object.keys(down)) down[k] = false;
  }

  const dist3 = () => Math.hypot(rc.x - rc.goal.x, rc.y - rc.opts.goalY, rc.z - rc.goal.z);

  function frame(now) {
    if (!rc) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - rc.last) / 1000);
    rc.last = now;
    update(dt);
  }

  // Один шаг полета на dt секунд (его же зовут из консоли для проверки: questHost.heliUpdate(0.05))
  function update(dt) {
    if (!rc) return;
    const turn = (down.KeyA || down.ArrowLeft ? 1 : 0) - (down.KeyD || down.ArrowRight ? 1 : 0);
    const fwd = (down.KeyW || down.ArrowUp ? 1 : 0) - (down.KeyS || down.ArrowDown ? 0.55 : 0);
    const up = (down.Space ? 1 : 0) - (down.ShiftLeft || down.ShiftRight ? 1 : 0);
    rc.yaw += turn * 1.9 * dt;
    rc.vy += (up * 9 - rc.vy) * Math.min(1, dt * 6);
    rc.y = Math.max(0.8, Math.min(90, rc.y + rc.vy * dt));
    rc.x += -Math.sin(rc.yaw) * fwd * 16 * dt;
    rc.z += -Math.cos(rc.yaw) * fwd * 16 * dt;

    // Стена башни отталкивает, пока вертолетик ниже крыши (по оси наименьшего проникновения)
    const t = towerBox();
    if (rc.y < t.top && Math.abs(rc.x - t.x) < t.h && Math.abs(rc.z - t.z) < t.h) {
      const px = t.h - Math.abs(rc.x - t.x);
      const pz = t.h - Math.abs(rc.z - t.z);
      if (px < pz) rc.x = t.x + Math.sign(rc.x - t.x || 1) * t.h;
      else rc.z = t.z + Math.sign(rc.z - t.z || 1) * t.h;
    }
    const from = reg.places[rc.opts.from];
    const far = Math.hypot(rc.x - from.x, rc.z - from.z);
    if (far > 110) {
      rc.x = from.x + ((rc.x - from.x) / far) * 110;
      rc.z = from.z + ((rc.z - from.z) / far) * 110;
    }

    rc.model.position.set(rc.x, rc.y, rc.z);
    rc.model.rotation.y = rc.yaw;
    rc.model.rotation.z = -turn * 0.25;
    rc.model.rotation.x = -fwd * 0.2;
    rc.model.userData.rotor.rotation.y += 1.6;
    playerWorldX = rc.x;
    playerWorldZ = rc.z;
    playerHeading = rc.yaw;
    worldRotation = -rc.yaw;

    const d = dist3();
    hud.style.display = 'block';
    hud.innerHTML = 'Высота ' + Math.round(rc.y) + ' м · до цели ' + Math.round(d) + ' м' + (d <= rc.opts.goalR ? '<br><b>E — обезвредить</b>' : '');
  }

  // Камера следует за высотой вертолетика (она смотрит на «положение игрока», то есть на вертолетик по горизонтали)
  const origUpdateCamera = updateCamera;
  updateCamera = function () {
    origUpdateCamera();
    if (!rc) return;
    camera.position.y += rc.y * 0.9;
    camera.lookAt(0, rc.y, 0);
  };

  // Пока вертолетик в воздухе, до игры доходит только то, что нужно ему
  window.addEventListener(
    'keydown',
    (e) => {
      if (!rc) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      down[e.code] = true;
      if (e.code === 'Escape') stop();
      else if (e.code === 'KeyE' && !e.repeat) {
        if (dist3() <= rc.opts.goalR) {
          const onGoal = rc.opts.onGoal;
          stop();
          g.run(onGoal);
        } else showToast('Дальше от бомбы: поднимитесь выше и подлетите ближе', 2500);
      }
    },
    true,
  );
  window.addEventListener('keyup', (e) => {
    if (rc) down[e.code] = false;
  });
  window.addEventListener('mousedown', (e) => rc && e.stopImmediatePropagation(), true);

  questHost.startHeli = start;
  questHost.heliState = () => rc; // для отладки в консоли
  questHost.heliUpdate = update;
})();
