/**
 * The Final Vault's five chambers (asked 2026-10-27), made fresh for each
 * match from its rng — every player in the match gets the same five, in the
 * same order. Each is a real puzzle with its own controls, checked here:
 *
 *   1  The Ancient Lock       (easy) a symbol sequence with one gap
 *   2  The Hidden Mechanism   (easy) three symbol rings, each turned on its
 *                             own, lined up with the bridge plate
 *   3  The Secret Code        (easy) ☀ given, ☾ a step from it, △ a count of
 *                             the people drawn on the wall: three digits
 *   4  The Light Path         (medium) turn four mirrors so the beam reaches the crystal
 *                             (checked by tracing the beam: any working
 *                             arrangement opens it)
 *   5  The Final Trial        (medium) place the three relics by the clues — one names
 *                             the symbol that opened the lock — then dial the
 *                             relics' numbers from the mural, in that order,
 *                             and the last digit of their sum
 *
 * `pub` is what a player is shown; checkAnswer(stage, value) says whether an
 * answer is right (the stages are kept in the game's state, so they hold
 * data only); `solution` is shown once the game is over; `clue` is what clearing a
 * chamber adds to the player's collected clues.
 */
const RELICS = ['sun', 'moon', 'triangle'];
const GLYPH = { star: '★', moon: '☾', sun: '☀', triangle: '△', eye: '◉', key: '⚷' };
const NAME = { star: 'star', moon: 'moon', sun: 'sun', triangle: 'triangle', eye: 'eye', key: 'key' };

const int = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const shuffle = (rng, list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
};
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);

/* ── 1 · The Ancient Lock ─────────────────────────────────────────────── */
// The symbols the puzzles use; the relics (sun, moon, triangle) are the answers that matter later.
const ALL = ['star', 'moon', 'sun', 'triangle', 'eye', 'key'];
/**
 * Easy patterns, a different one each game (asked 2026-10-27: "keep changing
 * the puzzles"): a repeating group of 2, 3 or 4; a row the same from both
 * ends; each symbol twice; each symbol one more time than the last (1, 2, 3);
 * one symbol between every other. Every gap is one the pattern decides.
 */
const PATTERNS = {
    cycle: (rng) => {
        const period = int(rng, 2, 4);
        const order = shuffle(rng, ALL).slice(0, period);
        const seq = Array.from({ length: period === 4 ? 8 : 6 }, (_, i) => order[i % period]);
        return { seq, gaps: seq.map((_, i) => i).filter((i) => seq.some((x, j) => j !== i && j % period === i % period)), rule: `the same ${period} symbols repeat` };
    },
    mirror: (rng) => {
        const [a, b, c, d] = shuffle(rng, ALL);
        const seq = rng() < 0.5 ? [a, b, c, b, a] : [a, b, c, d, c, b, a];
        return { seq, gaps: seq.map((_, i) => i).filter((i) => i !== (seq.length - 1) / 2), rule: 'the row is the same from both ends' };
    },
    pairs: (rng) => {
        const [a, b, c] = shuffle(rng, ALL);
        return { seq: [a, a, b, b, c, c], gaps: [0, 1, 2, 3, 4, 5], rule: 'each symbol comes two times' };
    },
    steps: (rng) => {
        const [a, b, c] = shuffle(rng, ALL);
        return { seq: [a, b, b, c, c, c], gaps: [1, 2, 3, 4, 5], rule: 'one, then two, then three of each' };
    },
    between: (rng) => {
        const [a, ...others] = shuffle(rng, ALL);
        const seq = [a, others[0], a, others[1], a, others[2], a];
        return { seq, gaps: [0, 2, 4, 6], rule: `the ${NAME[a]} comes between every other symbol` };
    }
};
const ancientLock = (rng) => {
    for (;;) {
        const kind = pick(rng, Object.keys(PATTERNS));
        const { seq, gaps: all, rule } = PATTERNS[kind](rng);
        // The answer is one of the three relics (the Final Trial asks about it).
        const gaps = all.filter((i) => RELICS.includes(seq[i]));
        if (!gaps.length) continue;
        const gap = pick(rng, gaps);
        const answer = seq[gap];
        // Four choices: the answer and three others, shuffled.
        const choices = shuffle(rng, [answer, ...shuffle(rng, ALL.filter((x) => x !== answer)).slice(0, 3)]);
        return {
            title: 'The Ancient Lock', kind: 'sequence',
            pub: { prompt: 'Which symbol is missing? Pick it and press Submit.', sequence: seq.map((x, i) => (i === gap ? null : x)), choices },
            answer, pattern: kind,
            solution: `${GLYPH[answer]} — ${rule}.`,
            clue: { label: 'Lock key', glyph: GLYPH[answer], text: `The ${NAME[answer]} opened the first door.` }
        };
    }
};

/* ── 2 · The Hidden Mechanism ─────────────────────────────────────────── */
// Each ring turns on its own (puzzle 2 is easy).
const ringFaces = ALL;
const shown = (rings, pos) => rings.map((faces, i) => faces[((pos[i] % 6) + 6) % 6]);
/** What the rings must show, from the plate: the same, or read from right to left. */
const RING_RULES = [
    { id: 'same', prompt: 'Turn each ring until it shows the same symbol as the bridge plate.', want: (t) => t, why: 'the same as the plate' },
    { id: 'reverse', prompt: 'The bridge plate is read from right to left. Turn the rings to show its symbols in that order.', want: (t) => [...t].reverse(), why: 'the plate read from right to left' }
];
const hiddenMechanism = (rng) => {
    const rings = [0, 1, 2].map(() => shuffle(rng, ringFaces));
    const target = shuffle(rng, ALL).slice(0, 3);
    const rule = pick(rng, RING_RULES);
    const answer = rule.want(target);
    let start;
    do start = [0, 1, 2].map(() => int(rng, 0, 5)); while (shown(rings, start).some((x, i) => x === answer[i]));
    return {
        title: 'The Hidden Mechanism', kind: 'rings',
        pub: { prompt: rule.prompt, rings, start, target, linked: false },
        answer, pattern: rule.id,
        solution: `The rings show ${answer.map((x) => GLYPH[x]).join(' ')}: ${rule.why}.`,
        clue: { label: 'Bridge plate', glyph: target.map((x) => GLYPH[x]).join(''), text: 'The bridge is down.' }
    };
};

/* ── 3 · The Secret Code ──────────────────────────────────────────────── */
/**
 * Three digits, easy, worked out a different way each game: ☀ given or found
 * from a sum; ☾ a step from ☀, double it, or a difference; △ the people drawn
 * on the wall, or a sum or difference of the other two. Every digit 0–9.
 */
const secretCode = (rng) => {
    for (;;) {
        const lines = []; const why = [];
        let sun; let moon;
        const way = pick(rng, ['given-plus', 'given-double', 'sum', 'given-minus']);
        if (way === 'given-plus') { sun = int(rng, 1, 6); const d = int(rng, 1, 3); moon = sun + d; lines.push(`☀ = ${sun}`, `☾ = ☀ + ${d}`); why.push(`☀ = ${sun}`, `☾ = ${sun} + ${d} = ${moon}`); }
        if (way === 'given-double') { sun = int(rng, 1, 4); moon = sun * 2; lines.push(`☀ = ${sun}`, '☾ = ☀ × 2'); why.push(`☀ = ${sun}`, `☾ = ${sun} × 2 = ${moon}`); }
        if (way === 'given-minus') { sun = int(rng, 4, 9); const d = int(rng, 1, 3); moon = sun - d; lines.push(`☀ = ${sun}`, `☾ = ☀ − ${d}`); why.push(`☀ = ${sun}`, `☾ = ${sun} − ${d} = ${moon}`); }
        if (way === 'sum') { moon = int(rng, 1, 5); sun = moon + int(rng, 1, 4); lines.push(`☾ = ${moon}`, `☀ + ☾ = ${sun + moon}`); why.push(`☾ = ${moon}`, `☀ = ${sun + moon} − ${moon} = ${sun}`); }
        let triangle; let figures = null; let note;
        const tri = pick(rng, ['people', 'people', 'sum', 'diff']);
        if (tri === 'people') { figures = int(rng, 2, 7); triangle = figures; note = '△ = how many people are drawn on the wall.'; why.push(`△ = ${figures} people`); }
        if (tri === 'sum') { triangle = sun + moon; lines.push('△ = ☀ + ☾'); note = 'Use the numbers you found for ☀ and ☾.'; why.push(`△ = ${sun} + ${moon} = ${triangle}`); }
        if (tri === 'diff') { triangle = Math.abs(sun - moon); lines.push(sun >= moon ? '△ = ☀ − ☾' : '△ = ☾ − ☀'); note = 'Use the numbers you found for ☀ and ☾.'; why.push(`△ = ${triangle}`); }
        if ([sun, moon, triangle].some((x) => x < 0 || x > 9)) continue;
        const code = `${sun}${moon}${triangle}`;
        return {
            title: 'The Secret Code', kind: 'code',
            pub: { prompt: 'Work out the 3 numbers and enter the code.', lines, figures, order: ['sun', 'moon', 'triangle'], note },
            answer: code, pattern: `${way}/${tri}`,
            solution: `${why.join(', ')}: ${code}.`,
            numbers: { sun, moon, triangle },
            clue: { label: 'Wall numbers', glyph: `☀${sun} ☾${moon} △${triangle}`, text: `☀ = ${sun}, ☾ = ${moon}, △ = ${triangle}.` }
        };
    }
};

/* ── 4 · The Light Path ───────────────────────────────────────────────── */
// A mirror is a line at 0° '/', 1 '—', 2 '\', 3 '|' (a quarter turn = the next).
const N = 5;
const trace = (puzzle, states) => {
    const at = new Map(puzzle.mirrors.map((m, i) => [`${m.r},${m.c}`, i]));
    let r = puzzle.source; let c = -1; let dr = 0; let dc = 1; let turns = 0;
    const path = [];
    for (let step = 0; step < 60; step += 1) {
        r += dr; c += dc;
        if (r < 0 || r >= N || c < 0 || c >= N) return { hit: false, path, turns };
        path.push([r, c]);
        if (r === puzzle.crystal.r && c === puzzle.crystal.c) return { hit: true, path, turns };
        const i = at.get(`${r},${c}`);
        if (i == null) continue;
        const s = states[i];
        if (s === 0) { [dr, dc] = [-dc, -dr]; turns += 1; } else if (s === 2) { [dr, dc] = [dc, dr]; turns += 1; } else if ((s === 1 && dc === 0) || (s === 3 && dr === 0)) return { hit: false, path, turns, blocked: [r, c] };
    }
    return { hit: false, path, turns };
};
const lightPath = (rng) => {
    for (let tries = 0; tries < 2000; tries += 1) {
        const source = int(rng, 0, N - 1);
        // Walk a beam with two or three turns, a mirror at each.
        const want = int(rng, 2, 3);
        let r = source; let c = -1; let dr = 0; let dc = 1;
        const mirrors = []; const solve = []; const used = new Set();
        let ok = true;
        for (let k = 0; k <= want && ok; k += 1) {
            const steps = int(rng, 1, 3);
            for (let s = 0; s < steps; s += 1) {
                r += dr; c += dc;
                if (r < 0 || r >= N || c < 0 || c >= N || used.has(`${r},${c}`)) { ok = false; break; }
                used.add(`${r},${c}`);
            }
            if (!ok || k === want) break;
            // Turn here: '/' or '\'.
            const st = rng() < 0.5 ? 0 : 2;
            mirrors.push({ r, c }); solve.push(st);
            [dr, dc] = st === 0 ? [-dc, -dr] : [dc, dr];
        }
        if (!ok || mirrors.length !== want) continue;
        const crystal = { r, c };
        // Decoys, off the beam, to make four mirrors.
        while (mirrors.length < 4) {
            const m = { r: int(rng, 0, N - 1), c: int(rng, 0, N - 1) };
            if (used.has(`${m.r},${m.c}`) || mirrors.some((x) => x.r === m.r && x.c === m.c)) continue;
            mirrors.push(m); solve.push(int(rng, 0, 3));
        }
        const puzzle = { source, crystal, mirrors };
        if (!trace(puzzle, solve).hit) continue;
        // Every arrangement that works must turn the beam at least twice; the start must not work.
        let easy = false; let count = 0;
        for (let n = 0; n < 256; n += 1) {
            const st = [n & 3, (n >> 2) & 3, (n >> 4) & 3, (n >> 6) & 3];
            const t = trace(puzzle, st);
            if (t.hit) { count += 1; if (t.turns < 2) easy = true; }
        }
        if (easy || !count) continue;
        let start;
        do start = [0, 1, 2, 3].map(() => int(rng, 0, 3)); while (trace(puzzle, start).hit);
        const order = shuffle(rng, ['sun', 'moon', 'triangle', 'star']);
        // Shuffle which mirror is listed first, so the controls do not follow the beam.
        const idx = shuffle(rng, [0, 1, 2, 3]);
        const pubMirrors = idx.map((i, k) => ({ ...mirrors[i], symbol: order[k] }));
        const solution = idx.map((i) => solve[i]);
        return {
            title: 'The Light Path', kind: 'mirrors',
            pub: { prompt: 'Turn the mirrors so the light reaches the crystal.', size: N, source, crystal, mirrors: pubMirrors, start: idx.map((i) => start[i]) },
            solution: `One way: ${pubMirrors.map((m, k) => `${GLYPH[m.symbol]} ${['/', '—', '\\', '|'][solution[k]]}`).join(', ')}.`,
            answer: solution,
            clue: { label: 'Crystal', glyph: '◆', text: 'The crystal is lit.' }
        };
    }
    throw new Error('Could not build a light path.');
};

/* ── 5 · The Final Trial ──────────────────────────────────────────────── */
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].map((p) => p.map((i) => RELICS[i]));
const finalTrial = (rng, lockKey, numbers, level) => {
    const order = pick(rng, PERMS);
    const ref = (x) => (x === lockKey ? 'The symbol from the first door' : `The ${NAME[x]}`);
    const POS = ['first', 'in the middle', 'last'];
    const pool = [];
    RELICS.forEach((x) => {
        [0, 1, 2].forEach((k) => pool.push({ text: `${ref(x)} is not ${POS[k]}.`, ok: (o) => o.indexOf(x) !== k }));
        RELICS.forEach((y) => {
            if (x === y) return;
            pool.push({ text: `${ref(x)} comes before the ${NAME[y]}.`, ok: (o) => o.indexOf(x) < o.indexOf(y) });
            pool.push({ text: `${ref(x)} is next to the ${NAME[y]}.`, ok: (o) => Math.abs(o.indexOf(x) - o.indexOf(y)) === 1 });
        });
    });
    // True clues only; the lock clue first, then more until one order is left.
    const truths = shuffle(rng, pool.filter((c) => c.ok(order)));
    truths.sort((a, b) => Number(b.text.includes('first door')) - Number(a.text.includes('first door')));
    const clues = [];
    for (const c of truths) {
        const before = PERMS.filter((o) => clues.every((k) => k.ok(o))).length;
        const after = PERMS.filter((o) => [...clues, c].every((k) => k.ok(o))).length;
        if (after < before) clues.push(c);
        if (after === 1) break;
    }
    if (PERMS.filter((o) => clues.every((k) => k.ok(o))).length !== 1) return finalTrial(rng, lockKey, numbers, level);
    const digits = order.map((x) => numbers[x]);
    // The fourth digit, a different rule each game.
    const last = pick(rng, [
        { rule: 'then the last digit of their total', d: digits.reduce((a, b) => a + b, 0) % 10, why: `their total is ${digits.reduce((a, b) => a + b, 0)}` },
        { rule: 'then the biggest of the three numbers again', d: Math.max(...digits), why: `the biggest is ${Math.max(...digits)}` },
        { rule: 'then the smallest of the three numbers again', d: Math.min(...digits), why: `the smallest is ${Math.min(...digits)}` }
    ]);
    const code = `${digits.join('')}${last.d}`;
    return {
        title: 'The Final Trial', kind: 'final',
        pub: {
            prompt: 'Put the 3 symbols in the right order, then enter the 4-digit code.',
            relics: [...RELICS], clues: clues.map((c) => c.text),
            rule: `Code = the numbers of the 3 symbols (from Puzzle 3) in your order, ${last.rule}.`
        },
        solution: `Order ${order.map((x) => GLYPH[x]).join(' ')}; numbers ${digits.join(' ')}, ${last.why}: code ${code}.`,
        answer: { order, code },
        clue: null
    };
};

/** Whether `value` answers a stage: the kinds' own checks. */
const checkAnswer = (st, v) => {
    switch (st.kind) {
        case 'sequence': return v === st.answer;
        case 'rings': return same(v, st.answer);
        case 'code': return typeof v === 'string' && v === st.answer;
        case 'mirrors': return Array.isArray(v) && v.length === st.pub.mirrors.length && v.every((x) => Number.isInteger(x) && x >= 0 && x <= 3) && trace(st.pub, v).hit;
        case 'final': return !!v && same(v.order, st.answer.order) && typeof v.code === 'string' && v.code === st.answer.code;
        default: return false;
    }
};

/** A match's five chambers. */
/**
 * A match's five chambers, checked twice: by their makers, and again by
 * ./vaultValidate.js, which reads each as a student would and works the
 * answer out afresh. A set that fails is thrown away and made again.
 */
const vaultStages = (rng, level = 'medium') => {
    const { validate } = require('./vaultValidate');
    for (let tries = 0; tries < 25; tries += 1) {
        const stages = makeStages(rng, level);
        const problems = validate(stages);
        if (!problems.length) return stages;
        console.warn('[final vault] a set of chambers failed its check and was made again:', problems.join('; '));
    }
    throw new Error('Could not make a valid set of chambers.');
};
const makeStages = (rng, level) => {
    const lock = ancientLock(rng);
    const rings = hiddenMechanism(rng);
    const code = secretCode(rng);
    const light = lightPath(rng);
    const trial = finalTrial(rng, lock.answer, code.numbers, level);
    // Data only, from here on: it is kept in the game's state.
    return [lock, rings, code, light, trial].map(({ numbers, ...st }) => st);
};

module.exports = { vaultStages, checkAnswer, trace, shown, GLYPH, RELICS };
