// src/player/travel.js
// ПЕРЕМЕЩЕНИЕ КЛИКОМ ПО МИНИКАРТЕ. Клик по карте — и игрок сразу там. Если точка занята (человек, здание,
// дерево, чужая машина), оказываемся в ближайшем свободном месте рядом.
//   • Пешком: время уходит как на реальную ходьбу (расстояние / скорость игрока).
//   • За рулем: машина переезжает как можно ближе к точке, на это тратится время и бензин. Дальше, чем
//     хватит бензина, не доехать: машина встанет у границы бледной зоны на карте, а бак опустеет.
//   • Внутри зданий и пока что-то занимает игрока (разговор, толкание машины) карта только показывает.
//   • Если у машины кончился бензин и вы попросили прохожего (или соседа) подтолкнуть, карта дает ОДИН раз
//     переместиться вместе с машиной: вдвоем катят ее до точки на карте (бензин не нужен, время уходит),
//     после этого помощник уходит — разовая помощь, дальше нужен бензин.
// Время идет вперед (src/engine/clock.js): ночь, дождь и дата меняются так же, как при обычной прогулке.
// С включенным видом мышью курсор спрятан — чтобы кликнуть по карте, нажмите Esc или выключите глаз (V).

const mmInfoEl = document.getElementById('mmInfo');
const travelFadeEl = document.getElementById('travelFade');
const mmDefaultInfo = 'Клик — переместиться · колесо — масштаб · зажатое колесико — двигать карту';
let mmInfoShown = '';

const travelFootSpeed = () => playerSpeed * 60; // юнитов в секунду, как при обычной ходьбе
const travelCarSpeed = () => carMaxSpeed * 60 * 0.8; // в среднем чуть медленнее максимальной

// Сколько игровых минут занимает путь длиной dist
function travelMinutes(dist, byCar) {
  const seconds = dist / (byCar ? travelCarSpeed() : travelFootSpeed());
  return seconds * clockConfig.minutesPerSecond;
}

// Ближайшее к (tx, tz) место, где ok(x, z) — истина: кольцами вокруг точки
function findFreeSpot(tx, tz, ok) {
  if (ok(tx, tz)) return { x: tx, z: tz };
  for (let r = 1.5; r <= 60; r += 1.5) {
    const n = Math.max(8, Math.round(r * 2));
    const start = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = start + (i / n) * Math.PI * 2;
      const x = tx + Math.cos(a) * r;
      const z = tz + Math.sin(a) * r;
      if (ok(x, z)) return { x, z };
    }
  }
  return null;
}

// Помощник толкает вашу севшую машину: можно один раз переместить ее на карте
const travelPushHelp = () => !!helper && !!garage.car && helper.car === garage.car && garage.car.fuel <= 0;
const travelPushSpeed = () => helperPushSpeed * 60 * 0.8; // юнитов в секунду, вдвоем

// Почему сейчас нельзя перемещаться (или null)
function travelBlockReason() {
  if (insideBuilding()) return 'Внутри здания карта только показывает — выйдите на улицу';
  if (dialogueOpen) return 'Сначала закончите разговор';
  if (travelPushHelp()) return null; // с помощником можно (один раз), пока не ушел
  if (pushingCar) return 'Сначала отпустите машину (F)';
  if (drivingCar && drivingCar.fuel <= 0) return 'В баке пусто: на машине не переехать';
  return null;
}

// Прикидка для подсказки под картой (без поиска свободного места)
function travelEstimate(wx, wz) {
  if (travelPushHelp()) {
    const car = garage.car;
    const dist = Math.hypot(wx - car.x, wz - car.z);
    return { dist, tooFar: false, push: true, minutes: (dist / travelPushSpeed()) * clockConfig.minutesPerSecond };
  }
  const sx = drivingCar ? drivingCar.x : playerWorldX;
  const sz = drivingCar ? drivingCar.z : playerWorldZ;
  let dist = Math.hypot(wx - sx, wz - sz);
  let tooFar = false;
  if (drivingCar) {
    const reach = drivingCar.fuel * fuelRange;
    if (dist > reach) {
      dist = reach;
      tooFar = true;
    }
  }
  return { dist, tooFar, minutes: travelMinutes(dist, !!drivingCar) };
}

function travelTo(wx, wz) {
  const reason = travelBlockReason();
  if (reason) {
    showToast(reason, 3000);
    return;
  }
  // Клик за забором (мир круглый): переносим точку на край круга
  const out = Math.hypot(wx - worldCenter.x, wz - worldCenter.z);
  if (out > worldRadius - 6) {
    const k = (worldRadius - 6) / out;
    wx = worldCenter.x + (wx - worldCenter.x) * k;
    wz = worldCenter.z + (wz - worldCenter.z) * k;
  }
  if (travelPushHelp()) {
    travelWithHelper(wx, wz);
    return;
  }
  const car = drivingCar;
  const sx = car ? car.x : playerWorldX;
  const sz = car ? car.z : playerWorldZ;
  const reach = car ? car.fuel * fuelRange : Infinity;

  let spot;
  if (car) {
    // Машина — по возможности ближе к точке, но не дальше, чем хватит бензина
    const d = Math.hypot(wx - sx, wz - sz);
    let tx = wx;
    let tz = wz;
    if (d > reach) {
      tx = sx + ((wx - sx) / d) * reach;
      tz = sz + ((wz - sz) / d) * reach;
    }
    spot = findFreeSpot(tx, tz, (x, z) => Math.hypot(x - sx, z - sz) <= reach && carFree(car, x, z, car.heading));
  } else {
    spot = findFreeSpot(wx, wz, (x, z) => !blockedOutside(x, z));
  }
  if (!spot) {
    showToast('Туда не добраться: рядом нет свободного места', 3000);
    return;
  }

  const dist = Math.hypot(spot.x - sx, spot.z - sz);
  if (dist < 2) return; // клик почти по игроку
  const minutes = travelMinutes(dist, !!car);

  // Мигнули экраном и оказались на месте
  travelFadeEl.style.transition = 'none';
  travelFadeEl.style.opacity = '0.85';
  void travelFadeEl.offsetWidth;
  travelFadeEl.style.transition = 'opacity 0.6s';
  travelFadeEl.style.opacity = '0';

  if (car) {
    car.x = spot.x;
    car.z = spot.z;
    car.speed = 0;
    car.fuel = Math.max(0, car.fuel - dist / fuelRange);
    if (car.fuel <= 0) emptyFuelWarned = true; // «бак пуст» скажем в своем сообщении ниже
    playerWorldX = car.x;
    playerWorldZ = car.z;
  } else {
    playerWorldX = spot.x;
    playerWorldZ = spot.z;
    walkAmp = 0;
  }
  resetMinimapPan();
  advanceGameTime(minutes);
  clockShown = '';

  const how = car ? 'На машине' : 'Пешком';
  const fuelNote = car ? ', бензин −' + Math.max(1, Math.round((dist / fuelRange) * 100)) + '%' : '';
  const cut = car && (Math.hypot(wx - sx, wz - sz) > reach || car.fuel <= 0) ? ' Бак пуст: дальше бензина не хватило.' : '';
  showToast(
    how + ': ' + Math.round(dist) + ' м, ушло ' + formatDuration(minutes) + fuelNote + '. Сейчас ' + formatGameTime() + '.' + cut,
    5000,
  );
}

// Переместить севшую машину вместе с помощником (один раз), помощник уходит
function travelWithHelper(wx, wz) {
  const car = garage.car;
  const spot = findFreeSpot(wx, wz, (x, z) => carFree(car, x, z, car.heading));
  if (!spot) {
    showToast('Туда не добраться: рядом нет свободного места', 3000);
    return;
  }
  const dist = Math.hypot(spot.x - car.x, spot.z - car.z);
  if (dist < 2) return;
  const minutes = (dist / travelPushSpeed()) * clockConfig.minutesPerSecond;
  const name = personName(helper.person);
  const female = helper.person.gender === 'female';

  travelFadeEl.style.transition = 'none';
  travelFadeEl.style.opacity = '0.85';
  void travelFadeEl.offsetWidth;
  travelFadeEl.style.transition = 'opacity 0.6s';
  travelFadeEl.style.opacity = '0';

  releaseCar(); // прекращаем толкание: игрок остается рядом с машиной
  car.x = spot.x;
  car.z = spot.z;
  car.speed = 0;
  if (drivingCar === car) {
    playerWorldX = car.x;
    playerWorldZ = car.z;
  } else {
    // Игрок встает у водительской двери (если там занято — с другой стороны)
    const d = pushDriverSpot(car);
    const h = car.heading;
    const alt = [
      [d.x, d.z],
      [car.x + Math.cos(h) * 2.4, car.z - Math.sin(h) * 2.4],
      [car.x + Math.sin(h) * 3.2, car.z + Math.cos(h) * 3.2],
      [car.x - Math.sin(h) * 3.2, car.z - Math.cos(h) * 3.2],
    ].find(([x, z]) => !blockedOutside(x, z)) || [d.x, d.z];
    playerWorldX = alt[0];
    playerWorldZ = alt[1];
    walkAmp = 0;
  }
  resetMinimapPan();
  advanceGameTime(minutes);
  clockShown = '';
  endHelp(); // помощник сделал свое дело и уходит
  showToast(
    name + (female ? ' докатила' : ' докатил') + ' машину: ' + Math.round(dist) + ' м, ушло ' + formatDuration(minutes) + '. Сейчас ' + formatGameTime() +
      (female ? '. Она ушла' : '. Он ушел') + ' — дальше нужен бензин.',
    6000,
  );
}

minimap.addEventListener('click', (e) => {
  const p = minimapWorldPoint(e);
  travelTo(p.x, p.z);
});

minimap.addEventListener('mousemove', (e) => {
  const p = minimapWorldPoint(e);
  mmHover = { u: p.u, v: p.v };
});

// Строка под картой: подсказка, а при наведении — во что обойдется поездка
function updateTravelHud() {
  let text = mmDefaultInfo;
  if (insideBuilding()) {
    text = 'В здании карта только показывает';
  } else if (mmHover) {
    const w = minimapUVToWorld(mmHover.u, mmHover.v); // игрок идет — точка под мышью смещается вместе с миром
    const est = travelEstimate(w.x, w.z);
    const how = est.push ? 'Вдвоем с помощником (один раз)' : drivingCar ? 'На машине' : 'Пешком';
    text = how + ': ' + Math.round(est.dist) + ' м · ' + formatDuration(est.minutes);
    if (drivingCar && !est.push) text += ' · бензин −' + Math.max(1, Math.round((est.dist / fuelRange) * 100)) + '%';
    if (est.tooFar) text += ' (дальше не хватит бензина)';
  }
  if (text !== mmInfoShown) {
    mmInfoShown = text;
    mmInfoEl.textContent = text;
  }
}
