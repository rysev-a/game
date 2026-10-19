// Сценарии прохождения квестов 2.02, 2.06, 2.08, 2.09, 2.10 (формат — src/core/scenario.js).

defineScenario('2.02', {
  done: ['1.03'],
  title: 'Дело не закрыто проходится',
  steps: [
    { do: [{ start: '2.02' }], expect: ['quest:2.02', '!step:2.02.find'] },
    { at: { x: 0, z: 0 }, expectNot: 'step:2.02.find' },
    { at: 'village.denis', expect: 'step:2.02.find' },
    { talk: 'denis', pick: [0, 0, 0], see: 'Держи копии', expect: ['step:2.02.talk', 'fact:Ф10', 'fact:Ф11', 'has:case_photos', 'done:2.02', 'quest:2.05'] },
  ],
});

defineScenario('2.06', {
  done: ['1.03'],
  title: 'Читательский билет проходится',
  steps: [
    { do: [{ start: '2.06' }], expect: ['quest:2.06', 'has:library_card'] },
    { zone: 'library', expect: 'step:2.06.go' },
    { talk: 'semyon', pick: [0, 0, 0], see: 'алхимии', expect: ['fact:Ф15', 'flag:infocenter', 'done:2.06', 'quest:2.08'] },
  ],
});

defineScenario('2.06-no-card', {
  done: ['1.03'],
  title: 'Без билета Семён Аркадьевич отправляет за билетом',
  steps: [
    { do: [{ start: '2.06' }, { take: 'library_card' }] },
    { talk: 'semyon', see: 'Принесите билет' },
  ],
});

defineScenario('2.08', {
  done: ['1.03'],
  title: 'Анализатор проходится: Михалыч, вибраниум у Людмилы, станок',
  steps: [
    { do: [{ start: '2.08' }], expect: ['quest:2.08', 'has:bp_analyzer'] },
    { interact: 'spot:forge', expectNot: 'puzzle:2.08.bellows' }, // станок обесточен, пока не договорились
    { at: 'yard.forge' },
    { talk: 'mihalych', pick: [0, 0, 0], see: 'Без вибраниума никак', expect: ['step:2.08.smith', '!step:2.08.bring'] },
    { talk: 'lyudmila', pick: [0, 0], see: 'Заготовки пришли той же партией', expect: 'has:vibranium' },
    { talk: 'mihalych', pick: [0, 0, 0], see: 'держи подачу', expect: ['step:2.08.bring', '!has:vibranium', '!has:bp_analyzer'] },
    { talk: 'mihalych', see: 'Станок ждет' },
    { interact: 'spot:forge' },
    { puzzle: '2.08.bellows', picks: [0.5, 0.9, 0.5], expectNot: 'puzzle:2.08.bellows' }, // мимо: ошибка не решает
    { puzzle: '2.08.bellows', picks: [0.5, 0.45, 0.55, 0.5, 0.48, 0.5], expect: ['puzzle:2.08.bellows', 'has:analyzer', 'fact:Ф17', 'done:2.08', 'quest:2.09'] },
  ],
});

defineScenario('2.09', {
  done: ['1.03'],
  title: 'Чужие тормоза проходятся',
  steps: [
    { do: [{ start: '2.09' }] },
    { at: 'yard.garage', expect: 'step:2.09.go' },
    { talk: 'rustam', pick: [0, 0, 0], see: 'подпилена', expect: ['fact:Ф18', 'flag:rustam_discount', 'done:2.09', 'quest:2.10'] },
  ],
});

defineScenario('2.10', {
  done: ['1.03'],
  title: 'Ночной фургон проходится',
  steps: [
    { do: [{ start: '2.10' }] },
    { at: 'yard.nikolai', expect: 'step:2.10.go' },
    { talk: 'nikolay', pick: [0, 0, 0], see: 'Фургон без номеров', expect: ['fact:Ф19', 'flag:free_fuel', 'done:2.10'] },
  ],
});
