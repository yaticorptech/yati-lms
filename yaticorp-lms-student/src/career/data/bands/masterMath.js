/**
 * Master Minds · Math, at Class 11–12 and college level (2026-11-17, the user: "the maths games are too easy — make
 * them right for their age, interactive, playful but still learning"). Pure and seeded, so node can test them.
 *
 *   Sum Pop        (sum-pop)        — a new target after every pop: sums with negatives, then products
 *   Change Maker   (change-maker)   — the cashier: quantities, a discount, GST, then the change
 *   Best Buy       (best-buy)       — unit prices in g / ml, stacked discounts, offers, interest, EMIs
 *   Number Trail   (number-trail)   — tap the values smallest to largest: fractions, %, powers, roots, logs
 *   Estimate It    (quick-estimate) — estimate fast: products, roots, %, division, growth, powers
 *
 * `step` is 1…9 (mindful.js stepOf): how hard inside Master Minds.
 */
import { intBetween, pick, shuffle, sample } from '../seeded.js';

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const stepOf = (difficulty, levelNo) => clampN(Math.ceil((levelNo || 1) / 5) + ((difficulty || 2) - 2) * 3, 1, 9);
const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/* ───────────────────────────── Sum Pop ───────────────────────────── */

/** Sums of two or three (negatives from step 3); from step 7 every other target is a product of two. */
export const popConfig = (difficulty, levelNo) => {
  const s = stepOf(difficulty, levelNo);
  return {
    step: s,
    min: s <= 2 ? 3 : s <= 6 ? -40 : -15,
    max: s <= 2 ? 60 : s <= 6 ? 90 : 25,
    products: s >= 7,
    bubbles: 12,
    seconds: 90,
    goal: clampN(6 + Math.ceil(s / 2), 7, 11)
  };
};

/** Fill empty (null) slots with new numbers (no zeros: they make products dull). */
export const refillBubbles = (rng, nums, config) => nums.map((n) => {
  if (n !== null) return n;
  let v = 0;
  while (v === 0) v = intBetween(rng, config.min, config.max);
  return v;
});

/** The next target, made from bubbles on the board so it can always be reached. */
export const nextTarget = (rng, nums, config, count = 0) => {
  const mode = config.products && count % 2 === 1 ? 'product' : 'sum';
  const idx = shuffle(rng, nums.map((_, i) => i));
  const take = mode === 'sum' && rng() < 0.35 ? 3 : 2;
  const pickd = idx.slice(0, take).map((i) => nums[i]);
  const value = mode === 'product' ? pickd[0] * pickd[1] : pickd.reduce((a, b) => a + b, 0);
  return { mode, value };
};

/** True when two (or, for sums, three) of the numbers make the target. */
export const canMake = (nums, target) => {
  for (let i = 0; i < nums.length; i += 1) {
    for (let j = i + 1; j < nums.length; j += 1) {
      if (target.mode === 'product') { if (nums[i] * nums[j] === target.value) return true; continue; }
      if (nums[i] + nums[j] === target.value) return true;
      for (let k = j + 1; k < nums.length; k += 1) if (nums[i] + nums[j] + nums[k] === target.value) return true;
    }
  }
  return false;
};

/* ───────────────────────────── Change Maker ───────────────────────────── */

export const MONEY = [1, 2, 5, 10, 20, 50, 100, 200, 500];
const NOTES_PAID = [500, 1000, 2000, 2500, 3000, 5000];

export const changeConfig = (difficulty, levelNo) => {
  const s = stepOf(difficulty, levelNo);
  return { rounds: 6, pass: 4, items: s <= 3 ? 2 : 3, discount: s >= 2, gst: s >= 4, seconds: 75 };
};

export const fewestCoins = (amount) => {
  let left = amount;
  let n = 0;
  for (const m of [...MONEY].reverse()) { n += Math.floor(left / m); left %= m; }
  return n;
};

const SHOP = [['🎧 Earbuds', 1299], ['📚 Exam guide', 445], ['🖊️ Gel pens (pack)', 85], ['☕ Coffee', 140], ['👕 T-shirt', 599], ['🎒 Backpack', 899],
  ['🔌 Charger', 349], ['🧴 Sunscreen', 275], ['🍕 Pizza', 329], ['📓 Notebook', 65], ['🕶️ Sunglasses', 749], ['🧮 Calculator', 655], ['🥤 Smoothie', 120], ['🖱️ Mouse', 499]];

/**
 * A customer's bill: items × quantity, then a discount (step 3+), then GST on the discounted price (step 5+), rounded
 * to the rupee as a till does. They pay with notes; the student hands back the change.
 */
export const makeChangeRound = (rng, config) => Array.from({ length: config.rounds }, () => {
  const lines = sample(rng, SHOP, config.items).map(([item, price]) => ({ item, price, qty: intBetween(rng, 1, 3) }));
  const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const off = config.discount && rng() < 0.75 ? pick(rng, [10, 15, 20, 25]) : 0;
  const afterOff = subtotal * (1 - off / 100);
  const gst = config.gst ? pick(rng, [5, 12, 18]) : 0;
  const total = Math.round(afterOff * (1 + gst / 100));
  const paid = NOTES_PAID.find((p) => p > total) || Math.ceil((total + 1) / 500) * 500;
  const why = [`Items ${inr(subtotal)}`, off ? `− ${off}% = ${inr(afterOff)}` : null, gst ? `+ ${gst}% GST = ${inr(total)}` : null].filter(Boolean).join('  ');
  return { lines, subtotal, off, gst, total, price: total, paid, change: paid - total, best: fewestCoins(paid - total), why };
});

/* ───────────────────────────── Best Buy ───────────────────────────── */

export const buyConfig = (difficulty, levelNo) => {
  const s = stepOf(difficulty, levelNo);
  const kinds = ['unit', 'stack', 'deal'];
  if (s >= 4) kinds.push('emi');
  if (s >= 6) kinds.push('interest');
  return { questions: 8, pass: 5, three: s >= 2, kinds, seconds: clampN(30 - s, 20, 30) };
};

/** Three (or two) distinct numbers from `list`, as a shuffled array. */
const distinct = (rng, list, n) => sample(rng, list, n);

const UNIT_GOODS = [['☕ Coffee powder', 'g'], ['🧴 Shampoo', 'ml'], ['🍯 Honey', 'g'], ['🥜 Peanut butter', 'g'], ['🧃 Juice', 'ml'], ['🍫 Dark chocolate', 'g']];

/** Each question: offers (label), `best` (the index), `why` (the working). */
export const makeBuyQuestion = (rng, config) => {
  const n = config.three ? 3 : 2;
  const kind = pick(rng, config.kinds);

  if (kind === 'unit') {
    const [name, u] = pick(rng, UNIT_GOODS);
    const sizes = distinct(rng, [200, 250, 400, 450, 500, 750, 900, 1000, 1200], n);
    const perK = intBetween(rng, 30, 90) * 10;                         // ₹ per kg / litre
    const tweaks = shuffle(rng, [-0.14, 0, 0.12, 0.22]).slice(0, n);   // clearly different value for money
    const offers = sizes.map((sz, i) => { const price = Math.round((sz / 1000) * perK * (1 + tweaks[i])); return { label: `${sz} ${u} for ₹${price}`, per: (price / sz) * 1000 }; });
    const best = offers.reduce((b, o, i) => (o.per < offers[b].per ? i : b), 0);
    return { kind, prompt: `${name}: which pack is the best value?`, offers: offers.map((o) => ({ label: o.label })), best, why: offers.map((o) => `₹${o.per.toFixed(0)}/${u === 'g' ? 'kg' : 'L'}`).join(' · ') };
  }

  if (kind === 'stack') {
    // Successive discounts are less than their sum: 20% then 10% is 28%, not 30%.
    const mrp = pick(rng, [1200, 1500, 2000, 2400, 3000, 4000]);
    for (;;) {
      const [a, b] = [pick(rng, [10, 15, 20, 25, 30]), pick(rng, [5, 10, 15, 20])];
      const stacked = 100 - (100 - a) * (100 - b) / 100;
      // The flat offers sit either side of the true stacked discount, so the best one changes question to question.
      const [d1, d2] = sample(rng, [-5, -3, -2, 2, 3], 2);
      const flat = Math.round(stacked) + d1;
      const other = Math.round(stacked) + d2;
      const effs = [stacked, flat, other].slice(0, n);
      if (new Set(effs.map((e) => e.toFixed(1))).size < n || effs.some((e, i) => effs.some((f, j) => i !== j && Math.abs(e - f) < 1))) continue;
      const labels = [`${a}% off, then ${b}% extra`, `Flat ${flat}% off`, `Flat ${other}% off`].slice(0, n);
      const order = shuffle(rng, effs.map((_, i) => i));
      const best = order.reduce((bi, k, i) => (effs[k] > effs[order[bi]] ? i : bi), 0);
      return { kind, prompt: `🏷️ A ${inr(mrp)} jacket: which offer is cheapest?`, offers: order.map((k) => ({ label: labels[k] })), best, why: order.map((k) => `${labels[k].split(',')[0].replace(' off', '')}… → ${inr(mrp * (1 - effs[k] / 100))}`).join(' · ') };
    }
  }

  if (kind === 'deal') {
    const DEALS = [['Buy 2, get 1 free', 100 / 3], ['Buy 3, get 1 free', 25], ['Buy 1, get 2nd at 50% off', 25], ['30% off everything', 30], ['35% off everything', 35], ['Buy 4, pay for 3', 25], ['40% off on 3 or more', 40], ['Buy 5, get 2 free', 200 / 7]];
    for (;;) {
      const ds = sample(rng, DEALS, n);
      const effs = ds.map((d) => d[1]);
      if (effs.some((e, i) => effs.some((f, j) => i !== j && Math.abs(e - f) < 2))) continue;
      const best = effs.reduce((b, e, i) => (e > effs[b] ? i : b), 0);
      return { kind, prompt: '🛍️ Buying several: which deal saves the most?', offers: ds.map((d) => ({ label: d[0] })), best, why: ds.map((d) => `${d[0]} = ${d[1].toFixed(1)}% off`).join(' · ') };
    }
  }

  if (kind === 'emi') {
    const cash = pick(rng, [18000, 24000, 30000, 36000, 45000]);
    const opts = [
      { label: `Pay ${inr(cash)} now`, cost: cash },
      (() => { const m = pick(rng, [6, 12]); const e = Math.round((cash * (1 + pick(rng, [0.04, 0.09, 0.12]))) / m / 10) * 10; return { label: `${m} EMIs of ${inr(e)}`, cost: m * e }; })(),
      (() => { const d = cash / 6; const m = 10; const e = Math.round((cash - d) * pick(rng, [0.088, 0.096, 0.112]) / 10) * 10; return { label: `${inr(d)} down + ${m} × ${inr(e)}`, cost: d + m * e }; })()
    ];
    // The cash price is not always cheapest: the store sometimes gives a cashback on EMIs.
    if (rng() < 0.35) opts[1] = { label: `${opts[1].label}, ${inr(cash * 0.15)} cashback`, cost: opts[1].cost - cash * 0.15 };
    const use = opts.slice(0, n);
    if (new Set(use.map((o) => Math.round(o.cost))).size < n) return makeBuyQuestion(rng, config);
    const order = shuffle(rng, use.map((_, i) => i));
    const best = order.reduce((bi, k, i) => (use[k].cost < use[order[bi]].cost ? i : bi), 0);
    return { kind, prompt: '📱 A new phone: which way of paying costs least in total?', offers: order.map((k) => ({ label: use[k].label })), best, why: order.map((k) => `total ${inr(use[k].cost)}`).join(' · ') };
  }

  // Interest: which earns most on the same deposit?
  const P = pick(rng, [10000, 20000, 50000]);
  const years = pick(rng, [2, 3, 5]);
  for (;;) {
    const rs = distinct(rng, [6, 7, 7.5, 8, 8.5, 9, 10], 3);
    const plans = [
      { label: `${rs[0]}% simple interest`, amt: P * (1 + (rs[0] / 100) * years) },
      { label: `${rs[1]}% compound, yearly`, amt: P * Math.pow(1 + rs[1] / 100, years) },
      { label: `${rs[2]}% compound, half-yearly`, amt: P * Math.pow(1 + rs[2] / 200, years * 2) }
    ].slice(0, n);
    const amts = plans.map((p) => p.amt);
    if (amts.some((a, i) => amts.some((b, j) => i !== j && Math.abs(a - b) < P * 0.01))) continue;
    const order = shuffle(rng, plans.map((_, i) => i));
    const best = order.reduce((bi, k, i) => (plans[k].amt > plans[order[bi]].amt ? i : bi), 0);
    return { kind, prompt: `🏦 ${inr(P)} for ${years} years: which earns the most?`, offers: order.map((k) => ({ label: plans[k].label })), best, why: order.map((k) => `→ ${inr(plans[k].amt)}`).join(' · ') };
  }
};

/* ───────────────────────────── Number Trail ───────────────────────────── */

export const trailConfig = (difficulty, levelNo) => {
  const s = stepOf(difficulty, levelNo);
  return { step: s, count: clampN(6 + s, 7, 14), boards: 3, secondsPerItem: s <= 3 ? 3 : 3.6 };
};

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).split('').map((c) => SUP[c]).join('');

/** One value written a less obvious way, by step: fractions, %, decimals, powers, roots, logs, factorials, negatives. */
const makeValue = (rng, s) => {
  const kinds = ['frac', 'pct', 'dec'];
  if (s >= 2) kinds.push('pow', 'root');
  if (s >= 4) kinds.push('pctOf', 'neg');
  if (s >= 6) kinds.push('log', 'fact', 'mixed');
  const k = pick(rng, kinds);
  if (k === 'frac') { const b = pick(rng, [3, 4, 5, 6, 7, 8, 9, 12]); const a = intBetween(rng, 1, b * 2); return { label: `${a}/${b}`, v: a / b }; }
  if (k === 'pct') { const p = intBetween(rng, 5, 240); return { label: `${p}%`, v: p / 100 }; }
  if (k === 'dec') { const d = intBetween(rng, 1, 300) / 100; return { label: d.toFixed(2).replace(/0$/, ''), v: d }; }
  if (k === 'pow') { const b = intBetween(rng, 2, 4); const e = intBetween(rng, s >= 4 ? -2 : 0, b === 2 ? 3 : 1); return { label: `${b}${sup(e)}`, v: Math.pow(b, e) }; }
  if (k === 'root') { const x = intBetween(rng, 2, s >= 4 ? 30 : 15); return { label: `√${x}`, v: Math.sqrt(x) }; }
  if (k === 'pctOf') { const p = pick(rng, [10, 15, 20, 25, 40, 50, 75]); const of = pick(rng, [4, 8, 12, 16, 20]); return { label: `${p}% of ${of}`, v: (p / 100) * of }; }
  if (k === 'neg') { const d = intBetween(rng, 1, 30) / 10; return { label: `−${d}`, v: -d }; }
  if (k === 'log') { const b = pick(rng, [2, 3, 10]); const e = intBetween(rng, 0, b === 10 ? 1 : 3); return { label: `log${b === 10 ? '' : String(b).replace(/\d/g, (c) => '₀₁₂₃₄₅₆₇₈₉'[c])} ${Math.pow(b, e)}`, v: e }; }
  if (k === 'fact') { const n = intBetween(rng, 0, 3); return { label: `${n}!`, v: [1, 1, 2, 6][n] }; }
  const w = intBetween(rng, 1, 3); const b = pick(rng, [2, 3, 4, 5]); const a = intBetween(rng, 1, b - 1);
  return { label: `${w} ${a}/${b}`, v: w + a / b };
};

/** The labels, ordered smallest to largest; values at least a little apart so the order is fair. */
export const trailValues = (rng, config) => {
  const out = [];
  for (let tries = 0; out.length < config.count && tries < 3000; tries += 1) {
    const x = makeValue(rng, config.step);
    if (out.every((o) => Math.abs(o.v - x.v) >= 0.06 && o.label !== x.label)) out.push(x);
  }
  return out.sort((a, b) => a.v - b.v);
};

/** Spots on the board (percent), far enough apart for labels a few characters long. */
const spots = (rng, count) => {
  const out = [];
  for (let gap = 22; out.length < count && gap > 8; gap -= 2) {
    out.length = 0;
    for (let tries = 0; out.length < count && tries < 3000; tries += 1) {
      const p = { x: intBetween(rng, 12, 88), y: intBetween(rng, 9, 91) };
      if (out.every((q) => Math.hypot((q.x - p.x) * 1.3, q.y - p.y) >= gap)) out.push(p);
    }
  }
  return out;
};

export const makeTrailBoard = (rng, config) => {
  const vals = trailValues(rng, config);
  const at = spots(rng, vals.length);
  return vals.slice(0, at.length).map((x, order) => ({ label: x.label, value: x.v, order, ...at[order] }));
};

/* ───────────────────────────── Estimate It ───────────────────────────── */

export const estimateConfig = (difficulty, levelNo) => {
  const s = stepOf(difficulty, levelNo);
  const kinds = ['mul', 'pct', 'div', 'root'];
  if (s >= 4) kinds.push('grow', 'frac');
  if (s >= 6) kinds.push('pow', 'mix');
  return { questions: 8, pass: 5, kinds, perQuestion: clampN(16 - s, 9, 15) };
};

/** Two significant figures: 48,213 → 48,000. */
const sig2 = (x) => Number(Number(x).toPrecision(2));
const fmt = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const makeEstimateRound = (rng, config) => {
  const kinds = shuffle(rng, Array.from({ length: config.questions }, (_, i) => config.kinds[i % config.kinds.length]));
  return kinds.map((kind) => {
    let show; let exact; let unit = '';
    if (kind === 'mul') { const a = intBetween(rng, 120, 980); const b = intBetween(rng, 11, 89) / (rng() < 0.5 ? 1 : 10); show = `${fmt(a)} × ${fmt(b)}`; exact = a * b; }
    else if (kind === 'pct') { const p = pick(rng, [12.5, 17, 18, 23, 35, 62, 7.5, 115]); const of = intBetween(rng, 120, 960) * 10; show = `${p}% of ${fmt(of)}`; exact = (p / 100) * of; }
    else if (kind === 'div') { const b = intBetween(rng, 13, 79); const a = b * intBetween(rng, 40, 400) + intBetween(rng, 0, b - 1); show = `${fmt(a)} ÷ ${b}`; exact = a / b; }
    else if (kind === 'root') { const x = intBetween(rng, 150, 9800); show = `√${fmt(x)}`; exact = Math.sqrt(x); }
    else if (kind === 'grow') { const P = pick(rng, [10000, 50000, 100000]); const r = pick(rng, [6, 8, 9, 12]); const y = pick(rng, [6, 8, 9, 12, 18]); show = `${'₹' + fmt(P)} at ${r}% a year for ${y} years`; exact = P * Math.pow(1 + r / 100, y); unit = '₹'; }
    else if (kind === 'frac') { const a = intBetween(rng, 3, 17); const b = intBetween(rng, 18, 41); const of = intBetween(rng, 200, 9000); show = `${a}/${b} of ${fmt(of)}`; exact = (a / b) * of; }
    else if (kind === 'pow') { const b = pick(rng, [2, 3, 1.5, 1.1, 5]); const e = b === 2 ? intBetween(rng, 10, 20) : b === 3 ? intBetween(rng, 6, 11) : b === 5 ? intBetween(rng, 5, 8) : b === 1.5 ? intBetween(rng, 6, 12) : intBetween(rng, 10, 30); show = `${b}^${e}`; exact = Math.pow(b, e); }
    else { const a = intBetween(rng, 21, 99); const b = intBetween(rng, 21, 99); const c = intBetween(rng, 3, 29); show = `(${a} × ${b}) ÷ ${c}`; exact = (a * b) / c; }
    const answer = sig2(exact);
    // The others far enough away (×0.5, ×1.6, ×2.5 or ×0.35…) that the nearest option is clearly the answer.
    const factors = shuffle(rng, [[0.5, 1.7, 2.6], [0.35, 0.6, 1.8], [0.55, 2, 3], [0.3, 0.55, 1.75]][intBetween(rng, 0, 3)]);
    const others = factors.map((f) => sig2(answer * f)).filter((o) => o !== answer);
    const options = shuffle(rng, [...new Set([answer, ...others])]);
    return { kind, prompt: 'Closest estimate?', show, exact, answer, options, unit };
  });
};
