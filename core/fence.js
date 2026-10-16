// core/fence.js
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

  const railMat = new THREE.MeshBasicMaterial({ color: 0x7d868e });
  const R = worldRadius;
  const segments = 360; // кольцо из 360 граней: отклонение от круга — доли юнита
  const circumference = 2 * Math.PI * R;

  // Сетка: открытый цилиндр по границе мира
  const tex = meshTex.clone();
  tex.needsUpdate = true;
  tex.repeat.set(circumference / 2, fenceH / 2);
  const panel = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, fenceH, segments, 1, true),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }),
  );
  panel.position.set(worldCenter.x, fenceH / 2 + 0.1, worldCenter.z);
  cityGroup.add(panel);

  // Верхняя и нижняя перекладины — кольца
  for (const y of [0.15, fenceH + 0.1]) {
    const rail = new THREE.Mesh(new THREE.TorusGeometry(R, 0.07, 4, segments * 2), railMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(worldCenter.x, y, worldCenter.z);
    cityGroup.add(rail);
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
    posts.setMatrixAt(i, pm.makeTranslation(worldCenter.x + Math.cos(a) * R, 0, worldCenter.z + Math.sin(a) * R));
  }
  posts.frustumCulled = false;
  cityGroup.add(posts);
  // На миникарте граница рисуется кругом (core/minimap.js)
}
