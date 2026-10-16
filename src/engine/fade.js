// src/engine/fade.js
// Здания и стены между камерой и игроком становятся полупрозрачными: иначе камера оказывается
// внутри стен и здание видно одними ребрами. Каждый «затухающий» объект — запись в fadeBoxes.

const fadeBoxes = [];
const fadeMin = 0.15;
const camPoint = new THREE.Vector3();
const playerPoint = new THREE.Vector3(0, 1, 0);
function segmentHitsBox(a, b, half) {
  const A = [a.x, a.y, a.z];
  const D = [b.x - a.x, b.y - a.y, b.z - a.z];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(D[i]) < 1e-9) {
      if (Math.abs(A[i]) > half[i]) return false;
      continue;
    }
    let ta = (-half[i] - A[i]) / D[i];
    let tb = (half[i] - A[i]) / D[i];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}

function updateFade() {
  cityGroup.updateMatrixWorld(true);
  for (const t of fadeBoxes) {
    const a = t.mesh.worldToLocal(camPoint.copy(camera.position));
    const b = t.mesh.worldToLocal(playerPoint.clone());
    const target = segmentHitsBox(a, b, t.half) ? fadeMin : 1;
    t.fade += (target - t.fade) * 0.2;
    for (const m of t.mats) m.opacity = t.fade;
  }
}
