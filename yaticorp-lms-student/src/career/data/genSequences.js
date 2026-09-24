/**
 * Number patterns for "Next in Sequence", built rather than written.
 *
 * Fifteen hand-written runs per band meant a student met the same run again
 * by level four. These are generated from rule families instead: every band
 * gets a hundred and fifty runs, the families get harder as the band goes on, and the
 * numbers inside a family are drawn from a seeded generator, so the pool is
 * identical on every visit and the question memory can keep track of it.
 *
 * Each item: { run, answer, options, rule, level, tier }.
 */
import { seeded, intBetween, pick, shuffle, tierOf, numberDistractors } from './seeded.js';

const PER_BAND = 150;

/* ---- Rule families -----------------------------------------------------
 * Each takes the generator and returns { run, answer, rule }. Runs are four
 * or five terms long; the answer is the term after them.
 */

const arithmetic = (rng, stepMin, stepMax, startMax, len = 4) => {
  const step = intBetween(rng, stepMin, stepMax);
  const start = intBetween(rng, 1, startMax);
  const run = Array.from({ length: len }, (_, i) => start + step * i);
  return { run, answer: start + step * len, rule: `Add ${step} each time` };
};

const descending = (rng, stepMin, stepMax, len = 4) => {
  const step = intBetween(rng, stepMin, stepMax);
  const start = step * (len + 1) + intBetween(rng, 0, step * 3);
  const run = Array.from({ length: len }, (_, i) => start - step * i);
  return { run, answer: start - step * len, rule: `Subtract ${step} each time` };
};

const geometric = (rng, factors, startMax, len = 4) => {
  const factor = pick(rng, factors);
  const start = intBetween(rng, 1, startMax);
  const run = Array.from({ length: len }, (_, i) => start * factor ** i);
  const rule = factor === 2 ? 'Double each time' : `Multiply by ${factor} each time`;
  return { run, answer: start * factor ** len, rule };
};

const halving = (rng, factors, len = 4) => {
  const factor = pick(rng, factors);
  const seed = intBetween(rng, 1, 6);
  const start = seed * factor ** len;
  const run = Array.from({ length: len }, (_, i) => start / factor ** i);
  const rule = factor === 2 ? 'Halve each time' : `Divide by ${factor} each time`;
  return { run, answer: start / factor ** len, rule };
};

const squares = (rng, len = 4) => {
  const from = intBetween(rng, 1, 5);
  const run = Array.from({ length: len }, (_, i) => (from + i) ** 2);
  return { run, answer: (from + len) ** 2, rule: `Square numbers, from ${from} squared upward` };
};

const cubes = (rng, len = 4) => {
  const from = intBetween(rng, 1, 5);
  const run = Array.from({ length: len }, (_, i) => (from + i) ** 3);
  return { run, answer: (from + len) ** 3, rule: `Cube numbers, from ${from} cubed upward` };
};

const fibonacciLike = (rng, len = 5) => {
  const a = intBetween(rng, 1, 4);
  const b = intBetween(rng, a, a + 4);
  const run = [a, b];
  while (run.length < len) run.push(run[run.length - 1] + run[run.length - 2]);
  return { run, answer: run[len - 1] + run[len - 2], rule: 'Each is the sum of the two before it' };
};

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53];
const primes = (rng) => {
  const len = intBetween(rng, 4, 5);
  const from = intBetween(rng, 0, PRIMES.length - len - 1);
  return { run: PRIMES.slice(from, from + len), answer: PRIMES[from + len], rule: 'Prime numbers' };
};

const doublePlus = (rng, len = 4) => {
  const k = pick(rng, [-2, -1, 1, 2, 3]);
  const start = intBetween(rng, 1, 6);
  const run = [start];
  while (run.length < len) run.push(run[run.length - 1] * 2 + k);
  const word = k > 0 ? `add ${k}` : `subtract ${-k}`;
  return { run, answer: run[len - 1] * 2 + k, rule: `Double and ${word}` };
};

const triplePlus = (rng, len = 4) => {
  const k = pick(rng, [-1, 1, 2]);
  const start = intBetween(rng, 1, 4);
  const run = [start];
  while (run.length < len) run.push(run[run.length - 1] * 3 + k);
  const word = k > 0 ? `add ${k}` : `subtract ${-k}`;
  return { run, answer: run[len - 1] * 3 + k, rule: `Multiply by 3 and ${word}` };
};

const alternating = (rng, len = 5) => {
  const up = intBetween(rng, 2, 6);
  const down = intBetween(rng, 1, up - 1);
  const start = intBetween(rng, 3, 15);
  const run = [start];
  while (run.length < len) {
    const i = run.length;
    run.push(run[i - 1] + (i % 2 === 1 ? up : -down));
  }
  const next = run[len - 1] + (len % 2 === 1 ? up : -down);
  return { run, answer: next, rule: `Add ${up}, then subtract ${down}, repeating` };
};

const growingGaps = (rng, by, len = 5) => {
  const start = intBetween(rng, 1, 10);
  const first = intBetween(rng, 1, 4);
  const run = [start];
  let gap = first;
  while (run.length < len) {
    run.push(run[run.length - 1] + gap);
    gap += by;
  }
  const gaps = Array.from({ length: len }, (_, i) => `+${first + by * i}`).join(', ');
  return { run, answer: run[len - 1] + gap, rule: `The gaps grow by ${by}: ${gaps}` };
};

const shrinkingGaps = (rng, len = 5) => {
  const start = intBetween(rng, 60, 120);
  let gap = intBetween(rng, 10, 14);
  const first = gap;
  const run = [start];
  while (run.length < len) {
    run.push(run[run.length - 1] - gap);
    gap -= 1;
  }
  const gaps = Array.from({ length: len }, (_, i) => `-${first - i}`).join(', ');
  return { run, answer: run[len - 1] - gap, rule: `The gaps shrink by 1: ${gaps}` };
};

const triangular = (rng) => {
  const len = intBetween(rng, 4, 5);
  const from = intBetween(rng, 1, 8);
  const tri = (n) => (n * (n + 1)) / 2;
  const run = Array.from({ length: len }, (_, i) => tri(from + i));
  return { run, answer: tri(from + len), rule: 'Triangular numbers: the gaps grow by one' };
};

const squaresPlus = (rng, len = 4) => {
  const k = pick(rng, [-1, 1, 2, 3]);
  const from = intBetween(rng, 1, 4);
  const run = Array.from({ length: len }, (_, i) => (from + i) ** 2 + k);
  const word = k > 0 ? `plus ${k}` : `minus ${-k}`;
  return { run, answer: (from + len) ** 2 + k, rule: `Square numbers ${word}` };
};

const powersMinusOne = (rng) => {
  const len = intBetween(rng, 4, 5);
  const base = pick(rng, [2, 3]);
  const from = intBetween(rng, 1, 3);
  const run = Array.from({ length: len }, (_, i) => base ** (from + i) - 1);
  return { run, answer: base ** (from + len) - 1, rule: `Powers of ${base}, each minus 1` };
};

const interleaved = (rng, len = 6) => {
  const a0 = intBetween(rng, 1, 9);
  const da = intBetween(rng, 2, 5);
  const b0 = intBetween(rng, 20, 40);
  const db = intBetween(rng, 2, 5);
  const run = [];
  for (let i = 0; i < len; i += 1) run.push(i % 2 === 0 ? a0 + da * (i / 2) : b0 - db * ((i - 1) / 2));
  const answer = len % 2 === 0 ? a0 + da * (len / 2) : b0 - db * ((len - 1) / 2);
  return { run, answer, rule: `Two runs woven together: one adds ${da}, the other subtracts ${db}` };
};

const multiplyThenAdd = (rng, len = 5) => {
  const factor = pick(rng, [2, 3]);
  const add = intBetween(rng, 1, 5);
  const start = intBetween(rng, 1, 5);
  const run = [start];
  while (run.length < len) {
    const i = run.length;
    run.push(i % 2 === 1 ? run[i - 1] * factor : run[i - 1] + add);
  }
  const answer = len % 2 === 1 ? run[len - 1] * factor : run[len - 1] + add;
  return { run, answer, rule: `Multiply by ${factor}, then add ${add}, repeating` };
};

const nSquaredPlusN = (rng) => {
  const len = intBetween(rng, 4, 5);
  const from = intBetween(rng, 1, 6);
  const f = (n) => n * n + n;
  const run = Array.from({ length: len }, (_, i) => f(from + i));
  return { run, answer: f(from + len), rule: 'Each term is n squared plus n' };
};

/* ---- Families per band, easy to hard ---------------------------------- */
const BAND_FAMILIES = {
  1: [
    (rng) => arithmetic(rng, 2, 5, 10),
    (rng) => arithmetic(rng, 3, 9, 20),
    (rng) => descending(rng, 2, 5),
    (rng) => arithmetic(rng, 10, 25, 50),
    (rng) => geometric(rng, [2], 7),
    (rng) => descending(rng, 5, 9),
    (rng) => halving(rng, [2]),
    (rng) => arithmetic(rng, 6, 12, 40, 5),
    (rng) => geometric(rng, [3], 4),
    (rng) => squares(rng)
  ],
  2: [
    (rng) => geometric(rng, [4, 5], 3),
    (rng) => halving(rng, [3]),
    (rng) => fibonacciLike(rng),
    (rng) => alternating(rng),
    (rng) => primes(rng),
    (rng) => cubes(rng),
    (rng) => doublePlus(rng),
    (rng) => growingGaps(rng, 1),
    (rng) => squaresPlus(rng),
    (rng) => triplePlus(rng)
  ],
  3: [
    (rng) => growingGaps(rng, 2),
    (rng) => triangular(rng),
    (rng) => shrinkingGaps(rng),
    (rng) => powersMinusOne(rng),
    (rng) => growingGaps(rng, 3),
    (rng) => multiplyThenAdd(rng),
    (rng) => nSquaredPlusN(rng),
    (rng) => interleaved(rng),
    (rng) => doublePlus(rng),
    (rng) => growingGaps(rng, 4)
  ]
};

/** The whole pool, every band, ordered easy to hard inside each band. */
export const buildSequences = () => {
  const out = [];
  for (const band of [1, 2, 3]) {
    const rng = seeded(7100 + band);
    const families = BAND_FAMILIES[band];
    const seen = new Set();
    for (let i = 0; i < PER_BAND; i += 1) {
      const home = Math.floor((i / PER_BAND) * families.length);
      // A family can land on the same numbers twice, and a small family (the
      // primes, the cubes) runs out of new runs altogether; the pool must not
      // repeat, so after a few tries the slot borrows from the next family.
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const family = families[attempt < 12 ? home : (home + 1 + Math.floor(attempt / 6)) % families.length];
        const { run, answer, rule } = family(rng);
        const key = run.join(',');
        if (seen.has(key) || run.some((n) => !Number.isInteger(n) || n < 0 || n > 5000)) continue;
        seen.add(key);
        const gap = Math.abs(answer - run[run.length - 1]) || 1;
        out.push({
          run,
          answer,
          options: shuffle(rng, [answer, ...numberDistractors(rng, answer, gap, run)]),
          rule,
          level: band,
          tier: tierOf(i, PER_BAND)
        });
        break;
      }
    }
  }
  return out;
};
