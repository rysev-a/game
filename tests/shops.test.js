// Тесты торговли (src/core/shops.js) на выдуманном магазине: покупка, нехватка денег, повторная покупка, условие показа товара, действие shop.
// Запуск: npm test

const test = require('node:test');
const assert = require('node:assert/strict');
const { makeGame } = require('./helpers.js');

const setup = (extra = {}) =>
  makeGame((reg) => {
    reg.defineQuest({
      id: 't.1',
      title: 'Тест',
      steps: [{ id: 'buy', text: 'Купить', done: 'has:gem' }],
      shops: {
        market: {
          title: 'Рынок',
          goods: [
            { item: 'gem', price: 50 },
            { item: 'rope', price: 20, if: 'flag:rope_open', do: [{ flag: 'bought_rope' }] },
          ],
        },
      },
      ...extra,
    });
  });

test('магазин: покупка списывает деньги и кладет вещь, повторная не проходит', () => {
  const { game, host } = setup();
  game.run({ add: { money: 120 } });
  const shop = game.shopSession('t.1.market');
  assert.equal(shop.money(), 120);
  assert.equal(shop.buy('gem'), 'bought');
  assert.equal(shop.money(), 70);
  assert.equal(host.itemCount('gem'), 1);
  assert.equal(shop.buy('gem'), 'owned');
  assert.equal(shop.money(), 70);
});

test('магазин: не хватает денег — ничего не покупается; неизвестный и скрытый товар недоступны', () => {
  const { game, host } = setup();
  game.run({ add: { money: 30 } });
  const shop = game.shopSession('t.1.market');
  assert.equal(shop.buy('gem'), 'poor');
  assert.equal(host.itemCount('gem'), 0);
  assert.equal(shop.money(), 30);
  assert.equal(shop.buy('rope'), 'unknown'); // условие показа не выполнено
  assert.equal(shop.buy('nothing'), 'unknown');
  assert.deepEqual(shop.goods().map((g) => [g.item, g.affordable, g.owned]), [['gem', false, false]]);
});

test('магазин: товар с условием и действием после покупки', () => {
  const { game, host } = setup();
  game.run([{ add: { money: 100 } }, { flag: 'rope_open' }]);
  const shop = game.shopSession('t.1.market');
  assert.equal(shop.goods().length, 2);
  assert.equal(shop.buy('rope'), 'bought');
  assert.equal(game.check('flag:bought_rope'), true);
  assert.equal(host.itemCount('rope'), 1);
});

test('действие shop открывает окно магазина на хосте', () => {
  const { game, host } = setup();
  game.run({ shop: 't.1.market' });
  assert.equal(host.shops.length, 1);
  assert.equal(host.shops[0].title, 'Рынок');
});
