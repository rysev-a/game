// src/player/footsteps.js
// ШАГИ. Дома, пока игрок идет, на каждый шаг человечка звучит глухой шаг по деревянному полу.
// На улице и в других зданиях шагов нет. Файла шагов в audio/ нет, поэтому звук синтезируется
// (Web Audio): короткий шум через фильтр + низкий «стук». Чтобы включить шаги в другом здании,
// достаточно поставить в его registerInterior флаг footsteps: true.

let stepCtx = null;
let stepIndex = 0; // номер шага: чередуем левую и правую ногу
let lastStepCount = 0; // сколько шагов уже сделано (по фазе ходьбы)

// Один шаг. leg: 0 — левая, 1 — правая (чуть другой тон)
function playStep(leg = 0) {
  if (muted || !audioUnlocked) return;
  if (!stepCtx) stepCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (stepCtx.state === 'suspended') stepCtx.resume();
  const ctx = stepCtx;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.55 * effectsGain(); // громкость «Звуков» из настроек
  out.connect(ctx.destination);

  // Шорох подошвы: короткий белый шум через полосовой фильтр, быстро затухает
  const len = Math.floor(ctx.sampleRate * 0.09);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 520 + Math.random() * 160 + leg * 90;
  band.Q.value = 0.9;
  noise.connect(band);
  band.connect(out);
  noise.start(now);

  // Глухой стук пятки: низкий синус, уходящий вниз
  const osc = ctx.createOscillator();
  const thump = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(130 + leg * 18, now);
  osc.frequency.exponentialRampToValueAtTime(55, now + 0.09);
  thump.gain.setValueAtTime(0.9, now);
  thump.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
  osc.connect(thump);
  thump.connect(out);
  osc.start(now);
  osc.stop(now + 0.12);
}

// Вызывается каждый кадр из updatePlayerBody: walking — игрок сейчас идет пешком
function updateFootsteps(walking) {
  const ci = currentInterior();
  const enabled = !!ci && ci.def.footsteps === true;
  // Шаг — каждые π фазы ходьбы (нога коснулась пола). Фазу сверяем всегда, чтобы при входе
  // в дом не прозвучала «очередь» накопленных шагов
  const count = Math.floor(walkPhase / Math.PI);
  if (count === lastStepCount) return;
  lastStepCount = count;
  if (!walking || !enabled) return;
  playStep(stepIndex++ % 2);
}

// Щелчок, когда вещь взята в инвентарь (addItem в src/player/inventory.js): два коротких
// высоких «тика» подряд, как застежка. Тот же синтезатор, что и у шагов
function playPickupClick() {
  if (muted || !audioUnlocked) return;
  if (!stepCtx) stepCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (stepCtx.state === 'suspended') stepCtx.resume();
  const ctx = stepCtx;
  const out = ctx.createGain();
  out.gain.value = 0.5 * effectsGain();
  out.connect(ctx.destination);
  for (const [dt, freq] of [[0, 2600], [0.045, 3400]]) {
    const t = ctx.currentTime + dt;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.03);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + 0.04);
  }
}
