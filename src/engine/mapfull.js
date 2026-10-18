// src/engine/mapfull.js
// КАРТА НА ВЕСЬ ЭКРАН. Кнопка ⤢ в углу миникарты (на компьютере и на телефоне) открывает карту на весь экран.
// Ее можно двигать (тащить мышью или пальцем), приближать и отдалять (колесо мыши, щипок двумя пальцами,
// кнопки + и −) и крутить (правая кнопка мыши или Shift + тащить, поворот двумя пальцами, кнопки ⟲ ⟳).
// Касание или клик по точке — герой перемещается туда, как по клику на миникарте (src/player/travel.js).
// Навели мышь или коснулись здания — внизу видно, что это (то же, что в панели «что это»,
// src/engine/hoverinfo.js), а здание на карте обводится желтой рамкой. ⌖ — вернуть карту к игроку,
// ✕ или Esc — закрыть. Игра в это время идет как обычно. Рисует ту же карту, что и миникарта (drawMapView).

const mapFull = { open: false, cx: 0, cz: 0, scale: 1, rot: 0, hover: null };
const mapFullMinScale = 0.08; // пикселей на юнит: почти весь мир
const mapFullMaxScale = 12;

const mapFullStyle = document.createElement('style');
mapFullStyle.textContent = `
  #mmExpand {
    position: absolute; top: 6px; left: 6px; width: 30px; height: 30px; padding: 0; z-index: 11;
    border-radius: 7px; border: 1px solid rgba(255, 255, 255, 0.45); background: rgba(10, 14, 20, 0.7);
    color: white; font-size: var(--fs-h2); line-height: 1; cursor: pointer; pointer-events: auto;
  }
  #mmExpand:hover { background: rgba(60, 60, 60, 0.85); }
  body.touch #mmExpand { width: 26px; height: 26px; font-size: var(--fs-h2); top: 4px; left: 4px; }
  body.mapFullOn #toast { z-index: 70; }
  #mapFull { position: fixed; inset: 0; z-index: 60; display: none; background: #111; touch-action: none; }
  #mapFull.on { display: block; }
  #mapFull canvas { display: block; width: 100%; height: 100%; cursor: grab; touch-action: none; }
  #mapFull canvas.drag { cursor: grabbing; }
  #mapFull .btns { position: absolute; top: max(10px, env(safe-area-inset-top)); right: max(10px, env(safe-area-inset-right));
    display: flex; flex-direction: column; gap: 8px; }
  #mapFull button { width: 42px; height: 42px; padding: 0; border-radius: 9px; border: 1px solid rgba(255, 255, 255, 0.45);
    background: rgba(10, 14, 20, 0.8); color: white; font-size: var(--fs-h1); cursor: pointer; }
  #mapFull button:hover { background: rgba(60, 60, 60, 0.9); }
  #mapFull .info { position: absolute; left: 50%; bottom: max(14px, env(safe-area-inset-bottom)); transform: translateX(-50%);
    max-width: min(520px, calc(100% - 140px)); box-sizing: border-box; padding: 8px 14px; border-radius: 10px;
    background: rgba(10, 14, 20, 0.85); border: 1px solid rgba(255, 255, 255, 0.3); color: white; font: var(--fs-text) var(--font);
    pointer-events: none; text-align: center; }
  #mapFull .info .k { font-size: var(--fs-small); opacity: 0.6; }
  #mapFull .info .n { font-size: var(--fs-h2); font-weight: bold; margin: 2px 0; }
  #mapFull .info .d { opacity: 0.85; }
  #mapFull .info.hint { opacity: 0.7; }
`;
document.head.appendChild(mapFullStyle);

const mmExpandBtn = document.createElement('button');
mmExpandBtn.id = 'mmExpand';
mmExpandBtn.title = 'Карта на весь экран';
mmExpandBtn.textContent = '⤢';
document.getElementById('minimapWrap').appendChild(mmExpandBtn);
mmExpandBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  setMapFullOpen(true);
});
for (const ev of ['touchstart', 'mousedown']) mmExpandBtn.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });

const mapFullEl = document.createElement('div');
mapFullEl.id = 'mapFull';
mapFullEl.innerHTML =
  '<canvas></canvas><div class="btns">' +
  '<button data-a="close" title="Закрыть (Esc)">✕</button>' +
  '<button data-a="in" title="Приблизить">+</button>' +
  '<button data-a="out" title="Отдалить">−</button>' +
  '<button data-a="left" title="Повернуть">⟲</button>' +
  '<button data-a="right" title="Повернуть">⟳</button>' +
  '<button data-a="me" title="К игроку">⌖</button>' +
  '</div><div class="info"></div>';
document.body.appendChild(mapFullEl);
const mapFullCanvas = mapFullEl.querySelector('canvas');
const mapFullCtx = mapFullCanvas.getContext('2d');
const mapFullInfo = mapFullEl.querySelector('.info');
const mapFullHint = touchUI
  ? 'Коснитесь точки — переместиться, здания — что это. Двумя пальцами — масштаб и поворот'
  : 'Клик — переместиться, наведите на здание — что это. Колесо — масштаб, правая кнопка — поворот';

function mapFullToMe() {
  mapFull.cx = playerWorldX;
  mapFull.cz = playerWorldZ;
  mapFull.rot = worldRotation; // как сейчас смотрит камера
}

function setMapFullOpen(open) {
  if (open && !mapFull.open) {
    mapFullToMe();
    // Около 500 м по короткой стороне; в здании — весь этаж
    const ci = currentInterior();
    mapFull.scale = Math.min(window.innerWidth, window.innerHeight) / (ci ? ci.def.minimapRange : 500);
    mapFull.hover = null;
    for (const k of Object.keys(keys)) keys[k] = false; // отпускаем зажатые клавиши
  }
  mapFull.open = open;
  mapFullEl.classList.toggle('on', open);
  document.body.classList.toggle('mapFullOn', open); // сообщения (куда переместились, почему нельзя) — поверх карты
}

mapFullEl.querySelector('.btns').addEventListener('click', (e) => {
  const a = e.target.dataset && e.target.dataset.a;
  const W = window.innerWidth;
  const H = window.innerHeight;
  if (a === 'close') setMapFullOpen(false);
  else if (a === 'in') mapFullZoomAt(W / 2, H / 2, 1.4);
  else if (a === 'out') mapFullZoomAt(W / 2, H / 2, 1 / 1.4);
  else if (a === 'left') mapFullTurnAt(W / 2, H / 2, -Math.PI / 8);
  else if (a === 'right') mapFullTurnAt(W / 2, H / 2, Math.PI / 8);
  else if (a === 'me') mapFullToMe();
});

// ---------- Экран ↔ мир ----------
// (sx, sy) — точка в CSS-пикселях окна. Карта повернута на -rot, масштаб — scale пикселей на юнит
function mapFullToWorld(sx, sy) {
  const u = (sx - window.innerWidth / 2) / mapFull.scale;
  const v = (sy - window.innerHeight / 2) / mapFull.scale;
  const c = Math.cos(mapFull.rot);
  const s = Math.sin(mapFull.rot);
  return { x: mapFull.cx + u * c - v * s, z: mapFull.cz + u * s + v * c };
}

// Сдвинуть центр так, чтобы точка мира w оказалась под (sx, sy)
function mapFullPin(w, sx, sy) {
  const now = mapFullToWorld(sx, sy);
  mapFull.cx += w.x - now.x;
  mapFull.cz += w.z - now.z;
}

function mapFullZoomAt(sx, sy, k) {
  const w = mapFullToWorld(sx, sy);
  mapFull.scale = Math.min(mapFullMaxScale, Math.max(mapFullMinScale, mapFull.scale * k));
  mapFullPin(w, sx, sy);
}

function mapFullTurnAt(sx, sy, da) {
  const w = mapFullToWorld(sx, sy);
  mapFull.rot += da;
  mapFullPin(w, sx, sy);
}

// ---------- Что за здание в точке ----------
// Здания и места — то, что зарегистрировано в панели «что это» (hoverInfos). Их рамки в мире считаем
// один раз (здания не двигаются): на миг ставим мир без поворота и сдвига, чтобы рамка была точной
const mapPlaceBoxes = new Map(); // object → { x1, z1, x2, z2 } | null
const mapBox = new THREE.Box3();

function mapPlaceBox(object) {
  if (mapPlaceBoxes.has(object)) return mapPlaceBoxes.get(object);
  const rot = cityGroup.rotation.y;
  const pos = cityGroup.position.clone();
  cityGroup.rotation.y = 0;
  cityGroup.position.set(0, 0, 0);
  cityGroup.updateMatrixWorld(true);
  let inCity = false;
  for (let o = object.parent; o; o = o.parent) if (o === cityGroup) inCity = true;
  mapBox.setFromObject(object);
  const box = inCity && !mapBox.isEmpty() ? { x1: mapBox.min.x, z1: mapBox.min.z, x2: mapBox.max.x, z2: mapBox.max.z } : null;
  cityGroup.rotation.y = rot;
  cityGroup.position.copy(pos);
  cityGroup.updateMatrixWorld(true);
  mapPlaceBoxes.set(object, box);
  return box;
}

// Самое маленькое здание или место, в которое попадает точка (часть здания важнее всего здания)
function mapPlaceAt(x, z) {
  let best = null;
  let bestArea = Infinity;
  for (const h of hoverInfos) {
    const b = mapPlaceBox(h.object);
    if (!b || x < b.x1 || x > b.x2 || z < b.z1 || z > b.z2) continue;
    const area = (b.x2 - b.x1) * (b.z2 - b.z1);
    if (area >= bestArea) continue;
    const info = typeof h.info === 'function' ? h.info() : h.info;
    if (!info) continue;
    best = { box: b, info };
    bestArea = area;
  }
  return best;
}

function mapFullShowAt(sx, sy) {
  const w = mapFullToWorld(sx, sy);
  mapFull.hover = mapPlaceAt(w.x, w.z);
}

// ---------- Жесты ----------
// Мышь и палец — через Pointer Events. Один палец (или левая кнопка) — двигать; два пальца — масштаб,
// поворот и сдвиг сразу; правая кнопка или Shift — крутить. Касание без сдвига — что здесь
const mfPointers = new Map(); // id → { x, y }
let mfDown = null; // { x, y, t, moved, turn }

mapFullCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
mapFullCanvas.addEventListener('pointerdown', (e) => {
  mapFullCanvas.setPointerCapture(e.pointerId);
  mfPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (mfPointers.size === 1) mfDown = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, turn: e.button === 2 || e.shiftKey };
  else if (mfDown) mfDown.moved = true; // второй палец — это уже жест, а не касание
  mapFullCanvas.classList.add('drag');
});

mapFullCanvas.addEventListener('pointermove', (e) => {
  const prev = mfPointers.get(e.pointerId);
  if (!prev) {
    if (e.pointerType === 'mouse') mapFullShowAt(e.clientX, e.clientY); // просто навели мышь
    return;
  }
  const W = window.innerWidth;
  const H = window.innerHeight;
  if (mfPointers.size >= 2) {
    // Два пальца: было (a, b), стало (a', b') — масштаб по расстоянию, поворот по углу, сдвиг по середине
    const ids = [...mfPointers.keys()].slice(0, 2);
    if (!ids.includes(e.pointerId)) return;
    const a = mfPointers.get(ids[0]);
    const b = mfPointers.get(ids[1]);
    const a2 = ids[0] === e.pointerId ? { x: e.clientX, y: e.clientY } : a;
    const b2 = ids[1] === e.pointerId ? { x: e.clientX, y: e.clientY } : b;
    const w = mapFullToWorld((a.x + b.x) / 2, (a.y + b.y) / 2);
    const d1 = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const d2 = Math.hypot(b2.x - a2.x, b2.y - a2.y) || 1;
    const ang1 = Math.atan2(b.y - a.y, b.x - a.x);
    const ang2 = Math.atan2(b2.y - a2.y, b2.x - a2.x);
    mapFull.scale = Math.min(mapFullMaxScale, Math.max(mapFullMinScale, (mapFull.scale * d2) / d1));
    mapFull.rot -= ang2 - ang1; // карта поворачивается вслед за пальцами
    mapFullPin(w, (a2.x + b2.x) / 2, (a2.y + b2.y) / 2);
  } else if (mfDown) {
    if (!mfDown.moved && Math.hypot(e.clientX - mfDown.x, e.clientY - mfDown.y) < 6) return;
    mfDown.moved = true;
    if (mfDown.turn) {
      // Поворот вокруг центра экрана: угол курсора относительно центра
      const ang1 = Math.atan2(prev.y - H / 2, prev.x - W / 2);
      const ang2 = Math.atan2(e.clientY - H / 2, e.clientX - W / 2);
      mapFullTurnAt(W / 2, H / 2, -(ang2 - ang1));
    } else {
      const w = mapFullToWorld(prev.x, prev.y);
      mapFullPin(w, e.clientX, e.clientY); // точка под пальцем едет вместе с ним
    }
  }
  mfPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
});

function mfUp(e) {
  if (!mfPointers.has(e.pointerId)) return;
  mfPointers.delete(e.pointerId);
  if (mfPointers.size === 0) {
    // Касание или клик — что здесь, и герой отправляется в эту точку, как по клику на миникарте (src/player/travel.js)
    if (mfDown && !mfDown.moved && !mfDown.turn && performance.now() - mfDown.t < 500) {
      mapFullShowAt(e.clientX, e.clientY);
      const w = mapFullToWorld(e.clientX, e.clientY);
      travelTo(w.x, w.z);
    }
    mfDown = null;
    mapFullCanvas.classList.remove('drag');
  } else if (mfDown) {
    // Один палец остался — дальше он двигает карту с текущего места
    const [p] = mfPointers.values();
    mfDown = { x: p.x, y: p.y, t: 0, moved: true, turn: false };
  }
}
mapFullCanvas.addEventListener('pointerup', mfUp);
mapFullCanvas.addEventListener('pointercancel', mfUp);

mapFullCanvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    mapFullZoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
  },
  { passive: false },
);

window.addEventListener(
  'keydown',
  (e) => {
    if (!mapFull.open) return;
    if (e.code === 'Escape') setMapFullOpen(false);
    e.stopImmediatePropagation(); // пока открыта карта, игровые клавиши не работают
  },
  true,
);

// ---------- Отрисовка ----------
let mapFullInfoShown = '';
function drawMapFull() {
  if (!mapFull.open) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(window.innerWidth * dpr);
  const H = Math.round(window.innerHeight * dpr);
  if (mapFullCanvas.width !== W || mapFullCanvas.height !== H) {
    mapFullCanvas.width = W;
    mapFullCanvas.height = H;
  }
  const h = mapFull.hover;
  drawMapView(mapFullCtx, W, H, mapFull.cx, mapFull.cz, mapFull.scale * dpr, mapFull.rot, currentInterior(), h && h.box);
  const html = h
    ? '<div class="k"></div><div class="n"></div><div class="d"></div>'
    : '';
  const key = h ? h.info.kind + '|' + h.info.name + '|' + h.info.desc : 'hint';
  if (key === mapFullInfoShown) return;
  mapFullInfoShown = key;
  mapFullInfo.classList.toggle('hint', !h);
  if (!h) {
    mapFullInfo.textContent = mapFullHint;
    return;
  }
  mapFullInfo.innerHTML = html;
  mapFullInfo.querySelector('.k').textContent = h.info.kind || '';
  mapFullInfo.querySelector('.n').textContent = h.info.name || '';
  mapFullInfo.querySelector('.d').textContent = h.info.desc || '';
}
