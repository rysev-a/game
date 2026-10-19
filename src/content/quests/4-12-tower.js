// src/content/quests/4-12-tower.js
// 4.12 «Бомба на крыше». Помощник Штерна оставил ночью бомбу на крыше десятиэтажной башни в центре. Времени мало (таймер квеста):
// герой поднимается по девяти этажам, на каждом монстры (бой — данные, этажи — площадки src/locations/tower/tower.js), но десятый
// этаж заперт изнутри. На девятом он находит пульт радиоуправляемого вертолетика, спускается на улицу, запускает его с площадки
// и летит вдоль башни до крыши (управление как в GTA Vice City: src/quests/heli.js), где обезвреживает бомбу.
// Не успел до взрыва — квест откатывается к первому этажу, а героя выносит взрывной волной на улицу: можно пройти заново.
// Этажи, их враги и лестницы собраны циклами: результат — обычные данные.

const towerFloors = [
  ['hound', 'hound'],
  ['hound', 'hound', 'hound'],
  ['hound', 'hound', 'drone'],
  ['cyborg', 'hound'],
  ['drone', 'drone', 'hound'],
  ['cyborg', 'hound', 'hound'],
  ['stilt', 'drone'],
  ['cyborg', 'stilt', 'hound'],
  ['cain', 'hound', 'hound'],
];
const towerFoeNames = { hound: 'Монстр', drone: 'Дрон-уборщик', cyborg: 'Киборг-изгой', stilt: 'Ходульный авангард', cain: 'Страж этажа' };
const towerSpread = [[-7, -6], [7, -6], [0, 5]];

const towerSteps = [
  {
    id: 'go',
    text: 'Добраться до башни в центре и войти внутрь',
    done: 'near:tower.door',
    marker: 'tower.door',
    hint: 'Башня у трассы между торговым центром и первым городом: десять этажей, на крыше бомба',
  },
];
const towerFights = {};
const towerInteractions = [
  { on: 'spot:tower_door', if: ['quest:4.12', '!step:4.12.f1'], do: [{ teleport: 'tower.f1' }, { toast: 'Лифты обесточены. Наверх только по лестницам, а на этажах кто-то шевелится.' }] },
];
towerFloors.forEach((kinds, k) => {
  const i = k + 1;
  towerSteps.push({
    id: 'f' + i,
    text: i + ' этаж: расчистить от монстров и подняться по лестнице',
    done: 'fight:4.12.f' + i,
    marker: 'tower.f' + i,
    hint: i < 3 ? 'Монстров берет огонь' : 'Роботов не берут огонь и пули, биосуществ — ток и импульс: плазмомет берет всех',
  });
  towerFights['f' + i] = {
    when: ['quest:4.12', i === 1 ? 'step:4.12.go' : 'step:4.12.f' + (i - 1)],
    foes: kinds.map((kind, j) => ({
      kind,
      name: towerFoeNames[kind],
      at: 'tower.f' + i,
      dx: towerSpread[j][0],
      dz: towerSpread[j][1],
      aggro: 40,
      ...(kind === 'cain' ? { scale: 0.9, hp: 450 } : {}),
    })),
    onWin: [{ toast: i + ' этаж свободен. Лестница вверх открыта.' }],
  };
  if (i < 9) {
    towerInteractions.push({ on: 'spot:stairs' + i, if: ['quest:4.12', 'fight:4.12.f' + i], do: [{ teleport: 'tower.f' + (i + 1) }, { heal: 25 }] });
    towerInteractions.push({ on: 'spot:stairs' + i, if: 'quest:4.12', do: [{ toast: 'Лестницу перекрывают монстры: сначала расчистите этаж.' }] });
  }
});
towerSteps.push(
  {
    id: 'remote',
    text: 'Найти на девятом этаже пульт вертолетика: десятый этаж заперт изнутри',
    done: 'has:rc_remote',
    marker: 'tower.f9',
    hint: 'На девятом этаже ящик с запчастями от моделей, дверь выше заперта',
  },
  {
    id: 'out',
    text: 'Выйти на улицу к площадке вертолетика',
    done: 'near:tower.pad',
    marker: 'tower.pad',
    hint: 'Аварийный выход на девятом этаже ведет на улицу к площадке',
  },
  {
    id: 'fly',
    text: 'Запустить вертолетик с площадки, долететь до крыши и обезвредить бомбу',
    done: 'step:4.12.fly',
    marker: 'tower.base',
    hint: 'Вертолетиком нужно долететь до бомбы на крыше башни',
  },
);
towerInteractions.push(
  { on: 'spot:locked', if: 'quest:4.12', do: [{ toast: 'Дверь на десятый этаж заперта изнутри: кодовый замок, а кода нет. Значит, надо добираться по-другому.' }] },
  { on: 'spot:remote', if: ['quest:4.12', 'fight:4.12.f9', '!has:rc_remote'], do: [{ dialog: '4.12.remote' }] },
  { on: 'spot:tower_exit', if: ['quest:4.12', 'fight:4.12.f9'], do: [{ teleport: 'tower.pad' }] },
  {
    on: 'spot:helipad',
    if: ['quest:4.12', 'has:rc_remote', '!step:4.12.fly'],
    do: [{ heli: { from: 'tower.pad', goal: 'tower.base', goalY: 62, goalR: 6, onGoal: [{ dialog: '4.12.disarm' }] } }],
  },
);

defineQuest({
  id: '4.12',
  title: 'Бомба на крыше',
  goal: 'Подняться на крышу башни в центре и обезвредить бомбу до взрыва',
  giver: 'Денис',

  steps: towerSteps,

  timer: {
    limit: '12m',
    start: 'step:4.12.go',
    until: 'step:4.12.fly',
    warn: {
      '50%': [{ toast: 'Половина времени вышла. На табло бомбы горит красный.' }],
      '80%': [{ toast: 'Остались считаные минуты! Бомба пищит все чаще.' }],
    },
    onExpire: [
      { toast: 'Взрыв на крыше! Взрывной волной вас вынесло на улицу. Придется подняться заново, быстрее.' },
      { rewind: '4.12.f1' },
      { teleport: 'tower.pad' },
      { heal: 100 },
    ],
    repeat: true,
  },

  onStart: [
    { phone: { from: 'denis', text: 'Макс, срочно! Психованный ученый оставил бомбу на крыше башни в центре. Когда доберешься, у тебя будет 12 минут.' } },
    { reveal: 'Ф40' },
  ],
  onDone: [{ toast: 'Бомба обезврежена. Башня цела, город спит.' }, { start: '4.11' }],

  interactions: towerInteractions,
  fights: towerFights,

  nodes: {
    remote: {
      speaker: 'Ящик с запчастями',
      text: 'Среди запчастей от радиоуправляемых моделей лежит готовый пульт с камерой на вертолетик. Дверь на крышу заперта, а вот окна на уровне девятого этажа открыты, и вертолетик пролетит. Нужна только площадка внизу.',
      do: [{ give: 'rc_remote' }],
      options: [{ text: 'Беру. Лечу снаружи.', end: true }],
    },
    disarm: {
      speaker: 'Бомба',
      text: 'Вертолетик завис над бомбой. Манипулятор тянется к проводам: красный, синий и зеленый. На табло ровно 00:09. Вера бы сказала: «Режь зеленый». Режете.',
      do: [{ step: '4.12.fly' }],
      options: [{ text: 'Щелк.', end: true }],
    },
  },

  meta: { 'design.theme': 'бомба и время', 'design.mood': 'напряжение', 'design.mechanics': 'quest timer with rewind, 9 floor fights, RC helicopter' },
});
