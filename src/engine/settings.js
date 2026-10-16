// src/engine/settings.js
// НАСТРОЙКИ. Шестеренка внизу слева (или клавиша O) открывает меню. В нем:
// - общая громкость (0–100%), она действует на все звуки: зоны, машину, дождь, фразу, шаги;
// - «Фоновые звуки» — выключает фон локаций (птицы, город, лес, река, магазин) и дождь,
//   остальные звуки (машина, фраза, шаги, выстрелы) продолжают играть.
// - «Дождь» — сняли галочку, и дождя не бывает никогда: ни по расписанию, ни по клавише P,
//   всегда хорошая погода (src/world/weather.js).
// Значения запоминаются в браузере (localStorage). Пока меню открыто, игровые клавиши не работают.
// В самом низу меню — версия игры и список последних обновлений. Их пишет в version.json выкладка
// на GitHub Pages (.github/workflows/pages.yml) из истории main; без этого файла — «локальная версия».

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

// ---------- Версия и последние обновления ----------
const versionURL = new URL('../../version.json', document.currentScript.src); // у ДЕМО тот же файл
const versionEl = document.createElement('div');
versionEl.id = 'settingsVersion';
versionEl.innerHTML = '<div class="ver">Версия: …</div><ol class="changes"></ol>';
settingsMenu.appendChild(versionEl);
const versionStyle = document.createElement('style');
versionStyle.textContent = `
  #settingsMenu { max-height: calc(100vh - 90px); overflow-y: auto; touch-action: pan-y; }
  #settingsVersion { margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.2); font-size: 12px; }
  #settingsVersion .ver { font-weight: bold; margin-bottom: 6px; }
  #settingsVersion .changes { margin: 0; padding-left: 18px; opacity: 0.75; font-size: 11px; line-height: 1.35; }
  #settingsVersion .changes li { margin-bottom: 4px; }
  #settingsVersion .changes .d { opacity: 0.6; margin-right: 4px; }
`;
document.head.appendChild(versionStyle);

fetch(versionURL, { cache: 'no-cache' })
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then((v) => {
    versionEl.querySelector('.ver').textContent = 'Версия ' + v.version + ' от ' + v.date;
    const list = versionEl.querySelector('.changes');
    for (const c of v.changes || []) {
      const li = document.createElement('li');
      const d = document.createElement('span');
      d.className = 'd';
      d.textContent = c.date;
      li.appendChild(d);
      li.appendChild(document.createTextNode(c.title));
      list.appendChild(li);
    }
  })
  .catch(() => {
    versionEl.querySelector('.ver').textContent = 'Версия: локальная (не с GitHub Pages)';
  });
