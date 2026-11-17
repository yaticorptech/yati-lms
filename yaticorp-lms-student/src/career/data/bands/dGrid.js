/**
 * Constraint Grid (KenKen-style) — pure, seeded puzzle generation and checking.
 *
 * A puzzle is an n×n Latin square cut into cages. Each cage carries a target and
 * an operator (+ − × ÷, or none for a one-cell cage). The generator:
 *   1. deals a random Latin square (cyclic square, rows/columns/symbols shuffled),
 *   2. cuts it into connected cages and gives each a target its cells really make,
 *   3. counts solutions with a backtracking solver; while a second solution exists
 *      it splits off one cell where that solution differs as a one-cell cage
 *      (a "given"), which removes the rival — so the result is always UNIQUE.
 */
import { intBetween, pick, shuffle } from '../seeded.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export const gridBand = (ageBand) => (ageBand === 'analytical' || ageBand === 'advanced' ? 'analytical' : 'intermediate');

/**
 * How a level plays.
 *  size      grid side (4 for Classes 6–8; 5, then 6 for Classes 9–10)
 *  ops       operators cages may use
 *  maxCage   largest cage
 *  givens    one-cell cages dealt up front (before uniqueness adds any)
 *  seconds   level clock
 *  checks    free "Check" presses before the stars drop
 */
export const gridConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = gridBand(ageBand);
  const d = clamp(difficulty || 1, 1, 3);
  const t = clamp((levelNo - 1) / 29, 0, 1);
  if (band === 'intermediate') {
    const ops = d === 1 ? (t < 0.5 ? ['+'] : ['+', '−']) : d === 2 ? ['+', '−'] : ['+', '−', '×'];
    return { band, size: 4, ops, maxCage: d === 1 ? 2 : 3, givens: d === 1 ? 3 : d === 2 ? 2 : 1, seconds: Math.round(300 - 60 * t - 20 * (d - 1)) };
  }
  const size = d === 3 || (d === 2 && t >= 0.5) ? 6 : 5;
  const ops = d === 1 && t < 0.5 ? ['+', '−', '×'] : ['+', '−', '×', '÷'];
  return { band, size, ops, maxCage: size === 6 ? 3 : d === 1 ? 2 : 3, givens: size === 6 ? 2 : d === 1 ? 2 : 1, seconds: size === 6 ? Math.round(720 - 120 * t) : Math.round(480 - 90 * t) };
};

/** A random Latin square: values 1..n. */
export const latinSquare = (rng, n) => {
  const rows = shuffle(rng, [...Array(n).keys()]);
  const cols = shuffle(rng, [...Array(n).keys()]);
  const sym = shuffle(rng, [...Array(n).keys()].map((i) => i + 1));
  return rows.map((r) => cols.map((c) => sym[(r + c) % n]));
};

const key = (r, c) => `${r},${c}`;
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Give a cage its operator and the target its solution values make. */
const labelCage = (rng, cells, sol, ops) => {
  const vals = cells.map(([r, c]) => sol[r][c]);
  if (vals.length === 1) return { cells, op: '', target: vals[0] };
  const options = [];
  if (vals.length === 2) {
    const a = Math.max(...vals);
    const b = Math.min(...vals);
    if (ops.includes('−')) options.push(['−', a - b], ['−', a - b]);
    if (ops.includes('÷') && b > 1 && a % b === 0) options.push(['÷', a / b], ['÷', a / b], ['÷', a / b]);
  }
  if (ops.includes('×')) options.push(['×', vals.reduce((p, v) => p * v, 1)]);
  options.push(['+', vals.reduce((s, v) => s + v, 0)]);
  const [op, target] = pick(rng, options);
  return { cells, op, target };
};

/** Connected pieces of a set of cells. */
const components = (cells) => {
  const left = new Map(cells.map((c) => [key(...c), c]));
  const out = [];
  while (left.size) {
    const [k0, c0] = left.entries().next().value;
    left.delete(k0);
    const comp = [c0];
    const stack = [c0];
    while (stack.length) {
      const [r, c] = stack.pop();
      for (const [dr, dc] of NB) {
        const k = key(r + dr, c + dc);
        if (left.has(k)) { const cell = left.get(k); left.delete(k); comp.push(cell); stack.push(cell); }
      }
    }
    out.push(comp);
  }
  return out;
};

const sortCells = (cells) => [...cells].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

/** Cut the board into connected cages of 1..maxCage cells. */
const cutCages = (rng, n, maxCage, givens) => {
  const owner = Array.from({ length: n }, () => Array(n).fill(-1));
  const groups = [];
  const order = shuffle(rng, [...Array(n * n).keys()].map((i) => [Math.floor(i / n), i % n]));
  for (const [r, c] of order.slice(0, givens)) { owner[r][c] = groups.length; groups.push([[r, c]]); }
  for (const [r, c] of order) {
    if (owner[r][c] >= 0) continue;
    const id = groups.length;
    const cage = [[r, c]];
    owner[r][c] = id;
    const want = intBetween(rng, 2, Math.max(2, maxCage));
    while (cage.length < want) {
      const free = [];
      for (const [cr, cc] of cage) {
        for (const [dr, dc] of NB) {
          const nr = cr + dr, nc = cc + dc;
          if (nr >= 0 && nr < n && nc >= 0 && nc < n && owner[nr][nc] < 0) free.push([nr, nc]);
        }
      }
      if (!free.length) break;
      const [nr, nc] = pick(rng, free);
      owner[nr][nc] = id;
      cage.push([nr, nc]);
    }
    groups.push(cage);
  }
  return groups.map(sortCells);
};

/** Does a cage (all filled) meet its target? */
export const cageMet = (cage, vals) => {
  if (cage.op === '') return vals[0] === cage.target;
  if (cage.op === '+') return vals.reduce((s, v) => s + v, 0) === cage.target;
  if (cage.op === '×') return vals.reduce((p, v) => p * v, 1) === cage.target;
  const a = Math.max(...vals), b = Math.min(...vals);
  if (cage.op === '−') return a - b === cage.target;
  if (cage.op === '÷') return b > 0 && a === b * cage.target;
  return false;
};

/** Could a part-filled cage still reach its target? `vals` are the filled ones, `open` how many are empty. */
const cageCould = (cage, vals, open, n) => {
  if (open === 0) return cageMet(cage, vals);
  if (cage.op === '') return true;
  if (cage.op === '+') {
    const s = vals.reduce((a, v) => a + v, 0);
    return s + open <= cage.target && s + open * n >= cage.target;
  }
  if (cage.op === '×') {
    const p = vals.reduce((a, v) => a * v, 1);
    return cage.target % p === 0 && p * n ** open >= cage.target;
  }
  if (cage.op === '−') { const v = vals[0]; return (v + cage.target <= n) || (v - cage.target >= 1); }
  if (cage.op === '÷') { const v = vals[0]; return v * cage.target <= n || v % cage.target === 0; }
  return true;
};

/** owner grid: index of the cage each cell sits in. */
export const cageIndex = (n, cages) => {
  const owner = Array.from({ length: n }, () => Array(n).fill(-1));
  cages.forEach((cage, i) => cage.cells.forEach(([r, c]) => { owner[r][c] = i; }));
  return owner;
};

/** Count solutions up to `limit`; returns { count, solutions }. Backtracking with fewest-candidates-first. */
export const solveGrid = (n, cages, limit = 2) => {
  const owner = cageIndex(n, cages);
  const g = Array.from({ length: n }, () => Array(n).fill(0));
  const rowUsed = Array(n).fill(0);
  const colUsed = Array(n).fill(0);
  const solutions = [];
  const fits = (r, c, v) => {
    if ((rowUsed[r] >> v) & 1 || (colUsed[c] >> v) & 1) return false;
    const cage = cages[owner[r][c]];
    const vals = [v];
    let open = 0;
    for (const [cr, cc] of cage.cells) {
      if (cr === r && cc === c) continue;
      if (g[cr][cc]) vals.push(g[cr][cc]); else open++;
    }
    return cageCould(cage, vals, open, n);
  };
  const dfs = () => {
    if (solutions.length >= limit) return;
    let best = null, bestCands = null;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (g[r][c]) continue;
        const cands = [];
        for (let v = 1; v <= n; v++) if (fits(r, c, v)) cands.push(v);
        if (!cands.length) return;
        if (!best || cands.length < bestCands.length) { best = [r, c]; bestCands = cands; }
      }
    }
    if (!best) { solutions.push(g.map((row) => [...row])); return; }
    const [r, c] = best;
    for (const v of bestCands) {
      g[r][c] = v; rowUsed[r] |= 1 << v; colUsed[c] |= 1 << v;
      dfs();
      g[r][c] = 0; rowUsed[r] &= ~(1 << v); colUsed[c] &= ~(1 << v);
      if (solutions.length >= limit) return;
    }
  };
  dfs();
  return { count: solutions.length, solutions };
};

/**
 * A puzzle: { n, solution, cages: [{ cells, op, target }] } with exactly one solution.
 */
export const makeGrid = (rng, config) => {
  const n = config.size;
  const solution = latinSquare(rng, n);
  let cages = cutCages(rng, n, config.maxCage, config.givens).map((cells) => labelCage(rng, cells, solution, config.ops));
  for (let guard = 0; guard < n * n; guard++) {
    const { count, solutions } = solveGrid(n, cages, 2);
    if (count === 1) break;
    const rival = solutions.find((s) => s.some((row, r) => row.some((v, c) => v !== solution[r][c])));
    const diffs = [];
    rival.forEach((row, r) => row.forEach((v, c) => { if (v !== solution[r][c]) diffs.push([r, c]); }));
    const [r, c] = pick(rng, diffs);
    const owner = cageIndex(n, cages);
    const i = owner[r][c];
    const rest = cages[i].cells.filter(([cr, cc]) => cr !== r || cc !== c);
    const pieces = [[[r, c]], ...components(rest)].map((cells) => labelCage(rng, sortCells(cells), solution, config.ops));
    cages = [...cages.slice(0, i), ...pieces, ...cages.slice(i + 1)];
  }
  // Read in board order, so the cage list matches what the eye sees.
  cages.sort((a, b) => a.cells[0][0] - b.cells[0][0] || a.cells[0][1] - b.cells[0][1]);
  return { n, solution, cages };
};

/** The label a cage shows in its top-left cell: "12+", "2÷", "3". */
export const cageLabel = (cage) => `${cage.target}${cage.op}`;

/**
 * Check a board (0 = empty).
 *  conflicts — cells repeating a digit in their row or column ("r,c" keys)
 *  badCages  — indexes of full cages that miss their target
 *  full, solved
 */
export const checkGrid = (puzzle, grid) => {
  const { n, cages } = puzzle;
  const conflicts = new Set();
  for (let i = 0; i < n; i++) {
    const rowSeen = new Map(), colSeen = new Map();
    for (let j = 0; j < n; j++) {
      const rv = grid[i][j], cv = grid[j][i];
      if (rv) { if (rowSeen.has(rv)) { conflicts.add(key(i, j)); conflicts.add(key(i, rowSeen.get(rv))); } else rowSeen.set(rv, j); }
      if (cv) { if (colSeen.has(cv)) { conflicts.add(key(j, i)); conflicts.add(key(colSeen.get(cv), i)); } else colSeen.set(cv, j); }
    }
  }
  const badCages = [];
  cages.forEach((cage, idx) => {
    const vals = cage.cells.map(([r, c]) => grid[r][c]);
    if (vals.every(Boolean) && !cageMet(cage, vals)) badCages.push(idx);
  });
  const full = grid.every((row) => row.every((v) => v >= 1 && v <= n));
  return { conflicts, badCages, full, solved: full && conflicts.size === 0 && badCages.length === 0 };
};

/** Stars: a solved grid earns 3, less one each for leaning on Check (more than `free`, then more than free+2). */
export const gridStars = ({ solved, checks, free = 1 }) => {
  if (!solved) return 0;
  return checks <= free ? 3 : checks <= free + 2 ? 2 : 1;
};
