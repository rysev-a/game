// core/game.js
// ГЛАВНЫЙ ЦИКЛ. Порядок кадра: ввод → движение пешком → езда → люди и сцены → подсказка →
// вращение мира вокруг игрока → тело игрока → камера → затухание зданий → погода, звук, карта → рендер.

// Старт: в доме, в прихожей на первом этаже
playerWorldX = home.door.x;
playerWorldZ = homeFloorZ[0] + 2;
showToast('Чтобы поехать: возьмите ключи, пройдите в гараж и откройте дверь', 7000);

function updatePrompt() {
  const promptEl = document.getElementById('prompt');
  let promptText = '';
  const it = dialogueOpen ? null : activeInteractable(); // в разговоре подсказка не нужна
  if (it) {
    promptText = it.prompt();
  } else if (drivingCar) {
    promptText =
      Math.abs(drivingCar.speed) <= exitMaxSpeed
        ? 'R или F — выйти из машины'
        : 'W/S — газ, A/D — руль, Space — тормоз. Остановитесь, чтобы выйти';
  }
  promptEl.textContent = promptText;
  promptEl.style.display = promptText ? 'block' : 'none';
}

function animate() {
  requestAnimationFrame(animate);

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
  updateCamera();
  updateFade();
  updateSchedule();
  updateRain();
  updateSound();

  drawMinimap();
  updateTravelHud();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
