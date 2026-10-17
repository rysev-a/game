// src/content/characters/anna.js
// Анна Петровна — бабушка Веры, живет в Заречье (docs/story/characters/anna-petrovna.md).
// Общие реплики — здесь; разговор для квеста «Домик на дереве» лежит в файле этого квеста (starts, nodes).
// Те же три вопроса, что были у нее в заготовке здания (src/content/buildings/treehouse.js, simpleTalk).

defineCharacter({
  id: 'anna',
  name: 'Анна Петровна',
  title: 'бабушка Веры',
  desc: 'Бывшая учительница музыки, вдова. Живет в Заречье. Помнит героя лучше, чем он сам себя.',
});

defineDialog('anna', {
  start: [{ goto: 'hello' }],
  nodes: {
    hello: {
      text: 'Максимушка... Ты же совсем не изменился. Только похудел.',
      options: ['topics', { text: 'Что вы знаете?', goto: 'knows' }, { text: 'Чем вы можете помочь?', goto: 'help' }, { text: 'До свидания.', end: true }],
    },
    knows: {
      text: 'Они всё перевернули. А на дерево и не глянули. Взрослые никогда не смотрят наверх.',
      options: [{ text: 'Еще вопрос.', goto: 'hello' }, { text: 'До свидания.', end: true }],
    },
    help: {
      text: 'Пирогами накормлю. Иди через участок к оврагу, по бревну. Домик на дереве теперь твой.',
      options: [{ text: 'Еще вопрос.', goto: 'hello' }, { text: 'До свидания.', end: true }],
    },
  },
});
