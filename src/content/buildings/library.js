// src/content/buildings/library.js
// БИБЛИОТЕКА И ИНФОРМАЦИОННЫЙ ЦЕНТР (docs/story/locations/library.md). В городе, на центральной улице.
//   1 этаж: абонемент (Семён Аркадьевич), стеллажи, читальный зал со столом Веры у окна,
//           информационный центр с компьютерами.
//   Подвал: архив газет и планов зданий.

const libraryW = 22;
const libraryD = 16;

defineBuilding('library', {
  name: 'Библиотека',
  size: { w: libraryW, d: libraryD + 4 },
  enterLabel: 'E — войти в библиотеку',
  exitLabel: 'E — выйти из библиотеки',

  exterior() {
    const group = createLibrary({ width: libraryW, depth: libraryD });
    const porch = group.userData.porch;
    return {
      group,
      obstacles: [
        { x: 0, z: 0, hx: libraryW / 2, hz: libraryD / 2 },
        ...porch.columns.map((x) => ({ x, z: porch.z, hx: 0.45, hz: 0.45 })),
      ],
      mapShapes: [{ x: 0, z: 0, hx: libraryW / 2, hz: libraryD / 2, color: '#d8cfb8' }],
      fade: group.userData.fade,
      door: { x: 0, z: libraryD / 2 + 1.4 },
    };
  },

  interior({ full }) {
    const hall = createRoomFloor({ w: libraryW, d: libraryD, wallH: 4.2, floorColor: 0x8a5a3a, plank: true, wallColor: 0xe8dcc0, doorGap: 3 });
    const archive = createRoomFloor({ w: 16, d: 12, wallH: 3, floorColor: 0x6a6a66, wallColor: 0xb9b2a0 });
    const stations = [];

    // Лестница в подвал (юго-восточный угол) и обратно
    hall.part(2.6, 0.2, 3.4, 0x3a3028, 9, 0.02, 5.6);
    archive.part(2.6, 0.2, 3.4, 0x3a3028, 6, 0.02, 3.6);
    for (let i = 0; i < 5; i++) archive.part(2.4, 0.25 * (i + 1), 0.5, 0x9a9288, 6, 0.125 * (i + 1), 1.8 - i * 0.5);

    if (full) {
      // Абонемент: стойка у входа, за ней Семён Аркадьевич
      hall.furniture(4.4, 1.1, 1.0, 0x6b4a2e, -6, 3.2);
      hall.part(4.4, 0.08, 1.1, 0x3a5a3a, -6, 1.14, 3.2);
      hall.part(0.5, 0.35, 0.7, 0xf1ede2, -7.2, 1.3, 3.2); // карточки
      // Стеллажи: три ряда на восточной половине
      const shelfColors = [0xc43a3a, 0x3a7bd5, 0xe0c341, 0x3fa35b, 0x8a5fc4];
      for (const z of [-5.5, -2.5, 0.5]) {
        hall.furniture(7, 2.6, 0.8, 0x5a3a22, 5, z);
        for (let i = 0; i < 12; i++) {
          hall.part(0.4, 0.55, 0.85, shelfColors[(i + Math.round(z)) % 5], 1.9 + i * 0.55, 0.6 + (i % 3) * 0.8, z);
        }
      }
      stations.push({ floor: 0, x: 5, z: 1.6, label: 'E — посмотреть книги', act: () => showToast('Физика, электрохимия, биология... Книги здесь открывают чертежи и рецепты.', 4000) });
      // Читальный зал: столы и стол Веры у западного окна
      for (const z of [-5.5, -2]) {
        hall.furniture(3.2, 0.8, 1.4, 0xa07850, -4.5, z);
        for (const dx of [-1, 1]) hall.part(0.5, 0.5, 0.5, 0x6b4a2e, -4.5 + dx, 0.25, z + 1.1);
      }
      hall.furniture(1.6, 0.8, 2.2, 0xa07850, -9.6, -3.5);
      hall.part(0.5, 0.06, 0.7, 0xf1ede2, -9.6, 0.84, -3.8); // раскрытая книга
      hall.part(0.1, 1.6, 2.6, 0x7fb0c8, -10.95, 1.9, -3.5); // окно
      stations.push({ floor: 0, x: -8.1, z: -3.5, label: 'E — стол Веры у окна', act: () => showToast('Любимое место Веры. Здесь она часами читала. На столе забытая закладка.', 4500) });
      // Информационный центр: три компьютера у северной стены
      for (const x of [-1.6, 0.6, 2.8]) {
        hall.furniture(1.8, 0.8, 0.9, 0xdad6c8, x - 0.4, -7.2);
        hall.part(0.9, 0.6, 0.08, 0x15151a, x - 0.4, 1.15, -7.4);
        hall.part(0.8, 0.5, 0.06, 0x3a7bd5, x - 0.4, 1.15, -7.35);
      }
      stations.push({
        floor: 0, x: 0.2, z: -6, label: 'E — информационный центр',
        act: () => showToast('Информационный центр: безлимитный быстрый интернет. Позже здесь можно восстановить файлы и найти людей.', 5000),
      });

      // Архив: стеллажи с подшивками газет и стол с планами
      for (const x of [-5, -2, 1]) {
        archive.furniture(1.0, 2.4, 6, 0x6b5a48, x, -2);
        for (let i = 0; i < 8; i++) archive.part(1.05, 0.15, 0.6, 0xe8e0c8, x, 0.4 + (i % 4) * 0.55, -4.5 + Math.floor(i / 4) * 3 + (i % 2) * 0.8);
      }
      archive.furniture(2.6, 0.85, 1.6, 0x8a6a3c, 4.5, -3.5);
      archive.part(1.2, 0.04, 0.9, 0xe8e0c8, 4.3, 0.88, -3.5);
      stations.push({ floor: 1, x: 4.5, z: -1.9, label: 'E — архив газет', act: () => showToast('Подшивки старых газет и планы зданий. Нужен допуск Семёна Аркадьевича.', 4500) });
    }

    return {
      name: (floor) => (floor === 0 ? 'Библиотека' : 'Библиотека, архив (подвал)'),
      floors: [hall, archive],
      bounds: roomBounds(libraryW, libraryD),
      playerRadius: 0.45,
      door: { x: 0, z: libraryD / 2 - 0.45 },
      stairs: [
        { floor: 0, to: 1, x: 9, z: 5.6, label: 'E — спуститься в архив', arrive: { x: 6, z: 4.6 } },
        { floor: 1, to: 0, x: 6, z: 3.6, label: 'E — подняться в библиотеку', arrive: { x: 9, z: 3.4 } },
      ],
      stations,
      people: [
        {
          floor: 0, x: -6, z: 2.1, yaw: Math.PI, type: 'semyon', gender: 'male',
          name: 'Семён Аркадьевич', title: 'директор библиотеки',
          talk: simpleTalk('Семён Аркадьевич — директор библиотеки', {
            hello: 'Молодой человек, вы опять пришли за документацией?',
            knows: 'Вера часами сидела в информационном центре. А в архиве есть фото Штерна с одним «инвестором».',
            help: 'Книги, архив газет и безлимитная быстрая сеть в информационном центре.',
          }),
        },
      ],
      sounds: {},
      footsteps: true,
      minimapRange: 34,
    };
  },
});
