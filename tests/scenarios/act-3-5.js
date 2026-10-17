// Сценарии прохождения квестов 2.11, 3.04, 4.09, 4.11, 5.02 (формат — src/core/scenario.js).

defineScenario('2.11', {
  title: 'Вспышка: ноутбук, затем бой',
  done: ['1.03'],
  steps: [
    { do: [{ start: '2.11' }] },
    { zone: 'treehouse', expect: 'step:2.11.return' },
    { interact: 'station:laptop', expect: 'step:2.11.take' },
    { fight: '2.11.flash', expect: ['fight:2.11.flash', 'has:invoice', 'fact:Ф20', 'done:2.11', 'quest:3.04'] },
  ],
});

defineScenario('3.04', {
  title: 'Корпус для браслета проходится: голубятня, три ночи, горн, эликсир',
  done: ['1.03'],
  steps: [
    { do: [{ start: '3.04' }] },
    { interact: 'spot:loft' },
    { expect: 'has:bp_bracelet' },
    { interact: 'spot:server', expect: 'count:nights>=1' },
    { interact: 'spot:server' },
    { interact: 'spot:server', expect: ['count:nights>=3', 'step:3.04.calc'] },
    { wait: '0', expect: '!step:3.04.bring' },
    { talk: 'mihalych', pick: [0, 0], see: 'раздувай горн', expect: ['step:3.04.bring', '!has:bp_bracelet'] },
    { interact: 'spot:forge' },
    { puzzle: '3.04.bellows', picks: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], expect: ['puzzle:3.04.bellows', 'step:3.04.forge'] },
    { interact: 'station:workbench', expectNot: 'flag:braceletCased' }, // эликсира нет: квест лишь подсказывает
    { do: [{ elixir: 20 }] },
    { interact: 'station:workbench', expect: ['flag:braceletCased', 'fact:Ф23', 'done:3.04', 'quest:3.05'] },
  ],
});

defineScenario('4.09', {
  title: 'Лаборатория и Барон проходятся: стол, люк, арсенал, зал, Барон',
  done: ['1.03'],
  steps: [
    { do: [{ start: '4.09' }], expect: 'quest:4.09' },
    { at: 'lab.gate', expect: 'step:4.09.gate' },
    { interact: 'spot:hatch', expectNot: 'step:4.09.desk' }, // люк закрыт, пока не найдена записка
    { interact: 'spot:lab_desk', expect: ['step:4.09.desk', 'fact:Ф33'] },
    { interact: 'spot:hatch' },
    { puzzle: '4.09.lock', picks: ['star'], expectNot: 'puzzle:4.09.lock' }, // знак не тот: ошибка
    { puzzle: '4.09.lock', picks: ['circle', 'star', 'square', 'triangle'], expect: ['puzzle:4.09.lock', 'step:4.09.hatch'] },
    { interact: 'spot:arsenal', expect: ['step:4.09.arsenal', 'has:plasma_gun', 'fact:Ф35'] },
    { fight: '4.09.hall', expect: ['step:4.09.hall'] },
    { fight: '4.09.baron', expect: ['step:4.09.baron', 'done:4.09', 'quest:4.12'] },
  ],
});

defineScenario('4.11', {
  title: 'Артефакт: сейф Штерна и записка Веры',
  done: ['1.03'],
  steps: [
    { do: [{ start: '4.11' }] },
    { interact: 'spot:safe' },
    { dialog: '4.11.safe', pick: [0], see: 'Только потрать всё', expect: ['has:artifact', 'fact:Ф36', 'step:4.11.office', 'done:4.11', 'quest:5.02'] },
  ],
});

defineScenario('5.02', {
  title: 'Вдвоем: артефакт, прошлое, Вера, Штерн, утро',
  done: ['1.03'],
  steps: [
    { do: [{ start: '5.02' }, { give: 'artifact' }, { give: 'weather' }] },
    { zone: 'treehouse', expect: 'step:5.02.home' },
    { interact: 'station:workbench', expectNot: 'step:5.02.charge' }, // эликсира нет: подсказка
    { do: [{ elixir: 50 }] },
    { interact: 'station:workbench' },
    { dialog: '5.02.travel', pick: [0], expect: 'step:5.02.charge' },
    { talk: 'vera', pick: [0, 0], see: 'Ты меня наконец-то узнал', expect: 'step:5.02.vera' },
    { talk: 'vera', see: 'Идем' },
    { action: '5.02/fog', expect: ['weather:fog', 'step:5.02.fog'] }, // люди в черном ищут: туман на весь город
    { fight: '5.02.stern', expect: ['fight:5.02.stern', 'step:5.02.end', 'done:5.02', 'weather:sun'] },
  ],
});
