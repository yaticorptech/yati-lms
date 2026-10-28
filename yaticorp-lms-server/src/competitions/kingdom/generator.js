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
    { title: 'The Temple of Knowledge', region: 'The Temple of Knowledge', relic: { id: 'scroll', name: 'Scroll of the Sages', icon: '📜' } },
    { title: 'The Bridge of Logic', region: 'The Three Bridges', relic: { id: 'amulet', name: 'Jade Amulet', icon: '🟢' } },
    { title: 'The Code Mechanism', region: 'The Sealed Vault Door', relic: { id: 'key', name: 'Golden Key', icon: '🗝️' } },
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
    const made = [brokenPath(rng, lvl), templeOfKnowledge(rng, lvl, excludeGk), bridgeOfLogic(rng, lvl), codeMechanism(rng, lvl), finalCombination(rng, lvl)];
    // The final gate's journal clues, one handed out after each of the first four trials.
    const journal = made[4].collected;
    const trials = made.map((t, i) => ({ ...TRIALS[i], ...t, clue: journal[i] || null }));
    delete trials[4].collected;
    for (const t of trials) if (!checkAnswer(t, t.answer)) throw new Error(`Trial "${t.title}" failed its own check.`);
    return trials;
};

/** Whether `value` answers trial `t`. */
const checkAnswer = (t, value) => {
    if (t.kind === 'arrange') return Array.isArray(value) && value.length === 5 && value.every((v, i) => v === t.answer[i]);
    return Number.isInteger(Number(value)) && Number(value) === t.answer;
};

module.exports = { expedition, checkAnswer, seeded, TRIALS, SYMBOLS, fits, cluePool, PERMS };
