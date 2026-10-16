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
// Сглаживание краев и учет плотности пикселей экрана (не больше 2, чтобы не грузить 4K/Retina)
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

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

const daySkyColor = new THREE.Color(0xffffff);
const nightSkyColor = new THREE.Color(0x9fb4ff);

// day 0..1 (daylight() из clock.js): ночью солнце гаснет, небо тускнеет и синеет
function setDaylight(day) {
  sunLight.intensity = 0.38 * day;
  skyLight.intensity = 0.55 + 0.17 * day;
  skyLight.color.copy(nightSkyColor).lerp(daySkyColor, day);
}
