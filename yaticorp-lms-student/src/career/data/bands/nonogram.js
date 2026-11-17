/**
 * Picture Logic (nonograms) by age band (2026-11-13). Pure, so node can test it.
 *
 * Young bands draw from a small hand-made library of recognisable pictures (heart, house, smiley …), every one checked
 * to be uniquely solvable from its clues; older bands get random pictures, kept only when the solver finds exactly one
 * solution (the game still accepts any grid that meets every clue, so even a rare fallback is always fair).
 */

/** The lengths of the filled runs in one line, or [0] for an empty line. */
export const runsOf = (line) => {
  const out = [];
  let run = 0;
  line.forEach((on) => {
    if (on) run += 1;
    else if (run) { out.push(run); run = 0; }
  });
  if (run) out.push(run);
  return out.length ? out : [0];
};

export const rowsOf = (cells, size) => Array.from({ length: size }, (_, r) => cells.slice(r * size, r * size + size));
export const colsOf = (cells, size) => Array.from({ length: size }, (_, c) => Array.from({ length: size }, (_, r) => cells[r * size + c]));
export const cluesOf = (cells, size) => ({ rows: rowsOf(cells, size).map(runsOf), cols: colsOf(cells, size).map(runsOf) });
const same = (a, b) => a.length === b.length && a.every((n, i) => n === b[i]);

/** Whether a grid of booleans meets every clue. */
export const meetsClues = (cells, size, rows, cols) =>
  rowsOf(cells, size).every((line, r) => same(runsOf(line), rows[r])) && colsOf(cells, size).every((line, c) => same(runsOf(line), cols[c]));

/* ---- Solver ------------------------------------------------------------- */

/**
 * Line solving: every placement of the clue's runs consistent with what is known (-1 unknown, 0 empty, 1 filled),
 * reduced to what all of them agree on. null when no placement fits (a contradiction).
 */
const solveLine = (clue, known) => {
  const n = known.length;
  const runs = clue[0] === 0 ? [] : clue;
  const agree = Array(n).fill(null); // null untouched, 0/1 agreed, 2 differs
  let any = false;
  const line = Array(n).fill(0);
  const place = (k, from) => {
    if (k === runs.length) {
      for (let i = from; i < n; i += 1) if (known[i] === 1) return;
      any = true;
      for (let i = 0; i < n; i += 1) {
        const v = i < from ? line[i] : 0;
        agree[i] = agree[i] === null ? v : agree[i] === v ? v : 2;
      }
      return;
    }
    const len = runs[k];
    const rest = runs.slice(k + 1).reduce((s, x) => s + x + 1, 0);
    for (let start = from; start + len + rest <= n; start += 1) {
      // Cells before the run (from `from`) must be empty.
      if (start > from && known[start - 1] === 1) break;
      let ok = true;
      for (let i = start; i < start + len; i += 1) if (known[i] === 0) { ok = false; break; }
      if (ok && start + len < n && known[start + len] === 1) ok = false;
      if (ok) {
        for (let i = from; i < start; i += 1) line[i] = 0;
        for (let i = start; i < start + len; i += 1) line[i] = 1;
        if (start + len < n) line[start + len] = 0;
        place(k + 1, Math.min(n, start + len + 1));
      }
    }
  };
  place(0, 0);
  if (!any) return null;
  return agree.map((v, i) => (v === 2 ? known[i] : v));
};

/** How many grids meet the clues, counting no further than `limit`. */
export const countNonogramSolutions = (rows, cols, limit = 2) => {
  const size = rows.length;
  let count = 0;
  const propagate = (grid) => {
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < size; r += 1) {
        const known = grid.slice(r * size, r * size + size);
        const out = solveLine(rows[r], known);
        if (!out) return false;
        out.forEach((v, c) => { if (v !== known[c]) { grid[r * size + c] = v; changed = true; } });
      }
      for (let c = 0; c < size; c += 1) {
        const known = Array.from({ length: size }, (_, r) => grid[r * size + c]);
        const out = solveLine(cols[c], known);
        if (!out) return false;
        out.forEach((v, r) => { if (v !== known[r]) { grid[r * size + c] = v; changed = true; } });
      }
    }
    return true;
  };
  const search = (grid) => {
    if (count >= limit) return;
    if (!propagate(grid)) return;
    const open = grid.indexOf(-1);
    if (open === -1) { count += 1; return; }
    for (const v of [1, 0]) {
      const next = [...grid];
      next[open] = v;
      search(next);
      if (count >= limit) return;
    }
  };
  search(Array(size * size).fill(-1));
  return count;
};

/* ---- Pictures ----------------------------------------------------------- */

const art = (name, emoji, rows) => ({ name, emoji, size: rows.length, cells: rows.join('').split('').map((ch) => ch === '#') });

export const PICTURES = [
  art('a box', '📦', ['####', '#..#', '#..#', '####']),
  art('stairs', '🪜', ['#...', '##..', '###.', '####']),
  art('the letter T', '🔤', ['####', '.##.', '.##.', '.##.']),
  art('the letter L', '🔤', ['#...', '#...', '#...', '####']),
  art('a flag', '🚩', ['###.', '####', '#...', '#...']),
  art('a house', '🏠', ['.##.', '####', '#..#', '#..#']),
  art('a happy face', '🙂', ['#..#', '....', '#..#', '.##.']),
  art('a cup', '☕', ['#.#.', '###.', '####', '###.']),
  art('a heart', '❤️', ['.#.#.', '#####', '#####', '.###.', '..#..']),
  art('a house', '🏠', ['..#..', '.###.', '#####', '.#.#.', '.#.#.']),
  art('a smiley', '🙂', ['.#.#.', '.#.#.', '.....', '#...#', '.###.']),
  art('a tree', '🌲', ['..#..', '.###.', '#####', '..#..', '.###.']),
  art('a boat', '⛵', ['..#..', '..##.', '..###', '..#..', '#####']),
  art('an arrow', '⬆️', ['..#..', '.###.', '#.#.#', '..#..', '..#..']),
  art('a cat', '🐱', ['#...#', '##.##', '#####', '#.#.#', '.###.']),
  art('a mushroom', '🍄', ['.###.', '#####', '#.#.#', '.###.', '.###.']),
  art('an umbrella', '☂️', ['.###.', '#####', '..#..', '..#..', '.##..']),
  art('a key', '🔑', ['.##..', '#..#.', '.###.', '..#..', '..##.']),
  art('a bird', '🐦', ['.##..', '###..', '.###.', '.####', '..#..']),
  art('a fish', '🐟', ['.....', '.##.#', '#####', '.##.#', '.....']),
  art('a cup', '☕', ['#...#', '#####', '#####', '.###.', '.....']),
  art('a sun', '☀️', ['#.#.#', '.###.', '#####', '.###.', '#.#.#'])
];

/** The library pictures that are uniquely solvable, by size (checked once). */
const LIBRARY = new Map();
export const libraryFor = (size) => {
  if (!LIBRARY.has(size)) {
    LIBRARY.set(size, PICTURES.filter((p) => {
      if (p.size !== size) return false;
      const { rows, cols } = cluesOf(p.cells, size);
      return countNonogramSolutions(rows, cols, 2) === 1;
    }));
  }
  return LIBRARY.get(size);
};

/**
 * A random picture with exactly one solution (a few dozen tries; then the last one, still fair because any grid that
 * meets the clues is accepted). No blank rows or columns.
 */
export const randomPicture = (size, rng = Math.random, tries = 80) => {
  let last = null;
  for (let t = 0; t < tries; t += 1) {
    const fill = 0.55 + rng() * 0.1;
    const cells = Array.from({ length: size * size }, () => rng() < fill);
    const lines = [...rowsOf(cells, size), ...colsOf(cells, size)];
    if (!lines.every((line) => line.some(Boolean))) continue;
    const { rows, cols } = cluesOf(cells, size);
    last = { name: null, emoji: null, size, cells, unique: false };
    if (countNonogramSolutions(rows, cols, 2) === 1) return { ...last, unique: true };
  }
  return last;
};

/** A puzzle: the picture plus its clues. */
export const makeNonogram = (size, fromLibrary, rng = Math.random, avoid = []) => {
  let pic = null;
  if (fromLibrary) {
    const lib = libraryFor(size);
    const fresh = lib.filter((p) => !avoid.includes(p.name + p.size + p.cells.join()));
    const pool = fresh.length ? fresh : lib;
    if (pool.length) pic = { ...pool[Math.floor(rng() * pool.length)], unique: true };
  }
  if (!pic) pic = randomPicture(size, rng);
  return { ...pic, id: (pic.name || '') + pic.size + pic.cells.join(), ...cluesOf(pic.cells, size) };
};

/** The band's setup: grid size, puzzles per level, library pictures or random, seconds per cell. */
export const nonogramConfig = (band, difficulty, levelNo) => {
  const t = Math.min(1, Math.max(0, (levelNo - 1) / 29));
  switch (band) {
    case 'foundation':
      return { size: levelNo >= 8 || difficulty > 1 ? 5 : 4, puzzles: levelNo >= 5 ? 3 : 2, library: true, perCell: 6 };
    case 'developing':
      return { size: 5, puzzles: t > 0.4 ? 3 : 2, library: true, perCell: 4.5 };
    case 'intermediate':
      return { size: difficulty >= 2 ? 7 : 6, puzzles: 2, library: false, perCell: 3.2 - t * 0.6 };
    case 'advanced':
      return { size: difficulty >= 3 ? (t > 0.5 ? 10 : 9) : 8, puzzles: 1, library: false, perCell: 2.6 - t * 0.4 };
    default: // analytical, and today's game for an unknown band
      return { size: Math.min(8, 5 + difficulty + (t > 0.5 ? 1 : 0)), puzzles: difficulty >= 3 ? 1 : 2, library: false, perCell: 3 - t * 0.6 };
  }
};
