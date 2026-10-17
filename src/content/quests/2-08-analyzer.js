// src/content/quests/2-08-analyzer.js
// 2.08 «Анализатор» (docs/story/quests/act-2-traces.md). Чертеж корпуса прибора лежит среди бумаг Веры. Михалыч во дворе
// у заправки делает корпус, если принести ему чертеж и медь (медь дает Людмила), и просит помочь у горна: головоломка
// «ритм» (вид rhythm). Награда: анализатор. Кузница и Михалыч — src/content/world.js и characters/people.js.

defineQuest({
  id: '2.08',
  title: 'Анализатор',
  goal: 'Собрать анализатор тканей',
  giver: 'Чертеж Веры',

  steps: [
    {
      id: 'smith',
      text: 'Найти, кто сделает корпус: кузнец Михалыч во дворе у заправки',
      done: 'talked:mihalych',
      marker: 'yard.forge',
      hint: 'Заправка на трассе у торгового центра, кузница чуть севернее колонок',
      timer: {
        limit: '45m',
        warn: { '60%': [{ toast: 'Михалыч вот-вот закроет кузницу на ночь.' }] },
        onExpire: [
          { toast: 'Кузница закрыта. Вы возвращаетесь к библиотеке и едете снова.' },
          { teleport: { to: 'road.city', car: true } },
        ],
        repeat: true,
      },
    },
    {
      id: 'bring',
      text: 'Принести Михалычу чертеж и медь',
      done: 'step:2.08.bring',
      marker: 'yard.forge',
      hint: 'Медь есть у Людмилы Сергеевны в торговом центре, спросите про проволоку и заготовки',
    },
    {
      id: 'forge',
      text: 'Помочь у горна: раздуть его ровно, как просит Михалыч',
      done: 'puzzle:2.08.bellows',
      marker: 'yard.forge',
      hint: 'E у горна: жмите, когда бегунок в зеленой зоне',
    },
    {
      id: 'pick',
      text: 'Забрать анализатор',
      done: 'has:analyzer',
      marker: 'yard.forge',
    },
  ],

  onStart: [{ give: 'bp_analyzer' }, { toast: 'В бумагах Веры нашелся чертеж корпуса. Нужен кузнец, а Вера писала про Михалыча.' }],
  onDone: [{ toast: 'Первый прибор Веры у меня в руках.' }, { start: '2.09' }],

  starts: {
    mihalych: [
      { if: ['quest:2.08', 'step:2.08.bring'], goto: '2.08.again' },
      { if: 'quest:2.08', goto: '2.08.meet' },
    ],
  },

  topics: {
    lyudmila: [
      { text: 'Мне нужна медь для корпуса прибора.', if: ['quest:2.08', '!has:copper', '!step:2.08.bring'], goto: '2.08.copper', once: true },
    ],
  },

  interactions: [
    { on: 'spot:forge', if: ['quest:2.08', 'step:2.08.bring', '!puzzle:2.08.bellows'], do: [{ puzzle: '2.08.bellows' }] },
    { on: 'spot:forge', if: ['quest:2.08', '!step:2.08.bring'], do: [{ toast: 'Горн холодный. Сначала нужно договориться с Михалычем.' }] },
  ],

  nodes: {
    copper: {
      text: 'Медь? Проволоки у меня навалом, и заготовки есть. Держи, только не спаяй мне весь район.',
      do: [{ give: 'copper' }],
      options: [{ text: 'Спасибо, Людмила Сергеевна.', end: true }],
    },
    meet: {
      text: 'Максим? Вымахал. Раньше ты только смотрел, как я кую. Чего пришел?',
      options: [
        { text: 'Мне нужен корпус для прибора. Вот чертеж.', if: 'has:bp_analyzer', goto: 'blueprint' },
        { text: 'Просто зашел.', end: true },
      ],
    },
    blueprint: {
      text: 'Покажи. Хм. Чертеж кривой, но мысль правильная. Медь есть?',
      options: [
        { text: 'Вот медь.', if: 'has:copper', do: [{ take: 'copper' }, { take: 'bp_analyzer' }, { step: '2.08.bring' }], goto: 'wait' },
        { text: 'Меди пока нет.', if: '!has:copper', goto: 'nocopper' },
      ],
    },
    nocopper: {
      text: 'Без меди никак. В торговом центре у Людмилы спроси, у нее проволока и заготовки.',
      options: [{ text: 'Принесу.', end: true }],
    },
    wait: {
      text: 'Приходи завтра. Нет, сегодня. Садись, раздувай горн: ровно, не части.',
      options: [{ text: 'Сажусь.', end: true }],
    },
    again: {
      text: ['Горн ждет. Дуй ровно, не части.', 'Не стой столбом, горн сам себя не раздует.'],
      options: [{ text: 'Иду.', end: true }],
    },
    after: {
      speaker: 'Михалыч — кузнец',
      text: 'Ровно дул. Корпус отлит и остыл: я быстрый. Держи. Заливай свое зелье, когда будешь готов. И знаешь что? Вера тоже приносила мне чертеж, странного браслета. Корпус я не успел.',
      do: [{ give: 'analyzer' }, { reveal: 'Ф17' }],
      options: [{ text: 'Спасибо, Григорий Михайлович.', end: true }],
    },
  },

  puzzles: {
    bellows: {
      kind: 'rhythm',
      title: 'Горн',
      hint: 'Бегунок ходит туда-сюда. Нажимайте (кнопка или Пробел), когда он в зеленой зоне, шесть раз подряд. Можно сбиться три раза.',
      beats: 6,
      tolerance: 0.18,
      tempo: 1.5,
      mistakesAllowed: 3,
      onSolve: [{ dialog: '2.08.after' }],
    },
  },

  meta: { 'design.theme': 'первый прибор', 'design.mood': 'азарт' },
});
