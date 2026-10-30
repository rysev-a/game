// src/engine/scene.js
// Сцена, камера, рендерер и корневая группа мира (cityGroup).
// Вся карта живет внутри cityGroup: при вращении вида поворачивается и сдвигается именно она,
// а игрок остается в центре экрана.

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x334455);
scene.fog = new THREE.FogExp2(0x334455, 0.01);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.5,
  1000,
);
// Сенсорный экран (телефон, планшет) — включаем сенсорное управление (src/engine/touch.js).
// На компьютере его можно проверить, добавив ?touch к адресу
const touchUI = /[?&]touch\b/.test(location.search) || window.matchMedia('(pointer: coarse)').matches;
// Сглаживание краев и учет плотности пикселей экрана (не больше 2, чтобы не грузить 4K/Retina).
// На телефоне — без сглаживания и не больше 1,5: экран мелкий, а видеокарта слабее
const renderer = new THREE.WebGLRenderer({ antialias: !touchUI, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touchUI ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Тени от солнца — только на компьютере (на телефоне дорого). Карта теней идет за героем: см. updateSunShadow
const shadowsAvailable = !touchUI;
if (shadowsAvailable) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

// Контейнер для города
const cityGroup = new THREE.Group();
scene.add(cityGroup);

// Свет. Небо сверху и отраженный от земли снизу (HemisphereLight) плюс солнце под углом,
// поэтому грани одного бокса получают разные тона. Солнце живет внутри cityGroup,
// чтобы при вращении вида оно оставалось на месте относительно города.
const skyLight = new THREE.HemisphereLight(0xffffff, 0xb0aa9e, 0.72);
scene.add(skyLight);
const sunLight = new THREE.DirectionalLight(0xfff4e0, 0.38);
sunLight.position.set(30, 60, 18);
cityGroup.add(sunLight);
cityGroup.add(sunLight.target);
const SUN_OFFSET = new THREE.Vector3(30, 60, 18);
if (shadowsAvailable) {
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  const cam = sunLight.shadow.camera;
  cam.left = cam.bottom = -45;
  cam.right = cam.top = 45;
  cam.near = 10;
  cam.far = 200;
  sunLight.shadow.bias = -0.001;
  sunLight.shadow.normalBias = 0.12;
}

// Каждый кадр после applyWorldTransform: солнце и его карта теней стоят над героем (координаты cityGroup = мир)
function updateSunShadow() {
  if (!shadowsAvailable) return;
  sunLight.castShadow = settings.shadows !== false && sunLight.intensity > 0.02;
  // Шаг в размер текселя, чтобы края теней не мерцали при ходьбе
  const texel = 90 / 2048;
  const x = Math.round(playerWorldX / texel) * texel;
  const z = Math.round(playerWorldZ / texel) * texel;
  sunLight.target.position.set(x, 0, z);
  sunLight.position.set(x + SUN_OFFSET.x, SUN_OFFSET.y, z + SUN_OFFSET.z);
}

const daySkyColor = new THREE.Color(0xffffff);
const nightSkyColor = new THREE.Color(0x9fb4ff);

// day 0..1 (daylight() из clock.js): ночью солнце гаснет, небо тускнеет и синеет
function setDaylight(day) {
  // «Всегда солнечно»: свет ярче обычного дня (солнце и небо сильнее)
  const sunny = settings.alwaysSunny ? 1 : 0;
  sunLight.intensity = (0.38 + 0.16 * sunny) * day;
  skyLight.intensity = 0.55 + 0.17 * day + 0.1 * sunny;
  skyLight.color.copy(nightSkyColor).lerp(daySkyColor, day);
}

// Свечение (bloom) для ярких вещей: фонари, фары, оружие. Только компьютер; без галочки или без скриптов — обычный рендер
let composer = null;
let bloomPass = null;
function initPostFx() {
  if (touchUI || typeof THREE.EffectComposer === 'undefined' || typeof THREE.UnrealBloomPass === 'undefined') return;
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLMultisampleRenderTarget(size.x, size.y, { format: THREE.RGBAFormat });
  target.samples = 4;
  composer = new THREE.EffectComposer(renderer, target);
  composer.addPass(new THREE.RenderPass(scene, camera));
  bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.6, 0.92);
  composer.addPass(bloomPass);
}
initPostFx();

function renderFrame() {
  if (composer && settings.bloom !== false) composer.render();
  else renderer.render(scene, camera);
}
function resizeRender() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}
