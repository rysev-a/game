// src/engine/input.js
// Ввод: клавиши, полный экран, мышь (зажатое колесо — вращение вида и наклон горизонта, наведение
// и клик — взять вещь), колесо — зум, а в боевом режиме — смена оружия. Вид и прицел захваченной
// мышью в боевом режиме — src/engine/mouse-look.js.

// ВИД МЫШЬЮ. Играем кнопками: W/S — вперед/назад, A/D — поворот, камера поворачивается вместе
// с игроком. Пока зажато колесо мыши, движение мыши вращает камеру и наклоняет горизонт; отпустили —
// после паузы камера сама встает за игрока (как после стрелок, cameraHoldFrames в src/player/player.js).
let viewDragging = false;

const keys = {};
window.addEventListener('keydown', (e) => {
  if (settingsOpen || dialogueOpen) return; // в меню и в разговоре играть нельзя; раскрытый инвентарь игре не мешает
  keys[e.code] = true;
  if (e.code === 'KeyE' && !e.repeat) onInteract(); // все действия — клавишей E
  if (e.code === 'KeyP' && !e.repeat) rainManual = !rainOn;
});
window.addEventListener('keyup', (e) => (keys[e.code] = false));

// ПОЛНЫЙ ЭКРАН И МЫШЬ
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
  mouseHint.style.display = 'block';
  mouseHint.textContent = mouseLookActive()
    ? 'W/S — вперед/назад · A/D — вбок · мышь — прицел · колесо — оружие · Esc — отпустить мышь'
    : 'W/S — вперед/назад · A/D — поворот · E — действие · зажатое колесо мыши или стрелки — камера · клик по вещи — взять';
}
updateMouseHint();

function onFullscreenChange() {
  isFullscreen = Boolean(getFullscreenElement());
  fullscreenBtn.textContent = isFullscreen ? '✕ Выйти из полного экрана' : '⛶ На весь экран';
}
document.addEventListener('fullscreenchange', onFullscreenChange);
document.addEventListener('webkitfullscreenchange', onFullscreenChange);

// Зажатое колесо на сцене — вращаем вид (на миникарте зажатое колесо двигает карту, src/engine/minimap.js)
renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button === 1) {
    e.preventDefault(); // без «автопрокрутки» браузера
    viewDragging = true;
  } else if (e.button === 0 && !settingsOpen && !dialogueOpen) {
    pickHovered(); // клик по подсвеченной вещи — в инвентарь
  }
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 1) viewDragging = false;
});
window.addEventListener('blur', () => (viewDragging = false));

// Где курсор над сценой (-1..1) — по нему ищем вещь под мышью (updatePickHover в src/engine/interact.js)
let pickMouse = null;
renderer.domElement.addEventListener('mousemove', (e) => {
  if (mouseLookActive()) {
    pickMouse = null; // мышь захвачена для прицела — курсора нет, вещи под ним не ищем
    return;
  }
  pickMouse = pickMouse || new THREE.Vector2();
  pickMouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
});
renderer.domElement.addEventListener('mouseleave', () => (pickMouse = null));

document.addEventListener('mousemove', (e) => {
  if (!viewDragging) return;
  if (!(e.buttons & 4)) {
    viewDragging = false; // отпустили где-то вне окна
    return;
  }
  worldRotation += e.movementX * mouseSensitivity;
  // Мышь вверх — камера поднимается (как ↑), вниз — опускается (как ↓)
  cameraHeight = Math.min(
    Math.max(cameraHeight - e.movementY * mouseTiltSensitivity, cameraHeightMin),
    cameraHeightMax,
  );
  cameraHoldFrames = cameraHoldDelay; // пока крутим и чуть после — камера не возвращается за игроком
});

// Колесо мыши — масштаб: вверх — ближе, вниз — дальше. В боевом режиме на компьютере колесо меняет
// оружие: вниз — следующее, вверх — предыдущее. Тачпад шлет много мелких событий: копим прокрутку
// и меняем не чаще раза в wheelSwitchMs
let wheelAcc = 0;
let wheelSwitchAt = 0;
const wheelSwitchMs = 160;
window.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const onScene = e.target === renderer.domElement || mouseLookActive();
    if (!touchUI && inCombatMode() && onScene && !settingsOpen && !dialogueOpen) {
      const now = performance.now();
      wheelAcc += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      if (Math.abs(wheelAcc) >= 50 && now - wheelSwitchAt > wheelSwitchMs) {
        nextWeapon(wheelAcc > 0 ? 1 : -1);
        wheelAcc = 0;
        wheelSwitchAt = now;
      }
      return;
    }
    const factor = e.deltaY < 0 ? 1 / 1.1 : 1.1;
    zoom = Math.min(Math.max(zoom * factor, zoomMin), zoomMax);
  },
  { passive: false },
);
