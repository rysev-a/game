// Сценарии квеста 2.15 «Пицца на время» (формат — src/core/scenario.js): пять заказов на мотороллере, у каждого таймер.

defineScenario('2.15', {
  title: 'Пицца на время проходится: Геннадий, мотороллер, пять заказов, расчет, дальше детали для оружия',
  done: ['1.03'],
  steps: [
    { do: [{ start: '2.15' }], expect: ['quest:2.15', '!step:2.15.go'] },
    { at: 'pizza.shop', expect: 'step:2.15.go' },
    { talk: 'gennady', pick: [0, 0], see: 'Первым едешь', expect: ['step:2.15.talk', '!step:2.15.ride'] },
    { drive: 'scooter', expect: 'step:2.15.ride' },
    { at: 'pizza.c1', expect: ['step:2.15.o1', 'count:money>=620'] },
    { at: 'pizza.c2', expect: 'step:2.15.o2' },
    { at: 'pizza.c3', expect: 'step:2.15.o3' },
    { at: 'pizza.c4', expect: 'step:2.15.o4' },
    { at: 'pizza.c5', expect: ['step:2.15.o5', 'count:money>=3100'] },
    { at: 'pizza.shop' },
    { talk: 'gennady', pick: [0], see: 'ни одна не остыла', expect: ['step:2.15.back', 'count:money>=3200', 'done:2.15', 'quest:2.13'] },
  ],
});

defineScenario('2.15-late', {
  title: 'Пицца на время: заказ остыл — клиент отказался, возврат на место прошлого заказа, деньги не платят',
  done: ['1.03'],
  steps: [
    { do: [{ start: '2.15' }] },
    { at: 'pizza.shop' },
    { talk: 'gennady', pick: [0, 0] },
    { drive: 'scooter' },
    { at: 'pizza.c1', expect: 'step:2.15.o1' },
    { wait: '31m', expect: ['quest:2.15', '!step:2.15.o2', 'step:2.15.o1'] }, // не успел ко второму заказу: попытка заново
    { at: 'pizza.c2', expect: ['step:2.15.o2', 'count:money>=1240'] },
  ],
});
