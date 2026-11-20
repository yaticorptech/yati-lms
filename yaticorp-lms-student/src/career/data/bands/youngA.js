/**
 * Young Thinkers, group A (Classes 1–5): six games' rounds, pure and seeded so a test can deal thousands.
 *
 *  Animal Pair Safari  — memory cards that pair an animal with its sound, home or baby (not two identical cards)
 *  What's Missing?     — a scene, covered, shown again with one or two things gone
 *  Shape Builder       — fill a silhouette on a grid with square / rectangle / triangle pieces
 *  Mini Maze Mission   — a generated maze walked live, with puddles, a buzzing bee and stars
 *  Count & Catch       — catch exactly the asked-for number of one (or two) kinds from a falling stream
 *  Number Hop          — tap the lily pad the frog should hop to
 *
 * Every config takes (ageBand, difficulty 1–3, levelNo 1–30): band first (foundation = Classes 1–2,
 * developing = Classes 3–5), then difficulty and the step inside the band. No React, no DOM.
 */
import { intBetween, pick, sample, shuffle } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const ramp = (from, to, levelNo) => Math.round(from + (to - from) * clampN(((levelNo || 1) - 1) / 29, 0, 1));
const dOf = (difficulty) => clampN(difficulty || 1, 1, 3);
const lOf = (levelNo) => clampN(levelNo || 1, 1, 30);

/** The two young bands; anything that is not Classes 1–2 plays as Classes 3–5. */
export const youngBand = (ageBand) => (ageBand === 'foundation' ? 'foundation' : 'developing');

/* ───────────────────────────── Animal Pair Safari ───────────────────────────── */

/**
 * Each animal: what it says, its baby, its home ([word, picture]) and `also` — other words a child could fairly
 * link to it. A partner card only goes on a board when no OTHER animal there could also claim it.
 */
export const SAFARI_ANIMALS = [
  { emoji: '🐄', name: 'cow', sound: 'Moo', baby: 'calf', also: ['barn', 'farm', 'milk'] },
  { emoji: '🐕', name: 'dog', sound: 'Woof', baby: 'puppy', home: ['kennel', '🏠'], also: ['pup', 'bark', 'growl'] },
  { emoji: '🐈', name: 'cat', sound: 'Meow', baby: 'kitten', also: ['purr'] },
  { emoji: '🦆', name: 'duck', sound: 'Quack', baby: 'duckling', also: ['pond', 'water', 'nest', 'egg'] },
  { emoji: '🐑', name: 'sheep', sound: 'Baa', baby: 'lamb', also: ['farm', 'wool'] },
  { emoji: '🐖', name: 'pig', sound: 'Oink', baby: 'piglet', also: ['sty', 'mud', 'farm'] },
  { emoji: '🐔', name: 'hen', sound: 'Cluck', baby: ['chick', '🐣'], also: ['egg', 'nest', 'coop', 'farm'] },
  { emoji: '🐓', name: 'rooster', sound: 'Cock-a-doodle-doo', also: ['cluck', 'chick', 'farm', 'coop'] },
  { emoji: '🦁', name: 'lion', sound: 'Roar', baby: 'cub', home: ['den', '🪨'], also: ['growl'] },
  { emoji: '🐍', name: 'snake', sound: 'Hiss', also: ['hole', 'egg'] },
  { emoji: '🐝', name: 'bee', sound: 'Buzz', home: ['hive', '🍯'], also: ['honey', 'flower'] },
  { emoji: '🐎', name: 'horse', sound: 'Neigh', baby: 'foal', also: ['stable', 'farm'] },
  { emoji: '🐸', name: 'frog', sound: 'Croak', baby: 'tadpole', home: ['pond', '🪷'], also: ['water', 'ribbit'] },
  { emoji: '🦉', name: 'owl', sound: 'Hoot', baby: 'owlet', also: ['tree', 'nest'] },
  { emoji: '🐭', name: 'mouse', sound: 'Squeak', also: ['hole', 'burrow'] },
  { emoji: '🐺', name: 'wolf', sound: 'Howl', baby: 'pup', home: ['den', '🪨'], also: ['growl', 'cub'] },
  { emoji: '🐦', name: 'bird', sound: 'Tweet', home: ['nest', '🪺'], also: ['chick', 'tree', 'egg'] },
  { emoji: '🕷️', name: 'spider', home: ['web', '🕸️'], also: [] },
  { emoji: '🐟', name: 'fish', home: ['water', '🌊'], also: ['pond', 'sea'] },
  { emoji: '🐇', name: 'rabbit', home: ['burrow', '🕳️'], also: ['hole', 'bunny'] },
  { emoji: '🐧', name: 'penguin', home: ['ice', '🧊'], also: ['chick', 'snow', 'water', 'sea', 'egg'] },
  { emoji: '🐫', name: 'camel', home: ['desert', '🏜️'], also: ['sand', 'calf'] },
  { emoji: '🐒', name: 'monkey', home: ['tree', '🌳'], also: ['banana'] },
  { emoji: '🐻', name: 'bear', sound: 'Growl', home: ['cave', '⛰️'], also: ['den', 'cub', 'honey', 'roar'] },
  { emoji: '🦋', name: 'butterfly', baby: ['caterpillar', '🐛'], also: ['flower', 'egg'] },
  { emoji: '🦘', name: 'kangaroo', baby: 'joey', also: ['pouch'] }
];

const low = (s) => String(s).toLowerCase();

/** The partner card an animal has for `kind`, or null. */
export const safariPartner = (animal, kind) => {
  if (kind === 'sound') return animal.sound ? { kind, word: animal.sound, pic: '🔊' } : null;
  if (kind === 'home') return animal.home ? { kind, word: animal.home[0], pic: animal.home[1] } : null;
  if (kind === 'baby') {
    if (!animal.baby) return null;
    return Array.isArray(animal.baby) ? { kind, word: animal.baby[0], pic: animal.baby[1] } : { kind, word: animal.baby, pic: '🍼' };
  }
  return null;
};

/** Every word a child could link to this animal. */
export const safariFacts = (animal) => {
  const out = new Set([low(animal.name), ...(animal.also || []).map(low)]);
  for (const kind of ['sound', 'home', 'baby']) {
    const p = safariPartner(animal, kind);
    if (p) out.add(low(p.word));
  }
  return out;
};

/**
 * Pairs per board and which partner kinds are used.
 *  foundation: 3 → 5 pairs, sounds only (spoken aloud when the card turns)
 *  developing: 5 → 8 pairs, sounds + babies, then homes as well
 */
export const safariConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = youngBand(ageBand);
  const d = dOf(difficulty);
  const L = lOf(levelNo);
  if (band === 'foundation') {
    // Always 4 to a row, so every board is full rows (2026-11-18, the user): level 1 is 8 cards
    // (2 rows of 4), growing to 12 (3 rows) from level 16 or on the hardest setting.
    const pairs = L >= 16 || d >= 3 ? 6 : 4;
    return { band, pairs, kinds: ['sound'], moveBudget: Math.ceil(pairs * 2.5) + 2, cols: 4 };
  }
  // 8 cards at level 1, then 12, then 16 — always full rows of 4 (2026-11-18, the user).
  const step = Math.floor((L - 1) / 10) + (L > 1 ? d - 1 : 0);
  const pairs = step <= 0 ? 4 : step === 1 ? 6 : 8;
  const kinds = d === 1 && L < 10 ? ['sound', 'baby'] : ['sound', 'home', 'baby'];
  return { band, pairs, kinds, moveBudget: Math.ceil(pairs * 2.5) + (d === 1 ? 1 : 0), cols: 4 };
};

/**
 * A shuffled deck: for each pair an animal card and its partner card.
 * Card: { id, pair, kind: 'animal'|'sound'|'home'|'baby', word, pic, say }.
 * No partner word is linkable to another animal on the board, and no two partner words repeat.
 */
export const makeSafariDeck = (rng, config) => {
  for (let attempt = 0; attempt < 50; attempt++) {
    const chosen = [];
    const kindUse = Object.fromEntries(config.kinds.map((k) => [k, 0]));
    for (const animal of shuffle(rng, SAFARI_ANIMALS)) {
      if (chosen.length >= config.pairs) break;
      const facts = safariFacts(animal);
      // Prefer the kind used least so far, so a mixed board really is mixed.
      const kinds = shuffle(rng, config.kinds).sort((a, b) => kindUse[a] - kindUse[b]);
      for (const kind of kinds) {
        const partner = safariPartner(animal, kind);
        if (!partner) continue;
        const w = low(partner.word);
        const clash = chosen.some((c) => c.facts.has(w) || facts.has(low(c.partner.word)));
        if (clash) continue;
        chosen.push({ animal, partner, facts });
        kindUse[kind] += 1;
        break;
      }
    }
    if (chosen.length < config.pairs) continue;
    if (config.kinds.length > 1 && Object.values(kindUse).filter((n) => n > 0).length < Math.min(2, config.kinds.length)) continue;
    const cards = [];
    chosen.forEach(({ animal, partner }, pair) => {
      cards.push({ id: `a${pair}`, pair, kind: 'animal', word: animal.name, pic: animal.emoji, say: animal.name });
      cards.push({ id: `p${pair}`, pair, kind: partner.kind, word: partner.word, pic: partner.pic, say: partner.word });
    });
    return shuffle(rng, cards);
  }
  throw new Error('no safari board');
};

/** Two cards are a pair when they are different cards of the same pair. */
export const safariMatch = (a, b) => !!a && !!b && a.id !== b.id && a.pair === b.pair;

/* ───────────────────────────── What's Missing? ───────────────────────────── */

export const MISSING_OBJECTS = [
  ['⚽', 'ball'], ['🍎', 'apple'], ['🧸', 'teddy bear'], ['🚗', 'car'], ['🎈', 'balloon'], ['📚', 'books'],
  ['✏️', 'pencil'], ['🔑', 'key'], ['🎁', 'present'], ['🌻', 'sunflower'], ['🐟', 'fish'], ['🍌', 'banana'],
  ['🎸', 'guitar'], ['👟', 'shoe'], ['🧢', 'cap'], ['☂️', 'umbrella'], ['🍦', 'ice cream'], ['🥕', 'carrot'],
  ['🔔', 'bell'], ['🧦', 'socks'], ['🍪', 'cookie'], ['🚲', 'bicycle'], ['⏰', 'clock'], ['🦆', 'duck'],
  ['🐞', 'ladybird'], ['🌙', 'moon'], ['⭐', 'star'], ['🍉', 'watermelon'], ['🎨', 'paints'], ['🥁', 'drum'],
  ['🚀', 'rocket'], ['⛵', 'boat'], ['🍓', 'strawberry'], ['🐢', 'turtle'], ['🌈', 'rainbow'], ['✂️', 'scissors'],
  ['🎩', 'top hat'], ['🥛', 'milk'], ['🍕', 'pizza'], ['🐌', 'snail']
].map(([emoji, name]) => ({ emoji, name }));

/**
 *  rounds, pass   — scenes per level, perfect scenes to clear it
 *  objects        — things in the scene
 *  missing        — how many disappear (1, later 2)
 *  shuffle        — the leftovers move to new places
 *  tray           — pictures to choose from; `present` of them are still in the scene (a trap)
 *  showMs         — how long the scene shows before the cover
 */
export const missingConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = youngBand(ageBand);
  const d = dOf(difficulty);
  const L = lOf(levelNo);
  if (band === 'foundation') {
    const rounds = 5;
    return {
      band, rounds, pass: 3,
      objects: clampN(3 + Math.floor((L - 1) / 10) + (d >= 3 ? 1 : 0), 3, 5),
      missing: 1, shuffle: false,
      tray: d === 1 ? 3 : 4, present: 0,
      showMs: ramp(6000, 4500, L) - (d - 1) * 400,
      slots: 6, slotCols: 3
    };
  }
  const rounds = 6;
  const missing = d >= 2 || L >= 15 ? 2 : 1;
  return {
    band, rounds, pass: 4,
    objects: clampN(5 + Math.floor((L - 1) / 10) + (d - 1), 5, 8),
    missing,
    shuffle: d >= 2 || L >= 10,
    tray: missing + 3 + (d >= 3 ? 1 : 0),
    present: 1 + (d >= 2 ? 1 : 0),
    showMs: ramp(5000, 3500, L) - (d - 1) * 400,
    slots: 9, slotCols: 3
  };
};

/**
 * One scene.
 *  scene:  [{ ...object, slot }]  — what is shown first
 *  after:  [{ ...object, slot }]  — the scene with `missing` gone (moved about when config.shuffle)
 *  missing:[object]               — what went
 *  tray:   [object]               — every missing thing once, plus things that never were there and (developing)
 *                                    some that are still there
 */
export const makeMissingRound = (rng, config) => {
  const objs = sample(rng, MISSING_OBJECTS, config.objects);
  const slots = sample(rng, [...Array(config.slots).keys()], config.objects);
  const scene = objs.map((o, i) => ({ ...o, slot: slots[i] }));
  const missingIdx = new Set(sample(rng, [...Array(config.objects).keys()], config.missing));
  const missing = scene.filter((_, i) => missingIdx.has(i)).map(({ emoji, name }) => ({ emoji, name }));
  let after = scene.filter((_, i) => !missingIdx.has(i));
  if (config.shuffle) {
    const newSlots = sample(rng, [...Array(config.slots).keys()], after.length);
    after = after.map((o, i) => ({ ...o, slot: newSlots[i] }));
  }
  const stayers = sample(rng, after.map(({ emoji, name }) => ({ emoji, name })), Math.min(config.present, after.length));
  const shown = new Set(scene.map((o) => o.emoji));
  const fresh = sample(rng, MISSING_OBJECTS.filter((o) => !shown.has(o.emoji)), Math.max(0, config.tray - missing.length - stayers.length));
  const tray = shuffle(rng, [...missing, ...stayers, ...fresh]);
  return { scene, after, missing, tray };
};

export const makeMissingLevel = (rng, config) => Array.from({ length: config.rounds }, () => makeMissingRound(rng, config));

/** True when the tapped picture is one of the things that went. */
export const missingCheck = (round, emoji) => round.missing.some((m) => m.emoji === emoji);

/* ───────────────────────────── Shape Builder ───────────────────────────── */

/**
 * A piece is cells on the grid: { r, c, t } where t is 'F' (a full square) or the corner a half-square
 * triangle keeps its right angle in: 'tl' | 'tr' | 'br' | 'bl'.
 */
export const SHAPE_PIECES = {
  sq: { name: 'square', cells: [{ r: 0, c: 0, t: 'F' }] },
  rect: { name: 'rectangle', cells: [{ r: 0, c: 0, t: 'F' }, { r: 0, c: 1, t: 'F' }] },
  tri: { name: 'triangle', cells: [{ r: 0, c: 0, t: 'bl' }] },
  roof: { name: 'roof', cells: [{ r: 0, c: 0, t: 'br' }, { r: 0, c: 1, t: 'bl' }] },
  bar: { name: 'long bar', cells: [{ r: 0, c: 0, t: 'F' }, { r: 0, c: 1, t: 'F' }, { r: 0, c: 2, t: 'F' }] },
  ell: { name: 'L shape', cells: [{ r: 0, c: 0, t: 'F' }, { r: 1, c: 0, t: 'F' }, { r: 1, c: 1, t: 'F' }] }
};

const CW = { tl: 'tr', tr: 'br', br: 'bl', bl: 'tl', F: 'F' };

const normalise = (cells) => {
  const minR = Math.min(...cells.map((x) => x.r));
  const minC = Math.min(...cells.map((x) => x.c));
  return cells.map((x) => ({ r: x.r - minR, c: x.c - minC, t: x.t })).sort((a, b) => a.r - b.r || a.c - b.c);
};

/** A piece's cells turned a quarter clockwise `times` times. */
export const rotateCells = (cells, times = 1) => {
  let out = normalise(cells);
  for (let i = 0; i < ((times % 4) + 4) % 4; i++) {
    const maxR = Math.max(...out.map((x) => x.r));
    out = normalise(out.map((x) => ({ r: x.c, c: maxR - x.r, t: CW[x.t] })));
  }
  return out;
};

export const pieceCells = (type, rot) => rotateCells(SHAPE_PIECES[type].cells, rot);

const key = (r, c) => `${r},${c}`;

/**
 *  puzzles, pass  — silhouettes per level, and how many must be built with few misfits
 *  rows, cols     — the board
 *  pieces         — pieces per silhouette
 *  types          — piece kinds used
 *  rotate         — pieces arrive turned and must be rotated (developing); otherwise they come the right way round
 *  slack          — misfit taps allowed for a puzzle to count as well built
 */
export const shapeConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = youngBand(ageBand);
  const d = dOf(difficulty);
  const L = lOf(levelNo);
  if (band === 'foundation') {
    const puzzles = d >= 3 ? 4 : 3;
    return {
      band, puzzles, pass: puzzles - 1, rows: 3, cols: 3,
      pieces: clampN(2 + (L >= 10 ? 1 : 0) + (d >= 2 ? 1 : 0), 2, 4),
      types: L < 10 && d === 1 ? ['sq', 'rect'] : ['sq', 'rect', 'tri', 'roof'],
      rotate: false, slack: 2
    };
  }
  const puzzles = 4;
  return {
    band, puzzles, pass: 3, rows: 4, cols: 4,
    pieces: clampN(3 + Math.floor((L - 1) / 15) + (d - 1), 3, 5),
    types: d === 1 && L < 10 ? ['sq', 'rect', 'tri', 'roof'] : ['sq', 'rect', 'tri', 'roof', 'bar', 'ell'],
    rotate: true, slack: 1
  };
};

/** The absolute cells of `cells` with its first cell's origin at (R, C), or null if it does not exactly fit. */
export const placeAt = (target, filled, cells, R, C) => {
  const abs = cells.map((x) => ({ r: R + x.r, c: C + x.c, t: x.t }));
  for (const a of abs) {
    const k = key(a.r, a.c);
    if (target[k] !== a.t || filled.has(k)) return null;
  }
  return abs;
};

/** Tapping (R, C) with a piece: any placement that puts one of its cells there and fits, else null. */
export const fitPiece = (target, filled, cells, R, C) => {
  for (const p of cells) {
    const abs = placeAt(target, filled, cells, R - p.r, C - p.c);
    if (abs) return abs;
  }
  return null;
};

/**
 * One silhouette.
 *  target: { 'r,c': t }                — the cells to fill
 *  solution: [{ type, rot, r, c }]     — one way to fill it (placeAt origin)
 *  tray: [{ id, type, rot }]           — the pieces, turned at random when config.rotate
 */
export const makeShapePuzzle = (rng, config) => {
  for (let attempt = 0; attempt < 300; attempt++) {
    const target = {};
    const solution = [];
    let ok = true;
    // At least one piece of a non-square kind, so a puzzle is never only squares.
    const fancy = config.types.filter((t) => t !== 'sq');
    const types = [pick(rng, fancy), ...Array.from({ length: config.pieces - 1 }, () => pick(rng, config.types))];
    for (const type of shuffle(rng, types)) {
      const rot = intBetween(rng, 0, 3);
      const cells = pieceCells(type, rot);
      const spots = [];
      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          const abs = cells.map((x) => ({ r: r + x.r, c: c + x.c }));
          if (abs.some((a) => a.r >= config.rows || a.c >= config.cols || target[key(a.r, a.c)])) continue;
          const touches = solution.length === 0 || abs.some((a) =>
            [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) => target[key(a.r + dr, a.c + dc)]));
          if (touches) spots.push([r, c]);
        }
      }
      if (!spots.length) { ok = false; break; }
      const [r, c] = pick(rng, spots);
      cells.forEach((x) => { target[key(r + x.r, c + x.c)] = x.t; });
      solution.push({ type, rot, r, c });
    }
    if (!ok) continue;
    const tray = shuffle(rng, solution.map((s, i) => ({
      id: `p${i}`, type: s.type, rot: config.rotate ? intBetween(rng, 0, 3) : s.rot
    })));
    return { target, solution, tray };
  }
  throw new Error('no shape puzzle');
};

export const makeShapeLevel = (rng, config) => Array.from({ length: config.puzzles }, () => makeShapePuzzle(rng, config));

/* ───────────────────────────── Mini Maze Mission ───────────────────────────── */

export const MAZE_DIRS = {
  up: { dr: -1, dc: 0, wall: 'n' },
  down: { dr: 1, dc: 0, wall: 's' },
  left: { dr: 0, dc: -1, wall: 'w' },
  right: { dr: 0, dc: 1, wall: 'e' }
};
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };

/**
 *  mazes          — mazes per level
 *  size           — rows = cols
 *  loops          — extra walls knocked down (more than one way through)
 *  puddles        — 🦁 lions (2026-11-18, were puddles): step on one and you are sent back to the start
 *  goalReach      — how far along the maze the 🥕 sits (0.5 = half way, 1 = the farthest cell)
 *  bee, beeMs     — a bee buzzing to and fro on a side path, one step per beeMs
 *  stars          — optional ⭐ to collect
 *  bumpAllow, slack — bonus point limits: wall bumps / splashes, and moves over the best route
 */
export const mazeConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = youngBand(ageBand);
  const d = dOf(difficulty);
  const L = lOf(levelNo);
  if (band === 'foundation') {
    // Bigger mazes with lions in the way (2026-11-18, the user): easy levels have many ways round and a near carrot;
    // later ones fewer ways round, more lions and the carrot at the far end.
    return {
      // Squares as big as the user's picture (2026-11-18): 6×6, then 7×7 — never smaller squares than that.
      band, mazes: 3, size: L >= 10 || d >= 3 ? 7 : 6,
      loops: L < 8 ? 6 : L < 16 ? 4 : 2,
      // Exactly three obstacles (2026-11-18, the user): two lions, spread apart, and one stone that blocks the way.
      puddles: 2, rocks: 1,
      goalReach: L < 5 ? 0.5 : L < 15 ? 0.75 : 1,
      // And one bee buzzing to and fro on a side path (2026-11-18, the user: "2 lions, 1 stone, a bee").
      bee: true, beeMs: 1150,
      stars: 1 + (L >= 15 ? 1 : 0),
      bumpAllow: 3, slack: 4
    };
  }
  return {
    band, mazes: 3, size: 7,
    loops: clampN(6 - Math.floor(L / 6) - (d - 1), 1, 6),
    puddles: 2, rocks: 1,
    goalReach: L < 4 ? 0.6 : L < 12 ? 0.8 : 1,
    bee: true, beeMs: ramp(1000, 800, L),
    stars: 2 + (d >= 3 ? 1 : 0),
    bumpAllow: 2, slack: 2
  };
};

/** Can you step from (r, c) in `dir`? Returns the new cell, or null for a wall / the edge. */
export const mazeStep = (maze, r, c, dir) => {
  const D = MAZE_DIRS[dir];
  if (!D || maze.walls[r][c][D.wall]) return null;
  const nr = r + D.dr;
  const nc = c + D.dc;
  if (nr < 0 || nc < 0 || nr >= maze.size || nc >= maze.size) return null;
  // A stone 🪨 blocks the way like a wall.
  if (maze.rocks?.some(([rr, rc]) => rr === nr && rc === nc)) return null;
  return [nr, nc];
};

/** BFS distances from `from`, never entering a cell in `blocked` (a Set of 'r,c'). */
export const mazeDistances = (maze, from, blocked = new Set()) => {
  const dist = new Map([[key(from[0], from[1]), 0]]);
  const q = [from];
  while (q.length) {
    const [r, c] = q.shift();
    const here = dist.get(key(r, c));
    for (const dir of Object.keys(MAZE_DIRS)) {
      const n = mazeStep(maze, r, c, dir);
      if (!n) continue;
      const k = key(n[0], n[1]);
      if (dist.has(k) || blocked.has(k)) continue;
      dist.set(k, here + 1);
      q.push(n);
    }
  }
  return dist;
};

/** The cells of a shortest route from `from` to `to` avoiding `blocked`, or null. */
export const mazePath = (maze, from, to, blocked = new Set()) => {
  const dist = mazeDistances(maze, to, blocked);
  if (!dist.has(key(from[0], from[1]))) return null;
  const path = [from];
  let [r, c] = from;
  while (r !== to[0] || c !== to[1]) {
    const d = dist.get(key(r, c));
    for (const dir of Object.keys(MAZE_DIRS)) {
      const n = mazeStep(maze, r, c, dir);
      if (n && dist.get(key(n[0], n[1])) === d - 1) { [r, c] = n; break; }
    }
    path.push([r, c]);
  }
  return path;
};

/** The hazard cells you must never step on: puddles and the bee's whole patrol. */
export const mazeHazards = (maze) => new Set([...maze.puddles.map(([r, c]) => key(r, c)), ...maze.bee.map(([r, c]) => key(r, c))]);

/** Fewest moves from the start through every cell in `stops` (any order) to the goal, avoiding hazards. */
export const mazeTour = (maze, stops = []) => {
  const blocked = mazeHazards(maze);
  const pts = [maze.start, ...stops, maze.goal];
  const dist = pts.map((p) => mazeDistances(maze, p, blocked));
  const d = (i, j) => dist[i].get(key(pts[j][0], pts[j][1])) ?? Infinity;
  const mids = stops.map((_, i) => i + 1);
  const perms = (list) => (list.length <= 1 ? [list] : list.flatMap((x, i) => perms([...list.slice(0, i), ...list.slice(i + 1)]).map((p) => [x, ...p])));
  let best = Infinity;
  for (const order of perms(mids)) {
    let total = 0;
    let at = 0;
    for (const m of order) { total += d(at, m); at = m; }
    total += d(at, pts.length - 1);
    best = Math.min(best, total);
  }
  return best;
};

/** Where the bee is after `tick` steps: to and fro along its patrol. */
export const beeAt = (maze, tick) => {
  const n = maze.bee.length;
  if (!n) return null;
  if (n === 1) return maze.bee[0];
  const period = 2 * (n - 1);
  const t = ((tick % period) + period) % period;
  return maze.bee[t < n ? t : period - t];
};

/**
 * One maze: { size, walls[r][c] = {n,e,s,w}, start, goal, optimal, puddles: [[r,c]], bee: [[r,c]…] (patrol, maybe
 * empty), stars: [[r,c]] }. The goal and every star are reachable without touching a puddle or the bee's patrol.
 */
export const makeMaze = (rng, config) => {
  const size = config.size;
  for (let attempt = 0; attempt < 200; attempt++) {
    const walls = Array.from({ length: size }, () => Array.from({ length: size }, () => ({ n: true, e: true, s: true, w: true })));
    const maze = { size, walls, puddles: [], rocks: [], bee: [], stars: [] };
    // Recursive backtracker: a perfect maze, every cell reachable.
    const seen = new Set([key(0, 0)]);
    const stack = [[0, 0]];
    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const options = Object.entries(MAZE_DIRS).filter(([, D]) => {
        const nr = r + D.dr;
        const nc = c + D.dc;
        return nr >= 0 && nc >= 0 && nr < size && nc < size && !seen.has(key(nr, nc));
      });
      if (!options.length) { stack.pop(); continue; }
      const [, D] = pick(rng, options);
      const nr = r + D.dr;
      const nc = c + D.dc;
      walls[r][c][D.wall] = false;
      walls[nr][nc][OPP[D.wall]] = false;
      seen.add(key(nr, nc));
      stack.push([nr, nc]);
    }
    // A few extra openings make loops, so a puddle can be walked around.
    for (let i = 0, guard = 0; i < config.loops && guard < 100; guard++) {
      const r = intBetween(rng, 0, size - 1);
      const c = intBetween(rng, 0, size - 1);
      const [w, dr, dc] = pick(rng, [['e', 0, 1], ['s', 1, 0]]);
      if (r + dr >= size || c + dc >= size || !walls[r][c][w]) continue;
      walls[r][c][w] = false;
      walls[r + dr][c + dc][OPP[w]] = false;
      i++;
    }
    maze.start = [0, 0];
    const fromStart = mazeDistances(maze, maze.start);
    // The goal: the farthest cell on hard levels; on easy ones about `goalReach` of the way, so it is quick to find.
    const far = Math.max(...fromStart.values());
    const want = Math.max(size - 1, Math.round(far * (config.goalReach ?? 1)));
    let best = Infinity;
    for (const [k, v] of fromStart) {
      const [r, c] = k.split(',').map(Number);
      const off = Math.abs(v - want);
      if (r + c >= size - 2 && off < best) { best = off; maze.goal = [r, c]; }
    }
    if (!maze.goal) continue;
    const startK = key(...maze.start);
    const goalK = key(...maze.goal);
    const near = (k) => {
      const [r, c] = k.split(',').map(Number);
      return Math.abs(r - maze.start[0]) + Math.abs(c - maze.start[1]) <= 1 || k === goalK;
    };

    // Puddles: anywhere but next to the start or on the goal, as long as the goal stays reachable.
    let tries = 0;
    while (maze.puddles.length < config.puddles && tries++ < 200) {
      const r = intBetween(rng, 0, size - 1);
      const c = intBetween(rng, 0, size - 1);
      const k = key(r, c);
      if (near(k) || k === startK || maze.puddles.some(([pr, pc]) => pr === r && pc === c)) continue;
      // Lions apart from each other (2026-11-18): never bunched in one place.
      if (maze.puddles.some(([pr, pc]) => Math.abs(pr - r) + Math.abs(pc - c) < Math.max(3, Math.floor(size / 2)))) continue;
      const trial = { ...maze, puddles: [...maze.puddles, [r, c]] };
      if (mazePath(trial, maze.start, maze.goal, mazeHazards(trial))) maze.puddles.push([r, c]);
    }
    if (maze.puddles.length < config.puddles) continue;

    // The stone: on the way if there is another way round, else anywhere it does not cut the carrot off.
    if (config.rocks) {
      const way = mazePath(maze, maze.start, maze.goal, mazeHazards(maze)) || [];
      const taken = (r, c) => near(key(r, c)) || key(r, c) === startK || maze.puddles.some(([pr, pc]) => pr === r && pc === c);
      const onWay = shuffle(rng, way.slice(2, -1)).filter(([r, c]) => !taken(r, c));
      const anywhere = shuffle(rng, [...Array(size * size).keys()].map((i) => [Math.floor(i / size), i % size])).filter(([r, c]) => !taken(r, c));
      for (const [r, c] of [...onWay, ...anywhere]) {
        const trial = { ...maze, rocks: [[r, c]] };
        if (mazePath(trial, maze.start, maze.goal, mazeHazards(trial))) { maze.rocks = [[r, c]]; break; }
      }
      if (maze.rocks.length < config.rocks) continue;
    }

    const route = mazePath(maze, maze.start, maze.goal, mazeHazards(maze));
    const onRoute = new Set(route.map(([r, c]) => key(r, c)));

    // The bee: 2–3 joined cells off the safe route.
    if (config.bee) {
      const hazards = mazeHazards(maze);
      const free = (r, c) => !onRoute.has(key(r, c)) && !hazards.has(key(r, c)) && !near(key(r, c)) && key(r, c) !== startK && !maze.rocks.some(([rr, rc]) => rr === r && rc === c);
      const cells = [];
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (free(r, c)) cells.push([r, c]);
      let patrol = null;
      for (const first of shuffle(rng, cells)) {
        const walk = [first];
        for (let step = 0; step < 2; step++) {
          const [r, c] = walk[walk.length - 1];
          const next = shuffle(rng, Object.keys(MAZE_DIRS))
            .map((dir) => mazeStep(maze, r, c, dir))
            .find((n) => n && free(n[0], n[1]) && !walk.some(([wr, wc]) => wr === n[0] && wc === n[1]));
          if (!next) break;
          walk.push(next);
        }
        if (walk.length >= 2) { patrol = walk; break; }
      }
      if (!patrol) continue;
      maze.bee = patrol;
    }

    // Stars: reachable without hazards, preferably off the route (a little detour).
    const hazards = mazeHazards(maze);
    const reach = mazeDistances(maze, maze.start, hazards);
    const spots = [...reach.keys()].filter((k) => k !== startK && k !== goalK);
    const off = shuffle(rng, spots.filter((k) => !onRoute.has(k)));
    const on = shuffle(rng, spots.filter((k) => onRoute.has(k)));
    const starKeys = [...off, ...on].slice(0, config.stars);
    if (starKeys.length < config.stars) continue;
    maze.stars = starKeys.map((k) => k.split(',').map(Number));
    maze.optimal = route.length - 1;
    return maze;
  }
  throw new Error('no maze');
};

export const makeMazeLevel = (rng, config) => Array.from({ length: config.mazes }, () => makeMaze(rng, config));

/**
 * Points for one finished maze: 2 for the goal, +1 if bumps/splashes stayed within the allowance, +1 if the moves
 * were within `slack` of the best route through the stars collected, +1 per star.
 */
export const mazeScore = (maze, config, { moves, bumps, collected }) => {
  const par = mazeTour(maze, collected) + config.slack;
  return 2 + (bumps <= config.bumpAllow ? 1 : 0) + (moves <= par ? 1 : 0) + collected.length;
};

/* ───────────────────────────── Count & Catch ───────────────────────────── */

export const CATCH_KINDS = [
  { emoji: '🍎', one: 'apple', many: 'apples' },
  { emoji: '🍌', one: 'banana', many: 'bananas' },
  { emoji: '⭐', one: 'star', many: 'stars' },
  { emoji: '🍓', one: 'strawberry', many: 'strawberries' },
  { emoji: '🍊', one: 'orange', many: 'oranges' },
  { emoji: '🥕', one: 'carrot', many: 'carrots' },
  { emoji: '🎈', one: 'balloon', many: 'balloons' },
  { emoji: '🍐', one: 'pear', many: 'pears' }
];

/**
 *  rounds, pass  — catches per level, exact catches to clear it
 *  maxCount      — the most of one kind asked for
 *  modes         — 'plain' (Catch 7 apples), 'more' (Catch 4 apples and then 3 more), 'fewer' (Catch 2 fewer
 *                  than 9 apples), 'two' (Catch 3 apples and 2 stars)
 *  kinds         — kinds falling (the asked ones + others)
 *  fallMs, gapMs — how long one takes to fall, time between drops
 *  extra         — spare targets in the stream beyond what is asked
 */
export const catchConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = youngBand(ageBand);
  const d = dOf(difficulty);
  const L = lOf(levelNo);
  if (band === 'foundation') {
    return {
      band, rounds: 5, pass: 3,
      minCount: 2, maxCount: clampN(4 + Math.floor((L - 1) / 10) + (d - 1), 4, 8),
      modes: ['plain'], kinds: d >= 2 ? 3 : 2,
      fallMs: ramp(7500, 6500, L) - (d - 1) * 300, gapMs: ramp(1100, 950, L), extra: 3
    };
  }
  return {
    band, rounds: 6, pass: 4,
    minCount: 4, maxCount: clampN(8 + Math.floor((L - 1) / 10) + (d - 1), 8, 12),
    modes: d === 1 && L < 10 ? ['plain', 'more'] : ['plain', 'more', 'fewer', 'two'],
    kinds: 3 + (d >= 2 ? 1 : 0),
    fallMs: ramp(6000, 4800, L) - (d - 1) * 300, gapMs: ramp(900, 750, L) - (d - 1) * 40, extra: 2
  };
};

const LANES = [10, 28, 46, 64, 82];

/**
 * One catch.
 *  targets: [{ kind, count }]   — what must end in the basket, exactly
 *  prompt: string, mode, a, b    — the instruction and its numbers
 *  stream: [{ id, kind, x (% across), t0 (ms), dur (ms) }]
 *  endMs                         — when the last one has fallen out
 */
export const makeCatchRound = (rng, config) => {
  const mode = pick(rng, config.modes);
  const kinds = sample(rng, CATCH_KINDS, Math.max(config.kinds, mode === 'two' ? 3 : 2));
  let targets;
  let prompt;
  let a = null;
  let b = null;
  if (mode === 'plain') {
    const n = intBetween(rng, config.minCount, config.maxCount);
    targets = [{ kind: kinds[0].emoji, count: n }];
    prompt = `Catch ${n} ${n === 1 ? kinds[0].one : kinds[0].many}`;
  } else if (mode === 'more') {
    b = intBetween(rng, 2, 4);
    a = intBetween(rng, 2, config.maxCount - b);
    targets = [{ kind: kinds[0].emoji, count: a + b }];
    prompt = `Catch ${a} ${kinds[0].many}, and then ${b} more`;
  } else if (mode === 'fewer') {
    b = intBetween(rng, 1, 3);
    a = intBetween(rng, b + 3, config.maxCount);
    targets = [{ kind: kinds[0].emoji, count: a - b }];
    prompt = `Catch ${b} fewer than ${a} ${kinds[0].many}`;
  } else {
    const n1 = intBetween(rng, 2, 5);
    const n2 = intBetween(rng, 2, 5);
    targets = [{ kind: kinds[0].emoji, count: n1 }, { kind: kinds[1].emoji, count: n2 }];
    prompt = `Catch ${n1} ${kinds[0].many} and ${n2} ${kinds[1].many}`;
  }
  const targetKinds = new Set(targets.map((t) => t.kind));
  const drops = [];
  for (const t of targets) for (let i = 0; i < t.count + config.extra; i++) drops.push(t.kind);
  const others = kinds.filter((k) => !targetKinds.has(k.emoji));
  const nOthers = Math.round(drops.length * 0.7);
  for (let i = 0; i < nOthers; i++) drops.push(others[i % others.length].emoji);
  let lastLane = -1;
  const stream = shuffle(rng, drops).map((kind, i) => {
    let lane = intBetween(rng, 0, LANES.length - 1);
    if (lane === lastLane) lane = (lane + 1 + intBetween(rng, 0, LANES.length - 2)) % LANES.length;
    lastLane = lane;
    return {
      id: `d${i}`, kind, x: LANES[lane] + intBetween(rng, -3, 3),
      t0: 400 + i * config.gapMs + intBetween(rng, 0, Math.round(config.gapMs * 0.3)),
      dur: config.fallMs + intBetween(rng, -400, 400)
    };
  });
  const endMs = Math.max(...stream.map((s) => s.t0 + s.dur));
  return { mode, a, b, prompt, targets, stream, endMs, names: Object.fromEntries(kinds.map((k) => [k.emoji, k])) };
};

export const makeCatchLevel = (rng, config) => Array.from({ length: config.rounds }, () => makeCatchRound(rng, config));

/** How many of each kind are in a basket (a list of kind emojis). */
export const tally = (basket) => basket.reduce((m, k) => ({ ...m, [k]: (m[k] || 0) + 1 }), {});

/** Exactly the asked numbers of the asked kinds and nothing else. */
export const catchCheck = (round, basket) => {
  const got = tally(basket);
  const want = Object.fromEntries(round.targets.map((t) => [t.kind, t.count]));
  const kinds = new Set([...Object.keys(got), ...Object.keys(want)]);
  for (const k of kinds) if ((got[k] || 0) !== (want[k] || 0)) return false;
  return true;
};

/* ───────────────────────────── Number Hop ───────────────────────────── */

/**
 *  rounds, pass  — questions per level, first-try right to clear it
 *  max           — biggest number on a pad
 *  modes         — foundation: add, sub, after, before, skip2; developing: add, sub, tens, skip, missing
 *  steps         — skip-counting steps
 */
export const hopConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = youngBand(ageBand);
  const d = dOf(difficulty);
  const L = lOf(levelNo);
  if (band === 'foundation') {
    const max = d === 1 && L < 10 ? 10 : 20;
    const modes = ['add', 'after'];
    if (L >= 10 || d >= 2) modes.push('sub', 'before');
    if (d >= 3 || L >= 20) modes.push('skip2');
    return { band, rounds: 6, pass: 4, max, modes, maxAdd: max === 10 ? 5 : 9, pads: 11, steps: [2] };
  }
  const modes = d === 1 && L < 10 ? ['add', 'sub', 'skip'] : ['add', 'sub', 'tens', 'skip', 'missing'];
  return {
    band, rounds: 8, pass: 5, max: 100, modes, maxAdd: 9, pads: 10,
    steps: d === 1 ? [2, 5, 10] : d === 2 ? [2, 3, 5, 10] : [3, 4, 5, 6, 10]
  };
};

/** `n` consecutive numbers inside [0, max] that hold every one of `must`. */
const windowAround = (rng, must, n, max) => {
  const lo = Math.max(0, Math.max(...must) - n + 1);
  const hi = Math.min(Math.min(...must), max - n + 1);
  const from = intBetween(rng, lo, Math.max(lo, hi));
  return Array.from({ length: n }, (_, i) => from + i);
};

/**
 * One question: { mode, prompt, say (for screen readers), pads: [n…], start (number the frog sits on), answer,
 * a, b, step, seq }.
 */
export const makeHopRound = (rng, config) => {
  const mode = pick(rng, config.modes);
  const { max } = config;
  const W = Math.min(config.pads, max + 1);
  if (mode === 'add') {
    const b = intBetween(rng, 1, Math.min(config.maxAdd, W - 1));
    const a = intBetween(rng, config.band === 'developing' ? 10 : 0, max - b);
    return { mode, a, b, answer: a + b, start: a, pads: windowAround(rng, [a, a + b], W, max), prompt: `Hop to ${a} + ${b}` };
  }
  if (mode === 'sub') {
    const b = intBetween(rng, 1, Math.min(config.maxAdd, W - 1));
    const a = intBetween(rng, Math.max(b, config.band === 'developing' ? 15 : 2), max);
    return { mode, a, b, answer: a - b, start: a, pads: windowAround(rng, [a, a - b], W, max), prompt: `Hop to ${a} − ${b}` };
  }
  if (mode === 'after' || mode === 'before') {
    const a = mode === 'after' ? intBetween(rng, 0, max - 1) : intBetween(rng, 1, max);
    const answer = mode === 'after' ? a + 1 : a - 1;
    const pads = windowAround(rng, [a, answer], W, max);
    // The frog starts at the end of the row farther from the answer, so the child has to find the number.
    const startAt = Math.abs(pads[0] - answer) >= Math.abs(pads[pads.length - 1] - answer) ? pads[0] : pads[pads.length - 1];
    return { mode, a, answer, start: startAt, pads, prompt: mode === 'after' ? `Hop to the number just after ${a}` : `Hop to the number just before ${a}` };
  }
  if (mode === 'skip2') {
    // Count by 2s: three numbers shown, hop to the next one.
    const step = 2;
    const first = intBetween(rng, 0, max - 3 * step);
    const seq = [first, first + step, first + 2 * step];
    const answer = first + 3 * step;
    const pads = windowAround(rng, [seq[2], answer], W, max);
    return { mode, step, seq, answer, start: seq[2], pads, prompt: `Count by 2s: ${seq.join(', ')}, … hop to the next!` };
  }
  if (mode === 'tens') {
    const hops = intBetween(rng, 1, 4);
    const a = intBetween(rng, 1, max - 10 * (hops + 1));
    const n = Math.min(W, Math.floor((max - a) / 10) + 1);
    const pads = Array.from({ length: n }, (_, i) => a + 10 * i);
    return { mode, a, b: 10 * hops, step: 10, answer: a + 10 * hops, start: a, pads, prompt: `Hop to ${a} + ${10 * hops}` };
  }
  if (mode === 'skip') {
    const step = pick(rng, config.steps);
    const hops = intBetween(rng, 2, 4);
    const n = Math.min(W, hops + intBetween(rng, 2, 4));
    const first = step * intBetween(rng, 0, Math.floor((max - step * (n - 1)) / step));
    const pads = Array.from({ length: n }, (_, i) => first + step * i);
    return { mode, a: first, b: hops, step, answer: first + step * hops, start: first, pads, prompt: `Start at ${first}. Count by ${step}s — make ${hops} hops!` };
  }
  // missing: a skip-counting row with one gap; pads are consecutive numbers around it.
  const step = pick(rng, config.steps.filter((s) => s < 10));
  const first = intBetween(rng, 1, max - step * 4);
  const seq = Array.from({ length: 5 }, (_, i) => first + step * i);
  const gap = intBetween(rng, 1, 3);
  const answer = seq[gap];
  const pads = windowAround(rng, [answer], W, max);
  const shown = seq.map((v, i) => (i === gap ? '?' : String(v)));
  return { mode, step, seq, gap, answer, start: pads[0] === answer ? pads[pads.length - 1] : pads[0], pads, prompt: `Which hop is missing? ${shown.join(', ')}` };
};

export const makeHopLevel = (rng, config) => Array.from({ length: config.rounds }, () => makeHopRound(rng, config));

/** True when the pad tapped is the answer. */
export const hopCheck = (round, n) => n === round.answer;
