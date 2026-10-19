// src/quests/gates.js
// АТРИБУТЫ ВСЕЛЕННОЙ: привычное в играх появляется не сразу, а объясняется супер-предметами сюжета.
//
//   миникарта и таймер — навигатор и часы телефона: появляются сами, как только герой взял телефон (до него их нет)
//   инвентарь        — бесконечный рюкзак (вещь backpack): без него панели инвентаря нет, ключи лежат в нижней ячейке
//   сохранения       — супер-браслет (устройство bracelet, src/player/devices.js): без него слотов сохранения нет
//   здоровье и эликсир — прибор восстановления тканей (вещь regen): без него полос нет и любая рана смертельна
//   телепорт по карте — телепорт (вещь artifact): без него перемещения по карте нет
//   ключи            — лежат в нижней ячейке; машину открывают, применив ключи к машине (флаг carOpen)
//   ячейки оружия    — пока оружия нет, внизу видны только занятые ячейки (ключи); все восемь появляются с первым оружием
//   подсказки        — постоянных подсказок про управление нет вовсе; подсказки у предметов («E — взять…») появляются после первого квеста
//
// Все условия — данные сюжета (вещи и флаги questGame.state), здесь только то, что требует кода игры (на всех страницах).
// Смерть без прибора: с браслетом загружается последнее сохранение, без него история начинается заново (первые два квеста).

const questUnlocked = {
  nav: () => hasItem('phone') || !!questGame.state.flags.nav, // миникарта — карта телефона: появляется сама, как только телефон взят
  inventory: () => hasItem('backpack'),
  vitals: () => hasItem('regen'),
  teleport: () => hasItem('artifact'),
};

(function () {
  const g = questGame;

  const css = document.createElement('style');
  css.textContent = `
    body.noNav #minimapWrap, body.noNav #mmInfo { display: none !important; }
    body.noInv #inventory, body.noInv #equipPanel { display: none !important; }
    body.noVitals #equipHud .stat { display: none !important; }
    body.noWeapons #equipHud .slot.empty { display: none !important; }
    body.emptyHud #equipHud { display: none !important; }
    body.noPrompt #prompt { display: none !important; }
    #mouseHint, #hud { display: none !important; }
  `;
  document.head.appendChild(css);

  function sync() {
    document.body.classList.toggle('noNav', !questUnlocked.nav());
    document.body.classList.toggle('noInv', !questUnlocked.inventory());
    document.body.classList.toggle('noVitals', !questUnlocked.vitals());
    document.body.classList.toggle('noWeapons', !(weaponSlotIds().length || inventory.items.some((id) => isWeapon(id))));
    document.body.classList.toggle('noPrompt', g.isActive('1.03'));
    document.body.classList.toggle('emptyHud', !questUnlocked.vitals() && heroEquip.weapons.every((id) => !id)); // внизу нечего показывать
  }
  setInterval(sync, 250);
  sync();

  // Инвентарь без рюкзака не раскрывается (клавиша I)
  const origSetInventoryOpen = setInventoryOpen;
  setInventoryOpen = function (open) {
    if (open && !questUnlocked.inventory()) return;
    origSetInventoryOpen(open);
  };

  // Перемещение по карте — только с телепортом
  const origTravelTo = travelTo;
  travelTo = function (wx, wz) {
    if (!questUnlocked.teleport()) {
      showToast('Телепорта у вас еще нет: до места придется добираться самому.', 3500);
      return;
    }
    origTravelTo(wx, wz);
  };

  // Ключи кладутся в нижнюю ячейку: пока рюкзака нет, они лежат там, и применять их нужно на машину
  const origAutoEquip = autoEquip;
  autoEquip = function (id) {
    if (id === 'keys' && !isEquipped(id)) {
      const i = heroEquip.weapons.indexOf(null);
      if (i >= 0) {
        takeFromGrid(id);
        heroEquip.weapons[i] = id;
        renderEquipHud();
      }
      return;
    }
    origAutoEquip(id);
  };

  addItemUse('keys', {
    match: (t) => t.kind === 'car' && t.car.isPlayerCar,
    act: () => {
      if (g.state.flags.carOpen) {
        showToast('Машина уже открыта', 1800);
        return true;
      }
      g.run([{ flag: 'carOpen' }]);
      showToast('Щелк: машина открыта. Садитесь (E).', 3500);
      return true;
    },
  });

  // Пока идет первый квест, свою машину открывают ключами (их надо применить на нее)
  const origCarBlockedReason = carBlockedReason;
  carBlockedReason = function (car) {
    if (car.isPlayerCar && g.isActive('1.03') && !g.state.flags.carOpen) {
      return 'Машина заперта: возьмите ключи из нижней ячейки (клавиша 1) и кликните ими по машине';
    }
    return origCarBlockedReason(car);
  };

  // Любая рана смертельна, пока нет прибора восстановления тканей
  let dying = false;
  const origHitHero = hitHero;
  hitHero = function (hit) {
    if (questUnlocked.vitals() || !heroIsTarget() || heroArmored()) return origHitHero(hit);
    if (dying) return 0;
    dying = true;
    heroDownEl.style.opacity = '1';
    showToast('Любая рана смертельна: прибора, который бы заживлял ткани, у вас нет.', 4000);
    setTimeout(restartAfterDeath, 2200);
    return 999;
  };

  // С браслетом — последнее сохранение; без него история начинается заново: первые два квеста
  function restartAfterDeath() {
    let best = -1;
    for (let i = 0; i < SAVE_SLOTS; i++) {
      const s = getSave(i);
      if (s && (best < 0 || s.savedAt > getSave(best).savedAt)) best = i;
    }
    if (hasDeviceTag('saves') && best >= 0 && loadFromSlot(best)) {
      dying = false;
      heroDownEl.style.opacity = '0';
      return;
    }
    try {
      sessionStorage.removeItem('game.transit');
    } catch (e) {
      /* без хранилища просто перезагружаем */
    }
    window.location.href = GAME_LOCATION === 'main' ? window.location.pathname : '../index.html';
  }
})();
