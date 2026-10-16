// src/engine/interiors.js
// ИНТЕРЬЕРЫ. Здания внутри — отдельные комнаты (этажи) далеко за пределами карты, на z > 1400.
// Игрока при входе просто переносят туда (и обратно, и между этажами), так что камера,
// вращение и миникарта работают без изменений. Каждый интерьер регистрируется здесь:
//   registerInterior({ id, name(floor), floorZ: [z этажей], bounds, playerRadius,
//                      floors: [{ solids }], people: [], minimapRange })
// Координаты внутри этажа — локальные (центр комнаты в x = 0, z = floorZ[floor]).
const interiors = [];
const doorRadius = 3.5; // на каком расстоянии от двери/лестницы работает E

function registerInterior(def) {
  def.people = def.people || [];
  def.minimapRange = def.minimapRange || 90;
  interiors.push(def);
  return def;
}

// Игрок внутри какого-нибудь здания?
const insideBuilding = () => playerWorldZ > 1400;

// Текущий интерьер и этаж (по координате Z игрока) или null на улице
function currentInterior() {
  if (!insideBuilding()) return null;
  for (const def of interiors) {
    const first = def.floorZ[0];
    const last = def.floorZ[def.floorZ.length - 1];
    if (playerWorldZ < first - 100 || playerWorldZ > last + 100) continue;
    let floor = 0;
    def.floorZ.forEach((z, i) => {
      if (Math.abs(playerWorldZ - z) < Math.abs(playerWorldZ - def.floorZ[floor])) floor = i;
    });
    return { def, floor };
  }
  return null;
}

// Можно ли поставить игрока в точку мира (x, z) внутри здания: стены, мебель, люди
function blockedInside(x, z) {
  const ci = currentInterior();
  if (!ci) return true;
  const { def, floor } = ci;
  const lz = z - def.floorZ[floor];
  const b = def.bounds;
  if (x < b.minX || x > b.maxX || lz < b.minZ || lz > b.maxZ) return true;
  const r = def.playerRadius;
  if (def.floors[floor].solids.some((s) => Math.abs(x - s.x) < s.hx + r && Math.abs(lz - s.z) < s.hz + r)) {
    return true;
  }
  // Люди — тоже препятствия (своего этажа)
  return def.people.some((p) => p.floor === floor && Math.hypot(x - p.x, lz - p.z) < r + 0.45);
}

// Входная дверь здания: снаружи — вход, на 1 этаже внутри — выход.
//   outside — точка у двери на улице (мир), door — точка у двери внутри (локально, 1 этаж)
function addInteriorDoor(def, { outside, door, enterLabel, exitLabel }) {
  addInteractable({
    priority: 1,
    near: () => !insideBuilding() && Math.hypot(playerWorldX - outside.x, playerWorldZ - outside.z) < doorRadius,
    prompt: () => enterLabel,
    act: () => {
      playerWorldX = door.x;
      playerWorldZ = def.floorZ[0] + door.z - 1.5;
    },
  });
  addInteractable({
    priority: 1,
    near: () => {
      const ci = currentInterior();
      return (
        ci && ci.def === def && ci.floor === 0 &&
        Math.hypot(playerWorldX - door.x, playerWorldZ - def.floorZ[0] - door.z) < doorRadius
      );
    },
    prompt: () => exitLabel,
    act: () => {
      playerWorldX = outside.x;
      playerWorldZ = outside.z + 0.5;
    },
  });
}

// Лестницы: одинаково на всех этажах, E переносит на соседний (вверх с 1 этажа, вниз со 2)
function addInteriorStairs(def, stairs) {
  const here = (st) => {
    const ci = currentInterior();
    return ci && ci.def === def && Math.hypot(playerWorldX - st.x, playerWorldZ - def.floorZ[ci.floor] - st.z) < doorRadius;
  };
  for (const st of stairs) {
    addInteractable({
      priority: 1,
      near: () => here(st),
      prompt: () => (currentInterior().floor === 0 ? 'E — подняться на 2 этаж' : 'E — спуститься на 1 этаж'),
      act: () => {
        const ci = currentInterior();
        const to = ci.floor === 0 ? 1 : 0;
        playerWorldX = st.x;
        playerWorldZ = def.floorZ[to] + st.z;
      },
    });
  }
}


