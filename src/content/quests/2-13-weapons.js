// src/content/quests/2-13-weapons.js
// 2.13 «Сборка оружия». По чертежам Веры из библиотеки (2.12) нужно купить детали на прилавках у торгового центра (деньги —
// счетчик money) и попросить Михалыча собрать дробовик и пулемет. Каждая сборка у горна — головоломка «ритм» (чем сложнее оружие,
// тем точнее надо дуть). Прилавки и горн — объекты мира (src/content/world.js), деньги выдаются в начале квеста.

defineQuest({
  id: '2.13',
  title: 'Сборка оружия',
  goal: 'Купить детали в торговом центре и попросить Михалыча собрать дробовик и пулемет',
  giver: 'Чертежи Веры',

  steps: [
    {
      id: 'shop',
      text: 'Купить на прилавках у торгового центра детали: стволы, пружины, механизм подачи, ложу',
      done: ['has:sg_pipe', 'has:sg_stock', 'has:sg_spring', 'has:mg_pipe', 'has:mg_gears', 'has:mg_spring'],
      marker: 'mall.stalls',
      hint: 'Три прилавка справа от парковки: «Металл» (стволы), «Запчасти» (пружины, механизм), «Дерево» (ложа). В кошельке 400',
    },
    {
      id: 'bring',
      text: 'Отнести чертежи и детали Михалычу во дворе у заправки',
      done: 'step:2.13.bring',
      marker: 'yard.forge',
    },
    {
      id: 'shotgun',
      text: 'Собрать дробовик: раздуть горн ровно',
      done: 'has:shotgun',
      marker: 'yard.forge',
      hint: 'E у горна: шесть точных нажатий',
    },
    {
      id: 'machinegun',
      text: 'Собрать пулемет: горн потоньше',
      done: 'has:minigun',
      marker: 'yard.forge',
      hint: 'E у горна: восемь нажатий, зеленая зона уже',
    },
  ],

  onStart: [{ add: { money: 400 } }, { toast: 'В кошельке 400. Прилавки у торгового центра, затем Михалыч.' }],
  onDone: [{ toast: 'Дробовик и пулемет в руках. Теперь можно и в бой.' }, { start: '2.14' }],

  starts: {
    mihalych: [
      { if: ['quest:2.13', 'step:2.13.bring'], goto: '2.13.again' },
      { if: ['quest:2.13', 'step:2.13.shop'], goto: '2.13.meet' },
    ],
  },

  interactions: [
    // Прилавок «Металл»
    { on: 'spot:stall_pipes', if: ['quest:2.13', '!has:sg_pipe', 'count:money>=70'], do: [{ add: { money: -70 } }, { give: 'sg_pipe' }, { toast: 'Куплено: ствольная труба (−70)' }] },
    { on: 'spot:stall_pipes', if: ['quest:2.13', '!has:mg_pipe', 'count:money>=90'], do: [{ add: { money: -90 } }, { give: 'mg_pipe' }, { toast: 'Куплено: ствол пулемета (−90)' }] },
    { on: 'spot:stall_pipes', if: 'quest:2.13', do: [{ toast: 'Продавец: «Трубы по 70 и стволы по 90. Что-то уже взяли или денег не хватает?»' }] },
    // Прилавок «Запчасти»
    { on: 'spot:stall_parts', if: ['quest:2.13', '!has:sg_spring', 'count:money>=40'], do: [{ add: { money: -40 } }, { give: 'sg_spring' }, { toast: 'Куплено: пружина затвора (−40)' }] },
    { on: 'spot:stall_parts', if: ['quest:2.13', '!has:mg_spring', 'count:money>=40'], do: [{ add: { money: -40 } }, { give: 'mg_spring' }, { toast: 'Куплено: возвратная пружина (−40)' }] },
    { on: 'spot:stall_parts', if: ['quest:2.13', '!has:mg_gears', 'count:money>=70'], do: [{ add: { money: -70 } }, { give: 'mg_gears' }, { toast: 'Куплено: механизм подачи (−70)' }] },
    { on: 'spot:stall_parts', if: 'quest:2.13', do: [{ toast: 'Продавец: «Пружины по 40, механизм подачи за 70. Все уже куплено или не хватает денег?»' }] },
    // Прилавок «Дерево»
    { on: 'spot:stall_wood', if: ['quest:2.13', '!has:sg_stock', 'count:money>=50'], do: [{ add: { money: -50 } }, { give: 'sg_stock' }, { toast: 'Куплено: деревянная ложа (−50)' }] },
    { on: 'spot:stall_wood', if: 'quest:2.13', do: [{ toast: 'Продавец: «Ложа за 50. Уже купили или денег нет?»' }] },
    // Горн: сначала дробовик, потом пулемет
    { on: 'spot:forge', if: ['quest:2.13', 'step:2.13.bring', '!puzzle:2.13.shotgun'], do: [{ puzzle: '2.13.shotgun' }] },
    { on: 'spot:forge', if: ['quest:2.13', 'puzzle:2.13.shotgun', '!puzzle:2.13.machinegun'], do: [{ puzzle: '2.13.machinegun' }] },
  ],

  nodes: {
    meet: {
      text: 'Деньги потратил, детали привез? Чертежи покажи.',
      options: [
        {
          text: 'Вот чертежи и все детали.',
          if: ['has:bp_shotgun', 'has:bp_machinegun', 'has:sg_pipe', 'has:sg_stock', 'has:sg_spring', 'has:mg_pipe', 'has:mg_gears', 'has:mg_spring'],
          do: [
            { take: 'bp_shotgun' }, { take: 'bp_machinegun' }, { take: 'sg_pipe' }, { take: 'sg_stock' },
            { take: 'sg_spring' }, { take: 'mg_pipe' }, { take: 'mg_gears' }, { take: 'mg_spring' },
            { step: '2.13.bring' },
          ],
          goto: 'wait',
        },
        { text: 'Еще не все купил.', end: true },
      ],
    },
    wait: {
      text: 'Хорошо. Сначала дробовик: он проще. Садись, раздувай горн ровно. А потом займемся пулеметом.',
      options: [{ text: 'Сажусь.', end: true }],
    },
    again: {
      text: ['Горн ждет. Сначала дробовик, потом пулемет.', 'Не части, говорю.'],
      options: [{ text: 'Иду.', end: true }],
    },
    shotgunDone: {
      speaker: 'Михалыч — кузнец',
      text: 'Дробовик готов. Бьет жестко, держи крепче. Теперь пулемет: он потоньше, придется подуть точнее.',
      do: [{ give: 'shotgun' }],
      options: [{ text: 'Спасибо.', end: true }],
    },
    machinegunDone: {
      speaker: 'Михалыч — кузнец',
      text: 'Пулемет готов. Только патроны береги: ленту Вера нарисовала хитрую, но я ее осилил. Не геройствуй, Максим.',
      do: [{ give: 'minigun' }],
      options: [{ text: 'Спасибо, Григорий Михайлович.', end: true }],
    },
  },

  puzzles: {
    shotgun: {
      kind: 'rhythm',
      title: 'Горн: дробовик',
      hint: 'Нажимайте, когда бегунок в зеленой зоне, шесть раз подряд. Можно сбиться три раза.',
      beats: 6,
      tolerance: 0.17,
      tempo: 1.4,
      mistakesAllowed: 3,
      onSolve: [{ dialog: '2.13.shotgunDone' }],
    },
    machinegun: {
      kind: 'rhythm',
      title: 'Горн: пулемет',
      hint: 'Бегунок быстрее, зона уже: восемь точных нажатий. Можно сбиться два раза.',
      beats: 8,
      tolerance: 0.13,
      tempo: 1.15,
      mistakesAllowed: 2,
      onSolve: [{ dialog: '2.13.machinegunDone' }],
    },
  },

  meta: { 'design.theme': 'покупки и крафт', 'design.mood': 'деловитость', 'design.mechanics': 'money counter, shops as spots, two forge puzzles' },
});
