// src/core/shops.js
// ТОРГОВЛЯ. Магазин — данные в файле квеста: список товаров с ценой; торговец (человек в мире) открывает его действием { shop: '2.13.stalls' }
// из своего диалога. Окно (src/quests/shop-ui.js) показывает товары как ячейки инвентаря; клик по товару покупает его: деньги (счетчик money)
// уходят, предмет оказывается в инвентаре. Здесь только логика без экрана, чтобы ее можно было проверить в Node.
//
//   shops: { stalls: { title: 'Торговец у прилавков', greeting: 'Выбирайте, дорогие мои.',
//                      goods: [{ item: 'sg_pipe', price: 70 }, { item: 'sg_stock', price: 50, if: 'step:2.13.shop' }] } }
//
// Ссылка на магазин — '<id квеста>.<имя>': '2.13.stalls'. Товар можно купить один раз, пока предмета нет в инвентаре (вещи квеста не копятся).
// good.if — условие показа товара (как у квестов); good.do — действия после покупки (кроме списания денег и самого предмета).

(function (root) {
  const Core = (root.Core = root.Core || {});

  Core.resolveShop = function resolveShop(registry, ref) {
    for (const q of Object.values(registry.quests)) {
      const prefix = q.id + '.';
      if (ref.startsWith(prefix) && q.shops && q.shops[ref.slice(prefix.length)]) {
        return { def: q.shops[ref.slice(prefix.length)], owner: q };
      }
    }
    return null;
  };

  Core.gameExtensions.push(function attachShops(game) {
    const { registry } = game;

    // Сеанс магазина для окна: { ref, title, greeting, money(), goods() → [{ item, price, owned, affordable }], buy(item) → результат }
    // Результат buy: 'bought' | 'owned' (предмет уже есть) | 'poor' (не хватает денег) | 'unknown' (нет такого товара)
    game.shopSession = (ref) => {
      const found = Core.resolveShop(registry, ref);
      if (!found) {
        console.warn('Нет магазина: ' + ref);
        return null;
      }
      const { def } = found;
      const visible = () => (def.goods || []).filter((g) => game.check(g.if));
      return {
        ref,
        title: def.title || 'Магазин',
        greeting: def.greeting || '',
        money: () => game.state.counters.money || 0,
        goods: () =>
          visible().map((g) => ({
            item: g.item,
            price: g.price,
            owned: game.check('has:' + g.item),
            affordable: (game.state.counters.money || 0) >= g.price,
          })),
        buy(item) {
          const g = visible().find((x) => x.item === item);
          if (!g) return 'unknown';
          if (game.check('has:' + g.item)) return 'owned';
          if ((game.state.counters.money || 0) < g.price) return 'poor';
          game.run([{ add: { money: -g.price } }, { give: g.item }, ...(g.do || [])]);
          return 'bought';
        },
      };
    };
  });
})(globalThis);
