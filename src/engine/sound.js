// src/engine/sound.js
// ЗВУК. Браузер разрешает воспроизведение только после действия пользователя, поэтому звук
// включается по первому нажатию клавиши или клику. Каждый файл — <audio loop>; играет только
// пока слышен, громкость плавно меняется. Громкость зон — в src/engine/zones.js.

// ЗВУК. Браузер разрешает воспроизведение только после действия пользователя,
// поэтому звук включается по первому нажатию клавиши или клику.
// Каждый файл — <audio loop>; играет только пока слышен, громкость плавно меняется
const soundNames = ['birds', 'birds_2', 'city', 'city_2', 'forest_birds', 'river', 'river_2', 'rain', 'shop', 'car'];
const soundTracks = {};
for (const name of soundNames) {
  const el = new Audio('audio/' + name + '.mp3');
  el.loop = true;
  el.preload = 'none';
  el.volume = 0;
  soundTracks[name] = { el, gain: 0, playing: false };
}

// Фраза полицейского: звучит один раз, когда игрок подошел к месту происшествия.
// Пока она идет, весь остальной звук приглушается (duck), чтобы ее было слышно
const phrase = new Audio('audio/peoples/policeman.mp3');
phrase.preload = 'auto';
phrase.volume = 1;
// Громкость фразы — общая из настроек (обновляется в updateSound)
const duckLevel = 0.45; // во сколько раз тише остальной звук, пока звучит фраза
let duck = 1;
const phraseActive = () => !phrase.paused && !phrase.ended;
let audioUnlocked = false;
let muted = false;
const unlockAudio = () => (audioUnlocked = true);
window.addEventListener('keydown', unlockAudio);
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && !e.repeat) muted = !muted;
});

const carVolumeMin = 0.25;
const carVolumeMax = 0.8;
const carRateMin = 0.85; // тон двигателя на малой скорости
const carRateMax = 1.5; // и на полной
soundTracks.car.el.preservesPitch = false; // скорость воспроизведения меняет и тон — как обороты
soundTracks.car.el.webkitPreservesPitch = false;

const rainVolume = 0.6;
const rainVolumeInside = 0.12; // дождь по крыше слышно приглушенно

function updateSound() {
  phrase.volume = settings.volume;
  const hudSound = document.getElementById('hudSound');
  const hudZone = document.getElementById('hudZone');
  const zone = currentZone();
  hudZone.textContent = 'Локация: ' + zone.name;
  hudSound.textContent = muted ? 'Звук выключен' : audioUnlocked ? '' : 'Нажмите любую клавишу — включится звук';

  const mix = targetMix();
  mix.rain = rainOn ? (insideBuilding() ? rainVolumeInside : rainVolume) : 0;
  // Двигатель: звучит, только пока машина едет; быстрее — громче и выше тоном
  const carSpeed = drivingCar ? Math.abs(drivingCar.speed) / carMaxSpeed : 0;
  mix.car = carSpeed > 0.02 ? carVolumeMin + (carVolumeMax - carVolumeMin) * Math.min(carSpeed, 1) : 0;
  duck += ((phraseActive() ? duckLevel : 1) - duck) * 0.1;
  for (const [name, t] of Object.entries(soundTracks)) {
    // Фоновые звуки (все, кроме двигателя) можно выключить в настройках
    const off = muted || !audioUnlocked || (!settings.ambient && name !== 'car');
    const target = off ? 0 : (mix[name] || 0) * duck;
    t.gain += (target - t.gain) * (name === 'car' ? 0.15 : 0.04); // двигатель реагирует быстро
    if (Math.abs(target - t.gain) < 0.002) t.gain = target;
    t.el.volume = Math.min(Math.max(t.gain * settings.volume, 0), 1); // общая громкость из настроек
    if (t.gain > 0 && !t.playing) {
      t.playing = true;
      t.el.play().catch(() => (t.playing = false)); // не получилось — попробуем в следующем кадре
    } else if (t.gain === 0 && t.playing) {
      t.playing = false;
      t.el.pause();
    }
  }

  if (carSpeed > 0.02) {
    soundTracks.car.el.playbackRate = carRateMin + (carRateMax - carRateMin) * Math.min(carSpeed, 1);
  }

  // В углу экрана — что сейчас играет (имена файлов из audio/ и громкость)
  if (!muted && audioUnlocked) {
    const playing = Object.entries(soundTracks)
      .filter(([, t]) => t.gain > 0.02)
      .map(([name, t]) => name + ' ' + Math.round(t.gain * 100) + '%');
    if (phraseActive()) playing.push('policeman (фраза)');
    hudSound.textContent = '♪ ' + (playing.join(', ') || 'тишина');
  }
}
