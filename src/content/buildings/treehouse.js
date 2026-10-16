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
        floor: 0, x: -5.8, z: -1, label: 'E — верстак',
        act: () => showToast('Верстак Веры. Позже здесь можно будет синтезировать эликсир и собирать простые вещи.', 4500),
      });
      // Стол с ноутбуком Веры
      room.furniture(2.2, 0.8, 1.2, 0xa07850, -2.5, -5.0);
      room.part(0.9, 0.06, 0.6, 0x2a2a30, -2.5, 0.83, -5.0);
      room.part(0.9, 0.6, 0.06, 0x3a7bd5, -2.5, 1.13, -5.3);
      stations.push({
        floor: 0, x: -2.5, z: -3.8, label: 'E — ноутбук Веры',
        act: () => showToast('Ноутбук Веры. Пароля нет, на экране открыта переписка...', 4500),
        use: { floppy: () => showToast('Ноутбук Веры читает дискету: на ней одна папка, и та под паролем.', 4500) },
      });
      // Записи Веры на стене
      room.part(2.4, 1.4, 0.06, 0xd8c9a0, 2.0, 1.8, -treehouseD / 2 + 0.05);
      for (let i = 0; i < 5; i++) room.part(0.45, 0.35, 0.03, [0xf1ede2, 0xe0c341, 0xe58a2f][i % 3], 1.2 + i * 0.4, 1.6 + (i % 2) * 0.4, -treehouseD / 2 + 0.1);
      stations.push({
        floor: 0, x: 2.0, z: -4.9, label: 'E — записи Веры',
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
        showToast('Бесконечный рюкзак! Теперь с собой можно носить сколько угодно вещей.', 4500);
      };
      addPickable({ id: 'backpack', mesh: backpack, canPick: () => !hasItem('backpack'), pick: takeBackpack });
      stations.push({
        floor: 0, x: 5.3, z: -1.5,
        label: () => (hasItem('backpack') ? 'E — сундук' : 'E — взять: Бесконечный рюкзак'),
        act: () => {
          if (!hasItem('backpack')) takeBackpack();
          else showToast('Сундук. Позже здесь можно будет хранить вещи и приборы.', 3500);
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
const grandmaW = 11;
const grandmaD = 8;

defineBuilding('grandma_house', {
  name: 'Дом Анны Петровны',
  desc: 'Дом бабушки Веры. Здесь всегда пахнет пирогами.',
  size: { w: grandmaW + 2, d: grandmaD + 4 },
  enterLabel: 'E — войти в дом Анны Петровны',
  exitLabel: 'E — выйти во двор',

  exterior({ full }) {
    const group = createHouse({
      width: grandmaW, depth: grandmaD, wallHeight: 3.4, roofRise: 2.6, floors: 1,
      roof: 'gable', ridgeAlongX: true, wallColor: 0xa8814f, roofColor: 0x5a6a4a, doorColor: 0x3a2a1a,
    });
    // Крыльцо с навесом
    const porch = boxWithEdges(4, 0.4, 2.2, 0x8a6a3c);
    porch.position.set(0, 0.2, grandmaD / 2 + 1.1);
    group.add(porch);
    for (const x of [-1.8, 1.8]) {
      const post = boxWithEdges(0.2, 2.6, 0.2, 0x6b4a2e);
      post.position.set(x, 1.5, grandmaD / 2 + 2.0);
      group.add(post);
    }
    const awning = boxWithEdges(4.4, 0.15, 2.6, 0x5a6a4a);
    awning.position.set(0, 2.85, grandmaD / 2 + 1.2);
    group.add(awning);
    // Колодец и поленница во дворе
    const well = boxWithEdges(1.6, 0.9, 1.6, 0x8a8a88);
    well.position.set(-grandmaW / 2 - 2.5, 0.45, grandmaD / 2 + 3);
    group.add(well);
    const wellRoof = boxWithEdges(2, 0.12, 1.4, 0x6b4a2e);
    wellRoof.position.set(-grandmaW / 2 - 2.5, 2.1, grandmaD / 2 + 3);
    group.add(wellRoof);
    const logs = boxWithEdges(3.4, 1.2, 0.9, 0x9a6a3a); // поленница у задней стены
    logs.position.set(2.5, 0.6, -grandmaD / 2 - 0.9);
    group.add(logs);
    return {
      group,
      obstacles: [
        { x: 0, z: 0, hx: grandmaW / 2, hz: grandmaD / 2 },
        { x: -grandmaW / 2 - 2.5, z: grandmaD / 2 + 3, hx: 0.8, hz: 0.8 },
        { x: 2.5, z: -grandmaD / 2 - 0.9, hx: 1.7, hz: 0.45 },
      ],
      mapShapes: [{ x: 0, z: 0, hx: grandmaW / 2, hz: grandmaD / 2, color: '#a8814f' }],
      door: { x: 0, z: grandmaD / 2 + 2.8 },
      people: full
        ? [{
            x: 3.2, z: grandmaD / 2 + 3.2, yaw: Math.PI, type: 'anna', gender: 'female',
            name: 'Анна Петровна', title: 'бабушка Веры',
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
    const room = createRoomFloor({ w: grandmaW, d: grandmaD, wallH: 3, floorColor: 0x8a6a48, plank: true, wallColor: 0xd8c9a8, doorGap: 2.4 });
    const stations = [];
    room.wall(0.2, 4, 1.2, -2, 0xc9b898); // перегородка: кухня (восток) и комната Веры (запад)
    if (full) {
      // Кухня: печь, стол
      room.furniture(1.8, 1.6, 1.6, 0xe8e2d0, 4.2, -2.6);
      room.furniture(1.6, 0.8, 1.0, 0xa07850, 3.4, 1.2);
      // Комната Веры: фортепиано, кровать, ролики и лыжи у стены
      room.furniture(1.8, 1.3, 0.7, 0x2a1a10, -2.2, -3.5);
      room.part(1.7, 0.1, 0.3, 0xf1ede2, -2.2, 1.0, -3.1);
      room.furniture(1.2, 0.5, 2.2, 0x8a3b6a, -4.6, -2.6);
      room.part(0.1, 1.8, 0.3, 0x3a7bd5, -5.3, 0.9, 0.2);
      room.part(0.1, 1.8, 0.3, 0xc43a3a, -5.3, 0.9, 0.6);
      room.part(0.4, 0.3, 0.6, 0xe0c341, -4.8, 0.15, 1.6); // ролики
      stations.push({
        floor: 0, x: -2.2, z: -2.2, label: 'E — фортепиано Веры',
        act: () => showToast('Фортепиано Веры. На крышке фотография: вы с Верой у большого дерева за оврагом.', 4500),
      });
    }
    return {
      name: () => 'Дом Анны Петровны',
      floors: [room],
      bounds: roomBounds(grandmaW, grandmaD),
      playerRadius: 0.45,
      door: { x: 0, z: grandmaD / 2 - 0.45 },
      stations,
      sounds: {},
      footsteps: true,
      minimapRange: 22,
    };
  },
});
