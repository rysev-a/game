// src/content/characters/lyudmila.js
// Людмила Сергеевна Орлова — директор торгового центра (docs/story/characters/lyudmila.md). Стоит на первом этаже
// у входа (src/quests/hooks.js). Разговоры для квестов лежат в файлах квестов (starts, topics, nodes).

defineCharacter({
  id: 'lyudmila',
  name: 'Людмила Сергеевна',
  title: 'директор торгового центра',
  desc: 'Деловая, энергичная, знает всех покупателей в лицо. Вера была ее любимой покупательницей.',
});

defineDialog('lyudmila', {
  start: [{ goto: 'hub' }],
  nodes: {
    hub: {
      text: ['Здравствуйте. Чем могу помочь?', 'Максим? Редко ты заходишь не за лапшой и батарейками.'],
      options: ['topics', { text: 'Просто осматриваюсь.', end: true }],
    },
  },
});
