// sprites/mall-interior.js
// Процедурный интерьер двухэтажного торгового центра в стиле игры.
//   1 этаж: супермаркет с кассами и стеллажами, три бутика, фонтан в центре, вход.
//   2 этаж: фудкорт со столиками и ларьками, зона игровых автоматов.
// Этажи — две отдельные комнаты одного размера (между ними можно «переносить»
// игрока по лестнице). Люди сюда не входят: модель отдает только данные
// (места продавцов, маршруты прохожих, кассы), а оживляет их игровой код.
//
// Подключение:
//   <script src="sprites/mall-interior.js"></script>
// Использование:
//   const mall = createMall();
//   mall.floors[0].group.position.set(0, 0, 1500);   // 1 этаж; вход — со стороны +Z
//   mall.floors[1].group.position.set(0, 0, 2200);   // 2 этаж
//
// Все координаты — локальные, относительно центра комнаты (x вправо, z к входу).
// Возвращает:
//   width, depth, bounds { minX, maxX, minZ, maxZ } — где может стоять центр игрока,
//   playerRadius, door { x, z } — точка у выхода (только 1 этаж),
//   stairs [{ x, z }] — у какой точки «R» переносит между этажами (одинаково на обоих этажах),
//   registers [{ x, z, slot0, step, max }] — кассы 1 этажа; очередь вытягивается в +Z,
//   exitLaneZ — коридор у входа, по которому люди уходят от касс,
//   floors[i] = {
//     group, solids [{ x, z, hx, hz }], fadeBoxes (стены для полупрозрачности),
//     mapShapes (для миникарты), patrols [{ x1, z1, x2, z2 }] (маршруты прохожих),
//     statics [{ x, z, yaw, role }] (кассиры, продавцы, посетители за столиками)
//   }
//
// Зависимость: глобальный THREE (three.js r128+).

function createMall(options = {}) {
  if (typeof THREE === 'undefined') {
    throw new Error('mall-interior.js требует глобальный THREE');
  }

  const o = Object.assign(
    {
      width: 72,
      depth: 44,
      wallHeight: 4.5,
      doorWidth: 8,
      playerRadius: 0.5,
      wallColor: 0xe6dfcc,
      edgeColor: 0x111111,
    },
    options,
  );

  const hw = o.width / 2;
  const hd = o.depth / 2;
  const edgeMat = new THREE.LineBasicMaterial({ color: o.edgeColor });
  const palette = [0xd23c3c, 0xe0c341, 0x3a7bd5, 0x3fa35b, 0xe58a2f, 0x8a5fc4, 0xf1ede2];
  const pickColor = () => palette[Math.floor(Math.random() * palette.length)];

  // Лестницы — на обоих этажах в одних и тех же местах
  const stairCenters = [
    { x: 0, z: -16 },
    { x: 33, z: 9 },
  ];
  const stairs = stairCenters.map((s) => ({ x: s.x, z: s.z + 2.7 + 1.3 }));

  const registers = [-30, -24, -18, -12].map((x) => ({ x, z: 1.5, slot0: 1.5 + 1.7, step: 1.3, max: 6 }));
  const exitLaneZ = hd - 4;

  // Надпись на canvas-текстуре: вывеска/табличка
  function labelPlane(text, w, h, bg, fg) {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = Math.max(64, Math.round((512 * h) / w));
    const c = cv.getContext('2d');
    c.fillStyle = bg;
    c.fillRect(0, 0, cv.width, cv.height);
    c.strokeStyle = fg;
    c.lineWidth = 5;
    c.strokeRect(5, 5, cv.width - 10, cv.height - 10);
    c.fillStyle = fg;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    let size = cv.height * 0.55;
    c.font = 'bold ' + size + 'px sans-serif';
    while (c.measureText(text).width > cv.width - 40 && size > 12) {
      size -= 2;
      c.font = 'bold ' + size + 'px sans-serif';
    }
    c.fillText(text, cv.width / 2, cv.height / 2 + 3);
    return new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }),
    );
  }

  function tileTexture(a, b) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const c = cv.getContext('2d');
    c.fillStyle = a;
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = b;
    c.fillRect(0, 0, 32, 32);
    c.fillRect(32, 32, 32, 32);
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    tex.repeat.set(o.width / 4, o.depth / 4); // один тайл — 2×2 плитки по 2 юнита
    return tex;
  }

  function buildFloor(level) {
    const group = new THREE.Group();
    const solids = [];
    const fadeBoxes = [];
    const mapShapes = [];
    const patrols = [];
    const statics = [];
    const goods = []; // [x, y, z, w, h, d, color] — все мелкие боксы одним InstancedMesh

    function part(w, h, d, color, x, y, z) {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    }
    function addSolid(x, z, hx, hz, mapColor) {
      solids.push({ x, z, hx, hz });
      mapShapes.push({ x, z, hx, hz, color: mapColor || '#7a7a7a' });
    }
    function solidBox(w, h, d, color, x, z, mapColor) {
      part(w, h, d, color, x, h / 2, z);
      addSolid(x, z, w / 2, d / 2, mapColor);
    }
    const good = (x, y, z, w, h, d, color) => goods.push([x, y, z, w, h, d, color === undefined ? pickColor() : color]);
    const patrol = (x1, z1, x2, z2) => patrols.push({ x1, z1, x2, z2 });

    // Стеллаж: каркас с рамкой + товары сверху и на обеих сторонах
    function shelf(x, z, w) {
      solidBox(w, 1.5, 1, 0x9a9a9a, x, z, '#7a7a7a');
      const n = Math.floor(w / 1.1);
      for (let i = 0; i < n; i++) {
        const gx = x - w / 2 + 0.55 + i * 1.1;
        good(gx, 1.8, z, 0.8, 0.6, 0.7);
        for (const face of [-1, 1]) {
          good(gx, 1.05, z + face * 0.65, 0.8, 0.5, 0.3);
          good(gx, 0.4, z + face * 0.65, 0.8, 0.5, 0.3);
        }
      }
    }

    // Лестница вверх/вниз: шесть ступеней, по бокам перила
    function stairsAt(sx, sz) {
      for (let i = 0; i < 6; i++) {
        part(6, 0.3 * (i + 1), 0.85, 0xb5ada0, sx, 0.15 * (i + 1), sz + 2.125 - i * 0.85);
      }
      for (const side of [-1, 1]) part(0.25, 1.4, 5.2, 0x777777, sx + side * 3.1, 0.7, sz);
      addSolid(sx, sz, 3.2, 2.7, '#a09888');
    }

    // Пол
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(o.width, o.depth),
      new THREE.MeshBasicMaterial({
        map: level === 0 ? tileTexture('#d9d2bf', '#c4bca6') : tileTexture('#cdbf9f', '#b9aa86'),
      }),
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0.01;
    group.add(floorMesh);
    mapShapes.push({ x: 0, z: 0, hx: hw, hz: hd, color: level === 0 ? '#cfc8b4' : '#c3b594', ground: true });

    // Стены (полупрозрачные, когда между камерой и игроком)
    function wall(w, d, x, z) {
      const h = o.wallHeight;
      const geo = new THREE.BoxGeometry(w, h, d);
      const wallMat = new THREE.MeshBasicMaterial({ color: o.wallColor, transparent: true });
      const lineMat = new THREE.LineBasicMaterial({ color: o.edgeColor, transparent: true });
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat));
      mesh.position.set(x, h / 2, z);
      group.add(mesh);
      fadeBoxes.push({ mesh, mats: [wallMat, lineMat], half: [w / 2, h / 2, d / 2], fade: 1 });
    }
    const t = 0.4;
    wall(o.width + t * 2, t, 0, -hd - t / 2);
    wall(t, o.depth, -hw - t / 2, 0);
    wall(t, o.depth, hw + t / 2, 0);
    if (level === 0) {
      const piece = (o.width - o.doorWidth) / 2;
      wall(piece, t, -(o.doorWidth / 2 + piece / 2), hd + t / 2);
      wall(piece, t, o.doorWidth / 2 + piece / 2, hd + t / 2);
      // Коврик и кадки у входа
      const mat = new THREE.Mesh(
        new THREE.PlaneGeometry(o.doorWidth, 3),
        new THREE.MeshBasicMaterial({ color: 0x8a2a2a }),
      );
      mat.rotation.x = -Math.PI / 2;
      mat.position.set(0, 0.02, hd - 1.8);
      group.add(mat);
      for (const side of [-1, 1]) {
        solidBox(3, 1, 1.6, 0x5a6b4a, side * 8.5, hd - 1.6, '#5a6b4a');
        good(side * 8.5, 1.4, hd - 1.6, 1.8, 0.8, 1.0, 0x3f7a42);
      }
    } else {
      wall(o.width + t * 2, t, 0, hd + t / 2);
    }

    stairCenters.forEach((s) => stairsAt(s.x, s.z));

    // Табличка на стене (лицом в +Z — от задней стены)
    function backSign(text, x, w, h, y, bg, fg) {
      const sign = labelPlane(text, w, h, bg, fg);
      sign.position.set(x, y, -hd + 0.03);
      group.add(sign);
    }

    if (level === 0) {
      // ── Супермаркет: слева ──
      backSign('СУПЕРМАРКЕТ', -21, 16, 1.6, 3.5, '#2f6b3a', '#f1ede2');
      for (const x of [-30, -21, -12]) solidBox(8, 2.4, 1.2, 0xdfeaf0, x, -hd + 0.8, '#9fb7c4'); // холодильники
      for (const z of [-19, -15, -11, -7]) shelf(-21, z, 24);
      for (const z of [-17, -13, -9]) {
        patrol(-32, z, -10, z);
        patrol(-32, z, -10, z); // два покупателя в проходе
      }

      // Кассы: прилавок, касса и кассир лицом ко входу (в +Z)
      registers.forEach((r) => {
        solidBox(2.6, 1.1, 1.2, 0x3a3a46, r.x, r.z, '#3a3a46');
        part(0.8, 0.5, 0.6, 0x222222, r.x + 0.6, 1.35, r.z);
        statics.push({ x: r.x, z: r.z - 1.5, yaw: Math.PI, role: 'cashier' });
      });

      // ── Бутики: справа, вдоль задней стены ──
      const shops = [
        ['МОДА', '#c4506a', 13.5],
        ['ОБУВЬ', '#3a7bd5', 22.5],
        ['ТЕХНИКА', '#e58a2f', 31.5],
      ];
      for (const [name, color, x] of shops) {
        backSign(name, x, 7, 1.1, 3.7, color, '#ffffff');
        const panel = new THREE.Mesh(
          new THREE.PlaneGeometry(8.4, 2.6),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.55) }),
        );
        panel.position.set(x, 1.5, -hd + 0.03);
        group.add(panel);
        shelf(x, -hd + 2.2, 6.4);
        solidBox(5, 0.9, 1.8, 0xb9a27a, x, -9, '#b9a27a'); // выставочный стол
        for (let i = 0; i < 5; i++) good(x - 2 + i, 1.2, -9, 0.8, 0.5, 0.8);
      }
      patrol(10, -14.5, 34, -14.5);
      patrol(10, -14.5, 34, -14.5);
      patrol(10, -5.5, 34, -5.5);
      patrol(10, 14, 26, 14);

      // ── Центр: фонтан и проходы ──
      solidBox(4, 0.8, 4, 0x8a8a92, 0, -4, '#8a8a92');
      const water = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ color: 0x3a8ad0 }));
      water.rotation.x = -Math.PI / 2;
      water.position.set(0, 0.82, -4);
      group.add(water);
      patrol(-3.5, -10, -3.5, 16);
      patrol(3.5, 16, 3.5, -10);
      // Плазма и кадки на площади справа
      for (const x of [14, 22]) {
        solidBox(2, 1, 2, 0x5a6b4a, x, 11, '#5a6b4a');
        good(x, 1.5, 11, 1.4, 1.0, 1.4, 0x3f7a42);
      }
    } else {
      // ── Фудкорт: ларьки вдоль задней стены ──
      const stalls = [
        ['ПИЦЦА', '#d23c3c', -30],
        ['БУРГЕРЫ', '#e58a2f', -20],
        ['СУШИ', '#2f6b8a', -10],
        ['КОФЕ', '#6b4a3a', 10],
        ['ДЕСЕРТЫ', '#c4506a', 20],
        ['КЕБАБ', '#3fa35b', 30],
      ];
      for (const [name, color, x] of stalls) {
        backSign(name, x, 7, 1.2, 3.6, color, '#ffffff');
        const panel = new THREE.Mesh(
          new THREE.PlaneGeometry(7.5, 2.2),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.55) }),
        );
        panel.position.set(x, 1.3, -hd + 0.03);
        group.add(panel);
        solidBox(6, 1.1, 1.2, 0x8a8a92, x, -hd + 3, '#8a8a92');
        statics.push({ x, z: -hd + 1.4, yaw: Math.PI, role: 'staff' });
      }

      // Столики: 3 ряда × 6 колонок с двумя стульями у каждого
      const tableXs = [-30, -22, -14, 14, 22, 30];
      const tableZs = [-8, 0, 8];
      const tables = [];
      for (const x of tableXs) {
        for (const z of tableZs) {
          good(x, 0.4, z, 1.8, 0.8, 1.8, 0xa07850);
          good(x - 1.45, 0.3, z, 0.7, 0.6, 0.7, pickColor());
          good(x + 1.45, 0.3, z, 0.7, 0.6, 0.7, pickColor());
          addSolid(x, z, 0.9, 0.9, '#a07850');
          tables.push({ x, z });
        }
      }
      // Часть столиков занята: человек у стула лицом к столу
      tables
        .slice()
        .sort(() => Math.random() - 0.5)
        .slice(0, 8)
        .forEach((tb) => {
          const side = Math.random() < 0.5 ? -1 : 1;
          statics.push({ x: tb.x + side * 1.45, z: tb.z, yaw: -side * (Math.PI / 2), role: 'diner' });
        });

      // Игровые автоматы вдоль южной стены слева
      for (let i = 0; i < 6; i++) {
        const x = -33 + i * 2.4;
        good(x, 1.0, hd - 1.2, 1.5, 2.0, 1.0, [0x333366, 0x663333, 0x336633][i % 3]);
        good(x, 1.5, hd - 1.65, 1.1, 0.7, 0.1, [0x66ccff, 0xffcc44, 0xff66aa][i % 3]);
        addSolid(x, hd - 1.2, 0.75, 0.5, '#555599');
      }
      const arcade = labelPlane('ИГРЫ', 6, 1.2, '#333366', '#ffd84a');
      arcade.rotation.y = Math.PI;
      arcade.position.set(-28, 3.4, hd - 0.03);
      group.add(arcade);

      patrol(-34, -13.5, -6, -13.5);
      patrol(34, -13.5, 6, -13.5);
      patrol(-34, -4, -10, -4);
      patrol(10, -4, 34, -4);
      patrol(-34, 4, -10, 4);
      patrol(10, 12, 34, 12);
      patrol(-3.5, -10, -3.5, 17);
      patrol(3.5, 17, 3.5, -10);
      patrol(-34, 14, -6, 14);
    }

    // Все мелкие боксы этажа — один InstancedMesh с цветом на каждый
    const goodsMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      goods.length,
    );
    const m4 = new THREE.Matrix4();
    const tint = new THREE.Color();
    goods.forEach(([x, y, z, w, h, d, color], i) => {
      m4.makeScale(w, h, d).setPosition(x, y, z);
      goodsMesh.setMatrixAt(i, m4);
      goodsMesh.setColorAt(i, tint.setHex(color));
    });
    goodsMesh.frustumCulled = false; // bounding sphere у InstancedMesh не учитывает инстансы
    group.add(goodsMesh);

    return { group, solids, fadeBoxes, mapShapes, patrols, statics };
  }

  return {
    floors: [buildFloor(0), buildFloor(1)],
    width: o.width,
    depth: o.depth,
    playerRadius: o.playerRadius,
    bounds: {
      minX: -hw + o.playerRadius,
      maxX: hw - o.playerRadius,
      minZ: -hd + o.playerRadius,
      maxZ: hd - o.playerRadius,
    },
    door: { x: 0, z: hd - o.playerRadius },
    stairs,
    registers,
    exitLaneZ,
  };
}
