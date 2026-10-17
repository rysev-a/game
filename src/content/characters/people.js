// src/content/characters/people.js
// Второстепенные союзники героя: Михалыч, Рустам, Николай Палыч, Семён Аркадьевич (docs/story/characters/*.md).
// at — где персонаж стоит (место из src/quests/places.js), dx и dz — смещение от центра места, yaw — куда смотрит.
// Разговоры для квестов лежат в файлах квестов (starts, topics, nodes); здесь — общие реплики.

defineCharacter({
  id: 'mihalych',
  name: 'Михалыч',
  title: 'кузнец',
  desc: 'Мастер на все руки за шестьдесят: кует, варит, точит. Знал Максима с детства: тот бегал смотреть на горн.',
  at: 'yard.forge',
  dz: 4,
  yaw: Math.PI,
});
defineDialog('mihalych', {
  start: [{ goto: 'hub' }],
  nodes: {
    hub: {
      text: ['Говори, не стой.', 'Ну? Чего тебе?'],
      options: ['topics', { text: 'Ничего, зайду позже.', end: true }],
    },
  },
});

defineCharacter({
  id: 'rustam',
  name: 'Рустам',
  title: 'автомеханик',
  desc: 'Веселый и шумный хозяин автомастерской, обожает машины. Чинил машину Веры.',
  at: 'yard.garage',
  dz: 4,
  yaw: Math.PI,
});
defineDialog('rustam', {
  start: [{ goto: 'hub' }],
  nodes: {
    hub: {
      text: ['Брат, твоя бирюзовая — это не машина, это аквариум. Давай сделаем из нее танк.', 'О, Макс! Что у тебя сломалось?'],
      options: ['topics', { text: 'Пока ничего. Зайду позже.', end: true }],
    },
  },
});

defineCharacter({
  id: 'nikolay',
  name: 'Николай Палыч',
  title: 'начальник заправки',
  desc: 'Бывший дальнобойщик, обстоятельный и наблюдательный. Видит всех, кто едет по трассе.',
  at: 'yard.nikolai',
  yaw: Math.PI,
});
defineDialog('nikolay', {
  start: [{ goto: 'hub' }],
  nodes: {
    hub: {
      text: ['Заправляйся, Макс, не стесняйся. Колонки свободны.', 'Здорово. Трасса сегодня тихая.'],
      options: ['topics', { text: 'Спасибо, я просто так.', end: true }],
    },
  },
});

defineCharacter({
  id: 'semyon',
  name: 'Семён Аркадьевич',
  title: 'директор библиотеки',
  desc: 'Пожилой бывший физик-теоретик, ушедший из науки в книги. Знает архивы города и историю лаборатории.',
});
defineDialog('semyon', {
  start: [{ goto: 'hub' }],
  nodes: {
    hub: {
      text: ['Молодой человек, вы опять пришли за документацией?', 'Здравствуйте. Чем могу помочь?'],
      options: ['topics', { text: 'Что вы знаете?', goto: 'knows' }, { text: 'Я просто зашел.', end: true }],
    },
    knows: {
      text: 'Вера часами сидела в информационном центре. А в архиве есть фото Штерна с одним «инвестором».',
      options: [{ text: 'Спасибо.', goto: 'hub' }],
    },
  },
});

defineCharacter({
  id: 'vera',
  name: 'Вера',
  title: 'девушка из лаборатории',
  desc: 'Веселая, мечтательная, смелая. Появляется живой только в финале, когда герой возвращается в прошлое.',
  gender: 'female',
});
defineDialog('vera', {
  start: [{ goto: 'hub' }],
  nodes: {
    hub: {
      text: 'Ты меня наконец-то узнал, профессор.',
      options: [{ text: 'Узнал.', end: true }],
    },
  },
});
