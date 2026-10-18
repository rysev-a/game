// src/engine/touch-drive.js
// МАШИНА НА ТЕЛЕФОНЕ. Сели за руль — джойстик слева пропадает, вместо него органы управления машиной:
//   • педаль газа и педаль тормоза (держать пальцем);
//   • коробка передач: P — парковка (стоит на месте), R — назад, D — драйв (без газа машина потихоньку
//     едет сама, с газом разгоняется), M — ручной режим: справа появляются передачи 1–6, их переключают
//     стрелками вверх и вниз. На каждой передаче свой предел скорости, на низких — сильнее тянет; без газа
//     машина катится и плавно сбрасывает скорость.
//   • рядом — ручник: держите на ходу и поворачивайте — машину заносит, остаются следы шин (src/player/driving.js);
//     у гоночных газ с ручником — дрифт: машина едет боком (в R — задом);
//   • над ними — скорость в км/ч;
//   • руль — наклон телефона (src/engine/gyro-steer.js), а если датчика нет — кнопки ◀ ▶ справа.
// Садясь в машину, коробка стоит в P. Кнопка 🚪 рядом с оружием — выйти (src/engine/touch.js).
//
//   touchDriveStep(car, k, hasFuel) — из updateDriving (src/player/driving.js): скорость машины за кадр
//                                     по педалям и передаче; true — посчитано здесь, клавиатура не нужна
//   touchDriveSteer()               — руль кнопками ◀ ▶: −1..1 (плюс — налево), 0 — не нажаты

const touchDrive = { gas: false, brake: false, handbrake: false, gear: 'P', n: 1, steer: 0 };
const touchDriveCreep = 0.06; // скорость «ползком» в D без газа (полная у легковушки — 0.8)
const touchDriveCreepBack = 0.035; // то же в R
const touchDriveGears = 6;
let touchDriveStep = () => false;
let touchDriveSteer = () => 0;

if (touchUI) {
  const style = document.createElement('style');
  style.textContent = `
    body.touch.driving #joyBase, body.touch.driving #touchPad { display: none; }
    #mDrive, #mGearsM, #mSteer { position: fixed; z-index: 20; display: none; touch-action: none; user-select: none;
      -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
    body.touch.driving #mDrive, body.touch.driving.manual #mGearsM, body.touch.driving.noTilt #mSteer { display: flex; }
    body.touch.invOpen #mDrive, body.touch.invOpen #mGearsM, body.touch.invOpen #mSteer { display: none !important; }
    #mDrive { left: max(16px, calc(env(safe-area-inset-left) + 8px)); bottom: max(80px, calc(env(safe-area-inset-bottom) + 72px));
      flex-direction: column; align-items: flex-start; gap: 6px; }
    #mDrive .row { display: flex; align-items: flex-end; gap: 10px; }
    #mDrive .speed { padding: 2px 10px; border-radius: 8px; background: rgba(10, 14, 20, 0.6); color: white;
      font: bold var(--fs-h1) var(--font); font-variant-numeric: tabular-nums; }
    #mDrive .speed small { font-size: var(--fs-small); font-weight: normal; opacity: 0.7; margin-left: 4px; }
    #mDrive .box { display: flex; flex-direction: column; gap: 4px; padding: 4px; border-radius: 10px;
      background: rgba(10, 14, 20, 0.55); border: 1px solid rgba(255, 255, 255, 0.3); }
    #mDrive .box button { width: 34px; height: 30px; padding: 0; border-radius: 6px; border: 1px solid transparent;
      background: none; color: rgba(255, 255, 255, 0.6); font: bold var(--fs-h2) var(--font); }
    #mDrive .box button.on { color: #111; background: #ffd84a; }
    #mDrive .pedal { box-sizing: border-box; border-radius: 10px; border: 2px solid rgba(255, 255, 255, 0.45);
      background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.16) 0 4px, rgba(10, 14, 20, 0.55) 4px 11px);
      color: white; font: bold var(--fs-text) var(--font); display: flex; align-items: flex-end; justify-content: center; padding-bottom: 6px; }
    #mDrive .pedal.brake { width: 66px; height: 74px; }
    #mDrive .pedal.gas { width: 50px; height: 112px; }
    #mDrive .pedal.hand { width: 46px; height: 56px; border-radius: 23px 23px 10px 10px; font-size: var(--fs-small); }
    #mDrive .pedal.down { border-color: #ffd84a; background: repeating-linear-gradient(0deg, rgba(255, 216, 74, 0.5) 0 4px, rgba(60, 50, 10, 0.6) 4px 11px); }
    #mGearsM { right: max(14px, env(safe-area-inset-right)); bottom: max(8px, env(safe-area-inset-bottom));
      flex-direction: column; align-items: center; gap: 6px; }
    #mGearsM button { width: 54px; height: 46px; padding: 0; border-radius: 10px; border: 2px solid rgba(255, 255, 255, 0.45);
      background: rgba(10, 14, 20, 0.6); color: white; font: bold var(--fs-h1) var(--font); }
    #mGearsM button.down { background: rgba(255, 216, 74, 0.45); border-color: #ffd84a; }
    #mGearsM .n { min-width: 46px; text-align: center; padding: 4px 0; border-radius: 8px; color: #ffd84a;
      background: rgba(10, 14, 20, 0.7); font: bold var(--fs-display) var(--font); }
    #mSteer { right: max(14px, env(safe-area-inset-right)); bottom: max(8px, env(safe-area-inset-bottom)); gap: 10px; }
    body.touch.driving.manual #mSteer { right: calc(max(14px, env(safe-area-inset-right)) + 70px); }
    #mSteer button { width: 64px; height: 56px; padding: 0; border-radius: 12px; border: 2px solid rgba(255, 255, 255, 0.45);
      background: rgba(10, 14, 20, 0.6); color: white; font: bold var(--fs-h1) var(--font); }
    #mSteer button.down { background: rgba(255, 216, 74, 0.45); border-color: #ffd84a; }
  `;
  document.head.appendChild(style);

  // Слева: коробка передач и педали
  const panel = document.createElement('div');
  panel.id = 'mDrive';
  panel.innerHTML =
    '<div class="speed"><span>0</span><small>км/ч</small></div><div class="row"><div class="box">' +
    ['P', 'R', 'D', 'M'].map((g) => '<button data-g="' + g + '">' + g + '</button>').join('') +
    '</div><div class="pedal brake">ТОРМ</div><div class="pedal gas">ГАЗ</div><div class="pedal hand">РУЧН</div></div>';
  document.body.appendChild(panel);
  const speedEl = panel.querySelector('.speed span');
  let speedShown = -1;
  const gearBtns = [...panel.querySelectorAll('.box button')];

  // Справа в ручном режиме: передачи
  const gearsM = document.createElement('div');
  gearsM.id = 'mGearsM';
  gearsM.innerHTML = '<button data-d="1">▲</button><div class="n">1</div><button data-d="-1">▼</button>';
  document.body.appendChild(gearsM);
  const gearNum = gearsM.querySelector('.n');

  // Руль кнопками — только если наклон телефона не работает
  const steerEl = document.createElement('div');
  steerEl.id = 'mSteer';
  steerEl.innerHTML = '<button data-s="1">◀</button><button data-s="-1">▶</button>';
  document.body.appendChild(steerEl);

  function showGear() {
    for (const b of gearBtns) b.classList.toggle('on', b.dataset.g === touchDrive.gear);
    gearNum.textContent = touchDrive.n;
    document.body.classList.toggle('manual', touchDrive.gear === 'M');
  }
  showGear();

  for (const b of gearBtns) {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      touchDrive.gear = b.dataset.g;
      showGear();
    });
  }

  // Удержание пальцем: педали и кнопки руля работают, пока палец на них (несколько пальцев сразу — можно)
  function hold(el, on, off) {
    const ids = new Set();
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      ids.add(e.pointerId);
      el.classList.add('down');
      on();
    });
    const up = (e) => {
      if (!ids.delete(e.pointerId) || ids.size) return;
      el.classList.remove('down');
      off();
    };
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, up);
  }
  hold(panel.querySelector('.gas'), () => (touchDrive.gas = true), () => (touchDrive.gas = false));
  hold(panel.querySelector('.brake'), () => (touchDrive.brake = true), () => (touchDrive.brake = false));
  hold(panel.querySelector('.hand'), () => (touchDrive.handbrake = true), () => (touchDrive.handbrake = false));
  for (const b of steerEl.querySelectorAll('button')) {
    const s = +b.dataset.s;
    hold(b, () => (touchDrive.steer = s), () => touchDrive.steer === s && (touchDrive.steer = 0));
  }
  for (const b of gearsM.querySelectorAll('button')) {
    hold(
      b,
      () => {
        touchDrive.n = Math.min(touchDriveGears, Math.max(1, touchDrive.n + +b.dataset.d));
        showGear();
      },
      () => {},
    );
  }

  touchDriveSteer = () => touchDrive.steer;

  // Скорость машины за кадр. k — числа машины (accel, brake, drag, maxSpeed, maxReverse)
  touchDriveStep = (car, k, hasFuel) => {
    const s = car.speed;
    const slow = (amount) => (car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), amount));
    const toward = (target, step) => (car.speed += Math.max(-step, Math.min(step, target - car.speed)));
    const g = touchDrive.gear;
    // на ручнике газ не тянет (как на компьютере); у гоночных тянет — газ с ручником это дрифт (src/player/driving.js)
    const gas = touchDrive.gas && hasFuel && (!touchDrive.handbrake || !!(car.kind && car.kind.powerDrift));
    if (touchDrive.brake) {
      slow(k.brake);
    } else if (g === 'P') {
      slow(k.brake * 2); // стоит на парковке
    } else if (g === 'D') {
      if (gas) car.speed = s < 0 ? s + k.brake : Math.min(s + k.accel, k.maxSpeed);
      else if (hasFuel && s < touchDriveCreep) toward(touchDriveCreep, k.accel * 0.3); // ползет сама
      else slow(k.coast);
    } else if (g === 'R') {
      if (gas) car.speed = s > 0 ? s - k.brake : Math.max(s - k.accel * 0.7 * (k.revMul || 1), k.maxReverse);
      else if (hasFuel && s > -touchDriveCreepBack) toward(-touchDriveCreepBack, k.accel * 0.2);
      else slow(k.coast);
    } else {
      // M: у передачи n предел скорости n/6 от полной; низкие передачи тянут сильнее
      const n = touchDrive.n;
      const top = (k.maxSpeed * n) / touchDriveGears;
      if (s > top) slow(Math.min(s - top, k.drag * 3)); // торможение двигателем после понижения
      else if (gas) car.speed = s < 0 ? s + k.brake : Math.min(s + k.accel * (1.5 - n * 0.15), top);
      else slow(k.coast);
    }
    return true;
  };

  // Сели в машину — коробка в P, педали отпущены; наклон телефона не работает — кнопки руля
  let wasDriving = null;
  function updateTouchDrive() {
    if (drivingCar !== wasDriving) {
      wasDriving = drivingCar;
      touchDrive.gear = 'P';
      touchDrive.gas = touchDrive.brake = touchDrive.handbrake = false;
      touchDrive.steer = 0;
      showGear();
    }
    const kmh = drivingCar ? carSpeedKmh(drivingCar) : 0; // та же шкала 0–250, что у спидометра на компьютере (src/player/driving.js)
    if (kmh !== speedShown) speedEl.textContent = speedShown = kmh;
    document.body.classList.toggle('noTilt', !(typeof gyroTiltReady === 'function' && gyroTiltReady()));
    requestAnimationFrame(updateTouchDrive);
  }
  updateTouchDrive();
}
