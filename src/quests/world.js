// src/quests/world.js
// МИР ИЗ ДАННЫХ. Люди и предметы местности — записи в содержании, код под каждый не нужен:
//   defineCharacter({ ..., at: 'yard.forge', dx, dz, yaw, gender })    персонаж всегда стоит в этом месте
//   defineQuest({ ..., world: { people: [{ who, at, dx, dz, yaw, if }] } })   персонаж только пока выполняется if
//   defineQuest({ ..., world: { vehicles: [{ kind, at, dx, dz, heading, if }] } })   транспорт (VEHICLE_KINDS) стоит, пока выполняется if
//   defineSpot({ id, at, dx, dz, name, desc, label, r, parts: [[w, h, d, цвет, x, y, z], ...], if })
//       объект на улице из боксов (наковальня, горн, голубятня…); E рядом отдает взаимодействие квесту
//       ('spot:<id>' в interactions, src/core/game.js), а если квесту не нужен — коротко описывает объект
// Места (definePlace) заданы в src/quests/places.js. Раз в полсекунды мир сверяется с условиями if: нужное
// появляется, ненужное убирается, как у проекций мира (docs/mechanics/v1-linear.md).

(function () {
  const g = questGame;
  const reg = Core.registry;
  const live = new Map(); // ключ → { remove() }
  window.questSpots = new Map(); // id объекта мира → { x, z }: где он стоит сейчас (подсветка цели квеста, src/quests/guide.js)

  // Место есть на этой странице, только если оно принадлежит ее локации (place.location, по умолчанию основной мир)
  const placeOf = (id) => {
    const p = reg.places[id];
    return p && (p.location || 'main') === GAME_LOCATION ? p : null;
  };

  function spawnPerson(who, at, dx, dz, yaw) {
    const place = placeOf(at);
    const ch = reg.characters[who];
    const x = place.x + dx;
    const z = place.z + dz;
    const gender = ch.gender || 'male';
    const mesh = createPerson(ch.look || who, { gender });
    mesh.position.set(x, 0, z);
    mesh.rotation.y = yaw;
    mesh.updateWalk(0, 0);
    cityGroup.add(mesh);
    const npc = {
      mesh, x, z, yaw, gender, phase: 0, amp: 0, hold: true, kind: 'story',
      charId: who, name: ch.name, title: ch.title,
    };
    npcs.push(npc);
    return {
      remove() {
        cityGroup.remove(mesh);
        const i = npcs.indexOf(npc);
        if (i >= 0) npcs.splice(i, 1);
      },
    };
  }

  function spawnSpot(sp) {
    const place = placeOf(sp.at);
    const x = place.x + (sp.dx || 0);
    const z = place.z + (sp.dz || 0);
    const group = new THREE.Group();
    const fades = [];
    for (const [w, h, d, color, px, py, pz] of sp.parts) {
      const box = boxWithEdges(w, h, d, color);
      box.position.set(px, py, pz);
      group.add(box);
      // fade: true — как стены зданий: становится полупрозрачным, когда заслоняет героя от камеры (src/engine/fade.js)
      if (sp.fade && h > 1) {
        const mats = [box.material, ...box.children.map((c) => c.material)];
        for (const m of mats) m.transparent = true;
        fades.push({ mesh: box, mats, half: [w / 2, h / 2, d / 2], fade: 1 });
      }
    }
    fadeBoxes.push(...fades);
    group.position.set(x, 0, z);
    group.rotation.y = sp.yaw || 0;
    cityGroup.add(group);
    // solid: true — части выше метра твердые для героя и машин (прямоугольники по осям, поворота у такого объекта нет)
    const solids = [];
    if (sp.solid) {
      for (const [w, h, d, , px, , pz] of sp.parts) {
        if (h < 1) continue;
        const ob = { x: x + px, z: z + pz, hx: w / 2, hz: d / 2 };
        solids.push({ ob, shape: addObstacle(ob) });
      }
    }
    if (sp.name) addHoverInfo(group, { kind: 'Объект', name: sp.name, desc: sp.desc || '' });
    window.questSpots.set(sp.id, { x, z });
    const reach = sp.r || 3.2;
    const it = sp.noInteract ? null : addInteractable({
      priority: 2,
      near: () => !insideBuilding() && !drivingCar && !dialogueOpen && Math.hypot(playerWorldX - x, playerWorldZ - z) < reach,
      prompt: () => sp.label || 'E — осмотреть: ' + (sp.name || ''),
      act: () => {
        if (!g.interact('spot:' + sp.id)) showToast(sp.desc || sp.name || '', 3500);
      },
    });
    return {
      remove() {
        window.questSpots.delete(sp.id);
        cityGroup.remove(group);
        for (const f of fades) {
          const k = fadeBoxes.indexOf(f);
          if (k >= 0) fadeBoxes.splice(k, 1);
        }
        if (it) removeInteractable(it);
        for (const { ob, shape } of solids) {
          const i = obstacles.indexOf(ob);
          if (i >= 0) obstacles.splice(i, 1);
          const j = obstacleShapes.indexOf(shape);
          if (j >= 0) obstacleShapes.splice(j, 1);
        }
      },
    };
  }

  // Транспорт квеста (мотороллер курьера 2.15): стоит на месте, пока выполняется if; сесть без ключей; бензина хватает надолго
  function spawnVehicle(e) {
    const place = placeOf(e.at);
    const car = addVehicle(e.kind, place.x + (e.dx || 0), place.z + (e.dz || 0), e.heading || 0, { open: true, fuel: 1 });
    if (!car) return null;
    car.questVehicle = true;
    car.fuelEconomy = e.economy || 4;
    return {
      remove() {
        if (drivingCar === car) exitCar(true);
        cityGroup.remove(car.mesh);
        const i = cars.indexOf(car);
        if (i >= 0) cars.splice(i, 1);
      },
    };
  }

  function sync() {
    const wanted = new Map();
    // Запись quest.world.people с replace: true на время своего if убирает персонажа с обычного места (он «перебрался» сюда)
    const moved = new Set();
    for (const q of Object.values(reg.quests)) {
      for (const e of (q.world && q.world.people) || []) if (e.replace && g.check(e.if)) moved.add(e.who);
    }
    for (const ch of Object.values(reg.characters)) {
      if (ch.at && placeOf(ch.at) && !moved.has(ch.id)) wanted.set('p:' + ch.id, () => spawnPerson(ch.id, ch.at, ch.dx || 0, ch.dz || 0, ch.yaw || 0));
    }
    for (const q of Object.values(reg.quests)) {
      for (const e of (q.world && q.world.people) || []) {
        if (placeOf(e.at) && g.check(e.if)) wanted.set('p:' + q.id + ':' + e.who, () => spawnPerson(e.who, e.at, e.dx || 0, e.dz || 0, e.yaw || 0));
      }
    }
    for (const q of Object.values(reg.quests)) {
      for (const [i, e] of ((q.world && q.world.vehicles) || []).entries()) {
        if (placeOf(e.at) && g.check(e.if)) wanted.set('v:' + q.id + ':' + i, () => spawnVehicle(e));
      }
    }
    for (const sp of Object.values(reg.spots)) {
      if (placeOf(sp.at) && g.check(sp.if)) wanted.set('s:' + sp.id, () => spawnSpot(sp));
    }
    for (const [key, obj] of live) {
      if (!wanted.has(key)) {
        obj.remove();
        live.delete(key);
      }
    }
    for (const [key, make] of wanted) if (!live.has(key)) live.set(key, make());
  }

  sync();
  setInterval(sync, 500);
})();
