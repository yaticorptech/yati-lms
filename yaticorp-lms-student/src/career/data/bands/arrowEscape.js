/**
 * Arrow Escape (2026-11-19, Master Minds · Logic — the user asked for a game that plays like the arrow-clearing puzzle
 * "Amaze GO!"; ours is its own design). Pure and seeded.
 *
 * The board is packed with long, thin, bending arrows (each a path of squares ending in an arrowhead). Tap an arrow:
 * if nothing stands between its head and the edge, it slides out — head first, its body following its own path.
 * Clear the board. A board can never get stuck: removing an arrow only ever frees space.
 *
 * Boards are built backwards (the last arrow out goes in first): each new arrow must have a clear way out past the
 * arrows already placed, so the reverse of the building order always clears the board. Every level is a picture
 * (a heart, a fish, a dog, a bird, a doll…) packed with arrows.
 */
import { intBetween, shuffle } from '../seeded.js';

export const DIRS = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] };
const STEPS = Object.values(DIRS);
const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const key = (r, c) => `${r},${c}`;

/**
 * Every level is a picture (2026-11-20, the user: "as the level increases the arrows should make different shapes —
 * doll, dog, bird…"). Pixel masks, '#' = a square arrows use; scaled to the level's grid.
 */
const PICTURES = {
  heart: [
    '.###...###.',
    '#####.#####',
    '###########',
    '###########',
    '###########',
    '.#########.',
    '..#######..',
    '...#####...',
    '....###....',
    '.....#.....'
  ],
  fish: [
    '.....######.......',
    '...##########...##',
    '..############.###',
    '.##.###############',
    '###################',
    '.#################.',
    '..############.###',
    '...##########...##',
    '.....######.......'
  ],
  house: [
    '......##......',
    '.....####.##..',
    '....######.#..',
    '...#########..',
    '..##########..',
    '.############.',
    '##############',
    '.############.',
    '.##..####..##.',
    '.##..####..##.',
    '.#####..######',
    '.#####..#####.',
    '.#####..#####.'
  ],
  star: [
    '.......#.......',
    '......###......',
    '......###......',
    '.....#####.....',
    '###############',
    '.#############.',
    '..###########..',
    '...#########...',
    '...#########...',
    '..#####.#####..',
    '..####...####..',
    '.###.......###.',
    '.#...........#.'
  ],
  bird: [
    '.....####........',
    '....######.......',
    '...###.####......',
    '#######.###......',
    '...#######.......',
    '...###########...',
    '....############.',
    '....#############',
    '.....###########.',
    '......########...',
    '........#..#.....',
    '.......##..##....'
  ],
  cat: [
    '#..........#',
    '##........##',
    '###......###',
    '############',
    '##.##..##.##',
    '############',
    '#####..#####',
    '.##########.',
    '..########..',
    '..########..',
    '.##########.',
    '############',
    '############',
    '############',
    '.####..####.'
  ],
  tree: [
    '.....####.....',
    '...########...',
    '..##########..',
    '.############.',
    '##############',
    '##############',
    '.############.',
    '##############',
    '##############',
    '.############.',
    '...########...',
    '......##......',
    '......##......',
    '......##......',
    '....######....'
  ],
  dog: [
    '.##..............',
    '####.............',
    '#####............',
    '######..........#',
    '.#####.........##',
    '..############.#.',
    '..##############.',
    '..#############..',
    '..#############..',
    '..##.##....##.##.',
    '..##.##....##.##.',
    '..##.##....##.##.'
  ],
  rocket: [
    '.....##.....',
    '....####....',
    '...######...',
    '...######...',
    '...##..##...',
    '...##..##...',
    '...######...',
    '...######...',
    '..########..',
    '.##########.',
    '###.####.###',
    '##..####..##',
    '#...#..#...#',
    '....#..#....'
  ],
  butterfly: [
    '###.......###',
    '####.....####',
    '#####.#.#####',
    '######.######',
    '######.######',
    '.#####.#####.',
    '...###.###...',
    '..####.####..',
    '.#####.#####.',
    '.#####.#####.',
    '..###...###..'
  ],
  doll: [
    '....####....',
    '...######...',
    '..########..',
    '..#.####.#..',
    '..########..',
    '...######...',
    '....####....',
    '.##########.',
    '############',
    '#.########.#',
    '#.########.#',
    '..########..',
    '.##########.',
    '############',
    '############',
    '....#..#....',
    '....#..#....',
    '...##..##...'
  ],
  rabbit: [
    '.##..##.....',
    '.##..##.....',
    '.##..##.....',
    '.##..##.....',
    '.######.....',
    '########....',
    '##.##.##....',
    '########....',
    '.######.....',
    '.#######....',
    '##########..',
    '###########.',
    '############',
    '###########.',
    '.##.....##..'
  ],
  turtle: [
    '......#####.......',
    '....#########.....',
    '...###########.###',
    '..#############.##',
    '.###############.#',
    '#################.',
    '.##.........##...',
    '.##.........##...'
  ],
  elephant: [
    '...#######.........',
    '..##########.......',
    '.############.###..',
    '##.##############..',
    '#################..',
    '#.###############.#',
    '#..##############..',
    '#..##############..',
    '##.###.####.####...',
    '.#.###.####.####...',
    '...###.####.####...'
  ]
};
export const SHAPE_ORDER = ['heart', 'fish', 'house', 'star', 'bird', 'cat', 'tree', 'dog', 'rocket', 'butterfly', 'doll', 'rabbit', 'turtle', 'elephant'];

/** A picture scaled to `cols` squares wide (and `rows` tall when given — stretched to fill the screen): { rows, cols, has(r, c) }. */
const scaled = (name, cols, rowsWanted) => {
  const pic = PICTURES[name];
  const w = Math.max(...pic.map((l) => l.length)); const h = pic.length;
  const rows = rowsWanted || Math.max(4, Math.round((h * cols) / w));
  const has = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols && pic[Math.floor(((r + 0.5) * h) / rows)][Math.floor(((c + 0.5) * w) / cols)] === '#';
  return { rows, cols, has };
};
const picAspect = (name) => PICTURES[name].length / Math.max(...PICTURES[name].map((l) => l.length));

/**
 * `aspect` is the play area's height ÷ width (2026-11-20, the user: "arrows in the entire white space, small ones, from
 * the first level"): the board is cut to the screen — tall on a phone — with small squares. Easy levels fill it
 * completely; a picture is stretched (up to 1.7×) to fill as much of it as it can.
 */
export const arrowConfig = (difficulty, levelNo, aspect = 1) => {
  const lv = Math.max(1, levelNo || 1);
  const s = clampN(lv - 1 + ((difficulty || 1) - 1) * 12, 0, 60);
  const a = Math.max(0.55, Math.min(2.4, Number(aspect) || 1));
  // Easy levels are the plain board; medium and hard levels are pictures (2026-11-20, the user).
  const shape = s < 8 ? null : SHAPE_ORDER[(lv - 1) % SHAPE_ORDER.length];
  let cols = clampN(12 + Math.floor(s / 3), 12, 22);
  const areaRows = clampN(Math.round(cols * a), 8, 46);
  let rows = areaRows;
  if (shape) {
    const p = picAspect(shape);
    if (cols * p > areaRows) { cols = Math.max(8, Math.floor(areaRows / p)); rows = areaRows; } // a tall picture: fit the height
    else rows = Math.min(areaRows, Math.round(cols * p * 1.7));
  }
  return {
    rows,
    cols,
    size: Math.max(rows, cols), // the square grid the board sits in (top-left)
    maxLen: clampN(4 + Math.floor(s / 4), 4, 10),
    fill: 0.97, // packed: every square of the board is part of an arrow
    shape,
    hearts: 3,
    hints: 3,
    label: s < 8 ? 'Easy' : s < 20 ? 'Medium' : 'Hard'
  };
};

/** The squares straight ahead of an arrow's head, out to the edge of the grid. */
export const pathOut = (arrow, size) => {
  const [dr, dc] = DIRS[arrow.dir];
  const [hr, hc] = arrow.cells[arrow.cells.length - 1];
  const out = [];
  for (let r = hr + dr, c = hc + dc; r >= 0 && c >= 0 && r < size && c < size; r += dr, c += dc) out.push([r, c]);
  return out;
};
export const occupied = (arrows) => new Set(arrows.flatMap((a) => a.cells.map(([r, c]) => key(r, c))));
/** The first square in an arrow's way and how many free squares come before it, or null when it can leave. */
export const blocker = (arrow, arrows, size) => {
  const taken = occupied(arrows.filter((a) => a.id !== arrow.id));
  const path = pathOut(arrow, size);
  const i = path.findIndex(([r, c]) => taken.has(key(r, c)));
  return i < 0 ? null : { cell: path[i], free: i };
};
export const canLeave = (arrow, arrows, size) => blocker(arrow, arrows, size) === null;

/**
 * A fully packed board with a guaranteed solution (2026-11-19, the user: "arrows from all sides, like Amaze GO, and it
 * must have a solution").
 *  1. Cover every square of the board with winding paths (up to maxLen squares each).
 *  2. Peel them off one by one: a path can leave if one of its two ends, pointing on in the direction of its last
 *     step, has a clear line to the edge past the paths still on the board. That end becomes its arrowhead.
 *  3. If no path can leave, the topmost square still on the board is split off as a one-square arrow pointing up —
 *     everything above it has already gone, so it can always leave. The board is therefore always solvable.
 * The peeling order, reversed, is not shown to the student; any arrow that can leave may leave (removing never blocks).
 */
export const makeArrowBoard = (rng, cfg) => {
  const { size } = cfg;
  const rows = cfg.rows ?? size; const cols = cfg.cols ?? size;
  const allowed = cfg.shape ? scaled(cfg.shape, cols, rows).has : (r, c) => r < rows && c < cols;
  // 1. Cover the board with paths.
  const cover = new Map(); // cell key → path index
  const paths = [];
  const cells = [];
  for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) if (allowed(r, c)) cells.push([r, c]);
  for (const [sr, sc] of shuffle(rng, cells)) {
    if (cover.has(key(sr, sc))) continue;
    const path = [[sr, sc]]; cover.set(key(sr, sc), paths.length);
    const want = intBetween(rng, 2, cfg.maxLen);
    let [r, c] = [sr, sc]; let last = null;
    while (path.length < want) {
      const order = last && rng() < 0.5 ? [last, ...shuffle(rng, STEPS)] : shuffle(rng, STEPS);
      const next = order.find(([dr, dc]) => { const nr = r + dr; const nc = c + dc; return nr >= 0 && nc >= 0 && nr < size && nc < size && allowed(nr, nc) && !cover.has(key(nr, nc)); });
      if (!next) break;
      r += next[0]; c += next[1]; last = next;
      path.push([r, c]); cover.set(key(r, c), paths.length);
    }
    paths.push(path);
  }
  // Lone squares join a neighbouring path at one of its ends, so few one-square arrows are left.
  for (let i = 0; i < paths.length; i += 1) {
    if (paths[i].length !== 1) continue;
    const [r, c] = paths[i][0];
    for (const [dr, dc] of shuffle(rng, STEPS)) {
      const j = cover.get(key(r + dr, c + dc));
      if (j === undefined || j === i || paths[j].length === 0 || paths[j].length >= cfg.maxLen + 2) continue;
      const pj = paths[j]; const [fr, fc] = pj[0]; const [lr, lc] = pj[pj.length - 1];
      if (fr === r + dr && fc === c + dc) { pj.unshift([r, c]); } else if (lr === r + dr && lc === c + dc) { pj.push([r, c]); } else continue;
      cover.set(key(r, c), j); paths[i] = []; break;
    }
  }
  for (let i = paths.length - 1; i >= 0; i -= 1) if (!paths[i].length) paths.splice(i, 1);
  // 2–3. Peel.
  const onBoard = new Set(cells.map(([r, c]) => key(r, c)));
  const live = new Set(paths.map((_, i) => i));
  const clearRay = (r, c, [dr, dc]) => { for (let y = r + dr, x = c + dc; y >= 0 && x >= 0 && y < size && x < size; y += dr, x += dc) if (onBoard.has(key(y, x))) return false; return true; };
  const exitOf = (path) => {
    if (path.length === 1) { const [r, c] = path[0]; const d = shuffle(rng, Object.keys(DIRS)).find((k) => clearRay(r, c, DIRS[k])); return d ? { dir: d, cells: path } : null; }
    for (const p of shuffle(rng, [path, [...path].reverse()])) {
      const h = p[p.length - 1]; const n = p[p.length - 2];
      const d = Object.keys(DIRS).find((k) => DIRS[k][0] === h[0] - n[0] && DIRS[k][1] === h[1] - n[1]);
      if (clearRay(h[0], h[1], DIRS[d])) return { dir: d, cells: p };
    }
    return null;
  };
  const arrows = [];
  while (live.size) {
    let found = null;
    for (const i of shuffle(rng, [...live])) { const e = exitOf(paths[i]); if (e) { found = [i, e]; break; } }
    if (!found) {
      // Split off the topmost square still on the board as a one-square arrow pointing up.
      let top = null;
      for (const i of live) for (const [r, c] of paths[i]) if (!top || r < top[0]) top = [r, c, i];
      const [tr, tc, i] = top;
      // Removing a middle square leaves two pieces.
      const at = paths[i].findIndex(([r, c]) => r === tr && c === tc);
      const before = paths[i].slice(0, at); const after = paths[i].slice(at + 1);
      live.delete(i);
      for (const part of [before, after]) if (part.length) { paths.push(part); live.add(paths.length - 1); }
      paths.push([[tr, tc]]); live.add(paths.length - 1);
      continue;
    }
    const [i, e] = found;
    live.delete(i);
    e.cells.forEach(([r, c]) => onBoard.delete(key(r, c)));
    arrows.push(e);
  }
  // Shuffle the ids so the order on screen gives nothing away.
  const ids = shuffle(rng, arrows.map((_, i) => i));
  return { size, rows: cfg.rows ?? size, cols: cfg.cols ?? size, shape: cfg.shape, arrows: arrows.map((a, i) => ({ id: ids[i], ...a })).sort((a, b) => a.id - b.id) };
};

/** Can the board be cleared? (Greedy is enough: removing never blocks anything.) */
export const clearable = (board) => {
  let left = [...board.arrows];
  while (left.length) {
    const out = left.find((a) => canLeave(a, left, board.size));
    if (!out) return false;
    left = left.filter((a) => a !== out);
  }
  return true;
};

/** The daily board: the same for everyone on a given date. */
export const dailySeed = (date = new Date()) => Number(`${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`);
