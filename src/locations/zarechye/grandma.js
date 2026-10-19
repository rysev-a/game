// src/locations/zarechye/grandma.js
// ЗАРЕЧЬЕ: отдельный поселок за кирпичным городом (город 2), в нем дом Анны Петровны, овраг и домик на дереве (docs/story/locations/grandma-house.md).
// От южной окраины города к поселку идет сельская дорога (грунт, уже и тише трассы, но все равно широкая), поселок вытянулся вдоль своей улицы.
// Дом бабушки стоит в глубине участка: перед ним лужайка, справа от лужайки подъездная дорожка к гаражу — парковка у дома, как в американских фильмах.
//
//        город 2 (кирпичный)
//              ║ сельская дорога (x = roadX)
//   дом ─ дом  ╨  дом ─ дом          улица поселка (ось X), дома на севере смотрят на юг, на юге — на север
//   ═══════════════════════════
//   сосед │ [дорожка][дом Анны] │ сосед        участок бабушки: лужайка, въезд, крыльцо
//         │ огород, яблони, сарай│
//   ≈≈≈≈≈≈≈≈≈ овраг ═ бревно ═ ≈≈≈≈≈≈≈≈≈     перейти можно только по бревну
//          ( извилистая тропинка )          за оврагом тропинка петляет по лесу, ~150 юнитов
//                 ( огромное дерево )       далеко в чаще, домик Веры спрятан в листве: издали его не видно
//
// Подключается после src/locations/city/city.js, до src/world/world.js.
{
  const city = cities[1];
  const roadX = city.x + cityStep * 1.5; // сельская дорога продолжает северо-южную улицу города (x = 574)
  const roadW = 9; // уже городской трассы, но по-деревенски широкая
  const streetZ = city.z + cityHalfZ + 154; // улица поселка
  const streetW = 10;
  const gx = roadX + 32; // центр дома Анны Петровны
  const yardZ1 = streetZ + streetW / 2; // передний край участка (забор вдоль улицы)
  const houseZ = yardZ1 + 26; // центр дома: фасад на север, к улице, перед ним лужайка и крыльцо
  const plotZ2 = houseZ + 35; // южный край участка
  if (plotZ2 + 8 !== ravineZ) console.warn('Заречье: ось оврага не совпала с ravineZ в src/locations/shared/coords.js (' + (plotZ2 + 8) + ' и ' + ravineZ + ')');
  const treeX = gx - 70; // домик Веры далеко за оврагом, в стороне от дома: так просто не увидишь
  const treeZ = ravineZ + 150;
  const fx1 = gx - 24;
  const fx2 = gx + 18;
  const driveX = gx - (grandmaW / 2 + grandmaGarageW / 2); // ось подъездной дорожки: перед гаражом
  const driveW = grandmaGarageW + 0.8;
  const houseFront = houseZ - grandmaD / 2; // фасад дома (север)

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

  // Деревянный забор (цвет жердей и столбов задается): сплошной для игрока и машин
  const fence = (x1, z1, x2, z2, rails = 0x8a6a3c, posts = 0x6b4a2e) => {
    const alongX = Math.abs(z2 - z1) < 1e-6;
    const len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
    if (len < 0.3) return;
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    for (const y of [0.45, 0.95]) {
      const rail = boxWithEdges(alongX ? len : 0.12, 0.14, alongX ? 0.12 : len, rails);
      rail.position.set(cx, y, cz);
      cityGroup.add(rail);
    }
    const n = Math.max(1, Math.round(len / 2.5));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const post = boxWithEdges(0.2, 1.3, 0.2, posts);
      post.position.set(alongX ? x1 + (x2 - x1) * t : x1, 0.65, alongX ? z1 : z1 + (z2 - z1) * t);
      cityGroup.add(post);
    }
    longObstacle(Math.min(x1, x2) - (alongX ? 0 : 0.15), Math.min(z1, z2) - (alongX ? 0.15 : 0), Math.max(x1, x2) + (alongX ? 0 : 0.15), Math.max(z1, z2) + (alongX ? 0.15 : 0));
    mapObjects.push({ x: cx, z: cz, hx: alongX ? len / 2 : 0.2, hz: alongX ? 0.2 : len / 2, color: '#8a6a3c' });
  };
  // Забор вдоль X с проемами [{ x, w }] (въезд, калитка)
  const fenceX = (x1, x2, z, gaps, rails, posts) => {
    let cursor = x1;
    for (const g of [...gaps].sort((a, b) => a.x - b.x)) {
      fence(cursor, z, g.x - g.w / 2, z, rails, posts);
      cursor = g.x + g.w / 2;
    }
    fence(cursor, z, x2, z, rails, posts);
  };

  // ---------- Сельская дорога от города и улица поселка ----------
  roadV(city.z + cityHalfZ, streetZ - streetW / 2, roadX, 'dirt', [], roadW);
  clearZones.push({ x1: roadX - 9, x2: roadX + 9, z1: city.z + cityHalfZ, z2: streetZ });
  const streetX1 = roadX - 96;
  const streetX2 = roadX + 94;
  roadH(streetX1, streetX2, streetZ, 'dirt', [], streetW);
  // Земля поселка: газоны вдоль улицы и участок бабушки
  const groundZ1 = streetZ - streetW / 2 - 40;
  flatRect(streetX2 - streetX1, plotZ2 - groundZ1, 0x3a6b3d, 0.008, (streetX1 + streetX2) / 2, (groundZ1 + plotZ2) / 2);
  mapObjects.push({ x: (streetX1 + streetX2) / 2, z: (groundZ1 + plotZ2) / 2, hx: (streetX2 - streetX1) / 2, hz: (plotZ2 - groundZ1) / 2, color: '#3a6b3d', ground: true });

  // ---------- Соседи: четыре дома по обе стороны улицы, у каждого участок, забор, дорожка, машина и жильцы ----------
  const neighbourWalls = [0xd9c9a8, 0xb7cfe0, 0xe0b0a0, 0xc4d9b0];
  const neighbourRoofs = [0x8a3b2e, 0x4a4a52, 0x3f5a6b, 0x6b3a3a];
  const neighbourFences = [[0xf2f1ea, 0xf2f1ea], [0x8a6a3c, 0x6b4a2e], [0x25252b, 0x25252b], [0xf2f1ea, 0xf2f1ea]];
  const seatedAt = (cx, cz, yaw, gender) => {
    const chair = createChair(); // стул и столик из src/locations/village/village.js
    chair.position.set(cx, 0, cz);
    chair.rotation.y = yaw;
    cityGroup.add(chair);
    const table = createTable();
    table.position.set(cx + 1.2, 0, cz);
    cityGroup.add(table);
    addObstacle({ x: cx + 1.2, z: cz, hx: 0.4, hz: 0.4 });
    const mesh = makePerson(gender);
    mesh.position.set(cx, 0, cz);
    mesh.rotation.y = yaw;
    mesh.setSit(true);
    cityGroup.add(mesh);
    npcs.push({ mesh, gender, kind: 'resident', seated: true, hold: true, x: cx, z: cz });
  };
  [
    { x: roadX - 40, side: -1, w: 15, d: 10, scenario: 'sit' }, // северная сторона: фасад на юг, к улице
    { x: roadX + 40, side: -1, w: 17, d: 11, scenario: 'walk' },
    { x: roadX - 34, side: 1, w: 14, d: 10, scenario: 'walk' }, // южная сторона: фасад на север
    { x: roadX + 84, side: 1, w: 16, d: 10, scenario: 'sit' },
  ].forEach((p, i) => {
    const front = streetZ + p.side * (streetW / 2 + 12); // фасад дома
    const houseCz = front + p.side * (p.d / 2);
    const edge = streetZ + p.side * (streetW / 2 + 0.4); // забор со стороны улицы
    const back = streetZ + p.side * (streetW / 2 + 34);
    const [rails, posts] = neighbourFences[i];
    flatRect(36, 33, 0x3f7040, 0.012, p.x, (edge + back) / 2);
    const house = createHouse({
      width: p.w, depth: p.d, wallHeight: 7.2, roofRise: 3.2, floors: 2, windows: Math.max(2, Math.round(p.w / 4.3)),
      roof: i % 2 ? 'hip' : 'gable', ridgeAlongX: true, wallColor: neighbourWalls[i], roofColor: neighbourRoofs[i],
    });
    house.position.set(p.x, 0, houseCz);
    if (p.side > 0) house.rotation.y = Math.PI;
    cityGroup.add(house);
    addHoverInfo(house, { kind: 'Здание', name: 'Дом в Заречье', desc: 'Двухэтажный дом соседей. Здесь все знают друг друга и Анну Петровну.' });
    addObstacle({ x: p.x, z: houseCz, hx: p.w / 2, hz: p.d / 2 });
    mapObjects.push({ x: p.x, z: houseCz, hx: p.w / 2, hz: p.d / 2, color: '#8a8a8a' });
    flatRect(1.8, Math.abs(front - edge), 0x9a7a52, 0.014, p.x, (front + edge) / 2); // дорожка от калитки к двери
    fenceX(p.x - 18, p.x + 18, edge, [{ x: p.x, w: 3 }], rails, posts);
    fenceX(p.x - 18, p.x + 18, back, [], rails, posts);
    fence(p.x - 18, edge, p.x - 18, back, rails, posts);
    fence(p.x + 18, edge, p.x + 18, back, rails, posts);
    for (const [dx, dz] of [[-14, 8], [14, 10], [-13, 25], [13, 27]]) {
      const tx = p.x + dx;
      const tz = streetZ + p.side * (streetW / 2 + dz);
      const tree = createLeafyTree(pick(leafyGreens));
      tree.position.set(tx, 0, tz);
      tree.scale.setScalar(rand(0.9, 1.2));
      cityGroup.add(tree);
      addTreeCollider(tx, tz, 1);
    }
    addCar(p.x + 6, streetZ + p.side * 3.2, p.side < 0 ? Math.PI / 2 : -Math.PI / 2, { locked: true, lockedMsg: 'Эта машина закрыта' }); // у обочины
    const gender = i % 2 ? 'male' : 'female';
    if (p.scenario === 'sit') seatedAt(p.x - p.w / 2 + 2.8, front - p.side * 4.6, p.side < 0 ? 0 : Math.PI, gender);
    else addNpc({ x1: p.x - 12, z1: front - p.side * 5, x2: p.x + 12, z2: front - p.side * 5 }, gender, 'resident');
  });
  // Въезд в поселок: столб с табличкой «Заречье» у перекрестка
  {
    const post = boxWithEdges(0.2, 2.4, 0.2, 0x5a3d26);
    post.position.set(roadX + 7, 1.2, streetZ - streetW / 2 - 6);
    cityGroup.add(post);
    const board = boxWithEdges(2.6, 0.8, 0.12, 0x2f6fb0);
    board.position.set(roadX + 7, 2.4, streetZ - streetW / 2 - 6);
    cityGroup.add(board);
    addHoverInfo(board, { kind: 'Знак', name: 'Заречье', desc: 'Поселок за городом. Сельская дорога идет от города, а за домами — овраг и лес.' });
    addObstacle({ x: roadX + 7, z: streetZ - streetW / 2 - 6, hx: 0.2, hz: 0.2 });
  }

  // ---------- Участок Анны Петровны ----------
  flatRect(fx2 - fx1, plotZ2 - yardZ1, 0x3a6b3d, 0.01, gx - 3, (yardZ1 + plotZ2) / 2);
  mapObjects.push({ x: gx - 3, z: (yardZ1 + plotZ2) / 2, hx: (fx2 - fx1) / 2, hz: (plotZ2 - yardZ1) / 2, color: '#3a6b3d', ground: true });
  clearZones.push({ x1: streetX1 - 6, x2: streetX2 + 6, z1: groundZ1 - 6, z2: plotZ2 + 6 });

  // Подъездная дорожка к гаражу: бетон от улицы до дверей гаража, на ней две машины
  flatRect(driveW, houseFront - yardZ1 + 0.4, 0x8d8d90, 0.016, driveX, (yardZ1 + houseFront) / 2);
  flatRect(driveW + 4, 2.4, 0x8d8d90, 0.016, driveX, yardZ1 - 0.6); // расширение у улицы (бордюр опущен)
  mapObjects.push({ x: driveX, z: (yardZ1 + houseFront) / 2, hx: driveW / 2, hz: (houseFront - yardZ1) / 2, color: '#8d8d90', ground: true });
  // Дорожка к крыльцу от калитки
  flatRect(1.8, houseFront - 2.6 - yardZ1, 0x9a7a52, 0.015, gx, (yardZ1 + houseFront - 2.6) / 2);
  // Старая машина бабушки у гаража, рядом свободное место для машины героя
  addCar(driveX + 2.0, houseFront - 5.2, Math.PI, { locked: true, lockedMsg: 'Это машина Анны Петровны', color: 0x9aa0a8 });
  // Почтовый ящик у обочины
  {
    const post = boxWithEdges(0.12, 1.1, 0.12, 0x5a3d26);
    post.position.set(driveX + driveW / 2 + 2.4, 0.55, yardZ1 - 1.2);
    cityGroup.add(post);
    const box = boxWithEdges(0.5, 0.4, 0.8, 0x2f6fb0);
    box.position.set(driveX + driveW / 2 + 2.4, 1.25, yardZ1 - 1.2);
    cityGroup.add(box);
    addHoverInfo(box, { kind: 'Почтовый ящик', name: 'Почтовый ящик', desc: 'Синий ящик у обочины: «А. П. Соколова».' });
    addObstacle({ x: driveX + driveW / 2 + 2.4, z: yardZ1 - 1.2, hx: 0.3, hz: 0.3 });
  }

  // Дом Анны Петровны: фасад на север, к улице
  placeBuilding('grandma_house', { x: gx, z: houseZ, heading: Math.PI });

  // Забор участка: вдоль улицы с въездом и калиткой к крыльцу, по бокам и сзади; сзади — проход к оврагу
  fenceX(fx1, fx2, yardZ1, [{ x: driveX, w: driveW }, { x: gx, w: 2 }]);
  fence(fx1, yardZ1, fx1, plotZ2);
  fence(fx2, yardZ1, fx2, plotZ2);
  fence(fx1, plotZ2, gx - 1.2, plotZ2);
  fence(gx + 1.2, plotZ2, fx2, plotZ2);
  // Между лужайкой и огородом: забор от гаража и от правого угла дома, узкие проходы (машина не пролезет)
  fence(fx1 + 1.6, houseZ + grandmaD / 2 + 1, gx - grandmaW / 2 - 0.2, houseZ + grandmaD / 2 + 1);
  fence(gx + grandmaW / 2 + 1.6, houseZ + grandmaD / 2 + 1, fx2, houseZ + grandmaD / 2 + 1);
  const gardenZ = houseZ + grandmaD / 2 + 2; // огород и сад — сзади дома

  // Участок: грядки, яблони, сарай, тропинка к оврагу
  for (let i = 0; i < 4; i++) flatRect(2.2, 7, 0x6b4a2e, 0.012, gx - 12 + i * 3.4, gardenZ + 8);
  flatRect(1.6, plotZ2 - gardenZ, 0x9a7a52, 0.011, gx, (gardenZ + plotZ2) / 2);
  for (const [dx, dz] of [[10, 6], [15, 12], [-16, 12], [10, 18], [-14, 20]]) {
    const tree = createLeafyTree(pick(leafyGreens));
    tree.position.set(gx + dx, 0, gardenZ + dz);
    tree.scale.setScalar(1.3);
    cityGroup.add(tree);
    addTreeCollider(gx + dx, gardenZ + dz, 1.3);
    for (let k = 0; k < 4; k++) {
      const apple = boxWithEdges(0.3, 0.3, 0.3, 0xc43a3a);
      apple.position.set(gx + dx + rand(-1.4, 1.4), rand(3.4, 5), gardenZ + dz + rand(-1.4, 1.4));
      cityGroup.add(apple);
    }
  }
  // Лужайка перед домом: пара берез у забора
  for (const [dx, dz] of [[-21, 6], [14, 8]]) {
    const tree = createLeafyTree(pick(leafyGreens));
    tree.position.set(gx + dx, 0, yardZ1 + dz);
    tree.scale.setScalar(1.2);
    cityGroup.add(tree);
    addTreeCollider(gx + dx, yardZ1 + dz, 1.2);
  }
  {
    const shed = createHouse({ width: 5, depth: 4, wallHeight: 2.6, roofRise: 1.2, wallColor: 0x7a6a58, roofColor: 0x4a4a52 });
    shed.position.set(gx - 15, 0, gardenZ + 16);
    cityGroup.add(shed);
    addHoverInfo(shed, { kind: 'Здание', name: 'Сарай', desc: 'Старый сарай Анны Петровны: инструменты, банки и дрова.' });
    addObstacle({ x: gx - 15, z: gardenZ + 16, hx: 2.5, hz: 2 });
    mapObjects.push({ x: gx - 15, z: gardenZ + 16, hx: 2.5, hz: 2, color: '#7a6a58' });
  }

  // Овраг с ручьем: длинный, вырыт ниже земли (в земле для него прогал, src/world/ground.js), перейти можно только по бревну у тропинки
  const rx1 = riverX + riverHalf + 1; // от реки
  const rx2 = worldCenter.x + worldRadius + 10; // до самого забора мира
  {
    // Поперечный разрез: земля у края (y = 0) → откос → ровное дно (−1,3) со ручьем (воды по пояс −1,15). Полоса вдоль x, склоны и дно — отдельные меши
    const slopeEdge = ravineHalf + 1;
    const bedHalf = ravineHalf - 2;
    const bed = -1.3;
    const strip = (profile, color) => {
      const pos = [];
      const idx = [];
      profile.forEach(([dz, y], i) => pos.push(rx1, y, ravineZ + dz, rx2, y, ravineZ + dz));
      for (let i = 0; i < profile.length - 1; i++) {
        const l = i * 2;
        idx.push(l, l + 1, l + 2, l + 1, l + 3, l + 2);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      cityGroup.add(new THREE.Mesh(geo, new LitMaterial({ color, side: THREE.DoubleSide })));
    };
    strip([[-slopeEdge, 0.003], [-bedHalf, bed]], 0x6b5238); // северный откос
    strip([[bedHalf, bed], [slopeEdge, 0.003]], 0x6b5238); // южный откос
    strip([[-bedHalf, bed], [bedHalf, bed]], 0x3a2a1c); // дно
    strip([[-0.7, bed + 0.15], [0.7, bed + 0.15]], 0x3a6a8a); // ручей: ниже уровня земли
  }
  mapObjects.push({ x: (rx1 + rx2) / 2, z: ravineZ, hx: (rx2 - rx1) / 2, hz: ravineHalf + 1, color: '#4a3826', ground: true });
  const logHalf = 0.8;
  longObstacle(rx1, ravineZ - ravineHalf - 1, gx - logHalf, ravineZ + ravineHalf + 1); // весь вырытый овраг, вместе с откосами
  longObstacle(gx + logHalf, ravineZ - ravineHalf - 1, rx2, ravineZ + ravineHalf + 1);
  // Бревно: низкое, лежит концами на берегах, верх чуть выше земли (0,28); герой идет по нему, а не сквозь (groundExtras поднимает землю под ним)
  const logTop = 0.28;
  const logRadius = 0.45;
  {
    const geo = new THREE.CylinderGeometry(logRadius, logRadius + 0.05, ravineHalf * 2 + 5, 8);
    geo.rotateX(Math.PI / 2);
    const log = new THREE.Mesh(geo, new LitMaterial({ color: 0x6b4a2e }));
    log.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), cityEdgeMat));
    log.position.set(gx, logTop - logRadius, ravineZ);
    cityGroup.add(log);
    mapObjects.push({ x: gx, z: ravineZ, hx: 0.6, hz: ravineHalf + 2, color: '#8a6a3c' });
  }
  groundExtras.push((x, z) => {
    if (Math.abs(x - gx) > 0.75) return null;
    const over = Math.abs(z - ravineZ) - (ravineHalf + 1); // за краем оврага бревно плавно уходит в землю
    if (over > 1.8) return null;
    return logTop * Math.min(1, Math.max(0, 1 - over / 1.8));
  });
  globalThis.navLinks = globalThis.navLinks || [];
  globalThis.navLinks.push({ a: { x: gx, z: ravineZ - ravineHalf - 1.5 }, b: { x: gx, z: ravineZ + ravineHalf + 1.5 } }); // бревно для поиска пути (src/quests/guide.js)
  // Кусты вдоль оврага
  for (let x = rx1 + 4; x < rx2; x += rand(5, 9)) {
    if (Math.abs(x - gx) < 3) continue;
    for (const side of [-1, 1]) {
      const bush = createBush(pick(leafyGreens));
      bush.position.set(x, 0, ravineZ + side * (ravineHalf + 1.6));
      cityGroup.add(bush);
    }
  }

  // Извилистая тропинка за оврагом: от конца бревна к поляне с огромным деревом. Идет по лесу, петляет; траву по ее краям лес не трогает
  const trailPts = [
    [gx, ravineZ + 5], [gx - 4, ravineZ + 16], [gx - 14, ravineZ + 25], [gx - 26, ravineZ + 31], [gx - 30, ravineZ + 43], [gx - 22, ravineZ + 55],
    [gx - 12, ravineZ + 63], [gx - 14, ravineZ + 77], [gx - 26, ravineZ + 87], [gx - 40, ravineZ + 93], [gx - 50, ravineZ + 105],
    [gx - 48, ravineZ + 119], [gx - 54, ravineZ + 131], [gx - 62, ravineZ + 138], [treeX, treeZ - 11],
  ];
  const trail = [];
  {
    // Кривая Катмулла — Рома через опорные точки, точки через ~1,5 юнита
    const P = trailPts;
    const at = (i) => P[Math.max(0, Math.min(P.length - 1, i))];
    for (let i = 0; i < P.length - 1; i++) {
      const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
      const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 1.5));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const t2 = t * t;
        const t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        trail.push({ x: f(p0[0], p1[0], p2[0], p3[0]), z: f(p0[1], p1[1], p2[1], p3[1]) });
      }
    }
    trail.push({ x: P[P.length - 1][0], z: P[P.length - 1][1] });
    // Лента тропинки: полоса шириной 1,8 вдоль точек (как полотно дороги, src/world/roads.js, но по кривой)
    const hw = 0.9;
    const pos = [];
    for (let i = 0; i < trail.length; i++) {
      const a = trail[Math.max(0, i - 1)];
      const b = trail[Math.min(trail.length - 1, i + 1)];
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const nx = -(b.z - a.z) / len;
      const nz = (b.x - a.x) / len;
      pos.push(trail[i].x + nx * hw, 0.013, trail[i].z + nz * hw, trail[i].x - nx * hw, 0.013, trail[i].z - nz * hw);
    }
    const idx = [];
    for (let i = 0; i < trail.length - 1; i++) {
      const l = i * 2;
      idx.push(l, l + 1, l + 2, l + 1, l + 3, l + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    cityGroup.add(new THREE.Mesh(geo, new LitMaterial({ color: 0x9a7a52, side: THREE.DoubleSide })));
    // Карта и поиск пути (src/quests/guide.js): отрезки тропинки — «дорога»
    for (let i = 0; i < trail.length - 1; i += 2) {
      const e = trail[Math.min(trail.length - 1, i + 2)];
      mapRoads.push({ x1: trail[i].x, z1: trail[i].z, x2: e.x, z2: e.z, color: '#9a7a52', width: 1.8 });
    }
    // По краям тропинки лес не растет (узкий коридор), дальше стоит стеной
    for (let i = 0; i < trail.length; i += 3) clearZones.push({ x1: trail[i].x - 2.4, x2: trail[i].x + 2.4, z1: trail[i].z - 2.4, z2: trail[i].z + 2.4 });
  }

  // Поляна с огромным деревом: домик в кроне, дупло с лестницей смотрит на тропинку (на север). Вокруг стеной высокие густые деревья,
  // а сам домик показывается, только когда подошел близко (листва закрывает его от глаз)
  flatRect(30, 26, 0x2f5233, 0.008, treeX, treeZ);
  const exteriorIndex = cityGroup.children.length;
  placeBuilding('treehouse', { x: treeX, z: treeZ, heading: Math.PI });
  const treehouseExterior = cityGroup.children[exteriorIndex];
  setInterval(() => {
    const d = Math.hypot(playerWorldX - treeX, playerWorldZ - treeZ);
    treehouseExterior.visible = d < 30;
  }, 250);
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2 + rand(-0.15, 0.15);
    if (Math.abs(ang - Math.PI * 1.5) < 0.3 || Math.abs(ang + Math.PI * 0.5) < 0.3) continue; // проход для тропинки с севера
    const r = 15 + rand(0, 6);
    const tx = treeX + Math.cos(ang) * r;
    const tz = treeZ + Math.sin(ang) * r;
    const tree = createLeafyTree(pick(leafyGreens));
    tree.position.set(tx, 0, tz);
    tree.scale.setScalar(rand(2, 2.7));
    cityGroup.add(tree);
    addTreeCollider(tx, tz, 2.2);
  }

  const rect = { x1: streetX1 - 6, x2: streetX2 + 6, z1: groundZ1 - 6, z2: ravineZ + 10 };
  registerZone('zarechye', 'Заречье', rect, { birds: 0.6, birds_2: 0.35 });
  clearZones.push(rect);
  // Лес за оврагом с тропинкой и поляной: свой звук леса
  registerZone('zarechye_woods', 'Лес за Заречьем', { x1: treeX - 40, x2: gx + 8, z1: ravineZ + 10, z2: treeZ + 24 }, { forest_birds: 0.6, birds: 0.25 });
  clearZones.push({ x1: treeX - 15, x2: treeX + 15, z1: treeZ - 13, z2: treeZ + 13 }); // поляна
  clearZones.push({ x1: rx1, x2: rx2, z1: ravineZ - ravineHalf - 3, z2: ravineZ + ravineHalf + 3 }); // в овраге лес не растет
}
