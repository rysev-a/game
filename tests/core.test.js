// Тесты ядра (src/core) на выдуманных данных: условия, действия, квесты, диалоги, журнал, сохранение, проверка.
// Запуск: npm test

const test = require('node:test');
const assert = require('node:assert/strict');
const { makeGame } = require('./helpers.js');

test('условия: вещи, флаги, счетчики и сравнения', () => {
  const { game, host } = makeGame(() => {});
  host.giveItem('copper', 3);
  game.state.flags.met = true;
  game.state.counters['gen.fuel'] = 4;
  assert.equal(game.check('has:copper'), true);
  assert.equal(game.check('has:copper>=3'), true);
  assert.equal(game.check('has:copper>3'), false);
  assert.equal(game.check('!has:zinc'), true);
  assert.equal(game.check('flag:met'), true);
  assert.equal(game.check('count:gen.fuel>=4'), true);
  assert.equal(game.check('count:gen.fuel<4'), false);
});

test('условия: список — все, any — хотя бы одно, not, пустое условие истинно', () => {
  const { game, host } = makeGame(() => {});
  host.giveItem('a');
  assert.equal(game.check(['has:a', 'has:b']), false);
  assert.equal(game.check({ any: ['has:a', 'has:b'] }), true);
  assert.equal(game.check({ not: 'has:a' }), false);
  assert.equal(game.check(undefined), true);
  assert.equal(game.check([]), true);
});

test('условия: время суток и номер дня', () => {
  const { game, host } = makeGame(() => {});
  host.time = 0; // 09:00 первого дня
  assert.equal(game.check('day'), true);
  assert.equal(game.check('night'), false);
  assert.equal(game.check('time:08:00-10:00'), true);
  assert.equal(game.check('day:>=2'), false);
  host.time = 14 * 60; // 23:00
  assert.equal(game.check('night'), true);
  assert.equal(game.check('time:22:00-06:00'), true); // через полночь
  host.time = 24 * 60;
  assert.equal(game.check('day:>=2'), true);
});

test('условия: места — at и near по положению игрока', () => {
  const { game, host } = makeGame((reg) => reg.definePlace('forge', { x: 100, z: 50, r: 10 }));
  host.pos = { x: 0, z: 0 };
  assert.equal(game.check('near:forge'), false);
  host.pos = { x: 105, z: 50 };
  assert.equal(game.check('near:forge'), true);
  assert.equal(game.check('at:forge'), true);
  host.zoneId = 'village';
  assert.equal(game.check('at:village'), true);
});

test('условия: неизвестный вид не ломает игру, а возвращает ложь', () => {
  const { game } = makeGame(() => {});
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(game.check('wat:1'), false);
  } finally {
    console.warn = warn;
  }
});

test('действия: вещи, флаги, счетчики, ветвление', () => {
  const { game, host } = makeGame(() => {});
  game.run([{ give: { copper: 2 } }, { give: 'key' }, { flag: 'x' }, { add: { n: 2 } }, { add: { n: 3 } }]);
  assert.equal(host.itemCount('copper'), 2);
  assert.equal(host.itemCount('key'), 1);
  assert.equal(game.state.counters.n, 5);
  game.run({ take: { copper: 1 } });
  assert.equal(host.itemCount('copper'), 1);
  game.run({ if: 'flag:x', then: [{ flag: 'then' }], else: [{ flag: 'else' }] });
  assert.equal(game.check(['flag:then', '!flag:else']), true);
  game.run({ unflag: 'x' });
  assert.equal(game.check('flag:x'), false);
});

test('действия: свое действие и именованный сценарий', () => {
  const { Core, game } = makeGame(() => {});
  Core.defineEffect('hello', (arg, g) => g.run({ flag: 'hello_' + arg }));
  game.run({ hello: 'world' });
  assert.equal(game.check('flag:hello_world'), true);
  Core.scripts.boom = (g) => g.run({ flag: 'boom' });
  game.run({ script: 'boom' });
  assert.equal(game.check('flag:boom'), true);
});

// Маленький квест на три шага для следующих тестов
const mini = (reg) => {
  reg.defineFact('Ф1', { text: 'Первый вывод' });
  reg.defineQuest({
    id: 'q1',
    title: 'Первый',
    autoStart: true,
    steps: [
      { id: 'a', text: 'Взять медь', done: 'has:copper' },
      { id: 'b', text: 'Сказать слово', done: 'step:q1.b' },
      { id: 'c', text: 'Дойти', done: 'flag:there' },
    ],
    onStep: { a: [{ flag: 'got_copper' }] },
    onDone: [{ reveal: 'Ф1' }, { start: 'q2' }],
  });
  reg.defineQuest({ id: 'q2', title: 'Второй', steps: [{ id: 'x', text: 'Что-то', done: 'flag:never' }] });
};

test('квест: начинается сам, шаги идут по порядку, конец выдает следующий квест', () => {
  const { game, host } = makeGame(mini);
  assert.equal(game.isActive('q1'), true);
  assert.equal(game.currentStep('q1').id, 'a');

  game.run({ flag: 'there' }); // третье условие выполнено раньше времени — шаг c дойдет до своей очереди
  assert.equal(game.currentStep('q1').id, 'a');

  host.giveItem('copper');
  game.settle();
  assert.equal(game.check('step:q1.a'), true);
  assert.equal(game.check('flag:got_copper'), true, 'onStep шага a');
  assert.equal(game.currentStep('q1').id, 'b');

  game.run({ step: 'q1.b' });
  assert.equal(game.isDone('q1'), true, 'шаг c уже был выполнен, поэтому квест закончился сразу');
  assert.equal(game.check('fact:Ф1'), true);
  assert.equal(game.isActive('q2'), true, 'onDone выдал следующий квест');
  assert.equal(game.state.tracked, 'q2');
});

test('квест: условие шага проверяется и по таймеру кадров (tick)', () => {
  const { game, host } = makeGame((reg) => {
    reg.definePlace('spot', { x: 0, z: 0, r: 5 });
    reg.defineQuest({ id: 'q', title: 'Q', autoStart: true, steps: [{ id: 'go', text: 'Дойти', done: 'near:spot' }] });
  });
  host.pos = { x: 100, z: 0 };
  for (let i = 0; i < 30; i++) game.tick();
  assert.equal(game.isActive('q'), true);
  host.pos = { x: 1, z: 1 };
  for (let i = 0; i < 10; i++) game.tick();
  assert.equal(game.isDone('q'), true);
});

test('квест: requires не пускает, пока условие ложно; квест не стартует дважды', () => {
  const { game } = makeGame((reg) => {
    reg.defineQuest({ id: 'q', title: 'Q', autoStart: true, requires: 'flag:ok', steps: [{ id: 's', text: 'S', done: 'flag:end' }] });
  });
  assert.equal(game.isActive('q'), false);
  game.run({ flag: 'ok' });
  assert.equal(game.isActive('q'), true);
  game.run({ flag: 'end' });
  assert.equal(game.isDone('q'), true);
  game.run({ start: 'q' });
  assert.equal(game.isDone('q'), true, 'выполненный квест не начинается снова');
});

test('события: talk и inspect отмечаются в состоянии и двигают шаги', () => {
  const { game } = makeGame((reg) => {
    reg.defineQuest({
      id: 'q',
      title: 'Q',
      autoStart: true,
      steps: [
        { id: 'a', text: 'A', done: 'talked:denis' },
        { id: 'b', text: 'B', done: 'inspected:body' },
      ],
    });
  });
  game.emit('talk', { who: 'denis', node: 'hub' });
  assert.equal(game.check('talk:denis.hub'), true);
  assert.equal(game.currentStep('q').id, 'b');
  game.emit('inspect', { id: 'body' });
  assert.equal(game.isDone('q'), true);
});

// Диалог на выдуманных данных
const withDialog = (reg) => {
  reg.defineCharacter({ id: 'mih', name: 'Михалыч', title: 'кузнец' });
  reg.defineFact('Ф17', { text: 'Вера хотела сделать браслет' });
  reg.defineDialog('mih', {
    start: [
      { if: '!talked:mih', goto: 'meet' },
      { goto: 'hub' },
    ],
    nodes: {
      meet: { text: 'Вымахал!', options: [{ text: 'Здравствуйте.', goto: 'hub' }] },
      hub: {
        text: ['Говори.', 'Ну?'],
        options: ['topics', { text: 'Расскажите про Веру.', reveal: 'Ф17', do: [{ flag: 'asked' }], once: true, goto: 'vera' }, { text: 'Пока.', end: true }],
      },
      vera: { text: 'Приносила чертеж.', next: 'hub' },
    },
    topics: [{ text: 'Про дизель', if: 'flag:diesel', goto: 'hub' }],
  });
  reg.defineQuest({
    id: 'q',
    title: 'Q',
    autoStart: true,
    steps: [{ id: 'bring', text: 'Принести', done: 'has:copper' }],
    topics: { mih: [{ text: 'Сделайте корпус', goto: 'q.case' }] },
    starts: { mih: [{ if: 'flag:rush', goto: 'q.rush' }] },
    nodes: {
      case: { text: 'Давай медь.', options: [{ text: 'Вот.', do: [{ give: 'copper' }], end: true }] },
      rush: { text: 'Некогда!', options: [{ text: 'Понял.', end: true }] },
    },
  });
};

test('диалог: вход выбирается по условию, ответы выполняют действия, следующий узел строится лениво', () => {
  const { game } = makeGame(withDialog);
  let node = game.dialogue('mih');
  assert.equal(node.speaker, 'Михалыч — кузнец');
  assert.equal(node.text, 'Вымахал!');
  assert.equal(game.check('talked:mih'), true);
  node = node.options[0].next();
  assert.equal(node.text, 'Говори.');
  const labels = node.options.map((o) => o.text);
  assert.deepEqual(labels, ['Сделайте корпус', 'Расскажите про Веру.', 'Пока.']);
  assert.equal(game.check('flag:asked'), false, 'действие варианта не выполняется, пока его не выбрали');
});

test('диалог: reveal, do и once; тема квеста пропадает, когда квест закончен', () => {
  const { game, host } = makeGame(withDialog);
  let node = game.dialogue('mih').options[0].next();
  const ask = node.options.find((o) => o.text === 'Расскажите про Веру.');
  ask.action();
  assert.equal(game.check(['fact:Ф17', 'flag:asked']), true);
  node = ask.next(); // vera → hub
  assert.equal(node.text, 'Приносила чертеж.');
  node = node.options[0].next();
  assert.ok(!node.options.some((o) => o.text === 'Расскажите про Веру.'), 'once: больше не показывается');

  const topic = node.options.find((o) => o.text === 'Сделайте корпус');
  const caseNode = topic.next();
  caseNode.options[0].action();
  assert.equal(host.itemCount('copper'), 1);
  assert.equal(game.isDone('q'), true);
  node = game.dialogue('mih');
  assert.ok(!node.options.some((o) => o.text === 'Сделайте корпус'), 'квест закончен — тема исчезла');
});

test('диалог: вход от активного квеста идет перед обычным', () => {
  const { game } = makeGame(withDialog);
  game.run({ flag: 'rush' });
  assert.equal(game.dialogue('mih').text, 'Некогда!');
  assert.equal(game.hasDialog('mih'), true);
  assert.equal(game.hasDialog('nobody'), false);
});

test('журнал: задания, шаги (виден только текущий), выводы, люди, сообщения', () => {
  const { game, host } = makeGame((reg) => {
    mini(reg);
    withDialog(reg);
  });
  host.time = 5;
  game.run([{ phone: { from: 'mih', text: 'Зайди' } }, { reveal: 'Ф1' }]);
  let j = game.journal();
  assert.equal(j.tasks.length, 2);
  const q1 = j.tasks.find((t) => t.id === 'q1');
  assert.deepEqual(q1.steps.map((s) => [s.text, s.done]), [['Взять медь', false]]);
  assert.equal(j.facts[0].text, 'Первый вывод');
  assert.equal(j.messages[0].name, 'Михалыч');
  assert.equal(j.people.length, 0);
  game.dialogue('mih');
  j = game.journal();
  assert.equal(j.people[0].name, 'Михалыч');
  host.giveItem('copper');
  game.settle();
  j = game.journal();
  assert.deepEqual(j.tasks.find((t) => t.id === 'q1').steps.map((s) => s.done), [true, false]);
});

test('метка на карте: место текущего шага отслеживаемого квеста', () => {
  const { game, host } = makeGame((reg) => {
    reg.definePlace('forge', { x: 10, z: 20, r: 8, name: 'Кузница' });
    reg.defineQuest({
      id: 'q',
      title: 'Q',
      autoStart: true,
      steps: [{ id: 'a', text: 'A', done: 'has:x', marker: 'forge' }, { id: 'b', text: 'B', done: 'flag:b' }],
    });
  });
  assert.deepEqual(game.currentMarker(), { id: 'forge', x: 10, z: 20, r: 8, name: 'Кузница' });
  host.giveItem('x');
  game.settle();
  assert.equal(game.currentMarker(), null, 'у второго шага места нет');
});

test('сохранение: снимок переживает JSON, restore возвращает квесты, факты и шаги', () => {
  const { game, Core, registry } = makeGame(mini);
  game.run([{ step: 'q1.a' }, { reveal: 'Ф1' }]);
  const saved = JSON.parse(JSON.stringify(game.snapshot()));
  const other = Core.createGame({ registry, host: Core.createTestHost() });
  other.restore(saved);
  assert.equal(other.check(['step:q1.a', 'fact:Ф1']), true);
  assert.equal(other.currentStep('q1').id, 'b');
  assert.equal(saved.version, Core.STORY_VERSION);
});

test('сохранение: старое сохранение без story начинает историю заново', () => {
  const { game } = makeGame(mini);
  game.run({ step: 'q1.a' });
  game.restore(undefined);
  assert.equal(game.check('step:q1.a'), false);
  assert.equal(game.isActive('q1'), true, 'autoStart сработал на пустой истории');
});

test('checkContent: находит битые ссылки и неизвестные виды', () => {
  const { Core, registry } = makeGame((reg) => {
    reg.defineQuest({
      id: 'bad',
      title: 'Плохой',
      next: 'ghost',
      steps: [
        { id: 'a', text: 'A', done: 'wat:1', marker: 'nowhere' },
        { id: 'a', text: 'Дубль', done: 'done:ghost' },
      ],
      onDone: [{ reveal: 'Ф404' }, { fly: 'away' }, { start: 'ghost' }, { dialog: 'bad.nope' }],
      topics: { stranger: [{ text: 'Привет', goto: 'bad.nope' }] },
    });
    reg.defineQuest({ id: 'empty', title: 'Пустой', steps: [] });
    reg.defineQuest({ id: 'empty', title: 'Дубль id', steps: [] });
  });
  const text = Core.checkContent(registry).join('\n');
  for (const piece of [
    'неизвестный вид условия «wat»',
    'нет места «nowhere»',
    'повторный id «a»',
    'нет квеста «ghost»',
    'нет факта «Ф404»',
    'неизвестное действие «fly»',
    'нет узла диалога «bad.nope»',
    'нет персонажа «stranger»',
    'квест empty] нет шагов',
    'повторное определение',
  ]) {
    assert.ok(text.includes(piece), 'должно быть найдено: ' + piece + '\n' + text);
  }
});

test('checkContent: вещи проверяются, когда передан список', () => {
  const { Core, registry } = makeGame((reg) => {
    reg.defineQuest({ id: 'q', title: 'Q', steps: [{ id: 'a', text: 'A', done: 'has:unicorn' }], onDone: [{ give: 'pony' }] });
  });
  assert.deepEqual(Core.checkContent(registry), [], 'без списка вещей вещи не проверяются');
  const text = Core.checkContent(registry, { items: ['keys'] }).join('\n');
  assert.ok(text.includes('unicorn') && text.includes('pony'));
});

test('meta: движок ее не читает, перепись показывает ключи', () => {
  const { Core, registry, game } = makeGame((reg) => {
    reg.defineQuest({ id: 'a', title: 'A', meta: { 'design.theme': 'x', 'todo.voice': true }, steps: [{ id: 's', text: 'S', done: 'flag:f' }] });
    reg.defineQuest({ id: 'b', title: 'B', meta: { 'design.theme': 'y' }, steps: [{ id: 's', text: 'S', done: 'flag:f' }] });
  });
  assert.deepEqual(Core.metaCensus(registry), { 'design.theme': 2, 'todo.voice': 1 });
  assert.deepEqual(game.snapshot().quests, {}, 'в сохранение meta не попадает');
});

test('сценарий: проходит и ловит невыполненные ожидания', () => {
  const { Core, registry } = makeGame((reg) => {
    mini(reg);
    withDialog(reg);
  });
  const ok = Core.runScenario(registry, {
    steps: [
      { expect: 'quest:q1' },
      { do: [{ give: 'copper' }], expect: 'step:q1.a' },
      { talk: 'mih', pick: [0, 0], see: 'Говори' },
      { wait: '2h', expect: 'day' },
    ],
  });
  assert.deepEqual(ok.failures, []);
  const bad = Core.runScenario(registry, { steps: [{ expect: 'done:q1' }, { talk: 'mih', pick: [9] }, { talk: 'ghost' }] });
  assert.equal(bad.ok, false);
  assert.equal(bad.failures.length, 3);
});

test('длительности: минуты, часы, дни', () => {
  const { Core } = makeGame(() => {});
  assert.equal(Core.parseDuration('90'), 90);
  assert.equal(Core.parseDuration('90m'), 90);
  assert.equal(Core.parseDuration('8h'), 480);
  assert.equal(Core.parseDuration('1d'), 1440);
  assert.throws(() => Core.parseDuration('скоро'));
});

test('interactions: активный квест перехватывает объект, пока выполняется условие', () => {
  const { game } = makeGame((reg) => {
    reg.defineQuest({
      id: 'q',
      title: 'Q',
      autoStart: true,
      steps: [{ id: 'read', text: 'Прочитать', done: 'step:q.read' }],
      interactions: [{ on: 'station:laptop', if: '!step:q.read', do: [{ flag: 'read_it' }, { step: 'q.read' }] }],
    });
  });
  assert.equal(game.interact('station:other'), false, 'чужой объект квест не берет');
  assert.equal(game.interact('station:laptop'), true);
  assert.equal(game.check(['flag:read_it', 'done:q']), true);
  assert.equal(game.interact('station:laptop'), false, 'квест выполнен — объект снова обычный');
});

test('таймеры: предупреждение, срабатывание один раз, repeat, пауза, currentTimer', () => {
  const { game, host } = makeGame((reg) => {
    reg.defineQuest({
      id: 'q',
      title: 'Q',
      autoStart: true,
      steps: [
        {
          id: 'run',
          text: 'Бежать',
          done: 'flag:there',
          timer: { limit: '10m', warn: { '50%': [{ flag: 'half' }] }, onExpire: [{ add: { late: 1 } }], repeat: true },
        },
      ],
    });
  });
  assert.equal(Math.round(game.currentTimer().left), 10);
  host.time = 6;
  game.settle();
  assert.equal(game.check('flag:half'), true, 'предупреждение на половине');
  assert.equal(Math.round(game.currentTimer().left), 4);
  host.paused = () => true;
  host.time = 9;
  game.settle();
  assert.equal(Math.round(game.currentTimer().left), 4, 'на паузе время таймера стоит');
  host.paused = () => false;
  host.time = 14;
  game.settle();
  assert.equal(game.state.counters.late, 1, 'сработал onExpire');
  assert.ok(game.currentTimer().left > 5, 'repeat: таймер пошел заново');
  game.run({ flag: 'there' });
  assert.equal(game.currentTimer(), null, 'шаг выполнен — таймера нет');
});

test('таймеры идут в реальных секундах, когда у хоста есть seconds: игровое время (оно идет как в жизни) им не мешает', () => {
  const { game, host } = makeGame((reg) => {
    reg.defineQuest({
      id: 'q',
      title: 'Q',
      autoStart: true,
      steps: [{ id: 'run', text: 'Бежать', done: 'flag:there', timer: { limit: '10m', onExpire: [{ add: { late: 1 } }] } }],
    });
  });
  let sec = 100;
  host.seconds = () => sec;
  const run = (seconds) => {
    for (let i = 0; i < seconds * 4; i++) {
      sec += 0.25; // кадры: за один тик больше полусекунды не засчитывается (вкладка свернута)
      game.settle();
    }
  };
  game.settle(); // первый вызов запоминает секунды
  host.time = 5000; // игровые часы убежали далеко (ждали ночь): таймер не трогаем
  game.settle();
  assert.ok(game.currentTimer().left > 9);
  run(4);
  assert.equal(Math.round(game.currentTimer().left), 6);
  host.paused = () => true;
  run(4);
  assert.equal(Math.round(game.currentTimer().left), 6, 'на паузе секунды не идут');
  host.paused = () => false;
  run(3);
  assert.equal(game.state.counters.late, undefined, 'после паузы осталось ~3 с');
  run(4);
  assert.equal(game.state.counters.late, 1);
});

test('таймер квеста: идет между start и until; rewind возвращает шаги, бои и головоломки', () => {
  const { game, host } = makeGame((reg) => {
    reg.defineQuest({
      id: 'q',
      title: 'Q',
      autoStart: true,
      timer: { limit: '5m', start: 'step:q.a', until: 'step:q.b', onExpire: [{ rewind: 'q.a' }] },
      steps: [
        { id: 'a', text: 'A', done: 'flag:a' },
        { id: 'b', text: 'B', done: 'flag:b' },
      ],
    });
  });
  assert.equal(game.currentTimer(), null, 'до start таймера нет');
  game.run({ flag: 'a' });
  assert.ok(game.currentTimer().left > 4);
  game.state.fights['q.f'] = true;
  host.time = 6;
  game.settle();
  assert.equal(game.state.fights['q.f'], undefined, 'rewind убрал и бои квеста');
  assert.equal(game.check('flag:a'), true, 'флаги остаются: шаг выполнится снова сам');
});

test('waitUntil: время идет до ближайшего такого часа', () => {
  const { game, host } = makeGame(() => {});
  host.time = 0; // 09:00
  game.run({ waitUntil: '22:00' });
  assert.equal(host.time, 13 * 60);
  game.run({ waitUntil: '22:00' }); // уже 22:00: ждем до следующих суток
  assert.equal(host.time, 13 * 60 + 24 * 60);
});

test('checkContent: таймеры, rewind, heli и бои проверяются', () => {
  const { Core, registry } = makeGame((reg) => {
    reg.defineQuest({
      id: 'bad',
      title: 'Плохой',
      timer: { limit: 'скоро', onExpire: [{ rewind: 'bad.nope' }, { heli: { from: 'x', goal: 'y' } }, { waitUntil: '25' }] },
      steps: [{ id: 'a', text: 'A', done: 'flag:a', timer: { limit: '1m', onExpire: [{ teleport: 'ghost' }] } }],
      fights: { f: { when: 'flag:x', foes: [{ kind: 'dragon', at: 'ghost' }] } },
    });
  });
  const text = Core.checkContent(registry).join('\n');
  for (const piece of ['timer.limit', 'rewind: нет шага', 'heli: нет места from', 'waitUntil', 'нет места в teleport', 'неизвестный вид врага «dragon»']) {
    assert.ok(text.includes(piece), 'должно быть найдено: ' + piece + '\n' + text);
  }
});

test('fuelEconomy: расход запоминается в состоянии и передается хосту', () => {
  const { game, host } = makeGame(() => {});
  game.run({ fuelEconomy: 50 });
  assert.equal(game.state.fuelEconomy, 50);
  assert.equal(host.fuelEconomy, 50);
  assert.equal(game.snapshot().fuelEconomy, 50, 'в сохранение попадает');
});
