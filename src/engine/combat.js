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
//   hitTarget(t, { damage: 12, type: 'energy', x, z }) → сколько урона прошло
//   removeCombatTarget(t)
//   updateCombat() — раз в кадр из главного цикла: полоски здоровья, цифры урона, вспышки

const combatTargets = [];
const combatFx = []; // летящие цифры урона: { sprite, life, vy }

function addCombatTarget(def) {
  const t = Object.assign({ name: '', r: 0.6, height: 2, hp: 100, weak: {}, dead: false, flash: 0 }, def);
  t.maxHp = t.maxHp || t.hp;
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

// Попадание: урон × множитель weak[тип]. Возвращает, сколько урона прошло (0 — цель уже лежит)
function hitTarget(t, hit) {
  if (t.dead) return 0;
  const mult = t.weak[hit.type] !== undefined ? t.weak[hit.type] : 1;
  const dmg = Math.round(hit.damage * mult);
  t.hp = Math.max(0, t.hp - dmg);
  t.flash = 6;
  t.lastHit = performance.now();
  drawHpBar(t);
  // Цифра урона: белая — обычный, желтая — слабое место, серая — почти не прошло
  const color = mult >= 1.5 ? '#ffe066' : mult < 0.5 ? '#9aa3ad' : '#ffffff';
  spawnDamageNumber(mult < 0.5 && dmg <= 3 ? 'блок ' + dmg : String(dmg), t, color);
  if (t.onHit) t.onHit(t, hit, dmg);
  if (t.hp <= 0) {
    t.dead = true;
    if (t.onDeath) t.onDeath(t);
  }
  return dmg;
}

// Вернуть цель к жизни с полным здоровьем (манекены встают сами)
function reviveTarget(t) {
  t.dead = false;
  t.hp = t.maxHp;
  drawHpBar(t);
}

// В какую живую цель попадает точка (x, y, z); y — высота над землей
function targetAt(x, z, y = 1) {
  for (const t of combatTargets) {
    if (t.dead) continue;
    if (y < 0 || y > t.height) continue;
    if (Math.hypot(x - t.x, z - t.z) < t.r) return t;
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

// ---------- Цифры урона ----------
function spawnDamageNumber(text, t, color) {
  const cv = document.createElement('canvas');
  const c = cv.getContext('2d');
  c.font = 'bold 40px sans-serif';
  cv.width = Math.ceil(c.measureText(text).width) + 12;
  cv.height = 48;
  c.font = 'bold 40px sans-serif';
  c.textBaseline = 'top';
  c.lineWidth = 6;
  c.strokeStyle = 'rgba(0,0,0,0.8)';
  c.strokeText(text, 6, 4);
  c.fillStyle = color;
  c.fillText(text, 6, 4);
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  const s = 0.012;
  sprite.scale.set(cv.width * s, cv.height * s, 1);
  sprite.renderOrder = 11;
  sprite.position.set(t.x + (Math.random() - 0.5) * 0.6, t.height + 0.9, t.z);
  cityGroup.add(sprite);
  combatFx.push({ sprite, life: 50, vy: 0.03 });
}

// ---------- Вспышка модели при попадании ----------
const hitFlashColor = new THREE.Color(0xffffff);
function setHitFlash(t, k) {
  t.mesh.traverse((o) => {
    if (!o.isMesh || !o.material || !o.material.color || o.userData.noFlash) return;
    if (!o.userData.hitBaseColor) {
      o.material = o.material.clone();
      o.userData.hitBaseColor = o.material.color.clone();
    }
    o.material.color.copy(o.userData.hitBaseColor).lerp(hitFlashColor, k);
  });
}

function updateCombat() {
  for (const t of combatTargets) {
    if (t.update) t.update(t);
    if (t.mesh && t.flash > 0) {
      t.flash--;
      setHitFlash(t, (t.flash / 6) * 0.8);
    }
  }
  for (let i = combatFx.length - 1; i >= 0; i--) {
    const f = combatFx[i];
    f.life--;
    f.sprite.position.y += f.vy;
    f.sprite.material.opacity = Math.min(1, f.life / 20);
    if (f.life <= 0) {
      cityGroup.remove(f.sprite);
      f.sprite.material.map.dispose();
      f.sprite.material.dispose();
      combatFx.splice(i, 1);
    }
  }
}
