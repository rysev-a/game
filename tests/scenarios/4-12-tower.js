// Сценарии прохождения квеста 4.12 «Бомба на крыше» (формат — src/core/scenario.js): девять этажей, пульт, вертолетик, таймер.

const floorSteps = [];
for (let i = 1; i <= 9; i++) {
  floorSteps.push({ fight: '4.12.f' + i, expect: 'step:4.12.f' + i });
  if (i < 9) floorSteps.push({ interact: 'spot:stairs' + i });
}

defineScenario('4.12', {
  title: 'Бомба на крыше проходится: этажи, пульт, вертолетик, обезвреживание',
  done: ['1.03'],
  steps: [
    { do: [{ start: '4.12' }], expect: ['quest:4.12', 'fact:Ф40'] },
    { interact: 'spot:stairs1' }, // лестница перекрыта: этаж не расчищен (квест лишь подсказывает)
    { at: 'tower.door', expect: 'step:4.12.go' },
    { interact: 'spot:tower_door' },
    ...floorSteps,
    { interact: 'spot:locked' }, // десятый этаж заперт
    { interact: 'spot:remote' },
    { dialog: '4.12.remote', pick: [0], expect: ['has:rc_remote', 'step:4.12.remote'] },
    { interact: 'spot:tower_exit' },
    { at: 'tower.pad', expect: 'step:4.12.out' },
    { interact: 'spot:helipad' },
    { heli: 'goal' },
    { dialog: '4.12.disarm', pick: [0], expect: ['step:4.12.fly', 'done:4.12', 'quest:4.11'] },
  ],
});

defineScenario('4.12-timeout', {
  title: 'Бомба на крыше: не успел — взрыв, квест откатывается к первому этажу',
  done: ['1.03'],
  steps: [
    { do: [{ start: '4.12' }] },
    { at: 'tower.door', expect: 'step:4.12.go' },
    { fight: '4.12.f1', expect: 'step:4.12.f1' },
    { fight: '4.12.f2', expect: 'step:4.12.f2' },
    { wait: '13m', expect: ['!step:4.12.f1', '!step:4.12.f2', '!fight:4.12.f1', 'step:4.12.go', 'quest:4.12'] }, // взрыв, откат
    { wait: '5m', expect: '!fight:4.12.f1' }, // таймер перезапущен, идет новая попытка
    { fight: '4.12.f1', expect: 'step:4.12.f1' },
  ],
});
