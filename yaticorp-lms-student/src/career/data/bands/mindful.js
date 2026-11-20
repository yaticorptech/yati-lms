/**
 * Master Minds, the relaxed set (2026-11-17, the user: "games for all fields, a little easy, relaxing, attractive,
 * engaging"). Pure and seeded, so node can test them. Every puzzle is built so it can be solved.
 *

 *   Logic           Colour Flood    (colour-flood)   — removed from the catalogue 2026-11-17 (Chess Master took its place); generator kept
 *   (Word Lock, Emoji Phrases, Star Trail, Tile Slide, Light Beam, Path Painter and Penguin Glide removed 2026-11-19, the user.)
 *   Vocabulary      Word Search     (word-search)    — find themed words in a letter grid
 *   Math            see masterMath.js (Class 11+, 2026-11-17)
 */
import { intBetween, pick, shuffle } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
/** One difficulty step from difficulty (2–3 in Master Minds) and level in band (1–30): 1 … 9. */
export const stepOf = (difficulty, levelNo) => clampN(Math.ceil((levelNo || 1) / 5) + ((difficulty || 2) - 2) * 3, 1, 9);

/* ───────────────────────────── Colour Flood ───────────────────────────── */

export const FLOOD_COLOURS = ['#f472b6', '#60a5fa', '#facc15', '#34d399', '#a78bfa', '#fb923c'];
export const floodConfig = (difficulty, levelNo) => {
  const s = stepOf(difficulty, levelNo);
  return { size: clampN(5 + Math.floor(s / 2), 5, 9), colours: s <= 3 ? 4 : s <= 6 ? 5 : 6, slack: s <= 3 ? 3 : s <= 6 ? 2 : 1, puzzles: 3 };
};

/** The cells joined to the top-left corner by its colour. */
/** The squares up, down, left and right of square i on a size × size board. */
const neighbours = (i, size) => {
  const r = Math.floor(i / size); const c = i % size; const out = [];
  if (r > 0) out.push(i - size);
  if (r < size - 1) out.push(i + size);
  if (c > 0) out.push(i - 1);
  if (c < size - 1) out.push(i + 1);
  return out;
};
export const floodRegion = (cells, size) => {
  const colour = cells[0];
  const seen = new Set([0]);
  const stack = [0];
  while (stack.length) {
    const i = stack.pop();
    for (const j of neighbours(i, size)) if (!seen.has(j) && cells[j] === colour) { seen.add(j); stack.push(j); }
  }
  return seen;
};
export const floodFill = (cells, size, colour) => {
  const region = floodRegion(cells, size);
  return cells.map((c, i) => (region.has(i) ? colour : c));
};
export const floodDone = (cells) => cells.every((c) => c === cells[0]);

/** Moves a greedy player needs (always picks the colour that grows the region most). */
export const floodGreedy = (cells, size, colours) => {
  let board = cells;
  let moves = 0;
  while (!floodDone(board) && moves < 200) {
    let best = null;
    let bestSize = -1;
    for (let c = 0; c < colours; c += 1) {
      if (c === board[0]) continue;
      const after = floodFill(board, size, c);
      const n = floodRegion(after, size).size;
      if (n > bestSize) { bestSize = n; best = after; }
    }
    board = best;
    moves += 1;
  }
  return moves;
};

export const makeFloodPuzzle = (rng, config) => {
  for (;;) {
    const cells = Array.from({ length: config.size * config.size }, () => intBetween(rng, 0, config.colours - 1));
    if (floodDone(cells)) continue;
    const greedy = floodGreedy(cells, config.size, config.colours);
    return { size: config.size, colours: config.colours, cells, par: greedy, limit: greedy + config.slack };
  }
};

/* ───────────────────────────── Word Search ───────────────────────────── */

export const WORD_THEMES = [
  { theme: 'Science', emoji: '🔬', words: ['ATOM', 'CELL', 'ENERGY', 'FORCE', 'GRAVITY', 'LASER', 'MAGNET', 'ORBIT', 'PLANET', 'PROTON', 'OXYGEN', 'CARBON'] },
  { theme: 'Business', emoji: '💼', words: ['PROFIT', 'MARKET', 'BRAND', 'TRADE', 'BUDGET', 'SALES', 'OFFICE', 'CLIENT', 'STOCK', 'INVEST', 'LOAN', 'PRICE'] },
  { theme: 'Arts', emoji: '🎨', words: ['PAINT', 'POETRY', 'DRAMA', 'CANVAS', 'SKETCH', 'DANCE', 'MUSIC', 'STAGE', 'SCULPT', 'COLOUR', 'NOVEL', 'MURAL'] },
  { theme: 'Sports', emoji: '🏏', words: ['CRICKET', 'TENNIS', 'HOCKEY', 'GOAL', 'MEDAL', 'TEAM', 'COACH', 'RACE', 'CHESS', 'KABADDI', 'SWIM', 'BAT'] },
  { theme: 'Nature', emoji: '🌿', words: ['RIVER', 'FOREST', 'OCEAN', 'CLOUD', 'FLOWER', 'DESERT', 'VALLEY', 'MOUNTAIN', 'LEAF', 'STORM', 'ISLAND', 'BREEZE'] },
  { theme: 'Technology', emoji: '💻', words: ['ROBOT', 'CODE', 'LAPTOP', 'MOUSE', 'PIXEL', 'CLOUD', 'DATA', 'SERVER', 'APP', 'CHIP', 'WIFI', 'SCREEN'] },
  { theme: 'Food', emoji: '🍛', words: ['MANGO', 'RICE', 'DOSA', 'BREAD', 'HONEY', 'LEMON', 'SPICE', 'CURRY', 'PASTA', 'SALAD', 'CHAI', 'PANEER'] },
  { theme: 'Space', emoji: '🚀', words: ['COMET', 'GALAXY', 'MOON', 'STAR', 'ROCKET', 'SATURN', 'NEBULA', 'METEOR', 'SOLAR', 'ASTRONAUT', 'MARS', 'COSMOS'] },
  { theme: 'Health', emoji: '🩺', words: ['DOCTOR', 'NURSE', 'HEART', 'VITAMIN', 'SLEEP', 'YOGA', 'WATER', 'FRUIT', 'MUSCLE', 'BRAIN', 'LUNGS', 'FIT'] },
  { theme: 'Travel', emoji: '🧳', words: ['TRAIN', 'TICKET', 'HOTEL', 'BEACH', 'MAP', 'PASSPORT', 'JOURNEY', 'FLIGHT', 'CAMERA', 'TOUR', 'BUS', 'HILLS'] },
  { theme: 'Law & Society', emoji: '⚖️', words: ['JUSTICE', 'COURT', 'RIGHTS', 'VOTE', 'LAW', 'JUDGE', 'CITIZEN', 'POLICE', 'RULES', 'NATION', 'PEACE', 'DUTY'] },
  { theme: 'Music', emoji: '🎵', words: ['RHYTHM', 'TABLA', 'GUITAR', 'SONG', 'PIANO', 'FLUTE', 'TEMPO', 'BEAT', 'CHORUS', 'VIOLIN', 'RAGA', 'DRUM'] }
];
const LETTERS = 'ABCDEFGHIJKLMNOPRSTUVWY';

export const searchConfig = (difficulty, levelNo) => {
  const s = stepOf(difficulty, levelNo);
  return { size: s <= 3 ? 8 : s <= 6 ? 9 : 10, words: clampN(5 + Math.floor(s / 2), 5, 8), diagonal: s >= 4, backwards: s >= 7, secondsPerWord: 30 };
};

/** A grid with the theme's words hidden in it; each word's cells listed. */
export const makeSearchPuzzle = (rng, config, themeIndex = null) => {
  const t = themeIndex === null ? pick(rng, WORD_THEMES) : WORD_THEMES[themeIndex % WORD_THEMES.length];
  const dirs = [[0, 1], [1, 0]];
  if (config.diagonal) dirs.push([1, 1], [-1, 1]);
  if (config.backwards) dirs.push([0, -1], [-1, 0]);
  const { size } = config;
  for (;;) {
    const grid = Array(size * size).fill('');
    const placed = [];
    for (const w of shuffle(rng, t.words.filter((x) => x.length <= size))) {
      if (placed.length >= config.words) break;
      for (let tries = 0; tries < 80; tries += 1) {
        const [dr, dc] = pick(rng, dirs);
        const r0 = intBetween(rng, 0, size - 1);
        const c0 = intBetween(rng, 0, size - 1);
        const cells = Array.from({ length: w.length }, (_, k) => [r0 + dr * k, c0 + dc * k]);
        if (cells.some(([r, c]) => r < 0 || c < 0 || r >= size || c >= size)) continue;
        if (cells.some(([r, c], k) => grid[r * size + c] && grid[r * size + c] !== w[k])) continue;
        cells.forEach(([r, c], k) => { grid[r * size + c] = w[k]; });
        placed.push({ word: w, cells: cells.map(([r, c]) => r * size + c) });
        break;
      }
    }
    if (placed.length < config.words) continue;
    const filled = grid.map((ch) => ch || LETTERS[Math.floor(rng() * LETTERS.length)]);
    return { size, theme: t.theme, emoji: t.emoji, grid: filled, words: placed };
  }
};

/** The cells on a straight line (row, column or diagonal) from a to b, or null. */
export const lineCells = (a, b, size) => {
  const ra = Math.floor(a / size);
  const ca = a % size;
  const rb = Math.floor(b / size);
  const cb = b % size;
  const dr = Math.sign(rb - ra);
  const dc = Math.sign(cb - ca);
  const len = Math.max(Math.abs(rb - ra), Math.abs(cb - ca));
  if (!(ra === rb || ca === cb || Math.abs(rb - ra) === Math.abs(cb - ca))) return null;
  return Array.from({ length: len + 1 }, (_, k) => (ra + dr * k) * size + (ca + dc * k));
};

/** Which hidden word (not yet found) a dragged line spells, either way round; or null. */
export const matchLine = (puzzle, cells, found = []) => {
  if (!cells) return null;
  const key = cells.join(',');
  const rev = [...cells].reverse().join(',');
  return puzzle.words.find((w) => !found.includes(w.word) && (w.cells.join(',') === key || w.cells.join(',') === rev)) || null;
};

/* The maths games (Sum Pop, Change Maker, Best Buy, Number Trail, Estimate It) moved to masterMath.js on 2026-11-17,
   made harder for Class 11 and up. */
