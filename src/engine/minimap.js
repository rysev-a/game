// src/engine/minimap.js
// МИНИКАРТА (правый верхний угол): плоская квадратная карта — дороги, земля, здания, люди, машины.
// Вид крутится вместе с камерой. Масштаб карты меняется вместе с масштабом камеры (колесо мыши на
// обычном экране); при отдалении карта растет быстрее камеры (mapZoom).
// Зажатое колесико (на телефоне — свайп) двигает карту (двойной клик — вернуть к игроку). Кнопка в углу
// карты разворачивает ее на весь экран (src/engine/mapfull.js). Клик по карте — переместиться (src/player/travel.js). Когда игрок за рулем, та часть карты, докуда
// не хватит бензина, чуть бледнее.
// Настройки (вкладка «Карта», src/engine/settings.js): миникарту можно скрыть, поменять ее размер (компьютер),
// поставить север всегда сверху (карта не крутится с камерой) и убрать прохожих.

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
  const c = Math.cos(minimapRot());
  const s = Math.sin(minimapRot());
  mmPan.x = Math.min(Math.max(mmPan.x - (e.movementX * c - e.movementY * s) * k, -mmPanLimit), mmPanLimit);
  mmPan.z = Math.min(Math.max(mmPan.z - (e.movementX * s + e.movementY * c) * k, -mmPanLimit), mmPanLimit);
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 1) mmDragging = false;
});

// На телефоне карту двигают пальцем (свайп). Касание без сдвига — как клик: переместиться
// (src/player/travel.js); после свайпа клик гасим (mmSwiped)
let mmSwipe = null;
let mmSwiped = false;
function panMinimapBy(dx, dy) {
  const r = minimap.getBoundingClientRect();
  const k = minimap.width / (r.width || minimap.width) / mmView.scale; // пиксели экрана → юниты мира
  const c = Math.cos(minimapRot());
  const s = Math.sin(minimapRot());
  mmPan.x = Math.min(Math.max(mmPan.x - (dx * c - dy * s) * k, -mmPanLimit), mmPanLimit);
  mmPan.z = Math.min(Math.max(mmPan.z - (dx * s + dy * c) * k, -mmPanLimit), mmPanLimit);
}
minimap.addEventListener(
  'touchstart',
  (e) => {
    const t = e.changedTouches[0];
    mmSwipe = { id: t.identifier, x: t.clientX, y: t.clientY, moved: false };
    mmSwiped = false;
  },
  { passive: true },
);
minimap.addEventListener(
  'touchmove',
  (e) => {
    e.preventDefault();
    if (!mmSwipe || currentInterior()) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== mmSwipe.id) continue;
      const dx = t.clientX - mmSwipe.x;
      const dy = t.clientY - mmSwipe.y;
      if (!mmSwipe.moved && Math.hypot(dx, dy) < 8) return;
      mmSwipe.moved = mmSwiped = true;
      panMinimapBy(dx, dy);
      mmSwipe.x = t.clientX;
      mmSwipe.y = t.clientY;
    }
  },
  { passive: false },
);
minimap.addEventListener('touchend', () => (mmSwipe = null));

// Точка холста под курсором (пиксели холста от центра; на телефоне холст показан меньше своего размера)
function minimapPoint(e) {
  const r = minimap.getBoundingClientRect();
  const k = minimap.width / (r.width || minimap.width);
  return { u: (e.clientX - (r.left + r.width / 2)) * k, v: (e.clientY - (r.top + r.height / 2)) * k };
}

// Точка мира по точке холста (u, v). Холст повернут на -worldRotation, масштаб S / range
const minimapRot = () => (settings.mapNorthUp ? 0 : worldRotation); // север сверху — карта не крутится

function minimapUVToWorld(u, v) {
  const k = 1 / mmView.scale;
  const c = Math.cos(minimapRot());
  const s = Math.sin(minimapRot());
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
  const range = (ci ? ci.def.minimapRange : minimapRange) * mapZoom(!!ci); // масштаб карты следует за камерой
  mmView.scale = S / range;
  // Центр карты: игрок плюс сдвиг, на который карту утащили (колесиком или пальцем)
  drawMapView(mmCtx, S, S, playerWorldX + mmPan.x, playerWorldZ + mmPan.z, mmView.scale, minimapRot(), ci);
}

// Карта в прямоугольнике W × H пикселей: центр (cx, cz) в мире, scale — пикселей на юнит, вид повернут на rot.
// Ее рисуют и миникарта, и карта на весь экран (src/engine/mapfull.js); highlight — рамка вокруг здания
function drawMapView(ctx, W, H, cx, cz, mmScale, rot, ci, highlight) {
  const range = Math.hypot(W, H) / mmScale; // докуда от центра рисовать (с запасом на большие участки)
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(17, 17, 17, 0.88)';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-rot);
  ctx.scale(mmScale, mmScale);

  const px = 1 / mmScale; // один пиксель экрана в юнитах мира
  const near = (x, z) => Math.abs(x - cx) <= range && Math.abs(z - cz) <= range;

  const drawObject = (b) => {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - b.hx - cx, b.z - b.hz - cz, b.hx * 2, b.hz * 2);
  };

  // Граница мира (забор): круг
  if (!ci) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5 * px;
    ctx.beginPath();
    ctx.arc(worldCenter.x - cx, worldCenter.z - cz, worldRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Земля поселка и парковка — под дорогами
  for (const b of mapObjects) if (b.ground && near(b.x, b.z)) drawObject(b);

  // Дороги (не тоньше пикселя-двух, чтобы были видны и на малом масштабе)
  for (const r of mapRoads) {
    ctx.lineWidth = Math.max(r.width || roadWidth, 1.6 * px);
    ctx.strokeStyle = r.color;
    ctx.beginPath();
    ctx.moveTo(r.x1 - cx, r.z1 - cz);
    ctx.lineTo(r.x2 - cx, r.z2 - cz);
    ctx.stroke();
  }

  // Здания
  for (const b of mapObjects) if (!b.ground && near(b.x, b.z)) drawObject(b);

  // За рулем: куда машина не доедет (дальше, чем хватит бензина), — чуть бледнее
  if (drivingCar && !ci) {
    const reach = drivingCar.fuel * fuelRange;
    const big = range * 4;
    ctx.beginPath();
    ctx.rect(-big, -big, big * 2, big * 2);
    ctx.arc(drivingCar.x - cx, drivingCar.z - cz, reach, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(17, 17, 17, 0.55)';
    ctx.fill('evenodd');
  }

  // Прохожие — кружки: розовые — женщины, голубые — мужчины, полицейские — синие с белой обводкой
  const dot = Math.max(1.2, 1.8 * px);
  for (const n of npcs) {
    if (!settings.mapPeople || !near(n.x, n.z)) continue;
    const police = n.type === 'police' || n.kind === 'officer';
    ctx.fillStyle = police ? '#2f5bd8' : n.gender === 'female' ? '#ff8fb3' : '#8fd0ff';
    ctx.beginPath();
    ctx.arc(n.x - cx, n.z - cz, dot, 0, Math.PI * 2);
    ctx.fill();
    if (police) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = px;
      ctx.stroke();
    }
  }

  // Люди в зданиях (координаты внутри этажа смещены по Z)
  for (const def of settings.mapPeople ? interiors : []) {
    for (const p of def.people) {
      const wz = p.z + def.floorZ[p.floor];
      if (!near(p.x, wz)) continue;
      ctx.fillStyle = p.gender === 'female' ? '#ff8fb3' : '#8fd0ff';
      ctx.beginPath();
      ctx.arc(p.x - cx, wz - cz, 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Машины (на малом масштабе не меньше нескольких пикселей)
  const carGrow = Math.max(1, (3.5 * px) / carSize.w);
  for (const c of cars) {
    if (!near(c.x, c.z)) continue;
    ctx.save();
    ctx.translate(c.x - cx, c.z - cz);
    ctx.rotate(-c.heading);
    ctx.scale(carGrow, carGrow);
    ctx.fillStyle = '#' + c.color.toString(16).padStart(6, '0');
    const k = c.half.l / carHalf.l; // трактор, БТР и гоночная — своего размера
    ctx.fillRect(-carSize.w * (c.half.w / carHalf.w), -carSize.l * k, carSize.w * 2 * (c.half.w / carHalf.w), carSize.l * 2 * k);
    if (c.isPlayerCar) {
      // машина игрока — с белой рамкой, чтобы находилась на карте сразу
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2 / carGrow;
      ctx.strokeRect(-carSize.w * 1.4, -carSize.l * 1.15, carSize.w * 2.8, carSize.l * 2.3);
    }
    ctx.restore();
  }

  // Значки мест (дом, заправка): всегда стоят ровно и одного размера на экране
  if (!ci) {
    for (const icon of mapIcons) {
      if (!near(icon.x, icon.z)) continue;
      ctx.save();
      ctx.translate(icon.x - cx, icon.z - cz);
      ctx.rotate(rot);
      ctx.scale(px, px);
      drawMapIcon(icon.icon, ctx);
      ctx.restore();
    }
  }

  // Выбранное здание (на большой карте) — желтая рамка
  if (highlight) {
    ctx.strokeStyle = '#ffd84a';
    ctx.lineWidth = 2.5 * px;
    ctx.strokeRect(highlight.x1 - cx, highlight.z1 - cz, highlight.x2 - highlight.x1, highlight.z2 - highlight.z1);
  }

  // Игрок — красная стрелка носом туда, куда он смотрит (за рулем — куда смотрит машина).
  // Рисуется в его настоящем месте, даже если карту сдвинули колесиком
  ctx.save();
  ctx.translate(playerWorldX - cx, playerWorldZ - cz);
  ctx.rotate(-(drivingCar ? drivingCar.heading : playerHeading));
  ctx.scale(px, px);
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 5);
  ctx.lineTo(0, 2.5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fillStyle = '#ff2a2a';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// Значок на карте в пикселях вокруг (0, 0): кружок-подложка и рисунок внутри
function drawMapIcon(kind, c = mmCtx) {
  c.beginPath();
  c.arc(0, 0, 8, 0, Math.PI * 2);
  c.fillStyle = kind === 'home' ? '#d9a066' : '#d23c3c';
  c.fill();
  c.strokeStyle = '#111111';
  c.lineWidth = 1.5;
  c.stroke();
  c.fillStyle = '#ffffff';
  c.beginPath();
  if (kind === 'home') {
    // домик: крыша-треугольник и стены
    c.moveTo(0, -5);
    c.lineTo(5, -0.5);
    c.lineTo(-5, -0.5);
    c.closePath();
    c.fill();
    c.fillRect(-3.5, -0.5, 7, 5);
    c.fillStyle = '#d9a066';
    c.fillRect(-1, 1.5, 2, 3); // дверь
  } else if (kind === 'gas') {
    // колонка со шлангом
    c.fillRect(-4, -4.5, 5, 9);
    c.fillStyle = '#d23c3c';
    c.fillRect(-3, -3.5, 3, 2.5); // окошко
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(1, -2.5);
    c.lineTo(3.5, -1);
    c.lineTo(3.5, 3);
    c.stroke();
  }
}

// Миникарта из настроек: показать или скрыть, размер (на компьютере; на телефоне размер задает touch.js)
const minimapWrapBox = document.getElementById('minimapWrap');
const mmInfoBox = document.getElementById('mmInfo');
function applyMinimapSettings() {
  minimapWrapBox.style.display = settings.minimap ? '' : 'none';
  mmInfoBox.style.visibility = settings.minimap ? '' : 'hidden';
  if (touchUI) return;
  const size = settings.minimapSize + 'px';
  minimapWrapBox.style.width = minimapWrapBox.style.height = size;
  minimap.style.width = minimap.style.height = size;
  mmInfoBox.style.top = 60 + settings.minimapSize + 8 + 'px';
}
applyMinimapSettings();
onSettingChange((key) => {
  if (key === 'minimap' || key === 'minimapSize') applyMinimapSettings();
});
