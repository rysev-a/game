// src/content/quests/3-13-robots.js
// 3.13 «Нашествие роботов». Барон мстит за яхту: по городу идут роботы (киборги, дроны, ходульные авангарды). Пули их почти не берут
// (много здоровья), зато они боятся воды: герой вызывает прибором Веры ливень (погода сюжета rain, src/quests/weather-story.js),
// и под дождем роботы коротят и гибнут. Кнопка «Вызвать ливень» — в журнале (приложение «Задания» телефона). Бой — данные (fights).

defineQuest({
  id: '3.13',
  title: 'Нашествие роботов',
  goal: 'Остановить роботов Барона в городе',
  giver: 'Денис',

  steps: [
    {
      id: 'go',
      text: 'Добраться до городской площади у библиотеки: там роботы',
      done: 'near:city.library',
      marker: 'city.library',
      hint: 'Библиотека в городе у трассы. Роботы идут от реки',
      timer: {
        limit: '45m',
        warn: { '60%': [{ toast: 'Роботы уже на площади! Быстрее!' }] },
        onExpire: [
          { toast: 'Роботы прошли по городу, пока вы возились. Возвращаетесь к реке и пробуете снова.' },
          { teleport: { to: 'river.yacht', car: true } },
        ],
        repeat: true,
      },
    },
    {
      id: 'swarm',
      text: 'Вызвать прибором ливень и остановить роботов (пули их почти не берут)',
      done: 'fight:3.13.swarm',
      marker: 'city.library',
      hint: 'Телефон (J), «Задания», кнопка «Вызвать ливень». Под дождем роботы коротят. Продержитесь, пока они не остановятся',
    },
  ],

  onStart: [
    { phone: { from: 'denis', text: 'Макс! По городу идут роботы, стрелять бесполезно, наши отступают. Вспомни, что Вера писала про воду!' } },
    { reveal: 'Ф45' },
  ],
  onDone: [{ weather: 'auto' }, { toast: 'Роботы остановлены. Барон пошел ва-банк: теперь только лаборатория.' }, { start: '4.09' }],

  actions: [
    {
      id: 'rain',
      text: 'Вызвать ливень прибором (−30 эликсира)',
      if: ['quest:3.13', 'step:3.13.go', '!weather:rain', 'has:weather'],
      do: [{ elixir: -30 }, { weather: 'rain' }, { toast: 'Прибор гудит, небо чернеет: ливень стеной!' }],
    },
  ],

  fights: {
    swarm: {
      when: ['quest:3.13', 'step:3.13.go'],
      foes: [
        { kind: 'cyborg', name: 'Робот Барона', hp: 700, at: 'city.library', dx: -26, dz: 6, wave: 0, aggro: 60 },
        { kind: 'cyborg', name: 'Робот Барона', hp: 700, at: 'city.library', dx: 26, dz: -6, wave: 0, aggro: 60 },
        { kind: 'drone', name: 'Дрон Барона', hp: 300, at: 'city.library', dx: 0, dz: -24, wave: 0, aggro: 60 },
        { kind: 'stilt', name: 'Ходульный авангард', hp: 600, at: 'city.library', dx: -30, dz: -12, wave: 1, aggro: 60 },
        { kind: 'drone', name: 'Дрон Барона', hp: 300, at: 'city.library', dx: 28, dz: 14, wave: 1, aggro: 60 },
        { kind: 'cyborg', name: 'Робот Барона', hp: 700, at: 'city.library', dx: 0, dz: 28, wave: 1, aggro: 60 },
      ],
      onWin: [{ toast: 'Последний робот коротит и падает. Дождь стихает.' }],
    },
  },

  meta: { 'design.theme': 'нашествие и вода', 'design.mood': 'напряжение', 'design.mechanics': 'story weather (rain), fight with immune-ish robots, quest action' },
});
