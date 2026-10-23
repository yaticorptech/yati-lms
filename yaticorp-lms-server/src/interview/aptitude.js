/**
 * Aptitude practice (asked 2026-10-22: "add the aptitude questions to
 * interview preparation, like for school student IQ questions, based on the
 * user's qualification, maturity and knowledge").
 *
 * Multiple-choice questions in four sections — maths, patterns and series,
 * logic and reasoning, words — pitched to the student's level (level.js):
 * a Class 3 child is asked "5, 10, 15, ?", a Class 10 student percentages and
 * letter codes, a college student placement-style aptitude.
 *
 * The questions are made here rather than by the AI: the numbers are drawn at
 * random and every answer is worked out by the code that drew them, so the
 * right answer is always right. The word questions come from short lists
 * written by hand, each kept to the levels it suits.
 *
 * A level is a tier from 1 to 5: primary, middle, high school, higher
 * secondary, and everyone past school (and anyone the app cannot place).
 */

const TIER = { primary: 1, middle: 2, high: 3, senior: 4 };
const tierOf = (level) => TIER[level?.key] || 5;

/* ── Randomness that a test can repeat ────────────────────────────────── */

/** A small seeded generator (mulberry32): the same seed, the same set. */
const seeded = (seed) => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};
const tools = (rnd) => {
    const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
    const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
    const shuffle = (xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    return { int, pick, shuffle };
};

/**
 * The right answer among three wrong ones, in a random order. `wrong` may
 * hold more than three, and repeats or the answer itself: they are dropped.
 */
const choose = (t, answer, wrong) => {
    const others = [...new Set(wrong.map(String))].filter((w) => w !== String(answer));
    const options = t.shuffle([String(answer), ...t.shuffle(others).slice(0, 3)]);
    return { options, answer: options.indexOf(String(answer)) };
};
/** Wrong numbers near a right one, never below zero. */
const near = (t, n, unit = (x) => x) => {
    const steps = n < 10 ? [1, 2, 3, -1, -2] : [1, 2, 5, 10, -1, -2, -5, -10, Math.round(n / 10), -Math.round(n / 10)];
    return t.shuffle(steps).map((d) => n + d).filter((x) => x >= 0 && x !== n).map(unit);
};
const rupees = (n) => `₹${n.toLocaleString('en-IN')}`;
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const NAMES = ['Asha', 'Ravi', 'Meena', 'Arjun', 'Priya', 'Kiran', 'Neha', 'Rahul', 'Divya', 'Sameer'];
const letter = (i) => String.fromCharCode(65 + i);

/* ── Maths ────────────────────────────────────────────────────────────── */

const MATHS = [
    { id: 'add-sub', tiers: [1, 2], make: (t) => {
        const name = t.pick(NAMES); const a = t.int(15, 60); const b = t.int(3, 14);
        const more = t.int(0, 1) === 1;
        const answer = more ? a + b : a - b;
        return { topic: 'Adding and taking away', question: more ? `${name} has ${a} pencils and buys ${b} more. How many pencils does ${name} have now?` : `${name} has ${a} pencils and gives ${b} to a friend. How many pencils are left?`,
            ...choose(t, answer, near(t, answer)), explanation: more ? `${a} + ${b} = ${answer}.` : `${a} − ${b} = ${answer}.` };
    } },
    { id: 'times', tiers: [1, 3], make: (t) => {
        if (t.int(0, 1)) {
            const r = t.int(3, 9); const c = t.int(4, 12); const answer = r * c;
            return { topic: 'Multiplying', question: `A box has ${r} rows of sweets, with ${c} sweets in each row. How many sweets are in the box?`, ...choose(t, answer, [...near(t, answer), r + c]), explanation: `${r} rows × ${c} sweets = ${answer}.` };
        }
        const k = t.int(3, 9); const each = t.int(3, 12); const total = k * each;
        return { topic: 'Sharing equally', question: `${total} mangoes are shared equally among ${k} children. How many mangoes does each child get?`, ...choose(t, each, near(t, each)), explanation: `${total} ÷ ${k} = ${each}.` };
    } },
    { id: 'percent', tiers: [2, 5], make: (t, tier) => {
        const p = t.pick(tier <= 2 ? [10, 25, 50] : [15, 20, 30, 40, 75]); const base = 20 * t.int(2, 20); const answer = (p * base) / 100;
        return { topic: 'Percentages', question: `What is ${p}% of ${base}?`, ...choose(t, answer, [...near(t, answer), base - answer, p]), explanation: `${p}% means ${p} out of 100, so ${p} ÷ 100 × ${base} = ${answer}.` };
    } },
    { id: 'average', tiers: [2, 5], make: (t, tier) => {
        const n = tier <= 2 ? 4 : 5; const avg = t.int(12, 60);
        const devs = Array.from({ length: n - 1 }, () => t.int(-9, 9)); devs.push(-devs.reduce((a, b) => a + b, 0));
        const xs = devs.map((d) => avg + d);
        if (xs.some((x) => x <= 0)) return null;
        return { topic: 'Averages', question: `What is the average of ${xs.join(', ')}?`, ...choose(t, avg, near(t, avg)), explanation: `Add them: ${xs.reduce((a, b) => a + b, 0)}. Divide by ${n}: ${avg}.` };
    } },
    { id: 'ratio', tiers: [3, 5], make: (t) => {
        const [a, b] = t.pick([[1, 2], [2, 3], [3, 4], [3, 5], [2, 5], [1, 3]]); const m = 10 * t.int(5, 40); const total = (a + b) * m;
        const [x, y] = [t.pick(NAMES), t.pick(NAMES.slice().reverse())];
        if (x === y) return null;
        return { topic: 'Ratios', question: `${rupees(total)} is shared between ${x} and ${y} in the ratio ${a} : ${b}. How much does ${x} get?`,
            ...choose(t, rupees(a * m), [rupees(b * m), rupees(total / 2), rupees(a * m + m), rupees(a * m - m)]),
            explanation: `${a} + ${b} = ${a + b} parts, so one part is ${rupees(total)} ÷ ${a + b} = ${rupees(m)}. ${x} gets ${a} parts: ${rupees(a * m)}.` };
    } },
    { id: 'profit', tiers: [3, 5], make: (t, tier) => {
        const cost = 100 * t.int(2, 20); const p = t.pick([10, 20, 25]); const loss = tier >= 4 && t.int(0, 2) === 0;
        const sell = loss ? (cost * (100 - p)) / 100 : (cost * (100 + p)) / 100; const swing = (cost * p) / 100;
        return { topic: loss ? 'Profit and loss' : 'Profit', question: `A shopkeeper buys a bag for ${rupees(cost)} and sells it at a ${p}% ${loss ? 'loss' : 'profit'}. What is the selling price?`,
            ...choose(t, rupees(sell), [rupees(loss ? cost + swing : cost - swing), rupees(cost), rupees(sell + 10), rupees(sell - 10)]),
            explanation: `${p}% of ${rupees(cost)} is ${rupees(swing)}. ${loss ? `${rupees(cost)} − ${rupees(swing)}` : `${rupees(cost)} + ${rupees(swing)}`} = ${rupees(sell)}.` };
    } },
    { id: 'discount', tiers: [3, 5], make: (t) => {
        const mrp = 100 * t.int(3, 30); const p = t.pick([10, 20, 25, 40]); const off = (mrp * p) / 100; const price = mrp - off;
        return { topic: 'Discounts', question: `A pair of shoes costs ${rupees(mrp)}. There is a ${p}% discount. How much do you pay?`,
            ...choose(t, rupees(price), [rupees(off), rupees(mrp - p), rupees(price + 50), rupees(price - 50)]), explanation: `${p}% of ${rupees(mrp)} is ${rupees(off)}, so you pay ${rupees(mrp)} − ${rupees(off)} = ${rupees(price)}.` };
    } },
    { id: 'speed', tiers: [3, 5], make: (t, tier) => {
        if (tier >= 5 && t.int(0, 1)) {
            const kmh = t.pick([18, 36, 54, 72, 90]); const ms = (kmh * 5) / 18;
            return { topic: 'Speed', question: `A car moves at ${kmh} km/h. What is its speed in metres per second?`, ...choose(t, `${ms} m/s`, near(t, ms, (x) => `${x} m/s`)), explanation: `To change km/h to m/s, multiply by 5/18: ${kmh} × 5 ÷ 18 = ${ms} m/s.` };
        }
        const s = t.pick([30, 40, 45, 50, 60]); const h = t.int(2, 5); const d = s * h;
        if (t.int(0, 1)) return { topic: 'Speed, distance and time', question: `A bus travels at ${s} km/h for ${h} hours. How far does it go?`, ...choose(t, `${d} km`, near(t, d, (x) => `${x} km`).concat(`${s + h} km`)), explanation: `Distance = speed × time = ${s} × ${h} = ${d} km.` };
        return { topic: 'Speed, distance and time', question: `A train covers ${d} km at ${s} km/h. How many hours does it take?`, ...choose(t, `${h} hours`, [1, 2, 3, 4, 5, 6, 7].filter((x) => x !== h).map((x) => `${x} hours`)), explanation: `Time = distance ÷ speed = ${d} ÷ ${s} = ${h} hours.` };
    } },
    { id: 'interest', tiers: [4, 5], make: (t, tier) => {
        const P = 1000 * t.int(1, 10);
        if (tier >= 5 && t.int(0, 1)) {
            // In whole rupees: P × 1.1 is not exact in floating point.
            const year1 = (P * 11) / 10; const year2 = (P * 121) / 100; const ci = year2 - P;
            return { topic: 'Compound interest', question: `What is the compound interest on ${rupees(P)} at 10% a year for 2 years?`, ...choose(t, rupees(ci), [rupees(P / 5), rupees(ci + 10), rupees(year2), rupees(ci - 10)]),
                explanation: `After year 1: ${rupees(year1)}. After year 2: ${rupees(year2)}. Interest = ${rupees(year2)} − ${rupees(P)} = ${rupees(ci)}.` };
        }
        const R = t.pick([5, 8, 10, 12]); const T = t.int(2, 4); const si = (P * R * T) / 100;
        return { topic: 'Simple interest', question: `What is the simple interest on ${rupees(P)} at ${R}% a year for ${T} years?`, ...choose(t, rupees(si), [rupees((P * R) / 100), rupees(si + P / 10), rupees(si * 2), rupees(si + 100)]),
            explanation: `Simple interest = P × R × T ÷ 100 = ${P} × ${R} × ${T} ÷ 100 = ${rupees(si)}.` };
    } },
    { id: 'work', tiers: [4, 5], make: (t) => {
        const [a, b, both] = t.pick([[12, 24, 8], [10, 15, 6], [6, 12, 4], [20, 30, 12], [15, 30, 10], [12, 4, 3], [18, 9, 6]]);
        const [x, y] = [NAMES[t.int(0, 4)], NAMES[t.int(5, 9)]];
        return { topic: 'Time and work', question: `${x} can finish a job in ${a} days and ${y} in ${b} days. Working together, how many days will they take?`,
            ...choose(t, `${both} days`, [`${(a + b) / 2} days`, `${Math.abs(a - b) || both + 2} days`, `${both + 2} days`, `${both - 1} days`]),
            explanation: `In one day ${x} does 1/${a} of the job and ${y} 1/${b}. Together: 1/${a} + 1/${b} = 1/${both}, so ${both} days.` };
    } },
    { id: 'ages', tiers: [3, 5], make: (t) => {
        const d = t.int(6, 15); const k = t.pick([2, 3, 4]); const sum = (k + 1) * d;
        return { topic: 'Ages', question: `The sum of the ages of a mother and her daughter is ${sum} years. The mother is ${k} times as old as the daughter. How old is the daughter?`,
            ...choose(t, `${d} years`, near(t, d, (x) => `${x} years`).concat(`${k * d} years`)), explanation: `Daughter = 1 part, mother = ${k} parts: ${k + 1} parts make ${sum}, so one part is ${sum} ÷ ${k + 1} = ${d} years.` };
    } }
];

/* ── Patterns and series ──────────────────────────────────────────────── */

const series = (t, xs, next, rule) => ({ topic: 'Number series', question: `What comes next? ${xs.join(', ')}, ?`, ...choose(t, next, near(t, next)), explanation: rule });
const PATTERNS = [
    { id: 'step', tiers: [1, 3], make: (t, tier) => {
        const d = tier === 1 ? t.pick([1, 2, 3, 5, 10]) : t.int(3, 12); const down = tier >= 2 && t.int(0, 2) === 0;
        const a = down ? t.int(60, 99) : t.int(1, 20); const xs = Array.from({ length: 5 }, (_, i) => a + (down ? -d : d) * i);
        const next = a + (down ? -d : d) * 5;
        return series(t, xs, next, `Each number is ${d} ${down ? 'less' : 'more'} than the one before: ${xs[4]} ${down ? '−' : '+'} ${d} = ${next}.`);
    } },
    { id: 'double', tiers: [2, 5], make: (t, tier) => {
        const r = tier <= 2 ? 2 : t.pick([2, 3]); const a = t.int(1, tier <= 2 ? 5 : 4); const xs = Array.from({ length: 5 }, (_, i) => a * r ** i);
        return series(t, xs, a * r ** 5, `Each number is ${r === 2 ? 'double' : 'three times'} the one before: ${xs[4]} × ${r} = ${a * r ** 5}.`);
    } },
    { id: 'growing', tiers: [3, 5], make: (t, tier) => {
        const a = t.int(1, 10); const d0 = t.int(1, 3); const grow = tier >= 4 ? 2 : 1;
        const xs = [a]; for (let i = 0; i < 5; i++) xs.push(xs[i] + d0 + grow * i);
        const next = xs[5] + d0 + grow * 5;
        return series(t, xs, next, `The gaps grow by ${grow}: +${d0}, +${d0 + grow}, +${d0 + 2 * grow}… The next gap is ${d0 + grow * 5}, so ${xs[5]} + ${d0 + grow * 5} = ${next}.`);
    } },
    { id: 'squares', tiers: [3, 5], make: (t, tier) => {
        const n = t.int(1, 5); const kind = tier >= 5 ? t.pick(['sq', 'cube', 'sq+1']) : tier >= 4 ? t.pick(['sq', 'cube']) : 'sq';
        const f = { sq: (k) => k * k, cube: (k) => k ** 3, 'sq+1': (k) => k * k + 1 }[kind];
        const xs = Array.from({ length: 4 }, (_, i) => f(n + i)); const next = f(n + 4);
        const said = { sq: `They are squares: ${n}×${n}, ${n + 1}×${n + 1}… Next is ${n + 4}×${n + 4} = ${next}.`, cube: `They are cubes: ${n}³, ${n + 1}³… Next is ${n + 4}³ = ${next}.`, 'sq+1': `Each is a square plus 1: ${n}² + 1, ${n + 1}² + 1… Next is ${n + 4}² + 1 = ${next}.` }[kind];
        return series(t, xs, next, said);
    } },
    { id: 'two-series', tiers: [4, 5], make: (t) => {
        const a = t.int(1, 9); const b = t.int(20, 40); const d = t.int(2, 5); const e = t.int(3, 8);
        const xs = [a, b, a + d, b + e, a + 2 * d, b + 2 * e]; const next = a + 3 * d;
        return series(t, xs, next, `Two series take turns: ${a}, ${a + d}, ${a + 2 * d}… (+${d}) and ${b}, ${b + e}, ${b + 2 * e}… (+${e}). Next is ${a + 2 * d} + ${d} = ${next}.`);
    } },
    { id: 'letters', tiers: [1, 4], make: (t, tier) => {
        const step = tier === 1 ? t.pick([1, 2]) : tier === 2 ? t.pick([2, 3]) : t.pick([3, 4]);
        const back = tier >= 3 && t.int(0, 1) === 1;
        const start = back ? t.int(5 * step, 25) : t.int(0, 25 - 5 * step);
        const at = (i) => start + (back ? -step : step) * i;
        const xs = Array.from({ length: 4 }, (_, i) => letter(at(i))); const next = letter(at(4));
        const wrong = [at(4) + 1, at(4) - 1, at(4) + 2, at(4) - 2, at(4) + (back ? -step : step), at(3)].filter((i) => i >= 0 && i < 26).map(letter);
        return { topic: 'Letter series', question: `What comes next? ${xs.join(', ')}, ?`, ...choose(t, next, wrong), explanation: `Each letter moves ${step} ${back ? 'back' : 'forward'} in the alphabet: ${xs[3]} → ${next}.` };
    } },
    { id: 'odd-number', tiers: [2, 5], make: (t, tier) => {
        const rule = { 2: 'even', 3: 'three', 4: 'square', 5: 'prime' }[tier];
        const pool = {
            even: { yes: () => 2 * t.int(3, 40), no: () => 2 * t.int(3, 40) + 1, said: 'All the others are even numbers.' },
            three: { yes: () => 3 * t.int(3, 30), no: () => { let x; do { x = t.int(10, 90); } while (x % 3 === 0); return x; }, said: 'All the others can be divided by 3.' },
            square: { yes: () => t.int(3, 12) ** 2, no: () => { let x; do { x = t.int(10, 140); } while (Number.isInteger(Math.sqrt(x))); return x; }, said: 'All the others are square numbers.' },
            prime: { yes: () => t.pick([7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]), no: () => t.pick([9, 15, 21, 25, 27, 33, 35, 39, 49, 51]), said: 'All the others are prime numbers: only 1 and the number itself divide them.' }
        }[rule];
        const odd = pool.no(); const rest = new Set(); while (rest.size < 3) rest.add(pool.yes());
        const options = t.shuffle([odd, ...rest].map(String));
        return { topic: 'Odd one out', question: `Which number is the odd one out? ${options.join(', ')}`, options, answer: options.indexOf(String(odd)), explanation: `${odd} is the odd one out. ${pool.said}` };
    } },
    { id: 'rule', tiers: [2, 4], make: (t, tier) => {
        const rules = [
            { f: (n) => n * n, said: 'Each number is multiplied by itself' },
            { f: (n) => 2 * n + 1, said: 'Each number is doubled, then 1 is added' },
            ...(tier >= 3 ? [{ f: (n) => 3 * n - 1, said: 'Each number is multiplied by 3, then 1 is taken away' }, { f: (n) => n * (n + 1), said: 'Each number is multiplied by the next number' }] : [])
        ];
        const r = t.pick(rules); const ns = t.shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4); const q = ns.pop();
        const answer = r.f(q);
        return { topic: 'Find the rule', question: `${ns.map((n) => `${n} → ${r.f(n)}`).join(',  ')}. So ${q} → ?`, ...choose(t, answer, near(t, answer).concat(q * 2, q + 10)), explanation: `${r.said}: ${q} → ${answer}.` };
    } }
];

/* ── Logic and reasoning ──────────────────────────────────────────────── */

const DIRS = ['north', 'east', 'south', 'west'];
const REASONING = [
    { id: 'taller', tiers: [1, 3], make: (t, tier) => {
        const n = tier === 1 ? 3 : 4; const people = t.shuffle(NAMES).slice(0, n); // tallest first
        const facts = t.shuffle(people.slice(0, -1).map((p, i) => (t.int(0, 1) ? `${p} is taller than ${people[i + 1]}.` : `${people[i + 1]} is shorter than ${p}.`)));
        const ask = tier >= 3 ? t.pick(['tallest', 'shortest', 'second tallest']) : t.pick(['tallest', 'shortest']);
        const who = { tallest: people[0], shortest: people[n - 1], 'second tallest': people[1] }[ask];
        const options = t.shuffle(people); // every name is an option
        return { topic: 'Comparing', question: `${facts.join(' ')} Who is the ${ask}?`, options, answer: options.indexOf(who), explanation: `From tallest to shortest: ${people.join(', ')}. So the ${ask} is ${who}.` };
    } },
    { id: 'days', tiers: [1, 4], make: (t, tier) => {
        const today = t.int(0, 6); const n = tier === 1 ? t.int(1, 6) : tier === 2 ? t.int(8, 20) : t.int(15, 100);
        const answer = DAYS[(today + n) % 7]; const r = n % 7;
        return { topic: 'Days of the week', question: `Today is ${DAYS[today]}. What day will it be ${n} days from today?`, ...choose(t, answer, DAYS),
            explanation: n >= 7 ? `${n} days is ${Math.floor(n / 7)} week${n >= 14 ? 's' : ''} and ${r} day${r === 1 ? '' : 's'}. A whole week brings you back to ${DAYS[today]}; ${r} more day${r === 1 ? '' : 's'} make${r === 1 ? 's' : ''} it ${answer}.` : `Count ${n} days on from ${DAYS[today]}: ${answer}.` };
    } },
    { id: 'rank', tiers: [2, 5], make: (t, tier) => {
        const name = t.pick(NAMES);
        if (tier >= 3 && t.int(0, 1)) {
            const l = t.int(4, 20); const r = t.int(4, 20); const total = l + r - 1;
            return { topic: 'Positions in a row', question: `In a row of students, ${name} is ${ordinal(l)} from the left and ${ordinal(r)} from the right. How many students are in the row?`, ...choose(t, total, [l + r, l + r + 1, total - 1, Math.abs(l - r) + 1]), explanation: `${l} + ${r} counts ${name} twice, so ${l} + ${r} − 1 = ${total}.` };
        }
        const total = t.int(10, 40); const l = t.int(2, total - 1); const answer = total - l + 1;
        return { topic: 'Positions in a row', question: `There are ${total} students in a row. ${name} is ${ordinal(l)} from the left. What is ${name}'s position from the right?`, ...choose(t, ordinal(answer), [total - l, total - l + 2, l, answer + 2].filter((x) => x > 0).map(ordinal)), explanation: `From the right: ${total} − ${l} + 1 = ${answer}, so ${ordinal(answer)}.` };
    } },
    { id: 'direction', tiers: [2, 5], make: (t, tier) => {
        const name = t.pick(NAMES);
        if (tier >= 3 && t.int(0, 1)) {
            const [a, b, c] = t.pick(tier >= 4 ? [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17]] : [[3, 4, 5], [6, 8, 10]]);
            const first = t.int(0, 3); const turn = t.pick(['right', 'left']);
            return { topic: 'Directions', question: `${name} walks ${a} km ${DIRS[first]}, turns ${turn} and walks ${b} km. How far is ${name} from the starting point?`, ...choose(t, `${c} km`, [`${a + b} km`, `${b - a} km`, `${c + 1} km`, `${c - 1} km`]),
                explanation: `The two walks make a right angle, so the distance is the long side of a right triangle: √(${a}² + ${b}²) = √${c * c} = ${c} km.` };
        }
        let facing = t.int(0, 3); const start = facing; const turns = Array.from({ length: tier <= 2 ? 1 : t.int(2, 3) }, () => t.pick(['right', 'left']));
        for (const tu of turns) facing = (facing + (tu === 'right' ? 1 : 3)) % 4;
        return { topic: 'Directions', question: `${name} is facing ${DIRS[start]}. ${name} turns ${turns.join(', then ')}. Which direction is ${name} facing now?`, ...choose(t, DIRS[facing], DIRS),
            explanation: `Right turns go north → east → south → west; left turns go the other way. ${turns.map((tu) => `Turn ${tu}`).join(', ')}: ${DIRS[facing]}.` };
    } },
    { id: 'code', tiers: [2, 5], make: (t, tier) => {
        const words = ['CAT', 'DOG', 'SUN', 'PEN', 'BOOK', 'LAMP', 'TREE', 'FISH', 'MILK', 'ROSE', 'TIGER', 'WATER', 'PLANT', 'CHAIR'];
        const k = tier === 2 ? 1 : tier === 3 ? t.pick([1, 2]) : t.pick([1, 2, 3, -1]);
        const shift = (w, s) => [...w].map((ch) => letter((ch.charCodeAt(0) - 65 + s + 26) % 26)).join('');
        const [w1, w2] = t.shuffle(words).slice(0, 2); const answer = shift(w2, k);
        return { topic: 'Codes', question: `If ${w1} is written as ${shift(w1, k)}, how is ${w2} written?`, ...choose(t, answer, [shift(w2, k + 1), shift(w2, k - 1 || -1), [...answer].reverse().join(''), shift(w2, -k)]),
            explanation: `Each letter moves ${Math.abs(k)} place${Math.abs(k) === 1 ? '' : 's'} ${k > 0 ? 'forward' : 'back'} in the alphabet: ${w2} → ${answer}.` };
    } },
    { id: 'clock', tiers: [4, 5], make: (t, tier) => {
        const h = t.int(1, 11); const half = tier >= 5 && t.int(0, 1) === 1;
        const raw = half ? Math.abs(30 * h + 15 - 180) : 30 * h; const angle = Math.min(raw, 360 - raw);
        return { topic: 'Clocks', question: `What is the smaller angle between the hands of a clock at ${h}:${half ? '30' : '00'}?`, ...choose(t, `${angle}°`, [angle + 15, angle + 30, Math.abs(angle - 30), 360 - angle].filter((x) => x !== angle).map((x) => `${x}°`)),
            explanation: half ? `At ${h}:30 the minute hand is at 180°, and the hour hand has moved halfway past ${h}: ${30 * h + 15}°. The gap is ${angle}°.` : `Each hour mark is 30° apart, and ${h} hours apart is ${30 * h}°, so the smaller angle is ${angle}°.` };
    } },
    { id: 'family', tiers: [3, 5], items: [
        { q: 'Pointing to a boy, Meena said, "He is the son of my only brother." How is the boy related to Meena?', a: 'Nephew', w: ['Son', 'Brother', 'Cousin'], e: 'The son of your brother is your nephew.' },
        { q: 'A is the brother of B. B is the daughter of C. How is A related to C?', a: 'Son', w: ['Brother', 'Father', 'Nephew'], e: 'B is C\'s daughter, and A is B\'s brother, so A is also C\'s child: a son.' },
        { q: 'Pointing to a photo, Arjun said, "Her father is the only son of my mother." How is the girl related to Arjun?', a: 'Daughter', w: ['Sister', 'Niece', 'Cousin'], e: 'The only son of Arjun\'s mother is Arjun himself, so the girl\'s father is Arjun.' },
        { q: 'P is the father of Q\'s mother. How is P related to Q?', a: 'Grandfather', w: ['Father', 'Uncle', 'Brother'], e: 'Your mother\'s father is your grandfather.' },
        { q: 'Ravi\'s mother is the only daughter of Asha\'s mother. How is Asha related to Ravi?', a: 'Mother', w: ['Aunt', 'Sister', 'Grandmother'], e: 'The only daughter of Asha\'s mother is Asha herself, so Asha is Ravi\'s mother.' }
    ], topic: 'Family relations' },
    { id: 'logic', tiers: [4, 5], items: [
        { q: 'All cats are animals. All animals need food. Does it follow that all cats need food?', a: 'Yes, it follows', w: ['No, it does not follow'], e: 'Every cat is an animal, and every animal needs food, so every cat needs food.' },
        { q: 'All roses are flowers. Some flowers fade quickly. Does it follow that some roses fade quickly?', a: 'No, it does not follow', w: ['Yes, it follows'], e: 'The flowers that fade quickly may not be roses at all, so we cannot be sure.' },
        { q: 'No fish can walk. A shark is a fish. Does it follow that a shark cannot walk?', a: 'Yes, it follows', w: ['No, it does not follow'], e: 'A shark is a fish, and no fish can walk.' },
        { q: 'Some students are athletes. All athletes are fit. Does it follow that some students are fit?', a: 'Yes, it follows', w: ['No, it does not follow'], e: 'The students who are athletes are fit, so at least some students are fit.' },
        { q: 'All doctors are educated. Ravi is educated. Does it follow that Ravi is a doctor?', a: 'No, it does not follow', w: ['Yes, it follows'], e: 'Many educated people are not doctors.' },
        { q: 'Some pens are blue. All blue things are bright. Does it follow that all pens are bright?', a: 'No, it does not follow', w: ['Yes, it follows'], e: 'Only the blue pens are sure to be bright; the others may not be.' }
    ], topic: 'Logical conclusions' }
];
function ordinal(n) { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

/* ── Words ────────────────────────────────────────────────────────────── */

// Hand-written, each with the tiers it suits: [lowest, highest].
const WORDS = [
    { id: 'analogy', topic: 'Word pairs', items: [
        { t: [1, 2], q: 'Bird is to fly as fish is to …', a: 'Swim', w: ['Walk', 'Jump', 'Sing'], e: 'A bird flies; a fish swims.' },
        { t: [1, 2], q: 'Cow is to calf as dog is to …', a: 'Puppy', w: ['Kitten', 'Cub', 'Foal'], e: 'A baby cow is a calf; a baby dog is a puppy.' },
        { t: [1, 2], q: 'Hand is to glove as foot is to …', a: 'Sock', w: ['Hat', 'Ring', 'Belt'], e: 'A glove goes on a hand; a sock goes on a foot.' },
        { t: [1, 2], q: 'Pen is to write as knife is to …', a: 'Cut', w: ['Eat', 'Cook', 'Draw'], e: 'You write with a pen and cut with a knife.' },
        { t: [1, 1], q: 'Day is to night as hot is to …', a: 'Cold', w: ['Warm', 'Sun', 'Fire'], e: 'Day is the opposite of night; hot is the opposite of cold.' },
        { t: [1, 2], q: 'Kitten is to cat as chick is to …', a: 'Hen', w: ['Duck', 'Egg', 'Cow'], e: 'A kitten grows into a cat; a chick grows into a hen.' },
        { t: [2, 3], q: 'Doctor is to hospital as teacher is to …', a: 'School', w: ['Shop', 'Farm', 'Bank'], e: 'A doctor works in a hospital; a teacher works in a school.' },
        { t: [2, 3], q: 'Bee is to hive as lion is to …', a: 'Den', w: ['Nest', 'Stable', 'Kennel'], e: 'A bee lives in a hive; a lion lives in a den.' },
        { t: [2, 3], q: 'Eye is to see as ear is to …', a: 'Hear', w: ['Smell', 'Taste', 'Touch'], e: 'We see with our eyes and hear with our ears.' },
        { t: [3, 4], q: 'Thermometer is to temperature as barometer is to …', a: 'Air pressure', w: ['Rainfall', 'Wind speed', 'Height'], e: 'A thermometer measures temperature; a barometer measures air pressure.' },
        { t: [3, 4], q: 'Author is to novel as composer is to …', a: 'Symphony', w: ['Painting', 'Statue', 'Poem'], e: 'An author writes a novel; a composer writes music, like a symphony.' },
        { t: [3, 4], q: 'Hexagon is to six as octagon is to …', a: 'Eight', w: ['Five', 'Seven', 'Ten'], e: 'A hexagon has six sides; an octagon has eight.' },
        { t: [4, 5], q: 'Ornithology is to birds as entomology is to …', a: 'Insects', w: ['Words', 'Fish', 'Rocks'], e: 'Ornithology is the study of birds; entomology is the study of insects.' },
        { t: [4, 5], q: 'Sculptor is to chisel as surgeon is to …', a: 'Scalpel', w: ['Hammer', 'Brush', 'Spanner'], e: 'A sculptor works with a chisel; a surgeon works with a scalpel.' },
        { t: [4, 5], q: 'Drought is to rain as famine is to …', a: 'Food', w: ['Water', 'Wind', 'Heat'], e: 'A drought is a lack of rain; a famine is a lack of food.' },
        { t: [5, 5], q: 'Prologue is to book as overture is to …', a: 'Opera', w: ['Painting', 'Statue', 'Newspaper'], e: 'A prologue opens a book; an overture opens an opera.' }
    ] },
    { id: 'odd-word', topic: 'Odd one out', items: [
        { t: [1, 2], q: 'Which is the odd one out? Apple, Mango, Carrot, Banana', a: 'Carrot', w: ['Apple', 'Mango', 'Banana'], e: 'A carrot is a vegetable; the others are fruits.' },
        { t: [1, 2], q: 'Which is the odd one out? Dog, Cat, Parrot, Cow', a: 'Parrot', w: ['Dog', 'Cat', 'Cow'], e: 'A parrot is a bird; the others are animals with four legs.' },
        { t: [1, 2], q: 'Which is the odd one out? Red, Blue, Circle, Green', a: 'Circle', w: ['Red', 'Blue', 'Green'], e: 'A circle is a shape; the others are colours.' },
        { t: [1, 2], q: 'Which is the odd one out? Chair, Table, Sofa, Spoon', a: 'Spoon', w: ['Chair', 'Table', 'Sofa'], e: 'A spoon is not furniture.' },
        { t: [1, 1], q: 'Which is the odd one out? Car, Bus, Train, Shirt', a: 'Shirt', w: ['Car', 'Bus', 'Train'], e: 'A shirt is something you wear; the others carry people.' },
        { t: [1, 2], q: 'Which is the odd one out? Pencil, Pen, Crayon, Plate', a: 'Plate', w: ['Pencil', 'Pen', 'Crayon'], e: 'A plate is for food; the others are for writing or drawing.' },
        { t: [2, 3], q: 'Which is the odd one out? Mercury, Venus, Moon, Mars', a: 'Moon', w: ['Mercury', 'Venus', 'Mars'], e: 'The Moon is not a planet.' },
        { t: [2, 3], q: 'Which is the odd one out? Triangle, Square, Cube, Circle', a: 'Cube', w: ['Triangle', 'Square', 'Circle'], e: 'A cube is a solid shape; the others are flat.' },
        { t: [2, 3], q: 'Which is the odd one out? Violin, Guitar, Flute, Sitar', a: 'Flute', w: ['Violin', 'Guitar', 'Sitar'], e: 'A flute has no strings; you blow into it.' },
        { t: [2, 4], q: 'Which is the odd one out? Iron, Copper, Wood, Silver', a: 'Wood', w: ['Iron', 'Copper', 'Silver'], e: 'Wood is not a metal.' },
        { t: [3, 4], q: 'Which is the odd one out? Kilometre, Litre, Metre, Centimetre', a: 'Litre', w: ['Kilometre', 'Metre', 'Centimetre'], e: 'A litre measures volume; the others measure length.' },
        { t: [3, 4], q: 'Which is the odd one out? Oxygen, Nitrogen, Hydrogen, Water', a: 'Water', w: ['Oxygen', 'Nitrogen', 'Hydrogen'], e: 'Water is a compound; the others are elements.' },
        { t: [3, 5], q: 'Which is the odd one out? Delhi, Mumbai, Nepal, Chennai', a: 'Nepal', w: ['Delhi', 'Mumbai', 'Chennai'], e: 'Nepal is a country; the others are cities in India.' }
    ] },
    { id: 'meaning', topic: 'Word meanings', items: [
        { t: [1, 1], q: 'Which word means the opposite of "big"?', a: 'Small', w: ['Tall', 'Huge', 'Wide'], e: 'Big and small are opposites.' },
        { t: [1, 1], q: 'Which word means the opposite of "happy"?', a: 'Sad', w: ['Glad', 'Funny', 'Kind'], e: 'Happy and sad are opposites.' },
        { t: [2, 3], q: 'Which word means the opposite of "ancient"?', a: 'Modern', w: ['Old', 'Ruined', 'Historic'], e: 'Ancient means very old; modern means new.' },
        { t: [2, 3], q: 'Which word means the same as "begin"?', a: 'Start', w: ['End', 'Stop', 'Wait'], e: 'To begin is to start.' },
        { t: [2, 3], q: 'Which word means the opposite of "brave"?', a: 'Cowardly', w: ['Bold', 'Strong', 'Kind'], e: 'Brave means not afraid; cowardly means easily afraid.' },
        { t: [2, 3], q: 'Which word means the same as "large"?', a: 'Big', w: ['Small', 'Thin', 'Short'], e: 'Large and big mean the same.' },
        { t: [3, 4], q: 'Which word means the opposite of "generous"?', a: 'Selfish', w: ['Kind', 'Giving', 'Rich'], e: 'A generous person gives freely; a selfish person keeps things for themselves.' },
        { t: [3, 4], q: 'Which word means the same as "rapid"?', a: 'Quick', w: ['Slow', 'Steady', 'Late'], e: 'Rapid means quick.' },
        { t: [3, 4], q: 'Which word means the opposite of "expand"?', a: 'Shrink', w: ['Grow', 'Stretch', 'Spread'], e: 'To expand is to get bigger; to shrink is to get smaller.' },
        { t: [4, 5], q: 'Which word means the same as "abundant"?', a: 'Plentiful', w: ['Scarce', 'Tiny', 'Empty'], e: 'Abundant means more than enough: plentiful.' },
        { t: [4, 5], q: 'Which word means the opposite of "transparent"?', a: 'Opaque', w: ['Clear', 'Bright', 'Thin'], e: 'Transparent means you can see through it; opaque means you cannot.' },
        { t: [4, 5], q: 'Which word means the same as "diligent"?', a: 'Hard-working', w: ['Lazy', 'Clever', 'Careless'], e: 'A diligent person works hard and carefully.' },
        { t: [5, 5], q: 'Which word means the same as "candid"?', a: 'Frank', w: ['Secretive', 'Shy', 'Polite'], e: 'Candid means open and honest: frank.' },
        { t: [5, 5], q: 'Which word means the opposite of "lenient"?', a: 'Strict', w: ['Gentle', 'Relaxed', 'Kind'], e: 'Lenient means not strict.' },
        { t: [5, 5], q: 'Which word means the same as "meticulous"?', a: 'Very careful', w: ['Careless', 'Quick', 'Noisy'], e: 'Meticulous means paying great attention to detail.' }
    ] },
    { id: 'grammar', topic: 'Grammar', items: [
        { t: [2, 3], q: 'Fill in the blank: She ___ to school every day.', a: 'goes', w: ['go', 'going', 'gone'], e: 'With "she" in the present tense we say "goes".' },
        { t: [2, 3], q: 'Fill in the blank: This is the ___ book I have ever read.', a: 'best', w: ['good', 'better', 'well'], e: '"Ever" compares it with all the others, so we use "best".' },
        { t: [2, 4], q: 'Which word is spelled correctly?', a: 'Necessary', w: ['Neccessary', 'Necesary', 'Nesessary'], e: 'Necessary has one c and two s\'s.' },
        { t: [3, 4], q: 'Fill in the blank: They ___ playing football when it started to rain.', a: 'were', w: ['was', 'is', 'are'], e: '"They" takes "were" in the past.' },
        { t: [3, 5], q: 'Fill in the blank: He has lived here ___ 2015.', a: 'since', w: ['for', 'from', 'at'], e: 'Use "since" with a point in time, and "for" with a length of time.' },
        { t: [3, 5], q: 'Which word is spelled correctly?', a: 'Environment', w: ['Enviroment', 'Envirnment', 'Enviornment'], e: 'Environment has an "n" before the "m": envi-ron-ment.' },
        { t: [4, 5], q: 'Fill in the blank: If I ___ you, I would study harder.', a: 'were', w: ['am', 'was', 'be'], e: 'For an imagined situation we say "If I were…".' },
        { t: [4, 5], q: 'Fill in the blank: Neither Ravi nor his friends ___ late.', a: 'were', w: ['was', 'is', 'has'], e: 'With "neither… nor", the verb agrees with the nearer subject, "friends": were.' },
        { t: [5, 5], q: 'Fill in the blank: The teacher, along with her students, ___ going on a trip.', a: 'is', w: ['are', 'were', 'have'], e: 'The subject is "the teacher"; "along with her students" does not change it.' },
        { t: [5, 5], q: 'Which word is spelled correctly?', a: 'Accommodation', w: ['Accomodation', 'Acommodation', 'Accommadation'], e: 'Accommodation has double c and double m.' }
    ] }
];

/* ── Most asked ───────────────────────────────────────────────────────── */

/*
 * The classic questions interviewers and quizzes ask again and again (asked
 * 2026-10-22: "aptitude questions like frequently asked questions in
 * interview, based on the student's maturity and language"). Each is written
 * for the levels it suits, in words for that age: a Class 3 child gets the
 * famous puzzles and riddles in plain words, a college student the placement
 * classics (trains, pipes, boats, dice) as a placement test words them. Every
 * one is tagged "Often asked" on the page.
 */
const ASKED = { id: 'asked', topic: 'Often asked', items: [
    // Class 1–5 and up: the puzzles every child is asked.
    { t: [1, 2], topic: 'Trick question', q: 'A farmer has 10 cows. All but 4 run away. How many cows are left?', a: '4', w: ['6', '10', '0'], e: '"All but 4" means every cow except 4 ran away, so 4 are left.' },
    { t: [1, 2], topic: 'Trick question', q: 'You have 3 apples and you take away 2. How many apples do you have?', a: '2', w: ['1', '3', '0'], e: 'You took 2 apples, so those 2 are the ones you have.' },
    { t: [1, 3], topic: 'Trick question', q: 'How many months of the year have 28 days?', a: 'All 12', w: ['1', '2', '6'], e: 'Every month has at least 28 days, so all 12 do.' },
    { t: [1, 2], topic: 'Positions', q: 'Ravi is 5th from the front of a line and 5th from the back. How many children are in the line?', a: '9', w: ['10', '8', '11'], e: '4 children are in front of Ravi and 4 behind him: 4 + 4 + Ravi = 9.' },
    { t: [1, 3], topic: 'Trick question', q: 'Which is heavier: 1 kilogram of cotton or 1 kilogram of iron?', a: 'Both weigh the same', w: ['Iron', 'Cotton', 'It depends on the size'], e: 'Both are 1 kilogram, so they weigh the same. Iron just takes up less space.' },
    { t: [1, 2], topic: 'Days', q: 'If yesterday was Sunday, what day will tomorrow be?', a: 'Tuesday', w: ['Monday', 'Wednesday', 'Saturday'], e: 'Yesterday was Sunday, so today is Monday and tomorrow is Tuesday.' },
    { t: [1, 3], topic: 'Riddle', q: "Asha's father has three daughters: Lily, Rose and …?", a: 'Asha', w: ['Daisy', 'Tulip', 'Jasmine'], e: "Asha is one of her father's daughters, so the third daughter is Asha herself." },
    { t: [1, 3], topic: 'Thinking it through', q: 'It takes 6 minutes to boil one egg. How long does it take to boil 4 eggs together in the same pot?', a: '6 minutes', w: ['24 minutes', '12 minutes', '10 minutes'], e: 'All 4 eggs boil at the same time, so it still takes 6 minutes.' },
    { t: [1, 3], topic: 'Family', q: 'A boy has 4 sisters. Each sister has 1 brother. How many children are in the family?', a: '5', w: ['8', '9', '6'], e: "Each sister's one brother is the same boy: 4 sisters + 1 boy = 5 children." },
    { t: [1, 4], topic: 'Trick question', q: 'In a race, you pass the person in second place. What place are you in now?', a: 'Second', w: ['First', 'Third', 'Last'], e: "You took that person's place, so you are second, not first." },
    { t: [1, 2], topic: 'Riddle', q: 'What has hands but cannot clap?', a: 'A clock', w: ['A chair', 'A tree', 'A book'], e: 'A clock has hands that show the time, but it cannot clap.' },
    { t: [1, 3], topic: 'Riddle', q: 'What gets wetter the more it dries?', a: 'A towel', w: ['Water', 'The sun', 'Rain'], e: 'A towel gets wetter as it dries you.' },
    // Class 6–8 and up.
    { t: [2, 3], topic: 'Riddle', q: 'I am an odd number. Take away one letter and I become even. What number am I?', a: 'Seven', w: ['Five', 'Nine', 'Three'], e: 'Take the "s" away from "seven" and you get "even".' },
    { t: [2, 4], topic: 'Thinking it through', q: 'If 3 cats catch 3 mice in 3 minutes, how many cats are needed to catch 100 mice in 100 minutes?', a: '3', w: ['100', '33', '300'], e: 'Each cat catches 1 mouse every 3 minutes, so 3 cats catch 1 mouse a minute: 100 mice in 100 minutes.' },
    { t: [2, 3], topic: 'Thinking it through', q: 'A book and a pen cost ₹110 together. The book costs ₹100 more than the pen. How much does the pen cost?', a: '₹5', w: ['₹10', '₹100', '₹55'], e: 'If the pen is ₹5, the book is ₹105, and ₹105 + ₹5 = ₹110. (A ₹10 pen would make the book ₹110 and the total ₹120.)' },
    { t: [2, 4], topic: 'Number series', q: 'What comes next? 1, 1, 2, 3, 5, 8, ?', a: '13', w: ['11', '12', '16'], e: 'Each number is the sum of the two before it: 5 + 8 = 13.' },
    { t: [2, 4], topic: 'Thinking it through', q: 'A snail climbs 3 metres up a 10-metre wall every day and slips back 2 metres every night. On which day does it reach the top?', a: 'Day 8', w: ['Day 10', 'Day 7', 'Day 5'], e: 'It gains 1 metre a day, so after 7 days and nights it is at 7 metres. On day 8 it climbs 3 metres and reaches the top before it can slip back.' },
    { t: [2, 3], topic: 'Trick question', q: 'How many times can you take 5 away from 25?', a: 'Once', w: ['5 times', '4 times', '25 times'], e: 'After you take 5 away the first time, it is no longer 25: it is 20.' },
    { t: [2, 3], topic: 'Time', q: 'A train leaves at 10:45 a.m. and arrives at 1:15 p.m. How long is the journey?', a: '2 hours 30 minutes', w: ['3 hours 30 minutes', '2 hours 15 minutes', '9 hours 30 minutes'], e: '10:45 to 12:45 is 2 hours, and 12:45 to 1:15 is 30 minutes more.' },
    { t: [2, 3], topic: 'Number series', q: 'What comes next? 2, 3, 5, 7, 11, ?', a: '13', w: ['12', '14', '15'], e: 'These are prime numbers, which only 1 and themselves divide. The next prime after 11 is 13.' },
    { t: [2, 4], topic: 'Days', q: 'If the day before yesterday was Thursday, what day will the day after tomorrow be?', a: 'Monday', w: ['Sunday', 'Saturday', 'Tuesday'], e: 'Day before yesterday Thursday, yesterday Friday, today Saturday, tomorrow Sunday, day after tomorrow Monday.' },
    // Class 9–10 and up.
    { t: [3, 5], topic: 'Thinking it through', q: 'If 5 machines take 5 minutes to make 5 toys, how long would 100 machines take to make 100 toys?', a: '5 minutes', w: ['100 minutes', '20 minutes', '1 minute'], e: 'Each machine makes 1 toy in 5 minutes, so 100 machines make 100 toys in the same 5 minutes.' },
    { t: [3, 5], topic: 'Thinking it through', q: 'A patch of lily pads in a lake doubles in size every day. It takes 48 days to cover the whole lake. How many days does it take to cover half the lake?', a: '47 days', w: ['24 days', '46 days', '36 days'], e: 'It doubles every day, so one day before it covers the whole lake, it covers half: day 47.' },
    { t: [3, 4], topic: 'Riddle', q: 'You have two coins that make ₹15. One of them is not a ₹10 coin. What are the two coins?', a: 'A ₹10 coin and a ₹5 coin', w: ['Three ₹5 coins', 'Two ₹7.50 coins', 'It is impossible'], e: 'The coin that is not ₹10 is the ₹5 coin. The other one is the ₹10 coin.' },
    { t: [3, 5], topic: 'Probability', q: 'A coin is tossed twice. What is the probability of getting at least one head?', a: '3/4', w: ['1/2', '1/4', '2/3'], e: 'The four outcomes are HH, HT, TH and TT. Three of them have a head: 3/4.' },
    { t: [3, 5], topic: 'Ages', q: 'A father is 30 years older than his son. In 5 years, he will be 3 times as old as his son. How old is the son now?', a: '10 years', w: ['15 years', '5 years', '12 years'], e: 'In 5 years: son + 35 = 3 × (son + 5), which gives son = 10. Check: the father is 40, and in 5 years 45 = 3 × 15.' },
    { t: [3, 5], topic: 'Counting', q: 'How many times does the digit 9 appear when you write the numbers from 1 to 100?', a: '20', w: ['10', '11', '19'], e: 'As the last digit: 9, 19, 29 … 99 (10 times). As the first digit: 90 to 99 (10 times). 10 + 10 = 20.' },
    // Class 11–12, college and work: the placement classics.
    { t: [4, 5], topic: 'Clocks', q: 'What is the angle between the hands of a clock at 3:15?', a: '7.5°', w: ['0°', '15°', '30°'], e: 'The minute hand is at 90°. The hour hand has moved a quarter of the way from 3 to 4: 90° + 7.5° = 97.5°. The gap is 7.5°.' },
    { t: [4, 5], topic: 'Counting', q: 'How many squares are there on a chessboard?', a: '204', w: ['64', '65', '128'], e: 'Count every size: 64 (1×1) + 49 + 36 + 25 + 16 + 9 + 4 + 1 (8×8) = 204.' },
    { t: [4, 5], topic: 'Family relations', q: 'A man looks at a photo and says, "Brothers and sisters I have none, but that man\'s father is my father\'s son." Who is in the photo?', a: 'His son', w: ['Himself', 'His father', 'His nephew'], e: 'He has no brothers, so "my father\'s son" is the man himself. The man in the photo is his son.' },
    { t: [4, 5], topic: 'Trains', q: 'A train 150 m long passes a pole in 15 seconds. What is its speed in km/h?', a: '36 km/h', w: ['10 km/h', '54 km/h', '45 km/h'], e: 'Speed = 150 ÷ 15 = 10 m/s. Multiply by 18/5 to get km/h: 36 km/h.' },
    { t: [5, 5], topic: 'Trains', q: 'Two trains, each 100 m long, run towards each other at 40 km/h and 50 km/h. How long do they take to cross each other?', a: '8 seconds', w: ['4 seconds', '10 seconds', '16 seconds'], e: 'Moving towards each other, the speeds add: 90 km/h = 25 m/s. Together they cover 200 m: 200 ÷ 25 = 8 seconds.' },
    { t: [4, 5], topic: 'Pipes and cisterns', q: 'Pipe A fills a tank in 4 hours; pipe B empties it in 6 hours. If both are open, how long does the tank take to fill?', a: '12 hours', w: ['10 hours', '2.4 hours', '5 hours'], e: 'Each hour: 1/4 − 1/6 = 1/12 of the tank fills, so 12 hours.' },
    { t: [5, 5], topic: 'Boats and streams', q: 'A boat moves at 12 km/h in still water, and the stream flows at 3 km/h. How long does it take to go 45 km downstream?', a: '3 hours', w: ['5 hours', '4 hours', '3.75 hours'], e: 'Downstream the speeds add: 12 + 3 = 15 km/h. 45 ÷ 15 = 3 hours.' },
    { t: [4, 5], topic: 'Probability', q: 'Two dice are thrown. What is the probability that the total is 7?', a: '1/6', w: ['1/12', '7/36', '1/3'], e: '6 of the 36 outcomes make 7: 1+6, 2+5, 3+4, 4+3, 5+2, 6+1. 6/36 = 1/6.' },
    { t: [4, 5], topic: 'Arrangements', q: 'In how many different ways can the letters of the word CAT be arranged?', a: '6', w: ['3', '9', '27'], e: '3 choices for the first letter, 2 for the second, 1 for the last: 3 × 2 × 1 = 6.' },
    { t: [4, 5], topic: 'Profit and loss', q: 'A shopkeeper marks an item 20% above its cost, then gives a 10% discount. What is the profit percentage?', a: '8%', w: ['10%', '12%', '2%'], e: 'Take a cost of ₹100: marked ₹120, after 10% off ₹108. ₹8 profit on ₹100 is 8%.' },
    { t: [4, 5], topic: 'Percentages', q: 'A price goes up by 10% and then comes down by 10%. What is the overall change?', a: '1% less', w: ['No change', '1% more', '2% less'], e: '₹100 → ₹110 → ₹110 − ₹11 = ₹99: 1% less than at the start.' },
    { t: [4, 5], topic: 'Averages', q: 'The average of 5 numbers is 20. When one number is removed, the average of the rest is 18. Which number was removed?', a: '28', w: ['2', '20', '38'], e: 'The 5 numbers total 5 × 20 = 100; the 4 left total 4 × 18 = 72. Removed: 100 − 72 = 28.' },
    { t: [4, 5], topic: 'Clocks', q: 'How many times do the hour and minute hands of a clock overlap in 12 hours?', a: '11', w: ['12', '24', '10'], e: 'They meet a little after every hour, except that between 11 and 1 they meet only once, at 12: 11 times.' },
    { t: [4, 5], topic: 'Percentages', q: 'What is 15% of 15% of 400?', a: '9', w: ['60', '90', '4.5'], e: '15% of 400 = 60, and 15% of 60 = 9.' },
    { t: [4, 5], topic: 'Speed', q: 'A car travels the first half of a distance at 40 km/h and the second half at 60 km/h. What is its average speed for the whole trip?', a: '48 km/h', w: ['50 km/h', '45 km/h', '52 km/h'], e: 'Not 50: the car spends longer at the slower speed. Average = 2 × 40 × 60 ÷ (40 + 60) = 48 km/h.' },
    { t: [4, 5], topic: 'Remainders', q: 'A number divided by 5 leaves a remainder of 3. What is the remainder when twice the number is divided by 5?', a: '1', w: ['3', '6', '2'], e: 'Twice the remainder is 6, and 6 divided by 5 leaves 1. (Try 8: 16 ÷ 5 leaves 1.)' },
    { t: [4, 5], topic: 'Family relations', q: 'Lily has as many sisters as brothers. Each of her brothers has twice as many sisters as brothers. How many children are in the family?', a: '7', w: ['5', '6', '8'], e: '4 girls and 3 boys: Lily has 3 sisters and 3 brothers, and each boy has 4 sisters and 2 brothers.' },
    { t: [4, 5], topic: 'Thinking it through', q: 'A bat and a ball cost ₹110 together. The bat costs ₹100 more than the ball. What does the ball cost?', a: '₹5', w: ['₹10', '₹100', '₹55'], e: 'Ball ₹5, bat ₹105: together ₹110. The quick answer, ₹10, would make the bat ₹110 and the total ₹120.' }
] };

/* ── The sections, and a set ──────────────────────────────────────────── */

// A hand-written list is one maker that picks an item it has not used yet.
// An item may name its own topic; a list marked `faq` tags its questions as
// often asked in interviews.
const fromList = (g, topicOf) => ({ id: g.id, tiers: [Math.min(...g.items.map((i) => (i.t || g.tiers)[0])), Math.max(...g.items.map((i) => (i.t || g.tiers)[1]))], list: true,
    make: (t, tier, used) => {
        const fits = g.items.filter((i) => { const [lo, hi] = i.t || g.tiers; return tier >= lo && tier <= hi && !used.has(i.q); });
        if (!fits.length) return null;
        const i = t.pick(fits); used.add(i.q);
        return { topic: i.topic || topicOf, question: i.q, ...choose(t, i.a, i.w), explanation: i.e, ...(g.faq ? { faq: true } : {}) };
    } });

const SECTIONS = {
    asked: [fromList({ ...ASKED, tiers: [1, 5], faq: true }, ASKED.topic)],
    maths: MATHS,
    patterns: PATTERNS,
    reasoning: REASONING.map((g) => (g.items ? fromList(g, g.topic) : g)),
    words: WORDS.map((g) => fromList({ ...g, tiers: [1, 5] }, g.topic))
};
const SECTION_IDS = Object.keys(SECTIONS);

/** The section names a student sees: plainer words for a school student. */
const sectionsFor = (level) => {
    const school = !!level?.school;
    return [
        { id: 'mixed', label: 'Mixed', hint: 'A bit of everything.' },
        { id: 'asked', label: school ? 'Most asked puzzles' : 'Most asked in interviews', hint: school ? 'The famous puzzles quizzes and interviews love to ask.' : 'The classic aptitude questions interviewers ask most.' },
        { id: 'maths', label: school ? 'Maths puzzles' : 'Quantitative aptitude', hint: school ? 'Numbers, sums and word problems.' : 'Percentages, ratios, profit, interest, time and work.' },
        { id: 'patterns', label: school ? 'Patterns' : 'Series and patterns', hint: 'What comes next, and the odd one out.' },
        { id: 'reasoning', label: school ? 'Logic' : 'Logical reasoning', hint: school ? 'Directions, codes, days and comparing.' : 'Codes, directions, relations and conclusions.' },
        { id: 'words', label: school ? 'Words' : 'Verbal ability', hint: school ? 'Word pairs, meanings and grammar.' : 'Analogies, meanings, grammar and spelling.' }
    ];
};
/** What the section is called for this student. */
const titleFor = (level) => (level?.school ? 'IQ & Reasoning' : 'Aptitude Practice');

const SET_SIZE = 10;
const MIXED_ASKED = 2;   // a mixed set has exactly this many most-asked questions
const DIFFICULTY = (tier, g) => (tier <= g.tiers[0] ? 'easy' : tier >= g.tiers[1] ? 'hard' : 'medium');

/**
 * A set of `size` questions for this level: one section, or `mixed` across
 * all four. No question twice, and no hand-written item twice.
 * @returns {Array<{id, section, topic, question, options, answer, explanation, difficulty}>}
 */
const makeSet = ({ level, section = 'mixed', seed = Date.now(), size = SET_SIZE } = {}) => {
    const tier = tierOf(level);
    const t = tools(seeded(seed));
    const sections = section === 'mixed' ? t.shuffle(SECTION_IDS) : [section];
    // Each section's kinds of question that suit this level, in a shuffled
    // queue: the set takes the sections in turn, and within one goes through
    // every kind before it repeats one.
    const queues = sections.map((s) => ({ s, all: SECTIONS[s].filter((g) => tier >= g.tiers[0] && tier <= g.tiers[1]), queue: [] })).filter((x) => x.all.length);
    if (!queues.length) throw new Error(`no questions for ${section} at tier ${tier}`);
    const used = new Set(); const asked = new Set(); const out = [];
    let turn = 0; let misses = 0;
    while (out.length < size && misses < 200) {
        const sec = queues[turn++ % queues.length];
        // A section that missed a turn hands it on, which could give the most-asked list a third question.
        if (section === 'mixed' && sec.s === 'asked' && out.filter((x) => x.faq).length >= MIXED_ASKED) { misses++; continue; }
        if (!sec.queue.length) sec.queue = t.shuffle(sec.all);
        const g = { ...sec.queue.shift(), section: sec.s };
        const q = g.make(t, tier, used);
        if (!q || asked.has(q.question) || q.options.length < 2 || q.answer < 0) { misses++; continue; }
        asked.add(q.question);
        out.push({ id: `q${out.length + 1}`, section: g.section, kind: g.id, difficulty: DIFFICULTY(tier, g), ...q });
    }
    return out;
};

module.exports = { makeSet, sectionsFor, titleFor, tierOf, SECTION_IDS, SET_SIZE, SECTIONS };
