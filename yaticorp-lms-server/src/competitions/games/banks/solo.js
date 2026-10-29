/**
 * The questions for the Group Brain versions of the solo games (added 2026-10-29: "the solo games, in group
 * games, the same way"). Two kinds:
 *
 *   banks    the word games' questions, written for the solo games (student app, career/data) and exported
 *            to ./solo.json — every option, the right one first, its explanation and its level (1–3)
 *   makers   the maths games, made fresh each time from the game's rng, as the solo games make them
 *
 * Every question comes out raw, the right option first (`answer: 0`); quizCore shuffles the options.
 */
const BANKS = require('./solo.json');

const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pickOne = (rng, list) => list[Math.floor(rng() * list.length)];
const shuffle = (list, rng) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
};
const LEVEL = { easy: 1, medium: 2, hard: 3 };

/** `count` questions from a bank, at the game's difficulty (its own level and the one below; any if too few). */
const fromBank = (name) => (count, rng, level) => {
    const bank = BANKS[name];
    const top = LEVEL[level] || 2;
    const near = bank.filter((q) => q.level <= top && q.level >= top - 1);
    const pool = near.length >= count ? near : bank;
    return shuffle(pool, rng).slice(0, count).map((q) => ({ topic: q.topic || '', prompt: q.prompt, options: q.options, answer: 0, explain: q.explain }));
};

/** `count` made questions, none twice. */
const fromMaker = (maker) => (count, rng, level) => {
    const out = []; const seen = new Set();
    for (let n = 0; out.length < count && n < count * 30; n += 1) {
        const q = maker(rng, LEVEL[level] || 2);
        const key = q.prompt + q.options[0] + JSON.stringify(q.visual || '') + JSON.stringify(q.show || '');
        if (seen.has(key)) continue;
        seen.add(key); out.push(q);
    }
    return out;
};

/** Three different wrong values from `pool`, not `answer`, filled with near numbers if short. */
const wrongs = (rng, answer, pool, ok = () => true) => {
    const out = [];
    for (const v of shuffle(pool, rng)) if (v !== answer && ok(v) && !out.includes(v) && out.length < 3) out.push(v);
    for (let k = 1; out.length < 3; k += 1) for (const v of [answer + k, answer - k]) if (v !== answer && ok(v) && !out.includes(v) && out.length < 3) out.push(v);
    return out;
};

// Percent Snap: percentages that always come out whole.
const percent = (rng, d) => {
    const percents = d === 1 ? [50, 25, 10] : d === 2 ? [50, 25, 20, 10, 5] : [50, 25, 20, 10, 5, 4, 2];
    const p = pickOne(rng, percents);
    const base = (100 / p) * int(rng, 2, d === 1 ? 6 : d === 2 ? 10 : 14);
    const answer = (base * p) / 100;
    const drift = Array.from({ length: 10 }, () => answer + int(rng, 1, Math.max(2, Math.round(answer * 0.4))) * (rng() < 0.5 ? -1 : 1));
    return { topic: 'Percentages', prompt: `What is ${p}% of ${base}?`, options: [answer, ...wrongs(rng, answer, drift, (v) => v > 0)].map(String), answer: 0, explain: `${p}% of ${base} = ${base} × ${p} ÷ 100 = ${answer}.` };
};

// Binary Blitz: read binary as decimal, or (harder) write a decimal in binary.
const binary = (rng, d) => {
    const bits = d + 3;
    const value = int(rng, 1, 2 ** bits - 1);
    const toBinary = d >= 2 && rng() < 0.5;
    const near = Array.from({ length: 10 }, () => value + int(rng, 1, Math.max(2, Math.floor(value / 3) + 2)) * (rng() < 0.5 ? -1 : 1));
    const fmt = (v) => (toBinary ? v.toString(2).padStart(bits, '0') : String(v));
    const bin = value.toString(2).padStart(bits, '0');
    return {
        topic: 'Binary', prompt: toBinary ? `Write ${value} in binary.` : `What is the binary number ${bin} in decimal?`,
        options: [value, ...wrongs(rng, value, near, (v) => v >= 0 && v < 2 ** bits)].map(fmt), answer: 0,
        explain: `${bin} in binary is ${value} in decimal.`
    };
};

// Rounding Rush: round to the nearest ten, hundred or thousand; the wrong options are the usual slips.
const rounding = (rng, d) => {
    const places = d === 1 ? [10] : d === 2 ? [10, 100] : [10, 100, 1000];
    const place = pickOne(rng, places);
    const max = d === 1 ? 999 : d === 2 ? 9999 : 99999;
    const value = int(rng, place + 1, max);
    const roundTo = (n, pl) => Math.round(n / pl) * pl;
    const answer = roundTo(value, place);
    const other = place === 1000 ? 100 : place * 10;
    const word = { 10: 'ten', 100: 'hundred', 1000: 'thousand' }[place];
    return {
        topic: 'Rounding', prompt: `Round ${value} to the nearest ${word}.`,
        options: [answer, ...wrongs(rng, answer, [answer + place, answer - place, roundTo(value, other), Math.floor(value / place) * place, Math.ceil(value / place) * place], (v) => v >= 0)].map(String),
        answer: 0, explain: `${value} rounded to the nearest ${word} is ${answer}.`
    };
};

// Fraction Match: an equal fraction; the wrong ones one off in the top or the bottom.
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const fraction = (rng, d) => {
    let a; let b;
    do { b = 2 + int(rng, 0, d === 1 ? 4 : 7); a = 1 + int(rng, 0, b - 2); } while (gcd(a, b) !== 1);
    const k = 2 + int(rng, 0, d === 1 ? 1 : 3);
    const scaled = [a * k, b * k]; const simplest = [a, b];
    const reverse = d > 1 && rng() < 0.5;
    const shown = reverse ? scaled : simplest; const answer = reverse ? simplest : scaled;
    const same = (p, q) => p[0] * q[1] === q[0] * p[1];
    const out = [];
    for (const c of shuffle([[answer[0] + 1, answer[1]], [answer[0] - 1, answer[1]], [answer[0], answer[1] + 1], [answer[0], answer[1] - 1], [answer[0] + 1, answer[1] + 1], [answer[0] - 1, answer[1] + 1], [answer[0] + 2, answer[1]], [answer[0], answer[1] + 2]], rng)) {
        if (out.length >= 3) break;
        if (c[0] < 1 || c[1] < 2 || c[0] >= c[1] || same(c, shown) || out.some((o) => o.join() === c.join())) continue;
        out.push(c);
    }
    const f = (x) => `${x[0]}/${x[1]}`;
    return {
        topic: 'Fractions', prompt: reverse ? `What is ${f(shown)} in its simplest form?` : `Which fraction is equal to ${f(shown)}?`,
        options: [f(answer), ...out.map(f)], answer: 0, explain: `${f(scaled)} = ${f(simplest)} (both × ${k}).`
    };
};

// Quick Compare: which side is bigger? Never a tie.
const compare = (rng, d) => {
    const max = d === 1 ? 12 : d === 2 ? 18 : 25;
    const ops = d === 1 ? ['+'] : ['+', '×'];
    const build = () => { const a = int(rng, 2, max); const b = int(rng, 2, Math.max(3, max - 3)); const op = pickOne(rng, ops); return { text: `${a} ${op} ${b}`, value: op === '×' ? a * b : a + b }; };
    let l = build(); let r = build();
    for (let n = 0; l.value === r.value && n < 40; n += 1) r = build();
    const [big, small] = l.value > r.value ? [l, r] : [r, l];
    return { topic: 'Compare', prompt: 'Which is larger?', options: [big.text, small.text], answer: 0, explain: `${big.text} = ${big.value}, and ${small.text} = ${small.value}.` };
};

// Scale Balance: chain the clues to find the heaviest (or lightest).
const SHAPES = ['🟥', '🟦', '🟩', '🟨', '🟪', '🟧'];
const scale = (rng, d) => {
    const count = Math.min(4, 2 + d);
    const order = shuffle(SHAPES, rng).slice(0, count);
    const clues = shuffle(order.slice(0, -1).map((x, i) => `${x} is heavier than ${order[i + 1]}`), rng);
    const heaviest = rng() < 0.5;
    const answer = heaviest ? order[0] : order[order.length - 1];
    return {
        topic: 'Scales', prompt: `${clues.join('. ')}. Which is the ${heaviest ? 'heaviest' : 'lightest'}?`,
        options: [answer, ...order.filter((x) => x !== answer)], answer: 0,
        explain: `Heaviest to lightest: ${order.join(' > ')}.`
    };
};

/*
 * The picture and memory games (2026-10-29). A question may carry `visual` (drawn with it: a word in coloured
 * ink, dots, a clock, a grid) and `show` (to memorise first, for `showMs`, then taken away). Colours are names
 * the screen knows (INK on the student side).
 */
const COLOURS = ['red', 'blue', 'green', 'yellow', 'purple'];
const NAME = { red: 'RED', blue: 'BLUE', green: 'GREEN', yellow: 'YELLOW', purple: 'PURPLE' };

// Colour Match: the word says one colour, the ink is another — name the ink.
const colour = (rng, d) => {
    const palette = COLOURS.slice(0, 2 + d + (d === 3 ? 0 : 1));
    const word = pickOne(rng, palette);
    let ink = word;
    if (rng() > 0.15) while (ink === word) ink = pickOne(rng, palette);
    const others = shuffle(COLOURS.filter((c) => c !== ink), rng).slice(0, 3);
    return { topic: 'Colour', prompt: 'What colour is the ink? (Not the word.)', visual: { kind: 'ink', word: NAME[word], ink }, options: [NAME[ink], ...others.map((c) => NAME[c])], answer: 0, explain: `The word says ${NAME[word]}, but it is printed in ${NAME[ink].toLowerCase()}.` };
};

// Dot Count: a field of coloured dots — how many of one colour?
const dots = (rng, d) => {
    const side = 3 + d; const palette = COLOURS.slice(0, 2 + d);
    const ask = pickOne(rng, palette);
    const grid = Array.from({ length: side * side }, () => pickOne(rng, palette));
    const count = grid.filter((c) => c === ask).length;
    return { topic: 'Count', prompt: `How many ${NAME[ask].toLowerCase()} dots are there?`, visual: { kind: 'dots', cols: side, dots: grid }, options: [count, ...wrongs(rng, count, [count - 2, count - 1, count + 1, count + 2, count + 3], (v) => v >= 0)].map(String), answer: 0, explain: `There are ${count} ${NAME[ask].toLowerCase()} dots.` };
};

// Clock Read: read the hands; the wrong times are the usual misreadings.
const clock = (rng, d) => {
    const h = int(rng, 1, 12);
    const m = d === 1 ? pickOne(rng, [0, 30]) : d === 2 ? int(rng, 0, 11) * 5 : int(rng, 0, 59);
    const wrap = (x) => ((x - 1 + 12) % 12) + 1;
    const label = (hh, mm) => `${hh}:${String(mm).padStart(2, '0')}`;
    const step = d === 3 ? 1 : 5;
    const answer = label(h, m);
    const cand = [[wrap(h + 1), m], [wrap(h - 1), m], [h, (m + 30) % 60], m % 5 === 0 ? [m / 5 || 12, (h % 12) * 5] : [h, (m + step) % 60], [h, (m + 60 - step) % 60], [h, (m + step) % 60]].map(([a, b]) => label(a, b));
    const wrong = [...new Set(shuffle(cand, rng).filter((t) => t !== answer))].slice(0, 3);
    return { topic: 'Clock', prompt: 'What time does the clock show?', visual: { kind: 'clock', h, m }, options: [answer, ...wrong], answer: 0, explain: `The short hand is at ${h}, the long hand at ${m} minutes: ${answer}.` };
};

// Shape Matrix: colour runs along the rows, the number of marks down the columns; finish the grid.
const DOT = { red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡', purple: '🟣' };
const matrix = (rng, d) => {
    const palette = shuffle(COLOURS, rng).slice(0, 3);
    const offset = d - 1;
    const cell = (c, n) => DOT[c].repeat(n);
    const grid = [];
    for (let r = 0; r < 3; r += 1) for (let c = 0; c < 3; c += 1) grid.push(cell(palette[c], r + 1 + offset));
    const answer = grid[8];
    const n = 3 + offset;
    const wrongC = palette[(palette.indexOf(palette[2]) + 1) % 3];
    const options = [answer, cell(wrongC, n), cell(palette[2], n === 1 ? 2 : n - 1), cell(wrongC, n + 1)];
    return { topic: 'Matrix', prompt: 'Which one finishes the grid?', visual: { kind: 'matrix', cols: 3, cells: [...grid.slice(0, 8), null] }, options, answer: 0, explain: 'The colour follows the column; the number of marks grows down the rows.' };
};

// Number Recall / Reverse Recall: a number to hold, then pick it (or it backwards) from near misses.
const digits = (rng, len) => Array.from({ length: len }, (_, i) => (i === 0 ? int(rng, 1, 9) : int(rng, 0, 9))).join('');
const nearDigits = (rng, s) => {
    const out = new Set();
    for (let n = 0; out.size < 3 && n < 60; n += 1) {
        const a = s.split(''); const i = int(rng, 0, a.length - 2);
        if (rng() < 0.5) [a[i], a[i + 1]] = [a[i + 1], a[i]]; else a[int(rng, 0, a.length - 1)] = String(int(rng, 0, 9));
        const t = a.join(''); if (t !== s && t[0] !== '0') out.add(t);
    }
    return [...out];
};
const recall = (reverse) => (rng, d) => {
    const s = digits(rng, 3 + d + (reverse ? 0 : 1));
    const answer = reverse ? s.split('').reverse().join('') : s;
    return {
        topic: reverse ? 'Backwards' : 'Recall', prompt: reverse ? 'Which is the number you saw, written backwards?' : 'Which number did you see?',
        show: { kind: 'digits', text: s }, showMs: 2600 - d * 300,
        options: [answer, ...nearDigits(rng, answer)], answer: 0, explain: reverse ? `${s} backwards is ${answer}.` : `The number was ${s}.`
    };
};

// Seen Before: a set flashes up — which of these was in it?
const SYMBOLS = ['🍎', '🍌', '🍇', '🍊', '🍓', '🥝', '🍑', '🍒', '🥥', '🍍', '🥕', '🌽', '🍄', '🥦', '🥑', '🍆', '🐝', '🦋', '🐞', '🐢', '🦊', '🐼', '🐨', '🐧', '🦉', '⚽', '🏀', '🎾', '🎯', '🎲', '🎸', '🎈', '🚗', '🚀', '⛵', '🚲'];
const seen = (rng, d) => {
    const set = shuffle(SYMBOLS, rng).slice(0, 3 + d * 2);
    const unseen = shuffle(SYMBOLS.filter((x) => !set.includes(x)), rng).slice(0, 3);
    const answer = pickOne(rng, set);
    return { topic: 'Seen', prompt: 'Which one was in the set?', show: { kind: 'symbols', items: set }, showMs: 2800 - d * 300, options: [answer, ...unseen], answer: 0, explain: `${answer} was in the set: ${set.join(' ')}.` };
};

// Spot the Change: a grid of tiles, then the same grid with one tile changed — which one?
const TILE = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const change = (rng, d) => {
    const side = Math.min(5, 2 + d); const palette = TILE.slice(0, 2 + d);
    const before = Array.from({ length: side * side }, () => pickOne(rng, palette));
    const at = int(rng, 0, before.length - 1);
    const after = [...before];
    while (after[at] === before[at]) after[at] = pickOne(rng, palette);
    const others = shuffle(before.map((_, i) => i).filter((i) => i !== at), rng).slice(0, 3);
    return {
        topic: 'Change', prompt: 'One tile changed. Which one?', show: { kind: 'tiles', cols: side, tiles: before }, showMs: 2600 - d * 300,
        visual: { kind: 'tiles', cols: side, tiles: after, numbered: true },
        options: [at + 1, ...others.map((i) => i + 1)].map((n) => `Tile ${n}`), answer: 0, explain: `Tile ${at + 1} changed colour.`
    };
};

// Match Back: letters one at a time — was the last the same as the one N back?
const LETTERS = ['A', 'K', 'M', 'R', 'T', 'X'];
const matchBack = (rng, d) => {
    const back = d; const len = 5 + d;
    const seq = [];
    for (let i = 0; i < len; i += 1) {
        const target = seq[i - back];
        seq.push(target !== undefined && rng() < 0.4 ? target : pickOne(rng, LETTERS.filter((l) => l !== target)));
    }
    const same = seq[len - 1] === seq[len - 1 - back];
    const word = back === 1 ? 'the one before it' : `the one ${back} before it`;
    return {
        topic: `${back}-back`, prompt: `Was the last letter the same as ${word}?`, show: { kind: 'sequence', items: seq, stepMs: 900 - d * 100 }, showMs: len * (900 - d * 100) + 400,
        options: same ? ['Yes', 'No'] : ['No', 'Yes'], answer: 0, fixedOrder: true,
        explain: `The letters: ${seq.join(' ')}. The last was ${seq[len - 1]}, and ${word} was ${seq[len - 1 - back]}.`
    };
};

// Running Total: numbers one at a time — keep the total.
const running = (rng, d) => {
    const len = 3 + d; const max = 6 + d * 4;
    const steps = []; let total = 0;
    for (let i = 0; i < len; i += 1) {
        const size = int(rng, 2, max);
        const minus = d > 1 && i > 0 && rng() < 0.4 && total - size >= 0;
        steps.push(minus ? -size : size); total += minus ? -size : size;
    }
    const near = Array.from({ length: 10 }, () => total + int(rng, 1, Math.max(3, Math.round(total * 0.3))) * (rng() < 0.5 ? -1 : 1));
    return {
        topic: 'Running total', prompt: 'What was the total?', show: { kind: 'sequence', items: steps.map((x, i) => (i === 0 ? String(x) : x < 0 ? `− ${-x}` : `+ ${x}`)), stepMs: 1200 - d * 150 }, showMs: len * (1200 - d * 150) + 400,
        options: [total, ...wrongs(rng, total, near, (v) => v >= 0)].map(String), answer: 0, explain: `${steps.map((x, i) => (i === 0 ? x : x < 0 ? `− ${-x}` : `+ ${x}`)).join(' ')} = ${total}.`
    };
};

module.exports = {
    BANKS, fromBank, fromMaker,
    MAKERS: { percent, binary, rounding, fraction, compare, scale, colour, dots, clock, matrix, recall: recall(false), reverse: recall(true), seen, change, matchBack, running }
};
