/**
 * Questions made fresh for each game, for Brain Sprint and Rapid Fire's
 * mental maths: number series, equations, percentages, clock angles and the
 * like. The answer is computed, never typed, so it cannot be wrong; the three
 * wrong options are near misses that are never equal to it or to each other.
 *
 * Every maker takes the game's rng and returns a raw question with the right
 * option first (`answer: 0`); the game shuffles the options. Each also
 * carries `facts`, the numbers it was made from, which
 * tests/competitions/quiz.banks.test.js uses to work the answer out again
 * on its own.
 */

/** A whole number in [lo, hi]. */
const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pickOne = (rng, list) => list[Math.floor(rng() * list.length)];

/**
 * The options for `answer`: it first, then three of `near` that are not it
 * and not each other (filled with answer + 1, + 2… if `near` runs short).
 */
const options = (rng, answer, near, { min = -Infinity } = {}) => {
    const right = String(answer);
    const pool = [...new Set(near.filter((n) => Number.isFinite(n) && n >= min).map(String))].filter((s) => s !== right);
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const wrong = pool.slice(0, 3);
    for (let k = 1; wrong.length < 3; k += 1) {
        const s = String(Number(answer) + k);
        if (s !== right && !wrong.includes(s)) wrong.push(s);
    }
    return [right, ...wrong];
};

const isPrime = (n) => {
    if (n < 2) return false;
    for (let d = 2; d * d <= n; d += 1) if (n % d === 0) return false;
    return true;
};

/* ── Mental maths (Rapid Fire, and Brain Sprint) ───────────────────────── */

const add = (rng) => {
    const a = int(rng, 12, 89); const b = int(rng, 12, 89);
    const ans = a + b;
    return { topic: 'Mental maths', prompt: `${a} + ${b} = ?`, options: options(rng, ans, [ans + 1, ans - 1, ans + 10, ans - 10, ans + 2]), answer: 0, facts: { kind: 'add', a, b } };
};

const subtract = (rng) => {
    const a = int(rng, 50, 150); const b = int(rng, 12, a - 10);
    const ans = a - b;
    return { topic: 'Mental maths', prompt: `${a} − ${b} = ?`, options: options(rng, ans, [ans + 1, ans - 1, ans + 10, ans - 10, ans + 2], { min: 0 }), answer: 0, facts: { kind: 'subtract', a, b } };
};

const multiply = (rng) => {
    const a = int(rng, 3, 9); const b = int(rng, 11, 25);
    const ans = a * b;
    return { topic: 'Mental maths', prompt: `${a} × ${b} = ?`, options: options(rng, ans, [ans + a, ans - a, ans + 10, ans - 10, ans + 1]), answer: 0, facts: { kind: 'multiply', a, b } };
};

const square = (rng) => {
    const n = int(rng, 11, 25);
    const ans = n * n;
    return { topic: 'Mental maths', prompt: `${n}² = ?`, options: options(rng, ans, [(n - 1) * (n - 1), (n + 1) * (n + 1), ans + 10, ans - 10, ans + n]), answer: 0, facts: { kind: 'square', n } };
};

const percent = (rng) => {
    const p = pickOne(rng, [10, 20, 25, 50, 75]);
    const n = 20 * int(rng, 2, 20);
    const ans = (p * n) / 100;
    return { topic: 'Mental maths', prompt: `What is ${p}% of ${n}?`, options: options(rng, ans, [ans + n / 10, ans - n / 10, ans + 5, ans * 2, ans + 10], { min: 0 }), answer: 0, facts: { kind: 'percent', p, n } };
};

/* ── Puzzles (Brain Sprint) ────────────────────────────────────────────── */

const arithmeticSeries = (rng) => {
    const a = int(rng, 1, 30); const d = int(rng, 3, 12);
    const terms = [0, 1, 2, 3, 4].map((i) => a + i * d);
    const ans = a + 5 * d;
    return { topic: 'Number series', prompt: `What comes next: ${terms.join(', ')}, ?`, options: options(rng, ans, [ans + 1, ans - 1, ans + d, ans - 2, ans + 2]), answer: 0, explain: `Each term adds ${d}.`, facts: { kind: 'series', terms, next: ans } };
};

const geometricSeries = (rng) => {
    const a = int(rng, 1, 6); const r = pickOne(rng, [2, 3]);
    const terms = [0, 1, 2, 3].map((i) => a * r ** i);
    const ans = a * r ** 4;
    return { topic: 'Number series', prompt: `What comes next: ${terms.join(', ')}, ?`, options: options(rng, ans, [ans - a * r ** 3, ans + a * r ** 3, ans + r, ans - r, ans * r]), answer: 0, explain: `Each term is ${r} times the one before.`, facts: { kind: 'series', terms, next: ans } };
};

const squareSeries = (rng) => {
    const k = int(rng, 2, 9);
    const terms = [0, 1, 2, 3].map((i) => (k + i) ** 2);
    const ans = (k + 4) ** 2;
    return { topic: 'Number series', prompt: `What comes next: ${terms.join(', ')}, ?`, options: options(rng, ans, [ans - 1, ans + 1, ans + 2 * (k + 4), (k + 5) ** 2, ans - 2]), answer: 0, explain: `They are the squares of ${k}, ${k + 1}, ${k + 2}…`, facts: { kind: 'series', terms, next: ans } };
};

const fibonacciSeries = (rng) => {
    const terms = [int(rng, 1, 9), int(rng, 1, 9)];
    while (terms.length < 6) terms.push(terms[terms.length - 1] + terms[terms.length - 2]);
    const ans = terms[4] + terms[5];
    return { topic: 'Number series', prompt: `What comes next: ${terms.join(', ')}, ?`, options: options(rng, ans, [ans + 1, ans - 1, terms[5] + terms[3], ans + terms[3], 2 * terms[5]]), answer: 0, explain: 'Each term is the sum of the two before it.', facts: { kind: 'series', terms, next: ans } };
};

const alternatingSeries = (rng) => {
    const a = int(rng, 2, 20); const p = int(rng, 2, 9); let q = int(rng, 2, 9);
    if (q === p) q += 1;
    const terms = [a];
    for (let i = 1; i < 6; i += 1) terms.push(terms[i - 1] + (i % 2 ? p : q));
    // Five steps so far (+p, +q, +p, +q, +p): the sixth is +q.
    const ans = terms[5] + q;
    return { topic: 'Number series', prompt: `What comes next: ${terms.join(', ')}, ?`, options: options(rng, ans, [terms[5] + p, ans + 1, ans - 1, ans + q]), answer: 0, explain: `The steps alternate: +${p}, +${q}.`, facts: { kind: 'series', terms, next: ans } };
};

const letterSeries = (rng) => {
    const step = int(rng, 2, 4);
    const start = int(rng, 0, 25 - step * 5);
    const letter = (i) => String.fromCharCode(65 + i);
    const terms = [0, 1, 2, 3, 4].map((i) => letter(start + i * step));
    const ans = letter(start + 5 * step);
    const near = [start + 5 * step - 1, start + 5 * step + 1, start + 4 * step + 1, start + 5 * step + 2].filter((i) => i >= 0 && i < 26).map(letter);
    const wrong = [...new Set(near)].filter((c) => c !== ans).slice(0, 3);
    for (let i = 0; wrong.length < 3; i += 1) { const c = letter(i); if (c !== ans && !wrong.includes(c)) wrong.push(c); }
    return { topic: 'Letter series', prompt: `What comes next: ${terms.join(', ')}, ?`, options: [ans, ...wrong], answer: 0, explain: `Each letter moves ${step} places on.`, facts: { kind: 'letters', terms, next: ans } };
};

const equation = (rng) => {
    const x = int(rng, 2, 15); const a = int(rng, 2, 9); const b = int(rng, 1, 30);
    const c = a * x + b;
    return { topic: 'Algebra', prompt: `If ${a}x + ${b} = ${c}, what is x?`, options: options(rng, x, [x + 1, x - 1, x + 2, Math.round(c / a)], { min: 0 }), answer: 0, explain: `${a}x = ${c - b}, so x = ${x}.`, facts: { kind: 'equation', a, b, c, x } };
};

const notPrime = (rng) => {
    const primes = [23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
    const tricky = [51, 57, 87, 91, 93, 69, 77, 49, 39, 81];
    const odd = pickOne(rng, tricky);
    const pool = [...primes];
    const chosen = [];
    while (chosen.length < 3) chosen.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    const factor = [3, 7].find((d) => odd % d === 0);
    return { topic: 'Number sense', prompt: 'Which of these is NOT a prime number?', options: [String(odd), ...chosen.map(String)], answer: 0, explain: `${odd} = ${factor} × ${odd / factor}.`, facts: { kind: 'not-prime', numbers: [odd, ...chosen] } };
};

const clockAngle = (rng) => {
    const h = int(rng, 1, 12); const m = 5 * int(rng, 0, 11);
    const raw = Math.abs(30 * (h % 12) + 0.5 * m - 6 * m);
    const ans = Math.min(raw, 360 - raw);
    const fmt = (deg) => `${deg}°`;
    const near = [ans + 15, ans - 15, ans + 30, Math.abs(30 * (h % 12) - 6 * m) % 360, ans + 7.5].filter((d) => d >= 0 && d <= 180);
    const opts = options(rng, ans, near, { min: 0 }).map((s) => fmt(s));
    return { topic: 'Clocks', prompt: `What is the smaller angle between the hands of a clock at ${h}:${String(m).padStart(2, '0')}?`, options: opts, answer: 0, explain: 'The hour hand moves 0.5° a minute, the minute hand 6°.', facts: { kind: 'clock', h, m, angle: ans } };
};

const ages = (rng) => {
    const b = int(rng, 8, 30); const gap = int(rng, 2, 12); const y = int(rng, 2, 10);
    const sum = (b + y) + (b + gap + y);
    return { topic: 'Word problem', prompt: `A is ${gap} years older than B. In ${y} years their ages will add up to ${sum}. How old is B now?`, options: options(rng, b, [b + y, b + gap, b - 1, b + 1, b + 2], { min: 1 }), answer: 0, explain: `2B + ${gap} + ${2 * y} = ${sum}, so B = ${b}.`, facts: { kind: 'ages', gap, y, sum, b } };
};

const speed = (rng) => {
    const v = 5 * int(rng, 6, 20); const t = int(rng, 2, 6);
    const d = v * t;
    return { topic: 'Word problem', prompt: `A bus covers ${d} km in ${t} hours at a steady speed. What is its speed?`, options: options(rng, v, [v + 5, v - 5, v + 10, d / (t + 1)].filter(Number.isInteger), { min: 1 }).map((s) => `${s} km/h`), answer: 0, facts: { kind: 'speed', d, t, v } };
};

/** Brain Sprint's puzzle makers, taken in turn so a game gets a mix. */
const PUZZLES = [arithmeticSeries, equation, geometricSeries, clockAngle, notPrime, squareSeries, ages, fibonacciSeries, percent, letterSeries, speed, alternatingSeries, multiply];
const MATHS = [add, subtract, multiply, square, percent];
// The series alone, for Pattern Pro (a Group Brain game).
const SERIES = [arithmeticSeries, geometricSeries, squareSeries, fibonacciSeries, alternatingSeries, letterSeries];

/**
 * `count` questions from `makers`, cycled in a random order, with no prompt
 * repeated in the one game. `level`, the difficulty, goes to each maker.
 */
const make = (makers, count, rng, level) => {
    const order = [...makers];
    for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    const out = [];
    const seen = new Set();
    for (let n = 0; out.length < count && n < count * 20; n += 1) {
        const q = order[out.length % order.length](rng, level);
        if (seen.has(q.prompt + q.options[0])) continue;
        seen.add(q.prompt + q.options[0]);
        out.push(q);
    }
    return out;
};

module.exports = { PUZZLES, MATHS, SERIES, make, isPrime, options, int, pickOne };
