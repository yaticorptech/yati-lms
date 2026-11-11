/**
 * The Lost Kingdom's five trials, made fresh for each expedition (asked
 * 2026-10-28: "puzzles must change on every play"). Every puzzle is built
 * from rules and checked here before it is used: a number pattern its own
 * rule decides, a fact from the reviewed bank, a logic puzzle whose answer
 * is found by trying every case, a code panel with one answer, and a final
 * arrangement that the clues fix to exactly one order — and only with the
 * clues collected on the way. A puzzle that fails its check is made again.
 *
 *   1  The Broken Path         number series (maths)
 *   2  The Temple of Knowledge general knowledge (science, geography, history, technology)
 *   3  The Bridge of Logic     which bridge is safe, from the clues (logic)
 *   4  The Code Mechanism      four panels, one rule, the missing number (maths)
 *   5  The Final Combination   five symbols in order, from every clue (logic, memory)
 *
 * `level` is 'school' or 'college'. Each trial: { title, region, skill,
 * kind, prompt, data, options, answer, hints, explain, clue, relic } — the
 * answer stays on the server (view() leaves it out).
 */
const GK = require('./gkBank');

const int = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const shuffle = (rng, list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
};
/** Four different options with the answer among them: { options, answer }. */
const choices = (rng, right, wrong) => {
    const others = [...new Set(wrong.map(String))].filter((x) => x !== String(right));
    if (others.length < 3) return null;
    const options = shuffle(rng, [String(right), ...shuffle(rng, others).slice(0, 3)]);
    return { options, answer: options.indexOf(String(right)) };
};
const near = (n) => [n + 1, n - 1, n + 2, n - 2, n + 4, n + 6, n - 3, n * 2, n + 10].filter((x) => x > 0 && x !== n);

/* ── Number series ────────────────────────────────────────────────────── */
// Each maker: rng → { terms (6), rule (words) }. School ones are gentler.
const SERIES = {
    add: (rng) => { const a = int(rng, 2, 20); const d = int(rng, 3, 12); return { terms: Array.from({ length: 6 }, (_, i) => a + d * i), rule: `add ${d} each time` }; },
    double: (rng) => { const a = int(rng, 2, 6); const m = pick(rng, [2, 3]); return { terms: Array.from({ length: 6 }, (_, i) => a * m ** i), rule: `multiply by ${m} each time` }; },
    growing: (rng) => { const a = int(rng, 1, 10); const d = int(rng, 1, 4); const t = [a]; for (let i = 1; i < 6; i += 1) t.push(t[i - 1] + d + (i - 1)); return { terms: t, rule: `the gap grows by 1 each time (+${d}, +${d + 1}, +${d + 2}…)` }; },
    squares: (rng) => { const s = int(rng, 1, 5); const k = pick(rng, [0, 1]); return { terms: Array.from({ length: 6 }, (_, i) => (s + i) ** 2 + k), rule: k ? 'square numbers plus 1' : 'square numbers' }; },
    pronic: (rng) => { const s = int(rng, 1, 4); return { terms: Array.from({ length: 6 }, (_, i) => (s + i) * (s + i + 1)), rule: 'n × (n + 1): 1×2, 2×3, 3×4…' }; },
    alternate: (rng) => { const a = int(rng, 5, 20); const p = int(rng, 4, 9); const q = int(rng, 1, 3); const t = [a]; for (let i = 1; i < 6; i += 1) t.push(t[i - 1] + (i % 2 ? p : -q)); return { terms: t, rule: `add ${p}, then take away ${q}, again and again` }; },
    fib: (rng) => { const a = int(rng, 1, 4); const b = int(rng, 2, 6); const t = [a, b]; while (t.length < 6) t.push(t.at(-1) + t.at(-2)); return { terms: t, rule: 'each number is the sum of the two before it' }; }
};
const SERIES_BY_LEVEL = { school: ['add', 'double', 'growing', 'squares', 'alternate'], college: ['growing', 'squares', 'pronic', 'alternate', 'fib', 'double'] };

const brokenPath = (rng, level) => {
    for (;;) {
        const kinds = shuffle(rng, SERIES_BY_LEVEL[level]).slice(0, 3);
        const bridges = kinds.map((k) => ({ kind: k, ...SERIES[k](rng) }));
        // One bridge's sign is missing its last number; the other two are complete (asked
        // 2026-10-28: one clear question with one right answer, no "which pattern is true").
        const k = int(rng, 0, 2);
        const b = bridges[k];
        const next = b.terms[5];
        const opts = choices(rng, next, near(next));
        if (!opts) continue;
        return {
            kind: 'bridges', skill: 'math',
            prompt: `Bridge ${k + 1}'s sign is missing its last number. Which number completes its pattern?`,
            data: { bridges: bridges.map((x, i) => ({ label: i + 1, terms: [...x.terms.slice(0, 5), i === k ? '?' : x.terms[5]] })), ask: k },
            ...opts,
            hints: [`Look at how each number on bridge ${k + 1} changes to the next.`, `The rule: ${b.rule}.`],
            explain: `Bridge ${k + 1}: ${b.rule}, so the missing number is ${next}.`
        };
    }
};

/* ── General knowledge ───────────────────────────────────────────────── */
const templeOfKnowledge = (rng, level, exclude = []) => {
    const pool = GK.filter((q) => !exclude.includes(q.id) && (level === 'college' || q.level === 'school'));
    const q = pick(rng, pool.length ? pool : GK);
    const options = shuffle(rng, q.options);
    return {
        kind: 'mcq', skill: 'gk', questionId: q.id, category: q.category, source: q.source, reviewedOn: q.reviewedOn,
        prompt: q.prompt, data: { category: q.category },
        options, answer: options.indexOf(q.options[q.answer]),
        hints: q.hints, explain: q.explain
    };
};

/* ── Puzzle 2 since 2026-11-07: the tile swap (the approved design) ───── */
// A 3×3 board of three symbols, three of each, scrambled. Two tiles tapped swap places; it is solved when every row
// and every column has one of each symbol. Any such arrangement is right (checkAnswer reads the rule, not one order).
const SWAP_SYMBOLS = ['gem', 'sun', 'leaf'];
const SWAP_NAME = { gem: 'Gem', sun: 'Sun', leaf: 'Leaf' };
const swapSolved = (tiles) => Array.isArray(tiles) && tiles.length === 9 && tiles.every((t) => SWAP_SYMBOLS.includes(t))
    && [0, 1, 2].every((i) => new Set([0, 1, 2].map((k) => tiles[i * 3 + k])).size === 3 && new Set([0, 1, 2].map((k) => tiles[k * 3 + i])).size === 3);
const tileSwap = (rng) => {
    // One solved board: a shuffled first row, then the same row turned one step (left or right) for each row after.
    const first = shuffle(rng, SWAP_SYMBOLS); const dir = rng() < 0.5 ? 1 : 2;
    const answer = [0, 1, 2].flatMap((r) => [0, 1, 2].map((k) => first[(k + r * dir) % 3]));
    // Scrambled far enough that it needs a few swaps: no more than two rows/columns already right.
    const lines = (t) => [0, 1, 2].flatMap((i) => [new Set([0, 1, 2].map((k) => t[i * 3 + k])).size === 3, new Set([0, 1, 2].map((k) => t[k * 3 + i])).size === 3]).filter(Boolean).length;
    let start; do start = shuffle(rng, answer); while (swapSolved(start) || lines(start) > 2);
    const rows = [0, 1, 2].map((r) => answer.slice(r * 3, r * 3 + 3).map((x) => SWAP_NAME[x]).join(', '));
    return {
        kind: 'swap', skill: 'logic',
        prompt: 'Tap two tiles to swap them. Make every row and every column have one Gem, one Sun and one Leaf. Then press Submit.',
        data: { symbols: [...SWAP_SYMBOLS], start },
        answer,
        hints: ['Click two tiles to swap them.', 'Fix the first row, then make each row below it the one above turned by one step.'],
        explain: `Every row and every column needs one Gem, one Sun and one Leaf — for example: ${rows.join(' / ')}.`
    };
};

/* ── Puzzle 4: the number grid (harder since 2026-11-07) ─────────────── */
// Three by three: in every row — or every column, which the student must notice — the third number comes from the
// first two by one hidden rule (add and add 1, double one and add, multiply…). Any one cell may be missing. Kept only
// when exactly one number can fill it (rules.js tries every rule, both ways).
const { RULES, GRID, triangleFills, gridFills } = require('./rules');
const HARD_GRID = RULES.filter((r) => r.id !== 'sum' && r.id !== 'diff');
const numberGrid = (rng) => {
    for (;;) {
        const rule = pick(rng, HARD_GRID); const way = rng() < 0.5 ? 'rows' : 'cols';
        const cells = Array(9).fill(0);
        for (const [z, x, y] of GRID[way]) { cells[x] = int(rng, 2, 12); cells[y] = int(rng, 2, 12); cells[z] = rule.f(cells[x], cells[y]); }
        if (cells.some((v) => v < 0 || v > 999) || new Set(cells).size < 7) continue;
        const gap = int(rng, 0, 8); const answer = cells[gap];
        const shown = cells.map((v, i) => (i === gap ? null : v));
        const ans = gridFills(shown);
        if (ans.length !== 1 || ans[0] !== answer) continue;
        const line = GRID[way].find((rel) => rel.includes(gap));
        const [z, x, y] = line;
        const words = way === 'rows' ? 'row' : 'column';
        return {
            kind: 'grid', skill: 'math',
            prompt: 'Find the missing number in the pattern.',
            data: { cells: shown },
            answer,
            hints: [`Look along each ${words}: the third number is made from the first two.`, `In each ${words}: ${rule.say}.`],
            explain: `In every ${words}, ${rule.say}: ${cells[x]} and ${cells[y]} make ${cells[z]}, so the missing number is ${answer}.`
        };
    }
};

/* ── Puzzle 3: the number triangle (2026-11-07: one operation only) ───── */
// Six circles in three rows; each number comes from the two just below it by ONE operation, the same for all —
// adding, taking the smaller from the larger, or multiplying (never two at once, as asked). The last circle is missing,
// as the picture's card says. Kept only when exactly one number fits every rule a student might try (rules.js).
const TRI_RULES = ['sum', 'diff', 'mul'].map((id) => RULES.find((r) => r.id === id));
const TRI_RANGE = { sum: [1, 12], diff: [1, 30], mul: [2, 5] };
const numberTriangle = (rng) => {
    for (;;) {
        const rule = pick(rng, TRI_RULES);
        const [lo, hi] = TRI_RANGE[rule.id];
        const d = int(rng, lo, hi); const e = int(rng, lo, hi); const f = int(rng, lo, hi);
        const b = rule.f(d, e); const c = rule.f(e, f); const a = rule.f(b, c);
        if ([a, b, c].some((v) => v < 1 || v > 99) || new Set([a, b, c, d, e, f]).size < 5) continue;
        const answer = f;
        const shown = [[a], [b, c], [d, e, null]];
        const ans = triangleFills(shown);
        if (ans.length !== 1 || ans[0] !== answer) continue;
        const op = { sum: '+', diff: '−', mul: '×' }[rule.id];
        const calc = (x, y, z) => (rule.id === 'diff' ? `${Math.max(x, y)} − ${Math.min(x, y)} = ${z}` : `${x} ${op} ${y} = ${z}`);
        return {
            kind: 'triangle', skill: 'math',
            prompt: 'Find the missing number in the final circle. Each number comes from the two numbers just below it — by adding, subtracting or multiplying.',
            data: { rows: shown },
            answer,
            hints: ['Each number comes from the two numbers just below it, by one operation: +, − or ×.', `The operation is: ${rule.say}.`],
            explain: `Each number: ${rule.say} (the two just below it). ${calc(d, e, b)}, ${calc(b, c, a)}, so ${calc(e, answer, c)} — the missing number is ${answer}.`
        };
    }
};

/* ── Logic: the safe bridge ──────────────────────────────────────────── */
const SIDES = ['left', 'middle', 'right'];
const bridgeOfLogic = (rng, level) => {
    for (let tries = 0; tries < 500; tries += 1) {
        const safe = int(rng, 0, 2);
        const style = level === 'college' ? pick(rng, ['clues', 'signs', 'signs']) : pick(rng, ['clues', 'clues', 'signs']);
        let lines; let ok; let why;
        if (style === 'clues') {
            // Plain clues, all true for the safe bridge; sometimes not enough to decide.
            const pool = [
                ...SIDES.map((s, i) => ({ text: `The ${s} bridge is broken.`, ok: (x) => x !== i })),
                ...SIDES.map((s, i) => ({ text: `The safe bridge is not the ${s} bridge.`, ok: (x) => x !== i })),
                { text: 'The safe bridge is at one of the ends.', ok: (x) => x !== 1 },
                { text: 'The safe bridge is to the right of the left bridge.', ok: (x) => x > 0 },
                { text: 'The safe bridge is to the left of the right bridge.', ok: (x) => x < 2 }
            ].filter((c) => c.ok(safe));
            const chosen = shuffle(rng, pool).slice(0, int(rng, 1, 3));
            lines = chosen.map((c) => c.text);
            ok = (x) => chosen.every((c) => c.ok(x));
            why = (x) => `the ${SIDES[x]} bridge goes against "${chosen.find((c) => !c.ok(x)).text.replace(/\.$/, '')}"`;
        } else {
            // Three signs; exactly one tells the truth.
            // Each sign speaks of a bridge (its own or another): safe, or broken.
            const signs = [0, 1, 2].map((i) => {
                const about = pick(rng, [i, i, 0, 1, 2]);
                const says = rng() < 0.5 ? 'safe' : 'broken';
                const who = about === i ? 'This bridge' : `The ${SIDES[about]} bridge`;
                return { f: (x) => (says === 'safe' ? x === about : x !== about), text: `${who} is ${says}.` };
            });
            lines = [...signs.map((g, i) => `The ${SIDES[i]} bridge's sign says: "${g.text}"`), 'Exactly one of the three signs tells the truth.'];
            ok = (x) => signs.filter((g) => g.f(x)).length === 1;
            why = (x) => { const n = signs.filter((g) => g.f(x)).length; return `if the ${SIDES[x]} bridge were safe, ${n === 0 ? 'no sign' : `${n} signs`} would tell the truth`; };
        }
        // Exactly one bridge may fit every clue (asked 2026-10-28: one right answer, always).
        const fits = [0, 1, 2].filter(ok);
        if (fits.length !== 1) continue;
        const answer = fits[0];
        return {
            kind: 'mcq', skill: 'logic',
            prompt: `${lines.join(' ')} Only one of the three bridges is safe. Which bridge should you choose?`,
            data: { lines, question: 'Only one of the three bridges is safe. Which bridge should you choose?' },
            options: ['Left bridge', 'Middle bridge', 'Right bridge'], answer,
            hints: ['Try each bridge in turn: if it were the safe one, would every clue be true?', `Only the ${SIDES[answer]} bridge fits every clue.`],
            explain: `The ${SIDES[answer]} bridge is safe: ${[0, 1, 2].filter((i) => i !== answer).map(why).join('; ')}.`
        };
    }
    throw new Error('Could not build a logic trial.');
};

/* ── The code mechanism ──────────────────────────────────────────────── */
// Four panels of three numbers, one rule for all: (x, f(x), g(x)); the last panel's third is missing.
const PANEL_RULES = {
    school: [
        (rng) => { const a = int(rng, 2, 3); const b = 2; return { f: (x) => x * a, g: (x) => x * a * b, rule: `× ${a}, then × ${b}` }; },
        (rng) => { const a = int(rng, 2, 5); return { f: (x) => x + a, g: (x) => (x + a) * 2, rule: `+ ${a}, then × 2` }; },
        () => ({ f: (x) => x * 2, g: (x) => x * 2 + x, rule: '× 2, then add the first number' })
    ],
    college: [
        () => ({ f: (x) => x * x, g: (x) => x * x - x, rule: 'square it, then take away the first number' }),
        (rng) => { const a = int(rng, 2, 4); return { f: (x) => x * a, g: (x) => x * a + a, rule: `× ${a}, then + ${a}` }; },
        () => ({ f: (x) => x * 3, g: (x) => x * 3 * 2, rule: '× 3, then × 2' }),
        () => ({ f: (x) => x + 3, g: (x) => (x + 3) * x, rule: '+ 3, then multiply by the first number' })
    ]
};
const codeMechanism = (rng, level) => {
    for (;;) {
        const r = pick(rng, PANEL_RULES[level])(rng);
        const starts = shuffle(rng, [2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4).sort((a, b) => a - b);
        const panels = starts.map((x) => [x, r.f(x), r.g(x)]);
        const missing = panels[3][2];
        const opts = choices(rng, missing, [...near(missing), panels[3][1] * 2, panels[3][1] + panels[3][0]]);
        if (!opts || missing > 999) continue;
        return {
            kind: 'panels', skill: 'math',
            prompt: 'Find the missing number. Each panel follows the same rule from top to bottom.',
            data: { panels: panels.map((p, i) => (i === 3 ? [p[0], p[1], '?'] : p)) },
            ...opts,
            hints: ['Compare the top and middle numbers on each panel, then the middle and bottom ones.', `The rule: ${r.rule}.`],
            explain: `Every panel goes ${r.rule}: ${panels[3][0]} → ${panels[3][1]} → ${missing}.`
        };
    }
};

/* ── The final combination ───────────────────────────────────────────── */
const SYMBOLS = ['sun', 'leaf', 'moon', 'bird', 'key'];
const NAME = { sun: 'Sun', leaf: 'Leaf', moon: 'Moon', bird: 'Bird', key: 'Key' };
const PERMS = (() => {
    const out = [];
    const go = (rest, acc) => { if (!rest.length) out.push(acc); rest.forEach((x, i) => go([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, x])); };
    go(SYMBOLS, []);
    return out;
})();
const ORD = ['first', 'second', 'third', 'fourth', 'fifth'];
const cluePool = (order) => {
    const at = (o, s) => o.indexOf(s);
    const all = [];
    for (const a of SYMBOLS) {
        all.push({ text: `The ${NAME[a]} symbol is not in the first or last position.`, ok: (o) => at(o, a) > 0 && at(o, a) < 4 });
        all.push({ text: `The ${NAME[a]} symbol is in an odd-numbered position.`, ok: (o) => at(o, a) % 2 === 0 });
        all.push({ text: `The ${NAME[a]} symbol is in an even-numbered position.`, ok: (o) => at(o, a) % 2 === 1 });
        for (let k = 0; k < 5; k += 1) all.push({ text: `The ${NAME[a]} symbol is ${ORD[k]}.`, ok: (o) => at(o, a) === k, strong: true });
        for (const b of SYMBOLS) {
            if (a === b) continue;
            all.push({ text: `The ${NAME[a]} symbol is immediately after the ${NAME[b]} symbol.`, ok: (o) => at(o, a) === at(o, b) + 1 });
            all.push({ text: `The ${NAME[a]} symbol is somewhere before the ${NAME[b]} symbol.`, ok: (o) => at(o, a) < at(o, b) });
            if (a < b) all.push({ text: `The ${NAME[a]} symbol is not next to the ${NAME[b]} symbol.`, ok: (o) => Math.abs(at(o, a) - at(o, b)) > 1 });
        }
    }
    return all.filter((c) => c.ok(order));
};
const fits = (clues) => PERMS.filter((o) => clues.every((c) => c.ok(o)));
/**
 * Clues until one order is left: four of them are handed out along the way
 * (one per trial, kept in the journal), the rest are on the final gate. The
 * gate's alone must not be enough — the collected ones are needed.
 */
const finalCombination = (rng, level) => {
    for (let tries = 0; tries < 400; tries += 1) {
        const order = shuffle(rng, SYMBOLS);
        const pool = shuffle(rng, cluePool(order)).filter((c) => level === 'college' || !c.strong || rng() < 0.5);
        const clues = [];
        for (const c of pool) {
            if (fits([...clues, c]).length < fits(clues).length) clues.push(c);
            if (fits(clues).length === 1) break;
        }
        if (fits(clues).length !== 1 || clues.length < 5 || clues.length > 8) continue;
        const ordered = shuffle(rng, clues);
        const collected = ordered.slice(0, 4);
        const gate = ordered.slice(4);
        if (fits(gate).length === 1) continue;           // the journal must matter
        return {
            kind: 'arrange', skill: 'logic',
            prompt: 'Use every clue — the ones on the gate and the ones in your journal — to put the five symbols in the right order and unlock the final gate.',
            data: { symbols: [...SYMBOLS], gateClues: gate.map((c) => c.text) },
            collected: collected.map((c) => c.text),
            options: null, answer: order,
            hints: ['Start with the clues that fix a symbol\'s place, then the ones that join two symbols.', `The first symbol is the ${NAME[order[0]]}.`],
            explain: `The only order that fits every clue: ${order.map((s) => NAME[s]).join(', ')}.`
        };
    }
    throw new Error('Could not build the final combination.');
};

/* ── An expedition ───────────────────────────────────────────────────── */
const TRIALS = [
    { title: 'The Broken Path', region: 'The Waterfall Gorge', relic: { id: 'compass', name: 'Bronze Compass', icon: '🧭' } },
    { title: 'The Sun Temple', region: 'The Temple of the Three Symbols', relic: { id: 'scroll', name: 'Scroll of the Sages', icon: '📜' } },
    { title: 'The Forgotten Palace', region: 'The Forgotten Palace', relic: { id: 'amulet', name: 'Jade Amulet', icon: '🟢' } },
    { title: 'The Haunted Castle', region: 'The Haunted Castle', relic: { id: 'key', name: 'Golden Key', icon: '🗝️' } },
    { title: 'The Final Combination', region: 'The Final Gate', relic: { id: 'star', name: 'Star of Aurelia', icon: '✴️' } }
];

/** A seeded random number source (mulberry32): the same seed, the same expedition (the daily challenge). */
const seeded = (seed) => {
    let a = 0;
    for (const ch of String(seed)) a = (Math.imul(a ^ ch.charCodeAt(0), 2654435761) >>> 0);
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

/**
 * Five trials, checked twice: by their own makers, and again by
 * ./validate.js, which reads each one as a student would and works the
 * answer out afresh. A set that fails is thrown away and made again.
 * `excludeGk`: questions this student met lately.
 */
const expedition = (rng, opts = {}) => {
    const { validate } = require('./validate');
    for (let tries = 0; tries < 25; tries += 1) {
        const trials = makeExpedition(rng, opts);
        const problems = validate(trials);
        if (!problems.length) return trials;
        console.warn('[lost kingdom] a set of trials failed its check and was made again:', problems.join('; '));
    }
    throw new Error('Could not make a valid set of trials.');
};
const makeExpedition = (rng, { level = 'school', excludeGk = [] } = {}) => {
    const lvl = level === 'college' ? 'college' : 'school';
    const made = [brokenPath(rng, lvl), tileSwap(rng), numberTriangle(rng), numberGrid(rng), finalCombination(rng, lvl)];
    // The final gate's journal clues, one handed out after each of the first four trials.
    const journal = made[4].collected;
    const trials = made.map((t, i) => ({ ...TRIALS[i], ...t, clue: journal[i] || null }));
    delete trials[4].collected;
    for (const t of trials) if (!checkAnswer(t, t.answer)) throw new Error(`Trial "${t.title}" failed its own check.`);
    return trials;
};

/**
 * A game whose second trial is still the old knowledge question (made before 2026-11-05, or by a server running the
 * old code — several share one database): it becomes the three discs, made from the old trial itself so it is the
 * same on every look and every server. Changes `shared` in place; true if it did.
 */
const upgradeTrials = (shared) => {
    // The fourth trial, likewise: the code panels become the number grid.
    const four = shared?.stages?.[3];
    let changedFour = false;
    if (four && four.kind === 'panels') {
        let s4 = 2166136261;
        for (const ch of JSON.stringify(four.data) + four.prompt) { s4 ^= ch.charCodeAt(0); s4 = Math.imul(s4, 16777619) >>> 0; }
        shared.stages[3] = { ...TRIALS[3], ...numberGrid(() => { s4 = (Math.imul(s4 ^ (s4 >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return s4 / 4294967296; }), clue: four.clue || null };
        changedFour = true;
    }
    // The third trial, likewise: the safe-bridge question becomes the number triangle.
    const three = shared?.stages?.[2];
    let changed = changedFour;
    if (three && three.kind === 'mcq' && three.skill === 'logic') {
        let s3 = 2166136261;
        for (const ch of three.prompt + JSON.stringify(three.options)) { s3 ^= ch.charCodeAt(0); s3 = Math.imul(s3, 16777619) >>> 0; }
        shared.stages[2] = { ...TRIALS[2], ...numberTriangle(() => { s3 = (Math.imul(s3 ^ (s3 >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return s3 / 4294967296; }), clue: three.clue || null };
        changed = true;
    }
    // The second trial: the old knowledge question, or the three discs (before 2026-11-07), becomes the tile swap.
    const old = shared?.stages?.[1];
    if (!old || !((old.kind === 'mcq' && old.skill === 'gk') || old.kind === 'discs')) return changed;
    let seed = 2166136261;
    for (const ch of JSON.stringify(old.options || old.data) + old.prompt) { seed ^= ch.charCodeAt(0); seed = Math.imul(seed, 16777619) >>> 0; }
    const rng = () => { seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return seed / 4294967296; };
    shared.stages[1] = { ...TRIALS[1], ...tileSwap(rng), clue: old.clue || null };
    return true;
};

/** Whether `value` answers trial `t`. */
const checkAnswer = (t, value) => {
    if (t.kind === 'arrange') return Array.isArray(value) && value.length === 5 && value.every((v, i) => v === t.answer[i]);
    if (t.kind === 'swap') return swapSolved(value);
    if (t.kind === 'discs') return Array.isArray(value) && value.length === 3 && value.every((v, i) => v === t.answer[i]);
    return Number.isInteger(Number(value)) && Number(value) === t.answer;
};

module.exports = { expedition, checkAnswer, swapSolved, upgradeTrials, seeded, TRIALS, SYMBOLS, fits, cluePool, PERMS };
