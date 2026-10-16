// src/engine/interact.js
// Взаимодействие по E. Всё, с чем можно что-то сделать (двери, лестницы, ключи на столе,
// кнопка гаража, посадка в машину), — запись в interactables:
//   { near(): рядом ли игрок, prompt(): подсказка, act(): действие, priority: приоритет,
//     driving: true — действие доступно только за рулем (например, заправка) }
// Подсказка и действие берутся у ближайшей записи с наибольшим priority.
const interactables = [];

function addInteractable(it) {
  it.priority = it.priority || 0;
  interactables.push(it);
  return it;
}

function removeInteractable(it) {
  const i = interactables.indexOf(it);
  if (i >= 0) interactables.splice(i, 1);
}

function activeInteractable() {
  const driving = !!drivingCar;
  let best = null;
  for (const it of interactables) {
    if (!!it.driving !== driving) continue; // за рулем и пешком — разные действия
    if (best && it.priority <= best.priority) continue;
    if (it.near()) best = it;
  }
  return best;
}

// E: действие ближайшего объекта. За рулем: если рядом нет колонки заправки, E выходит из машины
// (рядом с колонкой выйти можно клавишей F)
function onInteract() {
  const it = activeInteractable();
  if (it && it.act) {
    it.act();
    return;
  }
  if (drivingCar) exitCar();
}



// ВЕЩИ ПОД МЫШЬЮ. Вещь, которую можно взять, — запись в pickables:
//   { mesh: что подсвечивать и куда целиться, canPick(): можно ли взять сейчас, pick(): взять,
//     id: какая это вещь (ее имя и описание — в панели справа, src/engine/hoverinfo.js) }
// Навели курсор — вещь подсвечивается, клик левой кнопкой кладет ее в инвентарь (src/engine/input.js).
// Брать мышью можно не дальше pickReach от игрока.
const pickables = [];
const pickReach = 12;

function addPickable(p) {
  pickables.push(p);
  return p;
}

function removePickable(p) {
  const i = pickables.indexOf(p);
  if (i >= 0) pickables.splice(i, 1);
  if (hoveredPickable === p) setHoveredPickable(null);
}

// Подсветка: у каждой сетки вещи свой материал (копия), цвет смешивается с желтым; вещь чуть крупнее
const pickHighlightColor = new THREE.Color(0xffe066);
let hoveredPickable = null;

function setPickHighlight(p, on) {
  p.mesh.traverse((o) => {
    if (!o.isMesh || !o.material || !o.material.color) return;
    if (!o.userData.pickBaseColor) {
      o.material = o.material.clone();
      o.userData.pickBaseColor = o.material.color.clone();
    }
    o.material.color.copy(o.userData.pickBaseColor);
    if (on) o.material.color.lerp(pickHighlightColor, 0.55);
  });
  if (on) {
    p.baseScale = p.baseScale || p.mesh.scale.clone();
    p.mesh.scale.copy(p.baseScale).multiplyScalar(1.15);
  } else if (p.baseScale) {
    p.mesh.scale.copy(p.baseScale);
  }
}

function setHoveredPickable(p) {
  if (p === hoveredPickable) return;
  if (hoveredPickable) setPickHighlight(hoveredPickable, false);
  hoveredPickable = p;
  if (p) setPickHighlight(p, true);
  renderer.domElement.style.cursor = p ? 'pointer' : '';
}

const pickRaycaster = new THREE.Raycaster();
const pickWorldPos = new THREE.Vector3();

// Какая вещь под курсором (mouse — координаты -1..1); раз в кадр из главного цикла
function updatePickHover(mouse) {
  let best = null;
  if (mouse && !dialogueOpen && !settingsOpen) {
    const meshes = [];
    for (const p of pickables) {
      if (!p.mesh.visible || !p.canPick()) continue;
      p.mesh.getWorldPosition(pickWorldPos); // игрок всегда в центре сцены
      if (Math.hypot(pickWorldPos.x, pickWorldPos.z) > pickReach) continue;
      meshes.push(p.mesh);
    }
    if (meshes.length) {
      pickRaycaster.setFromCamera(mouse, camera);
      const hit = pickRaycaster.intersectObjects(meshes, true)[0];
      if (hit) {
        let o = hit.object;
        while (o && !meshes.includes(o)) o = o.parent;
        best = pickables.find((p) => p.mesh === o) || null;
      }
    }
  }
  setHoveredPickable(best);
}

// Клик по подсвеченной вещи — взять. Возвращает true, если клик ушел на вещь
function pickHovered() {
  const p = hoveredPickable;
  if (!p || !p.canPick()) return false;
  p.pick();
  return true;
}
