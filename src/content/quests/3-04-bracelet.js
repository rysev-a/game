// src/content/quests/3-04-bracelet.js
// 3.04 «Корпус для браслета» (docs/story/quests/act-3-devices.md). Вера спрятала чертеж браслета возврата в старой голубятне
// в Сосновке. Три ночи расчетов на домашнем сервере, корпус у Михалыча (горн потоньше, чем в 2.08), и эликсир на верстаке.
// Сам супер-браслет Вера оставила в домике на дереве (1.06, с ним сохранения); корпус делает его браслетом возврата: он возвращает героя во времени (флаг braceletCased).

defineQuest({
  id: '3.04',
  title: 'Корпус для браслета',
  goal: 'Собрать браслет возврата по чертежу Веры',
  giver: 'Михалыч',

  steps: [
    {
      id: 'loft',
      text: 'Найти чертеж браслета в старой голубятне в Сосновке',
      done: 'has:bp_bracelet',
      marker: 'village.loft',
      hint: 'Голубятня на краю улицы Сосновки, к востоку от дома героя',
      timer: {
        limit: '120m',
        warn: { '60%': [{ toast: 'Время уходит: тайник Веры нужно найти до конца дня.' }] },
        onExpire: [
          { toast: 'День прошел впустую. Возвращаетесь в Заречье и едете снова.' },
          { teleport: { to: 'zarechye.road', car: true } },
        ],
        repeat: true,
      },
    },
    {
      id: 'calc',
      text: 'Три ночи расчетов на домашнем сервере (E у сервера)',
      done: 'count:nights>=3',
      marker: 'village.server',
      hint: 'Сервер в сарае на улице Сосновки: каждая ночь расчетов — восемь часов игры',
    },
    {
      id: 'bring',
      text: 'Отдать чертеж Михалычу во дворе у заправки',
      done: 'step:3.04.bring',
      marker: 'yard.forge',
      timer: {
        limit: '90m',
        warn: { '60%': [{ toast: 'Михалыч скоро закончит работу.' }] },
        onExpire: [
          { toast: 'Михалыч ушел. Возвращаетесь к серверу и едете снова.' },
          { teleport: { to: 'village.server', car: true } },
        ],
        repeat: true,
      },
    },
    {
      id: 'forge',
      text: 'Помочь у горна: здесь работа тоньше, дуть нужно точнее',
      done: 'puzzle:3.04.bellows',
      marker: 'yard.forge',
      hint: 'E у горна: зеленая зона уже, нажать нужно восемь раз',
    },
    {
      id: 'charge',
      text: 'Зарядить браслет в корпусе эликсиром на верстаке в домике на дереве',
      done: 'flag:braceletCased',
      marker: 'zarechye.tree',
      hint: 'Нужно хотя бы 20 единиц эликсира: синтезируйте его на установке Веры в углу домика (2.05), если шкала пуста',
      timer: {
        limit: '120m',
        warn: { '60%': [{ toast: 'Эликсир остывает: нужно успеть до ночи.' }] },
        onExpire: [
          { toast: 'Эликсир остыл. Возвращаетесь к кузнице и едете снова.' },
          { teleport: { to: 'yard.nikolai', car: true } },
        ],
        repeat: true,
      },
    },
  ],

  onStart: [{ toast: 'Михалыч говорил: Вера просила его сделать корпус для странного браслета. Чертеж должен быть где-то у нее.' }],
  onDone: [{ toast: 'Браслет в корпусе: теперь он возвращает героя во времени.' }, { start: '3.05' }],

  starts: {
    mihalych: [
      { if: ['quest:3.04', 'step:3.04.bring'], goto: '3.04.again' },
      { if: 'quest:3.04', goto: '3.04.meet' },
    ],
  },

  interactions: [
    { on: 'spot:loft', if: ['quest:3.04', '!has:bp_bracelet', '!step:3.04.bring'], do: [{ dialog: '3.04.loft' }] },
    {
      on: 'spot:server',
      if: ['quest:3.04', 'has:bp_bracelet', 'count:nights<3'],
      do: [{ wait: '8h' }, { add: { nights: 1 } }, { toast: 'Ночь расчетов. Сервер гудит, цифры сходятся.' }],
    },
    { on: 'spot:forge', if: ['quest:3.04', 'step:3.04.bring', '!puzzle:3.04.bellows'], do: [{ puzzle: '3.04.bellows' }] },
    {
      on: 'station:workbench',
      if: ['quest:3.04', 'puzzle:3.04.bellows', 'elixir:>=20', '!flag:braceletCased'],
      do: [{ elixir: -20 }, { flag: 'braceletCased' }, { reveal: 'Ф23' }, { toast: 'Эликсир ушел в корпус: браслет ожил и теперь возвращает во времени.' }],
    },
    {
      on: 'station:workbench',
      if: ['quest:3.04', 'puzzle:3.04.bellows', '!flag:braceletCased'],
      do: [{ toast: 'Для браслета нужно хотя бы 20 единиц эликсира. Сварите его: записи Веры лежат рядом.' }],
    },
  ],

  nodes: {
    loft: {
      speaker: 'Голубятня',
      text: 'Под доской с голубиной помойкой пакет: «Для Максима, когда поймешь». Внутри чертеж браслета и записка Веры: «Ты сказал, что это невозможно. Я поверила тебе больше, чем ты сам».',
      do: [{ give: 'bp_bracelet' }],
      options: [{ text: '...', end: true }],
    },
    meet: {
      text: 'Браслет? Вера приносила чертеж такого же, просила корпус. Я не успел. Принесешь чертеж, и сделаем.',
      options: [
        { text: 'Вот чертеж.', if: ['has:bp_bracelet', 'count:nights>=3'], do: [{ take: 'bp_bracelet' }, { step: '3.04.bring' }], goto: 'wait' },
        { text: 'Чертеж еще считаю на сервере.', if: ['!has:bp_bracelet'], end: true },
        { text: 'Расчеты еще не закончены.', if: ['has:bp_bracelet', 'count:nights<3'], end: true },
      ],
    },
    wait: {
      text: 'Хорошо. Тут работа тоньше, чем с анализатором. Садись, раздувай горн, и дуй точнее.',
      options: [{ text: 'Сажусь.', end: true }],
    },
    again: {
      text: ['Горн ждет. Тут нужно точнее.', 'Не части и не тяни: ровно.'],
      options: [{ text: 'Иду.', end: true }],
    },
    after: {
      speaker: 'Михалыч — кузнец',
      text: 'Вот. Корпус готов. Не сам браслет, но корпус я тебе сделал: тонкий, как она хотела. Дальше заливай эликсир на верстаке у Веры, он сам подскажет.',
      do: [{ toast: 'Корпус браслета готов. Теперь нужен эликсир на верстаке.' }],
      options: [{ text: 'Спасибо, Григорий Михайлович.', end: true }],
    },
  },

  puzzles: {
    bellows: {
      kind: 'rhythm',
      title: 'Горн: корпус браслета',
      hint: 'Бегунок быстрее, зеленая зона уже. Нажимайте, когда он в зоне, восемь раз подряд. Можно сбиться два раза.',
      beats: 8,
      tolerance: 0.13,
      tempo: 1.2,
      mistakesAllowed: 2,
      onSolve: [{ dialog: '3.04.after' }],
    },
  },

  meta: { 'design.theme': 'сборка прибора', 'design.mood': 'сосредоточенность' },
});
