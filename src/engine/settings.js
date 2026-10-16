// src/engine/settings.js
// НАСТРОЙКИ. Шестеренка внизу слева (или клавиша O, или Esc, когда закрывать и отменять нечего и герой не в бою — src/engine/mouse-look.js) открывает окно с вкладками:
//   Звук        — общая громкость; фоновые звуки (зоны и дождь) и звуки (двигатель, фраза, шаги, выстрелы):
//                 у каждой группы своя громкость и кнопка «без звука».
//   Погода      — дождь и снег (сняли галочку — их не бывает вовсе), как часто идет дождь (src/world/weather.js).
//   Управление  — чувствительность мыши (вид колесом и прицел в бою), список клавиш в обычном режиме и в бою.
//   Режим боя   — автонаведение: выстрел по взгляду сам доводится на ближайшую цель (assistTarget, src/engine/weapons.js);
//                 вид от первого лица (только компьютер): камера в глазах героя, мышь резче, без автонаведения
//                 (src/engine/mouse-look.js).
//   Вождение    — глубина заноса на ручнике (Space), резкость торможения и разгона, чувствительность руля
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
  rain: true,
  snow: true,
  rainFreq: 'normal', // 'rare' | 'normal' | 'often'
  mouseSens: 1, // множитель чувствительности мыши
  autoAim: true,
  firstPerson: false, // вид от первого лица в бою (компьютер)
  driftDepth: 0.6, // 0..1 — насколько глубоко заносит на ручнике
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
      { type: 'html', desk: true, html: '<div class="keycols"><div><div class="sub">Обычный режим</div>' + keyRows([
        ['W / S', 'вперед / назад'],
        ['W W / W W W', 'бег / спринт (отпустили W — шагом)'],
        ['A / D', 'поворот'],
        ['Space', 'прыжок; за рулем — ручник (занос)'],
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
      { type: 'check', key: 'autoAim', label: 'Автонаведение',
        note: 'Выстрел по взгляду сам доводится на ближайшую цель впереди; без него заряд летит ровно туда, куда смотрит прицел' },
      { type: 'check', key: 'firstPerson', label: 'Вид от первого лица', desk: true,
        note: 'Камера в глазах героя, взгляд мышью резче, без автонаведения' },
    ],
  },
  {
    id: 'drive',
    name: 'Вождение',
    items: [
      { type: 'range', key: 'driftDepth', label: 'Глубина заноса', min: 0, max: 1, step: 0.05, show: pct, desk: true,
        note: 'Space на ходу — ручник: задние колеса скользят, машину заносит, на дороге остаются следы' },
      { type: 'range', key: 'brakeSharp', label: 'Резкость торможения', min: 0.5, max: 2, step: 0.05, show: pct },
      { type: 'range', key: 'accelSharp', label: 'Резкость разгона', min: 0.5, max: 2, step: 0.05, show: pct },
      { type: 'range', key: 'steerSens', label: 'Чувствительность поворота', min: 0.5, max: 2, step: 0.05, show: pct },
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
  #settingsMenu { width: min(580px, calc(100vw - 28px)); max-height: calc(100vh - 90px); overflow-y: auto; touch-action: pan-y; }
  #settingsMenu .tabs { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
  #settingsMenu .tabs button { padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.06); color: white; font: 13px sans-serif; cursor: pointer; }
  #settingsMenu .tabs button.on { background: rgba(143, 208, 255, 0.28); border-color: rgba(143, 208, 255, 0.7); }
  #settingsMenu .panel { display: none; height: min(330px, calc(100vh - 290px)); min-height: 150px; overflow-y: auto; padding-right: 4px; }
  #settingsMenu .panel.on { display: block; }
  #settingsMenu .item { margin-bottom: 12px; }
  #settingsMenu .row { align-items: center; gap: 8px; }
  #settingsMenu .row .val { margin-left: auto; opacity: 0.85; }
  #settingsMenu .mute { width: 30px; height: 26px; padding: 0; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.06); color: white; font-size: 14px; cursor: pointer; }
  #settingsMenu .mute.off { background: rgba(210, 60, 60, 0.35); }
  #settingsMenu .item.muted input[type='range'] { opacity: 0.4; }
  #settingsMenu .item > .check { margin-top: 0; }
  #settingsMenu .note { font-size: 11px; opacity: 0.6; margin-top: 3px; }
  #settingsMenu select { width: 100%; margin-top: 4px; padding: 4px; border-radius: 6px; background: #1d222c; color: white;
    border: 1px solid rgba(255, 255, 255, 0.3); font: 13px sans-serif; }
  #settingsMenu .keycols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  #settingsMenu .keycols .sub:first-child { margin-top: 4px; }
  #settingsMenu .sub { font-weight: bold; font-size: 13px; margin: 12px 0 4px; }
  #settingsMenu table.keys { width: 100%; border-collapse: collapse; font-size: 12px; }
  #settingsMenu table.keys td { padding: 2px 0; vertical-align: top; }
  #settingsMenu table.keys td:first-child { width: 40%; white-space: nowrap; padding-right: 8px; }
  #settingsMenu kbd { display: inline-block; padding: 1px 5px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.08); font: 11px monospace; }
  #settingsMenu .foot { display: flex; align-items: flex-end; gap: 10px; margin-top: 12px; padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.2); }
  #settingsMenu .foot #settingsVersion { flex: 1; margin: 0; padding: 0; border: none; }
  #settingsReset { flex: none; padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(255, 140, 120, 0.6);
    background: rgba(210, 60, 60, 0.25); color: white; font: bold 12px sans-serif; cursor: pointer; }
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

function buildSettingItem(it) {
  const el = document.createElement('div');
  el.className = 'item' + (it.desk ? ' desk' : '');
  if (it.type === 'html') {
    el.innerHTML = it.html;
    return el;
  }
  const note = it.note ? '<div class="note">' + it.note + '</div>' : '';
  if (it.type === 'check') {
    el.innerHTML = '<label class="check"><input type="checkbox" /> ' + it.label + '</label>' + note;
    const input = el.querySelector('input');
    input.addEventListener('change', () => {
      setSetting(it.key, input.checked);
      input.blur(); // чтобы пробел не переключал галочку вместо игры
    });
    settingsRefresh.push(() => (input.checked = settings[it.key]));
  } else if (it.type === 'select') {
    el.innerHTML =
      '<div class="row"><span>' + it.label + '</span></div><select>' +
      it.options.map(([v, t]) => '<option value="' + v + '">' + t + '</option>').join('') + '</select>' + note;
    const sel = el.querySelector('select');
    sel.addEventListener('change', () => {
      setSetting(it.key, sel.value);
      sel.blur();
    });
    settingsRefresh.push(() => (sel.value = settings[it.key]));
  } else if (it.type === 'range') {
    el.innerHTML =
      '<div class="row"><span>' + it.label + '</span><span class="val"></span>' +
      (it.mute ? '<button class="mute" title="Без звука"></button>' : '') + '</div>' +
      '<input type="range" min="' + it.min + '" max="' + it.max + '" step="' + it.step + '" />' + note;
    const input = el.querySelector('input');
    const val = el.querySelector('.val');
    const mute = el.querySelector('.mute');
    const show = () => {
      input.value = settings[it.key];
      val.textContent = it.show(settings[it.key]);
      if (mute) {
        const on = settings[it.mute];
        mute.textContent = on ? '🔊' : '🔇';
        mute.classList.toggle('off', !on);
        el.classList.toggle('muted', !on);
      }
    };
    input.addEventListener('input', () => {
      setSetting(it.key, parseFloat(input.value));
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
  for (const it of tab.items) panel.appendChild(buildSettingItem(it));
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
// (changelog.json по номеру PR; если строки нет — английский заголовок PR)
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
    border-top: 1px solid rgba(255, 255, 255, 0.2); background: none; color: white; font: bold 12px sans-serif;
    text-align: left; cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; }
  #versionHistory { position: fixed; inset: 0; z-index: 80; display: none; align-items: center; justify-content: center;
    background: rgba(0, 0, 0, 0.55); font-family: sans-serif; }
  #versionHistory.on { display: flex; }
  #versionHistory .win { width: min(560px, calc(100% - 24px)); max-height: calc(100% - 24px); display: flex; flex-direction: column;
    box-sizing: border-box; padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.4);
    background: rgba(15, 18, 24, 0.97); color: white; }
  #versionHistory .head { display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 16px;
    margin-bottom: 10px; }
  #versionHistory .close { width: 34px; height: 34px; padding: 0; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.08); color: white; font-size: 18px; cursor: pointer; }
  #versionHistory ol { list-style: none; margin: 0; padding: 0; overflow-y: auto; touch-action: pan-y; -webkit-overflow-scrolling: touch; }
  #versionHistory li { padding: 8px 0; border-top: 1px solid rgba(255, 255, 255, 0.12); font-size: 13px; line-height: 1.4; }
  #versionHistory li .v { font-weight: bold; margin-right: 6px; }
  #versionHistory li .d { opacity: 0.55; font-size: 11px; }
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
    t.textContent = (c.pr && changelogRu[c.pr]) || (c.pr ? c.title : 'Начало проекта.');
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
    versionEl.textContent = 'Версия: локальная (не с GitHub Pages)';
  });
