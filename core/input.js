// core/input.js
// Ввод: клавиши, полный экран, захват мыши (вращение вида и наклон горизонта), колесо — зум.

// ВИД МЫШЬЮ. По умолчанию играем кнопками: ↑/W — вперед, ↓/S — назад, ←/A и →/D — поворот, камера
// поворачивается вместе с игроком. Кнопка-глаз (или V) включает поворот вида мышью: клик по сцене
// захватывает мышь, и тогда она вращает камеру и наклоняет горизонт. Выключили глаз — снова только кнопки.
let viewLookActive = false;

const keys = {};
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyV' && !e.repeat && !settingsOpen && !dialogueOpen && !inventoryOpen) setViewLook(!viewLookActive);
  if (settingsOpen || dialogueOpen || inventoryOpen) return; // в меню, в разговоре и с раскрытым инвентарем играть нельзя
  keys[e.code] = true;
  if (e.code === 'KeyR' && !e.repeat) onInteract();
  if (e.code === 'KeyP' && !e.repeat) rainManual = !rainOn;
});
window.addEventListener('keyup', (e) => (keys[e.code] = false));

// ПОЛНЫЙ ЭКРАН И ВРАЩЕНИЕ МЫШЬЮ
const fullscreenBtn = document.getElementById('fullscreenBtn');
const mouseHint = document.getElementById('mouseHint');
const getFullscreenElement = () =>
  document.fullscreenElement || document.webkitFullscreenElement;
const mouseSensitivity = 0.005; // рад на пиксель движения мыши
const mouseTiltSensitivity = 0.08; // единиц высоты камеры на пиксель
let isFullscreen = false;

fullscreenBtn.addEventListener('click', () => {
  if (getFullscreenElement()) {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  } else {
    const root = document.documentElement;
    if (root.requestFullscreen) root.requestFullscreen();
    else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
  }
});

function updateMouseHint() {
  const locked = document.pointerLockElement === renderer.domElement;
  mouseHint.style.display = locked ? 'none' : 'block';
  mouseHint.textContent = viewLookActive
    ? 'Вид мышью: клик по экрану — захват мыши, Esc — освободить. Глаз (V) — выключить'
    : 'W/S — вперед/назад · A/D — поворот · Q/E — шаги в стороны · R — действие · стрелки — камера · Глаз (V) — вид мышью';
}
updateMouseHint();

function onFullscreenChange() {
  isFullscreen = Boolean(getFullscreenElement());
  fullscreenBtn.textContent = isFullscreen ? '✕ Выйти из полного экрана' : '⛶ На весь экран';
  updateMouseHint();
}
document.addEventListener('fullscreenchange', onFullscreenChange);
document.addEventListener('webkitfullscreenchange', onFullscreenChange);

// Клик по сцене (когда глаз включен) захватывает мышь (Pointer Lock);
// после этого мышью можно вращать камеру и менять наклон горизонта
const eyeBtn = document.getElementById('eyeBtn');
eyeBtn.appendChild(pixelIcon('eye'));

function setViewLook(on) {
  viewLookActive = on;
  eyeBtn.classList.toggle('active', on);
  if (on) {
    // Нажатие — это действие пользователя, поэтому мышь можно захватить сразу
    if (document.pointerLockElement !== renderer.domElement) {
      const request = renderer.domElement.requestPointerLock();
      if (request && request.catch) request.catch(() => {});
    }
  } else if (document.exitPointerLock) {
    document.exitPointerLock();
  }
  updateMouseHint();
}
eyeBtn.addEventListener('click', () => setViewLook(!viewLookActive));

renderer.domElement.addEventListener('click', () => {
  if (viewLookActive && document.pointerLockElement !== renderer.domElement) {
    const request = renderer.domElement.requestPointerLock();
    if (request && request.catch) request.catch(() => {});
  }
});
document.addEventListener('pointerlockchange', updateMouseHint);

document.addEventListener('mousemove', (e) => {
  if (viewLookActive && document.pointerLockElement === renderer.domElement) {
    worldRotation += e.movementX * mouseSensitivity;
    // Мышь вверх — камера поднимается (как R), вниз — опускается (как F)
    cameraHeight = Math.min(
      Math.max(cameraHeight - e.movementY * mouseTiltSensitivity, cameraHeightMin),
      cameraHeightMax,
    );
  }
});

// Колесо мыши — масштаб: вверх — ближе, вниз — дальше
window.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1 / 1.1 : 1.1;
    zoom = Math.min(Math.max(zoom * factor, zoomMin), zoomMax);
  },
  { passive: false },
);
