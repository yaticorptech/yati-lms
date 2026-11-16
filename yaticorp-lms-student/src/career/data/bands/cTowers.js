/**
 * Tower Strategy (Rising Brains, logic) — extends Last Stone. Pure and seeded.
 *
 * Two or three towers of blocks. On a turn you take 1 to k blocks from ONE
 * tower. Classes 6–8: whoever takes the last block WINS. Classes 9–10 play the
 * misère rule: whoever takes the last block LOSES.
 *
 * The solver is a plain memoised game search over every position (towers stay
 * small, so it is exact). The player always moves first from a position that
 * is a win with perfect play; the computer plays the best move except for a
 * chance of a random slip that falls with difficulty.
 */
import { intBetween, pick } from '../seeded.js';

export const towerStratBand = (ageBand) => (ageBand === 'analytical' ? 'analytical' : 'intermediate');

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * towers     — how many towers
 * maxTake    — k: most blocks one turn may take
 * sizes      — [min, max] starting tower height
 * misere     — taking the last block loses
 * slip       — chance the computer plays a random move instead of its best
 * games, pass
 */
export const towerStratConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = towerStratBand(ageBand);
  const d = clampN(difficulty || 1, 1, 3);
  const late = levelNo >= 15 ? 1 : 0;
  if (band === 'intermediate') {
    return {
      band,
      towers: d === 3 || (d === 2 && late) ? 3 : 2,
      maxTake: d === 1 ? 2 : 3,
      sizes: [3, 5 + d + late],
      misere: false,
      slip: [0.35, 0.2, 0.1][d - 1] - 0.05 * late,
      games: 3, pass: 2
    };
  }
  return {
    band,
    towers: 3,
    maxTake: d === 3 ? 4 : 3,
    sizes: [3, 6 + d + late],
    misere: true,
    slip: [0.25, 0.12, 0.05][d - 1] - 0.03 * late,
    games: 3, pass: 2
  };
};

/** Every legal move: { tower, take }. */
export const legalMoves = (heaps, maxTake) => {
  const out = [];
  heaps.forEach((h, tower) => {
    for (let take = 1; take <= Math.min(maxTake, h); take++) out.push({ tower, take });
  });
  return out;
};

export const applyMove = (heaps, move) => heaps.map((h, i) => (i === move.tower ? h - move.take : h));

const memo = new Map();

/** Does the player TO MOVE win with perfect play from here? */
export const isWinning = (heaps, maxTake, misere) => {
  const total = heaps.reduce((s, h) => s + h, 0);
  if (total === 0) return misere; // the other player took the last block: normal — they won; misère — they lost
  const key = `${misere ? 'm' : 'n'}${maxTake}:${[...heaps].sort((a, b) => a - b).join(',')}`;
  if (memo.has(key)) return memo.get(key);
  let win = false;
  for (const m of legalMoves(heaps, maxTake)) {
    if (!isWinning(applyMove(heaps, m), maxTake, misere)) { win = true; break; }
  }
  memo.set(key, win);
  return win;
};

/** Every move that leaves the opponent losing (empty if this position is lost). */
export const winningMoves = (heaps, maxTake, misere) =>
  legalMoves(heaps, maxTake).filter((m) => !isWinning(applyMove(heaps, m), maxTake, misere));

/** The computer's move: best (random among winning moves) unless it slips. */
export const computerMove = (rng, heaps, config) => {
  const all = legalMoves(heaps, config.maxTake);
  const good = winningMoves(heaps, config.maxTake, config.misere);
  if (good.length && rng() >= config.slip) return pick(rng, good);
  // Lost (or slipping): take a small random bite to keep the game going.
  const small = all.filter((m) => m.take <= 2);
  return pick(rng, small.length ? small : all);
};

/** Has the game ended, and who won? `mover` just moved. */
export const gameOver = (heaps, mover, misere) => {
  if (heaps.some((h) => h > 0)) return null;
  return misere ? (mover === 'you' ? 'cpu' : 'you') : mover;
};

/** A start position: winning for the first mover, every tower at least sizes[0] and not all the same. */
export const makeTowerStart = (rng, config) => {
  for (;;) {
    const heaps = Array.from({ length: config.towers }, () => intBetween(rng, config.sizes[0], config.sizes[1]));
    if (new Set(heaps).size === 1) continue;
    if (isWinning(heaps, config.maxTake, config.misere)) return heaps;
  }
};

export const makeTowerLevel = (rng, config) => {
  const games = [];
  let tries = 0;
  while (games.length < config.games) {
    const h = makeTowerStart(rng, config);
    if (!games.some((g) => g.join() === h.join()) || ++tries > 50) games.push(h);
  }
  return games;
};

/** The rule-of-thumb shown after a loss. */
export const strategyTip = (config) =>
  config.misere
    ? `Misère rule: never be forced to take the last block. Work backwards — leave a position where every move your opponent makes can be answered. With one block left on one tower and nothing else, the player to move loses.`
    : config.towers === 2
      ? `With two towers, divide each height by ${config.maxTake + 1} and look at the remainders: leave them EQUAL and your opponent can never win.`
      : `Divide each height by ${config.maxTake + 1} and keep the remainders. Leave the remainders so they cancel out (in binary, every bit an even number of times — e.g. 1, 2, 3) and your opponent is stuck.`;
