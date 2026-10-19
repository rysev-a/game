// src/engine/creature-sounds.js
// ГОЛОСА СУЩЕСТВ. Страшные звуки биосуществ (синтез Web Audio, без файлов): рычание, вой, визг, шипение, бульканье, укус, предсмертный крик.
//   playCreatureSound(голос, что, расстояние)
//     голос: 'hound' (спорогончая: низкое рычание и вой), 'strider' (химерный ходок: скрежещущий визг и стрекот),
//            'maw' (болотная пасть: влажное бульканье и чавканье);
//     что:   'idle' (негромко, само по себе), 'roar' (заметили героя), 'snarl' (в бою), 'attack' (удар или плевок), 'death'.
//   Громкость падает с расстоянием (дальше 60 юнитов не слышно) и зависит от настройки «Звуки» (effectsGain, src/engine/settings.js).
// Зовет src/quests/fights.js. Без включенного звука (M, звук еще не разблокирован) молчит.

let creatureCtx = null;
let creatureLastAt = 0;

function playCreatureSound(voice, what, distance = 10) {
  if (typeof muted !== 'undefined' && (muted || !audioUnlocked)) return;
  const near = Math.max(0, 1 - distance / 60);
  const vol = near * near * 0.6 * (typeof effectsGain === 'function' ? effectsGain() : 1);
  if (vol < 0.015) return;
  const nowMs = performance.now();
  if (nowMs - creatureLastAt < 90 && what !== 'death') return; // стая не должна слипаться в сплошной шум
  creatureLastAt = nowMs;
  if (!creatureCtx) creatureCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (creatureCtx.state === 'suspended') creatureCtx.resume();
  const ctx = creatureCtx;
  const t0 = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = vol;
  out.connect(ctx.destination);

  // Тон с глиссандо: из f0 в f1, затем в f2; tremolo — частота дрожания громкости (рык), vibrato — частота дрожания высоты (вой)
  const tone = (type, f0, f1, dur, level, { f2, tremolo = 0, depth = 0.6, vibrato = 0, vibDepth = 0, lp = 0, delay = 0 } = {}) => {
    const o = ctx.createOscillator();
    const env = ctx.createGain();
    const start = t0 + delay;
    o.type = type;
    o.frequency.setValueAtTime(f0, start);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), start + dur * (f2 ? 0.5 : 1));
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), start + dur);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(level, start + Math.min(0.12, dur * 0.25));
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    let node = o;
    if (lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      node.connect(f);
      node = f;
    }
    node.connect(env);
    env.connect(out);
    if (tremolo) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = tremolo;
      lg.gain.value = level * depth;
      lfo.connect(lg);
      lg.connect(env.gain);
      lfo.start(start);
      lfo.stop(start + dur + 0.05);
    }
    if (vibrato) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = vibrato;
      lg.gain.value = vibDepth;
      lfo.connect(lg);
      lg.connect(o.frequency);
      lfo.start(start);
      lfo.stop(start + dur + 0.05);
    }
    o.start(start);
    o.stop(start + dur + 0.05);
  };
  const noise = (dur, level, freq, type = 'bandpass', { q = 1, delay = 0, swell = false } = {}) => {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const x = i / len;
      d[i] = (Math.random() * 2 - 1) * (swell ? Math.sin(Math.PI * x) : 1 - x);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = level;
    src.connect(f).connect(g).connect(out);
    src.start(t0 + delay);
  };

  const r = 0.9 + Math.random() * 0.2; // чуть разный тон у каждого существа и каждого раза
  if (voice === 'hound') {
    if (what === 'roar') {
      tone('sine', 300 * r, 780 * r, 1.5, 0.5, { f2: 420 * r, vibrato: 6, vibDepth: 28 }); // вой вверх и вниз
      tone('sawtooth', 120 * r, 200 * r, 1.4, 0.25, { f2: 130 * r, tremolo: 22, lp: 900 });
    } else if (what === 'attack') {
      tone('sawtooth', 210 * r, 90 * r, 0.35, 0.5, { tremolo: 36, lp: 1200 });
      noise(0.18, 0.4, 1800, 'bandpass', { q: 1.2 });
    } else if (what === 'death') {
      tone('sawtooth', 380 * r, 60, 1.1, 0.55, { tremolo: 18, lp: 1100 });
      tone('sine', 700 * r, 150, 0.8, 0.3, { vibrato: 9, vibDepth: 40 });
    } else {
      tone('sawtooth', 85 * r, 58 * r, 0.9, 0.45, { tremolo: 28, depth: 0.7, lp: 420 }); // низкое рычание
      noise(0.8, 0.12, 260, 'lowpass', { swell: true });
    }
  } else if (voice === 'strider') {
    if (what === 'roar') {
      tone('sawtooth', 700 * r, 2600 * r, 0.8, 0.4, { f2: 1500 * r, tremolo: 55, depth: 0.7, vibrato: 14, vibDepth: 90 }); // визг
      tone('square', 90 * r, 60, 0.9, 0.25, { tremolo: 16, lp: 500 });
    } else if (what === 'attack') {
      tone('sawtooth', 1800 * r, 600 * r, 0.3, 0.45, { tremolo: 70 });
      noise(0.15, 0.4, 3500, 'highpass');
    } else if (what === 'death') {
      tone('sawtooth', 2400 * r, 120, 1.2, 0.5, { tremolo: 40, vibrato: 20, vibDepth: 120 });
      noise(0.7, 0.3, 2500, 'bandpass', { q: 0.8 });
    } else {
      // шипение и стрекот: шумовой «шорох» и быстрые щелчки
      noise(0.9, 0.22, 4200, 'highpass', { swell: true });
      for (let i = 0; i < 5; i++) tone('square', (1600 + Math.random() * 600) * r, 800, 0.05, 0.18, { delay: i * 0.09 + Math.random() * 0.03 });
    }
  } else if (voice === 'maw') {
    if (what === 'roar') {
      tone('sine', 70 * r, 110 * r, 1.6, 0.6, { f2: 60 * r, vibrato: 18, vibDepth: 30, tremolo: 9, depth: 0.5 }); // булькающий низкий рев
      noise(1.5, 0.22, 320, 'lowpass', { swell: true });
    } else if (what === 'attack') {
      noise(0.16, 0.5, 900, 'lowpass');
      tone('sine', 130, 55, 0.25, 0.5);
      for (let i = 0; i < 3; i++) tone('sine', (180 + i * 40) * r, 90, 0.07, 0.3, { delay: 0.1 + i * 0.08 }); // чавк-чавк
    } else if (what === 'death') {
      tone('sine', 90 * r, 38, 1.5, 0.6, { vibrato: 14, vibDepth: 28, tremolo: 7 });
      noise(1.2, 0.3, 280, 'lowpass', { swell: true });
    } else {
      tone('sine', 85 * r, 70 * r, 1.0, 0.4, { vibrato: 22, vibDepth: 26, tremolo: 13, depth: 0.7 }); // бульканье
      noise(0.9, 0.14, 350, 'lowpass', { swell: true });
    }
  }
}
