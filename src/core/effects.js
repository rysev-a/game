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
//   { elixir: 60 }                                    добавить эликсир герою (шкала снаряжения); отрицательное число — потратить
//   { wait: '8h' }                                    промотать игровое время ('90m', '8h', '1d')
//   { waitUntil: '22:00' }                            промотать время до этого часа (ближайшего)
//   { teleport: 'lab.basement' }                      перенести героя в место (с затемнением); { teleport: 'место', car: true } — вместе с его машиной, за рулем
//   { heal: 40 }                                      вылечить героя
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
