/**
 * Treasure Path — maps, solver and the program runner, pure and seeded.
 *
 * A map is a grid of cells:
 *   '.' open   '#' rock   '~' water   'K' key   'D' door (open once the key is held)
 * with a start and a treasure. A program is a list of cards: { dir, times }.
 * Every map is checked with a breadth-first search before it is handed out, so
 * none is ever unsolvable, and the search's shortest path is the 3-star target.
 */
import { intBetween, shuffle } from '../seeded.js';

export const DIRS = {
  up: { dr: -1, dc: 0, arrow: '↑', word: 'up' },
  down: { dr: 1, dc: 0, arrow: '↓', word: 'down' },
  left: { dr: 0, dc: -1, arrow: '←', word: 'left' },
  right: { dr: 0, dc: 1, arrow: '→', word: 'right' }
};
export const DIR_KEYS = ['up', 'down', 'left', 'right'];

/** The age bands this game plays as. Older than analytical plays analytical; unknown plays developing. */
export const pathBand = (ageBand) => {
  if (ageBand === 'foundation') return 'foundation';
  if (ageBand === 'intermediate') return 'intermediate';
  if (ageBand === 'analytical' || ageBand === 'advanced') return 'analytical';
  return 'developing';
};

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const ramp = (from, to, levelNo) => Math.round(from + (to - from) * clampN((levelNo - 1) / 29, 0, 1));

/**
 * How a level plays.
 *  rows, cols       — the grid
 *  minOpt, maxOpt   — how long the shortest path may be
 *  rocks            — obstacles scattered (some become water)
 *  keys             — a wall with a locked door, the key on the start's side
 *  repeat           — the ×2 / ×3 repeat cards are on offer
 *  slots            — how many cards a program may hold: null = shortest + slack (worked out per map)
 *  slack            — extra steps allowed over the shortest path (step limit)
 *  clue             — show "Go 2 right, then 1 down"
 *  maps, tries      — maps in a level, runs allowed per map
 */
export const pathConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = pathBand(ageBand);
  const d = clampN(difficulty || 1, 1, 3);
  if (band === 'foundation') {
    return {
      band, rows: 4, cols: 4, minOpt: 2, maxOpt: clampN(ramp(3, 4, levelNo) + (d >= 3 ? 1 : 0), 3, 4),
      rocks: clampN(ramp(0, 2, levelNo) + (d - 1), 0, 3), water: false, keys: false, repeat: false,
      slack: 4, clue: levelNo <= 20 || d === 1, maps: 3, tries: 5
    };
  }
  if (band === 'developing') {
    return {
      band, rows: 5, cols: 5, minOpt: 4, maxOpt: ramp(6, 8, levelNo) + (d - 1),
      rocks: ramp(4, 6, levelNo) + d, water: true, keys: false, repeat: false,
      slack: d >= 3 ? 1 : 2, clue: false, maps: 3, tries: 3
    };
  }
  const keys = band === 'analytical' || d >= 2 || levelNo > 10;
  return {
    band, rows: 6, cols: 7, minOpt: band === 'analytical' ? 9 : 7, maxOpt: 18,
    rocks: ramp(8, 11, levelNo) + d + (band === 'analytical' ? 2 : 0), water: true, keys, repeat: true,
    slack: band === 'analytical' ? 0 : 1, clue: false, maps: 3, tries: 3
  };
};

const inside = (map, r, c) => r >= 0 && c >= 0 && r < map.rows && c < map.cols;
const cellAt = (map, r, c) => map.grid[r][c];
const blocked = (cell, hasKey) => cell === '#' || cell === '~' || (cell === 'D' && !hasKey);

/**
 * Shortest path by breadth-first search over (row, col, key held).
 * Returns { steps, dirs } or null when the treasure cannot be reached.
 */
export const solvePath = (map) => {
  const key = (r, c, k) => (r * map.cols + c) * 2 + (k ? 1 : 0);
  const [sr, sc] = map.start;
  const startKey = cellAt(map, sr, sc) === 'K';
  const prev = new Map([[key(sr, sc, startKey), null]]);
  const queue = [[sr, sc, startKey]];
  for (let i = 0; i < queue.length; i++) {
    const [r, c, k] = queue[i];
    if (r === map.goal[0] && c === map.goal[1]) {
      const dirs = [];
      let at = key(r, c, k);
      while (prev.get(at)) { dirs.push(prev.get(at).dir); at = prev.get(at).from; }
      dirs.reverse();
      return { steps: dirs.length, dirs };
    }
    for (const dir of DIR_KEYS) {
      const nr = r + DIRS[dir].dr, nc = c + DIRS[dir].dc;
      if (!inside(map, nr, nc)) continue;
      const cell = cellAt(map, nr, nc);
      if (blocked(cell, k)) continue;
      const nk = k || cell === 'K';
      const id = key(nr, nc, nk);
      if (prev.has(id)) continue;
      prev.set(id, { from: key(r, c, k), dir });
      queue.push([nr, nc, nk]);
    }
  }
  return null;
};

/** Squash a list of directions into cards, at most `maxRepeat` a card. */
export const toCards = (dirs, maxRepeat = 1) => {
  const cards = [];
  for (const dir of dirs) {
    const last = cards[cards.length - 1];
    if (last && last.dir === dir && last.times < maxRepeat) last.times += 1;
    else cards.push({ dir, times: 1 });
  }
  return cards;
};

/**
 * The fewest cards that reach the treasure when a card may walk 1…maxRepeat
 * cells in a straight line: a BFS where one card is one edge.
 */
export const fewestCards = (map, maxRepeat = 3) => {
  const key = (r, c, k) => (r * map.cols + c) * 2 + (k ? 1 : 0);
  const [sr, sc] = map.start;
  const k0 = cellAt(map, sr, sc) === 'K';
  const dist = new Map([[key(sr, sc, k0), 0]]);
  const queue = [[sr, sc, k0]];
  for (let i = 0; i < queue.length; i++) {
    const [r, c, k] = queue[i];
    const d = dist.get(key(r, c, k));
    if (r === map.goal[0] && c === map.goal[1]) return d;
    for (const dir of DIR_KEYS) {
      let nr = r, nc = c, nk = k;
      for (let t = 1; t <= maxRepeat; t++) {
        nr += DIRS[dir].dr; nc += DIRS[dir].dc;
        if (!inside(map, nr, nc)) break;
        const cell = cellAt(map, nr, nc);
        if (blocked(cell, nk)) break;
        nk = nk || cell === 'K';
        const id = key(nr, nc, nk);
        if (!dist.has(id)) { dist.set(id, d + 1); queue.push([nr, nc, nk]); }
        if (nr === map.goal[0] && nc === map.goal[1]) break; // a program stops at the treasure
      }
    }
  }
  return null;
};

/**
 * Walk a program. Returns the trail of positions (one per step, the start
 * first) and how it ended:
 *   'win'   — reached the treasure (stops there, the rest of the program unused)
 *   'bump'  — the next step hit a rock, water, a locked door or the edge
 *   'short' — the program ran out before the treasure
 */
export const runProgram = (map, cards) => {
  let [r, c] = map.start;
  let hasKey = cellAt(map, r, c) === 'K';
  const trail = [{ r, c, hasKey }];
  for (const card of cards) {
    for (let t = 0; t < (card.times || 1); t++) {
      const nr = r + DIRS[card.dir].dr, nc = c + DIRS[card.dir].dc;
      if (!inside(map, nr, nc) || blocked(cellAt(map, nr, nc), hasKey)) {
        return { trail, outcome: 'bump', steps: trail.length - 1, bumpAt: { r: nr, c: nc, dir: card.dir } };
      }
      r = nr; c = nc;
      if (cellAt(map, r, c) === 'K') hasKey = true;
      trail.push({ r, c, hasKey });
      if (r === map.goal[0] && c === map.goal[1]) return { trail, outcome: 'win', steps: trail.length - 1 };
    }
  }
  return { trail, outcome: 'short', steps: trail.length - 1 };
};

/** "Go 2 right, then 1 down." — the shortest path in words, for the youngest. */
export const clueFor = (dirs) => {
  const parts = toCards(dirs, 99).map((card) => `${card.times} ${DIRS[card.dir].word}`);
  if (!parts.length) return '';
  return `Go ${parts.join(', then ')}.`;
};

const emptyGrid = (rows, cols) => Array.from({ length: rows }, () => Array.from({ length: cols }, () => '.'));

/** One attempt at a map; null when the dice did not give a good one. */
const tryMap = (rng, cfg) => {
  const { rows, cols } = cfg;
  const grid = emptyGrid(rows, cols);
  let start, goal;
  if (cfg.keys) {
    // A wall top to bottom with one locked door; start on the left, treasure on the right, key on the left.
    const wc = intBetween(rng, 2, cols - 3);
    const doorR = intBetween(rng, 0, rows - 1);
    for (let r = 0; r < rows; r++) grid[r][wc] = r === doorR ? 'D' : (rng() < 0.5 ? '~' : '#');
    start = [intBetween(rng, 0, rows - 1), intBetween(rng, 0, wc - 1)];
    goal = [intBetween(rng, 0, rows - 1), intBetween(rng, wc + 1, cols - 1)];
    let keyAt;
    for (let t = 0; t < 20 && !keyAt; t++) {
      const k = [intBetween(rng, 0, rows - 1), intBetween(rng, 0, wc - 1)];
      if (k[0] !== start[0] || k[1] !== start[1]) keyAt = k;
    }
    if (!keyAt) return null;
    grid[keyAt[0]][keyAt[1]] = 'K';
  } else {
    start = [intBetween(rng, 0, rows - 1), intBetween(rng, 0, cols - 1)];
    goal = [intBetween(rng, 0, rows - 1), intBetween(rng, 0, cols - 1)];
    if (start[0] === goal[0] && start[1] === goal[1]) return null;
  }
  const free = shuffle(rng, grid.flatMap((row, r) => row.map((cell, c) => [r, c]))
    .filter(([r, c]) => grid[r][c] === '.' && !(r === start[0] && c === start[1]) && !(r === goal[0] && c === goal[1])));
  for (let i = 0; i < cfg.rocks && i < free.length; i++) {
    const [r, c] = free[i];
    grid[r][c] = cfg.water && rng() < 0.4 ? '~' : '#';
  }
  const map = { rows, cols, grid, start, goal, hasKey: !!cfg.keys };
  const best = solvePath(map);
  if (!best || best.steps < cfg.minOpt || best.steps > cfg.maxOpt) return null;
  if (cfg.keys) {
    // The key must matter: with the door shut for good, there is no way through.
    const locked = { ...map, grid: grid.map((row) => row.map((cell) => (cell === 'D' ? '#' : cell === 'K' ? '.' : cell))) };
    if (solvePath(locked)) return null;
  }
  return { map, best };
};

/**
 * A solvable map for a level. Tries the configured obstacles first, then eases
 * off; the last resort is an obstacle-free map, which BFS still checks.
 */
export const makePathMap = (rng, cfg) => {
  let found = null;
  for (let attempt = 0; attempt < 400 && !found; attempt++) {
    const ease = Math.floor(attempt / 100);              // every 100 failures, two rocks fewer
    found = tryMap(rng, { ...cfg, rocks: Math.max(0, cfg.rocks - ease * 2) });
  }
  for (let attempt = 0; attempt < 400 && !found; attempt++) {
    found = tryMap(rng, { ...cfg, rocks: 0, minOpt: Math.min(cfg.minOpt, 2) });
  }
  if (!found) {
    // Cannot really happen; a straight corridor keeps the promise anyway.
    const grid = emptyGrid(cfg.rows, cfg.cols);
    const map = { rows: cfg.rows, cols: cfg.cols, grid, start: [0, 0], goal: [0, Math.min(cfg.cols - 1, cfg.minOpt)], hasKey: false };
    found = { map, best: solvePath(map) };
  }
  const { map, best } = found;
  const repeatMax = cfg.repeat ? 3 : 1;
  const minCards = cfg.repeat ? fewestCards(map, repeatMax) : best.steps;
  return {
    ...map,
    optimal: best.steps,
    solution: best.dirs,
    minCards,
    repeatMax,
    // The program limit: with repeats the room is in cards, without them in steps.
    // With repeats, also room for a shortest-step program, so three stars are always possible.
    slots: cfg.repeat
      ? Math.max(minCards + 1 + cfg.slack, toCards(best.dirs, repeatMax).length)
      : best.steps + cfg.slack,
    clue: cfg.clue ? clueFor(best.dirs) : null
  };
};

/**
 * Points for one map: 1 for reaching the treasure, +1 for the shortest walk,
 * +1 for doing it on the first run. Nought when it was never reached.
 */
export const mapPoints = (reached, steps, optimal, tries) => {
  if (!reached) return 0;
  return 1 + (steps <= optimal ? 1 : 0) + (tries <= 1 ? 1 : 0);
};
