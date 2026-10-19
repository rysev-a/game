# Заставка главного меню: промпт для Figma

Картинка лежит в `assets/menu/cover-comic.png`; чтобы включить ее, впишите путь в `COVER_URL` (`src/ui/main-menu.js`), по умолчанию рисуется пиксельная сцена (16:9, лучше 1920 × 1080 или 2560 × 1440, PNG). Игра сама ее подхватит, `src/ui/main-menu.js`.
Пока файла нет, рисуется запасная пиксельная сцена. Название игры в меню рисует сама игра, поэтому на картинке **не должно быть никакого текста**.

Компоновка: герои справа и в центре, левая треть картинки спокойная и темнее (там кнопки меню «Новая игра», «Загрузить», «Настройки»).
Стиль: обложка комикса 90-х, как `comix_zone.jpg` (жирная черная тушь, штриховка, плоские насыщенные цвета, желто-фиолетовое небо),
но спокойнее и тише, без боя и взрывов, и не пиксельная: чистая рисованная иллюстрация.

## Основной промпт (английский)

```
Wide 16:9 key art for a detective video game main menu, in the style of a 1990s comic book cover (Comix Zone, Sega Genesis era):
bold black ink outlines, hand-drawn cross-hatching and halftone shading, flat saturated colors, slightly gritty print texture.
Calmer and less epic than an action cover: a quiet, moody, mysterious scene, no fighting, no explosions, no starbursts.
Not pixel art: a clean hand-inked illustration.

Setting: a small countryside town at dusk. Purple and warm yellow-orange sky with faint comic speed-line rays, a huge old tree
with a big hidden treehouse in its crown on the far right, a laboratory tower and a river bridge as small silhouettes in the distance,
a wet road in the foreground with a parked black Nissan Almera Classic sedan at the lower left. Soft fog near the ground.

Four characters standing together on the right two thirds of the frame, full body, slightly different heights, calm tense poses,
looking toward the viewer or off to the side:
1. MAXIM, the hero, young man in his late 20s, programmer, short dark hair under a red baseball cap, black T-shirt, blue jeans,
   black boots, a slim glowing blue strip on his left wrist (smartwatch-like bracelet), a light blue backpack on his back,
   serious and a little tired face, determined eyes.
2. VERA, a young woman in her mid 20s, brown hair in a ponytail, white lab coat over a light blue shirt, jeans, white sneakers,
   gentle smile, standing slightly behind Maxim; a faint soft glow and slightly washed-out colors around her so she looks like a memory.
3. VIKTOR STERN, the mad scientist, man in his 50s, swept-back silver-grey hair, round glasses, white lab coat over a black turtleneck,
   black trousers, thin cold polite smile, one hand in his coat pocket, a faint green glow in his glasses.
4. A CYBORG towering behind him, taller than the others, grey-blue armored body with exposed mechanical joints, one narrow red glowing visor,
   thin cyan glowing lines on the chest and arms, arms hanging calmly, menacing but motionless.

Composition: characters grouped to the right, the left third of the image is calm dark purple-blue space (empty, for menu buttons),
strong readable silhouettes, rim light from the sunset, high contrast black ink shadows.
No text, no logo, no letters, no speech bubbles, no watermark.
```

## Короткий вариант

```
1990s comic book cover art, bold black ink outlines, hatching, flat saturated colors, purple and yellow dusk sky, calm moody detective scene,
four characters on the right: a young man in a red cap, black T-shirt and jeans with a light blue backpack; a young woman with a brown ponytail
in a white lab coat, softly glowing; a silver-haired scientist with round glasses in a white coat and black turtleneck; a tall grey armored cyborg
with a red visor. Small town, huge tree with a treehouse, lab tower, black sedan on a wet road. Empty dark space on the left, no text, 16:9.
```

## Если Figma рисует не то

- Лишний текст на картинке: добавить `no text of any kind`.
- Слишком пиксельно или слишком «мультяшно»: написать `clean ink illustration, not pixel art, not 3D render`.
- Слишком драматично: добавить `quiet, static poses, soft light, no action`.
- Героев четверо, но слились: сделать картинку по одному герою (`single character, full body, white background`, как лист `docs/art/characters.png`),
  потом собрать в Figma одной композицией.
- Нужны разные размеры: для телефона можно сделать отдельную вертикальную версию, герои по центру.

## Как положить в игру

1. Экспортировать из Figma в PNG, 1920 × 1080 (или больше).
2. Сохранить как `assets/menu/cover-comic.png` и вписать путь в `COVER_URL`.
3. Открыть игру: меню покажет картинку. Если левая часть слишком яркая, кнопки читаются хуже: меню уже затемняет ее слева,
   но лучше оставить там темное спокойное место.
