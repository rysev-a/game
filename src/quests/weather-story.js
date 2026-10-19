// src/quests/weather-story.js
// ПОГОДА СЮЖЕТА. В обычных играх погода — настройки; здесь ею управляет прибор Веры (вещь weather, квест 3.06), а до него игра хмурая.
// Режим лежит в состоянии сюжета (questGame.state.weatherMode) и меняется действием { weather: режим }:
//
//   gloom  хмуро: пасмурное небо и густой воздух, обычные дожди по расписанию (начало игры, до прибора)
//   storm  ужасный ливень без остановки, намного сильнее обычного: темно, шины почти не держат, машину заносит (день гонки, 3.05)
//   sun    ясное солнце, осадков нет (сама гонка)
//   (над треком — всегда sun, что бы ни было в сюжете)
//   auto   солнце: после гонки всегда солнечно. Изредка начинается дождь, прибор сам его разгоняет и тратит много эликсира:
//          «Надоел этот дождь!» — «Так то лучше!» (не бывает в квестах с призванным ливнем и туманом)
//   rain   призванный ливень: роботы коротят и гибнут под ним (3.13)
//   fog    сильный туман на весь город: люди в черном не найдут героя и Веру (5.02)
//
// Здесь только то, что требует кода игры: обертки updateSchedule и updateRain (src/world/weather.js), множитель сцепления для driving.js.

(function () {
  const g = questGame;
  // Над гоночным треком всегда ясное солнце: Максим включил прибор (в мире трека режим сюжета не действует)
  const mode = () => (GAME_LOCATION === 'track' ? 'sun' : g.state.weatherMode || 'gloom');

  // Плавные уровни режимов: переход не рывком
  const lv = { gloom: 0, sun: 0, storm: 0, fog: 0 };
  const want = (m) => ({
    gloom: m === 'gloom' ? 1 : 0,
    sun: m === 'sun' || m === 'auto' ? 1 : 0,
    storm: m === 'storm' || m === 'rain' ? 1 : 0,
    fog: m === 'fog' ? 1 : 0,
  });
  const stormSky = new THREE.Color(0x2a3644);
  const fogSky = new THREE.Color(0xbcc3c8);

  let autoRain = null; // идет случайный дождь, который прибор скоро разгонит: { until }

  // Сцепление шин: в ужасный ливень шины почти не держат
  weatherGripFactor = function () {
    return 1 - 0.62 * lv.storm;
  };

  // Настройка «Всегда солнечно» не отменяет погоду сюжета: хмурое небо, ливень и туман показываются в любом случае
  const withoutSunny = (fn) => {
    const was = settings.alwaysSunny;
    if (was && mode() !== 'sun' && mode() !== 'auto') settings.alwaysSunny = false;
    try {
      fn();
    } finally {
      settings.alwaysSunny = was;
    }
  };

  const origUpdateSchedule = updateSchedule;
  updateSchedule = function () {
    withoutSunny(origUpdateSchedule);
    const m = mode();
    if (m === 'gloom') return; // обычные дожди по расписанию
    snowOn = false;
    if (m === 'storm' || m === 'rain') rainOn = true;
    else rainOn = m === 'auto' && !!autoRain; // солнце, туман: осадков нет, кроме дождя, который сейчас разгонит прибор
  };

  const origUpdateRain = updateRain;
  updateRain = function () {
    withoutSunny(origUpdateRain);
    const t = want(mode());
    for (const k of Object.keys(lv)) lv[k] += (t[k] - lv[k]) * 0.02;
    const night = 1 - daylight();
    if (lv.gloom > 0.01) scene.background.lerp(rainSky, 0.55 * lv.gloom * (1 - night * 0.6));
    if (lv.sun > 0.01) scene.background.lerp(sunnySky, 0.85 * lv.sun * (1 - night));
    if (lv.storm > 0.01) scene.background.lerp(stormSky, 0.7 * lv.storm);
    if (lv.fog > 0.01) scene.background.lerp(fogSky, 0.95 * lv.fog * (1 - night * 0.5));
    scene.fog.color.copy(scene.background);
    let density = scene.fog.density * (1 + 0.35 * lv.gloom) * (1 - 0.35 * lv.sun) * (1 + 0.7 * lv.storm);
    density += (0.05 - density) * lv.fog; // туман на весь город: видно совсем недалеко
    scene.fog.density = Math.max(density, 0.004);
    rainTint.style.opacity = Math.max(+rainTint.style.opacity, 0.12 * lv.gloom, 0.36 * lv.storm).toFixed(3);
    rain.material.opacity = 0.5 + 0.35 * lv.storm;
  };

  // Раз в секунду: случайный дождь после гонки и его разгон прибором
  setInterval(() => {
    const m = mode();
    if (m !== 'auto' || !hasItem('weather')) {
      autoRain = null;
      return;
    }
    if (dialogueOpen) return;
    if (!autoRain) {
      if (Math.random() < 1 / 90) {
        autoRain = { until: Date.now() + 9000 + Math.random() * 6000 };
        showToast('Максим: «Надоел этот дождь!»', 3500);
      }
    } else if (Date.now() > autoRain.until) {
      const cost = Math.min(25, Math.floor(heroStats.elixir));
      heroStats.elixir -= cost;
      renderEquipHud();
      autoRain = null;
      showToast('Максим: «Так то лучше!» Прибор разогнал тучи' + (cost ? ': −' + cost + ' эликсира' : '. Эликсира уже нет, он разогнал их из последних сил'), 4500);
    }
  }, 1000);

  // Призванный ливень закорачивает роботов: каждые полсекунды им достается током
  let sparkWarned = false;
  setInterval(() => {
    if (mode() !== 'rain') {
      sparkWarned = false;
      return;
    }
    for (const t of combatTargets) {
      if (t.dead || t.kind !== 'robot') continue;
      if (!sparkWarned) {
        sparkWarned = true;
        showToast('Ливень! Роботы коротят: пули их почти не брали, а вода берет.', 3500);
      }
      hitTarget(t, { damage: 40, type: 'electric', hitsAll: true, x: t.x, z: t.z });
    }
  }, 500);
})();
