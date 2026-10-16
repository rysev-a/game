# Инвентарь, предметы, крафт, мастера, станции

Инвентарь — главная механика игры: почти каждый квест что-то находит, приносит, отдает или собирает.

## Инвентарь

Сейчас `inventory.items` — список `id`, каждая вещь одна (`src/player/inventory.js`). Для эликсира
(«2/5»), меди и денег нужны **стопки**:

```js
inventory.items = [{ id: 'wrench', n: 1 }, { id: 'elixir', n: 3 }, { id: 'money', n: 1200 }];
```

- `addItem(id, n = 1)`, `removeItem(id, n = 1)`, `countItem(id)`; `hasItem(id)` остается как был.
- Число в углу ячейки, если `n > 1`. Деньги показываются не ячейкой, а суммой под инвентарем.
- **Карточка предмета**: клик по ячейке в раскрытом инвентаре — название, описание, кнопки из данных
  («Использовать», «Читать», «Выбросить», если можно).
- **Применить к миру**: «Использовать» у вещи с `useOn` — подсказка E меняется на «E — применить: Канистра»
  у подходящей точки, персонажа или станции. Канистра у своей машины — первый пример.
- **Отдать / показать** — через диалог (вариант `'give'`, см. [quests-and-dialogs.md](quests-and-dialogs.md#диалог)).
- Сюжетные вещи (`quest: true`) нельзя выбросить.

## Предмет

```js
defineItem('elixir', {
  name: 'Эликсир',
  icon: 'elixir',                  // значок в PIXEL_ART (src/player/icons.js)
  kind: 'resource',                // tool | resource | ingredient | blueprint | book | evidence | key | device | food
  stack: 20,                       // сколько в одной ячейке (по умолчанию 1)
  text: 'Синеватая жидкость из записей Веры. Топливо для приборов.',
});

defineItem('pies', {
  name: 'Пироги Анны Петровны', icon: 'pies', kind: 'food', stack: 5,
  use: [{ heal: 40 }, { take: 'pies' }, { toast: 'Сил прибавилось' }],
});

defineItem('canister', {
  name: 'Канистра с бензином', icon: 'canister', kind: 'tool',
  useOn: { target: 'car:own', do: [{ fuel: 0.45 }, { take: 'canister' }] },
});

defineItem('book_biology', {
  name: 'Биология тканей', icon: 'book', kind: 'book',
  read: { time: '2h', do: [{ flag: 'know.biology' }], text: 'Глава о регенерации…' },
});

defineItem('photo_sokol', { name: 'Фото у реки', icon: 'photo', kind: 'evidence', quest: true,
  text: 'Ночь, берег. Двое у воды: мужчина в светлом пальто и человек в светлом костюме.' });
```

Виды (`kind`) нужны журналу и доске улик: улики (`evidence`) из боев с боссами потом собираются в
головоломке-доске (4.07, «Письмо Громову»).

## Рецепт

Одна запись описывает всё, что делается из чего-то: эликсир на верстаке, корпус у Михалыча, расчет на
сервере, апгрейд у Рустама.

```js
defineRecipe('analyzer', {
  name: 'Анализатор тканей',
  at: 'mihalych',                          // где делается: мастер или станция
  blueprint: 'bp_analyzer',                // без чертежа рецепта не видно; чертеж остается у игрока
  needs: { copper: 2, elixir: 1 },         // что забирается
  needsFlags: ['know.biology'],            // знания (книги), если нужны
  time: 'morning',                         // сколько ждать: '2h', 'morning', 'night', { nights: 3 }
  puzzle: null,                            // головоломка при изготовлении (у 2.08 — в квесте)
  gives: 'analyzer',
});

defineRecipe('elixir', {
  name: 'Эликсир', at: 'treehouse.workbench', blueprint: 'notes_vera',
  needs: { honey: 1, sea_salt: 1, sugar: 1, copper_wire: 1, reagent: 1, battery: 2 },
  puzzle: 'elixir_brew',                   // варка — головоломка-последовательность (puzzles.md)
  gives: { elixir: 3 },
});

defineRecipe('calc_bracelet', {
  name: 'Расчет браслета', at: 'server', time: { nights: 3 }, gives: 'calc_bracelet',
  requires: 'done:3.01',
});

defineRecipe('bracelet', {
  name: 'Браслет сохранения', at: 'mihalych', blueprint: 'bp_bracelet',
  needs: { calc_bracelet: 1, elixir: 2, copper: 1 }, time: 'morning', gives: 'bracelet',
});
```

Журнал («Чертежи и рецепты») рисует рецепт с галочками сам, по `needs` и тому, что лежит в инвентаре:

```
Браслет сохранения
 ✓ Чертеж (голубятня)
 ○ Расчет на сервере (1/3 ночи)
 ○ Эликсир (1/2)
 ✓ Медь
```

Цепочки («расчет → корпус → прибор») — это просто рецепты, где результат одного входит в `needs` другого.

## Мастера и заказы

Мастер — персонаж или станция, у которых `crafter` / `at` совпадает с рецептами. У мастеров в диалоге есть
вариант `'orders'`: «Сделай: …» для рецептов, которые можно сделать сейчас, и «Забрать: …» для готовых.

**Заказ** — рецепт со временем: ингредиенты забираются сразу, вещь появляется через `time` игрового
времени (`story.orders`). Время можно промотать сном в домике или ожиданием. Так одним механизмом
описываются все союзники:

| Кто | `at` | Что делает |
| --- | --- | --- |
| Михалыч (кузнец) | `mihalych` | корпуса и приборы по чертежам, ремонт; часто с головоломкой у горна или станка |
| Олег Борисович | `server` | расчеты: один за ночь (`time: 'night'`), большие — `{ nights: 3 }`, портал — с дизелем |
| Семён Аркадьевич | `semyon` | восстановить файлы, найти статью в архиве (`time: '2h'`) |
| Рустам | `rustam` | апгрейды машины (композитный кузов), ремонт; за деньги |
| Верстак в домике | `treehouse.workbench` | эликсир и его варианты, заправка приборов |

**Торговля и поставки** — тоже данные, у персонажа в диалоге вариант `'trade'`:

```js
defineTrades('lyudmila', [
  { gives: { honey: 1 }, price: 120 },
  { gives: { copper: 1 }, price: 300, if: 'done:2.04' },
  // После 2.04 Людмила поставляет набор для эликсира раз в день бесплатно
  { gives: { honey: 1, sea_salt: 1, sugar: 1, reagent: 1 }, price: 0, if: 'done:2.04', every: 'day' },
]);
defineTrades('nikolay', [
  { gives: 'fuel_full', price: 0, if: 'done:2.10' },       // бесплатный бензин: особая вещь «заправка»
  { gives: { diesel: 1 }, price: 0, if: 'quest:4.02', every: 'night' },
]);
```

## Станции в мире

Станция — прибор или установка, стоящая в мире: верстак, генератор у серверов, серверная стойка, горн,
пульт ворот лаборатории. У станции есть состояние и действия из данных. Код станции — общий, он показывает
подсказку E и панель с кнопками (или сразу открывает головоломку).

```js
defineStation('generator', {
  name: 'Генератор',
  at: 'office.yard',
  model: 'generator',                          // 3D-модель из src/models (или ящик-заглушка)
  state: 'off',
  states: {
    off: { prompt: 'E — генератор (выключен)', text: 'Бак пуст.' },
    on: { prompt: 'E — генератор (работает)', text: 'Гудит. Серверы считают.', sound: 'car' },
  },
  actions: [
    { text: 'Залить дизель', if: 'has:diesel', do: [{ take: 'diesel' }, { add: { 'gen.fuel': 1 } },
      { step: '4.02.trip' }] },
    { text: 'Запустить', if: ['count:gen.fuel>=1', 'state:generator=off'], do: [{ station: { generator: 'on' } }] },
  ],
});

defineStation('treehouse.workbench', { name: 'Верстак', at: 'treehouse.workbench', opens: 'craft' });
defineStation('office.rack', { name: 'Серверная стойка', at: 'office.servers', opens: 'craft', crafter: 'server' });
defineStation('lab.secret_door', { name: 'Стена', at: 'lab.desk', opens: { puzzle: '4.09.door' },
  if: 'has:bp_workshop' });
```

`opens: 'craft'` — список рецептов этой станции; `opens: { puzzle }` — головоломка; без `opens` — панель
с `actions`.

## Точки в мире

Вещь на земле, тайник, улика, место, где что-то видно только прибором:

```js
defineSpot('willow.jar', {
  at: 'zarechye.willow',
  prompt: 'E — копать у корней',
  if: 'quest:2.07',                     // пока условие ложно, точки нет
  needs: 'has:shovel',                  // без лопаты подсказка «Нужна лопата»
  model: 'mound',
  do: [{ give: ['bp_analyzer', 'flash_vera'] }, { reveal: 'Ф16' }, { step: '2.07.dig' }],
  once: true,
});

defineSpot('river.tracks', {
  at: 'river.bank_west', prompt: 'E — следы шин', visibleWith: 'analyzer',   // видно только в режиме прибора
  do: [{ give: 'evidence_tracks' }], once: true,
});
```

Вещи, которые сейчас лежат в доме (`syncHomePickups` в `src/player/home.js`), переезжают на точки.
