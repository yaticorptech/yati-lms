/**
 * Jigsaw (2026-11-19, Master Minds · Logic — replaces Water Sort, the user's design). Pure and seeded.
 *
 * Each level is one picture cut into n × n interlocking pieces. The picture shows for a few seconds and then hides;
 * the student can peek twice more. Pieces go from the tray onto the board; a piece put in the wrong place is a
 * mistake, and three mistakes lose the puzzle (the lives are not shown — the user asked).
 */
import { pick, shuffle } from '../seeded.js';

/**
 * Puzzle pictures (2026-11-20, the user: not the platform's own game art — sharp HD photos of flowers, nature and
 * animals). 1200 × 1200, free-to-use photos (Unsplash, via picsum.photos), in public/games/jigsaw/.
 */
export const PICTURES = [
  'games/jigsaw/fjord.jpg', 'games/jigsaw/raspberries.jpg', 'games/jigsaw/eagle.jpg', 'games/jigsaw/pug.jpg', 'games/jigsaw/waterfall.jpg', 'games/jigsaw/forest-falls.jpg',
  'games/jigsaw/blossom.jpg', 'games/jigsaw/lioness.jpg', 'games/jigsaw/strawberries.jpg', 'games/jigsaw/walrus.jpg', 'games/jigsaw/petunia.jpg', 'games/jigsaw/puppy.jpg',
  'games/jigsaw/lily.jpg', 'games/jigsaw/berry-bowl.jpg', 'games/jigsaw/bear.jpg', 'games/jigsaw/fox.jpg', 'games/jigsaw/tiger.jpg', 'games/jigsaw/husky.jpg'
];

// 2026-11-20 (the user): a repeating easy → medium → hard cycle — 3×3, 4×4 (easy), 5×5 (medium), 6×6 (hard), then 3×3 again.
const CYCLE = [3, 4, 5, 6];
export const jigsawConfig = (_difficulty, levelNo) => {
  const n = CYCLE[(Math.max(1, levelNo || 1) - 1) % CYCLE.length];
  return {
    n,
    showMs: n <= 4 ? 6000 : 5000, // how long the picture shows at the start
    peekMs: 3000,
    peeks: 2,
    lives: 3
  };
};

/**
 * The cut: for every inner edge, which way its tab points. h[r][c] is the edge under piece (r, c) (+1 tab down,
 * -1 tab up); v[r][c] the edge to the right of (r, c) (+1 tab right, -1 tab left).
 */
export const makeCut = (rng, n) => ({
  h: Array.from({ length: n - 1 }, () => Array.from({ length: n }, () => (rng() < 0.5 ? 1 : -1))),
  v: Array.from({ length: n }, () => Array.from({ length: n - 1 }, () => (rng() < 0.5 ? 1 : -1)))
});

/** Which way each side of piece (r, c) bulges: 0 flat (the board's edge), +1 out, -1 in. */
export const sidesOf = (cut, n, r, c) => ({
  top: r === 0 ? 0 : -cut.h[r - 1][c],
  right: c === n - 1 ? 0 : cut.v[r][c],
  bottom: r === n - 1 ? 0 : cut.h[r][c],
  left: c === 0 ? 0 : -cut.v[r][c - 1]
});

/**
 * The outline of piece (r, c), in board units (each square `s` wide), as an SVG path. Tabs are the classic
 * rounded knob, about a fifth of the side out.
 */
export const piecePath = (cut, n, r, c, s) => {
  const x = c * s; const y = r * s; const k = sidesOf(cut, n, r, c);
  // One side from (x0, y0) to (x1, y1); `out` is the unit normal pointing out of the piece.
  const side = (x0, y0, x1, y1, bulge, [ox, oy]) => {
    if (!bulge) return `L${x1} ${y1}`;
    const dx = (x1 - x0) / s; const dy = (y1 - y0) / s;
    const p = (a, b) => `${(x0 + dx * a * s + ox * b * s * bulge).toFixed(2)} ${(y0 + dy * a * s + oy * b * s * bulge).toFixed(2)}`;
    return `L${p(0.36, 0)} C${p(0.4, 0.02)} ${p(0.33, 0.18)} ${p(0.36, 0.2)} C${p(0.4, 0.27)} ${p(0.6, 0.27)} ${p(0.64, 0.2)} C${p(0.67, 0.18)} ${p(0.6, 0.02)} ${p(0.64, 0)} L${x1} ${y1}`;
  };
  return [
    `M${x} ${y}`,
    side(x, y, x + s, y, k.top, [0, -1]),
    side(x + s, y, x + s, y + s, k.right, [1, 0]),
    side(x + s, y + s, x, y + s, k.bottom, [0, 1]),
    side(x, y + s, x, y, k.left, [-1, 0]),
    'Z'
  ].join(' ');
};

/** A level: { n, picture, cut, order (the tray's shuffled piece ids) }. Avoids the last pictures seen. */
export const makeJigsaw = (rng, cfg, avoid = []) => {
  const fresh = PICTURES.filter((p) => !avoid.includes(p));
  return { n: cfg.n, picture: pick(rng, fresh.length ? fresh : PICTURES), cut: makeCut(rng, cfg.n), order: shuffle(rng, Array.from({ length: cfg.n * cfg.n }, (_, i) => i)) };
};
