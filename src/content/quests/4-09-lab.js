// src/content/quests/4-09-lab.js
// 4.09 «Лаборатория и Барон» (docs/story/quests/act-4-laboratory.md; в линейной версии вобрал 4.08 «Ночной пропуск» и
// 4.10 «Барон»). Герой идет к закрытой территории (src/locations/lab/lab.js), находит стол Веры и знаки потайного люка,
// спускается в цех, берет в арсенале плазмомет, проходит зал капсул (две волны роботов и биосуществ вперемешку) и побеждает Барона.
// Без плазмомета зал не пройти: роботов не берут огонь, пули и дробь, биосуществ — ток и импульс (docs/mechanics/weapons.md).

defineQuest({
  id: '4.09',
  title: 'Лаборатория и Барон',
  goal: 'Пройти через потайной люк в цех под лабораторией и победить Барона',
  giver: 'Денис',

  steps: [
    {
      id: 'gate',
      text: 'Подойти к закрытой территории лаборатории',
      done: 'near:lab.gate',
      marker: 'lab.gate',
      hint: 'Лаборатория к югу от трассы, на запад от торгового центра: высокий серый забор, ворота на севере',
      timer: {
        limit: '60m',
        warn: { '60%': [{ toast: 'Лаборатория вот-вот сменит охрану: нужно успеть.' }] },
        onExpire: [
          { toast: 'Охрана сменилась, проход закрыт. Возвращаетесь к яхте и едете снова.' },
          { teleport: { to: 'river.yacht', car: true } },
        ],
        repeat: true,
      },
    },
    {
      id: 'desk',
      text: 'Найти рабочий стол Веры во дворе лаборатории',
      done: 'step:4.09.desk',
      marker: 'lab.desk',
      hint: 'Стол под навесом справа от ворот',
    },
    {
      id: 'hatch',
      text: 'Открыть потайной люк знаками из записки Веры',
      done: 'puzzle:4.09.lock',
      marker: 'lab.hatch',
      hint: 'Люк слева от стола. Порядок знаков — в записке на столе Веры',
    },
    {
      id: 'arsenal',
      text: 'Найти в арсенале цеха оружие против роботов и биосуществ',
      done: 'step:4.09.arsenal',
      marker: 'lab.arsenal',
      hint: 'Арсенал у западной стены подвала, левее прохода',
    },
    {
      id: 'hall',
      text: 'Пройти зал капсул: роботы и биосущества пойдут вперемешку',
      done: 'fight:4.09.hall',
      marker: 'lab.hall',
      hint: 'Роботов не берут огонь, пули и дробь, биосуществ — ток и импульс; плазмомет берет всех',
    },
    {
      id: 'baron',
      text: 'Победить Барона в сборочном зале',
      done: 'fight:4.09.baron',
      marker: 'lab.assembly',
      hint: 'Сборочный зал за внутренней стеной: проход в центре',
    },
  ],

  onStart: [{ phone: { from: 'denis', text: 'Макс, лабораторию с территории охраны сняли на ночь. Если собираешься туда, то сегодня.' } }],
  onDone: [{ toast: 'Цех разгромлен. В кабинете Штерна еще осталось то, что он собирал по моим расчетам.' }, { start: '4.12' }],

  interactions: [
    { on: 'spot:lab_desk', if: ['quest:4.09', '!step:4.09.desk'], do: [{ dialog: '4.09.desk' }] },
    { on: 'spot:hatch', if: ['quest:4.09', 'step:4.09.desk', '!puzzle:4.09.lock'], do: [{ puzzle: '4.09.lock' }] },
    { on: 'spot:hatch', if: ['quest:4.09', '!step:4.09.desk'], do: [{ toast: 'Люк закрыт: ни ручки, ни замка, только панель знаков. Может, Вера оставила подсказку на столе?' }] },
    { on: 'spot:arsenal', if: ['quest:4.09', 'step:4.09.hatch', '!step:4.09.arsenal'], do: [{ dialog: '4.09.arsenal' }] },
  ],

  nodes: {
    desk: {
      speaker: 'Рабочий стол Веры',
      text: 'Ящик не заперт. Чертеж потайной двери и листок почерком Веры: «Люк открывается теми же знаками, что мы рисовали на дереве: круг, звезда, квадрат, треугольник. Внизу целый цех. Господи, что они там делают».',
      do: [{ reveal: 'Ф33' }, { step: '4.09.desk' }],
      options: [{ text: '...', end: true }],
    },
    arsenal: {
      speaker: 'Арсенал цеха',
      text: 'Стойки с оружием. Одно выделяется: тяжелый ствол с зеленой сердцевиной. Табличка: «Плазмомет. Для обеих серий». Штерн сделал его, чтобы держать в узде и роботов, и биосуществ. А теперь им воспользуешься ты.',
      do: [{ give: 'plasma_gun' }, { heal: 100 }, { reveal: 'Ф35' }, { step: '4.09.arsenal' }],
      options: [{ text: 'Беру.', end: true }],
    },
  },

  puzzles: {
    lock: {
      kind: 'sequence',
      title: 'Замок люка',
      hint: 'Записка Веры: «Круг, звезда, квадрат, треугольник».',
      pieces: [
        { id: 'triangle', label: 'Треугольник' },
        { id: 'square', label: 'Квадрат' },
        { id: 'star', label: 'Звезда' },
        { id: 'circle', label: 'Круг' },
      ],
      answer: ['circle', 'star', 'square', 'triangle'],
      mistakesAllowed: 4,
      onSolve: [{ teleport: 'lab.basement' }, { reveal: 'Ф46' }, { toast: 'Люк открылся. Внизу, в цеху под лабораторией, ряды установок синтеза, такие же, как у Веры в домике: их там множество.' }],
    },
  },

  fights: {
    hall: {
      when: 'step:4.09.arsenal',
      foes: [
        { kind: 'cyborg', name: 'Киборг-изгой', at: 'lab.hall', dx: -10, dz: 8, wave: 0, aggro: 40 },
        { kind: 'hound', name: 'Спорогончая', at: 'lab.hall', dx: 10, dz: 12, wave: 0, aggro: 40 },
        { kind: 'hound', name: 'Спорогончая', at: 'lab.hall', dx: 14, dz: -4, wave: 0, aggro: 40 },
        { kind: 'stilt', name: 'Ходульный авангард', at: 'lab.hall', dx: -14, dz: -10, wave: 1, aggro: 50 },
        { kind: 'drone', name: 'Дрон-уборщик', at: 'lab.hall', dx: 0, dz: -10, wave: 1, aggro: 50 },
        { kind: 'hound', name: 'Спорогончая', at: 'lab.hall', dx: 0, dz: 14, wave: 1, aggro: 50 },
      ],
      onWin: [{ toast: 'Зал затих. Впереди сборочный зал и проход в центре стены.' }],
    },
    baron: {
      when: 'fight:4.09.hall',
      foes: [{ kind: 'cain', name: 'Барон', scale: 1.2, hp: 900, at: 'lab.assembly', dx: 0, dz: 6, aggro: 60 }],
      onWin: [{ toast: 'Барон повержен.' }],
    },
  },

  meta: { 'design.theme': 'финальное подземелье', 'design.mood': 'тревога, напряжение' },
});
