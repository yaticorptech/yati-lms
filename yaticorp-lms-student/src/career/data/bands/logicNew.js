/**
 * Rising Brains · Logic & Deduction, the 2026-11-16 games (pure and seeded, so node can test them):
 *   Pipe Flow       (id "constraint-grid") — rotate pipe tiles until water runs from the tap to the plant
 *   Emoji Equations (id "emoji-equations") — work out what each picture is worth, then answer the last line
 *   Tower Strategy  (id "tower-strategy")  — three towers of mixed colours: move blocks until each tower is one colour
 * Every puzzle is checked by a solver here, so each one can be solved.
 */
import { intBetween, pick, shuffle } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
/** A single difficulty step from band, difficulty and level: about 1 (Class 6, level 1) to 12. */
const stepOf = (ageBand, difficulty, levelNo) =>
  clampN(Math.ceil(levelNo / 3) + ((difficulty || 1) - 1) * 2 + (ageBand === 'analytical' ? 3 : 0), 1, 14);

/* ───────────────────────────── Pipe Flow ───────────────────────────── */

// Tile openings at rotation 0, as a bitmask N=1 E=2 S=4 W=8; each rotation turns it a quarter clockwise.
const SHAPES = { straight: 1 | 4, elbow: 1 | 2, tee: 1 | 2 | 4 };
const N = 1; const E = 2; const S = 4; const W = 8;
const rotMask = (m, r) => { let x = m; for (let i = 0; i < r; i += 1) x = ((x << 1) | (x >> 3)) & 15; return x; };
export const openings = (tile) => rotMask(SHAPES[tile.shape], tile.rot);
const STEP = { [N]: [-1, 0, S], [E]: [0, 1, W], [S]: [1, 0, N], [W]: [0, -1, E] };

export const pipeConfig = (ageBand, difficulty, levelNo) => {
  const s = stepOf(ageBand, difficulty, levelNo);
  // 2026-11-19 (the user: "add more pipes", a tall board that fills a phone): more rows than columns.
  return { cols: s <= 5 ? 5 : 6, rows: s <= 2 ? 6 : s <= 5 ? 7 : 8, puzzles: 3 };
};

/** Does water run from the tap (west of the source cell) to the plant (east of the sink cell)? */
export const pipeFlows = (p, tiles) => {
  const at = (r, c) => tiles[r * p.cols + c];
  if (!(openings(at(p.source, 0)) & W)) return false;
  const seen = new Set([p.source * p.cols]);
  const queue = [[p.source, 0]];
  while (queue.length) {
    const [r, c] = queue.shift();
    const m = openings(at(r, c));
    if (r === p.sink && c === p.cols - 1 && m & E) return true;
    for (const bit of [N, E, S, W]) {
      if (!(m & bit)) continue;
      const [dr, dc, back] = STEP[bit];
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= p.rows || nc >= p.cols) continue;
      if (!(openings(at(nr, nc)) & back) || seen.has(nr * p.cols + nc)) continue;
      seen.add(nr * p.cols + nc);
      queue.push([nr, nc]);
    }
  }
  return false;
};

/** The set of cells water reaches (for colouring the flow). */
export const wetCells = (p, tiles) => {
  const at = (r, c) => tiles[r * p.cols + c];
  const wet = new Set();
  if (!(openings(at(p.source, 0)) & W)) return wet;
  wet.add(p.source * p.cols);
  const queue = [[p.source, 0]];
  while (queue.length) {
    const [r, c] = queue.shift();
    const m = openings(at(r, c));
    for (const bit of [N, E, S, W]) {
      if (!(m & bit)) continue;
      const [dr, dc, back] = STEP[bit];
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= p.rows || nc >= p.cols || wet.has(nr * p.cols + nc) || !(openings(at(nr, nc)) & back)) continue;
      wet.add(nr * p.cols + nc);
      queue.push([nr, nc]);
    }
  }
  return wet;
};

export const makePipePuzzle = (rng, config) => {
  const { cols, rows } = config;
  for (;;) {
    const source = intBetween(rng, 0, rows - 1);
    const sink = intBetween(rng, 0, rows - 1);
    // A self-avoiding walk from the source cell to the sink cell (depth-first, random order).
    const path = [];
    const used = new Set();
    let budget = 4000; // steps of search before trying a fresh start
    const walk = (r, c) => {
      budget -= 1;
      if (budget < 0) return false;
      path.push([r, c]);
      used.add(r * cols + c);
      if (r === sink && c === cols - 1) return true;
      if (path.length > cols * rows * 0.7) { path.pop(); used.delete(r * cols + c); return false; }
      for (const [dr, dc] of shuffle(rng, [[0, 1], [1, 0], [-1, 0], [0, -1]])) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || used.has(nr * cols + nc)) continue;
        if (walk(nr, nc)) return true;
      }
      path.pop();
      used.delete(r * cols + c);
      return false;
    };
    if (!walk(source, 0) || path.length < cols + 1) continue;
    // Each path cell's openings: towards its neighbours on the path (the tap is west of the first, the plant east of the last).
    const need = new Map();
    path.forEach(([r, c], i) => {
      let m = 0;
      const link = (pr, pc) => { m |= pr < r ? N : pr > r ? S : pc < c ? W : E; };
      if (i === 0) m |= W; else link(...path[i - 1]);
      if (i === path.length - 1) m |= E; else link(...path[i + 1]);
      need.set(r * cols + c, m);
    });
    const tiles = Array.from({ length: rows * cols }, (_, i) => {
      if (need.has(i)) {
        const m = need.get(i);
        const shape = m === (N | S) || m === (E | W) ? 'straight' : 'elbow';
        const right = [0, 1, 2, 3].find((r) => rotMask(SHAPES[shape], r) === m);
        return { shape, rot: right, solve: right, onPath: true };
      }
      return { shape: pick(rng, ['straight', 'elbow', 'elbow', 'tee']), rot: intBetween(rng, 0, 3), onPath: false };
    });
    // Scramble the path tiles; keep it unsolved at the start.
    tiles.forEach((t) => { if (t.onPath) t.rot = intBetween(rng, 0, 3); });
    const p = { cols, rows, source, sink };
    if (pipeFlows(p, tiles)) continue;
    const par = tiles.reduce((sum, t) => {
      if (!t.onPath) return sum;
      const steps = (t.solve - t.rot + 4) % 4;
      return sum + (t.shape === 'straight' ? Math.min(steps % 2, steps) : steps);
    }, 0);
    return { ...p, tiles: tiles.map(({ shape, rot }) => ({ shape, rot })), solution: tiles.map((t) => (t.onPath ? t.solve : null)), par };
  }
};

/** Stars for a solved pipe puzzle from the turns taken: par + 2 → 3, par + 6 → 2, else 1. */
export const pipeStars = (par, turns) => (turns <= par + 2 ? 3 : turns <= par + 6 ? 2 : 1);

/* ───────────────────────────── Emoji Equations ───────────────────────────── */

const ITEMS = ['🍎', '🍌', '🍇', '🍓', '🍩', '⚽', '🎈', '⭐', '🐱', '🌻', '🚗', '🎁'];

export const emojiConfig = (ageBand, difficulty, levelNo) => {
  const s = stepOf(ageBand, difficulty, levelNo);
  return { tier: s <= 2 ? 1 : s <= 6 ? 2 : 3, puzzles: 5, pass: 4 };
};

/** Value of a line of terms [item index | number, op, …] with × before + and −. */
export const evaluate = (terms, values) => {
  const v = (t) => (typeof t === 'number' ? t : values[t.item]);
  // terms: [{item}|number, '+', {item}, '×', …]
  const sums = [];
  let prod = v(terms[0]);
  let sign = 1;
  for (let i = 1; i < terms.length; i += 2) {
    const op = terms[i];
    const val = v(terms[i + 1]);
    if (op === '×') prod *= val;
    else { sums.push(sign * prod); sign = op === '+' ? 1 : -1; prod = val; }
  }
  sums.push(sign * prod);
  return sums.reduce((a, b) => a + b, 0);
};
/** Left-to-right value (the usual slip), for a tempting wrong option. */
const leftToRight = (terms, values) => {
  const v = (t) => (typeof t === 'number' ? t : values[t.item]);
  let acc = v(terms[0]);
  for (let i = 1; i < terms.length; i += 2) {
    const val = v(terms[i + 1]);
    acc = terms[i] === '+' ? acc + val : terms[i] === '−' ? acc - val : acc * val;
  }
  return acc;
};

/**
 * One puzzle: { items: [emoji…], lines: [{ terms, total }], question: { terms }, answer, values, options }.
 * Line 1 gives the first item alone (a + a + a), each next line adds one new item, so the values follow in order.
 */
export const makeEmojiPuzzle = (rng, config) => {
  const count = config.tier === 1 ? 2 : 3;
  const items = shuffle(rng, ITEMS).slice(0, count);
  const values = items.map(() => intBetween(rng, config.tier === 1 ? 1 : 2, config.tier === 3 ? 12 : 9));
  const T = (item) => ({ item });
  const lines = [{ terms: [T(0), '+', T(0), '+', T(0)] }];
  lines.push({ terms: [T(0), '+', T(1), '+', T(1)] });
  if (count === 3) lines.push(config.tier === 3 && rng() < 0.5 ? { terms: [T(1), '×', T(2)] } : { terms: [T(1), '+', T(2), '+', T(2)] });
  lines.forEach((l) => { l.total = evaluate(l.terms, values); });
  let question;
  if (config.tier === 1) question = { terms: pick(rng, [[T(1), '+', T(0)], [T(1), '+', T(1), '+', T(0)], [T(0), '+', T(1), '+', T(1), '+', T(0)]]) };
  else if (config.tier === 2) question = { terms: pick(rng, [[T(0), '+', T(1), '×', T(2)], [T(2), '+', T(2), '+', T(1)], [T(1), '×', T(2), '−', T(0)]]) };
  else question = { terms: pick(rng, [[T(0), '+', T(1), '×', T(2)], [T(2), '×', T(2), '−', T(1)], [T(0), '×', T(1), '+', T(2)]]) };
  const answer = evaluate(question.terms, values);
  const tempting = [leftToRight(question.terms, values), answer + values[0], answer - 1, answer + 2, answer + 10].filter((x) => x !== answer && x >= 0);
  const options = shuffle(rng, [answer, ...[...new Set(tempting)].slice(0, 3)]);
  return { items, values, lines, question, answer, options };
};

/* ───────────────────────────── Tower Strategy (sort the colours) ───────────────────────────── */

export const TOWER_COLOURS = ['red', 'blue', 'yellow'];

/**
 * Three towers, three colours, `per` blocks of each; a tower holds `cap` (one more than `per`). Any top block may move
 * to any tower with room. Levels grow the blocks and the length of the best solution. (`strict` — only onto the same
 * colour — is supported but off: with three towers it leaves too few moves to make a hard puzzle.)
 */
export const towerConfig = (ageBand, difficulty, levelNo) => {
  const s = stepOf(ageBand, difficulty, levelNo);
  const par = s <= 1 ? [3, 5] : s <= 3 ? [5, 8] : s <= 6 ? [7, 11] : [9, 14]; // the best solution's length, by level
  const per = s <= 3 ? 3 : s <= 6 ? 4 : 5; // more blocks of each colour as levels climb
  return { per, cap: per + 1, strict: false, adjacent: true, par, puzzles: 3 };
};

/** Can the top block of tower `from` move onto tower `to`? */
export const canMove = (towers, from, to, config) => {
  if (from === to || !towers[from].length || towers[to].length >= config.cap) return false;
  // Next-door only (2026-11-16, the user): tower 1 ↔ 2 and 2 ↔ 3, never 1 → 3 in one move.
  if (config.adjacent && Math.abs(from - to) !== 1) return false;
  if (!config.strict) return true;
  const top = towers[to][towers[to].length - 1];
  return top === undefined || top === towers[from][towers[from].length - 1];
};
export const moveBlock = (towers, from, to) => {
  const next = towers.map((t) => [...t]);
  next[to].push(next[from].pop());
  return next;
};
/** Solved: every tower is empty or holds one colour only, and each colour is all in one tower. */
export const towersSolved = (towers, per) => towers.every((t) => t.length === 0 || (t.length === per && t.every((c) => c === t[0])));

const keyOf = (towers) => towers.map((t) => t.join('')).join('|');

/** Fewest moves to sort (BFS, capped); -1 when not found within the cap. */
export const towerPar = (start, config, cap = 120000) => {
  const seen = new Set([keyOf(start)]);
  let frontier = [start];
  for (let depth = 0; frontier.length && seen.size < cap; depth += 1) {
    const next = [];
    for (const t of frontier) {
      if (towersSolved(t, config.per)) return depth;
      for (let a = 0; a < 3; a += 1) for (let b = 0; b < 3; b += 1) {
        if (!canMove(t, a, b, config)) continue;
        const n = moveBlock(t, a, b);
        const k = keyOf(n);
        if (!seen.has(k)) { seen.add(k); next.push(n); }
      }
    }
    frontier = next;
  }
  return -1;
};

/**
 * A puzzle: towers (bottom → top, colour index per block), the fewest moves to sort them, and whether the strict rule
 * applies. Made by scrambling the sorted towers, then kept only when the best solution's length suits the level.
 */
export const makeTowerPuzzle = (rng, config) => {
  const loose = { ...config, strict: false };
  const sorted = () => [0, 1, 2].map((c) => Array(config.per).fill(c));
  const scramble = (len) => {
    let towers = sorted();
    let last = null;
    for (let k = 0; k < len; k += 1) {
      const moves = [];
      for (let a = 0; a < 3; a += 1) for (let b = 0; b < 3; b += 1) {
        if (!canMove(towers, a, b, loose) || (last && last[0] === b && last[1] === a)) continue;
        // Strict levels scramble backwards: only undo a move the strict rule allows (the block came off a tower
        // where it sat on its own colour, or alone), so the puzzle can always be solved forwards.
        if (config.strict) {
          const t = towers[a];
          if (!(t.length === 1 || t[t.length - 2] === t[t.length - 1])) continue;
        }
        moves.push([a, b]);
      }
      if (!moves.length) break;
      const [a, b] = moves[intBetween(rng, 0, moves.length - 1)];
      towers = moveBlock(towers, a, b);
      last = [a, b];
    }
    return towers;
  };
  const [lo, hi] = config.par;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const towers = scramble(intBetween(rng, lo, hi + 6));
    const par = towerPar(towers, config);
    if (par >= lo && par <= hi) return { towers, par, strict: config.strict };
  }
  // Rare fallback: the same, without the strict rule (every loose scramble can be undone).
  for (;;) {
    const towers = scramble(hi + 4);
    const par = towerPar(towers, loose);
    if (par >= Math.min(lo, 3)) return { towers, par, strict: false };
  }
};

/** Stars for a sorted puzzle: par → 3, par + 3 → 2, else 1. */
export const towerStars = (par, moves) => (moves <= par ? 3 : moves <= par + 3 ? 2 : 1);

/* ───────────────────────────── Tower of Hanoi (Tower Strategy, 2026-11-19) ─────────────────────────────
 * The user: "make it completely like Tower of Hanoi". Rings of different sizes on three pegs; move one top ring at a
 * time, never a bigger ring onto a smaller one, until every ring stands on the goal peg. Towers are bottom → top,
 * each ring its size (1 = smallest). Levels add rings; the first puzzle is the classic full tower, the others start
 * from a mixed (legal) position so each one needs fresh planning. `par` is the fewest moves (breadth-first).
 */
export const hanoiConfig = (ageBand, difficulty, levelNo) => {
  const s = stepOf(ageBand, difficulty, levelNo);
  return { discs: s <= 1 ? 3 : s <= 4 ? 4 : s <= 9 ? 5 : 6, puzzles: 3 };
};
export const hanoiCanMove = (towers, from, to) => {
  if (from === to || !towers[from].length) return false;
  const ring = towers[from][towers[from].length - 1];
  const top = towers[to][towers[to].length - 1];
  return top === undefined || top > ring;
};
export const hanoiSolved = (towers, goal, discs) => towers[goal].length === discs;
export const hanoiPar = (start, goal, discs) => {
  const key = (t) => t.map((x) => x.join('')).join('|');
  const seen = new Set([key(start)]);
  let frontier = [start];
  for (let depth = 0; frontier.length; depth += 1) {
    const next = [];
    for (const t of frontier) {
      if (hanoiSolved(t, goal, discs)) return depth;
      for (let a = 0; a < 3; a += 1) for (let b = 0; b < 3; b += 1) {
        if (!hanoiCanMove(t, a, b)) continue;
        const n = moveBlock(t, a, b);
        const k = key(n);
        if (!seen.has(k)) { seen.add(k); next.push(n); }
      }
    }
    frontier = next;
  }
  return -1;
};
/** Puzzle `index` of a level: 0 is the classic tower; the rest start mixed. { towers, goal, par }. */
export const makeHanoiPuzzle = (rng, config, index = 0) => {
  const n = config.discs;
  const full = 2 ** n - 1;
  if (index === 0) {
    const from = intBetween(rng, 0, 2);
    const goal = (from + intBetween(rng, 1, 2)) % 3;
    const towers = [[], [], []];
    for (let d = n; d >= 1; d -= 1) towers[from].push(d);
    return { towers, goal, par: full };
  }
  for (;;) {
    const towers = [[], [], []];
    for (let d = n; d >= 1; d -= 1) towers[intBetween(rng, 0, 2)].push(d); // biggest first: always a legal position
    const goal = intBetween(rng, 0, 2);
    const par = hanoiPar(towers, goal, n);
    if (par >= Math.ceil(full * 0.45) && par <= full && towers.filter((t) => t.length).length >= 2) return { towers, goal, par };
  }
};
