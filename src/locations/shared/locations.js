// src/locations/shared/locations.js
// КАКОЙ МИР ЗАГРУЖАТЬ. Игра — одна страница (index.html), адрес не меняется. Основной мир большой, поэтому трек, лаборатория и этажи башни —
// отдельные небольшие миры: так браузеру хватает оперативной памяти. Какой мир строить, решается при загрузке страницы: при переходе
// (src/quests/host.js: questTravelToLocation) состояние героя кладется в sessionStorage ('game.transit', с полем loc) и страница
// перезагружается — предметы, показатели и ход истории восстанавливает src/quests/transit.js. Для отладки: index.html?loc=track.
// Подключается первым, до three.js и src/engine/layout.js: он берет круглый мир (demoWorldRadius, demoWorldCenter) отсюда.

// Скрипты основного мира (между общей основой и интерфейсом)
const MAIN_WORLD_SCRIPTS = [
  'src/world/highway-path.js',
  'src/locations/village/village.js',
  'src/locations/city/mall.js',
  'src/locations/city/city.js',
  'src/locations/city/city-buildings.js',
  'src/locations/zarechye/grandma.js',
  'src/locations/city/gas-station.js',
  'src/locations/bridge/bridge.js',
  'src/locations/bridge/incident.js',
  'src/locations/entrances/entrances.js',
  'src/world/highway.js',
  'src/world/world.js',
  'src/world/forest.js',
  'src/world/fence.js',
];

// Отдельные миры: название, круглый мир (центр и радиус) и скрипты мира после общей основы src/locations/shared/location.js
const LOCATION_WORLDS = {
  // gate — проем в заборе на севере по оси центра мира: полуширина hw и на сколько юнитов дорога уходит за забор (len); там и меняется мир
  track: { title: 'Гоночный трек', scripts: ['src/locations/track/track.js'], center: { x: -620, z: 200 }, radius: 290, gate: { hw: 9, len: 320 } },
  lab: { title: 'Лаборатория', scripts: ['src/locations/lab/lab.js'], center: { x: -330, z: 215 }, radius: 175, gate: { hw: 9, len: 320 } },
  tower: { title: 'Башня: этажи', scripts: ['src/locations/tower/tower.js'], center: { x: 22, z: 250 }, radius: 200 },
};

const GAME_LOCATION = (() => {
  let want = null;
  try {
    const t = JSON.parse(sessionStorage.getItem('game.transit') || 'null');
    if (t && t.loc) want = t.loc;
  } catch (e) {
    /* без sessionStorage — основной мир */
  }
  if (!want) want = new URLSearchParams(window.location.search).get('loc');
  return want && LOCATION_WORLDS[want] ? want : 'main';
})();

if (GAME_LOCATION !== 'main') {
  var demoWorldRadius = LOCATION_WORLDS[GAME_LOCATION].radius;
  var demoWorldCenter = LOCATION_WORLDS[GAME_LOCATION].center;
  var demoWorldGate = LOCATION_WORLDS[GAME_LOCATION].gate || null;
}

// Скрипты мира этой страницы по порядку (подключаются на месте вызова: document.write выполняет их до следующих скриптов)
function writeWorldScripts() {
  const list =
    GAME_LOCATION === 'main'
      ? MAIN_WORLD_SCRIPTS
      : [
          'src/locations/shared/location.js',
          ...LOCATION_WORLDS[GAME_LOCATION].scripts,
          'src/locations/shared/location-finish.js',
          'src/world/forest.js',
          'src/world/fence.js',
        ];
  for (const src of list) document.write('<script src="' + src + '"><\/script>');
}
