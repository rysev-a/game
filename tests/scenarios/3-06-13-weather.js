// Сценарии квестов с погодой: 3.06 «Погода по заказу» (прибор Веры) и 3.13 «Нашествие роботов» (ливень против роботов).

defineScenario('3.06', {
  title: 'Погода по заказу: хмуро, домик на дереве, головоломка прибора, прибор в руках',
  done: ['1.03'],
  steps: [
    { expect: 'weather:gloom' }, // до прибора игра хмурая
    { do: [{ start: '3.06' }, { weather: 'storm' }, { elixir: 50 }], expect: ['quest:3.06', 'weather:storm'] },
    { zone: 'treehouse', expect: 'step:3.06.go' },
    { interact: 'station:workbench' },
    // Порядок: каркас, конденсатор, антенна, ионизатор, регулятор, эликсирная ячейка (две ошибки прощаются)
    { puzzle: '3.06.build', picks: ['frame', 'condenser', 'antenna', 'ionizer', 'regulator', 'cell'], expect: ['has:weather', 'fact:Ф44', 'step:3.06.build', 'done:3.06'] },
  ],
});

defineScenario('3.13', {
  title: 'Нашествие роботов: идут в город, ливень, роботы остановлены, дальше лаборатория',
  done: ['1.03'],
  steps: [
    { do: [{ start: '3.13' }, { give: 'weather' }, { elixir: 50 }], expect: ['quest:3.13', 'fact:Ф45', '!step:3.13.go'] },
    { at: 'city.library', expect: 'step:3.13.go' },
    { action: '3.13/rain', expect: ['weather:rain'] },
    { fight: '3.13.swarm', expect: ['fight:3.13.swarm', 'done:3.13', 'quest:4.09', 'weather:auto'] },
  ],
});
