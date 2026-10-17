// src/core/puzzles.js
// ГОЛОВОЛОМКИ. Конкретная головоломка — данные в файле квеста (docs/mechanics/puzzles.md), вид — код, который
// пишется один раз. Здесь логика видов без экрана, чтобы ее можно было проверить в Node; окно рисует
// src/quests/puzzle-ui.js.
//
//   puzzles: { elixir: { kind: 'sequence', title, hint, pieces: [{ id, label }], answer: [id, ...],
//                        mistakesAllowed: 2, onSolve: [...действия] },
//              bellows: { kind: 'rhythm', title, hint, beats: 8, tolerance: 0.16, tempo: 1.6,
//                         mistakesAllowed: 3, onSolve: [...] } }
//
// Ссылка на головоломку — '<id квеста>.<имя>': '2.05.elixir'. Открывает ее действие { puzzle: '2.05.elixir' }, решенность
// проверяет условие puzzle:2.05.elixir. Вид sequence: выбрать части в правильном порядке; ошибок можно сделать
// mistakesAllowed, потом выбранное сбрасывается и можно начать заново (штрафа нет).
//
// Вид rhythm: по полосе ходит бегунок (tempo — секунд на проход), игрок жмет, когда он у центра: pick(фаза 0..1) верен,
// если |фаза − 0,5| ≤ tolerance. Нужно beats верных нажатий подряд; ошибок можно mistakesAllowed, потом счет обнуляется.
//
// Новый вид: Core.puzzleKinds.<вид> = { check(def) → список ошибок данных, create(def, api) → { pick(id) → результат } }.

(function (root) {
  const Core = (root.Core = root.Core || {});

  Core.resolvePuzzle = function resolvePuzzle(registry, ref) {
    for (const q of Object.values(registry.quests)) {
      const prefix = q.id + '.';
      if (ref.startsWith(prefix) && q.puzzles && q.puzzles[ref.slice(prefix.length)]) {
        return { def: q.puzzles[ref.slice(prefix.length)], owner: q };
      }
    }
    return null;
  };

  Core.puzzleKinds = {
    rhythm: {
      check(def) {
        const bad = [];
        if (!(def.beats > 0)) bad.push('нужно beats больше нуля');
        if (!(def.tolerance > 0 && def.tolerance < 0.5)) bad.push('tolerance должен быть между 0 и 0,5');
        return bad;
      },
      create(def) {
        let hits = 0;
        let mistakes = 0;
        return {
          picked: [],
          get progress() {
            return hits;
          },
          get total() {
            return def.beats;
          },
          get mistakes() {
            return mistakes;
          },
          pick(phase) {
            if (Math.abs(phase - 0.5) <= def.tolerance) {
              hits++;
              return hits >= def.beats ? 'solved' : 'ok';
            }
            if (++mistakes > (def.mistakesAllowed === undefined ? 3 : def.mistakesAllowed)) {
              hits = 0;
              mistakes = 0;
              return 'reset';
            }
            return 'wrong';
          },
        };
      },
    },
    // Результат pick: 'ok' (верно, ждем дальше), 'solved', 'wrong' (ошибка, но можно дальше), 'reset' (ошибок слишком много)
    sequence: {
      check(def) {
        const bad = [];
        const ids = (def.pieces || []).map((p) => p.id);
        if (new Set(ids).size !== ids.length) bad.push('в pieces повторяются id');
        if (!(def.answer || []).length) bad.push('нет answer');
        for (const id of def.answer || []) if (!ids.includes(id)) bad.push('в answer есть «' + id + '», которого нет в pieces');
        return bad;
      },
      create(def) {
        const picked = [];
        let mistakes = 0;
        return {
          picked,
          get progress() {
            return picked.length;
          },
          get total() {
            return def.answer.length;
          },
          get mistakes() {
            return mistakes;
          },
          pick(id) {
            if (def.answer[picked.length] === id) {
              picked.push(id);
              return picked.length === def.answer.length ? 'solved' : 'ok';
            }
            if (++mistakes > (def.mistakesAllowed === undefined ? 2 : def.mistakesAllowed)) {
              picked.length = 0;
              mistakes = 0;
              return 'reset';
            }
            return 'wrong';
          },
        };
      },
    },
  };

  Core.gameExtensions.push(function attachPuzzles(game) {
    const { registry } = game;

    // Сеанс головоломки для окна: { ref, title, hint, pieces, picked, mistakes, pick(id) → результат }
    game.puzzleSession = (ref) => {
      const found = Core.resolvePuzzle(registry, ref);
      const kind = found && Core.puzzleKinds[found.def.kind];
      if (!kind) {
        console.warn('Нет головоломки: ' + ref);
        return null;
      }
      const { def } = found;
      const run = kind.create(def);
      return {
        ref,
        kind: def.kind,
        title: def.title || '',
        hint: def.hint || '',
        pieces: (def.pieces || []).map((p) => ({ ...p })),
        mistakesAllowed: def.mistakesAllowed === undefined ? (def.kind === 'rhythm' ? 3 : 2) : def.mistakesAllowed,
        tempo: def.tempo || 1.6,
        tolerance: def.tolerance,
        get picked() {
          return run.picked;
        },
        get progress() {
          return run.progress;
        },
        get total() {
          return run.total;
        },
        get mistakes() {
          return run.mistakes;
        },
        pick(id) {
          if (game.state.puzzles[ref]) return 'solved';
          const result = run.pick(id);
          if (result === 'solved') {
            game.state.puzzles[ref] = true;
            game.bump();
            game.run(def.onSolve);
            game.settle();
          }
          return result;
        },
      };
    };
  });
})(globalThis);
