/**
 * The Group Brain questions and puzzles, checked by working each answer out
 * again here, for thousands of them: every question has four different
 * options and exactly one right one, every Sudoku exactly one solution.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const iq = require('../../src/competitions/games/banks/iq');
const sudoku = require('../../src/competitions/games/sudoku');

const rngOf = (seed) => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const LEVELS = ['easy', 'medium', 'hard'];

describe('Group Brain questions', () => {
    for (const set of ['PATTERNS', 'NUMBERS', 'WORDS_GAME', 'DEDUCTION', 'SPATIAL']) {
        test(`${set}: four different options, the first the right one`, () => {
            const rng = rngOf(42);
            for (let n = 0; n < 200; n += 1) {
                for (const maker of iq[set]) {
                    const q = maker(rng, LEVELS[n % 3]);
                    assert.equal(q.options.length, 4, `${maker.name}: ${q.prompt}`);
                    assert.equal(new Set(q.options).size, 4, `${maker.name}: ${q.options}`);
                    assert.equal(q.answer, 0);
                    assert.ok(q.prompt.length > 5);
                }
            }
        });
    }

    test('every answer, worked out again', () => {
        const rng = rngOf(7);
        const all = [...iq.PATTERNS, ...iq.NUMBERS, ...iq.WORDS_GAME, ...iq.DEDUCTION, ...iq.SPATIAL];
        let checked = 0;
        for (let n = 0; n < 300; n += 1) {
            for (const maker of all) {
                const q = maker(rng, LEVELS[n % 3]);
                const f = q.facts;
                const ans = q.options[0];
                if (!f) continue;
                checked += 1;
                if (f.kind === 'logic-grid') assert.equal(f.solutions, 1, 'a logic grid has exactly one answer');
                if (f.kind === 'operator') {
                    assert.equal(iq.apply(f.a, ans, f.b), f.c);
                    for (const o of q.options.slice(1)) assert.notEqual(iq.apply(f.a, o, f.b), f.c, 'only one sign fits');
                }
                if (f.kind === 'days') assert.equal(ans, iq.DAYS[(f.today + f.n) % 7]);
                if (f.kind === 'directions') assert.equal(ans, iq.COMPASS[(f.start + f.turns.reduce((a, b) => a + b, 0)) % 4]);
                if (f.kind === 'code') assert.equal(ans, iq.shift(f.asked, f.k));
                if (f.kind === 'ordering') assert.equal(ans, f.top ? f.people[0] : f.people[3]);
                if (f.kind === 'not-multiple') { assert.notEqual(Number(ans) % f.k, 0); for (const o of q.options.slice(1)) assert.equal(Number(o) % f.k, 0); }
                if (f.kind === 'not-square') { assert.ok(!Number.isInteger(Math.sqrt(Number(ans)))); for (const o of q.options.slice(1)) assert.ok(Number.isInteger(Math.sqrt(Number(o)))); }
                if (f.kind === 'missing-number') assert.equal(Number(ans), f.times ? f.rows[2][0] * f.rows[2][1] : f.rows[2][0] + f.rows[2][1]);
                if (f.kind === 'anagram') { assert.equal([...f.scrambled].sort().join(''), [...ans].sort().join('')); for (const o of q.options.slice(1)) assert.notEqual([...o].sort().join(''), [...ans].sort().join('')); }
                if (f.kind === 'rotation') assert.equal(ans, iq.draw(f.cw ? iq.rotateCW(f.g) : iq.rotateCW(iq.rotateCW(iq.rotateCW(f.g)))));
                if (f.kind === 'mirror') assert.equal(ans, iq.draw(f.sideways ? iq.flipLR(f.g) : iq.flipTB(f.g)));
                if (f.kind === 'fold') assert.equal(ans, iq.draw(f.holes.map((row) => row.map((v, c) => v || row[3 - c]))));
                if (f.kind === 'cube') {
                    const [a, b, c, d, e, g] = f.net;
                    const opposite = { [a]: g, [g]: a, [b]: d, [d]: b, [c]: e, [e]: c };
                    assert.equal(Number(ans), opposite[f.asked]);
                }
            }
        }
        assert.ok(checked > 5000);
    });

    test('Word Logic\'s written questions: four different options each', () => {
        for (const q of iq.WORD) assert.equal(new Set(q.options).size, 4, q.prompt);
        assert.equal(new Set(iq.ANAGRAMS.map((w) => [...w].sort().join(''))).size, iq.ANAGRAMS.length, 'no two anagram words share letters');
    });
});

describe('Sudoku Challenge', () => {
    test('every puzzle has one solution, a true Sudoku, matching its givens', () => {
        const rng = rngOf(3);
        for (const level of LEVELS) {
            for (let k = 0; k < 8; k += 1) {
                const s = sudoku.create([{ name: 'A', side: 0 }, { name: 'B', side: 1 }], { difficulty: level }, { now: 0, rng });
                assert.equal(sudoku.countSolutions([...s.puzzle], 3), 1);
                s.puzzle.forEach((v, i) => { if (v) assert.equal(v, s.solution[i]); });
                for (let r = 0; r < 9; r += 1) {
                    assert.equal(new Set(s.solution.slice(r * 9, r * 9 + 9)).size, 9);
                    assert.equal(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => s.solution[c * 9 + r])).size, 9);
                    const br = Math.floor(r / 3) * 3; const bc = (r % 3) * 3;
                    assert.equal(new Set([0, 1, 2].flatMap((y) => [0, 1, 2].map((x) => s.solution[(br + y) * 9 + bc + x]))).size, 9);
                }
                assert.equal(s.puzzle.filter(Boolean).length, { easy: 40, medium: 32, hard: 27 }[level]);
            }
        }
    });

    test('a wrong number is refused and counted; five close the board; hints fill a cell', () => {
        const rng = rngOf(9);
        let s = sudoku.create([{ name: 'A', side: 0 }, { name: 'B', side: 1 }], { difficulty: 'easy' }, { now: 0, rng });
        const empty = s.puzzle.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
        const wrong = (i) => (s.solution[i] % 9) + 1;
        for (let m = 0; m < sudoku.MAX_MISTAKES; m += 1) s = sudoku.act(s, 1, { type: 'place', cell: empty[0], digit: wrong(empty[0]) }, { now: 10, rng });
        assert.equal(s.boards[1][empty[0]], 0);
        assert.throws(() => sudoku.act(s, 1, { type: 'place', cell: empty[0], digit: s.solution[empty[0]] }, { now: 11, rng }), /closed/);
        assert.throws(() => sudoku.act(s, 0, { type: 'place', cell: s.puzzle.findIndex(Boolean), digit: 1 }, { now: 11, rng }), /part of the puzzle/);
        s = sudoku.act(s, 0, { type: 'hint' }, { now: 12, rng });
        assert.equal(s.hints[0], sudoku.HINTS - 1);
        assert.equal(s.boards[0].filter(Boolean).length, s.puzzle.filter(Boolean).length + 1);
        assert.equal(sudoku.view(s, 1, { now: 12 }).board.filter(Boolean).length, s.puzzle.filter(Boolean).length, 'B sees only their own board');
    });
});

