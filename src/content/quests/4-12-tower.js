// src/content/quests/4-12-tower.js
// 4.12 «Бомба на крыше». Помощник Штерна оставил ночью бомбу на крыше десятиэтажной башни в центре. Времени мало (таймер квеста):
// герой поднимается по девяти этажам: на каждом очень много биомонстров (конечное число, бой — данные; каждый этаж — свой мир tower1…tower9, широкий офисный
// этаж, src/locations/tower/tower.js), они мешают, но лестница всегда открыта: монстров можно не добивать. Десятый
// этаж заперт изнутри. На девятом он находит пульт радиоуправляемого вертолетика, спускается на улицу, запускает его с площадки
// и летит вдоль башни до крыши (управление как в GTA Vice City: src/quests/heli.js), где обезвреживает бомбу.
// Не успел до взрыва — квест откатывается к первому этажу, а героя выносит взрывной волной на улицу: можно пройти заново.
// Этажи, их враги и лестницы собраны циклами: результат — обычные данные.

// На каждом этаже очень много биомонстров, но число конечное (чем выше, тем больше: от 14 до 30). Они мешают и кусаются, но этаж можно не зачищать:
// по лестнице можно подниматься в любом случае. Ставим их по детерминированному разбросу, подальше от площадок у лестниц, где герой выходит.
const towerKinds = ['hound', 'hound', 'hound', 'strider', 'hound', 'maw', 'hound', 'strider'];
const towerFoeNames = { hound: 'Монстр', strider: 'Лесной ходок', maw: 'Болотная пасть' };
const towerSpots = (floor) => {
  const n = 12 + floor * 2; // 14 … 30
  let seed = 7919 * floor + 13;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const out = [];
  while (out.length < n) {
    const x = Math.round(-62 + rnd() * 124);
    const z = Math.round(-44 + rnd() * 88);
    if (Math.hypot(x - 50, z + 34) < 26 || Math.hypot(x + 50, z - 34) < 26) continue; // не у площадок перед лестницами
    if (Math.abs(x - 62) < 14 && Math.abs(z + 34) < 14) continue;
    out.push([x, z]);
  }
  return out;
};

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
  { on: 'spot:tower_door', if: ['quest:4.12', '!step:4.12.f1'], do: [{ teleport: 'tower.down1' }, { toast: 'Лифты обесточены. Наверх только по лестницам, а на этажах полно монстров.' }] },
];
for (let i = 1; i <= 9; i++) {
  // Метка шага: на улице к двери башни, на любом этаже до нужного — к лестнице вверх (зеленая стрелка)
  const markerTo = (lastFloor, target) => ({ main: 'tower.door', ...Object.fromEntries(Array.from({ length: lastFloor }, (_, j) => ['tower' + (j + 1), 'tower.up' + (j + 1)])), ...target });
  if (i < 9) {
    towerSteps.push({
      id: 'f' + i,
      text: 'Подняться с ' + i + ' этажа на ' + (i + 1) + ': монстров очень много, они мешают, но лестница всегда открыта',
      done: 'near:tower.down' + (i + 1),
      marker: markerTo(i, {}),
      hint: 'Лестница вверх у восточной стены на севере, рядом светится зеленая стрелка; лестница вниз в другой части этажа с оранжевой стрелкой. Монстров можно не добивать: идите к лестнице',
    });
    towerInteractions.push({ on: 'spot:stairs' + i, if: 'quest:4.12', do: [{ teleport: 'tower.down' + (i + 1) }, { heal: 25 }] }); // выходит у лестницы вниз следующего этажа
  }
  towerFights['f' + i] = {
    when: ['quest:4.12', 'step:4.12.go'],
    foes: towerSpots(i).map(([dx, dz], j) => {
      const kind = towerKinds[(j + i) % towerKinds.length];
      return { kind, name: towerFoeNames[kind], at: 'tower.f' + i, dx, dz, aggro: 32 };
    }),
    onWin: [{ toast: i + ' этаж зачищен от монстров.' }],
  };
  // Лестница вниз есть на каждом этаже: на первом — на улицу, на остальных — на этаж ниже, к его лестнице вверх
  towerInteractions.push({ on: 'spot:down' + i, if: 'quest:4.12', do: [{ teleport: i === 1 ? 'tower.door' : 'tower.up' + (i - 1) }] });
}
towerSteps.push(
  {
    id: 'remote',
    text: 'Найти на девятом этаже пульт вертолетика: десятый этаж заперт изнутри',
    done: 'has:rc_remote',
    marker: { main: 'tower.door', tower1: 'tower.up1', tower2: 'tower.up2', tower3: 'tower.up3', tower4: 'tower.up4', tower5: 'tower.up5', tower6: 'tower.up6', tower7: 'tower.up7', tower8: 'tower.up8', tower9: 'tower.f9' },
    hint: 'На девятом этаже ящик с запчастями от моделей, дверь выше заперта',
  },
  {
    id: 'out',
    text: 'Выйти на улицу к площадке вертолетика',
    done: 'near:tower.pad',
    marker: { main: 'tower.pad', tower9: 'tower.exit9' },
    hint: 'Аварийный выход с зеленой дверью на девятом этаже ведет на улицу к площадке',
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
  { on: 'spot:remote', if: ['quest:4.12', 'step:4.12.f8', '!has:rc_remote'], do: [{ dialog: '4.12.remote' }] },
  { on: 'spot:tower_exit', if: ['quest:4.12', 'step:4.12.f8'], do: [{ teleport: 'tower.pad' }] },
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
