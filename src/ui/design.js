// src/ui/design.js
// ДИЗАЙН-СИСТЕМА ДЛЯ КОДА. Те же значения, что в src/ui/design.css (переменные :root), но числами: для цветов сцены (three.js), шрифта на холсте
// (карта) и периодов анимаций. Новый цвет или шрифт добавляется сюда и в design.css одновременно; в остальных файлах числа не пишут.
// Подключается раньше остальных скриптов игры (docs/design-system.md).

const DESIGN = {
  font: "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  fontSize: { h1: 20, h2: 16, text: 13, small: 11, display: 26 }, // px, как --fs-*
  color: {
    accent: 0x8fd0ff, // заголовки, выбранное
    warm: 0xffe27a, // то, с чем можно взаимодействовать: двери, вещи, ромб цели
    path: 0x37ff7a, // направление к цели
    car: 0x4ff0e0, // ваша машина
    ok: 0x3fa35b,
    danger: 0xff6b5b,
  },
  css: (hex) => '#' + hex.toString(16).padStart(6, '0'), // 0x37ff7a → '#37ff7a' (холст карты)
  motion: { pulse: 2.4, bob: 3, spin: 1.5 }, // секунды периода пульса; скорости покачивания и вращения меток (рад/с)
};
