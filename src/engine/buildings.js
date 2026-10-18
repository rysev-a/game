// src/engine/buildings.js
// ЗДАНИЯ-ЗАГОТОВКИ (docs/mechanics/demo.md, «Здания-заготовки»). Здание описывается один раз —
// модель снаружи, интерьер, станции и жильцы относительно своего центра, без координат карты, —
// а ставится сколько угодно раз: в большом мире один раз в нужном месте, в ДЕМО дважды (пустое и полное).
//
//   defineBuilding('library', {
//     name: 'Библиотека',
//     desc: 'Старое здание...',                     // пара слов для панели справа (src/engine/hoverinfo.js)
//     size: { w: 22, d: 16 },                        // габарит снаружи (для подписи и площадки)
//     exterior({ full }) → { group, obstacles: [{ x, z, hx, hz }], mapShapes: [{ x, z, hx, hz, color }],
//                            door: { x, z } — точка у входа снаружи, fade: [{ mesh, mats, half }],
//                            stations: [станции на улице] }
//     interior({ full }) → { name(floor), floors: [createRoomFloor(...)], bounds, playerRadius,
//                            door: { x, z } — у выхода на 1 этаже, stairs: [{ x, z, floor, to, label }],
//                            stations: [{ floor, x, z, label, act, use }], people: [жильцы], sounds, footsteps }
//     enterLabel, exitLabel                         // подписи у двери
//     lock: { item, text }                          // войти можно только с этой вещью в инвентаре
//   });
//   placeBuilding('library', { x, z, heading, full });
//
// Фасад заготовки смотрит в +Z; heading поворачивает здание вокруг его центра (кратно 90°: 0 — фасад
// на юг, Math.PI — на север, ±Math.PI / 2 — на восток и запад). «Пустое» здание (full: false) — только
// стены, двери и этажи; «полное» — с мебелью, станциями и жильцами.
//
// Жилец: { floor, x, z, yaw, type, gender, opts, name, title, talk(person) → узел диалога }.
// Станция: { floor, x, z, id, label, act, radius } — E рядом выполняет act (внутри: floor — этаж). Если у станции есть
// id, активный квест может перехватить E (interactions в квесте, src/core/game.js: game.interact('station:<id>')).
// Жилец с charId разговаривает по данным (src/content/characters), а talk остается запасным разговором.

const BUILDINGS = {};

// E у станции: сначала квест (если он есть и взял взаимодействие), потом обычное действие станции
const stationAct = (st) => () => {
  if (st.id && typeof questGame !== 'undefined' && questGame.interact('station:' + st.id)) return;
  st.act();
};
const placedBuildings = [];

function defineBuilding(id, def) {
  def.id = id;
  BUILDINGS[id] = def;
  return def;
}

// Интерьеры заготовок стоят за картой дальше дома игрока (z = 3000…3600): у каждого свои этажи.
// Между этажами разных зданий не меньше 600 — currentInterior() узнает здание по z
let nextInteriorZ = 5000;
const interiorFloorGap = 600;

// Поворот точки заготовки вокруг ее центра так же, как group.rotation.y = heading
function rotateLocal(x, z, heading) {
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  return { x: Math.round((x * c + z * s) * 1000) / 1000, z: Math.round((-x * s + z * c) * 1000) / 1000 };
}
// Прямоугольник вдоль осей после поворота на кратный 90° угол
function rotateRect(r, heading, at) {
  const p = rotateLocal(r.x, r.z, heading);
  const quarter = Math.abs(Math.round(heading / (Math.PI / 2))) % 2 === 1;
  return { ...r, x: at.x + p.x, z: at.z + p.z, hx: quarter ? r.hz : r.hx, hz: quarter ? r.hx : r.hz };
}

function placeBuilding(id, { x, z, heading = 0, full = true } = {}) {
  const def = BUILDINGS[id];
  if (!def) throw new Error('Нет заготовки здания: ' + id);
  const at = { x, z };
  const placed = { id, def, x, z, heading, full, interior: null };

  // ---------- Снаружи ----------
  const ext = def.exterior({ full });
  ext.group.position.set(x, 0, z);
  ext.group.rotation.y = heading;
  cityGroup.add(ext.group);
  // Панель справа (src/engine/hoverinfo.js): само здание и помеченные части (userData.hoverInfo)
  addHoverInfo(ext.group, {
    kind: 'Здание',
    name: def.name,
    desc: full ? def.desc || '' : 'Заготовка: только стены, двери и этажи, без мебели и жильцов.',
  });
  registerHoverTree(ext.group);
  for (const o of ext.obstacles || []) addObstacle(rotateRect(o, heading, at));
  for (const m of ext.mapShapes || []) mapObjects.push(rotateRect(m, heading, at));
  for (const f of ext.fade || []) fadeBoxes.push({ fade: 1, ...f });
  const toWorld = (p) => {
    const r = rotateLocal(p.x, p.z, heading);
    return { x: x + r.x, z: z + r.z };
  };
  if (full) {
    for (const st of ext.stations || []) {
      const w = toWorld(st);
      addInteractable({
        priority: 2,
        near: () =>
          !insideBuilding() && !drivingCar && Math.hypot(playerWorldX - w.x, playerWorldZ - w.z) < (st.radius || 2.6),
        prompt: () => (typeof st.label === 'function' ? st.label() : st.label),
        act: stationAct(st),
        use: st.use, // вещь с нижней панели, примененная рядом (src/player/equipment.js)
      });
    }
    // Жильцы на улице (во дворе, у входа): стоят на месте, с ними можно поговорить
    for (const w of ext.people || []) {
      const pos = toWorld(w);
      const mesh = createPerson(w.type || 'casual', personOptions(w));
      const yaw = (w.yaw || 0) + heading;
      mesh.position.set(pos.x, 0, pos.z);
      mesh.rotation.y = yaw;
      mesh.updateWalk(0, 0);
      cityGroup.add(mesh);
      npcs.push({ ...w, mesh, x: pos.x, z: pos.z, yaw, gender: w.gender || 'male', hold: true, phase: 0, amp: 0, kind: 'story' });
    }
  }

  // ---------- Внутри ----------
  if (def.interior) {
    const plan = def.interior({ full });
    const floorZ = plan.floors.map((_, i) => nextInteriorZ + i * interiorFloorGap);
    nextInteriorZ += plan.floors.length * interiorFloorGap;
    const people = [];
    const idef = registerInterior({
      id: id,
      name: plan.name,
      floorZ,
      bounds: plan.bounds,
      playerRadius: plan.playerRadius,
      floors: plan.floors,
      people,
      minimapRange: plan.minimapRange || 40,
      footsteps: plan.footsteps,
    });
    if (plan.sounds) zoneSounds[id] = plan.sounds;
    plan.floors.forEach((floor, i) => {
      floor.group.position.set(0, 0, floorZ[i]);
      cityGroup.add(floor.group);
      registerHoverTree(floor.group);
      for (const f of floor.fadeBoxes) fadeBoxes.push(f);
      for (const m of floor.mapShapes) mapObjects.push({ ...m, z: m.z + floorZ[i] });
    });
    // Вход: снаружи — вход (если нужен ключ или пропуск, def.lock = { item, text }), внутри — выход
    const outside = toWorld(ext.door);
    addInteractable({
      priority: 1,
      clickObject: ext.group, // клик по зданию — идти к двери (src/player/click-move.js)
      walkTo: outside,
      canEnter: () => !(def.lock && !hasItem(def.lock.item)), // дверь светится, только если в нее можно войти (src/quests/guide.js)
      near: () => !insideBuilding() && !drivingCar && Math.hypot(playerWorldX - outside.x, playerWorldZ - outside.z) < doorRadius,
      prompt: () => def.enterLabel || 'E — войти: ' + def.name,
      act: () => {
        if (def.lock && !hasItem(def.lock.item)) {
          showToast(def.lock.text || 'Закрыто', 3500);
          return;
        }
        playerWorldX = plan.door.x;
        playerWorldZ = floorZ[0] + plan.door.z - 1.5;
      },
    });
    addInteractable({
      priority: 1,
      clickPoint: () => {
        const ci = currentInterior();
        return ci && ci.def === idef && ci.floor === 0 ? { x: plan.door.x, z: floorZ[0] + plan.door.z, r: 2.4 } : null;
      },
      near: () => {
        const ci = currentInterior();
        return (
          !!ci && ci.def === idef && ci.floor === 0 &&
          Math.hypot(playerWorldX - plan.door.x, playerWorldZ - floorZ[0] - plan.door.z) < doorRadius
        );
      },
      prompt: () => def.exitLabel || 'E — выйти на улицу',
      act: () => {
        playerWorldX = outside.x;
        playerWorldZ = outside.z;
      },
    });

    const here = (floor, p, r) => {
      const ci = currentInterior();
      return (
        !!ci && ci.def === idef && ci.floor === floor &&
        Math.hypot(playerWorldX - p.x, playerWorldZ - floorZ[floor] - p.z) < r
      );
    };
    // Лестницы со своими подписями: с этажа floor на этаж to
    for (const st of plan.stairs || []) {
      addInteractable({
        priority: 1,
        glowKind: 'floor',
        clickPoint: () => {
          const ci = currentInterior();
          return ci && ci.def === idef && ci.floor === st.floor ? { x: st.x, z: floorZ[st.floor] + st.z, r: 2.4 } : null;
        },
        near: () => here(st.floor, st, doorRadius),
        prompt: () => st.label,
        act: () => {
          const arrive = st.arrive || st;
          playerWorldX = arrive.x;
          playerWorldZ = floorZ[st.to] + arrive.z;
        },
      });
    }
    if (full) {
      for (const st of plan.stations || []) {
        addInteractable({
          priority: 2,
          near: () => !dialogueOpen && here(st.floor, st, st.radius || 2.4),
          prompt: () => (typeof st.label === 'function' ? st.label() : st.label),
          act: stationAct(st),
          use: st.use,
        });
      }
      for (const w of plan.people || []) {
        const mesh = createPerson(w.type || 'casual', personOptions(w));
        mesh.position.set(w.x, 0, w.z);
        mesh.rotation.y = w.yaw || 0;
        mesh.updateWalk(0, 0);
        plan.floors[w.floor].group.add(mesh);
        people.push({ ...w, mesh, gender: w.gender || 'male', yaw: w.yaw || 0, phase: 0, amp: 0, kind: 'story' });
      }
    }
    placed.interior = idef;
    placed.floorZ = floorZ;
  }
  placedBuildings.push(placed);
  return placed;
}

// Внешность жильца: пол, кожа и его opts поверх пресета вида (PERSON_PRESETS)
// Цвет кожи по умолчанию — только если набор персонажа (PERSON_PRESETS) его не задает
const personOptions = (w) => {
  const preset = PERSON_PRESETS[w.type] || {};
  return Object.assign({ gender: w.gender || preset.gender || 'male' }, 'skinColor' in preset ? {} : { skinColor: 0xf0c8a0 }, w.opts || {});
};

// Жильцы зданий с собственным разговором (talk) важнее обычного «Как дела?» (у того priority 1)
const storyPersonNear = () => {
  if (dialogueOpen || drivingCar || pushingCar) return null;
  const p = nearestPerson();
  return p && p.talk ? p : null;
};
addInteractable({
  priority: 2,
  near: () => !!storyPersonNear(),
  prompt: () => {
    const p = storyPersonNear();
    return 'E — поговорить: ' + p.name + (p.title ? ' — ' + p.title : '');
  },
  act: () => {
    const p = storyPersonNear();
    const node = p.charId && typeof questGame !== 'undefined' && questGame.hasDialog(p.charId) ? questGame.dialogue(p.charId) : null;
    startDialogue(p, node || p.talk(p));
  },
});

// Короткий разговор из трех реплик: приветствие, «Что вы знаете?», «Чем можете помочь?»
function simpleTalk(speaker, { hello, knows, help }) {
  return () => {
    const back = { text: 'Еще вопрос.', next: () => root };
    const bye = { text: 'До свидания.', end: true };
    const root = {
      speaker,
      text: hello,
      options: [
        { text: 'Что вы знаете?', next: () => ({ speaker, text: knows, options: [back, bye] }) },
        { text: 'Чем вы можете помочь?', next: () => ({ speaker, text: help, options: [back, bye] }) },
        bye,
      ],
    };
    return root;
  };
}

// ---------- Комната (этаж интерьера) ----------
// Пол, стены по периметру (полупрозрачные, когда заслоняют игрока), проем двери на южной стене (+Z).
//   createRoomFloor({ w, d, wallH, floorColor, plank, wallColor, doorGap, doorX })
// Возвращает { group, solids, fadeBoxes, mapShapes, part, furniture, wall, addSolid }:
//   part(w, h, d, color, x, y, z)   — бокс с контуром (украшение, сквозь него можно ходить)
//   furniture(w, h, d, color, x, z) — бокс на полу, твердый и виден на миникарте
//   wall(w, d, x, z)                — перегородка во всю высоту комнаты
function createRoomFloor(o = {}) {
  const w = o.w || 16;
  const d = o.d || 12;
  const wallH = o.wallH || 3.4;
  const hw = w / 2;
  const hd = d / 2;
  const group = new THREE.Group();
  const solids = [];
  const fade = [];
  const mapShapes = [];
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111 });

  const floorMat = new LitMaterial({ color: o.floorColor || 0xa8814f });
  if (o.plank) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const c = cv.getContext('2d');
    c.fillStyle = '#' + (o.floorColor || 0xa8814f).toString(16).padStart(6, '0');
    c.fillRect(0, 0, 64, 64);
    c.strokeStyle = 'rgba(0,0,0,0.22)';
    c.lineWidth = 2;
    for (let y = 0; y < 64; y += 16) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(64, y);
      c.stroke();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    tex.repeat.set(w / 4, d / 4);
    floorMat.color.set(0xffffff);
    floorMat.map = tex;
  }
  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0.01;
  group.add(floorMesh);
  const floorHex = '#' + (o.floorColor || 0xa8814f).toString(16).padStart(6, '0');
  mapShapes.push({ x: 0, z: 0, hx: hw, hz: hd, color: floorHex, ground: true });

  function part(pw, ph, pd, color, x, y, z) {
    const geo = new THREE.BoxGeometry(pw, ph, pd);
    const mesh = new THREE.Mesh(geo, new LitMaterial({ color }));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  const hex = (c) => '#' + c.toString(16).padStart(6, '0');
  const addSolid = (x, z, hx, hz, color) => {
    solids.push({ x, z, hx, hz });
    mapShapes.push({ x, z, hx, hz, color: color || '#7a6a58' });
  };
  const furniture = (pw, ph, pd, color, x, z) => {
    const mesh = part(pw, ph, pd, color, x, ph / 2, z);
    addSolid(x, z, pw / 2, pd / 2, hex(color));
    return mesh;
  };
  function wall(ww, wd, x, z, color = o.wallColor || 0xe6dfcc) {
    const geo = new THREE.BoxGeometry(ww, wallH, wd);
    const wallMat = new LitMaterial({ color, transparent: true });
    const lineMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true });
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat));
    mesh.position.set(x, wallH / 2, z);
    group.add(mesh);
    fade.push({ mesh, mats: [wallMat, lineMat], half: [ww / 2, wallH / 2, wd / 2], fade: 1 });
    // Перегородки внутри комнаты — твердые (наружные стены держит bounds)
    if (Math.abs(x) < hw && Math.abs(z) < hd) addSolid(x, z, ww / 2, wd / 2, '#5a5048');
    return mesh;
  }
  const t = 0.4;
  const wc = o.wallColor || 0xe6dfcc;
  wall(w + t * 2, t, 0, -hd - t / 2, wc);
  wall(t, d, -hw - t / 2, 0, wc);
  wall(t, d, hw + t / 2, 0, wc);
  if (o.doorGap) {
    const dx = o.doorX || 0;
    const left = dx - o.doorGap / 2 + hw; // длина куска слева от проема
    const right = hw - (dx + o.doorGap / 2);
    if (left > 0.05) wall(left, t, -hw + left / 2, hd + t / 2, wc);
    if (right > 0.05) wall(right, t, hw - right / 2, hd + t / 2, wc);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(o.doorGap, 1.4), new LitMaterial({ color: 0x5a3a2a }));
    mat.rotation.x = -Math.PI / 2;
    mat.position.set(dx, 0.02, hd - 0.9);
    group.add(mat);
  } else {
    wall(w + t * 2, t, 0, hd + t / 2, wc);
  }
  return { group, solids, fadeBoxes: fade, mapShapes, part, furniture, wall, addSolid, w, d };
}

// Пределы, где может стоять центр игрока в комнате w × d
const roomBounds = (w, d, r = 0.45) => ({ minX: -w / 2 + r, maxX: w / 2 - r, minZ: -d / 2 + r, maxZ: d / 2 - r });
