// Сценарии прохождения квеста 3.05 «Крутая тачка» (формат — src/core/scenario.js): поломка, договор, ночь, гонка, подарок, погоня.

const raceSteps = [];
for (let i = 1; i <= 8; i++) raceSteps.push({ at: 'track.cp' + i, expect: 'count:cp>=' + i });

defineScenario('3.05', {
  title: 'Крутая тачка проходится: Рустам, ожидание утра, гонка, подарок, погоня',
  done: ['1.03'],
  steps: [
    { do: [{ start: '3.05' }, { flag: 'braceletCased' }], expect: ['quest:3.05', '!step:3.05.ride'] },
    { at: 'yard.garage', expect: 'step:3.05.ride' },
    { talk: 'rustam', pick: [0, 0, 0], see: 'Как новая', expect: ['step:3.05.talk', 'dayssince:deal<1', 'weather:storm', 'quest:3.06'] }, // ужасный ливень, шины не держат
    { zone: 'treehouse' }, // прибор погоды Веры собран (3.06)
    { do: [{ give: 'weather' }], expect: 'done:3.06' },
    { zone: 'none' },
    { action: '3.05/practice' }, // тренировка: открывается выбор машины (у хоста)
    { action: '3.05/sleep', expectNot: 'step:3.05.morning' }, // до 07:30: на треке еще рано
    { at: 'track.start', expect: ['dayssince:deal>=1', '!step:3.05.morning'] },
    { wait: '40m', expect: ['step:3.05.morning', 'quest:3.05', 'weather:sun'] }, // восемь часов утра: прибор разогнал тучи
    { drive: true },
    ...raceSteps,
    { at: 'track.start', expect: ['count:cp>=9', 'step:3.05.race'] },
    { talk: 'rustam', pick: [0, 0], see: 'Это не езда, это танец', expect: ['step:3.05.win', 'weather:auto'] },
    { at: 'mall.entrance', expect: ['step:3.05.chase', 'done:3.05', 'quest:3.12'] },
  ],
});

defineScenario('3.05-late', {
  title: 'Крутая тачка: не уложился в гонку — еще попытка; не ушел от погони — убили и снова на старт',
  done: ['1.03'],
  steps: [
    { do: [{ start: '3.05' }, { flag: 'braceletCased' }] },
    { at: 'yard.garage' },
    { talk: 'rustam', pick: [0, 0, 0] },
    { zone: 'treehouse' },
    { do: [{ give: 'weather' }] },
    { zone: 'none' },
    { action: '3.05/sleep' },
    { at: 'track.start' },
    { wait: '40m', expect: 'step:3.05.morning' },
    { drive: true },
    { at: 'track.cp1', expect: 'count:cp>=1' },
    { wait: '56m', expect: ['count:cp<1', 'step:3.05.morning', '!step:3.05.race', 'quest:3.05'] }, // время вышло: счет с нуля, новая попытка
    ...raceSteps,
    { at: 'track.start', expect: 'step:3.05.race' },
    { talk: 'rustam', pick: [0, 0], expect: 'step:3.05.win' },
    { wait: '19m', expect: ['step:3.05.win', '!step:3.05.chase'] }, // не успел: убили, откат погони, новая попытка
    { at: 'mall.entrance', expect: ['step:3.05.chase', 'done:3.05'] },
  ],
});
