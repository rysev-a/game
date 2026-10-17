// src/quests/practice.js
// ТРЕНИРОВКА НА ТРЕКЕ (действие { practice: { at, cars } }, квест 3.05). Кнопка квеста в журнале открывает окно выбора машины:
// своя или любая из списка (гоночные из src/world/vehicles.js). Выбрали — герой и машина на месте at, время вечернее. В любой момент
// браслет возврата (кнопка внизу или клавиша B, действие { practiceEnd }) возвращает всё назад: положение, машину, игровое время —
// как будто тренировки не было. Тренировочная машина (не своя) исчезает.

(function () {
  const g = questGame;

  const css = document.createElement('style');
  css.textContent = `
    #carPick { position: absolute; inset: 0; z-index: 15; display: none; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.65); font-family: sans-serif; color: #fff; }
    #carPick.on { display: flex; }
    #carPick .panel { width: min(680px, 94vw); max-height: 86vh; overflow-y: auto; box-sizing: border-box; padding: 16px 18px;
      border-radius: 10px; border: 1px solid rgba(255,255,255,0.4); background: rgba(10,14,20,0.97); }
    #carPick h2 { margin: 0 0 4px; font-size: 20px; color: #8fd0ff; }
    #carPick .sub { font-size: 13px; opacity: 0.75; margin-bottom: 10px; }
    #carPick .car { display: flex; gap: 10px; align-items: center; margin: 6px 0; padding: 8px 10px; border-radius: 8px;
      background: rgba(255,255,255,0.07); }
    #carPick .car .dot { width: 18px; height: 18px; border-radius: 50%; flex: none; }
    #carPick .car .info { flex: 1; font-size: 13px; line-height: 1.35; }
    #carPick .car b { font-size: 15px; }
    #carPick button { padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.4); background: rgba(143,208,255,0.25);
      color: #fff; cursor: pointer; font-size: 14px; }
    #carPick button.cancel { background: rgba(255,255,255,0.1); margin-top: 8px; }
    #practiceHud { position: absolute; left: 50%; bottom: 96px; transform: translateX(-50%); z-index: 12; display: none; text-align: center;
      font: 13px/1.4 sans-serif; color: #fff; }
    #practiceHud button { padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.5); background: rgba(40,120,200,0.8);
      color: #fff; font-size: 15px; cursor: pointer; }
  `;
  document.head.appendChild(css);

  const pick = document.createElement('div');
  pick.id = 'carPick';
  pick.innerHTML = '<div class="panel"><h2>Тренировка на треке</h2><div class="sub">Выберите машину. Браслет вернет вас назад, как будто вечера не было.</div><div class="list"></div><button class="cancel">Отмена (Esc)</button></div>';
  document.body.appendChild(pick);
  const listEl = pick.querySelector('.list');

  const hud = document.createElement('div');
  hud.id = 'practiceHud';
  hud.innerHTML = '<button>Браслет: вернуться (B)</button><div>Тренировочный заезд: контрольные точки здесь не считаются</div>';
  document.body.appendChild(hud);

  let practice = null; // { saved, spawned }
  let chooser = null; // { opts }

  const carInfo = (id) => {
    if (id === 'own') {
      const c = garage.car;
      return { name: 'Ваша машина', desc: c && c.limp ? 'Хромает: еле едет' : 'Ваша бирюзовая «ДЕТ 001».', color: '#1fb3a6' };
    }
    const k = VEHICLE_KINDS[id];
    return { name: k.name, desc: k.desc, color: '#' + k.color.toString(16).padStart(6, '0') };
  };

  function closeChooser() {
    pick.classList.remove('on');
    chooser = null;
    if (!dialogueNode) dialogueOpen = false;
  }

  function openChooser(opts) {
    if (practice || chooser || dialogueOpen) return;
    chooser = { opts };
    listEl.replaceChildren();
    for (const id of opts.cars) {
      const info = carInfo(id);
      const row = document.createElement('div');
      row.className = 'car';
      row.innerHTML = '<span class="dot"></span><div class="info"><b></b><br><span></span></div><button>Поехать</button>';
      row.querySelector('.dot').style.background = info.color;
      row.querySelector('b').textContent = info.name;
      row.querySelector('span').textContent = info.desc;
      row.querySelector('button').addEventListener('click', () => begin(opts, id));
      listEl.appendChild(row);
    }
    for (const k of Object.keys(keys)) keys[k] = false;
    if (document.exitPointerLock) document.exitPointerLock();
    dialogueOpen = true;
    pick.classList.add('on');
  }

  function begin(opts, id) {
    closeChooser();
    const place = Core.registry.places[opts.at];
    const own = garage.car;
    practice = {
      spawned: null,
      saved: {
        minutes: gameMinutes,
        px: playerWorldX, pz: playerWorldZ, heading: playerHeading, rotation: worldRotation,
        drivingOwn: drivingCar === own,
        car: { x: own.x, z: own.z, heading: own.heading, fuel: own.fuel },
      },
    };
    if (drivingCar && drivingCar !== own) releaseCar();
    let car = own;
    if (id === 'own') {
      own.x = place.x;
      own.z = place.z;
      own.heading = -Math.PI / 2;
    } else {
      car = addVehicle(id, place.x, place.z, -Math.PI / 2, { fuel: 1 });
      if (!car) {
        showToast('На стартовой прямой нет места для этой машины', 3000);
        practice = null;
        return;
      }
      practice.spawned = car;
      if (drivingCar) drivingCar = null;
    }
    car.speed = 0;
    car.slip = 0;
    car.fuel = Math.max(car.fuel, 0.8);
    // Вечер: если сейчас раньше 19:30 — часы идут до него (после возврата время снова прежнее)
    const hour = gameHour();
    if (hour < 19.5) advanceGameTime((19.5 - hour) * 60);
    clockShown = '';
    questFade();
    enterCar(car);
    g.run({ flag: 'practicing' });
    hud.style.display = 'block';
  }

  function end() {
    if (!practice) return;
    const { saved, spawned } = practice;
    practice = null;
    hud.style.display = 'none';
    questFade();
    const own = garage.car;
    if (spawned) {
      if (drivingCar === spawned) drivingCar = null;
      cityGroup.remove(spawned.mesh);
      const i = cars.indexOf(spawned);
      if (i >= 0) cars.splice(i, 1);
    }
    if (drivingCar) drivingCar = null;
    Object.assign(own, saved.car, { speed: 0, slip: 0 });
    gameMinutes = saved.minutes; // браслет возвращает и время
    clockShown = '';
    playerWorldX = saved.px;
    playerWorldZ = saved.pz;
    playerHeading = saved.heading;
    worldRotation = saved.rotation;
    player.visible = true;
    if (saved.drivingOwn) enterCar(own);
    g.run({ unflag: 'practicing' });
    showToast('Браслет вернул вас назад: тренировки как будто не было.', 3500);
  }

  hud.querySelector('button').addEventListener('click', end);
  pick.querySelector('.cancel').addEventListener('click', closeChooser);
  window.addEventListener(
    'keydown',
    (e) => {
      if (chooser) {
        e.stopImmediatePropagation();
        e.preventDefault();
        if (e.code === 'Escape') closeChooser();
        return;
      }
      if (practice && e.code === 'KeyB' && !e.repeat && !dialogueOpen) {
        e.stopImmediatePropagation();
        end();
      }
    },
    true,
  );

  questHost.startPractice = openChooser;
  questHost.endPractice = end;
})();
