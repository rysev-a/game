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
      else if (kind === 'fight' && !(Core.resolveFight && Core.resolveFight(registry, arg))) bad(where, 'нет боя «' + arg + '»');
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
        } else if ((key === 'elixir' || key === 'heal') && typeof arg !== 'number') {
          bad(where, key + ': нужно число');
        } else if (key === 'wait') {
          try {
            Core.parseDuration(arg);
          } catch (err) {
            bad(where, 'wait: ' + err.message);
          }
        } else if (key === 'practice' && (!registry.places[arg.at] || !(arg.cars || []).length)) {
          bad(where, 'practice: нужны at (место) и cars');
        } else if (key === 'rewind' && !stepRefOk(arg)) {
          bad(where, 'rewind: нет шага «' + arg + '»');
        } else if (key === 'heli') {
          if (!registry.places[arg.from]) bad(where, 'heli: нет места from «' + arg.from + '»');
          if (!registry.places[arg.goal]) bad(where, 'heli: нет места goal «' + arg.goal + '»');
          lintEffects(arg.onGoal, where + ', heli');
        } else if (key === 'teleport' && !registry.places[typeof arg === 'string' ? arg : arg.to]) {
          bad(where, 'нет места в teleport');
        } else if (key === 'waitUntil' && !/^\d{1,2}:\d{2}$/.test(arg)) {
          bad(where, 'waitUntil: нужно время вида 22:00');
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
        if (s.timer) {
          try {
            Core.parseDuration(s.timer.limit);
          } catch (err) {
            bad(where, 'шаг «' + s.id + '»: timer.limit: ' + err.message);
          }
          lintEffects(s.timer.onExpire, where + ', таймер шага ' + s.id);
          for (const list of Object.values(s.timer.warn || {})) lintEffects(list, where + ', таймер шага ' + s.id);
        }
        for (const m of s.marker ? (typeof s.marker === 'object' ? Object.values(s.marker) : [s.marker]) : []) {
          if (!registry.places[m]) bad(where, 'у шага «' + s.id + '» нет места «' + m + '»');
        }
      }
      if (q.timer) {
        try {
          Core.parseDuration(q.timer.limit);
        } catch (err) {
          bad(where, 'timer.limit: ' + err.message);
        }
        lintCond(q.timer.start, where + ', таймер');
        lintCond(q.timer.until, where + ', таймер');
        lintEffects(q.timer.onExpire, where + ', таймер');
        for (const list of Object.values(q.timer.warn || {})) lintEffects(list, where + ', таймер');
      }
      if (q.checkpoints) {
        for (const id of q.checkpoints.order || []) if (!registry.places[id]) bad(where, 'checkpoints: нет места «' + id + '»');
        if (!q.checkpoints.counter) bad(where, 'checkpoints: нужен counter');
        lintCond(q.checkpoints.when, where + ', checkpoints');
      }
      for (const a of q.actions || []) {
        if (!a.id || !a.text) bad(where, 'actions: у кнопки нужны id и text');
        lintCond(a.if, where + ', кнопка ' + a.id);
        lintEffects(a.do, where + ', кнопка ' + a.id);
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
      for (const [name, f] of Object.entries(q.fights || {})) {
        const fw = where + ', бой ' + name;
        lintCond(f.when, fw);
        lintEffects(f.onWin, fw);
        if (!(f.foes || []).length) bad(fw, 'нет foes');
        for (const foe of f.foes || []) {
          if (!Core.foeKinds.includes(foe.kind)) bad(fw, 'неизвестный вид врага «' + foe.kind + '»');
          if (!registry.places[foe.at]) bad(fw, 'нет места «' + foe.at + '»');
        }
      }
      for (const [name, pz] of Object.entries(q.puzzles || {})) {
        const kind = Core.puzzleKinds[pz.kind];
        if (!kind) bad(where + ', головоломка ' + name, 'неизвестный вид «' + pz.kind + '»');
        else for (const msg of kind.check(pz)) bad(where + ', головоломка ' + name, msg);
        lintEffects(pz.onSolve, where + ', головоломка ' + name);
      }
      for (const e of (q.world && q.world.vehicles) || []) {
        if (!registry.places[e.at]) bad(where, 'world.vehicles: нет места «' + e.at + '»');
        lintCond(e.if, where + ', world');
      }
      for (const e of (q.world && q.world.people) || []) {
        if (!registry.characters[e.who]) bad(where, 'world.people: нет персонажа «' + e.who + '»');
        if (!registry.places[e.at]) bad(where, 'world.people: нет места «' + e.at + '»');
        lintCond(e.if, where + ', world');
      }
      for (const it of q.interactions || []) {
        if (!/^\w+:[\w.]+$/.test(it.on || '')) bad(where, 'interactions: нужен on вида «station:id», а не «' + it.on + '»');
        else if (it.on.startsWith('spot:') && !registry.spots[it.on.slice(5)]) bad(where, 'interactions: нет объекта «' + it.on + '»');
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

    for (const c of Object.values(registry.characters)) {
      if (!c.name) bad('персонаж ' + c.id, 'нет name');
      if (c.at && !registry.places[c.at]) bad('персонаж ' + c.id, 'нет места «' + c.at + '» в at');
    }
    for (const po of Object.values(registry.portals)) {
      const where = 'переход ' + po.id;
      if (!registry.places[po.at]) bad(where, 'нет места «' + po.at + '» в at');
      if (!registry.places[po.to]) bad(where, 'нет места «' + po.to + '» в to');
      lintCond(po.if, where);
    }
    for (const sp of Object.values(registry.spots)) {
      const where = 'объект ' + sp.id;
      if (!registry.places[sp.at]) bad(where, 'нет места «' + sp.at + '» в at');
      if (sp.solid && sp.yaw) bad(where, 'у твердого объекта (solid) не бывает yaw');
      if (!(sp.parts || []).length) bad(where, 'нет parts');
      for (const part of sp.parts || []) if (!Array.isArray(part) || part.length !== 7) bad(where, 'часть: [w, h, d, цвет, x, y, z]');
      lintCond(sp.if, where);
    }
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
