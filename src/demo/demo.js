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
function updateGasStation() {}
// На месте сцен торгового центра главный цикл крутит обновления самого ДЕМО: лаборатория, обучение
// (src/demo/tutorial.js). Каждое — функция без аргументов, раз в кадр
const demoUpdates = [];
function updateMallPeople() {
  for (const f of demoUpdates) f();
}

// ---------- Земля и забор ----------
// ДЕМО — один круглый город: вся земля внутри забора зеленая (никаких пустых темных полей между зонами), по границе мира — сетчатый забор
// (src/world/fence.js), за ним — лес для вида (src/world/forest.js). Зоны и трассы лежат на этой земле плоскими пятнами чуть светлее
{
  const disc = new THREE.Mesh(new THREE.CircleGeometry(worldRadius + 450, 160), new LitMaterial({ color: 0x356b3a, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(worldCenter.x, 0.003, worldCenter.z);
  cityGroup.add(disc);
}

// ---------- Локации ----------
// ДЕМО разделено на три локации — отдельные страницы: demo/races.html, demo/lab.html, demo/characters.html (меню — demo/index.html).
// Какая загружена, задает страница: demoLocation, demoWorldRadius и demoWorldCenter (src/engine/layout.js). Каждая локация — свой круглый
// город, обнесенный сетчатым забором (src/world/fence.js), с зеленой землей без пустых полей и лесом (src/world/forest.js):
//   races      — «Гоночные трассы»: все трассы автодрома, стоянки машин (src/demo/race.js);
//   lab        — «Лаборатория»: тир, вольер, лаборатория, обучение бою, DANGER, помощники Барона, стол со всеми вещами, подставка
//                с приборами и пустые заготовки зданий (src/demo/range*.js, tutorial.js);
//   characters — «Персонажи»: дом и гараж героя, дом бабушки Веры, домик на дереве, ряд персонажей сюжета с диалогами, полные здания.
const DEMO_LOCATION_NAMES = { races: 'Гоночные трассы', lab: 'Лаборатория', characters: 'Персонажи' };
const inRaces = demoLocation === 'races';
const inLab = demoLocation === 'lab';
const inCharacters = demoLocation === 'characters';
const combatShift = { x: 0, z: 0 }; // боевая зона (тир, вольер, лаборатория) стоит на своих местах (range*.js, tutorial.js, race.js)

// Земля всего круга — зеленая: ни в мире, ни на карте нет пустых темных полей
{
  const disc = new THREE.Mesh(new THREE.CircleGeometry(worldRadius + 450, 160), new LitMaterial({ color: 0x356b3a, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(worldCenter.x, 0.003, worldCenter.z);
  cityGroup.add(disc);
}

// Площадка локации (лаборатория, персонажи): прямоугольник чуть светлее земли, на нем дорога с запада на восток; лес на площадке не растет.
// Гоночные трассы строят свою землю сами (src/demo/race.js)
const demoRect = inLab ? { x1: -70, x2: 170, z1: -10, z2: 150 } : { x1: -125, x2: 125, z1: -130, z2: 110 };
if (!inRaces) {
  const w = demoRect.x2 - demoRect.x1;
  const d = demoRect.z2 - demoRect.z1;
  flatRect(w, d, 0x3f6b3a, 0.006, (demoRect.x1 + demoRect.x2) / 2, (demoRect.z1 + demoRect.z2) / 2);
  mapObjects.push({ x: (demoRect.x1 + demoRect.x2) / 2, z: (demoRect.z1 + demoRect.z2) / 2, hx: w / 2, hz: d / 2, color: '#2f5233', ground: true });
  // Название локации — по всему кругу (панель «Локация»)
  registerZone('demo_' + demoLocation, DEMO_LOCATION_NAMES[demoLocation], { x1: worldCenter.x - worldRadius, x2: worldCenter.x + worldRadius, z1: worldCenter.z - worldRadius, z2: worldCenter.z + worldRadius }, { birds: 0.5 });
  clearZones.push(demoRect);
  roadH(demoRect.x1 + 6, demoRect.x2 - 6, 0, 'asphalt'); // дорога: по ней можно покататься
}
buildRoadMeshes();

// ---------- Дом и гараж героя ----------
if (inCharacters) {
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
  addHoverInfo(house, { kind: 'Здание', name: 'Дом и гараж героя', desc: 'Двухэтажный дом с гаражом, в гараже — ваша машина.' });
  addObstacle({ x: houseX, z: houseZ, hx: homeW / 2, hz: homeD / 2 });
  mapObjects.push({ x: houseX, z: houseZ, hx: homeW / 2, hz: homeD / 2, color: '#d9a066' });
  const exterior = buildHomeExterior({ houseX, houseZ, side });
  const driveLen = Math.abs(exterior.frontZ - side * 3.5);
  flatRect(6.6, driveLen, 0x555555, 0.018, exterior.garageCenterX, (exterior.frontZ + side * 3.5) / 2);
}

// ---------- Дом бабушки Веры, тропинка в лес и домик на дереве ----------
// Рядом с домом героя — дом Анны Петровны (полный: с ней во дворе), за ним извилистая тропинка уходит
// в лес к огромному дереву; в кроне — очень большой домик, спрятанный в листве (src/content/buildings/treehouse.js)
const demoScene = ['grandma_house', 'treehouse']; // эти заготовки стоят полными здесь, а не в ряду зданий
if (inCharacters) {
  const gx = 10;
  const gz = -24;
  flatRect(52, 36, 0x3a6b3d, 0.008, gx + 8, gz - 1); // дом 24 × 15 с гаражом справа
  placeBuilding('grandma_house', { x: gx, z: gz, heading: 0, full: true });

  // Тропинка: от задней стены дома на север, петляя, к дереву
  const treeX = gx + 14;
  const treeZ = -102;
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const z = gz - grandmaD / 2 - 1 + (treeZ + 6 - (gz - grandmaD / 2 - 1)) * t;
    pts.push({ x: gx + (treeX - gx) * t + Math.sin(t * Math.PI * 3) * 9 * (1 - t * 0.6), z });
  }
  const pathMat = new LitMaterial({ color: 0x9a7a52, side: THREE.DoubleSide });
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(1.8, len + 0.9), pathMat);
    seg.rotation.x = -Math.PI / 2;
    seg.rotation.z = Math.atan2(-(b.x - a.x), -(b.z - a.z));
    seg.position.set((a.x + b.x) / 2, 0.011, (a.z + b.z) / 2);
    cityGroup.add(seg);
    mapObjects.push({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, hx: 0.9, hz: 0.9, color: '#9a7a52', ground: true });
  }

  // Лес вокруг тропинки и дерева: деревья не встают на тропинку, к дому и к самому дереву
  flatRect(80, 92, 0x2f5233, 0.007, gx + 12, -84);
  const nearPath = (x, z) => pts.some((p) => Math.hypot(x - p.x, z - p.z) < 4.2);
  for (let k = 0; k < 260; k++) {
    const x = rand(gx - 26, gx + 52);
    const z = rand(-128, gz - 12);
    if (nearPath(x, z) || Math.hypot(x - treeX, z - treeZ) < 13) continue;
    if (x < -6 && z > -42) continue; // за домом героя свободно
    const tree = createLeafyTree(pick(leafyGreens));
    const sc = rand(1.0, 1.6);
    tree.position.set(x, 0, z);
    tree.rotation.y = rand(0, Math.PI * 2);
    tree.scale.setScalar(sc);
    cityGroup.add(tree);
    addTreeCollider(x, z, sc);
  }
  for (let k = 0; k < 40; k++) {
    const p = pick(pts);
    const side = Math.random() < 0.5 ? -1 : 1;
    const bush = createBush(pick(leafyGreens));
    bush.position.set(p.x + side * rand(1.6, 3), 0, p.z + rand(-1.5, 1.5));
    cityGroup.add(bush);
  }

  // Огромное дерево: дупло с веревочной лестницей смотрит на тропинку (на юг)
  placeBuilding('treehouse', { x: treeX, z: treeZ, heading: 0, full: true });
}

// ---------- Персонажи ----------
// Рабочие имена и реплики — из docs/story/characters. Позже их заменит реестр src/content/characters.
const DEMO_CHARACTERS = [
  {
    name: 'Денис', title: 'полицейский, друг детства', gender: 'male', type: 'denis',
    hello: 'Макс! Ты чего тут? Ладно, раз пришел — спрашивай.',
    knows: 'Тело нашли у моста. Мне велели написать «самоубийство». Мне. Велели. Понимаешь?',
    help: 'Покажу материалы дела, пробью номера машин, а если что — прикрою.',
  },
  {
    name: 'Анна Петровна', title: 'бабушка Веры', gender: 'female', type: 'anna',
    hello: 'Максимушка... Ты же совсем не изменился. Только похудел.',
    knows: 'Они всё перевернули. А на дерево и не глянули. Взрослые никогда не смотрят наверх.',
    help: 'Пирогами накормлю, ключ от калитки дам. Домик на дереве теперь твой.',
  },
  {
    name: 'Вера', title: 'девушка из лаборатории', gender: 'female', type: 'vera',
    hello: 'Ты меня наконец-то узнал. (В игре Вера появится только в финале.)',
    knows: 'В лаборатории есть потайная дверь. Шеф запретил туда спускаться.',
    help: 'Помнишь, где мы закопали банку с секретами? Ты тогда сказал, что секреты — это ненаучно.',
  },
  {
    name: 'Людмила Сергеевна', title: 'директор торгового центра', gender: 'female', type: 'lyudmila',
    hello: 'Покупать что-нибудь будете, кроме лапши и батареек?',
    knows: 'Мед, соль, медная проволока и два килограмма сахара. Я думала, она варенье с электричеством варит.',
    help: 'Провизия, реактивы для эликсира, детали для приборов. Что нужно — закажу.',
  },
  {
    name: 'Семён Аркадьевич', title: 'директор библиотеки', gender: 'male', type: 'semyon',
    hello: 'Молодой человек, вы опять пришли за документацией?',
    knows: 'Вера часами сидела в информационном центре. А в архиве есть фото Штерна с одним «инвестором».',
    help: 'Книги, архив газет и безлимитная быстрая сеть в информационном центре.',
  },
  {
    name: 'Олег Борисович', title: 'начальник в IT-компании', gender: 'male', type: 'oleg',
    hello: 'Ты где пропадаешь? Проект для пекарни горит.',
    knows: 'Лаборатория хотела заказать у нас расчетный кластер под полную секретность. Я отказался.',
    help: 'Хочешь считать свои приборы на моих серверах? Окей. Но сначала сдай проект.',
  },
  {
    name: 'Михалыч', title: 'кузнец', gender: 'male', type: 'mihalych',
    hello: 'Чего встал? Садись, раздувай горн.',
    knows: 'Вера приносила мне чертеж странного браслета. Просила корпус. Не успел я.',
    help: 'Станок, горн и 3D-принтер. По чертежу соберу что угодно.',
  },
  {
    name: 'Рустам', title: 'автомагазин и автомастерская', gender: 'male', type: 'rustam',
    hello: 'Брат, твоя «Альмера» — это не машина, это аквариум.',
    knows: 'За неделю до смерти кто-то копался в тормозах машины Веры.',
    help: 'Починю, проапгрейжу, продам новую. Давай сделаем из нее танк.',
  },
  {
    name: 'Николай Палыч', title: 'начальник заправки', gender: 'male', type: 'nikolay',
    hello: 'Заправляйся, Макс, денег не надо.',
    knows: 'В ту ночь к реке проехал фургон без номеров. Через час обратно.',
    help: 'Бензин бесплатно, а когда серверам не хватит электричества — дизель для генератора.',
  },
  {
    name: 'Павел Андреевич Громов', title: 'глава корпорации', gender: 'male', type: 'gromov',
    hello: 'Слушаю вас. Анна Петровна сказала, это важно.',
    knows: 'Подвал? В моей лаборатории изучают экологию. Покажите доказательства.',
    help: 'Если вы правы, на одну ночь сниму охрану с ворот.',
  },
  {
    name: 'Виктор Штерн', title: 'начальник лаборатории', gender: 'male', type: 'stern',
    hello: 'Наука не бывает доброй или злой, молодой человек.',
    knows: 'Ваши вычисления великолепны. Жаль, что вы так поздно их прислали.',
    help: 'Помогать вам? Это было бы ненаучно.',
  },
  {
    name: 'Барон', title: 'глава покупателей оружия', gender: 'male', type: 'baron',
    hello: 'Я всего лишь инвестор. Хочу вложиться в экологию вашего городка.',
    knows: 'Десять моих помощников прошли через лабораторию. Каждый теперь кое-что умеет.',
    help: 'Отойдите с дороги, и никто не пострадает.',
  },
];

// Помощники Барона (docs/story/characters/bosses.md, вид — docs/art/bosses.png): ряд позади персонажей
const DEMO_BOSSES = [
  ['Вспышка', 'flash', 'сверхскорость', 'Ты даже не заметишь, как я пробегу мимо. Дважды.', 'Накладные на «экологическое оборудование»? Я их только доставляю.'],
  ['Эхо', 'echo', 'копии-иллюзии', 'Который из нас настоящий? Угадаешь — поговорим.', 'Ящики в подсобке ТЦ? Спроси у моих копий.'],
  ['Сокол', 'falcon', 'летает', 'Сверху видно всё. Особенно реку в ту ночь.', 'Фото? Может, и сделал. Над мостом хорошо снимать.'],
  ['Магнит', 'magnet', 'притягивает железо', 'Твоя машина — просто железо. Как и твой пистолет.', 'Фургон без номеров — не моя забота. Я только грузил.'],
  ['Тень', 'shadow', 'невидимость', '...', 'Тайники в лесу. Ты их не найдешь без нужных очков.'],
  ['Туча', 'cloud', 'погода', 'Чувствуешь? Скоро гроза.', 'Погодный модуль работает. Береговое уже это знает.'],
  ['Искра', 'spark', 'электроника', 'Твой телефон на 3%. Был.', 'Переписка Штерна? Зашифрована. Мной.'],
  ['Шепот', 'whisper', 'гипноз голосом', 'Тише... Послушай меня. Просто послушай.', 'В полиции тоже умеют слушать. Один особенно.'],
  ['Глыба', 'block', 'сверхсила и броня', 'ПРОХОДА НЕТ.', 'Цех под лабораторией. Я его охраняю.'],
  ['Гидра', 'hydra', 'регенерация', 'Ранишь — заживет. Снова ранишь — снова заживет.', 'Ключ-карту от лаборатории просто так не отдам.'],
].map(([name, type, power, hello, knows]) => ({
  name, type, gender: 'male', title: 'помощник Барона: ' + power, hello, knows,
  help: 'Помогать тебе? Барон бы не одобрил.',
}));

const demoPeople = [];
function placeDemoRow(list, rowZ, centerX = 0) {
  const step = 8;
  const x0 = centerX - ((list.length - 1) * step) / 2;
  list.forEach((c, i) => {
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
  });
}
// Персонажи сюжета — в локации «Персонажи», ряд лицом к дороге; помощники Барона — в «Лаборатории», у вольера
if (inCharacters) placeDemoRow(DEMO_CHARACTERS, 18, 0);
if (inLab) placeDemoRow(DEMO_BOSSES, 20, 0);

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
if (inLab) {
  // Лаборатория: стол со всеми вещами, за ним — подставка с приборами и заготовки зданий
  const tableX = 0;
  const tableZ = 34;
  const ids = Object.keys(ITEMS).filter((id) => !DEVICES[id]); // приборы — на своей подставке
  const step = 3;
  const x0 = tableX - ((ids.length - 1) * step) / 2;
  const tableW = ids.length * step + 2;
  const table = boxWithEdges(tableW, 0.9, 1.6, 0x8a6a3c);
  table.position.set(tableX, 0.45, tableZ);
  cityGroup.add(table);
  addHoverInfo(table, { kind: 'ДЕМО', name: 'Стол с предметами', desc: 'Здесь все вещи игры. E или клик по вещи — взять, запас бесконечный.' });
  addObstacle({ x: tableX, z: tableZ, hx: tableW / 2, hz: 0.8 });
  mapObjects.push({ x: tableX, z: tableZ, hx: tableW / 2, hz: 0.8, color: '#8a6a3c' });

  const onTable = []; // { id, model }
  ids.forEach((id, i) => {
    const x = x0 + i * step;
    // Объемная пиксельная модель вещи (src/models/items.js), медленно вращается
    const model = createItemModel(id, 0.9);
    model.position.set(x, 0.95, tableZ);
    model.children[0].onBeforeRender = () => {
      model.rotation.y = performance.now() / 1000 + i;
    };
    cityGroup.add(model);
    onTable.push({ id, model });
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
    addPickable({ id, mesh: model, canPick: () => !drivingCar && !insideBuilding() && !hasItem(id), pick: take });
  });
  // Каждый кадр, пока стол на экране: на нем видны только вещи, которых нет в инвентаре
  table.onBeforeRender = () => {
    for (const t of onTable) t.model.visible = !hasItem(t.id);
  };
}

// ---------- Приборы ----------
// Подставка за столом предметов: все приборы из DEVICES (src/player/devices.js). E — надеть: прибор
// исчезает с подставки и оказывается на герое. Еще раз E у пустого места — снять и положить обратно,
// чтобы заново проверить, как прибор меняет игру (браслет — панель сохранений)
if (inLab) {
  const standX = 0;
  const standZ = 42;
  const ids = Object.keys(DEVICES);
  const step = 4;
  const x0 = standX - ((ids.length - 1) * step) / 2;
  const standW = ids.length * step + 2;
  const stand = boxWithEdges(standW, 0.9, 1.6, 0x4a5a6a);
  stand.position.set(standX, 0.45, standZ);
  cityGroup.add(stand);
  addHoverInfo(stand, { kind: 'ДЕМО', name: 'Подставка с приборами', desc: 'E — надеть прибор, еще раз E у пустого места — снять.' });
  addObstacle({ x: standX, z: standZ, hx: standW / 2, hz: 0.8 });
  mapObjects.push({ x: standX, z: standZ, hx: standW / 2, hz: 0.8, color: '#4a5a6a' });

  const onStand = []; // { id, mesh }
  ids.forEach((id, i) => {
    const d = DEVICES[id];
    const x = x0 + i * step;
    const mesh = new THREE.Group();
    mesh.add(createItemModel(id, 0.9)); // объемный значок прибора (src/models/items.js)
    mesh.position.set(x, 1.1, standZ);
    cityGroup.add(mesh);
    onStand.push({ id, mesh });
    const toggle = () => {
      if (isWorn(id)) {
        takeOffDevice(id);
        showToast('Снято: ' + d.name);
      } else if (!hasItem(id)) wearDevice(id);
    };
    addInteractable({
      priority: 2,
      // Прибор в инвентаре (не надет) — подставка пустая, надевают его из инвентаря
      near: () => !drivingCar && !insideBuilding() && (isWorn(id) || !hasItem(id)) && Math.hypot(playerWorldX - x, playerWorldZ - standZ) < 2.4,
      prompt: () => (isWorn(id) ? 'E — снять и положить обратно: ' : 'E — надеть: ') + d.name,
      act: toggle,
    });
    addPickable({ id, mesh, canPick: () => !drivingCar && !insideBuilding() && !hasItem(id), pick: toggle });
  });
  // Каждый кадр, пока подставка на экране: прибора, который на герое или в инвентаре, на ней нет
  stand.onBeforeRender = () => {
    for (const t of onStand) t.mesh.visible = !hasItem(t.id);
  };
}

// ---------- Здания ----------
// Все заготовки из реестра (src/content/buildings) стоят рядом: пустые (только стены, двери, этажи) — в «Лаборатории», полные (мебель, станции,
// жильцы) — в «Персонажах», рядом с теми, кто в них работает. Фасады смотрят на дорогу
{
  const rows = [];
  if (inLab) rows.push({ z: 70, x: 0, heading: Math.PI, full: false, title: 'Пустая заготовка: стены, двери и этажи.' });
  if (inCharacters) rows.push({ z: 70, x: 0, heading: Math.PI, full: true, title: 'Полная заготовка: станции, вещи и жильцы.' });
  const ids = Object.keys(BUILDINGS);
  const gap = 10;
  for (const row of rows) {
    const list = ids.filter((id) => !(row.full && demoScene.includes(id))); // домик на дереве и дом бабушки — полными в своей сцене на площадке
    const total = list.reduce((sum, id) => sum + BUILDINGS[id].size.w, 0) + gap * (list.length - 1);
    let x = row.x - total / 2;
    for (const id of list) {
      const def = BUILDINGS[id];
      const cx = x + def.size.w / 2;
      addHoverInfo(flatRect(def.size.w + 4, def.size.d + 4, 0x3c3c3c, 0.012, cx, row.z), {
        kind: 'ДЕМО', name: def.name + ' (' + id + ')', desc: row.title,
      });
      placeBuilding(id, { x: cx, z: row.z, heading: row.heading, full: row.full });
      x += def.size.w + gap;
    }
  }
}


// ---------- Снаряжение ----------
// Браслет возврата сразу лежит в инвентаре: открыть инвентарь (I) и кликнуть — он защелкнется на руке
// и встанет в ячейку «браслет» нижней панели. Всё оружие — тоже с собой. С собой — полный запас эликсира (src/player/equipment.js)
// Бесконечный рюкзак — сразу с собой: в нем всё оружие и все вещи, место не кончается (src/player/inventory.js)
if (!hasItem('backpack')) inventory.items.unshift('backpack');
if (!hasItem('bracelet')) inventory.items.push('bracelet');
// Всё оружие сразу с собой: первые восемь — в активных ячейках внизу, остальное — в инвентаре
for (const id of Object.keys(WEAPONS)) {
  if (hasItem(id)) continue;
  inventory.items.push(id);
  autoEquip(id);
}
heroStats.elixir = heroStats.maxElixir;
renderInventory();
renderEquipHud();

// Старт: на площадке локации (у дороги), в гоночных трассах — у стоянки машин
// Гоночные трассы: у стоянки своего участка (demoRaceSection: city, relief, shapes, rings-small, rings-big, eights-west, eights-east)
const RACE_STARTS = {
  city: { x: -130, z: -8 },
  relief: { x: -133, z: -662 },
  shapes: { x: -118, z: -1100 },
  'rings-small': { x: -118, z: -1522 },
  'rings-big': { x: -118, z: -1522 },
  'eights-west': { x: -118, z: 1112 },
  'eights-east': { x: -118, z: 1112 },
};
const demoStart = inRaces ? RACE_STARTS[typeof demoRaceSection === 'string' ? demoRaceSection : 'city'] : inLab ? { x: 0, z: 48 } : { x: 0, z: 8 };
showToast(
  inRaces
    ? 'Гоночные трассы: стоянки с машинами — рядом (болид, джип, трактор, БТР; гоночный парк — севернее); трассы — по дороге на запад, фигуры, кольца и восьмерки — по продольной дороге на север и юг'
    : inLab
      ? 'Лаборатория: стол со всеми вещами и подставка с приборами — рядом; тир с оружием, мишенями, вольером и пультом обучения — на востоке'
      : 'Персонажи: ряд персонажей сюжета — с каждым можно поговорить (E); дом героя и дом бабушки Веры с тропинкой к домику на дереве — на севере',
  8000,
);
