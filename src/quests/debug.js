// src/quests/debug.js
// ОТЛАДОЧНЫЙ РЕЖИМ. Справа снизу значок терминала «>_»: открывает окно отладки.
//   • Выбор любого задания: игра переходит в такое состояние, как будто игрок сам дошел до этого задания. Все прежние задания по цепочке (src/content/quests)
//     выполнены, у героя то, что он получил по дороге (телефон, кошелек, рюкзак, приборы, оружие, чертежи, подаренная машина), открыты факты, выигранные бои и
//     решенные головоломки, деньги и эликсир соответствуют. Само выбранное задание запускается заново, как обычно (его onStart).
//   • Галочки: бесконечный бензин, бесконечный эликсир (settings.infiniteFuel, infiniteElixir) и кнопка «+1 минута к таймеру» (каждое нажатие — минута идущим таймерам).
// Набор вещей по заданиям — таблица KIT ниже: задания выдают вещи в диалогах с развилками и в окнах, а повторять их все здесь незачем.

(function () {
  const g = questGame;
  const reg = Core.registry;

  // ---------- Порядок заданий: цепочка start из onDone/onStep, начиная с первого ----------
  function chainOrder() {
    const startsOf = (def) => {
      const out = [];
      const walk = (o) => {
        if (!o || typeof o !== 'object') return;
        if (Array.isArray(o)) return o.forEach(walk);
        for (const [k, v] of Object.entries(o)) {
          if (k === 'start' && typeof v === 'string' && reg.quests[v]) out.push(v);
          else walk(v);
        }
      };
      walk({ onStart: def.onStart, onStep: def.onStep, onDone: def.onDone, nodes: def.nodes });
      return out;
    };
    const order = [];
    const queue = ['1.03'];
    while (queue.length) {
      const id = queue.shift();
      if (order.includes(id) || !reg.quests[id]) continue;
      order.push(id);
      queue.push(...startsOf(reg.quests[id]));
    }
    return order;
  }

  // ---------- Что получил герой по дороге ----------
  const weapons7 = ['pulse_laser', 'gauss_cannon', 'plasma_flamer', 'cryo_rifle', 'arc_discharger', 'tachyon_pistol', 'bazooka'];
  const KIT = {
    '1.03': { give: ['phone', 'wallet'], flags: ['carOpen'] }, // ключи вставлены в замок и пропали насовсем
    '1.06': { give: ['backpack'] },
    '2.02': { give: ['case_photos'] },
    '2.05': { give: ['regen'] },
    '2.06': { give: ['library_card'] },
    '2.08': { give: ['analyzer'] },
    '2.11': { give: ['invoice'] },
    '2.12': { give: ['bp_shotgun', 'bp_machinegun'], until: '2.13' }, // схемы уходят Михалычу в 2.13
    '2.13': { give: ['shotgun', 'minigun'] },
    '2.14': { give: weapons7 },
    '3.04': { give: ['bracelet'], flags: ['braceletCased'] },
    '3.05': { car: 'hyper', economy: 50 },
    '3.06': { give: ['weather'] },
    '3.12': { give: ['chips'] },
    '4.09': { give: ['plasma_gun'] },
    '4.12': { give: ['rc_remote'] },
    '4.11': { give: ['artifact'] },
  };
  const SIDE = { '3.06': { parent: '3.05', afterStep: 'talk' } }; // задание, которое запускается посреди другого

  // Все значения поля key в данных задания (reveal: 'Ф7', flag: 'x' и т. п. внутри любых списков действий)
  function collect(def, key) {
    const out = [];
    const walk = (o) => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) return o.forEach(walk);
      for (const [k, v] of Object.entries(o)) {
        if (k === key && typeof v === 'string') out.push(v);
        else if (k === key && key === 'add' && v && typeof v === 'object') out.push(v);
        else walk(v);
      }
    };
    walk(def);
    return out;
  }

  // ---------- Переход к заданию ----------
  function jumpTo(id) {
    const order = chainOrder();
    const side = SIDE[id];
    const target = side ? side.parent : id;
    const idx = order.indexOf(target);
    if (idx < 0) return;
    const before = order.slice(0, idx).filter((q) => q !== id); // выполненные
    const silent = (fn) => {
      const toast = window.showToast;
      const click = window.playPickupClick;
      window.showToast = () => {};
      if (click) window.playPickupClick = () => {};
      try {
        fn();
      } finally {
        window.showToast = toast;
        if (click) window.playPickupClick = click;
      }
    };

    // Состояние истории — как у героя, прошедшего все задания до этого
    const fresh = Core.freshState();
    for (const k of Object.keys(g.state)) delete g.state[k];
    Object.assign(g.state, fresh);
    const st = g.state;
    const done = new Set(before);
    for (const q of before) {
      const def = reg.quests[q];
      st.quests[q] = { state: 'done', steps: Object.fromEntries((def.steps || []).map((s) => [s.id, true])), startedAt: 0, doneAt: 0 };
      for (const f of collect(def, 'reveal')) st.facts[f] = true;
      for (const f of collect(def, 'flag')) if (f !== 'practicing') st.flags[f] = true;
      for (const name of Object.keys(def.fights || {})) st.fights[q + '.' + name] = true;
      for (const name of Object.keys(def.puzzles || {})) st.puzzles[q + '.' + name] = true;
      const kit = KIT[q];
      if (kit) for (const f of kit.flags || []) st.flags[f] = true;
    }
    if (side) {
      // Родительское задание идет, шаги до того, что запускает это задание, выполнены
      const pdef = reg.quests[side.parent];
      const steps = {};
      for (const s of pdef.steps) {
        steps[s.id] = true;
        if (s.id === side.afterStep) break;
      }
      st.quests[side.parent] = { state: 'active', steps, startedAt: 0 };
      for (const f of collect(pdef, 'reveal')) st.facts[f] = true;
    }
    // Деньги: 800 в начале, плюс все заработанные до задания, минус детали у торговца (2.13)
    let money = 800;
    for (const q of before) for (const a of collect(reg.quests[q], 'add')) if (a && typeof a.money === 'number') money += a.money;
    if (done.has('2.13')) money -= 3100;
    const moneyNow = Math.max(0, money);
    st.weatherMode = done.has('3.05') ? 'auto' : side ? 'storm' : 'gloom';
    const car = before.map((q) => KIT[q] && KIT[q].car).filter(Boolean).pop() || null;
    st.playerCar = car;
    st.fuelEconomy = before.some((q) => KIT[q] && KIT[q].economy) ? 50 : 1;
    if (done.has('3.05') || side) st.counters.dealDay = st.counters.dealDay || 0;

    // Вещи и приборы героя
    silent(() => {
      if (typeof holsterWeapon === 'function') holsterWeapon(true);
      const all = [...inventory.items, ...inventory.special, ...heroEquip.weapons, heroEquip.jacket, heroEquip.armor, heroEquip.boots].filter(Boolean);
      for (const it of all) removeItem(it);
      for (const d of [...heroDevices.worn]) takeOffDevice(d);
      const give = (item) => {
        if (DEVICES[item]) wearDevice(item, true);
        else addItem(item);
      };
      for (const q of before) {
        const kit = KIT[q];
        if (!kit) continue;
        for (const item of kit.give || []) {
          if (kit.until && done.has(kit.until)) continue;
          give(item);
        }
      }
    });
    st.counters.money = moneyNow; // кошелек при выдаче сам кладет стартовые деньги, поэтому сумма — после выдачи вещей
    // Подаренная машина встает на место героя; бак полный
    const c = garage.car;
    if (c) c.fuel = 1;
    heroStats.hp = heroStats.maxHp;
    heroStats.elixir = settings.infiniteElixir ? heroStats.maxElixir : st.facts['Ф13'] ? Math.min(heroStats.maxElixir, 500) : 0;
    renderEquipHud();
    if (typeof renderInventory === 'function') renderInventory();

    // Супер-окна для того, что уже есть, не показываем (герой их давно видел)
    for (const sid of Object.keys(reg.supers || {})) {
      try {
        if (g.check(reg.supers[sid].when)) st.supers[sid] = true;
      } catch (e) {
        /* условие супер-окна без нужных вещей */
      }
    }

    // Запуск самого задания
    const parent = side ? side.parent : null;
    if (parent) {
      st.tracked = parent;
      g.run([{ markDay: 'deal' }, { weather: 'storm' }, { start: id }]);
    } else {
      g.run([{ start: id }]);
    }
    st.tracked = id;
    g.bump();
    if (car && typeof questSwapPlayerCar === 'function') questSwapPlayerCar(car);
    if (g.state.fuelEconomy > 1 && garage.car) garage.car.fuelEconomy = g.state.fuelEconomy;
    g.settle();

    // Герой — к первому месту задания (с машиной рядом); если оно в другом мире, переходим туда
    const step = g.currentStep(id);
    const markerOf = (s) => (s && s.marker ? (typeof s.marker === 'object' ? s.marker.main || Object.values(s.marker)[0] : s.marker) : null);
    let mid = markerOf(step);
    if (!mid || !reg.places[mid]) mid = 'city.inc1'; // метка не место (например, «к ближайшему роботу»): к въезду в город
    const place = reg.places[mid];
    window.showToast && showToast('Отладка: задание «' + reg.quests[id].title + '» (' + id + ')', 3500);
    if (GAME_LOCATION === 'main' && (place.location || 'main') === 'main') {
      questHost.teleport(mid, { car: false });
      if (garage.car && !drivingCar) {
        garage.car.x = place.x + 8;
        garage.car.z = place.z + 8;
        garage.car.speed = 0;
      }
    } else {
      // место в другом мире или герой сейчас в другом мире: возвращаемся в основной мир к ближайшему месту
      questTravelToLocation('main', { to: (place.location || 'main') === 'main' ? mid : 'village.home', opts: { car: false } });
    }
  }

  // ---------- Окно ----------
  const css = document.createElement('style');
  css.textContent = `
    #dbgBtn { position: fixed; right: 12px; bottom: 12px; z-index: 40; width: 42px; height: 38px; padding: 0; border-radius: 9px; cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.4); background: rgba(10, 14, 20, 0.72); color: #8fe3a8; font: 700 15px var(--font, monospace); letter-spacing: -0.04em; }
    #dbgBtn:hover { background: rgba(60, 60, 60, 0.85); }
    body.touch #dbgBtn { bottom: 150px; }
    #dbgPanel { position: fixed; right: 12px; bottom: 58px; z-index: 41; width: min(380px, calc(100vw - 24px)); box-sizing: border-box; padding: 12px 14px;
      border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.4); background: rgba(10, 14, 20, 0.96); color: #e8ecf2; font: var(--fs-text, 13px) var(--font, monospace); display: none; }
    #dbgPanel.on { display: block; }
    #dbgPanel h3 { margin: 0 0 8px; font-size: var(--fs-h2, 16px); color: #8fe3a8; }
    #dbgPanel select { width: 100%; box-sizing: border-box; padding: 6px; border-radius: 6px; background: #1a2030; color: inherit; border: 1px solid rgba(255,255,255,0.3); font: inherit; }
    #dbgPanel button.go { margin-top: 8px; width: 100%; padding: 8px; border-radius: 7px; border: 1px solid #8fe3a8; background: rgba(63, 163, 91, 0.35); color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
    #dbgPanel button.go:hover { background: rgba(63, 163, 91, 0.6); }
    #dbgPanel button.plus { margin-top: 10px; width: 100%; padding: 7px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.4); background: rgba(143, 208, 255, 0.2); color: #fff; font: inherit; cursor: pointer; }
    #dbgPanel button.plus:hover { background: rgba(143, 208, 255, 0.4); }
    #dbgPanel label { display: flex; gap: 8px; align-items: center; margin-top: 10px; cursor: pointer; }
    #dbgPanel .hint { margin-top: 8px; font-size: var(--fs-small, 11px); opacity: 0.6; line-height: 1.35; }
  `;
  document.head.appendChild(css);

  const btn = document.createElement('button');
  btn.id = 'dbgBtn';
  btn.title = 'Отладка';
  btn.textContent = '>_';
  document.body.appendChild(btn);
  const panel = document.createElement('div');
  panel.id = 'dbgPanel';
  document.body.appendChild(panel);
  for (const ev of ['mousedown', 'touchstart']) {
    btn.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    panel.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
  }

  function build() {
    const order = chainOrder();
    const title = (id) => id + ' · ' + reg.quests[id].title;
    panel.innerHTML = '<h3>Отладка</h3>' +
      '<select>' + order.map((id) => '<option value="' + id + '">' + title(id) + '</option>').join('') + '</select>' +
      '<button class="go">Перейти к заданию</button>' +
      '<div class="hint">Прежние задания будут выполнены, вещи и приборы выданы, как будто вы дошли до этого задания сами.</div>' +
      '<label><input type="checkbox" data-k="infiniteFuel"> Бесконечный бензин</label>' +
      '<label><input type="checkbox" data-k="infiniteElixir"> Бесконечный эликсир</label>' +
      '<button class="plus">+1 минута к таймеру</button>';
    const sel = panel.querySelector('select');
    const cur = g.state.tracked;
    if (cur && order.includes(cur)) sel.value = cur;
    panel.querySelector('button.go').addEventListener('click', () => {
      setOpen(false);
      jumpTo(sel.value);
    });
    panel.querySelector('button.plus').addEventListener('click', addMinute);
    for (const cb of panel.querySelectorAll('input[type=checkbox]')) {
      cb.checked = !!settings[cb.dataset.k];
      cb.addEventListener('change', () => setSetting(cb.dataset.k, cb.checked));
    }
  }

  let open = false;
  function setOpen(v) {
    open = v;
    if (v) build();
    panel.classList.toggle('on', v);
  }
  btn.addEventListener('click', () => setOpen(!open));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && open) {
      e.stopImmediatePropagation();
      setOpen(false);
    }
  }, true);

  // Бесконечный эликсир: шкала всегда полная
  setInterval(() => {
    if (settings.infiniteElixir && heroStats.elixir < heroStats.maxElixir) {
      heroStats.elixir = heroStats.maxElixir;
      if (typeof renderEquipHud === 'function') renderEquipHud();
    }
  }, 250);

  // Кнопка «+1 минута к таймеру»: каждое нажатие добавляет минуту всем идущим таймерам заданий
  function addMinute() {
    let n = 0;
    for (const k of Object.keys(g.state.timers)) {
      if (k.includes(':') || !(g.state.timers[k] > 0)) continue; // предупреждения и уже сработавшие таймеры не трогаем
      g.state.timers[k] += 60;
      n++;
    }
    g.bump();
    window.showToast && showToast(n ? 'Таймер: +1 минута' : 'Сейчас нет идущего таймера', 1800);
  }

  window.questDebugJump = jumpTo;
})();
