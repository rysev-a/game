// src/engine/settings.js
// НАСТРОЙКИ. Шестеренка внизу слева (или клавиша O, или Esc, когда закрывать и отменять нечего и герой не в бою — src/engine/mouse-look.js) открывает окно с вкладками:
//   Звук        — общая громкость; фоновые звуки (зоны и дождь) и звуки (двигатель, фраза, шаги, выстрелы):
//                 у каждой группы своя громкость и кнопка «без звука».
//   Погода      — дождь и снег (сняли галочку — их не бывает вовсе), как часто идет дождь (src/world/weather.js).
//   Управление  — чувствительность мыши (вид колесом и прицел в бою), список клавиш в обычном режиме и в бою.
//   Режим боя   — автонаведение: выстрел по взгляду сам доводится на ближайшую цель (assistTarget, src/engine/weapons.js);
//                 вид от первого лица (только компьютер): камера в глазах героя, мышь резче, без автонаведения
//                 (src/engine/mouse-look.js).
//   Вождение    — глубина заноса на ручнике (Space) и в дрифте (газ+ручник), резкость торможения и разгона, чувствительность руля
//                 (src/player/driving.js).
//   Карта       — показывать миникарту, ее размер, север всегда сверху, прохожие на карте (src/engine/minimap.js).
// Внизу окна — версия игры (нажали — история версий) и справа «Сбросить»: все настройки по умолчанию.
// Значения запоминаются в браузере (localStorage, ключи game.<имя>). Пока меню открыто, игровые клавиши не работают.
// Новая настройка: значение по умолчанию в SETTINGS_DEFAULTS и строка во вкладке в settingsTabs.
// Строки, которые другие файлы вставляют перед .hint (гироскоп на телефоне), переезжают в подходящую вкладку.

const SETTINGS_DEFAULTS = {
  volume: 1, // общая громкость 0..1
  ambient: true, // фоновые звуки включены
  ambientVolume: 1,
  effects: true, // звуки (двигатель, фраза, шаги, выстрелы) включены
  effectsVolume: 1,
  shadows: true, // «Игра»: тени от солнца (только компьютер, src/engine/scene.js)
  bloom: true, // «Игра»: свечение фонарей, фар и оружия (только компьютер, src/engine/scene.js)
  alwaysSunny: false, // всегда солнечно: ясный яркий день, без осадков и ночи (src/engine/clock.js, src/world/weather.js)
  rain: true,
  snow: true,
  rainFreq: 'normal', // 'rare' | 'normal' | 'often'
  mouseSens: 1, // множитель чувствительности мыши
  showPath: true, // «Игра»: стрелки направления к цели квеста на земле и на карте (src/quests/guide.js)
  showObjects: true, // «Игра»: подсветка того, к чему нужно подойти (src/quests/guide.js)
  clickInteract: true, // клик по человеку, двери и машине: герой подойдет сам (src/player/click-move.js)
  autoAim: true,
  firstPerson: false, // вид от первого лица в БОЮ (компьютер): отдельный флаг, от вождения не зависит
  driftLevel: 0.5, // 0..1 — насколько глубоко заносит на ручнике и в дрифте (1 — прежние 20%, src/player/driving.js)
  driftInertia: 1, // 0..2 — как долго машина катится по инерции после выхода из дрифта (0 — сразу теряет скорость)
  bounce: 1, // 0..2 — жесткость отскока: как далеко машину отбрасывает от покрышек и бочек (src/player/driving.js)
  tireKnock: true, // сильный удар выбивает покрышки трассы: они отлетают, и машина едет дальше (src/demo/race.js)
  bounceLoss: 0.6, // 0..1 — сколько скорости в сторону препятствия гаснет при ударе о покрышки (остальное — отскок назад)
  bounceSoft: 1, // 0.5..2 — мягкость: как долго длится отталкивание
  cockpitView: false, // отдельный флаг — вид от первого лица в ВОЖДЕНИИ, от боевого не зависит: за рулем камера в салоне, перед ней руль и руки (src/player/driving.js; клавиша V)
  maxSpeedKmh: 0, // 0..1000 км/ч: предел скорости любой машины героя; 0 — у каждой машины свой (effectiveKind, src/player/driving.js)
  infiniteFuel: false, // бак всегда полный (галочка в окне отладки, src/quests/debug.js)
  infiniteElixir: false, // шкала эликсира всегда полная (галочка в окне отладки)
  tireGrip: 1, // 0.2..2 — сцепление шин в обычной езде и скорость, с которой они его возвращают после заноса
  handbrakeGrip: 1, // 0..2 — сцепление задних колес на ручнике и в дрифте (меньше — скользят сильнее, можно развернуться)
  handbrakePower: 1, // 0..2 — как сильно ручник тормозит
  slideLoss: 1, // 0..3 — потеря скорости при скольжении боком
  spinInertia: 1, // 0.2..3 — инерция вращения кузова в заносе
  coastInertia: 1, // 0.3..3 — накат без газа: больше — машина катится дольше (src/player/driving.js)
  nitroPower: 2.5, // 0.5..8 — во сколько раз сильнее разгон по двойному W за рулем (1 — выключено)
  reverseSpeed: 2, // 0.5..4 — во сколько раз гоночные едут задним ходом быстрее прежнего (предел и ускорение; src/player/driving.js)
  brakeSharp: 1, // множители к торможению, разгону и рулю машины
  accelSharp: 1,
  steerSens: 1,
  minimap: true,
  minimapSize: 320, // пикселей (только компьютер)
  mapNorthUp: false, // север сверху: миникарта не крутится вместе с камерой
  mapPeople: true, // прохожие на карте
};
const settings = { ...SETTINGS_DEFAULTS };

// Хранение: булевы — 'on'/'off', числа — строкой (так же лежали прежние game.volume, game.ambient, game.rain)
function loadSetting(key) {
  let raw = null;
  try {
    raw = localStorage.getItem('game.' + key);
  } catch (e) {
    // localStorage недоступен (приватный режим и т. п.) — остается значение по умолчанию
  }
  if (raw === null) return;
  const def = SETTINGS_DEFAULTS[key];
  if (typeof def === 'boolean') settings[key] = raw !== 'off';
  else if (typeof def === 'number') {
    const v = parseFloat(raw);
    if (!Number.isNaN(v)) settings[key] = v;
  } else settings[key] = raw;
}
function saveSetting(key) {
  const v = settings[key];
  try {
    localStorage.setItem('game.' + key, typeof v === 'boolean' ? (v ? 'on' : 'off') : String(v));
  } catch (e) {
    // не страшно: просто не запомнится
  }
}
for (const key of Object.keys(SETTINGS_DEFAULTS)) loadSetting(key);
settings.volume = Math.min(1, Math.max(0, settings.volume));
// Прежняя шкала заноса (game.driftDepth) была в 5 раз круче: ее 20% — это нынешние 100%
try {
  const oldDrift = parseFloat(localStorage.getItem('game.driftDepth'));
  if (!Number.isNaN(oldDrift) && localStorage.getItem('game.driftLevel') === null) {
    settings.driftLevel = Math.min(1, Math.max(0.01, oldDrift / 0.2));
    saveSetting('driftLevel');
  }
} catch (e) {
  // localStorage недоступен — остается значение по умолчанию
}

// Громкость групп звука (вместе с общей): фон — зоны и дождь, звуки — двигатель, фраза, шаги, выстрелы
const ambientGain = () => (settings.ambient ? settings.volume * settings.ambientVolume : 0);
const effectsGain = () => (settings.effects ? settings.volume * settings.effectsVolume : 0);

const settingsBtn = document.getElementById('settingsBtn');
const settingsMenu = document.getElementById('settingsMenu');
let settingsOpen = false;

// ---------- Вкладки ----------
const pct = (v) => Math.round(v * 100) + '%';
const keyRows = (rows) =>
  '<table class="keys">' + rows.map(([k, what]) => '<tr><td><kbd>' + k + '</kbd></td><td>' + what + '</td></tr>').join('') + '</table>';
const settingsTabs = [
  {
    id: 'game',
    name: 'Игра',
    items: [
      { type: 'check', key: 'showPath', label: 'Показывать направление',
        note: 'Небольшие зеленые стрелки на земле и линия на карте ведут к цели задания: по дорогам, улицам и тропинкам, в обход зданий, кустов и реки' },
      { type: 'check', key: 'firstPerson', label: 'Вид от первого лица в бою', desk: true,
        note: 'Камера в глазах героя, когда оружие в руках и мышь захвачена. Пешком без оружия и за рулем вид прежний' },
      { type: 'check', key: 'cockpitView', label: 'Вид от первого лица в вождении',
        note: 'За рулем камера в салоне: перед ней руль и руки героя (клавиша V — переключить). Отдельный флаг, от боевого не зависит' },
      { type: 'check', key: 'shadows', label: 'Тени', desk: true,
        note: 'Предметы, машины и люди отбрасывают тень от солнца. Выключите, если игра тормозит' },
      { type: 'check', key: 'bloom', label: 'Свечение', desk: true,
        note: 'Мягкое свечение фонарей, фар и оружия' },
      { type: 'check', key: 'showObjects', label: 'Подсвечивать объекты',
        note: 'Человек, вход в здание или вещь, к которым нужно подойти по заданию, помечены покачивающимся ромбом, как ваша машина' },
    ],
  },
  {
    id: 'sound',
    name: 'Звук',
    items: [
      { type: 'range', key: 'volume', label: 'Общая громкость', min: 0, max: 1, step: 0.01, show: pct },
      { type: 'range', key: 'ambientVolume', mute: 'ambient', label: 'Фоновые звуки', min: 0, max: 1, step: 0.01, show: pct,
        note: 'Птицы, город, лес, река, магазин, дождь' },
      { type: 'range', key: 'effectsVolume', mute: 'effects', label: 'Звуки', min: 0, max: 1, step: 0.01, show: pct,
        note: 'Двигатель, фразы, шаги, выстрелы' },
    ],
  },
  {
    id: 'weather',
    name: 'Погода',
    items: [
      { type: 'check', key: 'alwaysSunny', label: 'Всегда солнечно', note: 'Яркий ясный день и хороший свет в любое время: без дождя, снега, сумерек и ночи. Часы идут, свет не меняется' },
      { type: 'check', key: 'rain', label: 'Дождь', note: 'Без галочки дождя не бывает: ни по расписанию, ни по P' },
      { type: 'check', key: 'snow', label: 'Снег', note: 'С ноября по март вместо дождя идет снег; Shift+P — снег вручную' },
      { type: 'select', key: 'rainFreq', label: 'Как часто идет дождь',
        options: [['rare', 'Редко'], ['normal', 'Обычно'], ['often', 'Часто']] },
    ],
  },
  {
    id: 'controls',
    name: 'Управление',
    items: [
      { type: 'range', key: 'mouseSens', label: 'Чувствительность мыши', min: 0.25, max: 3, step: 0.05, show: pct, desk: true,
        note: 'Вид зажатым колесом и прицел в бою' },
      { type: 'check', key: 'clickInteract', label: 'Клик по человеку, двери и машине', desk: true,
        note: 'Клик по двери, лестнице, человеку или машине: герой полсекунды идет туда и сразу входит, заговаривает или садится, а время уходит как на дорогу пешком. Клик по земле ничего не делает' },
      { type: 'html', desk: true, html: '<div class="keycols"><div><div class="sub">Обычный режим</div>' + keyRows([
        ['W / S', 'вперед / назад'],
        ['W W / W W W', 'бег / спринт (отпустили W — шагом); за рулем — двойное W: нитро, пока W зажата'],
        ['A / D', 'поворот'],
        ['Space', 'за рулем — ручник (занос); пешком — ничего'],
        ['Правая кнопка мыши', 'за рулем — ручник, пока зажата, как Space: дрифт одной рукой'],
        ['Колесо мыши (два клика)', 'за рулем — режим ручника колесом: колесо зажато — ручник, как Space; выключили режим — колесо снова крутит камеру'],
        ['E', 'все действия: двери, вещи, сесть, заправка, разговор'],
        ['F', 'выйти из машины, отпустить толкаемую'],
        ['I', 'инвентарь'],
        ['Q', 'достать оружие (боевой режим)'],
        ['← → ↑ ↓', 'камера'],
        ['колесо', 'приближение (и миникарта)'],
        ['зажатое колесо', 'вращать вид мышью'],
        ['ЛКМ по вещи', 'взять'],
        ['ЛКМ по карте', 'переместиться'],
        ['P / Shift+P', 'дождь / снег вручную'],
        ['M', 'звук вкл/выкл'],
        ['O', 'настройки'],
      ]) + '</div><div><div class="sub">Режим боя</div>' + keyRows([
        ['мышь', 'поворот и прицел (мышь захвачена)'],
        ['ЛКМ', 'огонь (зажать — очередь, заряд)'],
        ['ПКМ (держать)', 'турбо: частые отдельные щелчки ЛКМ; зажатая ЛКМ — другой режим'],
        ['Cmd + Enter', 'в бою: вид от первого лица и обратно'],
        ['колесо', 'сменить оружие'],
        ['W / S', 'вперед / назад'],
        ['A / D', 'шаг вбок'],
        ['Shift', 'шагом (без него — бег)'],
        ['R', 'следующее оружие'],
        ['K', 'огонь по взгляду'],
        ['Q', 'убрать оружие'],
        ['Esc', 'выйти из боя'],
      ]) + '</div></div>' },
    ],
  },
  {
    id: 'combat',
    name: 'Режим боя',
    items: [
      // Тот же флаг, что и во вкладке «Игра»: вид из глаз героя в бою (оружие в руках, мышь захвачена); вождение включает другой флаг
      { type: 'check', key: 'firstPerson', label: 'Вид от первого лица в бою', desk: true,
        note: 'Камера в глазах героя: оружие в руках видно перед собой, прицел по центру, мышь поворачивает взгляд. Вид за рулем включается отдельным флагом во вкладке «Вождение»' },
      { type: 'check', key: 'autoAim', label: 'Автонаведение',
        note: 'Выстрел по взгляду сам доводится на ближайшую цель впереди; без него заряд летит ровно туда, куда смотрит прицел' },
    ],
  },
  {
    id: 'drive',
    name: 'Вождение',
    compact: true, // пункты в одну строку, описания — в подсказках у значка «?»
    items: [
      { type: 'range', key: 'driftLevel', label: 'Глубина заноса', min: 0.01, max: 1, step: 0.01, log: true, show: pct,
        note: 'Ручник на ходу (Space) — машину заносит, на дороге остаются следы. На гоночных газ с ручником (W+Space) — дрифт: машина едет боком, задним ходом — задом' },
      { type: 'range', key: 'driftInertia', label: 'Инерция после дрифта', min: 0, max: 2, step: 0.05, show: pct,
        note: 'Вышли из заноса — машина еще катится, скорость затухает плавно; 0% — сразу теряет скорость. Обычное торможение (S) не меняется' },
      { type: 'range', key: 'bounce', label: 'Жесткость отскока', min: 0.05, max: 5, step: 0.05, log: true, show: pct,
        note: 'Врезались в покрышки или бочки — машина мягко отталкивается от них; чем жестче, тем дальше отбрасывает. 0% — не отбрасывает' },
      { type: 'check', key: 'tireKnock', label: 'Покрышки отлетают', note: 'Сильный удар выбивает покрышку: она отлетает и падает, а машина почти не тормозится. Без галочки покрышки — как вкопанные, машина отскакивает от них' },
      { type: 'range', key: 'bounceLoss', label: 'Потеря скорости при ударе', min: 0, max: 1, step: 0.05, show: pct,
        note: 'Сколько скорости гаснет при прямом ударе: 100% — машина встает у покрышек, 0% — отскакивает назад без потерь; скользящий удар теряет меньше' },
      { type: 'range', key: 'bounceSoft', label: 'Мягкость отскока', min: 0.25, max: 4, step: 0.05, log: true, show: pct,
        note: 'Как долго длится отталкивание: больше — машина отплывает плавно и долго, меньше — резкий толчок' },
      { type: 'check', key: 'cockpitView', label: 'Вид от первого лица в вождении', note: 'За рулем камера — в салоне, перед ней руль и руки героя: руль поворачивается вслед за колесами. V — переключить прямо за рулем' },
      { type: 'range', key: 'maxSpeedKmh', label: 'Максимальная скорость машины', min: 0, max: 1000, step: 10, show: (v) => (v ? v + ' км/ч' : 'как у машины'),
        note: 'Предел скорости любой машины, на которой вы едете, в км/ч (от 10 до 1000). 0 — у каждой машины свой, как задумано: у обычной около 130, у гоночных до 400. Разгон подстраивается под новый предел' },
      { type: 'range', key: 'coastInertia', label: 'Накат (инерция без газа)', min: 0.1, max: 10, step: 0.1, log: true, show: pct,
        note: 'Отпустили газ — машина не встает сразу, а катится и плавно теряет скорость; больше — катится дольше. Тормоз (S) гасит скорость быстро, как раньше' },
      { type: 'range', key: 'nitroPower', label: 'Ускорение по двойному W', min: 0.5, max: 8, step: 0.05, log: true, show: pct,
        note: 'Два раза нажать W (второй раз — держать): разгон сильнее и предел скорости выше, пока W зажата. 100% — выключено' },
      { type: 'range', key: 'reverseSpeed', label: 'Скорость заднего хода гоночных', min: 0.25, max: 8, step: 0.1, log: true, show: pct,
        note: 'Предел и ускорение заднего хода гоночных машин (болид, купе, хэтчбек, маслкар, дрифт-купе, прототип, карт) относительно прежнего: 100% — как раньше, 200% — вдвое быстрее. У остальных машин не меняется' },
      { type: 'range', key: 'brakeSharp', label: 'Резкость торможения', min: 0.1, max: 10, step: 0.05, log: true, show: pct },
      { type: 'range', key: 'accelSharp', label: 'Резкость разгона', min: 0.1, max: 10, step: 0.05, log: true, show: pct },
      { type: 'range', key: 'steerSens', label: 'Чувствительность поворота', min: 0.1, max: 10, step: 0.05, log: true, show: pct },
      { type: 'setups' },
    ],
  },
  {
    id: 'physics',
    name: 'Физика',
    compact: true,
    items: [
      { type: 'range', key: 'tireGrip', label: 'Сцепление шин', min: 0.05, max: 5, step: 0.05, log: true, show: pct,
        note: 'Обычная езда: чем меньше, тем скользче шины — машину сильнее сносит в поворотах, а после заноса она выравнивается дольше. Больше — как на рельсах' },
      { type: 'range', key: 'handbrakeGrip', label: 'Сцепление на ручнике', min: 0.02, max: 5, step: 0.05, log: true, show: pct,
        note: 'Задние колеса на ручнике и в дрифте. Мало — заносит до разворота: на ходу ручник и руль, кузов смотрит назад — едем задом (полицейский разворот)' },
      { type: 'range', key: 'handbrakePower', label: 'Сила ручника', min: 0.05, max: 5, step: 0.05, log: true, show: pct,
        note: 'Сколько скорости съедает сам ручник: меньше — в заносе больше скорости остается' },
      { type: 'range', key: 'slideLoss', label: 'Потеря скорости в заносе', min: 0.05, max: 10, step: 0.1, log: true, show: pct,
        note: 'Боком шины трутся и гасят скорость. 0% — скользит без потерь, как по льду' },
      { type: 'range', key: 'spinInertia', label: 'Инерция вращения', min: 0.1, max: 10, step: 0.1, log: true, show: pct,
        note: 'В заносе кузов поворачивается не сразу и после руля еще докручивается: больше — тяжелее раскрутить и дольше крутится' },
      { type: 'setups' },
    ],
  },
  {
    id: 'map',
    name: 'Карта',
    items: [
      { type: 'check', key: 'minimap', label: 'Миникарта' },
      { type: 'range', key: 'minimapSize', label: 'Размер миникарты', min: 200, max: 440, step: 10, show: (v) => v + ' px', desk: true },
      { type: 'check', key: 'mapNorthUp', label: 'Север всегда сверху', note: 'Иначе карта крутится вместе с камерой' },
      { type: 'check', key: 'mapPeople', label: 'Прохожие на карте' },
    ],
  },
];

const settingsStyle = document.createElement('style');
settingsStyle.textContent = `
  #settingsMenu { width: min(580px, calc(100vw - 28px)); max-height: calc(100vh - 24px); overflow-y: auto; touch-action: pan-y; }
  #settingsMenu .tabs { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
  #settingsMenu .tabs button { padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.06); color: white; font: var(--fs-text) var(--font); cursor: pointer; }
  #settingsMenu .tabs button.on { background: rgba(143, 208, 255, 0.28); border-color: rgba(143, 208, 255, 0.7); }
  #settingsMenu .panel { display: none; height: min(760px, calc(100vh - 200px)); min-height: 150px; overflow-y: auto; padding-right: 4px; }
  #settingsMenu .panel.on { display: block; }
  #settingsMenu .item { margin-bottom: 8px; }
  #settingsMenu .row { align-items: center; gap: 8px; }
  #settingsMenu .row .val { margin-left: auto; opacity: 0.85; }
  #settingsMenu .mute { width: 30px; height: 26px; padding: 0; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.06); color: white; font-size: var(--fs-text); cursor: pointer; }
  #settingsMenu .mute.off { background: rgba(210, 60, 60, 0.35); }
  #settingsMenu .item.muted input[type='range'] { opacity: 0.4; }
  #settingsMenu .item > .check { margin-top: 0; }
  #settingsMenu .note { font-size: var(--fs-small); opacity: 0.6; margin-top: 3px; }
  /* Компактные вкладки (вождение, физика): пункт в одну строку, описание — в подсказке у значка «?» справа */
  #settingsMenu .item.compact { display: grid; grid-template-columns: minmax(120px, 36%) 1fr 92px 18px; align-items: center; column-gap: 8px; margin-bottom: 3px; }
  #settingsMenu .item.compact .lbl { font-size: var(--fs-text); line-height: 1.25; }
  #settingsMenu .item.compact input[type='range'] { width: 100%; margin: 0; }
  #settingsMenu .item.compact .val { text-align: right; opacity: 0.85; white-space: nowrap; font-variant-numeric: tabular-nums; font-size: var(--fs-text); }
  #settingsMenu .item.compact label.check { grid-column: 1 / 4; margin: 0; }
  #settingsMenu .item.compact select { grid-column: 2 / 4; margin-top: 0; }
  #settingsMenu .help { width: 16px; height: 16px; box-sizing: border-box; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.4); font: 700 10px/14px var(--font);
    text-align: center; opacity: 0.65; cursor: help; user-select: none; justify-self: end; }
  #settingsMenu .help:hover { opacity: 1; background: rgba(143, 208, 255, 0.28); border-color: rgba(143, 208, 255, 0.8); }
  #settingTip { position: fixed; z-index: 120; max-width: 300px; padding: 8px 10px; border-radius: 8px; background: rgba(12, 16, 22, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.3); color: #f1f3f5; font: var(--fs-small) var(--font); line-height: 1.45; pointer-events: none; display: none; }
  #settingsMenu select { width: 100%; margin-top: 4px; padding: 4px; border-radius: 6px; background: #1d222c; color: white;
    border: 1px solid rgba(255, 255, 255, 0.3); font: var(--fs-text) var(--font); }
  #settingsMenu .keycols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  #settingsMenu .keycols .sub:first-child { margin-top: 4px; }
  #settingsMenu .sub { font-weight: bold; font-size: var(--fs-text); margin: 12px 0 4px; }
  #settingsMenu table.keys { width: 100%; border-collapse: collapse; font-size: var(--fs-text); }
  #settingsMenu table.keys td { padding: 2px 0; vertical-align: top; }
  #settingsMenu table.keys td:first-child { width: 40%; white-space: nowrap; padding-right: 8px; }
  #settingsMenu kbd { display: inline-block; padding: 1px 5px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.08); font: var(--fs-small) var(--font); }
  #settingsMenu .setups .setupSave { display: flex; gap: 6px; margin-top: 4px; }
  #settingsMenu .setups input[type='text'] { flex: 1; min-width: 0; padding: 4px 6px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.3);
    background: #1d222c; color: white; font: var(--fs-text) var(--font); }
  #settingsMenu .setups button, .setupChip button { padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(143, 208, 255, 0.6);
    background: rgba(143, 208, 255, 0.2); color: white; font: var(--fs-text) var(--font); cursor: pointer; }
  .setupChips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .setupChip { display: inline-flex; border-radius: 6px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.3); background: rgba(0, 0, 0, 0.55); }
  .setupChip button { border: none; border-radius: 0; background: transparent; }
  .setupChip button:hover { background: rgba(143, 208, 255, 0.35); }
  .setupChip .del { color: #ff9a8a; padding: 4px 7px; border-left: 1px solid rgba(255, 255, 255, 0.2); }
  .setupChip.on { border-color: #8fe3a8; background: rgba(63, 163, 91, 0.45); }
  #setupBar { position: fixed; left: 70px; bottom: 112px; z-index: 12; display: none; max-width: 52vw; align-items: center; gap: 6px; color: white; font: var(--fs-text) var(--font); }
  #setupBar .label { opacity: 0.7; }
  body.touch #setupBar { left: 12px; bottom: 112px; }
  #settingsMenu .foot { display: flex; align-items: flex-end; gap: 10px; margin-top: 12px; padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.2); }
  #settingsMenu .foot #settingsVersion { flex: 1; margin: 0; padding: 0; border: none; }
  #settingsReset { flex: none; padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(255, 140, 120, 0.6);
    background: rgba(210, 60, 60, 0.25); color: white; font: bold var(--fs-text) var(--font); cursor: pointer; }
  #settingsReset:hover { background: rgba(210, 60, 60, 0.45); }
  body.touch #settingsMenu .desk { display: none; }
  body.touch #settingsMenu .panel { height: auto; min-height: 0; overflow: visible; }
`;
document.head.appendChild(settingsStyle);

settingsMenu.innerHTML =
  '<div class="title">Настройки</div><div class="tabs"></div><div class="panels"></div>' +
  '<div class="hint">O или Esc — закрыть. M — выключить звук</div>' +
  '<div class="foot"><button id="settingsReset" title="Все настройки — как было по умолчанию">Сбросить</button></div>';
const tabsEl = settingsMenu.querySelector('.tabs');
const panelsEl = settingsMenu.querySelector('.panels');
const settingsFoot = settingsMenu.querySelector('.foot');
const settingsPanels = {};
const settingsRefresh = []; // как показать текущие значения (после сброса)
const settingsListeners = []; // кому сообщить, что настройка поменялась: (key) => …
const onSettingChange = (fn) => settingsListeners.push(fn);

function setSetting(key, value) {
  settings[key] = value;
  saveSetting(key);
  for (const fn of settingsListeners) fn(key);
}

let settingsTab = 'sound';
try {
  settingsTab = localStorage.getItem('game.settingsTab') || 'sound';
} catch (e) {
  // по умолчанию — «Звук»
}
function showSettingsTab(id) {
  if (!settingsPanels[id]) id = 'sound';
  settingsTab = id;
  for (const b of tabsEl.children) b.classList.toggle('on', b.dataset.tab === id);
  for (const [tid, p] of Object.entries(settingsPanels)) p.classList.toggle('on', tid === id);
  try {
    localStorage.setItem('game.settingsTab', id);
  } catch (e) {
    // не запомнится — не страшно
  }
}

// ---------- Сетапы вождения ----------
// Удачно настроенное вождение (занос, сцепление, резкость, накат, отскок) сохраняется под названием; список сетапов — в «Вождение» и
// «Физика» и полосой внизу экрана за рулем: клик — применить. Хранятся в браузере (game.driveSetups).
const SETUP_KEYS = ['maxSpeedKmh', 'driftLevel', 'driftInertia', 'nitroPower', 'brakeSharp', 'accelSharp', 'steerSens', 'reverseSpeed', 'coastInertia', 'tireGrip',
  'handbrakeGrip', 'handbrakePower', 'slideLoss', 'spinInertia', 'bounce', 'bounceLoss', 'bounceSoft', 'tireKnock'];
let driveSetups = [];
try {
  driveSetups = JSON.parse(localStorage.getItem('game.driveSetups') || '[]').filter((x) => x && typeof x.name === 'string' && x.v);
} catch (e) {
  driveSetups = [];
}
const setupListeners = []; // перерисовать списки сетапов
const persistSetups = () => {
  try {
    localStorage.setItem('game.driveSetups', JSON.stringify(driveSetups));
  } catch (e) {
    // не запомнится — не страшно
  }
  for (const f of setupListeners) f();
};
function saveDriveSetup(name) {
  name = name.trim().slice(0, 24);
  if (!name) return false;
  const v = {};
  for (const k of SETUP_KEYS) v[k] = settings[k];
  const i = driveSetups.findIndex((s) => s.name === name);
  if (i >= 0) driveSetups[i] = { name, v };
  else driveSetups.push({ name, v });
  if (driveSetups.length > 24) driveSetups.shift();
  persistSetups();
  return true;
}
function applyDriveSetup(s) {
  for (const k of SETUP_KEYS) if (k in s.v && typeof s.v[k] === typeof SETTINGS_DEFAULTS[k]) setSetting(k, s.v[k]);
  refreshSettingsUI();
  for (const f of setupListeners) f();
}
const setupIsActive = (s) => SETUP_KEYS.every((k) => !(k in s.v) || (typeof settings[k] === 'number' ? Math.abs(settings[k] - s.v[k]) < 1e-6 : settings[k] === s.v[k]));
function fillSetupChips(box) {
  box.textContent = '';
  for (const s of driveSetups) {
    const chip = document.createElement('span');
    chip.className = 'setupChip' + (setupIsActive(s) ? ' on' : '');
    const load = document.createElement('button');
    load.textContent = s.name;
    load.title = 'Применить сетап «' + s.name + '»';
    load.addEventListener('click', () => {
      applyDriveSetup(s);
      load.blur();
    });
    chip.appendChild(load);
    if (box.dataset.editable) {
      const del = document.createElement('button');
      del.className = 'del';
      del.textContent = '×';
      del.title = 'Удалить сетап';
      del.addEventListener('click', () => {
        driveSetups = driveSetups.filter((x) => x !== s);
        persistSetups();
      });
      chip.appendChild(del);
    }
    box.appendChild(chip);
  }
}
// Полоса внизу экрана за рулем: сетапы одним кликом
const setupBar = document.createElement('div');
setupBar.id = 'setupBar';
document.body.appendChild(setupBar);
const setupBarChips = document.createElement('div');
setupBarChips.className = 'setupChips';
setupBar.innerHTML = '<span class="label">Сетапы:</span>';
setupBar.appendChild(setupBarChips);
setupListeners.push(() => fillSetupChips(setupBarChips));
onSettingChange(() => fillSetupChips(setupBarChips)); // подсветка активного
fillSetupChips(setupBarChips);
(function showSetupBar() {
  setupBar.style.display = typeof drivingCar !== 'undefined' && drivingCar && driveSetups.length ? 'flex' : 'none';
  requestAnimationFrame(showSetupBar);
})();

// Подсказка к значку «?» (одна на все окно): появляется слева от значка, пока на него наведена мышь
const settingTip = document.createElement('div');
settingTip.id = 'settingTip';
document.body.appendChild(settingTip);
document.addEventListener('mouseover', (e) => {
  const h = e.target.closest && e.target.closest('.help[data-tip]');
  if (!h) return;
  settingTip.textContent = h.dataset.tip;
  settingTip.style.display = 'block';
  const r = h.getBoundingClientRect();
  const w = settingTip.offsetWidth;
  const hgt = settingTip.offsetHeight;
  settingTip.style.left = Math.max(8, r.left - w - 8) + 'px';
  settingTip.style.top = Math.max(8, Math.min(window.innerHeight - hgt - 8, r.top + r.height / 2 - hgt / 2)) + 'px';
});
document.addEventListener('mouseout', (e) => {
  if (e.target.closest && e.target.closest('.help')) settingTip.style.display = 'none';
});

function buildSettingItem(it, compact = false) {
  const el = document.createElement('div');
  el.className = 'item' + (it.desk ? ' desk' : '') + (compact && it.type !== 'setups' && it.type !== 'html' ? ' compact' : '');
  if (it.type === 'html') {
    el.innerHTML = it.html;
    return el;
  }
  const isCompact = el.classList.contains('compact');
  // В компактном виде описание не пишется под пунктом, а прячется в подсказку у значка «?» справа
  const note = it.note && !isCompact ? '<div class="note">' + it.note + '</div>' : '';
  const helpIcon = () => (isCompact ? '<span class="help"' + (it.note ? '>?' : ' style="visibility:hidden">?') + '</span>' : '');
  const armHelp = () => {
    const h = el.querySelector('.help');
    if (h && it.note) h.dataset.tip = it.note.replace(/<[^>]+>/g, '');
  };
  if (it.type === 'setups') {
    el.className = 'item setups';
    el.innerHTML = '<div class="row"><span>Сетапы вождения</span></div>' +
      '<div class="setupSave"><input type="text" maxlength="24" placeholder="Название сетапа" /><button>Сохранить</button></div>' +
      '<div class="setupChips"></div><div class="note">Сохраняет все настройки вождения и физики под названием; список — и внизу экрана за рулем. Такое же название — перезапишет</div>';
    const input = el.querySelector('input');
    const chips = el.querySelector('.setupChips');
    chips.dataset.editable = '1';
    const save = () => {
      if (saveDriveSetup(input.value)) {
        showToast('Сетап «' + input.value.trim().slice(0, 24) + '» сохранен', 2000);
        input.value = '';
      }
      input.blur();
    };
    el.querySelector('button').addEventListener('click', save);
    // Печать названия не должна ловиться игровыми клавишами (O — настройки, M — звук и т. д.)
    input.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') return;
      e.stopPropagation();
      if (e.code === 'Enter') save();
    });
    const redraw = () => fillSetupChips(chips);
    setupListeners.push(redraw);
    onSettingChange(redraw);
    redraw();
    return el;
  }
  if (it.type === 'check') {
    el.innerHTML = '<label class="check"><input type="checkbox" /> ' + it.label + '</label>' + (isCompact ? helpIcon() : note);
    armHelp();
    const input = el.querySelector('input');
    input.addEventListener('change', () => {
      setSetting(it.key, input.checked);
      input.blur(); // чтобы пробел не переключал галочку вместо игры
    });
    settingsRefresh.push(() => (input.checked = settings[it.key]));
    onSettingChange((k) => {
      if (k === it.key) input.checked = settings[k]; // та же настройка в другой вкладке (вид от первого лица)
    });
  } else if (it.type === 'select') {
    el.innerHTML = (isCompact ? '<span class="lbl">' + it.label + '</span>' : '<div class="row"><span>' + it.label + '</span></div>') + '<select>' +
      it.options.map(([v, t]) => '<option value="' + v + '">' + t + '</option>').join('') + '</select>' + (isCompact ? helpIcon() : note);
    armHelp();
    const sel = el.querySelector('select');
    sel.addEventListener('change', () => {
      setSetting(it.key, sel.value);
      sel.blur();
    });
    settingsRefresh.push(() => (sel.value = settings[it.key]));
  } else if (it.type === 'range') {
    // log: true — логарифмическая шкала (ползунок 0..1, значение = min · (max/min)^t): мелкие значения регулируются так же точно,
    // как и крупные; у множителей (резкость, сцепление, инерция) шаг — доли процента около единицы и десятки процентов вдали от нее
    const logK = it.log ? Math.log(it.max / it.min) : 0;
    const toPos = (v) => (it.log ? Math.log(Math.max(it.min, Math.min(it.max, v)) / it.min) / logK : v);
    const fromPos = (t) => (it.log ? Math.round(it.min * Math.exp(t * logK) * 1000) / 1000 : t);
    const slider = it.log
      ? '<input type="range" min="0" max="1" step="0.001" />'
      : '<input type="range" min="' + it.min + '" max="' + it.max + '" step="' + it.step + '" />';
    el.innerHTML = isCompact
      ? '<span class="lbl">' + it.label + '</span>' + slider + '<span class="val"></span>' + helpIcon()
      : '<div class="row"><span>' + it.label + '</span><span class="val"></span>' +
        (it.mute ? '<button class="mute" title="Без звука"></button>' : '') + '</div>' + slider + note;
    armHelp();
    const input = el.querySelector('input');
    const val = el.querySelector('.val');
    const mute = el.querySelector('.mute');
    const show = () => {
      input.value = toPos(settings[it.key]);
      val.textContent = it.show(settings[it.key]);
      if (mute) {
        const on = settings[it.mute];
        mute.textContent = on ? '🔊' : '🔇';
        mute.classList.toggle('off', !on);
        el.classList.toggle('muted', !on);
      }
    };
    input.addEventListener('input', () => {
      setSetting(it.key, fromPos(parseFloat(input.value)));
      val.textContent = it.show(settings[it.key]);
    });
    input.addEventListener('change', () => input.blur()); // чтобы стрелки не двигали ползунок вместо игрока
    if (mute) {
      mute.addEventListener('click', () => {
        setSetting(it.mute, !settings[it.mute]);
        mute.blur();
        show();
      });
    }
    settingsRefresh.push(show);
  }
  return el;
}

for (const tab of settingsTabs) {
  const b = document.createElement('button');
  b.textContent = tab.name;
  b.dataset.tab = tab.id;
  b.addEventListener('click', () => showSettingsTab(tab.id));
  tabsEl.appendChild(b);
  const panel = document.createElement('div');
  panel.className = 'panel';
  for (const it of tab.items) panel.appendChild(buildSettingItem(it, !!tab.compact));
  panelsEl.appendChild(panel);
  settingsPanels[tab.id] = panel;
}
const refreshSettingsUI = () => settingsRefresh.forEach((f) => f());
refreshSettingsUI();
showSettingsTab(settingsTab);

// «Сбросить» (справа внизу): все настройки — по умолчанию
document.getElementById('settingsReset').addEventListener('click', (e) => {
  for (const key of Object.keys(SETTINGS_DEFAULTS)) setSetting(key, SETTINGS_DEFAULTS[key]);
  refreshSettingsUI();
  e.currentTarget.blur();
});

// Строки, которые вставили другие файлы перед подсказкой (гироскоп на телефоне, src/engine/touch.js и
// src/engine/gyro-steer.js), — в свою вкладку: руль — в «Вождение», прицел — в «Режим боя», прочее — в «Управление»
document.addEventListener('DOMContentLoaded', () => {
  const hint = settingsMenu.querySelector(':scope > .hint');
  for (let el = panelsEl.nextElementSibling; el && el !== hint; ) {
    const next = el.nextElementSibling;
    const text = el.textContent;
    const tab = /рул/i.test(text) ? 'drive' : /прицел/i.test(text) ? 'combat' : 'controls';
    el.classList.add('item');
    settingsPanels[tab].appendChild(el);
    el = next;
  }
  // На телефоне вкладки, где остались только строки для компьютера (клавиши, мышь), не показываем
  if (touchUI) {
    for (const b of tabsEl.children) {
      const panel = settingsPanels[b.dataset.tab];
      if (![...panel.children].some((c) => !c.classList.contains('desk'))) b.style.display = 'none';
    }
    if (tabsEl.querySelector('[data-tab="' + settingsTab + '"]').style.display === 'none') showSettingsTab('sound');
  }
});

function setSettingsOpen(open) {
  settingsOpen = open;
  settingsMenu.style.display = open ? 'block' : 'none';
  if (open) {
    for (const k of Object.keys(keys)) keys[k] = false; // отпускаем зажатые клавиши
  } else if (settingsMenu.contains(document.activeElement)) {
    document.activeElement.blur(); // чтобы стрелки и пробел не двигали ползунки вместо игры
  }
}

settingsBtn.addEventListener('click', () => setSettingsOpen(!settingsOpen));

// Клик мимо меню закрывает его (в том числе клик по сцене)
document.addEventListener('mousedown', (e) => {
  if (settingsOpen && !settingsMenu.contains(e.target) && e.target !== settingsBtn) setSettingsOpen(false);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyO' && !e.repeat) setSettingsOpen(!settingsOpen);
  else if (e.code === 'Escape' && settingsOpen) setSettingsOpen(false);
});

// ---------- Версия и история версий ----------
// В меню — только текущая версия; нажали на нее — окно со всеми версиями: что в каждой добавлено, по-русски
// (changelog.json по номеру PR или по версии; если строки нет — английский заголовок коммита). Локально version.json пишет `node tools/version.js`
const versionURL = new URL('../../version.json', document.currentScript.src); // у ДЕМО те же файлы
const changelogURL = new URL('../../changelog.json', document.currentScript.src);
const versionEl = document.createElement('button');
versionEl.id = 'settingsVersion';
versionEl.textContent = 'Версия: …';
settingsFoot.insertBefore(versionEl, settingsFoot.firstChild); // слева внизу, справа — «Сбросить»
const historyEl = document.createElement('div');
historyEl.id = 'versionHistory';
historyEl.innerHTML = '<div class="win"><div class="head"><span>История версий</span><button class="close">✕</button></div><ol></ol></div>';
document.body.appendChild(historyEl);
const versionStyle = document.createElement('style');
versionStyle.textContent = `
  #settingsMenu { max-height: calc(100vh - 90px); overflow-y: auto; touch-action: pan-y; }
  #settingsVersion { display: block; width: 100%; margin-top: 12px; padding: 10px 0 0; border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.2); background: none; color: white; font: bold var(--fs-text) var(--font);
    text-align: left; cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; }
  #versionHistory { position: fixed; inset: 0; z-index: 80; display: none; align-items: center; justify-content: center;
    background: rgba(0, 0, 0, 0.55); font-family: var(--font); }
  #versionHistory.on { display: flex; }
  #versionHistory .win { width: min(560px, calc(100% - 24px)); max-height: calc(100% - 24px); display: flex; flex-direction: column;
    box-sizing: border-box; padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.4);
    background: rgba(15, 18, 24, 0.97); color: white; }
  #versionHistory .head { display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: var(--fs-h2);
    margin-bottom: 10px; }
  #versionHistory .close { width: 34px; height: 34px; padding: 0; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.08); color: white; font-size: var(--fs-h2); cursor: pointer; }
  #versionHistory ol { list-style: none; margin: 0; padding: 0; overflow-y: auto; touch-action: pan-y; -webkit-overflow-scrolling: touch; }
  #versionHistory li { padding: 8px 0; border-top: 1px solid rgba(255, 255, 255, 0.12); font-size: var(--fs-text); line-height: 1.4; }
  #versionHistory li .v { font-weight: bold; margin-right: 6px; }
  #versionHistory li .d { opacity: 0.55; font-size: var(--fs-small); }
  #versionHistory li .t { display: block; opacity: 0.88; margin-top: 2px; }
`;
document.head.appendChild(versionStyle);

let versionInfo = null;
let changelogRu = {};
const setHistoryOpen = (open) => historyEl.classList.toggle('on', open);
versionEl.addEventListener('click', () => {
  if (!versionInfo) return;
  const list = historyEl.querySelector('ol');
  list.innerHTML = '';
  for (const c of versionInfo.changes || []) {
    const li = document.createElement('li');
    const v = document.createElement('span');
    v.className = 'v';
    v.textContent = c.version;
    const d = document.createElement('span');
    d.className = 'd';
    d.textContent = c.date;
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = (c.pr && changelogRu[c.pr]) || changelogRu[c.version] || c.title; // по номеру PR, иначе по версии (коммит прямо в main), иначе заголовок
    li.append(v, d, t);
    list.appendChild(li);
  }
  setHistoryOpen(true);
});
historyEl.addEventListener('click', (e) => {
  if (e.target === historyEl || e.target.closest('.close')) setHistoryOpen(false);
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && historyEl.classList.contains('on')) setHistoryOpen(false);
});

const getJSON = (url) => fetch(url, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : Promise.reject()));
getJSON(changelogURL)
  .then((c) => (changelogRu = c))
  .catch(() => {});
getJSON(versionURL)
  .then((v) => {
    versionInfo = v;
    versionEl.textContent = 'Версия ' + v.version + ' от ' + v.date;
  })
  .catch(() => {
    versionEl.textContent = 'Версия: локальная (запустите node tools/version.js)';
  });

// Колесико над ползунком или списком в настройках не меняет значение (раньше браузер крутил их): оно прокручивает вкладку
settingsMenu.addEventListener(
  'wheel',
  (e) => {
    const t = e.target;
    if (!t.closest || !t.closest('input[type="range"], select')) return;
    e.preventDefault();
    (t.closest('.panel') || settingsMenu).scrollTop += e.deltaY;
  },
  { passive: false },
);
