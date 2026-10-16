// src/engine/materials.js
// Освещаемый материал для всех моделей: каждая грань закрашена одним тоном в зависимости от того,
// как она повернута к солнцу (flat shading), без бликов. Свет ставит scene.js (setDaylight).
// Светящиеся вещи (фонари, фары, метки, капли дождя) остаются на MeshBasicMaterial: свет им не нужен.
//
// Зависимость: глобальный THREE (three.js r128+). Подключается сразу после three.js, до моделей.

class LitMaterial extends THREE.MeshPhongMaterial {
  constructor(params = {}) {
    super({ flatShading: true, shininess: 0, specular: 0x000000, ...params });
  }
}
