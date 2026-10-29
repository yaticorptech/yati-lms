/**
 * A second, separate check of The Lost Kingdom's trials before they are
 * played (asked 2026-10-28: "check all the questions and the final clues
 * before giving them as a puzzle"). It reads each trial the way a student
 * does — from the words and numbers on the screen — and works the answer
 * out again, without the generator's own rules:
 *
 *   The Broken Path        the asked bridge alone has "?", its options are four
 *                          different numbers, the right one is once among them
 *   The Temple of Knowledge the right option is the bank's answer, the options differ
 *   The Bridge of Logic    the clues read back from their sentences; every bridge
 *                          is tried; exactly one fits, and it is the answer
 *   The Code Mechanism     the three complete panels share a rule (found by
 *                          trying the known kinds), and it gives exactly one option
 *   The Final Combination  the clues read back from their sentences, all 120 orders
 *                          tried: exactly one fits, it is the answer, and the gate's
 *                          clues alone are not enough
 *
 * validate(trials) returns a list of problems ([] when all is well).
 */
const GK = require('./gkBank');

const SIDE = { left: 0, middle: 1, right: 2 };
const SYMBOL = { sun: 'sun', leaf: 'leaf', moon: 'moon', bird: 'bird', key: 'key' };
const ORD = { first: 0, second: 1, third: 2, fourth: 3, fifth: 4 };

const distinct = (list) => new Set(list.map(String)).size === list.length;
const optionsOk = (t) => Array.isArray(t.options) && t.options.length >= 3 && distinct(t.options) && Number.isInteger(t.answer) && t.answer >= 0 && t.answer < t.options.length;

/** A bridge clue's sentence → a test of "bridge x is the safe one", or null if it is not one we know. */
const readBridgeClue = (line) => {
    let m;
    if ((m = line.match(/^The (left|middle|right) bridge is broken\.$/))) { const b = SIDE[m[1]]; return (x) => x !== b; }
    if ((m = line.match(/^The safe bridge is not the (left|middle|right) bridge\.$/))) { const b = SIDE[m[1]]; return (x) => x !== b; }
    if (line === 'The safe bridge is at one of the ends.') return (x) => x !== 1;
    if (line === 'The safe bridge is to the right of the left bridge.') return (x) => x > 0;
    if (line === 'The safe bridge is to the left of the right bridge.') return (x) => x < 2;
    return null;
};
/** A sign's sentence → whether it is true when bridge x is safe. */
const readSign = (line) => {
    const m = line.match(/^The (left|middle|right) bridge's sign says: "(This bridge|The (left|middle|right) bridge) is (safe|broken)\."$/);
    if (!m) return null;
    const about = m[2] === 'This bridge' ? SIDE[m[1]] : SIDE[m[3]];
    return m[4] === 'safe' ? (x) => x === about : (x) => x !== about;
};

/** A final-gate clue's sentence → a test of an order, or null. */
const readOrderClue = (line) => {
    const name = (w) => SYMBOL[w.toLowerCase()];
    let m;
    const at = (o, s) => o.indexOf(s);
    if ((m = line.match(/^The (\w+) symbol is not in the first or last position\.$/))) { const a = name(m[1]); return (o) => at(o, a) > 0 && at(o, a) < 4; }
    if ((m = line.match(/^The (\w+) symbol is in an odd-numbered position\.$/))) { const a = name(m[1]); return (o) => at(o, a) % 2 === 0; }
    if ((m = line.match(/^The (\w+) symbol is in an even-numbered position\.$/))) { const a = name(m[1]); return (o) => at(o, a) % 2 === 1; }
    if ((m = line.match(/^The (\w+) symbol is (first|second|third|fourth|fifth)\.$/))) { const a = name(m[1]); const k = ORD[m[2]]; return (o) => at(o, a) === k; }
    if ((m = line.match(/^The (\w+) symbol is immediately after the (\w+) symbol\.$/))) { const a = name(m[1]); const b = name(m[2]); return (o) => at(o, a) === at(o, b) + 1; }
    if ((m = line.match(/^The (\w+) symbol is somewhere before the (\w+) symbol\.$/))) { const a = name(m[1]); const b = name(m[2]); return (o) => at(o, a) < at(o, b); }
    if ((m = line.match(/^The (\w+) symbol is not next to the (\w+) symbol\.$/))) { const a = name(m[1]); const b = name(m[2]); return (o) => Math.abs(at(o, a) - at(o, b)) > 1; }
    return null;
};
const ORDERS = (() => {
    const out = [];
    const go = (rest, acc) => { if (!rest.length) out.push(acc); rest.forEach((x, i) => go([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, x])); };
    go(Object.keys(SYMBOL), []);
    return out;
})();

/** The kinds of panel rule a student could be expected to see: x → f(x) → g(x). */
const PANEL_KINDS = [];
for (let a = 2; a <= 4; a += 1) for (let b = 2; b <= 3; b += 1) PANEL_KINDS.push({ f: (x) => x * a, g: (x) => x * a * b });
for (let a = 1; a <= 6; a += 1) PANEL_KINDS.push({ f: (x) => x + a, g: (x) => (x + a) * 2 });
PANEL_KINDS.push({ f: (x) => x * 2, g: (x) => x * 3 });
PANEL_KINDS.push({ f: (x) => x * x, g: (x) => x * x - x });
for (let a = 2; a <= 4; a += 1) PANEL_KINDS.push({ f: (x) => x * a, g: (x) => x * a + a });
PANEL_KINDS.push({ f: (x) => x + 3, g: (x) => (x + 3) * x });

const validate = (trials) => {
    const problems = [];
    const fail = (i, why) => problems.push(`Trial ${i + 1}: ${why}`);
    if (!Array.isArray(trials) || trials.length !== 5) return ['There must be five trials.'];
    trials.forEach((t, i) => {
        if (!t.prompt || !t.title) fail(i, 'no question');
        if (t.kind === 'bridges') {
            if (!optionsOk(t) || t.options.length !== 4) fail(i, 'options are not four different ones with one answer');
            const b = t.data?.bridges || [];
            const asked = b.filter((x) => x.terms.includes('?'));
            if (b.length !== 3 || asked.length !== 1 || asked[0].label - 1 !== t.data.ask) fail(i, 'exactly one bridge must show "?"');
            if (!t.options.every((o) => /^\d+$/.test(o))) fail(i, 'options must be whole numbers');
        } else if (t.kind === 'mcq' && t.skill === 'gk') {
            const q = GK.find((x) => x.id === t.questionId);
            if (!q || !optionsOk(t) || t.options[t.answer] !== q.options[q.answer]) fail(i, 'the answer is not the bank\'s');
        } else if (t.kind === 'mcq' && t.skill === 'logic') {
            const lines = t.data?.lines || [];
            const signs = lines.filter((l) => l.includes('sign says'));
            let fits;
            if (signs.length) {
                const tests = signs.map(readSign);
                if (tests.some((f) => !f) || !lines.includes('Exactly one of the three signs tells the truth.')) { fail(i, 'a sign could not be read'); return; }
                fits = [0, 1, 2].filter((x) => tests.filter((f) => f(x)).length === 1);
            } else {
                const tests = lines.map(readBridgeClue);
                if (tests.some((f) => !f)) { fail(i, 'a clue could not be read'); return; }
                fits = [0, 1, 2].filter((x) => tests.every((f) => f(x)));
            }
            if (fits.length !== 1 || fits[0] !== t.answer || t.options.length !== 3) fail(i, `the clues fit ${fits.length} bridges`);
        } else if (t.kind === 'panels') {
            const p = t.data?.panels || [];
            const ok = p.length === 4 && p.slice(0, 3).every((x) => x.every(Number.isInteger)) && p[3][2] === '?';
            if (!ok || !optionsOk(t)) { fail(i, 'the panels are not four with the last missing'); return; }
            const fitting = PANEL_KINDS.filter((k) => p.slice(0, 3).every(([x, y, z]) => k.f(x) === y && k.g(x) === z) && k.f(p[3][0]) === p[3][1]);
            const answers = new Set(fitting.map((k) => String(k.g(p[3][0]))));
            if (answers.size !== 1 || !answers.has(t.options[t.answer])) fail(i, 'the panels do not lead to exactly the one answer');
            if (t.options.filter((o) => answers.has(o)).length !== 1) fail(i, 'more than one option fits');
        } else if (t.kind === 'arrange') {
            const journal = trials.slice(0, 4).map((x) => x.clue).filter(Boolean);
            const gate = t.data?.gateClues || [];
            const tests = [...gate, ...journal].map(readOrderClue);
            if (tests.some((f) => !f)) { fail(i, 'a clue could not be read'); return; }
            const fit = ORDERS.filter((o) => tests.every((f) => f(o)));
            if (fit.length !== 1 || fit[0].join() !== (t.answer || []).join()) fail(i, `the clues fit ${fit.length} orders`);
            const gateTests = gate.map(readOrderClue);
            if (ORDERS.filter((o) => gateTests.every((f) => f(o))).length === 1) fail(i, 'the gate\'s clues alone are enough (the journal must matter)');
        } else fail(i, `unknown kind ${t.kind}`);
    });
    return problems;
};

module.exports = { validate, readOrderClue, readBridgeClue, readSign };
