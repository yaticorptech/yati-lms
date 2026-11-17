/**
 * Quantitative Arena (Master Minds; extends Quick Compare) — pure and seeded.
 *
 * Two kinds of round:
 *  qc   — quantitative comparison: Quantity A against Quantity B under a
 *         condition. Answers: 'A' (A greater), 'B', 'equal', 'cannot'.
 *         With variables, the answer is DECIDED BY SAMPLING many values that
 *         satisfy the condition (integers, fractions, negatives, extremes):
 *         one relation every time → that relation; two different → 'cannot'.
 *         Each template also states the textbook answer; tests check both agree.
 *         Fixed numbers are compared exactly with integer cross-multiplication.
 *  word — multi-step word problem; numeric entry, rounded to 2 decimals.
 */
import { intBetween, pick, shuffle } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const t01 = (levelNo) => clampN(((levelNo || 1) - 1) / 29, 0, 1);
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
export const round2 = (x) => Math.round(x * 100 + Number.EPSILON * Math.sign(x)) / 100;

export const QC_OPTIONS = [
  { id: 'A', label: 'Quantity A is greater' },
  { id: 'B', label: 'Quantity B is greater' },
  { id: 'equal', label: 'The two quantities are equal' },
  { id: 'cannot', label: 'The relationship cannot be determined' }
];

/** Real test values: integers, fractions, negatives and extremes. */
const REALS = [-100, -10, -5, -3, -2, -1.5, -1, -0.9, -0.5, -1 / 3, -0.1, 0, 0.1, 1 / 3, 0.5, 0.9, 1, 1.5, 2, 3, 5, 10, 100];
const INTS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
const EPS = 1e-9;

/** Every assignment of `vars` from `values` that satisfies `cond`. */
const assignments = (vars, values, cond) => {
  let out = [{}];
  for (const v of vars) out = out.flatMap((o) => values.map((x) => ({ ...o, [v]: x })));
  return out.filter(cond);
};

/** The relation over all sampled values: 'A' | 'B' | 'equal' | 'cannot'. */
export const decideBySampling = (samples, fa, fb) => {
  const seen = new Set();
  for (const s of samples) {
    const a = fa(s);
    const b = fb(s);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    seen.add(Math.abs(a - b) < EPS * Math.max(1, Math.abs(a), Math.abs(b)) ? 'equal' : a > b ? 'A' : 'B');
  }
  if (seen.size === 1) return [...seen][0];
  return seen.size === 0 ? null : 'cannot';
};

/* Variable templates: { tier, vars, values?, cases: [{ cond text, test, expect }], a, b, fa, fb } */
const VAR_TEMPLATES = [
  { tier: 1, vars: ['x'], a: 'x²', b: 'x', fa: (s) => s.x * s.x, fb: (s) => s.x,
    cases: [['x > 1', (s) => s.x > 1, 'A'], ['0 < x < 1', (s) => s.x > 0 && s.x < 1, 'B'], ['x > 0', (s) => s.x > 0, 'cannot'], ['x < 0', (s) => s.x < 0, 'A']] },
  { tier: 1, vars: ['x', 'y'], a: 'x − y', b: 'y − x', fa: (s) => s.x - s.y, fb: (s) => s.y - s.x,
    cases: [['x > y', (s) => s.x > s.y, 'A'], ['x < y', (s) => s.x < s.y, 'B'], ['x and y are real numbers', () => true, 'cannot']] },
  { tier: 1, vars: ['x'], a: '√x', b: 'x', fa: (s) => Math.sqrt(s.x), fb: (s) => s.x,
    cases: [['0 < x < 1', (s) => s.x > 0 && s.x < 1, 'A'], ['x > 1', (s) => s.x > 1, 'B'], ['x ≥ 0', (s) => s.x >= 0, 'cannot']] },
  { tier: 2, vars: ['x'], a: 'x³', b: 'x²', fa: (s) => s.x ** 3, fb: (s) => s.x * s.x,
    cases: [['x < 0', (s) => s.x < 0, 'B'], ['x > 1', (s) => s.x > 1, 'A'], ['0 < x < 1', (s) => s.x > 0 && s.x < 1, 'B'], ['x ≠ 0', (s) => s.x !== 0, 'cannot']] },
  { tier: 2, vars: ['a', 'b'], a: '(a + b)²', b: 'a² + b²', fa: (s) => (s.a + s.b) ** 2, fb: (s) => s.a * s.a + s.b * s.b,
    cases: [['a > 0 and b > 0', (s) => s.a > 0 && s.b > 0, 'A'], ['ab < 0', (s) => s.a * s.b < 0, 'B'], ['a and b are not zero', (s) => s.a !== 0 && s.b !== 0, 'cannot']] },
  { tier: 2, vars: ['x'], a: '1/x', b: 'x', fa: (s) => 1 / s.x, fb: (s) => s.x,
    cases: [['x > 1', (s) => s.x > 1, 'B'], ['0 < x < 1', (s) => s.x > 0 && s.x < 1, 'A'], ['x < −1', (s) => s.x < -1, 'A'], ['−1 < x < 0', (s) => s.x > -1 && s.x < 0, 'B'], ['x > 0', (s) => s.x > 0, 'cannot']] },
  { tier: 2, vars: ['x', 'y'], a: 'x / y', b: 'y / x', fa: (s) => s.x / s.y, fb: (s) => s.y / s.x,
    cases: [['x > y > 0', (s) => s.x > s.y && s.y > 0, 'A'], ['y > x > 0', (s) => s.y > s.x && s.x > 0, 'B'], ['x > 0 and y > 0', (s) => s.x > 0 && s.y > 0, 'cannot']] },
  { tier: 3, vars: ['a', 'b'], a: '√(a + b)', b: '√a + √b', fa: (s) => Math.sqrt(s.a + s.b), fb: (s) => Math.sqrt(s.a) + Math.sqrt(s.b),
    cases: [['a > 0 and b > 0', (s) => s.a > 0 && s.b > 0, 'B'], ['a ≥ 0 and b ≥ 0', (s) => s.a >= 0 && s.b >= 0, 'cannot']] },
  { tier: 3, vars: ['x', 'y'], a: '|x + y|', b: '|x| + |y|', fa: (s) => Math.abs(s.x + s.y), fb: (s) => Math.abs(s.x) + Math.abs(s.y),
    cases: [['xy > 0', (s) => s.x * s.y > 0, 'equal'], ['xy < 0', (s) => s.x * s.y < 0, 'B'], ['x and y are real numbers', () => true, 'cannot']] },
  { tier: 3, vars: ['n'], ints: true, a: '(−1)²ⁿ', b: '1', fa: (s) => (-1) ** (2 * s.n), fb: () => 1,
    cases: [['n is an integer', () => true, 'equal']] },
  { tier: 3, vars: ['n'], ints: true, a: 'n² + n', b: '0', fa: (s) => s.n * s.n + s.n, fb: () => 0,
    cases: [['n is an integer', () => true, 'cannot'], ['n is a positive integer', (s) => s.n > 0, 'A']] },
  { tier: 3, vars: ['n'], ints: true, a: '(−1)ⁿ', b: '0', fa: (s) => (-1) ** s.n, fb: () => 0,
    cases: [['n is an integer', () => true, 'cannot'], ['n is an odd integer', (s) => Math.abs(s.n % 2) === 1, 'B']] }
];

/** Compare p1/q1 with p2/q2 exactly (q > 0). */
const cmpFrac = (p1, q1, p2, q2) => Math.sign(p1 * q2 - p2 * q1);
const rel = (sign) => (sign > 0 ? 'A' : sign < 0 ? 'B' : 'equal');

/* Fixed-number templates: gen(rng) → { cond, a, b, answer, expect } with an exact comparison. */
const NUM_TEMPLATES = [
  { tier: 1, gen: (rng) => {
    const q = pick(rng, [3, 6, 7, 9, 11, 12, 13]);
    const p = intBetween(rng, 1, q - 1);
    const near = Math.round((p * 100) / q);
    const dec = near + pick(rng, [-1, 0, 0, 1]);
    return { cond: 'No condition', a: `${p}/${q}`, b: `${(dec / 100).toFixed(2)}`, answer: rel(cmpFrac(p, q, dec, 100)), why: `${p}/${q} = ${(p / q).toFixed(4)}…` };
  } },
  { tier: 1, gen: (rng) => {
    const p = intBetween(rng, 2, 9) * 5;
    const q = intBetween(rng, 2, 19) * 10;
    if (rng() < 0.5) return { cond: 'No condition', a: `${p}% of ${q}`, b: `${q}% of ${p}`, answer: 'equal', why: `Both equal ${p}×${q}/100 = ${(p * q) / 100}.` };
    const r = p + pick(rng, [-5, 5]);
    const s = q + pick(rng, [-10, 10]);
    return { cond: 'No condition', a: `${p}% of ${q}`, b: `${r}% of ${s}`, answer: rel(Math.sign(p * q - r * s)), why: `A = ${(p * q) / 100}, B = ${(r * s) / 100}.` };
  } },
  { tier: 1, gen: (rng) => {
    const k = intBetween(rng, 3, 9);
    const base = pick(rng, [2, 3]);
    return base === 2
      ? { cond: `k = ${k}`, a: `2^(k+1)`, b: `2^k + 2^k`, answer: 'equal', why: `2^k + 2^k = 2·2^k = 2^(k+1).` }
      : { cond: `k = ${k}`, a: `3^k + 3^k`, b: `3^(k+1)`, answer: 'B', why: `3^k + 3^k = 2·3^k, but 3^(k+1) = 3·3^k.` };
  } },
  { tier: 1, gen: (rng) => {
    const r = pick(rng, [1, 1.5, 2, 2, 3, 4, 5]);
    return { cond: `A circle has radius ${r}`, a: 'Its circumference', b: 'Its area', answer: rel(Math.sign(2 * r - r * r)), why: `Circumference 2πr = ${2 * r}π, area πr² = ${r * r}π.` };
  } },
  { tier: 2, gen: (rng) => {
    const P = intBetween(rng, 2, 9) * 1000;
    const r = pick(rng, [5, 8, 10, 12, 15]);
    const n = pick(rng, [2, 3]);
    const compound = P * ((1 + r / 100) ** n) - P;
    return { cond: `₹${P} invested at ${r}% a year for ${n} years`, a: 'Interest, compounded yearly', b: 'Simple interest', answer: 'A', why: `Compound ₹${round2(compound)} against simple ₹${(P * r * n) / 100}.` };
  } },
  { tier: 2, gen: (rng) => {
    const m = intBetween(rng, 3, 30);
    const k = intBetween(rng, 4, 9);
    const n = m + k;
    return rng() < 0.5
      ? { cond: `The integers from ${m} to ${n}`, a: 'Their average', b: 'Their median', answer: 'equal', why: `Evenly spaced numbers: average = median = ${(m + n) / 2}.` }
      : { cond: `The integers from ${m} to ${n}`, a: 'Their average', b: `${Math.floor((m + n) / 2) + 1}`, answer: rel(cmpFrac(m + n, 2, Math.floor((m + n) / 2) + 1, 1)), why: `The average is (${m} + ${n})/2 = ${(m + n) / 2}.` };
  } },
  { tier: 3, gen: (rng) => {
    const a = intBetween(rng, 3, 9);
    const b = intBetween(rng, 3, 9);
    const lo = Math.abs(a - b);
    const hi = a + b;
    if (rng() < 0.5) return { cond: `A triangle has sides ${a}, ${b} and c`, a: 'c', b: `${hi}`, answer: 'B', why: `Triangle inequality: c < ${a} + ${b} = ${hi}.` };
    const m = intBetween(rng, lo + 1, hi - 1);
    return { cond: `A triangle has sides ${a}, ${b} and c`, a: 'c', b: `${m}`, answer: 'cannot', why: `c can be anything strictly between ${lo} and ${hi}, so on either side of ${m}.`, sample: { lo, hi, m } };
  } }
];

/* ---------------------------------------------------------------- word problems */

const WORK = [[3, 6], [4, 12], [6, 12], [10, 15], [12, 24], [20, 30], [6, 3], [8, 24], [12, 6], [15, 10]];
const HARMONIC = [[40, 60], [30, 60], [20, 30], [60, 90], [45, 90], [12, 24], [36, 45], [50, 75]];

const WORD = [
  { tier: 1, gen: (rng) => {
    const [a, b] = pick(rng, WORK);
    return { text: `Pipe P fills a tank in ${a} hours and pipe Q fills it in ${b} hours. With both open, how many hours does it take to fill the empty tank?`, answer: round2((a * b) / (a + b)), unit: 'hours', why: `Rates add: 1/${a} + 1/${b} = ${(a + b) / gcd(a + b, a * b)}/${(a * b) / gcd(a + b, a * b)} tank per hour, so ${round2((a * b) / (a + b))} hours.` };
  } },
  { tier: 1, gen: (rng) => {
    const [v1, v2] = pick(rng, HARMONIC);
    const d = intBetween(rng, 2, 9) * 30;
    return { text: `A car drives ${d} km at ${v1} km/h and returns the same ${d} km at ${v2} km/h. What is its average speed for the round trip, in km/h?`, answer: round2((2 * v1 * v2) / (v1 + v2)), unit: 'km/h', why: `Total ${2 * d} km in ${round2(d / v1 + d / v2)} h → ${round2((2 * v1 * v2) / (v1 + v2))} km/h (not the plain average ${(v1 + v2) / 2}).` };
  } },
  { tier: 1, gen: (rng) => {
    const x = intBetween(rng, 2, 8) * 5;
    const y = intBetween(rng, 2, 8) * 5;
    const p = intBetween(rng, 1, 6) * 5;
    const q = p + intBetween(rng, 2, 8) * 5;
    return { text: `${x} litres of a ${p}% salt solution are mixed with ${y} litres of a ${q}% salt solution. What is the salt concentration of the mixture, in %?`, answer: round2((x * p + y * q) / (x + y)), unit: '%', why: `Salt: ${(x * p) / 100} + ${(y * q) / 100} = ${(x * p + y * q) / 100} L in ${x + y} L → ${round2((x * p + y * q) / (x + y))}%.` };
  } },
  { tier: 2, gen: (rng) => {
    const p = intBetween(rng, 2, 8) * 5;
    const q = intBetween(rng, 2, 8) * 5;
    const net = round2(((1 + p / 100) * (1 - q / 100) - 1) * 100);
    return { text: `A price rises by ${p}% and then falls by ${q}%. What is the overall percentage change? (Use a minus sign for a decrease.)`, answer: net, unit: '%', why: `× ${1 + p / 100} × ${round2(1 - q / 100)} = × ${round2(1 + net / 100)} → ${net}%.` };
  } },
  { tier: 2, gen: (rng) => {
    const c = intBetween(rng, 4, 40) * 50;
    const m = intBetween(rng, 4, 10) * 5;
    const d = intBetween(rng, 1, Math.floor(m / 5) - 1) * 5;
    const profit = round2(c * (1 + m / 100) * (1 - d / 100) - c);
    return { text: `A shop buys a lamp for ₹${c}, marks it ${m}% above cost, then sells it at a ${d}% discount on the marked price. What is the profit in ₹?`, answer: profit, unit: '₹', why: `Marked ₹${round2(c * (1 + m / 100))}, sold ₹${round2(c * (1 + m / 100) * (1 - d / 100))} → profit ₹${profit}.` };
  } },
  { tier: 2, gen: (rng) => {
    const P = intBetween(rng, 2, 20) * 500;
    const r = pick(rng, [4, 5, 6, 8, 10, 12]);
    const n = pick(rng, [2, 3]);
    const ci = round2(P * (1 + r / 100) ** n - P);
    return { text: `₹${P} is invested at ${r}% a year, compounded yearly. How much interest has it earned after ${n} years, in ₹?`, answer: ci, unit: '₹', why: `${P} × ${1 + r / 100}^${n} = ${round2(P * (1 + r / 100) ** n)} → interest ₹${ci}.` };
  } },
  { tier: 3, gen: (rng) => {
    for (let guard = 0; guard < 100; guard++) {
      const a = intBetween(rng, 8, 40);
      const b = intBetween(rng, 8, 40);
      const k = intBetween(rng, 3, 12);
      const g1 = gcd(a, b);
      const g2 = gcd(a + k, b + k);
      if (a === b || g1 === 1 || (a + k) / g2 === (a / g1)) continue;
      return { text: `The ages of Ria and Sam are in the ratio ${a / g1} : ${b / g1}. In ${k} years the ratio will be ${(a + k) / g2} : ${(b + k) / g2}. How old is Ria now?`, answer: a, unit: 'years', why: `Ria = ${a / g1}t, Sam = ${b / g1}t; (${a / g1}t + ${k}) : (${b / g1}t + ${k}) = ${(a + k) / g2} : ${(b + k) / g2} gives t = ${g1}, so Ria is ${a}.` };
    }
    return { text: 'The ages of Ria and Sam are in the ratio 2 : 3. In 5 years the ratio will be 3 : 4. How old is Ria now?', answer: 10, unit: 'years', why: 'Ria = 2t, Sam = 3t; (2t + 5)/(3t + 5) = 3/4 gives t = 5, so Ria is 10.' };
  } },
  { tier: 3, gen: (rng) => {
    for (let guard = 0; guard < 100; guard++) {
      const pen = intBetween(rng, 5, 30);
      const book = intBetween(rng, 20, 80);
      const [a, b, c, d] = [intBetween(rng, 2, 5), intBetween(rng, 1, 4), intBetween(rng, 1, 4), intBetween(rng, 2, 6)];
      if (a * d - b * c === 0) continue;
      return { text: `${a} pens and ${b} notebooks cost ₹${a * pen + b * book}. ${c} pens and ${d} notebooks cost ₹${c * pen + d * book}. What does one notebook cost, in ₹?`, answer: book, unit: '₹', why: `Eliminate pens: notebook = ₹${book} (pen = ₹${pen}).` };
    }
    return { text: '2 pens and 1 notebook cost ₹70. 1 pen and 3 notebooks cost ₹135. What does one notebook cost, in ₹?', answer: 40, unit: '₹', why: 'Pen = ₹15, notebook = ₹40.' };
  } },
  { tier: 3, gen: (rng) => {
    const orig = intBetween(rng, 2, 40) * 100;
    const p = pick(rng, [10, 20, 25, 40, 50]);
    const final = round2(orig * (1 + p / 100) * (1 - p / 100));
    return { text: `A number is increased by ${p}% and the result is then decreased by ${p}%. The final value is ${final}. What was the original number?`, answer: orig, unit: '', why: `× ${1 + p / 100} × ${1 - p / 100} = × ${1 - (p * p) / 10000}; ${final} ÷ ${1 - (p * p) / 10000} = ${orig}.` };
  } }
];

/* ---------------------------------------------------------------- level */

/** How a level plays: band 'advanced', difficulty 1–3, step 1–30. */
export const quantConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const d = clampN(difficulty || 1, 1, 3);
  const t = t01(levelNo);
  const rounds = Math.round(8 + 2 * t);
  return {
    band: 'advanced',
    rounds,
    pass: Math.ceil(rounds * 0.6),
    tier: d,
    word: d === 1 ? 0.25 : d === 2 ? 0.35 : 0.45,
    qcSeconds: Math.round(55 - 10 * t - 5 * (d - 1)),
    wordSeconds: Math.round(110 - 15 * t - 10 * (d - 1))
  };
};

/** Pick a template of tier ≤ max, leaning to the top tier. */
const pickTier = (rng, list, max) => {
  const top = list.filter((x) => x.tier === max);
  const all = list.filter((x) => x.tier <= max);
  return rng() < 0.6 && top.length ? pick(rng, top) : pick(rng, all);
};

/** One qc round: { kind: 'qc', cond, a, b, answer, why, check? }. */
export const makeQcRound = (rng, tier) => {
  const useVar = rng() < 0.6;
  if (useVar) {
    const t = pickTier(rng, VAR_TEMPLATES, tier);
    const [cond, test, expect] = pick(rng, t.cases);
    const samples = assignments(t.vars, t.ints ? INTS : REALS, test);
    const answer = decideBySampling(samples, t.fa, t.fb);
    const why = {
      A: 'For every value allowed by the condition, A comes out larger.',
      B: 'For every value allowed by the condition, B comes out larger.',
      equal: 'The two are the same for every allowed value.',
      cannot: 'Some allowed values make A larger and others do not — try a few (a fraction, a negative, a large number).'
    }[answer];
    return { kind: 'qc', cond: `${cond}`, a: t.a, b: t.b, answer, expect, why, vars: t.vars };
  }
  const t = pickTier(rng, NUM_TEMPLATES, tier);
  const r = t.gen(rng);
  return { kind: 'qc', cond: r.cond, a: r.a, b: r.b, answer: r.answer, expect: r.answer, why: r.why, sample: r.sample };
};

export const makeWordRound = (rng, tier) => {
  const t = pickTier(rng, WORD, tier);
  return { kind: 'word', ...t.gen(rng) };
};

export const makeQuantLevel = (rng, config) => {
  const nWord = Math.max(1, Math.round(config.rounds * config.word));
  const kinds = shuffle(rng, [...Array(nWord).fill('word'), ...Array(config.rounds - nWord).fill('qc')]);
  const seen = new Set();
  return kinds.map((k) => {
    let r;
    for (let i = 0; i < 12; i++) {
      r = k === 'word' ? makeWordRound(rng, config.tier) : makeQcRound(rng, config.tier);
      const key = k === 'word' ? r.text : `${r.cond}|${r.a}|${r.b}`;
      if (!seen.has(key)) { seen.add(key); break; }
    }
    return r;
  });
};

/** Parse typed numbers: "1,200", "−3.5", "12%". NaN when not a number. */
export const parseNumber = (text) => {
  const clean = String(text ?? '').replace(/[,\s₹%]/g, '').replace(/[−–]/g, '-');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(clean)) return NaN;
  return Number(clean);
};

/** Is a typed answer right? Within 0.01 of the answer (rounded to 2 decimals). */
export const checkQuant = (round, input) => {
  if (round.kind === 'qc') return input === round.answer;
  const v = parseNumber(input);
  return Number.isFinite(v) && Math.abs(v - round.answer) <= 0.011;
};

/** For tests: re-decide a variable qc round by sampling a denser grid. */
export const VAR_TEMPLATE_LIST = VAR_TEMPLATES;
export const REAL_VALUES = REALS;
export const INT_VALUES = INTS;
export const sampleAssignments = assignments;
