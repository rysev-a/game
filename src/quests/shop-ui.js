// src/quests/shop-ui.js
// ОКНО МАГАЗИНА поверх игры (docs/mechanics/quests-and-dialogs.md, «Торговля»). Логику ведет ядро (src/core/shops.js), окно только показывает:
// товары торговца выложены как ячейки инвентаря (значок и цена под ним), сверху — кошелек с суммой. Клик по товару покупает его: деньги
// уходят, предмет оказывается в инвентаре (через действия ядра, host.giveItem). Что за вещь, видно внизу окна, когда наводишь на ячейку.
// Пока окно открыто, игра стоит (как в разговоре), Esc или ✕ закрывает. Открывает его действие { shop: '2.13.stalls' } через host.openShop:
// оно приходит из диалога торговца, поэтому окно появляется, когда диалог уже закрылся.

(function () {
  const css = document.createElement('style');
  css.textContent = `
    #shopUi { position: fixed; inset: 0; z-index: 70; display: none; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.6);
      font-family: var(--font); color: var(--c-text, #f1f3f5); }
    #shopUi.on { display: flex; }
    #shopUi .panel { width: min(560px, 94vw); box-sizing: border-box; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--c-border, rgba(255, 255, 255, 0.3));
      background: rgba(12, 16, 22, 0.97); box-shadow: var(--shadow, 0 6px 22px rgba(0, 0, 0, 0.45)); }
    #shopUi .head { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
    #shopUi h2 { margin: 0; flex: 1; font-size: var(--fs-h2, 16px); color: var(--c-accent, #8fd0ff); }
    #shopUi .wallet { display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 8px; border: 1px solid var(--c-border, rgba(255, 255, 255, 0.3));
      background: var(--c-bg-item, rgba(255, 255, 255, 0.07)); font-weight: 700; font-variant-numeric: tabular-nums; }
    #shopUi .wallet img.px { width: 22px; height: 22px; image-rendering: pixelated; }
    #shopUi .x { cursor: pointer; padding: 2px 9px; border-radius: 6px; font-size: var(--fs-h2, 16px); }
    #shopUi .x:hover { background: rgba(255, 255, 255, 0.15); }
    #shopUi .greet { margin: 2px 0 12px; font-size: var(--fs-text, 13px); color: var(--c-dim, rgba(241, 243, 245, 0.62)); line-height: 1.4; }
    #shopUi .goods { display: grid; grid-template-columns: repeat(auto-fill, 76px); gap: 8px; }
    #shopUi .good { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 4px 6px; box-sizing: border-box; cursor: pointer;
      border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.28); background: var(--c-bg-item, rgba(255, 255, 255, 0.07)); user-select: none; }
    #shopUi .good:hover { background: var(--c-bg-hover, rgba(143, 208, 255, 0.22)); border-color: var(--c-accent, #8fd0ff); }
    #shopUi .good img.px { width: 44px; height: 44px; image-rendering: pixelated; pointer-events: none; }
    #shopUi .good .price { font-size: var(--fs-small, 11px); font-weight: 700; font-variant-numeric: tabular-nums; }
    #shopUi .good.poor .price { color: var(--c-danger, #ff6b5b); }
    #shopUi .good.owned { opacity: 0.4; cursor: default; }
    #shopUi .good.owned:hover { background: var(--c-bg-item, rgba(255, 255, 255, 0.07)); border-color: rgba(255, 255, 255, 0.28); }
    #shopUi .good.owned .price { color: var(--c-ok, #3fa35b); }
    #shopUi .good.flash { animation: shopFlash 0.4s; }
    @keyframes shopFlash { 30% { background: rgba(63, 163, 91, 0.55); } }
    #shopUi .info { min-height: 58px; margin-top: 12px; padding: 8px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.05); font-size: var(--fs-text, 13px); line-height: 1.45; }
    #shopUi .info b { color: var(--c-warm, #ffe27a); }
    #shopUi .msg { min-height: 20px; margin-top: 8px; font-size: var(--fs-text, 13px); }
    #shopUi .msg.bad { color: var(--c-danger, #ff6b5b); }
    #shopUi .msg.good { color: var(--c-ok, #7fd48a); }
  `;
  document.head.appendChild(css);

  const root = document.createElement('div');
  root.id = 'shopUi';
  root.innerHTML = '<div class="panel"><div class="head"><h2></h2><div class="wallet"></div><div class="x" title="Закрыть (Esc)">✕</div></div>' +
    '<div class="greet"></div><div class="goods"></div><div class="info"></div><div class="msg"></div></div>';
  document.body.appendChild(root);
  const titleEl = root.querySelector('h2');
  const walletEl = root.querySelector('.wallet');
  const greetEl = root.querySelector('.greet');
  const goodsEl = root.querySelector('.goods');
  const infoEl = root.querySelector('.info');
  const msgEl = root.querySelector('.msg');

  let session = null;
  const nameOf = (id) => (typeof ITEMS !== 'undefined' && ITEMS[id] ? ITEMS[id].name : id);

  function say(text, cls = '') {
    msgEl.textContent = text;
    msgEl.className = 'msg ' + cls;
  }

  function showInfo(g) {
    const it = typeof ITEMS !== 'undefined' ? ITEMS[g.item] : null;
    infoEl.innerHTML = '';
    if (!it) return;
    const b = document.createElement('b');
    b.textContent = it.name + ' · ' + g.price;
    const d = document.createElement('div');
    d.textContent = it.desc || '';
    infoEl.append(b, d);
  }

  function render() {
    if (!session) return;
    titleEl.textContent = session.title;
    greetEl.textContent = session.greeting;
    walletEl.replaceChildren(pixelIcon('wallet'), document.createTextNode(String(Math.round(session.money()))));
    goodsEl.replaceChildren();
    for (const g of session.goods()) {
      const cell = document.createElement('div');
      cell.className = 'good' + (g.owned ? ' owned' : g.affordable ? '' : ' poor');
      cell.title = nameOf(g.item);
      const icon = typeof ITEMS !== 'undefined' && ITEMS[g.item] ? ITEMS[g.item].icon : g.item;
      const price = document.createElement('span');
      price.className = 'price';
      price.textContent = g.owned ? 'есть' : String(g.price);
      cell.append(pixelIcon(icon), price);
      cell.addEventListener('mouseenter', () => showInfo(g));
      cell.addEventListener('click', () => buy(g, cell));
      goodsEl.appendChild(cell);
    }
  }

  function buy(g, cell) {
    const result = session.buy(g.item);
    if (result === 'bought') {
      if (typeof playPickupClick === 'function') playPickupClick();
      say('Куплено: ' + nameOf(g.item) + ' (−' + g.price + ')', 'good');
      render();
      const fresh = [...goodsEl.children].find((c) => c.title === nameOf(g.item));
      if (fresh) fresh.classList.add('flash');
    } else if (result === 'poor') {
      say('Не хватает денег: ' + nameOf(g.item) + ' стоит ' + g.price, 'bad');
    } else if (result === 'owned') {
      say('Это у вас уже есть.', '');
    }
    void cell;
  }

  function close() {
    if (!session) return;
    session = null;
    root.classList.remove('on');
    dialogueOpen = false;
  }

  function open(s) {
    session = s;
    for (const k of Object.keys(keys)) keys[k] = false; // отпускаем зажатые клавиши
    if (document.exitPointerLock) document.exitPointerLock();
    dialogueOpen = true; // пауза ввода и игры, как у журнала и головоломок
    infoEl.textContent = 'Наведите на товар: здесь будет, что это за вещь.';
    say('');
    render();
    root.classList.add('on');
  }

  // Окно открывает ядро (действие { shop }), обычно из варианта ответа в диалоге: ждем, пока диалог закроется
  window.openShopUi = function openShopUi(s) {
    if (session) return;
    const tryOpen = () => (dialogueOpen ? setTimeout(tryOpen, 40) : open(s));
    setTimeout(tryOpen, 0);
  };

  root.querySelector('.x').addEventListener('click', close);
  root.addEventListener('mousedown', (e) => {
    if (e.target === root) close(); // клик мимо окна закрывает его
  });
  // Пока окно открыто, до игры доходит только Esc (закрыть)
  window.addEventListener(
    'keydown',
    (e) => {
      if (!session) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (e.code === 'Escape' || e.code === 'KeyE') close();
    },
    true,
  );
})();
