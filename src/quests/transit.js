// src/quests/transit.js
// ПРИБЫТИЕ ИЗ ДРУГОЙ ЛОКАЦИИ. Когда герой переходит в другую локацию (src/quests/host.js: questTravelToLocation), состояние игры лежит в
// sessionStorage ('game.transit'): так же, как в слоте сохранения (положение, машина, вещи, время, погода, ход истории), плюс место
// назначения и дополнения (тренировка на треке и возврат браслетом, src/quests/practice.js). Здесь страница локации его принимает.
// Зовется один раз из src/quests/start.js до первой проверки квестов.

function questTransitArrive() {
  let raw = null;
  try {
    raw = sessionStorage.getItem('game.transit');
    sessionStorage.removeItem('game.transit');
  } catch (e) {
    return;
  }
  if (!raw) return;
  let t;
  try {
    t = JSON.parse(raw);
  } catch (e) {
    return;
  }
  // Герой едет на своей машине: ставим ее сразу на место прибытия. Иначе подаренная машина (questSwapPlayerCar) не встанет на старые координаты
  // другой локации — они вне ее мира, — и на треке остается прежняя Almera
  const dest = !t.load && t.to && t.opts && t.opts.car ? Core.registry.places[t.to] : null;
  if (dest) {
    t.data.car.x = dest.x;
    t.data.car.z = dest.z;
    if (t.opts.heading !== undefined) t.data.car.heading = t.opts.heading;
    t.data.player.x = dest.x;
    t.data.player.z = dest.z;
  }
  t.data.arriving = true; // applyGame (src/quests/common-hooks.js): уже на нужной странице, переходить не надо
  t.data.location = GAME_LOCATION;
  applyGame(t.data);
  if (t.hero) Object.assign(heroStats, t.hero); // здоровье и эликсир переезжают вместе с героем (в слоте сохранения их нет)
  if (typeof renderEquipHud === 'function') renderEquipHud();
  if (t.load) return; // загрузка слота: положение героя берется из слота
  if (t.to) questTeleportLocal(t.to, t.opts || {});
  // Оружие, которое было в руках (режим боя), остается в руках и на новом этаже или в новой локации
  if (t.held && typeof drawWeapon === 'function' && !drivingCar) drawWeapon(t.held);
  if (t.extra && t.extra.practice) questPracticeArrive(t.extra.practice);
  if (t.extra && t.extra.restore) questPracticeRestore(t.extra.restore);
}
