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
  K: { name: 'Brown', hex: '#a16207' }
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

/** The colours a picture uses, in palette order. */
export const coloursOf = (pic) => COLOUR_KEYS.filter((k) => pic.parts.some((p) => p.c === k));

/**
 * The level's setup. Foundation (Classes 1–2) climbs slowly; Developing (3–5) starts three levels on.
 *   levels 1–6  copy (the example stays up), small pictures first
 *   levels 7–9  colour by number
 *   10 on       remember (the example hides) and colour by number, in turn
 */
export const bookConfig = (band, levelNo) => {
  const n = Math.max(1, levelNo + (band === 'developing' ? 3 : 0));
  const mode = n <= 6 ? 'copy' : n <= 9 ? 'numbers' : n % 2 ? 'remember' : 'numbers';
  const maxParts = n <= 3 ? 4 : n <= 6 ? 6 : 9;
  const minParts = n <= 3 ? 1 : n <= 6 ? 3 : 4;
  const puzzles = n <= 2 ? 2 : 3;
  const extraColours = n <= 3 ? 1 : n <= 6 ? 2 : 3; // crayons that are not in the picture
  const perPart = mode === 'remember' ? 7 : 6;
  return { mode, maxParts, minParts, puzzles, extraColours, showMs: 5000, peeks: 2, seconds: puzzles * (maxParts * perPart + 10) };
};

/** The pictures that fit a level. Never empty. */
export const poolFor = (config) => {
  const fits = PICTURES.filter((p) => p.parts.length >= config.minParts && p.parts.length <= config.maxParts);
  return fits.length ? fits : PICTURES;
};

/** A picture for the round, avoiding the ones already coloured when it can. */
export const pickPicture = (config, avoid = [], rng = Math.random) => {
  const pool = poolFor(config);
  const fresh = pool.filter((p) => !avoid.includes(p.name));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(rng() * from.length)];
};

/** The crayons on the right: the picture's colours and a few others, in palette order. */
export const paletteFor = (pic, extra, rng = Math.random) => {
  const used = coloursOf(pic);
  const others = COLOUR_KEYS.filter((k) => !used.includes(k)).sort(() => rng() - 0.5).slice(0, extra);
  return COLOUR_KEYS.filter((k) => used.includes(k) || others.includes(k));
};
