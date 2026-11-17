/**
 * Group E, Rising Brains maths (2026-11-14): Number Pattern Lab, Ratio Relay, Data Dash, Mental Math Circuit.
 *
 * Pure and seeded: every generator takes an rng from seeded.js and a config, so a test can deal thousands of
 * rounds and check each one. Smart section only: 'intermediate' (Classes 6–8) and 'analytical' (9–10).
 */
import { intBetween, pick, shuffle, sample } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const t01 = (levelNo) => clampN(((levelNo || 1) - 1) / 29, 0, 1);
const ramp = (from, to, levelNo) => Math.round(from + (to - from) * t01(levelNo));
const diffOf = (difficulty) => clampN(difficulty || 1, 1, 3);

/** The smart section's two bands; anything else plays intermediate (younger) or analytical (older). */
export const smartBand = (ageBand) => (ageBand === 'analytical' || ageBand === 'advanced' ? 'analytical' : 'intermediate');

/* ═══════════════════════════ Number Pattern Lab ═══════════════════════════ */

/**
 * A puzzle is a 2-D grid of numbers (`values`, jagged for a pyramid) with some cells hidden, plus the linear
 * rules that hold between its cells. Each rule is { cells: [[r, c]…], coef: […], total }: Σ coef·v = total.
 * A hidden set is accepted only when repeatedly solving rules with one unknown fills every cell — each step is
 * forced, so the answer is unique.
 */
export const patternConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = smartBand(ageBand);
  const d = diffOf(difficulty);
  const t = t01(levelNo);
  if (band === 'intermediate') {
    return {
      band,
      puzzles: 4 + (d >= 2 ? 1 : 0),
      kinds: d === 1 ? ['pyramid', 'step', 'pyramid', 'magic'] : d === 2 ? ['pyramid', 'step', 'magic', 'sumgrid'] : ['pyramid', 'magic', 'sumgrid', 'step', 'grow'],
      pyramidRows: t < 0.5 && d === 1 ? 3 : 4,
      baseMax: 9 + 3 * d + Math.round(6 * t),
      magicSize: 3,
      gridRows: 3,
      gridCols: d === 1 ? 3 : 4,
      hideFrac: 0.3 + 0.07 * (d - 1) + 0.08 * t,
      seconds: ramp(300, 240, levelNo) - 20 * (d - 1)
    };
  }
  return {
    band,
    puzzles: 5,
    kinds: d === 1 ? ['pyramid', 'magic', 'step', 'sumgrid', 'grow'] : ['pyramid', 'magic', 'grow', 'sumgrid', 'step'],
    pyramidRows: d === 1 && t < 0.5 ? 4 : 5,
    baseMax: 12 + 4 * d + Math.round(8 * t),
    magicSize: d >= 2 && (d === 3 || t >= 0.4) ? 4 : 3,
    gridRows: 3 + (d === 3 ? 1 : 0),
    gridCols: 4,
    hideFrac: 0.4 + 0.06 * (d - 1) + 0.08 * t,
    seconds: ramp(330, 270, levelNo) - 20 * (d - 1)
  };
};

const LO_SHU = [[2, 7, 6], [9, 5, 1], [4, 3, 8]];
const DURER = [[16, 3, 2, 13], [5, 10, 11, 8], [9, 6, 7, 12], [4, 15, 14, 1]];
/** One of the eight turns/flips of a square. */
const symmetry = (sq, k) => {
  const n = sq.length;
  let out = sq.map((row) => [...row]);
  for (let i = 0; i < (k & 3); i++) out = out[0].map((_, c) => out.map((row) => row[c]).reverse());
  if (k & 4) out = out.map((row) => [...row].reverse());
  return out.slice(0, n);
};

const lineRule = (cells, total) => ({ cells, coef: cells.map(() => 1), total });

const RULE_TEXT = {
  pyramid: 'Each brick is the sum of the two bricks under it.',
  magic: (s) => `Every row, column and both diagonals add up to ${s}.`,
  step: 'Across: every row goes up by one same step. Down: every column goes up by another same step.',
  grow: 'Across: each row goes up in equal steps. Down: each number is the one above it times one same number.',
  sumgrid: 'The last number in each row is that row’s total; the bottom row holds the column totals.'
};

const buildPattern = (rng, cfg, kind) => {
  if (kind === 'pyramid') {
    const R = cfg.pyramidRows;
    const base = Array.from({ length: R }, () => intBetween(rng, 1, cfg.baseMax));
    const rows = [base];
    while (rows[0].length > 1) rows.unshift(rows[0].slice(1).map((v, i) => v + rows[0][i]));
    const rules = [];
    for (let r = 0; r < R - 1; r++) for (let c = 0; c <= r; c++) rules.push({ cells: [[r, c], [r + 1, c], [r + 1, c + 1]], coef: [1, -1, -1], total: 0 });
    return { kind, values: rows, rules, rule: RULE_TEXT.pyramid };
  }
  if (kind === 'magic') {
    const n = cfg.magicSize;
    const src = n === 3 ? LO_SHU : DURER;
    const k = n === 3 ? intBetween(rng, 1, 3) : 1;
    const b = intBetween(rng, 0, n === 3 ? 10 : 6);
    const values = symmetry(src, intBetween(rng, 0, 7)).map((row) => row.map((v) => k * v + b));
    const sum = values[0].reduce((a, v) => a + v, 0);
    const idx = [...Array(n).keys()];
    const rules = [
      ...idx.map((r) => lineRule(idx.map((c) => [r, c]), sum)),
      ...idx.map((c) => lineRule(idx.map((r) => [r, c]), sum)),
      lineRule(idx.map((i) => [i, i]), sum),
      lineRule(idx.map((i) => [i, n - 1 - i]), sum)
    ];
    return { kind, values, rules, rule: RULE_TEXT.magic(sum), magicSum: sum };
  }
  if (kind === 'step') {
    const R = cfg.gridRows;
    const C = cfg.gridCols;
    const a = intBetween(rng, 1, 15);
    const r = intBetween(rng, 2, 9);
    let c = intBetween(rng, 2, 12);
    if (c === r) c += 1;
    const values = Array.from({ length: R }, (_, i) => Array.from({ length: C }, (_, j) => a + i * c + j * r));
    const rules = [];
    for (let i = 0; i < R; i++) for (let j = 0; j + 2 < C; j++) rules.push({ cells: [[i, j], [i, j + 1], [i, j + 2]], coef: [1, -2, 1], total: 0 });
    for (let j = 0; j < C; j++) for (let i = 0; i + 2 < R; i++) rules.push({ cells: [[i, j], [i + 1, j], [i + 2, j]], coef: [1, -2, 1], total: 0 });
    for (let i = 0; i + 1 < R; i++) for (let j = 0; j + 1 < C; j++) rules.push({ cells: [[i, j], [i, j + 1], [i + 1, j], [i + 1, j + 1]], coef: [1, -1, -1, 1], total: 0 });
    return { kind, values, rules, rule: RULE_TEXT.step };
  }
  if (kind === 'grow') {
    const R = 3;
    const C = cfg.gridCols;
    const m = cfg.band === 'analytical' ? pick(rng, [2, 3]) : 2;
    const a = intBetween(rng, 1, 9);
    const r = intBetween(rng, 1, 6);
    const values = Array.from({ length: R }, (_, i) => Array.from({ length: C }, (_, j) => (a + j * r) * m ** i));
    const rules = [];
    for (let i = 0; i < R; i++) for (let j = 0; j + 2 < C; j++) rules.push({ cells: [[i, j], [i, j + 1], [i, j + 2]], coef: [1, -2, 1], total: 0 });
    for (let j = 0; j < C; j++) for (let i = 0; i + 1 < R; i++) rules.push({ cells: [[i + 1, j], [i, j]], coef: [1, -m], total: 0 });
    return { kind, values, rules, rule: RULE_TEXT.grow, factor: m };
  }
  // sumgrid: an R×C body, its row totals in an extra column and column totals in an extra row.
  const R = cfg.band === 'analytical' ? 3 : 2 + (cfg.gridCols >= 4 ? 1 : 0);
  const C = 3;
  const body = Array.from({ length: R }, () => Array.from({ length: C }, () => intBetween(rng, 1, cfg.baseMax + 6)));
  const values = body.map((row) => [...row, row.reduce((a, v) => a + v, 0)]);
  values.push(values[0].map((_, j) => values.reduce((a, row) => a + row[j], 0)));
  const rules = [];
  for (let i = 0; i <= R; i++) rules.push({ cells: [...Array(C + 1).keys()].map((j) => [i, j]), coef: [...Array(C).fill(1), -1], total: 0 });
  for (let j = 0; j <= C; j++) rules.push({ cells: [...Array(R + 1).keys()].map((i) => [i, j]), coef: [...Array(R).fill(1), -1], total: 0 });
  return { kind, values, rules, rule: RULE_TEXT.sumgrid };
};

/**
 * Fill what the rules force. `grid` is jagged like `values`, null where unknown; `p.kind === 'grow'` also has to
 * find its factor first, from a column with two neighbouring known cells. Returns the filled grid, or null when
 * the known cells do not force every cell (or would force a non-integer).
 */
export const solvePattern = (p, grid) => {
  const g = grid.map((row) => [...row]);
  let rules = p.rules;
  if (p.kind === 'grow') {
    let m = null;
    for (let i = 0; i + 1 < g.length && m === null; i++) {
      for (let j = 0; j < g[i].length; j++) {
        if (g[i][j] !== null && g[i + 1][j] !== null && g[i][j] !== 0 && g[i + 1][j] % g[i][j] === 0) { m = g[i + 1][j] / g[i][j]; break; }
      }
    }
    if (m === null) return null;
    rules = rules.map((rl) => (rl.coef.length === 2 ? { ...rl, coef: [1, -m] } : rl));
  }
  let moved = true;
  while (moved) {
    moved = false;
    for (const rl of rules) {
      const unknown = rl.cells.map((cell, k) => [cell, k]).filter(([[r, c]]) => g[r][c] === null);
      if (unknown.length !== 1) continue;
      const [[[r, c], k]] = unknown;
      const rest = rl.cells.reduce((s, [rr, cc], i) => (i === k ? s : s + rl.coef[i] * g[rr][cc]), 0);
      const v = (rl.total - rest) / rl.coef[k];
      if (!Number.isInteger(v)) return null;
      g[r][c] = v;
      moved = true;
    }
  }
  return g.every((row) => row.every((v) => v !== null)) ? g : null;
};

/** The visible grid: values with the hidden cells as null. */
export const visibleGrid = (p) => p.values.map((row, r) => row.map((v, c) => (p.hidden.includes(`${r}-${c}`) ? null : v)));

export const makePattern = (rng, cfg, kind) => {
  const p = buildPattern(rng, cfg, kind);
  const cells = shuffle(rng, p.values.flatMap((row, r) => row.map((_, c) => `${r}-${c}`)));
  const want = Math.max(2, Math.round(cells.length * cfg.hideFrac));
  const hidden = [];
  for (const id of cells) {
    if (hidden.length >= want) break;
    const trial = { ...p, hidden: [...hidden, id] };
    if (solvePattern(p, visibleGrid(trial))) hidden.push(id);
  }
  return { ...p, hidden };
};

export const makePatternLevel = (rng, cfg) => {
  const kinds = shuffle(rng, cfg.kinds);
  return Array.from({ length: cfg.puzzles }, (_, i) => makePattern(rng, cfg, kinds[i % kinds.length]));
};

/** Which hidden cells an answer gets wrong (`entries` maps "r-c" to a number or ''). */
export const checkPattern = (p, entries) => p.hidden.filter((id) => {
  const [r, c] = id.split('-').map(Number);
  return Number(entries[id]) !== p.values[r][c] || entries[id] === '' || entries[id] === undefined;
});

/* ═══════════════════════════════ Ratio Relay ══════════════════════════════ */

export const relayConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = smartBand(ageBand);
  const d = diffOf(difficulty);
  const t = t01(levelNo);
  if (band === 'intermediate') {
    return {
      band, relays: 2,
      legs: clampN(4 + (d >= 2 ? 1 : 0) + (t >= 0.6 && d >= 2 ? 1 : 0), 4, 6),
      kinds: d === 1 ? ['part', 'total', 'share'] : ['part', 'total', 'share', 'rate'],
      maxRatio: 4 + d,
      maxValue: 80 + 30 * d + Math.round(40 * t),
      start: [6, 24],
      seconds: ramp(360, 300, levelNo)
    };
  }
  return {
    band, relays: 2,
    legs: clampN(5 + (d >= 2 ? 1 : 0), 5, 6),
    kinds: d === 1 ? ['part', 'share', 'rate', 'percent', 'scale'] : ['part', 'total', 'share', 'rate', 'percent', 'scale', 'inverse'],
    maxRatio: 6 + d,
    maxValue: 200 + 60 * d + Math.round(80 * t),
    start: [12, 60],
    seconds: ramp(420, 330, levelNo)
  };
};

const PART = [
  ['Paint is mixed blue to yellow', 'litres of blue', 'litres of yellow'],
  ['A juice is mixed concentrate to water', 'cups of concentrate', 'cups of water'],
  ['Mortar is mixed cement to sand', 'buckets of cement', 'buckets of sand'],
  ['A cake uses flour to sugar', 'spoons of flour', 'spoons of sugar'],
  ['A garden is planted roses to tulips', 'roses', 'tulips']
];
const GROUP = [['A club has boys to girls', 'boys', 'members'], ['A farm has hens to ducks', 'hens', 'birds'], ['A shelf has novels to comics', 'novels', 'books']];
const SHARE = [['marbles', 'Asha', 'Ben'], ['stickers', 'Ravi', 'Meera'], ['rupees', 'Kabir', 'Zoya'], ['cards', 'Neha', 'Arjun']];
const RATE = [['A printer prints', 'pages', 'seconds'], ['A tap fills', 'litres', 'minutes'], ['A cyclist rides', 'km', 'hours'], ['A machine packs', 'boxes', 'minutes']];
const PERCENTS = [10, 20, 25, 30, 40, 50, 60, 75, 80, 90, 120, 150];

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** Every (a, b) that gives this kind of leg a whole answer from `q`, as [answer, text]. */
const legOptions = (rng, kind, q, cfg) => {
  const out = [];
  const R = cfg.maxRatio;
  for (let a = 1; a <= R; a++) {
    for (let b = 1; b <= R; b++) {
      if (a === b || gcd(a, b) !== 1) continue;
      if (kind === 'part' && q % a === 0) {
        const [ctx, ua, ub] = pick(rng, PART);
        out.push({ a, b, answer: (q * b) / a, text: `${ctx} in the ratio ${a} : ${b}. With ${q} ${ua}, how many ${ub} are needed?` });
      }
      if (kind === 'total' && q % a === 0) {
        const [ctx, ua, all] = pick(rng, GROUP);
        out.push({ a, b, answer: (q * (a + b)) / a, text: `${ctx} in the ratio ${a} : ${b}. There are ${q} ${ua}. How many ${all} are there in all?` });
      }
      if (kind === 'share' && q % (a + b) === 0) {
        const [thing, p1, p2] = pick(rng, SHARE);
        out.push({ a, b, answer: (q * b) / (a + b), text: `${q} ${thing} are shared between ${p1} and ${p2} in the ratio ${a} : ${b}. How many does ${p2} get?` });
      }
      if (kind === 'rate' && q % b === 0 && b > 1) {
        const [ctx, unit, per] = pick(rng, RATE);
        out.push({ a, b, answer: (q * a) / b, text: `${ctx} ${a} ${unit} every ${b} ${per}. How many ${unit} in ${q} ${per}?` });
      }
      if (kind === 'scale' && q % a === 0 && b > 1) {
        out.push({ a, b, answer: (q * b) / a, text: `On a map, ${a} cm stands for ${b} km. A road is ${q} cm long on the map. How many km long is it?` });
      }
      if (kind === 'inverse' && (a * q) % b === 0 && a > 1 && b > 1) {
        out.push({ a, b, answer: (a * q) / b, text: `${a} workers paint a school in ${q} days. Working at the same rate, how many days would ${b} workers take?` });
      }
    }
  }
  if (kind === 'percent') {
    for (const p of PERCENTS) {
      if ((q * p) % 100 === 0) {
        out.push(p > 100
          ? { a: 100, b: p, answer: (q * p) / 100, text: `A shop had ${q} visitors on Monday. On Tuesday it had ${p}% of Monday’s number. How many visitors on Tuesday?` }
          : { a: 100, b: p, answer: (q * p) / 100, text: `${p}% of the ${q} students in a year walk to school. How many walk?` });
      }
    }
  }
  return out;
};

/** One relay: legs whose answers each become the next leg's given number. */
export const makeRelay = (rng, cfg) => {
  for (let tries = 0; tries < 400; tries++) {
    let q = intBetween(rng, cfg.start[0], cfg.start[1]);
    const legs = [];
    let lastKind = null;
    for (let i = 0; i < cfg.legs; i++) {
      const kinds = shuffle(rng, cfg.kinds.filter((k) => k !== lastKind));
      let leg = null;
      for (const kind of kinds) {
        const opts = legOptions(rng, kind, q, cfg).filter((o) => o.answer >= 3 && o.answer <= cfg.maxValue && o.answer !== q && Number.isInteger(o.answer));
        if (opts.length) { leg = { kind, q, ...pick(rng, opts) }; break; }
      }
      if (!leg) break;
      legs.push(leg);
      lastKind = leg.kind;
      q = leg.answer;
    }
    if (legs.length === cfg.legs) return { start: legs[0].q, legs };
  }
  throw new Error('relay: no chain');
};

export const makeRelayLevel = (rng, cfg) => Array.from({ length: cfg.relays }, () => makeRelay(rng, cfg));

/** A leg's answer from its numbers alone (used by the test and nothing hidden). */
export const legAnswer = ({ kind, q, a, b }) => {
  if (kind === 'part' || kind === 'scale') return (q * b) / a;
  if (kind === 'total') return (q * (a + b)) / a;
  if (kind === 'share') return (q * b) / (a + b);
  if (kind === 'rate') return (q * a) / b;
  if (kind === 'inverse') return (a * q) / b;
  if (kind === 'percent') return (q * b) / 100;
  return NaN;
};

/* ═══════════════════════════════ Data Dash ════════════════════════════════ */

export const dashConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = smartBand(ageBand);
  const d = diffOf(difficulty);
  const t = t01(levelNo);
  if (band === 'intermediate') {
    return {
      band, sets: 3, perSet: d === 1 ? 2 : 3,
      charts: d === 1 ? ['bar', 'table', 'pie'] : ['bar', 'table', 'pie', 'bar'],
      cats: 4 + (d >= 2 ? 1 : 0) + (t >= 0.5 ? 1 : 0),
      maxValue: 30 + 15 * d,
      seconds: ramp(300, 240, levelNo) - 15 * (d - 1)
    };
  }
  return {
    band, sets: 3, perSet: 3,
    charts: d === 1 ? ['bar', 'double', 'line'] : ['double', 'line', 'pie', 'double'],
    cats: 5 + (d >= 2 ? 1 : 0),
    maxValue: 60 + 20 * d,
    seconds: ramp(330, 270, levelNo) - 15 * (d - 1)
  };
};

const THEMES = [
  { title: 'Books read by a class', unit: 'books', labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], kind: 'month' },
  { title: 'Rainfall in a town', unit: 'mm', labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], kind: 'month' },
  { title: 'Fruit sold at a stall', unit: 'kg', labels: ['Apples', 'Mangoes', 'Bananas', 'Grapes', 'Guavas', 'Oranges'], kind: 'item' },
  { title: 'Students in each club', unit: 'students', labels: ['Chess', 'Art', 'Music', 'Robotics', 'Drama', 'Science'], kind: 'item' },
  { title: 'Runs scored by a team', unit: 'runs', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], kind: 'day' }
];
const PIE_THEMES = [
  { title: 'Favourite sport of', who: 'students', labels: ['Cricket', 'Football', 'Badminton', 'Kabaddi', 'Hockey', 'Chess'] },
  { title: 'How students travel to school:', who: 'students', labels: ['Bus', 'Walk', 'Cycle', 'Car', 'Metro', 'Auto'] },
  { title: 'Favourite subject of', who: 'students', labels: ['Maths', 'Science', 'English', 'Art', 'History', 'Music'] }
];
const PAIRS = [['Shop A', 'Shop B', 'Sales (units)', 'units'], ['Class 9A', 'Class 9B', 'Library books borrowed', 'books'], ['Team Red', 'Team Blue', 'Points scored', 'points']];

const uniqueMax = (vals) => vals.filter((v) => v === Math.max(...vals)).length === 1;
const uniqueMin = (vals) => vals.filter((v) => v === Math.min(...vals)).length === 1;
const sum = (vals) => vals.reduce((a, v) => a + v, 0);

const numQ = (prompt, answer, unit = '') => ({ type: 'num', prompt, answer, unit });
const choiceQ = (prompt, answer, options) => ({ type: 'choice', prompt, answer, options });

/** Values for one series, with a unique largest and smallest, summing to a multiple of n (so the mean is whole). */
const seriesValues = (rng, n, lo, hi, step) => {
  for (let k = 0; k < 200; k++) {
    const vals = Array.from({ length: n }, () => intBetween(rng, Math.ceil(lo / step), Math.floor(hi / step)) * step);
    const rem = sum(vals) % n;
    if (rem) vals[n - 1] += n - rem;
    if (vals[n - 1] > hi + n) continue;
    if (uniqueMax(vals) && uniqueMin(vals) && new Set(vals).size >= n - 1) return vals;
  }
  throw new Error('data: no series');
};

const singleQuestions = (rng, set) => {
  const { labels, values, unit } = set;
  const n = labels.length;
  const [i, j] = sample(rng, [...Array(n).keys()], 2);
  const [hi, lo] = values[i] >= values[j] ? [i, j] : [j, i];
  const qs = [
    numQ(`How many ${unit} for ${labels[i]}?`, values[i], unit),
    numQ(`How many more ${unit} for ${labels[hi]} than for ${labels[lo]}?`, values[hi] - values[lo], unit),
    numQ(`What is the total of all ${n} values?`, sum(values), unit),
    numQ(`What is the mean (average) of the ${n} values?`, sum(values) / n, unit),
    choiceQ('Which has the largest value?', labels[values.indexOf(Math.max(...values))], labels),
    choiceQ('Which has the smallest value?', labels[values.indexOf(Math.min(...values))], labels),
    numQ(`What is the range (largest minus smallest)?`, Math.max(...values) - Math.min(...values), unit)
  ];
  const total = sum(values);
  if ((values[i] * 100) % total === 0) qs.push(numQ(`What percentage of the total is ${labels[i]}?`, (values[i] * 100) / total, '%'));
  return qs;
};

export const makeDataSet = (rng, cfg, chart) => {
  const n = Math.min(6, cfg.cats);
  if (chart === 'pie') {
    const theme = pick(rng, PIE_THEMES);
    const k = Math.min(5, Math.max(3, n - 1));
    let pct;
    for (let g = 0; g < 500; g++) {
      const cuts = sample(rng, [...Array(19).keys()].map((x) => (x + 1) * 5), k - 1).sort((a, b) => a - b);
      pct = [...cuts, 100].map((c, idx) => c - (idx ? cuts[idx - 1] : 0));
      if (uniqueMax(pct) && pct.every((p) => p >= 5)) break;
    }
    const total = pick(rng, cfg.band === 'analytical' ? [120, 160, 240, 300, 400] : [20, 40, 60, 80, 100, 200]);
    const labels = theme.labels.slice(0, k);
    const counts = pct.map((p) => (p * total) / 100);
    const [i, j] = sample(rng, [...Array(k).keys()], 2);
    const qs = shuffle(rng, [
      numQ(`How many ${theme.who} chose ${labels[i]}?`, counts[i], theme.who),
      numQ(`What percentage chose ${labels[i]} or ${labels[j]}?`, pct[i] + pct[j], '%'),
      numQ(`How many more ${theme.who} chose ${labels[pct[i] >= pct[j] ? i : j]} than ${labels[pct[i] >= pct[j] ? j : i]}?`, Math.abs(counts[i] - counts[j]), theme.who),
      choiceQ('Which was chosen most?', labels[pct.indexOf(Math.max(...pct))], labels)
    ]);
    return { chart, title: `${theme.title} ${total} ${theme.who}`, labels, values: pct, total, unit: '%', questions: qs.slice(0, cfg.perSet) };
  }
  if (chart === 'double' || chart === 'line') {
    const [nameA, nameB, title, unit] = pick(rng, PAIRS);
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].slice(0, n);
    const step = 5;
    let A;
    let B;
    for (let g = 0; g < 400; g++) {
      A = seriesValues(rng, n, 10, cfg.maxValue, step);
      B = seriesValues(rng, n, 10, cfg.maxValue, step);
      const gaps = A.map((v, x) => Math.abs(v - B[x]));
      const rises = A.slice(1).map((v, x) => v - A[x]);
      const ok = sum(A) !== sum(B) && A.every((v, x) => v !== B[x]) && uniqueMax(gaps) && uniqueMax(rises) && Math.max(...rises) > 0 && A[n - 1] > A[0];
      if (ok) break;
      A = null;
    }
    if (!A) throw new Error('data: no pair');
    const gaps = A.map((v, x) => Math.abs(v - B[x]));
    const rises = A.slice(1).map((v, x) => v - A[x]);
    const spans = labels.slice(1).map((l, x) => `${labels[x]}→${l}`);
    const [more, less, sMore, sLess] = sum(A) > sum(B) ? [nameA, nameB, A, B] : [nameB, nameA, B, A];
    const i = intBetween(rng, 0, n - 1);
    const qs = [
      numQ(`How many more ${unit} did ${more} have than ${less} over all ${n} months?`, sum(sMore) - sum(sLess), unit),
      numQ(`In how many months was ${nameA} ahead of ${nameB}?`, A.filter((v, x) => v > B[x]).length, 'months'),
      choiceQ(`In which month was the gap between ${nameA} and ${nameB} biggest?`, labels[gaps.indexOf(Math.max(...gaps))], labels),
      numQ(`What was ${nameB}’s value in ${labels[i]}?`, B[i], unit),
      choiceQ(`Between which two months did ${nameA} rise the most?`, spans[rises.indexOf(Math.max(...rises))], spans),
      numQ(`By how much did ${nameA} grow from ${labels[0]} to ${labels[n - 1]}?`, A[n - 1] - A[0], unit),
      numQ(`What was ${nameA}’s mean per month?`, sum(A) / n, unit)
    ];
    const pool = chart === 'line' ? [qs[4], qs[5], qs[6], qs[1]] : [qs[0], qs[1], qs[2], qs[3]];
    return { chart, title, labels, series: [{ name: nameA, values: A }, { name: nameB, values: B }], unit, questions: shuffle(rng, pool).slice(0, cfg.perSet) };
  }
  const theme = pick(rng, THEMES);
  const labels = theme.labels.slice(0, n);
  const step = cfg.band === 'analytical' ? 5 : pick(rng, [1, 2, 5]);
  const values = seriesValues(rng, n, step === 1 ? 3 : 5, cfg.maxValue, step);
  const set = { chart, title: theme.title, labels, values, unit: theme.unit };
  return { ...set, questions: sample(rng, singleQuestions(rng, set), cfg.perSet) };
};

export const makeDashLevel = (rng, cfg) => {
  const charts = shuffle(rng, cfg.charts);
  return Array.from({ length: cfg.sets }, (_, i) => makeDataSet(rng, cfg, charts[i % charts.length]));
};

/* ═══════════════════════════ Mental Math Circuit ══════════════════════════ */

export const circuitConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = smartBand(ageBand);
  const d = diffOf(difficulty);
  const t = t01(levelNo);
  if (band === 'intermediate') {
    return {
      band, circuits: 5,
      layers: 3 + (d >= 2 && t >= 0.4 ? 1 : 0) + (d === 3 ? 1 : 0),
      options: 2,
      trace: d === 1 ? (t < 0.5 ? 0.6 : 0.4) : d === 2 ? 0.2 : 0,
      ops: d === 1 ? ['+', '-', 'x2', 'x3', '/2'] : ['+', '-', 'x2', 'x3', '/2', '/3', 'x4'],
      start: [2, 20], maxValue: 200,
      runs: 3,
      seconds: ramp(300, 240, levelNo) - 15 * (d - 1)
    };
  }
  return {
    band, circuits: 5,
    layers: 4 + (d >= 2 ? 1 : 0),
    options: d === 3 || (d === 2 && t >= 0.5) ? 3 : 2,
    trace: d === 1 ? 0.2 : 0,
    ops: ['+', '-', 'x2', 'x3', 'x4', 'x5', '/2', '/3', '/4'],
    start: [4, 40], maxValue: 600,
    runs: 2,
    seconds: ramp(330, 270, levelNo) - 15 * (d - 1)
  };
};

/** One operation on the board: { op: '+'|'-'|'x'|'/', k, label }. */
const makeOp = (rng, kind, band) => {
  if (kind === '+' || kind === '-') {
    const k = intBetween(rng, 2, band === 'analytical' ? 19 : 12);
    return { op: kind, k, label: `${kind === '+' ? '+' : '−'}${k}` };
  }
  const k = Number(kind.slice(1));
  return kind[0] === 'x' ? { op: 'x', k, label: `×${k}` } : { op: '/', k, label: `÷${k}` };
};

/** One step of current through a node: the new value, or null when the node shorts (a remainder, or below zero). */
export const applyOp = (v, { op, k }) => {
  if (v === null) return null;
  if (op === '+') return v + k;
  if (op === '-') return v - k >= 0 ? v - k : null;
  if (op === 'x') return v * k;
  return v % k === 0 ? v / k : null;
};

/** The value after each junction for a choice of switches (an index per layer). */
export const runCircuit = (c, choice) => {
  const trail = [];
  let v = c.input;
  c.layers.forEach((opts, i) => { v = applyOp(v, opts[choice[i]]); trail.push(v); });
  return trail;
};

/** Every switch setting that makes OUT equal the target. */
export const solveCircuit = (c) => {
  const out = [];
  const walk = (i, v, path) => {
    if (v === null || v > c.maxValue) return;
    if (i === c.layers.length) { if (v === c.target) out.push(path); return; }
    c.layers[i].forEach((op, k) => walk(i + 1, applyOp(v, op), [...path, k]));
  };
  walk(0, c.input, []);
  return out;
};

export const makeCircuit = (rng, cfg, mode) => {
  for (let tries = 0; tries < 600; tries++) {
    const input = intBetween(rng, cfg.start[0], cfg.start[1]);
    const width = mode === 'trace' ? 1 : cfg.options;
    const layers = Array.from({ length: cfg.layers }, () => {
      const kinds = sample(rng, cfg.ops, width);
      return kinds.map((k) => makeOp(rng, k, cfg.band));
    });
    const c = { mode, input, layers, maxValue: cfg.maxValue, target: null };
    if (mode === 'trace') {
      const trail = runCircuit(c, layers.map(() => 0));
      const out = trail[trail.length - 1];
      if (trail.some((v) => v === null || v > cfg.maxValue) || out === input) continue;
      return { ...c, target: out, solution: layers.map(() => 0) };
    }
    // Count how many settings reach each output; aim for a target only one setting reaches.
    const counts = new Map();
    const walk = (i, v, path) => {
      if (v === null || v > cfg.maxValue) return;
      if (i === layers.length) { const e = counts.get(v) || []; e.push(path); counts.set(v, e); return; }
      layers[i].forEach((op, k) => walk(i + 1, applyOp(v, op), [...path, k]));
    };
    walk(0, input, []);
    const unique = [...counts.entries()].filter(([v, paths]) => paths.length === 1 && v !== input);
    if (unique.length < 2) continue;
    const [target, [solution]] = pick(rng, unique);
    return { ...c, target, solution };
  }
  throw new Error('circuit: none');
};

export const makeCircuitLevel = (rng, cfg) =>
  Array.from({ length: cfg.circuits }, (_, i) => makeCircuit(rng, cfg, i < Math.round(cfg.circuits * cfg.trace) ? 'trace' : 'route'));
