// src/core/effects.js
// ЯЗЫК ДЕЙСТВИЙ. Действие — объект с одним ключом; список выполняется по порядку: game.run([...]).
//
//   { give: 'analyzer' } { give: { elixir: 2 } }      положить в инвентарь
//   { take: 'copper' }   { take: { copper: 2 } }      забрать
//   { flag: 'x' } { unflag: 'x' }                     флаг
//   { add: { 'gen.fuel': 1 } } { set: { 'gen.fuel': 0 } }   счетчик
//   { reveal: 'Ф17' }                                 открыть факт («Выводы» журнала)
//   { start: '2.09' } { step: '2.08.forge' } { complete: '2.08' }
//   { track: '2.08' }                                 сделать квест текущим (метка на карте)
//   { toast: 'Текст' }                                короткое сообщение
//   { phone: { from: 'denis', text: '…' } }           сообщение на телефон (попадает и в журнал)
//   { dialog: '1.03.flash' }                          открыть узел диалога
//   { puzzle: '2.05.elixir' }                         открыть головоломку (src/core/puzzles.js)
//   { shop: '2.13.stalls' }                           открыть магазин: окно с товарами, клик по товару покупает (src/core/shops.js)
//   { elixir: 60 }                                    добавить эликсир герою (шкала снаряжения); отрицательное число — потратить
//   { wait: '8h' }                                    промотать игровое время ('90m', '8h', '1d')
//   { waitUntil: '22:00' }                            промотать время до этого часа (ближайшего)
//   { teleport: 'lab.basement' }                      перенести героя в место (с затемнением); { teleport: 'место', car: true } — вместе с его машиной, за рулем
//   { heal: 40 }                                      вылечить героя
//   { markDay: 'deal' }                               запомнить сегодняшние сутки (условие dayssince:deal>=1 — прошла полночь)
//   { breakCar: true } { repairCar: true }            машина героя хромает (еле едет) / починена
//   { playerCar: 'hyper' }                            подарить герою машину этого вида вместо его (и запомнить в сохранении)
//   { oldCar: true }                                  вернуть герою его старую машину (черная Almera Classic у дома) вместо любой подаренной
//   { resetClock: true }                              дата и время встают на начало истории (утро 18 сентября): последняя временная линия
//   { fuelEconomy: 50 }                               настроить расход: бензин машины героя кончается во столько раз медленнее
//   { weather: 'storm' }                              погода сюжета (src/quests/weather-story.js): gloom хмуро, storm ужасный ливень (скользко),
//                                                     sun солнце, auto солнце и редкие дожди (прибор их разгоняет), rain призванный ливень (роботы коротят), fog туман
//   { fuel: 0 } { fuel: 0.4 } { fuel: 'river' }       бак машины героя: доля 0…1; 'river' — ровно хватит от дома до реки (трасса, с запасом на манёвры)
//   { call: { from: 'denis', dialog: '1.03.call' } }  входящий звонок: телефон звонит, герой отвечает — открывается разговор (таймеры стоят),
//                                                     текст разговора остается в истории звонков телефона (состояние calls)
//   { kill: true }                                    героя убили: затемнение, он выбирается из машины и приходит в себя
//   { practice: { at, cars } }                        тренировка: выбрать машину и оказаться на месте at; { practiceEnd: true } — браслетом назад
//   { attempt: { at, cars, heading } }                новая попытка гонки: выбрать машину и стартовать на ней с места at (машина смотрит в heading)
//   { rewind: '4.12.f1' }                             вернуть квест к шагу (шаги, таймеры, бои и головоломки квеста — заново)
//   { heli: { from, goal, goalY, goalR, onGoal } }    управлять радиоуправляемым вертолетом (src/quests/heli.js)
//   { emit: 'name' } { emit: { name, ...данные } }    событие
//   { script: 'name' }                                именованный сценарий из кода (Core.scripts)
//   { if: 'has:x', then: [...], else: [...] }         ветвление
//
// Новое действие — одна запись: Core.defineEffect('имя', (arg, game) => { ... }).
// После самого внешнего run() ядро проверяет шаги квестов (game.settle()).

(function (root) {
  const Core = (root.Core = root.Core || {});

  Core.effectKinds = {};
  Core.defineEffect = (name, fn) => (Core.effectKinds[name] = fn);
  Core.scripts = {}; // аварийный люк: { script: 'name' } вызывает функцию отсюда

  // «copper» → { copper: 1 }; { copper: 2 } остается как есть
  const toStacks = (arg) => (typeof arg === 'string' ? { [arg]: 1 } : arg);

  const effects = {
    give: (arg, g) => {
      for (const [id, n] of Object.entries(toStacks(arg))) g.host.giveItem && g.host.giveItem(id, n);
    },
    take: (arg, g) => {
      for (const [id, n] of Object.entries(toStacks(arg))) g.host.takeItem && g.host.takeItem(id, n);
    },
    flag: (arg, g) => {
      g.state.flags[arg] = true;
      g.bump();
    },
    unflag: (arg, g) => {
      delete g.state.flags[arg];
      g.bump();
    },
    add: (arg, g) => {
      for (const [k, n] of Object.entries(arg)) g.state.counters[k] = (g.state.counters[k] || 0) + n;
      g.bump();
    },
    set: (arg, g) => {
      Object.assign(g.state.counters, arg);
      g.bump();
    },
    reveal: (arg, g) => g.reveal(arg),
    start: (arg, g) => g.start(arg),
    step: (arg, g) => {
      const [q, s] = Core.splitStepRef(arg);
      g.markStep(q, s);
    },
    complete: (arg, g) => g.complete(arg),
    track: (arg, g) => g.track(arg),
    toast: (arg, g) => g.host.toast && g.host.toast(arg),
    phone: (arg, g) => g.addMessage(arg.from, arg.text),
    dialog: (arg, g) => g.host.openDialog && g.host.openDialog(g.dialogueNode(arg)),
    puzzle: (arg, g) => g.host.openPuzzle && g.host.openPuzzle(g.puzzleSession(arg)),
    shop: (arg, g) => g.host.openShop && g.host.openShop(g.shopSession(arg)),
    elixir: (arg, g) => g.host.addElixir && g.host.addElixir(arg),
    wait: (arg, g) => g.host.advanceTime && g.host.advanceTime(Core.parseDuration(arg)),
    waitUntil: (arg, g) => {
      if (!g.host.advanceTime) return;
      const [hh, mm] = String(arg).split(':').map(Number);
      const nowMin = (g.host.hour ? g.host.hour() : (9 * 60 + g.now()) / 60 % 24) * 60;
      let delta = ((hh || 0) * 60 + (mm || 0) - nowMin + 1440) % 1440;
      if (delta < 1) delta += 1440;
      g.host.advanceTime(delta);
    },
    teleport: (arg, g) => g.host.teleport && (typeof arg === 'string' ? g.host.teleport(arg, {}) : g.host.teleport(arg.to, arg)),
    rewind: (arg, g) => g.rewind(arg),
    markDay: (arg, g) => {
      g.state.counters['day.' + arg] = Core.dayIndex(g);
      g.bump();
    },
    breakCar: (arg, g) => g.host.setCarLimp && g.host.setCarLimp(true),
    repairCar: (arg, g) => g.host.setCarLimp && g.host.setCarLimp(false),
    playerCar: (arg, g) => {
      g.state.playerCar = arg;
      g.bump();
      if (g.host.swapPlayerCar) g.host.swapPlayerCar(arg, true); // подаренная машина встает рядом с героем
    },
    oldCar: (arg, g) => {
      g.state.playerCar = null;
      g.bump();
      if (g.host.restoreOldCar) g.host.restoreOldCar();
    },
    resetClock: (arg, g) => {
      if (g.host.resetClock) g.host.resetClock();
      g.bump();
    },
    fuelEconomy: (arg, g) => {
      g.state.fuelEconomy = arg;
      g.bump();
      if (g.host.setFuelEconomy) g.host.setFuelEconomy(arg);
    },
    weather: (arg, g) => {
      g.state.weatherMode = arg;
      g.bump();
    },
    fuel: (arg, g) => g.host.setFuel && g.host.setFuel(arg),
    call: (arg, g) => {
      // Запись в истории звонков телефона: текст разговора дописывает окно телефона (src/quests/journal-ui.js)
      const record = { id: g.state.calls.length + 1, from: arg.from, at: g.now(), lines: [] };
      g.state.calls.push(record);
      g.bump();
      const node = g.dialogueNode(arg.dialog);
      if (g.host.incomingCall) g.host.incomingCall({ from: arg.from, node, record });
      else g.host.openDialog && g.host.openDialog(node);
    },
    kill: (arg, g) => g.host.killHero && g.host.killHero(),
    practice: (arg, g) => g.host.startPractice && g.host.startPractice(arg),
    practiceEnd: (arg, g) => g.host.endPractice && g.host.endPractice(),
    attempt: (arg, g) => g.host.startAttempt && g.host.startAttempt(arg),
    heli: (arg, g) => g.host.startHeli && g.host.startHeli(arg),
    heal: (arg, g) => g.host.heal && g.host.heal(arg),
    emit: (arg, g) => (typeof arg === 'string' ? g.emit(arg, {}) : g.emit(arg.name, arg)),
    script: (arg, g) => {
      const fn = Core.scripts[arg];
      if (fn) fn(g);
      else console.warn('Нет сценария: ' + arg);
    },
  };
  for (const k of Object.keys(effects)) Core.defineEffect(k, effects[k]);

  Core.attachEffects = function attachEffects(game) {
    let depth = 0;

    function runOne(e) {
      if (!e || typeof e !== 'object') {
        console.warn('Действие должно быть объектом:', e);
        return;
      }
      if ('if' in e) {
        run(game.check(e.if) ? e.then : e.else);
        return;
      }
      const key = Object.keys(e)[0];
      const fn = Core.effectKinds[key];
      if (!fn) {
        console.warn('Неизвестное действие: ' + key);
        return;
      }
      fn(e[key], game, e);
    }

    function run(list) {
      if (!list) return;
      depth++;
      try {
        for (const e of Array.isArray(list) ? list : [list]) runOne(e);
      } finally {
        depth--;
      }
      if (depth === 0) game.settle();
    }
    game.run = run;
  };
})(globalThis);
