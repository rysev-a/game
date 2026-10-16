// src/engine/enemy-attacks.js
// ВРАГИ БЬЮТ ГЕРОЯ (docs/mechanics/combat.md, «Враги бьют героя»). Здоровье героя — heroStats.hp
// (src/player/equipment.js). Существо или босс не знает, как устроен герой: оно вызывает
//
//   hitHero({ damage: 10, type: 'electric', x, z })   — удар в упор или попадание; x, z — откуда (для толчка)
//   fireEnemyShot({ kind, x, y, z, tx, ty, tz, speed, damage, type, area })
//       kind: 'bullet' — пуля (летит прямо, быстро), 'rocket' — ракета (дым, взрыв по площади area),
//             'spit'   — плевок жидкостью по дуге (на земле остается горящая лужа), 'fire' — капля пламени,
//             'plasma' — зеленый сгусток плазмы (светится, по площади area);
//       color — свой цвет пули, плевка (и его лужи) или плазмы
//   zapHero(from, damage)  — разряд молнией: мгновенно, от точки from { x, y, z } до героя
//   heroIsTarget()         — можно ли сейчас бить героя (не за рулем, не в здании, не лежит). Бронемашина
//                            (БТР, car.kind.armored) — тоже цель: попадания роботов бьют по ней (damageVehicle,
//                            src/world/vehicles.js), биосущества броню не берут
//   enemyAttackerKind      — вид того, кто сейчас бьет ('robot' | 'bio'): существо ставит его на время удара
//   heroWakePoint          — где герой приходит в себя, если здоровье кончилось (null — там же, где упал)
//   updateEnemyAttacks()   — раз в кадр из главного цикла (src/engine/game.js)
//
// Снаряды летят с настоящей скоростью — от них можно уйти; стены и деревья их останавливают.
// Поражение пока простое (onLose: 'wake'): экран темнеет, герой приходит в себя с полным здоровьем.
// Вне боя здоровье тихо восстанавливается.

let heroWakePoint = null;
let heroDownUntil = 0; // пока лежит — его не бьют
let heroLastHurt = 0;
const heroRadius = 0.45;
const enemyShots = [];
const enemyFx = []; // молнии, вспышки взрывов, лужи

let enemyAttackerKind = null;
const heroArmored = () => !!(drivingCar && drivingCar.kind && drivingCar.kind.armored);
const heroIsTarget = () =>
  (!drivingCar || heroArmored()) && !(typeof insideBuilding === 'function' && insideBuilding()) && performance.now() > heroDownUntil;
// Радиус попадания: герой — тонкий, бронемашина — широкая
const heroHitRadius = () => (heroArmored() ? drivingCar.half.w + 0.3 : heroRadius);

// Красная вспышка по краям экрана при попадании
const heroHurtEl = document.createElement('div');
heroHurtEl.style.cssText =
  'position:fixed;inset:0;pointer-events:none;z-index:40;opacity:0;transition:opacity .35s;' +
  'box-shadow:inset 0 0 120px 40px rgba(220,30,20,.75)';
document.body.appendChild(heroHurtEl);
// Темнота, когда герой падает
const heroDownEl = document.createElement('div');
heroDownEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:41;opacity:0;transition:opacity .8s;background:#000';
document.body.appendChild(heroDownEl);

function hitHero(hit) {
  if (!heroIsTarget()) return 0;
  if (heroArmored()) {
    const robot = hit.robot !== undefined ? hit.robot : enemyAttackerKind === 'robot';
    return robot ? damageVehicle(drivingCar, hit.damage) : 0; // клыки и плевки броню не берут
  }
  const dmg = Math.max(1, Math.round(hit.damage * heroArmorFactor())); // куртка и бронежилет снимают часть урона
  heroStats.hp = Math.max(0, heroStats.hp - dmg);
  heroLastHurt = performance.now();
  renderEquipHud();
  heroHurtEl.style.transition = 'none';
  heroHurtEl.style.opacity = String(Math.min(1, 0.35 + dmg / 25));
  requestAnimationFrame(() => {
    heroHurtEl.style.transition = 'opacity .6s';
    heroHurtEl.style.opacity = '0';
  });
  if (hit.burn) heroBurn = Math.max(heroBurn, hit.burn);
  if (heroStats.hp <= 0) heroDefeated();
  return dmg;
}

// Горение героя: пламя дрона и лужи — пара секунд урона огнем
let heroBurn = 0;

function heroDefeated() {
  heroDownUntil = performance.now() + 2600;
  heroBurn = 0;
  heroDownEl.style.opacity = '1';
  setTimeout(() => {
    if (heroWakePoint) {
      playerWorldX = heroWakePoint.x;
      playerWorldZ = heroWakePoint.z;
    }
    heroStats.hp = heroStats.maxHp;
    renderEquipHud();
    heroDownEl.style.opacity = '0';
    showToast('Вы пришли в себя. Здоровье восстановлено.', 3000);
  }, 1400);
}

// ---------- Снаряды ----------
const shotGeo = {
  bullet: new THREE.BoxGeometry(0.07, 0.07, 0.45),
  rocket: new THREE.CylinderGeometry(0.07, 0.1, 0.55, 6),
  flare: new THREE.CylinderGeometry(0.1, 0, 0.35, 5),
  spit: new THREE.IcosahedronGeometry(0.2, 0),
  fire: new THREE.IcosahedronGeometry(0.22, 0),
  plasma: new THREE.IcosahedronGeometry(0.26, 1),
  plasmaCore: new THREE.IcosahedronGeometry(0.14, 0),
  puff: new THREE.IcosahedronGeometry(0.2, 0),
};

function fireEnemyShot(o) {
  const s = Object.assign({ speed: 0.5, damage: 5, type: 'kinetic', area: 0, life: 120, gravity: 0, robot: enemyAttackerKind === 'robot' }, o);
  const dx = s.tx - s.x;
  const dz = s.tz - s.z;
  const dy = (s.ty ?? 1.2) - s.y;
  const d = Math.hypot(dx, dy, dz) || 1;
  if (s.kind === 'spit') {
    // По дуге: летит столько кадров, сколько нужно по горизонтали, и падает точно к цели
    const flat = Math.hypot(dx, dz) || 1;
    const frames = Math.max(12, flat / s.speed);
    s.gravity = 0.012;
    s.vx = dx / frames;
    s.vz = dz / frames;
    s.vy = (0 - s.y) / frames + (s.gravity * frames) / 2;
  } else {
    s.vx = (dx / d) * s.speed;
    s.vy = (dy / d) * s.speed;
    s.vz = (dz / d) * s.speed;
  }
  const g = new THREE.Group();
  if (s.kind === 'bullet') g.add(new THREE.Mesh(shotGeo.bullet, new THREE.MeshBasicMaterial({ color: s.color || 0xffd24a })));
  else if (s.kind === 'rocket') {
    const body = new THREE.Mesh(shotGeo.rocket, new LitMaterial({ color: 0x5a6468 }));
    body.rotation.x = -Math.PI / 2;
    g.add(body);
    const flare = new THREE.Mesh(shotGeo.flare, new THREE.MeshBasicMaterial({ color: 0xff8a2a }));
    flare.rotation.x = -Math.PI / 2;
    flare.position.z = 0.42;
    g.add(flare);
  } else if (s.kind === 'spit') g.add(new THREE.Mesh(shotGeo.spit, new THREE.MeshBasicMaterial({ color: s.color || 0xff9a2a })));
  else if (s.kind === 'plasma') {
    g.add(new THREE.Mesh(shotGeo.plasma, new THREE.MeshBasicMaterial({ color: s.color || 0x5aff6a, transparent: true, opacity: 0.6 })));
    g.add(new THREE.Mesh(shotGeo.plasmaCore, new THREE.MeshBasicMaterial({ color: 0xe8ffe0 })));
  } else g.add(new THREE.Mesh(shotGeo.fire, new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? 0xffb040 : 0xff6a20, transparent: true })));
  g.position.set(s.x, s.y, s.z);
  g.lookAt(s.x + s.vx, s.y + s.vy, s.z + s.vz);
  cityGroup.add(g);
  s.mesh = g;
  s.age = 0;
  enemyShots.push(s);
  return s;
}

// Стены, деревья, машины — но не сами существа (их препятствия помечены creature: true)
function shotBlocked(x, y, z) {
  if (y < 0.05) return true;
  if (y > 3.5) return false;
  for (const o of obstacleShapes) {
    if (o.creature) continue;
    const lu = (x - o.x) * o.ux + (z - o.z) * o.uz;
    const lv = (x - o.x) * o.vx + (z - o.z) * o.vz;
    if (Math.abs(lu) < o.hu && Math.abs(lv) < o.hv) return true;
  }
  return false;
}

function explodeAt(x, z, area, damage, type, robot) {
  spawnBlast(x, z, area, type === 'plasma' ? 0x6aff7a : type === 'fire' ? 0xff7a2a : 0xffc060);
  if (heroIsTarget() && Math.hypot(playerWorldX - x, playerWorldZ - z) < area + heroHitRadius()) hitHero({ damage, type, x, z, robot });
}

function spawnBlast(x, z, r, color) {
  const m = new THREE.Mesh(shotGeo.puff, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
  m.position.set(x, 0.5, z);
  cityGroup.add(m);
  enemyFx.push({ m, life: 18, max: 18, grow: r * 4.5 });
}

// Горящая лужа: светится, жжет героя, пока он в ней стоит
function spawnPuddle(x, z, color = 0xff8a2a) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 7), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.03, z);
  m.scale.setScalar(0.2);
  cityGroup.add(m);
  enemyFx.push({ m, life: 300, max: 300, puddle: true, x, z, r: 1.1 });
}

// Молния: ломаная от точки до героя, держится несколько кадров
function zapHero(from, damage) {
  const tx = playerWorldX;
  const tz = playerWorldZ;
  const pts = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const j = i === 0 || i === n ? 0 : 0.35;
    pts.push(
      new THREE.Vector3(
        from.x + (tx - from.x) * k + (Math.random() - 0.5) * j,
        from.y + (1.2 - from.y) * k + (Math.random() - 0.5) * j,
        from.z + (tz - from.z) * k + (Math.random() - 0.5) * j,
      ),
    );
  }
  for (const color of [0x9ee8ff, 0xffffff]) {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true }));
    cityGroup.add(line);
    enemyFx.push({ m: line, life: 10, max: 10 });
  }
  if (typeof playWeaponSound === 'function') playWeaponSound('arc');
  return hitHero({ damage, type: 'electric', x: from.x, z: from.z, robot: true });
}

function updateEnemyAttacks() {
  for (let i = enemyShots.length - 1; i >= 0; i--) {
    const s = enemyShots[i];
    s.age++;
    s.vy -= s.gravity;
    s.x += s.vx;
    s.y += s.vy;
    s.z += s.vz;
    s.mesh.position.set(s.x, s.y, s.z);
    if (s.kind === 'rocket' || s.kind === 'spit') s.mesh.lookAt(s.x + s.vx, s.y + s.vy, s.z + s.vz);
    if (s.kind === 'fire') {
      s.mesh.scale.setScalar(1 + s.age * 0.06);
      s.mesh.children[0].material.opacity = Math.max(0, 1 - s.age / s.life);
    }
    if (s.kind === 'plasma') s.mesh.rotation.y += 0.3;
    if (s.kind === 'rocket' && s.age % 3 === 0) spawnBlast(s.x, s.z, 0.08, 0x9aa0a4); // дымный след
    let done = s.age > s.life;
    const nearHero = Math.hypot(s.x - playerWorldX, s.z - playerWorldZ) < heroHitRadius() + (s.kind === 'fire' ? 0.5 : 0.15) && s.y < 2.1;
    if (nearHero && heroIsTarget()) {
      if (s.area) explodeAt(s.x, s.z, s.area, s.damage, s.type, s.robot);
      else hitHero({ damage: s.damage, type: s.type, x: s.x - s.vx * 10, z: s.z - s.vz * 10, burn: s.kind === 'fire' ? 60 : 0, robot: s.robot });
      done = true;
    } else if (shotBlocked(s.x, s.y, s.z)) {
      if (s.area) explodeAt(s.x, s.z, s.area, s.damage, s.type, s.robot);
      if (s.kind === 'spit') spawnPuddle(s.x, s.z, s.color);
      done = true;
    }
    if (done) {
      cityGroup.remove(s.mesh);
      enemyShots.splice(i, 1);
    }
  }
  for (let i = enemyFx.length - 1; i >= 0; i--) {
    const f = enemyFx[i];
    f.life--;
    const k = f.life / f.max;
    if (f.puddle) {
      f.m.scale.setScalar(Math.min(f.r, f.m.scale.x + 0.06));
      f.m.material.opacity = Math.min(0.85, k * 3);
      if (f.life % 20 === 0 && heroIsTarget() && Math.hypot(playerWorldX - f.x, playerWorldZ - f.z) < f.r + heroRadius * 0.5) {
        hitHero({ damage: 3, type: 'fire', x: f.x, z: f.z, robot: false });
      }
    } else {
      if (f.grow) f.m.scale.setScalar(1 + (1 - k) * f.grow);
      f.m.material.opacity = k;
    }
    if (f.life <= 0) {
      cityGroup.remove(f.m);
      f.m.material.dispose();
      enemyFx.splice(i, 1);
    }
  }
  // Горит: каждые 0,25 с понемногу огнем
  if (heroBurn > 0) {
    heroBurn--;
    if (heroBurn % 20 === 0) hitHero({ damage: 1, type: 'fire', robot: false });
  }
  // Вне боя здоровье тихо восстанавливается
  const now = performance.now();
  if (heroStats.hp > 0 && heroStats.hp < heroStats.maxHp && now - heroLastHurt > 6000 && now > heroDownUntil) {
    const before = Math.ceil(heroStats.hp);
    heroStats.hp = Math.min(heroStats.maxHp, heroStats.hp + 0.08);
    if (Math.ceil(heroStats.hp) !== before) renderEquipHud();
  }
}
