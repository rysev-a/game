// src/locations/zarechye/grandma.js
// ЗАРЕЧЬЕ: дом Анны Петровны, двор, участок, овраг и домик на дереве (docs/story/locations/grandma-house.md).
// Крайний дом за кирпичным городом за рекой (город 2): от восточной улицы города к дому идет грунтовка.
//
//        город 2 (кольцевая дорога)
//              ║ грунтовка
//   ┌──── двор ╨ калитка ────┐   машина дальше двора не проедет: между домом и забором — узкие проходы
//   │       [ дом ]          │
//   │  огород, яблони, сарай │   участок
//   └──────── тропинка ──────┘
//   ≈≈≈≈≈≈≈≈≈ овраг ═ бревно ═ ≈≈≈≈≈≈≈≈≈   перейти можно только по бревну
//          ( огромное дерево )            в кроне — домик на дереве, лестница в дупле
//
// Подключается после src/locations/city/city.js, до src/world/world.js.
{
  const city = cities[1];
  const gx = city.x + cityStep * 2.5; // восточная поперечная улица города
  const yardZ1 = city.z + cityHalfZ + 20; // северный край двора (калитка)
  const houseZ = yardZ1 + 14; // центр дома, фасад на север (к дороге)
  const plotZ2 = houseZ + 32; // южный край участка
  const ravineZ = plotZ2 + 8; // ось оврага
  const ravineHalf = 4;
  const treeZ = ravineZ + 18;
  const fx1 = gx - 22;
  const fx2 = gx + 22;

  // Земля: двор и участок, грунтовка от города до калитки
  flatRect(fx2 - fx1, plotZ2 - yardZ1, 0x3a6b3d, 0.008, gx, (yardZ1 + plotZ2) / 2);
  mapObjects.push({ x: gx, z: (yardZ1 + plotZ2) / 2, hx: (fx2 - fx1) / 2, hz: (plotZ2 - yardZ1) / 2, color: '#3a6b3d', ground: true });
  roadV(city.z + cityHalfZ, yardZ1 + 6, gx, 'dirt');
  clearZones.push({ x1: gx - 6, x2: gx + 6, z1: city.z + cityHalfZ, z2: yardZ1 });

  // Дом Анны Петровны
  placeBuilding('grandma_house', { x: gx, z: houseZ, heading: Math.PI });

  // Длинное препятствие режем на куски: машины проверяют только препятствия с центром ближе 25 (collisions.js)
  const longObstacle = (x1, z1, x2, z2) => {
    const n = Math.max(1, Math.ceil(Math.max(x2 - x1, z2 - z1) / 16));
    const alongX = x2 - x1 >= z2 - z1;
    for (let i = 0; i < n; i++) {
      const a = i / n;
      const b = (i + 1) / n;
      const [ax1, ax2] = alongX ? [x1 + (x2 - x1) * a, x1 + (x2 - x1) * b] : [x1, x2];
      const [az1, az2] = alongX ? [z1, z2] : [z1 + (z2 - z1) * a, z1 + (z2 - z1) * b];
      addObstacle({ x: (ax1 + ax2) / 2, z: (az1 + az2) / 2, hx: (ax2 - ax1) / 2, hz: (az2 - az1) / 2 });
    }
  };

  // Деревянный забор: вокруг двора и участка, калитка на севере, проход к оврагу на юге
  const fenceColor = 0x8a6a3c;
  const fence = (x1, z1, x2, z2) => {
    const alongX = Math.abs(z2 - z1) < 1e-6;
    const len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
    if (len < 0.3) return;
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    for (const y of [0.45, 0.95]) {
      const rail = boxWithEdges(alongX ? len : 0.12, 0.14, alongX ? 0.12 : len, fenceColor);
      rail.position.set(cx, y, cz);
      cityGroup.add(rail);
    }
    const n = Math.max(1, Math.round(len / 2.5));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const post = boxWithEdges(0.2, 1.3, 0.2, 0x6b4a2e);
      post.position.set(alongX ? x1 + (x2 - x1) * t : x1, 0.65, alongX ? z1 : z1 + (z2 - z1) * t);
      cityGroup.add(post);
    }
    longObstacle(Math.min(x1, x2) - (alongX ? 0 : 0.15), Math.min(z1, z2) - (alongX ? 0.15 : 0), Math.max(x1, x2) + (alongX ? 0 : 0.15), Math.max(z1, z2) + (alongX ? 0.15 : 0));
    mapObjects.push({ x: cx, z: cz, hx: alongX ? len / 2 : 0.2, hz: alongX ? 0.2 : len / 2, color: '#8a6a3c' });
  };
  const gate = 4; // половина ширины калитки (проедет машина)
  fence(fx1, yardZ1, gx - gate, yardZ1);
  fence(gx + gate, yardZ1, fx2, yardZ1);
  fence(fx1, yardZ1, fx1, plotZ2);
  fence(fx2, yardZ1, fx2, plotZ2);
  fence(fx1, plotZ2, gx - 1.2, plotZ2);
  fence(gx + 1.2, plotZ2, fx2, plotZ2);
  // Между двором и участком: забор от углов дома, по бокам узкие проходы (машина не пролезет)
  const hw = grandmaW / 2 + 1.6;
  fence(fx1, houseZ, gx - hw, houseZ);
  fence(gx + hw, houseZ, fx2, houseZ);

  // Участок: грядки, яблони, сарай, тропинка к оврагу
  for (let i = 0; i < 4; i++) flatRect(2.2, 9, 0x6b4a2e, 0.012, gx - 15 + i * 3.4, houseZ + 15);
  flatRect(1.6, plotZ2 - houseZ - 5, 0x9a7a52, 0.011, gx, (houseZ + 5 + plotZ2) / 2);
  for (const [dx, dz] of [[9, 9], [15, 12], [10, 20], [16, 24], [-19, 18]]) {
    const tree = createLeafyTree(pick(leafyGreens));
    tree.position.set(gx + dx, 0, houseZ + dz);
    tree.scale.setScalar(1.3);
    cityGroup.add(tree);
    addTreeCollider(gx + dx, houseZ + dz, 1.3);
    for (let k = 0; k < 4; k++) {
      const apple = boxWithEdges(0.3, 0.3, 0.3, 0xc43a3a);
      apple.position.set(gx + dx + rand(-1.4, 1.4), rand(3.4, 5), houseZ + dz + rand(-1.4, 1.4));
      cityGroup.add(apple);
    }
  }
  {
    const shed = createHouse({ width: 5, depth: 4, wallHeight: 2.6, roofRise: 1.2, wallColor: 0x7a6a58, roofColor: 0x4a4a52 });
    shed.position.set(gx - 15, 0, houseZ + 26);
    cityGroup.add(shed);
    addObstacle({ x: gx - 15, z: houseZ + 26, hx: 2.5, hz: 2 });
    mapObjects.push({ x: gx - 15, z: houseZ + 26, hx: 2.5, hz: 2, color: '#7a6a58' });
  }

  // Овраг с ручьем: длинный, перейти можно только по старому бревну у тропинки
  const rx1 = riverX + riverHalf + 1; // от реки
  const rx2 = worldCenter.x + worldRadius + 10; // до самого забора мира
  flatRect(rx2 - rx1, ravineHalf * 2 + 2, 0x6b5238, 0.009, (rx1 + rx2) / 2, ravineZ); // склоны
  flatRect(rx2 - rx1, ravineHalf * 2 - 2, 0x3a2a1c, 0.01, (rx1 + rx2) / 2, ravineZ); // дно
  flatRect(rx2 - rx1, 1.4, 0x3a6a8a, 0.012, (rx1 + rx2) / 2, ravineZ); // ручей
  mapObjects.push({ x: (rx1 + rx2) / 2, z: ravineZ, hx: (rx2 - rx1) / 2, hz: ravineHalf + 1, color: '#4a3826', ground: true });
  const logHalf = 0.8;
  longObstacle(rx1, ravineZ - ravineHalf, gx - logHalf, ravineZ + ravineHalf);
  longObstacle(gx + logHalf, ravineZ - ravineHalf, rx2, ravineZ + ravineHalf);
  {
    const geo = new THREE.CylinderGeometry(0.55, 0.65, ravineHalf * 2 + 4, 7);
    geo.rotateX(Math.PI / 2);
    const log = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x6b4a2e }));
    log.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), cityEdgeMat));
    log.position.set(gx, 0.35, ravineZ);
    cityGroup.add(log);
    mapObjects.push({ x: gx, z: ravineZ, hx: 0.6, hz: ravineHalf + 2, color: '#8a6a3c' });
  }
  // Кусты вдоль оврага
  for (let x = rx1 + 4; x < rx2; x += rand(5, 9)) {
    if (Math.abs(x - gx) < 3) continue;
    for (const side of [-1, 1]) {
      const bush = createBush(pick(leafyGreens));
      bush.position.set(x, 0, ravineZ + side * (ravineHalf + 1.6));
      cityGroup.add(bush);
    }
  }

  // Огромное дерево с домиком в кроне: дупло с лестницей смотрит на овраг
  flatRect(30, 26, 0x2f5233, 0.008, gx, treeZ);
  placeBuilding('treehouse', { x: gx, z: treeZ, heading: Math.PI });

  const rect = { x1: fx1 - 6, x2: fx2 + 6, z1: yardZ1 - 6, z2: treeZ + 14 };
  registerZone('zarechye', 'Заречье: дом Анны Петровны', rect, { birds: 0.6, birds_2: 0.35 });
  clearZones.push(rect);
  clearZones.push({ x1: rx1, x2: rx2, z1: ravineZ - ravineHalf - 3, z2: ravineZ + ravineHalf + 3 }); // в овраге лес не растет
}
