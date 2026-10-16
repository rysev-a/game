// src/player/equipment.js
// СНАРЯЖЕНИЕ ГЕРОЯ и НИЖНЯЯ ПАНЕЛЬ, как в классических играх (docs/mechanics/equipment.md).
// Внизу по центру экрана: здоровье, сколько эликсира с собой и ячейки того, что сейчас на герое:
//   браслет · броня · ботинки · оружие ×5
// Надеть: открыть инвентарь (I) и кликнуть по вещи — она уходит из сетки в свою ячейку (если ячейка
// занята — вещи меняются местами). Снять: клик по ячейке внизу — вещь возвращается в инвентарь.
// Подобранное оружие само встает в свободную ячейку оружия. R переключает оружие только между этими
// пятью ячейками, Q достает / убирает то, что в активной ячейке.
// Браслет — надеваемый прибор (src/player/devices.js): ячейка показывает прибор на запястье.
// Броня и ботинки — вещи с ITEMS[id].slot = 'armor' | 'boots' (их пока нет, ячейки пустые).
//
// API:
//   heroStats              — { hp, maxHp, elixir, maxElixir }; после изменения — renderEquipHud()
//   spendElixir(n)         — списать эликсир (может быть дробным); false — не хватает
//   heroEquip              — { armor, boots, weapons: [id|null ×5], active } (браслет — в heroDevices)
//   equipSlotOf(id)        — 'bracelet' | 'armor' | 'boots' | 'weapon' | null
//   isEquipped(id), equipItem(id), unequipSlot(slot, i)
//   weaponSlotIds()        — оружие в ячейках по порядку (без пустых)

const heroStats = { hp: 100, maxHp: 100, elixir: 0, maxElixir: 100 };
const WEAPON_SLOTS = 5; // ячеек оружия на нижней панели
const heroEquip = { armor: null, boots: null, weapons: Array(WEAPON_SLOTS).fill(null), active: 0 };

// Прибор на запястье (браслет возврата) — это ячейка «браслет»
const wristDevice = () => heroDevices.worn.find((id) => /^wrist/.test(DEVICES[id].wear || ''));

function equipSlotOf(id) {
  if (DEVICES[id] && /^wrist/.test(DEVICES[id].wear || '')) return 'bracelet';
  if (isWeapon(id)) return 'weapon';
  const slot = ITEMS[id] && ITEMS[id].slot;
  return slot === 'armor' || slot === 'boots' ? slot : null;
}

const isEquipped = (id) =>
  !!id && (heroEquip.armor === id || heroEquip.boots === id || heroEquip.weapons.includes(id) || isWorn(id));

const weaponSlotIds = () => heroEquip.weapons.filter(Boolean);

// Убрать вещь из сетки инвентаря без сообщений (она переходит в ячейку)
function takeFromGrid(id) {
  const i = inventory.items.indexOf(id);
  if (i >= 0) inventory.items.splice(i, 1);
}

// Вернуть снятую вещь в сетку. false — инвентарь полон
function putToGrid(id) {
  if (inventory.items.includes(id)) return true;
  if (inventory.items.length >= inventory.size) {
    showToast('Инвентарь полон — снять некуда');
    return false;
  }
  inventory.items.push(id);
  return true;
}

// Надеть вещь из инвентаря в ее ячейку. Занятая ячейка: старая вещь возвращается в инвентарь
function equipItem(id) {
  const slot = equipSlotOf(id);
  if (!slot || isEquipped(id)) return false;
  if (slot === 'bracelet') {
    const old = wristDevice();
    if (old) {
      takeOffDevice(old);
      inventory.items.push(old); // место освобождается тем, что браслет уходит из сетки
    }
    takeFromGrid(id);
    wearDevice(id);
  } else if (slot === 'weapon') {
    let i = heroEquip.weapons.indexOf(null);
    if (i < 0) i = heroEquip.active; // все заняты — меняем активное
    const old = heroEquip.weapons[i];
    if (old) {
      if (heroWeapon.id === old) holsterWeapon(true);
      inventory.items.push(old);
    }
    takeFromGrid(id);
    heroEquip.weapons[i] = id;
    showToast('Оружие в ячейке ' + (i + 1) + ': ' + WEAPONS[id].name, 2000);
  } else {
    const old = heroEquip[slot];
    if (old) inventory.items.push(old);
    takeFromGrid(id);
    heroEquip[slot] = id;
    showToast('Надето: ' + ITEMS[id].name, 2000);
  }
  playPickupClick();
  renderInventory();
  renderEquipHud();
  return true;
}

// Снять вещь из ячейки обратно в инвентарь. slot — 'bracelet' | 'armor' | 'boots' | 'weapon' (i — номер)
function unequipSlot(slot, i = 0) {
  const id = slot === 'bracelet' ? wristDevice() : slot === 'weapon' ? heroEquip.weapons[i] : heroEquip[slot];
  if (!id || !putToGrid(id)) return false;
  if (slot === 'bracelet') takeOffDevice(id);
  else if (slot === 'weapon') {
    if (heroWeapon.id === id) holsterWeapon();
    heroEquip.weapons[i] = null;
  } else heroEquip[slot] = null;
  showToast('Снято: ' + (ITEMS[id] || DEVICES[id]).name, 1800);
  playPickupClick();
  renderInventory();
  renderEquipHud();
  return true;
}

// Подобранное оружие само встает в свободную ячейку (зовет addItem, src/player/inventory.js)
function autoEquip(id) {
  if (!isWeapon(id)) return;
  const i = heroEquip.weapons.indexOf(null);
  if (i < 0) return; // ячейки заняты — оружие остается в инвентаре
  takeFromGrid(id);
  heroEquip.weapons[i] = id;
  renderEquipHud();
}

// Вещь пропала совсем (removeItem) — освобождаем ячейку
function dropEquipped(id) {
  if (heroEquip.armor === id) heroEquip.armor = null;
  if (heroEquip.boots === id) heroEquip.boots = null;
  const i = heroEquip.weapons.indexOf(id);
  if (i >= 0) heroEquip.weapons[i] = null;
  renderEquipHud();
}

// Активная ячейка оружия — та, где оружие в руках (зовет drawWeapon)
function setActiveWeaponSlot(id) {
  const i = heroEquip.weapons.indexOf(id);
  if (i >= 0 && heroEquip.active !== i) {
    heroEquip.active = i;
    renderEquipHud();
  }
}

// Потратить эликсир (дробное число, супероружие тратит понемногу). false — не хватает, ничего не списано
function spendElixir(amount) {
  if (heroStats.elixir < amount) return false;
  heroStats.elixir = Math.max(0, heroStats.elixir - amount);
  renderEquipHud();
  return true;
}

// Для сохранения (src/player/saves.js)
const captureEquip = () => ({ armor: heroEquip.armor, boots: heroEquip.boots, weapons: [...heroEquip.weapons], active: heroEquip.active });

function applyEquip(data) {
  const ok = (id) => (id && ITEMS[id] ? id : null);
  heroEquip.armor = ok(data && data.armor);
  heroEquip.boots = ok(data && data.boots);
  heroEquip.weapons = [...Array(WEAPON_SLOTS).keys()].map((i) => ok(data && data.weapons && data.weapons[i]));
  heroEquip.active = (data && data.active) || 0;
  // Надетое не лежит в сетке (в старых сохранениях вещь могла быть и там, и на герое)
  inventory.items = inventory.items.filter((id) => !isEquipped(id));
  renderEquipHud();
}

// ---------- Значки ячеек и показателей ----------
Object.assign(PIXEL_ART, {
  heart: {
    palette: { r: '#e0483a', R: '#ff9a8a', d: '#9a2a22' },
    rows: [
      '............',
      '............',
      '..rr....rr..',
      '.rRRr..rrrr.',
      '.rRrrrrrrrr.',
      '.rrrrrrrrrr.',
      '.rrrrrrrrrd.',
      '..rrrrrrrd..',
      '...rrrrrd...',
      '....rrrd....',
      '.....rd.....',
      '............',
    ],
  },
  elixir: {
    // колба с эликсиром: стекло, пробка, светящаяся жидкость
    palette: { k: '#8a5a32', g: '#cfe6ee', e: '#a05cf0', E: '#e4ccff' },
    rows: [
      '.....kk.....',
      '....kkkk....',
      '.....gg.....',
      '.....gg.....',
      '....g..g....',
      '...g....g...',
      '..g.eeee.g..',
      '..geEeeeeg..',
      '..geEeeeeg..',
      '..geeeeeeg..',
      '...geeeeg...',
      '....gggg....',
    ],
  },
  armor: {
    // бронежилет
    palette: { a: '#6a7a5a', A: '#9aaa86', d: '#3e4a34' },
    rows: [
      '............',
      '..aa....aa..',
      '.aAaa..aaAa.',
      '.aAaaaaaaAa.',
      '.aaaaaaaaaa.',
      '..aaaddaaa..',
      '..aAaddaAa..',
      '..aaaddaaa..',
      '..aAaddaAa..',
      '..aaaddaaa..',
      '..dddddddd..',
      '............',
    ],
  },
  boots: {
    palette: { b: '#6a4a2e', B: '#9a7048', s: '#2a2420' },
    rows: [
      '............',
      '...bbbb.....',
      '...bBbb.....',
      '...bBbb.....',
      '...bbbb.....',
      '...bBbb.....',
      '...bBbbb....',
      '...bbbbbbb..',
      '..bBbbbbbbb.',
      '..bbbbbbbbb.',
      '..sssssssss.',
      '............',
    ],
  },
  weaponSlot: {
    // пустая ячейка оружия: силуэт пистолета
    palette: { g: '#c8ced6' },
    rows: [
      '............',
      '............',
      '............',
      '..ggggggggg.',
      '..gggggggggg',
      '..ggggggg...',
      '...ggg.g....',
      '...ggg......',
      '...ggg......',
      '...ggg......',
      '............',
      '............',
    ],
  },
});

// ---------- Нижняя панель ----------
const equipHudStyle = document.createElement('style');
equipHudStyle.textContent = `
#equipHud { position:fixed; left:50%; bottom:10px; transform:translateX(-50%); z-index:12; display:flex;
  align-items:center; gap:10px; padding:6px 10px; background:rgba(10,14,20,0.62);
  border:1px solid rgba(255,255,255,0.3); border-radius:8px; font:13px sans-serif; color:#fff; user-select:none; }
#equipHud .px { width:28px; height:28px; image-rendering:pixelated; pointer-events:none; }
#equipHud .stat { display:flex; align-items:center; gap:6px; }
#equipHud .stat .px { width:22px; height:22px; }
#equipHud .statBar { width:110px; height:12px; background:rgba(255,255,255,0.15); border-radius:3px; overflow:hidden; }
#equipHud .statFill { height:100%; }
#equipHud .num { min-width:22px; font-weight:bold; }
#equipHud .group { display:flex; gap:4px; padding-left:10px; border-left:1px solid rgba(255,255,255,0.2); }
#equipHud .slot { width:40px; height:40px; box-sizing:border-box; border:1px solid rgba(255,255,255,0.28);
  border-radius:4px; background:rgba(255,255,255,0.07); display:flex; align-items:center; justify-content:center; }
#equipHud .slot.empty .px { opacity:0.22; filter:grayscale(1); }
#equipHud .slot.filled { cursor:pointer; }
#equipHud .slot.filled:hover { background:rgba(255,255,255,0.2); }
#equipHud .slot.active { border-color:#ffd84a; }
#equipHud .slot.active.drawn { background:rgba(255,216,74,0.25); }
#inventory .invCell.wearable { cursor:pointer; }
#inventory .invCell.wearable:hover { background:rgba(255,255,255,0.2); }
#mouseHint { bottom:72px !important; }
`;
document.head.appendChild(equipHudStyle);

const equipHudEl = document.createElement('div');
equipHudEl.id = 'equipHud';
document.body.appendChild(equipHudEl);

function equipSlotCell(icon, id, title, onClick, extra = '') {
  const c = document.createElement('div');
  c.className = 'slot ' + (id ? 'filled' : 'empty') + extra;
  c.appendChild(pixelIcon(id ? (ITEMS[id] || {}).icon || id : icon));
  const name = id && (ITEMS[id] || DEVICES[id]).name;
  c.title = id ? title + ': ' + name + ' — клик снимает' : title + ': пусто — наденьте из инвентаря (I, клик по вещи)';
  if (id) c.addEventListener('click', onClick);
  return c;
}

function statBar(icon, title, value, max, color) {
  const box = document.createElement('div');
  box.className = 'stat';
  box.title = title + ': ' + Math.ceil(value) + ' из ' + max;
  box.appendChild(pixelIcon(icon));
  const bar = document.createElement('div');
  bar.className = 'statBar';
  const fill = document.createElement('div');
  fill.className = 'statFill';
  fill.style.width = Math.round(Math.max(0, Math.min(1, value / max)) * 100) + '%';
  fill.style.background = color;
  bar.appendChild(fill);
  box.appendChild(bar);
  const num = document.createElement('span');
  num.className = 'num';
  num.textContent = Math.ceil(value);
  box.appendChild(num);
  return box;
}

function renderEquipHud() {
  equipHudEl.innerHTML = '';

  // Здоровье — красная полоса, эликсир — фиолетовая, рядом число
  equipHudEl.appendChild(statBar('heart', 'Здоровье', heroStats.hp, heroStats.maxHp, '#e0483a'));
  equipHudEl.appendChild(statBar('elixir', 'Эликсир', heroStats.elixir, heroStats.maxElixir, '#a05cf0'));

  const gear = document.createElement('div');
  gear.className = 'group';
  gear.appendChild(equipSlotCell('bracelet', wristDevice(), 'Браслет', () => unequipSlot('bracelet')));
  gear.appendChild(equipSlotCell('armor', heroEquip.armor, 'Броня', () => unequipSlot('armor')));
  gear.appendChild(equipSlotCell('boots', heroEquip.boots, 'Ботинки', () => unequipSlot('boots')));
  equipHudEl.appendChild(gear);

  const guns = document.createElement('div');
  guns.className = 'group';
  heroEquip.weapons.forEach((id, i) => {
    const active = i === heroEquip.active ? ' active' + (id && heroWeapon.id === id ? ' drawn' : '') : '';
    guns.appendChild(equipSlotCell('weaponSlot', id, 'Оружие ' + (i + 1), () => unequipSlot('weapon', i), active));
  });
  equipHudEl.appendChild(guns);
}

renderEquipHud();
