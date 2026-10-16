// src/engine/game.js
// ГЛАВНЫЙ ЦИКЛ. Порядок кадра: ввод → движение пешком → езда → люди и сцены → подсказка →
// вращение мира вокруг игрока → тело игрока → оружие и цели → камера → затухание зданий → погода, звук, карта → вещь под мышью → рендер.

// Старт: в доме, в прихожей на первом этаже. ДЕМО задает свою точку (demoStart в src/demo/demo.js)
if (typeof demoStart !== 'undefined') {
  playerWorldX = demoStart.x;
  playerWorldZ = demoStart.z;
} else {
  playerWorldX = home.door.x;
  playerWorldZ = homeFloorZ[0] + 2;
  showToast('Чтобы поехать: возьмите ключи, пройдите в гараж и откройте дверь', 7000);
}

function updatePrompt() {
  const promptEl = document.getElementById('prompt');
  let promptText = '';
  const it = dialogueOpen ? null : activeInteractable(); // в разговоре подсказка не нужна
  if (it) {
    promptText = it.prompt();
  } else if (drivingCar && !touchUI) { // на телефоне выход — кнопка 🚪 рядом с оружием (src/engine/touch.js)
    promptText =
      Math.abs(drivingCar.speed) <= exitMaxSpeed
        ? 'E или F — выйти из машины'
        : 'W/S — газ, A/D — руль, Space — тормоз. Остановитесь, чтобы выйти';
  }
  if (touchUI && promptText) promptText = touchPromptText(promptText); // на телефоне — без клавиш (src/engine/touch.js)
  promptEl.textContent = promptText;
  promptEl.style.display = promptText ? 'block' : 'none';
}

// Игра рассчитана на 60 кадров в секунду: движение считается за кадр, поэтому на мониторах
// с частотой выше 60 Гц лишние кадры пропускаем, иначе все ускоряется
const frameMs = 1000 / 60;
let lastTick = -Infinity;

function animate(now = performance.now()) {
  requestAnimationFrame(animate);
  if (now - lastTick < frameMs - 1) return;
  lastTick = Math.max(lastTick + frameMs, now - frameMs);

  updateRotationKeys();
  const controls = readControls();
  const move = updateWalking(controls);
  updateDriving(controls);
  updatePushing(controls);
  updateCarMeshes();

  updateNpcs();
  updateHelper();
  updateMallPeople();
  updateIncident();
  updateHome();
  updateGarage();
  updateFuelHud();
  updateGasStation();
  updatePrompt();

  applyWorldTransform();
  updatePlayerBody(move);
  updateWeapons(); // после тела: корпус к цели, заряды, нагрев
  updateCombat(); // цели: полоски здоровья, вспышки, состояния
  updateEnemyAttacks(); // снаряды и удары врагов по герою
  updateCamera();
  updateFade();
  updateSchedule();
  updateRain();
  setStreetLampsNight(Math.min(1, (1 - daylight()) / 0.6)); // фонари зажигаются в сумерках
  updateSound();

  drawMinimap();
  updateTravelHud();
  updatePickHover(pickMouse); // вещь под мышью подсвечивается
  updateHoverInfo(pickMouse); // что под мышью — в панели справа
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
