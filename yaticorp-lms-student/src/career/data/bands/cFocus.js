/**
 * Focus Filter (Rising Brains, focus / attention) — pure and seeded.
 *
 * Two parts to a level:
 *  1. Arrow stream (a flanker task): a row like ◀◀▶◀◀ flashes up and the player
 *     answers the direction of the MIDDLE arrow, ignoring the ones around it.
 *     Classes 9–10 also get orange rows, where the answer is the OPPOSITE of
 *     the middle arrow (a rule switch).
 *  2. Search boards: a grid of look-alike symbols (b among d, p, q …); tap every
 *     target before the board's time runs out. Wrong taps cost a point.
 * Score = right arrows + (targets found − wrong taps, never below 0, per board).
 */
import { intBetween, pick, sample, shuffle } from '../seeded.js';

/** Look-alike sets for the search boards. Easy ones first. */
export const SEARCH_SETS = [
  { target: 'b', others: ['d', 'p', 'q'] },
  { target: 'E', others: ['F', 'B', 'L'] },
  { target: 'M', others: ['N', 'W', 'H'] },
  { target: 'O', others: ['Q', 'C', 'D'] },
  { target: 'u', others: ['n', 'v', 'y'] },
  { target: '6', others: ['9', '8', '0'] },
  { target: 'S', others: ['5', 'Z', '2'] },
  { target: 'q', others: ['p', 'g', 'd', 'b'] },
  { target: 'R', others: ['P', 'B', 'K', 'F'] },
  { target: 'G', others: ['C', 'O', 'Q', '6'] }
];

export const focusBand = (ageBand) => (ageBand === 'analytical' ? 'analytical' : 'intermediate');

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const ramp = (from, to, levelNo) => Math.round(from + (to - from) * clampN((levelNo - 1) / 29, 0, 1));

/**
 * trials, windowMs   — arrow rows and how long each one may be answered in
 * mixed              — share of rows whose outer arrows point the other way
 * switches           — share of orange "answer the opposite" rows (Classes 9–10)
 * boards, cols, rows — search boards and their size
 * targets            — [min, max] targets per board; boardSeconds per board
 * sets               — how many of SEARCH_SETS are in play (the later ones are harder)
 */
export const focusConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = focusBand(ageBand);
  const d = clampN(difficulty || 1, 1, 3);
  const base = band === 'intermediate'
    ? {
        band,
        trials: ramp(10, 14, levelNo) + 2 * (d - 1),
        windowMs: ramp(2400, 1800, levelNo) - 150 * (d - 1),
        mixed: 0.35 + 0.1 * d,
        switches: 0,
        boards: d === 1 ? 2 : 3,
        cols: d === 1 ? 4 : 5,
        rows: d === 3 ? 5 : 4,
        targets: [3, 4 + (d >= 2 ? 1 : 0)],
        boardSeconds: 14 - d,
        sets: 6
      }
    : {
        band,
        trials: ramp(14, 18, levelNo) + 2 * (d - 1),
        windowMs: ramp(2000, 1500, levelNo) - 100 * (d - 1),
        mixed: 0.5,
        switches: 0.2 + 0.08 * d,
        boards: 3,
        cols: d === 1 ? 5 : 6,
        rows: d === 3 ? 6 : 5,
        targets: [4, 6 + (d >= 2 ? 1 : 0)],
        boardSeconds: 15 - d,
        sets: SEARCH_SETS.length
      };
  return base;
};

/** One arrow row: { centre, flank, flip, answer } where each is 'L' or 'R'. */
export const makeTrial = (rng, config) => {
  const centre = rng() < 0.5 ? 'L' : 'R';
  const flank = rng() < config.mixed ? (centre === 'L' ? 'R' : 'L') : centre;
  const flip = rng() < (config.switches || 0);
  return { centre, flank, flip, answer: flip ? (centre === 'L' ? 'R' : 'L') : centre };
};

/** The arrows of a row, left to right. */
export const trialArrows = (trial) => [trial.flank, trial.flank, trial.centre, trial.flank, trial.flank];

/** One search board: { cols, rows, target, cells: [glyph], targets: [index] }. Targets appear nowhere else. */
export const makeBoard = (rng, config, set) => {
  const count = config.cols * config.rows;
  const n = intBetween(rng, config.targets[0], config.targets[1]);
  const at = new Set(sample(rng, Array.from({ length: count }, (_, i) => i), n));
  const cells = Array.from({ length: count }, (_, i) => (at.has(i) ? set.target : pick(rng, set.others)));
  return { cols: config.cols, rows: config.rows, target: set.target, cells, targets: [...at].sort((a, b) => a - b) };
};

/** Points for a finished board: targets found minus wrong taps, never below 0. */
export const boardPoints = (board, tapped) => {
  const hits = tapped.filter((i) => board.cells[i] === board.target).length;
  const misses = tapped.filter((i) => board.cells[i] !== board.target).length;
  return Math.max(0, hits - misses);
};

/** A level: { trials, boards, max }. */
export const makeFocusLevel = (rng, config) => {
  const trials = Array.from({ length: config.trials }, () => makeTrial(rng, config));
  const sets = sample(rng, SEARCH_SETS.slice(0, config.sets), config.boards);
  const boards = shuffle(rng, sets).map((set) => makeBoard(rng, config, set));
  const max = trials.length + boards.reduce((s, b) => s + b.targets.length, 0);
  return { trials, boards, max, pass: Math.ceil(max * 0.7) };
};
