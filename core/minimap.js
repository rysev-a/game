// core/minimap.js
// МИНИКАРТА (правый верхний угол): плоская квадратная карта — дороги, земля, здания, люди, машины.
// Вид крутится вместе с камерой. Масштаб карты меняется вместе с масштабом камеры (колесо мыши на
// обычном экране); при отдалении карта растет быстрее камеры (mapZoom).
// Зажатое колесико двигает карту (двойной клик — вернуть к игроку). Клик по карте — переместиться (.user/travel.js). Когда игрок за рулем, та часть карты, докуда
// не хватит бензина, чуть бледнее.

const minimap = document.getElementById('minimap');
const mmCtx = minimap.getContext('2d');
const minimapRange = 300; // сколько юнитов в ширину видно при масштабе камеры 1
const mmFarPower = 2.2; // при отдалении камеры карта растет быстрее камеры (в 1 — как камера)

// Множитель масштаба карты. Приближаем — как камера, отдаляем — сильнее: на максимальном отдалении
// (zoomMax 2.5) карта показывает 300 · 2.5^2.2 ≈ 2250 юнитов, то есть почти весь мир
const mapZoom = (indoors) => (zoom <= 1 || indoors ? zoom : Math.pow(zoom, mmFarPower));

// Для клика и подсказки: где сейчас мышь над картой (в пикселях от центра холста) и масштаб
let mmHover = null; // { u, v } или null
let mmView = { scale: 1 }; // обновляется в drawMinimap

minimap.addEventListener('mouseleave', () => (mmHover = null));

// ДВИГАТЬ КАРТУ: зажатое колесико (средняя кнопка) тащит карту — ищем нужное место и кликаем по нему.
// mmPan — на сколько юнитов центр карты сдвинут от игрока (в мире). Двойной клик колесиком или
// перемещение возвращает карту к игроку.
const mmPan = { x: 0, z: 0 };
const mmPanLimit = 2600;
let mmDragging = false;
let mmLastMiddleDown = 0;

const resetMinimapPan = () => {
  mmPan.x = mmPan.z = 0;
};

minimap.addEventListener('mousedown', (e) => {
  if (e.button !== 1) return;
  e.preventDefault(); // без «автопрокрутки» браузера
  if (currentInterior()) return;
  const now = performance.now();
  if (now - mmLastMiddleDown < 350) resetMinimapPan(); // двойной клик колесиком — к игроку
  mmLastMiddleDown = now;
  mmDragging = true;
});
document.addEventListener('mousemove', (e) => {
  if (!mmDragging) return;
  if (!(e.buttons & 4)) {
    mmDragging = false; // отпустили где-то вне окна
    return;
  }
  // Карта идет за курсором: центр сдвигается в обратную сторону
  const k = 1 / mmView.scale;
  const c = Math.cos(worldRotation);
  const s = Math.sin(worldRotation);
  mmPan.x = Math.min(Math.max(mmPan.x - (e.movementX * c - e.movementY * s) * k, -mmPanLimit), mmPanLimit);
  mmPan.z = Math.min(Math.max(mmPan.z - (e.movementX * s + e.movementY * c) * k, -mmPanLimit), mmPanLimit);
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 1) mmDragging = false;
});

// Точка холста под курсором (пиксели от центра)
function minimapPoint(e) {
  const r = minimap.getBoundingClientRect();
  return { u: e.clientX - (r.left + r.width / 2), v: e.clientY - (r.top + r.height / 2) };
}

// Точка мира по точке холста (u, v). Холст повернут на -worldRotation, масштаб S / range
function minimapUVToWorld(u, v) {
  const k = 1 / mmView.scale;
  const c = Math.cos(worldRotation);
  const s = Math.sin(worldRotation);
  return { x: playerWorldX + mmPan.x + (u * c - v * s) * k, z: playerWorldZ + mmPan.z + (u * s + v * c) * k };
}

const minimapWorldPoint = (e) => {
  const { u, v } = minimapPoint(e);
  return { ...minimapUVToWorld(u, v), u, v };
};

function drawMinimap() {
  const S = minimap.width;
  const ci = currentInterior();
  if (ci) mmPan.x = mmPan.z = 0; // в зданиях карта не двигается
  // Центр карты: игрок плюс сдвиг, на который карту утащили колесиком
  const cx = playerWorldX + mmPan.x;
  const cz = playerWorldZ + mmPan.z;
  const range = (ci ? ci.def.minimapRange : minimapRange) * mapZoom(!!ci); // масштаб карты следует за камерой
  const mmScale = S / range;
  mmView.scale = mmScale;
  mmCtx.clearRect(0, 0, S, S);
  mmCtx.fillStyle = 'rgba(17, 17, 17, 0.88)';
  mmCtx.fillRect(0, 0, S, S);

  mmCtx.save();
  mmCtx.translate(S / 2, S / 2);
  mmCtx.rotate(-worldRotation);
  mmCtx.scale(mmScale, mmScale);

  const px = 1 / mmScale; // один пиксель экрана в юнитах мира
  const near = (x, z) => Math.abs(x - cx) <= range && Math.abs(z - cz) <= range;

  const drawObject = (b) => {
    mmCtx.fillStyle = b.color;
    mmCtx.fillRect(b.x - b.hx - cx, b.z - b.hz - cz, b.hx * 2, b.hz * 2);
  };

  // Граница мира (забор): круг
  if (!ci) {
    mmCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    mmCtx.lineWidth = 1.5 * px;
    mmCtx.beginPath();
    mmCtx.arc(worldCenter.x - cx, worldCenter.z - cz, worldRadius, 0, Math.PI * 2);
    mmCtx.stroke();
  }

  // Земля поселка и парковка — под дорогами
  for (const b of mapObjects) if (b.ground && near(b.x, b.z)) drawObject(b);

  // Дороги (не тоньше пикселя-двух, чтобы были видны и на малом масштабе)
  for (const r of mapRoads) {
    mmCtx.lineWidth = Math.max(r.width || roadWidth, 1.6 * px);
    mmCtx.strokeStyle = r.color;
    mmCtx.beginPath();
    mmCtx.moveTo(r.x1 - cx, r.z1 - cz);
    mmCtx.lineTo(r.x2 - cx, r.z2 - cz);
    mmCtx.stroke();
  }

  // Здания
  for (const b of mapObjects) if (!b.ground && near(b.x, b.z)) drawObject(b);

  // За рулем: куда машина не доедет (дальше, чем хватит бензина), — чуть бледнее
  if (drivingCar && !ci) {
    const reach = drivingCar.fuel * fuelRange;
    const big = range * 4;
    mmCtx.beginPath();
    mmCtx.rect(-big, -big, big * 2, big * 2);
    mmCtx.arc(drivingCar.x - cx, drivingCar.z - cz, reach, 0, Math.PI * 2);
    mmCtx.fillStyle = 'rgba(17, 17, 17, 0.55)';
    mmCtx.fill('evenodd');
  }

  // Прохожие: розовые — женщины, голубые — мужчины
  const dot = Math.max(2, 3 * px);
  for (const n of npcs) {
    if (!near(n.x, n.z)) continue;
    mmCtx.fillStyle = n.gender === 'female' ? '#ff8fb3' : '#8fd0ff';
    mmCtx.fillRect(n.x - cx - dot / 2, n.z - cz - dot / 2, dot, dot);
  }

  // Люди в зданиях (координаты внутри этажа смещены по Z)
  for (const def of interiors) {
    for (const p of def.people) {
      const wz = p.z + def.floorZ[p.floor];
      if (!near(p.x, wz)) continue;
      mmCtx.fillStyle = p.gender === 'female' ? '#ff8fb3' : '#8fd0ff';
      mmCtx.fillRect(p.x - cx - 0.7, wz - cz - 0.7, 1.5, 1.5);
    }
  }

  // Машины (на малом масштабе не меньше нескольких пикселей)
  const carGrow = Math.max(1, (3.5 * px) / carSize.w);
  for (const c of cars) {
    if (!near(c.x, c.z)) continue;
    mmCtx.save();
    mmCtx.translate(c.x - cx, c.z - cz);
    mmCtx.rotate(-c.heading);
    mmCtx.scale(carGrow, carGrow);
    mmCtx.fillStyle = '#' + c.color.toString(16).padStart(6, '0');
    mmCtx.fillRect(-carSize.w, -carSize.l, carSize.w * 2, carSize.l * 2);
    if (c.isPlayerCar) {
      // машина игрока — с белой рамкой, чтобы находилась на карте сразу
      mmCtx.strokeStyle = '#ffffff';
      mmCtx.lineWidth = 1.2 / carGrow;
      mmCtx.strokeRect(-carSize.w * 1.4, -carSize.l * 1.15, carSize.w * 2.8, carSize.l * 2.3);
    }
    mmCtx.restore();
  }
  mmCtx.restore();

  // Игрок — красный квадрат (в центре; если карту сдвинули — там, где игрок на самом деле)
  const k = mmScale;
  // игрок относительно центра карты — это (-mmPan); холст повернут на -worldRotation
  const cosR = Math.cos(worldRotation);
  const sinR = Math.sin(worldRotation);
  const pu = (-mmPan.x * cosR - mmPan.z * sinR) * k;
  const pv = (mmPan.x * sinR - mmPan.z * cosR) * k;
  mmCtx.fillStyle = '#ff2a2a';
  mmCtx.fillRect(S / 2 + pu - 3, S / 2 + pv - 3, 6, 6);
}
