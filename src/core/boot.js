// src/core/boot.js
// Последний файл ядра: делает функции реестра глобальными, чтобы файлы содержания писали просто
// defineQuest({...}), defineDialog('denis', {...}), defineFact('Ф1', {...}) и т. д. (все они пишут в Core.registry).

(function (root) {
  const Core = (root.Core = root.Core || {});
  const reg = () => Core.registry;

  root.defineQuest = (d) => reg().defineQuest(d);
  root.defineDialog = (a, b) => reg().defineDialog(a, b);
  root.defineCharacter = (a, b) => reg().defineCharacter(a, b);
  root.defineFact = (a, b) => reg().defineFact(a, b);
  root.definePlace = (a, b) => reg().definePlace(a, b);
  root.defineScenario = (a, b) => reg().defineScenario(a, b);
})(globalThis);
