// src/engine/settings.js
// НАСТРОЙКИ. Шестеренка внизу слева (или клавиша O) открывает меню. В нем:
// - общая громкость (0–100%), она действует на все звуки: зоны, машину, дождь, фразу, шаги;
// - «Фоновые звуки» — выключает фон локаций (птицы, город, лес, река, магазин) и дождь,
//   остальные звуки (машина, фраза, шаги, выстрелы) продолжают играть.
// Значения запоминаются в браузере (localStorage). Пока меню открыто, игровые клавиши не работают.

const settings = { volume: 1, ambient: true };
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
