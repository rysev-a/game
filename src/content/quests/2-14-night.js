// src/content/quests/2-14-night.js
// 2.14 «Монстры у бабушки». Анна Петровна просит помочь: по ночам у дома ходят непонятные существа. Герой едет в Заречье,
// выслушивает ее, дожидается ночи и отбивает двор: несколько биосуществ, потом самый крупный из них. Бой идет только ночью
// (when: night), днем врагов нет. Награда: деньги и добрая память Анны Петровны.

defineQuest({
  id: '2.14',
  title: 'Монстры у бабушки',
  goal: 'Защитить дом Анны Петровны от ночных существ',
  giver: 'Анна Петровна',

  steps: [
    {
      id: 'visit',
      text: 'Поехать в Заречье к Анне Петровне: она звонила, просит помощи',
      done: 'near:zarechye.house',
      marker: 'zarechye.house',
      hint: 'Заречье на востоке, за рекой и мостом. Можно кликнуть по карте',
      timer: {
        limit: '70m',
        warn: { '60%': [{ toast: 'Анна Петровна одна и боится: время идет.' }] },
        onExpire: [
          { toast: 'Анна Петровна не дождалась и ушла к соседям. Возвращаетесь к кузнице и едете снова.' },
          { teleport: { to: 'yard.nikolai', car: true } },
        ],
        repeat: true,
      },
    },
    {
      id: 'talk',
      text: 'Выслушать Анну Петровну',
      done: 'step:2.14.talk',
      marker: 'zarechye.house',
      hint: 'Она во дворе у крыльца',
    },
    {
      id: 'night',
      text: 'Дождаться ночи у дома (после 22:00)',
      done: ['night', 'near:zarechye.house'],
      marker: 'zarechye.house',
      hint: 'Можно подождать у Анны Петровны: она предложит',
    },
    {
      id: 'defend',
      text: 'Отбить двор у существ: они выходят из леса и из оврага',
      done: 'fight:2.14.monsters',
      marker: 'zarechye.house',
      hint: 'Биосуществ берет огонь; дробовик и пулемет пригодятся',
    },
  ],

  onStart: [{ phone: { from: 'anna', text: 'Максимушка, по ночам у дома кто-то ходит. Не люди. Приезжай, мне страшно.' } }],
  onDone: [{ toast: 'Двор тихий. Надолго ли?' }, { start: '2.11' }],

  starts: { anna: [{ if: ['quest:2.14', '!step:2.14.talk'], goto: '2.14.meet' }, { if: ['quest:2.14', 'step:2.14.talk', '!night'], goto: '2.14.wait' }] },

  nodes: {
    meet: {
      text: 'Максимушка, слава богу. Каждую ночь у калитки кто-то ходит. Не люди: я в окно видела, как они на четырех лапах. Собака Верочкина выла, пока не охрипла. Помоги.',
      do: [{ reveal: 'Ф39' }, { step: '2.14.talk' }],
      options: [{ text: 'Разберусь. Я дождусь ночи здесь.', goto: 'stay' }, { text: 'Приеду ближе к ночи.', end: true }],
    },
    stay: {
      text: 'Заходи, пирогами накормлю. Они появляются, когда стемнеет.',
      do: [{ waitUntil: '22:00' }, { heal: 100 }],
      options: [{ text: 'Спасибо.', end: true }],
    },
    wait: {
      text: 'Рано еще. Они приходят, когда совсем стемнеет. Подождешь у меня?',
      options: [{ text: 'Подожду.', do: [{ waitUntil: '22:00' }], end: true }, { text: 'Еще вернусь.', end: true }],
    },
  },

  fights: {
    monsters: {
      when: ['quest:2.14', 'night', 'step:2.14.night'],
      foes: [
        { kind: 'hound', name: 'Ночное существо', at: 'zarechye.house', dx: -16, dz: -22, wave: 0, aggro: 45 },
        { kind: 'hound', name: 'Ночное существо', at: 'zarechye.house', dx: 16, dz: -22, wave: 0, aggro: 45 },
        { kind: 'hound', name: 'Ночное существо', at: 'zarechye.house', dx: 0, dz: -26, wave: 0, aggro: 45 },
        { kind: 'cyborg', name: 'Хозяин ночи', scale: 1.1, hp: 260, at: 'zarechye.house', dx: 0, dz: -30, wave: 1, aggro: 55 },
      ],
      onWin: [{ add: { money: 200 } }, { heal: 100 }, { toast: 'Анна Петровна сует вам в руки пирог и 200 на дорогу.' }],
    },
  },

  meta: { 'design.theme': 'защита', 'design.mood': 'тревога, ночь', 'design.mechanics': 'night fight, waitUntil' },
});
