/**
 * Probability Lab (2026-11-13): rounds, exact answers and simulations, pure so a test can check them.
 *
 * Every answer is an exact fraction from a closed-form rule (rational arithmetic, never floats). Each round also
 * carries its experiment — `space()` the equally likely raw outcomes, `draw(rng)` one physical trial (shuffle the
 * bag, roll the dice) and `judge(outcome)` true / false / null (null: the "given" did not happen, so the trial does
 * not count) — which the test uses to re-derive every answer by enumeration and by simulation, and the game uses for
 * "Run the experiment".
 *
 * Bands: 'analytical' (Classes 9–10) single events, complements, simple compound events with replacement;
 * 'advanced' (11–12+) without replacement, conditional probability, expected value, combinations.
 */

/* ------------------------------------------------------------------ fractions */

const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
export const frac = (n, d = 1) => {
  if (d === 0) throw new Error('zero denominator');
  const s = d < 0 ? -1 : 1;
  const g = gcd(n, d);
  return { n: (s * n) / g, d: (s * d) / g };
};
export const add = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a, b) => frac(a.n * b.n, a.d * b.d);
export const div = (a, b) => frac(a.n * b.d, a.d * b.n);
export const cmp = (a, b) => Math.sign(a.n * b.d - b.n * a.d);
export const eq = (a, b) => cmp(a, b) === 0;
export const toNum = (a) => a.n / a.d;
export const fmt = (a) => (a.d === 1 ? `${a.n}` : `${a.n}/${a.d}`);
const ONE = frac(1);
const comp = (a) => sub(ONE, a);

export const choose = (n, k) => {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
};

/* ------------------------------------------------------------------ helpers */

const ri = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pickOne = (rng, list) => list[Math.floor(rng() * list.length)];
const shuffled = (rng, list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const COLOURS = {
  red: { label: 'red', fill: '#e11d48' },
  blue: { label: 'blue', fill: '#2563eb' },
  gold: { label: 'gold', fill: '#f59e0b' },
  green: { label: 'green', fill: '#059669' },
  grey: { label: 'grey', fill: '#64748b' }
};
const COLOUR_KEYS = Object.keys(COLOURS);
const marbles = (counts) => Object.entries(counts).flatMap(([c, k]) => Array(k).fill(c));
const total = (counts) => Object.values(counts).reduce((s, k) => s + k, 0);
export const countsText = (counts) => Object.entries(counts).filter(([, k]) => k > 0).map(([c, k]) => `${k} ${c}`).join(', ');

/* ------------------------------------------------------------------ experiments */

/** All ordered tuples of `k` values from `values` (with replacement). */
const tuples = (values, k) => (k === 0 ? [[]] : tuples(values, k - 1).flatMap((t) => values.map((v) => [...t, v])));
const DIE = [1, 2, 3, 4, 5, 6];

/** Ordered draws of `k` marbles by index, without replacement: equally likely. */
const orderedDraws = (n, k) => {
  const out = [];
  const go = (pre) => {
    if (pre.length === k) { out.push(pre); return; }
    for (let i = 0; i < n; i++) if (!pre.includes(i)) go([...pre, i]);
  };
  go([]);
  return out;
};
const subsets = (n, r) => {
  const out = [];
  const go = (start, pre) => {
    if (pre.length === r) { out.push(pre); return; }
    for (let i = start; i < n; i++) go(i + 1, [...pre, i]);
  };
  go(0, []);
  return out;
};

const exp = {
  dice: (k) => ({ scene: { type: 'dice', count: k }, space: () => tuples(DIE, k), draw: (rng) => Array.from({ length: k }, () => ri(rng, 1, 6)), size: 6 ** k }),
  coins: (k) => ({ scene: { type: 'coins', count: k }, space: () => tuples(['H', 'T'], k), draw: (rng) => Array.from({ length: k }, () => (rng() < 0.5 ? 'H' : 'T')), size: 2 ** k }),
  spinner: (sectors, k) => ({ scene: { type: 'spinner', sectors, spins: k }, space: () => tuples(sectors, k), draw: (rng) => Array.from({ length: k }, () => pickOne(rng, sectors)), size: sectors.length ** k }),
  bag: (counts, k, replace) => {
    const list = marbles(counts);
    const n = list.length;
    return {
      scene: { type: 'bag', counts, draws: k, replace },
      space: () => (replace ? tuples(list, k) : orderedDraws(n, k).map((ix) => ix.map((i) => list[i]))),
      draw: (rng) => (replace ? Array.from({ length: k }, () => pickOne(rng, list)) : shuffled(rng, list).slice(0, k)),
      size: replace ? n ** k : n * (n - 1)
    };
  },
  committee: (names, r) => ({
    scene: { type: 'committee', names, r },
    space: () => subsets(names.length, r).map((ix) => ix.map((i) => names[i])),
    draw: (rng) => shuffled(rng, names).slice(0, r),
    size: choose(names.length, r)
  })
};

/* ------------------------------------------------------------------ estimate events */

const sum = (o) => o.reduce((s, v) => s + v, 0);
const PEOPLE = ['Asha', 'Ben', 'Chen', 'Dev', 'Esha', 'Farah', 'Gopal', 'Hana'];

const spinnerSectors = (rng, n, colours) => {
  const counts = {};
  let left = n;
  colours.forEach((c, i) => {
    const k = i === colours.length - 1 ? left : ri(rng, 1, left - (colours.length - 1 - i));
    counts[c] = k;
    left -= k;
  });
  return { counts, sectors: shuffled(rng, marbles(counts)) };
};

const bagCounts = (rng, colours, lo, hi) => Object.fromEntries(colours.map((c) => [c, ri(rng, lo, hi)]));

/**
 * Templates: (rng) → { e (experiment), text, exact, explain }. Analytical first, then advanced.
 * `den` for the slider is the size of the experiment's natural sample space (capped at 100).
 */
const ANALYTICAL = [
  (rng) => {
    const k = ri(rng, 2, 4);
    return { e: exp.dice(1), text: `Roll one die. P(a number greater than ${k})?`, judge: (o) => o[0] > k, exact: frac(6 - k, 6), explain: `${6 - k} of the 6 faces are above ${k}: ${6 - k}/6.` };
  },
  (rng) => {
    const which = pickOne(rng, [
      { t: 'a prime number', f: (v) => [2, 3, 5].includes(v), c: 3, why: 'The primes are 2, 3 and 5' },
      { t: 'a multiple of 3', f: (v) => v % 3 === 0, c: 2, why: 'Only 3 and 6' },
      { t: 'NOT a multiple of 3', f: (v) => v % 3 !== 0, c: 4, why: 'Complement: 1 − P(3 or 6) = 1 − 2/6' },
      { t: 'NOT a 6', f: (v) => v !== 6, c: 5, why: 'Complement: 1 − 1/6' }
    ]);
    return { e: exp.dice(1), text: `Roll one die. P(${which.t})?`, judge: (o) => which.f(o[0]), exact: frac(which.c, 6), explain: `${which.why}: ${which.c}/6.` };
  },
  (rng) => {
    const n = ri(rng, 6, 10);
    const [x, y] = shuffled(rng, COLOUR_KEYS.slice(0, 4)).slice(0, 2);
    const { counts, sectors } = spinnerSectors(rng, n, [x, y, pickOne(rng, COLOUR_KEYS.filter((c) => c !== x && c !== y))]);
    const not = rng() < 0.5;
    const c = counts[x];
    return {
      e: exp.spinner(sectors, 1),
      text: not ? `Spin once. P(it does NOT land on ${x})?` : `Spin once. P(it lands on ${x})?`,
      judge: (o) => (o[0] === x) !== not,
      exact: not ? comp(frac(c, n)) : frac(c, n),
      explain: not ? `${c} of ${n} equal sectors are ${x}, so P(not ${x}) = 1 − ${c}/${n} = ${fmt(comp(frac(c, n)))}.` : `${c} of the ${n} equal sectors are ${x}: ${fmt(frac(c, n))}.`
    };
  },
  (rng) => {
    const pick = pickOne(rng, [
      () => { const s = ri(rng, 4, 10); const c = 6 - Math.abs(s - 7); return { t: `the total is ${s}`, f: (o) => sum(o) === s, x: frac(c, 36), why: `${c} of the 36 ordered pairs add to ${s}` }; },
      () => ({ t: 'both dice are even', f: (o) => o.every((v) => v % 2 === 0), x: mul(frac(1, 2), frac(1, 2)), why: 'Independent: 1/2 × 1/2 = 1/4' }),
      () => ({ t: 'a double', f: (o) => o[0] === o[1], x: frac(6, 36), why: '6 doubles out of 36 pairs = 1/6' }),
      () => ({ t: 'at least one six', f: (o) => o.includes(6), x: comp(mul(frac(5, 6), frac(5, 6))), why: 'Complement: 1 − P(no six) = 1 − (5/6)² = 11/36' })
    ])();
    return { e: exp.dice(2), text: `Roll two dice. P(${pick.t})?`, judge: pick.f, exact: pick.x, explain: `${pick.why}.` };
  },
  (rng) => {
    const [x, y] = shuffled(rng, COLOUR_KEYS.slice(0, 4)).slice(0, 2);
    const counts = bagCounts(rng, [x, y], 2, 6);
    const n = total(counts);
    const p = frac(counts[x], n);
    const kind = pickOne(rng, ['both', 'neither', 'atleast']);
    const q = comp(p);
    const map = {
      both: { t: `both are ${x}`, f: (o) => o.every((c) => c === x), x: mul(p, p), why: `Replaced, so independent: (${fmt(p)})² = ${fmt(mul(p, p))}` },
      neither: { t: `neither is ${x}`, f: (o) => o.every((c) => c !== x), x: mul(q, q), why: `P(not ${x}) each time is ${fmt(q)}: (${fmt(q)})² = ${fmt(mul(q, q))}` },
      atleast: { t: `at least one is ${x}`, f: (o) => o.includes(x), x: comp(mul(q, q)), why: `Complement: 1 − (${fmt(q)})² = ${fmt(comp(mul(q, q)))}` }
    }[kind];
    return { e: exp.bag(counts, 2, true), text: `A bag holds ${countsText(counts)}. Draw one, put it back, draw again. P(${map.t})?`, judge: map.f, exact: map.x, explain: `${map.why}.` };
  },
  (rng) => {
    const k = ri(rng, 2, 4);
    const all = rng() < 0.5;
    return {
      e: exp.coins(k),
      text: all ? `Toss ${k} coins. P(all tails)?` : `Toss ${k} coins. P(at least one head)?`,
      judge: all ? (o) => o.every((c) => c === 'T') : (o) => o.includes('H'),
      exact: all ? frac(1, 2 ** k) : comp(frac(1, 2 ** k)),
      explain: all ? `(1/2)^${k} = 1/${2 ** k}.` : `Complement of all tails: 1 − 1/${2 ** k} = ${fmt(comp(frac(1, 2 ** k)))}.`
    };
  },
  (rng) => {
    const n = ri(rng, 5, 8);
    const [x, y, z] = shuffled(rng, COLOUR_KEYS.slice(0, 4)).slice(0, 3);
    const { counts, sectors } = spinnerSectors(rng, n, [x, y, z]);
    const p = frac(counts[x], n);
    const q = comp(p);
    const atleast = rng() < 0.5;
    return {
      e: exp.spinner(sectors, 2),
      text: atleast ? `Spin twice. P(at least one ${x})?` : `Spin twice. P(both land on ${x})?`,
      judge: atleast ? (o) => o.includes(x) : (o) => o.every((c) => c === x),
      exact: atleast ? comp(mul(q, q)) : mul(p, p),
      explain: atleast ? `1 − P(no ${x} either spin) = 1 − (${fmt(q)})² = ${fmt(comp(mul(q, q)))}.` : `(${fmt(p)})² = ${fmt(mul(p, p))}: the spins are independent.`
    };
  }
];

const ADVANCED = [
  (rng) => {
    const [x, y] = shuffled(rng, COLOUR_KEYS.slice(0, 4)).slice(0, 2);
    const counts = bagCounts(rng, [x, y], 2, 6);
    const n = total(counts);
    const cx = counts[x];
    const cy = counts[y];
    const kind = pickOne(rng, ['both', 'mixed', 'atleast']);
    const all = frac(1, n * (n - 1));
    const map = {
      both: { t: `both are ${x}`, f: (o) => o[0] === x && o[1] === x, x: frac(cx * (cx - 1), n * (n - 1)), why: `${cx}/${n} × ${cx - 1}/${n - 1} = ${fmt(frac(cx * (cx - 1), n * (n - 1)))} — one ${x} is gone after the first draw` },
      mixed: { t: `one ${x} and one ${y} (either order)`, f: (o) => o.includes(x) && o.includes(y), x: mul(frac(2 * cx * cy), all), why: `${x}-then-${y} or ${y}-then-${x}: 2 × ${cx}/${n} × ${cy}/${n - 1} = ${fmt(mul(frac(2 * cx * cy), all))}` },
      atleast: { t: `at least one ${x}`, f: (o) => o.includes(x), x: comp(frac(cy * (cy - 1), n * (n - 1))), why: `1 − P(both ${y}) = 1 − ${cy}/${n} × ${cy - 1}/${n - 1} = ${fmt(comp(frac(cy * (cy - 1), n * (n - 1))))}` }
    }[kind];
    return { e: exp.bag(counts, 2, false), text: `A bag holds ${countsText(counts)}. Draw two without putting the first back. P(${map.t})?`, judge: map.f, exact: map.x, explain: `${map.why}.` };
  },
  (rng) => {
    const [x, y] = shuffled(rng, COLOUR_KEYS.slice(0, 4)).slice(0, 2);
    const counts = bagCounts(rng, [x, y], 2, 6);
    const n = total(counts);
    const cx = counts[x];
    const cy = counts[y];
    const kind = pickOne(rng, ['second', 'first', 'bothGiven']);
    if (kind === 'second') return { e: exp.bag(counts, 2, false), text: `Bag: ${countsText(counts)}. Two draws, no replacement. Given the first is ${x}, P(the second is ${x})?`, judge: (o) => (o[0] !== x ? null : o[1] === x), exact: frac(cx - 1, n - 1), explain: `After one ${x} leaves, ${cx - 1} of the ${n - 1} left are ${x}: ${fmt(frac(cx - 1, n - 1))}.` };
    if (kind === 'first') return { e: exp.bag(counts, 2, false), text: `Bag: ${countsText(counts)}. Two draws, no replacement. Given the SECOND is ${x}, P(the first was ${x})?`, judge: (o) => (o[1] !== x ? null : o[0] === x), exact: frac(cx - 1, n - 1), explain: `By symmetry it is the same as the other way round: P(both ${x}) ÷ P(second ${x}) = (${cx}·${cx - 1}/${n}·${n - 1}) ÷ (${cx}/${n}) = ${fmt(frac(cx - 1, n - 1))}.` };
    const both = frac(cx * (cx - 1), n * (n - 1));
    const any = comp(frac(cy * (cy - 1), n * (n - 1)));
    return { e: exp.bag(counts, 2, false), text: `Bag: ${countsText(counts)}. Two draws, no replacement. Given AT LEAST ONE is ${x}, P(both are ${x})?`, judge: (o) => (!o.includes(x) ? null : o[0] === x && o[1] === x), exact: div(both, any), explain: `P(both) ÷ P(at least one) = ${fmt(both)} ÷ ${fmt(any)} = ${fmt(div(both, any))}.` };
  },
  (rng) => {
    const kind = pickOne(rng, ['firstK', 'sumT', 'even']);
    if (kind === 'firstK') {
      const k = ri(rng, 2, 5);
      const s = ri(rng, k + 3, k + 6);
      const c = Math.max(0, Math.min(6, 7 - (s - k)));
      return { e: exp.dice(2), text: `Two dice. Given the first shows ${k}, P(the total is at least ${s})?`, judge: (o) => (o[0] !== k ? null : sum(o) >= s), exact: frac(c, 6), explain: `The second die needs ${s - k} or more: ${c} of its 6 faces, so ${fmt(frac(c, 6))}.` };
    }
    if (kind === 'sumT') {
      const t = ri(rng, 8, 10);
      const ways = 13 - t;
      return { e: exp.dice(2), text: `Two dice. Given the total is ${t}, P(at least one die shows 6)?`, judge: (o) => (sum(o) !== t ? null : o.includes(6)), exact: frac(2, ways), explain: `${ways} ordered pairs make ${t}; two of them, (6, ${t - 6}) and (${t - 6}, 6), contain a six: ${fmt(frac(2, ways))}.` };
    }
    return { e: exp.dice(2), text: 'Two dice. Given at least one is even, P(both are even)?', judge: (o) => (!o.some((v) => v % 2 === 0) ? null : o.every((v) => v % 2 === 0)), exact: div(frac(9, 36), frac(27, 36)), explain: '9 of 36 pairs are both even; 27 have at least one even: 9/27 = 1/3.' };
  },
  (rng) => {
    const n = ri(rng, 3, 5);
    const k = ri(rng, 1, n - 1);
    return { e: exp.coins(n), text: `Toss ${n} coins. P(exactly ${k} head${k === 1 ? '' : 's'})?`, judge: (o) => o.filter((c) => c === 'H').length === k, exact: frac(choose(n, k), 2 ** n), explain: `C(${n},${k}) = ${choose(n, k)} ways out of 2^${n} = ${2 ** n}: ${fmt(frac(choose(n, k), 2 ** n))}.` };
  },
  (rng) => {
    const n = ri(rng, 5, 8);
    const r = ri(rng, 2, Math.min(4, n - 2));
    const names = PEOPLE.slice(0, n);
    const kind = pickOne(rng, ['both', 'one', 'neither']);
    const all = choose(n, r);
    const map = {
      both: { t: 'Asha and Ben are both picked', f: (o) => o.includes('Asha') && o.includes('Ben'), c: choose(n - 2, r - 2), why: `Fix both, choose the other ${r - 2} from ${n - 2}: C(${n - 2},${r - 2}) = ${choose(n - 2, r - 2)} of C(${n},${r}) = ${all}` },
      one: { t: 'Asha is picked', f: (o) => o.includes('Asha'), c: choose(n - 1, r - 1), why: `C(${n - 1},${r - 1}) = ${choose(n - 1, r - 1)} of ${all} teams include her — that is ${r}/${n}` },
      neither: { t: 'neither Asha nor Ben is picked', f: (o) => !o.includes('Asha') && !o.includes('Ben'), c: choose(n - 2, r), why: `All ${r} from the other ${n - 2}: C(${n - 2},${r}) = ${choose(n - 2, r)} of ${all}` }
    }[kind];
    return { e: exp.committee(names, r), text: `A team of ${r} is chosen at random from ${n} people. P(${map.t})?`, judge: map.f, exact: frac(map.c, all), explain: `${map.why}: ${fmt(frac(map.c, all))}.` };
  }
];

const TOL = [0.07, 0.05, 0.035];

/** A slider-estimate round. */
export const estimateRound = (rng, band, difficulty) => {
  const pool = band === 'analytical' ? ANALYTICAL : ADVANCED;
  const t = pickOne(rng, pool)(rng);
  return {
    kind: 'estimate',
    prompt: t.text,
    scene: t.e.scene,
    exact: t.exact,
    den: t.e.size <= 100 ? t.e.size : 100,
    tol: TOL[Math.min(2, Math.max(0, difficulty - 1))],
    explain: t.explain,
    space: t.e.space,
    draw: t.e.draw,
    judge: t.judge
  };
};

/* ------------------------------------------------------------------ bags */

/** Which bag? Analytical: one draw. Advanced: two draws without replacement, both the target colour. */
export const bagsRound = (rng, band, difficulty) => {
  const pair = band !== 'analytical';
  const howMany = difficulty >= 2 ? 3 : 2;
  const [x, y] = shuffled(rng, COLOUR_KEYS.slice(0, 4)).slice(0, 2);
  const pOf = (c) => (pair ? frac(c[x] * (c[x] - 1), total(c) * (total(c) - 1)) : frac(c[x], total(c)));
  const minGap = [0.12, 0.06, 0.025][Math.min(2, difficulty - 1)];
  for (let tries = 0; tries < 500; tries++) {
    const bags = Array.from({ length: howMany }, () => ({ [x]: ri(rng, pair ? 2 : 1, pair ? 7 : 8), [y]: ri(rng, 1, 8) }));
    const probs = bags.map(pOf);
    const order = probs.map((p, i) => i).sort((a, b) => cmp(probs[b], probs[a]));
    const gap = toNum(probs[order[0]]) - toNum(probs[order[1]]);
    if (gap < minGap || gap > minGap * 4) continue;
    // A trap worth having: the best bag does not also hold the most of the colour.
    const most = bags.map((b) => b[x]).indexOf(Math.max(...bags.map((b) => b[x])));
    if (difficulty >= 2 && most === order[0] && tries < 400) continue;
    const best = order[0];
    const why = bags.map((b, i) => `Bag ${'ABC'[i]}: ${pair ? `${b[x]}/${total(b)} × ${b[x] - 1}/${total(b) - 1}` : `${b[x]}/${total(b)}`} = ${fmt(probs[i])} ≈ ${Math.round(toNum(probs[i]) * 100)}%`).join(' · ');
    return {
      kind: 'bags',
      prompt: pair ? `You draw TWO marbles without putting the first back. Which bag gives the best chance that both are ${x}?` : `You draw one marble. Which bag gives the best chance of ${x}?`,
      target: x, other: y, pair, bags, probs, answer: best,
      explain: `${why}. It is the share that counts, not how many.`,
      space: (i) => exp.bag(bags[i], pair ? 2 : 1, false).space(),
      draw: (rng2, i) => exp.bag(bags[i], pair ? 2 : 1, false).draw(rng2),
      judge: (o) => o.every((c) => c === x)
    };
  }
  throw new Error('no bag round');
};

/* ------------------------------------------------------------------ bets (expected value) */

/** One game: a mechanic with an exact chance, a fee and a prize. */
const makeGame = (rng) => {
  const kind = pickOne(rng, ['die', 'twoDice', 'coins', 'bag', 'double']);
  if (kind === 'die') { const k = ri(rng, 4, 6); return { mech: exp.dice(1), text: `Roll a die; win on ${k === 6 ? 'a 6' : `${k} or more`}`, win: (o) => o[0] >= k, p: frac(7 - k, 6) }; }
  if (kind === 'twoDice') { const s = ri(rng, 9, 11); return { mech: exp.dice(2), text: `Roll two dice; win if the total is ${s} or more`, win: (o) => sum(o) >= s, p: frac([0, 10, 6, 3][s - 8], 36) }; }
  if (kind === 'coins') { const n = ri(rng, 2, 3); return { mech: exp.coins(n), text: `Toss ${n} coins; win if all are heads`, win: (o) => o.every((c) => c === 'H'), p: frac(1, 2 ** n) }; }
  if (kind === 'double') return { mech: exp.dice(2), text: 'Roll two dice; win on a double', win: (o) => o[0] === o[1], p: frac(1, 6) };
  const r = ri(rng, 1, 3);
  const b = ri(rng, 3, 6);
  return { mech: exp.bag({ red: r, blue: b }, 2, false), text: `Draw 2 from ${r} red + ${b} blue; win if at least one is red`, win: (o) => o.includes('red'), p: comp(frac(b * (b - 1), (r + b) * (r + b - 1))) };
};

/** Two games to pay for; pick the one worth more per play. */
export const betsRound = (rng, band, difficulty) => {
  const minGap = [0.5, 0.25, 0.1][Math.min(2, difficulty - 1)];
  for (let tries = 0; tries < 800; tries++) {
    const games = [0, 1].map(() => {
      const g = makeGame(rng);
      const fee = ri(rng, 1, 5) * 2;
      const prize = ri(rng, 2, 12) * 5;
      const ev = sub(mul(g.p, frac(prize)), frac(fee));
      return { ...g, fee, prize, ev, text: `${g.text}. Costs ₹${fee}, pays ₹${prize}.` };
    });
    if (games[0].text === games[1].text) continue;
    const gap = Math.abs(toNum(games[0].ev) - toNum(games[1].ev));
    if (gap < minGap || gap > minGap * 6) continue;
    const best = cmp(games[0].ev, games[1].ev) > 0 ? 0 : 1;
    // Keep the trap: the bigger prize should not always be the better game.
    if (games[best].prize > games[1 - best].prize && rng() < 0.6) continue;
    const line = (g, i) => `Game ${'AB'[i]}: ${fmt(g.p)} × ₹${g.prize} − ₹${g.fee} = ₹${fmtMoney(g.ev)} per play`;
    return {
      kind: 'bets',
      prompt: 'Which game would you play 100 times? Pick the one with the higher expected value per play.',
      games: games.map((g) => ({ text: g.text, fee: g.fee, prize: g.prize, p: g.p, ev: g.ev })),
      answer: best,
      explain: `${games.map(line).join(' · ')}. Expected value = chance × prize − cost.`,
      space: (i) => games[i].mech.space(),
      draw: (rng2, i) => games[i].mech.draw(rng2),
      value: (i, o) => (games[i].win(o) ? games[i].prize : 0) - games[i].fee
    };
  }
  throw new Error('no bets round');
};

export const fmtMoney = (f) => {
  const v = toNum(f);
  const s = Math.abs(v).toFixed(2).replace(/\.00$/, '');
  return `${v < 0 ? '−' : ''}${s}`;
};

/* ------------------------------------------------------------------ levels */

/** The rounds of one level. Analytical: bags + estimates. Advanced: bags, estimates and bets. */
export const probabilityLevel = (rng, band, difficulty, levelNo) => {
  const b = band === 'analytical' ? 'analytical' : 'advanced';
  const count = 5 + (levelNo > 12 ? 1 : 0) + (difficulty === 3 ? 1 : 0);
  const order = b === 'analytical'
    ? ['bags', 'estimate', 'estimate', 'bags', 'estimate', 'estimate', 'bags']
    : ['bags', 'estimate', 'bets', 'estimate', 'bags', 'bets', 'estimate'];
  return order.slice(0, count).map((k) => (k === 'bags' ? bagsRound(rng, b, difficulty) : k === 'bets' ? betsRound(rng, b, difficulty) : estimateRound(rng, b, difficulty)));
};

/** Is a slider guess (k/den) close enough? */
export const estimateOk = (round, k) => Math.abs(k / round.den - toNum(round.exact)) <= round.tol + 1e-9;
