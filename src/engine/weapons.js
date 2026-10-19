// src/engine/weapons.js
// ОРУЖИЕ — платформа (docs/mechanics/weapons.md). Оружие — данные: defineWeapon(id, { kind, damage, ... }).
// Код знает виды оружия и как ими стрелять; конкретный ствол — только запись. Оружие лежит в инвентаре
// как обычная вещь (ITEMS[id] заводится само, kind: 'weapon'), поэтому его берут со стола, сохраняют
// и показывают в ДЕМО без отдельного кода.
//
// Виды (kind) — реестр WEAPON_KINDS: { fire(w, shot), update() }. Здесь — 'pulse' (заряды летят по прямой,
// попадают в первую цель или стену); остальные виды — src/engine/weapon-kinds.js: 'rail' (гаусс),
// 'stream' (плазмомет), 'canister' (крио), 'arc' (разрядник), 'tachyon' (тахионный пистолет), 'spread' (дробовик),
// 'rocket' (базука).
// Попадание любого вида — weaponHit(w, t, ...): урон, эффекты w.effects (состояния цели, толчок) и
// вспышка w.hitFx.
//
// Управление:
//   Q — достать / убрать оружие (из активной ячейки оружия на нижней панели, src/player/equipment.js)
//   R — следующее оружие из пяти ячеек оружия (по кругу); без оружия в руках — достает первое
//   ЛКМ — выстрел туда, где курсор (герой разворачивается корпусом к точке, камера не дергается);
//         зажать — очередь. У оружия с накоплением (charge, импульсный лазер) зажать — копить заряд,
//         отпустить — выстрел. Клик по вещи, которую можно взять, по-прежнему берет вещь
//   K — выстрел по направлению взгляда, с небольшим доводом на ближайшую цель
//   На компьютере в боевом режиме мышь захватывается (src/engine/mouse-look.js): движение мыши крутит
//   камеру и прицел, как в 3D-шутерах, вверх-вниз — выстрел чуть выше или ниже (aimPitch), колесо —
//   смена оружия (nextWeapon(±1)), Esc — выйти из боя
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
//   hold — как держат: 'hand' (пистолет, одна вытянутая рука) | 'rifle' (винтовка двумя руками)
//   muzzle: { forward, right, up } — где дуло относительно героя (откуда вылетает заряд)
//   bolt — как выглядит заряд: 'pulse' (короткий светящийся брусок) | 'orb' (светящийся шар плазмы) |
//          'tracer' (тонкий трассер пули) | 'wave' (электромагнитная волна:
//          две синусоиды — вертикальная и горизонтальная — вокруг светящейся оси; wave: { length,
//          amplitude, wavelength })
//   charge: { time, min, damage: [от, до], push: [от, до], stagger: [от, до], scale: [от, до], length: [от, до] } — выстрел
//         с накоплением: пока кнопка зажата, заряд растет от 0 до 1 за time секунд; отпустили — выстрел,
//         урон, толчок, шатание, толщина и длина заряда — между «от» и «до» по набранному заряду. Меньше min — не
//         выстрелит. Полный заряд — удар 'blast'
//   beam: { delay, range, dps, every, elixir } — непрерывный луч (плазмомет): щелчок — обычный выстрел, зажать
//         дольше delay секунд — вместо очереди бьет луч до первой цели или стены (не дальше range), урон dps
//         в секунду порциями раз в every кадров, тратит elixir (доля шкалы) в секунду
//   spinUp — секунды раскрутки (пулемет): зажал — стволы раскручиваются (userData.spin модели), стрельба
//         начинается, когда раскрутились; отпустил — медленно останавливаются
//   elixir — сколько эликсира тратит выстрел, доля полной шкалы (heroStats.maxElixir); у оружия с charge —
//         charge.elixir: [от, до] по заряду. Нет поля — эликсир не тратится (дробовик, пулемет). Эликсира
//         не хватает — оружие не стреляет
//   effects — что попадание делает с целью (состояния из src/engine/combat.js): { stagger, freeze, ... },
//   push — сила толчка от попадания, hitFx — вспышка попадания ('spark' | 'microburst')
//   model() — модель в руке (src/models/weapons.js), sound — набор звуков (см. playWeaponSound)
function defineWeapon(id, def) {
  const w = Object.assign(
    {
      id, kind: 'pulse', icon: id, damage: 10, type: 'energy', fireRate: 4, range: 40, speed: 2,
      heat: null, aimAssist: 0.2, color: 0xff4a5a, sound: 'pulse', hold: 'hand', bolt: 'pulse',
      muzzle: { forward: 1.1, right: 0.39, up: 1.35 }, effects: null, push: 0, hitFx: 'spark',
    },
    def,
  );
  WEAPONS[id] = w;
  if (def.iconArt && !PIXEL_ART[w.icon]) PIXEL_ART[w.icon] = def.iconArt;
  ITEMS[id] = { name: w.name, icon: w.icon, kind: 'weapon', desc: w.desc };
  return w;
}

const isWeapon = (id) => !!WEAPONS[id];

// Виды оружия: pulse — здесь, остальные регистрируются в src/engine/weapon-kinds.js
const WEAPON_KINDS = {};

// Попадание оружия w в цель t в точке (x, y, z), заряд летел по (dx, dz). Урон и тип можно переопределить
function weaponHit(w, t, x, y, z, dx, dz, over = {}) {
  const dmg = hitTarget(t, {
    damage: over.damage !== undefined ? over.damage : w.damage,
    type: over.type || w.type,
    x, z, weapon: w.id,
    hitsAll: !!w.hitsAll,
    chip: w.chip, // доля урона, которая проходит сквозь иммунитет цели (слабо, но действует)
    effects: over.effects !== undefined ? over.effects : w.effects,
    push: w.push ? { x: dx * w.push, z: dz * w.push } : null,
  });
  spawnHitFx(w, x, y, z);
  // Взрыв шара (w.splash, плазмомет): все вокруг цели получают долю урона; луч (over.damage) осколков не дает
  if (w.splash && over.damage === undefined) {
    for (const o of combatTargets) {
      if (o === t || o.dead) continue;
      if (Math.hypot(o.x - t.x, o.z - t.z) > w.splash.radius + o.r) continue;
      hitTarget(o, { damage: Math.round(w.damage * w.splash.share), type: w.type, x: o.x, z: o.z, weapon: w.id, hitsAll: !!w.hitsAll, chip: w.chip });
    }
  }
  return dmg;
}

// Вспышка попадания: 'spark' — шарик; 'microburst' — микровзрыв: яркое ядро, искры и кольцо ударной волны
function spawnHitFx(w, x, y, z) {
  spawnWeaponFx(x, y, z, w.color, 0.18, 10, 1.15);
  if (w.hitFx === 'microburst') {
    spawnWeaponFx(x, y, z, 0xffffff, 0.12, 6, 1.25);
    for (let i = 0; i < 5; i++) {
      spawnWeaponFx(x + (Math.random() - 0.5) * 0.7, y + (Math.random() - 0.5) * 0.7, z + (Math.random() - 0.5) * 0.7, w.color, 0.06, 8, 1.2);
    }
    spawnShockRing(x, y, z, w.color);
  }
  // Полный заряд: большая белая вспышка и две волны — по земле и вокруг цели
  if (w.hitFx === 'blast') {
    spawnWeaponFx(x, y, z, 0xffffff, 0.35, 12, 1.2);
    for (let i = 0; i < 10; i++) {
      spawnWeaponFx(x + (Math.random() - 0.5) * 1.6, y + (Math.random() - 0.5) * 1.6, z + (Math.random() - 0.5) * 1.6, w.color, 0.09, 12, 1.15);
    }
    spawnShockRing(x, y, z, w.color, 0.5, 18, 1.2);
    spawnShockRing(x, 0.1, z, 0xffffff, 0.4, 22, 1.18);
  }
}

// Кольцо ударной волны: плоское кольцо расширяется и гаснет
const ringGeo = new THREE.RingGeometry(0.8, 1, 24);
function spawnShockRing(x, y, z, color, size = 0.3, life = 12, grow = 1.22) {
  const mesh = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  mesh.position.set(x, y, z);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.setScalar(size);
  cityGroup.add(mesh);
  weaponFx.push({ mesh, life, max: life, grow });
}

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
  turbo: false, // ПКМ с оружием в руках зажата — «турбо»: частые отдельные щелчки ЛКМ (не зажатая ЛКМ: это другой режим: очередь, заряд, луч). Пока держите ПКМ
  tapIn: 0, // кадров до следующего щелчка турбо
  spin: 0, // раскрутка стволов 0..1 (оружие со spinUp)
  holdAt: 0, // когда зажали кнопку (оружие с beam)
  spinAt: 0,
  charge: 0, // набранный заряд 0..1 (оружие с charge)
  charging: false,
  aimHeading: 0, // куда развернут корпус при стрельбе (как playerHeading)
  aimFrames: 0, // сколько еще кадров держать корпус к цели
};

// Наклон прицела вверх-вниз (рад, плюс — вверх). Меняет его только захваченная мышь (src/engine/mouse-look.js),
// иначе 0 — заряды летят горизонтально. aimSlope — сколько заряд поднимается на единицу пути
// От первого лица (src/engine/mouse-look.js) наклон берется такой, чтобы заряд прилетел в точку под перекрестием
let aimPitch = 0;
const aimSlope = () => (firstPersonOn() ? firstPersonSlope : Math.tan(aimPitch));
const mouseLookActive = () => !touchUI && document.pointerLockElement === renderer.domElement;

const weaponBolts = []; // летящие заряды
const weaponFx = []; // вспышки у ствола и попадания: { mesh, life, max, grow }

const canUseWeapon = () =>
  !drivingCar && !pushingCar && !dialogueOpen && !settingsOpen;

function drawWeapon(id) {
  const w = WEAPONS[id];
  if (!w || !heroEquip.weapons.includes(id) || !canUseWeapon()) return false; // достают только из ячеек оружия
  if (heroWeapon.id) holsterWeapon(true);
  heroWeapon.id = id;
  heroWeapon.last = id;
  setActiveWeaponSlot(id);
  const rifle = w.hold === 'rifle';
  if (w.model) heroWeapon.mesh = player.attach(rifle ? 'rifle' : 'handR', w.model());
  player.setAim(rifle ? 'rifle' : true);
  playWeaponSound('draw');
  updateWeaponHud();
  renderEquipHud(); // активная ячейка подсвечивается: оружие в руках
  return true;
}

function holsterWeapon(quiet = false) {
  if (!heroWeapon.id) return;
  if (heroWeapon.mesh && heroWeapon.mesh.parent) heroWeapon.mesh.parent.remove(heroWeapon.mesh);
  heroWeapon.mesh = null;
  heroWeapon.id = null;
  heroWeapon.mouseHeld = false;
  heroWeapon.turbo = false;
  heroWeapon.aimFrames = 0;
  stopCharge();
  heroWeapon.spin = 0;
  if (beamOn) stopBeam();
  player.setAim(false);
  if (!quiet) playWeaponSound('holster');
  updateWeaponHud();
  renderEquipHud();
}

function toggleWeapon() {
  if (heroWeapon.id) {
    holsterWeapon();
    return;
  }
  // Достаем из активной ячейки, а если она пуста — первое оружие из ячеек
  const id = activeWeaponId();
  if (id) drawWeapon(id);
  else if (inventory.items.some(isWeapon)) {
    showToast(touchUI ? 'Оружие лежит в инвентаре: откройте его и коснитесь оружия, чтобы взять в ячейку'
      : 'Оружие лежит в инвентаре: откройте его (I) и перетащите оружие в активную ячейку справа');
  }
  // оружия у героя нет совсем: R ничего не делает, никаких сообщений
}

// Следующее оружие из активных ячеек по кругу (R, колесо вниз); dir = −1 — предыдущее (колесо вверх).
// Одно оружие — подсказка, что сменить не на что
function nextWeapon(dir = 1) {
  const ids = weaponSlotIds();
  if (!ids.length) return toggleWeapon();
  if (!heroWeapon.id) return drawWeapon(activeWeaponId());
  const i = ids.indexOf(heroWeapon.id);
  const id = ids[(i + dir + ids.length) % ids.length];
  if (id === heroWeapon.id) return showToast('В других ячейках оружия нет — возьмите еще в тире');
  if (drawWeapon(id)) showToast(WEAPONS[id].name, 1500);
}

// Куда целиться мышью: точка на высоте груди под курсором (в мировых координатах). Если курсор на цели —
// ее центр. null — курсора над сценой нет
const aimRaycaster = new THREE.Raycaster();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.3);
const aimPoint = new THREE.Vector3();
function mouseAimPoint() {
  // На телефоне целится кнопка огня с прицелом-гироскопом (src/engine/touch.js): touchAim — его точка или null
  if (heroWeapon.touchAim) return heroWeapon.touchAim();
  if (mouseLookActive()) return null; // мышь захвачена: стреляем по взгляду камеры (с доводом)
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
// Автонаведение можно выключить в настройках (вкладка «Режим боя») — тогда заряд летит ровно по взгляду
function assistTarget(w, heading) {
  if (firstPersonOn()) return null; // от первого лица автонаведения нет: куда смотрит перекрестие, туда и летит
  if (typeof settings !== 'undefined' && !settings.autoAim) return null;
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

// Упреждение: заряд летит не мгновенно, поэтому по движущейся цели целимся туда, где она будет, когда
// заряд долетит (скорость цели — по ее последним кадрам, t.hist). Только для зарядов, летящих по прямой
const LEAD_KINDS = ['pulse', 'spread', 'canister', 'rail'];
function leadAim(w, t) {
  const h = t.hist;
  if (!LEAD_KINDS.includes(w.kind) || h.length < 5) return { x: t.x, z: t.z };
  const a = h[h.length - 5];
  const b = h[h.length - 1];
  const frames = Math.hypot(t.x - playerWorldX, t.z - playerWorldZ) / w.speed;
  return { x: t.x + ((b.x - a.x) / 4) * frames, z: t.z + ((b.z - a.z) / 4) * frames };
}

// Куда стрелять: курс героя на точку aim (или по взгляду с доводом, если aim нет). Цель под курсором или
// найденная доводом — с упреждением
function aimHeadingFor(w, aim) {
  let heading = playerHeading;
  const t = aim ? combatTargets.find((c) => !c.dead && Math.abs(c.x - aim.x) + Math.abs(c.z - aim.z) < 0.01) : assistTarget(w, playerHeading);
  if (t) aim = leadAim(w, t);
  if (aim) {
    const dx = aim.x - playerWorldX;
    const dz = aim.z - playerWorldZ;
    if (Math.hypot(dx, dz) > 0.3) heading = Math.atan2(-dx, -dz);
  }
  return { heading, aim };
}

// Оружие с накоплением: копия записи, в которой урон, толчок, шатание и вспышка — по набранному заряду
const lerpRange = ([a, b], k) => a + (b - a) * k;
function chargedWeapon(w, power) {
  const c = w.charge;
  return Object.assign({}, w, {
    damage: Math.round(lerpRange(c.damage, power)),
    push: lerpRange(c.push, power),
    effects: Object.assign({}, w.effects, { stagger: Math.round(lerpRange(c.stagger, power)) }),
    hitFx: power >= 0.95 ? 'blast' : w.hitFx,
    elixir: c.elixir ? lerpRange(c.elixir, power) : w.elixir,
    // Волна длиннее по заряду (геометрия та же, растянута по длине — см. fireWeapon)
    wave: w.wave && c.length ? Object.assign({}, w.wave, { length: w.wave.length * lerpRange(c.length, power) }) : w.wave,
  });
}

// Один выстрел. aim — точка в мире или null (по взгляду с доводом); power — набранный заряд (оружие с charge)
function fireWeapon(aim, power) {
  let w = WEAPONS[heroWeapon.id];
  if (!w || !canUseWeapon() || heroWeapon.cooldown > 0) return false;
  if (w.charge) w = chargedWeapon(w, power || 0);
  if (heroWeapon.overheated) {
    if (heroWeapon.sinceShot > 20) playWeaponSound('dry');
    heroWeapon.sinceShot = 0;
    return false;
  }
  // Супероружие тратит эликсир; не хватает — сухой щелчок и подсказка
  if (w.elixir && !spendWeaponElixir(w.elixir)) {
    if (heroWeapon.sinceShot > 20) {
      playWeaponSound('dry');
      showToast(w.name + ': нет эликсира. Дробовик и «Метроном» стреляют без него');
    }
    heroWeapon.sinceShot = 0;
    return false;
  }
  let heading;
  ({ heading, aim } = aimHeadingFor(w, aim));
  const dirX = -Math.sin(heading);
  const dirZ = -Math.cos(heading);
  // Корпус разворачивается к цели, заряд выходит из дула (справа от груди)
  heroWeapon.aimHeading = heading;
  heroWeapon.aimFrames = 45;
  const { x, y, z } = muzzleAt(w, heading);
  const kind = WEAPON_KINDS[w.kind];
  if (kind && kind.fire) kind.fire(w, { x, y, z, dirX, dirZ, heading, aim, slope: aimSlope() });
  else spawnBolt(w, x, y, z, dirX, dirZ);
  // Заряд с накоплением: чем больше набрано, тем толще волна и ярче вспышка
  const scale = w.charge ? lerpRange(w.charge.scale, power) : 1;
  if (w.charge) {
    const stretch = w.charge.length ? lerpRange(w.charge.length, power) : 1;
    weaponBolts[weaponBolts.length - 1].mesh.scale.set(scale, scale, stretch);
  }
  if (!w.noFlash) spawnWeaponFx(x, y, z, w.color, 0.14 * scale, 5, 1.12); // вспышка у ствола

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
  if (w.charge && power >= 0.95) playWeaponSound('blast');
  else if (w.sound) playWeaponSound(w.sound);
  return true;
}

// ---------- Эликсир ----------
// Шкала эликсира — heroStats.elixir из heroStats.maxElixir (фиолетовая полоса, src/player/equipment.js).
// Трата выстрела — доля полной шкалы. Списываем сами, а панель перерисовываем не чаще четырех раз в секунду:
// огнемет стреляет 15 раз в секунду (spendElixir из equipment.js перерисовывает панель на каждый вызов)
let elixirHudDirty = false;
let elixirHudAt = 0;
function spendWeaponElixir(frac) {
  const amount = frac * heroStats.maxElixir;
  if (heroStats.elixir < amount) return false;
  heroStats.elixir = Math.max(0, heroStats.elixir - amount);
  elixirHudDirty = true;
  return true;
}
function updateElixirHud() {
  const now = performance.now();
  if (!elixirHudDirty || now - elixirHudAt < 250) return;
  elixirHudDirty = false;
  elixirHudAt = now;
  renderEquipHud();
}

// ---------- Накопление заряда ----------
// Пока кнопка зажата — заряд растет, корпус смотрит на цель, гудит; отпустили — выстрел силой заряда
function updateCharge(w) {
  const held = heroWeapon.mouseHeld || keys['KeyK'];
  const aimNow = () => (heroWeapon.mouseHeld ? mouseAimPoint() : null);
  if (held && canUseWeapon() && heroWeapon.cooldown === 0) {
    if (!heroWeapon.charging) {
      heroWeapon.charging = true;
      heroWeapon.chargeByMouse = heroWeapon.mouseHeld;
      heroWeapon.chargeStart = performance.now();
      startChargeSound(w.charge.time);
    }
    // По часам, а не по кадрам: на медленном компьютере полный заряд — те же 1,2 секунды
    heroWeapon.charge = Math.min(1, (performance.now() - heroWeapon.chargeStart) / (w.charge.time * 1000));
    heroWeapon.aimHeading = aimHeadingFor(w, aimNow()).heading;
    heroWeapon.aimFrames = 45;
    return;
  }
  if (!heroWeapon.charging) return;
  const power = heroWeapon.charge;
  // Отпустили: точка — под курсором (если копили мышью), иначе по взгляду
  const aim = heroWeapon.chargeByMouse ? mouseAimPoint() : null;
  stopCharge();
  if (!canUseWeapon()) return;
  if (power >= w.charge.min) fireWeapon(aim, power);
  else playWeaponSound('dry'); // отпустили слишком рано — заряд рассеялся
}

// Где дуло оружия w, если герой развернут на heading (в мире)
function muzzleAt(w, heading) {
  const m = w.muzzle;
  return {
    x: playerWorldX - Math.sin(heading) * m.forward + Math.cos(heading) * m.right,
    y: player.position.y + m.up,
    z: playerWorldZ - Math.cos(heading) * m.forward - Math.sin(heading) * m.right,
  };
}

// ---------- Непрерывный луч (плазмомет) ----------
// Щелчок — обычный выстрел (шар плазмы, на нажатие). Держат дольше beam.delay — луч: от дула до первой цели
// или стены. Урон — порциями раз в beam.every кадров, эликсир — понемногу каждый кадр; кончился — луч гаснет.
// Луч — светящаяся сердцевина и толстое мерцающее свечение, на конце — искры
const beamParts = (() => {
  const g = new THREE.Group();
  const add = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1), new THREE.MeshBasicMaterial({ color: 0xeaffea, ...add }));
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 1), new THREE.MeshBasicMaterial({ color: 0x5cff6a, opacity: 0.55, ...add }));
  const halo = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 1), new THREE.MeshBasicMaterial({ color: 0x2aff4a, opacity: 0.18, ...add }));
  for (const m of [core, glow, halo]) {
    m.position.z = 0.5; // начало — у дула, тянется по +Z
    g.add(m);
  }
  g.visible = false;
  cityGroup.add(g);
  return { g, glow, halo };
})();
let beamOn = false;
let beamFrame = 0;
function updateBeam(w) {
  const held = (heroWeapon.mouseHeld || keys['KeyK']) && canUseWeapon();
  const long = held && performance.now() - heroWeapon.holdAt > w.beam.delay * 1000;
  if (!long || !spendWeaponElixir(w.beam.elixir / 60)) {
    if (long && heroWeapon.sinceShot > 30) {
      playWeaponSound('dry');
      showToast(w.name + ': нет эликсира');
      heroWeapon.sinceShot = 0;
    }
    if (beamOn) stopBeam();
    return;
  }
  if (!beamOn) {
    beamOn = true;
    startBeamSound();
  }
  beamFrame++;
  const { heading } = aimHeadingFor(w, heroWeapon.mouseHeld ? mouseAimPoint() : null);
  heroWeapon.aimHeading = heading;
  heroWeapon.aimFrames = 45;
  heroWeapon.sinceShot = 0;
  const m = muzzleAt(w, heading);
  const dx = -Math.sin(heading);
  const dz = -Math.cos(heading);
  const slope = aimSlope();
  // Идем по лучу шагами по 0,3 до цели, стены, земли или дальности
  let len = 0;
  let hit = null;
  while (len < w.beam.range) {
    len += 0.3;
    const x = m.x + dx * len;
    const z = m.z + dz * len;
    const y = m.y + slope * len;
    hit = targetAt(x, z, y);
    if (hit || y < 0 || boltBlocked(x, z)) break;
  }
  len = Math.min(len, w.beam.range);
  const ex = m.x + dx * len;
  const ez = m.z + dz * len;
  const ey = m.y + slope * len;
  const { g, glow, halo } = beamParts;
  g.visible = true;
  g.position.set(m.x, m.y, m.z);
  g.rotation.set(-Math.atan(slope), Math.atan2(dx, dz), 0, 'YXZ');
  g.scale.set(1, 1, len * Math.sqrt(1 + slope * slope));
  const flick = 0.8 + Math.random() * 0.4;
  glow.scale.set(flick, flick, 1);
  halo.scale.set(1.2 - flick * 0.3, 1.2 - flick * 0.3, 1);
  if (beamFrame % w.beam.every === 0) {
    if (hit) {
      weaponHit(w, hit, ex, ey, ez, dx, dz, { damage: Math.round((w.beam.dps * w.beam.every) / 60) });
    } else if (len < w.beam.range) spawnWeaponFx(ex, Math.max(0.05, ey), ez, w.color, 0.12, 6, 1.15); // искры о стену или землю
  }
  if (beamFrame % 3 === 0) spawnWeaponFx(ex + (Math.random() - 0.5) * 0.3, Math.max(0.05, ey) + (Math.random() - 0.5) * 0.3, ez + (Math.random() - 0.5) * 0.3, w.color, 0.08, 6, 1.2);
}
function stopBeam() {
  beamOn = false;
  beamParts.g.visible = false;
  stopBeamSound();
}
// Гул луча: два низких тона с дрожанием, пока луч горит
let beamHum = null;
function startBeamSound() {
  stopBeamSound();
  if (typeof muted !== 'undefined' && (muted || !audioUnlocked)) return;
  if (!weaponCtx) weaponCtx = new (window.AudioContext || window.webkitAudioContext)();
  const ctx = weaponCtx;
  const g = ctx.createGain();
  g.gain.value = 0.1 * (typeof effectsGain === 'function' ? effectsGain() : 1);
  g.connect(ctx.destination);
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 13;
  lfoGain.gain.value = 25;
  lfo.connect(lfoGain);
  const oscs = [['sawtooth', 110], ['square', 220]].map(([type, f]) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    lfoGain.connect(o.frequency);
    o.connect(g);
    o.start();
    return o;
  });
  lfo.start();
  beamHum = { g, oscs: [...oscs, lfo] };
}
function stopBeamSound() {
  if (!beamHum) return;
  for (const o of beamHum.oscs) o.stop();
  beamHum.g.disconnect();
  beamHum = null;
}

// ---------- Раскрутка стволов (пулемет) ----------
// Зажали — стволы раскручиваются за spinUp секунд (по часам), раскрутились — очередь; отпустили — стволы
// останавливаются вдвое медленнее, и если отпустить ненадолго, стрелять можно сразу
function updateSpin(w) {
  const now = performance.now();
  const dt = Math.min(0.1, (now - (heroWeapon.spinAt || now)) / 1000);
  heroWeapon.spinAt = now;
  const held = (heroWeapon.mouseHeld || heroWeapon.turbo || keys['KeyK']) && canUseWeapon();
  const before = heroWeapon.spin;
  heroWeapon.spin = Math.max(0, Math.min(1, heroWeapon.spin + (held ? dt / w.spinUp : -dt / (w.spinUp * 2))));
  if (held && before === 0) playWeaponSound('spinup');
  if (held && heroWeapon.spin >= 1) fireWeapon(heroWeapon.mouseHeld || heroWeapon.turbo ? mouseAimPoint() : null);
  else if (held) {
    // Пока раскручивается — корпус уже смотрит на цель
    heroWeapon.aimHeading = aimHeadingFor(w, heroWeapon.mouseHeld || heroWeapon.turbo ? mouseAimPoint() : null).heading;
    heroWeapon.aimFrames = 45;
  }
  const spin = heroWeapon.mesh && heroWeapon.mesh.userData.spin;
  if (spin) spin.rotation.z += heroWeapon.spin * 0.7;
}

function stopCharge() {
  heroWeapon.charging = false;
  heroWeapon.charge = 0;
  stopChargeSound();
}

// ---------- Заряды ----------
const boltGeoCore = new THREE.BoxGeometry(0.06, 0.06, 1.1);
const boltGeoGlow = new THREE.BoxGeometry(0.18, 0.18, 1.5);

// Шар плазмы: белое ядро и большое цветное свечение. Трассер: тонкая длинная нить
const boltGeos = {
  pulse: [boltGeoCore, boltGeoGlow],
  orb: [new THREE.SphereGeometry(0.12, 10, 8), new THREE.SphereGeometry(0.32, 12, 10)],
  tracer: [new THREE.BoxGeometry(0.03, 0.03, 1.3), new THREE.BoxGeometry(0.07, 0.07, 1.6)],
};

// Заряд; range — своя дальность (дробинки разлетаются на разное расстояние); dy — подъем на единицу пути
// (наклон прицела). Возвращает заряд
function spawnBolt(w, x, y, z, dx, dz, range = w.range, dy = aimSlope()) {
  if (w.bolt === 'wave') return spawnWaveBolt(w, x, y, z, dx, dz, dy);
  const [core, glow] = boltGeos[w.bolt] || boltGeos.pulse;
  const mesh = new THREE.Group();
  mesh.add(new THREE.Mesh(core, new THREE.MeshBasicMaterial({ color: w.bolt === 'tracer' ? 0xfff2c0 : 0xffffff })));
  mesh.add(
    new THREE.Mesh(
      glow,
      new THREE.MeshBasicMaterial({ color: w.color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
    ),
  );
  mesh.position.set(x, y, z);
  mesh.rotation.set(-Math.atan(dy), Math.atan2(dx, dz), 0, 'YXZ');
  cityGroup.add(mesh);
  const b = { w, x, y, z, dx, dz, dy, traveled: 0, range, mesh };
  weaponBolts.push(b);
  return b;
}

// Волна: голова заряда — в начале координат, хвост тянется назад по -Z на length. Геометрия и материалы
// общие для всех зарядов одного оружия (создаются при первом выстреле)
const waveCache = {};
function waveParts(w) {
  if (waveCache[w.id]) return waveCache[w.id];
  const { length: L, amplitude: A, wavelength: lambda } = WEAPONS[w.id].wave; // всегда исходная длина: заряженный выстрел растягивает меш
  // Синусоида с огибающей: у головы и хвоста амплитуда сходит на нет — получается «пакет»
  const curve = (plane) => {
    const pts = [];
    const n = Math.round((L / lambda) * 16);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const zz = -L * t;
      const a = A * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.7) * Math.sin((2 * Math.PI * zz) / lambda);
      pts.push(plane === 'v' ? new THREE.Vector3(0, a, zz) : new THREE.Vector3(a, 0, zz));
    }
    return new THREE.CatmullRomCurve3(pts);
  };
  const add = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
  const segs = Math.round((L / lambda) * 24);
  const parts = {
    geos: [
      new THREE.TubeGeometry(curve('v'), segs, 0.05, 5),
      new THREE.TubeGeometry(curve('h'), segs, 0.04, 5),
      new THREE.TubeGeometry(curve('v'), segs, 0.11, 5),
      new THREE.BoxGeometry(0.05, 0.05, L).translate(0, 0, -L / 2),
      new THREE.SphereGeometry(0.17, 10, 8),
    ],
    mats: [
      new THREE.MeshBasicMaterial({ color: w.color, ...add, opacity: 0.95 }), // электрическое поле
      new THREE.MeshBasicMaterial({ color: 0xbfefff, ...add, opacity: 0.7 }), // магнитное поле
      new THREE.MeshBasicMaterial({ color: w.color, ...add, opacity: 0.25 }), // ореол
      new THREE.MeshBasicMaterial({ color: 0xffffff, ...add, opacity: 0.8 }), // ось
      new THREE.MeshBasicMaterial({ color: 0xe8fbff, ...add, opacity: 0.95 }), // голова
    ],
  };
  waveCache[w.id] = parts;
  return parts;
}

function spawnWaveBolt(w, x, y, z, dx, dz, dy) {
  const { geos, mats } = waveParts(w);
  const mesh = new THREE.Group();
  const body = new THREE.Group(); // всё, что тянется хвостом; растет из дула и втягивается в цель
  geos.slice(0, 4).forEach((g, i) => body.add(new THREE.Mesh(g, mats[i])));
  body.scale.z = 0.01;
  mesh.add(body);
  mesh.add(new THREE.Mesh(geos[4], mats[4]));
  mesh.position.set(x, y, z);
  mesh.rotation.set(-Math.atan(dy), Math.atan2(dx, dz), 0, 'YXZ');
  cityGroup.add(mesh);
  weaponBolts.push({ w, x, y, z, dx, dz, dy, traveled: 0, mesh, body, shared: true, fade: 0 });
}

const boltBlocked = (x, z) => (insideBuilding() ? blockedInside(x, z) : blockedOutsideStatic(x, z));

// Как blockedOutside, но без людей: заряд летит в стены, деревья, машины. Людей пока не задевает —
// стрельба по прохожим не предусмотрена (см. weapons.md)
function blockedOutsideStatic(x, z) {
  if (!insideWorldCircle(x, z, 0.5)) return true;
  for (const t of nearbyTrees(x, z)) if (Math.hypot(x - t.x, z - t.z) < 0.4 * t.s) return true;
  for (const s of obstacleShapes) if (Math.abs(x - s.x) < s.hu && Math.abs(z - s.z) < s.hv) return true;
  for (const c of cars) {
    const s = carShape(c.x, c.z, c.heading, c.half);
    const lu = (x - s.x) * s.ux + (z - s.z) * s.uz;
    const lv = (x - s.x) * s.vx + (z - s.z) * s.vz;
    if (Math.abs(lu) < s.hu && Math.abs(lv) < s.hv) return true;
  }
  return false;
}

function updateBolts() {
  for (let i = weaponBolts.length - 1; i >= 0; i--) {
    const b = weaponBolts[i];
    // Волна попала: голова стоит в цели, хвост втягивается за несколько кадров
    if (b.fade > 0) {
      b.fade--;
      b.body.scale.z = Math.min(b.body.scale.z, (b.fade / 6) * Math.min(1, b.traveled / b.w.wave.length));
      b.mesh.children[1].visible = false;
      if (b.fade === 0) removeBolt(i);
      continue;
    }
    let done = false;
    // Шагами по 0,4: быстрый заряд не проскакивает тонкие цели
    const steps = Math.ceil(b.w.speed / 0.4);
    const step = b.w.speed / steps;
    for (let s = 0; s < steps && !done; s++) {
      b.x += b.dx * step;
      b.z += b.dz * step;
      b.y += b.dy * step;
      b.traveled += step;
      const t = targetAt(b.x, b.z, b.y);
      if (t) {
        weaponHit(b.w, t, b.x, b.y, b.z, b.dx, b.dz);
        if (!b.w.quietHit) playWeaponSound('hit');
        done = true;
      } else if (b.y < 0.05 || boltBlocked(b.x, b.z)) {
        b.y = Math.max(0.05, b.y); // выстрел вниз — заряд бьет в землю
        spawnWeaponFx(b.x, b.y, b.z, b.w.color, 0.15, 8, 1.15);
        done = true;
      } else if (b.traveled >= (b.range || b.w.range)) {
        done = true;
      }
    }
    b.mesh.position.set(b.x, b.y, b.z);
    if (b.body) {
      b.body.scale.z = Math.max(0.01, Math.min(1, b.traveled / b.w.wave.length)); // хвост не торчит из-за спины
      b.mesh.rotation.z = Math.sin(b.traveled * 0.7) * 0.25; // поле чуть «дышит» вокруг оси
    }
    if (done) {
      if (b.body) b.fade = 6;
      else removeBolt(i);
    }
  }
}

function removeBolt(i) {
  const b = weaponBolts[i];
  cityGroup.remove(b.mesh);
  if (!b.shared) b.mesh.children.forEach((m) => m.material.dispose());
  weaponBolts.splice(i, 1);
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
  if (heroWeapon.id && (!heroEquip.weapons.includes(heroWeapon.id) || drivingCar || pushingCar)) holsterWeapon(true);

  const w = WEAPONS[heroWeapon.id];
  // Турбо (ПКМ зажата): как будто игрок часто-часто щелкает ЛКМ отдельными нажатиями. Это не то же, что держать ЛКМ: зажатая ЛКМ — другой режим (очередь, заряд,
  // луч плазмомета), и пока она зажата, турбо щелчки не делает. Скорость ограничена перезарядкой оружия. Пулемет со стволами: нажатие не стреляет, ему нужна раскрутка,
  // поэтому турбо держит ее
  if (w && heroWeapon.turbo && !heroWeapon.mouseHeld && !w.spinUp) {
    if (--heroWeapon.tapIn <= 0) {
      heroWeapon.tapIn = 4; // 15 щелчков в секунду
      if (w.charge) fireWeapon(mouseAimPoint(), 0.06); // щелчок по оружию с накоплением — самая слабая волна
      else fireWeapon(mouseAimPoint());
    }
  }
  if (heroWeapon.cooldown > 0) heroWeapon.cooldown--;
  heroWeapon.sinceShot++;
  if (w && w.charge) updateCharge(w);
  else if (w && w.spinUp) updateSpin(w);
  else if (w && w.beam) updateBeam(w);
  else if (w) {
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
  // С накоплением: катушки разгораются от тусклого к белому и пульсируют все чаще, у дула растет шар
  if (w && w.charge && heroWeapon.mesh) {
    const k = heroWeapon.charge;
    const pulse = k > 0 ? 0.8 + 0.2 * Math.sin(performance.now() / (120 - 90 * k)) : 1;
    const c = weaponGlowColor.set(w.color).multiplyScalar(0.55 + 0.45 * k).lerp(weaponWhite, k * 0.7).multiplyScalar(pulse);
    for (const m of heroWeapon.mesh.userData.glow || []) m.color.copy(c);
    const orb = heroWeapon.mesh.userData.chargeOrb;
    if (orb) {
      orb.visible = heroWeapon.charging;
      orb.scale.setScalar((0.03 + 0.11 * k) * pulse);
    }
  } else if (heroWeapon.mesh && heroWeapon.mesh.userData.glow) {
    const c = weaponGlowColor.set(w.color).lerp(weaponHotColor, heroWeapon.heat);
    if (heroWeapon.overheated && Math.floor(performance.now() / 150) % 2) c.multiplyScalar(0.4);
    for (const m of heroWeapon.mesh.userData.glow) m.color.copy(c);
  }
  updateBolts();
  for (const k in WEAPON_KINDS) if (WEAPON_KINDS[k].update) WEAPON_KINDS[k].update();
  updateWeaponFx();
  updateWeaponHud();
  updateWeaponCard();
  updateElixirHud();
}
const weaponGlowColor = new THREE.Color();
const weaponHotColor = new THREE.Color(0xffc060);
const weaponWhite = new THREE.Color(0xffffff);

// ---------- Панель оружия (справа внизу) ----------
const weaponHud = document.createElement('div');
weaponHud.id = 'weaponHud';
weaponHud.style.cssText =
  'position:fixed;right:14px;bottom:72px;z-index:20;display:none;min-width:190px;padding:8px 10px;' +
  'background:rgba(0,0,0,0.55);color:#fff;font: var(--fs-text) var(--font);border-radius:6px;pointer-events:none';
weaponHud.innerHTML =
  '<div id="weaponName" style="font-weight:bold"></div>' +
  '<div style="font-size: var(--fs-small);color:#ff8a7a;margin-bottom:5px">Боевой режим: бег · Shift — шагом</div>' +
  '<div id="weaponBar" style="height:7px;background:rgba(255,255,255,0.15);border-radius:3px;overflow:hidden">' +
  '<div id="weaponHeat" style="height:100%;width:0"></div></div>' +
  '<div id="weaponHint" style="margin-top:5px;font-size: var(--fs-small);opacity:0.75"></div>';
document.body.appendChild(weaponHud);
const weaponHudParts = {
  name: weaponHud.querySelector('#weaponName'),
  heat: weaponHud.querySelector('#weaponHeat'),
  bar: weaponHud.querySelector('#weaponBar'),
  hint: weaponHud.querySelector('#weaponHint'),
};
let weaponHudKey = '';

function updateWeaponHud() {
  const w = WEAPONS[heroWeapon.id];
  const bar = w && w.charge ? heroWeapon.charge : heroWeapon.heat;
  const key = w ? w.id + '|' + Math.round(bar * 50) + '|' + heroWeapon.overheated + '|' + mouseLookActive() : '';
  if (key === weaponHudKey) return;
  weaponHudKey = key;
  weaponHud.style.display = w ? 'block' : 'none';
  if (!w) return;
  weaponHudParts.name.textContent = w.name;
  // Шкала — только у оружия с накоплением (перегрева у оружия нет)
  weaponHudParts.bar.style.display = w.charge || w.heat ? 'block' : 'none';
  weaponHudParts.heat.style.width = Math.round(bar * 100) + '%';
  if (w.charge) {
    // Шкала заряда: голубая, полная — белая
    weaponHudParts.heat.style.background = bar >= 1 ? '#ffffff' : '#4ee6ff';
    weaponHudParts.hint.textContent =
      bar >= 1 ? 'Заряд полный — отпустите' : 'ЛКМ — выстрел, зажать — супервыстрел · ' + weaponKeysHint();
    return;
  }
  weaponHudParts.heat.style.background = heroWeapon.overheated ? '#e0483a' : heroWeapon.heat > 0.7 ? '#e8b83a' : '#4ee6ff';
  weaponHudParts.hint.textContent = heroWeapon.overheated
    ? 'Перегрев — остывает'
    : w.beam
      ? 'ЛКМ — выстрел, зажать — луч · ' + weaponKeysHint()
      : (mouseLookActive() ? 'ЛКМ — огонь · ' : 'ЛКМ — огонь по курсору · ') + weaponKeysHint();
}
// Мышь захвачена — целятся ею и меняют оружие колесом; иначе — клавиши
function weaponKeysHint() {
  return mouseLookActive()
    ? 'мышь — прицел · колесо или R — сменить · Q или Esc — убрать'
    : 'K — по взгляду · колесо или R — сменить · Q — убрать';
}

// ---------- Карточка оружия (только компьютер, боевой режим) ----------
// Справа от инвентаря: крупный значок оружия в руках (две клетки) и три полоски — насколько хорошо оно
// поражает роботов, биосуществ и как далеко бьет. Цифры не задаются вручную, а считаются из записи оружия
// (урон, скорострельность, дробь, сгустки, перескоки, луч, накопление) и таблицы ENEMY_KINDS (combat.js),
// поэтому новое оружие и правка цифр сразу видны на карточке. Полная полоска — лучшее оружие в игре.
function weaponDps(w) {
  let per = w.damage;
  if (w.spread) per *= w.spread.pellets;
  if (w.stream) per *= w.stream.perShot;
  if (w.arc) for (let i = 1, k = w.arc.falloff; i < w.arc.chains; i++, k *= w.arc.falloff) per += w.damage * k;
  let dps = per * w.fireRate;
  if (w.charge) dps = Math.max(dps, w.charge.damage[1] / w.charge.time);
  if (w.beam) dps = Math.max(dps, w.beam.dps);
  return dps;
}
// Множитель урона по виду врага: 0 — иммунитет; плазмомет (hitsAll) иммунитет не держит
function weaponKindMult(w, kind) {
  const m = ENEMY_KINDS[kind].weak[w.type];
  const mult = m === undefined ? 1 : m;
  return w.hitsAll ? Math.max(mult, 1) : mult;
}
// Доли 0..1 для трех полосок. Урон — под корнем: слабое оружие не сливается с нулем, а ноль (иммунитет)
// остается пустой полоской
function weaponRatings(w) {
  const all = Object.values(WEAPONS);
  const eff = (x, kind) => weaponDps(x) * weaponKindMult(x, kind);
  const best = Math.max(1, ...all.map((x) => Math.max(eff(x, 'robot'), eff(x, 'bio'))));
  const far = Math.max(1, ...all.map((x) => x.range));
  return {
    robot: Math.sqrt(eff(w, 'robot') / best),
    bio: Math.sqrt(eff(w, 'bio') / best),
    range: w.range / far,
  };
}

const weaponCardBars = [
  { key: 'robot', label: 'Роботы', color: '#8fb8ff' },
  { key: 'bio', label: 'Био', color: '#7be07b' },
  { key: 'range', label: 'Дальность', color: '#ffd84a' },
];
const weaponCard = document.createElement('div');
weaponCard.id = 'weaponCard';
weaponCard.style.cssText =
  'display:none;align-items:center;gap:10px;padding:6px 10px 6px 6px;border:1px solid rgba(255,255,255,0.3);' +
  'border-radius:8px;background:rgba(10,14,20,0.62);color:#fff;font: var(--fs-text) var(--font);pointer-events:none';
weaponCard.innerHTML =
  '<div style="width:84px;height:84px;box-sizing:border-box;border:1px solid rgba(255,255,255,0.28);border-radius:4px;' +
  'background:rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center">' +
  '<img id="weaponCardIcon" style="width:72px;height:72px;image-rendering:pixelated" /></div>' +
  '<div style="display:flex;flex-direction:column;gap:7px">' +
  weaponCardBars
    .map(
      (b) =>
        '<div><div style="font-size: var(--fs-small);opacity:0.8;margin-bottom:2px">' + b.label + '</div>' +
        '<div style="width:130px;height:9px;background:rgba(255,255,255,0.15);border-radius:4px;overflow:hidden">' +
        '<div data-bar="' + b.key + '" style="height:100%;width:0;background:' + b.color + '"></div></div></div>',
    )
    .join('') +
  '</div>';
(document.getElementById('topLeft') || document.body).appendChild(weaponCard);
let weaponCardKey = '';
function updateWeaponCard() {
  const w = !touchUI && inCombatMode() ? WEAPONS[heroWeapon.id] : null;
  const key = w ? w.id : '';
  if (key === weaponCardKey) return;
  weaponCardKey = key;
  weaponCard.style.display = w ? 'flex' : 'none';
  if (!w) return;
  weaponCard.querySelector('#weaponCardIcon').src = pixelIconURL(w.icon);
  const r = weaponRatings(w);
  for (const b of weaponCardBars) weaponCard.querySelector('[data-bar="' + b.key + '"]').style.width = Math.round(r[b.key] * 100) + '%';
}

// ---------- Звук (синтез, как шаги в src/player/footsteps.js) ----------
let weaponCtx = null;
// Гул накопления: тон растет от низкого к высокому за time секунд и держится, пока кнопка зажата
let chargeHum = null;
function startChargeSound(time) {
  stopChargeSound();
  if (typeof muted !== 'undefined' && (muted || !audioUnlocked)) return;
  if (!weaponCtx) weaponCtx = new (window.AudioContext || window.webkitAudioContext)();
  const ctx = weaponCtx;
  const now = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, now);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.12 * (typeof effectsGain === 'function' ? effectsGain() : 1)), now + 0.15); // экспонента не доходит до 0
  g.connect(ctx.destination);
  const oscs = [['sawtooth', 90, 520], ['sine', 180, 1500]].map(([type, f0, f1]) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, now);
    o.frequency.exponentialRampToValueAtTime(f1, now + time);
    o.connect(g);
    o.start(now);
    return o;
  });
  chargeHum = { g, oscs };
}
function stopChargeSound() {
  if (!chargeHum) return;
  const t = weaponCtx.currentTime;
  chargeHum.g.gain.cancelScheduledValues(t);
  chargeHum.g.gain.setValueAtTime(chargeHum.g.gain.value, t);
  chargeHum.g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  for (const o of chargeHum.oscs) o.stop(t + 0.06);
  chargeHum = null;
}

// ---------- Записанные звуки (audio/weapons/) ----------
// Набор звуков, у которого есть запись, играет файл; пока файл не загрузился (или не грузится — игра открыта
// как файл, без сервера) — синтез из playWeaponSound. Громкость — та же группа «Звуки» в настройках.
//   shot — файл на каждый выстрел (одновременно не больше трех, старый затихает)
//   loop — файл звучит по кругу, пока идут выстрелы, и затихает, когда стрельба прекратилась;
//          from/to — кусок файла для круга, start — файл, который звучит один раз в начале очереди
const WEAPON_SAMPLES = {
  pulse: { loop: 'impulse', from: 0.3, to: 21.3, vol: 0.8 }, // импульсный лазер
  flame: { loop: 'fire_2', start: 'fire', vol: 0.7 }, // плазменный огнемет
  plasma: { shot: 'plasma_gun', vol: 0.8 }, // плазмомет
  shotgun: { shot: 'shotgun', vol: 1 }, // дробовик
};
const weaponSampleFiles = {}; // имя файла → ArrayBuffer, потом AudioBuffer
for (const s of Object.values(WEAPON_SAMPLES)) {
  for (const name of [s.shot, s.loop, s.start]) {
    if (!name || name in weaponSampleFiles) continue;
    weaponSampleFiles[name] = null;
    fetch('audio/weapons/' + name + '.mp3')
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((b) => b && (weaponSampleFiles[name] = b))
      .catch(() => {});
  }
}
function weaponSample(ctx, name) {
  const f = weaponSampleFiles[name];
  if (!f) return null;
  if (f instanceof ArrayBuffer) {
    weaponSampleFiles[name] = 'decoding';
    ctx.decodeAudioData(f).then((buf) => (weaponSampleFiles[name] = buf), () => (weaponSampleFiles[name] = null));
    return null;
  }
  return f === 'decoding' ? null : f;
}
const weaponVoices = {}; // набор → звучащие выстрелы
const weaponLoops = {}; // набор → { g, srcs, timer }
const fadeOut = (ctx, g, srcs, tail = 0.08) => {
  const t = ctx.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setTargetAtTime(0, t, tail / 3);
  for (const s of srcs) s.stop(t + tail * 2);
};
// Сыграть запись для набора kind; false — записи нет или она еще не готова
function playWeaponSample(ctx, kind, gain) {
  const s = WEAPON_SAMPLES[kind];
  if (!s) return false;
  const vol = gain * (s.vol || 1);
  const play = (buf, offset = 0, loop = null) => {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (loop) {
      src.loop = true;
      src.loopStart = loop.from || 0;
      src.loopEnd = Math.min(loop.to || buf.duration, buf.duration);
    }
    src.start(ctx.currentTime, offset);
    return src;
  };
  if (s.shot) {
    const buf = weaponSample(ctx, s.shot);
    if (!buf) return false;
    const g = ctx.createGain();
    g.gain.value = vol;
    g.connect(ctx.destination);
    const src = play(buf);
    src.connect(g);
    const voices = (weaponVoices[kind] = weaponVoices[kind] || []);
    const voice = { g, src };
    voices.push(voice);
    src.onended = () => voices.includes(voice) && voices.splice(voices.indexOf(voice), 1);
    if (voices.length > 3) {
      const old = voices.shift();
      fadeOut(ctx, old.g, [old.src]);
    }
    return true;
  }
  const buf = weaponSample(ctx, s.loop);
  if (!buf) return false;
  let l = weaponLoops[kind];
  if (!l) {
    const g = ctx.createGain();
    g.connect(ctx.destination);
    const srcs = [play(buf, s.from || 0, s)];
    const startBuf = s.start && weaponSample(ctx, s.start);
    if (startBuf) srcs.push(play(startBuf));
    for (const src of srcs) src.connect(g);
    l = weaponLoops[kind] = { g, srcs, timer: 0 };
  }
  l.g.gain.setValueAtTime(vol, ctx.currentTime); // громкость могли поменять посреди очереди
  // Нет нового выстрела 0,3 с — очередь кончилась, звук затихает
  clearTimeout(l.timer);
  l.timer = setTimeout(() => {
    fadeOut(ctx, l.g, l.srcs, 0.15);
    delete weaponLoops[kind];
  }, 300);
  return true;
}

function playWeaponSound(kind) {
  if (typeof muted !== 'undefined' && (muted || !audioUnlocked)) return;
  if (!weaponCtx) weaponCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (weaponCtx.state === 'suspended') weaponCtx.resume();
  const ctx = weaponCtx;
  for (const name in weaponSampleFiles) weaponSample(ctx, name); // загруженные файлы — сразу в декодирование
  const gain = typeof effectsGain === 'function' ? effectsGain() : 1;
  if (playWeaponSample(ctx, kind, gain)) return;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.35 * gain;
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
  } else if (kind === 'plasma') {
    // Плазмомет: мягкий «буль» с шипением
    tone('sine', 900, 160, 0.14, 0.3);
    tone('triangle', 420, 90, 0.16, 0.2);
    noise(0.08, 0.25, 1800, 'bandpass');
  } else if (kind === 'minigun') {
    // Пулемет: короткий сухой хлопок, двадцать в секунду сливаются в рев
    noise(0.045, 0.45, 700, 'lowpass');
    tone('square', 140, 70, 0.04, 0.18);
  } else if (kind === 'spinup') {
    // Раскрутка стволов: моторный вой вверх
    tone('sawtooth', 80, 420, 0.5, 0.12);
    tone('sine', 160, 840, 0.5, 0.08);
  } else if (kind === 'shotgun') {
    // Дробовик: тяжелый выстрел и щелчок помпы следом
    noise(0.3, 0.7, 600, 'lowpass');
    tone('sine', 120, 40, 0.3, 0.6);
    tone('square', 900, 700, 0.03, 0.15, 0.42);
    tone('square', 600, 500, 0.03, 0.15, 0.52);
  } else if (kind === 'blast') {
    // Полный заряд: низкий удар, треск и долгий спад
    tone('sawtooth', 900, 60, 0.5, 0.4);
    tone('sine', 140, 40, 0.6, 0.6);
    tone('square', 2400, 300, 0.2, 0.2);
    noise(0.45, 0.6, 400, 'lowpass');
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
  } else if (kind === 'rail') {
    // Гаусс: короткий визг разгона и сухой треск сверхзвука
    tone('sawtooth', 400, 3200, 0.06, 0.18);
    noise(0.12, 0.6, 1500);
    tone('square', 120, 40, 0.2, 0.3);
  } else if (kind === 'collapse') {
    // Схлопнулся вакуумный коридор: глухой «вумп»
    tone('sine', 90, 30, 0.35, 0.5);
    noise(0.25, 0.25, 400, 'lowpass');
  } else if (kind === 'flame') {
    noise(0.12, 0.25, 700, 'lowpass');
    tone('sawtooth', 70, 55, 0.12, 0.08);
  } else if (kind === 'cryo') {
    tone('square', 300, 140, 0.06, 0.25); // хлопок вышибного заряда
    noise(0.1, 0.25, 5000);
  } else if (kind === 'freeze') {
    noise(0.45, 0.3, 6000); // шипение азота
    tone('sine', 1800, 2400, 0.25, 0.08);
  } else if (kind === 'shatter') {
    // Лед разлетелся: звон стекла
    for (let i = 0; i < 5; i++) tone('triangle', 2000 + Math.random() * 3000, 1500, 0.15, 0.12, i * 0.025);
    noise(0.2, 0.4, 3500);
  } else if (kind === 'arc') {
    noise(0.14, 0.4, 2000, 'bandpass');
    tone('sawtooth', 60, 55, 0.14, 0.25);
  } else if (kind === 'tachyon') {
    // Обратный звук: тон растет, а не падает
    tone('sine', 200, 2400, 0.16, 0.3);
    tone('triangle', 100, 1200, 0.16, 0.15);
  } else if (kind === 'rocket') {
    // Базука: глухой хлопок вышибного заряда и шипение разгонного двигателя
    tone('sine', 160, 50, 0.25, 0.5);
    noise(0.15, 0.5, 500, 'lowpass');
    noise(0.7, 0.25, 2500);
  } else if (kind === 'explosion') {
    // Взрыв ракеты: тяжелый удар и долгий рокочущий спад
    tone('sine', 110, 28, 0.8, 0.8);
    tone('sawtooth', 300, 40, 0.5, 0.25);
    noise(0.9, 0.8, 350, 'lowpass');
    noise(0.25, 0.4, 2000);
  } else if (kind === 'echo') {
    // Сработал упреждающий удар: звенящее эхо
    tone('sine', 2400, 600, 0.3, 0.25);
    tone('sine', 1800, 450, 0.3, 0.2, 0.06);
  }
}

// ---------- Ввод ----------
window.addEventListener('keydown', (e) => {
  if (e.repeat || settingsOpen || dialogueOpen) return;
  if (e.code === 'KeyQ') toggleWeapon();
  if (e.code === 'KeyK') heroWeapon.holdAt = performance.now();
  if (e.code === 'KeyR') nextWeapon();
  if (e.code === 'KeyK' && heroWeapon.id && !WEAPONS[heroWeapon.id].charge && !WEAPONS[heroWeapon.id].spinUp) fireWeapon(null);
});
// ЛКМ по сцене с оружием в руках — огонь. Клик по подсвеченной вещи берет вещь (src/engine/input.js), не стреляет
renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button !== 0 || !heroWeapon.id || hoveredPickable) return;
  heroWeapon.mouseHeld = true;
  heroWeapon.holdAt = performance.now();
  const w = WEAPONS[heroWeapon.id];
  if (!w.charge && !w.spinUp) fireWeapon(mouseAimPoint()); // с накоплением — выстрел, когда отпустят; пулемет — когда раскрутится
});
// ПКМ с оружием в руках: пока она зажата — турбо, частые отдельные щелчки ЛКМ (см. updateWeapons)
renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button !== 2 || !heroWeapon.id || drivingCar || settingsOpen || dialogueOpen) return;
  e.preventDefault();
  heroWeapon.turbo = true;
  heroWeapon.tapIn = 0; // первый щелчок сразу
});
renderer.domElement.addEventListener('contextmenu', (e) => {
  if (heroWeapon.id) e.preventDefault(); // без меню браузера: правая кнопка — турбо
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 0) heroWeapon.mouseHeld = false;
  if (e.button === 2) heroWeapon.turbo = false;
});
window.addEventListener('blur', () => {
  heroWeapon.mouseHeld = false;
  heroWeapon.turbo = false;
});
