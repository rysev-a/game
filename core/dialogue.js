// core/dialogue.js
// ДИАЛОГИ: движок и окно внизу экрана. С любым человеком рядом можно поговорить (R). Игрок
// выбирает ответ цифрой (1–9) или кликом мыши; Esc — закончить разговор. Пока идет диалог,
// игровые клавиши не работают, а собеседник останавливается и поворачивается к игроку.
//
// Диалог — дерево узлов. Узел:
//   { speaker: 'Имя', text: 'реплика', options: [{ text, next(person), action(person), end }] }
//   next(person) возвращает следующий узел; action(person) — что сделать при выборе;
//   end: true или отсутствие next — закончить разговор. Узел без options — «R, чтобы продолжить».
// Что говорят люди — в .user/talk.js (startDialogue вызывается оттуда).

let dialogueOpen = false;
let dialoguePerson = null;
let dialogueNode = null;
let dialogueOpenedAt = 0;

const dialogueEl = document.getElementById('dialogue');
const dlgSpeaker = document.getElementById('dlgSpeaker');
const dlgText = document.getElementById('dlgText');
const dlgOptions = document.getElementById('dlgOptions');

// Мировые координаты человека (у людей в зданиях они локальные для этажа)
function personWorld(person) {
  if (person.floor === undefined) return { x: person.x, z: person.z };
  const def = interiors.find((d) => d.people.includes(person));
  return { x: person.x, z: person.z + (def ? def.floorZ[person.floor] : 0) };
}

function renderDialogue() {
  dlgSpeaker.textContent = dialogueNode.speaker || '';
  dlgText.textContent = dialogueNode.text;
  dlgOptions.innerHTML = '';
  const options = dialogueNode.options || [];
  if (!options.length) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'R — продолжить';
    dlgOptions.appendChild(hint);
    return;
  }
  options.forEach((opt, i) => {
    const row = document.createElement('div');
    row.className = 'option';
    row.textContent = i + 1 + '. ' + opt.text;
    row.addEventListener('click', () => chooseDialogueOption(i));
    dlgOptions.appendChild(row);
  });
}

function startDialogue(person, node) {
  dialogueOpen = true;
  dialoguePerson = person;
  dialogueNode = node;
  dialogueOpenedAt = performance.now();
  for (const k of Object.keys(keys)) keys[k] = false; // отпускаем зажатые клавиши
  if (document.exitPointerLock) document.exitPointerLock(); // курсор нужен, чтобы кликать ответы

  // Собеседник стоит и смотрит на игрока (сидящий остается сидеть)
  person.talking = true;
  if (!person.seated && person.mesh) {
    const w = personWorld(person);
    const yaw = Math.atan2(-(playerWorldX - w.x), -(playerWorldZ - w.z));
    person.yaw = yaw;
    person.mesh.rotation.y = yaw;
    person.amp = 0;
    person.mesh.updateWalk(person.phase || 0, 0);
  }
  dialogueEl.style.display = 'block';
  renderDialogue();
}

function endDialogue() {
  if (dialoguePerson) dialoguePerson.talking = false;
  dialogueOpen = false;
  dialoguePerson = null;
  dialogueNode = null;
  dialogueEl.style.display = 'none';
}

function chooseDialogueOption(i) {
  const opt = (dialogueNode.options || [])[i];
  if (!opt) return;
  const person = dialoguePerson;
  if (opt.action) opt.action(person);
  const next = opt.next && !opt.end ? opt.next(person) : null;
  if (!next) {
    endDialogue();
    return;
  }
  dialogueNode = next;
  renderDialogue();
}

window.addEventListener('keydown', (e) => {
  if (!dialogueOpen || e.repeat) return;
  const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
  if (digit) {
    chooseDialogueOption(Number(digit[1]) - 1);
  } else if (e.code === 'Escape') {
    endDialogue();
  } else if (['KeyR', 'Space', 'Enter'].includes(e.code)) {
    // Тот же R, которым начали разговор, не должен сразу его закрыть
    if (performance.now() - dialogueOpenedAt > 250 && !(dialogueNode.options || []).length) endDialogue();
  }
});
