// src/core/fights.js
// БОИ КАК ДАННЫЕ. Бой — запись в файле квеста; враги живут, пока выполняется условие when, и пропадают сами, когда оно
// ложно (мир — функция от состояния, docs/mechanics/v1-linear.md). Побеждены все враги — бой выигран, выполняются onWin.
//
//   fights: { flash: { when: 'step:2.11.chase',
//                      foes: [{ kind: 'hound', name: 'Вспышка', at: 'zarechye.tree', dx: 8, dz: 0, hp: 160, wave: 0 }],
//                      onWin: [...действия] } }
//
// Ссылка на бой — '<id квеста>.<имя>': '2.11.flash'. Выигран ли он — условие fight:2.11.flash. Враги с wave больше нуля
// выходят, когда побеждены все враги предыдущей волны. Враг сам решает, как драться (src/quests/fights.js в игре):
//   kind — вид из Core.foeKinds (модель, вид robot/bio, оружие);  name — имя над ним;  hp — здоровье (по умолчанию из вида);
//   at, dx, dz — где появляется;  aggro — с какого расстояния замечает героя;  scale — размер модели.

(function (root) {
  const Core = (root.Core = root.Core || {});

  // Названия видов врагов (сами враги описаны в игре: src/quests/fights.js)
  Core.foeKinds = ['cyborg', 'hound', 'cain', 'drone', 'stilt'];

  Core.resolveFight = function resolveFight(registry, ref) {
    for (const q of Object.values(registry.quests)) {
      const prefix = q.id + '.';
      if (ref.startsWith(prefix) && q.fights && q.fights[ref.slice(prefix.length)]) {
        return { def: q.fights[ref.slice(prefix.length)], owner: q };
      }
    }
    return null;
  };

  // Какие бои сейчас идут: [{ ref, def }] — условие when истинно, а бой еще не выигран
  Core.gameExtensions.push(function attachFights(game) {
    game.activeFights = () => {
      const out = [];
      for (const q of Object.values(game.registry.quests)) {
        if (!game.isActive(q.id)) continue;
        for (const [name, def] of Object.entries(q.fights || {})) {
          const ref = q.id + '.' + name;
          if (!game.state.fights[ref] && game.check(def.when)) out.push({ ref, def });
        }
      }
      return out;
    };
  });
})(globalThis);
