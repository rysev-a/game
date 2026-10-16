// src/demo/fuel-can.js
// ДЕМО: КАНИСТРА. Пока вы за рулем, рядом с шестеренкой настроек видна кнопка-канистра: нажали — в бак
// машины добавляется полбака бензина (больше полного не нальется). Только в ДЕМО, чтобы не ездить на заправку.

const demoFuelStyle = document.createElement('style');
demoFuelStyle.textContent = `
  #demoFuel { position: absolute; bottom: 68px; left: 14px; z-index: 12; width: 46px; height: 46px; padding: 0; display: none;
    align-items: center; justify-content: center; border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 8px;
    background: rgba(0, 0, 0, 0.6); cursor: pointer; -webkit-tap-highlight-color: transparent; }
  #demoFuel:hover { background: rgba(60, 60, 60, 0.85); }
  #demoFuel .px { width: 30px; height: 30px; image-rendering: pixelated; pointer-events: none; }
  body.touch #demoFuel { top: max(8px, env(safe-area-inset-top)); bottom: auto; left: auto; right: 100px; width: 34px; height: 34px; }
  body.touch #demoFuel .px { width: 24px; height: 24px; }
`;
document.head.appendChild(demoFuelStyle);

const demoFuelBtn = document.createElement('button');
demoFuelBtn.id = 'demoFuel';
demoFuelBtn.title = 'Канистра: +полбака';
demoFuelBtn.appendChild(pixelIcon('canister'));
document.body.appendChild(demoFuelBtn);
demoFuelBtn.addEventListener('click', () => {
  if (!drivingCar) return;
  drivingCar.fuel = Math.min(1, drivingCar.fuel + 0.5);
  showToast('Залито полбака: в баке ' + Math.round(drivingCar.fuel * 100) + '%');
});

(function showDemoFuel() {
  demoFuelBtn.style.display = drivingCar ? 'flex' : 'none';
  requestAnimationFrame(showDemoFuel);
})();
