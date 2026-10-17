// src/quests/start.js
// ПУСК квестовой системы: последний файл подключения. Проверяет содержание, начинает историю (квесты с autoStart)
// и каждый кадр отдает ядру тик. Для отладки в консоли доступны questGame (состояние, journal(), run([...]))
// и Core.registry.

(function () {
  const g = questGame;

  const problems = Core.checkContent(Core.registry, {
    items: ITEMS,
    zones: [...mapZones.map((z) => z.id), ...interiors.map((i) => i.id)], // зоны мира и здания (at:treehouse)
  });
  if (problems.length) console.warn('Содержание квестов, ошибки:\n' + problems.join('\n'));

  // Метки мест не найдены, если место не из реестра: проверка at: и marker выше уже сказала бы об этом
  g.settle();

  (function loop() {
    requestAnimationFrame(loop);
    g.tick();
  })();

  window.questGame = g;
})();
