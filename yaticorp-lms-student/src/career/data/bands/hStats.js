/**
 * Statistical Inference (Master Minds) — datasets and questions, pure and seeded.
 *
 * Every answer is computed from the generated data (exact for means and medians,
 * floating point with a wide margin for SDs and correlations — generation rejects
 * near-ties, so no answer hangs on rounding).
 *
 * Kinds:
 *  compare — two samples as dot plots: which has the greater mean / median / SD?
 *  outlier — remove the outlier: does the mean / median / SD rise, fall or stay?
 *  skew    — a histogram: is the mean or the median larger?
 *  scatter — sign of the correlation, or (harder) the closest r.
 *  evidence— two experiments with the same mean gap: which suggests a real difference?
 *  ci      — confidence-interval reasoning (margin of error vs n, SD, confidence).
 */
import { intBetween, pick, shuffle } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const t01 = (levelNo) => clampN(((levelNo || 1) - 1) / 29, 0, 1);

export const sum = (xs) => xs.reduce((s, x) => s + x, 0);
export const mean = (xs) => sum(xs) / xs.length;
export const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
/** Sample standard deviation (n − 1). */
export const sd = (xs) => {
  const m = mean(xs);
  return Math.sqrt(sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1));
};
export const corr = (xs, ys) => {
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
  return sxy / Math.sqrt(sxx * syy);
};
/** Welch t statistic of b against a. */
export const welchT = (a, b) => (mean(b) - mean(a)) / Math.sqrt(sd(a) ** 2 / a.length + sd(b) ** 2 / b.length);

/** Exact comparison of two means: sign of mean(a) − mean(b), by cross-multiplying sums. */
export const cmpMean = (a, b) => Math.sign(sum(a) * b.length - sum(b) * a.length);
const relOf = (s) => (s > 0 ? 'up' : s < 0 ? 'down' : 'same');

/** How a level plays: band 'advanced', difficulty 1–3, step 1–30. */
export const statsConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const d = clampN(difficulty || 1, 1, 3);
  const rounds = Math.round(7 + 2 * t01(levelNo));
  return {
    band: 'advanced',
    rounds,
    pass: Math.ceil(rounds * 0.6),
    kinds: d === 1 ? ['compare', 'outlier', 'scatter', 'skew'] : d === 2 ? ['compare', 'outlier', 'scatter', 'skew', 'ci', 'evidence'] : ['compare', 'outlier', 'scatter', 'evidence', 'ci', 'skew'],
    stats: d === 1 ? ['mean', 'median'] : ['mean', 'median', 'sd'],
    rEstimate: d === 3 || (d === 2 && levelNo >= 15),
    n: d === 1 ? 9 : d === 2 ? 11 : 13
  };
};

/** Whole numbers around `c` with spread `s`, kept in [lo, hi]. */
const draw = (rng, n, c, s, lo = 0, hi = 30) =>
  Array.from({ length: n }, () => clampN(Math.round(c + (rng() + rng() + rng() - 1.5) * s * 2), lo, hi));

const STAT_NAME = { mean: 'mean', median: 'median', sd: 'standard deviation' };
const CONTEXTS = [
  { title: 'Minutes spent on homework', unit: 'min' },
  { title: 'Scores on a 30-point quiz', unit: 'pts' },
  { title: 'Daily rainfall (mm)', unit: 'mm' },
  { title: 'Hours of sleep before an exam (×2)', unit: '' },
  { title: 'Delivery times (minutes over 10)', unit: 'min' }
];

const stat = (name, xs) => (name === 'mean' ? mean(xs) : name === 'median' ? median(xs) : sd(xs));

/* ---------------------------------------------------------------- kinds */

const makeCompare = (rng, config) => {
  const name = pick(rng, config.stats);
  const ctx = pick(rng, CONTEXTS);
  for (let tries = 0; tries < 200; tries++) {
    const n = config.n + intBetween(rng, -1, 1);
    let a;
    let b;
    if (name === 'sd') {
      const c = intBetween(rng, 10, 20);
      const [s1, s2] = shuffle(rng, [intBetween(rng, 1, 2), intBetween(rng, 4, 6)]);
      a = draw(rng, n, c, s1);
      b = draw(rng, n, c + intBetween(rng, -1, 1), s2);
      if (Math.max(sd(a), sd(b)) / Math.min(sd(a), sd(b)) < 1.4) continue;
    } else {
      const c = intBetween(rng, 8, 20);
      a = draw(rng, n, c, 3);
      // Hard trap: B's centre lower but one big value lifts its mean (or the reverse).
      b = draw(rng, n, c + pick(rng, [-2, -1, 0, 1, 2]), 3);
      if (name === 'mean' && rng() < 0.25) {
        // An exact tie: nudge B until its sum matches A's.
        let diff = sum(a) - sum(b);
        for (let g = 0; g < 400 && diff !== 0; g++) {
          const i = Math.floor(rng() * n);
          const step = Math.sign(diff);
          if (b[i] + step >= 0 && b[i] + step <= 30) { b[i] += step; diff -= step; }
        }
        if (diff !== 0) continue;
      }
    }
    const va = stat(name, a);
    const vb = stat(name, b);
    let answer;
    if (name === 'mean') answer = cmpMean(a, b) > 0 ? 'A' : cmpMean(a, b) < 0 ? 'B' : 'equal';
    else if (va === vb) answer = 'equal';
    else answer = va > vb ? 'A' : 'B';
    if (answer !== 'equal' && Math.abs(va - vb) < (name === 'sd' ? 0.6 : 0.4)) continue;
    if (name === 'sd' && answer === 'equal') continue;
    return {
      kind: 'compare', stat: name, title: ctx.title, samples: [a, b],
      prompt: `Which sample has the greater ${STAT_NAME[name]}?`,
      options: [{ id: 'A', label: 'Sample A' }, { id: 'B', label: 'Sample B' }, { id: 'equal', label: 'They are equal' }],
      answer,
      reveal: `${STAT_NAME[name]}: A = ${fmt(va)}, B = ${fmt(vb)}`
    };
  }
  return null;
};

const makeOutlier = (rng, config) => {
  const name = pick(rng, config.stats);
  const ctx = pick(rng, CONTEXTS);
  for (let tries = 0; tries < 200; tries++) {
    const n = config.n - 2 + intBetween(rng, 0, 2);
    const base = draw(rng, n - 1, intBetween(rng, 6, 12), 2.5, 0, 22);
    const high = rng() < 0.7;
    const out = high ? intBetween(rng, 26, 30) : 0;
    if (!high && Math.min(...base) < 6) continue;
    const xs = shuffle(rng, [...base, out]);
    const before = stat(name, xs);
    const after = stat(name, base);
    const s = name === 'mean' ? cmpMean(base, xs) : Math.abs(after - before) < 1e-9 ? 0 : Math.sign(after - before);
    return {
      kind: 'outlier', stat: name, title: ctx.title, samples: [xs], outlier: out,
      prompt: `The value ${out} is an outlier. If it is removed, what happens to the ${STAT_NAME[name]}?`,
      options: [{ id: 'up', label: 'It increases' }, { id: 'down', label: 'It decreases' }, { id: 'same', label: 'It stays the same' }],
      answer: relOf(s),
      reveal: `${STAT_NAME[name]}: ${fmt(before)} with it, ${fmt(after)} without it`
    };
  }
  return null;
};

const makeSkew = (rng, config) => {
  for (let tries = 0; tries < 200; tries++) {
    const n = config.n + 4;
    const right = rng() < 0.5;
    // A long tail on one side: most values bunched, a few stretching away.
    const xs = Array.from({ length: n }, () => {
      const u = rng();
      const tail = Math.round(-Math.log(1 - u * 0.97) * 4);
      return right ? clampN(2 + tail, 0, 24) : clampN(22 - tail, 0, 24);
    });
    const m = mean(xs);
    const md = median(xs);
    if (Math.abs(m - md) < 0.5) continue;
    return {
      kind: 'skew', title: 'Waiting times (minutes)', samples: [xs],
      prompt: 'Which is larger for this data: the mean or the median?',
      options: [{ id: 'mean', label: 'The mean' }, { id: 'median', label: 'The median' }, { id: 'equal', label: 'They are equal' }],
      answer: m > md ? 'mean' : 'median',
      reveal: `mean = ${fmt(m)}, median = ${fmt(md)} — the long tail pulls the mean towards it`
    };
  }
  return null;
};

export const R_OPTIONS = [-0.9, -0.5, 0, 0.5, 0.9];

const makeScatter = (rng, config) => {
  const estimate = config.rEstimate && rng() < 0.6;
  for (let tries = 0; tries < 400; tries++) {
    const n = intBetween(rng, 14, 20);
    const target = estimate ? pick(rng, R_OPTIONS) : pick(rng, [0.85, -0.85, 0]);
    const xs = Array.from({ length: n }, () => Math.round(rng() * 100) / 10);
    const noise = Array.from({ length: n }, () => rng() + rng() + rng() - 1.5);
    const mx = mean(xs);
    const sx = sd(xs);
    const sn = sd(noise);
    const ys = xs.map((x, i) => 5 + 2 * (target * (x - mx) / sx + Math.sqrt(1 - target * target) * (noise[i] / sn)));
    const r = corr(xs, ys);
    if (estimate ? Math.abs(r - target) > 0.08 : target === 0 ? Math.abs(r) > 0.12 : Math.abs(r) < 0.6 || Math.sign(r) !== Math.sign(target)) continue;
    const points = xs.map((x, i) => [x, Math.round(ys[i] * 10) / 10]);
    const rr = corr(points.map((p) => p[0]), points.map((p) => p[1]));
    if (estimate) {
      const closest = R_OPTIONS.reduce((b, o) => (Math.abs(o - rr) < Math.abs(b - rr) ? o : b), R_OPTIONS[0]);
      if (Math.abs(closest - rr) > 0.1) continue;
      return {
        kind: 'scatter', estimate: true, points, title: 'Each dot is one student: x = hours revised, y = test gain',
        prompt: 'Which value is closest to the correlation coefficient r?',
        options: R_OPTIONS.map((o) => ({ id: String(o), label: `r ≈ ${o}` })),
        answer: String(closest), reveal: `r = ${rr.toFixed(2)}`
      };
    }
    const answer = Math.abs(rr) < 0.2 ? 'none' : rr > 0 ? 'positive' : 'negative';
    if (Math.abs(rr) >= 0.2 && Math.abs(rr) < 0.55) continue;
    return {
      kind: 'scatter', estimate: false, points, title: 'Each dot is one city: x = average temperature, y = sales index',
      prompt: 'What kind of association does the scatter plot show?',
      options: [{ id: 'positive', label: 'Positive' }, { id: 'negative', label: 'Negative' }, { id: 'none', label: 'No clear association' }],
      answer, reveal: `r = ${rr.toFixed(2)}`
    };
  }
  return null;
};

const makeEvidence = (rng, config) => {
  for (let tries = 0; tries < 300; tries++) {
    const n = config.n - 2;
    const c = intBetween(rng, 8, 14);
    const gap = intBetween(rng, 2, 4);
    const tight = [draw(rng, n, c, 1), draw(rng, n, c + gap, 1)];
    const loose = [draw(rng, n, c, 5), draw(rng, n, c + gap, 5)];
    const tT = Math.abs(welchT(tight[0], tight[1]));
    const tL = Math.abs(welchT(loose[0], loose[1]));
    if (!(tT > 2.5 && tT / tL >= 2)) continue;
    // Both show roughly the same gap in means.
    const gT = mean(tight[1]) - mean(tight[0]);
    const gL = mean(loose[1]) - mean(loose[0]);
    if (Math.abs(gT - gL) > 1 || gL <= 0) continue;
    const tightFirst = rng() < 0.5;
    const experiments = tightFirst ? [tight, loose] : [loose, tight];
    return {
      kind: 'evidence', title: 'Control (grey) vs new method (violet), two separate experiments', experiments,
      prompt: 'Both experiments show a similar gap in means. Which gives stronger evidence that the new method really changes the result?',
      options: [{ id: '1', label: 'Experiment 1' }, { id: '2', label: 'Experiment 2' }, { id: 'same', label: 'Equally strong' }],
      answer: tightFirst ? '1' : '2',
      reveal: `Mean gaps ${fmt(tightFirst ? gT : gL)} and ${fmt(tightFirst ? gL : gT)}; t ≈ ${fmt(tightFirst ? tT : tL)} vs ${fmt(tightFirst ? tL : tT)} — less spread makes the same gap more convincing`
    };
  }
  return null;
};

const makeCi = (rng) => {
  const variant = pick(rng, ['n', 'n', 'sd', 'conf', 'calc']);
  if (variant === 'calc') {
    const n = pick(rng, [16, 25, 36, 49, 64, 100]);
    const s = pick(rng, [4, 5, 6, 7, 8, 10, 12, 14]);
    const m = Math.round(1.96 * s / Math.sqrt(n) * 100) / 100;
    const wrong = [Math.round(1.96 * s / n * 100) / 100, Math.round(1.96 * s * 100) / 100, Math.round(s / Math.sqrt(n) * 100) / 100]
      .filter((x, i, arr) => x !== m && arr.indexOf(x) === i);
    const opts = shuffle(rng, [m, ...wrong]);
    return {
      kind: 'ci', title: 'Margin of error',
      prompt: `A sample of n = ${n} has standard deviation ${s}. What is the 95% margin of error for the mean (z = 1.96)?`,
      options: opts.map((x) => ({ id: String(x), label: `± ${x}` })),
      answer: String(m), reveal: `1.96 × ${s} / √${n} = 1.96 × ${fmt(s / Math.sqrt(n))} ≈ ${m}`
    };
  }
  const m0 = pick(rng, [2.4, 3, 3.6, 4.2, 6]);
  if (variant === 'n') {
    const k = pick(rng, [4, 9, 16, 0.25]);
    const n0 = pick(rng, [16, 36, 64, 100]);
    const n1 = n0 * k;
    const m1 = Math.round((m0 / Math.sqrt(k)) * 100) / 100;
    const wrong = [Math.round((m0 / k) * 100) / 100, Math.round(m0 * Math.sqrt(k) * 100) / 100, m0].filter((x) => x !== m1);
    return {
      kind: 'ci', title: 'Sample size and precision',
      prompt: `With n = ${n0}, a 95% interval for the mean is ± ${m0}. With the same spread and n = ${n1}, the margin is about…`,
      options: shuffle(rng, [m1, ...wrong]).map((x) => ({ id: String(x), label: `± ${x}` })),
      answer: String(m1), reveal: `Margin ∝ 1/√n: n is ${k >= 1 ? `${k} times as big, so the margin is divided by ${Math.sqrt(k)}` : 'a quarter as big, so the margin doubles'} → ± ${m1}`
    };
  }
  if (variant === 'sd') {
    const k = pick(rng, [2, 3, 0.5]);
    const m1 = Math.round(m0 * k * 100) / 100;
    const wrong = [Math.round(m0 * k * k * 100) / 100, Math.round(m0 * Math.sqrt(k) * 100) / 100, m0].filter((x, i, arr) => x !== m1 && arr.indexOf(x) === i);
    return {
      kind: 'ci', title: 'Spread and precision',
      prompt: `A 95% interval for a mean is ± ${m0}. If the population's standard deviation were ${k === 0.5 ? 'halved' : `${k} times as large`} (same n), the margin would be…`,
      options: shuffle(rng, [m1, ...wrong]).map((x) => ({ id: String(x), label: `± ${x}` })),
      answer: String(m1), reveal: `Margin ∝ SD → ± ${m1}`
    };
  }
  const up = rng() < 0.5;
  return {
    kind: 'ci', title: 'Confidence level',
    prompt: `A ${up ? '95%' : '99%'} interval for a mean is ± ${m0}. From the same data, the ${up ? '99%' : '90%'} interval is…`,
    options: [{ id: 'wider', label: 'Wider' }, { id: 'narrower', label: 'Narrower' }, { id: 'same', label: 'The same width' }],
    answer: up ? 'wider' : 'narrower',
    reveal: up ? 'z rises from 1.96 to 2.58 — more confidence needs a wider net' : 'z falls from 2.58 to 1.64 — less confidence, narrower interval'
  };
};

export const fmt = (x) => (Number.isInteger(x) ? String(x) : (Math.round(x * 100) / 100).toFixed(2));

const MAKERS = { compare: makeCompare, outlier: makeOutlier, skew: makeSkew, scatter: makeScatter, evidence: makeEvidence, ci: makeCi };

export const makeStatsRound = (rng, config, kind) => {
  for (let i = 0; i < 6; i++) {
    const r = MAKERS[kind](rng, config);
    if (r) return r;
  }
  return makeCi(rng);
};

export const makeStatsLevel = (rng, config) => {
  const kinds = [];
  while (kinds.length < config.rounds) kinds.push(...shuffle(rng, config.kinds));
  return kinds.slice(0, config.rounds).map((k) => makeStatsRound(rng, config, k));
};
