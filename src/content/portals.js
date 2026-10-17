// src/content/portals.js
// ПЕРЕХОДЫ МЕЖДУ ЛОКАЦИЯМИ (src/quests/portals.js): въехал (или вошел) в место at — оказался в месте to другой страницы, вместе с машиной,
// если сидел за рулем. heading — куда смотрит машина при прибытии (0 — на север, π — на юг, −π/2 — на восток). Состояние игры при
// переходе сохраняется и переносится (src/quests/transit.js). Условие if — когда переход работает (по умолчанию всегда).

definePortal({ id: 'to_track', at: 'track.entrance', to: 'track.gate', heading: Math.PI });
definePortal({ id: 'from_track', at: 'track.exit', to: 'track.back', heading: 0 });
definePortal({ id: 'to_lab', at: 'lab.entrance', to: 'lab.gate', heading: Math.PI });
definePortal({ id: 'from_lab', at: 'lab.exit', to: 'lab.back', heading: 0 });
