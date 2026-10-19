// src/world/fence.js
// СЕТЧАТЫЙ ЗАБОР по круглой границе мира: прозрачная ромбовидная сетка, столбы
// через каждые 8 юнитов и верхняя/нижняя перекладины-кольца. Столкновения с границей — в collisions.js.

// Сетчатый забор: прозрачная ромбовидная сетка на каждой стороне,
// столбы через каждые 8 юнитов и верхняя/нижняя перекладины
{
  const fenceH = 3;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  c.strokeStyle = '#aab4bd';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(64, 64);
  c.moveTo(64, 0);
  c.lineTo(0, 64);
  c.stroke();
  const meshTex = new THREE.CanvasTexture(cv);
  meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping;

  const railMat = new LitMaterial({ color: 0x7d868e });
  const R = worldRadius;
  // Проем на севере (worldGate, src/engine/layout.js): угол по кругу, где забора нет. Север — это z меньше центра, точка (0, −R): угол цилиндра π
  const gapA = worldGate ? 2 * Math.asin(Math.min(1, (worldGate.hw + 1.5) / worldRadius)) : 0;
  const segments = 360; // кольцо из 360 граней: отклонение от круга — доли юнита
  const circumference = 2 * Math.PI * R;

  // Сетка: открытый цилиндр по границе мира
  const tex = meshTex.clone();
  tex.needsUpdate = true;
  tex.repeat.set(circumference / 2, fenceH / 2);
  const panel = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, fenceH, segments, 1, true, worldGate ? Math.PI + gapA / 2 : 0, Math.PI * 2 - gapA),
    new LitMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }),
  );
  panel.position.set(worldCenter.x, fenceH / 2 + 0.1, worldCenter.z);
  cityGroup.add(panel);

  // Верхняя и нижняя перекладины — кольца
  for (const y of [0.15, fenceH + 0.1]) {
    const rail = new THREE.Mesh(new THREE.TorusGeometry(R, 0.07, 4, segments * 2, Math.PI * 2 - gapA), railMat);
    rail.rotation.x = Math.PI / 2;
    // дуга торa идет от угла 0 (на восток) к югу; разворачиваем так, чтобы пропуск пришелся на север
    const holder = new THREE.Group();
    holder.rotation.y = -(Math.PI * 1.5 + gapA / 2);
    holder.position.set(worldCenter.x, y, worldCenter.z);
    holder.add(rail);
    cityGroup.add(holder);
  }

  // Столбы через каждые 8 юнитов
  const postCount = Math.round(circumference / 8);
  const posts = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.28, fenceH + 0.5, 0.28).translate(0, (fenceH + 0.5) / 2, 0),
    railMat,
    postCount,
  );
  const pm = new THREE.Matrix4();
  for (let i = 0; i < postCount; i++) {
    const a = (i / postCount) * Math.PI * 2;
    const px = worldCenter.x + Math.cos(a) * R;
    const pz = worldCenter.z + Math.sin(a) * R;
    const inGap = worldGate && pz < worldCenter.z && Math.abs(px - worldCenter.x) < worldGate.hw + 1.5;
    posts.setMatrixAt(i, pm.makeTranslation(inGap ? 0 : px, inGap ? -50 : 0, inGap ? 0 : pz)); // столбы в проеме убираем под землю
  }
  posts.frustumCulled = false;
  cityGroup.add(posts);
  // На миникарте граница рисуется кругом (src/engine/minimap.js)
}
