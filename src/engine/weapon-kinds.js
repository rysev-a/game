// src/engine/weapon-kinds.js
// ВИДЫ ОРУЖИЯ сверх 'pulse' (docs/mechanics/weapons.md). Каждый вид — запись WEAPON_KINDS[вид] =
// { fire(w, shot), update() }: fire вызывается на каждый выстрел (shot — дуло { x, y, z }, направление
// { dirX, dirZ }, heading и точка прицела aim или null), update — раз в кадр из updateWeapons.
// Параметры вида берутся из записи оружия (src/player/weapons.js), попадания — через weaponHit.
//
//   'rail'     — гаусс: сверхзвуковой сердечник прошивает цели насквозь, за ним вакуумный коридор,
//                который через долю секунды схлопывается и стягивает к линии выстрела цели и вещи
//   'stream'   — плазмомет: поток сгустков плазмы, прожигает броню (melt), поджигает (burn), оставляет
//                горящие лужи плазмы на земле и у стен
//   'canister' — крио: капсула с жидким азотом замораживает цель и всё рядом; удар kinetic по льду
//                раскалывает его (combat.js: shatterTarget)
//   'arc'      — разрядник: молния бьет в цель и перескакивает на соседние, парализует (shock)
//   'tachyon'  — тахионный пистолет: заряд летит назад во времени — попадает туда, где цель БЫЛА
//                (pastFrames назад); промах оставляет «эхо» на линии выстрела, и цель, которая пересечет
//                ее в ближайшие секунды, получит удар задним числом
//
// Подключается после src/engine/weapons.js и до src/player/weapons.js.

// Расстояние от точки (px, pz) до отрезка (ax, az)–(bx, bz) и ближайшая точка на нем
function segmentClosest(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const len2 = vx * vx + vz * vz || 1;
  const k = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / len2));
  const cx = ax + vx * k;
  const cz = az + vz * k;
  return { d: Math.hypot(px - cx, pz - cz), x: cx, z: cz, k };
}

// Где луч из (x, z) по (dx, dz) упирается в стену (не дальше range): длина свободного пути
function freePath(x, z, dx, dz, range, step = 0.3) {
  for (let d = step; d < range; d += step) if (boltBlocked(x + dx * d, z + dz * d)) return d;
  return range;
}

const additive = (color, opacity = 0.9) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

// ================= ГАУСС: 'rail' =================
// w.rail: { pull — радиус, на котором схлопывание тянет к линии; pullForce; collapseAfter — кадров }
const rails = [];
const slugGeo = new THREE.BoxGeometry(0.09, 0.09, 0.7);
const corridorGeo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);

WEAPON_KINDS.rail = {
  fire(w, s) {
    const len = freePath(s.x, s.z, s.dirX, s.dirZ, w.range);
    const slug = new THREE.Mesh(slugGeo, additive(0xffffff, 1));
    slug.rotation.y = Math.atan2(s.dirX, s.dirZ);
    // Вакуумный коридор: прозрачная труба от дула до сердечника
    const corridor = new THREE.Mesh(corridorGeo, additive(w.color, 0.28));
    corridor.material.side = THREE.DoubleSide;
    corridor.position.set(s.x, s.y, s.z);
    corridor.rotation.y = slug.rotation.y;
    corridor.scale.set(0.35, 0.35, 0.01);
    cityGroup.add(slug, corridor);
    rails.push({ w, ...s, len, traveled: 0, slug, corridor, hit: [], age: 0, collapsed: false });
    playWeaponSound('rail');
  },
  update() {
    for (let i = rails.length - 1; i >= 0; i--) {
      const r = rails[i];
      r.age++;
      if (r.traveled < r.len) {
        // Сердечник летит быстро и прошивает всех на пути (каждую цель — один раз)
        const steps = Math.ceil(r.w.speed / 0.4);
        for (let k = 0; k < steps && r.traveled < r.len; k++) {
          r.traveled = Math.min(r.len, r.traveled + r.w.speed / steps);
          const x = r.x + r.dirX * r.traveled;
          const z = r.z + r.dirZ * r.traveled;
          const t = targetAt(x, z, r.y, r.hit);
          if (t) {
            r.hit.push(t);
            weaponHit(r.w, t, x, r.y, z, r.dirX, r.dirZ);
            playWeaponSound('hit');
          }
        }
        r.slug.position.set(r.x + r.dirX * r.traveled, r.y, r.z + r.dirZ * r.traveled);
        r.corridor.scale.z = r.traveled;
        if (r.traveled >= r.len) {
          spawnWeaponFx(r.slug.position.x, r.y, r.slug.position.z, 0xffffff, 0.25, 8, 1.2);
          cityGroup.remove(r.slug);
          r.slug.material.dispose();
        }
      }
      // Схлопывание: через collapseAfter кадров труба сжимается, вдоль линии бегут кольца,
      // цели и вещи рядом тянет к линии выстрела
      const c = r.w.rail;
      if (!r.collapsed && r.age >= c.collapseAfter) {
        r.collapsed = true;
        playWeaponSound('collapse');
        const ax = r.x;
        const az = r.z;
        const bx = r.x + r.dirX * r.traveled;
        const bz = r.z + r.dirZ * r.traveled;
        const pull = (px, pz, apply) => {
          const p = segmentClosest(px, pz, ax, az, bx, bz);
          if (p.d > c.pull || p.d < 0.05) return;
          const f = c.pullForce * (1 - p.d / c.pull);
          apply(((p.x - px) / p.d) * f, ((p.z - pz) / p.d) * f);
        };
        for (const t of combatTargets) {
          if (t.dead) continue;
          pull(t.x + t.off.x, t.z + t.off.z, (vx, vz) => {
            pushTarget(t, vx, vz);
            applyStatus(t, 'stagger', 25);
          });
        }
        for (const l of looseObjects) pull(l.x, l.z, (vx, vz) => pushLoose(l, vx * 1.6, vz * 1.6));
        for (let d = 2; d < r.traveled; d += 3) {
          spawnShockRing(ax + r.dirX * d, r.y, az + r.dirZ * d, r.w.color, 0.25, 10, 0.86); // кольца сжимаются
        }
      }
      if (r.collapsed) {
        r.corridor.scale.x *= 0.7;
        r.corridor.scale.y *= 0.7;
        r.corridor.material.opacity *= 0.85;
        if (r.corridor.scale.x < 0.02) {
          cityGroup.remove(r.corridor);
          r.corridor.material.dispose();
          if (r.slug.parent) cityGroup.remove(r.slug);
          rails.splice(i, 1);
        }
      } else {
        // Пока коридор держится, он дрожит
        const k = 0.35 + Math.sin(r.age * 1.7) * 0.04;
        r.corridor.scale.x = r.corridor.scale.y = k;
      }
    }
  },
};

// ================= ПЛАЗМОМЕТ: 'stream' =================
// w.stream: { perShot — сгустков за выстрел, spread — разброс (рад), speed, drag, life — кадров,
//             pool: { chance, r, life, damage, every } — лужи плазмы }
let flameSoundCount = 0;
const plasmaBlobs = [];
const plasmaPools = [];
const blobGeo = new THREE.SphereGeometry(1, 8, 6);
const poolGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);

function spawnPlasmaPool(w, x, z) {
  const p = w.stream.pool;
  // Рядом уже горит лужа — подпитать ее, а не плодить новую
  const near = plasmaPools.find((o) => Math.hypot(o.x - x, o.z - z) < p.r);
  if (near) {
    near.life = Math.min(p.life * 1.5, near.life + p.life * 0.3);
    return;
  }
  if (plasmaPools.length >= 40) return;
  const mesh = new THREE.Group();
  const outer = new THREE.Mesh(poolGeo, additive(w.color, 0.55));
  const inner = new THREE.Mesh(poolGeo, additive(0xffe08a, 0.6));
  inner.scale.setScalar(0.55);
  inner.position.y = 0.01;
  mesh.add(outer, inner);
  mesh.position.set(x, 0.04, z);
  mesh.scale.setScalar(p.r * 0.3);
  cityGroup.add(mesh);
  plasmaPools.push({ w, x, z, mesh, life: p.life, max: p.life, age: 0 });
}

WEAPON_KINDS.stream = {
  fire(w, s) {
    const st = w.stream;
    for (let i = 0; i < st.perShot; i++) {
      const a = s.heading + (Math.random() - 0.5) * 2 * st.spread;
      const dx = -Math.sin(a);
      const dz = -Math.cos(a);
      const m = new THREE.Mesh(blobGeo, additive(Math.random() < 0.3 ? 0xffe08a : w.color, 0.85));
      m.scale.setScalar(0.12);
      m.position.set(s.x, s.y, s.z);
      cityGroup.add(m);
      const v = st.speed * (0.85 + Math.random() * 0.3);
      plasmaBlobs.push({ w, x: s.x, y: s.y, z: s.z, vx: dx * v, vz: dz * v, vy: -0.004, life: st.life, max: st.life, m, phase: Math.random() * 6 });
    }
    if (flameSoundCount++ % 4 === 0) playWeaponSound('flame');
  },
  update() {
    for (let i = plasmaBlobs.length - 1; i >= 0; i--) {
      const b = plasmaBlobs[i];
      const st = b.w.stream;
      b.life--;
      b.x += b.vx;
      b.z += b.vz;
      b.y = Math.max(0.15, b.y + b.vy);
      b.vy -= 0.0015; // липкий газ оседает
      b.vx *= st.drag;
      b.vz *= st.drag;
      b.phase += 0.5;
      const age = 1 - b.life / b.max;
      // Сгусток раздувается и мерцает: магнитное поле держит его, но он растекается
      b.m.scale.setScalar(0.12 + age * 0.55 + Math.sin(b.phase) * 0.04);
      b.m.material.opacity = 0.85 * (1 - age * 0.6);
      b.m.position.set(b.x + Math.sin(b.phase) * 0.06, b.y, b.z + Math.cos(b.phase) * 0.06);
      let end = b.life <= 0;
      const t = targetAt(b.x, b.z, b.y);
      if (t) {
        weaponHit(b.w, t, b.x, b.y, b.z, b.vx, b.vz);
        end = true;
        if (Math.random() < st.pool.chance * 0.5) spawnPlasmaPool(b.w, t.x + t.off.x + (Math.random() - 0.5), t.z + t.off.z + (Math.random() - 0.5));
      } else if (boltBlocked(b.x, b.z)) {
        end = true; // о стену: плазма стекает к ее подножию
        if (Math.random() < st.pool.chance * 2) spawnPlasmaPool(b.w, b.x - b.vx * 3, b.z - b.vz * 3);
      } else if (end && Math.random() < st.pool.chance) {
        spawnPlasmaPool(b.w, b.x, b.z);
      }
      if (end) {
        cityGroup.remove(b.m);
        b.m.material.dispose();
        plasmaBlobs.splice(i, 1);
      }
    }
    // Лужи: горят, растут до своего размера, жгут всех, кто в них стоит, и гаснут
    for (let i = plasmaPools.length - 1; i >= 0; i--) {
      const p = plasmaPools[i];
      const pd = p.w.stream.pool;
      p.life--;
      p.age++;
      const k = Math.min(1, p.age / 12) * Math.min(1, p.life / 40);
      p.mesh.scale.setScalar(pd.r * (0.3 + 0.7 * Math.min(1, p.age / 12)) * (1 + Math.sin(p.age * 0.3) * 0.04));
      p.mesh.children[0].material.opacity = 0.5 * k;
      p.mesh.children[1].material.opacity = (0.4 + Math.random() * 0.3) * k;
      if (p.age % pd.every === 0) {
        for (const t of combatTargets) {
          if (t.dead || Math.hypot(t.x + t.off.x - p.x, t.z + t.off.z - p.z) > pd.r + t.r * 0.5) continue;
          hitTarget(t, { damage: pd.damage, type: 'fire', small: true, effects: { burn: { frames: 90, dps: 4 }, melt: 0.02 } });
        }
      }
      if (p.life <= 0) {
        cityGroup.remove(p.mesh);
        p.mesh.children.forEach((m) => m.material.dispose());
        plasmaPools.splice(i, 1);
      }
    }
  },
};

// ================= КРИО: 'canister' =================
// w.canister: { freezeR — радиус заморозки, freeze — кадров льда }
const canisters = [];
function createCanisterMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 8).rotateX(Math.PI / 2), new LitMaterial({ color: 0xe8eef2 }));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 8).rotateX(Math.PI / 2), additive(0x9ff3ff, 1));
  g.add(body, band);
  return g;
}

function cryoBurst(w, x, y, z, direct) {
  const c = w.canister;
  spawnWeaponFx(x, y, z, 0xffffff, 0.3, 10, 1.18);
  spawnWeaponFx(x, y, z, w.color, 0.5, 18, 1.1);
  spawnShockRing(x, 0.1, z, w.color, 0.4, 16, 1.18);
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    spawnWeaponFx(x + Math.cos(a) * 0.8, y - 0.3 + Math.random() * 0.6, z + Math.sin(a) * 0.8, 0xdff9ff, 0.12, 22, 1.08);
  }
  playWeaponSound('freeze');
  // Морозит всех в радиусе (прямое попадание уже наложило лед через effects)
  for (const t of combatTargets) {
    if (t.dead || t === direct) continue;
    if (Math.hypot(t.x + t.off.x - x, t.z + t.off.z - z) < c.freezeR + t.r) applyStatus(t, 'frozen', c.freeze * 0.7);
  }
}

WEAPON_KINDS.canister = {
  fire(w, s) {
    const mesh = createCanisterMesh();
    mesh.position.set(s.x, s.y, s.z);
    mesh.rotation.y = Math.atan2(s.dirX, s.dirZ);
    cityGroup.add(mesh);
    canisters.push({ w, x: s.x, y: s.y, z: s.z, dx: s.dirX, dz: s.dirZ, traveled: 0, mesh });
    playWeaponSound('cryo');
  },
  update() {
    for (let i = canisters.length - 1; i >= 0; i--) {
      const c = canisters[i];
      let done = false;
      const steps = Math.ceil(c.w.speed / 0.4);
      for (let k = 0; k < steps && !done; k++) {
        c.x += (c.dx * c.w.speed) / steps;
        c.z += (c.dz * c.w.speed) / steps;
        c.traveled += c.w.speed / steps;
        const t = targetAt(c.x, c.z, c.y);
        if (t) {
          const wasFrozen = t.status.frozen > 0;
          // Удар капсулы — kinetic: по уже замороженной цели он раскалывает лед, а не морозит снова
          weaponHit(c.w, t, c.x, c.y, c.z, c.dx, c.dz, { effects: wasFrozen ? null : { frozen: c.w.canister.freeze } });
          if (!wasFrozen) cryoBurst(c.w, c.x, c.y, c.z, t);
          done = true;
        } else if (boltBlocked(c.x, c.z)) {
          cryoBurst(c.w, c.x - c.dx * 0.5, c.y, c.z - c.dz * 0.5, null);
          done = true;
        } else if (c.traveled >= c.w.range) {
          cryoBurst(c.w, c.x, 0.3, c.z, null); // упала на землю
          done = true;
        }
      }
      c.mesh.position.set(c.x, c.y - (c.traveled / c.w.range) * 0.6, c.z); // чуть проседает к концу
      c.mesh.rotation.z += 0.4; // крутится в полете
      if (done) {
        cityGroup.remove(c.mesh);
        canisters.splice(i, 1);
      }
    }
  },
};

// ================= РАЗРЯДНИК: 'arc' =================
// w.arc: { chains — сколько всего целей, jump — дальность перескока, falloff — урон на каждом перескоке,
//          seek — радиус, в котором ищем цель у курсора }
const arcs = [];
const arcMats = {};
function arcMaterial(color, opacity) {
  const key = color + '|' + opacity;
  if (!arcMats[key]) arcMats[key] = new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  return arcMats[key];
}

// Ломаная молния между точками: середины смещены случайно, каждый кадр заново
function lightningPoints(pts, jitter) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const n = Math.max(3, Math.round(a.distanceTo(b) / 0.6));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const p = a.clone().lerp(b, t);
      if (k > 0) p.add(new THREE.Vector3((Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter));
      out.push(p);
    }
  }
  out.push(pts[pts.length - 1].clone());
  return out;
}

WEAPON_KINDS.arc = {
  fire(w, s) {
    const a = w.arc;
    const alive = combatTargets.filter((t) => !t.dead);
    const pos = (t) => ({ x: t.x + t.off.x, z: t.z + t.off.z });
    // Первая цель: у курсора, иначе ближайшая в конусе взгляда
    let first = null;
    let best = Infinity;
    for (const t of alive) {
      const p = pos(t);
      const dHero = Math.hypot(p.x - playerWorldX, p.z - playerWorldZ);
      if (dHero > w.range) continue;
      let score;
      if (s.aim) score = Math.hypot(p.x - s.aim.x, p.z - s.aim.z) <= a.seek ? Math.hypot(p.x - s.aim.x, p.z - s.aim.z) : Infinity;
      else {
        let da = Math.atan2(-(p.x - playerWorldX), -(p.z - playerWorldZ)) - s.heading;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        score = Math.abs(da) < 0.5 ? dHero : Infinity;
      }
      if (score < best && freePath(s.x, s.z, (p.x - s.x) / dHero, (p.z - s.z) / dHero, dHero) >= dHero - 1) {
        best = score;
        first = t;
      }
    }
    const pts = [new THREE.Vector3(s.x, s.y, s.z)];
    if (!first) {
      // Никого рядом — разряд бьет в пустоту на короткую дистанцию
      const len = Math.min(7, freePath(s.x, s.z, s.dirX, s.dirZ, 7));
      pts.push(new THREE.Vector3(s.x + s.dirX * len, s.y - 0.4, s.z + s.dirZ * len));
    } else {
      const chain = [first];
      while (chain.length < a.chains) {
        const last = pos(chain[chain.length - 1]);
        let next = null;
        let nd = a.jump;
        for (const t of alive) {
          if (chain.includes(t)) continue;
          const p = pos(t);
          const d = Math.hypot(p.x - last.x, p.z - last.z);
          if (d < nd) {
            nd = d;
            next = t;
          }
        }
        if (!next) break;
        chain.push(next);
      }
      let dmg = w.damage;
      chain.forEach((t) => {
        const p = pos(t);
        pts.push(new THREE.Vector3(p.x, 1.4, p.z));
        weaponHit(w, t, p.x, 1.4, p.z, 0, 0, { damage: Math.round(dmg) });
        dmg *= a.falloff;
      });
    }
    // Три ломаные разной яркости — молния выглядит толще
    const lines = [0xffffff, w.color, w.color].map((c, i) => {
      const line = new THREE.Line(new THREE.BufferGeometry(), arcMaterial(c, i ? 0.6 : 1));
      cityGroup.add(line);
      return line;
    });
    arcs.push({ pts, lines, life: 7 });
    for (const p of pts.slice(1)) spawnWeaponFx(p.x, p.y, p.z, w.color, 0.2, 8, 1.15);
    playWeaponSound('arc');
  },
  update() {
    for (let i = arcs.length - 1; i >= 0; i--) {
      const a = arcs[i];
      a.life--;
      a.lines.forEach((line, k) => {
        line.geometry.setFromPoints(lightningPoints(a.pts, k ? 0.6 : 0.35));
        line.material.opacity = (k ? 0.6 : 1) * Math.min(1, a.life / 4);
      });
      if (a.life <= 0) {
        a.lines.forEach((l) => {
          cityGroup.remove(l);
          l.geometry.dispose();
        });
        arcs.splice(i, 1);
      }
    }
  },
};

// ================= ТАХИОННЫЙ ПИСТОЛЕТ: 'tachyon' =================
// w.tachyon: { pastFrames — на сколько кадров назад смотрит выстрел, echo — кадров живет «эхо» промаха }
const tachyonShots = []; // видимые выстрелы: летят от конца к дулу
const tachyonEchoes = []; // линии промахов, ждут, пока цель их пересечет
const ghosts = new Map(); // цель -> полупрозрачный силуэт в прошлом
const ghostGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

function tachyonLine(w, ax, az, bx, bz, y, opacity) {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ax, y, az), new THREE.Vector3(bx, y, bz)]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: w.color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  cityGroup.add(line);
  return line;
}

WEAPON_KINDS.tachyon = {
  fire(w, s) {
    const tc = w.tachyon;
    const len = freePath(s.x, s.z, s.dirX, s.dirZ, w.range);
    const ex = s.x + s.dirX * len;
    const ez = s.z + s.dirZ * len;
    // Попадание в прошлое: ближайшая по линии цель, чье положение pastFrames назад лежит на линии
    let hit = null;
    let hitK = 2;
    let hitPos = null;
    for (const t of combatTargets) {
      if (t.dead) continue;
      const past = targetPast(t, tc.pastFrames);
      const p = segmentClosest(past.x, past.z, s.x, s.z, ex, ez);
      if (p.d < t.r + 0.25 && p.k < hitK) {
        hit = t;
        hitK = p.k;
        hitPos = past;
      }
    }
    let endX = ex;
    let endZ = ez;
    if (hit) {
      endX = hitPos.x;
      endZ = hitPos.z;
      weaponHit(w, hit, hitPos.x, s.y, hitPos.z, s.dirX, s.dirZ);
      spawnWeaponFx(hitPos.x, s.y, hitPos.z, 0xffffff, 0.3, 12, 1.12); // вспышка там, где цель была
    } else {
      // Промах: «эхо» на линии ждет цель, которая ее пересечет
      tachyonEchoes.push({ w, ax: s.x, az: s.z, bx: ex, bz: ez, y: s.y, life: tc.echo, line: tachyonLine(w, s.x, s.z, ex, ez, s.y, 0.35) });
    }
    // Видимый заряд летит НАЗАД: от конца линии к дулу
    const head = new THREE.Mesh(fxGeo, additive(0xffffff, 1));
    head.scale.setScalar(0.16);
    cityGroup.add(head);
    tachyonShots.push({ w, from: { x: endX, z: endZ }, to: { x: s.x, z: s.z }, y: s.y, t: 0, head, trail: tachyonLine(w, endX, endZ, endX, endZ, s.y, 0.9) });
    playWeaponSound('tachyon');
  },
  update() {
    for (let i = tachyonShots.length - 1; i >= 0; i--) {
      const s = tachyonShots[i];
      s.t = Math.min(1, s.t + 0.2);
      const x = s.from.x + (s.to.x - s.from.x) * s.t;
      const z = s.from.z + (s.to.z - s.from.z) * s.t;
      s.head.position.set(x, s.y, z);
      s.trail.geometry.setFromPoints([new THREE.Vector3(s.from.x, s.y, s.from.z), new THREE.Vector3(x, s.y, z)]);
      if (s.t >= 1) {
        s.trail.material.opacity *= 0.7;
        s.head.visible = false;
        if (s.trail.material.opacity < 0.05) {
          cityGroup.remove(s.head, s.trail);
          s.head.material.dispose();
          s.trail.geometry.dispose();
          s.trail.material.dispose();
          tachyonShots.splice(i, 1);
        }
      }
    }
    // Эхо: кто пересек линию — получает удар (задним числом: выстрел уже был)
    for (let i = tachyonEchoes.length - 1; i >= 0; i--) {
      const e = tachyonEchoes[i];
      e.life--;
      e.line.material.opacity = 0.15 + 0.25 * Math.abs(Math.sin(e.life * 0.25));
      let fired = false;
      for (const t of combatTargets) {
        if (t.dead) continue;
        const p = segmentClosest(t.x + t.off.x, t.z + t.off.z, e.ax, e.az, e.bx, e.bz);
        if (p.d < t.r) {
          weaponHit(e.w, t, p.x, e.y, p.z, 0, 0);
          spawnShockRing(p.x, e.y, p.z, e.w.color, 0.3, 14, 1.2);
          playWeaponSound('echo');
          fired = true;
          break;
        }
      }
      if (fired || e.life <= 0) {
        cityGroup.remove(e.line);
        e.line.geometry.dispose();
        e.line.material.dispose();
        tachyonEchoes.splice(i, 1);
      }
    }
    // Силуэты целей в прошлом — видны, пока тахионный пистолет в руках: туда и надо стрелять
    const w = WEAPONS[heroWeapon.id];
    const show = w && w.kind === 'tachyon';
    for (const t of combatTargets) {
      let g = ghosts.get(t);
      if (show && !t.dead) {
        if (!g) {
          g = new THREE.Mesh(ghostGeo, additive(w.color, 0.18));
          g.scale.set(t.r * 1.6, t.height, t.r * 1.6);
          cityGroup.add(g);
          ghosts.set(t, g);
        }
        const p = targetPast(t, w.tachyon.pastFrames);
        g.position.set(p.x, 0, p.z);
        g.visible = Math.hypot(p.x - t.x - t.off.x, p.z - t.z - t.off.z) > 0.3; // стоящая цель — без силуэта
      } else if (g) {
        cityGroup.remove(g);
        g.material.dispose();
        ghosts.delete(t);
      }
    }
  },
};
