// src/engine/clock.js
// ИГРОВОЕ ВРЕМЯ И ДАТА. История начинается 18 сентября 2043 года: дата старта лежит в game.json
// (поле gameStartDate), там же время старта и скорость хода времени (minutesPerSecond — сколько
// игровых минут проходит за реальную секунду; сейчас 1/60: время идет как в обычном мире, секунда игры — секунда жизни).
// Время идет само, а еще тратится, когда перемещаешься кликом по карте (src/player/travel.js).
// Время обязательно сохраняется вместе с игрой (src/player/saves.js: gameMinutes).
//
//   gameMinutes             — игровых минут с начала истории
//   gameHour(min)           — час суток 0..24 (дробный)
//   formatGameDate/Time()   — «18 сентября 2043, четверг» / «09:00»
//   daylight(min)           — освещенность 0 (глубокая ночь) .. 1 (день)
//   advanceGameTime(min)    — потратить время (перемещение по карте)

const CLOCK_DEFAULTS = { gameStartDate: '2043-09-18', startTime: '09:00', minutesPerSecond: 1 / 60 };
let clockConfig = { ...CLOCK_DEFAULTS };
let gameMinutes = 0;

// Настройки читаем из game.json. Пока файл не загрузился (или страницу открыли без сервера, и
// fetch недоступен), работают значения по умолчанию — те же самые
fetch('game.json')
  .then((r) => r.json())
  .then((cfg) => {
    clockConfig = { ...CLOCK_DEFAULTS, ...cfg };
  })
  .catch(() => {});

// Момент старта истории (UTC, чтобы часовой пояс компьютера не влиял на игровое время)
function clockEpoch() {
  const [y, m, d] = String(clockConfig.gameStartDate).split('-').map(Number);
  const [hh, mm] = String(clockConfig.startTime).split(':').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
}

const gameDateTime = (min = gameMinutes) => new Date(clockEpoch() + min * 60000);

function gameHour(min = gameMinutes) {
  const d = gameDateTime(min);
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}

const formatGameDate = (min = gameMinutes) =>
  gameDateTime(min).toLocaleDateString('ru-RU', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });

// «18 сентября 2043 г.» — для подписей сохранений
const formatGameDateShort = (min = gameMinutes) =>
  gameDateTime(min).toLocaleDateString('ru-RU', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });

// «18.09.2043 11:24:54» — строка часов вверху экрана
function formatGameClock(min = gameMinutes) {
  const d = gameDateTime(min);
  const p = (n) => String(n).padStart(2, '0');
  return p(d.getUTCDate()) + '.' + p(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear() + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds());
}

const formatGameTime = (min = gameMinutes) =>
  gameDateTime(min).toLocaleTimeString('ru-RU', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });

// «Сколько ушло»: 95 → «1 ч 35 мин»
function formatDuration(minutes) {
  if (minutes < 1) return Math.max(1, Math.round(minutes * 60)) + ' с';
  const m = Math.max(1, Math.round(minutes));
  if (m < 60) return m + ' мин';
  return Math.floor(m / 60) + ' ч' + (m % 60 ? ' ' + (m % 60) + ' мин' : '');
}

// Ночь — с 22 до 6
const isNightHour = (h) => h >= 22 || h < 6;

// Освещенность: ночь 0,12 → рассвет с 4:30 до 7 → день до 19 → закат до 21:30
function daylight(min = gameMinutes) {
  if (settings.alwaysSunny) return 1; // «Всегда солнечно» (src/engine/settings.js)
  const h = gameHour(min);
  if (h >= 7 && h <= 19) return 1;
  if (h > 19 && h < 21.5) return 1 - ((h - 19) / 2.5) * 0.88;
  if (h >= 21.5 || h < 4.5) return 0.12;
  return 0.12 + ((h - 4.5) / 2.5) * 0.88;
}

const advanceGameTime = (minutes) => {
  gameMinutes += minutes;
};

// Тик часов: dt — реальные секунды. Вызывается из updateSchedule (src/world/weather.js)
const clockDateEl = document.getElementById('clockDate');
const clockTimeEl = document.getElementById('clockTime');
const clockIconEl = document.getElementById('clockIcon');
let clockShown = '';
function updateClock(dt) {
  gameMinutes += dt * clockConfig.minutesPerSecond;
  // Одна строка «18.09.2043 11:24:54»: без погоды и значка солнца, секунды идут как в жизни
  const text = formatGameClock();
  if (text === clockShown) return;
  clockShown = text;
  clockTimeEl.textContent = text;
  clockDateEl.style.display = 'none';
  clockIconEl.style.display = 'none';
}
