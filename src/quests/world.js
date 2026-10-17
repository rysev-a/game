// src/quests/world.js
// МИР ИЗ ДАННЫХ. Люди и предметы местности — записи в содержании, код под каждый не нужен:
//   defineCharacter({ ..., at: 'yard.forge', dx, dz, yaw, gender })    персонаж всегда стоит в этом месте
//   defineQuest({ ..., world: { people: [{ who, at, dx, dz, yaw, if }] } })   персонаж только пока выполняется if
//   defineSpot({ id, at, dx, dz, name, desc, label, r, parts: [[w, h, d, цвет, x, y, z], ...], if })
//       объект на улице из боксов (наковальня, горн, голубятня…); E рядом отдает взаимодействие квесту
//       ('spot:<id>' в interactions, src/core/game.js), а если квесту не нужен — коротко описывает объект
// Места (definePlace) заданы в src/quests/places.js. Раз в полсекунды мир сверяется с условиями if: нужное
// появляется, ненужное убирается, как у проекций мира (docs/mechanics/v1-linear.md).

(function () {
  const g = questGame;
  const reg = Core.registry;
  const live = new Map(); // ключ → { remove() }

  const placeOf = (id) => reg.places[id];

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
    for (const [w, h, d, color, px, py, pz] of sp.parts) {
      const box = boxWithEdges(w, h, d, color);
      box.position.set(px, py, pz);
      group.add(box);
    }
    group.position.set(x, 0, z);
    group.rotation.y = sp.yaw || 0;
    cityGroup.add(group);
    if (sp.name) addHoverInfo(group, { kind: 'Объект', name: sp.name, desc: sp.desc || '' });
    const reach = sp.r || 3.2;
    const it = addInteractable({
      priority: 2,
      near: () => !insideBuilding() && !drivingCar && !dialogueOpen && Math.hypot(playerWorldX - x, playerWorldZ - z) < reach,
      prompt: () => sp.label || 'E — осмотреть: ' + (sp.name || ''),
      act: () => {
        if (!g.interact('spot:' + sp.id)) showToast(sp.desc || sp.name || '', 3500);
      },
    });
    return {
      remove() {
        cityGroup.remove(group);
        removeInteractable(it);
      },
    };
  }

  function sync() {
    const wanted = new Map();
    for (const ch of Object.values(reg.characters)) {
      if (ch.at && placeOf(ch.at)) wanted.set('p:' + ch.id, () => spawnPerson(ch.id, ch.at, ch.dx || 0, ch.dz || 0, ch.yaw || 0));
    }
    for (const q of Object.values(reg.quests)) {
      for (const e of (q.world && q.world.people) || []) {
        if (placeOf(e.at) && g.check(e.if)) wanted.set('p:' + q.id + ':' + e.who, () => spawnPerson(e.who, e.at, e.dx || 0, e.dz || 0, e.yaw || 0));
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
