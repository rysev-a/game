// src/models/race-cars.js
// Модели гоночного парка автодрома ДЕМО (VEHICLE_KINDS, src/world/vehicles.js): купе GT, раллийный хэтчбек,
// маслкар, дрифт-купе, прототип и карт. Собраны тем же набором деталей, что и болид (vehicleKit,
// src/models/vehicles.js): плоские цвета (LitMaterial), темные контуры, светятся только фары.
//
//   const m = createGtCar({ bodyColor: 0x1f5fd0 });  // createRallyCar, createMuscleCar, createDriftCar,
//                                                    // createProtoCar, createKart, createHyperCar, createBugatti
// Интерфейс как у createCar: spinWheels, updateCar, setDoor, userData.exhaust. Модель смотрит в -Z.

const raceGlass = 0x22313f; // тонированные стекла

// КУПЕ GT: низкое закрытое купе с покатой крышей, полосами по оси и небольшим антикрылом
function createGtCar(options = {}) {
  const o = Object.assign({ bodyColor: 0x1f5fd0, stripeColor: 0xf2f2f2 }, options);
  const k = vehicleKit({ shake: 0.014, shakeRate: 28 });
  k.part(1.95, 0.42, 4.3, o.bodyColor).position.set(0, 0.5, 0.05);
  k.wedge(1.95, [[-2.15, 0.29], [-2.35, 0.36], [-2.15, 0.71], [-0.9, 0.78], [-0.9, 0.29]], o.bodyColor); // нос
  k.wedge(1.6, [[-0.9, 0.71], [-0.15, 1.2], [0.95, 1.2], [1.85, 0.71]], raceGlass); // кабина
  k.part(1.5, 0.05, 1.0, o.bodyColor).position.set(0, 1.22, 0.4); // крыша
  for (const x of [-0.18, 0.18]) k.part(0.16, 0.02, 4.4, o.stripeColor).position.set(x, 0.72, 0);
  k.part(1.8, 0.06, 0.35, 0x1b1b1f).position.set(0, 0.98, 2.05);
  for (const x of [-0.7, 0.7]) k.part(0.06, 0.26, 0.2, 0x1b1b1f).position.set(x, 0.84, 2.05);
  for (const x of [-0.7, 0.7]) k.lamp(x, 0.6, -2.2, 0xfff2b0, 0.38, 0.1);
  for (const x of [-0.72, 0.72]) k.lamp(x, 0.62, 2.21, 0xff3030, 0.4, 0.09);
  k.wheel(-1.0, -1.45, 0.37, 0.32);
  k.wheel(1.0, -1.45, 0.37, 0.32);
  k.wheel(-1.0, 1.35, 0.39, 0.38);
  k.wheel(1.0, 1.35, 0.39, 0.38);
  k.exhaust.position.set(0.5, 0.35, 2.25);
  return k.root;
}

// РАЛЛИЙНЫЙ ХЭТЧБЕК: короткий и высокий, воздухозаборник на крыше, спойлер над задним стеклом,
// люстра фар на капоте и брызговики
function createRallyCar(options = {}) {
  const o = Object.assign({ bodyColor: 0xf0f0ea, stripeColor: 0x1d5fc8, accentColor: 0xe0b020 }, options);
  const k = vehicleKit({ shake: 0.026, shakeRate: 20 });
  k.part(1.85, 0.6, 3.8, o.bodyColor).position.set(0, 0.68, 0);
  k.wedge(1.7, [[-0.75, 0.98], [-0.2, 1.5], [1.6, 1.5], [1.75, 0.98]], raceGlass);
  k.part(1.62, 0.07, 1.8, o.bodyColor).position.set(0, 1.53, 0.7);
  k.part(0.5, 0.14, 0.6, 0x1b1b1f).position.set(0, 1.63, 0.1); // заборник на крыше
  k.part(1.6, 0.06, 0.4, o.bodyColor).position.set(0, 1.55, 1.8); // спойлер
  // Ливрея: синие полосы по бортам и капоту, желтые номера-плашки на дверях
  for (const x of [-0.93, 0.93]) k.part(0.02, 0.18, 3.6, o.stripeColor).position.set(x, 0.72, 0);
  k.part(0.5, 0.02, 1.2, o.stripeColor).position.set(0, 0.99, -1.3);
  for (const x of [-0.94, 0.94]) k.part(0.02, 0.32, 0.5, o.accentColor).position.set(x, 0.85, 0.25);
  // Люстра: четыре фары на перекладине и штатные фары
  k.part(1.3, 0.08, 0.08, 0x1b1b1f).position.set(0, 1.02, -1.75);
  for (const x of [-0.48, -0.16, 0.16, 0.48]) k.lamp(x, 1.12, -1.78, 0xfff6c8, 0.22, 0.16);
  for (const x of [-0.65, 0.65]) k.lamp(x, 0.72, -1.91, 0xfff2b0, 0.32, 0.14);
  for (const x of [-0.7, 0.7]) k.lamp(x, 0.85, 1.91, 0xff3030, 0.26, 0.18);
  // Брызговики за колесами
  for (const x of [-0.85, 0.85]) for (const z of [-0.75, 1.85]) k.part(0.3, 0.32, 0.04, 0xc02020).position.set(x, 0.3, z);
  k.wheel(-0.95, -1.25, 0.4, 0.3, 0x151515, 0xe8e8e8);
  k.wheel(0.95, -1.25, 0.4, 0.3, 0x151515, 0xe8e8e8);
  k.wheel(-0.95, 1.25, 0.4, 0.3, 0x151515, 0xe8e8e8);
  k.wheel(0.95, 1.25, 0.4, 0.3, 0x151515, 0xe8e8e8);
  k.exhaust.position.set(-0.6, 0.4, 1.95);
  return k.root;
}

// МАСЛКАР: длинный капот с воздухозаборником, две полосы через всю машину, широкие задние колеса
function createMuscleCar(options = {}) {
  const o = Object.assign({ bodyColor: 0xe07a12, stripeColor: 0x141414 }, options);
  const k = vehicleKit({ shake: 0.03, shakeRate: 17 });
  k.part(2.0, 0.55, 4.9, o.bodyColor).position.set(0, 0.65, 0);
  k.wedge(1.7, [[-0.35, 0.92], [0.15, 1.42], [1.25, 1.42], [1.95, 0.92]], raceGlass);
  k.part(1.62, 0.06, 1.05, o.bodyColor).position.set(0, 1.44, 0.7);
  k.part(0.7, 0.2, 1.1, o.stripeColor).position.set(0, 1.02, -1.3); // заборник
  for (const x of [-0.3, 0.3]) k.part(0.22, 0.02, 5.0, o.stripeColor).position.set(x, 0.935, 0);
  k.part(2.04, 0.12, 0.08, 0x9a9da2).position.set(0, 0.45, -2.47); // хромированный бампер
  k.part(2.04, 0.12, 0.08, 0x9a9da2).position.set(0, 0.45, 2.47);
  k.part(1.6, 0.25, 0.06, 0x111111).position.set(0, 0.75, -2.46); // решетка
  for (const x of [-0.75, 0.75]) k.lamp(x, 0.75, -2.48, 0xfff2b0, 0.22, 0.22);
  for (const x of [-0.7, 0.7]) k.lamp(x, 0.75, 2.48, 0xff3030, 0.45, 0.12);
  k.wheel(-1.0, -1.6, 0.4, 0.32);
  k.wheel(1.0, -1.6, 0.4, 0.32);
  k.wheel(-1.03, 1.55, 0.45, 0.46);
  k.wheel(1.03, 1.55, 0.45, 0.46);
  k.exhaust.position.set(0.7, 0.35, 2.5);
  return k.root;
}

// ДРИФТ-КУПЕ: угловатое купе с расширенными арками, большим антикрылом и раскосым развалом колес
function createDriftCar(options = {}) {
  const o = Object.assign({ bodyColor: 0x8a2be0, accentColor: 0x2de0c0 }, options);
  const k = vehicleKit({ shake: 0.018, shakeRate: 26 });
  k.part(1.85, 0.5, 4.4, o.bodyColor).position.set(0, 0.55, 0);
  k.wedge(1.65, [[-0.7, 0.8], [-0.15, 1.25], [1.0, 1.25], [1.6, 0.8]], raceGlass);
  k.part(1.55, 0.06, 1.1, o.bodyColor).position.set(0, 1.27, 0.43);
  // Расширители арок — накладки над каждым колесом
  for (const x of [-1.0, 1.0]) for (const z of [-1.4, 1.35]) k.part(0.22, 0.32, 1.1, o.bodyColor).position.set(x, 0.62, z);
  // Бирюзовая полоса-«рваный» узор по бокам и сплиттер спереди
  for (const x of [-0.94, 0.94]) {
    k.part(0.02, 0.1, 2.2, o.accentColor).position.set(x, 0.62, 0.0);
    k.part(0.02, 0.1, 0.6, o.accentColor).position.set(x, 0.48, -0.9);
  }
  k.part(1.95, 0.05, 0.3, 0x1b1b1f).position.set(0, 0.28, -2.25);
  // Большое антикрыло на высоких стойках
  k.part(1.95, 0.07, 0.5, 0x1b1b1f).position.set(0, 1.35, 2.0);
  for (const x of [-0.95, 0.95]) k.part(0.05, 0.3, 0.55, 0x1b1b1f).position.set(x, 1.3, 2.0);
  for (const x of [-0.45, 0.45]) k.part(0.06, 0.55, 0.1, 0x1b1b1f).position.set(x, 1.05, 1.95);
  for (const x of [-0.65, 0.65]) k.lamp(x, 0.68, -2.21, 0xfff2b0, 0.36, 0.1);
  for (const x of [-0.6, 0.6]) k.lamp(x, 0.7, 2.21, 0xff3030, 0.5, 0.1);
  k.wheel(-1.02, -1.4, 0.37, 0.3, 0x151515, 0xd0d4da).rotation.z = 0.08; // развал
  k.wheel(1.02, -1.4, 0.37, 0.3, 0x151515, 0xd0d4da).rotation.z = -0.08;
  k.wheel(-1.05, 1.35, 0.38, 0.4, 0x151515, 0xd0d4da).rotation.z = 0.06;
  k.wheel(1.05, 1.35, 0.38, 0.4, 0x151515, 0xd0d4da).rotation.z = -0.06;
  k.exhaust.position.set(-0.6, 0.35, 2.25);
  return k.root;
}

// ПРОТОТИП: очень низкий и длинный, закрытый фонарь кабины, киль вдоль спины и широкое заднее крыло
function createProtoCar(options = {}) {
  const o = Object.assign({ bodyColor: 0x14a35a, accentColor: 0xf2f2f2 }, options);
  const k = vehicleKit({ shake: 0.01, shakeRate: 32 });
  k.part(2.1, 0.32, 3.4, o.bodyColor).position.set(0, 0.4, 0.6);
  k.wedge(2.1, [[-1.1, 0.24], [-2.7, 0.18], [-2.7, 0.34], [-1.1, 0.62]], o.bodyColor); // нос
  // Колесные кожухи — выпуклые продольные понтоны над колесами
  for (const x of [-0.85, 0.85]) {
    k.part(0.42, 0.28, 1.2, o.bodyColor).position.set(x, 0.66, -1.65);
    k.part(0.42, 0.3, 1.4, o.bodyColor).position.set(x, 0.68, 1.55);
  }
  // Фонарь кабины и киль
  k.wedge(0.95, [[-0.9, 0.56], [-0.2, 1.08], [0.8, 1.05], [1.2, 0.56]], raceGlass);
  k.wedge(0.06, [[0.8, 0.56], [0.9, 1.05], [2.4, 1.18], [2.4, 0.56]], o.bodyColor);
  for (const x of [-0.65, 0.65]) k.part(0.03, 0.08, 3.6, o.accentColor).position.set(x, 0.57, 0.2);
  // Широкое заднее крыло
  k.part(2.1, 0.06, 0.5, 0x1b1b1f).position.set(0, 1.18, 2.35);
  for (const x of [-1.03, 1.03]) k.part(0.04, 0.5, 0.6, 0x1b1b1f).position.set(x, 0.95, 2.35);
  for (const x of [-0.82, 0.82]) k.lamp(x, 0.62, -2.21, 0xfff2b0, 0.32, 0.08);
  k.lamp(0, 0.5, 2.31, 0xff3030, 1.6, 0.06);
  k.wheel(-0.85, -1.65, 0.36, 0.34);
  k.wheel(0.85, -1.65, 0.36, 0.34);
  k.wheel(-0.85, 1.55, 0.38, 0.4);
  k.wheel(0.85, 1.55, 0.38, 0.4);
  k.exhaust.position.set(0, 0.45, 2.35);
  return k.root;
}

// ГИПЕРКАР: очень низкий клин с широкими арками, боковыми воздухозаборниками, диффузором и большим задним крылом
function createHyperCar(options = {}) {
  const o = Object.assign({ bodyColor: 0xf0a010, accentColor: 0x1b1b1f }, options);
  const k = vehicleKit({ shake: 0.008, shakeRate: 34 });
  k.part(2.1, 0.36, 4.5, o.bodyColor).position.set(0, 0.46, 0.05);
  k.wedge(2.1, [[-2.25, 0.28], [-2.45, 0.32], [-2.25, 0.5], [-1.0, 0.7], [-1.0, 0.28]], o.bodyColor); // нос
  k.wedge(1.55, [[-1.0, 0.62], [-0.15, 1.08], [1.15, 1.08], [2.0, 0.62]], raceGlass); // кабина
  // Боковые воздухозаборники и накладки над арками
  for (const x of [-1.06, 1.06]) {
    k.part(0.14, 0.26, 1.0, o.accentColor).position.set(x, 0.62, 0.55);
    k.part(0.28, 0.28, 1.1, o.bodyColor).position.set(x * 0.98, 0.58, -1.5);
    k.part(0.28, 0.3, 1.2, o.bodyColor).position.set(x * 0.98, 0.6, 1.55);
  }
  k.part(2.2, 0.05, 0.32, o.accentColor).position.set(0, 0.26, -2.4); // сплиттер
  k.part(1.6, 0.14, 0.4, o.accentColor).position.set(0, 0.3, 2.3); // диффузор
  // Заднее крыло на двух стойках
  k.part(2.1, 0.06, 0.55, o.accentColor).position.set(0, 1.12, 2.15);
  for (const x of [-0.7, 0.7]) k.part(0.06, 0.45, 0.2, o.accentColor).position.set(x, 0.88, 2.1);
  for (const x of [-0.75, 0.75]) k.lamp(x, 0.56, -2.3, 0xfff2b0, 0.4, 0.07);
  k.lamp(0, 0.6, 2.26, 0xff3030, 1.7, 0.06);
  k.wheel(-1.0, -1.55, 0.38, 0.34, 0x151515, 0xe0b030);
  k.wheel(1.0, -1.55, 0.38, 0.34, 0x151515, 0xe0b030);
  k.wheel(-1.02, 1.5, 0.4, 0.42, 0x151515, 0xe0b030);
  k.wheel(1.02, 1.5, 0.4, 0.42, 0x151515, 0xe0b030);
  k.exhaust.position.set(0, 0.4, 2.3);
  return k.root;
}

// БУГАТТИ: длинный широкий гран-турер в двух тонах (темно-синий низ, черная крыша), подковообразная решетка радиатора,
// светлая боковая линия «C» и сплошной задний фонарь
function createBugatti(options = {}) {
  const o = Object.assign({ bodyColor: 0x0f2a6b, roofColor: 0x14141a, accentColor: 0x6db8f0, chromeColor: 0xc9ced6 }, options);
  const k = vehicleKit({ shake: 0.007, shakeRate: 30 });
  k.part(2.12, 0.55, 4.8, o.bodyColor).position.set(0, 0.55, 0.05);
  k.wedge(2.0, [[-2.35, 0.32], [-2.5, 0.4], [-2.2, 0.82], [-1.0, 0.86], [-1.0, 0.3]], o.bodyColor); // нос и капот
  k.wedge(1.75, [[-1.0, 0.82], [-0.25, 1.38], [1.15, 1.38], [2.05, 0.82]], raceGlass); // кабина
  k.part(1.55, 0.06, 1.3, o.roofColor).position.set(0, 1.4, 0.45); // крыша
  k.part(0.7, 0.04, 2.2, o.roofColor).position.set(0, 0.84, -1.55); // темная вставка капота
  // Боковая линия «C»: две горизонтали и вертикаль у задней арки
  for (const x of [-1.07, 1.07]) {
    k.part(0.02, 0.07, 1.7, o.accentColor).position.set(x, 0.86, -0.1);
    k.part(0.02, 0.07, 1.0, o.accentColor).position.set(x, 0.46, 0.5);
    k.part(0.02, 0.47, 0.07, o.accentColor).position.set(x, 0.66, 0.9);
    k.part(0.26, 0.3, 1.2, o.bodyColor).position.set(x * 0.97, 0.62, -1.55);
    k.part(0.26, 0.34, 1.3, o.bodyColor).position.set(x * 0.97, 0.64, 1.6);
  }
  // Подкова радиатора: две стойки и перемычка снизу, хромированные
  k.part(0.9, 0.08, 0.06, o.chromeColor).position.set(0, 0.28, -2.52);
  for (const x of [-0.48, 0.48]) k.part(0.08, 0.5, 0.06, o.chromeColor).position.set(x, 0.55, -2.53);
  k.part(0.9, 0.34, 0.04, 0x08080a).position.set(0, 0.5, -2.5);
  for (const x of [-0.85, 0.85]) k.lamp(x, 0.7, -2.4, 0xfff2b0, 0.42, 0.1);
  k.lamp(0, 0.78, 2.46, 0xff3030, 1.9, 0.08); // сплошной задний фонарь
  k.part(1.9, 0.05, 0.3, o.roofColor).position.set(0, 1.08, 2.3); // выдвижное крыло
  k.wheel(-1.02, -1.55, 0.42, 0.36, 0x151515, o.chromeColor);
  k.wheel(1.02, -1.55, 0.42, 0.36, 0x151515, o.chromeColor);
  k.wheel(-1.04, 1.6, 0.44, 0.44, 0x151515, o.chromeColor);
  k.wheel(1.04, 1.6, 0.44, 0.44, 0x151515, o.chromeColor);
  k.exhaust.position.set(0, 0.4, 2.5);
  return k.root;
}

// КАРТ: открытая рама у самой земли, сиденье, руль, пилот в шлеме, бамперы и толстые колеса
function createKart(options = {}) {
  const o = Object.assign({ bodyColor: 0xffd21e, frameColor: 0x2a2a2e }, options);
  const k = vehicleKit({ shake: 0.03, shakeRate: 34 });
  k.part(1.2, 0.08, 2.0, o.frameColor).position.set(0, 0.2, 0);
  k.wedge(0.9, [[-1.15, 0.2], [-1.2, 0.36], [-0.5, 0.5], [-0.5, 0.2]], o.bodyColor); // обтекатель носа
  for (const x of [-0.75, 0.75]) k.part(0.22, 0.2, 1.1, o.bodyColor).position.set(x, 0.3, 0.05); // боковые понтоны
  k.part(1.8, 0.12, 0.12, o.frameColor).position.set(0, 0.28, 1.15); // задний бампер
  k.part(0.6, 0.45, 0.12, 0x1b1b1f).position.set(0, 0.55, 0.55); // спинка сиденья
  k.part(0.6, 0.1, 0.5, 0x1b1b1f).position.set(0, 0.32, 0.3);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 14), new LitMaterial({ color: 0x1b1b1f }));
  wheel.position.set(0, 0.62, -0.25);
  wheel.rotation.x = -1.0;
  k.body.add(wheel);
  // Пилот: торс и шлем
  k.part(0.5, 0.45, 0.32, 0x2050c0).position.set(0, 0.7, 0.35);
  const helmet = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), new LitMaterial({ color: 0xf2f2f2 }));
  helmet.position.set(0, 1.08, 0.32);
  k.body.add(helmet);
  k.part(0.3, 0.08, 0.04, 0x22313f).position.set(0, 1.1, 0.13); // визор
  k.wheel(-0.68, -0.75, 0.22, 0.24, 0x151515, 0xd0d4da);
  k.wheel(0.68, -0.75, 0.22, 0.24, 0x151515, 0xd0d4da);
  k.wheel(-0.72, 0.8, 0.26, 0.34, 0x151515, 0xd0d4da);
  k.wheel(0.72, 0.8, 0.26, 0.34, 0x151515, 0xd0d4da);
  k.exhaust.position.set(0.4, 0.4, 1.15);
  return k.root;
}

// МОТОРОЛЛЕР доставщика пиццы (квест 2.15): тонкий кузов, площадка для ног, щиток, руль, сиденье, красный термобокс сзади,
// курьер в шлеме. Колеса поменьше, едет юрко; половина ширины кузова для столкновений — 0,5
function createScooter(options = {}) {
  const o = Object.assign({ bodyColor: 0xd8282a, frameColor: 0x2a2a2e }, options);
  const k = vehicleKit({ shake: 0.02, shakeRate: 30 });
  k.part(0.42, 0.08, 1.0, o.frameColor).position.set(0, 0.28, -0.05); // площадка для ног
  k.part(0.52, 0.38, 0.8, o.bodyColor).position.set(0, 0.5, 0.6); // задний обтекатель над мотором
  k.part(0.38, 0.72, 0.12, o.bodyColor).position.set(0, 0.62, -0.5); // щиток
  k.part(0.7, 0.06, 0.07, o.frameColor).position.set(0, 1.0, -0.52); // руль
  k.part(0.09, 0.45, 0.09, o.frameColor).position.set(0, 0.72, -0.55); // вилка
  k.part(0.4, 0.1, 0.6, 0x1b1b1f).position.set(0, 0.76, 0.5); // сиденье
  k.part(0.62, 0.48, 0.58, 0xf2f2f2).position.set(0, 1.12, 1.0); // термобокс
  k.part(0.64, 0.12, 0.6, o.bodyColor).position.set(0, 1.4, 1.0); // красная крышка бокса
  k.lamp(0, 0.82, -0.6, 0xfff2b0, 0.22, 0.14);
  k.lamp(0, 0.5, 1.02, 0xe03030, 0.4, 0.1);
  // Курьер: торс, шлем, ноги на площадке
  k.part(0.4, 0.5, 0.26, 0x2f6fb0).position.set(0, 1.12, 0.35);
  const helmet = new THREE.Mesh(new THREE.IcosahedronGeometry(0.19, 1), new LitMaterial({ color: o.bodyColor }));
  helmet.position.set(0, 1.55, 0.3);
  k.body.add(helmet);
  for (const x of [-0.14, 0.14]) k.part(0.12, 0.12, 0.5, 0x2a3040).position.set(x, 0.42, 0.0);
  k.wheel(0, -0.8, 0.26, 0.14, 0x151515, 0xd0d4da);
  k.wheel(0, 0.8, 0.26, 0.16, 0x151515, 0xd0d4da);
  k.exhaust.position.set(0.2, 0.3, 1.0);
  return k.root;
}
