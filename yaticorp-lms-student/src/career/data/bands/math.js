/**
 * Age-band content for the five maths games (2026-11-13): Math Sprint, Running Total, Percent Snap, Speed Sort and
 * Number Forge. Plain JS, so tests/games/mathBands.test.js can deal thousands of rounds per band and check them.
 *
 * Every game reads the student's age band (levels.js `progress.ageBand`; null plays as 'analytical', the old game)
 * and its difficulty / levelNo inside that band. `heatOf` turns those into 0..1 *inside the band* and `tierOf` into
 * three steps (0, 1, 2), so a band always opens gently and climbs to its own top — Classes 1–2 never meet ×, and
 * Classes 11–12 never sit on times tables.
 *
 * Rules held by every generator: answers are whole and checked, options are distinct and include the answer, wrong
 * options are near misses (a common slip) rather than nonsense, and every Number Forge round is built backwards so it
 * has a solution.
 */
import { BANDS } from '../../components/games/zones.js';

export const BAND_KEYS = ['foundation', 'developing', 'intermediate', 'analytical', 'advanced'];
export const bandKey = (band) => (BAND_KEYS.includes(band) ? band : 'analytical');
export const isYoung = (band) => band === 'foundation' || band === 'developing';

/** How far through its own band a level sits, 0..1. */
export const heatOf = (band, difficulty = 1, levelNo = 1) => {
  const b = BANDS[bandKey(band)] || { minDifficulty: 1, maxDifficulty: 3, maxStep: 30 };
  const along = (Math.min(Math.max(1, levelNo), b.maxStep) - 1) / Math.max(1, b.maxStep - 1);
  const h = (difficulty - b.minDifficulty + along) / (b.maxDifficulty - b.minDifficulty + 1);
  return Math.min(1, Math.max(0, h));
};
export const tierOf = (heat) => (heat < 0.34 ? 0 : heat < 0.67 ? 1 : 2);
const lerp = (a, b, heat) => Math.round(a + (b - a) * heat);

/* ---- small helpers ---------------------------------------------------- */
const int = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const chance = (rng, p) => rng() < p;
export const shuffle = (rng, list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
export const gcd = (a, b) => {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};
const nonZero = (rng, a, b) => { let v = 0; while (v === 0) v = int(rng, a, b); return v; };

/** A signed number as shown: −7 with a true minus sign. */
export const fmt = (n) => (n < 0 ? `−${-n}` : String(n));
/** A signed number inside an expression: negatives in brackets. */
const par = (n) => (n < 0 ? `(${fmt(n)})` : fmt(n));
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
export const sup = (k) => (k < 0 ? '⁻' : '') + String(Math.abs(k)).split('').map((c) => SUP[c]).join('');

/**
 * Four (or `count`) distinct whole-number options: the answer, the likely slips first, then near misses, widening
 * until there are enough. Never the answer twice, never outside [min, max].
 */
export const numberOptions = (rng, answer, { mistakes = [], count = 4, min = -Infinity, max = Infinity, near = [1, -1, 2, -2, 10, -10] } = {}) => {
  const out = [answer];
  const ok = (v) => Number.isInteger(v) && v >= min && v <= max && !out.includes(v);
  for (const v of shuffle(rng, mistakes)) if (out.length < count && ok(v)) out.push(v);
  for (let i = 0; i < 40 && out.length < count; i++) {
    const v = answer + pick(rng, near);
    if (ok(v)) out.push(v);
  }
  for (let k = 1; out.length < count && k < 10000; k++) {
    for (const v of [answer + k, answer - k]) if (out.length < count && ok(v)) out.push(v);
  }
  return shuffle(rng, out);
};

/* ======================================================================
 * Math Sprint
 * ==================================================================== */
const EMOJI = ['🍎', '⭐', '🐟', '🌸', '🎈', '🍪', '🐥', '🚗'];

const PACE = {
  foundation: { seconds: 90, target: [5, 7], choices: 3 },
  developing: { seconds: 75, target: [6, 9], choices: 4 },
  intermediate: { seconds: 75, target: [6, 9], choices: 4 },
  analytical: { seconds: 80, target: [5, 8], choices: 4 },
  advanced: { seconds: 90, target: [5, 8], choices: 4 }
};

export const sprintConfig = (band, difficulty, levelNo) => {
  const key = bandKey(band);
  const heat = heatOf(key, difficulty, levelNo);
  const p = PACE[key];
  return { band: key, heat, tier: tierOf(heat), seconds: p.seconds, target: lerp(p.target[0], p.target[1], heat), choices: p.choices };
};

const sprintFoundation = (rng, tier, count) => {
  const emoji = pick(rng, EMOJI);
  if ((tier === 0 && chance(rng, 0.55)) || (tier === 1 && chance(rng, 0.2))) {
    const n = int(rng, 3, tier === 0 ? 8 : 10);
    return {
      kind: 'count', text: `How many ${emoji}?`, answer: n, pic: { emoji, a: n },
      explain: `Count them one by one: there are ${n}.`,
      options: numberOptions(rng, n, { count, min: 1, max: 20, near: [1, -1, 2, -2] })
    };
  }
  const cap = [5, 10, 20][tier];
  if (tier > 0 && chance(rng, 0.45)) {
    const a = int(rng, 3, cap);
    const b = int(rng, 1, Math.min(a - 1, 10));
    const ans = a - b;
    return {
      kind: 'expr', text: `${a} − ${b}`, answer: ans, pic: { emoji, a, b, op: '−' },
      explain: `${a} take away ${b} leaves ${ans}.`,
      options: numberOptions(rng, ans, { mistakes: [a + b, ans + 1, ans - 1], count, min: 0, max: 20, near: [1, -1, 2, -2] })
    };
  }
  const a = int(rng, 1, cap - 1);
  const b = int(rng, 1, Math.min(cap - a, 10));
  const ans = a + b;
  return {
    kind: 'expr', text: `${a} + ${b}`, answer: ans, pic: { emoji, a, b, op: '+' },
    explain: `${a} and ${b} more makes ${ans}.`,
    options: numberOptions(rng, ans, { mistakes: [ans + 1, ans - 1, Math.abs(a - b)], count, min: 0, max: 20, near: [1, -1, 2, -2] })
  };
};

const sprintDeveloping = (rng, tier, count) => {
  const op = pick(rng, [['+', '+', '−', '−', '×'], ['+', '−', '×', '×', '÷'], ['+', '−', '×', '÷', '÷']][tier]);
  const tables = tier === 0 ? [2, 5, 10] : [2, 3, 4, 5, 6, 7, 8, 9, 10];
  let text, ans, mistakes, explain;
  if (op === '+') {
    const a = int(rng, 11, 89);
    const b = tier === 0 ? int(rng, 2, Math.min(9, 100 - a)) : int(rng, 10, 100 - a);
    ans = a + b; text = `${a} + ${b}`;
    mistakes = [ans - 10, ans + 10, ans + 1, ans - 1];
    explain = `Tens then ones: ${a} + ${b} = ${ans}.`;
  } else if (op === '−') {
    const a = int(rng, 20, 100);
    const b = tier === 0 ? int(rng, 2, 9) : int(rng, 11, a - 5);
    ans = a - b; text = `${a} − ${b}`;
    mistakes = [ans + 10, ans - 10, ans + 1, ans - 1];
    explain = `${a} − ${b} = ${ans}. Check: ${ans} + ${b} = ${a}.`;
  } else if (op === '×') {
    const t = pick(rng, tables);
    const f = int(rng, 2, 10);
    ans = t * f; text = chance(rng, 0.5) ? `${t} × ${f}` : `${f} × ${t}`;
    mistakes = [t * (f + 1), t * (f - 1), t + f, ans + 1];
    explain = `${f} groups of ${t} make ${ans}.`;
  } else {
    const d = pick(rng, tables);
    const q = int(rng, 2, 10);
    ans = q; text = `${d * q} ÷ ${d}`;
    mistakes = [q + 1, q - 1, q + 2, d];
    explain = `${d} × ${q} = ${d * q}, so ${d * q} ÷ ${d} = ${q}.`;
  }
  return { kind: 'expr', text, answer: ans, explain, options: numberOptions(rng, ans, { mistakes, count, min: 0, max: 100 }) };
};

const sprintIntermediate = (rng, tier, count) => {
  let text, ans, mistakes = [], explain;
  const form = tier === 0 ? pick(rng, ['+', '−', '+', '−', '×']) : tier === 1 ? pick(rng, ['s×', 's÷', '+', '−']) : pick(rng, ['(a+b)×c', 'a×b−c', '(a−b)÷c', 's×', 's÷']);
  if (form === '+' || form === '−') {
    let a = nonZero(rng, -20, 20);
    let b = nonZero(rng, -20, 20);
    if (a > 0 && b > 0) a = -a;                      // always a negative in play
    ans = form === '+' ? a + b : a - b;
    text = `${fmt(a)} ${form} ${par(b)}`;
    mistakes = [-ans, form === '+' ? a - b : a + b, ans + 1, ans - 1];
    explain = form === '−' && b < 0 ? `Taking away ${fmt(b)} is adding ${-b}: ${ans}.` : `${text} = ${fmt(ans)}.`;
  } else if (form === '×') {
    const a = int(rng, 3, 12), b = int(rng, 6, 12);
    ans = a * b; text = `${a} × ${b}`;
    mistakes = [a * (b + 1), a * (b - 1), ans + 10, ans - 10];
    explain = `${a} × ${b} = ${ans}.`;
  } else if (form === 's×') {
    const a = nonZero(rng, -12, 12), b = nonZero(rng, -9, 9);
    ans = a * b; text = `${fmt(a)} × ${par(b)}`;
    mistakes = [-ans, ans + a, ans - a];
    explain = `${(a < 0) === (b < 0) ? 'Same signs give +' : 'Different signs give −'}: ${fmt(ans)}.`;
  } else if (form === 's÷') {
    const d = nonZero(rng, -9, 9), q = nonZero(rng, -12, 12);
    const a = d * q;
    ans = q; text = `${fmt(a)} ÷ ${par(d)}`;
    mistakes = [-ans, ans + 1, ans - 1];
    explain = `${par(d)} × ${par(q)} = ${fmt(a)}, so the answer is ${fmt(q)}.`;
  } else if (form === '(a+b)×c') {
    const a = nonZero(rng, -10, 10), b = nonZero(rng, -10, 10), c = int(rng, 2, 9);
    ans = (a + b) * c; text = `(${fmt(a)} + ${par(b)}) × ${c}`;
    mistakes = [a + b * c, -ans, ans + c, ans - c];
    explain = `Brackets first: ${fmt(a)} + ${par(b)} = ${fmt(a + b)}, then × ${c} = ${fmt(ans)}.`;
  } else if (form === 'a×b−c') {
    const a = int(rng, 2, 12), b = nonZero(rng, -9, 9), c = int(rng, 2, 30);
    ans = a * b - c; text = `${a} × ${par(b)} − ${c}`;
    mistakes = [a * (b - c), a * b + c, ans + 1, ans - 1];
    explain = `× first: ${a} × ${par(b)} = ${fmt(a * b)}, then − ${c} = ${fmt(ans)}.`;
  } else {
    const c = int(rng, 2, 9), q = nonZero(rng, -10, 10), b = nonZero(rng, -10, 10);
    const a = q * c + b;
    ans = q; text = `(${fmt(a)} − ${par(b)}) ÷ ${c}`;
    mistakes = [-ans, ans + 1, ans - 1, (a + b) % c === 0 ? (a + b) / c : ans + 2];
    explain = `Brackets first: ${fmt(a)} − ${par(b)} = ${fmt(a - b)}, then ÷ ${c} = ${fmt(ans)}.`;
  }
  return { kind: 'expr', text, answer: ans, explain, options: numberOptions(rng, ans, { mistakes, count }) };
};

const sprintAnalytical = (rng, tier, count) => {
  const form = pick(rng, [['a+b×c', 'n²', 'a−b×c', 'n²', 'a+b×c'], ['a×b−c×d', 'a−b÷c', 'n²−m', '(a+b)²', 'a+b×c'], ['a×(b−c)+d', 'a²−b²', '(a−b)²+c', 'a×b−c×d', 'a−b÷c']][tier]);
  let text, ans, mistakes = [], explain;
  if (form === 'a+b×c' || form === 'a−b×c') {
    const a = int(rng, 2, 30), b = int(rng, 2, 12), c = int(rng, 2, 12);
    const plus = form === 'a+b×c';
    ans = plus ? a + b * c : a - b * c;
    text = `${a} ${plus ? '+' : '−'} ${b} × ${c}`;
    mistakes = [plus ? (a + b) * c : (a - b) * c, ans + 1, ans - 1, ans + 10];
    explain = `× before ${plus ? '+' : '−'}: ${b} × ${c} = ${b * c}, then ${a} ${plus ? '+' : '−'} ${b * c} = ${fmt(ans)}.`;
  } else if (form === 'n²') {
    const n = int(rng, 4, 20);
    ans = n * n; text = `${n}²`;
    mistakes = [n * 2, (n + 1) * (n + 1), (n - 1) * (n - 1), ans + 10];
    explain = `${n}² means ${n} × ${n} = ${ans}.`;
  } else if (form === 'a×b−c×d') {
    const a = int(rng, 2, 12), b = int(rng, 2, 12), c = int(rng, 2, 9), d = int(rng, 2, 9);
    ans = a * b - c * d; text = `${a} × ${b} − ${c} × ${d}`;
    mistakes = [(a * b - c) * d, -ans, ans + 1, ans - 1];
    explain = `Both × first: ${a * b} − ${c * d} = ${fmt(ans)}.`;
  } else if (form === 'a−b÷c') {
    const c = int(rng, 2, 9), q = int(rng, 2, 12), a = int(rng, 10, 60);
    ans = a - q; text = `${a} − ${q * c} ÷ ${c}`;
    mistakes = [(a - q * c) % c === 0 ? (a - q * c) / c : ans + 2, ans + 1, ans - 1, a - c];
    explain = `÷ first: ${q * c} ÷ ${c} = ${q}, then ${a} − ${q} = ${fmt(ans)}.`;
  } else if (form === 'n²−m') {
    const n = int(rng, 6, 15), m = int(rng, 5, 60);
    ans = n * n - m; text = `${n}² − ${m}`;
    mistakes = [2 * n - m, ans + 10, ans - 10, ans + 1];
    explain = `${n}² = ${n * n}, then − ${m} = ${fmt(ans)}.`;
  } else if (form === '(a+b)²') {
    const a = int(rng, 2, 9), b = int(rng, 2, 9);
    ans = (a + b) ** 2; text = `(${a} + ${b})²`;
    mistakes = [a * a + b * b, 2 * (a + b), ans + 1, ans - 1];
    explain = `Brackets first: ${a + b}, then ${a + b}² = ${ans}.`;
  } else if (form === 'a×(b−c)+d') {
    const a = int(rng, 2, 9), b = int(rng, 2, 15), c = int(rng, 2, 15), d = int(rng, 2, 30);
    ans = a * (b - c) + d; text = `${a} × (${b} − ${c}) + ${d}`;
    mistakes = [a * b - c + d, a * (b - c + d), -ans, ans + 1];
    explain = `Brackets: ${b} − ${c} = ${fmt(b - c)}; × ${a} = ${fmt(a * (b - c))}; + ${d} = ${fmt(ans)}.`;
  } else if (form === 'a²−b²') {
    const a = int(rng, 5, 15), b = int(rng, 2, a - 1);
    ans = a * a - b * b; text = `${a}² − ${b}²`;
    mistakes = [(a - b) ** 2, 2 * (a - b), ans + 1, ans - 1];
    explain = `${a * a} − ${b * b} = ${ans} (or (${a} − ${b})(${a} + ${b})).`;
  } else {
    const a = int(rng, 3, 15), b = int(rng, 1, 12), c = int(rng, -20, 20);
    ans = (a - b) ** 2 + c; text = `(${a} − ${b})² ${c < 0 ? '−' : '+'} ${Math.abs(c)}`;
    mistakes = [a * a - b * b + c, 2 * (a - b) + c, ans + 1, ans - 1];
    explain = `Brackets: ${a - b}; squared ${(a - b) ** 2}; ${c < 0 ? '−' : '+'} ${Math.abs(c)} = ${fmt(ans)}.`;
  }
  return { kind: 'expr', text, answer: ans, explain, options: numberOptions(rng, ans, { mistakes, count }) };
};

const PCT = [15, 35, 45, 55, 65, 75, 120, 125, 150, 12, 24, 5];
const pctOf = (rng, maxN) => {
  const p = pick(rng, PCT);
  const step = 100 / gcd(p, 100);
  const n = step * int(rng, Math.max(1, Math.ceil(20 / step)), Math.max(Math.ceil(20 / step), Math.floor(maxN / step)));
  return { p, n, v: (p * n) / 100 };
};

const sprintAdvanced = (rng, tier, count) => {
  const form = pick(rng, [['p%', '2ᵏ', 'n³', 'p%'], ['(a+b)×(c−d)', 'xᵏ+yᵐ', '√n×k', 'p%'], ['(a²−b²)÷(a+b)', 'p%+q%', '2ᵏ−√n', '(a+b)×(c−d)', 'xᵏ+yᵐ']][tier]);
  let text, ans, mistakes = [], explain;
  if (form === 'p%') {
    const { p, n, v } = pctOf(rng, 800);
    ans = v; text = `${p}% of ${n}`;
    mistakes = [n - v, v + n / 10, v - n / 10, v + 5, v * 2];
    explain = `${p}% = ${p}/100, so ${n} × ${p} ÷ 100 = ${v}.`;
  } else if (form === '2ᵏ') {
    const k = int(rng, 5, 10);
    ans = 2 ** k; text = `2${sup(k)}`;
    mistakes = [2 * k, 2 ** (k - 1), 2 ** (k + 1), ans + 2];
    explain = `Double ${k} times: 2${sup(k)} = ${ans}.`;
  } else if (form === 'n³') {
    const n = int(rng, 3, 10);
    ans = n ** 3; text = `${n}³`;
    mistakes = [3 * n, n * n, (n + 1) ** 3, (n - 1) ** 3];
    explain = `${n} × ${n} × ${n} = ${ans}.`;
  } else if (form === '(a+b)×(c−d)') {
    const a = int(rng, 2, 15), b = int(rng, 2, 15), c = int(rng, 2, 15), d = int(rng, 2, 15);
    ans = (a + b) * (c - d); text = `(${a} + ${b}) × (${c} − ${d})`;
    mistakes = [a + b * c - d, -ans, ans + (a + b), ans - (a + b)];
    explain = `${a + b} × ${fmt(c - d)} = ${fmt(ans)}.`;
  } else if (form === 'xᵏ+yᵐ') {
    const [x, k] = pick(rng, [[2, int(rng, 3, 8)], [3, int(rng, 2, 4)], [5, int(rng, 2, 3)]]);
    const [y, m] = pick(rng, [[4, 2], [6, 2], [7, 2], [2, 3], [3, 3], [4, 3], [10, 3]]);
    ans = x ** k + y ** m; text = `${x}${sup(k)} + ${y}${sup(m)}`;
    mistakes = [x * k + y * m, x ** k + y * m, x * k + y ** m, ans + 1];
    explain = `${x}${sup(k)} = ${x ** k}, ${y}${sup(m)} = ${y ** m}; together ${ans}.`;
  } else if (form === '√n×k') {
    const r = int(rng, 4, 15), k = int(rng, 3, 12);
    ans = r * k; text = `√${r * r} × ${k}`;
    mistakes = [r * r * k, (r + 1) * k, (r - 1) * k, ans + k + 1];
    explain = `√${r * r} = ${r}, then × ${k} = ${ans}.`;
  } else if (form === '(a²−b²)÷(a+b)') {
    const a = int(rng, 6, 20), b = int(rng, 2, a - 1);
    ans = a - b; text = `(${a}² − ${b}²) ÷ (${a} + ${b})`;
    mistakes = [a + b, ans + 1, ans - 1, ans * 2];
    explain = `a² − b² = (a − b)(a + b), so it is ${a} − ${b} = ${ans}.`;
  } else if (form === 'p%+q%') {
    const A = pctOf(rng, 400);
    let B = pctOf(rng, 400);
    for (let i = 0; i < 10 && B.p === A.p; i++) B = pctOf(rng, 400);
    ans = A.v + B.v; text = `${A.p}% of ${A.n} + ${B.p}% of ${B.n}`;
    mistakes = [ans + 5, ans - 5, ans + 10, ans - 10, A.v + B.n - B.v];
    explain = `${A.v} + ${B.v} = ${ans}.`;
  } else {
    const k = int(rng, 5, 9), r = int(rng, 3, 12);
    ans = 2 ** k - r; text = `2${sup(k)} − √${r * r}`;
    mistakes = [2 ** k - r * r, 2 * k - r, ans + 2, ans - 2];
    explain = `2${sup(k)} = ${2 ** k}, √${r * r} = ${r}; ${2 ** k} − ${r} = ${ans}.`;
  }
  return { kind: 'expr', text, answer: ans, explain, options: numberOptions(rng, ans, { mistakes, count }) };
};

const SPRINT = { foundation: sprintFoundation, developing: sprintDeveloping, intermediate: sprintIntermediate, analytical: sprintAnalytical, advanced: sprintAdvanced };

/** One Math Sprint question for a config from sprintConfig. */
export const sprintQuestion = (cfg, rng = Math.random) => SPRINT[cfg.band](rng, cfg.tier, cfg.choices);

/* ======================================================================
 * Running Total
 * ==================================================================== */
export const runningConfig = (band, difficulty, levelNo) => {
  const key = bandKey(band);
  const heat = heatOf(key, difficulty, levelNo);
  const tier = tierOf(heat);
  const L = (a, b) => lerp(a, b, heat);
  const base = { band: key, heat, tier, rounds: 3, choices: 4 };
  if (key === 'foundation') return { ...base, mode: 'plain', length: L(3, 4), lo: 1, hi: tier === 0 ? 3 : 4, ops: ['+'], min: 0, max: 16, stepMs: L(2600, 1900), dots: true, choices: 3 };
  if (key === 'developing') return { ...base, mode: 'plain', length: L(4, 6), lo: 2, hi: L(9, 15), ops: ['+', '−'], min: 0, max: 50, stepMs: L(1600, 1100) };
  if (key === 'intermediate') return { ...base, mode: 'plain', length: L(5, 8), lo: 2, hi: L(12, 20), ops: ['+', '−'], min: -50, max: 50, stepMs: L(1400, 900) };
  if (key === 'analytical') return { ...base, mode: 'plain', length: L(5, 8), lo: 2, hi: L(10, 20), ops: ['+', '−', '×', '÷'], min: -100, max: 100, stepMs: L(1500, 1000) };
  // Master Minds (Running Total Pro, 2026-11-19, the user: "short and small at the start, then increase"): level 1 is
  // three small + and − numbers; each level adds a little — longer runs, bigger numbers, then × ÷ and two totals.
  const g = Math.max(0, Math.min(1, ((levelNo || 1) - 1 + ((difficulty || 1) - 1) * 10) / 29));
  const mode = g < 0.25 ? 'plain' : g < 0.5 ? 'alternate' : g < 0.75 ? 'mixed' : 'lanes';
  return {
    ...base, mode, length: Math.round(3 + 6 * g), lo: 1, hi: Math.round(5 + 10 * g),
    ops: mode === 'plain' ? ['+', '−'] : ['+', '−', '×', '÷'], min: mode === 'plain' ? 0 : -150, max: mode === 'plain' ? 40 : 150,
    stepMs: Math.round(1900 - 750 * g)
  };
};

/** a op v for a Running Total step. */
export const stepApply = (total, { op, value }) => (op === '+' ? total + value : op === '−' ? total - value : op === '×' ? total * value : total / value);

const chainTry = (cfg, rng, mode) => {
  let total = 0;
  const steps = [];
  const path = [0];
  const cycle = ['+', '×', '−', '÷'];
  for (let i = 0; i < cfg.length; i++) {
    let op;
    let value;
    if (mode === 'alternate') {
      op = cycle[i % 4];
      if (op === '×') value = pick(rng, [2, 3]);
      else if (op === '÷') {
        const ds = [2, 3, 4, 5].filter((d) => total !== 0 && total % d === 0);
        if (!ds.length) return null;
        value = pick(rng, ds);
      } else value = int(rng, cfg.lo, cfg.hi);
    } else if (cfg.band === 'analytical') {
      const can = ['+', '+', '−', '−'];
      if (i > 0 && total !== 0 && Math.abs(total * 2) <= cfg.max) can.push('×');
      if (i > 0 && total !== 0 && total % 2 === 0) can.push('÷');
      op = pick(rng, can);
      value = op === '×' || op === '÷' ? 2 : int(rng, cfg.lo, cfg.hi);
    } else {
      value = int(rng, cfg.lo, cfg.hi);
      op = cfg.ops.includes('−') && i > 0 && chance(rng, 0.4) ? '−' : '+';
      if (cfg.min === 0 && op === '−' && total - value < 0) op = '+';
      if (op === '+' && total + value > cfg.max) {
        if (cfg.ops.includes('−') && total - value >= cfg.min) op = '−';
        else return null;
      }
      if (cfg.band === 'intermediate' && i === 0 && chance(rng, 0.3)) op = '−';
    }
    const next = stepApply(total, { op, value });
    if (!Number.isInteger(next) || next < cfg.min || next > cfg.max) return null;
    total = next;
    steps.push({ op, value, lane: null });
    path.push(total);
  }
  if (cfg.band === 'analytical' && !steps.some((s) => s.op === '×' || s.op === '÷')) return null;
  if (cfg.band === 'intermediate' && !path.some((t) => t < 0)) return null;
  return { mode, steps, total, path, ask: null };
};

const lanesTry = (cfg, rng) => {
  const t = { A: 0, B: 0 };
  const paths = { A: [0], B: [0] };
  const steps = [];
  for (let i = 0; i < cfg.length; i++) {
    const lane = i < 2 ? (i === 0 ? 'A' : 'B') : pick(rng, ['A', 'B']);
    let op = paths[lane].length > 1 && chance(rng, 0.4) ? '−' : '+';
    let value = int(rng, cfg.lo, cfg.hi);
    if (cfg.tier === 2 && paths[lane].length > 1 && chance(rng, 0.2) && t[lane] * 2 <= 60) { op = '×'; value = 2; }
    if (op === '−' && t[lane] - value < 0) op = '+';
    const next = stepApply(t[lane], { op, value });
    if (next > 60) return null;
    t[lane] = next;
    paths[lane].push(next);
    steps.push({ op, value, lane });
  }
  if (paths.A.length < 3 || paths.B.length < 3) return null;
  const ask = pick(rng, ['A', 'B']);
  return { mode: 'lanes', steps, total: t[ask], path: paths[ask], other: t[ask === 'A' ? 'B' : 'A'], paths, ask };
};

export const LANE_NAME = { A: 'Blue', B: 'Orange' };

/** One stream for a Running Total round: steps, the total asked for, options and the working. */
export const runningStream = (cfg, rng = Math.random) => {
  const mode = cfg.mode === 'mixed' ? (chance(rng, 0.5) ? 'alternate' : 'lanes') : cfg.mode;
  let s = null;
  for (let tries = 0; tries < 2000 && !s; tries++) s = mode === 'lanes' ? lanesTry(cfg, rng) : chainTry(cfg, rng, mode);
  if (!s) s = { mode: 'plain', steps: [{ op: '+', value: 2, lane: null }, { op: '+', value: 1, lane: null }], total: 3, path: [0, 2, 3], ask: null, fallback: true };
  const before = s.path[s.path.length - 2];
  const last = s.steps.filter((x) => (s.ask ? x.lane === s.ask : true)).at(-1);
  const signSlip = last.op === '+' ? s.total - 2 * last.value : last.op === '−' ? s.total + 2 * last.value : s.total + 1;
  const mistakes = [before, signSlip, s.total + 1, s.total - 1];
  if (s.mode === 'lanes') mistakes.push(s.other, s.total + s.other);
  const options = numberOptions(rng, s.total, { mistakes, count: cfg.choices, min: s.mode === 'lanes' ? 0 : cfg.min, max: cfg.max + 20, near: [1, -1, 2, -2, 3, -3] });
  const shown = (path) => path.map(fmt).join(' → ');
  let explain;
  if (cfg.band === 'foundation') explain = `${s.steps.map((x) => x.value).join(' + ')} = ${s.total}`;
  else if (s.mode === 'lanes') explain = `${LANE_NAME[s.ask]}: ${shown(s.path)}`;
  else explain = shown(s.path);
  return { ...s, options, explain };
};

/* ======================================================================
 * Percent Snap — parts, fractions, percentages
 * ==================================================================== */
const SNAP_PACE = {
  foundation: { seconds: 90, target: [4, 6], choices: 3 },
  developing: { seconds: 80, target: [5, 8], choices: 4 },
  intermediate: { seconds: 60, target: [6, 10], choices: 4 },
  analytical: { seconds: 75, target: [5, 8], choices: 4 },
  advanced: { seconds: 90, target: [4, 7], choices: 4 }
};
export const percentConfig = (band, difficulty, levelNo) => {
  const key = bandKey(band);
  const heat = heatOf(key, difficulty, levelNo);
  const p = SNAP_PACE[key];
  return { band: key, heat, tier: tierOf(heat), seconds: p.seconds, target: lerp(p.target[0], p.target[1], heat), choices: p.choices };
};

const sameFrac = ([a, b], [c, d]) => a * d === b * c;
const fracOptions = (rng, k, n, extra, count, maxDen) => {
  const out = [[k, n]];
  const add = ([a, b]) => { if (a > 0 && a < b && !out.some((o) => sameFrac(o, [a, b]))) out.push([a, b]); };
  for (const c of shuffle(rng, extra)) if (out.length < count) add(c);
  const pool = [];
  for (let d = 2; d <= maxDen; d++) for (let a = 1; a < d; a++) pool.push([a, d]);
  for (const c of shuffle(rng, pool)) if (out.length < count) add(c);
  return shuffle(rng, out).map(([a, b]) => ({ id: `${a}/${b}`, label: `${a}/${b}`, value: [a, b] }));
};
const numOpts = (rng, ans, o, label = String) => numberOptions(rng, ans, o).map((v) => ({ id: label(v), label: label(v), value: v }));
const money = (v) => `₹${v}`;
const signedPct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%`;
const PART_NAME = { 2: 'halves', 3: 'thirds', 4: 'quarters' };
const UNEQUAL = { 2: [1, 2], 3: [1, 1, 2], 4: [1, 1, 1, 2] };

const shadedQ = (rng, n, count, maxDen) => {
  const k = int(rng, 1, n - 1);
  const shape = pick(rng, ['circle', 'rect']);
  return {
    kind: 'shaded', prompt: 'How much is coloured?', pic: { shape, parts: Array(n).fill(1), shaded: Array.from({ length: k }, (_, i) => i) },
    answer: `${k}/${n}`, data: { k, n },
    explain: `${k} of ${n} equal parts are coloured: ${k}/${n}.`,
    options: fracOptions(rng, k, n, [[n - k, n], [1, n], [k, n + 1], [k + 1, n], [k, n - k]], count, maxDen)
  };
};

const snapFoundation = (rng, tier, count) => {
  if (tier === 0 || chance(rng, tier === 1 ? 0.5 : 0.35)) {
    const n = tier === 0 ? pick(rng, [2, 2, 4]) : pick(rng, [2, 3, 4]);
    const shape = pick(rng, ['circle', 'rect']);
    const others = [2, 3, 4].filter((x) => x !== n);
    const pics = [
      { shape, parts: Array(n).fill(1), shaded: [] },
      { shape, parts: shuffle(rng, UNEQUAL[n]), shaded: [] },
      { shape, parts: Array(pick(rng, others)).fill(1), shaded: [] }
    ];
    const options = shuffle(rng, pics.slice(0, count).map((pic) => ({ id: pic.parts.join('-'), pic })));
    return {
      kind: 'equal', prompt: `Which one shows ${PART_NAME[n]}?`, sub: `${n} equal parts`,
      answer: Array(n).fill(1).join('-'), data: { n },
      explain: `${PART_NAME[n][0].toUpperCase()}${PART_NAME[n].slice(1)}: ${n} parts, all the same size.`,
      options
    };
  }
  return shadedQ(rng, pick(rng, tier === 1 ? [2, 4] : [2, 3, 4]), count, 4);
};

const snapDeveloping = (rng, tier, count) => {
  if (chance(rng, 0.4)) return shadedQ(rng, pick(rng, tier === 0 ? [2, 3, 4] : [2, 3, 4, 5, 6, 8]), count, 8);
  let n, k, N;
  if (tier === 0) { n = pick(rng, [2, 4]); k = 1; N = n * int(rng, 2, 5); }
  else if (tier === 1) { n = pick(rng, [2, 3, 4, 5, 10]); k = 1; N = n * int(rng, 2, n === 10 ? 4 : 8); }
  else { n = pick(rng, [3, 4, 5]); k = n === 4 ? 3 : int(rng, 2, n - 1); N = n * int(rng, 2, 8); }
  const each = N / n;
  const ans = each * k;
  return {
    kind: 'ofNumber', prompt: k === 1 ? `Share ${N} into ${n} equal groups. How many in one?` : `What is ${k}/${n} of ${N}?`,
    line: `${k}/${n} of ${N}`, pic: { groups: n, per: each, take: k }, answer: String(ans), data: { k, n, N },
    explain: k === 1 ? `${N} ÷ ${n} = ${each}.` : `${N} ÷ ${n} = ${each}, and ${k} groups make ${ans}.`,
    options: numOpts(rng, ans, { mistakes: [each, N - ans, each * (k + 1), ans + 1, ans - 1], count, min: 1, max: N })
  };
};

const pctWords = (p, n, v) => ({
  50: `50% is half: ${n} ÷ 2 = ${v}.`, 25: `25% is a quarter: ${n} ÷ 4 = ${v}.`, 10: `10% is ${n} ÷ 10 = ${v}.`,
  20: `20% is ${n} ÷ 5 = ${v}.`, 5: `5% is half of 10%: ${n / 10} ÷ 2 = ${v}.`, 75: `75% is three quarters: ${n} ÷ 4 × 3 = ${v}.`
}[p] || `${n} × ${p} ÷ 100 = ${v}.`);

const snapIntermediate = (rng, tier, count) => {
  const p = pick(rng, [[10, 50], [10, 25, 50], [5, 10, 20, 25, 50, 75]][tier]);
  const step = 100 / gcd(p, 100);
  const maxN = [100, 200, 400][tier];
  const N = step * int(rng, Math.ceil(20 / step), Math.floor(maxN / step));
  const v = (p * N) / 100;
  return {
    kind: 'pctOf', prompt: 'Work it out', line: `${p}% of ${N}`, answer: String(v), data: { p, N },
    explain: pctWords(p, N, v),
    options: numOpts(rng, v, { mistakes: [N - v, v * 2, v / 2, N / p, v + N / 10, v - N / 10], count, min: 1 })
  };
};

/** N, a multiple that makes N × p / 100 whole, within [lo, hi]. */
const baseFor = (rng, p, lo, hi) => {
  const step = 100 / gcd(p, 100);
  return step * int(rng, Math.max(1, Math.ceil(lo / step)), Math.max(1, Math.floor(hi / step)));
};

const snapAnalytical = (rng, tier, count) => {
  const kind = pick(rng, [['change'], ['change', 'pctChange'], ['change', 'pctChange', 'reverse']][tier]);
  if (kind === 'change') {
    const p = pick(rng, tier === 0 ? [10, 20, 25, 50] : [5, 10, 15, 20, 25, 30, 40, 60]);
    const N = baseFor(rng, p, 40, 600);
    const up = chance(rng, 0.5);
    const d = (N * p) / 100;
    const ans = up ? N + d : N - d;
    return {
      kind, prompt: 'New value?', line: `${N} ${up ? 'increased' : 'decreased'} by ${p}%`, answer: String(ans), data: { N, p, up },
      explain: `${p}% of ${N} = ${d}; ${N} ${up ? '+' : '−'} ${d} = ${ans}.`,
      options: numOpts(rng, ans, { mistakes: [up ? N - d : N + d, d, up ? N + p : N - p, ans + 10, ans - 10], count, min: 1 })
    };
  }
  if (kind === 'pctChange') {
    const p = pick(rng, [10, 20, 25, 40, 50, 75]);
    const up = chance(rng, 0.5);
    const N = baseFor(rng, p, 20, 400);
    const d = (N * p) / 100;
    const M = up ? N + d : N - d;
    const ans = up ? p : -p;
    const onNew = (d * 100) % M === 0 ? (up ? 1 : -1) * ((d * 100) / M) : ans + 5;
    return {
      kind, prompt: 'Percentage change?', line: `${N} → ${M}`, answer: signedPct(ans), data: { N, M },
      explain: `Change ${up ? '+' : '−'}${d} out of the start ${N} = ${signedPct(ans)}.`,
      options: numOpts(rng, ans, { mistakes: [-ans, onNew, ans + 5, ans - 5, ans + 10], count, near: [5, -5, 10, -10] }, signedPct)
    };
  }
  const p = pick(rng, [10, 20, 25, 50]);
  const N = baseFor(rng, p, 40, 400);
  const M = N + (N * p) / 100;
  const wrong = (M * (100 - p)) % 100 === 0 ? (M * (100 - p)) / 100 : N + 10;
  return {
    kind: 'reverse', prompt: 'What was it before?', line: `After a ${p}% rise it is ${M}`, answer: String(N), data: { p, M },
    explain: `${M} is ${100 + p}% of the start: ${M} ÷ ${(100 + p) / 100} = ${N}.`,
    options: numOpts(rng, N, { mistakes: [wrong, M - p, N + 10, N - 10], count, min: 1 })
  };
};

const snapAdvanced = (rng, tier, count) => {
  const kind = pick(rng, [['discount', 'gst', 'successive'], ['discount', 'gst', 'successive', 'interest', 'overall'], ['successive', 'interest', 'overall', 'compound', 'reverseDiscount', 'gst']][tier]);
  if (kind === 'discount') {
    const p = pick(rng, [10, 15, 20, 25, 30, 40]);
    const P = baseFor(rng, p, 200, 5000);
    const off = (P * p) / 100;
    const ans = P - off;
    return {
      kind, prompt: 'Sale price?', line: `${money(P)} with ${p}% off`, answer: money(ans), data: { P, p },
      explain: `${p}% of ${P} = ${off} off; ${P} − ${off} = ${ans}.`,
      options: numOpts(rng, ans, { mistakes: [off, P - p, P + off, ans + 10, ans - 10], count, min: 1 }, money)
    };
  }
  if (kind === 'gst') {
    const r = pick(rng, [5, 12, 18, 28]);
    const P = baseFor(rng, r, 100, 5000);
    const tax = (P * r) / 100;
    const ans = P + tax;
    return {
      kind, prompt: 'Total to pay?', line: `${money(P)} + ${r}% GST`, answer: money(ans), data: { P, r },
      explain: `${r}% of ${P} = ${tax} tax; ${P} + ${tax} = ${ans}.`,
      options: numOpts(rng, ans, { mistakes: [tax, P + r, P - tax, ans + 10, ans - 10], count, min: 1 }, money)
    };
  }
  if (kind === 'successive') {
    for (;;) {
      const p = pick(rng, [10, 20, 25, 50]);
      const q = pick(rng, [10, 20, 25, 40]);
      const N = 20 * int(rng, 5, 100);
      if ((N * (100 + p) * (100 - q)) % 10000 !== 0) continue;
      const ans = (N * (100 + p) * (100 - q)) / 10000;
      const add = (N * (100 + p - q)) / 100;
      return {
        kind, prompt: 'Final value?', line: `${N}: up ${p}%, then down ${q}%`, answer: String(ans), data: { N, p, q },
        explain: `${N} × ${(100 + p) / 100} = ${(N * (100 + p)) / 100}, then × ${(100 - q) / 100} = ${ans}. Not just ${p} − ${q}!`,
        options: numOpts(rng, ans, { mistakes: [Number.isInteger(add) ? add : ans + 10, N, ans + 10, ans - 10], count, min: 1 })
      };
    }
  }
  if (kind === 'interest') {
    const P = 500 * int(rng, 1, 20);
    const r = pick(rng, [4, 5, 6, 8, 10, 12]);
    const t = int(rng, 2, 5);
    const I = (P * r * t) / 100;
    const year = (P * r) / 100;
    return {
      kind, prompt: 'Simple interest?', line: `${money(P)} at ${r}% a year for ${t} years`, answer: money(I), data: { P, r, t },
      explain: `${r}% of ${P} = ${year} a year; × ${t} years = ${I}.`,
      options: numOpts(rng, I, { mistakes: [year, P + I, I + year, I - year], count, min: 1 }, money)
    };
  }
  if (kind === 'overall') {
    const p = 10 * int(rng, 1, 5);
    const q = 10 * int(rng, 1, 5);
    const ans = ((100 + p) * (100 - q) - 10000) / 100;
    return {
      kind, prompt: 'Overall change?', line: `Up ${p}%, then down ${q}%`, answer: signedPct(ans), data: { p, q },
      explain: `${(100 + p) / 100} × ${(100 - q) / 100} = ${(100 + ans) / 100}, so ${signedPct(ans)}.`,
      options: numOpts(rng, ans, { mistakes: [p - q, -ans, ans + 2, ans - 2, ans + 10], count, near: [1, -1, 2, -2, 5, -5] }, signedPct)
    };
  }
  if (kind === 'compound') {
    for (;;) {
      const r = pick(rng, [5, 10, 20]);
      const P = 100 * int(rng, 10, 200);
      if ((P * (100 + r) ** 2) % 10000 !== 0) continue;
      const ans = (P * (100 + r) ** 2) / 10000;
      const simple = (P * (100 + 2 * r)) / 100;
      return {
        kind, prompt: 'Amount after 2 years?', line: `${money(P)} at ${r}% compound interest`, answer: money(ans), data: { P, r },
        explain: `Year 1: ${(P * (100 + r)) / 100}; year 2: + ${r}% again = ${ans}.`,
        options: numOpts(rng, ans, { mistakes: [simple, (P * (100 + r)) / 100, ans + 100, ans - 100], count, min: 1 }, money)
      };
    }
  }
  const p = pick(rng, [10, 20, 25, 40, 50]);
  const N = baseFor(rng, p, 200, 4000);
  const M = N - (N * p) / 100;
  const wrong = (M * (100 + p)) % 100 === 0 ? (M * (100 + p)) / 100 : N + 50;
  return {
    kind: 'reverseDiscount', prompt: 'Price before the sale?', line: `After ${p}% off it costs ${money(M)}`, answer: money(N), data: { p, M },
    explain: `${money(M)} is ${100 - p}% of the price: ${M} ÷ ${(100 - p) / 100} = ${N}.`,
    options: numOpts(rng, N, { mistakes: [wrong, M + p, N + 50, N - 50], count, min: 1 }, money)
  };
};

const SNAP = { foundation: snapFoundation, developing: snapDeveloping, intermediate: snapIntermediate, analytical: snapAnalytical, advanced: snapAdvanced };
export const percentQuestion = (cfg, rng = Math.random) => SNAP[cfg.band](rng, cfg.tier, cfg.choices);

/* ======================================================================
 * Speed Sort — exact values (rationals), never a float tie
 * ==================================================================== */
const rat = (n, d = 1) => {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
};
export const cmpRat = (a, b) => a.n * b.d - b.n * a.d;
const dec = (m, places) => {
  const s = String(Math.abs(m) / 10 ** places);
  return (m < 0 ? '−' : '') + s;
};

export const sortConfig = (band, difficulty, levelNo) => {
  const key = bandKey(band);
  const heat = heatOf(key, difficulty, levelNo);
  const tier = tierOf(heat);
  const L = (a, b) => lerp(a, b, heat);
  const boards = L(5, 8);
  const per = {
    foundation: { count: tier === 0 ? 3 : 4, ms: 15000, restartOnWrong: false },
    developing: { count: L(4, 6), ms: 12000, restartOnWrong: true },
    intermediate: { count: L(5, 6), ms: 12000, restartOnWrong: true },
    analytical: { count: L(5, 6), ms: 14000, restartOnWrong: true },
    advanced: { count: L(5, 7), ms: 15000, restartOnWrong: true }
  }[key];
  return { band: key, heat, tier, boards, target: Math.ceil(boards * 0.6), ...per };
};

const KINDS = {
  foundation: [['small'], ['sizes', 'small'], ['small20', 'sizes']],
  developing: [['whole100'], ['whole100', 'whole1000'], ['unit', 'sameDen', 'whole1000']],
  intermediate: [['signedInt'], ['dec1', 'signedInt'], ['mixDec']],
  analytical: [['fracDec'], ['fracDec'], ['fracDecSigned']],
  advanced: [['mixedPow'], ['mixedPow'], ['mixedPowRoot']]
};

/** One item of a kind: { label, n, d, size? }. */
const itemOf = (rng, kind, ctx) => {
  switch (kind) {
    case 'small': return { label: String(int(rng, 1, 10)) };
    case 'small20': return { label: String(int(rng, 1, 20)) };
    case 'sizes': { const s = int(rng, 1, 6); return { label: '', size: s, v: rat(s) }; }
    case 'whole100': return { label: String(int(rng, 1, 100)) };
    case 'whole1000': return { label: String(int(rng, 100, 999)) };
    case 'unit': { const q = pick(rng, [2, 3, 4, 5, 6, 8, 10]); return { label: `1/${q}`, v: rat(1, q) }; }
    case 'sameDen': { const q = ctx.q; const k = int(rng, 1, q - 1); return gcd(k, q) === 1 ? { label: `${k}/${q}`, v: rat(k, q) } : null; }
    case 'signedInt': { const n = int(rng, -50, 50); return { label: fmt(n), v: rat(n) }; }
    case 'dec1': { const m = int(rng, -99, 99); return { label: dec(m, 1), v: rat(m, 10) }; }
    case 'mixDec': {
      if (chance(rng, 0.35)) { const n = int(rng, -9, 9); return { label: fmt(n), v: rat(n) }; }
      const m = int(rng, -999, 999); return { label: dec(m, 2), v: rat(m, 100) };
    }
    case 'fracDec':
    case 'fracDecSigned': {
      const sign = kind === 'fracDecSigned' && chance(rng, 0.4) ? -1 : 1;
      if (chance(rng, 0.5)) {
        const q = int(rng, 2, 12); const p = int(rng, 1, 2 * q);
        if (gcd(p, q) !== 1) return null;
        return { label: `${sign < 0 ? '−' : ''}${p}/${q}`, v: rat(sign * p, q) };
      }
      const m = int(rng, 5, 295);
      if (m % 100 === 0) return null;
      return { label: dec(sign * m, 2), v: rat(sign * m, 100) };
    }
    case 'mixedPow':
    case 'mixedPowRoot': {
      const r = rng();
      if (r < 0.22) { const q = int(rng, 2, 9); const p = int(rng, 1, 3 * q); const s = chance(rng, 0.4) ? -1 : 1; return gcd(p, q) === 1 && p % q ? { label: `${s < 0 ? '−' : ''}${p}/${q}`, v: rat(s * p, q) } : null; }
      if (r < 0.42) { const m = int(rng, -250, 250); return m % 100 ? { label: dec(m, 2), v: rat(m, 100) } : null; }
      if (r < 0.72 || kind === 'mixedPow') {
        const [b, k] = pick(rng, [[2, int(rng, -3, 3)], [3, int(rng, -2, 2)], [10, int(rng, -2, 1)], [-2, 3], [-2, 2], [-3, 2], [5, int(rng, -1, 1)], [-1, int(rng, 2, 3)]]);
        const base = b < 0 ? `(${fmt(b)})` : String(b);
        const v = k >= 0 ? rat(b ** k) : rat(1, b ** -k);
        if (Math.abs(v.n / v.d) > 10) return null;
        return { label: `${base}${sup(k)}`, v };
      }
      if (chance(rng, 0.5)) { const s = int(rng, 1, 9); return { label: `√${s * s}`, v: rat(s) }; }
      if (chance(rng, 0.5)) { const c = int(rng, 1, 3); return { label: `∛${c ** 3}`, v: rat(c) }; }
      const t = int(rng, 1, 9); return { label: `√${dec(t * t, 2)}`, v: rat(t, 10) };
    }
    default: return null;
  }
};

/** A board: `count` items of exactly-distinct values, shuffled. */
export const sortBoard = (cfg, rng = Math.random) => {
  const kinds = KINDS[cfg.band][cfg.tier];
  const kind = pick(rng, kinds);
  const ctx = { q: pick(rng, [7, 9, 11]) };   // enough fractions in lowest terms for six tiles
  for (let tries = 0; tries < 500; tries++) {
    const items = [];
    for (let guard = 0; items.length < cfg.count && guard < 400; guard++) {
      const it = itemOf(rng, kind, ctx);
      if (!it) continue;
      const v = it.v || rat(Number(it.label));
      if (items.some((x) => cmpRat(x, v) === 0)) continue;
      if (it.label && items.some((x) => x.label === it.label)) continue;
      items.push({ label: it.label, size: it.size || null, ...v });
    }
    if (items.length < cfg.count) continue;
    const order = [...items].sort(cmpRat);
    const rank = new Map(order.map((x, i) => [x, i]));
    return {
      kind,
      prompt: kind === 'sizes' ? 'Tap smallest to biggest' : 'Tap smallest to largest',
      items: shuffle(rng, items).map((x) => ({ ...x, key: `${kind}-${rank.get(x)}-${x.label || x.size}`, rank: rank.get(x) }))
    };
  }
  throw new Error(`speed-sort: could not build a ${kind} board`);
};

/* ======================================================================
 * Number Forge — built backwards, checked by a solver
 * ==================================================================== */
export const OPS = ['+', '−', '×', '÷'];

/** a op b, or { error } when the move is not allowed: no negatives, whole-number division only. */
export const applyOp = (a, b, op) => {
  if (op === '+') return { value: a + b };
  if (op === '−') return a < b ? { error: 'No negatives — take the smaller from the bigger.' } : { value: a - b };
  if (op === '×') return { value: a * b };
  if (b === 0 || a % b) return { error: `${a} ÷ ${b} isn’t a whole number.` };
  return { value: a / b };
};

const LIMITED = [['×', '−'], ['+', '÷'], ['×', '÷', '−'], ['−', '×', '+']];

export const forgeConfig = (band, difficulty, levelNo) => {
  const key = bandKey(band);
  const heat = heatOf(key, difficulty, levelNo);
  const tier = tierOf(heat);
  const L = (a, b) => lerp(a, b, heat);
  const base = { band: key, heat, tier, constraint: null };
  let c;
  if (key === 'foundation') c = { tiles: 3, lo: 1, max: tier === 0 ? 4 : 5, ops: ['+'], steps: tier === 0 ? [1, 1] : tier === 1 ? [1, 2] : [2, 2], cap: 10, minTarget: 3, rounds: 4, ms: 45000 };
  else if (key === 'developing') c = { tiles: 4, lo: 1, max: L(8, 12), ops: tier < 2 ? ['+', '−'] : ['+', '−', '×'], steps: [2, 2], cap: 30, minTarget: 5, rounds: 5, ms: 40000 };
  else if (key === 'intermediate') c = { tiles: 4, lo: 1, max: L(9, 12), ops: OPS, steps: [2, L(2, 3)], cap: 60, minTarget: 8, rounds: L(5, 6), ms: 45000 };
  else if (key === 'analytical') c = { tiles: 5, lo: 2, max: L(12, 20), ops: OPS, steps: [3, L(3, 4)], cap: 250, minTarget: 20, rounds: 6, ms: 60000 };
  else {
    const tiles = tier === 2 ? 5 : 4;
    c = { tiles, lo: 2, max: L(10, 15), ops: OPS, constraint: tier === 1 ? 'ops' : 'all', steps: tier === 1 ? [3, 3] : [tiles - 1, tiles - 1], cap: 300, minTarget: 10, rounds: 5, ms: tier === 2 ? 90000 : 75000 };
  }
  return { ...base, ...c, target: Math.ceil(c.rounds * 0.6) };
};

/** Can `target` be made from `values` with `ops` (every value used, when mustUseAll)? Exhaustive. */
export const canForge = (values, target, ops, mustUseAll = false) => {
  const seen = new Set();
  const go = (vals) => {
    if (!mustUseAll && vals.includes(target)) return true;
    if (vals.length === 1) return vals[0] === target;
    const key = [...vals].sort((a, b) => a - b).join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    for (let i = 0; i < vals.length; i++) {
      for (let j = i + 1; j < vals.length; j++) {
        const rest = vals.filter((_, k) => k !== i && k !== j);
        for (const op of ops) {
          for (const [x, y] of [[vals[i], vals[j]], [vals[j], vals[i]]]) {
            const r = applyOp(x, y, op);
            if (!r.error && go([...rest, r.value])) return true;
          }
        }
      }
    }
    return false;
  };
  return go(values);
};

/**
 * A round built backwards, so it always has an answer: random tiles, then a chain of valid moves that folds them
 * into the target. The chain is the solution shown after a miss.
 */
export const forgeRound = (cfg, rng = Math.random) => {
  for (let tries = 0; tries < 5000; tries++) {
    const ops = cfg.constraint === 'ops' ? pick(rng, LIMITED) : cfg.ops;
    const start = Array.from({ length: cfg.tiles }, () => int(rng, cfg.lo, cfg.max));
    const pool = [...start];
    let acc = pool.splice(int(rng, 0, pool.length - 1), 1)[0];
    const want = int(rng, cfg.steps[0], cfg.steps[1]);
    const solution = [];
    const made = [];
    for (let k = 0; solution.length < want && pool.length && k < 40; k++) {
      const i = int(rng, 0, pool.length - 1);
      const op = pick(rng, ops);
      const [a, b] = chance(rng, 0.5) ? [pool[i], acc] : [acc, pool[i]];
      if ((op === '×' || op === '÷') && (a === 1 || b === 1)) continue;
      const r = applyOp(a, b, op);
      if (r.error || r.value <= 0) continue;
      solution.push(`${a} ${op} ${b} = ${r.value}`);
      made.push(r.value);
      acc = r.value;
      pool.splice(i, 1);
    }
    if (solution.length < want || start.includes(acc) || made.indexOf(acc) < made.length - 1 || acc < cfg.minTarget || acc > cfg.cap) continue;
    return { target: acc, start, ops, mustUseAll: cfg.constraint === 'all', solution };
  }
  const [a, b] = [2, 3];
  return { target: a + b + 1, start: [a, b + 1, 1].slice(0, cfg.tiles), ops: ['+'], mustUseAll: false, solution: [`${a} + ${b + 1} = ${a + b + 1}`], fallback: true };
};
