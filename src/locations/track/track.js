// src/locations/track/track.js
// ГОНОЧНЫЙ ТРЕК за городом (квест 3.05 «Крутая тачка»): «Складки» — четыре широкие змейки одна под другой, каждая перетекает в следующую плавным
// разворотом, а потом замыкающая дуга ведет обратно к старту (как в ДЕМО, src/demo/race.js). Змейки зовут «колбасками»: по краям дороги стоят
// надувные красно-белые колбаски-ограждения. Рустам любит здесь кататься и принимает зачет: проехать круг по колбаскам за отведенное время и пройти все
// контрольные ворота по порядку (места track.cp1…cp8 и track.start — src/content/places-locations.js). Над треком всегда ясное солнце (src/quests/weather-story.js).
// Севернее змеек, у подъездной дороги, — автосалон: все гоночные машины из ДЕМО стоят у него, садиться можно без ключей, а директор Борис Аркадьевич
// отдает победителю гонки машину на выбор (квест 3.05).
//
//   Ось трека, ширины и контрольные точки считает src/locations/shared/coords.js (trackPath, trackCheckpoints): она нужна и местам квеста.
//   Подъездная дорога идет с севера по оси trackX и никак не кончается: в основном мире она доходит до перехода (src/content/portals.js),
//   а здесь продолжается до самого забора, и въезд — просто смена мира на той же дороге.
//
// Подключается как мир локации «Гоночный трек»: после src/locations/shared/location.js, до location-finish.js (дороги строятся там).

{
  const rect = { x1: trackX - 200, x2: trackX + 215, z1: -90, z2: 430 };
  registerZone('track', 'Гоночный трек', { x1: rect.x1, x2: rect.x2, z1: 40, z2: rect.z2 }, {});
  clearZones.push(rect); // лес не растет ни на самом треке, ни на подъезде

  const { pts, total, start } = trackPath;
  const asphalt = roadBatches.asphalt;
  const mark = roadBatches.mark;

  // ---- Асфальт змеек: лента вдоль оси (по два треугольника на отрезок)
  const normalAt = (i) => {
    const a = pts[(i + pts.length - 1) % pts.length];
    const b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return { nx: -(b.z - a.z) / len, nz: (b.x - a.x) / len, tx: (b.x - a.x) / len, tz: (b.z - a.z) / len };
  };
  const edge = (i, side, hw = pts[i].hw) => {
    const n = normalAt(i);
    return [pts[i].x + n.nx * hw * side, pts[i].z + n.nz * hw * side];
  };
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const [lx1, lz1] = edge(i, 1);
    const [rx1, rz1] = edge(i, -1);
    const [lx2, lz2] = edge(j, 1);
    const [rx2, rz2] = edge(j, -1);
    asphalt.verts.push(lx1, 0.02, lz1, rx1, 0.02, rz1, lx2, 0.02, lz2, rx1, 0.02, rz1, rx2, 0.02, rz2, lx2, 0.02, lz2);
    if (i % 3 === 0) {
      mapRoads.push({ x1: pts[i].x, z1: pts[i].z, x2: pts[j].x, z2: pts[j].z, color: asphalt.mapColor, width: pts[i].hw * 2, round: true });
    }
    // белая пунктирная осевая: короткие штрихи через каждые шесть точек
    if (i % 6 < 2) {
      const n = normalAt(i);
      const hx = n.tx * 1.6;
      const hz = n.tz * 1.6;
      const wx = n.nx * 0.18;
      const wz = n.nz * 0.18;
      const cx = pts[i].x;
      const cz = pts[i].z;
      mark.verts.push(cx - hx - wx, 0.05, cz - hz - wz, cx + hx - wx, 0.05, cz + hz - wz, cx + hx + wx, 0.05, cz + hz + wz);
      mark.verts.push(cx - hx - wx, 0.05, cz - hz - wz, cx + hx + wx, 0.05, cz + hz + wz, cx - hx + wx, 0.05, cz - hz + wz);
    }
  }
  // ---- Подъезд с севера до самого забора; он вливается в первую змейку
  roadV(-85, trackLaneZ[0] - trackLaneHalfW[0] + 3, trackX, 'asphalt', []);
  // Земля вокруг змеек — утоптанная, а не лес
  flatRect(400, 270, 0x4f6a3c, 0.012, trackX + 8, 300);
  mapObjects.push({ x: trackX + 8, z: 300, hx: 200, hz: 135, color: '#4f6a3c', ground: true });

  // ---- Линия старта и арка
  {
    const n = normalAt(pts.indexOf(start));
    const hw = start.hw;
    // шашечки: две полосы клеток поперек дороги
    const cells = Math.round(hw);
    for (let r = 0; r < 2; r++) {
      for (let c = -cells; c < cells; c++) {
        if ((c + r) % 2) continue;
        const ox = n.nx * (c + 0.5) * (hw / cells) + n.tx * (r - 0.5) * 1.1;
        const oz = n.nz * (c + 0.5) * (hw / cells) + n.tz * (r - 0.5) * 1.1;
        const hx = n.nx * (hw / cells / 2);
        const hz = n.nz * (hw / cells / 2);
        const tx = n.tx * 0.55;
        const tz = n.tz * 0.55;
        const cx = start.x + ox;
        const cz = start.z + oz;
        mark.verts.push(cx - hx - tx, 0.06, cz - hz - tz, cx + hx - tx, 0.06, cz + hz - tz, cx + hx + tx, 0.06, cz + hz + tz);
        mark.verts.push(cx - hx - tx, 0.06, cz - hz - tz, cx + hx + tx, 0.06, cz + hz + tz, cx - hx + tx, 0.06, cz - hz + tz);
      }
    }
    // арка над линией: две стойки по краям, балка и табличка
    const arch = new THREE.Group();
    for (const side of [-1, 1]) {
      const post = boxWithEdges(0.7, 6.5, 0.7, 0xe8e8ea);
      post.position.set(side * (hw + 1.2), 3.25, 0);
      arch.add(post);
    }
    const beam = boxWithEdges(hw * 2 + 3.4, 1.4, 0.8, 0xd23c3c);
    beam.position.set(0, 6.8, 0);
    arch.add(beam);
    const label = makeTextPlane('СТАРТ · ФИНИШ', hw * 2 - 4, 1.0, '#ffffff', 'rgba(0,0,0,0)');
    label.position.set(0, 6.8, 0.42);
    arch.add(label);
    const back = label.clone();
    back.position.z = -0.42;
    back.rotation.y = Math.PI;
    arch.add(back);
    arch.position.set(start.x, 0, start.z);
    arch.rotation.y = Math.atan2(-n.nz, n.nx); // локальная ось X — поперек дороги
    cityGroup.add(arch);
    for (const side of [-1, 1]) {
      addObstacle({ x: start.x + n.nx * side * (hw + 1.2), z: start.z + n.nz * side * (hw + 1.2), hx: 0.5, hz: 0.5 });
    }
    addHoverInfo(arch, { kind: 'Трек', name: 'Старт и финиш', desc: 'Здесь начинается круг по «колбаскам» и здесь он заканчивается.' });
  }

  // ---- Контрольные ворота: пара оранжевых стоек по краям дороги
  trackCheckpoints.forEach((c, i) => {
    const len = Math.hypot(c.dx, c.dz) || 1;
    const nx = -c.dz / len;
    const nz = c.dx / len;
    for (const side of [-1, 1]) {
      const post = boxWithEdges(0.45, 3.2, 0.45, 0xff8a1f);
      post.position.set(c.x + nx * side * (c.hw + 1.6), 1.6, c.z + nz * side * (c.hw + 1.6));
      cityGroup.add(post);
      const flag = makeTextPlane(String(i + 1), 1.6, 1.6, '#ffffff', '#ff8a1f');
      flag.position.set(post.position.x, 3.9, post.position.z);
      flag.rotation.y = Math.atan2(c.dx, c.dz);
      cityGroup.add(flag);
    }
  });

  // ---- «Колбаски»: надувные красно-белые ограждения вдоль обоих краев (упругие, как бочки на автодроме)
  {
    const steps = [];
    let lastS = -100;
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].s - lastS < 5.2) continue;
      lastS = pts[i].s;
      steps.push(i);
    }
    const items = [];
    for (const i of steps) {
      const n = normalAt(i);
      for (const side of [-1, 1]) {
        const x = pts[i].x + n.nx * side * (pts[i].hw + 0.9);
        const z = pts[i].z + n.nz * side * (pts[i].hw + 0.9);
        // оставляем проезд: подъезд с севера входит в первую змейку, и у линии старта колбасок нет
        if (Math.abs(x - trackX) < 8 && z < trackLaneZ[0] + 4) continue;
        items.push({ x, z, yaw: Math.atan2(n.tx, n.tz), red: items.length % 4 < 2 });
      }
    }
    const body = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.62, 0.62, 3.0, 10).rotateX(Math.PI / 2), new LitMaterial({ color: 0xffffff }), items.length);
    const capGeo = new THREE.SphereGeometry(0.62, 10, 6);
    const caps = new THREE.InstancedMesh(capGeo, new LitMaterial({ color: 0xffffff }), items.length * 2);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    const at = new THREE.Vector3();
    const red = new THREE.Color(0xd8282a);
    const white = new THREE.Color(0xf4f2ec);
    items.forEach((it, k) => {
      q.setFromAxisAngle(up, it.yaw);
      at.set(it.x, 0.62, it.z);
      m4.compose(at, q, one);
      body.setMatrixAt(k, m4);
      body.setColorAt(k, it.red ? red : white);
      for (const e of [-1, 1]) {
        at.set(it.x + Math.sin(it.yaw) * e * 1.5, 0.62, it.z + Math.cos(it.yaw) * e * 1.5);
        m4.compose(at, q, one);
        caps.setMatrixAt(k * 2 + (e > 0 ? 1 : 0), m4);
        caps.setColorAt(k * 2 + (e > 0 ? 1 : 0), it.red ? red : white);
      }
      addObstacle({ x: it.x, z: it.z, hx: 0.75, hz: 0.75, bouncy: true });
    });
    body.instanceMatrix.needsUpdate = true;
    body.instanceColor.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    caps.instanceColor.needsUpdate = true;
    cityGroup.add(body);
    cityGroup.add(caps);
    addHoverInfo(body, { kind: 'Трек', name: 'Колбаска', desc: 'Надувное красно-белое ограждение змейки. Упругое: машина от него отскакивает.' });
  }

  // ---- Автосалон при въезде на трек (севернее змеек, у подъездной дороги)
  {
    const lotX = trackX + 30; // середина стоянки; машины в два ряда
    const lotZ = 99;
    flatRect(46, 74, 0x505054, 0.011, lotX, lotZ);
    mapObjects.push({ x: lotX, z: lotZ, hx: 23, hz: 37, color: '#56565c', ground: true });
    // Стоянка: все гоночные машины из ДЕМО, садиться можно без ключей (ряды через 13, носом на юг)
    const ids = ['race', 'gt', 'rally', 'muscle', 'drift', 'proto', 'kart'];
    ids.forEach((id, i) => addVehicle(id, lotX - 9 + (i % 2) * 18, 70 + Math.floor(i / 2) * 13, Math.PI, { open: true }));

    // Павильон: бетонная площадка, задняя и боковые стены, стеклянная крыша на стойках, открытый фасад на запад; внутри — гиперкар и Бугатти
    const px = trackX + 79;
    const pz = lotZ;
    flatRect(36, 28, 0xd8d6cf, 0.013, px, pz);
    mapObjects.push({ x: px, z: pz, hx: 18, hz: 14, color: '#d8d6cf', ground: true });
    const wall = (w, h, d, x, z, color) => {
      const box = boxWithEdges(w, h, d, color);
      box.position.set(x, h / 2, z);
      cityGroup.add(box);
      addObstacle({ x, z, hx: w / 2, hz: d / 2 });
      mapObjects.push({ x, z, hx: w / 2, hz: d / 2, color: '#' + color.toString(16).padStart(6, '0') });
      return box;
    };
    wall(0.8, 6, 28, px + 17.6, pz, 0x2c3a4e); // задняя стена
    wall(36, 6, 0.8, px, pz - 13.6, 0x2c3a4e); // северная
    wall(36, 6, 0.8, px, pz + 13.6, 0x2c3a4e); // южная
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(37, 0.4, 29),
      new LitMaterial({ color: 0xa9d8ff, transparent: true, opacity: 0.55 }),
    );
    roof.position.set(px, 6.2, pz);
    cityGroup.add(roof);
    for (const dz of [-13.6, 13.6]) {
      const post = boxWithEdges(0.6, 6, 0.6, 0xe8e8ea);
      post.position.set(px - 17.6, 3, pz + dz);
      cityGroup.add(post);
      addObstacle({ x: px - 17.6, z: pz + dz, hx: 0.3, hz: 0.3 });
    }
    const sign = makeTextPlane('АВТОСАЛОН', 14, 2.2, '#ffffff', '#1f5fd0');
    sign.position.set(px - 17.8, 7.6, pz);
    sign.rotation.y = -Math.PI / 2;
    cityGroup.add(sign);
    const roofRed = boxWithEdges(0.3, 2.2, 14.4, 0x1f5fd0);
    roofRed.position.set(px - 17.6, 7.6, pz);
    cityGroup.add(roofRed);
    addVehicle('hyper', px + 2, pz - 5, -Math.PI / 2, { open: true });
    addVehicle('bugatti', px + 2, pz + 5, -Math.PI / 2, { open: true });
    addHoverInfo(roof, { kind: 'Здание', name: 'Автосалон', desc: 'Автосалон при гоночном треке: перед ним все гоночные машины, под крышей гиперкар и Бугатти.' });
  }
}

// Плоская табличка с текстом (Canvas): для вывесок и номеров ворот
function makeTextPlane(text, w, h, color, bg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(64, Math.round((512 * h) / w));
  const ctx = canvas.getContext('2d');
  if (bg && bg !== 'rgba(0,0,0,0)') {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = color;
  ctx.font = '700 ' + Math.round(canvas.height * 0.62) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
  return mesh;
}
