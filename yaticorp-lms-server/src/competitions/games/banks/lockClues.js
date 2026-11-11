/**
 * The Final Vault's first door, "Crack the Code" (asked 2026-11-05, to the approved design): a 3-digit code
 * (100–999) and three clues, one of each kind the panel draws an icon for —
 *
 *   fact     (the padlock)  something true of the digits: all different, none 0, the first odd…
 *   sum      (Σ)            the sum of the digits
 *   relation (#)            how two of the digits stand to each other
 *
 * `lockCode` makes a code and picks a fact and a relation that, with the sum, leave that code alone — or at most one
 * other (2026-11-07). Codes are counted from 000 to 999: the lock's wheels show 0 like any digit, so a student may
 * fairly answer 062. Any code the clues allow opens the lock (vault.js checkAnswer).
 * `readLockClue` reads a clue's words back into a test, the way a student would, for vaultValidate.js.
 */
const d = (n) => [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10];
const CODES = Array.from({ length: 900 }, (_, i) => i + 100);          // the codes the lock is set to
const ALL = Array.from({ length: 1000 }, (_, i) => i);                 // every code a student can dial, 000–999
const pad = (n) => String(n).padStart(3, '0');
const POS = ['first', 'middle', 'last'];
const TIMES = { 2: 'twice', 3: 'three times' };

const FACTS = [
    ['The code has three different digits.', ([a, b, c]) => a !== b && b !== c && a !== c],
    ['Two of the digits are the same.', ([a, b, c]) => new Set([a, b, c]).size === 2],
    ['No digit is 0.', (x) => !x.includes(0)],
    ['The first digit is odd.', ([a]) => a % 2 === 1],
    ['The first digit is even.', ([a]) => a % 2 === 0],
    ['The last digit is odd.', ([, , c]) => c % 2 === 1],
    ['The last digit is even.', ([, , c]) => c % 2 === 0],
    ['The first digit is the largest.', ([a, b, c]) => a > b && a > c],
    ['The last digit is the largest.', ([a, b, c]) => c > a && c > b],
    ['The digits go up from left to right.', ([a, b, c]) => a < b && b < c],
    ['The digits go down from left to right.', ([a, b, c]) => a > b && b > c]
];

/** Every relation true of a code's digits, as [text, test]. */
const relationsOf = (x) => {
    const out = [];
    for (let i = 0; i < 3; i += 1) {
        for (let j = 0; j < 3; j += 1) {
            if (i === j) continue;
            for (const k of [2, 3]) {
                if (x[j] !== 0 && x[i] === k * x[j]) out.push([`The ${POS[i]} digit is ${TIMES[k]} the ${POS[j]} digit.`, (y) => y[i] === k * y[j]]);
            }
            const gap = x[i] - x[j];
            if (gap >= 1 && gap <= 6) out.push([`The ${POS[i]} digit is ${gap} more than the ${POS[j]} digit.`, (y) => y[i] - y[j] === gap]);
        }
    }
    if (x[2] === x[0] + x[1]) out.push(['The last digit is the first digit plus the middle digit.', (y) => y[2] === y[0] + y[1]]);
    return out;
};

const shuffle = (rng, list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
};

/** A code and its three clues: [fact, sum, relation], which leave that code alone. */
const lockCode = (rng) => {
    for (;;) {
        const n = CODES[Math.floor(rng() * CODES.length)];
        const x = d(n);
        const sum = x[0] + x[1] + x[2];
        const bySum = ALL.filter((m) => { const y = d(m); return y[0] + y[1] + y[2] === sum; });
        if (bySum.length < 10) continue;   // the sum alone must not give it away
        const facts = shuffle(rng, FACTS.filter(([, t]) => t(x)));
        const relations = shuffle(rng, relationsOf(x));
        // One code if the clues can say so; otherwise two at most (either one opens the lock).
        for (const most of [1, 2]) {
            for (const [ft, f] of facts) {
                for (const [rt, r] of relations) {
                    if (bySum.filter((m) => { const y = d(m); return f(y) && r(y); }).length <= most) {
                        return { code: String(n), clues: [ft, `The sum of the digits is ${sum}.`, rt] };
                    }
                }
            }
        }
    }
};

/** A clue's words → a test of a code's digits, or null if they are not a clue the lock uses. */
const readLockClue = (text) => {
    const fact = FACTS.find(([t]) => t === text);
    if (fact) return fact[1];
    let m;
    if ((m = text.match(/^The sum of the digits is (\d+)\.$/))) { const s = Number(m[1]); return (y) => y[0] + y[1] + y[2] === s; }
    const at = (w) => POS.indexOf(w);
    if ((m = text.match(/^The (first|middle|last) digit is (twice|three times) the (first|middle|last) digit\.$/))) {
        const i = at(m[1]); const j = at(m[3]); const k = m[2] === 'twice' ? 2 : 3; return (y) => y[i] === k * y[j];
    }
    if ((m = text.match(/^The (first|middle|last) digit is (\d) more than the (first|middle|last) digit\.$/))) {
        const i = at(m[1]); const j = at(m[3]); const g = Number(m[2]); return (y) => y[i] - y[j] === g;
    }
    if (text === 'The last digit is the first digit plus the middle digit.') return (y) => y[2] === y[0] + y[1];
    return null;
};

/** The codes 000–999 a set of clues allows, as the student would dial them ("062"). */
const codesFitting = (clues) => {
    const tests = clues.map(readLockClue);
    if (tests.some((t) => !t)) return null;
    return ALL.filter((n) => tests.every((t) => t(d(n)))).map(pad);
};

module.exports = { lockCode, readLockClue, codesFitting };
