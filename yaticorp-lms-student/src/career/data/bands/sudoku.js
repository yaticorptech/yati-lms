/**
 * Sudoku of any box shape, with puzzles that have exactly one solution (2026-11-13). Pure, so node can test it.
 *
 * A grid is a flat array of size·size values, 0 for blank. `size` = boxRows × boxCols: 4 (2×2), 6 (2×3), 9 (3×3).
 * Puzzles are made by filling a random valid grid, then blanking cells one at a time and keeping a blank only while
 * the solver still counts exactly one solution.
 */

export const SHAPES = { 4: [2, 2], 6: [2, 3], 9: [3, 3] };

/** For each cell, the indices of the other cells in its row, column and box. */
const PEERS = new Map();
export const peersOf = (size) => {
  if (PEERS.has(size)) return PEERS.get(size);
  const [br, bc] = SHAPES[size];
  const out = Array.from({ length: size * size }, (_, i) => {
    const r = Math.floor(i / size);
    const c = i % size;
    const set = new Set();
    for (let k = 0; k < size; k += 1) { set.add(r * size + k); set.add(k * size + c); }
    const r0 = Math.floor(r / br) * br;
    const c0 = Math.floor(c / bc) * bc;
    for (let a = 0; a < br; a += 1) for (let b = 0; b < bc; b += 1) set.add((r0 + a) * size + c0 + b);
    set.delete(i);
    return [...set];
  });
  PEERS.set(size, out);
  return out;
};

/** The box a cell sits in (0-based, row-major over boxes). */
export const boxOf = (size, i) => {
  const [br, bc] = SHAPES[size];
  const r = Math.floor(i / size);
  const c = i % size;
  return Math.floor(r / br) * (size / bc) + Math.floor(c / bc);
};

const candidates = (grid, size, i, peers) => {
  const used = new Set(peers[i].map((p) => grid[p]));
  const out = [];
  for (let v = 1; v <= size; v += 1) if (!used.has(v)) out.push(v);
  return out;
};

/** How many solutions the grid has, counting no further than `limit`. Most-constrained cell first. */
export const countSolutions = (input, size, limit = 2) => {
  const grid = [...input];
  const peers = peersOf(size);
  let count = 0;
  const solve = () => {
    let best = -1;
    let bestCands = null;
    for (let i = 0; i < grid.length; i += 1) {
      if (grid[i]) continue;
      const c = candidates(grid, size, i, peers);
      if (!c.length) return;
      if (!bestCands || c.length < bestCands.length) { best = i; bestCands = c; if (c.length === 1) break; }
    }
    if (best === -1) { count += 1; return; }
    for (const v of bestCands) {
      grid[best] = v;
      solve();
      if (count >= limit) break;
    }
    grid[best] = 0;
  };
  solve();
  return count;
};

const shuffled = (rng, list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** A random complete, valid grid. */
export const randomSolution = (size, rng = Math.random) => {
  const grid = Array(size * size).fill(0);
  const peers = peersOf(size);
  const fill = (i) => {
    if (i === grid.length) return true;
    for (const v of shuffled(rng, candidates(grid, size, i, peers))) {
      grid[i] = v;
      if (fill(i + 1)) return true;
    }
    grid[i] = 0;
    return false;
  };
  fill(0);
  return grid;
};

/** Whether a full grid keeps every row, column and box free of repeats. */
export const isSolvedGrid = (grid, size) => {
  if (grid.some((v) => !v)) return false;
  const peers = peersOf(size);
  return grid.every((v, i) => peers[i].every((p) => grid[p] !== v));
};

/** The cells whose value repeats in their row, column or box. */
export const clashes = (grid, size) => {
  const peers = peersOf(size);
  const bad = new Set();
  grid.forEach((v, i) => { if (v && peers[i].some((p) => grid[p] === v)) bad.add(i); });
  return bad;
};

/**
 * A puzzle with exactly one solution and up to `blanks` empty cells (fewer only if no more can go without losing
 * uniqueness). { size, given, solution }.
 */
export const makeSudoku = (size, blanks, rng = Math.random) => {
  const solution = randomSolution(size, rng);
  const given = [...solution];
  let removed = 0;
  for (const i of shuffled(rng, [...given.keys()])) {
    if (removed >= blanks) break;
    const keep = given[i];
    given[i] = 0;
    if (countSolutions(given, size, 2) === 1) removed += 1;
    else given[i] = keep;
  }
  return { size, given, solution };
};

/** The band's grid: size, blanks, how many puzzles a level, symbols or digits. */
export const sudokuConfig = (band, difficulty, levelNo) => {
  const t = Math.min(1, Math.max(0, (levelNo - 1) / 29));
  const lerp = (a, b) => Math.round(a + (b - a) * t);
  switch (band) {
    case 'foundation':
      return { size: 4, blanks: lerp(3, 6) + (difficulty - 1), puzzles: lerp(2, 3), symbols: true, perBlank: 14 };
    case 'developing':
      return { size: 4, blanks: lerp(6, 10) + (difficulty - 1), puzzles: lerp(2, 4), symbols: false, perBlank: 10 };
    case 'intermediate':
      return { size: 6, blanks: lerp(10, 18) + (difficulty - 1) * 2, puzzles: difficulty >= 2 ? 1 : lerp(1, 2), symbols: false, perBlank: 9 };
    case 'advanced':
      return { size: 9, blanks: lerp(38, 48) + (difficulty - 2) * 3, puzzles: 1, symbols: false, perBlank: 8 };
    default: // analytical, and the unknown band
      return difficulty >= 3
        ? { size: 9, blanks: lerp(30, 40), puzzles: 1, symbols: false, perBlank: 8 }
        : { size: 6, blanks: lerp(16, 22) + (difficulty - 1) * 2, puzzles: lerp(1, 2), symbols: false, perBlank: 8 };
  }
};
