// src/models/devices.js
// Модели приборов героя: то, что видно на нем самом, когда прибор надет.
//
//   const b = createBraceletModel();   // браслет возврата: темный обод и светящаяся голубая полоска,
//                                      // надевается на запястье: player.attach('wristL', b)
//
// Зависимость: глобальный THREE (three.js r128+).

function createBraceletModel() {
  // Аккуратный, как смарт-часы: узкий темный ремешок вокруг запястья и одна голубая полоска на внешней стороне левой руки (−X), больше ничего
  const g = new THREE.Group();
  const band = new LitMaterial({ color: 0x1b1e24 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x6ff0ff });
  const edge = new THREE.LineBasicMaterial({ color: 0x0b0c0f });
  // Рука 0,16 × 0,16: ремешок — четыре тонкие планки вплотную к ней
  const t = 0.022; // толщина ремешка
  const o = 0.16 / 2 + t / 2 + 0.004; // расстояние от оси руки до середины планки
  const add = (w, h, d, mat, x, y, z) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge));
    g.add(m);
    return m;
  };
  const len = 0.16 + t * 2 + 0.008;
  const h = 0.075; // ширина ремешка вдоль руки
  add(t, h, len, band, -o, 0, 0);
  add(t, h, len, band, o, 0, 0);
  add(len, h, t, band, 0, 0, -o);
  add(len, h, t, band, 0, 0, o);
  // Одна голубая полоска вдоль руки на внешней стороне
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.006, h * 0.72, 0.034), glow);
  strip.position.set(-o - t / 2 - 0.003, 0, 0);
  g.add(strip);
  return g;
}

// Голубой бесконечный рюкзак на спине героя: player.attach('back', createBackpackModel()).
// Начало координат — центр рюкзака; +Z — наружу от спины (у модели человека спина смотрит в +Z)
function createBackpackModel() {
  const g = new THREE.Group();
  const body = new LitMaterial({ color: 0x4fa8e8 });
  const dark = new LitMaterial({ color: 0x2f78b8 });
  const strap = new LitMaterial({ color: 0x23527f });
  const glow = new THREE.MeshBasicMaterial({ color: 0xbff0ff });
  const edge = new THREE.LineBasicMaterial({ color: 0x14344f });
  const add = (w, h, d, mat, x, y, z) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge));
    g.add(m);
    return m;
  };
  add(0.4, 0.5, 0.2, body, 0, 0, 0); // корпус
  add(0.4, 0.2, 0.22, dark, 0, 0.17, 0.005); // клапан
  add(0.28, 0.17, 0.08, dark, 0, -0.12, 0.13); // карман
  add(0.06, 0.05, 0.03, strap, 0, 0.07, 0.115); // пряжка
  add(0.1, 0.05, 0.1, strap, 0, 0.29, 0); // ручка
  for (const x of [-0.12, 0.12]) add(0.06, 0.44, 0.02, strap, x, 0.02, -0.11); // лямки со стороны спины
  // Знак бесконечности на клапане: две светящиеся пластинки
  for (const x of [-0.045, 0.045]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.01), glow);
    m.position.set(x, 0.17, 0.116);
    m.rotation.z = x < 0 ? 0.5 : -0.5;
    g.add(m);
  }
  return g;
}
