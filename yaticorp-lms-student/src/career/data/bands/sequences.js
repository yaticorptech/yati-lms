/**
 * "Next in Sequence" by age band (2026-11-13).
 *
 * Each band plays differently, not just with bigger numbers:
 *   foundation   (Classes 1–2)  colour, shape and picture patterns, tiny +1 / +2 counting runs, 3 options
 *   developing   (Classes 3–5)  longer picture patterns, growing dots, turning arrows, skip counting, times tables
 *   intermediate (Classes 6–8)  arithmetic and geometric runs, squares, a missing number in the middle
 *   analytical   (Classes 9–10) growing gaps, alternating operations, two runs woven together
 *   advanced     (Classes 11–12) several hidden rules at once: second differences, recurrences, mixed weaves
 *
 * Every item: { run, answer, options, note, level, tier, kind }. `run` may hold the marker '?' (a missing term in
 * the middle); otherwise the answer is the next term. Built from a seeded generator, so a band's pool is the same on
 * every visit and the question memory recognises what it has asked. Options are always distinct and hold the answer
 * exactly once (tests/games/logicBands.test.js checks thousands of items).
 */
import { seeded, intBetween, pick, shuffle } from '../seeded.js';

export const GAP = '?';
export const SEQUENCE_BANDS = ['foundation', 'developing', 'intermediate', 'analytical', 'advanced'];

const COLOURS = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'];
const SHAPES = ['⭐', '❤️', '🔺', '🟦', '🌙', '🔶'];
const PICTURES = ['🐶', '🐱', '🍎', '🌸', '🚗', '🎈', '🐟', '🍌', '🐸', '🦋'];
const ARROWS = ['⬆️', '➡️', '⬇️', '⬅️'];
const DOT = '●';

/* ---- Pictures ---------------------------------------------------------- */

const UNITS = {
  AB: [0, 1], AAB: [0, 0, 1], ABB: [0, 1, 1], ABC: [0, 1, 2], AABB: [0, 0, 1, 1],
  ABCD: [0, 1, 2, 3], ABAC: [0, 1, 0, 2], AABC: [0, 0, 1, 2]
};
const UNIT_WORDS = {
  AB: 'two things take turns', AAB: 'two the same, then one different', ABB: 'one, then two the same',
  ABC: 'three things in the same order', AABB: 'two of each, in turn', ABCD: 'four things in the same order',
  ABAC: 'the first one comes back between the others', AABC: 'two the same, then two different'
};

/** A repeating pattern shown for two full turns (plus a part turn), so its rule is plain. */
const repeating = (rng, unitName, set, extra = null) => {
  const unit = UNITS[unitName];
  const kinds = Math.max(...unit) + 1;
  const symbols = shuffle(rng, set).slice(0, kinds);
  const len = unit.length * 2 + (extra === null ? intBetween(rng, 0, unit.length - 1) : extra);
  const at = (i) => symbols[unit[i % unit.length]];
  const run = Array.from({ length: len }, (_, i) => at(i));
  const answer = at(len);
  const others = set.filter((s) => !symbols.includes(s));
  return { run, answer, kind: 'picture', pool: [...symbols, ...shuffle(rng, others)], note: `The pattern repeats: ${UNIT_WORDS[unitName]}.` };
};

/** Dots that grow by `step` each time: ●, ●●, ●●● … */
const growingDots = (rng, step) => {
  const start = intBetween(rng, 1, 2);
  const len = 3 + (step === 1 ? 1 : 0);
  const n = (i) => start + step * i;
  const run = Array.from({ length: len }, (_, i) => DOT.repeat(n(i)));
  const answer = DOT.repeat(n(len));
  const pool = [n(len) - 1, n(len) + 1, n(len) + 2, n(len) - step - 1].filter((k) => k > 0 && k !== n(len)).map((k) => DOT.repeat(k));
  return { run, answer, kind: 'dots', pool: [answer, ...pool], note: `One more ${step === 1 ? 'dot' : `${step} dots`} each time.` };
};

/** An arrow turning a quarter (or half) turn each step. */
const turningArrow = (rng, quarter) => {
  const start = intBetween(rng, 0, 3);
  const len = quarter === 1 ? 5 : 4;
  const at = (i) => ARROWS[(start + quarter * i) % 4];
  const run = Array.from({ length: len }, (_, i) => at(i));
  return {
    run, answer: at(len), kind: 'picture',
    pool: [at(len), ...shuffle(rng, ARROWS.filter((a) => a !== at(len)))],
    note: quarter === 1 ? 'The arrow turns a quarter turn clockwise each time.' : 'The arrow flips round each time.'
  };
};

/* ---- Numbers ----------------------------------------------------------- */

const arith = (rng, { step, start, len = 4, down = false }) => {
  const s = down ? -step : step;
  const run = Array.from({ length: len }, (_, i) => start + s * i);
  return { run, answer: start + s * len, note: down ? `Take away ${step} each time.` : `Add ${step} each time.`, wrongNext: start + s * (len - 1) + s + (s > 0 ? 1 : -1) };
};

const countUp = (rng, step, maxStart) => arith(rng, { step, start: intBetween(rng, 1, maxStart), len: 4 });
const countDown = (rng, step, len = 4) => arith(rng, { step, start: step * (len + intBetween(rng, 0, 4)) + intBetween(rng, 0, step - 1), len, down: true });

const timesTable = (rng, factors) => {
  const f = pick(rng, factors);
  const from = intBetween(rng, 1, 4);
  const run = Array.from({ length: 4 }, (_, i) => f * (from + i));
  return { run, answer: f * (from + 4), note: `The ${f} times table: add ${f} each time.` };
};

const geometric = (rng, factors, startMax, len = 4) => {
  const f = pick(rng, factors);
  const start = intBetween(rng, 1, startMax);
  const run = Array.from({ length: len }, (_, i) => start * f ** i);
  return { run, answer: start * f ** len, note: f === 2 ? 'Double each time.' : `Multiply by ${f} each time.` };
};

const halving = (rng, factors, len = 4) => {
  const f = pick(rng, factors);
  const seed = intBetween(rng, 1, 5);
  const start = seed * f ** len;
  const run = Array.from({ length: len }, (_, i) => start / f ** i);
  return { run, answer: seed, note: f === 2 ? 'Halve each time.' : `Divide by ${f} each time.` };
};

const powersOf = (rng, f) => {
  const from = intBetween(rng, 1, 3);
  const run = Array.from({ length: 4 }, (_, i) => (from + i) ** f);
  return { run, answer: (from + 4) ** f, note: f === 2 ? 'Square numbers: 1×1, 2×2, 3×3 …' : 'Cube numbers: n × n × n.' };
};

const growingGaps = (rng, by, len = 5) => {
  const start = intBetween(rng, 1, 12);
  const first = intBetween(rng, 1, 4);
  const run = [start];
  let gap = first;
  while (run.length < len) { run.push(run[run.length - 1] + gap); gap += by; }
  return { run, answer: run[len - 1] + gap, note: `The gaps grow by ${by} each time (+${first}, +${first + by}, +${first + 2 * by} …).`, wrongNext: run[len - 1] + gap - by };
};

const alternatingAddSub = (rng, len = 6) => {
  const up = intBetween(rng, 3, 9);
  const down = intBetween(rng, 1, up - 1);
  const start = intBetween(rng, 2, 20);
  const run = [start];
  while (run.length < len) run.push(run[run.length - 1] + (run.length % 2 === 1 ? up : -down));
  const answer = run[len - 1] + (len % 2 === 1 ? up : -down);
  return { run, answer, note: `Add ${up}, then take away ${down}, again and again.`, wrongNext: run[len - 1] + (len % 2 === 1 ? -down : up) };
};

const addThenTimes = (rng, len = 5) => {
  const f = pick(rng, [2, 3]);
  const add = intBetween(rng, 1, 5);
  const start = intBetween(rng, 1, 5);
  const run = [start];
  while (run.length < len) run.push(run.length % 2 === 1 ? run[run.length - 1] * f : run[run.length - 1] + add);
  const answer = len % 2 === 1 ? run[len - 1] * f : run[len - 1] + add;
  return { run, answer, note: `Multiply by ${f}, then add ${add}, in turn.`, wrongNext: len % 2 === 1 ? run[len - 1] + add : run[len - 1] * f };
};

/** Two runs woven together: odd places follow one rule, even places another. */
const woven = (rng, mixed, len = 7) => {
  const a0 = intBetween(rng, 1, 9);
  const da = intBetween(rng, 2, 6);
  const b0 = intBetween(rng, 30, 60);
  const db = intBetween(rng, 2, 7);
  const geo = mixed && rng() < 0.5;
  const A = (k) => (geo ? a0 * 2 ** k : a0 + da * k);
  const B = (k) => b0 - db * k;
  const run = Array.from({ length: len }, (_, i) => (i % 2 === 0 ? A(i / 2) : B((i - 1) / 2)));
  const answer = len % 2 === 0 ? A(len / 2) : B((len - 1) / 2);
  const ruleA = geo ? 'one doubles' : `one adds ${da}`;
  return { run, answer, note: `Two runs woven together: ${ruleA}, the other takes away ${db}.`, wrongNext: len % 2 === 0 ? B(len / 2) : A((len - 1) / 2) };
};

const fibLike = (rng, len = 6, plus = 0) => {
  const a = intBetween(rng, 1, 5);
  const b = intBetween(rng, a, a + 5);
  const run = [a, b];
  while (run.length < len) run.push(run[run.length - 1] + run[run.length - 2] + plus);
  return {
    run, answer: run[len - 1] + run[len - 2] + plus,
    note: plus ? `Add the two before it, then add ${plus}.` : 'Each term is the sum of the two before it.',
    wrongNext: run[len - 1] + run[len - 2] + (plus ? 0 : 1)
  };
};

const linearRecurrence = (rng, factors, adds, len = 5) => {
  const f = pick(rng, factors);
  const k = pick(rng, adds);
  // Start high enough that the run climbs (s·f + k > s), never stalls or falls.
  const low = Math.max(1, Math.floor(-k / (f - 1)) + 1);
  const start = intBetween(rng, low, low + 4);
  const run = [start];
  while (run.length < len) run.push(run[run.length - 1] * f + k);
  const word = k > 0 ? `add ${k}` : `take away ${-k}`;
  return { run, answer: run[len - 1] * f + k, note: `Multiply by ${f}, then ${word}.`, wrongNext: run[len - 1] * f };
};

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71];
const primes = (rng) => {
  const from = intBetween(rng, 0, PRIMES.length - 7);
  return { run: PRIMES.slice(from, from + 5), answer: PRIMES[from + 5], note: 'Prime numbers: each has no factors but 1 and itself.' };
};

const polynomial = (rng, f, note, len = 5) => {
  const from = intBetween(rng, 1, 6);
  const run = Array.from({ length: len }, (_, i) => f(from + i));
  return { run, answer: f(from + len), note };
};

/** Gaps that themselves double: +a, +2a, +4a … (two rules hidden in one run). */
const doublingGaps = (rng, len = 5) => {
  const start = intBetween(rng, 1, 10);
  const a = intBetween(rng, 1, 3);
  const run = [start];
  let gap = a;
  while (run.length < len) { run.push(run[run.length - 1] + gap); gap *= 2; }
  return { run, answer: run[len - 1] + gap, note: `The gaps double each time (+${a}, +${2 * a}, +${4 * a} …).`, wrongNext: run[len - 1] + gap / 2 + a };
};

/** Multiply by 1, 2, 3, 4 … in turn. */
const risingFactor = (rng, len = 5) => {
  const start = intBetween(rng, 1, 3);
  const run = [start];
  while (run.length < len) run.push(run[run.length - 1] * (run.length + 1));
  return { run, answer: run[len - 1] * (len + 1), note: 'Multiply by 2, then 3, then 4 … (the multiplier grows by one).', wrongNext: run[len - 1] * len };
};

/** Signs that flip while the size grows: 1, −2, 3, −4 … scaled. */
const flippingSigns = (rng, len = 6) => {
  const k = intBetween(rng, 1, 5);
  const geo = rng() < 0.5;
  const t = (i) => (i % 2 === 0 ? 1 : -1) * (geo ? k * 2 ** i : k * (i + 1));
  const run = Array.from({ length: len }, (_, i) => t(i));
  return { run, answer: t(len), note: geo ? `The size doubles and the sign flips each time.` : `Multiples of ${k}, with the sign flipping each time.`, wrongNext: -t(len) };
};

/** A missing term in the middle of an otherwise ordinary run. */
const withGap = (rng, item, minIndex = 1) => {
  const full = [...item.run, item.answer];
  const at = intBetween(rng, minIndex, full.length - 2);
  const answer = full[at];
  const run = full.map((v, i) => (i === at ? GAP : v));
  return { ...item, run, answer, wrongNext: undefined, missing: true, note: `${item.note} The gap is in the middle.` };
};

/* ---- Options ----------------------------------------------------------- */

/** `count` distinct wrong numbers near the answer — never the answer, negative only if the run has negatives. */
const numberOptions = (rng, item, count) => {
  const { answer } = item;
  const nums = item.run.filter((v) => typeof v === 'number');
  const allowNeg = nums.some((v) => v < 0) || answer < 0;
  const last = nums[nums.length - 1];
  const diff = nums.length > 1 ? Math.abs(last - nums[nums.length - 2]) : 1;
  const mag = Math.max(1, Math.round(Math.abs(answer) * 0.1));
  const near = [answer + 1, answer - 1, answer + 2, answer - 2, answer + diff, answer - diff, answer + mag, answer - mag, answer + 10, answer - 10, answer + 3, answer + 5];
  const first = item.wrongNext !== undefined ? [item.wrongNext] : [];
  const out = [];
  for (const c of [...first, ...shuffle(rng, near)]) {
    if (out.length >= count) break;
    if (!Number.isInteger(c) || c === answer || out.includes(c)) continue;
    if (!allowNeg && c < 0) continue;
    out.push(c);
  }
  let bump = 1;
  while (out.length < count) {
    const c = answer + bump;
    if (!out.includes(c) && c !== answer) out.push(c);
    bump += 1;
  }
  return out;
};

const finish = (rng, item, count) => {
  let wrong;
  if (item.pool) {
    wrong = item.pool.filter((s, i, all) => s !== item.answer && all.indexOf(s) === i).slice(0, count - 1);
  } else {
    wrong = numberOptions(rng, item, count - 1);
  }
  // eslint-disable-next-line no-unused-vars
  const { pool, wrongNext, ...rest } = item;
  return { ...rest, kind: item.kind || 'number', options: [item.answer, ...wrong] };
};

/* ---- Bands: [level, family] lists, easy to hard ------------------------- */

const FAMILIES = {
  foundation: [
    [1, (r) => repeating(r, 'AB', COLOURS, 2)],
    [1, (r) => repeating(r, 'AB', SHAPES)],
    [1, (r) => repeating(r, 'AB', PICTURES)],
    [1, (r) => countUp(r, 1, 5)],
    [1, (r) => repeating(r, 'AAB', COLOURS)],
    [1, (r) => repeating(r, 'ABB', PICTURES)],
    [1, (r) => countUp(r, 1, 10)],
    [1, (r) => growingDots(r, 1)],
    [2, (r) => repeating(r, 'ABC', COLOURS)],
    [2, (r) => repeating(r, 'ABC', SHAPES)],
    [2, (r) => arith(r, { step: 2, start: 2 * intBetween(r, 0, 3), len: 4 })],
    [2, (r) => countDown(r, 1)],
    [2, (r) => repeating(r, 'AABB', PICTURES)],
    [3, (r) => arith(r, { step: 2, start: 1 + 2 * intBetween(r, 0, 3), len: 4 })],
    [3, (r) => arith(r, { step: 5, start: 5 * intBetween(r, 0, 2), len: 4 })],
    [3, (r) => arith(r, { step: 10, start: 10 * intBetween(r, 0, 3), len: 4 })],
    [3, (r) => growingDots(r, 2)]
  ],
  developing: [
    [1, (r) => repeating(r, 'ABC', PICTURES)],
    [1, (r) => repeating(r, 'AABB', SHAPES)],
    [1, (r) => growingDots(r, 1)],
    [1, (r) => arith(r, { step: pick(r, [2, 5, 10]), start: intBetween(r, 0, 20), len: 4 })],
    [1, (r) => countDown(r, pick(r, [1, 2]))],
    [1, (r) => turningArrow(r, 2)],
    [1, (r) => repeating(r, 'AABC', COLOURS)],
    [2, (r) => turningArrow(r, 1)],
    [2, (r) => repeating(r, 'ABCD', PICTURES)],
    [2, (r) => arith(r, { step: pick(r, [3, 4]), start: intBetween(r, 1, 15), len: 4 })],
    [2, (r) => countDown(r, pick(r, [5, 10]))],
    [2, (r) => geometric(r, [2], 3)],
    [2, (r) => growingDots(r, 2)],
    [3, (r) => timesTable(r, [3, 4, 6, 7, 8, 9])],
    [3, (r) => repeating(r, 'ABAC', SHAPES)],
    [3, (r) => halving(r, [2])],
    [3, (r) => withGap(r, arith(r, { step: pick(r, [2, 5, 10]), start: intBetween(r, 1, 20), len: 4 }))],
    [3, (r) => arith(r, { step: intBetween(r, 6, 12), start: intBetween(r, 10, 50), len: 4 })]
  ],
  intermediate: [
    [1, (r) => arith(r, { step: intBetween(r, 3, 12), start: intBetween(r, 1, 40), len: 4 })],
    [1, (r) => countDown(r, intBetween(r, 3, 9))],
    [1, (r) => geometric(r, [2], 7)],
    [1, (r) => withGap(r, arith(r, { step: intBetween(r, 3, 15), start: intBetween(r, 1, 30), len: 4 }))],
    [1, (r) => powersOf(r, 2)],
    [2, (r) => geometric(r, [2, 3], 5)],
    [2, (r) => halving(r, [2, 3])],
    [2, (r) => growingGaps(r, 1)],
    [2, (r) => withGap(r, geometric(r, [2, 3], 4))],
    [2, (r) => withGap(r, countDown(r, intBetween(r, 4, 12), 5))],
    [3, (r) => alternatingAddSub(r)],
    [3, (r) => powersOf(r, 3)],
    [3, (r) => growingGaps(r, 2)],
    [3, (r) => withGap(r, powersOf(r, 2))],
    [3, (r) => geometric(r, [4, 5], 3)]
  ],
  analytical: [
    [1, (r) => growingGaps(r, intBetween(r, 1, 3))],
    [1, (r) => polynomial(r, (n) => n * n + 1, 'Square numbers plus 1.')],
    [1, (r) => alternatingAddSub(r)],
    [1, (r) => withGap(r, geometric(r, [2, 3], 5))],
    [2, (r) => woven(r, false)],
    [2, (r) => addThenTimes(r)],
    [2, (r) => fibLike(r)],
    [2, (r) => doublingGaps(r)],
    [2, (r) => withGap(r, growingGaps(r, 2), 2)],
    [3, (r) => woven(r, true)],
    [3, (r) => linearRecurrence(r, [2, 3], [-1, 1, 2])],
    [3, (r) => polynomial(r, (n) => (n * (n + 1)) / 2, 'Triangular numbers: the gaps grow by one.')],
    [3, (r) => withGap(r, alternatingAddSub(r, 6), 2)],
    [3, (r) => primes(r)]
  ],
  advanced: [
    [1, (r) => woven(r, true)],
    [1, (r) => primes(r)],
    [1, (r) => polynomial(r, (n) => n * n + n, 'Each term is n² + n.')],
    [1, (r) => fibLike(r, 6, intBetween(r, 1, 3))],
    [2, (r) => polynomial(r, (n) => 2 * n * n - n, 'The second differences are all 4: a quadratic, 2n² − n.')],
    [2, (r) => linearRecurrence(r, [2, 3], [-3, -2, -1, 1, 2, 3])],
    [2, (r) => flippingSigns(r)],
    [2, (r) => polynomial(r, (n) => n ** 3 - n, 'Each term is n³ − n.')],
    [2, (r) => doublingGaps(r, 6)],
    [3, (r) => risingFactor(r)],
    [3, (r) => polynomial(r, (n) => PRIMES[n - 1] ** 2, 'Squares of the prime numbers.')],
    [3, (r) => withGap(r, linearRecurrence(r, [2, 3], [-1, 1, 2, 3]), 2)],
    [3, (r) => withGap(r, fibLike(r, 6, 1), 2)],
    [3, (r) => polynomial(r, (n) => 2 ** n + n, 'Powers of 2 plus n: two rules added together.')]
  ]
};

const OPTION_COUNT = { foundation: 3, developing: 4, intermediate: 4, analytical: 4, advanced: 4 };
const SEEDS = { foundation: 4101, developing: 4202, intermediate: 4303, analytical: 4404, advanced: 4505 };

/** The band a null/unknown band plays as: today's game. */
export const sequenceBand = (band) => (FAMILIES[band] ? band : 'analytical');

/**
 * A band's pool: `perFamily` items from each family, easiest families first in each level, de-duplicated.
 * `seed` lets the test draw many different pools.
 */
export const buildBandSequences = (band, { perFamily = 14, seed } = {}) => {
  const key = sequenceBand(band);
  const rng = seeded(seed ?? SEEDS[key]);
  const count = OPTION_COUNT[key];
  const families = FAMILIES[key];
  const out = [];
  const seen = new Set();
  [1, 2, 3].forEach((level) => {
    const mine = families.filter(([l]) => l === level).map(([, f]) => f);
    const ranked = [];
    for (let round = 0; round < perFamily; round += 1) {
      mine.forEach((family, f) => {
        const item = finish(rng, family(rng), count);
        const id = `${item.run.join(',')}>${item.answer}`;
        if (seen.has(id)) return;
        seen.add(id);
        ranked.push({ it: { ...item, level }, rank: f * 1000 + round });
      });
    }
    // Families are listed easy to hard: order by family position for the tier, so early levels meet the easy ones.
    ranked.sort((a, b) => a.rank - b.rank);
    ranked.forEach(({ it }, i) => out.push({ ...it, tier: ranked.length > 1 ? i / (ranked.length - 1) : 0 }));
  });
  return out;
};
