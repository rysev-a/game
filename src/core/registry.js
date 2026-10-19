// src/core/registry.js
// РЕЕСТР СОДЕРЖАНИЯ. Квесты, диалоги, персонажи, факты и места — данные из литералов, без функций.
// Файлы содержания (src/content/…) вызывают defineQuest({...}), defineDialog(id, {...}) и так далее,
// каждая запись кладется в свою таблицу по id. Повторный id не ломает игру: он попадает в registry.problems,
// а checkContent() (src/core/check-content.js) выводит эти ошибки вместе с остальными.
//
// Ядро (src/core) не знает ни про three.js, ни про DOM: оно работает и в браузере, и в Node (tests/).
// Все файлы ядра — классические скрипты, которые добавляют себя к объекту Core в globalThis.

(function (root) {
  const Core = (root.Core = root.Core || {});

  // Таблицы реестра: имя таблицы → как оно звучит в сообщениях об ошибках
  const TABLES = {
    quests: 'квест',
    dialogs: 'диалог',
    characters: 'персонаж',
    facts: 'факт',
    places: 'место',
    spots: 'объект мира',
    portals: 'переход',
    scenarios: 'сценарий',
    supers: 'супер-предмет',
  };

  Core.createRegistry = function createRegistry() {
    const reg = { problems: [] };
    for (const table of Object.keys(TABLES)) reg[table] = {};

    function put(table, id, data) {
      if (!id || typeof id !== 'string') {
        reg.problems.push(`[${TABLES[table]}] у записи нет id`);
        return null;
      }
      if (reg[table][id]) {
        reg.problems.push(`[${TABLES[table]} ${id}] повторное определение, оставлено первое`);
        return reg[table][id];
      }
      reg[table][id] = { ...data, id };
      return reg[table][id];
    }

    // Запись можно передать целиком ({ id, ... }) или парой (id, данные)
    const entry = (a, b) => (typeof a === 'string' ? [a, b || {}] : [a && a.id, a || {}]);

    reg.defineQuest = (data) => put('quests', data && data.id, data);
    reg.defineDialog = (a, b) => put('dialogs', ...entry(a, b));
    reg.defineCharacter = (a, b) => put('characters', ...entry(a, b));
    reg.defineFact = (a, b) => put('facts', ...entry(a, b));
    reg.definePlace = (a, b) => put('places', ...entry(a, b));
    reg.defineSpot = (a, b) => put('spots', ...entry(a, b));
    reg.definePortal = (a, b) => put('portals', ...entry(a, b));
    reg.defineScenario = (a, b) => put('scenarios', ...entry(a, b));
    reg.defineSuper = (a, b) => put('supers', ...entry(a, b));
    return reg;
  };

  // Общий реестр игры: в него пишут файлы содержания через глобальные defineQuest, defineDialog и т. д. (src/core/boot.js)
  Core.registry = Core.createRegistry();
})(globalThis);
