// src/core/dialogs.js
// ДИАЛОГИ ИЗ ДАННЫХ. Превращают описание разговора в узлы движка окна диалога (src/engine/dialogue.js):
//   { speaker, text, options: [{ text, action(person), next(person), end }] }
// Узлы строятся лениво: узел создается (и выполняет свои действия do), только когда игрок до него дошел.
//
//   defineDialog('mihalych', {
//     start: [{ if: '!talked:mihalych', goto: 'meet' }, { goto: 'hub' }],   // первый подходящий вход
//     nodes: { hub: { text: ['Говори.', 'Ну?'], options: ['topics', { text: 'Пока.', end: true }] } },
//     topics: [{ text: 'Что за грузовики?', if: 'done:3.10', goto: 'trucks', once: true }],
//   });
//
// Узел: text (строка, список для случайной реплики, { if, text } для условной), speaker, do (действия),
// options, next (узел без вариантов: покажется один вариант «Дальше»).
// Вариант: text, if, do, goto, end, once, reveal. Особый вариант 'topics' разворачивается в темы персонажа
// и темы активных квестов.
//
// Квест добавляет свое к чужим персонажам, не трогая их файлы (пока квест активен):
//   topics: { denis: [...] }   новые темы,   starts: { denis: [{ if, goto: '1.03.bridge' }] }   новые входы,
//   nodes: { bridge: {...} }   узлы, на которые ссылаются как '<id квеста>.<имя>': '1.03.bridge'; внутри самого
//                              квеста можно коротко: goto: 'police' (сначала ищется узел того же квеста).

(function (root) {
  const Core = (root.Core = root.Core || {});

  // Узел по ссылке: узел квеста ('1.03.bridge') или узел диалога ('hub'). scope — квест или диалог, из которого
  // идет ссылка: короткое имя ищется сначала у него. Результат { node, owner, id } (id — полное имя) или null
  Core.resolveNodeRef = function resolveNodeRef(registry, ref, dialog, scope) {
    if (scope && scope.nodes && scope.nodes[ref]) {
      const isQuest = !!registry.quests[scope.id] && registry.quests[scope.id] === scope;
      return { node: scope.nodes[ref], owner: scope, id: isQuest ? scope.id + '.' + ref : ref };
    }
    for (const q of Object.values(registry.quests)) {
      const prefix = q.id + '.';
      if (ref.startsWith(prefix) && q.nodes && q.nodes[ref.slice(prefix.length)]) {
        return { node: q.nodes[ref.slice(prefix.length)], owner: q, id: ref };
      }
    }
    if (dialog && dialog.nodes && dialog.nodes[ref]) return { node: dialog.nodes[ref], owner: dialog, id: ref };
    return null;
  };

  Core.gameExtensions.push(function attachDialogs(game) {
    const { registry } = game;
    const rand = () => (game.host.random ? game.host.random() : Math.random());

    const activeQuests = () => Object.values(registry.quests).filter((q) => game.isActive(q.id));

    // Темы персонажа: свои и активных квестов; каждая помнит, откуда она (scope), для коротких ссылок goto
    function topicsOf(who, dialog) {
      const list = ((dialog && dialog.topics) || []).map((t) => ({ ...t, scope: dialog }));
      for (const q of activeQuests()) list.push(...((q.topics && q.topics[who]) || []).map((t) => ({ ...t, scope: q })));
      return list;
    }

    const onceKey = (parts) => 'once:' + parts.join('|');

    function pickText(text) {
      const variants = (Array.isArray(text) ? text : [text]).filter((t) => typeof t === 'string' || game.check(t.if));
      const t = variants[Math.floor(rand() * variants.length)];
      return t === undefined ? '' : typeof t === 'string' ? t : t.text;
    }

    function speakerOf(node, who) {
      if (node.speaker) return node.speaker;
      const ch = who && registry.characters[who];
      return ch ? ch.name + (ch.title ? ' — ' + ch.title : '') : '';
    }

    // Один вариант ответа в формате движка
    function makeOption(o, ctx, key) {
      if (o.scope) ctx = { ...ctx, scope: o.scope };
      return {
        text: o.text,
        action: () => {
          if (o.once) game.state.once[key] = true;
          if (o.reveal) game.reveal(o.reveal);
          game.run(o.do);
        },
        next: o.goto && !o.end ? () => build(o.goto, ctx) : undefined,
        end: !!o.end || !o.goto,
      };
    }

    function buildOptions(node, ctx, ref) {
      const raw = node.options || (node.next ? [{ text: 'Дальше', goto: node.next }] : []);
      const out = [];
      raw.forEach((o, i) => {
        if (o === 'topics') {
          for (const t of topicsOf(ctx.who, ctx.dialog)) {
            const key = onceKey([ctx.who, 'topic', t.text]);
            if (!game.check(t.if) || (t.once && game.state.once[key])) continue;
            out.push(makeOption(t, ctx, key));
          }
          return;
        }
        const key = onceKey([ctx.who, ref, i]);
        if (!game.check(o.if) || (o.once && game.state.once[key])) return;
        out.push(makeOption(o, ctx, key));
      });
      return out;
    }

    function build(ref, ctx) {
      const found = Core.resolveNodeRef(registry, ref, ctx.dialog, ctx.scope);
      if (!found) {
        console.warn('Нет узла диалога: ' + ref);
        return { speaker: '', text: '…', options: [] };
      }
      const node = found.node;
      const here = { ...ctx, scope: found.owner }; // дальше короткие ссылки ищутся там же, где этот узел
      if (ctx.who) game.emit('talk', { who: ctx.who, node: found.id });
      game.run(node.do);
      return { speaker: speakerOf(node, ctx.who), text: pickText(node.text), options: buildOptions(node, here, found.id) };
    }

    // Есть ли разговор у персонажа (свой диалог или вход от активного квеста)
    game.hasDialog = (who) => !!registry.dialogs[who] || activeQuests().some((q) => q.starts && q.starts[who]);

    // Начало разговора с персонажем: узел для движка или null
    game.dialogue = (who) => {
      const dialog = registry.dialogs[who] || null;
      const entries = [];
      for (const q of activeQuests()) entries.push(...((q.starts && q.starts[who]) || []).map((e) => ({ e, scope: q })));
      entries.push(...((dialog && dialog.start) || []).map((e) => ({ e, scope: dialog })));
      const entry = entries.find(({ e }) => game.check(e.if));
      return entry ? build(entry.e.goto, { who, dialog, scope: entry.scope }) : null;
    };

    // Узел по ссылке без персонажа (воспоминание, закадровая реплика): действие { dialog: '1.03.flash' }
    game.dialogueNode = (ref) => build(ref, { who: null, dialog: null });
  });
})(globalThis);
