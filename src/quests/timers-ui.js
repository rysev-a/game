// src/quests/timers-ui.js
// ТАЙМЕРЫ НА ЭКРАНЕ И ЗАНОС. Плашка с обратным отсчетом: пока у текущего шага квеста идет таймер (step.timer, src/core/game.js),
// у значка телефона висит «00:42», в последнюю четверть краснеет. Таймеры квестов идут в реальных секундах (limit: '55m' — это 55 секунд),
// игровые часы идут как в жизни и таймерам не мешают.
// Еще здесь считается время заноса героя за рулем в счетчик driftTime (условие count:driftTime>=3 в квестах про дрифт):
// занос — когда машина едет заметно быстрее шага и ее нос уходит от курса (car.slip, src/player/driving.js).

(function () {
  const g = questGame;

  const css = document.createElement('style');
  css.textContent = `
    #questTimer { margin: 0; padding: 4px 12px; border-radius: 8px; background: rgba(0,0,0,0.45); color: #fff;
      font: bold var(--fs-h1)/1.2 var(--font); display: none; font-variant-numeric: tabular-nums; pointer-events: none; text-align: center; }
    #questTimer small { display: none; }
    #questTimer.low { background: rgba(160,20,20,0.8); }
  `;
  document.head.appendChild(css);
  const el = document.createElement('div');
  el.id = 'questTimer';
  // Таймер — таймер телефона героя: он висит рядом со значком телефона (src/quests/journal-ui.js)
  (document.getElementById('phoneTimerSlot') || document.body).appendChild(el);

  const perSec = () => 1; // таймеры квестов идут в реальных секундах

  let shown = '';
  setInterval(() => {
    const t = g.currentTimer();
    if (!t) {
      if (shown) el.style.display = 'none';
      shown = '';
      return;
    }
    const sec = Math.ceil(t.left / perSec());
    const text = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
    if (text === shown) return;
    shown = text;
    el.replaceChildren(document.createTextNode(text));
    const small = document.createElement('small');
    small.textContent = 'Осталось';
    el.appendChild(small);
    el.classList.toggle('low', t.left < t.total * 0.25);
    el.style.display = 'inline-block';
  }, 250);

  // Занос: раз в 100 мс прибавляем 0,1 к счетчику, пока герой дрифтует (отдельно от кадров: счетчик хранится в сохранении)
  setInterval(() => {
    const car = typeof drivingCar !== 'undefined' && drivingCar;
    if (!car || Math.abs(car.speed) < 0.3 || Math.abs(car.slip || 0) < 0.22) return;
    g.state.counters.driftTime = Math.round(((g.state.counters.driftTime || 0) + 0.1) * 10) / 10;
    g.bump();
  }, 100);
})();
