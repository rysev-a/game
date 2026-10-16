// src/player/icons.js
// ПИКСЕЛЬНЫЕ ЗНАЧКИ 12×12 для инвентаря и меню сохранений. Каждый значок — 12 строк по 12
// символов: «.» — прозрачно, остальные буквы — цвета из palette значка. Рисуются на canvas и
// выводятся картинками с image-rendering: pixelated, поэтому остаются квадратными пикселями.
//   pixelIcon('wrench') → <img> со значком

const PIXEL_ART = {
  // --- вещи ---
  wrench: {
    palette: { g: '#c8ced6', d: '#7d8691' },
    rows: [
      '..gg....gg..',
      '..ggg..ggg..',
      '..gggggggg..',
      '...gggggg...',
      '....ggdd....',
      '....ggdd....',
      '....ggdd....',
      '....ggdd....',
      '....ggdd....',
      '....ggdd....',
      '....gggd....',
      '.....dd.....',
    ],
  },
  bracelet: {
    // браслет возврата: темный обод, на нем светящийся голубой экран
    palette: { d: '#2a2e38', g: '#5a6272', c: '#4ee6ff', C: '#c8f8ff' },
    rows: [
      '............',
      '....gggg....',
      '..gg....gg..',
      '.g........g.',
      '.g........g.',
      'dg.cccccc.gd',
      'dg.cCCCCc.gd',
      'dg.cccccc.gd',
      '.d........d.',
      '..dd....dd..',
      '....dddd....',
      '............',
    ],
  },
  screwdriver: {
    palette: { s: '#c8ced6', h: '#3fa35b', H: '#6fd08a' },
    rows: [
      '.....ss.....',
      '.....ss.....',
      '.....ss.....',
      '.....ss.....',
      '.....ss.....',
      '....hhhh....',
      '...hHhhhh...',
      '...hHhhhh...',
      '...hHhhhh...',
      '...hHhhhh...',
      '...hhhhhh...',
      '....hhhh....',
    ],
  },
  keys: {
    palette: { y: '#e0c341', Y: '#a88a1e' },
    rows: [
      '..yyyy......',
      '.yy..yy.....',
      '.y....y.....',
      '.yy..yy.....',
      '..yyyyY.....',
      '....yY......',
      '....yY......',
      '....yyyy....',
      '....yY......',
      '....yyyy....',
      '....yY......',
      '.....Y......',
    ],
  },
  wallet: {
    palette: { b: '#4a2a14', B: '#8a5a2e', G: '#e0c341' },
    rows: [
      '............',
      '............',
      'bbbbbbbbbbbb',
      'bBBBBBBBBBBb',
      'bBBBBBBBBBBb',
      'bBBBBBBBBGGb',
      'bBBBBBBBBGGb',
      'bBBBBBBBBBBb',
      'bBBBBBBBBBBb',
      'bbbbbbbbbbbb',
      '............',
      '............',
    ],
  },
  phone: {
    palette: { k: '#1c1f26', B: '#3a7bd5', w: '#c8ced6' },
    rows: [
      '...kkkkkk...',
      '...kBBBBk...',
      '...kBBBBk...',
      '...kBBBBk...',
      '...kBBBBk...',
      '...kBBBBk...',
      '...kBBBBk...',
      '...kBBBBk...',
      '...kBBBBk...',
      '...kkkkkk...',
      '...kkwwkk...',
      '...kkkkkk...',
    ],
  },
  badge: {
    palette: { w: '#d6d9de', d: '#8a909a', B: '#3a7bd5' },
    rows: [
      '.....ww.....',
      '....wwww....',
      '..wwwwwwww..',
      'wwwwwBBwwwww',
      '.wwwwBBwwwd.',
      '..wwwBBwwd..',
      '..wwwwwwwd..',
      '...wwwwwd...',
      '...wwwwdd...',
      '....wwdd....',
      '.....dd.....',
      '............',
    ],
  },
  notebook: {
    palette: { r: '#c43a3a', W: '#f1ede2', w: '#9aa0a8' },
    rows: [
      '.rrrrrrrrr..',
      '.rWWWWWWWr..',
      'rrWwwwwwWr..',
      'rrWWWWWWWr..',
      'rrWwwwwwWr..',
      'rrWWWWWWWr..',
      'rrWwwwwwWr..',
      'rrWWWWWWWr..',
      'rrWWWWWWWr..',
      '.rrrrrrrrr..',
      '............',
      '............',
    ],
  },
  flashlight: {
    palette: { y: '#e0c341', Y: '#fff6b0', g: '#555a66', d: '#3a3e48' },
    rows: [
      '...yyyyyy...',
      '...yYYYYy...',
      '....gggg....',
      '....gggg....',
      '....gddg....',
      '....gddg....',
      '....gddg....',
      '....gddg....',
      '....gggg....',
      '....gggg....',
      '....dddd....',
      '............',
    ],
  },

  canister: {
    palette: { g: '#9aa0a8', y: '#e0c341', r: '#8a1c1c', R: '#d23c3c', W: '#f1ede2' },
    rows: [
      '...gggg.yy..',
      '...g..gyyy..',
      '..rrrrrrrr..',
      '.rRRRRRRRRr.',
      '.rRRRRRRRRr.',
      '.rRRWWWWRRr.',
      '.rRRWrrWRRr.',
      '.rRRWWWWRRr.',
      '.rRRRRRRRRr.',
      '.rRRRRRRRRr.',
      '.rrrrrrrrrr.',
      '............',
    ],
  },

  eye: {
    palette: { d: '#9aa0a8', w: '#f1ede2', B: '#3a7bd5', k: '#1c1f26' },
    rows: [
      '............',
      '............',
      '...dddddd...',
      '..dwwwwwwd..',
      '.dwwwBBwwwd.',
      'dwwwBkkBwwwd',
      'dwwwBkkBwwwd',
      '.dwwwBBwwwd.',
      '..dwwwwwwd..',
      '...dddddd...',
      '............',
      '............',
    ],
  },

  // --- меню ---
  save: {
    // дискета: «сохранить»
    palette: { b: '#2a4a8a', s: '#c8ced6', l: '#f1ede2', k: '#1c1f26' },
    rows: [
      'bbbbbbbbbbb.',
      'bbsssssskbb.',
      'bbsssssskbb.',
      'bbsssbbskbb.',
      'bbbbbbbbbbb.',
      'bbbbbbbbbbbb',
      'bllllllllllb',
      'bllllllllllb',
      'bllkkkkkkllb',
      'bllllllllllb',
      'bllkkkkkkllb',
      'bbbbbbbbbbbb',
    ],
  },
  trash: {
    // корзина: «очистить»
    palette: { k: '#9aa0a8', g: '#c8ced6', d: '#7d8691' },
    rows: [
      '....kkkk....',
      '..kkkkkkkk..',
      '............',
      '..gggggggg..',
      '..gdgdgdgg..',
      '..gdgdgdgg..',
      '..gdgdgdgg..',
      '..gdgdgdgg..',
      '..gdgdgdgg..',
      '..gggggggg..',
      '...gggggg...',
      '............',
    ],
  },
  slot: {
    // звездочка: слот с сохранением
    palette: { Y: '#f0d040', o: '#c89a10' },
    rows: [
      '.....YY.....',
      '.....YY.....',
      '....YYYY....',
      'YYYYYYYYYYYY',
      '.YYYYYYYYYo.',
      '..YYYYYYYo..',
      '...YYYYYo...',
      '..YYYYYYYo..',
      '..YYYooYYo..',
      '.YYo....oYo.',
      '.Yo......oo.',
      '............',
    ],
  },
  chevronDown: {
    palette: { w: '#e6e6e6' },
    rows: [
      '............',
      '............',
      '..ww....ww..',
      '...ww..ww...',
      '....wwww....',
      '.....ww.....',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
  },
  chevronUp: {
    palette: { w: '#e6e6e6' },
    rows: [
      '............',
      '............',
      '.....ww.....',
      '....wwww....',
      '...ww..ww...',
      '..ww....ww..',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
  },
  sun: {
    palette: { y: '#ffd24a', o: '#ffb020' },
    rows: [
      '............',
      '.....yy.....',
      '..y..yy..y..',
      '...y....y...',
      '....yyyy....',
      '.yy.yyyy.yy.',
      '.yy.yyyy.yy.',
      '....yyyy....',
      '...y....y...',
      '..y..yy..y..',
      '.....yy.....',
      '............',
    ],
  },
  moon: {
    palette: { m: '#dfe6f5', d: '#aab6d4' },
    rows: [
      '............',
      '....mmmm....',
      '...mmm......',
      '..mmm.......',
      '..mmm.......',
      '..mmm.......',
      '..mmmd......',
      '..mmmm....m.',
      '...mmmm..mm.',
      '....mmmmmm..',
      '.....mmmm...',
      '............',
    ],
  },
};

const pixelIconCache = {};

// Адрес картинки значка (рисуем на canvas один раз)
function pixelIconURL(id) {
  if (pixelIconCache[id]) return pixelIconCache[id];
  const art = PIXEL_ART[id] || PIXEL_ART.keys;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 12;
  const c = cv.getContext('2d');
  art.rows.forEach((row, y) => {
    for (let x = 0; x < 12; x++) {
      const ch = row[x];
      if (ch === '.' || !art.palette[ch]) continue;
      c.fillStyle = art.palette[ch];
      c.fillRect(x, y, 1, 1);
    }
  });
  pixelIconCache[id] = cv.toDataURL();
  return pixelIconCache[id];
}

// <img> со значком; размер и «пиксельность» задаются в CSS (класс px)
function pixelIcon(id) {
  const img = new Image();
  img.src = pixelIconURL(id);
  img.className = 'px';
  img.draggable = false;
  return img;
}
