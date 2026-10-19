// Сценарий прохождения квеста 2.05 «Первый эликсир» (формат — src/core/scenario.js).

defineScenario('2.05', {
  title: 'Первый эликсир проходится от начала до конца',
  steps: [
    { do: [{ start: '2.05' }], expect: ['quest:2.05', '!step:2.05.read'] },

    // Установка Веры без реагентов и без записей: квест перехватывает E и подсказывает, чего не хватает
    { interact: 'station:synth', expectNot: 'puzzle:2.05.elixir' },

    // Записи Веры: рецепт и порядок
    { interact: 'station:notes' },
    { dialog: '2.05.notes', pick: [0], see: 'квантово-полярные контуры', expect: 'step:2.05.read' },

    // Людмила в ТЦ: до чтения записей она отправляет назад, потом выдает набор
    { talk: 'lyudmila', pick: [0, 0], see: 'Квантово-полярный катализатор', expect: ['has:elixir_kit', 'step:2.05.shop', 'fact:Ф13'] },
    { talk: 'lyudmila', see: 'Чем могу помочь', expectNot: 'puzzle:2.05.elixir' }, // набор уже есть: обычный разговор

    // Назад в домик
    { zone: 'mall', expectNot: 'step:2.05.return' },
    { zone: 'treehouse', expect: 'step:2.05.return' },

    // Головоломка: ошибки не решают, правильный порядок решает; набор расходуется, эликсир прибавляется
    { interact: 'station:synth' },
    { puzzle: '2.05.elixir', picks: ['seed', 'vacuum', 'cool'], expectNot: 'puzzle:2.05.elixir' }, // неверный порядок
    {
      puzzle: '2.05.elixir',
      picks: ['vacuum', 'cool', 'tachyon', 'polar', 'antispin', 'entangle', 'chrono', 'seed'],
      expect: ['puzzle:2.05.elixir', 'fact:Ф14', 'done:2.05', '!has:elixir_kit'],
    },
  ],
});
