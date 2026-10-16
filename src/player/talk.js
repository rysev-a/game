// src/player/talk.js
// РАЗГОВОРЫ игрока. К любому человеку рядом можно подойти и нажать E. Здесь — кто как
// называется и о чем говорит (движок диалогов — src/engine/dialogue.js).
//
// ПЕРВЫЙ ДИАЛОГ: если у вашей машины кончился бензин, можно попросить подтолкнуть ее: в городе —
// любого прохожего, в поселке — соседа. Помощник идет к машине и встает сзади; когда вы тоже начнете
// толкать (E у машины: вы — сбоку у открытой двери, он — сзади), машина покатится очень быстро.
// Он уйдет, как только вы отпустите машину или заправитесь (или через минуту).
//
// Сосед еще предложит канистру с бензином: взяли — и катить долго не придется, E у машины заливает
// бензин. Сидящий на стуле сосед со стула не встает: толкать не может, но канистру отдаст.

// ---------- Кто есть кто ----------
const maleNames = ['Иван', 'Пётр', 'Алексей', 'Сергей', 'Дмитрий', 'Николай', 'Андрей', 'Михаил', 'Виктор'];
const femaleNames = ['Анна', 'Мария', 'Ольга', 'Елена', 'Татьяна', 'Наталья', 'Ирина', 'Светлана', 'Галина'];

const personName = (p) => p.name || (p.name = pick(p.gender === 'female' ? femaleNames : maleNames));

function personTitle(p) {
  const f = p.gender === 'female';
  const kind = p.kind || p.role;
  const titles = {
    officer: ['полицейский', 'полицейская'],
    resident: ['сосед', 'соседка'],
    cashier: ['кассир', 'кассир'],
    staff: ['продавец', 'продавщица'],
    diner: ['посетитель', 'посетительница'],
    shopper: ['покупатель', 'покупательница'],
    customer: ['покупатель', 'покупательница'],
  };
  const t = titles[kind] || ['прохожий', 'прохожая'];
  return t[f ? 1 : 0];
}

const personLabel = (p) => personName(p) + ' — ' + personTitle(p);

// Ближайший человек, с которым можно заговорить (на улице или в здании, где стоит игрок)
function nearestPerson(maxDist = 2.8) {
  let best = null;
  let bestDist = maxDist;
  const consider = (p, x, z) => {
    if (p.helping) return;
    const d = Math.hypot(playerWorldX - x, playerWorldZ - z);
    if (d < bestDist) {
      best = p;
      bestDist = d;
    }
  };
  const ci = currentInterior();
  if (ci) {
    const fz = ci.def.floorZ[ci.floor];
    for (const p of ci.def.people) if (p.floor === ci.floor) consider(p, p.x, p.z + fz);
  } else {
    for (const n of npcs) consider(n, n.x, n.z);
  }
  return best;
}

addInteractable({
  priority: 1,
  near: () => !dialogueOpen && !drivingCar && !pushingCar && !!nearestPerson(),
  prompt: () => 'E — поговорить: ' + personLabel(nearestPerson()),
  act: () => startDialogue(nearestPerson(), rootDialogue(nearestPerson())),
});

// ---------- Что известно игроку ----------
const carStalled = () => !!garage.car && garage.car.fuel <= 0;
const inCity = () => {
  if (insideBuilding()) return false;
  const id = currentZone().id;
  return /^city\d+$/.test(id);
};
const inVillage = () => !insideBuilding() && currentZone().id === 'village';
const incidentKnown = () => incident.arrived || incident.state === 'done';

// ---------- Диалоги ----------
const greetings = {
  officer: ['Здесь работает полиция. Не подходите к оцеплению.'],
  resident: ['Добрый день, сосед!', 'Здравствуйте. Хорошая погода, да?'],
  cashier: ['Здравствуйте. Чем могу помочь?', 'Следующий!'],
  staff: ['Добрый день. Что-нибудь подсказать?'],
  diner: ['Здравствуйте. Присаживайтесь, если хотите.'],
  default: ['Здравствуйте!', 'Добрый день.', 'Да? Что-то случилось?'],
};

function greetingFor(p) {
  const list = greetings[p.kind || p.role] || greetings.default;
  return pick(list);
}

function rootDialogue(p) {
  const speaker = personLabel(p);
  const isOfficer = p.kind === 'officer';
  const options = [];

  // Главная просьба: машина села, а вы в городе (любой прохожий) или в поселке (сосед)
  if (carStalled() && !isOfficer && (inCity() || (inVillage() && p.kind === 'resident'))) {
    options.push({ text: 'Моя машина села. Не поможете подтолкнуть?', next: askPush });
  }
  if (isOfficer) {
    if (hasItem('badge')) options.push({ text: 'Я из уголовного розыска. Что здесь произошло?', next: officerBadge });
    options.push({ text: 'Кто нашел тело?', next: officerWho });
  } else {
    options.push({ text: 'Как дела?', next: chat });
    if (incidentKnown()) options.push({ text: 'Вы ничего не слышали про происшествие у реки?', next: riverRumor });
  }
  options.push({ text: 'Извините, ошибся.', end: true });
  return { speaker, text: greetingFor(p), options };
}

const chat = (p) => ({
  speaker: personLabel(p),
  text: pick(['Всё хорошо, спасибо. А у вас?', 'Потихоньку. Дел много.', 'Не жалуюсь.']),
  options: [{ text: 'Тоже. Всего доброго.', end: true }],
});

const riverRumor = (p) => ({
  speaker: personLabel(p),
  text: pick([
    'Говорят, у реки что-то нашли. Полиция там с утра. Спросите у них.',
    'Слышал, у моста нашли человека. Больше ничего не знаю.',
  ]),
  options: [{ text: 'Спасибо.', end: true }],
});

const officerBadge = (p) => ({
  speaker: personLabel(p),
  text: 'Понял, товарищ. Тело нашли утром у реки, накрыто простыней. Осмотритесь, но ничего не трогайте.',
  options: [{ text: 'Хорошо.', end: true }],
});

const officerWho = (p) => ({
  speaker: personLabel(p),
  text: 'Прохожий. Он уже дал показания. Больше сказать не могу.',
  options: [{ text: 'Понятно.', end: true }],
});

// Просьба подтолкнуть машину
function askPush(p) {
  const car = garage.car;
  // Сидящий сосед со стула не встает: помочь толкать не может, но бензином поделится
  if (p.seated) {
    if (hasItem('canister')) {
      return {
        speaker: personLabel(p),
        text: 'Канистра у вас уже есть, сосед. Заливайте бензин и поезжайте!',
        options: [{ text: 'Спасибо!', end: true }],
      };
    }
    return {
      speaker: personLabel(p),
      text: 'Рад бы подтолкнуть, да вот сижу, нога болит. Зато бензин найдется: есть полная канистра. Возьмите — залейте и поезжайте.',
      options: [
        { text: 'Да, возьму. Спасибо!', action: () => addItem('canister'), end: true },
        { text: 'Не надо, как-нибудь сам.', end: true },
      ],
    };
  }
  const far = Math.hypot(car.x - p.x, car.z - p.z) > 250;
  if (far) {
    return {
      speaker: personLabel(p),
      text: 'Далековато до вашей машины, у меня дела. Простите.',
      options: [{ text: 'Понимаю. Спасибо.', end: true }],
    };
  }
  const neighbour = p.kind === 'resident';
  // Сосед не только подтолкнет, но и поделится бензином: тогда катить долго не придется,
  // можно залить канистру прямо у машины и ехать
  if (neighbour && !hasItem('canister')) {
    return {
      speaker: personLabel(p),
      text:
        'Конечно, сосед, помогу! А бензин у меня найдется: есть полная канистра. Возьмете — залили бы и поехали.',
      options: [
        {
          text: 'Да, возьму. Спасибо!',
          action: (person) => {
            addItem('canister');
            beginHelp(person);
          },
          end: true,
        },
        { text: 'Не надо, просто подтолкните.', action: beginHelp, end: true },
      ],
    };
  }
  return {
    speaker: personLabel(p),
    text:
      (neighbour ? 'Конечно, сосед, помогу! ' : 'Конечно, помогу! ') +
      'Идите к машине, я сейчас подойду и встану сзади.',
    options: [{ text: 'Спасибо!', action: beginHelp, end: true }],
  };
}

// ---------- Помощник: подталкивает машину сзади ----------
let helper = null; // { person, car, state: 'approach' | 'push', idle, total }
const helperWalkSpeed = 0.35; // идет к машине быстро
const helperLeaveAfter = 60 * 60; // кадров (минута) — потом уходит сам

function beginHelp(person) {
  if (helper) endHelp(); // прежний помощник отпускается
  const car = garage.car;
  if (person.yaw === undefined) person.yaw = person.mesh.rotation.y;
  if (person.phase === undefined) person.phase = 0;
  if (person.amp === undefined) person.amp = 0;
  person.helping = true; // не мешает машине, общий патруль его не двигает
  person.hold = true;
  helper = { person, car, state: 'approach', idle: 0, total: 0 };
  car.helper = { ready: false }; // машина катится быстро только когда помощник на месте
  showToast(personName(person) + ' идет к вашей машине', 4000);
}

function endHelp() {
  if (!helper) return;
  const { person, car } = helper;
  person.mesh.setPush(false);
  car.helper = null;
  helper = null;
  person.helping = false;
  person.hold = false; // вернется к своим делам
}

function updateHelper() {
  if (!helper) return;
  const { person, car } = helper;
  helper.total++;
  const spot = pushHelperSpot(car);
  const mesh = person.mesh;

  if (helper.state === 'approach') {
    const dx = spot.x - person.x;
    const dz = spot.z - person.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.3) {
      helper.state = 'push';
      car.helper.ready = true;
      mesh.setPush('rear'); // встал сзади и упирается в багажник
      showToast(personName(person) + ' на месте. Подойдите к машине и толкайте (E)', 5000);
    } else {
      person.x += (dx / dist) * Math.min(helperWalkSpeed, dist);
      person.z += (dz / dist) * Math.min(helperWalkSpeed, dist);
      person.yaw += (Math.atan2(-dx, -dz) - person.yaw) * 0.3;
      person.phase += 0.4;
      mesh.position.set(person.x, 0, person.z);
      mesh.rotation.y = person.yaw;
      mesh.updateWalk(person.phase, 1);
    }
  } else {
    // Стоит сзади и шагает вслед за машиной
    person.x = spot.x;
    person.z = spot.z;
    person.yaw = car.heading;
    const moving = Math.abs(car.speed) > 0.02;
    if (moving) person.phase += Math.min(0.6, 0.12 + Math.abs(car.speed) * 0.4) * Math.sign(car.speed);
    person.amp += ((moving ? 1 : 0) - person.amp) * 0.2;
    mesh.position.set(person.x, 0, person.z);
    mesh.rotation.y = person.yaw;
    mesh.updateWalk(person.phase, person.amp);
    helper.idle = pushingCar === car ? 0 : helper.idle + 1;
  }

  // Когда помощник больше не нужен
  const done = car.fuel > 0 || helper.total > helperLeaveAfter + 600 || (helper.state === 'push' && helper.idle > 60 * 12);
  if (done) {
    const name = personName(person);
    endHelp();
    showToast(name + ': Дальше сами. Удачи!', 4000);
  }
}
