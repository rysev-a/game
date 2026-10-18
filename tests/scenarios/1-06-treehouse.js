// Сценарий прохождения квеста 1.06 «Домик на дереве» (формат — src/core/scenario.js).

defineScenario('1.06', {
  title: 'Домик на дереве проходится от начала до конца',
  steps: [
    { do: [{ start: '1.06' }], expect: ['quest:1.06', '!step:1.06.arrive', 'fuel:>=0.5'] }, // бак не обнуляется: что осталось, то осталось

    // Заречье, потом разговор с Анной Петровной: Ф4, Ф5, Ф6 по порядку реплик
    { at: { x: 0, z: 0 }, expectNot: 'step:1.06.arrive' },
    { at: 'zarechye.house', expect: 'step:1.06.arrive' },
    { talk: 'anna', pick: [0, 0, 0, 0], see: 'Сходи туда, где вы играли', expect: ['step:1.06.anna', 'fact:Ф4', 'fact:Ф5', 'fact:Ф6'] },
    { talk: 'anna', see: 'Иди, Максимушка', expectNot: 'step:1.06.cross' },

    // Овраг, дерево, домик
    { at: 'zarechye.tree', expect: 'step:1.06.cross' },
    { zone: 'treehouse', expect: 'step:1.06.climb' },

    // Ноутбук: квест перехватывает E, переписка из двух реплик
    { interact: 'station:laptop' },
    { dialog: '1.06.laptop', pick: [0], see: 'Потайная дверь', expect: ['step:1.06.laptop', 'fact:Ф7', 'fact:Ф8'] },

    // Рюкзак на сундуке: последний шаг, квест закончен
    { expectNot: 'done:1.06' },
    { do: [{ give: 'backpack' }, { give: 'bracelet' }], expect: ['step:1.06.backpack', 'done:1.06', 'quest:2.02'] }, // следом выдается квест 2.02
  ],
});
