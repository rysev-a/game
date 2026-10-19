// src/player/inventory.js
// ИНВЕНТАРЬ игрока: панель в левом верхнем углу. Свернут — три маленькие ячейки со значками и под ними
// (с небольшим отступом) четыре быстрых слота сохранения: клик по пустому — сохранить игру в него,
// по заполненному — загрузить. По клику на инвентарь (или клавише I) панель раскрывается: сетка 8 × 5
// и под ней все сохранения — две строки по 8 слотов (быстрые слоты — это первые четыре из них).
// Все значки пиксельные (src/player/icons.js). В начале игры инвентарь пуст.
// БЕСКОНЕЧНЫЙ РЮКЗАК. Пока его нет, с собой можно носить только то, что помещается в карманах
// (pocket: true — ключи от машины, телефон; канистру несут в руке) — остальное не берется, и в раскрытом
// инвентаре видны только три ячейки. Рюкзак герой находит в домике на дереве (src/content/buildings/treehouse.js);
// с ним инвентарь бесконечный: сетка 8 × 5 растет на строку, как только заполнится. В ДЕМО рюкзак есть сразу.
// Сохранения появляются только с браслетом возврата на руке (тег 'saves', src/player/devices.js):
// до него ни быстрых слотов, ни панели сохранений нет. Пока рюкзака нет, панели инвентаря не видно вовсе (src/quests/gates.js):
// ключи лежат в нижней ячейке, телефон — значок рядом с местом инвентаря.
//
// Сохранения (лежат в src/player/saves.js):
//   значок «браслет»  — клетки начинают пульсировать; клик по любой запоминает в ней мгновение (в клетке вспыхивает знак)
//   значок «корзина» — слоты пульсируют; каждый клик по заполненному слоту очищает его
//   клик по заполненному слоту (без режимов) — загрузить игру
//
// API для остального кода:
//   addItem(id) — положить вещь, hasItem(id) — есть ли (в сетке или надета), removeItem(id)
// Надеваемое (браслет, куртка, бронежилет, ботинки) и оружие на компьютере перетаскивают из раскрытого инвентаря
// в панель снаряжения справа от него, на телефоне — кликом (src/player/equipment.js)
//   showToast(текст, мс) — короткое сообщение внизу экрана

const ITEMS = {
  wrench: { name: 'Гаечный ключ', icon: 'wrench', desc: 'Тяжелый, надежный. Пригодится в гараже.' },
  screwdriver: { name: 'Отвертка', icon: 'screwdriver', desc: 'Крестовая. Открывает корпуса приборов.' },
  keys: { name: 'Ключи от машины', icon: 'keys', pocket: true, desc: 'Ключи от вашей Nissan Almera Classic.' },
  wallet: { name: 'Кошелек', icon: 'wallet', desc: 'Немного денег и старый пропуск в спортзал.' },
  phone: { name: 'Телефон', icon: 'phone', pocket: true, desc: 'Связь, карта и фонарик, пока не сядет батарейка.' },
  itpass: { name: 'Пропуск в IT-компанию', icon: 'itpass', desc: 'Пропуск через турникет IT-компании.' },
  notebook: { name: 'Блокнот', icon: 'notebook', desc: 'Записи по делу. Пока почти пустой.' },
  flashlight: { name: 'Фонарик', icon: 'flashlight', desc: 'Светит далеко. Ночью без него никуда.' },
  canister: { name: 'Канистра с бензином', icon: 'canister', pocket: true, desc: 'Бензин от соседа. E у своей машины — залить в бак.' }, // от соседа; E у своей машины — залить
  elixir_kit: { name: 'Реагенты для установки Веры', icon: 'kit', desc: 'Квантово-полярный катализатор, тахионная пыль, антиспиновый гель, хроно-стабилизатор и кристалл-затравка: веществ, которых еще нет в справочниках. Ящик холодный на ощупь.' },
  bp_analyzer: { name: 'Чертеж анализатора', icon: 'blueprint', desc: 'Чертеж корпуса прибора, найденный среди бумаг Веры: кривой, но мысль правильная.' },
  vibranium: { name: 'Вибраниум', icon: 'vibranium', desc: 'Слиток металла, которого нет в таблице Менделеева: серебристо-фиолетовый, тяжелый, гасит и поглощает любую вибрацию и не ржавеет. Из него делают корпуса приборов Веры.' },
  analyzer: { name: 'Анализатор тканей', icon: 'analyzer', desc: 'Первый прибор Веры: читает следы на теле и вещах. Корпус выковал Михалыч.' },
  case_photos: { name: 'Фото из дела', icon: 'photos', desc: 'Копии фотографий с места гибели Веры: синяки на запястьях, следы шин.' },
  library_card: { name: 'Читательский билет Веры', icon: 'card', desc: 'Билет городской библиотеки на имя Веры Соколовой.' },
  bp_bracelet: { name: 'Чертеж браслета', icon: 'blueprint', desc: 'Чертеж браслета возврата из старой голубятни: Вера спрятала его по их местам.' },
  invoice: { name: 'Накладная лаборатории', icon: 'notebook', desc: 'Накладная на «экологическое оборудование» с подписью начальника лаборатории.' },
  artifact: { name: 'Артефакт возврата', icon: 'artifact', desc: 'Главный заказ Штерна, собранный по вычислениям героя. Это и есть телепорт: с ним работает перемещение по карте. Без эликсира не заряжается.' },
  weather: { name: 'Прибор управления погодой', icon: 'chip', desc: 'Прибор Веры: разгоняет и собирает тучи, зовет ливень и туман. Работает на эликсире и тратит его много.' },
  regen: { name: 'Прибор восстановления тканей', icon: 'analyzer', desc: 'Прибор Веры с верстака: на эликсире заживляет ткани. С ним у героя появляется здоровье, а раны перестают быть смертельными.' },
  bp_shotgun: { name: 'Чертеж дробовика', icon: 'blueprint', desc: 'Чертеж Веры из архива библиотеки: обрезная двустволка по ее схеме.' },
  bp_machinegun: { name: 'Чертеж пулемета', icon: 'blueprint', desc: 'Чертеж Веры из архива библиотеки: ручной пулемет с ленточной подачей.' },
  sg_pipe: { name: 'Ствольная труба', icon: 'pipe', desc: 'Толстостенная труба для дробовика.' },
  sg_stock: { name: 'Деревянная ложа', icon: 'stock', desc: 'Приклад и цевье из ореха.' },
  sg_spring: { name: 'Пружина затвора', icon: 'spring', desc: 'Тугая пружина для дробовика.' },
  mg_pipe: { name: 'Ствол пулемета', icon: 'pipe', desc: 'Длинная труба под пулемет.' },
  mg_gears: { name: 'Механизм подачи', icon: 'gears', desc: 'Шестерни для ленточной подачи пулемета.' },
  mg_spring: { name: 'Возвратная пружина', icon: 'spring', desc: 'Пружина для пулемета.' },
  rc_remote: { name: 'Пульт вертолетика', icon: 'phone', desc: 'Пульт радиоуправляемого вертолетика с камерой. Влезает в карман.' },
  chips: { name: 'Микрочипы киборгов', icon: 'chip', desc: 'Платы из киборгов с яхты: на каждой серийный номер лаборатории. Из таких микросхем можно собирать приборы.' },
  backpack: { name: 'Бесконечный рюкзак', icon: 'backpack', desc: 'Супер-предмет Веры: голубой рюкзак с бездонным нутром. Влезает сколько угодно вещей, и всё это ничего не весит.' },
};

// Надеваемые приборы (браслет) тоже лежат в инвентаре, пока их не надели
for (const id in DEVICES) {
  if (!ITEMS[id]) ITEMS[id] = { name: DEVICES[id].name, icon: id, kind: 'device', desc: DEVICES[id].desc };
}

const hasBackpack = () => inventory.items.includes('backpack');

const inventory = {
  get size() {
    return hasBackpack() ? Infinity : 40; // с рюкзаком места сколько угодно
  },
  rows: 5, // 8 × 5 клеток в раскрытом виде (с рюкзаком — больше, по мере заполнения)
  columns: 8,
  collapsedCells: 3, // в свернутом виде видны первые три
  quickSlots: 4, // под ними всегда видны четыре слота сохранения (первые четыре из 16)
  items: [], // id вещей по порядку ячеек; в начале игры инвентарь пуст
};

const inventoryEl = document.getElementById('inventory');
const toastEl = document.getElementById('toast');
let toastTimer = 0;
let inventoryOpen = false;
let savesMode = null; // null | 'save' | 'clear' — слоты пульсируют, ждем клика

// ---------- Отрисовка ----------

function cell(extraClass = '') {
  const el = document.createElement('div');
  el.className = 'invCell ' + extraClass;
  return el;
}

// Сколько ячеек в раскрытом инвентаре: без рюкзака — только карманы, с ним — 8 × 5 и всегда есть пустая строка
function openCells() {
  const n = inventory.items.length;
  if (!hasBackpack()) return Math.max(inventory.collapsedCells, n);
  const c = inventory.columns;
  return Math.max(inventory.rows * c, (Math.ceil(n / c) + 1) * c);
}

// Голубой рюкзак виден на спине героя, пока лежит в инвентаре (в том числе после загрузки сохранения)
function syncBackpackOnBack() {
  let hero = null;
  try {
    hero = player; // герой создается позже инвентаря: до этого момента переменной еще нет
  } catch (e) {
    return;
  }
  if (!hero || !hero.attach || typeof createBackpackModel !== 'function') return;
  const worn = !!hero.userData.backpackMesh;
  if (hasBackpack() && !worn) hero.userData.backpackMesh = hero.attach('back', createBackpackModel());
  else if (!hasBackpack() && worn) {
    const m = hero.userData.backpackMesh;
    if (m.parent) m.parent.remove(m);
    hero.userData.rig.attached = hero.userData.rig.attached.filter(([, o]) => o !== m);
    hero.userData.backpackMesh = null;
  }
}

function renderInventory() {
  syncBackpackOnBack();
  if (typeof renderEquipPanel === 'function') renderEquipPanel(); // панель снаряжения справа видна, пока инвентарь раскрыт
  inventoryEl.innerHTML = '';
  inventoryEl.className = inventoryOpen ? 'open' : 'closed';

  // Сетка вещей: свернутая — 3 ячейки, раскрытая — 8 × 5
  const grid = document.createElement('div');
  grid.className = 'invGrid';
  grid.style.gridTemplateColumns = 'repeat(' + (inventoryOpen ? inventory.columns : inventory.collapsedCells) + ', 40px)';
  grid.classList.add('items');
  const count = inventoryOpen ? openCells() : inventory.collapsedCells;
  for (let i = 0; i < count; i++) {
    const c = cell();
    const id = inventory.items[i];
    if (id) {
      c.appendChild(pixelIcon(ITEMS[id].icon));
      c.title = ITEMS[id].name;
      // На телефоне в раскрытом инвентаре касание надеваемой вещи — надеть (в ячейку нижней панели);
      // на компьютере вещи перетаскивают в панель снаряжения справа (src/player/equipment.js)
      if (inventoryOpen && touchUI && typeof equipSlotOf === 'function' && equipSlotOf(id)) {
        c.classList.add('wearable');
        c.title += ' — клик надевает';
        c.addEventListener('click', (e) => {
          e.stopPropagation();
          equipItem(id);
        });
      }
    }
    if (inventoryOpen && !touchUI && typeof invCellDnD === 'function') invCellDnD(c, i, id);
    grid.appendChild(c);
  }

  // Стрелка: раскрыть / свернуть
  const chevron = document.createElement('div');
  chevron.className = 'invChevron';
  chevron.title = inventoryOpen ? 'Свернуть' : 'Раскрыть инвентарь (I)';
  chevron.appendChild(pixelIcon(inventoryOpen ? 'chevronUp' : 'chevronDown'));
  chevron.addEventListener('click', (e) => {
    e.stopPropagation();
    setInventoryOpen(!inventoryOpen);
  });

  const savesOn = hasDeviceTag('saves'); // без браслета сохранений нет
  if (!savesOn) savesMode = null;

  if (!inventoryOpen) {
    // Свернутый: сверху ряд из трех ячеек и стрелка (клик по любой части раскрывает панель),
    // под ним — четыре быстрых слота сохранения
    const top = document.createElement('div');
    top.className = 'invTop';
    top.appendChild(grid);
    top.appendChild(chevron);
    inventoryEl.appendChild(top);
    if (!savesOn) return;

    const quick = document.createElement('div');
    quick.className = 'invGrid quick';
    quick.style.gridTemplateColumns = 'repeat(' + inventory.quickSlots + ', 40px)';
    for (let i = 0; i < inventory.quickSlots; i++) {
      const filled = !!getSave(i);
      const c = cell('slot quick' + (filled ? ' filled' : ' empty'));
      if (filled) c.appendChild(pixelIcon(glyphIconId(i))); // знак: браслет запомнил этот миг; пустая клетка темна
      c.title = filled ? saveTitle(i) + ' — нажмите, чтобы вернуться в этот миг' : 'Пустая клетка ' + (i + 1) + ' — нажмите, и браслет запомнит этот миг';
      c.addEventListener('click', (e) => {
        e.stopPropagation(); // клик по слоту не раскрывает панель
        onQuickSlotClick(i);
      });
      quick.appendChild(c);
    }
    inventoryEl.appendChild(quick);
    return;
  }

  // На телефоне раскрытый инвентарь — на весь экран, и сохранения идут полосой сверху: 10 слотов в ряд,
  // под ними вещи слева и снаряжение справа (src/engine/touch.js)
  const savesStrip = touchUI && savesOn;
  document.body.classList.toggle('invSavesOn', savesStrip);
  const slotCount = touchUI ? 10 : SAVE_SLOTS;
  const savesBox = document.createElement('div');
  savesBox.className = 'invSaves';
  if (savesStrip) inventoryEl.appendChild(savesBox);
  inventoryEl.appendChild(chevron);
  inventoryEl.appendChild(grid);
  if (!savesOn) return;
  if (!savesStrip) inventoryEl.appendChild(savesBox);

  // Дисплей браслета: значки «запомнить» и «стереть», под ними 2 строки по 8 клеток
  const tools = document.createElement('div');
  tools.className = 'invTools';
  for (const [mode, icon, title] of [
    ['save', 'bracelet', 'Запомнить миг: выберите клетку'],
    ['clear', 'trash', 'Стереть знак: нажимайте на знаки'],
  ]) {
    const btn = cell('tool' + (savesMode === mode ? ' active' : ''));
    btn.appendChild(pixelIcon(icon));
    btn.title = title;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setSavesMode(savesMode === mode ? null : mode);
    });
    tools.appendChild(btn);
  }
  savesBox.appendChild(tools);

  const slots = document.createElement('div');
  slots.className = 'invGrid saves';
  slots.style.gridTemplateColumns = 'repeat(' + (touchUI ? slotCount : inventory.columns) + ', 40px)';
  for (let i = 0; i < slotCount; i++) {
    const filled = !!getSave(i);
    // Пульсируют все слоты, пока ждем выбора
    const c = cell('slot' + (filled ? ' filled' : '') + (savesMode ? ' pulse' : ''));
    if (filled) c.appendChild(pixelIcon(glyphIconId(i)));
    c.title = filled ? saveTitle(i) : 'Пустая клетка ' + (i + 1);
    c.addEventListener('click', (e) => {
      e.stopPropagation();
      onSlotClick(i);
    });
    slots.appendChild(c);
  }
  savesBox.appendChild(slots);
}

// Быстрый слот под свернутым инвентарем: пустой — сохраняет, заполненный — загружает
function onQuickSlotClick(i) {
  if (getSave(i)) {
    loadFromSlot(i);
  } else {
    saveToSlot(i);
    renderInventory();
  }
}

// Клик по слоту: зависит от режима
function onSlotClick(i) {
  if (savesMode === 'save') {
    saveToSlot(i);
    savesMode = null; // запись сделана — пульсация прекращается
    renderInventory();
  } else if (savesMode === 'clear') {
    if (getSave(i)) {
      clearSave(i);
      renderInventory(); // остаемся в режиме: можно очищать дальше
    }
  } else if (getSave(i)) {
    // На телефоне инвентарь закрывает весь экран — после загрузки он закрывается, чтобы сразу играть
    if (loadFromSlot(i) && touchUI) setInventoryOpen(false);
  } else if (touchUI) {
    // На телефоне касание пустого слота сразу сохраняет игру в него, и инвентарь закрывается
    saveToSlot(i);
    setInventoryOpen(false);
  }
}

function setSavesMode(mode) {
  savesMode = mode;
  renderInventory();
}

function setInventoryOpen(open) {
  inventoryOpen = open;
  savesMode = null;
  if (!open) document.body.classList.remove('invSavesOn');
  renderInventory();
}

// Свернутую панель раскрывает клик по любому месту. Раскрытая остается открытой,
// пока ее не свернут вручную: стрелкой, клавишей I или Esc. Игра при этом идет как обычно
inventoryEl.addEventListener('click', () => {
  if (!inventoryOpen) setInventoryOpen(true);
});
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyI' && !settingsOpen && !dialogueOpen) setInventoryOpen(!inventoryOpen);
  else if (e.code === 'Escape' && inventoryOpen) {
    if (savesMode) setSavesMode(null);
    else setInventoryOpen(false);
  }
});

// ---------- Вещи ----------

const hasItem = (id) => inventory.items.includes(id) || (typeof isEquipped === 'function' && isEquipped(id));

function addItem(id) {
  if (hasItem(id) || inventory.items.length >= inventory.size) return false;
  if (!hasBackpack() && id !== 'backpack' && !ITEMS[id].pocket) {
    showToast('Некуда положить: без рюкзака с собой только ключи и телефон.');
    return false;
  }
  inventory.items.push(id);
  if (typeof autoEquip === 'function') autoEquip(id); // оружие — сразу в свободную ячейку
  renderInventory();
  showToast('Взято: ' + ITEMS[id].name);
  playPickupClick(); // щелчок (src/player/footsteps.js)
  return true;
}

// Ключи от другой машины (когда сюжет даст их игроку): registerCarKey(car, 'Ключи от красной машины')
// заводит вещь в ITEMS и привязывает ее к машине; потом addItem(car.keyId) кладет ключи в инвентарь
function registerCarKey(car, name) {
  ITEMS[car.keyId] = { name, icon: 'keys', pocket: true };
  return car.keyId;
}

function removeItem(id) {
  const i = inventory.items.indexOf(id);
  if (i >= 0) inventory.items.splice(i, 1);
  if (typeof dropEquipped === 'function') dropEquipped(id);
  renderInventory();
}

function showToast(text, ms = 2200) {
  toastEl.textContent = text;
  toastEl.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.style.opacity = '0'), ms);
}

renderInventory();
