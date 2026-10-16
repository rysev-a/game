// src/world/weather.js
// ПОГОДА: дождь (капли-штрихи в «коробке» вокруг камеры, круги на земле — кроме телефона, темнее небо и туман),
// снег (с ноября по март вместо дождя), просветление после дождя и расписание.

// ДОЖДЬ. Капли — штрихи (LineSegments) в «коробке» вокруг камеры: коробка
// живет в экранных осях, а не в мире, поэтому вращение города ее не задевает,
// и масштабируется под зум. Круги от капель на земле — InstancedMesh колец.
// Пока идет дождь, небо и туман темнеют, а поверх экрана ложится легкое затемнение
let rainOn = false; // P — включить/выключить вручную; по расписанию — см. updateSchedule
let snowOn = false; // идет снег (вместо дождя): с ноября по март или Shift+P
let weather = 0; // 0 — ясно, 1 — ливень; плавно догоняет цель
const clearSky = new THREE.Color(0x334455);
const rainSky = new THREE.Color(0x1c2733);
const brightSky = new THREE.Color(0x6a88a6); // чуть светлее обычного — сразу после дождя
const nightSky = new THREE.Color(0x070b14); // ночное небо (чем темнее время суток — тем ближе к нему)
const skyScratch = new THREE.Color();
const nightTint = document.getElementById('nightTint');
const glowDuration = 12; // секунд, пока небо светлее обычного
const sunTint = document.getElementById('sunTint');
const rainTint = document.getElementById('rainTint');
const windX = 0.0014; // боковой снос капли за кадр (в долях коробки)
const dropLen = 0.04;

const rainCount = 6000;
const rainDrops = Array.from({ length: rainCount }, () => ({
  x: Math.random() * 2 - 1,
  y: Math.random(),
  z: Math.random() * 2 - 1,
  v: 0.016 + Math.random() * 0.012,
}));
const rainPos = new Float32Array(rainCount * 6);
const rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3).setUsage(THREE.DynamicDrawUsage));
const rain = new THREE.LineSegments(
  rainGeo,
  new THREE.LineBasicMaterial({ color: 0xaec6e0, transparent: true, opacity: 0.5, depthWrite: false }),
);
rain.frustumCulled = false;
rain.visible = false;
scene.add(rain);

const rippleCount = 180;
const ripples = new THREE.InstancedMesh(
  new THREE.RingGeometry(0.75, 1, 16).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  rippleCount,
);
ripples.frustumCulled = false;
ripples.visible = false;
scene.add(ripples);
const rippleData = Array.from({ length: rippleCount }, () => ({
  x: Math.random() * 2 - 1,
  z: Math.random() * 2 - 1,
  age: Math.random(),
}));
// СНЕГ — белые точки в такой же «коробке» вокруг камеры: падают медленно и покачиваются
const snowCount = 4000;
const snowFlakes = Array.from({ length: snowCount }, () => ({
  x: Math.random() * 2 - 1,
  y: Math.random(),
  z: Math.random() * 2 - 1,
  v: 0.0025 + Math.random() * 0.002,
  ph: Math.random() * Math.PI * 2,
}));
const snowPos = new Float32Array(snowCount * 3);
const snowGeo = new THREE.BufferGeometry();
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3).setUsage(THREE.DynamicDrawUsage));
const snow = new THREE.Points(
  snowGeo,
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0.85, depthWrite: false }),
);
snow.frustumCulled = false;
snow.visible = false;
scene.add(snow);
let snowAmount = 0; // 0..1 — плавно догоняет snowOn

const rippleMatrix = new THREE.Matrix4();
const rippleTint = new THREE.Color();

function updateRain() {
  // В зданиях дождя нет
  const target = (rainOn || snowOn) && !insideBuilding() ? 1 : 0;
  weather += (target - weather) * 0.03;
  if (Math.abs(target - weather) < 0.002) weather = target;
  const snowTarget = snowOn && !insideBuilding() ? 1 : 0;
  snowAmount += (snowTarget - snowAmount) * 0.03;
  if (Math.abs(snowTarget - snowAmount) < 0.002) snowAmount = snowTarget;
  const rainAmount = Math.max(0, weather - snowAmount); // пока идет снег, капель нет

  // После дождя на короткое время чуть светлее: растет по мере того, как стихает ливень,
  // и за glowDuration секунд гаснет
  const glow =
    rainEndedAt > 0 ? Math.max(0, 1 - (gameTime - rainEndedAt) / glowDuration) * (1 - weather) : 0;
  // Время суток: чем темнее, тем ближе небо к ночному, а поверх экрана ложится синее затемнение
  const night = 1 - daylight();
  skyScratch.copy(clearSky).lerp(nightSky, night);
  scene.background.copy(skyScratch).lerp(rainSky, weather * (1 - night * 0.7)).lerp(brightSky, glow * 0.6 * (1 - night));
  setDaylight(1 - night); // свет сцены; синее затенение поверх экрана теперь слабее, темноту дает сам свет
  nightTint.style.opacity = (night * 0.25).toFixed(3);
  scene.fog.color.copy(scene.background);
  scene.fog.density = 0.01 + 0.006 * weather - 0.003 * glow;
  sunTint.style.opacity = (0.1 * glow).toFixed(3);
  rainTint.style.opacity = (0.22 * weather).toFixed(3);

  // Коробка дождя и снега: растет с зумом и высотой камеры, чтобы покрывать весь вид
  const half = 25 + 35 * zoom;
  const height = Math.max(cameraHeight * zoom, 12) + 12;
  updateSnow(half, height);

  const active = rainAmount > 0.01;
  rain.visible = active;
  ripples.visible = active && !touchUI; // на телефоне кругов на земле нет: только капли
  if (!active) return;
  rain.scale.set(half, height, half);

  // Плавное начало и конец ливня — меняем число видимых капель
  const n = Math.ceil(rainCount * rainAmount);
  rainGeo.setDrawRange(0, n * 2);
  for (let i = 0; i < n; i++) {
    const d = rainDrops[i];
    d.y -= d.v;
    d.x += windX;
    if (d.y < 0) {
      d.y += 1;
      d.x = Math.random() * 2 - 1;
      d.z = Math.random() * 2 - 1;
    }
    if (d.x > 1) d.x -= 2;
    const o = i * 6;
    rainPos[o] = d.x;
    rainPos[o + 1] = d.y;
    rainPos[o + 2] = d.z;
    rainPos[o + 3] = d.x - windX * (dropLen / d.v); // хвост капли — выше и против ветра
    rainPos[o + 4] = d.y + dropLen;
    rainPos[o + 5] = d.z;
  }
  rainGeo.attributes.position.needsUpdate = true;

  // Круги на земле: растут и гаснут, потом возникают в новом месте
  if (!ripples.visible) return;
  ripples.count = Math.ceil(rippleCount * rainAmount);
  for (let i = 0; i < ripples.count; i++) {
    const r = rippleData[i];
    r.age += 0.035;
    if (r.age >= 1) {
      r.age = 0;
      r.x = Math.random() * 2 - 1;
      r.z = Math.random() * 2 - 1;
    }
    const size = 0.15 + r.age * 0.85;
    rippleMatrix.makeScale(size, 1, size).setPosition(r.x * half * 0.8, 0.12, r.z * half * 0.8);
    ripples.setMatrixAt(i, rippleMatrix);
    const b = (1 - r.age) * 0.5;
    ripples.setColorAt(i, rippleTint.setRGB(b * 0.8, b * 0.9, b));
  }
  ripples.instanceMatrix.needsUpdate = true;
  ripples.instanceColor.needsUpdate = true;
}

function updateSnow(half, height) {
  snow.visible = snowAmount > 0.01;
  if (!snow.visible) return;
  snow.scale.set(half, height, half);
  const n = Math.ceil(snowCount * snowAmount);
  snowGeo.setDrawRange(0, n);
  for (let i = 0; i < n; i++) {
    const f = snowFlakes[i];
    f.y -= f.v;
    f.ph += 0.03;
    f.x += windX * 0.4 + Math.sin(f.ph) * 0.0008; // ветер слабее, хлопья покачиваются
    if (f.y < 0) {
      f.y += 1;
      f.x = Math.random() * 2 - 1;
      f.z = Math.random() * 2 - 1;
    }
    if (f.x > 1) f.x -= 2;
    if (f.x < -1) f.x += 2;
    snowPos[i * 3] = f.x;
    snowPos[i * 3 + 1] = f.y;
    snowPos[i * 3 + 2] = f.z;
  }
  snowGeo.attributes.position.needsUpdate = true;
}

// РАСПИСАНИЕ ПОГОДЫ идет по ИГРОВОМУ времени (src/engine/clock.js), а не по реальному:
//   • стартовый ливень — через 20 игровых минут после начала истории, длится 30 (как и задумывалось: 20–50 с);
//   • дальше время делится на часовые отрезки; в каждом дождь либо есть (на 25–55 минут в случайный момент),
//     либо нет. Ночью (22:00–6:00) дождь бывает почти в каждом отрезке (85%), днем — примерно в одном из семи.
//     «Случайность» детерминирована номером отрезка, поэтому после загрузки сохранения погода та же.
//   • как часто идет дождь — настройка «Как часто идет дождь» (rainFreq): редко — шанс в 0,4 раза меньше, часто — вдвое больше.
// P включает/выключает дождь вручную до ближайшей смены по расписанию.
// Если в настройках дождь выключен, его не бывает вовсе — ни по расписанию, ни по P.
// СНЕГ: с ноября по март (по игровой дате) вместо дождя идет снег; Shift+P — снег вручную (до смены расписания).
// Галочка «Снег» в настройках выключает его: тогда и зимой идет дождь (если он не выключен).
const rainFirstAt = 20; // игровых минут от начала истории
const rainDuration = 30;
const rainSlotMinutes = 60;
const rainChanceNight = 0.85;
const rainChanceDay = 0.15;
const rainFreqFactor = { rare: 0.4, normal: 1, often: 2 };
const snowMonths = [10, 11, 0, 1, 2]; // ноябрь–март (месяцы Date с нуля)
const coldSeason = (min = gameMinutes) => snowMonths.includes(gameDateTime(min).getMonth());

function slotRandom(n, salt) {
  const v = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function rainScheduled(min) {
  if (min >= rainFirstAt && min < rainFirstAt + rainDuration) return true;
  const slot = Math.floor(min / rainSlotMinutes);
  const base = isNightHour(gameHour(slot * rainSlotMinutes + rainSlotMinutes / 2)) ? rainChanceNight : rainChanceDay;
  const chance = Math.min(0.95, base * (rainFreqFactor[settings.rainFreq] || 1));
  if (slotRandom(slot, 1) >= chance) return false;
  const len = 25 + slotRandom(slot, 2) * 30;
  const start = slotRandom(slot, 3) * (rainSlotMinutes - len);
  const t = min - slot * rainSlotMinutes;
  return t >= start && t < start + len;
}

let gameTime = 0; // реальные секунды игры: по ним гаснет просветление после дождя
let lastFrameTime = performance.now();
let scheduledNow = false;
let rainManual = null; // null — по расписанию, true/false — вручную
let snowManual = null; // null — снег по времени года, true/false — вручную (Shift+P)

// Shift+P: снег вручную — включить (сразу и осадки) или выключить
function toggleSnowManual() {
  if (snowOn) {
    snowManual = false;
    if (!coldSeason()) rainManual = false; // летом снег был только вручную — просто перестал
  } else {
    snowManual = true;
    rainManual = true;
  }
}
let rainEndedAt = -1; // когда закончился последний дождь (для просветления)

function updateSchedule() {
  const now = performance.now();
  const dt = Math.min(now - lastFrameTime, 100) / 1000;
  gameTime += dt;
  lastFrameTime = now;
  updateClock(dt); // игровые часы идут вместе с кадрами
  const scheduled = rainScheduled(gameMinutes);
  if (scheduled !== scheduledNow) {
    scheduledNow = scheduled;
    rainManual = null; // расписание сменилось — ручной режим сбрасывается
    snowManual = null;
  }
  const wasOn = rainOn || snowOn;
  const falling = rainManual !== null ? rainManual : scheduled; // идут осадки
  // Снег или дождь; выключенные в настройках (src/engine/settings.js) не идут совсем
  const isSnow = settings.snow && (snowManual !== null ? snowManual : coldSeason());
  snowOn = falling && isSnow;
  rainOn = falling && !isSnow && settings.rain;
  if (wasOn && !(rainOn || snowOn)) rainEndedAt = gameTime;
}
