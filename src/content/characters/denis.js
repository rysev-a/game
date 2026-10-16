// src/content/characters/denis.js
// Денис Ковалёв — друг детства героя, сержант полиции (docs/story/characters/denis.md).
// Общие реплики — здесь; разговоры, нужные одному квесту, лежат в файле этого квеста (starts, topics, nodes).

defineCharacter({
  id: 'denis',
  name: 'Денис',
  title: 'друг, полицейский',
  desc: 'Сержант городской полиции, друг детства. Живет в Сосновке, через пару домов.',
});

defineDialog('denis', {
  start: [{ goto: 'hub' }],
  nodes: {
    hub: {
      text: ['Макс, привет. Чего тебе?', 'Здорово, профессор. Что-то случилось?'],
      options: ['topics', { text: 'Ничего, зайду позже.', end: true }],
    },
  },
});
