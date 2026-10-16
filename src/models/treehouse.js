// src/models/treehouse.js
// Огромное дерево с домиком в кроне (база героя, docs/story/locations/grandma-house.md).
// Домик большой, но спрятан в листве: снизу и сверху почти не виден. В стволе — дупло,
// в нем спрятана веревочная лестница наверх.
//
// Подключение:
//   <script src="src/models/treehouse.js"></script>
// Использование:
//   const tree = createTreehouse();
//   scene.add(tree);   // дупло с лестницей смотрит в +Z, ствол в (0, 0, 0)
//   tree.userData.fade — крона и домик для затухания (src/engine/fade.js)
//
// Зависимость: глобальный THREE (three.js r128+).

function createTreehouse(options = {}) {
  const o = Object.assign(
    {
      trunkColor: 0x5a3d26,
      leafColors: [0x3f7a35, 0x4f8a3a, 0x356b2e, 0x5f9a42],
      houseColor: 0x8a6a3c,
      roofColor: 0x4a5a32,
      crown: 1, // масштаб кроны
    },
    options,
  );
  const root = new THREE.Group();
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111 });
  const fade = [];
  const withEdges = (geo, color, fades) => {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: !!fades });
    const line = new THREE.LineBasicMaterial({ color: 0x111111, transparent: !!fades });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), fades ? line : edgeMat));
    root.add(mesh);
    if (fades) {
      geo.computeBoundingBox();
      const b = geo.boundingBox;
      fade.push({ mesh, mats: [mat, line], half: [(b.max.x - b.min.x) / 2, (b.max.y - b.min.y) / 2, (b.max.z - b.min.z) / 2] });
    }
    return mesh;
  };
  const part = (w, h, d, color, x, y, z, fades) => {
    const m = withEdges(new THREE.BoxGeometry(w, h, d), color, fades);
    m.position.set(x, y, z);
    return m;
  };

  // Ствол и корни
  const trunk = withEdges(new THREE.CylinderGeometry(1.3, 2.0, 11, 8), o.trunkColor);
  trunk.position.y = 5.5;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const root1 = part(0.7, 0.6, 2.4, 0x4a3220, Math.sin(a) * 2.1, 0.3, Math.cos(a) * 2.1);
    root1.rotation.y = a;
  }
  // Дупло: темный проем, внутри видны перекладины веревочной лестницы
  part(1.3, 2.2, 0.3, 0x1a120a, 0, 1.6, 1.72);
  for (let i = 0; i < 4; i++) part(0.9, 0.08, 0.1, 0xc9a86a, 0, 0.8 + i * 0.5, 1.78);
  for (const sx of [-0.42, 0.42]) part(0.05, 2.0, 0.05, 0xb08a50, sx, 1.6, 1.8);

  // Толстые ветви под домиком
  for (const [a, len] of [[0.4, 7], [2.3, 6], [4.1, 7.5], [5.4, 5.5]]) {
    const br = part(0.7, 0.7, len, 0x5a3d26, Math.sin(a) * len * 0.45, 8.6, Math.cos(a) * len * 0.45);
    br.rotation.y = a;
    br.rotation.x = -0.25;
  }

  // Домик: широкий помост и сруб с плоской крышей, всё в цвет коры и листвы
  part(11, 0.4, 9, 0x6b4a2e, 0, 8.4, -0.5);
  part(9, 3.6, 7, o.houseColor, 0, 10.4, -0.5, true);
  part(10, 0.5, 8, o.roofColor, 0, 12.45, -0.5, true);
  part(1.0, 0.8, 0.12, 0x1d2b3a, -2.5, 10.8, 3.02); // маленькие окна
  part(1.0, 0.8, 0.12, 0x1d2b3a, 2.5, 10.8, 3.02);

  // Крона: крупная листва вокруг и сверху домика
  const crowns = [
    [0, 15.5, -0.5, 7.0], [-6.5, 12.5, 1.5, 4.8], [6.5, 12.8, -2, 5.0], [0, 12.2, 5.0, 4.6],
    [-3.5, 12.8, -5.5, 4.6], [4.5, 11.8, 3.5, 4.0], [-6, 10.5, -3.5, 3.6], [2.5, 17.5, 2.5, 4.2],
  ];
  crowns.forEach(([x, y, z, r], i) => {
    const geo = new THREE.IcosahedronGeometry(r * o.crown, 0);
    const leaf = withEdges(geo, o.leafColors[i % o.leafColors.length], true);
    leaf.position.set(x * o.crown, y, z * o.crown);
  });

  root.userData.fade = fade;
  return root;
}
