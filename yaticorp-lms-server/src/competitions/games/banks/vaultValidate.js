/**
 * A second, separate check of The Final Vault's five chambers before they
 * are played (asked 2026-10-28): each is read the way a student reads it —
 * the symbols, the equations, the clue sentences — and its answer worked out
 * again, without the generator's rules.
 *
 *   1  exactly one of the four symbols completes the row as a pattern
 *   2  the rings' answer is the plate (or the plate reversed, when the
 *      prompt says so), each symbol is on its ring, and no ring starts on it
 *   3  the equations, read back, give the three-digit code
 *   4  the stored arrangement lights the crystal; the starting one does not
 *   5  the clue sentences, read back, fit exactly one order of the relics,
 *      and the code rule, read back, gives the 4-digit code
 *
 * validate(stages) returns a list of problems ([] when all is well).
 */
const { trace } = require('./vault');

const NAMES = { sun: 'sun', moon: 'moon', triangle: 'triangle' };
const distinct = (a) => new Set(a).size === a.length;

/** Whether a full row of symbols is one of the patterns the lock uses. */
const isPattern = (r) => {
    const n = r.length;
    for (let p = 2; p <= 4; p += 1) if (n > p && r.every((x, i) => x === r[i % p]) && distinct(r.slice(0, p))) return true;          // repeating group
    if (r.every((x, i) => x === r[n - 1 - i]) && n % 2 === 1) return true;                                                          // the same both ends
    if (n === 6 && r[0] === r[1] && r[2] === r[3] && r[4] === r[5] && distinct([r[0], r[2], r[4]])) return true;                    // each twice
    if (n === 6 && r[1] === r[2] && r[3] === r[4] && r[4] === r[5] && distinct([r[0], r[1], r[3]])) return true;                    // one, two, three
    if (n === 7 && [0, 2, 4, 6].every((i) => r[i] === r[0]) && distinct([r[1], r[3], r[5]]) && ![r[1], r[3], r[5]].includes(r[0])) return true;   // between every other
    return false;
};

/** The code chamber's lines → { sun, moon, triangle }, or null. */
const readCode = (pub) => {
    const v = {};
    for (const line of pub.lines) {
        let m;
        if ((m = line.match(/^☀ = (\d+)$/))) v.sun = +m[1];
        else if ((m = line.match(/^☾ = (\d+)$/))) v.moon = +m[1];
        else if ((m = line.match(/^☾ = ☀ \+ (\d+)$/))) v.moonFrom = (s) => s + +m[1];
        else if ((m = line.match(/^☾ = ☀ − (\d+)$/))) v.moonFrom = (s) => s - +m[1];
        else if (line === '☾ = ☀ × 2') v.moonFrom = (s) => s * 2;
        else if ((m = line.match(/^☀ \+ ☾ = (\d+)$/))) v.sum = +m[1];
        else if (line === '△ = ☀ + ☾') v.tri = (s, mo) => s + mo;
        else if (line === '△ = ☀ − ☾') v.tri = (s, mo) => s - mo;
        else if (line === '△ = ☾ − ☀') v.tri = (s, mo) => mo - s;
        else return null;
    }
    if (v.sun == null && v.moon != null && v.sum != null) v.sun = v.sum - v.moon;
    if (v.moon == null && v.moonFrom && v.sun != null) v.moon = v.moonFrom(v.sun);
    const triangle = v.tri ? v.tri(v.sun, v.moon) : /people/.test(pub.note) ? pub.figures : null;
    return [v.sun, v.moon, triangle].every((x) => Number.isInteger(x) && x >= 0 && x <= 9) ? { sun: v.sun, moon: v.moon, triangle } : null;
};

/** A final-trial clue → a test of an order (the lock key stands for "the symbol from the first door"). */
const readClue = (line, key) => {
    const who = (w) => (w === 'The symbol from the first door' ? key : NAMES[w.replace(/^The /, '')]);
    let m;
    const at = (o, s) => o.indexOf(s);
    if ((m = line.match(/^(.+?) is not (first|in the middle|last)\.$/))) { const a = who(m[1]); const k = { first: 0, 'in the middle': 1, last: 2 }[m[2]]; return a && ((o) => at(o, a) !== k); }
    if ((m = line.match(/^(.+?) comes before the (\w+)\.$/))) { const a = who(m[1]); const b = NAMES[m[2]]; return a && b && ((o) => at(o, a) < at(o, b)); }
    if ((m = line.match(/^(.+?) is next to the (\w+)\.$/))) { const a = who(m[1]); const b = NAMES[m[2]]; return a && b && ((o) => Math.abs(at(o, a) - at(o, b)) === 1); }
    return null;
};
const ORDERS = [['sun', 'moon', 'triangle'], ['sun', 'triangle', 'moon'], ['moon', 'sun', 'triangle'], ['moon', 'triangle', 'sun'], ['triangle', 'sun', 'moon'], ['triangle', 'moon', 'sun']];

const validate = (stages) => {
    const problems = [];
    const fail = (i, why) => problems.push(`Chamber ${i + 1}: ${why}`);
    const [lock, rings, code, light, trial] = stages;
    // 1 · exactly one choice completes a pattern, and it is the answer.
    const gap = lock.pub.sequence.indexOf(null);
    const completes = lock.pub.choices.filter((c) => isPattern(lock.pub.sequence.map((x, i) => (i === gap ? c : x))));
    if (!distinct(lock.pub.choices) || lock.pub.choices.length !== 4 || completes.length !== 1 || completes[0] !== lock.answer) fail(0, `${completes.length} choices complete the row`);
    // 2 · the plate, or the plate reversed.
    const want = /right to left/.test(rings.pub.prompt) ? [...rings.pub.target].reverse() : rings.pub.target;
    if (want.join() !== rings.answer.join() || rings.answer.some((s, k) => !rings.pub.rings[k].includes(s)) || rings.pub.rings.some((r, k) => r[((rings.pub.start[k] % 6) + 6) % 6] === rings.answer[k])) fail(1, 'the rings do not match the plate');
    // 3 · the equations give the code.
    const nums = readCode(code.pub);
    if (!nums || `${nums.sun}${nums.moon}${nums.triangle}` !== code.answer) fail(2, 'the equations do not give the code');
    // 4 · the light path.
    if (!trace(light.pub, light.answer).hit || trace(light.pub, light.pub.start).hit) fail(3, 'the light path does not work');
    // 5 · one order, and the code from it.
    if (nums) {
        const tests = trial.pub.clues.map((c) => readClue(c, lock.answer));
        if (tests.some((f) => !f)) fail(4, 'a clue could not be read');
        else {
            const fit = ORDERS.filter((o) => tests.every((f) => f(o)));
            if (fit.length !== 1 || fit[0].join() !== trial.answer.order.join()) fail(4, `the clues fit ${fit.length} orders`);
            else {
                const d = fit[0].map((x) => nums[x]);
                const last = /last digit of their total/.test(trial.pub.rule) ? d.reduce((a, b) => a + b, 0) % 10 : /biggest/.test(trial.pub.rule) ? Math.max(...d) : /smallest/.test(trial.pub.rule) ? Math.min(...d) : null;
                if (last == null || `${d.join('')}${last}` !== trial.answer.code) fail(4, 'the code rule does not give the code');
            }
        }
    }
    return problems;
};

module.exports = { validate, isPattern };
