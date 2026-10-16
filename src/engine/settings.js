// src/engine/settings.js
// НАСТРОЙКИ. Шестеренка внизу слева (или клавиша O) открывает меню. В нем:
// - общая громкость (0–100%), она действует на все звуки: зоны, машину, дождь, фразу, шаги;
// - «Фоновые звуки» — выключает фон локаций (птицы, город, лес, река, магазин) и дождь,
//   остальные звуки (машина, фраза, шаги, выстрелы) продолжают играть.
// - «Дождь» — сняли галочку, и дождя не бывает никогда: ни по расписанию, ни по клавише P,
//   всегда хорошая погода (src/world/weather.js).
// Значения запоминаются в браузере (localStorage). Пока меню открыто, игровые клавиши не работают.
// В самом низу меню — версия игры; нажали — окно с историей версий на русском. Версии пишет в version.json
// выкладка на GitHub Pages (.github/workflows/pages.yml) из истории main, русский текст — changelog.json.

const settings = { volume: 1, ambient: true, rain: true };
try {
  const saved = parseFloat(localStorage.getItem('game.volume'));
  if (!Number.isNaN(saved)) settings.volume = Math.min(1, Math.max(0, saved));
} catch (e) {
  // localStorage недоступен (приватный режим и т. п.) — остается громкость по умолчанию
}
try {
  if (localStorage.getItem('game.ambient') === 'off') settings.ambient = false;
} catch (e) {
  // то же: фоновые звуки остаются включены
}

try {
  if (localStorage.getItem('game.rain') === 'off') settings.rain = false;
} catch (e) {
  // то же: дождь остается включен
}

const settingsBtn = document.getElementById('settingsBtn');
const settingsMenu = document.getElementById('settingsMenu');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const ambientToggle = document.getElementById('ambientToggle');
let settingsOpen = false;

function showVolume() {
  volumeSlider.value = Math.round(settings.volume * 100);
  volumeValue.textContent = Math.round(settings.volume * 100) + '%';
}

function setSettingsOpen(open) {
  settingsOpen = open;
  settingsMenu.style.display = open ? 'block' : 'none';
  if (open) {
    for (const k of Object.keys(keys)) keys[k] = false; // отпускаем зажатые клавиши
  } else {
    volumeSlider.blur(); // чтобы стрелки не двигали ползунок вместо игрока
    ambientToggle.blur(); // чтобы пробел не переключал галочку вместо игры
  }
}

volumeSlider.addEventListener('input', () => {
  settings.volume = volumeSlider.value / 100;
  volumeValue.textContent = volumeSlider.value + '%';
  try {
    localStorage.setItem('game.volume', String(settings.volume));
  } catch (e) {
    // не страшно: просто не запомнится
  }
});

ambientToggle.addEventListener('change', () => {
  settings.ambient = ambientToggle.checked;
  try {
    localStorage.setItem('game.ambient', settings.ambient ? 'on' : 'off');
  } catch (e) {
    // не страшно: просто не запомнится
  }
});

// Галочка «Дождь» — сразу под «Фоновыми звуками» (разметки в index.html для нее нет)
const rainLabel = document.createElement('label');
rainLabel.className = 'check';
rainLabel.innerHTML = '<input id="rainToggle" type="checkbox" /> Дождь';
ambientToggle.parentElement.after(rainLabel);
const rainToggle = rainLabel.querySelector('input');
rainToggle.checked = settings.rain;
rainToggle.addEventListener('change', () => {
  settings.rain = rainToggle.checked;
  rainToggle.blur();
  try {
    localStorage.setItem('game.rain', settings.rain ? 'on' : 'off');
  } catch (e) {
    // не страшно: просто не запомнится
  }
});

settingsBtn.addEventListener('click', () => setSettingsOpen(!settingsOpen));

// Клик мимо меню закрывает его (в том числе клик по сцене)
document.addEventListener('mousedown', (e) => {
  if (settingsOpen && !settingsMenu.contains(e.target) && e.target !== settingsBtn) setSettingsOpen(false);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyO' && !e.repeat) setSettingsOpen(!settingsOpen);
  else if (e.code === 'Escape' && settingsOpen) setSettingsOpen(false);
});

showVolume();
ambientToggle.checked = settings.ambient;

// ---------- Версия и история версий ----------
// В меню — только текущая версия; нажали на нее — окно со всеми версиями: что в каждой добавлено, по-русски
// (changelog.json по номеру PR; если строки нет — английский заголовок PR)
const versionURL = new URL('../../version.json', document.currentScript.src); // у ДЕМО те же файлы
const changelogURL = new URL('../../changelog.json', document.currentScript.src);
const versionEl = document.createElement('button');
versionEl.id = 'settingsVersion';
versionEl.textContent = 'Версия: …';
settingsMenu.appendChild(versionEl);
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
