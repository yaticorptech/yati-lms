/**
 * Numerical Optimization (Master Minds) — pure and seeded.
 *
 * Three kinds of problem, each with its true optimum computed exactly:
 *  knapsack — pack items (weight, value) into a bag of fixed capacity; optimum by 0/1 DP.
 *  budget   — split a budget of whole units among options, each with its own
 *             return table; optimum by DP over units (handles non-concave tables).
 *  mix      — a two-product integer programme: maximise p·x + q·y under resource
 *             limits a·x + b·y ≤ c; optimum by brute force over the lattice.
 * A level asks for the optimum (or within a tolerance on easier levels).
 */
import { intBetween, pick, sample, shuffle } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const t01 = (levelNo) => clampN(((levelNo || 1) - 1) / 29, 0, 1);

export const ITEMS = ['Tent', 'Stove', 'Camera', 'Drone', 'Rope', 'Lantern', 'First-aid kit', 'Water filter', 'Solar panel', 'Binoculars', 'Laptop', 'Sleeping bag'];
export const OPTIONS = ['Online ads', 'Research', 'Staff training', 'New outlet'];
const PRODUCTS = [
  { names: ['chairs', 'tables'], resources: ['Wood (planks)', 'Carpentry (hours)', 'Varnish (litres)'] },
  { names: ['bracelets', 'necklaces'], resources: ['Silver (grams)', 'Crafting (hours)', 'Beads (packs)'] },
  { names: ['bicycles', 'scooters'], resources: ['Steel (kg)', 'Assembly (hours)', 'Paint (litres)'] },
  { names: ['jackets', 'shirts'], resources: ['Cloth (metres)', 'Sewing (hours)', 'Buttons (packs)'] }
];

/** How a level plays: band 'advanced', difficulty 1–3, step 1–30. */
export const optimConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const d = clampN(difficulty || 1, 1, 3);
  const t = t01(levelNo);
  const rounds = d === 3 ? 5 : 4;
  return {
    band: 'advanced',
    rounds,
    pass: Math.ceil(rounds * 0.6),
    kinds: d === 1 ? ['knapsack', 'budget'] : ['knapsack', 'budget', 'mix'],
    items: d === 1 ? 5 : d === 2 ? 6 + Math.round(t) : 8,
    units: d === 1 ? 5 : d === 2 ? 6 : 8,
    options: d === 1 ? 3 : 4,
    nonConcave: d === 3,
    constraints: d === 3 ? 3 : 2,
    tolerance: d === 1 ? (t < 0.5 ? 0.1 : 0.05) : d === 2 ? 0.05 : 0,
    tricky: d >= 2
  };
};

/* ---------------------------------------------------------------- knapsack */

/** 0/1 knapsack by DP: { value, pick: [indices] }. */
export const solveKnapsack = (items, capacity) => {
  const n = items.length;
  const dp = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    const { w, v } = items[i - 1];
    for (let c = 0; c <= capacity; c++) dp[i][c] = Math.max(dp[i - 1][c], c >= w ? dp[i - 1][c - w] + v : 0);
  }
  const pick = [];
  for (let i = n, c = capacity; i > 0; i--) if (dp[i][c] !== dp[i - 1][c]) { pick.unshift(i - 1); c -= items[i - 1].w; }
  return { value: dp[n][capacity], pick };
};

/** Greedy by value per kg — the trap the tricky levels are built to beat. */
export const greedyKnapsack = (items, capacity) => {
  let left = capacity;
  let value = 0;
  for (const it of [...items].sort((a, b) => b.v / b.w - a.v / a.w)) if (it.w <= left) { left -= it.w; value += it.v; }
  return value;
};

const makeKnapsack = (rng, config) => {
  let out = null;
  for (let tries = 0; tries < 40; tries++) {
    const names = sample(rng, ITEMS, config.items);
    const items = names.map((name) => ({ name, w: intBetween(rng, 1, 9), v: intBetween(rng, 2, 30) * 5 }));
    const total = items.reduce((s, it) => s + it.w, 0);
    const capacity = Math.max(Math.max(...items.map((it) => it.w)), Math.round(total * (0.4 + rng() * 0.15)));
    const best = solveKnapsack(items, capacity);
    out = { kind: 'knapsack', items, capacity, optimum: best.value, solution: best.pick };
    if (!config.tricky || greedyKnapsack(items, capacity) < best.value) break;
  }
  return out;
};

/* ---------------------------------------------------------------- budget */

/** Best split of `units` among return tables (table[k] = return for k units): { value, alloc }. */
export const solveBudget = (tables, units) => {
  // best[j][u]: best return using the first j options and u units.
  const m = tables.length;
  const best = Array.from({ length: m + 1 }, () => Array(units + 1).fill(-Infinity));
  const choice = Array.from({ length: m + 1 }, () => Array(units + 1).fill(0));
  best[0].fill(0);
  for (let j = 1; j <= m; j++) {
    for (let u = 0; u <= units; u++) {
      for (let k = 0; k <= u; k++) {
        const val = best[j - 1][u - k] + tables[j - 1][k];
        if (val > best[j][u]) { best[j][u] = val; choice[j][u] = k; }
      }
    }
  }
  const alloc = Array(m).fill(0);
  for (let j = m, u = units; j > 0; j--) { alloc[j - 1] = choice[j][u]; u -= choice[j][u]; }
  return { value: best[m][units], alloc };
};

export const budgetValue = (tables, alloc) => alloc.reduce((s, k, j) => s + tables[j][k], 0);

const makeBudget = (rng, config) => {
  const names = sample(rng, OPTIONS, config.options);
  const tables = names.map((_, j) => {
    const table = [0];
    // Diminishing returns; on hard levels one option needs two units before it pays (a set-up cost).
    const slow = config.nonConcave && j === 0;
    let inc = intBetween(rng, 8, 20);
    for (let k = 1; k <= config.units; k++) {
      const gain = slow ? (k === 1 ? 2 : k === 2 ? inc + 14 : inc) : inc;
      table.push(table[k - 1] + gain);
      inc = Math.max(1, inc - intBetween(rng, 2, 5));
    }
    return table;
  });
  const order = shuffle(rng, names.map((_, j) => j));
  const shuffledTables = order.map((j) => tables[j]);
  const best = solveBudget(shuffledTables, config.units);
  return { kind: 'budget', options: order.map((j) => names[j]), tables: shuffledTables, units: config.units, optimum: best.value, solution: best.alloc };
};

/* ---------------------------------------------------------------- mix */

/** Best (x, y) on the lattice: { value, x, y, xMax, yMax }. */
export const solveMix = (mix) => {
  const xMax = Math.min(...mix.limits.map((l) => (l.a > 0 ? Math.floor(l.c / l.a) : Infinity)));
  const yMax = Math.min(...mix.limits.map((l) => (l.b > 0 ? Math.floor(l.c / l.b) : Infinity)));
  let best = { value: -1, x: 0, y: 0 };
  for (let x = 0; x <= xMax; x++) {
    for (let y = 0; y <= yMax; y++) {
      if (!mix.limits.every((l) => l.a * x + l.b * y <= l.c)) continue;
      const value = mix.p * x + mix.q * y;
      if (value > best.value) best = { value, x, y };
    }
  }
  return { ...best, xMax, yMax };
};

export const mixValue = (mix, x, y) => mix.p * x + mix.q * y;
export const mixFeasible = (mix, x, y) => x >= 0 && y >= 0 && mix.limits.every((l) => l.a * x + l.b * y <= l.c);

const makeMix = (rng, config) => {
  let out = null;
  for (let tries = 0; tries < 60; tries++) {
    const product = pick(rng, PRODUCTS);
    const [px, py] = product.names;
    const res = sample(rng, product.resources, config.constraints);
    const limits = res.map((name) => {
      const a = intBetween(rng, 1, 6);
      const b = intBetween(rng, 1, 6);
      return { name, a, b, c: intBetween(rng, 14, 40) };
    });
    const mix = { kind: 'mix', products: [px, py], p: intBetween(rng, 2, 9) * 10, q: intBetween(rng, 2, 9) * 10, limits };
    const best = solveMix(mix);
    out = { ...mix, optimum: best.value, solution: [best.x, best.y], xMax: best.xMax, yMax: best.yMax };
    // Worth thinking about: the best plan makes some of both, and the board is not too big to draw.
    if (best.x > 0 && best.y > 0 && best.xMax <= 14 && best.yMax <= 14 && best.xMax >= 3 && best.yMax >= 3) break;
  }
  return out;
};

/* ---------------------------------------------------------------- level */

/** The value to reach: the optimum less the tolerance, rounded up. */
export const targetOf = (round, tolerance) => Math.ceil(round.optimum * (1 - tolerance) - 1e-9);

export const makeOptimRound = (rng, config, kind) => {
  const r = kind === 'knapsack' ? makeKnapsack(rng, config) : kind === 'budget' ? makeBudget(rng, config) : makeMix(rng, config);
  return { ...r, target: targetOf(r, config.tolerance) };
};

export const makeOptimLevel = (rng, config) => {
  const kinds = [];
  while (kinds.length < config.rounds) kinds.push(...shuffle(rng, config.kinds));
  return kinds.slice(0, config.rounds).map((k) => makeOptimRound(rng, config, k));
};

/**
 * Judge an answer. knapsack: [item indices]; budget: [units per option]; mix: [x, y].
 * { feasible, value, ok, reason }.
 */
export const checkOptim = (round, answer) => {
  if (round.kind === 'knapsack') {
    const set = [...new Set(answer)];
    const w = set.reduce((s, i) => s + round.items[i].w, 0);
    const value = set.reduce((s, i) => s + round.items[i].v, 0);
    const feasible = set.length === answer.length && set.every((i) => round.items[i]) && w <= round.capacity;
    return { feasible, value, weight: w, ok: feasible && value >= round.target, reason: feasible ? null : 'overweight' };
  }
  if (round.kind === 'budget') {
    const used = answer.reduce((s, k) => s + k, 0);
    const feasible = answer.length === round.tables.length && answer.every((k) => Number.isInteger(k) && k >= 0) && used <= round.units;
    const value = feasible ? budgetValue(round.tables, answer) : 0;
    return { feasible, value, used, ok: feasible && value >= round.target, reason: feasible ? null : 'overspent' };
  }
  const [x, y] = answer;
  const feasible = Number.isInteger(x) && Number.isInteger(y) && mixFeasible(round, x, y);
  const value = mixValue(round, x, y);
  return { feasible, value, ok: feasible && value >= round.target, reason: feasible ? null : 'over-limit' };
};
