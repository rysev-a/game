// src/locations/tower/tower.js
// ЭТАЖ БАШНИ В ЦЕНТРЕ (квест 4.12 «Бомба на крыше»). Каждый из девяти этажей — отдельный мир-локация tower1…tower9 (как лаборатория или трек, а не комнаты одного мира):
// перейти на другой этаж можно только по лестнице, и мир этажа сменяется. Бои не идут внутри зданий (src/engine/enemy-attacks.js), поэтому этаж — широкая открытая
// площадка 140 × 100 со стенами, вокруг которой стоят офисные столы с мониторами и стулья. На полу крупно написан номер этажа.
//
//   Две лестницы в разных частях этажа (towerFloor, src/locations/shared/coords.js): вверх — у восточной стены на севере, рядом светящаяся зеленая стрелка вверх;
//   вниз — у западной стены на юге, рядом светящаяся оранжевая стрелка вниз. На первом этаже лестница вниз ведет на улицу, на девятом лестницы вверх нет:
//   там заперта дверь на десятый этаж, а аварийный выход ведет на улицу к площадке вертолетика. Сами лестницы-споты, враги и переходы — данные (src/content/world.js, 4-12-tower.js).
//   Сама башня снаружи (высокая коробка с бомбой) и площадка вертолетика — в основном мире (src/locations/entrances/entrances.js, src/content/world.js).
//
// Подключается как мир локации tower1…tower9: после src/locations/shared/location.js, до location-finish.js.

{
  const floor = Number(GAME_LOCATION.slice(5)); // номер этажа из id мира (tower5 → 5)
  const { hx, hz, up, down } = towerFloor;
  const rect = { x1: -hx - 12, x2: hx + 12, z1: -hz - 12, z2: hz + 12 };
  registerZone('tower_floor', 'Башня: ' + floor + ' этаж', rect, {});
  clearZones.push(rect);

  const wall = (x1, z1, x2, z2, h, color, thick = 0.8) => {
    const w = Math.max(Math.abs(x2 - x1), thick);
    const d = Math.max(Math.abs(z2 - z1), thick);
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    const box = boxWithEdges(w, h, d, color);
    box.position.set(cx, h / 2, cz);
    cityGroup.add(box);
    addObstacle({ x: cx, z: cz, hx: w / 2, hz: d / 2 });
    mapObjects.push({ x: cx, z: cz, hx: w / 2, hz: d / 2, color: '#' + color.toString(16).padStart(6, '0') });
  };

  // Пол: чем выше этаж, тем светлее (чуть); стены высокие, без проемов
  const shade = 0x4a4f57 + floor * 0x030303;
  flatRect(hx * 2, hz * 2, shade, 0.012, 0, 0);
  mapObjects.push({ x: 0, z: 0, hx, hz, color: '#' + shade.toString(16), ground: true });
  wall(-hx, -hz, hx, -hz, 5, 0x8a909a, 1);
  wall(-hx, hz, hx, hz, 5, 0x8a909a, 1);
  wall(-hx, -hz, -hx, hz, 5, 0x8a909a, 1);
  wall(hx, -hz, hx, hz, 5, 0x8a909a, 1);

  // Номер этажа крупно на самом полу (в центре и у каждой лестницы)
  const lay = (text, w, d, x, z, color) => {
    const m = makeTextPlane(text, w, d, color, 'rgba(0,0,0,0)');
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.05, z);
    cityGroup.add(m);
  };
  lay(String(floor), 36, 36, 0, 0, '#ffe27a');
  lay(floor + ' ЭТАЖ', 28, 7, 0, -26, '#d8dde5');
  lay(floor + ' ЭТАЖ', 28, 7, 0, 26, '#d8dde5');
  lay(String(floor), 10, 10, up.x - 14, up.z + 11, '#ffe27a');
  lay(String(floor), 10, 10, down.x + 14, down.z - 11, '#ffe27a');

  // Офисные столы со стульями и мониторами вокруг: ряды вдоль северной и южной частей этажа; посередине — проход, у лестниц свободно
  const desks = [];
  for (const z of [-42, -30, -18, 18, 30, 42]) {
    for (let x = -64; x <= 64; x += 8) {
      if (Math.abs(x) < 10) continue; // центральный проход
      if (Math.hypot(x - up.x, z - up.z) < 16 || Math.hypot(x - down.x, z - down.z) < 16) continue; // свободно у лестниц
      desks.push({ x, z, flip: z > 0 });
    }
  }
  // Столы по краям центральной части этажа
  for (const x of [-48, -34, 34, 48]) for (const z of [-6, 6]) desks.push({ x, z, flip: z > 0 });
  const deskGeo = new THREE.BoxGeometry(2.8, 0.82, 1.4).translate(0, 0.41, 0);
  const screenGeo = new THREE.BoxGeometry(0.9, 0.55, 0.08).translate(0, 1.1, 0);
  const seatGeo = new THREE.BoxGeometry(0.85, 0.12, 0.85).translate(0, 0.5, 0);
  const backGeo = new THREE.BoxGeometry(0.85, 0.75, 0.12).translate(0, 0.9, 0);
  const mk = (geo, color) => new THREE.InstancedMesh(geo, new LitMaterial({ color }), desks.length);
  const deskMesh = mk(deskGeo, 0xb08a5a);
  const screenMesh = mk(screenGeo, 0x15171c);
  const seatMesh = mk(seatGeo, 0x3a5a8a);
  const backMesh = mk(backGeo, 0x2e4a74);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up3 = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1);
  const at = new THREE.Vector3();
  desks.forEach((d, i) => {
    const sgn = d.flip ? -1 : 1; // стул стоит с той стороны, с которой к столу садятся (север или юг)
    const place = (mesh, dx, dz, yaw) => {
      q.setFromAxisAngle(up3, yaw);
      at.set(d.x + dx, 0, d.z + dz);
      mesh.setMatrixAt(i, m4.compose(at, q, one));
    };
    place(deskMesh, 0, 0, 0);
    place(screenMesh, 0, -0.35 * sgn, 0);
    const jitter = (((i * 37) % 9) - 4) * 0.05; // стулья стоят чуть вкривь, как в жизни
    place(seatMesh, 0, 1.45 * sgn, jitter);
    place(backMesh, 0, 1.45 * sgn + 0.4 * sgn, jitter);
    addObstacle({ x: d.x, z: d.z, hx: 1.4, hz: 0.7 });
    addObstacle({ x: d.x, z: d.z + 1.45 * sgn, hx: 0.42, hz: 0.42 });
  });
  for (const mesh of [deskMesh, screenMesh, seatMesh, backMesh]) {
    mesh.instanceMatrix.needsUpdate = true;
    cityGroup.add(mesh);
  }
  addHoverInfo(deskMesh, { kind: 'Башня', name: 'Офисный стол', desc: 'Стол с монитором и стулом: этаж давно не работает, но на столах еще лежат бумаги.' });

  // Светящаяся стрелка у лестницы: вертикальный щит на столбе, мигает; вверх — зеленая, вниз — оранжевая
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 3);
  arrowShape.lineTo(2.4, 0.2);
  arrowShape.lineTo(0.9, 0.2);
  arrowShape.lineTo(0.9, -3);
  arrowShape.lineTo(-0.9, -3);
  arrowShape.lineTo(-0.9, 0.2);
  arrowShape.lineTo(-2.4, 0.2);
  arrowShape.closePath();
  const glowArrow = (x, z, dirUp, color, label) => {
    const group = new THREE.Group();
    const post = boxWithEdges(0.3, 3.2, 0.3, 0x3a3e44);
    post.position.y = 1.6;
    group.add(post);
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const arrow = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), mat);
    arrow.position.y = 6.6;
    if (!dirUp) arrow.rotation.z = Math.PI;
    group.add(arrow);
    const haloMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.3, depthWrite: false });
    const halo = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), haloMat);
    halo.position.set(0, 6.6, -0.05);
    halo.scale.setScalar(1.35);
    if (!dirUp) halo.rotation.z = Math.PI;
    group.add(halo);
    const text = makeTextPlane(label, 7, 1.4, '#ffffff', 'rgba(0,0,0,0.65)');
    text.position.set(0, 3.9, 0.05);
    group.add(text);
    const back = text.clone();
    back.position.z = -0.05;
    back.rotation.y = Math.PI;
    group.add(back);
    arrow.onBeforeRender = () => {
      const t = performance.now() / 1000;
      const k = 0.5 + 0.5 * Math.sin(t * 4);
      mat.opacity = 0.65 + 0.35 * k; // мигает
      haloMat.opacity = 0.15 + 0.35 * k;
      halo.scale.setScalar(1.25 + 0.2 * k);
      arrow.position.y = 6.6 + Math.sin(t * 2.2) * 0.25 * (dirUp ? 1 : -1); // чуть плывет в сторону движения
    };
    group.position.set(x, 0, z);
    group.rotation.y = Math.PI; // щит повернут к центру этажа
    cityGroup.add(group);
    return group;
  };
  const hasUp = floor < 9;
  if (hasUp) glowArrow(up.x - 4, up.z + 9, true, 0x4dff88, 'ВВЕРХ · ' + (floor + 1) + ' этаж');
  glowArrow(down.x + 4, down.z - 9, false, 0xffa23a, floor === 1 ? 'ВНИЗ · на улицу' : 'ВНИЗ · ' + (floor - 1) + ' этаж');
}
