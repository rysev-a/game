// src/engine/combat.js
// БОЕВАЯ ПЛАТФОРМА: цели и урон (docs/mechanics/combat.md). Цель — всё, во что можно попасть из оружия
// или ударить: манекен в тире, существо, босс. Оружие (src/engine/weapons.js) ничего не знает о конкретных
// целях: оно ищет их в combatTargets и наносит урон своего типа через hitTarget. Поэтому новый враг —
// это одна запись addCombatTarget, а новое оружие сразу по нему попадает.
//
//   const t = addCombatTarget({
//     name: 'Манекен', x, z,          // где стоит (мировые координаты; двигать — менять t.x, t.z)
//     r: 0.6, height: 2.3,            // круг попадания и высота
//     hp: 120,
//     weak: { energy: 0.25 },         // множители урона по типу (energy, melee, area...), по умолчанию 1
//     mesh,                           // модель в cityGroup: мигает при попадании, над ней полоска здоровья
//     onHit(t, hit), onDeath(t),      // что делать при попадании и когда здоровье кончилось
//   });
//   kind: 'robot' | 'bio'           // вид врага (ENEMY_KINDS): его иммунитеты и слабости поверх weak
//   hitTarget(t, { damage: 12, type: 'energy', x, z, effects }) → сколько урона прошло
//   removeCombatTarget(t)
//   updateCombat() — раз в кадр из главного цикла: полоски здоровья, вспышки, состояния
//
// Типы урона: energy (лазер), kinetic (гаусс, капсула крио), plasma и fire (плазма и ее горение),
// cold (холод), electric (разряд), tachyon (тахионы), shrapnel (осколки льда).
//
// СОСТОЯНИЯ ЦЕЛИ (t.status). Их накладывает попадание (hit.effects) или applyStatus(t, имя, значение):
//   stagger: кадры — цель пошатнулась от удара (сбита с шага, движущаяся замирает)
//   frozen: кадры  — заморожена: стоит во льду; удар kinetic по ней ×2 и раскалывает лед —
//                    осколки (shrapnel) бьют всех рядом
//   shock: кадры   — парализована током (не двигается, мерцает)
//   burn: кадры    — горит: каждые 0,25 с урон burnDps / 4 (тип fire)
//   melt: 0..1     — оплавленная броня: множители weak < 1 тянутся к 1 (плазма прожигает броню)
// canMove(t) — может ли цель сейчас двигаться (жива и не заморожена, не парализована, не шатается).
// Сдвиг: pushTarget(t, vx, vz) — толчок; t.off { x, z } — смещение от своего места, само пружинит
// обратно (манекены прикручены к месту). t.hist — где цель была последние 2 секунды (для тахионов).
//
// ВЕЩИ, КОТОРЫЕ ДВИГАЮТСЯ ОТ УДАРОВ (ящики в тире): addLooseObject({ mesh, x, z }) — их толкают и
// притягивают (pushLoose, looseObjects); трение останавливает, мешают препятствия.

const combatTargets = [];

// ВИДЫ ВРАГОВ (docs/mechanics/weapons.md#роботы-и-биосущества). Множитель 0 — иммунитет: такой урон не
// проходит совсем, и плазма огнемета его не прожигает. Вид важнее записи существа: его множители
// перекрывают weak. Плазмомет (hitsAll в записи оружия) бьет всех, иммунитет его не держит.
const ENEMY_KINDS = {
  // Броня и электроника: огонь, плазма огнемета, пули и дробь не берут; ток и импульс — вдвое
  robot: { name: 'Робот', weak: { fire: 0, plasma: 0, kinetic: 0, shrapnel: 0, electric: 2, energy: 2 } },
  // Живая ткань: огонь берет вдвое; ток и импульс по ней не проходят
  bio: { name: 'Биосущество', weak: { fire: 2, plasma: 2, electric: 0, energy: 0 } },
};

function addCombatTarget(def) {
  const t = Object.assign({ name: '', r: 0.6, height: 2, hp: 100, weak: {}, dead: false, flash: 0 }, def);
  t.maxHp = t.maxHp || t.hp;
  if (t.kind && ENEMY_KINDS[t.kind]) t.weak = Object.assign({}, t.weak, ENEMY_KINDS[t.kind].weak);
  t.status = { stagger: 0, frozen: 0, shock: 0, burn: 0, burnDps: 0, melt: 0 };
  t.off = { x: 0, z: 0, vx: 0, vz: 0 };
  t.hist = [];
  if (t.mesh) {
    t.hpBar = createHpBar();
    t.hpBar.position.set(0, t.height + 0.55, 0);
    t.mesh.add(t.hpBar);
    drawHpBar(t);
  }
  combatTargets.push(t);
  return t;
}

function removeCombatTarget(t) {
  const i = combatTargets.indexOf(t);
  if (i >= 0) combatTargets.splice(i, 1);
}

const immuneEffects = ['shock', 'burn', 'melt']; // состояния самого урона: при иммунитете не вешаются

// Попадание: урон × множитель weak[тип]. Возвращает, сколько урона прошло (0 — цель уже лежит)
function hitTarget(t, hit) {
  if (t.dead) return 0;
  let mult = t.weak[hit.type] !== undefined ? t.weak[hit.type] : 1;
  if (mult > 0 && mult < 1 && t.status.melt > 0) mult += (1 - mult) * t.status.melt; // оплавленная броня (иммунитет не плавится)
  if (hit.hitsAll) mult = Math.max(mult, 1); // плазмомет: ни броня, ни иммунитет его не держат
  if (mult === 0 && hit.chip) mult = hit.chip; // chip: иммунитет не абсолютный, часть урона все же проходит (пулемет по роботам)
  // Удар по замороженной цели раскалывает лед: двойной урон и осколки во все стороны
  let shatter = false;
  if (hit.type === 'kinetic' && t.status.frozen > 0) {
    mult *= 2;
    shatter = true;
  }
  const dmg = Math.round(hit.damage * mult);
  t.hp = Math.max(0, t.hp - dmg);
  t.flash = 6;
  t.lastHit = performance.now();
  drawHpBar(t);
  if (shatter) shatterTarget(t);
  else if (hit.effects) {
    for (const k in hit.effects) {
      if (mult === 0 && immuneEffects.includes(k)) continue; // иммунитет: ток не парализует, огонь не жжет
      applyStatus(t, k, hit.effects[k]);
    }
  }
  if (hit.push) pushTarget(t, hit.push.x, hit.push.z);
  if (t.onHit) t.onHit(t, hit, dmg);
  if (t.hp <= 0) {
    t.dead = true;
    if (t.onDeath) t.onDeath(t);
  }
  return dmg;
}

// Вернуть цель к жизни с полным здоровьем (манекены встают сами); состояния снимаются
function reviveTarget(t) {
  t.dead = false;
  t.hp = t.maxHp;
  for (const k in t.status) t.status[k] = 0;
  drawHpBar(t);
}

// ---------- Состояния ----------
function applyStatus(t, name, value) {
  const s = t.status;
  if (name === 'melt') s.melt = Math.min(1, s.melt + value);
  else if (name === 'burn') {
    s.burn = Math.max(s.burn, value.frames);
    s.burnDps = Math.max(s.burnDps, value.dps);
  } else if (name in s) s[name] = Math.max(s[name], value);
}

const canMove = (t) => !t.dead && !t.status.frozen && !t.status.shock && !t.status.stagger;

function pushTarget(t, vx, vz) {
  t.off.vx += vx;
  t.off.vz += vz;
}

// Лед раскололся: осколки бьют всех вокруг (кроме самой цели) и толкают от нее
function shatterTarget(t) {
  t.status.frozen = 0;
  spawnShards(t);
  if (typeof playWeaponSound === 'function') playWeaponSound('shatter');
  for (const o of combatTargets) {
    if (o === t || o.dead) continue;
    const dx = o.x - t.x;
    const dz = o.z - t.z;
    const d = Math.hypot(dx, dz);
    if (d > 4.5) continue;
    hitTarget(o, { damage: 15, type: 'shrapnel', push: { x: (dx / d) * 0.25, z: (dz / d) * 0.25 } });
  }
  for (const l of looseObjects) {
    const dx = l.x - t.x;
    const dz = l.z - t.z;
    const d = Math.hypot(dx, dz);
    if (d < 4.5 && d > 0.01) pushLoose(l, (dx / d) * 0.3, (dz / d) * 0.3);
  }
}

// Осколки льда: голубые кубики разлетаются и падают
const shardGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
const shards = [];
function spawnShards(t) {
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(shardGeo, new THREE.MeshBasicMaterial({ color: i % 3 ? 0xbff4ff : 0xffffff, transparent: true }));
    m.position.set(t.x, 0.6 + Math.random() * 1.6, t.z);
    const a = Math.random() * Math.PI * 2;
    const v = 0.08 + Math.random() * 0.18;
    cityGroup.add(m);
    shards.push({ m, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: 0.05 + Math.random() * 0.12, life: 45 });
  }
}

// Ледяная корка вокруг замороженной цели
const iceGeo = new THREE.BoxGeometry(1, 1, 1);
function updateIceShell(t) {
  const on = t.status.frozen > 0 && !t.dead;
  if (on && !t.ice) {
    t.ice = new THREE.Mesh(iceGeo, new THREE.MeshBasicMaterial({ color: 0xbff0ff, transparent: true, opacity: 0.35, depthWrite: false }));
    t.ice.scale.set(t.r * 2.4, t.height + 0.2, t.r * 2.4);
    cityGroup.add(t.ice);
  }
  if (t.ice) {
    if (!on) {
      cityGroup.remove(t.ice);
      t.ice.material.dispose();
      t.ice = null;
    } else {
      t.ice.position.set(t.x + t.off.x, (t.height + 0.2) / 2, t.z + t.off.z);
      t.ice.material.opacity = 0.2 + 0.2 * Math.min(1, t.status.frozen / 60);
    }
  }
}

// Цвет модели по состоянию: вспышка попадания > лед > ток > огонь
const tintIce = new THREE.Color(0x9fe6ff);
const tintShock = new THREE.Color(0xc8a8ff);
const tintFire = new THREE.Color(0xff8a3a);
function targetTint(t) {
  const s = t.status;
  if (t.flash > 0) return [hitFlashColor, (t.flash / 6) * 0.8];
  if (s.frozen > 0) return [tintIce, 0.6];
  if (s.shock > 0) return [tintShock, Math.random() < 0.5 ? 0.7 : 0.15];
  if (s.burn > 0) return [tintFire, 0.25 + 0.2 * Math.sin(performance.now() / 60)];
  if (s.melt > 0.05) return [tintFire, s.melt * 0.35];
  return null;
}

function updateTargetStatus(t) {
  const s = t.status;
  if (s.stagger > 0) s.stagger--;
  if (s.frozen > 0) s.frozen--;
  if (s.shock > 0) s.shock--;
  if (s.melt > 0) s.melt = Math.max(0, s.melt - 0.0008); // броня медленно остывает
  if (s.burn > 0) {
    s.burn--;
    if (s.burn % 15 === 0 && !t.dead) hitTarget(t, { damage: Math.max(1, Math.round(s.burnDps / 4)), type: 'fire', small: true });
    if (s.burn === 0) s.burnDps = 0;
  }
  // Сдвиг: скорость гаснет, смещение пружинит обратно к месту
  const o = t.off;
  o.x += o.vx;
  o.z += o.vz;
  o.vx *= 0.82;
  o.vz *= 0.82;
  o.x *= 0.93;
  o.z *= 0.93;
  // Где цель была: последние 2 секунды, по кадру
  t.hist.push({ x: t.x + o.x, z: t.z + o.z });
  if (t.hist.length > 120) t.hist.shift();
  if (t.mesh) {
    const tint = targetTint(t);
    if (tint || t.tinted) setTint(t, tint ? tint[0] : hitFlashColor, tint ? tint[1] : 0);
    t.tinted = !!tint;
  }
  updateIceShell(t);
}

// Где цель была frames кадров назад (для тахионов). Нет истории — где она сейчас
function targetPast(t, frames) {
  const h = t.hist;
  if (!h.length) return { x: t.x, z: t.z };
  return h[Math.max(0, h.length - 1 - frames)];
}

// ---------- Вещи, которые двигаются от ударов ----------
const looseObjects = [];
function addLooseObject(o) {
  const l = Object.assign({ vx: 0, vz: 0, r: 0.5 }, o);
  looseObjects.push(l);
  return l;
}
function pushLoose(l, vx, vz) {
  l.vx += vx;
  l.vz += vz;
}
function updateLooseObjects() {
  for (const l of looseObjects) {
    if (Math.abs(l.vx) + Math.abs(l.vz) < 0.0005) continue;
    const nx = l.x + l.vx;
    const nz = l.z + l.vz;
    if (!blockedOutside(nx, l.z, l.r)) l.x = nx;
    else l.vx *= -0.3;
    if (!blockedOutside(l.x, nz, l.r)) l.z = nz;
    else l.vz *= -0.3;
    l.vx *= 0.9;
    l.vz *= 0.9;
    l.mesh.position.x = l.x;
    l.mesh.position.z = l.z;
    l.mesh.rotation.y += (l.vx - l.vz) * 0.5;
  }
}

// В какую живую цель попадает точка (x, y, z); y — высота над землей
function targetAt(x, z, y = 1, skip = null) {
  for (const t of combatTargets) {
    if (t.dead || (skip && skip.includes(t))) continue;
    if (y < 0 || y > t.height) continue;
    if (Math.hypot(x - t.x - t.off.x, z - t.z - t.off.z) < t.r) return t;
  }
  return null;
}

// ---------- Полоска здоровья над целью ----------
function createHpBar() {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 16;
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(1.6, 0.2, 1);
  sprite.renderOrder = 10;
  sprite.userData.canvas = cv;
  return sprite;
}

function drawHpBar(t) {
  if (!t.hpBar) return;
  const cv = t.hpBar.userData.canvas;
  const c = cv.getContext('2d');
  const k = t.hp / t.maxHp;
  c.clearRect(0, 0, cv.width, cv.height);
  c.fillStyle = 'rgba(0,0,0,0.65)';
  c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = k > 0.5 ? '#5ad16a' : k > 0.25 ? '#e8b83a' : '#e0483a';
  c.fillRect(2, 2, (cv.width - 4) * k, cv.height - 4);
  t.hpBar.material.map.needsUpdate = true;
}

// ---------- Цвет модели: вспышка при попадании и состояния ----------
const hitFlashColor = new THREE.Color(0xffffff);
function setTint(t, color, k) {
  t.mesh.traverse((o) => {
    if (!o.isMesh || !o.material || !o.material.color || o.userData.noFlash || o.isSprite) return;
    if (!o.userData.hitBaseColor) {
      o.material = o.material.clone();
      o.userData.hitBaseColor = o.material.color.clone();
    }
    o.material.color.copy(o.userData.hitBaseColor).lerp(color, k);
  });
}

function updateCombat() {
  for (const t of combatTargets) {
    if (t.update) t.update(t);
    if (t.flash > 0) t.flash--;
    updateTargetStatus(t);
  }
  updateLooseObjects();
  for (let i = shards.length - 1; i >= 0; i--) {
    const sh = shards[i];
    sh.m.position.x += sh.vx;
    sh.m.position.z += sh.vz;
    sh.m.position.y = Math.max(0.08, sh.m.position.y + sh.vy);
    sh.vy -= 0.012;
    sh.m.rotation.x += 0.3;
    sh.m.material.opacity = Math.min(1, sh.life / 15);
    if (--sh.life <= 0) {
      cityGroup.remove(sh.m);
      sh.m.material.dispose();
      shards.splice(i, 1);
    }
  }
}
