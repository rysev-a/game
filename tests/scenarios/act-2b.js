// Сценарии прохождения квестов 2.12, 2.13, 2.14 (формат — src/core/scenario.js).

defineScenario('2.12', {
  title: 'Погоня за чертежами проходится: занос, библиотека, чертежи',
  done: ['1.03'],
  steps: [
    { do: [{ start: '2.12' }], expect: ['quest:2.12', '!step:2.12.drive'] },
    { at: 'city.library', expectNot: 'step:2.12.drive' }, // приехал, но без заноса: заграждения не пройдены как надо
    { do: [{ add: { driftTime: 3.2 } }], expect: 'step:2.12.drive' },
    { talk: 'semyon', pick: [0], see: 'Вы успели', expect: ['has:bp_shotgun', 'has:bp_machinegun', 'fact:Ф38', 'done:2.12', 'quest:2.15'] },
  ],
});

defineScenario('2.12-timeout', {
  title: 'Погоня: не успел доехать — возврат на старт, не успел забрать — люди в черном у входа',
  done: ['1.03'],
  steps: [
    { do: [{ start: '2.12' }], expect: '!step:2.12.drive' },
    { wait: '56m', expect: ['quest:2.12', '!step:2.12.drive'] }, // таймер сработал и перезапустился (repeat)
    { wait: '30m', expect: '!step:2.12.drive' }, // новая попытка еще идет
    { at: 'city.library' },
    { do: [{ add: { driftTime: 4 } }], expect: 'step:2.12.drive' },
    { wait: '51m', expect: ['flag:mib', 'quest:2.12'] }, // не успел забрать чертежи
    { fight: '2.12.mib', expectNot: 'flag:mib' },
    { talk: 'semyon', pick: [0], expect: ['done:2.12', 'has:bp_shotgun'] },
  ],
});

defineScenario('2.13', {
  title: 'Сборка оружия проходится: прилавки, Михалыч, дробовик, пулемет',
  done: ['1.03'],
  steps: [
    { do: [{ start: '2.13' }, { give: 'bp_shotgun' }, { give: 'bp_machinegun' }, { add: { money: 400 } }], expect: ['quest:2.13', 'count:money>=400'] }, // деньги заработаны на пицце (2.15)
    { interact: 'spot:stall_pipes' },
    { interact: 'spot:stall_pipes' },
    { interact: 'spot:stall_parts' },
    { interact: 'spot:stall_parts' },
    { interact: 'spot:stall_parts' },
    { interact: 'spot:stall_wood', expect: ['step:2.13.shop', 'count:money>=0', 'count:money<100'] },
    { interact: 'spot:stall_wood' }, // все куплено: подсказка продавца, деньги целы
    { talk: 'mihalych', pick: [0, 0], see: 'раздувай горн', expect: ['step:2.13.bring', '!has:sg_pipe', '!has:bp_shotgun'] },
    { interact: 'spot:forge' },
    { puzzle: '2.13.shotgun', picks: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5], expect: ['has:shotgun', 'step:2.13.shotgun'] },
    { interact: 'spot:forge' },
    { puzzle: '2.13.machinegun', picks: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], expect: ['has:minigun', 'done:2.13', 'quest:2.14'] },
  ],
});

defineScenario('2.13-poor', {
  title: 'Без денег прилавок ничего не продает',
  done: ['1.03'],
  steps: [
    { do: [{ start: '2.13' }, { add: { money: 10 } }] },
    { interact: 'spot:stall_pipes', expectNot: 'has:sg_pipe' },
    { interact: 'spot:stall_wood', expectNot: 'has:sg_stock' },
  ],
});

defineScenario('2.14', {
  title: 'Монстры у бабушки проходятся: просьба, ожидание ночи, бой',
  done: ['1.03'],
  steps: [
    { do: [{ start: '2.14' }] },
    { at: 'zarechye.house', expect: 'step:2.14.visit' },
    { talk: 'anna', pick: [0, 0], see: 'Заходи, пирогами накормлю', expect: ['step:2.14.talk', 'fact:Ф39', 'step:2.14.night'] },
    { fight: '2.14.monsters', expect: ['fight:2.14.monsters', 'count:money>=200', 'done:2.14', 'quest:2.11'] },
  ],
});
