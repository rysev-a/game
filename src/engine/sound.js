// src/engine/sound.js
// ЗВУК. Браузер разрешает воспроизведение только после действия пользователя, поэтому звук
// включается по первому нажатию клавиши или клику. Каждый файл — <audio loop>; играет только
// пока слышен, громкость плавно меняется. Громкость зон — в src/engine/zones.js.

// ЗВУК. Браузер разрешает воспроизведение только после действия пользователя,
// поэтому звук включается по первому нажатию клавиши или клику.
// Каждый файл — <audio loop>; играет только пока слышен, громкость плавно меняется
const soundNames = ['birds', 'birds_2', 'city', 'city_2', 'forest_birds', 'river', 'river_2', 'rain', 'shop', 'car'];
// Двигатели и занос — audio/cars/ (см. engineSounds ниже)
const carSoundNames = ['jeep', 'tractor', 'sportcar_1', 'sportcar_3', 'stop'];
const soundTracks = {};
for (const name of [...soundNames, ...carSoundNames]) {
  const el = new Audio('audio/' + (carSoundNames.includes(name) ? 'cars/' : '') + name + '.mp3');
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
// Звук двигателя по виду транспорта (VEHICLE_KINDS, src/world/vehicles.js); обычная легковушка — car.
// Каждый слой: файл, тон на малой и полной скорости (rate) и в какой доле скорости слой слышен (from → full:
// с from нарастает, к full — на полную; out — с этой доли затихает). Гоночная — смесь двух записей:
// ровный рев внизу, высокий визг на скорости, а при резком старте — рык перегазовки (sportcar_2)
const engineSounds = {
  car: [{ track: 'car', rate: [carRateMin, carRateMax] }],
  jeep: [{ track: 'jeep', rate: [0.8, 1.35] }],
  tractor: [{ track: 'tractor', rate: [0.85, 1.25] }],
  apc: [{ track: 'jeep', rate: [0.6, 1.0] }], // своей записи нет — джип ниже тоном
  race: [
    { track: 'sportcar_1', rate: [0.8, 1.3], out: [0.55, 1], vol: 1 },
    { track: 'sportcar_3', rate: [0.85, 1.25], from: [0.25, 0.7], vol: 0.9 },
  ],
};
const engineTracks = new Set(Object.values(engineSounds).flatMap((ls) => ls.map((l) => l.track)));
engineTracks.add('stop');
for (const name of engineTracks) {
  soundTracks[name].el.preservesPitch = false; // скорость воспроизведения меняет и тон — как обороты
  soundTracks[name].el.webkitPreservesPitch = false;
}
const engineEdge = (t, [a, b]) => Math.min(1, Math.max(0, (t - a) / (b - a)));
// Визг шин на заносе гоночной (audio/cars/stop.mp3): пока остаются следы шин (car.sliding, src/player/driving.js)
const skidVolume = 0.9;
// Перегазовка гоночной: резко тронулась с места — один раз рык мотора, не чаще раза в revEvery мс
const revSound = new Audio('audio/cars/sportcar_2.mp3');
revSound.preload = 'auto';
const revEvery = 4000;
let revAt = 0;
let engineSpeedPrev = 0;

const rainVolume = 0.6;
const rainVolumeInside = 0.12; // дождь по крыше слышно приглушенно

function updateSound() {
  phrase.volume = Math.min(1, effectsGain()); // фраза — из группы «Звуки» (src/engine/settings.js)
  const hudSound = document.getElementById('hudSound');
  const hudZone = document.getElementById('hudZone');
  const zone = currentZone();
  hudZone.textContent = 'Локация: ' + zone.name;
  hudSound.textContent = muted ? 'Звук выключен' : audioUnlocked ? '' : 'Нажмите любую клавишу — включится звук';

  const mix = targetMix();
  mix.rain = rainOn ? (insideBuilding() ? rainVolumeInside : rainVolume) : 0;
  // Двигатель: звучит, только пока машина едет; быстрее — громче и выше тоном
  const kind = drivingCar && drivingCar.kind;
  const carSpeed = drivingCar ? Math.min(1, Math.abs(drivingCar.speed) / ((kind && kind.maxSpeed) || carMaxSpeed)) : 0;
  const engine = engineSounds[(kind && kind.id) || 'car'] || engineSounds.car;
  const carVolume = carSpeed > 0.02 ? carVolumeMin + (carVolumeMax - carVolumeMin) * carSpeed : 0;
  for (const l of engine) {
    let v = l.vol || 1;
    if (l.from) v *= engineEdge(carSpeed, l.from);
    if (l.out) v *= 1 - 0.6 * engineEdge(carSpeed, l.out);
    mix[l.track] = Math.max(mix[l.track] || 0, carVolume * v);
    if (carSpeed > 0.02) soundTracks[l.track].el.playbackRate = l.rate[0] + (l.rate[1] - l.rate[0]) * carSpeed;
  }
  mix.stop = kind && kind.id === 'race' && drivingCar.sliding ? skidVolume * (0.5 + 0.5 * carSpeed) : 0;
  if (kind && kind.id === 'race' && audioUnlocked && !muted && engineSpeedPrev < 0.15 && carSpeed - engineSpeedPrev > 0.004 &&
      performance.now() - revAt > revEvery) {
    revAt = performance.now();
    revSound.currentTime = 0;
    revSound.volume = Math.min(1, 0.8 * effectsGain());
    revSound.play().catch(() => {});
  }
  if (!revSound.paused && (muted || !kind || kind.id !== 'race')) revSound.pause(); // вышли из машины или выключили звук
  engineSpeedPrev = carSpeed;
  duck += ((phraseActive() ? duckLevel : 1) - duck) * 0.1;
  for (const [name, t] of Object.entries(soundTracks)) {
    // Двигатель — из группы «Звуки», остальное — фоновые звуки: у каждой группы своя громкость в настройках
    const engineTrack = engineTracks.has(name);
    const groupGain = engineTrack ? effectsGain() : ambientGain();
    const off = muted || !audioUnlocked || groupGain <= 0;
    const target = off ? 0 : (mix[name] || 0) * duck;
    t.gain += (target - t.gain) * (engineTrack ? 0.15 : 0.04); // двигатель реагирует быстро
    if (Math.abs(target - t.gain) < 0.002) t.gain = target;
    t.el.volume = Math.min(Math.max(t.gain * groupGain, 0), 1); // громкость из настроек
    if (t.gain > 0 && !t.playing) {
      t.playing = true;
      t.el.play().catch(() => (t.playing = false)); // не получилось — попробуем в следующем кадре
    } else if (t.gain === 0 && t.playing) {
      t.playing = false;
      t.el.pause();
    }
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
