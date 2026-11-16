/**
 * Young Thinkers, group B — six games for Classes 1–5, pure and seeded so a test can deal thousands of rounds.
 *
 *  Picture Word Hunt   (picture-word-hunt)   a small word search with picture clues
 *  Rhyme Detective     (rhyme-detective)     tap every card that rhymes / spot the one that does not
 *  Word Balloon Pop    (word-balloon-pop)    pop the balloon with the right spelling before it floats away
 *  Fruit Shop          (fruit-shop)          fill the basket, work out the total, give the change
 *  Missing Number Race (missing-number-race) fill the blank cars of a number train to race a pace car
 *  Shape Count Dash    (shape-count-dash)    count the shapes in a picture
 *
 * Every config takes (ageBand, difficulty 1–3, levelNo 1–30). Only two bands play here: 'foundation'
 * (Classes 1–2) and 'developing' (Classes 3–5); anything else plays developing.
 */
import { intBetween, pick, sample, shuffle } from '../seeded.js';

export const youngBand = (ageBand) => (ageBand === 'foundation' ? 'foundation' : 'developing');
const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const dOf = (d) => clampN(Math.round(d || 1), 1, 3);
const lOf = (l) => clampN(Math.round(l || 1), 1, 30);
const ramp = (from, to, levelNo) => Math.round(from + (to - from) * clampN((levelNo - 1) / 29, 0, 1));

/* ───────────────────────────── Picture words ───────────────────────────── */

/** Words with a clear picture and a short clue sentence (the clue is for Word Balloon Pop's older players). */
export const PICTURE_WORDS = [
  ['cat', '🐱', 'It says meow and loves to nap.'],
  ['dog', '🐶', 'It barks and wags its tail.'],
  ['sun', '☀️', 'It shines brightly in the sky in the day.'],
  ['bus', '🚌', 'A big vehicle that takes children to school.'],
  ['hat', '🎩', 'You wear it on your head.'],
  ['pig', '🐷', 'A pink farm animal that says oink.'],
  ['bee', '🐝', 'It buzzes and makes honey.'],
  ['egg', '🥚', 'A hen lays it.'],
  ['cow', '🐮', 'It says moo and gives us milk.'],
  ['fox', '🦊', 'A clever orange animal with a bushy tail.'],
  ['owl', '🦉', 'A bird that hoots at night.'],
  ['car', '🚗', 'It has four wheels and drives on the road.'],
  ['bed', '🛏️', 'You sleep on it at night.'],
  ['key', '🔑', 'It opens a lock.'],
  ['ant', '🐜', 'A tiny insect that lives in a hill.'],
  ['bat', '🦇', 'It flies at night and hangs upside down.'],
  ['fish', '🐟', 'It swims in water and has fins.'],
  ['frog', '🐸', 'A green animal that hops and croaks.'],
  ['duck', '🦆', 'A bird that swims and says quack.'],
  ['lion', '🦁', 'A big cat with a mane that roars.'],
  ['bear', '🐻', 'A big furry animal that loves honey.'],
  ['star', '⭐', 'It twinkles in the night sky.'],
  ['moon', '🌙', 'It shines in the sky at night.'],
  ['tree', '🌳', 'It has a trunk, branches and leaves.'],
  ['cake', '🎂', 'You cut it on your birthday.'],
  ['ball', '⚽', 'You kick it in a game of football.'],
  ['boat', '⛵', 'It sails on the water.'],
  ['kite', '🪁', 'It flies high on a windy day.'],
  ['milk', '🥛', 'A white drink that comes from cows.'],
  ['drum', '🥁', 'You bang it to make music.'],
  ['bell', '🔔', 'It rings ding-dong.'],
  ['book', '📖', 'You read stories in it.'],
  ['sock', '🧦', 'You wear it on your foot inside a shoe.'],
  ['ship', '🚢', 'A very big boat that crosses the sea.'],
  ['crab', '🦀', 'It walks sideways on the beach.'],
  ['corn', '🌽', 'A yellow vegetable that grows on a cob.'],
  ['goat', '🐐', 'A farm animal with horns and a beard.'],
  ['apple', '🍎', 'A red fruit that grows on trees.'],
  ['horse', '🐴', 'An animal you can ride that says neigh.'],
  ['mouse', '🐭', 'A tiny animal that squeaks.'],
  ['snake', '🐍', 'A long animal with no legs that hisses.'],
  ['tiger', '🐯', 'A big cat with orange and black stripes.'],
  ['zebra', '🦓', 'It looks like a horse with black and white stripes.'],
  ['bread', '🍞', 'You make sandwiches with it.'],
  ['clock', '🕒', 'It tells you the time.'],
  ['house', '🏠', 'A building where a family lives.'],
  ['truck', '🚚', 'A big vehicle that carries heavy loads.'],
  ['train', '🚆', 'It runs on tracks and pulls many coaches.'],
  ['grape', '🍇', 'A small round fruit that grows in bunches.'],
  ['lemon', '🍋', 'A sour yellow fruit.'],
  ['robot', '🤖', 'A machine that can move and do jobs.'],
  ['whale', '🐳', 'The biggest animal in the sea.'],
  ['camel', '🐫', 'A desert animal with a hump.'],
  ['sheep', '🐑', 'A farm animal with a woolly coat.'],
  ['shark', '🦈', 'A big fish with very sharp teeth.'],
  ['monkey', '🐒', 'It swings from trees and loves bananas.'],
  ['rabbit', '🐰', 'It has long ears and hops.'],
  ['banana', '🍌', 'A long yellow fruit you peel.'],
  ['carrot', '🥕', 'An orange vegetable that rabbits love.'],
  ['rocket', '🚀', 'It blasts off into space.'],
  ['turtle', '🐢', 'A slow animal with a shell on its back.'],
  ['pencil', '✏️', 'You write and draw with it.'],
  ['parrot', '🦜', 'A colourful bird that can copy words.']
].map(([word, emoji, clue]) => ({ word, emoji, clue }));

const WORD_SET = new Set(PICTURE_WORDS.map((w) => w.word));

/* ─────────────────────────── 1. Picture Word Hunt ─────────────────────────── */

export const HUNT_DIRS = { right: [0, 1], down: [1, 0] };
const ALL8 = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]];
const FILL = 'abcdefghiklmnoprstuwy';

/**
 *  size      grid is size × size
 *  words     words hidden per grid
 *  maxLen    longest word
 *  dirs      'right' only, or 'right' and 'down'
 *  puzzles   grids in a level
 */
export const huntConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = youngBand(ageBand);
  const d = dOf(difficulty);
  const l = lOf(levelNo);
  if (band === 'foundation') {
    const dirs = d >= 2 || l >= 16 ? ['right', 'down'] : ['right'];
    return { band, size: 4, words: d === 1 ? 2 : 3, maxLen: d === 1 && l < 10 ? 3 : 4, dirs, puzzles: 2 };
  }
  const size = d === 1 && l < 16 ? 5 : 6;
  return { band, size, words: clampN(3 + (d - 1) + (l >= 20 ? 1 : 0), 3, 5), maxLen: size, dirs: ['right', 'down'], puzzles: 2 };
};

/** How many times `word` reads forward in the grid along any of the 8 directions. */
export const countInGrid = (grid, word) => {
  const n = grid.length;
  let count = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      for (const [dr, dc] of ALL8) {
        let ok = true;
        for (let i = 0; i < word.length && ok; i++) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (rr < 0 || cc < 0 || rr >= n || cc >= n || grid[rr][cc] !== word[i]) ok = false;
        }
        if (ok) count++;
      }
    }
  }
  return count;
};

const tryHunt = (rng, cfg) => {
  const n = cfg.size;
  const pool = shuffle(rng, PICTURE_WORDS.filter((w) => w.word.length >= 3 && w.word.length <= Math.min(cfg.maxLen, n)));
  const grid = Array.from({ length: n }, () => Array(n).fill(null));
  const placed = [];
  for (const entry of pool) {
    if (placed.length >= cfg.words) break;
    const w = entry.word;
    if (placed.some((p) => p.word.includes(w) || w.includes(p.word))) continue;
    const spots = [];
    for (const dir of cfg.dirs) {
      const [dr, dc] = HUNT_DIRS[dir];
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const er = r + dr * (w.length - 1);
          const ec = c + dc * (w.length - 1);
          if (er >= n || ec >= n) continue;
          let fits = true;
          for (let i = 0; i < w.length && fits; i++) {
            const cell = grid[r + dr * i][c + dc * i];
            if (cell !== null) fits = false; // words never share a cell: one tap, one word
          }
          if (fits) spots.push({ r, c, dr, dc });
        }
      }
    }
    if (!spots.length) continue;
    const s = pick(rng, spots);
    for (let i = 0; i < w.length; i++) grid[s.r + s.dr * i][s.c + s.dc * i] = w[i];
    placed.push({ word: w, emoji: entry.emoji, r: s.r, c: s.c, dr: s.dr, dc: s.dc, len: w.length });
  }
  if (placed.length < cfg.words) return null;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (grid[r][c] === null) grid[r][c] = pick(rng, FILL);
  // Each hidden word reads exactly once; no other picture word appears by accident.
  for (const p of placed) if (countInGrid(grid, p.word) !== 1) return null;
  for (const w of WORD_SET) if (!placed.some((p) => p.word === w) && countInGrid(grid, w) > 0) return null;
  return { size: n, grid, words: placed };
};

/** One grid: { size, grid[r][c] letters, words: [{ word, emoji, r, c, dr, dc, len }] }. */
export const makeHuntPuzzle = (rng, cfg) => {
  for (let tries = 0; tries < 400; tries++) {
    const p = tryHunt(rng, cfg);
    if (p) return p;
  }
  throw new Error('picture-word-hunt: could not build a grid');
};

export const makeHuntLevel = (rng, cfg) => {
  const out = [];
  const used = new Set();
  for (let i = 0; i < cfg.puzzles; i++) {
    let p = makeHuntPuzzle(rng, cfg);
    for (let t = 0; t < 20 && p.words.some((w) => used.has(w.word)); t++) p = makeHuntPuzzle(rng, cfg);
    p.words.forEach((w) => used.add(w.word));
    out.push(p);
  }
  return out;
};

/** The cells a word covers. */
export const huntCells = (w) => Array.from({ length: w.len }, (_, i) => [w.r + w.dr * i, w.c + w.dc * i]);

/**
 * The child picked two end letters `a` and `b` ([row, col]). Returns the index of the hidden word whose two ends
 * these are (either order), or -1.
 */
export const checkHuntPick = (puzzle, a, b) => {
  const same = (x, y) => x[0] === y[0] && x[1] === y[1];
  return puzzle.words.findIndex((w) => {
    const cells = huntCells(w);
    const s = cells[0];
    const e = cells[cells.length - 1];
    return (same(s, a) && same(e, b)) || (same(s, b) && same(e, a));
  });
};

/** The letters between two cells in a straight line (row, column or diagonal), or null. */
export const lineCells = (a, b) => {
  const dr = Math.sign(b[0] - a[0]);
  const dc = Math.sign(b[1] - a[1]);
  const lr = Math.abs(b[0] - a[0]);
  const lc = Math.abs(b[1] - a[1]);
  if (lr && lc && lr !== lc) return null;
  const len = Math.max(lr, lc) + 1;
  return Array.from({ length: len }, (_, i) => [a[0] + dr * i, a[1] + dc * i]);
};

/* ─────────────────────────── 2. Rhyme Detective ─────────────────────────── */

/**
 * Rhyme families: words in a family rhyme (they end in the same sound); words in different families do not.
 * Each word carries its spelled ending so the youngest only meet rhymes that are also spelled alike.
 */
export const RHYME_FAMILIES = [
  [['cat', '🐱', 'at'], ['hat', '🎩', 'at'], ['bat', '🦇', 'at'], ['rat', '🐀', 'at']],
  [['dog', '🐶', 'og'], ['frog', '🐸', 'og'], ['log', '🪵', 'og']],
  [['bee', '🐝', 'ee'], ['tree', '🌳', 'ee'], ['key', '🔑', 'ey'], ['tea', '🍵', 'ea']],
  [['car', '🚗', 'ar'], ['star', '⭐', 'ar'], ['jar', '🫙', 'ar'], ['guitar', '🎸', 'ar']],
  [['cake', '🎂', 'ake'], ['snake', '🐍', 'ake'], ['lake', '🏞️', 'ake']],
  [['sun', '☀️', 'un'], ['run', '🏃', 'un']],
  [['ring', '💍', 'ing'], ['king', '🤴', 'ing'], ['sing', '🎤', 'ing']],
  [['fox', '🦊', 'ox'], ['box', '📦', 'ox'], ['socks', '🧦', 'ocks']],
  [['bell', '🔔', 'ell'], ['shell', '🐚', 'ell']],
  [['boat', '⛵', 'oat'], ['goat', '🐐', 'oat'], ['coat', '🧥', 'oat']],
  [['bed', '🛏️', 'ed'], ['sled', '🛷', 'ed'], ['bread', '🍞', 'ead']],
  [['snail', '🐌', 'ail'], ['mail', '📬', 'ail'], ['whale', '🐳', 'ale']],
  [['house', '🏠', 'ouse'], ['mouse', '🐭', 'ouse']],
  [['train', '🚆', 'ain'], ['rain', '🌧️', 'ain'], ['chain', '⛓️', 'ain'], ['plane', '✈️', 'ane']],
  [['light', '💡', 'ight'], ['night', '🌃', 'ight'], ['kite', '🪁', 'ite']],
  [['moon', '🌙', 'oon'], ['spoon', '🥄', 'oon'], ['balloon', '🎈', 'oon']],
  [['clock', '🕰️', 'ock'], ['lock', '🔒', 'ock'], ['rock', '🪨', 'ock']],
  [['van', '🚐', 'an'], ['pan', '🍳', 'an'], ['man', '👨', 'an']],
  [['hen', '🐔', 'en'], ['pen', '🖊️', 'en'], ['ten', '🔟', 'en']],
  [['bear', '🐻', 'ear'], ['pear', '🍐', 'ear'], ['chair', '🪑', 'air']],
  [['fish', '🐟', 'ish'], ['dish', '🍽️', 'ish']]
];

export const RHYME_WORDS = RHYME_FAMILIES.flatMap((fam, family) => fam.map(([word, emoji, rime]) => ({ word, emoji, rime, family })));

/** Two words rhyme when they sit in the same family. */
export const rhymes = (a, b) => a.word !== b.word && a.family === b.family;

/**
 *  rounds   rounds in a level
 *  cards    cards on the board
 *  rhymers  most rhyming cards in a pick-all round
 *  spelled  true: only rhymes spelled alike (cat/hat), false: any rhyme (bee/key/tea)
 *  odd      chance a round is "find the odd one out"
 *  tricky   chance a decoy shares the target's first letter or vowel (looks close, does not rhyme)
 */
export const rhymeConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = youngBand(ageBand);
  const d = dOf(difficulty);
  const l = lOf(levelNo);
  if (band === 'foundation') {
    return { band, rounds: 5, pass: 3, cards: d === 1 ? 3 : 4, rhymers: d === 1 ? 1 : 2, spelled: true, odd: 0, tricky: 0 };
  }
  const rounds = ramp(6, 7, l);
  return {
    band, rounds, pass: Math.ceil(rounds * 0.6),
    cards: clampN(4 + (d >= 2 ? 1 : 0) + (l >= 20 ? 1 : 0), 4, 6),
    rhymers: d === 1 ? 2 : 3,
    spelled: false,
    odd: 0.25 + 0.1 * d,
    tricky: 0.2 + 0.2 * d
  };
};

const vowelOf = (w) => (w.match(/[aeiou]/) || [''])[0];

/**
 * One round.
 *  all: { mode: 'all', target, cards: [word…], answer: [words that rhyme with target] }
 *  odd: { mode: 'odd', cards: [word…], answer: [the one word that does not rhyme with the others] }
 */
export const makeRhymeRound = (rng, cfg) => {
  const famSize = (f) => RHYME_WORDS.filter((w) => w.family === f).length;
  if (rng() < (cfg.odd || 0)) {
    const fams = RHYME_FAMILIES.map((_, i) => i).filter((f) => famSize(f) >= 3);
    const f = pick(rng, fams);
    const three = sample(rng, RHYME_WORDS.filter((w) => w.family === f), 3);
    const odd = pick(rng, RHYME_WORDS.filter((w) => w.family !== f));
    return { mode: 'odd', cards: shuffle(rng, [...three, odd]), answer: [odd.word] };
  }
  const n = clampN(cfg.cards, 3, 6);
  // A target with at least one partner it can rhyme with under this config.
  const partnersOf = (t) => RHYME_WORDS.filter((w) => rhymes(t, w) && (!cfg.spelled || w.rime === t.rime));
  const target = pick(rng, RHYME_WORDS.filter((w) => partnersOf(w).length > 0));
  const partners = partnersOf(target);
  const want = clampN(intBetween(rng, 1, cfg.rhymers), 1, Math.min(partners.length, n - 1));
  const yes = sample(rng, partners, want);
  // Decoys: never the target's family, and never two from one family (so no decoy pair rhymes among themselves).
  const others = shuffle(rng, RHYME_WORDS.filter((w) => w.family !== target.family));
  const close = others.filter((w) => w.word[0] === target.word[0] || vowelOf(w.word) === vowelOf(target.word));
  const decoys = [];
  const usedFam = new Set();
  const take = (w) => { if (!usedFam.has(w.family) && decoys.length < n - want) { usedFam.add(w.family); decoys.push(w); } };
  for (const w of close) if (rng() < (cfg.tricky || 0)) take(w);
  for (const w of others) take(w);
  return { mode: 'all', target, cards: shuffle(rng, [...yes, ...decoys]), answer: yes.map((w) => w.word) };
};

export const makeRhymeLevel = (rng, cfg) => {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < cfg.rounds; i++) {
    let r = makeRhymeRound(rng, cfg);
    const key = (x) => (x.mode === 'all' ? x.target.word : x.answer[0]);
    for (let t = 0; t < 10 && seen.has(key(r)); t++) r = makeRhymeRound(rng, cfg);
    seen.add(key(r));
    out.push(r);
  }
  return out;
};

/** True when the picked words are exactly the round's answer. */
export const checkRhyme = (round, picked) => {
  const a = new Set(round.answer);
  const p = new Set(picked);
  return a.size === p.size && [...a].every((w) => p.has(w));
};

/* ─────────────────────────── 3. Word Balloon Pop ─────────────────────────── */

/** Misspellings that would sound like the word itself, or are another spelling of it: never offered. */
const SOUNDS_SAME = new Set(['son', 'be', 'wale', 'bred', 'kee', 'kie', 'bair', 'bare']);

/** Near-spellings of a word: swapped neighbours, a changed vowel, a dropped or doubled letter. */
export const misspellings = (word) => {
  const out = new Set();
  for (let i = 0; i + 1 < word.length; i++) {
    if (word[i] !== word[i + 1]) out.add(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
  }
  for (let i = 0; i < word.length; i++) {
    if ('aeiou'.includes(word[i])) for (const v of 'aeiou') if (v !== word[i]) out.add(word.slice(0, i) + v + word.slice(i + 1));
  }
  if (word.length > 3) for (let i = 1; i < word.length; i++) out.add(word.slice(0, i) + word.slice(i + 1));
  for (let i = 1; i < word.length; i++) {
    if (!'aeiou'.includes(word[i]) && word[i] !== word[i - 1] && word[i] !== word[i + 1]) out.add(word.slice(0, i) + word[i] + word.slice(i));
  }
  out.delete(word);
  return [...out].filter((w) => !SOUNDS_SAME.has(w) && w.length >= 2);
};

/**
 *  rounds    pictures in a level
 *  balloons  balloons per picture
 *  riseSec   seconds a balloon takes to float from bottom to top
 *  gapSec    seconds between balloons setting off
 *  near      how many balloons carry a near-spelling (the rest are other words)
 *  clue      show the clue sentence
 *  picture   show the picture
 */
export const balloonConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = youngBand(ageBand);
  const d = dOf(difficulty);
  const l = lOf(levelNo);
  if (band === 'foundation') {
    const balloons = d === 1 ? 3 : 4;
    return {
      band, rounds: 6, pass: 4, balloons, riseSec: ramp(15, 12, l) - (d - 1), gapSec: 1.6,
      near: d === 3 ? 1 : 0, clue: false, picture: true, maxLen: d === 1 ? 4 : 5
    };
  }
  const rounds = ramp(7, 8, l);
  return {
    band, rounds, pass: Math.ceil(rounds * 0.6),
    balloons: d === 1 ? 4 : 5,
    riseSec: ramp(10, 8, l) - (d - 1),
    gapSec: 1.1,
    near: d === 1 ? 1 : 2,
    clue: true,
    picture: d < 3,
    maxLen: 6
  };
};

/** One round: { word, emoji, clue, balloons: [{ text, correct, lane, delay }] } with exactly one correct balloon. */
export const makeBalloonRound = (rng, cfg, target) => {
  const n = clampN(cfg.balloons, 3, 5);
  const texts = new Set([target.word]);
  const near = shuffle(rng, misspellings(target.word));
  for (const w of near) {
    if (texts.size >= 1 + Math.min(cfg.near || 0, n - 1)) break;
    texts.add(w);
  }
  const others = shuffle(rng, PICTURE_WORDS.filter((w) => w.word !== target.word && Math.abs(w.word.length - target.word.length) <= 1));
  for (const w of others) {
    if (texts.size >= n) break;
    texts.add(w.word);
  }
  const words = shuffle(rng, [...texts]);
  const lanes = shuffle(rng, Array.from({ length: n }, (_, i) => i));
  // The right balloon never sets off first or last, so there is always something to read before it and after it.
  const order = shuffle(rng, words.map((_, i) => i));
  const ci = words.indexOf(target.word);
  const pos = order.indexOf(ci);
  const middle = n >= 3 ? intBetween(rng, 1, n - 2) : 0;
  [order[pos], order[middle]] = [order[middle], order[pos]];
  const delays = new Array(n);
  order.forEach((wi, k) => { delays[wi] = k * cfg.gapSec; });
  return {
    word: target.word, emoji: target.emoji, clue: target.clue,
    balloons: words.map((text, i) => ({ text, correct: text === target.word, lane: lanes[i], delay: delays[i] }))
  };
};

export const makeBalloonLevel = (rng, cfg) => {
  const pool = PICTURE_WORDS.filter((w) => w.word.length <= (cfg.maxLen || 6));
  return sample(rng, pool, cfg.rounds).map((t) => makeBalloonRound(rng, cfg, t));
};

/* ─────────────────────────── 4. Fruit Shop ─────────────────────────── */

export const FRUITS = [
  ['apple', 'apples', '🍎'], ['banana', 'bananas', '🍌'], ['mango', 'mangoes', '🥭'], ['orange', 'oranges', '🍊'],
  ['pear', 'pears', '🍐'], ['peach', 'peaches', '🍑'], ['lemon', 'lemons', '🍋'], ['coconut', 'coconuts', '🥥'],
  ['kiwi', 'kiwis', '🥝'], ['strawberry', 'strawberries', '🍓'], ['pineapple', 'pineapples', '🍍'], ['watermelon', 'watermelons', '🍉']
].map(([name, plural, emoji]) => ({ name, plural, emoji }));

export const NOTES = [10, 20, 50, 100, 200, 500];
export const COINS = [1, 2, 5, 10, 20, 50, 100];

/**
 *  tasks       shopping lists in a level
 *  shelf       fruits on the shelf
 *  items       different fruits on a list
 *  qty         most of one fruit
 *  price       [min, max] rupees
 *  maxTotal    largest bill
 *  change      pay with a note and give the change back
 *  showSum     show the running sum of the change coins
 */
export const shopConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = youngBand(ageBand);
  const d = dOf(difficulty);
  const l = lOf(levelNo);
  if (band === 'foundation') {
    return {
      band, tasks: 4, pass: 3, shelf: d === 1 ? 3 : 4, items: d === 1 ? 1 + (l >= 10 ? 1 : 0) : 2,
      qty: d === 1 ? 2 : 3, price: [1, d === 1 ? 3 : d === 2 ? 5 : 9], maxTotal: d === 1 ? 10 : d === 2 ? 15 : 20,
      change: false, showSum: true
    };
  }
  const tasks = ramp(4, 5, l);
  return {
    band, tasks, pass: Math.ceil(tasks * 0.6), shelf: d === 1 ? 4 : 5, items: d === 1 ? 2 : 3,
    qty: d === 1 ? 3 : 4, price: [2, clampN(ramp(10, 15, l) + 5 * (d - 1), 10, 25)],
    maxTotal: d === 1 ? 50 : d === 2 ? 99 : 180, change: true, showSum: d < 3
  };
};

const priceOf = (task, name) => task.shelf.find((f) => f.name === name).price;

/** One shopping task: { shelf: [{ name, plural, emoji, price }], list: [{ name, qty }], total, paid, change }. */
export const makeShopTask = (rng, cfg) => {
  for (let tries = 0; tries < 200; tries++) {
    const prices = new Set();
    const shelf = sample(rng, FRUITS, cfg.shelf).map((f) => {
      let p = intBetween(rng, cfg.price[0], cfg.price[1]);
      for (let k = 0; k < 10 && prices.has(p); k++) p = intBetween(rng, cfg.price[0], cfg.price[1]);
      prices.add(p);
      return { ...f, price: p };
    });
    const list = sample(rng, shelf, Math.min(cfg.items, shelf.length)).map((f) => ({ name: f.name, qty: intBetween(rng, 1, cfg.qty) }));
    const task = { shelf, list };
    const total = list.reduce((s, it) => s + it.qty * priceOf(task, it.name), 0);
    if (total > cfg.maxTotal || total < 2) continue;
    // A list of one fruit, one of it, is just reading a price: ask for at least two things.
    if (list.reduce((s, it) => s + it.qty, 0) < 2) continue;
    const paid = cfg.change ? NOTES.find((n) => n > total) : null;
    return { ...task, total, paid, change: paid ? paid - total : null };
  }
  throw new Error('fruit-shop: could not build a task');
};

export const makeShopLevel = (rng, cfg) => Array.from({ length: cfg.tasks }, () => makeShopTask(rng, cfg));

/** basket: { name: count }. True when it holds exactly the list. */
export const basketMatches = (task, basket) => {
  const want = Object.fromEntries(task.list.map((it) => [it.name, it.qty]));
  const names = new Set([...Object.keys(want), ...Object.keys(basket).filter((k) => basket[k] > 0)]);
  return [...names].every((n) => (want[n] || 0) === (basket[n] || 0));
};

export const basketTotal = (task, basket) =>
  Object.entries(basket).reduce((s, [name, n]) => s + n * priceOf(task, name), 0);

/** Coins the child may give as change: every coin no bigger than the change itself. */
export const changeCoins = (task) => COINS.filter((c) => c <= task.change);

/* ─────────────────────────── 5. Missing Number Race ─────────────────────────── */

/**
 *  rounds    number trains in the race
 *  cars      cars in a train
 *  blanks    empty cars (1 or 2)
 *  tiles     number tiles to choose from
 *  steps     the jumps a train may count in (negative counts back)
 *  grow      chance of a "the jump grows by one" train (1, 2, 4, 7, 11 …)
 *  startMax  largest first number
 *  paceSec   seconds the pace car needs for the whole race
 */
export const raceConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = youngBand(ageBand);
  const d = dOf(difficulty);
  const l = lOf(levelNo);
  if (band === 'foundation') {
    const rounds = 6;
    return {
      band, rounds, pass: 4, cars: d === 1 ? 5 : 6, blanks: 1, tiles: d === 1 ? 3 : 4,
      steps: d === 1 ? [1] : [1, 1, -1], grow: 0,
      startMax: d === 1 ? ramp(10, 15, l) : d === 2 ? 30 : 60,
      paceSec: rounds * (d === 1 ? 30 : 24)
    };
  }
  const rounds = ramp(6, 8, l);
  const two = d === 3 || (d === 2 && l >= 10);
  return {
    band, rounds, pass: Math.ceil(rounds * 0.6), cars: 6, blanks: two ? 2 : 1, tiles: two ? 5 : 4,
    steps: d === 1 ? [2, 5, 10] : d === 2 ? [2, 3, 4, 5, 10, -2, -5, -10] : [3, 4, 6, 25, -3, -4, -10],
    grow: d === 3 ? 0.3 : 0,
    startMax: d === 1 ? 30 : 60,
    paceSec: rounds * ramp(18, 14, l) - (d - 1) * rounds * 2
  };
};

/**
 * Every way of filling the blanks from the tiles (different tiles in different blanks) that makes the train follow
 * one rule — a constant jump, or a jump that changes by the same amount each car. Used by the test: it must be
 * exactly one way, the answer.
 */
export const raceCompletions = (round) => {
  const blanks = round.blanks;
  const out = [];
  const fits = (seq) => {
    const d1 = seq.slice(1).map((v, i) => v - seq[i]);
    const d2 = d1.slice(1).map((v, i) => v - d1[i]);
    return d2.every((v) => v === d2[0]);
  };
  const go = (k, seq, used) => {
    if (k === blanks.length) { if (fits(seq)) out.push(blanks.map((b) => seq[b])); return; }
    round.tiles.forEach((t, i) => {
      if (used.has(i)) return;
      const next = [...seq];
      next[blanks[k]] = t;
      go(k + 1, next, new Set([...used, i]));
    });
  };
  go(0, [...round.seq], new Set());
  return out;
};

/** One train: { seq: [numbers], blanks: [indexes], answers: [numbers], tiles: [numbers], rule: text }. */
export const makeRaceRound = (rng, cfg) => {
  for (let tries = 0; tries < 300; tries++) {
    const n = cfg.cars;
    const isGrow = rng() < (cfg.grow || 0);
    const step = pick(rng, cfg.steps);
    let seq;
    let rule;
    if (isGrow) {
      const start = intBetween(rng, 1, 10);
      const first = intBetween(rng, 1, 3);
      seq = [start];
      for (let i = 1; i < n; i++) seq.push(seq[i - 1] + first + (i - 1));
      rule = 'Each jump is one more than the last.';
    } else {
      const span = Math.abs(step) * (n - 1);
      const start = step > 0 ? intBetween(rng, 0, cfg.startMax) : intBetween(rng, span, span + cfg.startMax);
      // Skip counts of 2, 5, 10 and 25 start on their own multiples, as children chant them.
      const s = [2, 5, 10, 25].includes(Math.abs(step)) && Math.abs(step) > 2 ? start - (start % Math.abs(step)) : start;
      seq = Array.from({ length: n }, (_, i) => s + step * i);
      rule = step > 0 ? `Count on in ${step}s.` : `Count back in ${-step}s.`;
    }
    if (seq.some((v) => v < 0)) continue;
    // Blanks: never the first two cars (so the rule can be seen), never side by side.
    const idx = Array.from({ length: n - 2 }, (_, i) => i + 2);
    let blanks = sample(rng, idx, cfg.blanks).sort((a, b) => a - b);
    if (blanks.length === 2 && blanks[1] - blanks[0] < 2) continue;
    if (isGrow) blanks = blanks.filter((b) => b >= 3).length === blanks.length ? blanks : null;
    if (!blanks) continue;
    const answers = blanks.map((b) => seq[b]);
    const jump = isGrow ? seq[blanks[0]] - seq[blanks[0] - 1] : Math.abs(step);
    const decoys = new Set();
    const cand = shuffle(rng, answers.flatMap((a) => [a + 1, a - 1, a + jump, a - jump, a + 10, a - 10, a + 2, a - 2]));
    for (const c of cand) {
      if (decoys.size >= cfg.tiles - answers.length) break;
      if (c >= 0 && !answers.includes(c) && !seq.includes(c)) decoys.add(c);
    }
    if (decoys.size < cfg.tiles - answers.length) continue;
    const tiles = shuffle(rng, [...answers, ...decoys]);
    const round = { seq, blanks, answers, tiles, rule };
    if (raceCompletions(round).length !== 1) continue;
    return round;
  }
  throw new Error('missing-number-race: could not build a train');
};

export const makeRaceLevel = (rng, cfg) => Array.from({ length: cfg.rounds }, () => makeRaceRound(rng, cfg));

/* ─────────────────────────── 6. Shape Count Dash ─────────────────────────── */

export const SHAPES = ['circle', 'triangle', 'square', 'star'];
export const SHAPE_PLURAL = { circle: 'circles', triangle: 'triangles', square: 'squares', star: 'stars' };
export const COLOURS = { red: '#ef4444', blue: '#3b82f6', yellow: '#facc15', green: '#22c55e' };
export const SCENE_W = 320;
export const SCENE_H = 220;

/**
 *  rounds    pictures in a level
 *  kinds     shape kinds in a picture
 *  max       most of one kind
 *  overlap   shapes may overlap a little
 *  colours   colours in play (1 = each kind keeps one colour)
 *  asks      question kinds: count, total, more, colour, colourShape
 */
export const shapeConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = youngBand(ageBand);
  const d = dOf(difficulty);
  const l = lOf(levelNo);
  if (band === 'foundation') {
    return {
      band, rounds: 5, pass: 3, kinds: d === 1 ? 2 : 3, max: d === 1 ? ramp(4, 5, l) : 6, overlap: false, colours: 1,
      asks: d === 3 ? ['count', 'count', 'total'] : ['count'], rMin: 17, rMax: 22
    };
  }
  const rounds = ramp(6, 7, l);
  return {
    band, rounds, pass: Math.ceil(rounds * 0.6), kinds: d === 1 ? 3 : 4, max: d === 1 ? 6 : ramp(7, 8, l),
    overlap: d >= 2, colours: d === 1 ? 1 : 3,
    asks: d === 1 ? ['count', 'more', 'total'] : d === 2 ? ['count', 'more', 'colour', 'total'] : ['more', 'colour', 'colourShape', 'total'],
    rMin: 14, rMax: 19
  };
};

/** Count shapes in a scene that match { shape?, colour? }. */
export const countShapes = (scene, { shape = null, colour = null } = {}) =>
  scene.shapes.filter((s) => (!shape || s.shape === shape) && (!colour || s.colour === colour)).length;

/** The answer to a question, worked out from the scene itself. */
export const answerFor = (scene, q) => {
  if (q.kind === 'total') return scene.shapes.length;
  if (q.kind === 'more') return countShapes(scene, { shape: q.a }) - countShapes(scene, { shape: q.b });
  return countShapes(scene, { shape: q.shape || null, colour: q.colour || null });
};

export const questionText = (q) => {
  if (q.kind === 'total') return 'How many shapes are there in all?';
  if (q.kind === 'more') return `How many more ${SHAPE_PLURAL[q.a]} than ${SHAPE_PLURAL[q.b]}?`;
  if (q.kind === 'colour') return `How many ${q.colour} shapes?`;
  if (q.kind === 'colourShape') return `How many ${q.colour} ${SHAPE_PLURAL[q.shape]}?`;
  return `How many ${SHAPE_PLURAL[q.shape]}?`;
};

const placeShapes = (rng, cfg, list) => {
  const placed = [];
  const allowOverlap = (a, b) => cfg.overlap && rng() < 0.35 && a.colour !== b.colour;
  for (const item of list) {
    let ok = false;
    for (let t = 0; t < 300 && !ok; t++) {
      const r = intBetween(rng, cfg.rMin, cfg.rMax);
      const x = intBetween(rng, r + 4, SCENE_W - r - 4);
      const y = intBetween(rng, r + 4, SCENE_H - r - 4);
      const cand = { ...item, x, y, r, rot: item.shape === 'square' ? intBetween(rng, -12, 12) : 0 };
      ok = placed.every((p) => {
        const dist = Math.hypot(p.x - x, p.y - y);
        // Overlapping shapes still leave most of each other showing, so every shape can be counted.
        return dist >= (allowOverlap(p, cand) ? 0.75 : 1) * (p.r + r) + (cfg.overlap ? 0 : 6);
      });
      if (ok) placed.push(cand);
    }
    if (!ok) return null;
  }
  return placed;
};

/** One picture and its question: { shapes: [{ shape, colour, x, y, r, rot }], q, answer, text }. */
export const makeShapeRound = (rng, cfg, ask) => {
  for (let tries = 0; tries < 300; tries++) {
    const kinds = sample(rng, SHAPES, cfg.kinds);
    const palette = sample(rng, Object.keys(COLOURS), Math.max(cfg.colours, kinds.length));
    const counts = kinds.map(() => intBetween(rng, 1, cfg.max));
    const list = [];
    kinds.forEach((shape, k) => {
      for (let i = 0; i < counts[k]; i++) {
        const colour = cfg.colours === 1 ? palette[k] : pick(rng, palette.slice(0, cfg.colours));
        list.push({ shape, colour });
      }
    });
    if (list.length > (cfg.band === 'foundation' ? 12 : 20)) continue;
    const shapes = placeShapes(rng, cfg, shuffle(rng, list));
    if (!shapes) continue;
    const scene = { shapes };
    let q;
    if (ask === 'more') {
      const pairs = [];
      for (const a of kinds) for (const b of kinds) {
        const diff = countShapes(scene, { shape: a }) - countShapes(scene, { shape: b });
        if (diff > 0) pairs.push({ a, b });
      }
      if (!pairs.length) continue;
      q = { kind: 'more', ...pick(rng, pairs) };
    } else if (ask === 'colour') {
      q = { kind: 'colour', colour: pick(rng, [...new Set(shapes.map((s) => s.colour))]) };
    } else if (ask === 'colourShape') {
      const s = pick(rng, shapes);
      q = { kind: 'colourShape', colour: s.colour, shape: s.shape };
    } else if (ask === 'total') {
      q = { kind: 'total' };
    } else {
      q = { kind: 'count', shape: pick(rng, kinds) };
    }
    const answer = answerFor(scene, q);
    if (answer < 1) continue;
    return { shapes, q, answer, text: questionText(q) };
  }
  throw new Error('shape-count-dash: could not build a picture');
};

export const makeShapeLevel = (rng, cfg) =>
  Array.from({ length: cfg.rounds }, (_, i) => makeShapeRound(rng, cfg, i === 0 && cfg.asks.includes('count') ? 'count' : pick(rng, cfg.asks)));

/** SVG points for a star or triangle centred on (x, y) with radius r. */
export const shapePoints = (shape, x, y, r) => {
  if (shape === 'triangle') {
    return [0, 1, 2].map((i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
      return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * 1.05 * Math.sin(a) + r * 0.15).toFixed(1)}`;
    }).join(' ');
  }
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
};
