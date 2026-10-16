// core/settings.js
// НАСТРОЙКИ. Шестеренка внизу слева (или клавиша O) открывает меню; пока в нем одна настройка —
// общая громкость (0–100%), она действует на все звуки: зоны, машину, дождь, фразу, шаги.
// Значение запоминается в браузере (localStorage). Пока меню открыто, игровые клавиши не работают.
//
// Мышь захвачена игрой (клик по сцене) — тогда курсора нет. Чтобы нажать на шестеренку,
// сначала нажмите Esc (браузер отпустит мышь) или откройте меню клавишей O: она отпустит мышь сама.

const settings = { volume: 1 };
try {
  const saved = parseFloat(localStorage.getItem('game.volume'));
  if (!Number.isNaN(saved)) settings.volume = Math.min(1, Math.max(0, saved));
} catch (e) {
  // localStorage недоступен (приватный режим и т. п.) — остается громкость по умолчанию
}

const settingsBtn = document.getElementById('settingsBtn');
const settingsMenu = document.getElementById('settingsMenu');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
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
    if (document.exitPointerLock) document.exitPointerLock(); // нужен курсор, чтобы двигать ползунок
  } else {
    volumeSlider.blur(); // чтобы стрелки не двигали ползунок вместо игрока
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

settingsBtn.addEventListener('click', () => setSettingsOpen(!settingsOpen));

// Клик мимо меню закрывает его (в том числе клик по сцене, который захватывает мышь)
document.addEventListener('mousedown', (e) => {
  if (settingsOpen && !settingsMenu.contains(e.target) && e.target !== settingsBtn) setSettingsOpen(false);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyO' && !e.repeat) setSettingsOpen(!settingsOpen);
  else if (e.code === 'Escape' && settingsOpen) setSettingsOpen(false);
});

showVolume();
