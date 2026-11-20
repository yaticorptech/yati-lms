/**
 * Next in Sequence — the four-stage level (2026-11-19, the user's brief): every level is four problems, always in
 * this order: 1 Number Sequence → 2 Visual Pattern Logic → 3 Odd One Out → 4 Matchstick Challenge.
 *
 * Pure builders, each given `rnd` (a () => [0, 1) generator) and a `step` (1 … 14, harder as it climbs). Every
 * problem has one clearly defined answer (the matchstick one: any arrangement that meets its goal), a hint and a
 * short explanation. tests/games/logicQuad.test.js checks thousands of them.
 */
import { GAP, buildBandSequences } from './sequences.js';

const int = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];
const shuffle = (rnd, list) => { const o = [...list]; for (let i = o.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };
const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** One difficulty number from the band, the difficulty and the level. */
export const quadStep = (ageBand, difficulty, levelNo) =>
  clampN(Math.ceil((levelNo || 1) / 3) + ((difficulty || 1) - 1) * 2 + (ageBand === 'analytical' ? 3 : 0), 1, 14);

/* ───────────────────────────── 1 · Number sequence ───────────────────────────── */

/** { run (may hold GAP), answer, note, key }. `seen` is a Set of keys not to repeat. */
export const makeNumberProblem = (rnd, band, step, seen = new Set()) => {
  const own = band === 'analytical' ? 'analytical' : 'intermediate';
  const up = own === 'intermediate' ? 'analytical' : 'advanced';
  const seed = 5000 + Math.floor(rnd() * 100000);
  const minOwn = step >= 8 ? 3 : step >= 4 ? 2 : 1;
  const fromUp = step >= 6 && rnd() < Math.min(0.6, 0.1 + step * 0.04);
  const pool = (fromUp ? buildBandSequences(up, { seed, perFamily: 3 }).filter((q) => q.level <= (step >= 11 ? 2 : 1))
    : buildBandSequences(own, { seed, perFamily: 3 }).filter((q) => q.level === minOwn || (step < 4 && q.level === 1)))
    .filter((q) => q.kind === 'number' && q.run.every((v) => v === GAP || Number.isInteger(v)) && Number.isInteger(q.answer));
  const list = shuffle(rnd, pool);
  const q = list.find((x) => !seen.has(`n:${x.run.join(',')}`)) || list[0];
  return { run: q.run, answer: q.answer, note: q.note, key: `n:${q.run.join(',')}` };
};

/* ───────────────────────────── 2 · Visual pattern logic ───────────────────────────── */

export const COLOURS = ['#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
const COLOUR_NAME = { '#7c3aed': 'purple', '#ec4899': 'pink', '#f59e0b': 'orange', '#10b981': 'green', '#3b82f6': 'blue', '#ef4444': 'red' };
const SOLID = ['circle', 'square', 'triangle', 'diamond', 'star', 'pentagon', 'cross', 'hexagon'];
const TURNING = ['arrow', 'flag']; // shapes whose turn is plain to see
const RING = [0, 1, 2, 5, 8, 7, 6, 3]; // the outside cells of a 3 × 3 grid, clockwise

/** A drawn cell: { shape, color, rot, count, pos } — pos 0…8 puts a small shape in a 3 × 3 grid. */
const cell = (o) => ({ shape: 'circle', color: COLOURS[0], rot: 0, count: 1, pos: null, ...o });
const keyOf = (c) => `${c.shape}|${c.color}|${((c.rot % 360) + 360) % 360}|${c.count}|${c.pos}`;

/** The answer first, then distinct wrong cells; returns { options (shuffled), answer (index) }. */
const withOptions = (rnd, right, wrongs) => {
  const out = [right];
  for (const w of wrongs) { if (out.length >= 4) break; if (!out.some((o) => keyOf(o) === keyOf(w))) out.push(w); }
  const options = shuffle(rnd, out);
  return { options, answer: options.findIndex((o) => keyOf(o) === keyOf(right)) };
};

const V = {
  turn: (rnd, step) => {
    const shape = pick(rnd, TURNING); const color = pick(rnd, COLOURS);
    const by = step < 4 ? 90 : pick(rnd, [45, 90, 135, -45, -90]);
    const start = int(rnd, 0, 7) * 45;
    const at = (i) => cell({ shape, color, rot: (((start + by * i) % 360) + 360) % 360 });
    const right = at(4);
    return { frames: [0, 1, 2, 3].map(at), ...withOptions(rnd, right, shuffle(rnd, [45, -45, 90, 180, -90, 135].map((d) => cell({ ...right, rot: (((right.rot + d) % 360) + 360) % 360 })))),
      hint: 'Watch which way the shape points in each box.', note: `The shape turns ${Math.abs(by)}° ${by > 0 ? 'clockwise' : 'anticlockwise'} each step.` };
  },
  count: (rnd, step) => {
    const shape = pick(rnd, SOLID); const color = pick(rnd, COLOURS);
    const by = step < 5 ? 1 : pick(rnd, [1, 2]); const start = int(rnd, 1, by === 1 ? 3 : 1);
    const at = (i) => cell({ shape, color, count: start + by * i });
    const n = by === 1 ? 4 : 4; const right = at(n);
    return { frames: Array.from({ length: n }, (_, i) => at(i)), ...withOptions(rnd, right, [-1, 1, -2, 2, 3, -3, 4, -4].map((d) => cell({ ...right, count: right.count + d })).filter((c) => c.count >= 1 && c.count <= 9)),
      hint: 'Count the shapes in each box.', note: `${by === 1 ? 'One more shape' : `${by} more shapes`} each step.` };
  },
  cycle: (rnd, step) => {
    const shapes = shuffle(rnd, SOLID).slice(0, 3); const pc = step < 6 ? 2 : pick(rnd, [2, 4]);
    const colours = shuffle(rnd, COLOURS).slice(0, pc);
    const at = (i) => cell({ shape: shapes[i % 3], color: colours[i % pc] });
    const n = 5; const right = at(n);
    const otherC = COLOURS.filter((c) => c !== right.color); const otherS = shapes.filter((s) => s !== right.shape);
    return { frames: Array.from({ length: n }, (_, i) => at(i)), ...withOptions(rnd, right, [cell({ shape: right.shape, color: colours[(n + 1) % pc] === right.color ? otherC[0] : colours[(n + 1) % pc] }), cell({ shape: otherS[0], color: right.color }), cell({ shape: otherS[1], color: otherC[1] }), cell({ shape: otherS[0], color: otherC[2] })]),
      hint: 'Two things change at once: the shape AND the colour. Follow each one on its own.', note: `Shapes repeat every 3 boxes, colours every ${pc} — so the next is a ${COLOUR_NAME[right.color]} ${right.shape}.` };
  },
  orbit: (rnd, step) => {
    const shape = pick(rnd, ['circle', 'star', 'square', 'diamond']); const color = pick(rnd, COLOURS);
    const by = step < 5 ? 1 : pick(rnd, [1, 2, 3, -1, -2]); const start = int(rnd, 0, 7);
    const at = (i) => cell({ shape, color, pos: RING[(((start + by * i) % 8) + 8) % 8] });
    const right = at(4); const ri = RING.indexOf(right.pos);
    return { frames: [0, 1, 2, 3].map(at), ...withOptions(rnd, right, shuffle(rnd, [1, -1, 2, 4, -2].map((d) => cell({ ...right, pos: RING[(((ri + d) % 8) + 8) % 8] })))),
      hint: 'Follow the shape as it travels round the edge of the grid.', note: `It moves ${Math.abs(by)} place${Math.abs(by) > 1 ? 's' : ''} ${by > 0 ? 'clockwise' : 'anticlockwise'} round the grid each step.` };
  },
  combo: (rnd) => {
    // The arrow travels round the grid AND turns as it goes.
    const color = pick(rnd, COLOURS); const by = pick(rnd, [1, 2]); const turn = pick(rnd, [90, -90, 45]);
    const start = int(rnd, 0, 7); const r0 = int(rnd, 0, 3) * 90;
    const at = (i) => cell({ shape: 'arrow', color, pos: RING[(start + by * i) % 8], rot: (((r0 + turn * i) % 360) + 360) % 360 });
    const right = at(4); const ri = RING.indexOf(right.pos);
    return { frames: [0, 1, 2, 3].map(at), ...withOptions(rnd, right, [cell({ ...right, rot: (right.rot + 180) % 360 }), cell({ ...right, pos: RING[(ri + 1) % 8] }), cell({ ...right, pos: RING[(ri + 7) % 8], rot: (right.rot + 90) % 360 }), cell({ ...right, rot: (right.rot + 90) % 360 })]),
      hint: 'Two rules together: where the arrow is, and which way it points.', note: `The arrow moves ${by} place${by > 1 ? 's' : ''} clockwise and turns ${Math.abs(turn)}° ${turn > 0 ? 'clockwise' : 'anticlockwise'} each step.` };
  },
  matrix: (rnd, step) => {
    // 3 × 3: each row has its own shape, each column its own colour (and, harder, its own count).
    const shapes = shuffle(rnd, SOLID).slice(0, 3); const colours = shuffle(rnd, COLOURS).slice(0, 3);
    const counted = step >= 8;
    const at = (i) => cell({ shape: shapes[Math.floor(i / 3)], color: colours[i % 3], count: counted ? (i % 3) + 1 : 1 });
    const gap = step < 7 ? 8 : int(rnd, 3, 8);
    const right = at(gap);
    const grid = Array.from({ length: 9 }, (_, i) => (i === gap ? null : at(i)));
    const os = shapes.filter((s) => s !== right.shape); const oc = colours.filter((c) => c !== right.color);
    return { grid, frames: [], ...withOptions(rnd, right, [cell({ ...right, color: oc[0] }), cell({ ...right, shape: os[0] }), cell({ ...right, shape: os[1], color: oc[1] }), cell({ ...right, count: counted ? (right.count % 3) + 1 : 2 })]),
      hint: 'Read along a row, then down a column: what stays the same in each?', note: `Each row keeps one shape and each column one colour${counted ? ' and one count' : ''} — the missing box is ${counted ? `${right.count} ` : 'a '}${COLOUR_NAME[right.color]} ${right.shape}${counted && right.count > 1 ? 's' : ''}.` };
  }
};

const VISUAL_BY_STEP = (step) => (step <= 2 ? ['turn', 'count', 'cycle'] : step <= 5 ? ['turn', 'count', 'cycle', 'orbit', 'matrix'] : ['turn', 'cycle', 'orbit', 'matrix', 'combo', 'matrix']);

/** { kind, frames: cell[] (the run, the next one is asked) | grid: (cell | null)[9], options: cell[4], answer, hint, note, key }. */
export const makeVisualProblem = (rnd, step, lastKind = null) => {
  const kinds = VISUAL_BY_STEP(step).filter((k) => k !== lastKind);
  const kind = pick(rnd, kinds);
  const p = V[kind](rnd, step);
  return { kind, ...p, key: `v:${kind}:${(p.grid || p.frames).map((c) => (c ? keyOf(c) : '?')).join(';')}` };
};

/* ───────────────────────────── 3 · Odd one out ───────────────────────────── */

// Each family: groups that are plainly different from each other. Four come from one group, the odd one from another.
const FAMILIES = [
  { rule: (g) => `The others are all ${g}.`, hint: 'Think about what kind of thing each one is.', groups: {
    fruits: ['🍎', '🍌', '🍇', '🍓', '🍊', '🍍', '🥭', '🍉', '🍒', '🍐'],
    vegetables: ['🥕', '🥦', '🧅', '🥔', '🍆', '🌽', '🥒', '🧄'],
    'sweet treats': ['🍰', '🍩', '🍪', '🍫', '🍭', '🧁'] } },
  { rule: (g) => `The others are all ${g}.`, hint: 'Where does each animal live, and how does it move?', groups: {
    birds: ['🦅', '🦉', '🦜', '🕊️', '🦆', '🦚', '🐧', '🦢'],
    'sea animals': ['🐟', '🐬', '🦈', '🐙', '🦀', '🐳', '🦑', '🐠'],
    insects: ['🐝', '🦋', '🐞', '🐜', '🦗', '🪲'],
    'land mammals': ['🐘', '🦁', '🐄', '🐕', '🐎', '🐅', '🦒', '🐒'] } },
  { rule: (g) => `The others all travel ${g}.`, hint: 'Think about where each one travels.', groups: {
    'on roads': ['🚗', '🚌', '🚚', '🏍️', '🚲', '🚕', '🛺'],
    'in the air': ['✈️', '🚁', '🚀', '🎈', '🛩️'],
    'on water': ['⛵', '🚢', '🛶', '🚤', '⛴️'] } },
  { rule: (g) => `The others are all ${g}.`, hint: 'What is each thing used for?', groups: {
    'musical instruments': ['🎸', '🎹', '🥁', '🎺', '🎻', '🪈', '🎷'],
    'sports things': ['⚽', '🏏', '🏀', '🎾', '🏸', '🏐', '🏓'],
    tools: ['🔨', '🪛', '🔧', '🪚', '⛏️', '🪓'],
    'things to wear': ['👕', '👖', '🧥', '👗', '🧦', '🧢', '👟'] } },
  { rule: (g) => `The others are all ${g}.`, hint: 'Think about the sky, the weather and the Earth.', groups: {
    'things in the sky': ['☀️', '🌙', '⭐', '☁️', '🌈', '☄️'],
    plants: ['🌳', '🌵', '🌴', '🌻', '🌹', '🍀', '🌲'],
    buildings: ['🏠', '🏫', '🏥', '🏰', '🏛️', '🕌'] } }
];

const isPrime = (n) => { if (n < 2) return false; for (let d = 2; d * d <= n; d += 1) if (n % d === 0) return false; return true; };
const isSquare = (n) => Number.isInteger(Math.sqrt(n));
const NUMBER_RULES = [
  { step: 1, name: 'even numbers', ok: (n) => n % 2 === 0, lo: 2, hi: 60, parity: true },
  { step: 1, name: 'odd numbers', ok: (n) => n % 2 === 1, lo: 1, hi: 59, parity: true },
  { step: 2, name: 'multiples of 5', ok: (n) => n % 5 === 0, lo: 5, hi: 95 },
  { step: 3, name: 'multiples of 3', ok: (n) => n % 3 === 0, lo: 3, hi: 60 },
  { step: 4, name: 'multiples of 4', ok: (n) => n % 4 === 0, lo: 4, hi: 80, near: (n) => n % 2 === 0 },
  { step: 5, name: 'square numbers', ok: isSquare, lo: 1, hi: 144 },
  { step: 6, name: 'prime numbers', ok: isPrime, lo: 3, hi: 60 },
  { step: 7, name: 'multiples of 7', ok: (n) => n % 7 === 0, lo: 7, hi: 98 },
  { step: 8, name: 'multiples of 6', ok: (n) => n % 6 === 0, lo: 6, hi: 96, near: (n) => n % 2 === 0 || n % 3 === 0 },
  { step: 9, name: 'cube numbers', ok: (n) => Math.round(Math.cbrt(n)) ** 3 === n, lo: 1, hi: 1000 }
];
const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ'.split('');
const WORD_FAMILIES = [
  { name: 'words for feelings', a: ['happy', 'angry', 'proud', 'afraid', 'calm', 'jealous'], b: ['table', 'river', 'pencil', 'window'] },
  { name: 'doing words (verbs)', a: ['run', 'write', 'jump', 'sing', 'climb', 'think'], b: ['green', 'tall', 'chair', 'quickly'] },
  { name: 'shapes', a: ['circle', 'square', 'triangle', 'oval', 'hexagon', 'rectangle'], b: ['metre', 'colour', 'number', 'angle'] },
  { name: 'planets', a: ['Mars', 'Venus', 'Jupiter', 'Saturn', 'Mercury', 'Neptune'], b: ['Moon', 'Sun', 'Sirius', 'Comet'] },
  { name: 'units of length', a: ['metre', 'kilometre', 'centimetre', 'millimetre', 'inch', 'mile'], b: ['litre', 'gram', 'second', 'kilogram'] },
  { name: 'parts of a plant', a: ['root', 'stem', 'leaf', 'flower', 'seed', 'petal'], b: ['wing', 'claw', 'fin', 'beak'] }
];

const O = {
  category: (rnd) => {
    const fam = pick(rnd, FAMILIES); const [g, other] = shuffle(rnd, Object.keys(fam.groups));
    const items = [...shuffle(rnd, fam.groups[g]).slice(0, 4).map((e) => ({ emoji: e })), { emoji: pick(rnd, fam.groups[other]), odd: true }];
    return { items, hint: fam.hint, note: `${fam.rule(g)} The odd one is not.` };
  },
  number: (rnd, step) => {
    const rule = pick(rnd, NUMBER_RULES.filter((r) => r.step <= step + 1 && r.step >= Math.min(step - 4, 5)));
    let all = []; for (let n = rule.lo; n <= rule.hi; n += 1) all.push(n);
    // All five share a parity (unless parity IS the rule), so "the only even one" can never be a second answer.
    if (!rule.parity) {
      const par = shuffle(rnd, [0, 1]).find((q) => all.filter((n) => n % 2 === q && rule.ok(n)).length >= 4 && all.some((n) => n % 2 === q && !rule.ok(n)));
      if (par !== undefined) all = all.filter((n) => n % 2 === par);
    }
    const yes = shuffle(rnd, all.filter(rule.ok)).slice(0, 4);
    const no = all.filter((n) => !rule.ok(n) && (!rule.near || rule.near(n)));
    const odd = pick(rnd, no.length ? no : all.filter((n) => !rule.ok(n)));
    return { items: [...yes.map((n) => ({ text: String(n) })), { text: String(odd), odd: true }], hint: 'Try dividing each number, or think about what kind of number it is.', note: `The others are all ${rule.name}; ${odd} is not.` };
  },
  shape: (rnd, step) => {
    const mode = step < 4 ? pick(rnd, ['shape', 'colour']) : pick(rnd, ['shape', 'colour', 'turn', 'count']);
    const colours = shuffle(rnd, COLOURS); const shapes = shuffle(rnd, SOLID);
    if (mode === 'colour') return { items: [...[0, 1, 2, 3].map((i) => ({ cell: cell({ shape: shapes[i], color: colours[0] }) })), { cell: cell({ shape: shapes[4], color: colours[1] }), odd: true }], hint: 'Do not look at the shapes — look at something else about them.', note: `The others are all ${COLOUR_NAME[colours[0]]}; the odd one is ${COLOUR_NAME[colours[1]]}.` };
    if (mode === 'turn') { const sh = pick(rnd, TURNING); const r = int(rnd, 0, 3) * 90; return { items: [...[0, 1, 2, 3].map((i) => ({ cell: cell({ shape: sh, color: colours[i], rot: r }) })), { cell: cell({ shape: sh, color: colours[4], rot: (r + pick(rnd, [90, 180, 270])) % 360 }), odd: true }], hint: 'The colours do not matter. Which way does each one point?', note: 'The others all point the same way; the odd one is turned.' }; }
    if (mode === 'count') { const n = int(rnd, 2, 4); return { items: [...[0, 1, 2, 3].map((i) => ({ cell: cell({ shape: shapes[i], color: colours[i], count: n }) })), { cell: cell({ shape: shapes[4], color: colours[4], count: n + pick(rnd, [-1, 1]) }), odd: true }], hint: 'Shapes and colours all differ — so count.', note: `The others each have ${n} shapes; the odd one does not.` }; }
    return { items: [...[0, 1, 2, 3].map((i) => ({ cell: cell({ shape: shapes[0], color: colours[i] }) })), { cell: cell({ shape: shapes[1], color: colours[4] }), odd: true }], hint: 'The colours all differ. What else is there to compare?', note: `The others are all ${shapes[0]}s; the odd one is a ${shapes[1]}.` };
  },
  letter: (rnd) => {
    const vowelsOdd = rnd() < 0.5;
    const main = shuffle(rnd, vowelsOdd ? CONSONANTS : VOWELS).slice(0, 4); const odd = pick(rnd, vowelsOdd ? VOWELS : CONSONANTS);
    return { items: [...main.map((t) => ({ text: t })), { text: odd, odd: true }], hint: 'Say each letter aloud. Think: a, e, i, o, u.', note: vowelsOdd ? `${odd} is a vowel; the others are consonants.` : `${odd} is a consonant; the others are vowels.` };
  },
  word: (rnd) => {
    const fam = pick(rnd, WORD_FAMILIES); const odd = pick(rnd, fam.b);
    return { items: [...shuffle(rnd, fam.a).slice(0, 4).map((t) => ({ text: t, word: true })), { text: odd, word: true, odd: true }], hint: 'What do most of these words have in common?', note: `The others are all ${fam.name}; “${odd}” is not.` };
  }
};
const ODD_BY_STEP = (step) => (step <= 2 ? ['category', 'shape', 'number'] : step <= 5 ? ['category', 'shape', 'number', 'letter', 'word'] : ['shape', 'number', 'word', 'category', 'number']);

/** { kind, items: [{ emoji | text | cell }], odd (index), hint, note, key } — five items, exactly one odd. */
export const makeOddProblem = (rnd, step, lastKind = null) => {
  const kind = pick(rnd, ODD_BY_STEP(step).filter((k) => k !== lastKind));
  const p = O[kind](rnd, step);
  const mixed = shuffle(rnd, p.items);
  const items = mixed.map(({ odd: _odd, ...rest }) => rest);
  return { kind, items, odd: mixed.findIndex((i) => i.odd), hint: p.hint, note: p.note, key: `o:${items.map((i) => i.emoji || i.text || keyOf(i.cell)).join(',')}` };
};

/* ───────────────────────────── 4 · Matchstick challenge ───────────────────────────── */

// Seven-segment digits: a top, b top-right, c bottom-right, d bottom, e bottom-left, f top-left, g middle.
export const DIGIT_SEGS = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'];
const SEG_TO_DIGIT = Object.fromEntries(DIGIT_SEGS.map((s, d) => [[...s].sort().join(''), d]));
/** Slot ids: `${digit index}${segment}` and 'op' (the upright stick of the plus sign). */
const digitSlots = (i, d) => [...DIGIT_SEGS[d]].map((s) => `${i}${s}`);
const equationState = (a, plus, b, c) => [...digitSlots(0, a), ...(plus ? ['op'] : []), ...digitSlots(1, b), ...digitSlots(2, c)];
const numberState = (digits) => digits.flatMap((d, i) => digitSlots(i, d));

/** Read a state back: the digits (null where the sticks make no digit) and whether the sign is a plus. */
export const readMatch = (state, digits = 3) => {
  const out = [];
  for (let i = 0; i < digits; i += 1) {
    const segs = state.filter((s) => s !== 'op' && Number(s[0]) === i).map((s) => s[1]).sort().join('');
    out.push(segs in SEG_TO_DIGIT ? SEG_TO_DIGIT[segs] : null);
  }
  return { digits: out, plus: state.includes('op') };
};
const trueEq = (a, plus, b, c) => (plus ? a + b === c : a - b === c);

let TRUE_STATES = null;
const trueStates = () => {
  if (TRUE_STATES) return TRUE_STATES;
  TRUE_STATES = [];
  for (let a = 0; a <= 9; a += 1) for (let b = 0; b <= 9; b += 1) for (let c = 0; c <= 9; c += 1) for (const plus of [true, false]) {
    if (trueEq(a, plus, b, c)) TRUE_STATES.push({ a, b, c, plus, set: new Set(equationState(a, plus, b, c)) });
  }
  return TRUE_STATES;
};
/** Sticks to move to turn `state` into `target` (Infinity when they hold different numbers of sticks). */
const movesBetween = (state, targetSet) => (state.length !== targetSet.size ? Infinity : state.filter((s) => !targetSet.has(s)).length);

/**
 * A puzzle: { type: 'equation' | 'largest', digits, start: slot[], moves, goal, target (largest only), solution: slot[],
 * hint, note, key }. An equation puzzle is a false equation that becomes true by moving exactly `moves` sticks (and
 * no fewer); a "largest" puzzle asks for the biggest number that `moves` sticks can make.
 */
export const makeMatchPuzzle = (rnd, step, lastType = null) => {
  const moves = step >= 9 ? 2 : step >= 6 && rnd() < 0.4 ? 2 : 1;
  const seconds = moves === 1 ? 60 : 90; // the clock for this puzzle
  const type = step >= 3 && lastType !== 'largest' && rnd() < 0.35 ? 'largest' : 'equation';
  if (type === 'largest') {
    const count = step >= 7 ? 3 : 2;
    for (;;) {
      const digits = Array.from({ length: count }, (_, i) => int(rnd, i === 0 ? 1 : 0, 9));
      const start = numberState(digits); const now = Number(digits.join(''));
      let best = now; let bestState = null;
      const max = 10 ** count;
      for (let n = 0; n < max; n += 1) {
        const ds = String(n).padStart(count, '0').split('').map(Number);
        const st = numberState(ds);
        if (n > best && movesBetween(start, new Set(st)) <= moves) { best = n; bestState = st; }
      }
      if (!bestState || movesBetween(start, new Set(bestState)) !== moves) continue; // must really need all the moves
      return { type, digits: count, start, moves, seconds, target: best, solution: bestState, goal: `Move ${moves} matchstick${moves > 1 ? 's' : ''} to make the BIGGEST number you can.`,
        hint: 'Make the first digit as big as you can — it counts the most.', note: `${now} becomes ${best} — the biggest number ${moves} move${moves > 1 ? 's' : ''} can make.`, key: `m:L${moves}:${now}` };
    }
  }
  const truths = trueStates();
  for (;;) {
    const a = int(rnd, 0, 9); const b = int(rnd, 0, 9); const c = int(rnd, 0, 9); const plus = rnd() < 0.5;
    if (trueEq(a, plus, b, c)) continue;
    // Proper sums only (2026-11-19, the user): digits 1–9, and exactly one way to put it right.
    if (a === 0 || b === 0 || c === 0) continue;
    const start = equationState(a, plus, b, c);
    let best = Infinity; let sol = null; let ways = 0;
    for (const t of truths) { const m = movesBetween(start, t.set); if (m < best) { best = m; sol = t; ways = 1; } else if (m === best) ways += 1; }
    if (best !== moves || ways !== 1 || sol.a === 0 || sol.b === 0 || sol.c === 0) continue;
    return { type, digits: 3, start, moves, seconds, solution: [...sol.set], goal: `Move ${moves} matchstick${moves > 1 ? 's' : ''} to make the sum correct.`,
      hint: moves === 1 ? 'One stick can change a digit — or turn + into − (or − into +).' : 'Two sticks: you may change two digits, or a digit and the sign.',
      note: `${a} ${plus ? '+' : '−'} ${b} = ${c} becomes ${sol.a} ${sol.plus ? '+' : '−'} ${sol.b} = ${sol.c}.`, key: `m:E${moves}:${a}${plus ? '+' : '-'}${b}=${c}` };
  }
};

/** How many of the starting sticks have left their places. */
export const sticksMoved = (puzzle, state) => { const now = new Set(state); return puzzle.start.filter((s) => !now.has(s)).length; };

/** Is the arrangement a solution? Any arrangement that meets the goal within the allowed moves counts. */
export const matchSolved = (puzzle, state) => {
  if (state.length !== puzzle.start.length) return false;
  const moved = sticksMoved(puzzle, state);
  if (moved < 1 || moved > puzzle.moves) return false;
  const read = readMatch(state, puzzle.digits);
  if (read.digits.some((d) => d === null)) return false;
  if (puzzle.type === 'largest') return !read.plus && Number(read.digits.join('')) === puzzle.target;
  const [a, b, c] = read.digits;
  return trueEq(a, read.plus, b, c);
};

/** The four problems of one level, in their fixed order. */
export const makeQuadLevel = (rnd, { band, step, seen = new Set(), last = {} }) => {
  const fresh = (make) => { let p = make(); for (let k = 0; k < 8 && seen.has(p.key); k += 1) p = make(); return p; };
  return [
    { stage: 'number', ...fresh(() => makeNumberProblem(rnd, band, step, seen)) },
    { stage: 'visual', ...fresh(() => makeVisualProblem(rnd, step, last.visual)) },
    { stage: 'odd', ...fresh(() => makeOddProblem(rnd, step, last.odd)) },
    { stage: 'match', ...fresh(() => makeMatchPuzzle(rnd, step, last.match)) }
  ];
};
