// src/quests/hooks.js
// ПОДКЛЮЧЕНИЕ К ИГРЕ без правки старых файлов: здесь функции игры оборачиваются (функции в классических скриптах —
// глобальные, и вызовы идут по имени, поэтому обертка начинает действовать сразу). Это временная мера:
// когда старые файлы можно будет править, каждая обертка превращается в обычную правку на месте:
//
//   captureGame / applyGame    src/player/saves.js     в слот пишется и читается story (questGame.snapshot / restore)
//   rootDialogue, personTitle  src/player/talk.js      разговор с именованным персонажем берется из данных
//   spawnIncident, despawnIncident, updateIncident, updateOfficers   src/locations/bridge/incident.js
//                              Денис у ленты, осмотр тела, сцена живет, пока идет квест «У моста»
//   drawMapView                src/engine/minimap.js   метка текущего шага квеста на миникарте и карте
//
// Что делает квест 1.03 в мире — в src/content/quests/1-03-bridge.js; здесь только то, что требует кода игры.

(function () {
  const g = questGame;

  // ---------- Сохранения: story едет в слоте вместе с игрой ----------
  // Версия сохранения прежняя: слот без story (старый) просто начинает историю заново
  const origCaptureGame = captureGame;
  captureGame = function () {
    const data = origCaptureGame();
    data.story = g.snapshot();
    return data;
  };
  const origApplyGame = applyGame;
  applyGame = function (data) {
    origApplyGame(data);
    g.restore(data.story);
  };

  // ---------- Разговоры с именованными персонажами ----------
  const origRootDialogue = rootDialogue;
  rootDialogue = function (person) {
    if (person.charId && g.hasDialog(person.charId)) {
      const node = g.dialogue(person.charId);
      if (node) return node;
    }
    return origRootDialogue(person);
  };
  const origPersonTitle = personTitle;
  personTitle = (p) => p.title || origPersonTitle(p);

  // ---------- Сцена у реки: Денис и тело ----------
  // Денис стоит за лентой лицом к телу, как полицейские; встает в список officers, чтобы сцена убирала его сама
  function addDenis() {
    const x = incident.x - 6;
    const z = incident.z - 3.5;
    const mesh = createPerson('denis', { gender: 'male' });
    const o = {
      mesh,
      gender: 'male',
      kind: 'friend',
      charId: 'denis',
      name: 'Денис',
      title: 'друг, полицейский',
      hold: true,
      home: { x, z },
      x,
      z,
      moving: false,
      target: null,
      timer: rand(300, 900),
      speed: 0.035,
      phase: rand(0, 6),
      amp: 0,
      yaw: Math.atan2(-(incident.x - x), -(incident.z - z)),
    };
    mesh.position.set(x, 0, z);
    mesh.rotation.y = o.yaw;
    mesh.updateWalk(0, 0);
    cityGroup.add(mesh);
    npcs.push(o);
    incident.officers.push(o);
  }

  // E у тела: воспоминание. Доступно, когда герой уже поговорил с Денисом, и пока не посмотрел
  let bodyInteractable = null;
  const bodyReach = 4.2;
  function addBodyInteractable() {
    bodyInteractable = addInteractable({
      priority: 2,
      near: () =>
        !dialogueOpen &&
        !drivingCar &&
        g.isActive('1.03') &&
        g.stepDone('1.03', 'denis') &&
        !g.stepDone('1.03', 'body') &&
        Math.hypot(playerWorldX - incident.x, playerWorldZ - incident.z) < bodyReach,
      prompt: () => 'E — посмотреть на тело',
      act: () => g.run({ dialog: '1.03.flash' }),
    });
  }

  const origSpawnIncident = spawnIncident;
  spawnIncident = function () {
    origSpawnIncident();
    // Обход ошибки main: у служебных машин сцены нет размеров (half), и nearestCar (src/player/driving.js) падает
    // каждый кадр, пока сцена на месте: время и отрисовка замирают. Правильное место исправления — addEmergencyCar
    for (const car of incident.cars) if (!car.half) car.half = { ...carHalf };
    addDenis();
    addBodyInteractable();
  };

  const origDespawnIncident = despawnIncident;
  despawnIncident = function (permanently) {
    if (bodyInteractable) removeInteractable(bodyInteractable);
    bodyInteractable = null;
    origDespawnIncident(permanently);
  };

  // Сцена строится, только пока идет квест, и не пропадает насовсем, пока он не выполнен: ушел, не поговорив
  // с Денисом, — вернулся, и всё на месте
  const origUpdateIncident = updateIncident;
  updateIncident = function () {
    if (incident.state === 'waiting' && !g.isActive('1.03')) return;
    if (incident.state === 'active' && incident.arrived && incidentDistance() > incidentLeaveDist && !g.isDone('1.03')) {
      despawnIncident(false);
      return;
    }
    origUpdateIncident();
  };

  // Разговаривающий Денис стоит лицом к игроку, а не возвращается взглядом к телу
  const origUpdateOfficers = updateOfficers;
  updateOfficers = function () {
    const all = incident.officers;
    incident.officers = all.filter((o) => !o.talking);
    origUpdateOfficers();
    incident.officers = all;
  };

  // ---------- Людмила Сергеевна в торговом центре ----------
  // Стоит на первом этаже недалеко от входа лицом к двери; разговор — по данным (src/content/characters/lyudmila.js)
  {
    const mesh = createPerson('lyudmila', { gender: 'female' });
    const x = 7;
    const z = mall.door.z - 8;
    mesh.position.set(x, 0, z);
    mall.floors[0].group.add(mesh);
    mesh.updateWalk(0, 0);
    mallPeople.push({
      floor: 0, x, z, mesh, gender: 'female', yaw: 0, phase: 0, amp: 0, wait: 0,
      role: 'director', charId: 'lyudmila', name: 'Людмила Сергеевна', title: 'директор торгового центра',
    });
  }

  // ---------- Метка текущего шага на карте ----------
  // Кружок, если место на карте; если за краем — стрелка у края в его сторону
  const origDrawMapView = drawMapView;
  drawMapView = function (ctx, W, H, cx, cz, mmScale, rot, ci, highlight) {
    origDrawMapView(ctx, W, H, cx, cz, mmScale, rot, ci, highlight);
    const m = ci ? null : g.currentMarker();
    if (!m) return;
    const dx = m.x - cx;
    const dz = m.z - cz;
    const sx = (dx * Math.cos(rot) + dz * Math.sin(rot)) * mmScale;
    const sy = (-dx * Math.sin(rot) + dz * Math.cos(rot)) * mmScale;
    const pulse = 1 + 0.15 * Math.sin(performance.now() / 150);
    const edge = 14;
    const k = Math.min(1, (W / 2 - edge) / (Math.abs(sx) || 1), (H / 2 - edge) / (Math.abs(sy) || 1));
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.fillStyle = '#ffd84a';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    if (k >= 1) {
      ctx.beginPath();
      ctx.arc(sx, sy, 7 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.translate(sx * k, sy * k);
      ctx.rotate(Math.atan2(sy, sx));
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-7, -7);
      ctx.lineTo(-7, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  };
})();
