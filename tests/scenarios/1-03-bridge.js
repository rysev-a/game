// Сценарий прохождения квеста 1.03 «У моста» (формат — src/core/scenario.js). Его запускает tests/content.test.js.

defineScenario('1.03', {
  title: 'У моста проходится от начала до конца',
  steps: [
    // Игра начинается со звонка Дениса; бак заполнен на дорогу до реки
    { expect: ['quest:1.03', '!step:1.03.phone', '!step:1.03.arrive', 'fuel:>=0.5'] },
    // Дома: телефон со столика (он звонит), навигатор в телефоне (миникарта), ключи из прихожей и открыть машину ключами
    { do: [{ give: 'phone' }], expect: 'step:1.03.phone' },
    { do: [{ flag: 'nav' }], expect: 'step:1.03.nav' },
    { do: [{ give: 'keys' }], expect: 'step:1.03.keys' },
    { do: [{ flag: 'carOpen' }], expect: 'step:1.03.car' },

    // Далеко от моста первый шаг не выполнен, у моста — выполнен
    { at: { x: 0, z: 0 }, expectNot: 'step:1.03.arrive' },
    { at: 'bridge.scene', expect: 'step:1.03.arrive' },

    // Разговор с Денисом: три ответа до конца; факты Ф1 и Ф2 открываются по дороге
    { talk: 'denis', pick: [0, 0, 0, 0], see: 'Вера Соколова', expect: ['step:1.03.denis', 'fact:Ф1', 'fact:Ф2'] },
    { expectNot: 'step:1.03.body' },
    { talk: 'denis', see: 'глянь' }, // после разговора Денис отсылает к телу

    // Осмотр тела: воспоминание из двух реплик
    { dialog: '1.03.flash', pick: [0, 0], see: 'бабушку Веры', expect: ['step:1.03.body', 'fact:Ф3', 'done:1.03', 'quest:1.06', 'fuel:>=0.5'] }, // следом выдается квест 1.06, бак пуст
    { talk: 'denis', see: 'Чего тебе', expectNot: 'quest:1.03' }, // квест закончен — Денис говорит как обычно
  ],
});

defineScenario('1.03-late', {
  title: 'Не успели к мосту: таймер возвращает героя домой, бак снова полный, попытка повторяется',
  steps: [
    { do: [{ give: 'phone' }, { flag: 'nav' }, { give: 'keys' }, { flag: 'carOpen' }, { fuel: 0.1 }] },
    { wait: '191m', expect: ['quest:1.03', '!step:1.03.arrive', 'fuel:>=0.5'] },
  ],
});

defineScenario('1.03-skip-ahead', {
  title: 'Осмотр тела до разговора: шаг отмечается сразу, квест заканчивается, когда выполнено всё',
  steps: [
    { do: [{ give: 'phone' }, { flag: 'nav' }, { give: 'keys' }, { flag: 'carOpen' }] },
    { dialog: '1.03.flash', pick: [0, 0], expect: 'step:1.03.body' },
    { expectNot: 'done:1.03' },
    { at: 'bridge.scene', expect: 'step:1.03.arrive' },
    { talk: 'denis', pick: [0, 0, 0, 0], expect: ['done:1.03'] },
  ],
});
