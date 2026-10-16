// src/content/buildings/it-company.js
// IT-КОМПАНИЯ (docs/story/locations/city.md, characters/oleg.md): небольшая компания в городе,
// делает проекты на заказ. Здесь работает герой.
//   1 этаж: опенспейс с рабочими местами (одно — героя), кабинет Олега Борисовича, кухня.
//   2 этаж: серверная.
//   Во дворе: дизельный генератор (квест 4.02 — дизель с заправки).

const officeW = 18;
const officeD = 14;
const generatorAt = { x: 4, z: -(officeD / 2 + 2.2) }; // за зданием, во дворе

defineBuilding('it_company', {
  name: 'IT-компания',
  desc: 'Небольшая компания, делает проекты на заказ. Здесь вы работаете. Вход по пропуску, на втором этаже — серверная.',
  size: { w: officeW, d: officeD + 5 },
  enterLabel: 'E — войти в IT-компанию',
  exitLabel: 'E — выйти на улицу',
  lock: { item: 'itpass', text: 'Турникет не пускает: нужен пропуск в IT-компанию.' },

  exterior({ full }) {
    const group = createOffice({ width: officeW, depth: officeD });
    const gen = createGenerator();
    gen.position.set(generatorAt.x, 0, generatorAt.z);
    gen.rotation.y = Math.PI; // панелью от здания, к проходу
    gen.userData.hoverInfo = { kind: 'Устройство', name: 'Дизельный генератор', desc: 'Резервное питание для серверной. Работает на дизеле с заправки.' };
    group.add(gen);
    return {
      group,
      obstacles: [
        { x: 0, z: 0, hx: officeW / 2, hz: officeD / 2 },
        { x: generatorAt.x, z: generatorAt.z, hx: 2.1, hz: 1.3 },
      ],
      mapShapes: [
        { x: 0, z: 0, hx: officeW / 2, hz: officeD / 2, color: '#5a6470' },
        { x: generatorAt.x, z: generatorAt.z, hx: 2.1, hz: 1.3, color: '#e0c341' },
      ],
      fade: group.userData.fade,
      door: { x: 0, z: officeD / 2 + 2.4 },
      stations: [
        {
          x: generatorAt.x, z: generatorAt.z - 2.6, label: 'E — осмотреть генератор',
          act: () => showToast('Дизельный генератор. Когда серверам не хватит электричества, сюда понадобится дизель с заправки.', 5000),
        },
      ],
    };
  },

  interior({ full }) {
    const open = createRoomFloor({ w: officeW, d: officeD, wallH: 3.2, floorColor: 0x8a9098, wallColor: 0xe8ecef, doorGap: 3 });
    const servers = createRoomFloor({ w: officeW, d: officeD, wallH: 3.2, floorColor: 0x5a6068, wallColor: 0xc9ced4 });
    const stations = [];

    // Лестница на второй этаж (юго-западный угол) — на обоих этажах
    for (const room of [open, servers]) {
      for (let i = 0; i < 5; i++) room.part(2.2, 0.25 * (i + 1), 0.5, 0x9a9ea4, -7.6, 0.125 * (i + 1), 5.6 - i * 0.5);
    }
    // Кабинет начальника: стеклянная перегородка в северо-восточном углу (вход с запада)
    open.wall(0.15, 3.2, 3.0, -5.4, 0x9fc4d4);
    open.wall(3.4, 0.15, 7.3, -3.8, 0x9fc4d4);

    if (full) {
      // Опенспейс: два ряда столов с мониторами
      const desk = (x, z, own) => {
        open.furniture(2.2, 0.78, 1.1, own ? 0xc9a86a : 0xdad6c8, x, z);
        open.part(0.9, 0.6, 0.08, 0x15151a, x, 1.12, z - 0.35);
        open.part(0.8, 0.5, 0.06, own ? 0x3fa35b : 0x3a7bd5, x, 1.12, z - 0.3);
        open.part(0.55, 0.5, 0.55, 0x2a2a30, x, 0.25, z + 0.85); // стул
      };
      for (const x of [-5, -2.2, 0.6]) {
        desk(x, -4.6, false);
        desk(x, -0.6, x === 0.6); // рабочее место героя — справа во втором ряду
      }
      stations.push({
        floor: 0, x: 0.6, z: 0.9, label: 'E — рабочее место: поработать час',
        act: () => {
          advanceGameTime(60);
          showToast('Час работы над проектом для пекарни. Олег Борисович будет доволен.', 4000);
        },
      });
      // Кабинет Олега Борисовича
      open.furniture(2.4, 0.8, 1.2, 0x5a3a22, 6.6, -5.6);
      open.part(0.9, 0.6, 0.08, 0x15151a, 6.6, 1.1, -5.95);
      // Кухня: стойка с кофемашиной и кулер
      open.furniture(3.6, 0.95, 0.8, 0xc9c1b0, 6.8, 6.1);
      open.part(0.6, 0.7, 0.5, 0x2a2a30, 7.8, 1.3, 6.1);
      open.furniture(0.5, 1.3, 0.5, 0x7fb0c8, 4.4, 6.2);
      stations.push({
        floor: 0, x: 6.8, z: 4.9, label: 'E — выпить кофе',
        act: () => showToast('Кофе из офисной кофемашины. Горячо и бодрит.', 3000),
      });

      // Серверная: ряды стоек с огоньками
      const lamps = [0x3fa35b, 0xe0c341, 0x3a7bd5];
      for (const z of [-4.5, -1]) {
        for (let i = 0; i < 6; i++) {
          const x = -3 + i * 1.5;
          servers.furniture(1.2, 2.4, 1.0, 0x1c1f24, x, z);
          for (let k = 0; k < 4; k++) servers.part(0.12, 0.08, 0.04, lamps[(i + k) % 3], x - 0.35 + k * 0.22, 1.9 - k * 0.3, z + 0.52);
        }
      }
      stations.push({
        floor: 1, x: 1.5, z: 0.6, label: 'E — серверная стойка',
        act: () => showToast('Серверы гудят. Позже на них можно будет считать расчеты для приборов.', 4000),
      });
    }

    return {
      name: (floor) => 'IT-компания, ' + (floor + 1) + ' этаж',
      floors: [open, servers],
      bounds: roomBounds(officeW, officeD),
      playerRadius: 0.45,
      door: { x: 0, z: officeD / 2 - 0.45 },
      stairs: [
        { floor: 0, to: 1, x: -7.6, z: 4.4, label: 'E — подняться в серверную' },
        { floor: 1, to: 0, x: -7.6, z: 4.4, label: 'E — спуститься на 1 этаж' },
      ],
      stations,
      people: [
        {
          floor: 0, x: 6.6, z: -4.6, yaw: Math.PI, type: 'oleg', gender: 'male',
          name: 'Олег Борисович', title: 'начальник',
          talk: simpleTalk('Олег Борисович — начальник в IT-компании', {
            hello: 'Ты где пропадаешь? Проект для пекарни горит.',
            knows: 'Лаборатория хотела заказать у нас расчетный кластер под полную секретность. Я отказался.',
            help: 'Хочешь считать свои приборы на моих серверах? Окей. Но сначала сдай проект.',
          }),
        },
        {
          floor: 0, x: -2.2, z: 0.4, yaw: 0, type: 'geek', gender: 'female', opts: { hat: null },
          name: 'Катя', title: 'коллега',
          talk: simpleTalk('Катя — коллега', {
            hello: 'О, Макс! Кофе свежий, если что.',
            knows: 'Олег Борисович с утра нервный. Говорит, сервера опять греются.',
            help: 'Если что-то сломается в проекте — пиши, посмотрю.',
          }),
        },
      ],
      sounds: {},
      footsteps: true,
      minimapRange: 32,
    };
  },
});
