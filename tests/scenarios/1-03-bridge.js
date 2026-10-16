// Сценарий прохождения квеста 1.03 «У моста» (формат — src/core/scenario.js). Его запускает tests/content.test.js.

defineScenario('1.03', {
  title: 'У моста проходится от начала до конца',
  steps: [
    { expect: ['quest:1.03', '!step:1.03.arrive'] },

    // Далеко от моста первый шаг не выполнен, у моста — выполнен
    { at: { x: 0, z: 0 }, expectNot: 'step:1.03.arrive' },
    { at: 'bridge.scene', expect: 'step:1.03.arrive' },

    // Разговор с Денисом: три ответа до конца; факты Ф1 и Ф2 открываются по дороге
    { talk: 'denis', pick: [0, 0, 0, 0], see: 'Вера Соколова', expect: ['step:1.03.denis', 'fact:Ф1', 'fact:Ф2'] },
    { expectNot: 'step:1.03.body' },
    { talk: 'denis', see: 'глянь' }, // после разговора Денис отсылает к телу

    // Осмотр тела: воспоминание из двух реплик
    { dialog: '1.03.flash', pick: [0], see: 'Девочка с плота', expect: ['step:1.03.body', 'fact:Ф3', 'done:1.03'] },
    { talk: 'denis', see: 'Чего тебе', expectNot: 'quest:1.03' }, // квест закончен — Денис говорит как обычно
  ],
});

defineScenario('1.03-skip-ahead', {
  title: 'Осмотр тела до разговора: шаг отмечается сразу, квест заканчивается, когда выполнено всё',
  steps: [
    { dialog: '1.03.flash', pick: [0], expect: 'step:1.03.body' },
    { expectNot: 'done:1.03' },
    { at: 'bridge.scene', expect: 'step:1.03.arrive' },
    { talk: 'denis', pick: [0, 0, 0, 0], expect: ['done:1.03'] },
  ],
});
