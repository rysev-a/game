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
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Контейнер для города
const cityGroup = new THREE.Group();
scene.add(cityGroup);
