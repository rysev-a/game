// src/engine/gyro-steer.js
// РУЛЬ НАКЛОНОМ ТЕЛЕФОНА. На телефоне гоночная машина (VEHICLE_KINDS: gyro, src/world/vehicles.js) на треке
// (onRaceTrack, src/demo/race.js) рулит наклоном: телефон держат горизонтально, как руль, и поворачивают его
// в плоскости экрана — против часовой стрелки налево, по часовой направо. Газ и тормоз — джойстиком, как раньше;
// отклонили джойстик влево-вправо — он важнее наклона. Положение руля «прямо» запоминается, когда садитесь в машину.
// Чувствительность — ползунок в настройках (запоминается). Подключается после src/engine/touch.js.
//
//   gyroSteer(car) → −1..1 (плюс — налево) или null, если руль наклоном сейчас не работает

let gyroSteer = () => null;

if (touchUI) {
  const steerFullAngle = 0.6; // рад (≈35°): при чувствительности 100% такой наклон — руль до упора
  const steerDeadZone = 0.03; // рад: дрожание рук не крутит руль
  let steerSensitivity = 1;
  try {
    const saved = parseFloat(localStorage.getItem('game.gyroSteer'));
    if (!Number.isNaN(saved)) steerSensitivity = Math.min(2, Math.max(0.25, saved));
  } catch (e) {
    // не страшно: чувствительность по умолчанию
  }

  // Наклон «руля» по силе тяжести: в каком направлении на экране «вверх». Датчик дает ускорение в осях
  // телефона (x — вправо, y — вверх в вертикальном положении); переводим в оси экрана по углу поворота экрана
  let tilt = null; // рад, плюс — телефон повернут против часовой (налево)
  let upSign = 1; // некоторые браузеры отдают вектор с обратным знаком: определяем по тому, где «верх»
  window.addEventListener('devicemotion', (e) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x === null || a.y === null) return;
    const angle = (((screen.orientation && screen.orientation.angle) || window.orientation || 0) * Math.PI) / 180;
    const sx = a.x * Math.cos(angle) - a.y * Math.sin(angle);
    const sy = a.x * Math.sin(angle) + a.y * Math.cos(angle);
    // Телефон держат экраном к себе: «верх» экрана и лицевая сторона смотрят вверх, их сумма > 0
    if (Math.abs(sy + (a.z || 0)) > 3) upSign = Math.sign(sy + (a.z || 0));
    if (Math.hypot(sx, sy) < 1.5) return; // телефон лежит плашмя: наклон руля не понять
    const t = Math.atan2(sx * upSign, sy * upSign);
    tilt = tilt === null ? t : tilt + (t - tilt) * 0.35; // сглаживание
  });

  let center = 0;
  let steerCar = null;
  gyroSteer = (car) => {
    if (tilt === null || !car.kind || !car.kind.gyro || typeof onRaceTrack !== 'function' || !onRaceTrack(car.x, car.z)) {
      steerCar = null;
      return null;
    }
    if (steerCar !== car) {
      steerCar = car;
      center = tilt; // как держали, садясь в машину, — это «прямо»
    }
    let d = tilt - center;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    if (Math.abs(d) < steerDeadZone) return 0;
    const v = ((d - Math.sign(d) * steerDeadZone) * steerSensitivity) / steerFullAngle;
    return Math.max(-1, Math.min(1, v));
  };

  function requestMotion() {
    const DM = window.DeviceMotionEvent;
    if (DM && typeof DM.requestPermission === 'function') DM.requestPermission().catch(() => {});
  }
  window.addEventListener('touchend', requestMotion, { once: true });

  // Ползунок в настройках
  const row = document.createElement('div');
  row.innerHTML =
    '<div class="row" style="margin-top:12px"><span>Чувствительность поворотов (наклон, гоночная машина)</span><span id="gyroSteerValue"></span></div>' +
    '<input id="gyroSteerSlider" type="range" min="25" max="200" step="5" />';
  const slider = row.querySelector('input');
  const value = row.querySelector('#gyroSteerValue');
  const show = () => {
    slider.value = Math.round(steerSensitivity * 100);
    value.textContent = Math.round(steerSensitivity * 100) + '%';
  };
  slider.addEventListener('input', () => {
    steerSensitivity = slider.value / 100;
    value.textContent = slider.value + '%';
    try {
      localStorage.setItem('game.gyroSteer', String(steerSensitivity));
    } catch (e) {
      // не запомнится — не страшно
    }
  });
  slider.addEventListener('change', requestMotion);
  show();
  settingsMenu.insertBefore(row, settingsMenu.querySelector('.hint'));
}
