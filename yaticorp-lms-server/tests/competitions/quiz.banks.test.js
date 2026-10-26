/**
 * The brain games' questions are right. Every bank question has a sound
 * shape; every Code Clash snippet marked `run` is actually run, and what it
 * prints must be the option marked right; every question made fresh is
 * worked out again here, independently of the code that made it.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const RAPID = require('../../src/competitions/games/banks/rapidfire');
const CODE = require('../../src/competitions/games/banks/code');
const { PUZZLES, MATHS, make, isPrime } = require('../../src/competitions/games/banks/generate');

function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const wellFormed = (q, where) => {
    assert.equal(typeof q.prompt, 'string', `${where}: prompt`);
    assert.ok(q.prompt.trim().length > 3, `${where}: prompt is empty`);
    assert.ok(Array.isArray(q.options) && q.options.length === 4, `${where}: needs four options`);
    for (const o of q.options) assert.ok(String(o).trim().length > 0, `${where}: an empty option`);
    assert.equal(new Set(q.options.map((o) => String(o).trim().toLowerCase())).size, 4, `${where}: two options are the same`);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, `${where}: answer index`);
};

describe('the written banks', () => {
    for (const [name, bank, least] of [['rapid fire', RAPID, 30], ['code', CODE, 15]]) {
        test(`${name}: every question is well formed, with a unique id`, () => {
            assert.ok(bank.length >= least, `${name} needs at least ${least} questions for its longest game`);
            const ids = new Set();
            for (const q of bank) {
                assert.ok(q.id && !ids.has(q.id), `duplicate or missing id ${q.id}`);
                ids.add(q.id);
                wellFormed(q, q.id);
            }
            assert.equal(new Set(bank.map((q) => q.prompt + (q.code || ''))).size, bank.length, `${name}: a question is repeated`);
        });
    }

});

describe('Code Clash: the code really prints the right option', () => {
    for (const q of CODE.filter((c) => c.run === 'js')) {
        test(`${q.id} (JavaScript)`, () => {
            const lines = [];
            const show = (v) => (typeof v === 'string' ? v : String(v));
            vm.runInNewContext(q.code, { console: { log: (...a) => lines.push(a.map(show).join(' ')) } }, { timeout: 1000 });
            assert.equal(lines.join('\n'), q.options[q.answer]);
        });
    }

    let python = null;
    try { python = execFileSync('python3', ['--version']).toString() ? 'python3' : null; } catch { python = null; }
    for (const q of CODE.filter((c) => c.run === 'python')) {
        test(`${q.id} (Python)`, { skip: python ? false : 'python3 is not installed here' }, () => {
            const out = execFileSync(python, ['-I', '-c', q.code], { timeout: 5000 }).toString().trimEnd();
            assert.equal(out, q.options[q.answer]);
        });
    }

    test('the binary search in "bug-binary-mid" really hangs, and the fix works', () => {
        const q = CODE.find((c) => c.id === 'bug-binary-mid');
        const run = (code) => vm.runInNewContext(`${code}\nfind([1, 3, 5, 7], 7);`, {}, { timeout: 200 });
        assert.throws(() => run(q.code), /timed out/);
        assert.equal(run(q.code.replace('lo = mid;', 'lo = mid + 1;')), 3);
    });

    test('the sum in "bug-sum-start" really skips the first number', () => {
        const q = CODE.find((c) => c.id === 'bug-sum-start');
        assert.equal(vm.runInNewContext(`${q.code}\nsum([5, 1, 2]);`), 3);
    });
});

describe('questions made fresh are right', () => {
    const solve = (f) => {
        switch (f.kind) {
            case 'add': return f.a + f.b;
            case 'subtract': return f.a - f.b;
            case 'multiply': return f.a * f.b;
            case 'square': return f.n * f.n;
            case 'percent': return (f.p * f.n) / 100;
            case 'equation': return (f.c - f.b) / f.a;
            case 'ages': return (f.sum - f.gap - 2 * f.y) / 2;
            case 'speed': return f.d / f.t;
            case 'clock': {
                const hour = (f.h % 12) * 30 + f.m / 2;
                const minute = f.m * 6;
                const d = Math.abs(hour - minute);
                return Math.min(d, 360 - d);
            }
            default: return undefined;
        }
    };

    test('ten thousand of them, each solved again here', () => {
        const rng = mulberry32(2026);
        const kinds = new Set();
        for (let round = 0; round < 500; round += 1) {
            for (const q of [...make(PUZZLES, 13, rng), ...make(MATHS, 7, rng)]) {
                wellFormed(q, q.prompt);
                assert.equal(q.answer, 0);
                const f = q.facts;
                kinds.add(f.kind);
                const right = q.options[0];
                if (f.kind === 'series') {
                    // The rule the terms follow, found from the terms alone.
                    const t = f.terms;
                    const d = t.slice(1).map((x, i) => x - t[i]);
                    let next;
                    if (d.every((x) => x === d[0])) next = t[t.length - 1] + d[0];
                    else if (t.slice(2).every((x, i) => x === t[i] + t[i + 1])) next = t[t.length - 1] + t[t.length - 2];
                    else if (t.every((x) => x > 0) && t.slice(1).every((x, i) => x / t[i] === t[1] / t[0])) next = t[t.length - 1] * (t[1] / t[0]);
                    else if (t.every((x) => Number.isInteger(Math.sqrt(x))) && d.slice(1).every((x, i) => x - d[i] === 2)) next = (Math.sqrt(t[t.length - 1]) + 1) ** 2;
                    else if (d.every((x, i) => x === d[i % 2])) next = t[t.length - 1] + d[d.length % 2];
                    assert.notEqual(next, undefined, `no rule found for ${t.join(', ')}`);
                    assert.equal(right, String(next), q.prompt);
                } else if (f.kind === 'letters') {
                    const codes = f.terms.map((c) => c.charCodeAt(0));
                    const step = codes[1] - codes[0];
                    assert.ok(codes.every((c, i) => i === 0 || c - codes[i - 1] === step));
                    assert.equal(right, String.fromCharCode(codes[codes.length - 1] + step), q.prompt);
                } else if (f.kind === 'not-prime') {
                    const flags = q.options.map((o) => isPrime(Number(o)));
                    assert.deepEqual(flags, [false, true, true, true], q.prompt);
                } else {
                    const value = solve(f);
                    assert.notEqual(value, undefined, `unknown kind ${f.kind}`);
                    assert.ok(Number.isFinite(value) && value >= 0, q.prompt);
                    assert.equal(parseFloat(right), value, q.prompt);
                    // None of the wrong options is secretly right too.
                    for (const o of q.options.slice(1)) assert.notEqual(parseFloat(o), value, `${q.prompt}: ${o}`);
                }
            }
        }
        for (const k of ['add', 'subtract', 'multiply', 'square', 'percent', 'series', 'letters', 'equation', 'not-prime', 'clock', 'ages', 'speed']) {
            assert.ok(kinds.has(k), `never made a ${k} question`);
        }
    });

    test('a game never asks the same thing twice', () => {
        const rng = mulberry32(7);
        for (let round = 0; round < 200; round += 1) {
            const qs = make(PUZZLES, 20, rng);
            assert.equal(qs.length, 20);
            assert.equal(new Set(qs.map((q) => q.prompt + q.options.slice().sort().join('|'))).size, 20);
        }
    });
});
