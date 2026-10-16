// src/engine/hoverinfo.js
// ПАНЕЛЬ «ЧТО ЭТО» СПРАВА (как в Fallout). Подписей над зданиями, людьми и вещами и вывесок на зданиях
// в мире нет: навели мышь на здание, человека, машину или вещь — справа видно, что это и пара слов о нем.
//
//   addHoverInfo(object, info)  — объект сцены (группа или меш) и info: { name, desc, kind } или функция,
//                                 которая его возвращает (kind — заголовок панели: «Здание», «Человек»...)
//   registerHoverTree(group)    — зарегистрировать всё внутри group, у чего есть userData.hoverInfo
//                                 (так модели помечают свои части, не зная про этот файл)
//
// Люди (npcs и жильцы интерьеров), машины, игрок, цели в тире и вещи (pickables, по их id) видны сами,
// регистрировать их не нужно. updateHoverInfo(mouse) — раз в кадр из главного цикла (src/engine/game.js).

const hoverInfos = []; // { object, info }
const hoverReach = 150; // дальше этого от игрока объект не ищем (игрок всегда в центре сцены)

function addHoverInfo(object, info) {
  hoverInfos.push({ object, info });
  return object;
}

function registerHoverTree(group) {
  group.traverse((o) => {
    if (o.userData.hoverInfo) addHoverInfo(o, o.userData.hoverInfo);
  });
}

// ---------- Что это за человек ----------
const personTypeInfo = {
  police: ['Полицейский', 'Полицейская', 'Патрулирует улицы. С ним лучше не спорить.'],
  elder: ['Пожилой мужчина', 'Пожилая женщина', 'Помнит город еще до корпорации.'],
  child: ['Мальчик', 'Девочка', 'Гуляет, пока родители заняты.'],
  office: ['Офисный работник', 'Офисная работница', 'Спешит с одной встречи на другую.'],
  student: ['Студент', 'Студентка', 'Учится в городе, подрабатывает где придется.'],
  worker: ['Рабочий', 'Работница', 'Руки в мазуте, в голове — смена.'],
  casual: ['Прохожий', 'Прохожая', 'Обычный житель, идет по своим делам.'],
  coat: ['Человек в плаще', 'Женщина в плаще', 'Держится особняком.'],
};
const mallRoleInfo = {
  cashier: ['Кассир', 'Кассирша', 'Пробивает покупки на кассе торгового центра.'],
  customer: ['Покупатель', 'Покупательница', 'Стоит в очереди на кассу.'],
  shopper: ['Покупатель', 'Покупательница', 'Ходит по торговому центру, присматривается.'],
};
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

function personInfo(p) {
  if (p.demo) return { kind: 'Человек', name: p.demo.name, desc: capitalize(p.demo.title) + '. Подойдите и нажмите E, чтобы поговорить.' };
  if (p.name) return { kind: 'Человек', name: p.name, desc: capitalize(p.title || '') + (p.title ? '.' : '') };
  const female = p.gender === 'female';
  if (p.kind === 'officer') {
    return { kind: 'Человек', name: female ? 'Полицейская' : 'Полицейский', desc: 'Охраняет место происшествия у реки. Посторонним — не подходить.' };
  }
  const type = p.mesh.personType || 'casual';
  let row = mallRoleInfo[p.role] || personTypeInfo[type] || personTypeInfo.casual;
  if (p.kind === 'resident' && type !== 'police') row = ['Житель поселка', 'Жительница поселка', 'Живет здесь всю жизнь и знает всех соседей.'];
  return { kind: 'Человек', name: female ? row[1] : row[0], desc: row[2] };
}

const heroHoverInfo = { kind: 'Это вы', name: 'Макс', desc: 'Программист из IT-компании. Вернулся, чтобы узнать, что случилось с Верой.' };

function carInfo(c) {
  if (c.info) return c.info;
  if (c.isPlayerCar) {
    return { kind: 'Машина', name: 'Ваша машина', desc: 'Бирюзовая, с багажником на крыше. Бензина: ' + Math.round(c.fuel * 100) + '%.' };
  }
  return { kind: 'Машина', name: 'Машина', desc: c.locked ? 'Чужая машина. Закрыта.' : 'Чужая машина.' };
}

// Вещь по ее id: обычная вещь (ITEMS), прибор (DEVICES) или оружие (WEAPONS)
function itemInfo(id) {
  const dev = typeof DEVICES !== 'undefined' && DEVICES[id];
  if (dev) return { kind: 'Прибор', name: dev.name, desc: dev.desc || '' };
  const weapon = typeof WEAPONS !== 'undefined' && WEAPONS[id];
  if (weapon) return { kind: 'Оружие', name: weapon.name, desc: weapon.desc || '' };
  const item = ITEMS[id];
  return item ? { kind: 'Предмет', name: item.name, desc: item.desc || '' } : null;
}

// ---------- Поиск под курсором ----------
const hoverRaycaster = new THREE.Raycaster();
const hoverWorldPos = new THREE.Vector3();
let hoverFrame = 0;
let hoveredInfo = null;

// Объект сейчас в сцене и виден: все его родители видимы и он не снят со сцены
function hoverShown(o) {
  for (; o; o = o.parent) {
    if (!o.visible) return false;
    if (o === scene) return true;
  }
  return false;
}

// Полупрозрачные стены (между камерой и игроком, src/engine/fade.js) не загораживают то, что за ними
function hoverSeeThrough(mesh) {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return mats.every((m) => m && m.transparent && m.opacity < 0.5);
}

function hoverSources() {
  const list = hoverInfos.slice();
  const people = (arr) => {
    for (const p of arr) if (p.mesh) list.push({ object: p.mesh, info: () => personInfo(p) });
  };
  people(npcs);
  for (const def of interiors) people(def.people);
  for (const c of cars) list.push({ object: c.mesh, info: () => carInfo(c) });
  for (const t of combatTargets) {
    if (t.mesh) list.push({ object: t.mesh, info: { kind: 'Цель', name: t.name, desc: t.desc || '' } });
  }
  for (const p of pickables) {
    if (p.info || p.id) list.push({ object: p.mesh, info: p.info || (() => itemInfo(p.id)) });
  }
  list.push({ object: player, info: heroHoverInfo });
  return list;
}

function findHovered(mouse) {
  const byObject = new Map();
  const objects = [];
  for (const s of hoverSources()) {
    if (byObject.has(s.object) || !hoverShown(s.object)) continue;
    s.object.getWorldPosition(hoverWorldPos);
    if (Math.hypot(hoverWorldPos.x, hoverWorldPos.z) > hoverReach) continue;
    byObject.set(s.object, s.info);
    objects.push(s.object);
  }
  if (!objects.length) return null;
  hoverRaycaster.setFromCamera(mouse, camera);
  for (const hit of hoverRaycaster.intersectObjects(objects, true)) {
    if (!hit.object.isMesh || !hoverShown(hit.object) || hoverSeeThrough(hit.object)) continue;
    // Самый близкий к попаданию зарегистрированный предок: часть здания важнее всего здания
    for (let o = hit.object; o; o = o.parent) {
      if (!byObject.has(o)) continue;
      const info = byObject.get(o);
      const r = typeof info === 'function' ? info() : info;
      if (r) return r;
    }
  }
  return null;
}

// ---------- Панель ----------
const hoverPanel = document.createElement('div');
hoverPanel.id = 'infoPanel';
hoverPanel.innerHTML =
  '<div class="ipTop"><span id="ipKind"></span><span class="ipBlink">▮</span></div>' +
  '<div id="ipName"></div><div id="ipDesc"></div>';
document.body.appendChild(hoverPanel);
const hoverStyle = document.createElement('style');
hoverStyle.textContent = `
  #infoPanel {
    position: fixed; right: 10px; top: 480px; /* top ставит placeHoverPanel: сразу под подсказками */ width: 300px; box-sizing: border-box; z-index: 15;
    padding: 10px 12px 12px; pointer-events: none;
    font: 14px/1.35 'Courier New', ui-monospace, monospace; color: #3cff7a;
    text-shadow: 0 0 6px rgba(60, 255, 122, 0.55);
    background:
      repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.22) 0 1px, transparent 1px 3px),
      radial-gradient(ellipse at center, rgba(10, 46, 22, 0.92), rgba(3, 18, 8, 0.94));
    border: 2px solid #2bd463; border-radius: 6px;
    box-shadow: 0 0 12px rgba(43, 212, 99, 0.35), inset 0 0 18px rgba(43, 212, 99, 0.18);
  }
  #infoPanel .ipTop {
    display: flex; justify-content: space-between; text-transform: uppercase; letter-spacing: 2px;
    font-size: 11px; opacity: 0.8; border-bottom: 1px solid rgba(60, 255, 122, 0.45);
    padding-bottom: 4px; margin-bottom: 6px;
  }
  #infoPanel #ipName { font-size: 17px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
  #infoPanel #ipDesc { margin-top: 4px; opacity: 0.9; }
  #infoPanel.empty #ipName { font-size: 13px; font-weight: normal; opacity: 0.55; text-transform: none; }
  #infoPanel .ipBlink { animation: ipBlink 1s steps(1) infinite; }
  @keyframes ipBlink { 50% { opacity: 0; } }
`;
document.head.appendChild(hoverStyle);
const ipKind = hoverPanel.querySelector('#ipKind');
const ipName = hoverPanel.querySelector('#ipName');
const ipDesc = hoverPanel.querySelector('#ipDesc');

// Панель стоит под колонкой справа (миникарта, подсказки #hud), сколько бы строк там ни было
const hoverHud = document.getElementById('hud');
function placeHoverPanel() {
  const below = hoverHud ? hoverHud.getBoundingClientRect().bottom : 470;
  hoverPanel.style.top = Math.round(below + 10) + 'px';
}

function showHoverInfo(info) {
  hoverPanel.classList.toggle('empty', !info);
  ipKind.textContent = info ? info.kind || 'Объект' : 'Сканер';
  ipName.textContent = info ? info.name : (touchUI ? 'Коснитесь объекта' : 'Наведите курсор на объект');
  ipDesc.textContent = info ? info.desc || '' : '';
}
showHoverInfo(null);

// Раз в кадр из главного цикла; сам поиск — раз в 4 кадра (лучей по сотням объектов много)
function updateHoverInfo(mouse) {
  if (++hoverFrame % 4) return;
  placeHoverPanel();
  const blocked = !mouse || dialogueOpen || settingsOpen;
  const info = blocked ? null : findHovered(mouse);
  const key = info ? info.kind + '|' + info.name + '|' + info.desc : '';
  if (key === hoveredInfo) return;
  hoveredInfo = key;
  showHoverInfo(info);
}
