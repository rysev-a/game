// src/ui/intro.js
// ВСТУПЛЕНИЕ НОВОЙ ИГРЫ. После «Новой игры» в главном меню (src/ui/main-menu.js):
//   1. герой уже лежит на кровати в спальне (черный экран закрывает сцену), на весь экран появляется текст героя, строка за строкой;
//   2. по клику, Enter или пробелу текст закрывается (первое нажатие сразу показывает весь текст), мир оживает: на столике внизу начинает звонить телефон;
//   3. герой просыпается: садится на кровати, спускает ноги и встает (анимация), потом игрок может им ходить, спуститься, взять телефон и ответить.
// Пока идет вступление (introActive), игра стоит: gameFrozen (src/quests/supers-ui.js) и паузы квестов (host.paused) смотрят на этот флаг, время и
// таймеры квестов не идут, ввод заблокирован. Без меню (?nomenu), при загрузке сохранения и при переходах между локациями вступления нет.

let introActive = false;

const INTRO_LINES = [
  'Говорят, в одну и ту же реку нельзя войти дважды, нельзя повернуть время вспять и вернуть утраченное.',
  'Я всегда думал так же и никогда не верил в сказки, пока однажды...',
];

// Кровать героя: ноги лежат у z = -2,55 (локально на втором этаже дома), голова на севере у изголовья
const introBed = { x: 6.6, z: -2.55 };
const introHips = { x: 6.6, z: -3.5 }; // где окажутся бедра, когда он сядет
const introStand = { x: 5.0, z: -2.1 }; // где он встанет: у кровати с западной стороны

(function () {
  const css = document.createElement('style');
  css.textContent = `
    #introScreen { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; background: #04060a;
      color: #e8ecf2; font-family: var(--font, monospace); cursor: pointer; user-select: none; }
    #introScreen .col { width: min(760px, 86vw); display: flex; flex-direction: column; gap: 28px; }
    #introScreen p { margin: 0; font-size: clamp(18px, 2.6vw, 28px); line-height: 1.55; letter-spacing: 0.02em; opacity: 0; transition: opacity 2s ease; }
    #introScreen p.on { opacity: 1; }
    #introScreen .go { position: absolute; bottom: 34px; left: 0; right: 0; text-align: center; font-size: var(--fs-small, 11px); letter-spacing: 0.12em;
      text-transform: uppercase; opacity: 0; transition: opacity 1.2s; color: rgba(232, 236, 242, 0.55); }
    #introScreen .go.on { opacity: 1; }
    #introScreen.out { opacity: 0; transition: opacity 1.4s ease; pointer-events: none; }
  `;
  document.head.appendChild(css);

  let screen = null;
  let timers = [];
  let revealed = 0;
  let canClose = false;
  let onFinish = null;

  function reveal(i) {
    if (!screen) return;
    const lines = screen.querySelectorAll('p');
    if (lines[i]) lines[i].classList.add('on');
    revealed = Math.max(revealed, i + 1);
  }

  function finish() {
    if (!screen) return;
    const s = screen;
    screen = null;
    timers.forEach(clearTimeout);
    timers = [];
    window.removeEventListener('keydown', onKey, true);
    s.classList.add('out');
    setTimeout(() => s.remove(), 1500);
    const cb = onFinish;
    onFinish = null;
    if (cb) cb(); // сцена под экраном уже готова: герой лежит, дальше звонок и пробуждение
  }

  function advance() {
    if (!screen) return;
    if (revealed < INTRO_LINES.length) {
      // первое нажатие показывает весь текст сразу
      timers.forEach(clearTimeout);
      timers = [];
      for (let i = 0; i < INTRO_LINES.length; i++) reveal(i);
      screen.querySelector('.go').classList.add('on');
      canClose = true;
    } else if (canClose) finish();
  }

  function onKey(e) {
    if (!screen) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    if (e.repeat) return;
    if (['Enter', 'Space', 'KeyE', 'Escape'].includes(e.code)) advance();
  }

  // Показать вступление; когда экран закрыт, вызывается done
  window.showIntroScreen = function showIntroScreen(done) {
    onFinish = done;
    revealed = 0;
    canClose = false;
    screen = document.createElement('div');
    screen.id = 'introScreen';
    const col = document.createElement('div');
    col.className = 'col';
    for (const text of INTRO_LINES) {
      const p = document.createElement('p');
      p.textContent = text;
      col.appendChild(p);
    }
    const go = document.createElement('div');
    go.className = 'go';
    go.textContent = 'Нажмите, чтобы продолжить';
    screen.append(col, go);
    document.body.appendChild(screen);
    screen.addEventListener('click', advance);
    window.addEventListener('keydown', onKey, true);
    // Строки появляются по очереди; в конце — подсказка
    timers.push(setTimeout(() => reveal(0), 900));
    timers.push(setTimeout(() => reveal(1), 5200));
    timers.push(
      setTimeout(() => {
        if (!screen) return;
        screen.querySelector('.go').classList.add('on');
        canClose = true;
      }, 8600),
    );
  };

  // ---------- Герой в кровати и пробуждение ----------
  const ease = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (t) => Math.max(0, Math.min(1, t));

  // Герой лежит на спине головой на север (+π/2 по наклону при взгляде на юг), на кровати на втором этаже
  function setLying() {
    playerHeading = Math.PI; // смотрит на юг: сесть он должен лицом к ногам
    worldRotation = 0;
    playerWorldX = introBed.x;
    playerWorldZ = homeFloorZ[1] + introBed.z;
    player.rotation.order = 'YXZ';
    player.visible = true;
    pose({ pitch: Math.PI / 2, y: 0.86, x: introBed.x, z: introBed.z, yaw: Math.PI, roll: 0 });
  }

  // Поза героя: наклон корпуса (π/2 — лежит на спине, 0 — прямо), высота и положение (локально на втором этаже), поворот
  function pose({ pitch, y, x, z, yaw, roll = 0 }) {
    playerHeading = yaw;
    playerWorldX = x;
    playerWorldZ = homeFloorZ[1] + z;
    player.rotation.set(pitch, yaw + worldRotation, roll);
    player.position.y = y;
    applyWorldTransform();
    updateFade();
  }

  function finishWake() {
    player.rotation.order = 'XYZ';
    player.rotation.x = 0;
    player.rotation.z = 0;
    player.position.y = playerGroundY;
    player.setSit(false);
    playerHeading = Math.PI / 2; // лицом к двери спальни
    playerWorldX = introStand.x;
    playerWorldZ = homeFloorZ[1] + introStand.z;
    walkAmp = 0;
    jumpVelocity = 0;
    introActive = false;
  }

  function wakeUp() {
    const start = performance.now();
    let sitSet = false;
    let standSet = false;
    (function frame() {
      const t = (performance.now() - start) / 1000;
      if (t < 1.4) {
        // Лежит и ворочается: звонит телефон внизу
        pose({ pitch: Math.PI / 2, y: 0.86, x: introBed.x, z: introBed.z, yaw: Math.PI, roll: Math.sin(t * 3.1) * 0.05 }); // спина на матрасе (верх 0,6)
      } else if (t < 2.7) {
        // Садится: корпус поднимается, бедра встают на матрас
        const k = ease(clamp01((t - 1.4) / 1.3));
        if (!sitSet && k > 0.55) {
          player.setSit(true);
          sitSet = true;
        }
        pose({
          pitch: lerp(Math.PI / 2, 0.06, k),
          y: lerp(0.86, 0.26, k),
          x: introBed.x,
          z: lerp(introBed.z, introHips.z, k),
          yaw: Math.PI,
          roll: 0,
        });
      } else if (t < 3.5) {
        // Сидит секунду, потирает глаза: легкое покачивание
        pose({ pitch: 0.06 + Math.sin((t - 2.7) * 5) * 0.03, y: 0.26, x: introHips.x, z: introHips.z, yaw: Math.PI, roll: 0 });
      } else if (t < 4.7) {
        // Встает и разворачивается к двери: переходит к кровати с западной стороны
        const k = ease(clamp01((t - 3.5) / 1.2));
        if (!standSet) {
          player.setSit(false);
          standSet = true;
        }
        pose({
          pitch: 0,
          y: lerp(0.26, 0, k),
          x: lerp(introHips.x, introStand.x, k),
          z: lerp(introHips.z, introStand.z, k),
          yaw: lerp(Math.PI, Math.PI / 2, k),
          roll: 0,
        });
      } else {
        finishWake();
        return;
      }
      requestAnimationFrame(frame);
    })();
  }

  // Звонок на столике внизу: звучит, пока герой не возьмет телефон (потом звонит окно вызова, src/quests/journal-ui.js)
  let ringTimer = null;
  function startRinging() {
    if (typeof ringPhoneOnce !== 'function') return;
    stopRinging();
    ringPhoneOnce();
    ringTimer = setInterval(() => {
      if (hasItem('phone')) return stopRinging();
      ringPhoneOnce();
    }, 1500);
  }
  function stopRinging() {
    if (ringTimer) clearInterval(ringTimer);
    ringTimer = null;
  }

  // «Новая игра»: герой уже в кровати, вступление на весь экран, потом звонок и пробуждение
  window.beginIntro = function beginIntro() {
    introActive = true;
    setLying();
    window.showIntroScreen(() => {
      startRinging();
      wakeUp();
    });
  };
})();
