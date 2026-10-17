// src/core/check-content.js
// ПРОВЕРКА СОДЕРЖАНИЯ. Ловит ошибки в данных до игры: битые ссылки на квесты, факты, места, персонажей, вещи,
// узлы диалога; неизвестные виды условий и действий; квест без шагов; повторные id.
//
//   Core.checkContent(registry, { items, zones })  → список строк «[где] что не так»; пустой — всё в порядке
//   Core.metaCensus(registry)                       → { 'design.theme': 3, … } какие ключи meta и сколько записей их используют
//
// items — таблица вещей игры (ITEMS) или список id: без нее вещи не проверяются. zones — id зон мира для at:.

(function (root) {
  const Core = (root.Core = root.Core || {});

  Core.checkContent = function checkContent(registry = Core.registry, opts = {}) {
    const problems = [...registry.problems];
    const bad = (where, msg) => problems.push('[' + where + '] ' + msg);

    const itemKnown = (id) => {
      const items = opts.items;
      if (!items) return true;
      if (items instanceof Set) return items.has(id);
      return Array.isArray(items) ? items.includes(id) : id in items;
    };
    const zoneKnown = (id) => !opts.zones || opts.zones.includes(id);

    function stepRefOk(ref) {
      const [qid, sid] = Core.splitStepRef(ref);
      const q = registry.quests[qid];
      return !!q && (q.steps || []).some((s) => s.id === sid);
    }

    function lintCond(cond, where) {
      if (cond === undefined || cond === null || typeof cond === 'boolean') return;
      if (Array.isArray(cond)) return cond.forEach((c) => lintCond(c, where));
      if (typeof cond === 'object') {
        for (const c of cond.any || []) lintCond(c, where);
        for (const c of cond.all || []) lintCond(c, where);
        if ('not' in cond) lintCond(cond.not, where);
        return;
      }
      const { kind, arg } = Core.parseCondition(cond);
      if (!Core.conditionKinds[kind]) return bad(where, 'неизвестный вид условия «' + kind + '» в «' + cond + '»');
      const name = kind === 'has' || kind === 'count' ? Core.parseCompare(arg).name : arg;
      if (kind === 'has' && !itemKnown(name)) bad(where, 'нет вещи «' + name + '» в «' + cond + '»');
      else if ((kind === 'quest' || kind === 'done') && !registry.quests[arg]) bad(where, 'нет квеста «' + arg + '»');
      else if (kind === 'step' && !stepRefOk(arg)) bad(where, 'нет шага «' + arg + '»');
      else if (kind === 'puzzle' && !Core.resolvePuzzle(registry, arg)) bad(where, 'нет головоломки «' + arg + '»');
      else if (kind === 'fact' && !registry.facts[arg]) bad(where, 'нет факта «' + arg + '»');
      else if (kind === 'talked' && !registry.characters[arg]) bad(where, 'нет персонажа «' + arg + '»');
      else if (kind === 'talk' && !registry.characters[arg.split('.')[0]]) bad(where, 'нет персонажа в «' + cond + '»');
      else if (kind === 'near' && !registry.places[arg]) bad(where, 'нет места «' + arg + '»');
      else if (kind === 'at' && !registry.places[arg] && !zoneKnown(arg)) bad(where, 'нет места или зоны «' + arg + '»');
    }

    function lintEffects(list, where) {
      if (!list) return;
      for (const e of Array.isArray(list) ? list : [list]) {
        if (!e || typeof e !== 'object') {
          bad(where, 'действие должно быть объектом');
          continue;
        }
        if ('if' in e) {
          lintCond(e.if, where);
          lintEffects(e.then, where);
          lintEffects(e.else, where);
          continue;
        }
        const key = Object.keys(e)[0];
        const arg = e[key];
        if (!Core.effectKinds[key]) {
          bad(where, 'неизвестное действие «' + key + '»');
        } else if ((key === 'start' || key === 'complete' || key === 'track') && !registry.quests[arg]) {
          bad(where, 'нет квеста «' + arg + '» в действии ' + key);
        } else if (key === 'step' && !stepRefOk(arg)) {
          bad(where, 'нет шага «' + arg + '»');
        } else if (key === 'reveal' && !registry.facts[arg]) {
          bad(where, 'нет факта «' + arg + '»');
        } else if (key === 'puzzle' && !Core.resolvePuzzle(registry, arg)) {
          bad(where, 'нет головоломки «' + arg + '»');
        } else if (key === 'elixir' && typeof arg !== 'number') {
          bad(where, 'elixir: нужно число');
        } else if (key === 'dialog' && !Core.resolveNodeRef(registry, arg, null)) {
          bad(where, 'нет узла диалога «' + arg + '»');
        } else if ((key === 'give' || key === 'take') && opts.items) {
          for (const id of Object.keys(typeof arg === 'string' ? { [arg]: 1 } : arg)) {
            if (!itemKnown(id)) bad(where, 'нет вещи «' + id + '» в действии ' + key);
          }
        } else if (key === 'phone' && !registry.characters[arg.from]) {
          bad(where, 'нет персонажа «' + arg.from + '» в phone');
        }
      }
    }

    function lintGoto(ref, where, dialog, scope) {
      if (!Core.resolveNodeRef(registry, ref, dialog, scope)) bad(where, 'нет узла диалога «' + ref + '»');
    }

    // scope — квест или диалог, которому принадлежит узел: из него работают короткие ссылки
    function lintNode(node, where, dialog, scope) {
      if (node.text === undefined || node.text === '') bad(where, 'у узла нет text');
      lintEffects(node.do, where);
      if (node.next) lintGoto(node.next, where, dialog, scope);
      for (const o of node.options || []) {
        if (o === 'topics') continue;
        if (!o.text) bad(where, 'у варианта ответа нет text');
        lintCond(o.if, where);
        lintEffects(o.do, where);
        if (o.goto) lintGoto(o.goto, where, dialog, scope);
        if (o.reveal && !registry.facts[o.reveal]) bad(where, 'нет факта «' + o.reveal + '»');
      }
    }

    function lintEntries(list, who, where, dialog, scope) {
      if (!registry.characters[who]) bad(where, 'нет персонажа «' + who + '»');
      for (const e of list) {
        lintCond(e.if, where);
        if (e.goto) lintGoto(e.goto, where, dialog, scope);
        lintEffects(e.do, where);
      }
    }

    for (const q of Object.values(registry.quests)) {
      const where = 'квест ' + q.id;
      if (!q.title) bad(where, 'нет title');
      if (!(q.steps || []).length) bad(where, 'нет шагов');
      const seen = new Set();
      for (const s of q.steps || []) {
        if (!s.id || seen.has(s.id)) bad(where, 'шаг без id или повторный id «' + s.id + '»');
        seen.add(s.id);
        if (!s.text) bad(where, 'у шага «' + s.id + '» нет text');
        lintCond(s.done, where + ', шаг ' + s.id);
        if (s.marker && !registry.places[s.marker]) bad(where, 'у шага «' + s.id + '» нет места «' + s.marker + '»');
      }
      lintCond(q.autoStart, where);
      lintCond(q.requires, where);
      lintEffects(q.onStart, where);
      lintEffects(q.onDone, where);
      for (const [sid, list] of Object.entries(q.onStep || {})) {
        if (!seen.has(sid)) bad(where, 'onStep: нет шага «' + sid + '»');
        lintEffects(list, where);
      }
      if (q.next && !registry.quests[q.next]) bad(where, 'нет следующего квеста «' + q.next + '»');
      for (const [name, pz] of Object.entries(q.puzzles || {})) {
        const kind = Core.puzzleKinds[pz.kind];
        if (!kind) bad(where + ', головоломка ' + name, 'неизвестный вид «' + pz.kind + '»');
        else for (const msg of kind.check(pz)) bad(where + ', головоломка ' + name, msg);
        lintEffects(pz.onSolve, where + ', головоломка ' + name);
      }
      for (const it of q.interactions || []) {
        if (!/^\w+:[\w.]+$/.test(it.on || '')) bad(where, 'interactions: нужен on вида «station:id», а не «' + it.on + '»');
        lintCond(it.if, where + ', interactions');
        lintEffects(it.do, where + ', interactions');
      }
      for (const [name, node] of Object.entries(q.nodes || {})) lintNode(node, where + ', узел ' + name, null, q);
      for (const [who, list] of Object.entries(q.topics || {})) lintEntries(list, who, where + ', темы ' + who, null, q);
      for (const [who, list] of Object.entries(q.starts || {})) lintEntries(list, who, where + ', входы ' + who, null, q);
    }

    for (const d of Object.values(registry.dialogs)) {
      const where = 'диалог ' + d.id;
      if (!registry.characters[d.id]) bad(where, 'нет персонажа с таким id');
      if (!(d.start || []).length) bad(where, 'нет start');
      lintEntries(d.start || [], d.id, where + ', start', d, d);
      lintEntries(d.topics || [], d.id, where + ', темы', d, d);
      for (const [name, node] of Object.entries(d.nodes || {})) lintNode(node, where + ', узел ' + name, d, d);
    }

    for (const c of Object.values(registry.characters)) if (!c.name) bad('персонаж ' + c.id, 'нет name');
    for (const f of Object.values(registry.facts)) if (!f.text) bad('факт ' + f.id, 'нет text');
    for (const p of Object.values(registry.places)) {
      if (typeof p.x !== 'number' || typeof p.z !== 'number') bad('место ' + p.id, 'нужны числа x и z');
    }
    return problems;
  };

  // Перепись meta: какие ключи используются и в скольких записях
  Core.metaCensus = function metaCensus(registry = Core.registry) {
    const census = {};
    for (const table of ['quests', 'dialogs', 'characters', 'facts', 'places']) {
      for (const rec of Object.values(registry[table])) {
        for (const key of Object.keys(rec.meta || {})) census[key] = (census[key] || 0) + 1;
      }
    }
    return census;
  };
})(globalThis);
