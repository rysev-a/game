// src/core/conditions.js
// ЯЗЫК УСЛОВИЙ. Условие — строка, список строк (все должны выполняться), { any: [...] }, { all: [...] }
// или { not: условие }. «!» в начале строки — отрицание. Проверяет game.check(условие).
//
//   has:copper  has:elixir>=2      вещь в инвентаре (число сравнивается: >=, <=, >, <, =)
//   flag:x      count:gen.fuel>=4  флаг и счетчик
//   fact:Ф17                       факт сюжета открыт
//   quest:2.08  done:2.08          квест активен / выполнен
//   step:2.08.bring                шаг квеста выполнен
//   talked:denis                   хоть раз говорил с персонажем
//   talk:denis.police              дошел до этого узла диалога
//   inspected:body                 осмотрел объект (событие inspect)
//   puzzle:2.05.elixir             головоломка решена
//   fight:2.11.flash               бой выигран
//   elixir:>=20                    на шкале эликсира герою достаточно
//   dayssince:deal>=1              прошло столько суток (по полуночи) с отметки { markDay: 'deal' }
//   at:bridge.scene  near:place    игрок в месте (или в зоне) / в радиусе места
//   inside  driving                игрок в здании / за рулем
//   time:22:00-06:00  night  day   игровое время (через полночь тоже)
//   day:>=2                        идет такой-то день истории
//   rain                           идет дождь
//
// Новый вид условия — одна запись: Core.defineCondition('вид', (arg, game) => boolean).
// Неизвестный вид не ломает игру: предупреждение в консоль, условие ложно.

(function (root) {
  const Core = (root.Core = root.Core || {});

  Core.conditionKinds = {};
  Core.defineCondition = (kind, fn) => (Core.conditionKinds[kind] = fn);

  // «имя>=2» → { name, op, value }. Без сравнения: «хотя бы одно»
  Core.parseCompare = function parseCompare(arg) {
    const m = /^(.*?)(>=|<=|>|<|=)(-?\d+(?:\.\d+)?)$/.exec(arg);
    return m ? { name: m[1], op: m[2], value: Number(m[3]) } : { name: arg, op: '>=', value: 1 };
  };

  Core.compare = function compare(n, op, value) {
    switch (op) {
      case '>=': return n >= value;
      case '<=': return n <= value;
      case '>': return n > value;
      case '<': return n < value;
      default: return n === value;
    }
  };

  Core.parseCondition = function parseCondition(src) {
    let s = String(src).trim();
    let neg = false;
    if (s[0] === '!') {
      neg = true;
      s = s.slice(1).trim();
    }
    const i = s.indexOf(':');
    return { neg, kind: i < 0 ? s : s.slice(0, i), arg: i < 0 ? '' : s.slice(i + 1) };
  };

  // «09:30» → минуты от полуночи
  const clock = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Игровой час 0..24 (дробный); без хоста время старта — 09:00
  const hourOf = (game) => (game.host.hour ? game.host.hour() : ((9 * 60 + game.now()) / 60) % 24);
  const isNight = (h) => h >= 22 || h < 6;

  // «q.2.08.bring» → ['2.08', 'bring']: шаг — после последней точки
  Core.splitStepRef = (ref) => {
    const i = ref.lastIndexOf('.');
    return i < 0 ? [ref, ''] : [ref.slice(0, i), ref.slice(i + 1)];
  };

  // Номер суток по полуночи: игра начинается в 09:00, поэтому сутки считаем со сдвигом (по часу host.hour или по умолчанию 09:00)
  Core.dayIndex = (game) => {
    const now = game.now();
    const startMin = (((hourOf(game) * 60 - now) % 1440) + 1440) % 1440;
    return Math.floor((startMin + now) / 1440);
  };

  const kinds = {
    has: (arg, g) => {
      const c = Core.parseCompare(arg);
      return Core.compare(g.host.itemCount ? g.host.itemCount(c.name) : 0, c.op, c.value);
    },
    flag: (arg, g) => !!g.state.flags[arg],
    count: (arg, g) => {
      const c = Core.parseCompare(arg);
      return Core.compare(g.state.counters[c.name] || 0, c.op, c.value);
    },
    fact: (arg, g) => g.state.facts[arg] !== undefined,
    quest: (arg, g) => g.isActive(arg),
    done: (arg, g) => g.isDone(arg),
    step: (arg, g) => {
      const [q, s] = Core.splitStepRef(arg);
      return g.stepDone(q, s);
    },
    talked: (arg, g) => !!g.state.talked[arg],
    talk: (arg, g) => !!g.state.nodes[arg],
    inspected: (arg, g) => !!g.state.inspected[arg],
    puzzle: (arg, g) => !!g.state.puzzles[arg],
    fight: (arg, g) => !!g.state.fights[arg],
    dayssince: (arg, g) => {
      const c = Core.parseCompare(arg);
      const marked = g.state.counters['day.' + c.name];
      return marked !== undefined && Core.compare(Core.dayIndex(g) - marked, c.op, c.value);
    },
    elixir: (arg, g) => {
      const c = Core.parseCompare('e' + arg);
      return Core.compare(g.host.elixir ? g.host.elixir() : 0, c.op, c.value);
    },
    at: (arg, g) => {
      if (g.registry.places[arg]) return g.nearPlace(arg);
      return !!g.host.zone && g.host.zone() === arg;
    },
    near: (arg, g) => g.nearPlace(arg),
    inside: (arg, g) => !!(g.host.inside && g.host.inside()),
    driving: (arg, g) => !!(g.host.driving && g.host.driving()),
    rain: (arg, g) => !!(g.host.raining && g.host.raining()),
    night: (arg, g) => isNight(hourOf(g)),
    time: (arg, g) => {
      const [from, to] = arg.split('-').map(clock);
      const t = hourOf(g) * 60;
      return from <= to ? t >= from && t < to : t >= from || t < to;
    },
    // «day» — светлое время суток; «day:>=2» — номер дня истории
    day: (arg, g) => {
      if (!arg) return !isNight(hourOf(g));
      const c = Core.parseCompare(arg.replace(/^([<>=]+)/, 'd$1'));
      return Core.compare(Math.floor(g.now() / 1440) + 1, c.op, c.value);
    },
  };
  for (const k of Object.keys(kinds)) Core.defineCondition(k, kinds[k]);

  const warned = new Set();

  // Подключается к игре в createGame: game.check(cond)
  Core.attachConditions = function attachConditions(game) {
    function check(cond) {
      if (cond === undefined || cond === null || cond === true) return true;
      if (cond === false) return false;
      if (Array.isArray(cond)) return cond.every(check);
      if (typeof cond === 'object') {
        if (cond.any) return cond.any.some(check);
        if (cond.all) return cond.all.every(check);
        if ('not' in cond) return !check(cond.not);
        return true;
      }
      const { neg, kind, arg } = Core.parseCondition(cond);
      const fn = Core.conditionKinds[kind];
      if (!fn) {
        if (!warned.has(kind)) {
          warned.add(kind);
          console.warn('Неизвестный вид условия: ' + kind + ' (' + cond + ')');
        }
        return false;
      }
      const result = !!fn(arg, game);
      return neg ? !result : result;
    }
    game.check = check;
  };
})(globalThis);
