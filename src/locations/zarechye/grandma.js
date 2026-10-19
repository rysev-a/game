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
//          ( извилистая тропинка )        за оврагом тропинка петляет по лесу, ~150 юнитов
//                 ( огромное дерево )     далеко в чаще, домик Веры спрятан в листве: издали его не видно
//
// Подключается после src/locations/city/city.js, до src/world/world.js.
{
  const city = cities[1];
  const gx = city.x + cityStep * 2.5; // восточная поперечная улица города
  const yardZ1 = city.z + cityHalfZ + 20; // северный край двора (калитка)
  const houseZ = yardZ1 + 14; // центр дома, фасад на север (к дороге)
  const plotZ2 = houseZ + 32; // южный край участка
  if (plotZ2 + 8 !== ravineZ) console.warn('Заречье: ось оврага не совпала с ravineZ в src/locations/shared/coords.js (' + (plotZ2 + 8) + ' и ' + ravineZ + ')');
  const treeX = gx - 70; // домик Веры далеко за оврагом, в стороне от дома: так просто не увидишь
  const treeZ = ravineZ + 150;
  const fx1 = gx - 22;
  const fx2 = gx + 22;

  // Земля: двор и участок, грунтовка от города до калитки
  flatRect(fx2 - fx1, plotZ2 - yardZ1, 0x3a6b3d, 0.008, gx, (yardZ1 + plotZ2) / 2);
  mapObjects.push({ x: gx, z: (yardZ1 + plotZ2) / 2, hx: (fx2 - fx1) / 2, hz: (plotZ2 - yardZ1) / 2, color: '#3a6b3d', ground: true });
  roadV(city.z + cityHalfZ, yardZ1 + 6, gx, 'dirt');
  clearZones.push({ x1: gx - 6, x2: gx + 6, z1: city.z + cityHalfZ, z2: yardZ1 });

  // Парковка у дома: грунтово-щебеночная площадка справа от подъезда к калитке (с востока от грунтовки), три места с белой разметкой и упорами для колес,
  // знак «P» у въезда. Машину можно оставить здесь, пока герой идет к бабушке и в лес (место zarechye.parking, src/quests/places.js)
  {
    const px = gx + 17;
    const pz = 87;
    flatRect(20, 14, 0x5c5c5f, 0.014, px, pz);
    mapObjects.push({ x: px, z: pz, hx: 10, hz: 7, color: '#5c5c5f', ground: true });
    clearZones.push({ x1: px - 12, x2: px + 12, z1: pz - 9, z2: pz + 9 });
    for (let i = 0; i < 4; i++) flatRect(0.16, 8.5, 0xe8e8e8, 0.017, px - 8 + i * 5.33, pz - 1); // линии между местами
    flatRect(16, 0.16, 0xe8e8e8, 0.017, px, pz - 5.2); // передняя линия
    for (let i = 0; i < 3; i++) {
      const stop = boxWithEdges(2.6, 0.22, 0.4, 0xd8c030); // упор для колес у забора (юг)
      stop.position.set(px - 5.33 + i * 5.33, 0.11, pz + 3.2);
      cityGroup.add(stop);
    }
    // Знак: столб и синяя табличка с белой «P»
    const post = boxWithEdges(0.2, 2.6, 0.2, 0x3a3e44);
    post.position.set(gx + 7.2, 1.3, pz - 6);
    cityGroup.add(post);
    const sign = new THREE.Group();
    sign.add(boxWithEdges(1.5, 1.5, 0.1, 0x2f6fb0));
    for (const [w, h, x, y] of [[0.25, 1.0, -0.3, 0], [0.7, 0.24, 0.0, 0.38], [0.7, 0.24, 0.0, 0.02], [0.24, 0.5, 0.3, 0.2]]) {
      const part = boxWithEdges(w, h, 0.06, 0xf4f4f4);
      part.position.set(x, y, 0.06);
      sign.add(part);
    }
    sign.position.set(gx + 7.2, 2.9, pz - 6);
    sign.rotation.y = -Math.PI / 2; // табличка смотрит на подъезжающих по грунтовке
    cityGroup.add(sign);
    addHoverInfo(sign, { kind: 'Знак', name: 'Парковка', desc: 'Площадка у дома Анны Петровны: три места. Здесь можно оставить машину.' });
    addObstacle({ x: gx + 7.2, z: pz - 6, hx: 0.2, hz: 0.2 });
  }

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
    addHoverInfo(shed, { kind: 'Здание', name: 'Сарай', desc: 'Старый сарай Анны Петровны: инструменты, банки и дрова.' });
    addObstacle({ x: gx - 15, z: houseZ + 26, hx: 2.5, hz: 2 });
    mapObjects.push({ x: gx - 15, z: houseZ + 26, hx: 2.5, hz: 2, color: '#7a6a58' });
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

  const rect = { x1: fx1 - 6, x2: fx2 + 6, z1: yardZ1 - 6, z2: ravineZ + 10 };
  registerZone('zarechye', 'Заречье: дом Анны Петровны', rect, { birds: 0.6, birds_2: 0.35 });
  clearZones.push(rect);
  // Лес за оврагом с тропинкой и поляной: свой звук леса
  registerZone('zarechye_woods', 'Лес за Заречьем', { x1: treeX - 40, x2: gx + 8, z1: ravineZ + 10, z2: treeZ + 24 }, { forest_birds: 0.6, birds: 0.25 });
  clearZones.push({ x1: treeX - 15, x2: treeX + 15, z1: treeZ - 13, z2: treeZ + 13 }); // поляна
  clearZones.push({ x1: rx1, x2: rx2, z1: ravineZ - ravineHalf - 3, z2: ravineZ + ravineHalf + 3 }); // в овраге лес не растет
}
