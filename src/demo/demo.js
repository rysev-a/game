// src/demo/demo.js
// ДЕМО-РЕЖИМ (самая простая версия, см. docs/mechanics/demo.md). Вместо большого мира — одна площадка:
// дом и гараж героя с машиной, дорога, ряд всех персонажей сюжета (с каждым можно поговорить, E)
// стол со всеми предметами (E или клик мышью — взять, запас бесконечный) и подставка с приборами
// (E — надеть или снять). Платформа та же, что в игре:
// demo/index.html подключает те же файлы, кроме src/locations/* и src/world/world.js, forest.js, fence.js.
// Подключается вместо них, перед src/engine/settings.js.

// ---------- Заглушки большого мира ----------
// Сцены у реки, торгового центра и заправки в ДЕМО нет; главный цикл и разговоры их всё равно спрашивают
const incident = { arrived: false, state: 'waiting' };
function updateIncident() {}
function updateMallPeople() {}
function updateGasStation() {}

// ---------- Площадка ----------
const demoHalf = 125; // площадка 250 × 250 с центром в (0, 0)
const demoRect = { x1: -demoHalf, x2: demoHalf, z1: -demoHalf, z2: demoHalf };
flatRect(demoHalf * 2, demoHalf * 2, 0x3f6b3a, 0.006, 0, 0);
mapObjects.push({ x: 0, z: 0, hx: demoHalf, hz: demoHalf, color: '#2f5233', ground: true });
registerZone('demo', 'ДЕМО-площадка', demoRect, { birds: 0.5 });
clearZones.push(demoRect);

// Дорога с запада на восток: по ней можно покататься
roadH(-demoHalf + 6, demoHalf - 6, 0, 'asphalt');
buildRoadMeshes();

// Подпись над объектом: текст на холсте, всегда повернут к камере
function demoLabel(text, x, y, z, { size = 1, color = '#ffffff', bg = 'rgba(0,0,0,0.55)' } = {}) {
  const lines = String(text).split('\n');
  const cv = document.createElement('canvas');
  const c = cv.getContext('2d');
  const font = 'bold 28px sans-serif';
  c.font = font;
  const w = Math.max(...lines.map((l) => c.measureText(l).width)) + 24;
  const h = lines.length * 34 + 12;
  cv.width = w;
  cv.height = h;
  c.font = font;
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
  c.fillStyle = color;
  c.textAlign = 'center';
  c.textBaseline = 'top';
  lines.forEach((l, i) => c.fillText(l, w / 2, 8 + i * 34));
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  const k = 0.022 * size;
  sprite.scale.set(w * k, h * k, 1);
  sprite.position.set(x, y, z);
  cityGroup.add(sprite);
  return sprite;
}

// ---------- Дом и гараж героя ----------
{
  const side = -1; // северная сторона дороги, фасад к дороге
  const houseX = -24;
  const houseZ = side * (18 + homeD / 2);
  const house = createHouse({
    width: homeW,
    depth: homeD,
    wallHeight: 7.2,
    roofRise: 3.4,
    roofOverhang: 1.0,
    floors: 2,
    windows: 4,
    roof: 'gable',
    ridgeAlongX: true,
    wallColor: 0xd9c9a8,
    roofColor: 0x8a3b2e,
  });
  house.position.set(houseX, 0, houseZ);
  cityGroup.add(house);
  addObstacle({ x: houseX, z: houseZ, hx: homeW / 2, hz: homeD / 2 });
  mapObjects.push({ x: houseX, z: houseZ, hx: homeW / 2, hz: homeD / 2, color: '#d9a066' });
  const exterior = buildHomeExterior({ houseX, houseZ, side });
  const driveLen = Math.abs(exterior.frontZ - side * 3.5);
  flatRect(6.6, driveLen, 0x555555, 0.018, exterior.garageCenterX, (exterior.frontZ + side * 3.5) / 2);
  demoLabel('Дом и гараж героя', houseX + 4, 12, houseZ, { size: 1.4 });
}

// ---------- Персонажи ----------
// Рабочие имена и реплики — из docs/story/characters. Позже их заменит реестр src/content/characters.
const DEMO_CHARACTERS = [
  {
    name: 'Денис', title: 'полицейский, друг детства', gender: 'male', type: 'police',
    hello: 'Макс! Ты чего тут? Ладно, раз пришел — спрашивай.',
    knows: 'Тело нашли у моста. Мне велели написать «самоубийство». Мне. Велели. Понимаешь?',
    help: 'Покажу материалы дела, пробью номера машин, а если что — прикрою.',
  },
  {
    name: 'Анна Петровна', title: 'бабушка Веры', gender: 'female', type: 'elder', opts: { dressColor: 0x6a4a8a },
    hello: 'Максимушка... Ты же совсем не изменился. Только похудел.',
    knows: 'Они всё перевернули. А на дерево и не глянули. Взрослые никогда не смотрят наверх.',
    help: 'Пирогами накормлю, ключ от калитки дам. Домик на дереве теперь твой.',
  },
  {
    name: 'Вера', title: 'девушка из лаборатории', gender: 'female', type: 'casual',
    opts: { hairColor: 0xc9a24a, dressColor: 0x3fa35b },
    hello: 'Ты меня наконец-то узнал. (В игре Вера появится только в финале.)',
    knows: 'В лаборатории есть потайная дверь. Шеф запретил туда спускаться.',
    help: 'Помнишь, где мы закопали банку с секретами? Ты тогда сказал, что секреты — это ненаучно.',
  },
  {
    name: 'Людмила Сергеевна', title: 'директор торгового центра', gender: 'female', type: 'office',
    opts: { dressColor: 0x8a2a2a },
    hello: 'Покупать что-нибудь будете, кроме лапши и батареек?',
    knows: 'Мед, соль, медная проволока и два килограмма сахара. Я думала, она варенье с электричеством варит.',
    help: 'Провизия, реактивы для эликсира, детали для приборов. Что нужно — закажу.',
  },
  {
    name: 'Семён Аркадьевич', title: 'директор библиотеки', gender: 'male', type: 'elder', opts: { glasses: true, beard: true },
    hello: 'Молодой человек, вы опять пришли за документацией?',
    knows: 'Вера часами сидела в информационном центре. А в архиве есть фото Штерна с одним «инвестором».',
    help: 'Книги, архив газет и безлимитная быстрая сеть в информационном центре.',
  },
  {
    name: 'Олег Борисович', title: 'начальник в IT-компании', gender: 'male', type: 'office',
    hello: 'Ты где пропадаешь? Проект для пекарни горит.',
    knows: 'Лаборатория хотела заказать у нас расчетный кластер под полную секретность. Я отказался.',
    help: 'Хочешь считать свои приборы на моих серверах? Окей. Но сначала сдай проект.',
  },
  {
    name: 'Михалыч', title: 'кузнец', gender: 'male', type: 'worker', opts: { beard: true, hairColor: 0x8a8a80 },
    hello: 'Чего встал? Садись, раздувай горн.',
    knows: 'Вера приносила мне чертеж странного браслета. Просила корпус. Не успел я.',
    help: 'Станок, горн и 3D-принтер. По чертежу соберу что угодно.',
  },
  {
    name: 'Рустам', title: 'автомагазин и автомастерская', gender: 'male', type: 'worker',
    opts: { shirtColor: 0x3a7bd5 },
    hello: 'Брат, твоя бирюзовая — это не машина, это аквариум.',
    knows: 'За неделю до смерти кто-то копался в тормозах машины Веры.',
    help: 'Починю, проапгрейжу, продам новую. Давай сделаем из нее танк.',
  },
  {
    name: 'Николай Палыч', title: 'начальник заправки', gender: 'male', type: 'worker',
    opts: { shirtColor: 0xc43a3a, beard: true },
    hello: 'Заправляйся, Макс, денег не надо.',
    knows: 'В ту ночь к реке проехал фургон без номеров. Через час обратно.',
    help: 'Бензин бесплатно, а когда серверам не хватит электричества — дизель для генератора.',
  },
  {
    name: 'Павел Андреевич Громов', title: 'глава корпорации', gender: 'male', type: 'coat',
    opts: { coatColor: 0x2a2a3a, hatColor: 0x1a1a1a },
    hello: 'Слушаю вас. Анна Петровна сказала, это важно.',
    knows: 'Подвал? В моей лаборатории изучают экологию. Покажите доказательства.',
    help: 'Если вы правы, на одну ночь сниму охрану с ворот.',
  },
  {
    name: 'Виктор Штерн', title: 'начальник лаборатории', gender: 'male', type: 'coat',
    opts: { coatColor: 0xe8e2d0, glasses: true, hatColor: 0xd8d2c0 },
    hello: 'Наука не бывает доброй или злой, молодой человек.',
    knows: 'Ваши вычисления великолепны. Жаль, что вы так поздно их прислали.',
    help: 'Помогать вам? Это было бы ненаучно.',
  },
  {
    name: 'Барон', title: 'глава покупателей оружия', gender: 'male', type: 'office',
    opts: { shirtColor: 0xf0ece0, pantsColor: 0xd8d2c0 },
    hello: 'Я всего лишь инвестор. Хочу вложиться в экологию вашего городка.',
    knows: 'Десять моих помощников прошли через лабораторию. Каждый теперь кое-что умеет.',
    help: 'Отойдите с дороги, и никто не пострадает.',
  },
];

const demoPeople = [];
{
  const rowZ = 18;
  const step = 8;
  const x0 = -((DEMO_CHARACTERS.length - 1) * step) / 2;
  demoLabel('ПЕРСОНАЖИ — подойдите и нажмите E', 0, 5.2, rowZ + 4, { size: 1.6, color: '#ffe08a' });
  DEMO_CHARACTERS.forEach((c, i) => {
    const preset = PERSON_PRESETS[c.type] || {};
    const opts = Object.assign({ gender: c.gender, hairColor: 0x3a2a1a, skinColor: 0xf0c8a0 }, c.opts || {});
    for (const key in preset) if (!(c.opts && key in c.opts)) delete opts[key];
    const mesh = createPerson(c.type, opts);
    const x = x0 + i * step;
    const p = {
      mesh, gender: c.gender, kind: 'demo', name: c.name, demo: c,
      x, z: rowZ, hold: true, phase: 0, amp: 0, yaw: 0,
    };
    mesh.position.set(x, 0, rowZ);
    mesh.updateWalk(0, 0);
    cityGroup.add(mesh);
    npcs.push(p);
    demoPeople.push(p);
    demoLabel(c.name + '\n' + c.title, x, 3.1, rowZ, { size: 0.8 });
  });
}

function demoDialogue(p) {
  const c = p.demo;
  const speaker = c.name + ' — ' + c.title;
  const back = { text: 'Еще вопрос.', next: () => root };
  const bye = { text: 'До свидания.', end: true };
  const root = {
    speaker,
    text: c.hello,
    options: [
      { text: 'Что вы знаете?', next: () => ({ speaker, text: c.knows, options: [back, bye] }) },
      { text: 'Чем вы можете помочь?', next: () => ({ speaker, text: c.help, options: [back, bye] }) },
      bye,
    ],
  };
  return root;
}

// Разговор с персонажем сюжета важнее обычного «Как дела?» (у того priority 1)
const demoPersonNear = () => {
  const p = !dialogueOpen && !drivingCar && !pushingCar ? nearestPerson() : null;
  return p && p.demo ? p : null;
};
addInteractable({
  priority: 2,
  near: () => !!demoPersonNear(),
  prompt: () => 'E — поговорить: ' + demoPersonNear().demo.name,
  act: () => {
    const p = demoPersonNear();
    startDialogue(p, demoDialogue(p));
  },
});

// ---------- Предметы ----------
// Длинный стол, на нем все предметы из ITEMS. Взятая вещь со стола исчезает; если ее выбросить
// из инвентаря (ее там больше нет), она снова появляется на столе
{
  const tableZ = 34;
  const ids = Object.keys(ITEMS);
  const step = 3;
  const x0 = -((ids.length - 1) * step) / 2;
  const tableW = ids.length * step + 2;
  const table = boxWithEdges(tableW, 0.9, 1.6, 0x8a6a3c);
  table.position.set(0, 0.45, tableZ);
  cityGroup.add(table);
  addObstacle({ x: 0, z: tableZ, hx: tableW / 2, hz: 0.8 });
  mapObjects.push({ x: 0, z: tableZ, hx: tableW / 2, hz: 0.8, color: '#8a6a3c' });
  demoLabel('ПРЕДМЕТЫ — E, чтобы взять', 0, 3.4, tableZ, { size: 1.6, color: '#ffe08a' });

  const onTable = []; // { id, model, label }
  ids.forEach((id, i) => {
    const x = x0 + i * step;
    // Объемная пиксельная модель вещи (src/models/items.js), медленно вращается
    const model = createItemModel(id, 0.9);
    model.position.set(x, 0.95, tableZ);
    model.children[0].onBeforeRender = () => {
      model.rotation.y = performance.now() / 1000 + i;
    };
    cityGroup.add(model);
    const label = demoLabel(ITEMS[id].name, x, 2.1, tableZ, { size: 0.85 });
    onTable.push({ id, model, label });
    const take = () => {
      if (!hasItem(id) && !addItem(id)) showToast('Инвентарь полон');
    };
    addInteractable({
      priority: 2,
      near: () => !drivingCar && !insideBuilding() && !hasItem(id) && Math.hypot(playerWorldX - x, playerWorldZ - tableZ) < 2.2,
      prompt: () => 'E — взять: ' + ITEMS[id].name,
      act: take,
    });
    // Мышью: навести на вещь (подсветится) и кликнуть
    addPickable({ mesh: model, canPick: () => !drivingCar && !insideBuilding() && !hasItem(id), pick: take });
  });
  // Каждый кадр, пока стол на экране: на нем видны только вещи, которых нет в инвентаре
  table.onBeforeRender = () => {
    for (const t of onTable) t.model.visible = t.label.visible = !hasItem(t.id);
  };
}

// ---------- Приборы ----------
// Подставка за столом предметов: все приборы из DEVICES (src/player/devices.js). E — надеть,
// еще раз E — снять, чтобы заново проверить, как прибор меняет игру (браслет — панель сохранений)
{
  const standZ = 42;
  const ids = Object.keys(DEVICES);
  const step = 4;
  const x0 = -((ids.length - 1) * step) / 2;
  const standW = ids.length * step + 2;
  const stand = boxWithEdges(standW, 0.9, 1.6, 0x4a5a6a);
  stand.position.set(0, 0.45, standZ);
  cityGroup.add(stand);
  addObstacle({ x: 0, z: standZ, hx: standW / 2, hz: 0.8 });
  mapObjects.push({ x: 0, z: standZ, hx: standW / 2, hz: 0.8, color: '#4a5a6a' });
  demoLabel('ПРИБОРЫ — E, чтобы надеть или снять', 0, 3.4, standZ, { size: 1.2, color: '#8fe8ff' });

  ids.forEach((id, i) => {
    const d = DEVICES[id];
    const x = x0 + i * step;
    const mesh = new THREE.Group();
    mesh.add(createItemModel(id, 0.9)); // объемный значок прибора (src/models/items.js)
    mesh.position.set(x, 1.1, standZ);
    cityGroup.add(mesh);
    demoLabel(d.name, x, 2.1, standZ, { size: 0.85 });
    const toggle = () => {
      if (isWorn(id)) {
        takeOffDevice(id);
        showToast('Снято: ' + d.name);
      } else wearDevice(id);
    };
    addInteractable({
      priority: 2,
      near: () => !drivingCar && !insideBuilding() && Math.hypot(playerWorldX - x, playerWorldZ - standZ) < 2.4,
      prompt: () => (isWorn(id) ? 'E — снять: ' : 'E — надеть: ') + d.name,
      act: toggle,
    });
    addPickable({ mesh, canPick: () => !drivingCar && !insideBuilding(), pick: toggle });
  });
}

// ---------- Здания ----------
// Все заготовки из реестра (src/content/buildings) стоят в ряд дважды: пустые (только стены, двери,
// этажи) и полные (мебель, станции, жильцы). Фасады — на север, к площадке
{
  const rows = [
    { z: 70, full: false, title: 'ЗДАНИЯ: пустые — стены, двери, этажи' },
    { z: 104, full: true, title: 'ЗДАНИЯ: полные — станции, вещи, жильцы' },
  ];
  const ids = Object.keys(BUILDINGS);
  const gap = 10;
  const total = ids.reduce((sum, id) => sum + BUILDINGS[id].size.w, 0) + gap * (ids.length - 1);
  for (const row of rows) {
    let x = -total / 2;
    demoLabel(row.title, 0, 8, row.z - 16, { size: 1.3, color: '#ffe08a' });
    for (const id of ids) {
      const def = BUILDINGS[id];
      const cx = x + def.size.w / 2;
      flatRect(def.size.w + 4, def.size.d + 4, 0x3c3c3c, 0.012, cx, row.z);
      placeBuilding(id, { x: cx, z: row.z, heading: Math.PI, full: row.full });
      demoLabel(def.name + '\n' + id, cx, 3.2, row.z - def.size.d / 2 - 4.5, { size: 0.8 });
      x += def.size.w + gap;
    }
  }
}

demoLabel('ДЕМО-РЕЖИМ', 0, 9, -6, { size: 2.4, color: '#ffe08a' });

// Старт на улице, за подставкой с приборами: впереди приборы, стол с предметами, персонажи, дорога и дом
const demoStart = { x: 0, z: 48 };
showToast('ДЕМО: впереди приборы, стол со всеми предметами и персонажи; дом с машиной — за дорогой, все здания — за спиной', 8000);
