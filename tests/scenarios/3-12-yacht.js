// Сценарии прохождения квеста 3.12 «Яхта Барона» (формат — src/core/scenario.js): места происшествий, вечер, киборги, платы, накладная.

defineScenario('3.12', {
  title: 'Яхта Барона проходится: следы, вечер, бой с киборгами, серийные номера',
  done: ['1.03'],
  steps: [
    { do: [{ start: '3.12' }], expect: ['quest:3.12', 'fact:Ф41', 'has:arc_discharger'] },
    { interact: 'spot:inc1', expect: 'count:clues>=1' },
    { interact: 'spot:inc2', expect: ['count:clues>=2', 'step:3.12.clues'] },
    { at: 'river.yacht', expectNot: 'step:3.12.evening' }, // днем у яхты рано
    { action: '3.12/wait', expect: 'step:3.12.evening' }, // дождались 19:00 прямо у яхты
    { fight: '3.12.yacht', expect: 'step:3.12.yacht' },
    { interact: 'spot:wreck' },
    { dialog: '3.12.serials', pick: [0, 0], see: 'партия отгружена', expect: ['has:chips', 'fact:Ф42', 'fact:Ф43', 'step:3.12.parts', 'done:3.12', 'quest:3.13'] },
  ],
});
