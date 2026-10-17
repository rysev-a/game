// src/core/game.js
// ЯДРО ИСТОРИИ. createGame({ registry, host }) собирает одну игру: состояние (story), проверку условий,
// выполнение действий, события и квесты. Мир (инвентарь, положение игрока, часы, сообщения на экране) ядро знает
// только через объект host — его дает игра (src/quests/host.js) или тест (src/core/testhost.js). Все методы host
// необязательны:
//
//   now()                  игровых минут с начала истории
//   hour()                 час суток 0..24
//   itemCount(id)          сколько вещей в инвентаре;  giveItem(id, n), takeItem(id, n)
//   playerPos()            { x, z } игрока;  zone() — id зоны;  inside(), driving(), raining()
//   toast(text)            короткое сообщение;  openDialog(node) — показать узел диалога
//
// Состояние story — один объект из литералов, он целиком сохраняется (snapshot / restore).
//   flags, counters, facts { id: минута }, quests { id: { state, steps, startedAt, doneAt } },
//   talked, nodes, inspected, once, messages, tracked
//
// Квест идет по шагам строго по порядку: шаг выполнен, когда его условие done стало правдой, а после последнего
// шага квест завершается (onDone). Условия перепроверяет settle(): после каждого действия и события и раз в
// несколько кадров из tick() (условия вроде near: зависят от положения игрока).

(function (root) {
  const Core = (root.Core = root.Core || {});

  Core.STORY_VERSION = 1;
  Core.gameExtensions = []; // дополнения к игре: диалоги, журнал (они подключают себя сами)

  Core.freshState = () => ({
    flags: {},
    counters: {},
    facts: {},
    quests: {},
    talked: {},
    nodes: {},
    inspected: {},
    puzzles: {}, // решенные головоломки: { '2.05.elixir': true }
    fights: {}, // выигранные бои: { '2.11.flash': true }
    timers: {}, // таймеры шагов: { '2.12.drive': минута_конца | -1 (уже сработал) }, warn — какие предупреждения прозвучали
    once: {},
    messages: [],
    tracked: null,
    fuelEconomy: 1, // во сколько раз машина героя тратит бензин медленнее (настроили у Рустама)
    playerCar: null, // вид машины, которую герою подарили вместо своей (id из VEHICLE_KINDS): она встает на место при загрузке
  });

  Core.createGame = function createGame(opts = {}) {
    const game = {
      registry: opts.registry || Core.registry,
      host: opts.host || {},
      state: Core.freshState(),
      version: 0, // растет при любом изменении состояния: интерфейс по нему узнает, что пора обновиться
    };
    const { registry, host } = game;
    const warn = (msg) => console.warn(msg);

    game.now = () => (host.now ? host.now() : 0);
    game.bump = () => game.version++;
    Core.attachConditions(game);
    Core.attachEffects(game);

    // Расстояние от игрока до места (null, если положения или места нет)
    game.placeDistance = (id) => {
      const place = registry.places[id];
      const pos = host.playerPos && host.playerPos();
      if (!place || !pos) return null;
      return Math.hypot(pos.x - place.x, pos.z - place.z);
    };
    game.nearPlace = (id) => {
      const d = game.placeDistance(id);
      return d !== null && d <= (registry.places[id].r || 10);
    };

    // ---------- Квесты ----------
    const questOf = (id) => registry.quests[id];
    const record = (id) => game.state.quests[id];
    game.isActive = (id) => !!record(id) && record(id).state === 'active';
    game.isDone = (id) => !!record(id) && record(id).state === 'done';
    game.stepDone = (qid, sid) => !!record(qid) && !!record(qid).steps[sid];

    // Первый невыполненный шаг активного квеста
    game.currentStep = (id) => {
      const q = questOf(id);
      if (!q || !game.isActive(id)) return null;
      return (q.steps || []).find((s) => !record(id).steps[s.id]) || null;
    };

    game.start = (id) => {
      const q = questOf(id);
      if (!q) {
        warn('Нет квеста: ' + id);
        return false;
      }
      if (record(id)) return false;
      game.state.quests[id] = { state: 'active', steps: {}, startedAt: game.now() };
      if (!game.state.tracked) game.state.tracked = id;
      game.bump();
      if (host.toast) host.toast('Новое задание: ' + q.title);
      game.run(q.onStart);
      return true;
    };

    game.markStep = (qid, sid) => {
      const q = questOf(qid);
      const rec = record(qid);
      if (!q || !rec || rec.state !== 'active' || rec.steps[sid]) return false;
      if (!(q.steps || []).some((s) => s.id === sid)) {
        warn('Нет шага ' + sid + ' в квесте ' + qid);
        return false;
      }
      rec.steps[sid] = true;
      game.bump();
      if (host.toast) host.toast('Задание обновлено: ' + q.title);
      game.run(q.onStep && q.onStep[sid]);
      return true;
    };

    game.complete = (id) => {
      const q = questOf(id);
      const rec = record(id);
      if (!q || !rec || rec.state === 'done') return false;
      rec.state = 'done';
      rec.doneAt = game.now();
      if (game.state.tracked === id) game.state.tracked = null;
      game.bump();
      if (host.toast) host.toast('Задание выполнено: ' + q.title);
      game.run(q.onDone);
      // Если выполненный квест был текущим, а следующий не выдан, текущим становится любой активный
      if (!game.state.tracked) game.state.tracked = Object.keys(game.state.quests).find(game.isActive) || null;
      return true;
    };

    game.track = (id) => {
      if (!game.isActive(id)) return;
      game.state.tracked = id;
      game.bump();
    };

    // Метка текущего шага отслеживаемого квеста: место на карте или null
    game.currentMarker = () => {
      const step = game.state.tracked && game.currentStep(game.state.tracked);
      const place = step && step.marker && registry.places[step.marker];
      return place ? { id: place.id, x: place.x, z: place.z, r: place.r || 10, name: place.name || '' } : null;
    };

    // Взаимодействие с объектом мира, которое перехватывает активный квест. Объект — строка вида 'station:laptop'
    // (станция здания с id, src/engine/buildings.js). В квесте: interactions: [{ on, if, do }]. Возвращает true,
    // если квест взял взаимодействие на себя (обычное действие объекта тогда пропускается)
    game.interact = (target) => {
      for (const q of Object.values(registry.quests)) {
        if (!game.isActive(q.id)) continue;
        for (const it of q.interactions || []) {
          if (it.on !== target || !game.check(it.if)) continue;
          game.run(it.do);
          return true;
        }
      }
      return false;
    };

    // Бой выигран (все враги боя побеждены): запоминаем и выполняем onWin. Сами бои — в квесте: fights (src/core/fights.js)
    game.winFight = (ref) => {
      if (game.state.fights[ref]) return false;
      game.state.fights[ref] = true;
      game.bump();
      const found = Core.resolveFight && Core.resolveFight(registry, ref);
      game.run(found && found.def.onWin);
      game.settle();
      return true;
    };

    // ---------- Факты и сообщения ----------
    game.reveal = (id) => {
      if (game.state.facts[id] !== undefined) return;
      if (!registry.facts[id]) warn('Нет факта: ' + id);
      game.state.facts[id] = game.now();
      game.bump();
      if (host.toast) host.toast('Новая запись в журнале: выводы');
    };

    game.addMessage = (from, text) => {
      game.state.messages.push({ from, text, at: game.now() });
      game.bump();
      const ch = registry.characters[from];
      if (host.toast) host.toast('Сообщение от ' + (ch ? ch.name : from) + ': ' + text);
    };

    // ---------- События ----------
    // Механики сообщают, что произошло: talk { who, node }, inspect { id }, а также любые свои.
    game.emit = (name, data = {}) => {
      const s = game.state;
      if (name === 'talk') {
        s.talked[data.who] = true;
        s.nodes[data.who + '.' + data.node] = true;
      } else if (name === 'inspect') {
        s.inspected[data.id] = true;
      }
      game.bump();
      game.settle();
    };

    // ---------- Проверка квестов ----------
    let settling = false;
    let again = false;

    // Таймеры. Таймер шага (step.timer = { limit, warn, onExpire, repeat }) стартует, когда шаг становится текущим; таймер квеста
    // (quest.timer = { limit, start, until, warn, onExpire, repeat }) идет, пока start истинно (по умолчанию — с начала квеста), а until
    // ложно. Тикает в игровых минутах. Сработал — выполняются onExpire; без repeat он сработает один раз, с repeat запустится заново
    // (погоня: не успели — вернули на старт и дали еще попытку). Предупреждения warn: { '60%': [действия] } — когда прошло столько времени.
    // В разговоре, журнале, головоломке и меню время таймера стоит (host.paused).
    let timerNow = null;
    function timerList() {
      const out = [];
      for (const q of Object.values(registry.quests)) {
        if (!game.isActive(q.id)) continue;
        if (q.timer && game.check(q.timer.start) && !(q.timer.until && game.check(q.timer.until))) {
          out.push({ key: q.id + '.timer', def: q.timer, quest: q.id, text: q.title });
        }
        const step = game.currentStep(q.id);
        if (step && step.timer) out.push({ key: q.id + '.' + step.id, def: step.timer, quest: q.id, text: step.text });
      }
      return out;
    }
    function timers() {
      const now = game.now();
      const dt = timerNow === null ? 0 : now - timerNow;
      timerNow = now;
      const paused = host.paused && host.paused();
      const t = game.state.timers;
      for (const { key, def } of timerList()) {
        const total = Core.parseDuration(def.limit);
        if (t[key] === undefined) {
          t[key] = now + total;
          game.bump();
        }
        if (t[key] < 0) continue; // уже сработал
        if (paused) {
          t[key] += dt;
          continue;
        }
        const left = t[key] - now;
        for (const [mark, effects] of Object.entries(def.warn || {})) {
          const wkey = key + ':' + mark;
          if (t[wkey] || left > total * (1 - parseFloat(mark) / 100)) continue;
          t[wkey] = -1;
          game.run(effects);
        }
        if (left <= 0) {
          if (def.repeat) {
            delete t[key];
            for (const mark of Object.keys(def.warn || {})) delete t[key + ':' + mark];
          } else t[key] = -1;
          game.bump();
          game.run(def.onExpire);
          again = true;
        }
      }
    }

    // Идущий сейчас таймер отслеживаемого (или любого активного) квеста: { key, left, total, text } или null
    game.currentTimer = () => {
      const list = timerList();
      list.sort((a, b) => (b.quest === game.state.tracked) - (a.quest === game.state.tracked));
      for (const { key, def, text } of list) {
        const end = game.state.timers[key];
        if (end > 0) return { key, left: Math.max(0, end - game.now()), total: Core.parseDuration(def.limit), text };
      }
      return null;
    };

    // Вернуть квест к шагу: он и все следующие снова не выполнены, их таймеры и бои квеста сбрасываются (после неудачи — начать заново)
    game.rewind = (ref) => {
      const [qid, sid] = Core.splitStepRef(ref);
      const q = registry.quests[qid];
      const rec = record(qid);
      if (!q || !rec) return;
      const from = (q.steps || []).findIndex((s) => s.id === sid);
      if (from < 0) return;
      for (const st of q.steps.slice(from)) {
        delete rec.steps[st.id];
        for (const k of Object.keys(game.state.timers)) if (k === qid + '.' + st.id || k.startsWith(qid + '.' + st.id + ':')) delete game.state.timers[k];
      }
      for (const k of Object.keys(game.state.fights)) if (k.startsWith(qid + '.')) delete game.state.fights[k];
      for (const k of Object.keys(game.state.puzzles)) if (k.startsWith(qid + '.')) delete game.state.puzzles[k];
      game.bump();
    };

    // Контрольные точки: quest.checkpoints = { counter, order: [места], when, r, driving } — пока when истинно, герой (за рулем, если
    // driving) проезжает точки по порядку: у каждой проезд прибавляет счетчик counter, и он показывает, сколько точек пройдено
    function checkpoints() {
      for (const q of Object.values(registry.quests)) {
        const def = q.checkpoints;
        if (!def || !game.isActive(q.id) || !game.check(def.when)) continue;
        if (def.driving && !(host.driving && host.driving())) continue;
        const idx = game.state.counters[def.counter] || 0;
        const id = def.order[idx];
        if (id === undefined) continue;
        const d = game.placeDistance(id);
        if (d === null || d > (def.r || registry.places[id].r || 12)) continue;
        game.state.counters[def.counter] = idx + 1;
        game.bump();
        if (host.toast) host.toast('Контрольная точка ' + (idx + 1) + ' из ' + def.order.length);
        again = true;
      }
    }

    // Кнопки квеста в журнале: quest.actions = [{ id, text, if, do }] — действия, которые игрок запускает сам, когда они доступны
    game.actionsOf = (qid) => {
      const q = registry.quests[qid];
      return q && game.isActive(qid) ? (q.actions || []).filter((a) => game.check(a.if)).map((a) => ({ id: a.id, text: a.text })) : [];
    };
    game.doAction = (qid, id) => {
      const q = registry.quests[qid];
      const a = q && game.isActive(qid) && (q.actions || []).find((x) => x.id === id);
      if (!a || !game.check(a.if)) return false;
      game.run(a.do);
      return true;
    };

    function progress() {
      timers();
      checkpoints();
      for (const q of Object.values(registry.quests)) {
        if (record(q.id) || !q.autoStart) continue;
        if (game.check(q.autoStart) && game.check(q.requires)) {
          game.start(q.id);
          again = true;
        }
      }
      for (const q of Object.values(registry.quests)) {
        if (!game.isActive(q.id) || !(q.steps || []).length) continue;
        const step = game.currentStep(q.id);
        if (!step) {
          game.complete(q.id);
          again = true;
        } else if (step.done !== undefined && game.check(step.done)) {
          game.markStep(q.id, step.id);
          again = true;
        }
      }
    }

    game.settle = () => {
      if (settling) {
        again = true;
        return;
      }
      settling = true;
      try {
        let guard = 0;
        do {
          again = false;
          progress();
        } while (again && ++guard < 100);
        if (guard >= 100) warn('settle: квесты зациклились');
      } finally {
        settling = false;
      }
    };

    // Вызывается каждый кадр; условия шагов проверяются раз в несколько кадров
    let frame = 0;
    game.tick = () => {
      if (++frame % 10 === 0) game.settle();
    };

    // ---------- Сохранение ----------
    game.snapshot = () => ({ version: Core.STORY_VERSION, ...JSON.parse(JSON.stringify(game.state)) });

    // Состояние из снимка; без снимка (старое сохранение) история начинается заново
    game.restore = (data) => {
      const fresh = Core.freshState();
      const saved = data && typeof data === 'object' ? data : {};
      for (const key of Object.keys(fresh)) {
        if (saved[key] !== undefined) fresh[key] = JSON.parse(JSON.stringify(saved[key]));
      }
      game.state = fresh;
      game.bump();
      game.settle();
    };

    for (const extend of Core.gameExtensions) extend(game);
    return game;
  };
})(globalThis);
