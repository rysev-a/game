// src/quests/load.js
// ЗАГРУЗЧИК квестовой системы. Подключается одной строкой в самом конце index.html (после src/engine/game.js):
//   <script src="src/quests/load.js"></script>
// и по очереди грузит файлы из src/quests/manifest.js: ядро → содержание → подключение к игре.

(function () {
  const load = (src) =>
    new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Не загрузился ' + src));
      document.body.appendChild(s);
    });

  (async () => {
    await load('src/quests/manifest.js');
    const m = window.QUEST_MANIFEST;
    // main:… — только в основном мире; в локациях (locations/*.html) большого мира нет (GAME_LOCATION задает страница)
    const adapter = m.adapter.filter((f) => !f.startsWith('main:') || GAME_LOCATION === 'main').map((f) => f.replace(/^main:/, ''));
    for (const file of [...m.core, ...m.content, ...m.contentBrowser, ...adapter]) await load(file);
  })().catch((err) => console.error('Квесты не запустились:', err));
})();
