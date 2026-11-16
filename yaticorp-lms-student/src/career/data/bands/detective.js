/**
 * Logic Detective (2026-11-13): grid deduction puzzles for the Rising Brains and Master Minds bands.
 *
 * A mystery is N people × K categories (pet, snack, club, lab item, seat). A random solution is drawn, then true
 * clues are added — each one only if it rules something out — until exactly one assignment is left, checked by
 * brute force over every possible assignment. Clues that the rest already imply are then dropped, so every clue
 * left is needed. Plain JS, no React: tests/games/newSmart.test.js counts the solutions of thousands of mysteries.
 *
 * An assignment is `v[c][p]`: the value index person p has in category c (each category a permutation).
 */
import { seeded, pick, shuffle, sample } from '../seeded.js';

const NAMES = ['Aarav', 'Bina', 'Chen', 'Diya', 'Esha', 'Farhan', 'Gita', 'Hari', 'Ira', 'Jay', 'Kabir', 'Leela',
  'Meera', 'Neil', 'Omar', 'Priya', 'Riya', 'Sam', 'Tara', 'Vikram', 'Zoya'];

/** The categories a mystery can ask about. `values` are [name, icon]; seat is the ordered one (left to right). */
const CATS = {
  pet: {
    label: 'Pet', title: 'The Pet Show Puzzle', story: 'brought a different pet to the school pet show',
    values: [['cat', '🐱'], ['dog', '🐶'], ['parrot', '🦜'], ['rabbit', '🐰'], ['goldfish', '🐟']],
    has: (v) => `owns the ${v}`, hasNot: (v) => `does not own the ${v}`, who: (v) => `the ${v} owner`
  },
  snack: {
    label: 'Snack', title: 'The Lunchbox Mystery', story: 'packed a different snack',
    values: [['samosa', '🥟'], ['apple', '🍎'], ['sandwich', '🥪'], ['banana', '🍌'], ['mango', '🥭']],
    has: (v) => `packed the ${v}`, hasNot: (v) => `did not pack the ${v}`, who: (v) => `whoever packed the ${v}`
  },
  club: {
    label: 'Club', title: 'The Club Fair Case', story: 'joined a different club',
    values: [['chess', '♟️'], ['robotics', '🤖'], ['music', '🎵'], ['art', '🎨'], ['drama', '🎭']],
    has: (v) => `is in the ${v} club`, hasNot: (v) => `is not in the ${v} club`, who: (v) => `the ${v} club member`
  },
  item: {
    label: 'Item', title: 'The Science Lab Case', story: 'borrowed a different item from the science lab',
    values: [['telescope', '🔭'], ['globe', '🌍'], ['microscope', '🔬'], ['magnet', '🧲'], ['calculator', '🧮']],
    has: (v) => `borrowed the ${v}`, hasNot: (v) => `did not borrow the ${v}`, who: (v) => `whoever borrowed the ${v}`
  },
  seat: {
    label: 'Seat', title: 'The Seating Mystery', story: 'sat in a different seat in one row (seat 1 is on the far left)',
    ordered: true,
    has: (v) => `sits in seat ${v}`, hasNot: (v) => `does not sit in seat ${v}`, who: (v) => `the person in seat ${v}`
  }
};
const UNORDERED = ['pet', 'snack', 'club', 'item'];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const WORD = { 3: 'Three', 4: 'Four', 5: 'Five' };

/* ---- The space of every assignment, and bitsets over it ------------------------------------------------------- */

const permsOf = (n) => {
  if (n === 1) return [[0]];
  const out = [];
  for (const rest of permsOf(n - 1)) {
    for (let i = 0; i <= rest.length; i++) out.push([...rest.slice(0, i), n - 1, ...rest.slice(i)]);
  }
  return out;
};
const invert = (perm) => {
  const inv = [];
  perm.forEach((v, p) => { inv[v] = p; });
  return inv;
};

const spaces = new Map();
/** Every assignment of n people over k categories: [{ v, inv }], with a bitset per cell (c, p, v). */
export const spaceOf = (n, k) => {
  const key = `${n}x${k}`;
  if (spaces.has(key)) return spaces.get(key);
  const perms = permsOf(n);
  let list = [[]];
  for (let c = 0; c < k; c++) list = list.flatMap((pre) => perms.map((perm) => [...pre, perm]));
  const all = list.map((v) => ({ v, inv: v.map(invert) }));
  const words = Math.ceil(all.length / 32);
  const cell = [];
  for (let c = 0; c < k; c++) {
    cell[c] = [];
    for (let p = 0; p < n; p++) {
      cell[c][p] = [];
      for (let v = 0; v < n; v++) cell[c][p][v] = bitsOf(all, words, (a) => a.v[c][p] === v);
    }
  }
  const space = { n, k, all, words, cell };
  spaces.set(key, space);
  return space;
};

function bitsOf(all, words, test) {
  const b = new Uint32Array(words);
  for (let i = 0; i < all.length; i++) if (test(all[i])) b[i >>> 5] |= 1 << (i & 31);
  return b;
}
const full = (space) => {
  const b = new Uint32Array(space.words).fill(0xffffffff);
  const extra = space.words * 32 - space.all.length;
  if (extra) b[space.words - 1] >>>= extra;
  return b;
};
const andInto = (a, b) => { for (let i = 0; i < a.length; i++) a[i] &= b[i]; return a; };
const popcount = (b) => {
  let n = 0;
  for (let i = 0; i < b.length; i++) {
    let x = b[i];
    x -= (x >>> 1) & 0x55555555;
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    n += (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
  }
  return n;
};

/* ---- What a mystery looks like at each band ------------------------------------------------------------------- */

/**
 * intermediate (Classes 6–8): 3 people, one category (two at the top of difficulty 2), direct and "not" clues.
 * analytical (9–10): 4 people in a row of seats, "left of / next to / at an end" clues; a second category at
 * difficulty 3. advanced (11–12+): 4–5 people, seats and a second category (two grids), with "if… then",
 * "either… or" and clues that link one category to another.
 */
export const detectiveConfig = (band, difficulty = 1, levelNo = 1) => {
  const b = band === 'intermediate' || band === 'advanced' ? band : 'analytical';
  const lerp = (a, z) => Math.round(a + (z - a) * Math.min(1, Math.max(0, (levelNo - 1) / 29)));
  if (b === 'intermediate') {
    const k = difficulty >= 2 && levelNo > 12 ? 2 : 1;
    return { band: b, n: 3, k, seat: false, maxDirect: k === 2 ? 1 : difficulty === 1 && levelNo <= 10 ? 1 : 0, weights: { direct: 1, negative: 4 }, seconds: lerp(150, 120) + (k - 1) * 90 };
  }
  if (b === 'analytical') {
    const k = difficulty >= 3 ? 2 : 1;
    const weights = k === 1
      ? { relational: 5, negative: 1.5, direct: 0.5 }
      : { relational: 5, crossDirect: 1, crossNegative: 1.5, negative: 1.5, direct: 0.4 };
    return { band: b, n: 4, k, seat: true, cross: k === 2, maxDirect: 1, weights, seconds: lerp(240, 200) + (k - 1) * 120 };
  }
  const n = difficulty >= 3 && levelNo > 8 ? 5 : 4;
  return {
    band: b, n, k: 2, seat: true, cross: true, maxDirect: 1,
    weights: { conditional: 3, eitherOr: 2, relational: 4, crossNegative: 1, crossDirect: 0.5, negative: 1, direct: 0.3 },
    require: ['conditional', 'eitherOr'],
    seconds: lerp(n === 5 ? 480 : 360, n === 5 ? 420 : 300)
  };
};

/* ---- Clues ----------------------------------------------------------------------------------------------------- */

/*
 * A clue is { kind, text, test(a) }: test says whether an assignment `a` ({ v, inv }) makes it true. Every clue is
 * built from the solution so that it is true there; generate() checks that anyway.
 * A "ref" names a person directly ({ p }) or through a category value ({ c, v }: "the cat owner").
 */
function clueMaker(ctx) {
  const { n, k, cats, names, rng, sol, seatC } = ctx;
  const unordered = cats.map((c, i) => i).filter((i) => i !== seatC);
  const valName = (c, v) => cats[c].values[v].name;
  const refText = (r) => (r.p !== undefined ? names[r.p] : cats[r.c].who(valName(r.c, r.v)));
  const resolve = (r, a) => (r.p !== undefined ? r.p : a.inv[r.c][r.v]);
  const randomRef = (cross) => (cross && unordered.length && rng() < 0.5
    ? (() => { const c = pick(rng, unordered); return { c, v: Math.floor(rng() * n) }; })()
    : { p: Math.floor(rng() * n) });
  const atom = () => {
    const p = Math.floor(rng() * n), c = Math.floor(rng() * k), v = Math.floor(rng() * n);
    return { p, c, v, text: `${names[p]} ${cats[c].has(valName(c, v))}`, holds: (a) => a.v[c][p] === v };
  };

  const RELATIONS = [
    { key: 'directLeft', w: 3, say: (A, B) => `${A} sits directly left of ${B}`, ok: (d) => d === -1 },
    { key: 'left', w: 2, say: (A, B) => `${A} sits somewhere left of ${B}`, ok: (d) => d < 0 },
    { key: 'next', w: 2, say: (A, B) => `${A} sits next to ${B}`, ok: (d) => Math.abs(d) === 1 },
    { key: 'notNext', w: 1, say: (A, B) => `${A} does not sit next to ${B}`, ok: (d) => Math.abs(d) > 1 },
    { key: 'gap', w: 1.5, say: (A, B) => `There is exactly one seat between ${A} and ${B}`, ok: (d) => Math.abs(d) === 2 }
  ];

  return {
    direct() {
      const p = Math.floor(rng() * n), c = Math.floor(rng() * k), v = sol.v[c][p];
      return { kind: 'direct', text: `${names[p]} ${cats[c].has(valName(c, v))}.`, test: (a) => a.v[c][p] === v };
    },
    negative() {
      const p = Math.floor(rng() * n), c = Math.floor(rng() * k);
      const v = pick(rng, [...Array(n).keys()].filter((x) => x !== sol.v[c][p]));
      return { kind: 'negative', text: `${names[p]} ${cats[c].hasNot(valName(c, v))}.`, test: (a) => a.v[c][p] !== v };
    },
    crossDirect() {
      if (k < 2) return null;
      const [c1, c2] = sample(rng, [...Array(k).keys()], 2);
      if (cats[c1].ordered) return null;
      const v1 = Math.floor(rng() * n), p = sol.inv[c1][v1], v2 = sol.v[c2][p];
      return { kind: 'crossDirect', text: `${cap(cats[c1].who(valName(c1, v1)))} ${cats[c2].has(valName(c2, v2))}.`, test: (a) => a.v[c2][a.inv[c1][v1]] === v2 };
    },
    crossNegative() {
      if (k < 2) return null;
      const [c1, c2] = sample(rng, [...Array(k).keys()], 2);
      if (cats[c1].ordered) return null;
      const v1 = Math.floor(rng() * n), p = sol.inv[c1][v1];
      const v2 = pick(rng, [...Array(n).keys()].filter((x) => x !== sol.v[c2][p]));
      return { kind: 'crossNegative', text: `${cap(cats[c1].who(valName(c1, v1)))} ${cats[c2].hasNot(valName(c2, v2))}.`, test: (a) => a.v[c2][a.inv[c1][v1]] !== v2 };
    },
    relational() {
      if (seatC < 0) return null;
      if (rng() < 0.15) {
        // At an end of the row, or not.
        const r = randomRef(ctx.cross);
        const at = (a) => { const s = a.v[seatC][resolve(r, a)]; return s === 0 || s === n - 1; };
        const end = at(sol);
        return { kind: 'relational', text: `${cap(refText(r))} ${end ? 'sits at one end of the row' : 'does not sit at either end of the row'}.`, test: (a) => at(a) === end };
      }
      const A = randomRef(ctx.cross), B = randomRef(ctx.cross);
      if (resolve(A, sol) === resolve(B, sol)) return null;
      if (A.c !== undefined && B.c !== undefined && A.c === B.c && A.v === B.v) return null;
      const d = sol.v[seatC][resolve(A, sol)] - sol.v[seatC][resolve(B, sol)];
      const fits = RELATIONS.filter((r) => r.ok(d));
      if (!fits.length) return null;
      let roll = rng() * fits.reduce((s, r) => s + r.w, 0);
      const rel = fits.find((r) => (roll -= r.w) < 0) || fits[0];
      const linked = A.c !== undefined || B.c !== undefined;
      return {
        kind: linked ? 'linked' : 'relational',
        text: `${cap(rel.say(refText(A), refText(B)))}.`,
        test: (a) => {
          const pa = resolve(A, a), pb = resolve(B, a);
          return pa !== pb && rel.ok(a.v[seatC][pa] - a.v[seatC][pb]);
        }
      };
    },
    conditional() {
      const P = atom(), Q = atom();
      if (P.p === Q.p && P.c === Q.c) return null;
      if (!(!P.holds(sol) || Q.holds(sol))) return null;
      return { kind: 'conditional', text: `If ${P.text}, then ${Q.text}.`, test: (a) => !P.holds(a) || Q.holds(a) };
    },
    eitherOr() {
      const P = atom(), Q = atom();
      if (P.p === Q.p && P.c === Q.c) return null;
      if (P.holds(sol) === Q.holds(sol)) return null;
      return { kind: 'eitherOr', text: `Either ${P.text} or ${Q.text} — but not both.`, test: (a) => P.holds(a) !== Q.holds(a) };
    }
  };
}

/* ---- Generation ------------------------------------------------------------------------------------------------ */

/** The number of assignments that satisfy every clue (brute force over the bitsets). */
export const countSolutions = (puzzle) => {
  const space = spaceOf(puzzle.n, puzzle.k);
  const b = full(space);
  for (const c of puzzle.clues) andInto(b, c.bits || bitsOf(space.all, space.words, c.test));
  return popcount(b);
};

/**
 * A mystery with exactly one solution and no clue the others already imply.
 * `seed` makes it repeatable (the tests); the game passes a random one.
 */
export function makeMystery(cfg, seed = Math.floor(Math.random() * 2 ** 31)) {
  const rng = seeded(seed);
  const { n, k } = cfg;
  const space = spaceOf(n, k);
  const kinds = Object.entries(cfg.weights);
  const total = kinds.reduce((s, [, w]) => s + w, 0);
  const rollKind = () => { let r = rng() * total; return (kinds.find(([, w]) => (r -= w) < 0) || kinds[0])[0]; };

  for (let attempt = 0; attempt < 200; attempt++) {
    // The cast: categories, people and values for this mystery.
    const keys = cfg.seat ? ['seat', ...sample(rng, UNORDERED, k - 1)] : sample(rng, UNORDERED, k);
    const cats = keys.map((key) => {
      const def = CATS[key];
      const values = def.ordered
        ? [...Array(n).keys()].map((i) => ({ name: String(i + 1), icon: String(i + 1) }))
        : sample(rng, def.values, n).map(([name, icon]) => ({ name, icon }));
      return { key, label: def.label, ordered: Boolean(def.ordered), values, has: def.has, hasNot: def.hasNot, who: def.who };
    });
    const names = sample(rng, NAMES, n).sort();
    const sol = space.all[Math.floor(rng() * space.all.length)];
    const seatC = keys.indexOf('seat');
    const make = clueMaker({ n, k, cats, names, rng, sol, seatC, cross: cfg.cross });

    let alive = space.all.map((_, i) => i);
    const clues = [];
    const texts = new Set();
    let directs = 0;
    for (let tries = 0; alive.length > 1 && tries < 800; tries++) {
      const kind = rollKind();
      if (kind === 'direct' && directs >= cfg.maxDirect) continue;
      const clue = make[kind]();
      if (!clue || texts.has(clue.text) || !clue.test(sol)) continue;
      const next = alive.filter((i) => clue.test(space.all[i]));
      if (next.length === alive.length) continue;
      alive = next;
      clues.push(clue);
      texts.add(clue.text);
      if (kind === 'direct') directs += 1;
    }
    if (alive.length !== 1) continue;

    // Drop every clue the others already imply, in a random order.
    for (const c of clues) c.bits = bitsOf(space.all, space.words, c.test);
    let kept = shuffle(rng, clues);
    for (const c of [...kept]) {
      const rest = kept.filter((x) => x !== c);
      const b = full(space);
      for (const x of rest) andInto(b, x.bits);
      if (popcount(b) === 1) kept = rest;
    }
    if (cfg.require && !kept.some((c) => cfg.require.includes(c.kind))) continue;
    if (kept.length < 2) continue;

    const title = keys.length === 1 || keys[0] !== 'seat' ? CATS[keys[0]].title : CATS[keys[1]].title;
    const story = `${WORD[n]} friends — ${names.join(', ')} — each ${cats.map((c) => CATS[c.key].story).join(', and each ')}.`;
    return {
      n, k, names, title, story, seed,
      cats: cats.map(({ key, label, ordered, values }) => ({ key, label, ordered, values })),
      solution: sol.v.map((perm) => [...perm]),
      clues: kept.map(({ kind, text, test, bits }) => ({ kind, text, test, bits }))
    };
  }
  throw new Error('Could not build a mystery');
}

/* ---- Play: marks, guesses and explanations -------------------------------------------------------------- */

export const markKey = (c, p, v) => `${c}-${p}-${v}`;

/**
 * What a cell shows: 'yes' (ticked), 'no' (crossed by the student), 'auto' (crossed because a tick sits in its row
 * or column — every person has one value and every value one person) or ''.
 */
export const cellState = (marks, n, c, p, v) => {
  const m = marks[markKey(c, p, v)];
  if (m === 'yes') return 'yes';
  for (let x = 0; x < n; x++) {
    if (x !== v && marks[markKey(c, p, x)] === 'yes') return 'auto';
    if (x !== p && marks[markKey(c, x, v)] === 'yes') return 'auto';
  }
  return m === 'no' ? 'no' : '';
};

/** One tap: empty → ✗ → ✓ → empty. Tapping an auto-crossed cell moves the tick there. */
export const tapCell = (marks, n, c, p, v) => {
  const next = { ...marks };
  const state = cellState(marks, n, c, p, v);
  const key = markKey(c, p, v);
  if (state === '') next[key] = 'no';
  else if (state === 'no' || state === 'auto') {
    for (let x = 0; x < n; x++) {
      if (next[markKey(c, p, x)] === 'yes') delete next[markKey(c, p, x)];
      if (next[markKey(c, x, v)] === 'yes') delete next[markKey(c, x, v)];
    }
    next[key] = 'yes';
  } else delete next[key];
  return next;
};

/** The student's answer from the ticks — `guess[c][p]` — or null while any row is not ticked. */
export const guessFromMarks = (puzzle, marks) => {
  const { n, k } = puzzle;
  const guess = [];
  for (let c = 0; c < k; c++) {
    guess[c] = [];
    for (let p = 0; p < n; p++) {
      const v = [...Array(n).keys()].find((x) => marks[markKey(c, p, x)] === 'yes');
      if (v === undefined) return null;
      guess[c][p] = v;
    }
  }
  return guess;
};

/** An accusation: solved, or which clues the grid breaks and how many people are placed wrong. */
export const checkGuess = (puzzle, guess) => {
  const a = { v: guess, inv: guess.map(invert) };
  const wrongPeople = puzzle.names.filter((_, p) => guess.some((perm, c) => perm[p] !== puzzle.solution[c][p])).length;
  const violated = puzzle.clues.map((c, i) => (c.test(a) ? -1 : i)).filter((i) => i >= 0);
  return { solved: wrongPeople === 0, violated, wrongPeople };
};

/** Stars for a solved case: three with no wrong accusation and under 60% of the time; a star off each. */
export const detectiveStars = ({ solved, wrong = 0, usedFrac = 0 }) =>
  (solved ? Math.max(1, 3 - wrong - (usedFrac > 0.6 ? 1 : 0)) : 0);
