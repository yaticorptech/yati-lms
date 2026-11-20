/**
 * Grid Navigator (Rising Brains, memory) — pure and seeded.
 *
 * Items sit on a grid; the player studies where, then the items vanish. On
 * "place" boards the player puts each item back where it was. On "moves"
 * boards a list of moves is shown ("the key moves 2 up and 1 right", "the gem
 * and the star swap places") and the player places every item where it ENDS.
 * Every move stays inside the grid and no two items ever share a cell.
 */
import { intBetween, pick, sample, shuffle } from '../seeded.js';

export const NAV_ITEMS = [
  { emoji: '🔑', name: 'key' },
  { emoji: '💎', name: 'gem' },
  { emoji: '⭐', name: 'star' },
  { emoji: '🪙', name: 'coin' },
  { emoji: '🍎', name: 'apple' },
  { emoji: '🎈', name: 'balloon' },
  { emoji: '🐸', name: 'frog' },
  { emoji: '🚀', name: 'rocket' }
];

export const navBand = (ageBand) => (ageBand === 'analytical' ? 'analytical' : 'intermediate');

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const ramp = (from, to, levelNo) => Math.round(from + (to - from) * clampN((levelNo - 1) / 29, 0, 1));

/**
 * size   — grid is size × size
 * items  — items on each board
 * moves  — moves after the items vanish (0 = put them back where they were)
 * swaps  — swap moves allowed
 * boards — boards in the level; pass = items placed right to clear it
 * study  — seconds to study each board
 */
export const navConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = navBand(ageBand);
  const d = clampN(difficulty || 1, 1, 3);
  if (band === 'intermediate') {
    const size = d === 1 ? 4 : 5;
    const items = clampN(2 + (d - 1) + (levelNo >= 15 ? 1 : 0), 2, 4);
    const moves = d === 1 ? (levelNo >= 8 ? 1 : 0) : d === 2 ? 2 : 3;
    const boards = 4;
    return { band, size, items, moves, swaps: false, boards, pass: Math.ceil(boards * items * 0.7), study: 4 + items };
  }
  const size = d === 1 ? 5 : 6;
  const items = clampN(3 + (d - 1) + (levelNo >= 20 ? 1 : 0), 3, 5);
  const moves = ramp(3, 4, levelNo) + (d - 1);
  const boards = 4;
  return { band, size, items, moves, swaps: d >= 2, boards, pass: Math.ceil(boards * items * 0.7), study: 3 + items };
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** What a move card says. */
export const describeMove = (move, items) => {
  if (move.kind === 'swap') return `The ${items[move.a].name} and the ${items[move.b].name} swap places.`;
  const parts = [];
  if (move.dy) parts.push(`${plural(Math.abs(move.dy), 'step')} ${move.dy < 0 ? 'up' : 'down'}`);
  if (move.dx) parts.push(`${plural(Math.abs(move.dx), 'step')} ${move.dx < 0 ? 'left' : 'right'}`);
  return `The ${items[move.item].name} moves ${parts.join(' and ')}.`;
};

/** Every item's cell after the moves: [[row, col] …] in item order. */
export const finalCells = (board) => {
  const at = board.items.map((it) => [...it.start]);
  for (const m of board.moves) {
    if (m.kind === 'swap') [at[m.a], at[m.b]] = [at[m.b], at[m.a]];
    else at[m.item] = [at[m.item][0] + m.dy, at[m.item][1] + m.dx];
  }
  return at;
};

/** Per item: was it placed on its final cell? `placed` is [[row, col] | null …] in item order. */
export const checkPlacement = (board, placed) => {
  const want = finalCells(board);
  return want.map(([r, c], i) => Boolean(placed[i]) && placed[i][0] === r && placed[i][1] === c);
};

const key = ([r, c]) => `${r},${c}`;

/**
 * A board: { size, items: [{ emoji, name, start: [r, c] }], moves: [move], texts: [string], final: [[r, c]] }.
 * A step move { kind: 'step', item, dy, dx } stays inside the grid and lands on an empty cell.
 */
export const makeNavBoard = (rng, config) => {
  const { size } = config;
  const cells = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push([r, c]);
  const starts = sample(rng, cells, config.items);
  const items = sample(rng, NAV_ITEMS, config.items).map((it, i) => ({ ...it, start: starts[i] }));
  const at = items.map((it) => [...it.start]);
  const moves = [];
  let guard = 0;
  while (moves.length < config.moves && guard++ < 500) {
    if (config.swaps && items.length >= 2 && rng() < 0.3 && moves[moves.length - 1]?.kind !== 'swap') {
      const [a, b] = sample(rng, items.map((_, i) => i), 2);
      moves.push({ kind: 'swap', a, b });
      [at[a], at[b]] = [at[b], at[a]];
      continue;
    }
    const item = intBetween(rng, 0, items.length - 1);
    const reach = Math.min(3, size - 1);
    const dy = rng() < 0.75 ? pick(rng, [-reach, -2, -1, 1, 2, reach].filter((v) => Math.abs(v) <= reach)) : 0;
    const dx = dy === 0 || rng() < 0.55 ? pick(rng, [-2, -1, 1, 2]) : 0;
    const to = [at[item][0] + dy, at[item][1] + dx];
    if (to[0] < 0 || to[0] >= size || to[1] < 0 || to[1] >= size) continue;
    if (at.some((p, j) => j !== item && key(p) === key(to))) continue;
    moves.push({ kind: 'step', item, dy, dx });
    at[item] = to;
  }
  const board = { size, items, moves };
  return { ...board, texts: moves.map((m) => describeMove(m, items)), final: finalCells(board) };
};

export const makeNavLevel = (rng, config) => shuffle(rng, Array.from({ length: config.boards }, () => makeNavBoard(rng, config)));
