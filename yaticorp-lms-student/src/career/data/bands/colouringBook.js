/**
 * Colouring Book (2026-11-16, replaces Pixel Painter for Young Thinkers; same game id "picture-logic"). Pure, so node
 * can test it.
 *
 * Outline pictures drawn in a 100 × 100 box, like a drawing book. Each picture is a list of parts ("regions"), drawn
 * in order (later parts on top). A part has an SVG path, the colour it should be, and where its number goes in
 * colour-by-number mode. `decor` is drawn on top and cannot be coloured (eyes, strings, antennae).
 *
 * Modes, by level: copy (a small coloured example to follow), numbers (colour by number) and remember (the example
 * shows for a few seconds, then hides).
 */

export const COLOURS = {
  R: { name: 'Red', hex: '#ef4444' },
  O: { name: 'Orange', hex: '#fb923c' },
  Y: { name: 'Yellow', hex: '#facc15' },
  G: { name: 'Green', hex: '#22c55e' },
  B: { name: 'Blue', hex: '#38bdf8' },
  V: { name: 'Purple', hex: '#a855f7' },
  P: { name: 'Pink', hex: '#f472b6' },
  K: { name: 'Brown', hex: '#a16207' },
  N: { name: 'Navy', hex: '#1e3a8a' },
  A: { name: 'Grey', hex: '#9ca3af' }
};
export const COLOUR_KEYS = Object.keys(COLOURS);

const r1 = (n) => Math.round(n * 10) / 10;
const circle = (cx, cy, r) => `M${r1(cx - r)} ${r1(cy)} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
const ellipse = (cx, cy, rx, ry) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`;
const rect = (x, y, w, h) => `M${x} ${y} h${w} v${h} h${-w} Z`;
const part = (d, c, at) => ({ d, c, at });

/** The sun's eight rays, as one part. */
const rays = (() => {
  let d = '';
  for (let k = 0; k < 8; k += 1) {
    const a = (k * Math.PI) / 4;
    const tip = [50 + Math.cos(a) * 46, 50 + Math.sin(a) * 46];
    const l = [50 + Math.cos(a - 0.28) * 24, 50 + Math.sin(a - 0.28) * 24];
    const rr = [50 + Math.cos(a + 0.28) * 24, 50 + Math.sin(a + 0.28) * 24];
    d += `M${r1(l[0])} ${r1(l[1])} L${r1(tip[0])} ${r1(tip[1])} L${r1(rr[0])} ${r1(rr[1])} Z `;
  }
  return d.trim();
})();

/** Five petals round a centre. */
const petals = (cx, cy, dist, r, c) =>
  [-90, -18, 54, 126, 198].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const x = cx + Math.cos(a) * dist;
    const y = cy + Math.sin(a) * dist;
    return part(circle(x, y, r), c, [r1(x), r1(y)]);
  });

export const PICTURES = [
  {
    name: 'an apple', emoji: '🍎',
    parts: [
      part(rect(48, 12, 5, 20), 'K', [50.5, 18]),
      part('M50 30 C35 20 15 28 17 50 C19 72 35 88 50 82 C65 88 81 72 83 50 C85 28 65 20 50 30 Z', 'R', [50, 58]),
      part('M54 22 C62 10 76 12 78 16 C72 24 62 26 54 22 Z', 'G', [67, 18])
    ]
  },
  {
    name: 'a sun', emoji: '☀️',
    parts: [part(rays, 'O', [93, 50]), part(circle(50, 50, 22), 'Y', [50, 50])],
    decor: [{ d: `${circle(43, 46, 2.2)} ${circle(57, 46, 2.2)}`, fill: '#1f2937' }, { d: 'M42 56 Q50 63 58 56' }]
  },
  {
    name: 'three balloons', emoji: '🎈',
    parts: [part(ellipse(29, 38, 15, 19), 'R', [27, 38]), part(ellipse(72, 42, 15, 19), 'B', [74, 42]), part(ellipse(51, 30, 15, 19), 'Y', [51, 28])],
    decor: [{ d: 'M29 57 Q34 76 50 94 M51 49 Q47 72 50 94 M72 61 Q66 78 50 94' }]
  },
  {
    name: 'an ice cream', emoji: '🍦',
    parts: [
      part('M34 50 L66 50 L50 94 Z', 'O', [50, 72]),
      part(circle(50, 44, 17), 'P', [50, 50]),
      part(circle(50, 24, 13), 'K', [50, 25]),
      part(circle(50, 8, 5), 'R', [50, 8])
    ]
  },
  {
    name: 'a fish', emoji: '🐟',
    parts: [
      part('M24 50 L6 34 L8 66 Z', 'Y', [13, 50]),
      part('M44 32 C48 18 62 20 66 32 Z', 'Y', [56, 27]),
      part(ellipse(52, 50, 32, 20), 'O', [50, 54])
    ],
    decor: [{ d: circle(70, 45, 3), fill: '#1f2937' }, { d: 'M40 38 Q34 50 40 62' }, { d: `${circle(90, 22, 3)} ${circle(84, 12, 2)}` }]
  },
  {
    name: 'an umbrella', emoji: '☂️',
    parts: [
      part('M47 46 L53 46 L53 82 C53 95 35 95 35 84 L41 84 C41 89 47 89 47 82 Z', 'K', [50, 66]),
      part('M10 50 C10 27 30 12 50 12 C40 20 34 34 34 50 Q22 44 10 50 Z', 'R', [24, 38]),
      part('M34 50 C34 34 40 20 50 12 C60 20 66 34 66 50 Q50 44 34 50 Z', 'Y', [50, 34]),
      part('M66 50 C66 34 60 20 50 12 C70 12 90 27 90 50 Q78 44 66 50 Z', 'B', [76, 38])
    ]
  },
  {
    name: 'a house', emoji: '🏠',
    parts: [
      part(rect(64, 20, 9, 18), 'K', [68.5, 27]),
      part(rect(22, 48, 56, 42), 'Y', [30, 58]),
      part('M14 50 L50 18 L86 50 Z', 'R', [50, 38]),
      part(rect(40, 64, 14, 26), 'K', [47, 78]),
      part(rect(58, 56, 14, 12), 'B', [65, 62])
    ]
  },
  {
    name: 'a tree', emoji: '🌳',
    parts: [
      part(rect(44, 58, 12, 34), 'K', [50, 80]),
      part('M30 64 C12 64 12 40 27 38 C25 21 44 13 52 22 C60 11 81 19 77 36 C92 40 90 64 72 64 Z', 'G', [48, 48]),
      part(circle(34, 44, 5), 'R', [34, 44]),
      part(circle(60, 30, 5), 'R', [60, 30]),
      part(circle(68, 52, 5), 'R', [68, 52])
    ]
  },
  {
    name: 'a butterfly', emoji: '🦋',
    parts: [
      part('M48 46 C30 14 8 20 12 38 C14 50 34 52 48 50 Z', 'P', [28, 36]),
      part('M52 46 C70 14 92 20 88 38 C86 50 66 52 52 50 Z', 'P', [72, 36]),
      part('M48 53 C34 55 18 64 24 77 C30 87 44 75 48 59 Z', 'V', [34, 68]),
      part('M52 53 C66 55 82 64 76 77 C70 87 56 75 52 59 Z', 'V', [66, 68]),
      part(ellipse(50, 54, 4, 22), 'K', [50, 56])
    ],
    decor: [{ d: 'M48 33 Q42 19 35 16 M52 33 Q58 19 65 16' }]
  },
  {
    name: 'a rocket', emoji: '🚀',
    parts: [
      part('M42 80 L50 97 L58 80 Z', 'O', [50, 86]),
      part('M38 60 L23 82 L38 78 Z', 'R', [32, 74]),
      part('M62 60 L77 82 L62 78 Z', 'R', [68, 74]),
      part(rect(38, 30, 24, 50), 'B', [50, 70]),
      part('M38 30 C40 20 44 14 50 6 C56 14 60 20 62 30 Z', 'R', [50, 22]),
      part(circle(50, 47, 8), 'Y', [50, 47])
    ]
  },
  {
    name: 'a car', emoji: '🚗',
    parts: [
      part('M8 64 L8 52 Q10 47 27 46 L37 28 L66 28 L77 46 L88 48 Q93 50 93 64 Z', 'R', [15, 56]),
      part('M39 44 L43 32 L50 32 L50 44 Z', 'B', [46, 39]),
      part('M55 44 L55 32 L63 32 L69 44 Z', 'B', [61, 39]),
      part(circle(29, 65, 9), 'K', [29, 65]),
      part(circle(72, 65, 9), 'K', [72, 65]),
      part(circle(86, 54, 4.5), 'Y', [86, 54])
    ]
  },
  {
    name: 'a flower', emoji: '🌸',
    parts: [
      part(rect(47, 48, 6, 46), 'G', [50, 88]),
      part('M50 76 C40 64 26 68 24 72 C32 80 44 80 50 76 Z', 'G', [36, 74]),
      part('M52 66 C62 54 76 58 78 62 C70 70 58 70 52 66 Z', 'G', [66, 63]),
      ...petals(50, 32, 16, 11, 'P'),
      part(circle(50, 32, 9), 'Y', [50, 32])
    ]
  }
];

/** A five-point star. */
const star = (cx, cy, r) => {
  const pts = Array.from({ length: 10 }, (_, k) => {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    return `${r1(cx + Math.cos(a) * rr)} ${r1(cy + Math.sin(a) * rr)}`;
  });
  return `M${pts.join(' L')} Z`;
};
/** One band of a rainbow centred on (cx, cy): from radius r out to r + w. */
const band = (cx, cy, r, w) => `M${cx - r - w} ${cy} A${r + w} ${r + w} 0 0 1 ${cx + r + w} ${cy} L${cx + r} ${cy} A${r} ${r} 0 0 0 ${cx - r} ${cy} Z`;
const WHITE = '#ffffff';

/**
 * Scenes (2026-11-17, the user: "not only a single object, a place like a garden — attractive places, and the level
 * increasing"): whole places, from five parts up to fourteen. Shown coloured for 7 s, then hidden; coloured from memory.
 */
export const SCENES = [
  {
    name: 'a sunny garden', emoji: '🌻',
    parts: [part(rect(0, 0, 100, 62), 'B', [12, 40]), part(rect(0, 62, 100, 38), 'G', [70, 84]), part(circle(78, 20, 11), 'Y', [78, 20]), part(circle(30, 48, 10), 'P', [24, 44]), part(circle(30, 48, 4.5), 'Y', [30, 48])],
    decor: [{ d: 'M30 58 L30 86 M30 74 Q22 68 18 72' }]
  },
  {
    name: 'a duck pond', emoji: '🦆',
    parts: [part(rect(0, 0, 100, 50), 'B', [15, 20]), part(rect(0, 50, 100, 50), 'G', [10, 92]), part(ellipse(50, 74, 38, 16), 'N', [26, 78]), part(ellipse(52, 70, 12, 7), 'Y', [50, 71]), part(circle(62, 60, 6), 'Y', [62, 60]), part('M67 58 L76 61 L67 64 Z', 'O', [70, 61])],
    decor: [{ d: circle(63.5, 58.5, 1.2), fill: '#1f2937' }]
  },
  {
    name: 'a house on a hill', emoji: '🏡',
    parts: [part(rect(0, 0, 100, 100), 'B', [85, 40]), part('M0 72 Q50 44 100 72 L100 100 L0 100 Z', 'G', [20, 88]), part(rect(36, 46, 28, 26), 'Y', [42, 56]), part('M32 48 L50 30 L68 48 Z', 'R', [50, 42]), part(rect(46, 58, 9, 14), 'K', [50.5, 65]), part(circle(14, 16, 8), 'O', [14, 16])]
  },
  {
    name: 'the beach', emoji: '🏖️',
    parts: [part(rect(0, 0, 100, 44), 'B', [15, 22]), part(rect(0, 44, 100, 22), 'N', [50, 55]), part('M0 66 Q50 58 100 66 L100 100 L0 100 Z', 'Y', [20, 88]), part(circle(82, 16, 9), 'O', [82, 16]), part('M50 66 Q66 46 82 66 Z', 'R', [66, 60]), part(circle(28, 84, 7), 'P', [28, 84]), part('M12 38 L38 38 L33 46 L17 46 Z', 'K', [25, 41])],
    decor: [{ d: 'M66 66 L66 92', fill: 'none' }, { d: 'M24 37 L24 22 L34 34 Z', fill: WHITE }]
  },
  {
    name: 'a park', emoji: '🌳',
    parts: [part(rect(0, 0, 100, 66), 'B', [48, 50]), part(rect(0, 66, 100, 34), 'G', [50, 90]), part(rect(17, 40, 8, 30), 'K', [21, 58]), part(circle(21, 32, 15), 'G', [21, 30]), part(rect(54, 62, 32, 6), 'O', [70, 65]), part('M72 8 L80 19 L72 30 L64 19 Z', 'V', [72, 19]), part(circle(42, 14, 7), 'Y', [42, 14]), part(circle(91, 72, 7), 'P', [91, 72])],
    decor: [{ d: 'M57 68 L57 76 M83 68 L83 76 M72 30 Q68 38 74 44 Q78 50 72 56' }]
  },
  {
    name: 'a night sky', emoji: '🌙',
    parts: [part(rect(0, 0, 100, 70), 'N', [40, 40]), part(rect(0, 70, 100, 30), 'G', [12, 90]), part('M72 8 A16 16 0 1 0 88 34 A12 12 0 1 1 72 8 Z', 'Y', [72, 24]), part(star(20, 18, 6), 'Y', [20, 18]), part(star(46, 30, 5), 'Y', [46, 30]), part(rect(54, 54, 28, 24), 'O', [60, 64]), part('M50 56 L68 40 L86 56 Z', 'R', [68, 50]), part(rect(70, 60, 8, 8), 'Y', [74, 64])]
  },
  {
    name: 'a farm', emoji: '🐄',
    parts: [part(rect(0, 0, 100, 60), 'B', [60, 30]), part(rect(0, 60, 100, 40), 'G', [55, 94]), part(rect(10, 40, 34, 36), 'R', [16, 50]), part('M6 42 L27 22 L48 42 Z', 'K', [27, 35]), part(rect(21, 56, 12, 20), 'Y', [27, 66]), part(circle(84, 14, 8), 'Y', [84, 14]), part('M56 76 Q68 50 80 76 Z', 'O', [68, 68]), part(ellipse(80, 86, 9, 6), 'P', [79, 86]), part(circle(90, 81, 5), 'P', [91, 81])],
    decor: [{ d: 'M21 56 L33 76 M33 56 L21 76' }, { d: circle(91.5, 80, 0.9), fill: '#1f2937' }]
  },
  {
    name: 'under the sea', emoji: '🐠',
    parts: [part(rect(0, 0, 100, 84), 'B', [50, 12]), part(rect(0, 84, 100, 16), 'Y', [50, 93]), part(ellipse(32, 30, 13, 8), 'O', [32, 30]), part('M19 30 L8 22 L8 38 Z', 'O', [11, 30]), part(ellipse(68, 56, 11, 7), 'P', [68, 56]), part('M79 56 L90 49 L90 63 Z', 'P', [87, 56]), part('M14 84 Q8 72 16 62 Q22 52 16 42 L20 42 Q26 54 20 64 Q14 74 20 84 Z', 'G', [16, 66]), part(star(78, 86, 7), 'R', [78, 86]), part(ellipse(44, 88, 7, 4), 'V', [44, 88])],
    decor: [{ d: circle(38, 28, 1.6), fill: '#1f2937' }, { d: circle(62, 54, 1.4), fill: '#1f2937' }, { d: `${circle(50, 20, 2.5)} ${circle(55, 12, 1.8)} ${circle(84, 34, 2)}`, fill: WHITE }]
  },
  {
    name: 'a playground', emoji: '🛝',
    parts: [part(rect(0, 0, 100, 68), 'B', [50, 10]), part(rect(0, 68, 100, 32), 'G', [12, 92]), part(rect(44, 36, 10, 40), 'K', [49, 56]), part('M54 36 L62 36 L88 74 L79 76 Z', 'R', [70, 56]), part(rect(12, 62, 16, 5), 'Y', [20, 64.5]), part(ellipse(32, 18, 7, 9), 'V', [32, 18]), part(circle(86, 14, 8), 'Y', [86, 14]), part(circle(66, 86, 6), 'O', [66, 86]), part(circle(90, 88, 6), 'P', [90, 88]), part('M40 36 L49 26 L58 36 Z', 'B', [49, 32])],
    decor: [{ d: 'M8 76 L14 30 L26 30 L32 76 M14 31 L14 62 M26 31 L26 62 M32 27 L32 46' }]
  },
  {
    name: 'a rainbow valley', emoji: '🌈',
    parts: [part(rect(0, 0, 100, 100), 'B', [10, 12]), part(band(50, 74, 34, 6), 'R', [50, 43]), part(band(50, 74, 28, 6), 'O', [50, 49]), part(band(50, 74, 22, 6), 'Y', [50, 55]), part(band(50, 74, 16, 6), 'G', [50, 61]), part(band(50, 74, 10, 6), 'V', [50, 67]), part('M0 70 Q30 56 60 72 Q80 62 100 70 L100 100 L0 100 Z', 'G', [50, 88]), part(circle(88, 14, 8), 'Y', [88, 14]), part(circle(20, 86, 5), 'P', [20, 86]), part(circle(78, 88, 5), 'R', [78, 88])],
    decor: [{ d: `${circle(16, 30, 6)} ${circle(24, 28, 7)} ${circle(31, 31, 5)}`, fill: WHITE }]
  },
  {
    name: 'a city street', emoji: '🏙️',
    parts: [part(rect(0, 0, 100, 74), 'B', [50, 8]), part(rect(4, 24, 22, 50), 'V', [15, 30]), part(rect(30, 12, 20, 62), 'O', [40, 20]), part(rect(54, 30, 22, 44), 'P', [65, 36]), part(rect(80, 40, 18, 34), 'G', [89, 46]), part(rect(10, 40, 10, 10), 'Y', [15, 45]), part(rect(35, 30, 10, 10), 'Y', [40, 35]), part(rect(59, 48, 12, 10), 'Y', [65, 53]), part(rect(0, 74, 100, 26), 'A', [10, 90]), part('M30 88 L34 80 L56 80 L62 88 L66 88 L66 94 L26 94 L26 88 Z', 'R', [46, 89]), part(circle(88, 14, 7), 'Y', [88, 14])],
    decor: [{ d: `${circle(34, 95, 3.5)} ${circle(58, 95, 3.5)}`, fill: '#1f2937' }, { d: 'M5 82 L20 82 M40 82 M80 82 L95 82' }]
  },
  {
    name: 'a castle', emoji: '🏰',
    parts: [part(rect(0, 0, 100, 74), 'B', [50, 8]), part(rect(0, 74, 100, 26), 'G', [10, 92]), part(rect(26, 44, 48, 34), 'A', [36, 54]), part(rect(14, 32, 16, 46), 'A', [22, 50]), part(rect(70, 32, 16, 46), 'A', [78, 50]), part('M12 32 L22 14 L32 32 Z', 'R', [22, 26]), part('M68 32 L78 14 L88 32 Z', 'R', [78, 26]), part('M42 78 L42 64 Q50 54 58 64 L58 78 Z', 'K', [50, 70]), part(rect(45, 28, 3, 16), 'K', [46.5, 38]), part('M48 28 L60 32 L48 36 Z', 'V', [52, 32]), part(rect(30, 50, 8, 8), 'Y', [34, 54]), part(rect(62, 50, 8, 8), 'Y', [66, 54]), part(ellipse(50, 90, 26, 5), 'N', [50, 90])]
  },
  {
    name: 'a flower garden', emoji: '🌷',
    parts: [part(rect(0, 0, 100, 58), 'B', [50, 8]), part(rect(0, 58, 100, 42), 'G', [50, 94]), part(circle(84, 16, 9), 'Y', [84, 16]), part(rect(4, 54, 92, 6), 'K', [50, 57]), ...petals(18, 40, 8, 6, 'R'), part(circle(18, 40, 5), 'Y', [18, 40]), ...petals(50, 34, 8, 6, 'P'), part(circle(50, 34, 5), 'Y', [50, 34]), part('M78 56 L74 40 L80 46 L84 38 L88 46 L94 40 L90 56 Z', 'V', [84, 50]), part(ellipse(38, 80, 7, 4), 'R', [38, 80])],
    decor: [{ d: 'M18 48 L18 60 M50 42 L50 60 M84 56 L84 64' }, { d: `${circle(36, 79, 1)} ${circle(40, 81, 1)}`, fill: '#1f2937' }]
  }
];

/* ------------------------------------------------------------ characters --
 * Cute characters (2026-11-18, the user: "give a teddy and nice nice images, these are boring"). Each is drawn on the
 * 100×100 page; levels 1–2 colour one on its own, and from level 3 they are placed into a background (below).
 * Compound paths (several shapes in one `d`) colour as one part, so a pair of ears is one tap.
 */
const INKED = '#1f2937';
const PINKED = '#f472b6';
/** A fat rounded sprinkle: centre, length, angle in degrees. */
const capsule = (cx, cy, len, deg, w = 2.6) => {
  const a = (deg * Math.PI) / 180;
  const [ux, uy] = [Math.cos(a), Math.sin(a)];
  const r = w / 2;
  const [nx, ny] = [-uy * r, ux * r];
  const [sx, sy, ex, ey] = [cx - (ux * len) / 2, cy - (uy * len) / 2, cx + (ux * len) / 2, cy + (uy * len) / 2];
  return `M${r1(sx + nx)} ${r1(sy + ny)} L${r1(ex + nx)} ${r1(ey + ny)} A${r} ${r} 0 0 0 ${r1(ex - nx)} ${r1(ey - ny)} L${r1(sx - nx)} ${r1(sy - ny)} A${r} ${r} 0 0 0 ${r1(sx + nx)} ${r1(sy + ny)} Z`;
};
const eyes = (x1, x2, y, r = 2.2) => ({ d: `${circle(x1, y, r)} ${circle(x2, y, r)}`, fill: INKED });
const shine = (x1, x2, y) => ({ d: `${circle(x1, y, 0.8)} ${circle(x2, y, 0.8)}`, fill: WHITE, stroke: 'none' });

export const CHARACTERS = [
  {
    name: 'a teddy bear', emoji: '🧸',
    parts: [
      part(`${circle(31, 22, 9)} ${circle(69, 22, 9)}`, 'K', [31, 18]),
      part(`${circle(31, 22, 4.5)} ${circle(69, 22, 4.5)}`, 'O', [69, 22]),
      part(`${ellipse(27, 68, 7, 11)} ${ellipse(73, 68, 7, 11)}`, 'K', [25, 70]),
      part(ellipse(50, 74, 21, 20), 'K', [62, 84]),
      part(ellipse(50, 76, 12, 11), 'O', [50, 78]),
      part(`${ellipse(37, 92, 9, 5.5)} ${ellipse(63, 92, 9, 5.5)}`, 'O', [37, 92]),
      part(circle(50, 38, 20), 'K', [36, 30]),
      part(ellipse(50, 46, 9, 7), 'O', [50, 49]),
      part('M37 55 L50 60 L37 65 Z M63 55 L50 60 L63 65 Z', 'R', [41, 60])
    ],
    decor: [eyes(43, 57, 35), shine(43.8, 57.8, 34.2), { d: ellipse(50, 43.5, 3, 2), fill: INKED }, { d: 'M46.5 47.5 Q50 51 53.5 47.5' }, { d: circle(50, 60, 2.2), fill: '#ef4444' }]
  },
  {
    name: 'a kitten', emoji: '🐱',
    parts: [
      part('M66 84 Q92 82 88 58 Q86 50 81 54 Q84 72 64 76 Z', 'O', [84, 66]),
      part(ellipse(50, 76, 20, 17), 'O', [38, 80]),
      part('M31 32 L35 11 L47 25 Z M69 32 L65 11 L53 25 Z', 'O', [35, 20]),
      part('M35 27 L37 17 L43 24 Z M65 27 L63 17 L57 24 Z', 'P', [63, 22]),
      part(ellipse(50, 40, 21, 18), 'O', [36, 34]),
      part(`${ellipse(41, 91, 7, 4.5)} ${ellipse(59, 91, 7, 4.5)}`, 'Y', [41, 91]),
      part('M35 55 Q50 63 65 55 L65 59.5 Q50 67.5 35 59.5 Z', 'B', [40, 58.5]),
      part(circle(50, 66, 3.2), 'Y', [50, 66])
    ],
    decor: [{ d: `${ellipse(42, 38, 2.4, 3.2)} ${ellipse(58, 38, 2.4, 3.2)}`, fill: INKED }, shine(43, 59, 36.8), { d: 'M48 44 L52 44 L50 46.5 Z', fill: PINKED }, { d: 'M50 46.5 Q47.5 50 44.5 48 M50 46.5 Q52.5 50 55.5 48' }, { d: 'M29 43 L39 44.5 M29 47.5 L39 46.5 M71 43 L61 44.5 M71 47.5 L61 46.5' }]
  },
  {
    name: 'an owl', emoji: '🦉',
    parts: [
      part('M8 86 h84 v6 h-84 Z', 'K', [80, 89]),
      part('M30 36 L27 18 L41 30 Z M70 36 L73 18 L59 30 Z', 'V', [30, 26]),
      part(ellipse(50, 56, 24, 28), 'V', [66, 34]),
      part('M27 48 Q13 66 30 82 Q33 64 27 48 Z M73 48 Q87 66 70 82 Q67 64 73 48 Z', 'N', [24, 66]),
      part(ellipse(50, 66, 14, 16), 'P', [50, 74]),
      part(`${circle(41, 44, 8.5)} ${circle(59, 44, 8.5)}`, 'Y', [36, 44]),
      part('M46.5 50 L53.5 50 L50 57 Z', 'O', [50, 52.5]),
      part('M38 83 l3 7 l3 -7 Z M56 83 l3 7 l3 -7 Z', 'O', [41, 85])
    ],
    decor: [eyes(41, 59, 44, 3.4), shine(42.2, 60.2, 42.8), { d: 'M44 62 q3 3 6 0 M50 62 q3 3 6 0 M47 69 q3 3 6 0' }]
  },
  {
    name: 'a bunny', emoji: '🐰',
    parts: [
      part(`${ellipse(41, 22, 7, 18)} ${ellipse(59, 22, 7, 18)}`, 'A', [41, 12]),
      part(`${ellipse(41, 23, 3.5, 12)} ${ellipse(59, 23, 3.5, 12)}`, 'P', [59, 22]),
      part(ellipse(50, 76, 19, 18), 'A', [38, 80]),
      part(`${ellipse(38, 93, 9, 4.5)} ${ellipse(62, 93, 9, 4.5)}`, 'A', [38, 93]),
      part(circle(50, 48, 17), 'A', [38, 42]),
      part(`${circle(39, 54, 3.5)} ${circle(61, 54, 3.5)}`, 'P', [61, 54]),
      part('M58 68 L70 66 L66 88 Z', 'O', [65, 73]),
      part('M58 68 L54 59 L61 64 L63 57 L66 65 L70 66 Z', 'G', [61, 63])
    ],
    decor: [eyes(44, 56, 45), shine(44.8, 56.8, 44.2), { d: 'M48 50 L52 50 L50 52.5 Z', fill: PINKED }, { d: 'M50 52.5 Q48 55.5 46 54.5 M50 52.5 Q52 55.5 54 54.5' }]
  },
  {
    // Drawn like a colouring-book page (2026-11-18): a smiling cupcake, two scalloped tiers of icing, a pleated case,
    // a cherry with a leaf, and fat rounded sprinkles that read as shapes, not blots.
    name: 'a cupcake', emoji: '🧁',
    parts: [
      part(ellipse(50, 92, 34, 5), 'A', [78, 92]),
      part('M27 60 L73 60 L67 89 Q50 93 33 89 Z', 'B', [36, 84]),
      part('M21 62 Q17 51 30 49 Q50 45 70 49 Q83 51 79 62 Q74 67 66 62.5 Q58 68 50 62.5 Q42 68 34 62.5 Q26 67 21 62 Z', 'P', [27, 57]),
      part('M30 49 Q28 37 40 35 Q36 22 50 21 Q64 22 60 35 Q72 37 70 49 Q50 45 30 49 Z', 'P', [50, 29]),
      part(`${capsule(37, 55, 6, 35)} ${capsule(62, 54, 6, -30)} ${capsule(49, 40, 6, 75)} ${capsule(58, 30, 5, 15)} ${capsule(41, 29, 5, -40)}`, 'Y', [62, 54]),
      part(circle(50, 15, 6.5), 'R', [50, 16]),
      part('M53 8 Q60 2 67 6 Q61 11 53 8 Z', 'G', [61, 6.5])
    ],
    decor: [
      { d: 'M50 8.5 Q51 5 53 8' },
      { d: 'M33 61 L36 88.5 M39.5 61 L41 90.5 M60.5 61 L59 90.5 M67 61 L64 88.5' },
      { d: 'M46.6 12.4 Q47.6 10.6 49.6 10.2', stroke: WHITE },
      eyes(43.5, 56.5, 72, 2.3), shine(44.3, 57.3, 71.2),
      { d: `${circle(39, 77, 2.6)} ${circle(61, 77, 2.6)}`, fill: '#fda4af', stroke: 'none' },
      { d: 'M46 77 Q50 81 54 77' }
    ]
  },
  {
    name: 'a ladybird', emoji: '🐞',
    parts: [
      part('M6 74 Q24 30 94 36 Q76 94 6 74 Z', 'G', [80, 70]),
      part(circle(30, 54, 9.5), 'N', [27, 58]),
      part(ellipse(54, 58, 23, 18), 'R', [44, 50]),
      part(`${circle(47, 50, 4)} ${circle(63, 50, 4)} ${circle(58, 66, 4.2)} ${circle(43, 64, 3.6)} ${circle(70, 60, 3)}`, 'N', [47, 50])
    ],
    decor: [{ d: 'M26 46 Q19 36 14 38 M31 45 Q30 34 25 31' }, { d: `${circle(14, 38, 1.6)} ${circle(25, 31, 1.6)}`, fill: INKED }, { d: 'M32 58 L77 58' }, { d: `${circle(27, 51, 2)} ${circle(33, 51, 2)}`, fill: WHITE }]
  },
  {
    name: 'a penguin', emoji: '🐧',
    parts: [
      part('M27 50 Q14 68 27 78 Z M73 50 Q86 68 73 78 Z', 'N', [22, 66]),
      part(ellipse(50, 60, 24, 31), 'N', [32, 48]),
      part(ellipse(50, 66, 15, 23), 'B', [50, 74]),
      part(`${ellipse(40, 91, 8, 4)} ${ellipse(60, 91, 8, 4)}`, 'O', [40, 91]),
      part('M45 45 L55 45 L50 51.5 Z', 'O', [50, 47]),
      part('M32 53 Q50 60 68 53 L68 58 Q50 65 32 58 Z M58 58 L64 73 L57 73 L54 60 Z', 'R', [38, 56.5]),
      part('M34 33 Q50 8 66 33 Z', 'Y', [50, 25]),
      part(circle(50, 12, 4.5), 'P', [50, 12])
    ],
    decor: [{ d: `${circle(43, 39, 3)} ${circle(57, 39, 3)}`, fill: WHITE }, eyes(43.6, 57.6, 39.4, 1.5), { d: 'M34 33 L66 33' }]
  }
];

/*
 * A character placed into a background, path by path (scaled by `s` and moved to `tx, ty`), so the data stays plain
 * paths on the 100×100 page. Handles the commands the drawings use: M L H V Q C A Z, absolute and relative.
 */
const ARGS = { m: 2, l: 2, h: 1, v: 1, q: 4, c: 6, a: 7, z: 0 };
const fmt = (n) => String(Math.round(n * 100) / 100);
export const placePath = (d, s, tx, ty) => d.replace(/([MLHVQCAZmlhvqcaz])([^MLHVQCAZmlhvqcaz]*)/g, (_, cmd, rest) => {
  const nums = (rest.match(/-?\d*\.?\d+(?:e-?\d+)?/g) || []).map(Number);
  const lower = cmd.toLowerCase();
  const rel = cmd === lower;
  const n = ARGS[lower];
  if (!n) return cmd;
  const out = [];
  for (let i = 0; i + n <= nums.length; i += n) {
    const g = nums.slice(i, i + n);
    const X = (x) => (rel ? x * s : x * s + tx);
    const Y = (y) => (rel ? y * s : y * s + ty);
    if (lower === 'h') out.push(X(g[0]));
    else if (lower === 'v') out.push(Y(g[0]));
    else if (lower === 'a') out.push(g[0] * s, g[1] * s, g[2], g[3], g[4], X(g[5]), Y(g[6]));
    else out.push(...g.map((v, k) => (k % 2 ? Y(v) : X(v))));
  }
  return `${cmd}${out.map(fmt).join(' ')} `;
}).trim();

const placeIn = (who, s, tx, ty) => ({
  parts: who.parts.map((p) => part(placePath(p.d, s, tx, ty), p.c, [r1(p.at[0] * s + tx), r1(p.at[1] * s + ty)])),
  decor: (who.decor || []).map((d) => ({ ...d, d: placePath(d.d, s, tx, ty) }))
});
const who = (name) => CHARACTERS.find((c) => c.name === name);

/** Scenes with a character in them (2026-11-18): the character, smaller, in a garden, a night sky, the snow… */
const CHARACTER_SCENES = [
  { name: "teddy's picnic", emoji: '🧸', back: [part(rect(0, 0, 100, 60), 'B', [12, 30]), part(rect(0, 60, 100, 40), 'G', [10, 92]), part(circle(86, 14, 8), 'Y', [86, 14]), part('M4 96 L22 72 L80 72 L98 96 Z', 'R', [16, 92])], who: 'a teddy bear', at: [0.6, 22, 30], extra: { decor: [{ d: `${circle(16, 22, 5)} ${circle(23, 19, 6)} ${circle(30, 22, 5)}`, fill: WHITE, after: 0 }, { d: 'M8 70 l2 -5 l2 5 M90 68 l2 -5 l2 5 M60 99 l2 -5 l2 5', after: 1 }, { d: 'M96.5 14.0 L100.0 14.0 M93.4 21.4 L95.9 23.9 M86.0 24.5 L86.0 28.0 M78.6 21.4 L76.1 23.9 M75.5 14.0 L72.0 14.0 M78.6 6.6 L76.1 4.1 M86.0 3.5 L86.0 0.0 M93.4 6.6 L95.9 4.1', after: 2 }, { d: 'M17.5 78 L84.5 78 M13.0 84 L89.0 84 M8.5 90 L93.5 90 M36.5 72 L27.5 96 M51 72 L51.0 96 M65.5 72 L74.5 96', after: 3 }] } },
  { name: 'a kitten in the garden', emoji: '🐱', back: [part(rect(0, 0, 100, 62), 'B', [50, 8]), part(rect(0, 62, 100, 38), 'G', [12, 92]), ...petals(14, 50, 6, 4.5, 'R'), part(circle(14, 50, 3.5), 'Y', [14, 50])], who: 'a kitten', at: [0.62, 30, 34], extra: { decor: [{ d: 'M14 58 L14 70' }] } },
  { name: 'an owl at night', emoji: '🦉', back: [part(rect(0, 0, 100, 100), 'N', [12, 60]), part('M72 8 A14 14 0 1 0 88 30 A10 10 0 1 1 72 8 Z', 'Y', [74, 20]), part(star(14, 14, 5), 'Y', [14, 14]), part(star(30, 30, 3.5), 'Y', [30, 30])], who: 'an owl', at: [0.7, 15, 28] },
  { name: 'a bunny in the meadow', emoji: '🐰', back: [part(rect(0, 0, 100, 64), 'B', [80, 40]), part('M0 66 Q50 54 100 66 L100 100 L0 100 Z', 'G', [86, 90]), part(circle(14, 14, 8), 'Y', [14, 14]), part(`${circle(84, 76, 3)} ${circle(90, 84, 3)} ${circle(80, 88, 3)}`, 'V', [84, 76])], who: 'a bunny', at: [0.66, 17, 32] },
  // A party page (2026-11-18, the user: "like drawing books"): a garland of flags, two shiny balloons, a wooden table
  // with its grain, little stars — and the smiling cupcake in the middle.
  { name: 'a cupcake party', emoji: '🧁', back: [
    part(rect(0, 0, 100, 74), 'Y', [86, 64]),
    part('M4 13.2 L16 13.2 L10 24.2 Z M36 18.8 L48 18.8 L42 29.8 Z M68 16.9 L80 16.9 L74 27.9 Z', 'V', [10, 16]),
    part('M20 16.9 L32 16.9 L26 27.9 Z M52 18.8 L64 18.8 L58 29.8 Z M84 13.2 L96 13.2 L90 24.2 Z', 'G', [26, 20]),
    part(`${ellipse(13, 42, 8, 10)} M13 52 L10.5 55.5 L15.5 55.5 Z`, 'R', [13, 42]),
    part(`${ellipse(87, 38, 8, 10)} M87 48 L84.5 51.5 L89.5 51.5 Z`, 'B', [87, 38]),
    part(`${star(8, 66, 3.2)} ${star(93, 64, 3.2)} ${star(30, 34, 2.4)} ${star(71, 32, 2.4)}`, 'Y', [93, 64]),
    part('M0 74 L100 74 L100 100 L0 100 Z', 'K', [8, 92])
  ], who: 'a cupcake', at: [0.64, 18, 33], extra: { decor: [
    { d: 'M0 10 Q50 28 100 10', after: 0 },
    { d: `${circle(18, 30, 0.9)} ${circle(50, 8, 0.9)} ${circle(82, 26, 0.9)} ${circle(6, 26, 0.9)} ${circle(95, 22, 0.9)}`, fill: '#1f2937', after: 0 },
    { d: 'M13 55.5 Q9 61 14 66 Q18 70 13 74 M87 51.5 Q91 58 86 63 Q82 68 87 74', after: 4 },
    { d: 'M8.5 37 Q9 33.5 12 32.5 M82.5 33 Q83 29.5 86 28.5', stroke: WHITE, after: 4 },
    { d: 'M0 77 L100 77 M6 84 Q24 82 40 85 M62 92 Q80 90 96 93 M10 95 Q18 94 26 96', after: 6 }
  ] } },
  { name: 'a ladybird in the grass', emoji: '🐞', back: [part(rect(0, 0, 100, 100), 'B', [50, 8]), part(circle(84, 16, 9), 'Y', [84, 16]), part('M0 100 L0 80 L6 66 L10 82 L16 62 L22 84 L30 70 L34 86 L100 86 L100 100 Z', 'G', [8, 94])], who: 'a ladybird', at: [0.78, 12, 16] },
  { name: 'a penguin in the snow', emoji: '🐧', back: [part(rect(0, 0, 100, 70), 'B', [12, 40]), part('M0 72 Q50 62 100 72 L100 100 L0 100 Z', 'A', [86, 92]), part('M64 72 L74 52 L84 72 Z', 'A', [74, 66]), part(circle(14, 14, 7), 'Y', [14, 14])], who: 'a penguin', at: [0.62, 14, 34], extra: { decor: [{ d: `${circle(30, 12, 1.4)} ${circle(50, 22, 1.4)} ${circle(70, 10, 1.4)} ${circle(88, 30, 1.4)} ${circle(8, 40, 1.4)}`, fill: WHITE }] } }
].map(({ name, emoji, back, who: w, at: [s, tx, ty], extra = {} }) => {
  const placed = placeIn(who(w), s, tx, ty);
  return { name, emoji, framed: true, parts: [...back, ...placed.parts], decor: [...(extra.decor || []), ...placed.decor] };
});

/** The colours a picture uses, in palette order. */
export const coloursOf = (pic) => COLOUR_KEYS.filter((k) => pic.parts.some((p) => p.c === k));

/**
 * The level's setup (2026-11-17): every level is "remember" — the scene shows coloured for 7 s, then hides and the
 * student colours it from memory (2 peeks). Scenes grow with the level: 5–6 parts, then 7–9, then 10 and more.
 * Foundation (Classes 1–2) climbs slowly; Developing (3–5) starts three levels on.
 */
export const bookConfig = (band, levelNo, shownLevel = levelNo) => {
  const n = Math.max(1, levelNo + (band === 'developing' ? 3 : 0));
  const [minParts, maxParts] = n <= 3 ? [5, 6] : n <= 6 ? [7, 9] : n <= 9 ? [9, 11] : [10, 99];
  const puzzles = n <= 2 ? 2 : 3;
  const extraColours = n <= 3 ? 1 : n <= 6 ? 2 : 3; // crayons that are not in the scene
  // Levels 1–2 (2026-11-18, the user): a single thing — an apple, a sun, a fish — before whole places from level 3.
  // `shownLevel` is the level the student sees (the step inside a band can differ).
  const objects = shownLevel <= 2;
  return { mode: 'remember', objects, minParts, maxParts, puzzles, extraColours, showMs: 7000, peeks: 2, seconds: puzzles * (Math.min(maxParts, 14) * 6 + 15) };
};

/** The pictures that fit a level. Never empty. */
/* The plainest scenes are left out (2026-11-18, the user: "these are boring"). */
const BORING = ['a city street', 'a playground', 'a park', 'a house on a hill', 'a night sky', 'a sunny garden'];
export const BOOK_SCENES = [...CHARACTER_SCENES, ...SCENES.filter((p) => !BORING.includes(p.name)).map((p) => ({ ...p, framed: true }))];

export const poolFor = (config) => {
  if (config.objects) return CHARACTERS;
  const fits = BOOK_SCENES.filter((p) => p.parts.length >= config.minParts && p.parts.length <= config.maxParts);
  if (fits.length >= config.puzzles + 1) return fits;
  // Too few in range: the nearest-sized scenes instead, so an early level never gets the biggest ones.
  const gap = (p) => (p.parts.length < config.minParts ? config.minParts - p.parts.length : Math.max(0, p.parts.length - config.maxParts));
  return [...BOOK_SCENES].sort((a, b) => gap(a) - gap(b)).slice(0, Math.max(4, config.puzzles + 1));
};

/** A picture for the round, avoiding the ones already coloured when it can. */
export const pickPicture = (config, avoid = [], rng = Math.random) => {
  const pool = poolFor(config);
  const fresh = pool.filter((p) => !avoid.includes(p.name));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(rng() * from.length)];
};

export const MAX_CRAYONS = 8;

/** The crayons under the drawing: the picture's colours and a few others, in palette order. */
export const paletteFor = (pic, extra, rng = Math.random) => {
  const used = coloursOf(pic);
  // At most 8 crayons (2026-11-18, the user): two rows of 4 on a phone. No picture uses more than 8 colours.
  const others = COLOUR_KEYS.filter((k) => !used.includes(k)).sort(() => rng() - 0.5).slice(0, Math.max(0, Math.min(extra, MAX_CRAYONS - used.length)));
  return COLOUR_KEYS.filter((k) => used.includes(k) || others.includes(k));
};
