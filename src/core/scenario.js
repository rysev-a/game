// src/core/scenario.js
// СЦЕНАРИИ ПРОХОЖДЕНИЯ. Проверка «квест проходится» тоже данные, а не код:
//
//   defineScenario('1.03', {
//     title: 'У моста проходится',
//     done: ['1.03'],                                 // квесты, которые к началу уже выполнены (без их действий onDone)
//     steps: [
//       { expect: 'quest:1.03' },                       // условие должно быть правдой (expectNot — ложью)
//       { at: 'bridge.scene' },                         // игрок встал в центр места (или { at: { x, z } })
//       { talk: 'denis', pick: [0, 0], see: 'Вера' },   // разговор: номера выбранных вариантов; see — реплика с этим текстом
//       { dialog: '1.03.flash', pick: [0] },            // то же для узла по ссылке, без персонажа
//       { inspect: 'body' },                            // событие inspect
//       { zone: 'treehouse' },                          // игрок в зоне (здании) с таким id
//       { interact: 'station:laptop' },                 // взаимодействие с объектом, которое перехватывает квест
//       { puzzle: '2.05.elixir', picks: ['water', …] }, // головоломка: выбрать части по порядку (expect — после)
//       { do: [{ give: 'copper' }] },                   // любые действия
//       { wait: '8h' },                                 // потратить игровое время (минуты, '90m', '8h')
//       { emit: 'name' },                               // событие
//     ],
//   });
//
// Core.runScenario(registry, сценарий) возвращает { ok, failures, game, host }. Запускается в Node (tests/) и в браузере.

(function (root) {
  const Core = (root.Core = root.Core || {});

  // '90' / '90m' / '8h' / '1d' → минуты
  Core.parseDuration = function parseDuration(text) {
    const m = /^(\d+(?:\.\d+)?)\s*([mhd]?)$/.exec(String(text).trim());
    if (!m) throw new Error('Не понял длительность: ' + text);
    return Number(m[1]) * { '': 1, m: 1, h: 60, d: 1440 }[m[2]];
  };

  Core.runScenario = function runScenario(registry, scenario, opts = {}) {
    const host = Core.createTestHost();
    if (opts.setup) opts.setup(host);
    const game = Core.createGame({ registry, host });
    const failures = [];
    for (const id of scenario.done || []) {
      game.state.quests[id] = { state: 'done', steps: {}, startedAt: 0, doneAt: 0 };
      for (const st of (registry.quests[id] && registry.quests[id].steps) || []) game.state.quests[id].steps[st.id] = true;
    }
    game.settle(); // квесты с autoStart начинаются с начала истории

    scenario.steps.forEach((step, i) => {
      const fail = (msg) => failures.push('шаг ' + (i + 1) + ': ' + msg);
      try {
        if (step.do) game.run(step.do);
        if (step.at) {
          const place = typeof step.at === 'string' ? registry.places[step.at] : step.at;
          if (!place) fail('нет места ' + step.at);
          else host.pos = { x: place.x, z: place.z };
        }
        if (step.zone) host.zoneId = step.zone;
        if (step.interact && !game.interact(step.interact)) fail('квест не перехватил «' + step.interact + '»');
        if (step.puzzle) {
          const session = game.puzzleSession(step.puzzle);
          if (!session) fail('нет головоломки ' + step.puzzle);
          else for (const id of step.picks || []) session.pick(id);
        }
        if (step.wait) host.time += Core.parseDuration(step.wait);
        if (step.inspect) game.emit('inspect', { id: step.inspect });
        if (step.emit) game.emit(step.emit, {});
        if (step.talk || step.dialog) {
          // talk — разговор с персонажем, dialog — узел по ссылке (воспоминание, закадровая реплика)
          let node = step.talk ? game.dialogue(step.talk) : game.dialogueNode(step.dialog);
          const said = [];
          if (!node) fail('с «' + step.talk + '» нельзя заговорить');
          const picks = step.pick || [];
          for (let n = 0; node; n++) {
            said.push(node.text);
            if (picks[n] === undefined) break;
            const opt = node.options[picks[n]];
            if (!opt) {
              fail('в узле «' + node.text.slice(0, 30) + '…» нет варианта ' + picks[n]);
              break;
            }
            if (opt.action) opt.action();
            node = opt.next && !opt.end ? opt.next() : null;
          }
          if (step.see && !said.some((t) => t.includes(step.see))) fail('в разговоре не прозвучало «' + step.see + '»');
        }
        game.settle();
        for (const c of [].concat(step.expect || [])) if (!game.check(c)) fail('ожидалось «' + c + '»');
        for (const c of [].concat(step.expectNot || [])) if (game.check(c)) fail('не ожидалось «' + c + '»');
      } catch (err) {
        fail('ошибка: ' + err.message);
      }
    });
    return { ok: failures.length === 0, failures, game, host };
  };
})(globalThis);
