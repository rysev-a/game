// src/player/devices.js
// ПРИБОРЫ ГЕРОЯ (docs/mechanics/devices.md). Прибор — данные: defineDevice(id, { name, kind, tags, ... }).
// Сейчас есть один вид — надеваемый (wear): прибор не лежит в инвентаре, а надет на героя
// и виден на модели. Что он дает, говорят теги; остальной код спрашивает тег, а не прибор:
//   hasDeviceTag('saves') — можно ли сохраняться (без браслета панели сохранений нет вообще)
//
// API:
//   defineDevice(id, def)   — описать прибор: name, desc (для панели справа), kind, wear ('wristL' | 'wristR'), model(), tags, wornText
//   wearDevice(id)          — надеть (возвращает false, если уже надет); quiet — без сообщения
//   takeOffDevice(id)       — снять (для ДЕМО и проверок)
//   isWorn(id), hasDeviceTag(tag)
//   heroDevices.worn        — id надетых приборов; пишется в сохранение (src/player/saves.js)

const DEVICES = {};

function defineDevice(id, def) {
  DEVICES[id] = Object.assign({ id, tags: [] }, def);
  return DEVICES[id];
}

// Браслет возврата (сюжет 3.04, чертеж с голубятни). Надевается на левое запястье. С ним появляются
// сохранения: браслет запоминает мир, и в него можно вернуться, сохранив память
defineDevice('bracelet', {
  name: 'Браслет возврата',
  desc: 'Чертеж Веры с голубятни. Запоминает мир, и в него можно вернуться — с памятью.',
  kind: 'passive',
  wear: 'wristL',
  model: () => createBraceletModel(),
  tags: ['rewind', 'saves'],
  wornText: 'Браслет защелкнулся на руке. Теперь можно сохраняться',
});

const heroDevices = { worn: [], meshes: {} };

const isWorn = (id) => heroDevices.worn.includes(id);
const hasDeviceTag = (tag) => heroDevices.worn.some((id) => DEVICES[id].tags.includes(tag));

function wearDevice(id, quiet = false) {
  const d = DEVICES[id];
  if (!d || isWorn(id)) return false;
  heroDevices.worn.push(id);
  if (d.wear && d.model) heroDevices.meshes[id] = player.attach(d.wear, d.model());
  if (typeof renderInventory === 'function') renderInventory(); // могла появиться панель сохранений
  if (!quiet) showToast(d.wornText || 'Надето: ' + d.name, 3500);
  return true;
}

function takeOffDevice(id) {
  const i = heroDevices.worn.indexOf(id);
  if (i < 0) return false;
  heroDevices.worn.splice(i, 1);
  const mesh = heroDevices.meshes[id];
  if (mesh && mesh.parent) mesh.parent.remove(mesh);
  delete heroDevices.meshes[id];
  if (typeof renderInventory === 'function') renderInventory();
  return true;
}
