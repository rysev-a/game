// src/player/inventory.js
// ИНВЕНТАРЬ игрока: панель в левом верхнем углу. Свернут — три маленькие ячейки со значками и под ними
// (с небольшим отступом) четыре быстрых слота сохранения: клик по пустому — сохранить игру в него,
// по заполненному — загрузить. По клику на инвентарь (или клавише I) панель раскрывается: сетка 8 × 5
// и под ней все сохранения — две строки по 8 слотов (быстрые слоты — это первые четыре из них).
// Все значки пиксельные (src/player/icons.js). В начале игры инвентарь пуст.
// Сохранения появляются только с браслетом возврата на руке (тег 'saves', src/player/devices.js):
// до него ни быстрых слотов, ни панели сохранений нет.
//
// Сохранения (лежат в src/player/saves.js):
//   значок «дискета»  — слоты начинают пульсировать; клик по любому записывает в него игру
//   значок «корзина» — слоты пульсируют; каждый клик по заполненному слоту очищает его
//   клик по заполненному слоту (без режимов) — загрузить игру
//
// API для остального кода:
//   addItem(id) — положить вещь, hasItem(id) — есть ли, removeItem(id)
//   showToast(текст, мс) — короткое сообщение внизу экрана

const ITEMS = {
  wrench: { name: 'Гаечный ключ', icon: 'wrench', desc: 'Тяжелый, надежный. Пригодится в гараже.' },
  screwdriver: { name: 'Отвертка', icon: 'screwdriver', desc: 'Крестовая. Открывает корпуса приборов.' },
  keys: { name: 'Ключи от машины', icon: 'keys', desc: 'Ключи от вашей бирюзовой машины.' },
  wallet: { name: 'Кошелек', icon: 'wallet', desc: 'Немного денег и старый пропуск в спортзал.' },
  phone: { name: 'Телефон', icon: 'phone', desc: 'Связь, карта и фонарик, пока не сядет батарейка.' },
  itpass: { name: 'Пропуск в IT-компанию', icon: 'itpass', desc: 'Пропуск через турникет IT-компании.' },
  notebook: { name: 'Блокнот', icon: 'notebook', desc: 'Записи по делу. Пока почти пустой.' },
  flashlight: { name: 'Фонарик', icon: 'flashlight', desc: 'Светит далеко. Ночью без него никуда.' },
  canister: { name: 'Канистра с бензином', icon: 'canister', desc: 'Бензин от соседа. E у своей машины — залить в бак.' }, // от соседа; E у своей машины — залить
};

const inventory = {
  size: 40, // 8 × 5 клеток в раскрытом виде
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

function renderInventory() {
  inventoryEl.innerHTML = '';
  inventoryEl.className = inventoryOpen ? 'open' : 'closed';

  // Сетка вещей: свернутая — 3 ячейки, раскрытая — 8 × 5
  const grid = document.createElement('div');
  grid.className = 'invGrid';
  grid.style.gridTemplateColumns = 'repeat(' + (inventoryOpen ? inventory.columns : inventory.collapsedCells) + ', 40px)';
  const count = inventoryOpen ? inventory.size : inventory.collapsedCells;
  for (let i = 0; i < count; i++) {
    const c = cell();
    const id = inventory.items[i];
    if (id) {
      c.appendChild(pixelIcon(ITEMS[id].icon));
      c.title = ITEMS[id].name;
    }
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
      c.appendChild(pixelIcon(filled ? 'slot' : 'save')); // пустой — бледная дискета: «сохранить сюда»
      c.title = filled ? saveTitle(i) + ' — клик загружает' : 'Пустой слот ' + (i + 1) + ' — клик сохраняет игру';
      c.addEventListener('click', (e) => {
        e.stopPropagation(); // клик по слоту не раскрывает панель
        onQuickSlotClick(i);
      });
      quick.appendChild(c);
    }
    inventoryEl.appendChild(quick);
    return;
  }

  inventoryEl.appendChild(chevron);
  inventoryEl.appendChild(grid);
  if (!savesOn) return;

  // Сохранения: значки «сохранить» и «очистить», под ними 2 строки по 8 слотов
  const tools = document.createElement('div');
  tools.className = 'invTools';
  for (const [mode, icon, title] of [
    ['save', 'save', 'Сохранить: выберите слот'],
    ['clear', 'trash', 'Очистить: нажимайте на слоты'],
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
  inventoryEl.appendChild(tools);

  const slots = document.createElement('div');
  slots.className = 'invGrid saves';
  slots.style.gridTemplateColumns = 'repeat(' + inventory.columns + ', 40px)';
  for (let i = 0; i < SAVE_SLOTS; i++) {
    const filled = !!getSave(i);
    // Пульсируют все слоты, пока ждем выбора
    const c = cell('slot' + (filled ? ' filled' : '') + (savesMode ? ' pulse' : ''));
    if (filled) c.appendChild(pixelIcon('slot'));
    c.title = filled ? saveTitle(i) : 'Пустой слот ' + (i + 1);
    c.addEventListener('click', (e) => {
      e.stopPropagation();
      onSlotClick(i);
    });
    slots.appendChild(c);
  }
  inventoryEl.appendChild(slots);
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
    loadFromSlot(i);
  }
}

function setSavesMode(mode) {
  savesMode = mode;
  renderInventory();
}

function setInventoryOpen(open) {
  inventoryOpen = open;
  savesMode = null;
  if (open) {
    for (const k of Object.keys(keys)) keys[k] = false; // отпускаем зажатые клавиши
  }
  renderInventory();
}

// Свернутую панель раскрывает клик по любому месту. Раскрытая остается открытой,
// пока ее не свернут вручную: стрелкой, клавишей I или Esc
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

const hasItem = (id) => inventory.items.includes(id);

function addItem(id) {
  if (hasItem(id) || inventory.items.length >= inventory.size) return false;
  inventory.items.push(id);
  renderInventory();
  showToast('Взято: ' + ITEMS[id].name);
  playPickupClick(); // щелчок (src/player/footsteps.js)
  return true;
}

// Ключи от другой машины (когда сюжет даст их игроку): registerCarKey(car, 'Ключи от красной машины')
// заводит вещь в ITEMS и привязывает ее к машине; потом addItem(car.keyId) кладет ключи в инвентарь
function registerCarKey(car, name) {
  ITEMS[car.keyId] = { name, icon: 'keys' };
  return car.keyId;
}

function removeItem(id) {
  const i = inventory.items.indexOf(id);
  if (i >= 0) inventory.items.splice(i, 1);
  renderInventory();
}

function showToast(text, ms = 2200) {
  toastEl.textContent = text;
  toastEl.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.style.opacity = '0'), ms);
}

renderInventory();
