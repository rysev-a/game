# Промпты для Meshy (персонажи, предметы, эффекты)

Готовые промпты на английском для [meshy.ai](https://www.meshy.ai): Text to 3D → (по желанию) Rig → Animate →
экспорт **GLB** (его читает three.js через `GLTFLoader`). Пояснения на русском, промпты — на английском.
Каждый промпт короче 600 символов: это лимит поля prompt у Meshy.

## Как генерировать

1. **Text to 3D**, тип модели **Low Poly** (если его нет — Standard + topology Quad, polycount 3–8k для
   персонажей и 0,5–2k для предметов).
2. **Symmetry: On** для людей и приборов, **Pose: A-pose** для всех, кого будем ригать.
3. Текстуры: **PBR выключить**. Игра рисует всё без света (`MeshBasicMaterial`, плоские цвета и темный
   контур), поэтому нужны ровные заливки, а не металл и отражения.
4. Сначала смотреть превью без текстуры (preview). Если форма нравится — запускать текстуры (refine).
5. Для людей: **Rig** (humanoid, рост 1,7 м), потом **Animate** — idle, walk, run из библиотеки.
6. Экспорт **GLB**. Класть в `assets/models/<имя>.glb`.

Если форма уходит в реализм, добавить в конец промпта: `no realistic details, no photo textures`.
Если Meshy дорисовывает лишнее (оружие, рюкзаки), убрать слово `game character` и повторить.

### Общий стиль (уже вставлен в каждый промпт ниже)

```
low-poly, flat-shaded, chunky blocky proportions, simple box-like shapes, solid flat colors, no gradients,
clean readable silhouette, stylized indie game asset
```

Это повторяет то, как выглядит игра сейчас: люди собраны из граненых деталей по листу [characters.png](characters.png) (`src/models/person.js`, см. [characters.md](characters.md)), вещи —
объемный пиксель-арт из значков 12×12 (`src/models/items.js`), всё с плоскими цветами.

## Персонажи

Внешность есть в документах только у героя. У остальных она **додумана** по их карточкам
(`docs/story/characters/`) — поправьте, если представляли иначе.

### Максим — главный герой

```
Low-poly stylized game character, young athletic man in his late 20s, programmer geek. Plain black
short-sleeve T-shirt, blue jeans, red baseball cap, black shoes. No glasses, clean-shaven, short dark hair.
Full body, A-pose, front view. Flat-shaded, chunky blocky proportions, simple box-like shapes, solid flat
colors, no logos, clean silhouette, indie game asset.
```

### Денис — друг детства, сержант полиции

```
Low-poly stylized game character, friendly man in his late 20s, police sergeant. Dark blue police uniform
shirt with a small badge, navy trousers, navy police peaked cap, black boots, short light-brown hair,
easygoing smile. Full body, A-pose, front view. Flat-shaded, chunky blocky proportions, simple box-like
shapes, solid flat colors, clean silhouette, indie game asset.
```

### Анна Петровна — бабушка Веры

```
Low-poly stylized game character, kind elderly Russian village woman around 70, retired music teacher.
Grey hair in a bun, warm knitted cardigan over a long dark skirt, flowered headscarf on shoulders, felt
house shoes, slightly stooped. Full body, A-pose, front view. Flat-shaded, chunky blocky proportions,
simple box-like shapes, solid flat colors, clean silhouette, indie game asset.
```

### Вера Соколова (флешбэки и финал)

```
Low-poly stylized game character, cheerful young woman about 25, lab assistant and secret scientist.
Long chestnut ponytail, white lab coat open over a light blue sweater, slim jeans, white sneakers.
Full body, A-pose, front view. Flat-shaded, chunky blocky proportions, simple box-like shapes, solid flat
colors, clean silhouette, indie game asset.
```

### Виктор Штерн — сумасшедший ученый, главный злодей

```
Low-poly stylized villain character, tall thin mad scientist about 55. Slicked-back grey hair, sharp
narrow face, round steel glasses, long white lab coat over a dark turtleneck, dark trousers, polished black
shoes, cold arrogant posture. Full body, A-pose, front view. Flat-shaded, chunky blocky proportions,
simple box-like shapes, solid flat colors, clean silhouette, indie game asset.
```

### Барон (Аркадий Ремез) — главный босс

```
Low-poly stylized villain boss character, polite wealthy businessman about 50. Immaculate light cream
three-piece suit, white shirt, dark red tie, neat grey beard, slicked hair, gold signet ring, calm
confident stance. Full body, A-pose, front view. Flat-shaded, chunky blocky proportions, simple box-like
shapes, solid flat colors, clean silhouette, indie game asset.
```

### Людмила Сергеевна — директор торгового центра

```
Low-poly stylized game character, energetic businesswoman in her mid 50s, shopping mall director.
Short auburn bob haircut, burgundy blazer with a name badge, black pencil skirt, low heels, holding a
clipboard. Full body, A-pose, front view. Flat-shaded, chunky blocky proportions, simple box-like shapes,
solid flat colors, clean silhouette, indie game asset.
```

### Семён Аркадьевич — директор библиотеки

```
Low-poly stylized game character, elderly ironic librarian around 70, former physicist. Bald top with
white side hair, small white beard, half-moon reading glasses, brown tweed jacket with elbow patches,
beige vest, grey trousers, holding an old book. Full body, A-pose, front view. Flat-shaded, chunky blocky
proportions, simple box-like shapes, solid flat colors, clean silhouette, indie game asset.
```

### Олег Борисович — начальник героя

```
Low-poly stylized game character, practical IT company owner in his mid 40s. Short dark hair with grey
temples, light stubble, light blue shirt with rolled sleeves, dark grey trousers, smartwatch, holding a
smartphone. Full body, A-pose, front view. Flat-shaded, chunky blocky proportions, simple box-like shapes,
solid flat colors, clean silhouette, indie game asset.
```

### Михалыч — кузнец

```
Low-poly stylized game character, burly blacksmith in his 60s. Big grey moustache, bald head, thick
brown leather apron over a dark checkered shirt with rolled sleeves, heavy work trousers, big boots,
leather gloves. Full body, A-pose, front view. Flat-shaded, chunky blocky proportions, simple box-like
shapes, solid flat colors, clean silhouette, indie game asset.
```

### Рустам — автомеханик

```
Low-poly stylized game character, cheerful loud car mechanic in his late 30s. Short black hair, black
beard, orange mechanic overalls with the top tied around the waist, grey tank top, oil stains, work
boots, rag in back pocket. Full body, A-pose, front view. Flat-shaded, chunky blocky proportions, simple
box-like shapes, solid flat colors, clean silhouette, indie game asset.
```

### Николай Палыч — начальник заправки

```
Low-poly stylized game character, former long-haul truck driver in his late 50s, gas station manager.
Grey crew cut, bushy moustache, red gas station uniform vest over a white shirt, dark trousers, sturdy
boots, slight belly. Full body, A-pose, front view. Flat-shaded, chunky blocky proportions, simple
box-like shapes, solid flat colors, clean silhouette, indie game asset.
```

### Павел Андреевич Громов — глава корпорации

```
Low-poly stylized game character, dignified corporate CEO around 65. Silver hair combed back, dark navy
business suit, white shirt, grey tie, long dark wool coat, stern but honest face. Full body, A-pose, front
view. Flat-shaded, chunky blocky proportions, simple box-like shapes, solid flat colors, clean
silhouette, indie game asset.
```

### Помощники Барона (боссы)

Общая часть у всех: одинаковые темные куртки «людей из лаборатории» плюс деталь, которая выдает
способность. Шаблон: подставить строку из таблицы на место `<…>`.

```
Low-poly stylized boss character, henchman with a superpower, <DETAILS>. Full body, A-pose, front view.
Flat-shaded, chunky blocky proportions, simple box-like shapes, solid flat colors, clean silhouette,
indie game asset.
```

| Босс | `<DETAILS>` |
| --- | --- |
| Вспышка | lean sprinter in a yellow and black tracksuit, running shoes with glowing soles, wind-swept hair |
| Эхо | slim man in a grey hoodie, face half hidden, faint duplicate outline effect on the edges |
| Тень | person in a dark charcoal stealth suit and balaclava, matte black, almost no details |
| Сокол | wiry man in a brown flight jacket and goggles, mechanical folded wings on the back |
| Магнит | heavy man in a rust-red work jacket, big metal gauntlets with magnet coils |
| Туча | woman in a long grey raincoat, storm-cloud blue hair, small lightning patterns on sleeves |
| Искра | young hacker in a dark tech jacket with glowing cyan circuit lines, cables on wrists |
| Шепот | thin man in a black turtleneck and long coat, pale face, small throat microphone |
| Глыба | huge brute covered in stone-like grey armor plates, tiny head, massive fists |
| Гидра | athletic woman in a green tactical suit, healing glowing green veins on arms |

## Предметы

В игре вещи сейчас — объемный пиксель-арт (кубики по значку 12×12). Чтобы модели из Meshy не выбивались,
для предметов лучше **voxel** стиль. Тип модели Low Poly, Symmetry Auto, без позы.

Шаблон:

```
Low-poly voxel-style game item, <ITEM>, chunky cube-built shape, solid flat colors, black outline-friendly
clean edges, single object centered on white background, indie game asset.
```

| Предмет (id) | `<ITEM>` |
| --- | --- |
| Гаечный ключ (`wrench`) | steel open-end wrench, grey metal |
| Отвертка (`screwdriver`) | screwdriver with a red and yellow plastic handle |
| Ключи от машины (`keys`) | car key with a black fob and a small key ring |
| Кошелек (`wallet`) | folded brown leather wallet |
| Телефон (`phone`) | black smartphone with a blue lit screen |
| Пропуск в IT-компанию (`itpass`) | white plastic ID badge with a blue lanyard clip |
| Блокнот (`notebook`) | spiral notebook with a dark green cover |
| Фонарик (`flashlight`) | black tactical flashlight with a yellow lens |
| Канистра (`canister`) | red metal fuel jerry can |
| Эликсир | small glass flask with glowing cyan liquid and a cork |
| Чертеж | rolled blueprint paper tied with string, blue paper |

### Приборы героя

У приборов Веры общий вид: темно-серый корпус и светящиеся голубые полосы (как у браслета в
`src/models/devices.js`, цвет `#6ff0ff`). Шаблон:

```
Low-poly stylized sci-fi gadget, <DEVICE>, handmade from a 3D-printed dark grey body with glowing cyan
light strips, chunky simple shapes, solid flat colors, single object, indie game asset.
```

| Прибор | `<DEVICE>` |
| --- | --- |
| Браслет сохранения | thick wrist bracelet with a small round display |
| Тепловизионные очки | bulky thermal vision goggles with two orange lenses and a head strap |
| Анализатор тканей | handheld scanner with a small screen and a pointed sensor tip |
| Сетемет | shoulder-held net launcher with a wide barrel and a folded net inside |
| Ионизатор-громоотвод | backpack device with a tall copper lightning rod antenna |
| Резонатор | handheld sonic emitter with a dish-shaped front and rings |
| Глушитель регенерации | compact grenade-like canister with a red warning stripe |
| Экранированный кейс | metal suitcase with copper mesh panels |
| Шумоподавляющие наушники | big over-ear headphones with cyan glowing rings |
| Масляная ловушка | flat metal disc trap with a black oil tank |
| Портал | pair of tripod beacons with glowing cyan rings on top |
| Импульсный лазер | см. ниже |

## Выстрел из импульсного лазера

Meshy делает модели и анимации тела, но **не делает эффекты** (луч, вспышку, частицы). Поэтому выстрел
собирается из трех кусков: оружие и поза из Meshy, сам луч — в коде игры (простая светящаяся коробка
и вспышка, это 20–30 строк three.js).

**1. Оружие (Text to 3D, Low Poly):**

```
Low-poly stylized sci-fi pulse laser pistol, handmade look, dark grey 3D-printed body, short thick barrel
with three glowing cyan coil rings, small battery cell on the side with cyan light, chunky blocky
shapes, solid flat colors, side view, single object, indie game asset.
```

**2. Анимация героя.** Ригнуть героя (Rig → humanoid), потом Animate → в библиотеке искать по словам
`shoot`, `pistol`, `aim`, `fire`. Брать короткий выстрел из пистолета одной рукой; если такого нет —
`aim` (держим позу, отдачу дает код). Скачать GLB вместе с анимацией.

**3. Заряд (чтобы луч в игре выглядел объемным, а не только линией):**

```
Low-poly stylized energy bolt projectile, elongated glowing cyan capsule with a bright white core and
two thin rings around it, simple shapes, flat emissive colors, single object, indie game asset.
```

**4. Вспышка у дула:**

```
Low-poly stylized muzzle flash burst, four-pointed cyan and white star shape made of flat angular
shards, flat emissive colors, single object, indie game asset.
```

В игре: заряд летит от дула за 0,1–0,2 с, вспышка показывается 2–3 кадра и гаснет, в точке попадания —
та же вспышка поменьше.

## Телепортация (портал)

Портал — прибор из акта 4: две точки и мгновенный переход. Как и с лазером, само «исчезновение» делает
код, а Meshy дает модели.

**1. Маяк портала (две штуки ставятся на землю):**

```
Low-poly stylized sci-fi teleport beacon, short tripod stand with a horizontal ring on top, dark grey
3D-printed body, glowing cyan ring and small cyan lights on the legs, chunky blocky shapes, solid flat
colors, single object, indie game asset.
```

**2. Кольцо перехода (вокруг героя в момент телепорта):**

```
Low-poly stylized teleport ring effect mesh, flat glowing cyan torus ring with angular segmented edges
and small floating square particles around it, flat emissive colors, single object, indie game asset.
```

**3. Столб света:**

```
Low-poly stylized vertical beam of light, tall hexagonal cyan column, brighter white core, open top,
flat emissive colors, single object, indie game asset.
```

**4. Поза героя.** В Animate искать `cast`, `power up`, `charge`. Если подходящей нет — хватит `idle`,
эффект все равно дает код.

В игре: кольцо поднимается снизу вверх по герою (0,4 с), герой «рассыпается» на кубики того же цвета,
вспышка столба света, то же в обратном порядке у второго маяка.
