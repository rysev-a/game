// src/player/equipment.js
// СНАРЯЖЕНИЕ ГЕРОЯ и НИЖНЯЯ ПАНЕЛЬ, как в классических играх (docs/mechanics/equipment.md).
// Внизу по центру экрана: здоровье, сколько эликсира с собой и восемь АКТИВНЫХ ячеек (1–8): оружие и вещи под рукой.
//
// КОМПЬЮТЕР. Надеть и разложить — только перетаскиванием: в раскрытом инвентаре (I) справа от сетки видна
// панель снаряжения — браслет · куртка · бронежилет · ботинки и те же восемь активных ячеек. Вещь тянут из сетки
// в ее ячейку (занятая ячейка — вещи меняются местами), из ячейки обратно в сетку — снять, между активными
// ячейками — переставить. Клик по ячейке внизу (или цифра 1–8):
//   оружие — сразу в руках, боевой режим (еще клик по оружию в руках — убрать);
//   вещь (гаечный ключ, отмычка, дискета...) — «взята в руку»: курсор становится ее значком, следующий клик
//     по машине, человеку или предмету рядом применяет ее (ITEM_USES); Esc или правая кнопка — отмена.
// ТЕЛЕФОН (src/engine/touch.js) — как раньше: касание вещи в инвентаре надевает ее, касание ячейки снимает.
// R переключает оружие только между активными ячейками, Q достает / убирает то, что в активной ячейке оружия.
// Браслет — надеваемый прибор (src/player/devices.js): ячейка показывает прибор на запястье.
// Куртка, бронежилеты и ботинки — вещи с ITEMS[id].slot = 'jacket' | 'armor' | 'boots'; ITEMS[id].armor — какую
// долю урона вещь снимает (heroArmorFactor, src/engine/enemy-attacks.js).
//
// API:
//   heroStats              — { hp, maxHp, elixir, maxElixir }; после изменения — renderEquipHud()
//   spendElixir(n)         — списать эликсир (может быть дробным); false — не хватает
//   heroEquip              — { jacket, armor, boots, weapons: [id|null ×8] — активные ячейки, active } (браслет — в heroDevices)
//   equipSlotOf(id)        — 'bracelet' | 'jacket' | 'armor' | 'boots' | 'weapon' | null
//   isEquipped(id), equipItem(id), unequipSlot(slot, i)
//   weaponSlotIds()        — оружие в активных ячейках по порядку (без пустых и без вещей)
//   activeWeaponId()       — оружие активной ячейки (или первое из ячеек)
//   heroArmorFactor()      — множитель урона от надетой брони (1 — без брони)
//   addItemUse(item, use)  — что делает вещь, примененная с нижней панели (см. ITEM_USES ниже)

const heroStats = { hp: 100, maxHp: 100, elixir: 0, maxElixir: 900 }; // шкала эликсира — до 900
const WEAPON_SLOTS = 8; // активных ячеек на нижней панели
const heroEquip = { jacket: null, armor: null, boots: null, weapons: Array(WEAPON_SLOTS).fill(null), active: 0 };
const WEAR_SLOTS = ['jacket', 'armor', 'boots'];

// Броня: куртка и бронежилеты трех классов
Object.assign(ITEMS, {
  jacket: { name: 'Кожаная куртка', icon: 'jacket', slot: 'jacket', armor: 0.1, desc: 'Плотная кожа. Смягчает удары и царапины: урон −10%.' },
  vest1: { name: 'Бронежилет 1 класса', icon: 'vest1', slot: 'armor', armor: 0.15, desc: 'Мягкий, скрытого ношения. Держит нож и осколки: урон −15%.' },
  vest2: { name: 'Бронежилет 2 класса', icon: 'vest2', slot: 'armor', armor: 0.25, desc: 'Держит пистолетную пулю: урон −25%.' },
  vest3: { name: 'Бронежилет 3 класса', icon: 'vest3', slot: 'armor', armor: 0.35, desc: 'Стальные пластины, держит автоматную пулю: урон −35%.' },
  lockpick: { name: 'Отмычка', icon: 'lockpick', desc: 'Набор тонких крючков. Положите на нижнюю панель, кликните по ней, потом по закрытой машине.' },
  floppy: { name: 'Дискета', icon: 'floppy', desc: 'Старая дискета с данными. Прочитать — на компьютере: в библиотеке или на ноутбуке Веры.' },
});

// Прибор на запястье (браслет возврата) — это ячейка «браслет»
// Ячейка «браслет» появляется только когда браслет у героя: надет или лежит в инвентаре; в начале игры ее нет
const braceletSlotShown = () => !!wristDevice() || inventory.items.some((id) => equipSlotOf(id) === 'bracelet');
const wristDevice = () => heroDevices.worn.find((id) => /^wrist/.test(DEVICES[id].wear || ''));

function equipSlotOf(id) {
  if (DEVICES[id] && /^wrist/.test(DEVICES[id].wear || '')) return 'bracelet';
  if (isWeapon(id)) return 'weapon';
  const slot = ITEMS[id] && ITEMS[id].slot;
  return WEAR_SLOTS.includes(slot) ? slot : null;
}

// В активную ячейку можно положить оружие или любую вещь, которую не надевают (кроме рюкзака)
const hotbarOk = (id) => !!ITEMS[id] && (isWeapon(id) || (!equipSlotOf(id) && !DEVICES[id] && id !== 'backpack'));

const isEquipped = (id) =>
  !!id && (WEAR_SLOTS.some((s) => heroEquip[s] === id) || heroEquip.weapons.includes(id) || isWorn(id));

const weaponSlotIds = () => heroEquip.weapons.filter((id) => id && isWeapon(id));
const activeWeaponId = () => {
  const id = heroEquip.weapons[heroEquip.active];
  return id && isWeapon(id) ? id : weaponSlotIds()[0];
};

// Сколько урона доходит до героя: каждая надетая вещь с armor снимает свою долю
function heroArmorFactor() {
  let f = 1;
  for (const s of WEAR_SLOTS) {
    const it = heroEquip[s] && ITEMS[heroEquip[s]];
    if (it && it.armor) f *= 1 - it.armor;
  }
  return f;
}

// Убрать вещь из сетки инвентаря без сообщений (она переходит в ячейку). Возвращает, где она лежала
function takeFromGrid(id) {
  const i = inventory.items.indexOf(id);
  if (i >= 0) inventory.items.splice(i, 1);
  return i;
}

// Вернуть снятую вещь в сетку (at — на место, иначе в конец). false — инвентарь полон
function putToGrid(id, at = -1) {
  if (inventory.items.includes(id)) return true;
  if (inventory.items.length >= inventory.size) {
    showToast('Инвентарь полон — снять некуда');
    return false;
  }
  if (at >= 0) inventory.items.splice(at, 0, id);
  else inventory.items.push(id);
  return true;
}

function equipChanged() {
  playPickupClick();
  renderInventory();
  renderEquipHud();
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
    putToHotbar(id, i);
    showToast('Оружие в ячейке ' + (i + 1) + ': ' + WEAPONS[id].name, 2000);
  } else {
    const old = heroEquip[slot];
    const at = takeFromGrid(id);
    if (old) inventory.items.splice(Math.max(0, at), 0, old);
    heroEquip[slot] = id;
    showToast('Надето: ' + ITEMS[id].name, 2000);
  }
  equipChanged();
  return true;
}

// Положить вещь из сетки в активную ячейку i; то, что там было, встает в сетку на ее место
function putToHotbar(id, i) {
  const old = heroEquip.weapons[i];
  if (old) {
    if (heroWeapon.id === old) holsterWeapon(true);
    if (armedItem === old) disarmItem();
  }
  const at = takeFromGrid(id);
  if (old) inventory.items.splice(Math.max(0, at), 0, old);
  heroEquip.weapons[i] = id;
}

// Снять вещь из ячейки обратно в инвентарь. slot — 'bracelet' | 'jacket' | 'armor' | 'boots' | 'weapon' (i — номер).
// at — на какое место сетки (перетащили на ячейку), иначе в конец
function unequipSlot(slot, i = 0, at = -1) {
  const id = slot === 'bracelet' ? wristDevice() : slot === 'weapon' ? heroEquip.weapons[i] : heroEquip[slot];
  if (!id || !putToGrid(id, at)) return false;
  if (slot === 'bracelet') takeOffDevice(id);
  else if (slot === 'weapon') {
    if (heroWeapon.id === id) holsterWeapon();
    if (armedItem === id) disarmItem();
    heroEquip.weapons[i] = null;
  } else heroEquip[slot] = null;
  showToast('Снято: ' + (ITEMS[id] || DEVICES[id]).name, 1800);
  equipChanged();
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
  for (const s of WEAR_SLOTS) if (heroEquip[s] === id) heroEquip[s] = null;
  const i = heroEquip.weapons.indexOf(id);
  if (i >= 0) heroEquip.weapons[i] = null;
  if (armedItem === id) disarmItem();
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
const captureEquip = () => ({
  jacket: heroEquip.jacket, armor: heroEquip.armor, boots: heroEquip.boots, weapons: [...heroEquip.weapons], active: heroEquip.active,
});

function applyEquip(data) {
  const ok = (id) => (id && ITEMS[id] ? id : null);
  for (const s of WEAR_SLOTS) heroEquip[s] = ok(data && data[s]);
  heroEquip.weapons = [...Array(WEAPON_SLOTS).keys()].map((i) => ok(data && data.weapons && data.weapons[i]));
  heroEquip.active = (data && data.active) || 0;
  disarmItem();
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

// Куртка, бронежилеты трех классов (чем выше класс — тем темнее и с пластинами), отмычка, дискета с данными
{
  const vestRows = PIXEL_ART.armor.rows;
  Object.assign(PIXEL_ART, {
    jacket: {
      // кожаная куртка: коричневая, с молнией и воротником
      palette: { k: '#6a4228', K: '#9a6a40', d: '#c8ced6', s: '#3e2616' },
      rows: [
        '............',
        '...KK..KK...',
        '..kkKddKkk..',
        '.kkkkddkkkk.',
        'kkkkkddkkkkk',
        'kKkkkddkkkKk',
        'kKkkkddkkkKk',
        'kKkkkddkkkKk',
        'kKkkkddkkkKk',
        'kkkkkddkkkkk',
        'ss.kkddkk.ss',
        '...ssssss...',
      ],
    },
    vest1: { palette: { a: '#7a8794', A: '#aab6c2', d: '#4a545e' }, rows: vestRows },
    vest2: { palette: { a: '#6a7a5a', A: '#9aaa86', d: '#3e4a34' }, rows: vestRows },
    vest3: {
      palette: { a: '#3e434a', A: '#6c7480', d: '#22262b', p: '#9aa3ad' },
      rows: [
        '............',
        '..aa....aa..',
        '.aAaa..aaAa.',
        '.aAaaaaaaAa.',
        '.aappppppaa.',
        '..appddppa..',
        '..appddppa..',
        '..appddppa..',
        '..aAaddaAa..',
        '..aaaddaaa..',
        '..dddddddd..',
        '............',
      ],
    },
    lockpick: {
      // две тонкие отмычки с деревянной ручкой
      palette: { g: '#c8ced6', G: '#8a929c', b: '#8a5a32', B: '#b87a48' },
      rows: [
        '..........g.',
        '.........gg.',
        '........g...',
        '.......g..G.',
        '......g..G..',
        '.....g..G...',
        '....g..G....',
        '...bbbG.....',
        '..bBbb......',
        '.bBbb.......',
        '.bbb........',
        '............',
      ],
    },
    floppy: { palette: { b: '#8a2a2a', s: '#c8ced6', l: '#f1ede2', k: '#1c1f26' }, rows: PIXEL_ART.save.rows },
  });
}

// ---------- Применить вещь с нижней панели ----------
// Вещь из активной ячейки «в руке» (armedItem): курсор — ее значок, следующий клик по сцене ищет цель под курсором
// (машина, человек, предмет, часть здания) и пробует ITEM_USES[вещь]. Не нашлось — станция рядом с героем,
// которая принимает вещь: { use: { floppy: () => ... } } в записи interactables или станции здания (src/engine/buildings.js).
//   addItemUse('wrench', { match: (t) => t.kind === 'car', act: (t) => true })
//   t — { kind: 'car' | 'person' | 'item' | 'object', car?, person?, id?, info, dist }
//   act возвращает true — применили (вещь возвращается в ячейку), false — не вышло (подсказку act показал сам, вещь в руке)
const ITEM_USES = {};
const itemUseReach = 6; // дальше этого от героя (по центру объекта) не дотянуться
let armedItem = null;

function addItemUse(item, use) {
  (ITEM_USES[item] = ITEM_USES[item] || []).push(use);
}

addItemUse('wrench', {
  match: (t) => t.kind === 'car',
  act: (t) => {
    const c = t.car;
    if (c.broken) {
      repairVehicle(c);
      showToast(c.kind.name + ' снова на ходу: гайки подтянуты, всё на месте', 3000);
      return true;
    }
    showToast(c.isPlayerCar ? 'Подтянули гайки и проверили колеса — машина в порядке' : 'С этой машиной всё в порядке', 2500);
    return c.isPlayerCar;
  },
});
addItemUse('lockpick', {
  match: (t) => t.kind === 'car',
  act: (t) => {
    const c = t.car;
    if (c.locked) {
      showToast('Служебный замок отмычкой не взять', 2500);
      return false;
    }
    if (!carBlockedReason(c) || c.broken) {
      showToast(c.broken ? 'Замок тут ни при чем: машина подбита' : 'Эта машина и так открыта', 2200);
      return false;
    }
    c.open = true;
    showToast('Щелк — замок поддался. Машина открыта, можно сесть (E)', 3000);
    return true;
  },
});

// Что под курсором: ближайшее попадание луча в машину, человека, вещь или часть здания
function itemUseTarget(mouse) {
  const sources = [];
  for (const c of cars) sources.push({ object: c.mesh, t: () => ({ kind: 'car', car: c, info: carInfo(c) }) });
  const people = (arr) => {
    for (const p of arr) if (p.mesh) sources.push({ object: p.mesh, t: () => ({ kind: 'person', person: p, info: personInfo(p) }) });
  };
  people(npcs);
  for (const def of interiors) people(def.people);
  for (const p of pickables) if (p.id) sources.push({ object: p.mesh, t: () => ({ kind: 'item', id: p.id, info: itemInfo(p.id) }) });
  for (const h of hoverInfos) {
    sources.push({ object: h.object, t: () => ({ kind: 'object', object: h.object, info: typeof h.info === 'function' ? h.info() : h.info }) });
  }
  const byObject = new Map();
  for (const s of sources) if (!byObject.has(s.object) && hoverShown(s.object)) byObject.set(s.object, s.t);
  if (!byObject.size) return null;
  hoverRaycaster.setFromCamera(mouse, camera);
  const pos = new THREE.Vector3();
  for (const hit of hoverRaycaster.intersectObjects([...byObject.keys()], true)) {
    if (!hit.object.isMesh || !hoverShown(hit.object) || hoverSeeThrough(hit.object)) continue;
    for (let o = hit.object; o; o = o.parent) {
      if (!byObject.has(o)) continue;
      const t = byObject.get(o)();
      // Игрок в центре сцены: расстояние до объекта — длина его мирового положения по земле
      o.getWorldPosition(pos);
      t.dist = t.kind === 'object' ? hit.distance - camera.position.distanceTo(player.position) : Math.hypot(pos.x, pos.z);
      return t;
    }
  }
  return null;
}

function applyArmedItem(mouse) {
  const id = armedItem;
  const name = ITEMS[id].name;
  const t = mouse ? itemUseTarget(mouse) : null;
  const use = t && (ITEM_USES[id] || []).find((u) => u.match(t));
  if (use) {
    if (t.dist > itemUseReach) return showToast('Слишком далеко — подойдите ближе', 1800);
    if (use.act(t)) disarmItem();
    return;
  }
  // Станция рядом (компьютер, верстак), которая принимает эту вещь
  const st = interactables.find((it) => it.use && it.use[id] && !!it.driving === !!drivingCar && it.near());
  if (st) {
    if (st.use[id]() !== false) disarmItem();
    return;
  }
  const what = t && t.info ? t.info.name : '';
  showToast(name + (what ? ' — «' + what + '»: не пригодится' : ': тут не на что применить') + '. Esc или правая кнопка — убрать', 2600);
}

// Курсор — значок вещи вдвое крупнее, с темным контуром, чтобы читался на любом фоне
function itemCursorURL(icon) {
  const art = PIXEL_ART[icon] || PIXEL_ART.keys;
  const s = 2;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 12 * s + 4;
  const c = cv.getContext('2d');
  const fill = (dx, dy, color) => {
    art.rows.forEach((row, y) => {
      for (let x = 0; x < 12; x++) {
        if (!art.palette[row[x]]) continue;
        c.fillStyle = color || art.palette[row[x]];
        c.fillRect(2 + x * s + dx, 2 + y * s + dy, s, s);
      }
    });
  };
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) fill(dx, dy, '#0b0e12');
  fill(0, 0);
  return cv.toDataURL();
}
const itemCursorStyle = document.createElement('style');
document.head.appendChild(itemCursorStyle);

function armItem(id) {
  if (heroWeapon.id) holsterWeapon(true); // вещь в руке — оружие убрано
  if (typeof clickMoveStop === 'function') clickMoveStop();
  armedItem = id;
  itemCursorStyle.textContent =
    'body.itemArmed canvas { cursor: url(' + itemCursorURL(ITEMS[id].icon) + ') 14 14, crosshair !important; }';
  document.body.classList.add('itemArmed');
  showToast(ITEMS[id].name + ': кликните, к чему применить. Esc или правая кнопка — убрать', 3000);
  renderEquipHud();
}

function disarmItem() {
  if (!armedItem) return;
  armedItem = null;
  document.body.classList.remove('itemArmed');
  renderEquipHud();
}

// Клик по ячейке внизу (или цифра 1–8): оружие — в руки и в бой, вещь — в руку, чтобы применить
function useHotbarSlot(i) {
  const id = heroEquip.weapons[i];
  if (!id) return;
  if (isWeapon(id)) {
    disarmItem();
    if (heroWeapon.id === id) return holsterWeapon();
    if (drawWeapon(id)) {
      if (typeof requestMouseLook === 'function') requestMouseLook();
    } else if (!canUseWeapon()) showToast('Сейчас оружие не достать', 1600);
    return;
  }
  if (armedItem === id) disarmItem();
  else if (!drivingCar && !dialogueOpen && !settingsOpen) armItem(id);
}

if (!touchUI) {
  // Слушатель на фазе захвата: пока вещь в руке, клик по сцене — применить, а не идти или брать вещь
  renderer.domElement.addEventListener(
    'mousedown',
    (e) => {
      if (!armedItem || (e.button !== 0 && e.button !== 2)) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (e.button === 2) return disarmItem();
      const mouse = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      applyArmedItem(mouse);
    },
    true,
  );
  renderer.domElement.addEventListener('contextmenu', (e) => {
    if (armedItem) e.preventDefault();
  });
  window.addEventListener('keydown', (e) => {
    if (e.repeat || settingsOpen || dialogueOpen) return;
    if (e.code === 'Escape' && armedItem) disarmItem();
    const n = /^Digit([1-8])$/.exec(e.code);
    if (n) useHotbarSlot(Number(n[1]) - 1);
  });
}

// Вещь в руке, а герой сел в машину, начал разговор или достал оружие клавишей — убираем
setInterval(() => {
  if (armedItem && (drivingCar || dialogueOpen || heroWeapon.id)) disarmItem();
}, 200);

// ---------- Перетаскивание (только компьютер) ----------
// Источник — { id, from: 'grid', index } или { id, from: 'slot', slot, i }. Ячейки, куда можно бросить, подсвечиваются
let dragSrc = null;
let equipHudDirty = false; // пока тянем, ячейки не перерисовываем (иначе браузер потеряет перетаскиваемое)

function makeDraggable(el, src) {
  el.draggable = true;
  el.addEventListener('dragstart', (e) => {
    dragSrc = src;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', src.id);
    const img = el.querySelector('.px');
    if (img) e.dataTransfer.setDragImage(img, 14, 14);
    el.classList.add('dragging');
    for (const z of document.querySelectorAll('.dropZone')) z.classList.toggle('canDrop', z.accepts(src));
  });
  el.addEventListener('dragend', () => {
    dragSrc = null;
    for (const z of document.querySelectorAll('.dropZone')) z.classList.remove('canDrop', 'over');
    el.classList.remove('dragging');
    if (equipHudDirty) {
      equipHudDirty = false;
      equipHudKey = '';
      renderInventory();
      renderEquipHud();
    }
  });
}

function makeDropZone(el, accepts, onDrop) {
  el.classList.add('dropZone');
  el.accepts = (src) => !!src && accepts(src);
  el.addEventListener('dragover', (e) => {
    if (!el.accepts(dragSrc)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    el.classList.add('over');
  });
  el.addEventListener('dragleave', () => el.classList.remove('over'));
  el.addEventListener('drop', (e) => {
    if (!el.accepts(dragSrc)) return;
    e.preventDefault();
    e.stopPropagation();
    const src = dragSrc;
    dragSrc = null;
    equipHudDirty = false;
    onDrop(src);
  });
}

// Положить в активную ячейку i: из сетки — вещь встает туда (старая — в сетку), из другой ячейки — меняются местами
function dropToHotbar(src, i) {
  const w = heroEquip.weapons;
  if (src.from === 'slot') {
    if (src.i === i) return;
    [w[i], w[src.i]] = [w[src.i], w[i]];
    if (heroEquip.active === src.i) heroEquip.active = i;
    else if (heroEquip.active === i) heroEquip.active = src.i;
    playPickupClick();
    renderEquipHud();
    return;
  }
  putToHotbar(src.id, i);
  showToast('В ячейке ' + (i + 1) + ': ' + ITEMS[src.id].name, 1600);
  equipChanged();
}

const hotbarDropAccepts = (i) => (src) =>
  hotbarOk(src.id) && (src.from === 'grid' || (src.slot === 'weapon' && src.i !== i));

// Ячейки сетки инвентаря (зовет renderInventory на компьютере): вещи тянутся, на ячейку можно бросить снятое
// с героя (встанет на это место) или переложить вещь внутри сетки
function invCellDnD(c, index, id) {
  if (id) makeDraggable(c, { id, from: 'grid', index });
  makeDropZone(
    c,
    (src) => src.from === 'slot' || (src.from === 'grid' && src.index !== index),
    (src) => {
      const at = Math.min(index, inventory.items.length);
      if (src.from === 'slot') return unequipSlot(src.slot, src.i, at);
      const items = inventory.items;
      items.splice(src.index, 1);
      items.splice(Math.min(index, items.length), 0, src.id);
      renderInventory();
    },
  );
}

// ---------- Значки ячеек и стили ----------
const equipHudStyle = document.createElement('style');
equipHudStyle.textContent = `
#equipHud { position:fixed; left:50%; bottom:10px; transform:translateX(-50%); z-index:12; display:flex;
  align-items:center; gap:10px; padding:6px 10px; background:rgba(10,14,20,0.62);
  border:1px solid rgba(255,255,255,0.3); border-radius:8px; font: var(--fs-text) var(--font); color:#fff; user-select:none; }
#equipHud .px, #equipPanel .px { width:28px; height:28px; image-rendering:pixelated; pointer-events:none; }
#equipHud .stat { display:flex; align-items:center; gap:6px; }
#equipHud .stat .px { width:22px; height:22px; }
#equipHud .statBar { width:110px; height:12px; background:rgba(255,255,255,0.15); border-radius:3px; overflow:hidden; }
#equipHud .statFill { height:100%; }
#equipHud .num { min-width:22px; font-weight:bold; }
#equipHud .group { display:flex; gap:4px; padding-left:10px; border-left:1px solid rgba(255,255,255,0.2); }
#equipHud .slot, #equipPanel .slot { position:relative; width:40px; height:40px; box-sizing:border-box; border:1px solid rgba(255,255,255,0.28);
  border-radius:4px; background:rgba(255,255,255,0.07); display:flex; align-items:center; justify-content:center; }
#equipHud .slot.empty .px, #equipPanel .slot.empty .px { opacity:0.22; filter:grayscale(1); }
#equipHud .slot.filled, #equipPanel .slot.filled { cursor:pointer; }
#equipHud .slot.filled:hover, #equipPanel .slot.filled:hover { background:rgba(255,255,255,0.2); }
#equipHud .slot.active, #equipPanel .slot.active { border-color:#ffd84a; }
#equipHud .slot.active.drawn, #equipPanel .slot.active.drawn { background:rgba(255,216,74,0.25); }
#equipHud .slot.armed, #equipPanel .slot.armed { border-color:#4ee6ff; background:rgba(78,230,255,0.22); }
#equipHud .slot .key, #equipPanel .slot .key { position:absolute; left:3px; top:1px; font: bold var(--fs-small) var(--font); opacity:0.55; pointer-events:none; }
#equipPanel { display:none; flex-direction:column; gap:6px; padding:8px; border:1px solid rgba(255,255,255,0.3); border-radius:8px;
  background:rgba(10,14,20,0.62); color:#fff; font: var(--fs-text) var(--font); user-select:none; }
#equipPanel.on { display:flex; }
#equipPanel .label { font-size: var(--fs-small); opacity:0.7; margin-top:2px; }
#equipPanel .row { display:grid; grid-template-columns:repeat(4, 40px); gap:4px; }
#equipPanel .defense { font-size: var(--fs-small); opacity:0.8; }
.dropZone.canDrop { border-color:rgba(120,220,255,0.75) !important; }
.dropZone.over { background:rgba(120,220,255,0.3) !important; }
.dragging { opacity:0.4; }
#inventory .invCell[draggable=true] { cursor:grab; }
#inventory .invCell.wearable { cursor:pointer; }
#inventory .invCell.wearable:hover { background:rgba(255,255,255,0.2); }
#mouseHint { bottom:72px !important; }
`;
document.head.appendChild(equipHudStyle);

const equipHudEl = document.createElement('div');
equipHudEl.id = 'equipHud';
document.body.appendChild(equipHudEl);

// Панель снаряжения справа от раскрытого инвентаря (компьютер)
const equipPanelEl = document.createElement('div');
equipPanelEl.id = 'equipPanel';
inventoryEl.after(equipPanelEl);

const slotTitles = { bracelet: 'Браслет', jacket: 'Куртка', armor: 'Бронежилет', boots: 'Ботинки' };
const slotIcons = { bracelet: 'bracelet', jacket: 'jacket', armor: 'armor', boots: 'boots' };
const slotItem = (slot) => (slot === 'bracelet' ? wristDevice() : heroEquip[slot]);
const itemName = (id) => (ITEMS[id] || DEVICES[id]).name;

// Ячейка: значок вещи или бледный силуэт пустой
function slotCell(icon, id, extra = '') {
  const c = document.createElement('div');
  c.className = 'slot ' + (id ? 'filled' : 'empty') + extra;
  c.appendChild(pixelIcon(id ? (ITEMS[id] || {}).icon || id : icon));
  return c;
}

// Телефон: клик по ячейке снимает вещь (src/engine/touch.js собирает из этих групп свою панель)
function equipSlotCell(icon, id, title, onClick, extra = '') {
  const c = slotCell(icon, id, extra);
  c.title = id ? title + ': ' + itemName(id) + ' — клик снимает' : title + ': пусто — наденьте из инвентаря (I, клик по вещи)';
  if (id) c.addEventListener('click', onClick);
  return c;
}

// Компьютер: ячейка надеваемого — тянуть в сетку, чтобы снять; бросить сюда вещь из сетки, чтобы надеть
function gearCell(slot) {
  const id = slotItem(slot);
  const c = slotCell(slotIcons[slot], id);
  const armor = id && ITEMS[id] && ITEMS[id].armor;
  c.title = id
    ? slotTitles[slot] + ': ' + itemName(id) + (armor ? ' (урон −' + Math.round(armor * 100) + '%)' : '') + ' — перетащите в инвентарь, чтобы снять'
    : slotTitles[slot] + ': пусто — перетащите сюда из инвентаря';
  if (id) makeDraggable(c, { id, from: 'slot', slot });
  makeDropZone(c, (src) => src.from === 'grid' && equipSlotOf(src.id) === slot, (src) => equipItem(src.id));
  return c;
}

// Компьютер: активная ячейка i (внизу и в панели) — клик применяет, перетаскивание раскладывает
function hotbarCell(i) {
  const id = heroEquip.weapons[i];
  let extra = '';
  if (id && isWeapon(id) && i === heroEquip.active) extra = ' active' + (heroWeapon.id === id ? ' drawn' : '');
  if (id && armedItem === id) extra = ' armed';
  const c = slotCell('weaponSlot', id, extra);
  const key = document.createElement('span');
  key.className = 'key';
  key.textContent = i + 1;
  c.appendChild(key);
  if (id) {
    c.title = (i + 1) + ': ' + itemName(id) + (isWeapon(id) ? ' — клик: в бой' : ' — клик: применить к чему-то');
    c.addEventListener('click', (e) => {
      e.stopPropagation();
      useHotbarSlot(i);
    });
    makeDraggable(c, { id, from: 'slot', slot: 'weapon', i });
  } else c.title = (i + 1) + ': пусто — перетащите сюда оружие или вещь из инвентаря (I)';
  makeDropZone(c, hotbarDropAccepts(i), (src) => dropToHotbar(src, i));
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

function renderEquipPanel() {
  const on = !touchUI && inventoryOpen;
  equipPanelEl.classList.toggle('on', on);
  if (!on) return;
  if (dragSrc) {
    equipHudDirty = true;
    return;
  }
  equipPanelEl.innerHTML = '';
  const label = (text) => {
    const l = document.createElement('div');
    l.className = 'label';
    l.textContent = text;
    equipPanelEl.appendChild(l);
  };
  label('Снаряжение');
  const gear = document.createElement('div');
  gear.className = 'row';
  for (const s of ['bracelet', 'jacket', 'armor', 'boots']) if (s !== 'bracelet' || braceletSlotShown()) gear.appendChild(gearCell(s));
  equipPanelEl.appendChild(gear);
  const defense = document.createElement('div');
  defense.className = 'defense';
  defense.textContent = 'Защита: ' + Math.round((1 - heroArmorFactor()) * 100) + '%';
  equipPanelEl.appendChild(defense);
  label('Активные (1–8)');
  for (let r = 0; r < 2; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    for (let i = r * 4; i < r * 4 + 4; i++) row.appendChild(hotbarCell(i));
    equipPanelEl.appendChild(row);
  }
}

// Полосы здоровья и эликсира без перерисовки ячеек
function updateEquipStats() {
  equipHudEl.querySelectorAll('.stat').forEach((s, k) => {
    const v = k ? [heroStats.elixir, heroStats.maxElixir, 'Эликсир'] : [heroStats.hp, heroStats.maxHp, 'Здоровье'];
    s.querySelector('.statFill').style.width = Math.round(Math.max(0, Math.min(1, v[0] / v[1])) * 100) + '%';
    s.querySelector('.num').textContent = Math.ceil(v[0]);
    s.title = v[2] + ': ' + Math.ceil(v[0]) + ' из ' + v[1];
  });
}

let equipHudKey = '';
function renderEquipHud() {
  // Ячейки перерисовываем, только когда в них что-то поменялось: иначе клик, пришедшийся на перерисовку
  // (здоровье восстанавливается каждую секунду), терялся бы. Пока тянем вещь — тоже нельзя: браузер потеряет ее
  const key = JSON.stringify([captureEquip(), wristDevice(), heroWeapon.id, armedItem, inventoryOpen]);
  if (equipHudEl.firstChild && (dragSrc || key === equipHudKey)) {
    if (dragSrc && key !== equipHudKey) equipHudDirty = true;
    updateEquipStats();
    return;
  }
  equipHudKey = key;
  equipHudEl.innerHTML = '';

  // Здоровье — красная полоса, эликсир — фиолетовая, рядом число
  equipHudEl.appendChild(statBar('heart', 'Здоровье', heroStats.hp, heroStats.maxHp, '#e0483a'));
  equipHudEl.appendChild(statBar('elixir', 'Эликсир', heroStats.elixir, heroStats.maxElixir, '#a05cf0'));

  if (touchUI) {
    const gear = document.createElement('div');
    gear.className = 'group';
    if (braceletSlotShown()) gear.appendChild(equipSlotCell('bracelet', wristDevice(), 'Браслет', () => unequipSlot('bracelet')));
    for (const s of WEAR_SLOTS) gear.appendChild(equipSlotCell(slotIcons[s], heroEquip[s], slotTitles[s], () => unequipSlot(s)));
    equipHudEl.appendChild(gear);
    const guns = document.createElement('div');
    guns.className = 'group';
    heroEquip.weapons.forEach((id, i) => {
      const active = i === heroEquip.active ? ' active' + (id && heroWeapon.id === id ? ' drawn' : '') : '';
      guns.appendChild(equipSlotCell('weaponSlot', id, 'Ячейка ' + (i + 1), () => unequipSlot('weapon', i), active));
    });
    equipHudEl.appendChild(guns);
    return;
  }

  const bar = document.createElement('div');
  bar.className = 'group';
  for (let i = 0; i < WEAPON_SLOTS; i++) bar.appendChild(hotbarCell(i));
  equipHudEl.appendChild(bar);
  renderEquipPanel();
}

renderEquipHud();
