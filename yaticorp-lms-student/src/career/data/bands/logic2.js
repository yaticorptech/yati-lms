/**
 * Rising Brains · Logic & Deduction (2026-11-16, second set). Pure and seeded.
 *   Crown Garden    (id "clue-chain")      — one crown in every row, column and garden; crowns never touch
 * Every Crown Garden board has exactly one solution (checked by the solver here).
 */
import { intBetween, pick, shuffle } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const stepOf = (ageBand, difficulty, levelNo) =>
  clampN(Math.ceil(levelNo / 3) + ((difficulty || 1) - 1) * 2 + (ageBand === 'analytical' ? 3 : 0), 1, 14);

/* ───────────────────────────── Crown Garden ───────────────────────────── */

export const gardenConfig = (ageBand, difficulty, levelNo) => {
  const s = stepOf(ageBand, difficulty, levelNo);
  return { size: s <= 2 ? 5 : s <= 5 ? 6 : s <= 8 ? 7 : 8, puzzles: 2 };
};

/** Solutions (row → column), up to `limit`: one crown per row, column and region, no two touching. */
export const gardenSolutions = (size, regions, limit = 2) => {
  const found = [];
  const cols = new Set();
  const used = new Set();
  const path = [];
  const rec = (r, prev) => {
    if (found.length >= limit) return;
    if (r === size) { found.push([...path]); return; }
    for (let c = 0; c < size; c += 1) {
      const g = regions[r * size + c];
      if (cols.has(c) || used.has(g) || (prev >= 0 && Math.abs(c - prev) <= 1)) continue;
      cols.add(c); used.add(g); path.push(c);
      rec(r + 1, c);
      cols.delete(c); used.delete(g); path.pop();
    }
  };
  rec(0, -1);
  return found;
};
export const countGardenSolutions = (size, regions, limit = 2) => gardenSolutions(size, regions, limit).length;

/** Is garden `g` still in one piece? */
const connected = (size, regions, g) => {
  const cells = regions.map((v, i) => (v === g ? i : -1)).filter((i) => i >= 0);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]);
  const stack = [cells[0]];
  while (stack.length) {
    const i = stack.pop();
    const r = Math.floor(i / size);
    const c = i % size;
    for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const nr = r + dr;
      const nc = c + dc;
      const j = nr * size + nc;
      if (nr >= 0 && nc >= 0 && nr < size && nc < size && regions[j] === g && !seen.has(j)) { seen.add(j); stack.push(j); }
    }
  }
  return seen.size === cells.length;
};

/** A board: { size, regions (cell → garden), crowns (row → column, the one solution) }. */
export const makeGarden = (rng, config) => {
  const { size } = config;
  for (let attempt = 0; attempt < 400; attempt += 1) {
    // Crowns: one per row and column, never in touching rows' neighbouring columns.
    const crowns = [];
    const usedCols = new Set();
    const place = (r) => {
      if (r === size) return true;
      for (const c of shuffle(rng, Array.from({ length: size }, (_, i) => i))) {
        if (usedCols.has(c) || (r > 0 && Math.abs(c - crowns[r - 1]) <= 1)) continue;
        crowns.push(c); usedCols.add(c);
        if (place(r + 1)) return true;
        crowns.pop(); usedCols.delete(c);
      }
      return false;
    };
    if (!place(0)) continue;
    // Gardens: grow from each crown, one random cell at a time, until the board is covered.
    const regions = Array(size * size).fill(-1);
    crowns.forEach((c, r) => { regions[r * size + c] = r; });
    let open = size * size - size;
    while (open > 0) {
      const g = intBetween(rng, 0, size - 1);
      const edge = [];
      regions.forEach((v, i) => {
        if (v !== g) return;
        const r = Math.floor(i / size);
        const c = i % size;
        for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nc >= 0 && nr < size && nc < size && regions[nr * size + nc] === -1) edge.push(nr * size + nc);
        }
      });
      if (!edge.length) continue;
      regions[pick(rng, edge)] = g;
      open -= 1;
    }
    // Make it unique: while another solution exists, move one of its crown cells into a neighbouring garden.
    const mine = new Set(crowns.map((c, r) => r * size + c));
    let ok = false;
    for (let fix = 0; fix < 80; fix += 1) {
      const sols = gardenSolutions(size, regions, 2);
      const other = sols.find((sol) => sol.some((c, r) => c !== crowns[r]));
      if (!other) { ok = sols.length === 1; break; }
      const cells = shuffle(rng, other.map((c, r) => r * size + c).filter((i) => !mine.has(i)));
      let moved = false;
      for (const i of cells) {
        const r = Math.floor(i / size);
        const c = i % size;
        const from = regions[i];
        const near = shuffle(rng, [[0, 1], [1, 0], [0, -1], [-1, 0]].map(([dr, dc]) => [r + dr, c + dc])
          .filter(([nr, nc]) => nr >= 0 && nc >= 0 && nr < size && nc < size && regions[nr * size + nc] !== from)
          .map(([nr, nc]) => regions[nr * size + nc]));
        for (const g of near) {
          regions[i] = g;
          if (connected(size, regions, from)) { moved = true; break; }
          regions[i] = from;
        }
        if (moved) break;
      }
      if (!moved) break;
    }
    if (ok) return { size, regions, crowns };
  }
  throw new Error('crown garden: no unique board');
};

/** Problems on a board of marks (0 empty, 1 ✕, 2 crown): the crown cells that break a rule. */
export const gardenClashes = (size, regions, marks) => {
  const crowns = marks.map((m, i) => (m === 2 ? i : -1)).filter((i) => i >= 0);
  const bad = new Set();
  for (let a = 0; a < crowns.length; a += 1) for (let b = a + 1; b < crowns.length; b += 1) {
    const [i, j] = [crowns[a], crowns[b]];
    const [ri, ci, rj, cj] = [Math.floor(i / size), i % size, Math.floor(j / size), j % size];
    if (ri === rj || ci === cj || regions[i] === regions[j] || (Math.abs(ri - rj) <= 1 && Math.abs(ci - cj) <= 1)) { bad.add(i); bad.add(j); }
  }
  return bad;
};
export const gardenSolved = (size, regions, marks) =>
  marks.filter((m) => m === 2).length === size && gardenClashes(size, regions, marks).size === 0;

/** Stars from the time taken and hints used. */
export const gardenStars = (size, seconds, hints) => Math.max(1, (seconds <= size * 15 ? 3 : seconds <= size * 30 ? 2 : 1) - hints);
