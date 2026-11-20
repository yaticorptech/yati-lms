/**
 * Number Maze (2026-11-19, the user picked it for Rising Brains · Maths; it takes Number Pattern Lab's game id
 * "number-pattern-lab", which the server already accepts). Pure and seeded.
 *
 * A grid of numbers, a start 🚩 on the left edge and an exit 🏁 on the right. Draw a path, one square at a time
 * (up, down, left or right), where every step keeps the maze's rule — "only go to a bigger number", "only step on
 * multiples of 3", "each step adds 4" … A hidden route always exists; any route that keeps the rule counts.
 */
import { intBetween, pick, shuffle } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const mazeStep = (ageBand, difficulty, levelNo) =>
  clampN(Math.ceil((levelNo || 1) / 3) + ((difficulty || 1) - 1) * 2 + (ageBand === 'analytical' ? 3 : 0), 1, 14);

/**
 * The rules. `ok(prev, next)` says whether a step from prev to next is allowed (prev is null for the start square).
 * `make(rng, len)` gives the values along a hidden route of `len` squares; `noise(rng)` a value for any other square.
 */
const RULES = {
  bigger: (cfg) => ({
    name: 'Bigger and bigger',
    text: 'Every step must go to a BIGGER number.',
    ok: (a, b) => a === null || b > a,
    make: (rng, len) => { const out = [intBetween(rng, 1, 6)]; while (out.length < len) out.push(out[out.length - 1] + intBetween(rng, 1, cfg.jump)); return out; },
    noise: (rng, route) => intBetween(rng, 1, Math.max(...route) + 4)
  }),
  smaller: (cfg) => ({
    name: 'Going down',
    text: 'Every step must go to a SMALLER number.',
    ok: (a, b) => a === null || b < a,
    make: (rng, len) => { const out = [len * cfg.jump + intBetween(rng, 2, 10)]; while (out.length < len) out.push(out[out.length - 1] - intBetween(rng, 1, cfg.jump)); return out; },
    noise: (rng, route) => intBetween(rng, Math.max(1, Math.min(...route) - 3), route[0] + 3)
  }),
  multiple: (cfg, rng) => {
    const k = pick(rng, cfg.factors);
    const yes = (n) => n % k === 0;
    return {
      name: `Multiples of ${k}`,
      text: `Step ONLY on numbers in the ${k} times table.`,
      ok: (_, b) => yes(b),
      make: (r, len) => Array.from({ length: len }, () => k * intBetween(r, 1, 12)),
      // Mostly not in the table, some decoys that are (dead ends)
      noise: (r) => { if (r() < cfg.decoy) return k * intBetween(r, 1, 12); let n; do n = intBetween(r, 2, k * 12); while (yes(n)); return n; }
    };
  },
  even: (cfg) => ({
    name: 'Even numbers',
    text: 'Step ONLY on even numbers.',
    ok: (_, b) => b % 2 === 0,
    make: (r, len) => Array.from({ length: len }, () => 2 * intBetween(r, 1, 30)),
    noise: (r) => (r() < cfg.decoy ? 2 * intBetween(r, 1, 30) : 2 * intBetween(r, 0, 29) + 1)
  }),
  oddEven: (cfg) => ({
    name: 'Odd, even, odd …',
    text: 'Start on an ODD number, then go even, odd, even … in turn.',
    ok: (a, b) => (a === null ? b % 2 === 1 : (a % 2) !== (b % 2)),
    make: (r, len) => Array.from({ length: len }, (_, i) => 2 * intBetween(r, 1, 30) - (i % 2 === 0 ? 1 : 0)),
    noise: (r) => intBetween(r, 1, 60 + cfg.decoy)
  }),
  plus: (cfg, rng) => {
    const k = intBetween(rng, 2, cfg.plusMax);
    return {
      name: `Add ${k}`,
      text: `Every step must ADD exactly ${k}.`,
      ok: (a, b) => a === null || b === a + k,
      make: (r, len) => { const s = intBetween(r, 1, 12); return Array.from({ length: len }, (_, i) => s + k * i); },
      noise: (r, route) => { const near = pick(r, route) + pick(r, [k, k + 1, k - 1, 2 * k, -k]); return r() < 0.5 && near > 0 ? near : intBetween(r, 1, route[route.length - 1] + k); }
    };
  }
};

/** Board size, the rules on offer and how tricky the other squares are. */
export const mazeConfig = (ageBand, difficulty, levelNo) => {
  const s = mazeStep(ageBand, difficulty, levelNo);
  return {
    step: s,
    cols: 5,
    rows: s <= 3 ? 5 : s <= 8 ? 6 : 7,
    rules: s <= 2 ? ['bigger', 'even', 'multiple'] : s <= 5 ? ['bigger', 'multiple', 'oddEven', 'smaller'] : ['multiple', 'oddEven', 'plus', 'bigger', 'smaller'],
    factors: s <= 3 ? [2, 5, 10] : s <= 7 ? [3, 4, 5] : [3, 4, 6, 7, 9],
    jump: s <= 4 ? 4 : 7,
    plusMax: s <= 9 ? 5 : 9,
    decoy: s <= 3 ? 0.2 : s <= 8 ? 0.3 : 0.38,
    minLen: s <= 3 ? 7 : s <= 8 ? 9 : 11,
    mazes: 3,
    seconds: s <= 4 ? 150 : 180
  };
};

const NEXT = [[0, 1], [1, 0], [-1, 0], [0, -1]];
export const adjacent = (a, b, cols) => Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs((a % cols) - (b % cols)) === 1;

/** A winding route from a square on the left edge to one on the right edge. */
const route = (rng, cfg) => {
  const { rows, cols } = cfg;
  for (;;) {
    const start = intBetween(rng, 0, rows - 1) * cols;
    const path = [start];
    const seen = new Set(path);
    let budget = 3000;
    const walk = () => {
      if (--budget < 0) return false;
      const at = path[path.length - 1];
      if (at % cols === cols - 1) return path.length >= cfg.minLen;
      for (const [dr, dc] of shuffle(rng, NEXT)) {
        const r = Math.floor(at / cols) + dr; const c = (at % cols) + dc;
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        const n = r * cols + c;
        if (seen.has(n)) continue;
        // Stay a thin line: never touch an earlier square of the route side-on (except the one just left).
        if (path.slice(0, -1).some((p) => adjacent(p, n, cols))) continue;
        path.push(n); seen.add(n);
        if (walk()) return true;
        path.pop(); seen.delete(n);
      }
      return false;
    };
    if (walk()) return path;
  }
};

/** Does `path` (square indexes) solve the maze? */
export const mazeSolved = (maze, path) => {
  if (!path.length || path[0] !== maze.start || path[path.length - 1] !== maze.exit) return false;
  for (let i = 0; i < path.length; i += 1) {
    if (i > 0 && !adjacent(path[i - 1], path[i], maze.cols)) return false;
    if (!maze.rule.ok(i ? maze.values[path[i - 1]] : null, maze.values[path[i]])) return false;
  }
  return new Set(path).size === path.length;
};

/** One maze: { rows, cols, values, start, exit, rule: { key, name, text, ok }, route }. */
export const makeMaze = (rng, cfg, last = null) => {
  const key = pick(rng, cfg.rules.filter((k) => k !== last));
  const rule = { key, ...RULES[key](cfg, rng) };
  const path = route(rng, cfg);
  const along = rule.make(rng, path.length);
  const values = Array.from({ length: cfg.rows * cfg.cols }, () => 0);
  path.forEach((p, i) => { values[p] = along[i]; });
  for (let i = 0; i < values.length; i += 1) if (!path.includes(i)) values[i] = rule.noise(rng, along);
  return { rows: cfg.rows, cols: cfg.cols, values, start: path[0], exit: path[path.length - 1], rule, route: path };
};

export const makeMazeLevel = (rng, cfg) => {
  const out = [];
  for (let i = 0; i < cfg.mazes; i += 1) out.push(makeMaze(rng, cfg, out[i - 1]?.rule.key));
  return out;
};
