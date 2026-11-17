/**
 * Fraction Battle — head-to-head fraction rounds against a computer opponent,
 * with exact rational arithmetic (integers only, never floats). Pure and seeded.
 *
 * A fraction is { n, d } with d > 0. Cards are shown as dealt (4/6 stays 4/6);
 * every comparison is exact, by cross-multiplying.
 *
 * Round kinds:
 *  duel   you and the opponent each hold a card — say whose is bigger (or equal)
 *  order  put 3–4 cards in order, smallest first (or largest first)
 *  beat   the opponent plays a card; pick two of yours whose sum (or difference)
 *         is bigger, and work the result out exactly
 */
import { intBetween, pick } from '../seeded.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

export const frac = (n, d) => {
  if (!d) throw new Error('zero denominator');
  const s = d < 0 ? -1 : 1;
  const g = gcd(n, d) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
};
/** Compare: negative if a < b, 0 if equal, positive if a > b. */
export const cmp = (a, b) => a.n * b.d - b.n * a.d;
export const equal = (a, b) => cmp(a, b) === 0;
export const add = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const fracText = (f) => `${f.n}/${f.d}`;

export const fractionBand = (ageBand) => (ageBand === 'analytical' || ageBand === 'advanced' ? 'analytical' : 'intermediate');

/**
 *  rounds     best of N
 *  kinds      round kinds dealt, in rotation
 *  maxD       largest denominator
 *  improper   cards may be bigger than 1
 *  orderSize  cards to order
 *  hand       cards in a beat hand
 *  ops        '+' and/or '−' for beat rounds
 *  likeDen    beat hands share a denominator (easiest)
 *  seconds    per round kind (pausable)
 */
export const fractionConfig = (ageBand, difficulty = 1, levelNo = 1) => {
  const band = fractionBand(ageBand);
  const d = clamp(difficulty || 1, 1, 3);
  const t = clamp((levelNo - 1) / 29, 0, 1);
  if (band === 'intermediate') {
    return {
      band, rounds: d === 3 ? 7 : 5,
      kinds: d === 1 ? ['duel', 'order', 'duel'] : ['duel', 'order', 'beat'],
      maxD: d === 1 ? 8 : d === 2 ? 10 : 12, improper: false,
      orderSize: d === 1 && t < 0.5 ? 3 : 4, hand: 3, ops: ['+'], likeDen: d === 1 || (d === 2 && t < 0.5), descending: false,
      seconds: { duel: 25 - d * 2, order: 45, beat: 75 }
    };
  }
  return {
    band, rounds: d === 3 ? 9 : 7,
    kinds: ['duel', 'order', 'beat'],
    maxD: d === 1 ? 12 : 15, improper: d >= 2,
    orderSize: 4, hand: d === 3 ? 4 : 3, ops: d === 1 ? ['+'] : ['+', '−'], likeDen: false, descending: d === 3 && t >= 0.5,
    seconds: { duel: 18 - d * 2, order: 40, beat: 70 - d * 5 }
  };
};

/** A card: never a whole number in disguise (4/4, 6/3). */
const card = (rng, cfg) => {
  for (;;) {
    const d = intBetween(rng, 2, cfg.maxD);
    const n = intBetween(rng, 1, cfg.improper && rng() < 0.35 ? 2 * d - 1 : d - 1);
    if (n % d !== 0) return { n, d };
  }
};

/** Duel: { kind, mine, theirs, answer: 'mine' | 'theirs' | 'equal' }. */
export const makeDuel = (rng, cfg) => {
  if (rng() < 0.15) {
    const base = card(rng, { ...cfg, maxD: Math.max(3, Math.floor(cfg.maxD / 2)) });
    const g = gcd(base.n, base.d);
    const small = { n: base.n / g, d: base.d / g };
    const k = intBetween(rng, 2, 3);
    const big = { n: small.n * k, d: small.d * k };
    const [mine, theirs] = rng() < 0.5 ? [small, big] : [big, small];
    return { kind: 'duel', mine, theirs, answer: 'equal' };
  }
  for (;;) {
    const mine = card(rng, cfg);
    const theirs = card(rng, cfg);
    const c = cmp(mine, theirs);
    if (c === 0 || (mine.n === theirs.n && mine.d === theirs.d)) continue;
    // Tricky at the top: close values with different denominators.
    if (cfg.band === 'analytical' && Math.abs(c) > mine.d * theirs.d * 0.25) continue;
    return { kind: 'duel', mine, theirs, answer: c > 0 ? 'mine' : 'theirs' };
  }
};

/** Order: { kind, cards (dealt order), answer (sorted), descending }. Values all different. */
export const makeOrder = (rng, cfg) => {
  for (;;) {
    const cards = Array.from({ length: cfg.orderSize }, () => card(rng, cfg));
    let distinct = true;
    for (let i = 0; i < cards.length && distinct; i++) for (let j = i + 1; j < cards.length; j++) if (equal(cards[i], cards[j])) { distinct = false; break; }
    if (!distinct) continue;
    const answer = [...cards].sort((a, b) => (cfg.descending ? cmp(b, a) : cmp(a, b)));
    if (answer.every((c, i) => c === cards[i])) continue;
    return { kind: 'order', cards, answer, descending: Boolean(cfg.descending) };
  }
};

/** The value two cards make with an operator (difference is bigger minus smaller). */
export const combine = (a, b, op) => (op === '+' ? add(a, b) : cmp(a, b) >= 0 ? sub(a, b) : sub(b, a));

/** Beat: { kind, op, theirs, hand, winners: [[i, j]…] } — some pairs win, some do not. */
export const makeBeat = (rng, cfg) => {
  const op = pick(rng, cfg.ops);
  for (;;) {
    const den = intBetween(rng, 3, Math.min(cfg.maxD, 12));
    const hand = Array.from({ length: cfg.hand }, () => (cfg.likeDen ? { n: intBetween(rng, 1, den - 1), d: den } : card(rng, cfg)));
    const pairs = [];
    for (let i = 0; i < hand.length; i++) for (let j = i + 1; j < hand.length; j++) pairs.push([i, j, combine(hand[i], hand[j], op)]);
    if (pairs.some(([, , v]) => v.n === 0)) continue;
    const sorted = [...pairs].sort((a, b) => cmp(a[2], b[2]));
    // The opponent's card sits strictly between two pair values: at least one pair wins, at least one loses.
    const lowIdx = intBetween(rng, 0, sorted.length - 2);
    const lo = sorted[lowIdx][2], hi = sorted[lowIdx + 1][2];
    if (cmp(lo, hi) === 0) continue;
    const mid = frac(lo.n * hi.d + hi.n * lo.d, 2 * lo.d * hi.d);
    // Prefer a friendlier card than the exact midpoint when one fits.
    let theirs = mid;
    for (let d = 2; d <= Math.max(cfg.maxD, 12); d++) {
      const n = Math.floor((lo.n * d) / lo.d) + 1;
      const c = { n, d };
      if (cmp(c, lo) > 0 && cmp(c, hi) < 0) { theirs = c; break; }
    }
    if (theirs.d > 60) continue;
    if (theirs.d === 1) theirs = { n: theirs.n * 2, d: 2 };
    const winners = pairs.filter(([, , v]) => cmp(v, theirs) > 0).map(([i, j]) => [i, j]);
    if (!winners.length || winners.length === pairs.length) continue;
    return { kind: 'beat', op, theirs, hand, winners };
  }
};

export const makeFractionLevel = (rng, cfg) =>
  Array.from({ length: cfg.rounds }, (_, i) => {
    const kind = cfg.kinds[i % cfg.kinds.length];
    return kind === 'duel' ? makeDuel(rng, cfg) : kind === 'order' ? makeOrder(rng, cfg) : makeBeat(rng, cfg);
  });

/* ---- Judges ---- */

export const judgeDuel = (round, choice) => choice === round.answer;

/** An order is right when every neighbouring pair is in order (equal values cannot occur). */
export const judgeOrder = (round, cards) =>
  cards.length === round.cards.length && cards.every((c, i) => i === 0 || (round.descending ? cmp(cards[i - 1], c) > 0 : cmp(cards[i - 1], c) < 0));

/**
 * A beat answer: the two chosen card indexes and the player's result (numerator, denominator as entered).
 *  { correctValue: did they work it out (any equivalent form), beats: does that pair beat the card, won }
 */
export const judgeBeat = (round, i, j, n, d) => {
  const value = combine(round.hand[i], round.hand[j], round.op);
  const correctValue = Number.isInteger(n) && Number.isInteger(d) && d > 0 && n >= 0 && n * value.d === value.n * d;
  const beats = cmp(value, round.theirs) > 0;
  return { value, correctValue, beats, won: correctValue && beats };
};
