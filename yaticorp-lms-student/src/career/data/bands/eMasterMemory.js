/**
 * Group E, Master Minds memory (2026-11-14): Matrix Recall (Dual-Stream Memory was removed 2026-11-16). Pure and seeded.
 * Master section only: every age plays the 'advanced' band, scaled by difficulty (1–3) and step (1–30).
 */
import { intBetween, pick, shuffle } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const t01 = (levelNo) => clampN(((levelNo || 1) - 1) / 29, 0, 1);
const diffOf = (difficulty) => clampN(difficulty || 1, 1, 3);

/* ═══════════════════════════════ Matrix Recall ════════════════════════════ */

export const matrixConfig = (_ageBand, difficulty = 1, levelNo = 1) => {
  const d = diffOf(difficulty);
  const t = t01(levelNo);
  const size = clampN(3 + d + (t >= 0.6 ? 1 : 0), 4, 6);
  return {
    band: 'advanced',
    size,
    matrices: 3,
    queries: d === 1 ? 3 : 4,
    kinds: d === 1 ? ['cell', 'where', 'rowsum'] : d === 2 ? ['cell', 'where', 'rowsum', 'colsum', 'fill'] : ['fill', 'where', 'rowsum', 'colsum', 'cell', 'count'],
    fillCells: d === 3 ? 3 : 2,
    // Show time grows with the cells but less per cell as the level climbs.
    showSeconds: Math.round(size * size * (0.75 - 0.1 * (d - 1) - 0.15 * t))
  };
};

const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
export const rowName = (r) => `row ${r + 1}`;
export const colName = (c) => `column ${c + 1}`;

/** A size×size grid of digits 1–9 in which `unique` (one digit) appears exactly once. */
const makeGrid = (rng, size, unique) => {
  const others = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => d !== unique);
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => pick(rng, others)));
  grid[intBetween(rng, 0, size - 1)][intBetween(rng, 0, size - 1)] = unique;
  return grid;
};

/**
 * Questions about one matrix:
 *  cell   — "What digit was in row r, column c?"        answer: digit
 *  fill   — several highlighted cells to fill in         answer: { "r-c": digit }
 *  where  — "Tap the cell that held 7" (the 7 is unique) answer: "r-c"
 *  rowsum / colsum — the total of a row / column         answer: number
 *  count  — "How many 4s were in row r?"                 answer: number (≥ 1)
 */
export const makeMatrix = (rng, cfg) => {
  const n = cfg.size;
  const unique = intBetween(rng, 1, 9);
  const grid = makeGrid(rng, n, unique);
  const kinds = shuffle(rng, cfg.kinds);
  const chosen = kinds.slice(0, cfg.queries);
  const used = new Set();
  const freshCell = () => {
    for (let g = 0; g < 100; g++) {
      const id = `${intBetween(rng, 0, n - 1)}-${intBetween(rng, 0, n - 1)}`;
      if (!used.has(id)) { used.add(id); return id; }
    }
    return `${intBetween(rng, 0, n - 1)}-${intBetween(rng, 0, n - 1)}`;
  };
  const queries = chosen.map((kind) => {
    if (kind === 'cell') {
      const id = freshCell();
      const [r, c] = id.split('-').map(Number);
      return { kind, cells: [id], prompt: `What digit was in ${rowName(r)}, ${colName(c)}?`, answer: grid[r][c] };
    }
    if (kind === 'fill') {
      const cells = Array.from({ length: cfg.fillCells }, freshCell);
      return { kind, cells, prompt: `Fill in the ${cells.length} highlighted cells.`, answer: Object.fromEntries(cells.map((id) => { const [r, c] = id.split('-').map(Number); return [id, grid[r][c]]; })) };
    }
    if (kind === 'where') {
      const r = grid.findIndex((row) => row.includes(unique));
      return { kind, digit: unique, prompt: `Tap the cell that held the ${unique}.`, answer: `${r}-${grid[r].indexOf(unique)}` };
    }
    if (kind === 'rowsum') {
      const r = intBetween(rng, 0, n - 1);
      return { kind, line: { row: r }, prompt: `What was the sum of the ${ORD[r]} row?`, answer: grid[r].reduce((a, v) => a + v, 0) };
    }
    if (kind === 'colsum') {
      const c = intBetween(rng, 0, n - 1);
      return { kind, line: { col: c }, prompt: `What was the sum of the ${ORD[c]} column?`, answer: grid.reduce((a, row) => a + row[c], 0) };
    }
    // count: a digit that does occur in the row, so the answer is at least one.
    const r = intBetween(rng, 0, n - 1);
    const digit = pick(rng, grid[r]);
    return { kind, line: { row: r }, digit, prompt: `How many ${digit}s were in the ${ORD[r]} row?`, answer: grid[r].filter((v) => v === digit).length };
  });
  return { grid, unique, queries };
};

export const makeMatrixLevel = (rng, cfg) => Array.from({ length: cfg.matrices }, () => makeMatrix(rng, cfg));

/** Is a response right? `cell`/`rowsum`/`colsum`/`count` take a number, `where` a "r-c" id, `fill` an { id: digit } map. */
export const checkMatrixQuery = (q, response) => {
  if (q.kind === 'fill') return q.cells.every((id) => Number(response?.[id]) === q.answer[id]);
  if (q.kind === 'where') return response === q.answer;
  return Number(response) === q.answer && response !== '' && response !== null && response !== undefined;
};

