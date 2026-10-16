// src/locations/city/city.js
// Шесть городов: в каждом 5 больших и 10 маленьких домов, 5 участков — скверы. У каждого свои цвета.
// Города 1 и 2 стоят на трассе (z = 0), города 3–6 — на севере и юге мира, к каждому от трассы ведет
// своя дорога (в городах 3–6 «главная улица» — центральная дорога города на высоте cz).
// Сетка асфальтовых дорог; между домами и дорогой — тротуары, по которым ходят прохожие.

const cityStep = 36;
const cityEdge = cityStep * 2.5; // половина ширины города по дорогам
const cityHalfZ = cityStep * 2 + 4; // половина высоты города по дорогам
// Города: центр (x, z) и расцветка. cityXs — центры городов на трассе (z = 0)
const cities = [
  // reserved — участки (колонка i от −2 до 2, ряд z) под здания-заготовки из src/locations/city/city-buildings.js
  { x: 220, z: 0, theme: { big: '#7d7d82', small: '#a39e92', top: 0x5c5c60 }, reserved: [[0, -18], [1, 18]] }, // серый город
  { x: 520, z: 0, theme: { big: '#a65a3c', small: '#d1a94a', top: 0x6b4a3a } }, // кирпичный город
  { x: -900, z: -600, theme: { big: '#4f7a8a', small: '#a8c4cc', top: 0x3a5663 } }, // голубой город
  { x: -450, z: -600, theme: { big: '#6a8a4a', small: '#c9d49a', top: 0x4a6035 } }, // зеленый город
  { x: -900, z: 600, theme: { big: '#8a4a7a', small: '#d8b4cc', top: 0x5f3555 } }, // сиреневый город
  { x: -450, z: 600, theme: { big: '#b88a3a', small: '#ead9a8', top: 0x7a5c25 } }, // песчаный город
];
const cityXs = cities.filter((c) => c.z === 0).map((c) => c.x);
const cityCrossXs = []; // x всех поперечных дорог городов на трассе (пропуск разметки на трассе)
const sidewalks = []; // отрезки тротуаров для прохожих: { x1, z1, x2, z2 }
// Одна текстура окон на (город, тип дома); у каждого дома свой повтор
function makeFacadeTexture(wallColor) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = wallColor;
  c.fillRect(0, 0, 64, 64);
  for (let wx = 0; wx < 2; wx++) {
    for (let wy = 0; wy < 2; wy++) {
      c.fillStyle = Math.random() < 0.35 ? '#e8d98a' : '#2b3a4a';
      c.fillRect(8 + wx * 32, 8 + wy * 32, 16, 20);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}
function makeBuilding(w, h, d, facade, topColor) {
  const tex = facade.clone();
  tex.needsUpdate = true;
  tex.repeat.set(w / 10, h / 10); // 2×2 окна на ~10 юнитов
  const side = new LitMaterial({ map: tex, transparent: true });
  const top = new LitMaterial({ color: topColor, transparent: true });
  const edge = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true });
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, [side, side, top, top, side, side]);
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge));
  fadeBoxes.push({ mesh, mats: [side, top, edge], half: [w / 2, h / 2, d / 2], fade: 1 });
  return mesh;
}
// Сквер: фонарь в центре, две скамейки лицом к нему, деревья по углам и кусты вдоль краев
// (модели — src/models/props.js)
function buildSquare(px, pz) {
  const lamp = createStreetLamp();
  lamp.position.set(px, 0, pz);
  cityGroup.add(lamp);
  addObstacle({ x: px, z: pz, hx: 0.25, hz: 0.25 });
  for (const side of [-1, 1]) {
    const bench = createBench();
    bench.position.set(px, 0, pz + side * 4);
    bench.rotation.y = side > 0 ? 0 : Math.PI; // сидящий смотрит на фонарь
    cityGroup.add(bench);
    addObstacle({ x: px, z: pz + side * 4, hx: 0.95, hz: 0.35 });
  }
  for (const dx of [-7, 7]) {
    for (const dz of [-7, 7]) {
      const tree = createLeafyTree(pick(leafyGreens));
      tree.position.set(px + dx, 0, pz + dz);
      tree.rotation.y = rand(0, Math.PI * 2);
      tree.scale.setScalar(rand(0.9, 1.2));
      cityGroup.add(tree);
      addObstacle({ x: px + dx, z: pz + dz, hx: 0.35, hz: 0.35 });
    }
  }
  for (const [dx, dz] of [[0, -9.5], [0, 9.5], [-9.5, 0], [9.5, 0]]) {
    const bush = createBush();
    bush.position.set(px + dx, 0, pz + dz);
    cityGroup.add(bush);
  }
}

function buildCity(city) {
  const { x: cx, z: cz, theme } = city;
  const ownSidewalks = (city.sidewalks = []);
  const bigFacade = makeFacadeTexture(theme.big);
  const smallFacade = makeFacadeTexture(theme.small);

  flatRect(cityEdge * 2 + 20, cityHalfZ * 2 + 10, 0x2b2b2e, 0.006, cx, cz);
  mapObjects.push({ x: cx, z: cz, hx: cityEdge + 10, hz: cityHalfZ + 5, color: '#2b2b2e', ground: true });

  // 5 колонок × 4 ряда = 20 участков по обе стороны от главной дороги города (z = cz)
  const slots = [];
  for (let i = -2; i <= 2; i++) {
    for (const row of [-54, -18, 18, 54]) {
      if ((city.reserved || []).some(([ri, rz]) => ri === i && rz === row)) continue;
      slots.push([cx + i * cityStep, cz + row]);
    }
  }
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  slots.forEach(([px, pz], idx) => {
    if (idx >= 15) {
      // сквер
      flatRect(22, 22, 0x2f5233, 0.015, px, pz);
      mapObjects.push({ x: px, z: pz, hx: 11, hz: 11, color: '#2f5233', ground: true });
      buildSquare(px, pz);
      return;
    }
    const big = idx < 5;
    const w = big ? rand(14, 18) : rand(9, 12);
    const d = big ? rand(14, 18) : rand(9, 12);
    const h = big ? rand(30, 60) : rand(7, 12);

    flatRect(22, 22, 0x3c3c3c, 0.015, px, pz);
    const building = makeBuilding(w, h, d, big ? bigFacade : smallFacade, theme.top);
    building.position.set(px, h / 2, pz);
    cityGroup.add(building);

    if (big) {
      const crown = boxWithEdges(w * 0.4, 3, d * 0.4, theme.top);
      crown.position.set(px, h + 1.5, pz);
      cityGroup.add(crown);
    }
    mapObjects.push({ x: px, z: pz, hx: w / 2, hz: d / 2, color: big ? '#9a9a9a' : '#b0a890' });
    addObstacle({ x: px, z: pz, hx: w / 2, hz: d / 2 });

    // Парковка у дома: машина стоит на площадке рядом со зданием, а не на дороге.
    // Свободное место на площадке (22×22) — по краям здания; ставим туда, где машина помещается
    if (Math.random() < 0.7) {
      const free = 11 - w / 2; // свободно по бокам (вдоль X)
      const freeZ = 11 - d / 2; // свободно спереди и сзади (вдоль Z)
      const side = Math.random() < 0.5 ? -1 : 1;
      if (free >= 3.4) {
        // сбоку от здания, носом вдоль Z
        addCar(px + side * (w / 2 + free / 2), pz + rand(-5, 5), Math.random() < 0.5 ? 0 : Math.PI);
      } else if (freeZ >= 3.4) {
        // перед или за зданием, носом вдоль X
        addCar(px + rand(-4, 4), pz + side * (d / 2 + freeZ / 2), Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
      }
    }
  });

  // Дороги: 6 поперечных + продольные по краям (cz ± 36, cz ± 72); z = cz — главная дорога
  // (у городов на трассе это сама трасса, ее кладет src/world/world.js)
  const crossXs = [];
  for (let i = -3; i <= 2; i++) crossXs.push(cx + (i + 0.5) * cityStep);
  const ringZs = [cz - cityHalfZ + 4, cz - cityStep, cz + cityStep, cz + cityHalfZ - 4];
  for (const x of crossXs) {
    roadV(cz - cityHalfZ, cz + cityHalfZ, x, 'asphalt', [...ringZs, cz]);
  }
  for (const z of ringZs) roadH(cx - cityEdge, cx + cityEdge, z, 'asphalt', crossXs);
  if (cz !== 0) {
    roadH(cx - cityEdge, cx + cityEdge, cz, 'asphalt', crossXs);
    // Дорога от города к трассе: продолжение поперечной улицы cx + 18 до z = 0
    const linkX = cx + cityStep / 2;
    const [z1, z2] = cz < 0 ? [cz + cityHalfZ, -roadWidth / 2] : [roadWidth / 2, cz - cityHalfZ];
    roadV(z1, z2, linkX, 'asphalt', [0]);
    clearZones.push({ x1: linkX - 8, x2: linkX + 8, z1, z2 }); // вдоль дороги лес не растет
    cityCrossXs.push(linkX); // на трассе перекресток без разметки
  } else {
    cityCrossXs.push(...crossXs);
  }

  // Тротуары: вдоль главной дороги и вдоль поперечных дорог между ней и первым кольцом
  ownSidewalks.push({ x1: cx - cityEdge + 10, z1: cz - 5.75, x2: cx + cityEdge - 10, z2: cz - 5.75 });
  ownSidewalks.push({ x1: cx - cityEdge + 10, z1: cz + 5.75, x2: cx + cityEdge - 10, z2: cz + 5.75 });
  for (const x of crossXs) {
    for (const side of [-1, 1]) {
      ownSidewalks.push({ x1: x + side * 5.25, z1: cz + 9, x2: x + side * 5.25, z2: cz + 30 });
      ownSidewalks.push({ x1: x + side * 5.25, z1: cz - 30, x2: x + side * 5.25, z2: cz - 9 });
    }
  }
  sidewalks.push(...ownSidewalks);

  // Фонари вдоль главной дороги, между проезжей частью и тротуаром, плафоном к дороге
  for (let i = -2; i <= 2; i++) {
    for (const side of [-1, 1]) {
      const lamp = createStreetLamp();
      lamp.position.set(cx + i * cityStep, 0, cz + side * 4.4);
      lamp.rotation.y = side < 0 ? Math.PI : 0;
      cityGroup.add(lamp);
      addObstacle({ x: cx + i * cityStep, z: cz + side * 4.4, hx: 0.2, hz: 0.2 });
    }
  }
}
cities.forEach(buildCity);

// Конец трассы за вторым городом
const highwayEnd = cityXs[cityXs.length - 1] + cityEdge + 20;

// По 4 мужчины и 4 женщины на город
for (const city of cities) {
  for (let i = 0; i < 8; i++) addNpc(pick(city.sidewalks), i % 2 === 0 ? 'male' : 'female');
}

// Зоны городов: звук города и никакого леса
cities.forEach((city, i) => {
  const rect = {
    x1: city.x - cityEdge - 14,
    x2: city.x + cityEdge + 14,
    z1: city.z - cityHalfZ - 10,
    z2: city.z + cityHalfZ + 10,
  };
  registerZone('city' + (i + 1), 'Город ' + (i + 1), rect, i % 2 === 0 ? { city: 0.8 } : { city_2: 0.8 });
  clearZones.push(rect);
});
