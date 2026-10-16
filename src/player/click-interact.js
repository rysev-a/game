// src/player/click-interact.js
// КЛИК ПО ЧЕЛОВЕКУ, ДВЕРИ И МАШИНЕ (компьютер, мирный режим, пешком). Включается настройкой «Клик по человеку,
// двери и машине» (вкладка «Управление», по умолчанию включена):
//   • человек — герой подходит и начинает разговор;
//   • дверь здания — идет ко входу и входит (эту часть делает src/player/click-move.js);
//   • машина — подходит и садится (закрытую или без ключей — говорит почему, как по E).
// Далеко ли цель или нет, правило одно, как у двери: идем clickDoorFrames (2 секунды), а если не дошли — сразу
// оказываемся рядом, и время уходит так, будто дошли пешком (travelMinutes, как при перемещении по карте).
// Выключили настройку — клик по людям и машинам просто ведет по земле, а дверь — к точке перед зданием.
// Пока идем, W/A/S/D, оружие, машина или разговор останавливают ход (как в click-move.js), клик по земле — новая цель.
//
// Подключено без правки старых файлов: настройка добавляется в таблицы настроек, слушатель клика стоит на перехвате
// (раньше click-move.js и input.js), updateClickMove и clickDoorEntry обернуты. При переносе в основные файлы
// это обычные правки на месте (см. docs/mechanics/v1-linear.md, «Подключение»).

(function () {
  // ---------- Настройка ----------
  SETTINGS_DEFAULTS.clickInteract = true;
  settings.clickInteract = true;
  loadSetting('clickInteract');
  settingsPanels.controls.appendChild(
    buildSettingItem({
      type: 'check',
      key: 'clickInteract',
      desk: true,
      label: 'Клик по человеку, двери и машине',
      note: 'Герой сам подойдет: заговорит, войдет в здание или сядет в машину. Далеко — через пару секунд он уже там, а время уйдет как на дорогу пешком',
    }),
  );
  refreshSettingsUI();

  // Выключено — дверь по клику не ищем: click-move.js ведет по земле
  const origClickDoorEntry = clickDoorEntry;
  clickDoorEntry = () => (settings.clickInteract ? origClickDoorEntry() : null);

  // ---------- Что можно выбрать кликом ----------
  const talkReach = 2.2; // с какого расстояния начинаем разговор (nearestPerson берет до 2.8)
  const carReach = enterRadius - 0.6;

  const carDist = (c) => Math.hypot(c.x - playerWorldX, c.z - playerWorldZ) - (c.half.l - carHalf.l);

  // Люди, которых можно позвать: прохожие снаружи, жильцы и посетители в здании
  function clickablePeople() {
    const ci = currentInterior();
    const list = ci ? ci.def.people.filter((p) => p.floor === ci.floor) : npcs;
    return list.filter((p) => p.mesh && !p.helping && hoverShown(p.mesh));
  }

  const targetPos = (t) => (t.kind === 'person' ? personWorld(t.ref) : { x: t.ref.x, z: t.ref.z });

  // Кого или что показывает уже направленный луч: ближайшее попадание среди людей и машин
  function pickTarget() {
    const cand = [];
    for (const p of clickablePeople()) cand.push({ kind: 'person', ref: p, mesh: p.mesh });
    if (!insideBuilding() && !drivingCar) {
      for (const c of cars) if (c.mesh && hoverShown(c.mesh)) cand.push({ kind: 'car', ref: c, mesh: c.mesh });
    }
    if (!cand.length) return null;
    const hit = clickRaycaster.intersectObjects(cand.map((c) => c.mesh), true)[0];
    if (!hit) return null;
    for (let o = hit.object; o; o = o.parent) {
      const t = cand.find((c) => c.mesh === o);
      if (t) return t;
    }
    return null;
  }

  // ---------- Клик ----------
  let goal = null; // { kind, ref, frames } — к кому или к чему идем

  window.addEventListener(
    'mousedown',
    (e) => {
      if (e.button !== 0 || e.target !== renderer.domElement) return;
      goal = null; // любой новый клик отменяет прежнюю цель
      if (!settings.clickInteract || !clickMoveAllowed() || hoveredPickable) return;
      if (!clickGroundPoint(e)) return; // заодно направляет луч
      if (clickEnemy()) return; // противник — боевой режим, это делает click-move.js
      const t = pickTarget();
      if (!t) return;
      const pos = targetPos(t);
      goal = { kind: t.kind, ref: t.ref, frames: 0 };
      clickDoor = null;
      clickHeld = false;
      clickMoveTo(pos.x, pos.z);
      e.stopImmediatePropagation(); // дальше click-move.js и input.js этот клик не видят
    },
    true,
  );

  // ---------- Дошли ----------
  function arrived(t) {
    if (t.kind === 'car') return carDist(t.ref) <= carReach;
    const pos = targetPos(t);
    return Math.hypot(pos.x - playerWorldX, pos.z - playerWorldZ) <= talkReach;
  }

  function interact(t) {
    clickMoveStop();
    if (t.kind === 'person') {
      const pos = targetPos(t);
      playerHeading = Math.atan2(-(pos.x - playerWorldX), -(pos.z - playerWorldZ)); // лицом к собеседнику
      startDialogue(t.ref, rootDialogue(t.ref));
    } else {
      const why = carBlockedReason(t.ref);
      if (why) showToast(why, 3000);
      else enterCar(t.ref);
    }
  }

  // Не дошли за 2 секунды — сразу рядом; время — как на оставшийся путь пешком (как у двери, clickEnterFar)
  function enterFar(t) {
    const pos = targetPos(t);
    const dist = Math.hypot(pos.x - playerWorldX, pos.z - playerWorldZ);
    const back = (t.kind === 'person' ? 1.8 : t.ref.half.l + 1.5) / (dist || 1); // встаем со стороны игрока
    const spot = findFreeSpot(pos.x + (playerWorldX - pos.x) * back, pos.z + (playerWorldZ - pos.z) * back, (x, z) => !blockedOutside(x, z));
    const minutes = travelMinutes(dist, false);
    clickMoveStop();
    travelFadeEl.style.transition = 'none';
    travelFadeEl.style.opacity = '0.85';
    void travelFadeEl.offsetWidth;
    travelFadeEl.style.transition = 'opacity 0.6s';
    travelFadeEl.style.opacity = '0';
    playerWorldX = spot.x;
    playerWorldZ = spot.z;
    walkAmp = 0;
    advanceGameTime(minutes);
    clockShown = '';
    interact(t);
    if (minutes >= 1) showToast('Пешком: ' + Math.round(dist) + ' м, ушло ' + formatDuration(minutes) + '. Сейчас ' + formatGameTime() + '.', 4000);
  }

  // Раз в кадр перед обычной ходьбой кликом: цель двигается (человек), так что точку обновляем
  function updateClickInteract() {
    if (!goal) return;
    if (!clickTarget || !clickMoveAllowed()) {
      goal = null; // остановили сами (клавиши, оружие, разговор) или уперлись
      return;
    }
    const t = goal;
    const pos = targetPos(t);
    if (!pos || (t.kind === 'car' && !cars.includes(t.ref))) {
      goal = null;
      clickMoveStop();
      return;
    }
    if (arrived(t)) {
      goal = null;
      interact(t);
      return;
    }
    clickTarget.x = pos.x;
    clickTarget.z = pos.z;
    clickMarker.position.set(pos.x, 0.06, pos.z);
    // Ходьба кликом идет по прямой и упирается в первое препятствие; как у двери, это не обрывает путь:
    // через 2 секунды герой все равно окажется рядом (click-move.js остановил бы его за 40 кадров)
    clickStuck = { d: Infinity, frames: 0 };
    // Внутри здания пол маленький — доходим сами; снаружи после 2 секунд переносимся
    if (++t.frames >= clickDoorFrames && !insideBuilding()) {
      goal = null;
      enterFar(t);
    }
  }

  const origUpdateClickMove = updateClickMove;
  updateClickMove = function () {
    updateClickInteract();
    origUpdateClickMove();
  };
})();
