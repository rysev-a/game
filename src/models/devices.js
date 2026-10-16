// src/models/devices.js
// Модели приборов героя: то, что видно на нем самом, когда прибор надет.
//
//   const b = createBraceletModel();   // браслет возврата: темный обод и светящаяся голубая полоска,
//                                      // надевается на запястье: player.attach('wristL', b)
//
// Зависимость: глобальный THREE (three.js r128+).

function createBraceletModel() {
  const g = new THREE.Group();
  const band = new THREE.MeshBasicMaterial({ color: 0x2a2e38 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x6ff0ff });
  const edge = new THREE.LineBasicMaterial({ color: 0x111111 });
  // Рука 0,16 × 0,16: обод — четыре планки вокруг нее
  const t = 0.035; // толщина обода
  const o = 0.16 / 2 + t / 2 + 0.005; // расстояние от оси руки до середины планки
  const add = (w, h, d, mat, x, y, z) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge));
    g.add(m);
    return m;
  };
  const len = 0.16 + t * 2 + 0.01;
  add(t, 0.09, len, band, -o, 0, 0);
  add(t, 0.09, len, band, o, 0, 0);
  add(len, 0.09, t, band, 0, 0, -o);
  add(len, 0.09, t, band, 0, 0, o);
  // Светящиеся полоски на всех четырех сторонах: видно с любой стороны камеры
  for (const [x, z, w, d] of [
    [-o - t / 2 - 0.004, 0, 0.008, 0.14],
    [o + t / 2 + 0.004, 0, 0.008, 0.14],
    [0, -o - t / 2 - 0.004, 0.14, 0.008],
    [0, o + t / 2 + 0.004, 0.14, 0.008],
  ]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.035, d), glow);
    m.position.set(x, 0, z);
    g.add(m);
  }
  return g;
}
