// src/engine/zones.js
// КАРТА ПО ЗОНАМ. Мир разбит на прямоугольные зоны по координатам: поселок, города, река и т. д.
// (остальное — лес, а внутри зданий — их интерьеры). От зоны зависит фоновый звук.
// Каждый модуль мира регистрирует свою зону: registerZone(id, name, rect, звуки).

const mapZones = [];

// Какие звуки (файлы из audio/) играют в зоне и насколько громко (0..1)
const zoneSounds = {
  forest: { forest_birds: 0.8 },
};
const soundFadeDist = 35; // на каком расстоянии от границы зоны звук плавно нарастает

function registerZone(id, name, rect, sounds) {
  mapZones.push({ id, name, rect });
  zoneSounds[id] = sounds;
}

function distToRect(x, z, r) {
  return Math.hypot(Math.max(r.x1 - x, 0, x - r.x2), Math.max(r.z1 - z, 0, z - r.z2));
}

// Зона, в которой стоит игрок (по координатам)
function currentZone() {
  const ci = currentInterior();
  if (ci) return { id: ci.def.id, name: ci.def.name(ci.floor) };
  const z = mapZones.find((m) => distToRect(playerWorldX, playerWorldZ, m.rect) === 0);
  return z || { id: 'forest', name: 'Лес' };
}

// Целевая громкость каждого звука в текущей точке. Звуки соседних зон
// плавно перетекают друг в друга у границ, лес заполняет остаток
function targetMix() {
  const mix = {};
  const add = (sounds, w) => {
    for (const [k, v] of Object.entries(sounds || {})) mix[k] = (mix[k] || 0) + v * w;
  };
  const ci = currentInterior();
  if (ci) {
    add(zoneSounds[ci.def.id], 1);
    return mix;
  }
  let urban = 0;
  for (const m of mapZones) {
    const w = 1 - Math.min(distToRect(playerWorldX, playerWorldZ, m.rect) / soundFadeDist, 1);
    if (w <= 0) continue;
    add(zoneSounds[m.id], w);
    urban = Math.max(urban, w);
  }
  add(zoneSounds.forest, 1 - urban);
  return mix;
}
