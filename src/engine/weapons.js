// src/engine/weapons.js
// ОРУЖИЕ — платформа (docs/mechanics/weapons.md). Оружие — данные: defineWeapon(id, { kind, damage, ... }).
// Код знает виды оружия и как ими стрелять; конкретный ствол — только запись. Оружие лежит в инвентаре
// как обычная вещь (ITEMS[id] заводится само, kind: 'weapon'), поэтому его берут со стола, сохраняют
// и показывают в ДЕМО без отдельного кода.
//
// Виды (kind):
//   'pulse' — импульсы: короткие светящиеся заряды летят по прямой, попадают в первую цель или стену
//   (позже: 'beam' — непрерывный луч, 'melee' — удар, 'thrown' — бросок; см. weapons.md)
//
// Управление:
//   Q — достать / убрать оружие (берется последнее доставленное или первое из инвентаря)
//   ЛКМ — выстрел туда, где курсор (герой разворачивается корпусом к точке, камера не дергается);
//         зажать — очередь. Клик по вещи, которую можно взять, по-прежнему берет вещь
//   K — выстрел по направлению взгляда, с небольшим доводом на ближайшую цель
//
// API:
//   defineWeapon(id, def)  — описать оружие (параметры — ниже у defineWeapon)
//   drawWeapon(id), holsterWeapon(), heroWeapon.id — что сейчас в руках
//   fireWeapon(aim)        — один выстрел: aim — точка { x, z } в мире или null (по взгляду)
//   updateWeapons()        — раз в кадр из главного цикла, после тела игрока (src/engine/game.js)
// Попадания идут через боевую платформу: hitTarget (src/engine/combat.js).

const WEAPONS = {};

// def:
//   name, kind ('pulse'), icon (значок в PIXEL_ART; iconArt — сам значок, если его еще нет)
//   damage, type — урон и его тип (energy | melee | area ...; цели умножают на weak[type])
//   fireRate — выстрелов в секунду, range — дальность, speed — скорость заряда (юнитов за кадр)
//   heat: { perShot, coolPerSec, delay, resumeBelow } — нагрев: перегрелось (1) — не стреляет,
//         пока не остынет ниже resumeBelow; остывает через delay секунд после выстрела
//   aimAssist — довод при стрельбе по взгляду (радианы), color — цвет заряда
//   model() — модель в руке (src/models/weapons.js), sound — набор звуков (см. playWeaponSound)
function defineWeapon(id, def) {
  const w = Object.assign(
    {
      id, kind: 'pulse', icon: id, damage: 10, type: 'energy', fireRate: 4, range: 40, speed: 2,
      heat: null, aimAssist: 0.2, color: 0xff4a5a, sound: 'pulse',
    },
    def,
  );
  WEAPONS[id] = w;
  if (def.iconArt && !PIXEL_ART[w.icon]) PIXEL_ART[w.icon] = def.iconArt;
  ITEMS[id] = { name: w.name, icon: w.icon, kind: 'weapon', desc: w.desc };
  return w;
}

const isWeapon = (id) => !!WEAPONS[id];

// Состояние оружия героя
const heroWeapon = {
  id: null, // что в руках (null — убрано)
  last: null, // что доставали последним: его и достанет Q
  mesh: null,
  heat: 0,
  overheated: false,
  cooldown: 0, // кадров до следующего выстрела
  sinceShot: 999, // кадров после последнего выстрела
  mouseHeld: false,
  aimHeading: 0, // куда развернут корпус при стрельбе (как playerHeading)
  aimFrames: 0, // сколько еще кадров держать корпус к цели
};

const weaponBolts = []; // летящие заряды
const weaponFx = []; // вспышки у ствола и попадания: { mesh, life, max, grow }

const canUseWeapon = () =>
  !drivingCar && !pushingCar && !dialogueOpen && !settingsOpen && !inventoryOpen;

function drawWeapon(id) {
  const w = WEAPONS[id];
  if (!w || !hasItem(id) || !canUseWeapon()) return false;
  if (heroWeapon.id) holsterWeapon(true);
  heroWeapon.id = id;
  heroWeapon.last = id;
  if (w.model) heroWeapon.mesh = player.attach('handR', w.model());
  player.setAim(true);
  playWeaponSound('draw');
  updateWeaponHud();
  return true;
}

function holsterWeapon(quiet = false) {
  if (!heroWeapon.id) return;
  if (heroWeapon.mesh && heroWeapon.mesh.parent) heroWeapon.mesh.parent.remove(heroWeapon.mesh);
  heroWeapon.mesh = null;
  heroWeapon.id = null;
  heroWeapon.mouseHeld = false;
  heroWeapon.aimFrames = 0;
  player.setAim(false);
  if (!quiet) playWeaponSound('holster');
  updateWeaponHud();
}

function toggleWeapon() {
  if (heroWeapon.id) {
    holsterWeapon();
    return;
  }
  const id = heroWeapon.last && hasItem(heroWeapon.last) ? heroWeapon.last : inventory.items.find(isWeapon);
  if (!id) showToast('Оружия нет. В ДЕМО оно лежит в тире и на столе предметов');
  else drawWeapon(id);
}

// Куда целиться мышью: точка на высоте груди под курсором (в мировых координатах). Если курсор на цели —
// ее центр. null — курсора над сценой нет
const aimRaycaster = new THREE.Raycaster();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.3);
const aimPoint = new THREE.Vector3();
function mouseAimPoint() {
  if (typeof pickMouse === 'undefined' || !pickMouse) return null;
  aimRaycaster.setFromCamera(pickMouse, camera);
  const meshes = combatTargets.filter((t) => !t.dead && t.mesh).map((t) => t.mesh);
  const hit = meshes.length ? aimRaycaster.intersectObjects(meshes, true)[0] : null;
  if (hit) {
    let o = hit.object;
    while (o && !meshes.includes(o)) o = o.parent;
    const t = combatTargets.find((c) => c.mesh === o);
    if (t) return { x: t.x, z: t.z };
  }
  if (!aimRaycaster.ray.intersectPlane(aimPlane, aimPoint)) return null;
  cityGroup.worldToLocal(aimPoint); // сцена → мир (город крутится вокруг игрока)
  return { x: aimPoint.x, z: aimPoint.z };
}

// Довод при стрельбе по взгляду: ближайшая живая цель в конусе aimAssist и в пределах дальности
function assistTarget(w, heading) {
  let best = null;
  let bestD = Infinity;
  for (const t of combatTargets) {
    if (t.dead) continue;
    const dx = t.x - playerWorldX;
    const dz = t.z - playerWorldZ;
    const d = Math.hypot(dx, dz);
    if (d > w.range || d < 0.5) continue;
    let da = Math.atan2(-dx, -dz) - heading;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > w.aimAssist) continue;
    if (d < bestD) {
      best = t;
      bestD = d;
    }
  }
  return best;
}

// Один выстрел. aim — точка в мире или null (по взгляду с доводом)
function fireWeapon(aim) {
  const w = WEAPONS[heroWeapon.id];
  if (!w || !canUseWeapon() || heroWeapon.cooldown > 0) return false;
  if (heroWeapon.overheated) {
    if (heroWeapon.sinceShot > 20) playWeaponSound('dry');
    heroWeapon.sinceShot = 0;
    return false;
  }
  let heading = playerHeading;
  if (!aim) {
    const t = assistTarget(w, playerHeading);
    if (t) aim = { x: t.x, z: t.z };
  }
  if (aim) {
    const dx = aim.x - playerWorldX;
    const dz = aim.z - playerWorldZ;
    if (Math.hypot(dx, dz) > 0.3) heading = Math.atan2(-dx, -dz);
  }
  const dirX = -Math.sin(heading);
  const dirZ = -Math.cos(heading);
  // Корпус разворачивается к цели, ствол в правой руке: заряд выходит справа от груди
  heroWeapon.aimHeading = heading;
  heroWeapon.aimFrames = 45;
  const rightX = Math.cos(heading);
  const rightZ = -Math.sin(heading);
  const x = playerWorldX + dirX * 1.1 + rightX * 0.39;
  const z = playerWorldZ + dirZ * 1.1 + rightZ * 0.39;
  const y = player.position.y + 1.35;
  spawnBolt(w, x, y, z, dirX, dirZ);
  spawnWeaponFx(x, y, z, w.color, 0.14, 5, 1.12); // вспышка у ствола

  heroWeapon.cooldown = Math.max(1, Math.round(60 / w.fireRate));
  heroWeapon.sinceShot = 0;
  if (w.heat) {
    heroWeapon.heat = Math.min(1, heroWeapon.heat + w.heat.perShot);
    if (heroWeapon.heat >= 1) {
      heroWeapon.overheated = true;
      playWeaponSound('overheat');
      showToast(w.name + ': перегрев! Подождите, пока остынет');
    }
  }
  playWeaponSound(w.sound);
  return true;
}

// ---------- Заряды ----------
const boltGeoCore = new THREE.BoxGeometry(0.06, 0.06, 1.1);
const boltGeoGlow = new THREE.BoxGeometry(0.18, 0.18, 1.5);

function spawnBolt(w, x, y, z, dx, dz) {
  const mesh = new THREE.Group();
  mesh.add(new THREE.Mesh(boltGeoCore, new THREE.MeshBasicMaterial({ color: 0xffffff })));
  mesh.add(
    new THREE.Mesh(
      boltGeoGlow,
      new THREE.MeshBasicMaterial({ color: w.color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
    ),
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = Math.atan2(dx, dz);
  cityGroup.add(mesh);
  weaponBolts.push({ w, x, y, z, dx, dz, traveled: 0, mesh });
}

const boltBlocked = (x, z) => (insideBuilding() ? blockedInside(x, z) : blockedOutsideStatic(x, z));

// Как blockedOutside, но без людей: заряд летит в стены, деревья, машины. Людей пока не задевает —
// стрельба по прохожим не предусмотрена (см. weapons.md)
function blockedOutsideStatic(x, z) {
  if (!insideWorldCircle(x, z, 0.5)) return true;
  for (const t of nearbyTrees(x, z)) if (Math.hypot(x - t.x, z - t.z) < 0.4 * t.s) return true;
  for (const s of obstacleShapes) if (Math.abs(x - s.x) < s.hu && Math.abs(z - s.z) < s.hv) return true;
  for (const c of cars) {
    const s = carShape(c.x, c.z, c.heading);
    const lu = (x - s.x) * s.ux + (z - s.z) * s.uz;
    const lv = (x - s.x) * s.vx + (z - s.z) * s.vz;
    if (Math.abs(lu) < s.hu && Math.abs(lv) < s.hv) return true;
  }
  return false;
}

function updateBolts() {
  for (let i = weaponBolts.length - 1; i >= 0; i--) {
    const b = weaponBolts[i];
    let done = false;
    // Шагами по 0,4: быстрый заряд не проскакивает тонкие цели
    const steps = Math.ceil(b.w.speed / 0.4);
    const step = b.w.speed / steps;
    for (let s = 0; s < steps && !done; s++) {
      b.x += b.dx * step;
      b.z += b.dz * step;
      b.traveled += step;
      const t = targetAt(b.x, b.z, b.y);
      if (t) {
        hitTarget(t, { damage: b.w.damage, type: b.w.type, x: b.x, z: b.z, weapon: b.w.id });
        spawnWeaponFx(b.x, b.y, b.z, b.w.color, 0.18, 10, 1.15);
        playWeaponSound('hit');
        done = true;
      } else if (boltBlocked(b.x, b.z)) {
        spawnWeaponFx(b.x, b.y, b.z, b.w.color, 0.15, 8, 1.15);
        done = true;
      } else if (b.traveled >= b.w.range) {
        done = true;
      }
    }
    b.mesh.position.set(b.x, b.y, b.z);
    if (done) {
      cityGroup.remove(b.mesh);
      b.mesh.children.forEach((m) => m.material.dispose());
      weaponBolts.splice(i, 1);
    }
  }
}

// Вспышка: светящийся шарик растет и гаснет (у ствола — коротко, при попадании — дольше)
const fxGeo = new THREE.SphereGeometry(1, 10, 8);
function spawnWeaponFx(x, y, z, color, size, life, grow) {
  const mesh = new THREE.Mesh(
    fxGeo,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  mesh.position.set(x, y, z);
  mesh.scale.setScalar(size);
  cityGroup.add(mesh);
  weaponFx.push({ mesh, life, max: life, grow });
}

function updateWeaponFx() {
  for (let i = weaponFx.length - 1; i >= 0; i--) {
    const f = weaponFx[i];
    f.life--;
    f.mesh.scale.multiplyScalar(f.grow);
    f.mesh.material.opacity = 0.9 * (f.life / f.max);
    if (f.life <= 0) {
      cityGroup.remove(f.mesh);
      f.mesh.material.dispose();
      weaponFx.splice(i, 1);
    }
  }
}

// ---------- Кадр ----------
function updateWeapons() {
  // Оружие пропало из инвентаря (загрузка, отдали) или герой сел в машину — убрать
  if (heroWeapon.id && (!hasItem(heroWeapon.id) || drivingCar || pushingCar)) holsterWeapon(true);

  const w = WEAPONS[heroWeapon.id];
  if (heroWeapon.cooldown > 0) heroWeapon.cooldown--;
  heroWeapon.sinceShot++;
  if (w) {
    if (heroWeapon.mouseHeld) fireWeapon(mouseAimPoint());
    else if (keys['KeyK']) fireWeapon(null);
  }
  // Нагрев: остывает через heat.delay секунд после выстрела
  const heat = w ? w.heat : heroWeapon.last && WEAPONS[heroWeapon.last].heat;
  if (heat && heroWeapon.sinceShot > heat.delay * 60) {
    heroWeapon.heat = Math.max(0, heroWeapon.heat - heat.coolPerSec / 60);
    if (heroWeapon.overheated && heroWeapon.heat < heat.resumeBelow) heroWeapon.overheated = false;
  }
  // Корпус к цели (камера и направление ходьбы не меняются)
  if (heroWeapon.aimFrames > 0 && w) {
    heroWeapon.aimFrames--;
    player.rotation.y = heroWeapon.aimHeading + worldRotation;
  }
  // Катушки на стволе: от цвета заряда к оранжево-белому при нагреве, при перегреве мигают
  if (heroWeapon.mesh && heroWeapon.mesh.userData.glow) {
    const c = weaponGlowColor.set(w.color).lerp(weaponHotColor, heroWeapon.heat);
    if (heroWeapon.overheated && Math.floor(performance.now() / 150) % 2) c.multiplyScalar(0.4);
    for (const m of heroWeapon.mesh.userData.glow) m.color.copy(c);
  }
  updateBolts();
  updateWeaponFx();
  updateWeaponHud();
}
const weaponGlowColor = new THREE.Color();
const weaponHotColor = new THREE.Color(0xffc060);

// ---------- Панель оружия (справа внизу) ----------
const weaponHud = document.createElement('div');
weaponHud.id = 'weaponHud';
weaponHud.style.cssText =
  'position:fixed;right:14px;bottom:14px;z-index:20;display:none;min-width:190px;padding:8px 10px;' +
  'background:rgba(0,0,0,0.55);color:#fff;font:13px sans-serif;border-radius:6px;pointer-events:none';
weaponHud.innerHTML =
  '<div id="weaponName" style="font-weight:bold;margin-bottom:5px"></div>' +
  '<div style="height:7px;background:rgba(255,255,255,0.15);border-radius:3px;overflow:hidden">' +
  '<div id="weaponHeat" style="height:100%;width:0"></div></div>' +
  '<div id="weaponHint" style="margin-top:5px;font-size:11px;opacity:0.75"></div>';
document.body.appendChild(weaponHud);
const weaponHudParts = {
  name: weaponHud.querySelector('#weaponName'),
  heat: weaponHud.querySelector('#weaponHeat'),
  hint: weaponHud.querySelector('#weaponHint'),
};
let weaponHudKey = '';

function updateWeaponHud() {
  const w = WEAPONS[heroWeapon.id];
  const key = w ? w.id + '|' + Math.round(heroWeapon.heat * 50) + '|' + heroWeapon.overheated : '';
  if (key === weaponHudKey) return;
  weaponHudKey = key;
  weaponHud.style.display = w ? 'block' : 'none';
  if (!w) return;
  weaponHudParts.name.textContent = w.name;
  weaponHudParts.heat.style.width = Math.round(heroWeapon.heat * 100) + '%';
  weaponHudParts.heat.style.background = heroWeapon.overheated ? '#e0483a' : heroWeapon.heat > 0.7 ? '#e8b83a' : '#4ee6ff';
  weaponHudParts.hint.textContent = heroWeapon.overheated
    ? 'Перегрев — остывает'
    : 'ЛКМ — огонь по курсору · K — по взгляду · Q — убрать';
}

// ---------- Звук (синтез, как шаги в src/player/footsteps.js) ----------
let weaponCtx = null;
function playWeaponSound(kind) {
  if (typeof muted !== 'undefined' && (muted || !audioUnlocked)) return;
  if (!weaponCtx) weaponCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (weaponCtx.state === 'suspended') weaponCtx.resume();
  const ctx = weaponCtx;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.35 * (typeof settings !== 'undefined' ? settings.volume : 1);
  out.connect(ctx.destination);
  const tone = (type, f0, f1, dur, vol, delay = 0) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, now + delay);
    o.frequency.exponentialRampToValueAtTime(f1, now + delay + dur);
    g.gain.setValueAtTime(vol, now + delay);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
    o.connect(g).connect(out);
    o.start(now + delay);
    o.stop(now + delay + dur + 0.02);
  };
  const noise = (dur, vol, freq, type = 'highpass') => {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(out);
    src.start(now);
  };
  if (kind === 'pulse') {
    // «Пиу»: резкий спад частоты и щелчок разряда
    tone('square', 1700, 240, 0.13, 0.35);
    tone('sine', 2600, 900, 0.07, 0.25);
    noise(0.05, 0.4, 3000);
  } else if (kind === 'hit') {
    noise(0.08, 0.35, 900, 'bandpass');
    tone('sine', 300, 120, 0.08, 0.3);
  } else if (kind === 'overheat') {
    noise(0.6, 0.35, 2500);
    tone('sawtooth', 500, 180, 0.45, 0.15);
  } else if (kind === 'dry') {
    tone('square', 220, 200, 0.05, 0.2);
  } else if (kind === 'draw') {
    // Зарядка: тон растет
    tone('sine', 300, 1400, 0.25, 0.25);
    noise(0.04, 0.3, 4000);
  } else if (kind === 'holster') {
    tone('sine', 1100, 260, 0.18, 0.2);
  }
}

// ---------- Ввод ----------
window.addEventListener('keydown', (e) => {
  if (e.repeat || settingsOpen || dialogueOpen || inventoryOpen) return;
  if (e.code === 'KeyQ') toggleWeapon();
  if (e.code === 'KeyK' && heroWeapon.id) fireWeapon(null);
});
// ЛКМ по сцене с оружием в руках — огонь. Клик по подсвеченной вещи берет вещь (src/engine/input.js), не стреляет
renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button !== 0 || !heroWeapon.id || hoveredPickable) return;
  heroWeapon.mouseHeld = true;
  fireWeapon(mouseAimPoint());
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 0) heroWeapon.mouseHeld = false;
});
window.addEventListener('blur', () => (heroWeapon.mouseHeld = false));
