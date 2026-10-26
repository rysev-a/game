// src/engine/sound.js
// ЗВУК. Браузер разрешает воспроизведение только после действия пользователя, поэтому звук
// включается по первому нажатию клавиши или клику. Каждый файл — <audio loop>; играет только
// пока слышен, громкость плавно меняется. Громкость зон — в src/engine/zones.js.

// ЗВУК. Браузер разрешает воспроизведение только после действия пользователя,
// поэтому звук включается по первому нажатию клавиши или клику.
// Каждый файл — <audio loop>; играет только пока слышен, громкость плавно меняется
const soundNames = ['birds', 'birds_2', 'city', 'city_2', 'forest_birds', 'river', 'river_2', 'rain', 'shop'];
// Двигатели и занос — audio/cars/*.wav (см. engineSounds ниже): бесшовные круги — конец записи плавно
// перетекает в начало, а wav, в отличие от mp3, не дает щелчка тишины на стыке. engine.wav — короткий ровный цикл обычной легковушки (CC0, audio/cars/LICENSE-engine.txt):
// старая длинная запись audio/car.mp3 начиналась с запуска мотора, и он повторялся при каждом круге
const carSoundNames = ['engine', 'jeep', 'tractor', 'sportcar_1', 'sportcar_3', 'stop'];
const soundTracks = {};
for (const name of [...soundNames, ...carSoundNames]) {
  const el = new Audio('audio/' + (carSoundNames.includes(name) ? 'cars/' + name + '.wav' : name + '.mp3'));
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
const carRateMin = 0.7; // тон двигателя на малой скорости
const carRateMax = 1.4; // и на полной
// Звук двигателя по виду транспорта (VEHICLE_KINDS, src/world/vehicles.js); обычная легковушка — car.
// Каждый слой: файл, тон на малой и полной скорости (rate) и в какой доле скорости слой слышен (from: [a, b] —
// нарастает от a к b; out: [a, b] — от a к b стихает до четверти). Гоночная — смесь двух записей: ровный рев
// внизу плавно переходит в высокий визг на скорости
const engineSounds = {
  car: [{ track: 'engine', rate: [carRateMin, carRateMax] }],
  jeep: [{ track: 'jeep', rate: [0.8, 1.35] }],
  tractor: [{ track: 'tractor', rate: [0.85, 1.25] }],
  apc: [{ track: 'jeep', rate: [0.6, 1.0] }], // своей записи нет — джип ниже тоном
  race: [
    { track: 'sportcar_1', rate: [0.8, 1.25], out: [0.35, 0.9], vol: 1 },
    { track: 'sportcar_3', rate: [0.8, 1.2], from: [0.15, 0.75], vol: 0.8 },
  ],
};
const engineTracks = new Set(Object.values(engineSounds).flatMap((ls) => ls.map((l) => l.track)));
engineTracks.add('stop');
for (const name of engineTracks) {
  soundTracks[name].el.preservesPitch = false; // скорость воспроизведения меняет и тон — как обороты
  soundTracks[name].el.webkitPreservesPitch = false;
}
// Плавный переход слоя: 0 до a, 1 после b, между ними — без изломов (smoothstep)
const engineEdge = (t, [a, b]) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
// Обороты для звука догоняют скорость не сразу: тон и смесь слоев плывут, а не скачут вслед за газом
const engineFollow = 0.05;
let engineLevel = 0;
// Визг шин на заносе гоночных (audio/cars/stop.wav): пока остаются следы шин (car.sliding, src/player/driving.js)
const skidVolume = 0.9;

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
  const speedNow = drivingCar ? Math.min(1, Math.abs(drivingCar.speed) / effectiveKind(kind || carDrive).maxSpeed) : 0;
  engineLevel += (speedNow - engineLevel) * engineFollow;
  const carSpeed = drivingCar ? engineLevel : 0;
  const engine = engineSounds[(kind && (kind.sound || kind.id)) || 'car'] || engineSounds.car;
  const pitch = (kind && kind.pitch) || 1; // у машин гоночного парка свой тон
  const carVolume = carSpeed > 0.02 ? carVolumeMin + (carVolumeMax - carVolumeMin) * carSpeed : 0;
  for (const l of engine) {
    let v = l.vol || 1;
    if (l.from) v *= engineEdge(carSpeed, l.from);
    if (l.out) v *= 1 - 0.75 * engineEdge(carSpeed, l.out);
    mix[l.track] = Math.max(mix[l.track] || 0, carVolume * v);
    if (carSpeed > 0.02) soundTracks[l.track].el.playbackRate = (l.rate[0] + (l.rate[1] - l.rate[0]) * carSpeed) * pitch;
  }
  mix.stop = kind && kind.sound === 'race' && drivingCar.sliding ? skidVolume * (0.5 + 0.5 * carSpeed) : 0;
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
