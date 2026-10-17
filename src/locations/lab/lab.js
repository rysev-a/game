// src/locations/lab/lab.js
// ЛАБОРАТОРИЯ: закрытая территория к югу от трассы (docs/story/locations/laboratory.md). Пока без интерьеров: бои не идут
// в зданиях (src/engine/enemy-attacks.js), поэтому территория и «подвал» — открытые площадки с высокими стенами.
//
//   главная территория: забор, ворота на севере, главный корпус, рабочий стол Веры, потайной люк;
//   подвал (за люком, дальше на юг): зал капсул — арсенал и ряды капсул, за внутренней стеной — сборочный зал и кабинет Штерна.
//   Люк переносит героя вниз: квест 4.09 (src/content/quests/4-09-lab.js). Предметы и места — src/content/world.js, src/quests/places.js.
//
//   labX, labZ — центр территории; labBasementZ1/Z2 — край подвала; labWallZ — внутренняя стена между залами.
//
// Подключается после src/locations/bridge/incident.js, до src/world/world.js.

const labX = -330;
const labZ = 130;
const labHalfW = 30; // половина ширины главной территории
const labBasementZ1 = labZ + 80;
const labBasementZ2 = labZ + 200;
const labWallZ = labZ + 142; // внутренняя стена подвала: зал капсул — сборочный зал
{
  const rect = { x1: labX - 56, x2: labX + 56, z1: labZ - 46, z2: labBasementZ2 + 10 };
  registerZone('lab', 'Лаборатория: закрытая территория', rect, {});
  clearZones.push(rect);

  // Земля: бетон территории и темный пол подвала
  flatRect(labHalfW * 2, 66, 0x6a6e72, 0.012, labX, labZ - 2);
  mapObjects.push({ x: labX, z: labZ - 2, hx: labHalfW, hz: 33, color: '#6a6e72', ground: true });
  flatRect(84, labBasementZ2 - labBasementZ1, 0x2e3036, 0.012, labX, (labBasementZ1 + labBasementZ2) / 2);
  mapObjects.push({ x: labX, z: (labBasementZ1 + labBasementZ2) / 2, hx: 42, hz: (labBasementZ2 - labBasementZ1) / 2, color: '#2e3036', ground: true });

  // Стена из куска бокса: твердая, видна на карте
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
    return box;
  };

  // Главная территория: забор (в нем ворота на севере), главный корпус
  const fenceZ1 = labZ - 34;
  const fenceZ2 = labZ + 30;
  const gate = 5;
  wall(labX - labHalfW, fenceZ1, labX - gate, fenceZ1, 3.2, 0x8a8f96);
  wall(labX + gate, fenceZ1, labX + labHalfW, fenceZ1, 3.2, 0x8a8f96);
  wall(labX - labHalfW, fenceZ2, labX + labHalfW, fenceZ2, 3.2, 0x8a8f96);
  wall(labX - labHalfW, fenceZ1, labX - labHalfW, fenceZ2, 3.2, 0x8a8f96);
  wall(labX + labHalfW, fenceZ1, labX + labHalfW, fenceZ2, 3.2, 0x8a8f96);
  // Створки ворот и КПП (декор)
  for (const sx of [-1, 1]) {
    const post = boxWithEdges(0.8, 4.6, 0.8, 0x3a3e44);
    post.position.set(labX + sx * (gate + 0.4), 2.3, fenceZ1);
    cityGroup.add(post);
  }
  const kpp = boxWithEdges(3.2, 2.8, 3.2, 0xd8dcd6);
  kpp.position.set(labX + 9, 1.4, fenceZ1 + 3);
  cityGroup.add(kpp);
  addObstacle({ x: labX + 9, z: fenceZ1 + 3, hx: 1.6, hz: 1.6 });
  addHoverInfo(kpp, { kind: 'Здание', name: 'КПП лаборатории', desc: 'Охраны сегодня нет. Ворота открыты.' });

  const main = boxWithEdges(30, 7, 12, 0xd8dcd6);
  main.position.set(labX, 3.5, labZ + 12);
  cityGroup.add(main);
  const roof = boxWithEdges(31, 0.6, 13, 0x5c6066);
  roof.position.set(labX, 7.3, labZ + 12);
  cityGroup.add(roof);
  for (let i = -3; i <= 3; i++) {
    const win = boxWithEdges(2, 1.6, 0.2, 0x3a7bd5);
    win.position.set(labX + i * 4, 3.6, labZ + 12 - 6.1);
    cityGroup.add(win);
  }
  addObstacle({ x: labX, z: labZ + 12, hx: 15, hz: 6 });
  mapObjects.push({ x: labX, z: labZ + 12, hx: 15, hz: 6, color: '#d8dcd6' });
  addHoverInfo(main, { kind: 'Здание', name: 'Главный корпус лаборатории', desc: 'Официально здесь изучают экологию и местную необычную фауну. Дверь заперта.' });

  // Подвал (открытая площадка): внешние стены и внутренняя стена с проходом посередине
  const bx1 = labX - 42;
  const bx2 = labX + 42;
  const wallColor = 0x55585e;
  wall(bx1, labBasementZ1, bx2, labBasementZ1, 4.5, wallColor, 1.2);
  wall(bx1, labBasementZ2, bx2, labBasementZ2, 4.5, wallColor, 1.2);
  wall(bx1, labBasementZ1, bx1, labBasementZ2, 4.5, wallColor, 1.2);
  wall(bx2, labBasementZ1, bx2, labBasementZ2, 4.5, wallColor, 1.2);
  wall(bx1, labWallZ, labX - 7, labWallZ, 4.5, wallColor, 1.2); // внутренняя стена с проходом шириной 14
  wall(labX + 7, labWallZ, bx2, labWallZ, 4.5, wallColor, 1.2);
  // Лампы вдоль стен подвала (декор): красные, как тревога
  for (let x = bx1 + 8; x < bx2; x += 16) {
    for (const z of [labBasementZ1 + 1.4, labBasementZ2 - 1.4, labWallZ - 1.4]) {
      const lamp = boxWithEdges(1.2, 0.4, 0.4, 0xd23c3c);
      lamp.position.set(x, 3.6, z);
      cityGroup.add(lamp);
    }
  }
}
