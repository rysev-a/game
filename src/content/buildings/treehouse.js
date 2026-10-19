// src/content/buildings/treehouse.js
// ДОМ АННЫ ПЕТРОВНЫ И ДОМИК НА ДЕРЕВЕ (docs/story/locations/grandma-house.md).
//   grandma_house — одноэтажный деревянный дом с крыльцом; Анна Петровна во дворе.
//   treehouse     — огромное дерево за оврагом, в кроне неприметный, но большой домик — база героя.
//                   Наверх ведет веревочная лестница, спрятанная в дупле. Внутри: верстак, ноутбук Веры,
//                   сундук, гамак, полка с приборами Веры, записи.

const treehouseW = 16;
const treehouseD = 12;

// Спать в гамаке до 7 утра
function sleepUntilMorning() {
  const h = gameHour();
  let hours = (24 + 7 - h) % 24;
  if (hours < 0.5) hours += 24;
  advanceGameTime(Math.round(hours * 60));
  showToast('Вы выспались в гамаке. Утро, ' + formatGameTime() + '.', 4000);
}

defineBuilding('treehouse', {
  name: 'Домик на дереве',
  desc: 'Огромное старое дерево, в кроне — домик Веры, спрятанный в листве. Наверх — по веревочной лестнице из дупла.',
  size: { w: 20, d: 20 },
  enterLabel: 'E — подняться по веревочной лестнице',
  exitLabel: 'E — спуститься по веревочной лестнице',

  exterior() {
    const group = createTreehouse();
    return {
      group,
      obstacles: [{ x: 0, z: 0, hx: 1.9, hz: 1.9 }],
      mapShapes: [{ x: 0, z: -0.5, hx: 7, hz: 7, color: '#356b2e' }],
      fade: group.userData.fade,
      door: { x: 0, z: 3.0 },
    };
  },

  interior({ full }) {
    const room = createRoomFloor({ w: treehouseW, d: treehouseD, wallH: 3, floorColor: 0x9a7448, plank: true, wallColor: 0x8a6a3c });
    const stations = [];
    // Люк в полу и веревочная лестница вниз (у южной стены)
    room.part(1.6, 0.05, 1.6, 0x1a120a, 0, 0.03, 4.6);
    for (const sx of [-0.5, 0.5]) room.part(0.06, 0.06, 1.5, 0xc9a86a, sx, 0.08, 4.6);
    // Окна в листву
    for (const x of [-4.5, 4.5]) room.part(1.6, 1.0, 0.1, 0x5f9a42, x, 1.8, -treehouseD / 2 + 0.02);

    if (full) {
      // Верстак у западной стены
      room.furniture(1.4, 0.95, 3.6, 0x6b4a2e, -7.1, -1);
      room.part(0.5, 0.3, 0.5, 0x777777, -7.1, 1.1, -2.2); // тиски
      room.part(0.3, 0.4, 0.3, 0x3fa35b, -7.1, 1.15, 0.2); // колба
      room.part(0.3, 0.5, 0.3, 0x3fa35b, -6.8, 1.2, 0.6);
      stations.push({
        floor: 0, x: -5.8, z: -1, id: 'workbench', label: 'E — верстак', at: { x: -7.1, z: -1, y: 1.5 }, // at — сам объект (подсветка и клик, src/quests/guide.js)
        act: () => showToast('Верстак Веры. Позже здесь можно будет синтезировать эликсир и собирать простые вещи.', 4500),
      });
      // Установка синтеза Веры: большой серверный шкаф в северо-западном углу, у ствола дерева. Квантово-полярный вычислительный синтезатор:
      // Вера собрала его по частям из блоков лаборатории (src/content/quests/2-05-elixir.js); светодиоды мигают, по бокам трубки охлаждения, кабели по полу
      room.part(1.7, 3.0, 1.7, 0x4a3320, -7.2, 1.5, -5.2); // ствол дерева за шкафом
      const rack = room.furniture(1.5, 2.5, 1.0, 0x1d242c, -6.7, -4.5);
      rack.userData.hoverInfo = {
        kind: 'Установка',
        name: 'Установка синтеза Веры',
        desc: 'Серверный шкаф с квантово-полярными контурами: синтезирует эликсир. Вера собрала ее из блоков лаборатории.',
      };
      const rackLeds = [];
      for (let i = 0; i < 8; i++) {
        room.part(1.3, 0.2, 0.04, 0x2b3947, -6.7, 0.45 + i * 0.27, -3.98); // блок
        for (let k = 0; k < 4; k++) {
          const led = room.part(0.09, 0.09, 0.05, [0x37ff7a, 0x4fa8ff, 0xffb347][(i + k) % 3], -7.1 + k * 0.18, 0.45 + i * 0.27, -3.95);
          rackLeds.push(led);
        }
      }
      room.part(1.2, 0.45, 0.05, 0x0f3a4a, -6.7, 2.55, -3.97); // экран
      for (const dx of [-0.85, 0.85]) room.part(0.12, 2.6, 0.12, 0x8fd0ff, -6.7 + dx, 1.3, -3.95); // трубки охлаждения
      room.part(0.08, 0.05, 3.0, 0x111419, -5.4, 0.04, -4.3); // кабели по полу
      room.part(0.08, 0.05, 2.2, 0x1a1f26, -5.2, 0.04, -3.4);
      rack.onBeforeRender = () => {
        const t = performance.now() / 380;
        rackLeds.forEach((led, i) => (led.visible = Math.sin(t + i * 1.7) > -0.3)); // мигают
      };
      stations.push({
        floor: 0, x: -5.4, z: -4.5, id: 'synth', label: 'E — установка синтеза Веры', at: { x: -6.7, z: -4.5, y: 2.6 },
        act: () => {
          // После первого эликсира (2.05) установка варит еще: три часа работы дают 40 единиц на шкалу (до полной). Без квестовой системы или до 2.05 — только описание
          if (typeof questGame !== 'undefined' && questGame && questGame.check('done:2.05')) {
            if (heroStats.elixir >= heroStats.maxElixir - 0.5) showToast('Установка синтеза Веры гудит вхолостую: эликсира у вас и так полная шкала.', 3500);
            else questGame.run([{ wait: '3h' }, { elixir: 40 }, { toast: 'Установка варила эликсир три часа: шкала пополнена на 40 единиц (держите хотя бы 20 для прибора).' }]);
            return;
          }
          showToast('Установка синтеза Веры: гудит холодом, светодиоды мигают. Для эликсира ей нужны реагенты.', 4500);
        },
      });
      // Стол с ноутбуком Веры
      room.furniture(2.2, 0.8, 1.2, 0xa07850, -2.5, -5.0);
      room.part(0.9, 0.06, 0.6, 0x2a2a30, -2.5, 0.83, -5.0);
      room.part(0.9, 0.6, 0.06, 0x3a7bd5, -2.5, 1.13, -5.3);
      stations.push({
        floor: 0, x: -2.5, z: -3.8, id: 'laptop', label: 'E — ноутбук Веры', at: { x: -2.5, z: -5.0, y: 1.5 }, // id: квест может перехватить E (interactions)
        act: () => showToast('Ноутбук Веры. Пароля нет, на экране открыта переписка...', 4500),
        use: { floppy: () => showToast('Ноутбук Веры читает дискету: на ней одна папка, и та под паролем.', 4500) },
      });
      // Записи Веры на стене
      room.part(2.4, 1.4, 0.06, 0xd8c9a0, 2.0, 1.8, -treehouseD / 2 + 0.05);
      for (let i = 0; i < 5; i++) room.part(0.45, 0.35, 0.03, [0xf1ede2, 0xe0c341, 0xe58a2f][i % 3], 1.2 + i * 0.4, 1.6 + (i % 2) * 0.4, -treehouseD / 2 + 0.1);
      stations.push({
        floor: 0, x: 2.0, z: -4.9, id: 'notes', label: 'E — записи Веры', at: { x: 2.0, z: -4.95, y: 2.55 },
        act: () => showToast('Записи и заметки Веры: рецепты, схемы и подсказки к тайникам.', 4500),
      });
      // Полка с приборами Веры и запасом эликсира
      room.furniture(3.4, 2.0, 0.8, 0x5a3a22, 6, -5.4);
      room.part(0.5, 0.4, 0.4, 0x8a5fc4, 5, 1.2, -5.4);
      room.part(0.6, 0.3, 0.4, 0x4a8a9a, 6, 1.2, -5.4);
      room.part(0.4, 0.5, 0.4, 0xd07a2f, 7, 1.25, -5.4);
      for (let i = 0; i < 4; i++) room.part(0.22, 0.4, 0.22, 0x3fa35b, 5.2 + i * 0.5, 0.45, -5.0);
      stations.push({
        floor: 0, x: 6, z: -4.3, label: 'E — приборы Веры',
        act: () => showToast('Приборы Веры. Сейчас не работают, их можно будет починить. Рядом запас эликсира.', 4500),
      });
      // Сундук, на нем — бесконечный рюкзак Веры (src/player/inventory.js): с ним инвентарь без конца.
      // Рюкзак виден, пока его нет у героя (и после загрузки сохранения без него — снова лежит)
      const chest = room.furniture(1.8, 0.9, 1.0, 0x6b3a22, 6.6, -1.5);
      room.part(1.85, 0.12, 1.05, 0xc9a82a, 6.6, 0.7, -1.5);
      const backpack = createItemModel('backpack', 0.9);
      backpack.position.set(6.6, 0.95, -1.5);
      backpack.children[0].onBeforeRender = () => {
        backpack.rotation.y = performance.now() / 1000;
      };
      room.group.add(backpack);
      chest.onBeforeRender = () => {
        backpack.visible = !hasItem('backpack');
      };
      const takeBackpack = () => {
        if (!addItem('backpack')) return;
        showToast('Бесконечный рюкзак! Он бездонный: влезает сколько угодно вещей, и они ничего не весят.', 4500);
      };
      addPickable({ id: 'backpack', mesh: backpack, canPick: () => !hasItem('backpack'), pick: takeBackpack });
      // Рядом с рюкзаком — супер-браслет Веры (без него сохранений нет); взять — надеть на руку
      const bracelet = createItemModel('bracelet', 0.55);
      bracelet.position.set(7.2, 0.9, -1.1);
      bracelet.children[0].onBeforeRender = () => {
        bracelet.rotation.y = -performance.now() / 900;
      };
      room.group.add(bracelet);
      const braceletOnChest = chest.onBeforeRender;
      chest.onBeforeRender = (...a) => {
        braceletOnChest(...a);
        bracelet.visible = !isWorn('bracelet');
      };
      const takeBracelet = () => wearDevice('bracelet');
      addPickable({ id: 'bracelet', mesh: bracelet, canPick: () => !isWorn('bracelet'), pick: takeBracelet });
      stations.push({
        floor: 0, x: 5.3, z: -1.5,
        label: () => (hasItem('backpack') && isWorn('bracelet') ? 'E — сундук' : 'E — взять: ' + (hasItem('backpack') ? 'супер-браслет' : 'рюкзак и супер-браслет')),
        act: () => {
          if (!hasItem('backpack')) takeBackpack();
          if (!isWorn('bracelet')) takeBracelet();
          else if (hasItem('backpack')) showToast('Сундук. Позже здесь можно будет хранить вещи и приборы.', 3500);
        },
      });
      // Гамак между двумя столбами (юго-восток)
      for (const x of [3.4, 7.4]) room.furniture(0.25, 2.2, 0.25, 0x5a3d26, x, 3.8);
      room.part(3.6, 0.15, 1.0, 0xc43a3a, 5.4, 1.0, 3.8);
      stations.push({ floor: 0, x: 5.4, z: 2.8, label: 'E — лечь в гамак (спать до утра)', act: sleepUntilMorning });
      // Коврик и подушки посередине
      room.part(3.2, 0.03, 2.4, 0x3a5a8a, -2, 0.03, 0.5);
    }

    return {
      name: () => 'Домик на дереве',
      floors: [room],
      bounds: roomBounds(treehouseW, treehouseD),
      playerRadius: 0.45,
      door: { x: 0, z: 4.6 + 1.5 },
      stations,
      sounds: { forest_birds: 0.5, birds: 0.3 },
      footsteps: true,
      minimapRange: 28,
    };
  },
});

// ---------- Дом Анны Петровны ----------
// Двухэтажный дом больше дома Максима (18 × 12): внизу гостиная с печью и кухня, наверху комната Веры (кровать, стол, шкаф, пианино)
// и спальня бабушки. Справа к дому пристроен гараж с въездом (парковка у дома, как в американских фильмах): перед ним — подъездная дорожка
const grandmaW = 24;
const grandmaD = 15;
const grandmaGarageW = 7.4; // гараж пристроен справа (в +X модели), фасадом вровень с домом

defineBuilding('grandma_house', {
  name: 'Дом Анны Петровны',
  desc: 'Двухэтажный дом бабушки Веры с гаражом и подъездной дорожкой. Здесь всегда пахнет пирогами.',
  size: { w: grandmaW + grandmaGarageW + 2, d: grandmaD + 4 },
  enterLabel: 'E — войти в дом Анны Петровны',
  exitLabel: 'E — выйти во двор',

  exterior({ full }) {
    // Современный дом из дерева, темного камня и стекла (как на картинке home.jpg): справа высокий объем с крутой темной двускатной крышей и
    // огромным остеклением под коньком, слева низкое крыло с раздвижными стеклянными дверями, каменная труба, деревянная терраса со ступенями
    const group = new THREE.Group();
    const front = grandmaD / 2;
    const wood = 0xc98a4a;
    const woodDark = 0xa8692f;
    const stone = 0x565b62;
    const roofCol = 0x25282d;
    const frameCol = 0x14161a;
    const glowGlass = new THREE.MeshBasicMaterial({ color: 0xf2b866 }); // стекло светится теплым изнутри
    const coolGlass = new LitMaterial({ color: 0x35495e });
    const edge = cityEdgeMat;
    const add = (mesh, x, y, z) => {
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    };
    const solid = (w, h, d, color, x, y, z) => add(boxWithEdges(w, h, d, color), x, y, z);
    // Призма по контуру в плоскости XY, длиной depth по Z (центр по Z — в нуле)
    const prism = (pts, depth, color, x, y, z) => {
      const shape = new THREE.Shape();
      pts.forEach(([px, py], k) => (k ? shape.lineTo(px, py) : shape.moveTo(px, py)));
      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
      geo.translate(0, 0, -depth / 2);
      const mesh = new THREE.Mesh(geo, new LitMaterial({ color }));
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge));
      return add(mesh, x, y, z);
    };
    const pane = (w, h, x, y, z, glass = glowGlass) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), glass);
      return add(m, x, y, z);
    };

    // Главный объем: x от −3,6 до 12, крыша коньком вдоль Z, фронтон к улице
    const mx0 = -3.6;
    const mx1 = grandmaW / 2;
    const mw = mx1 - mx0;
    const mc = (mx0 + mx1) / 2;
    const eave = 5.6;
    const rise = 5.6;
    solid(mw, eave, grandmaD, wood, mc, eave / 2, 0);
    // Фронтон: деревянный треугольник под самой крышей, спереди и сзади
    prism([[-mw / 2, 0], [mw / 2, 0], [0, rise]], grandmaD, wood, mc, eave, 0);
    // Крыша: две толстые темные плиты с выносом на 0,8 вперед и назад
    const slopeLen = Math.hypot(mw / 2 + 0.7, rise + 0.3);
    const ang = Math.atan2(rise + 0.3, mw / 2 + 0.7);
    for (const s of [-1, 1]) {
      const slab = boxWithEdges(slopeLen, 0.34, grandmaD + 1.6, roofCol);
      slab.rotation.z = -s * ang; // правая плита опускается к правому краю, левая — к левому
      add(slab, mc + s * (mw / 4 + 0.35), eave + (rise + 0.3) / 2 - 0.12, 0);
    }
    solid(0.3, 0.3, grandmaD + 1.6, roofCol, mc, eave + rise + 0.2, 0); // коньковый брус
    // Каменная полоса между деревом и остеклением, труба справа
    solid(2.1, 6.6, 0.5, stone, 3.5, 3.3, front + 0.12);
    solid(1.7, 5.4, 1.7, stone, mx1 - 1.2, eave + 2.2, -3.4); // труба пробивает крышу
    solid(2.0, 0.25, 2.0, 0x2f3338, mx1 - 1.2, eave + 4.95, -3.4); // оголовок
    // Остекление справа: высокие окна на два этажа и треугольник под коньком
    solid(7.4, 5.0, 0.12, frameCol, 8.1, 2.9, front + 0.1); // рама
    for (let i = 0; i < 3; i++) pane(2.3, 4.6, 5.9 + i * 2.2, 2.9, front + 0.18);
    solid(7.4, 0.14, 0.14, frameCol, 8.1, 5.45, front + 0.2); // перекладина между этажами
    const gl = 0.12;
    const roofY = (x) => eave + (mx1 - x) * (rise / (mw / 2)) * (x >= mc ? 1 : 0) + (x < mc ? (x - mx0) * (rise / (mw / 2)) : 0);
    prism([[4.7, 5.7], [10.4, 5.7], [4.7, roofY(4.7) - 0.7]], gl, frameCol, 0, 0, front + 0.1);
    prism([[5.0, 5.85], [9.9, 5.85], [5.0, roofY(5.0) - 0.95]], gl, 0xf2b866, 0, 0, front + 0.18);
    solid(0.1, 3.4, 0.16, frameCol, 6.3, 7.4, front + 0.24); // импосты верхнего окна
    solid(0.1, 2.3, 0.16, frameCol, 7.9, 6.9, front + 0.24);
    // Дерево слева: узкие теплые окна, дверь, настенный светильник
    for (const [wx, wy] of [[-2.4, 6.6], [-2.4, 2.4]]) {
      solid(1.4, 2.2, 0.12, frameCol, wx, wy, front + 0.1);
      pane(1.1, 1.9, wx, wy, front + 0.17);
    }
    solid(1.5, 2.5, 0.14, frameCol, 0, 1.25, front + 0.1); // входная дверь с узким окном
    solid(1.2, 2.3, 0.1, 0x6b4a2e, 0, 1.15, front + 0.18);
    pane(0.3, 1.6, 0.35, 1.45, front + 0.25);
    solid(0.18, 0.5, 0.18, 0x222428, 1.7, 3.2, front + 0.28); // светильник
    pane(0.1, 0.34, 1.7, 3.2, front + 0.38);

    // Левое крыло: ниже, темная облицовка, односкатная крыша и раздвижные стеклянные двери во всю ширину
    const lx0 = -grandmaW / 2;
    const lx1 = mx0;
    const lw = lx1 - lx0;
    const lc = (lx0 + lx1) / 2;
    const lEave = 4.9;
    solid(lw, lEave, grandmaD, 0x3b3f45, lc, lEave / 2, 0);
    const lSlope = Math.hypot(lw + 1.2, 1.8);
    const lSlab = boxWithEdges(lSlope, 0.34, grandmaD + 1.6, roofCol);
    lSlab.rotation.z = Math.atan2(1.8, lw + 1.2); // подъем к главному объему
    add(lSlab, lc - 0.1, lEave + 0.9, 0);
    solid(lw + 0.3, 0.2, 0.2, frameCol, lc, lEave, front + 0.12);
    solid(lw - 0.6, 3.3, 0.12, frameCol, lc, 1.9, front + 0.1);
    for (let i = 0; i < 4; i++) pane((lw - 1.0) / 4 - 0.1, 3.0, lx0 + 0.8 + ((lw - 1.0) / 4) * (i + 0.5) + 0.0, 1.9, front + 0.17);
    solid(lw - 1, 1.2, 0.12, frameCol, lc, 4.0, front + 0.1);
    for (let i = 0; i < 3; i++) pane((lw - 1.4) / 3, 0.9, lx0 + 0.9 + ((lw - 1.4) / 3 + 0.05) * (i + 0.5), 4.0, front + 0.17, coolGlass); // верхние окна второго этажа

    // Терраса вдоль фасада, ступени по центру, кашпо и камни перед домом
    solid(grandmaW - 2, 0.45, 3.4, 0xb87a42, -1.6, 0.22, front + 1.7);
    for (let i = 0; i < 2; i++) solid(4.4, 0.2, 0.7, woodDark, 0, 0.1 + i * 0.0, front + 3.6 + i * 0.7 - 0.0);
    solid(2.4, 0.5, 0.7, 0x6b4a2e, 4.8, 0.7, front + 0.7); // длинное кашпо у стекла
    solid(2.1, 0.28, 0.5, 0x3f7a35, 4.8, 1.08, front + 0.7);
    for (const [px, pz] of [[-8.4, front + 0.9], [-6.6, front + 1.1]]) {
      const pot = boxWithEdges(0.75, 0.7, 0.75, 0x1b1d21); // черные кадки
      add(pot, px, 0.8, pz);
      add(boxWithEdges(0.9, 0.9, 0.9, 0x3f7a35), px, 1.5, pz);
    }
    for (const [rx, rz, rs] of [[-8.5, front + 4.6, 0.9], [-9.7, front + 3.9, 0.6], [-7.4, front + 5.2, 0.5], [9.6, front + 4.8, 0.8], [8.2, front + 5.6, 0.5]]) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rs, 0), new LitMaterial({ color: 0x7c8087 }));
      rock.scale.y = 0.7;
      add(rock, rx, rs * 0.55, rz);
    }

    // Гараж справа: темные стены, плоская двускатная крыша, дверь из деревянных панелей
    const gx0 = grandmaW / 2 + grandmaGarageW / 2;
    const garage = createHouse({
      width: grandmaGarageW, depth: 10, wallHeight: 3.4, roofRise: 1.6, floors: 1, roof: 'gable', ridgeAlongX: false,
      wallColor: 0x3b3f45, roofColor: roofCol,
    });
    garage.position.set(gx0, 0, front - 5);
    group.add(garage);
    solid(grandmaGarageW - 1.4, 2.8, 0.14, 0xb87a42, gx0, 1.4, front + 0.08);
    for (const y of [0.7, 1.4, 2.1]) solid(grandmaGarageW - 1.4, 0.07, 0.16, 0x7a4a22, gx0, y, front + 0.1);

    // Колодец и поленница
    solid(1.6, 0.9, 1.6, 0x8a8a88, -grandmaW / 2 - 3, 0.45, front + 3);
    solid(2, 0.12, 1.4, 0x6b4a2e, -grandmaW / 2 - 3, 2.1, front + 3);
    solid(3.4, 1.2, 0.9, 0x9a6a3a, -4, 0.6, -front - 0.9); // поленница у задней стены
    return {
      group,
      obstacles: [
        { x: 0, z: 0, hx: grandmaW / 2, hz: grandmaD / 2 },
        { x: gx0, z: front - 5, hx: grandmaGarageW / 2, hz: 5 },
        { x: -grandmaW / 2 - 3, z: front + 3, hx: 0.8, hz: 0.8 },
        { x: -4, z: -front - 0.9, hx: 1.7, hz: 0.45 },
      ],
      mapShapes: [
        { x: 0, z: 0, hx: grandmaW / 2, hz: grandmaD / 2, color: '#a8692f' },
        { x: gx0, z: front - 5, hx: grandmaGarageW / 2, hz: 5, color: '#3b3f45' },
      ],
      door: { x: 0, z: front + 2.8 },
      people: full
        ? [{
            x: 3.4, z: front + 3.2, yaw: Math.PI, type: 'anna', gender: 'female',
            name: 'Анна Петровна', title: 'бабушка Веры', charId: 'anna', // разговор из данных: src/content/characters/anna.js
            talk: simpleTalk('Анна Петровна — бабушка Веры', {
              hello: 'Максимушка... Ты же совсем не изменился. Только похудел.',
              knows: 'Они всё перевернули. А на дерево и не глянули. Взрослые никогда не смотрят наверх.',
              help: 'Пирогами накормлю. Иди через участок к оврагу, по бревну. Домик на дереве теперь твой.',
            }),
          }]
        : [],
    };
  },

  interior({ full }) {
    const W = grandmaW;
    const D = grandmaD;
    const ground = createRoomFloor({ w: W, d: D, wallH: 3.3, floorColor: 0x8a6a48, plank: true, wallColor: 0xd8c9a8, doorGap: 2.6 });
    const upper = createRoomFloor({ w: W, d: D, wallH: 3.1, floorColor: 0x9a7a54, plank: true, wallColor: 0xe0d3b2, doorGap: 0 });
    const stations = [];
    // Перегородка между гостиной (запад) и кухней (восток): проход посередине
    ground.wall(0.2, 5, 2, -5, 0xc9b898);
    ground.wall(0.2, 3, 2, 6, 0xc9b898);
    // Наверху: слева комната Веры, справа спальня бабушки, посередине коридор с лестницей
    for (const x of [-3, 1.5]) {
      upper.wall(0.2, 8.3, x, -3.35, 0xc9b898);
      upper.wall(0.2, 4.3, x, 5.35, 0xc9b898);
    }
    // Лестница вдоль северной стены: ступени поднимаются к востоку (на втором этаже выход к коридору)
    for (let i = 0; i < 6; i++) ground.part(0.62, 0.45 * (i + 1), 1.5, 0xa07850, -4.2 + i * 0.62, 0.225 * (i + 1), -6.7);
    ground.addSolid(-2.55, -6.7, 1.75, 0.75, '#a07850');

    if (full) {
      // Гостиная: диван, кресло, журнальный столик, ковер, книжный шкаф и изразцовая печь
      ground.part(4.4, 0.03, 3.2, 0xb05a4a, -7.6, 0.03, -2.4);
      ground.furniture(3.0, 0.9, 1.1, 0x6b7a8a, -8.2, -6.4);
      ground.part(3.0, 0.5, 0.2, 0x5a6a7a, -8.2, 1.15, -6.9);
      ground.furniture(1.1, 0.9, 1.1, 0x8a5a3a, -11.0, -2.6);
      ground.furniture(1.6, 0.45, 1.0, 0xa07850, -7.4, -2.6);
      ground.furniture(0.5, 2.4, 3.4, 0x6b5a48, -11.5, 1.8);
      for (let i = 0; i < 4; i++) ground.part(0.55, 0.12, 0.8, [0xc43a3a, 0x3a7bd5, 0xe0c341, 0x3fa35b][i], -11.4, 0.5 + i * 0.55, 0.6 + (i % 2) * 1.6);
      ground.furniture(1.3, 2.4, 1.5, 0xe8e2d0, -11.0, 5.4);
      ground.part(0.5, 0.6, 0.06, 0x2a2a2e, -10.4, 0.9, 4.65); // дверца печи
      stations.push({
        floor: 0, x: -10.1, z: 5.4, label: 'E — печка',
        act: () => showToast('Изразцовая печь. Теплая, хоть сейчас лезь на лежанку: в детстве вы с Верой так и делали.', 4500),
      });
      // Кухня: гарнитур вдоль северной стены, плита, холодильник, обеденный стол с табуретками, шкаф с посудой
      ground.furniture(5.6, 0.9, 0.8, 0xdad6c8, 6.2, -7.0);
      ground.part(0.9, 0.04, 0.6, 0x2a2a2e, 4.6, 0.92, -7.0); // плита: две конфорки
      ground.part(0.9, 0.04, 0.6, 0x9aa4ad, 7.8, 0.92, -7.0); // мойка
      ground.furniture(1.0, 2.0, 0.9, 0xe8e8ec, 10.9, -6.9);
      ground.furniture(2.8, 0.8, 1.6, 0xa07850, 7.0, 0.6);
      for (const [x, z] of [[5.8, -0.9], [8.2, -0.9], [5.8, 2.1], [8.2, 2.1]]) ground.furniture(0.5, 0.5, 0.5, 0x8a6a3c, x, z);
      ground.part(0.8, 0.12, 0.5, 0xe8c070, 7.0, 0.86, 0.6); // пирог на столе
      ground.furniture(0.6, 2.0, 2.8, 0xb08a5a, 11.5, 2.4);
      stations.push({
        floor: 0, x: 7.0, z: 0.6, label: 'E — кухонный стол',
        act: () => showToast('На столе пирог под полотенцем. Анна Петровна печет, пока ждет гостей: в этом доме всегда пахнет пирогами.', 4500),
      });
      stations.push({
        floor: 0, x: 5.8, z: -5.8, label: 'E — плита',
        act: () => showToast('На плите чайник. Бабушка Веры не выключает его весь день: вдруг кто зайдет.', 4000),
      });

      // Комната Веры (запад, второй этаж): кровать, стол, шкаф, книжная полка, пианино, ролики и лыжи
      upper.part(4.2, 0.03, 3.4, 0x6a8ab0, -7.4, 0.03, 0.4); // ковер
      upper.furniture(1.5, 0.55, 2.4, 0x8a3b6a, -10.7, -6.0);
      upper.part(1.2, 0.12, 0.5, 0xf1ede2, -10.7, 0.61, -6.9); // подушка
      upper.furniture(0.5, 0.5, 0.5, 0x8a6a3c, -9.2, -6.9); // тумбочка
      upper.furniture(2.0, 0.8, 0.9, 0xa07850, -6.2, -6.8);
      upper.part(0.7, 0.04, 0.5, 0x3a3e44, -6.2, 0.82, -6.8); // ноутбук Веры
      upper.part(0.7, 0.45, 0.04, 0x15151a, -6.2, 1.05, -7.1);
      upper.furniture(0.5, 0.5, 0.5, 0x6b4a2e, -6.2, -5.5); // стул
      upper.furniture(1.0, 2.4, 2.8, 0x8a6a48, -11.4, -1.2);
      upper.furniture(0.5, 2.0, 3.2, 0x6b5a48, -11.7, 2.9);
      for (let i = 0; i < 3; i++) upper.part(0.4, 0.14, 2.8, [0x3a7bd5, 0xc43a3a, 0xe0c341][i], -11.65, 0.5 + i * 0.6, 2.9);
      upper.furniture(1.8, 1.3, 0.7, 0x2a1a10, -8.0, 6.7); // пианино
      upper.part(1.7, 0.1, 0.3, 0xf1ede2, -8.0, 1.0, 6.3);
      upper.part(0.05, 1.0, 0.7, 0x7fb0c8, -11.93, 1.8, -3.6); // постер над столом
      upper.part(0.1, 1.8, 0.3, 0x3a7bd5, -3.3, 0.9, 6.0); // лыжи у перегородки
      upper.part(0.1, 1.8, 0.3, 0xc43a3a, -3.3, 0.9, 6.5);
      upper.part(0.4, 0.3, 0.6, 0xe0c341, -4.6, 0.15, 5.0); // ролики
      stations.push({
        floor: 1, x: -10.7, z: -4.2, label: 'E — кровать Веры',
        act: () => showToast('Покрывало разглажено, как будто Вера только что вышла. На подушке плюшевый заяц с оторванным ухом.', 5000),
      });
      stations.push({
        floor: 1, x: -6.2, z: -5.3, label: 'E — стол Веры',
        act: () => showToast('Стол Веры: тетради, схемы и карандашные наброски огромного дерева. Одна страница вырвана.', 5000),
      });
      stations.push({
        floor: 1, x: -8.0, z: 5.3, id: 'piano', label: 'E — пианино Веры', // id: квест 2.14 открывает в нем тайник
        act: () => showToast('Пианино Веры. На крышке фотография: вы с Верой у большого дерева за оврагом.', 4500),
      });
      // Спальня Анны Петровны (восток, второй этаж)
      upper.part(4.0, 0.03, 3.0, 0x9a5a4a, 7.4, 0.03, 0.8);
      upper.furniture(1.8, 0.6, 2.4, 0x7a3b3b, 9.6, -6.0);
      upper.part(1.4, 0.12, 0.5, 0xf1ede2, 9.6, 0.66, -6.9);
      upper.furniture(0.6, 0.6, 0.6, 0x8a6a3c, 7.9, -6.9);
      upper.furniture(1.0, 2.4, 3.0, 0x8a6a48, 11.4, 0.6);
      upper.furniture(2.0, 0.9, 0.7, 0xa07850, 7.4, 6.8);
      upper.furniture(1.1, 0.9, 1.1, 0x8a5a3a, 4.2, 5.4); // кресло с вязанием
      upper.part(0.5, 0.3, 0.5, 0xc43a3a, 4.2, 1.0, 5.4);
      stations.push({
        floor: 1, x: 7.4, z: 5.2, label: 'E — комод Анны Петровны',
        act: () => showToast('На комоде рамки с фотографиями: Вера маленькая, Вера с косичками, Вера у дерева. Новых нет.', 5000),
      });
    }
    return {
      name: (floor) => (floor === 0 ? 'Дом Анны Петровны' : 'Дом Анны Петровны, второй этаж'),
      floors: [ground, upper],
      bounds: roomBounds(W, D),
      playerRadius: 0.45,
      door: { x: 0, z: D / 2 - 0.45 },
      stairs: [
        { floor: 0, to: 1, x: -2.6, z: -4.6, label: 'E — подняться наверх', arrive: { x: 0.3, z: -4.4 } },
        { floor: 1, to: 0, x: 0.2, z: -5.8, label: 'E — спуститься вниз', arrive: { x: -2.6, z: -3.4 } },
      ],
      stations,
      sounds: {},
      footsteps: true,
      minimapRange: 28,
    };
  },
});
