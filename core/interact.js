// core/interact.js
// Взаимодействие по R. Всё, с чем можно что-то сделать (двери, лестницы, ключи на столе,
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

// R: действие ближайшего объекта. За рулем: если рядом нет колонки заправки, R выходит из машины
// (рядом с колонкой выйти можно клавишей F)
function onInteract() {
  const it = activeInteractable();
  if (it && it.act) {
    it.act();
    return;
  }
  if (drivingCar) exitCar();
}


