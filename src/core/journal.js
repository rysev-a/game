// src/core/journal.js
// ЖУРНАЛ. Целиком собирается из данных и состояния: отдельно его писать не нужно. game.journal() отдает
// то, что рисует окно журнала (src/quests/journal-ui.js):
//   tasks     активные квесты: название, цель, шаги (выполненные и текущий), отмечен ли квест текущим
//   done      выполненные квесты
//   facts     «Выводы»: открытые факты в порядке открытия
//   people    знакомые: персонажи, с которыми говорил игрок
//   messages  сообщения на телефон
// game.version меняется при любом изменении состояния: окно перерисовывается только тогда.

(function (root) {
  const Core = (root.Core = root.Core || {});

  Core.gameExtensions.push(function attachJournal(game) {
    const { registry } = game;

    // Видны выполненные шаги и первый невыполненный: остальные игрок еще не знает
    function visibleSteps(q, rec) {
      const out = [];
      for (const s of q.steps || []) {
        const done = !!rec.steps[s.id];
        out.push({ id: s.id, text: s.text, done, current: !done, hint: done ? '' : s.hint || '' });
        if (!done) break;
      }
      return out;
    }

    const card = (q, rec) => ({
      id: q.id,
      title: q.title,
      goal: q.goal || '',
      giver: q.giver || '',
      tracked: game.state.tracked === q.id,
      steps: visibleSteps(q, rec),
      actions: rec.state === 'active' ? game.actionsOf(q.id) : [],
    });

    game.journal = () => {
      const entries = Object.entries(game.state.quests).filter(([id]) => registry.quests[id]);
      const byTime = (a, b) => a.rec.startedAt - b.rec.startedAt;
      const rows = entries.map(([id, rec]) => ({ q: registry.quests[id], rec }));
      return {
        tasks: rows.filter((r) => r.rec.state === 'active').sort(byTime).map((r) => card(r.q, r.rec)),
        done: rows.filter((r) => r.rec.state === 'done').sort(byTime).map((r) => card(r.q, r.rec)),
        facts: Object.entries(game.state.facts)
          .sort((a, b) => a[1] - b[1])
          .map(([id, at]) => ({ id, at, text: registry.facts[id] ? registry.facts[id].text : id })),
        people: Object.keys(game.state.talked)
          .filter((id) => registry.characters[id])
          .map((id) => ({ id, name: registry.characters[id].name, title: registry.characters[id].title || '', desc: registry.characters[id].desc || '' })),
        messages: game.state.messages.map((m) => ({
          from: m.from,
          name: registry.characters[m.from] ? registry.characters[m.from].name : m.from,
          text: m.text,
          at: m.at,
        })),
      };
    };
  });
})(globalThis);
