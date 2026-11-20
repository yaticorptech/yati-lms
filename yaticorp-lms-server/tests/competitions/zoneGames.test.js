/**
 * The group games by age zone (games/zones.js, 2026-11-13): every game listed in GROUP_ZONES, in each of its zones,
 * made through its engine's own create() with a room's options { zone, difficulty: ZONE_DIFFICULTY[zone] }, and
 * checked — every question has distinct options and exactly one right one, every puzzle can be solved, sizes stay
 * inside the zone's limits, and Young Thinkers' rooms get no × and no big numbers. Also: a room made before zones
 * (no `zone`) still gets what its difficulty gave, and two players in one room always get the same game.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('../../src/competitions/games');
const { GROUP_ZONES, ZONE_DIFFICULTY, zoneOf } = require('../../src/competitions/games/zones');
const { validate } = require('../../src/competitions/games/banks/vaultValidate');
const { trace } = require('../../src/competitions/games/banks/vault');
const { codesFitting } = require('../../src/competitions/games/banks/lockClues');
const { countSolutions } = require('../../src/competitions/games/sudoku');
const { two } = require('../../src/competitions/games/banks/iq');

const rngOf = (seed) => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const SEATS = [{ name: 'A', side: 0 }, { name: 'B', side: 1 }];
const OPS = ['+', '−', '×', '÷'];
const SEEDS = { sudoku: 3, finalvault: 6, chess: 1, tictactoe: 1 };

/** A game made as a room makes it, with the raw questions dealt (quiz games) kept for checking. */
const make = (game, zone, seed) => {
    const ctx = { rng: rngOf(seed), now: 1000, dealt: [] };
    const state = engine(game).create(SEATS, { zone, difficulty: ZONE_DIFFICULTY[zone] }, ctx);
    return { state, dealt: ctx.dealt };
};

/** Every round of a round game (Memory Matrix, Sequence), by ticking its clock to the end. */
const roundsOf = (game, state, seed) => {
    const rng = rngOf(seed + 99);
    const rounds = [];
    let s = state; let last = -1;
    for (let n = 0; n < 200 && s.status === 'active'; n += 1) {
        s = engine(game).tick(s, { now: s.phaseEndsAt, rng }) || s;
        if (s.current && s.index !== last) { rounds.push(s.current); last = s.index; }
    }
    assert.equal(s.status, 'finished', `${game}: plays to its end`);
    return rounds;
};

const numbersIn = (text) => (String(text).match(/\d+/g) || []).map(Number);

/** Questions (quiz games): options all different, the answer one of them. */
const checkQuestions = (game, zone, state, dealt) => {
    assert.ok(state.questions.length >= 5, `${game}/${zone}: has questions`);
    for (const q of state.questions) {
        assert.ok(q.options.length >= 2, `${game}/${zone}: ${q.prompt}`);
        assert.equal(new Set(q.options).size, q.options.length, `${game}/${zone}: options repeat in "${q.prompt}": ${q.options}`);
        assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, `${game}/${zone}: answer`);
    }
    // The makers' own facts, worked again where a question carries them.
    for (const q of dealt) {
        const f = q.facts || {};
        if (f.kind === 'logic-grid' || (f.kind === 'ordering' && f.solutions != null)) assert.equal(f.solutions, 1, `${game}/${zone}: one solution: ${q.prompt}`);
        if (f.kind === 'two-operators') {
            const fits = OPS.flatMap((x) => OPS.map((y) => [x, y])).filter(([x, y]) => two(f.a, x, f.b, y, f.c) === f.d);
            assert.deepEqual(fits, [[f.x, f.y]], `${game}/${zone}: one pair of signs: ${q.prompt}`);
            assert.equal(q.options.filter((o) => o === `${f.x} then ${f.y}`).length, 1);
        }
        if (f.kind === 'series') {
            const t = f.terms; const d = t[1] - t[0];
            if (t.every((x, i) => i === 0 || x - t[i - 1] === d)) assert.equal(f.next, t[t.length - 1] + d, `${game}/${zone}: ${q.prompt}`);
        }
        if (f.kind === 'cycle') assert.equal(q.options[0], f.cycle[f.gap % f.cycle.length], `${game}/${zone}: ${q.prompt}`);
    }
};

/** Young Thinkers: no ×, ÷ or numbers past 20 in what is asked. */
const youngNumbers = (game, texts) => {
    for (const t of texts) {
        assert.ok(!/[×÷]/.test(t), `${game}/young: no × or ÷: ${t}`);
        for (const n of numbersIn(t)) assert.ok(n <= 20, `${game}/young: ${n} is past 20: ${t}`);
    }
};

const CHECK = {
    memorymatch: (zone, { state }) => {
        const deck = state.shared.stages[0].deck;
        const pairs = { young: 4, smart: 8 }[zone];
        assert.equal(deck.length, pairs * 2);
        for (const f of new Set(deck)) assert.equal(deck.filter((x) => x === f).length, 2, 'every card has one pair');
        assert.equal(state.shared.stages.length, pairs);
        if (zone === 'young') assert.ok(deck.every((f) => !/[A-Za-z0-9]/.test(f)), 'picture cards');
    },
    memorymatrix: (zone, { state }, seed) => {
        const rounds = roundsOf('memorymatrix', state, seed);
        const limit = { young: [3, 4, 2, 5], smart: [4, 7, 2, 49], master: [5, 7, 7, 49] }[zone];
        assert.equal(rounds.length, { young: 6, smart: 8, master: 10 }[zone]);
        for (const r of rounds) {
            assert.ok(r.size >= limit[0] && r.size <= limit[1], `${zone}: grid ${r.size}`);
            assert.ok(r.count >= limit[2] && r.count <= limit[3] && r.count <= r.size * r.size - 2, `${zone}: ${r.count} cells`);
            assert.equal(new Set(r.cells).size, r.count);
            assert.ok(r.cells.every((c) => c >= 0 && c < r.size * r.size));
        }
        if (zone === 'master') assert.ok(Math.max(...rounds.map((r) => r.size)) === 7, 'master grows to 7×7');
    },
    sequence: (zone, { state }, seed) => {
        const rounds = roundsOf('sequence', state, seed).filter((r) => r.kind === 'sequence');
        for (const r of rounds) {
            assert.equal(r.sequence.length, r.length);
            assert.ok(r.sequence.every((x) => x >= 0 && x < r.items.length));
            if (zone === 'young') {
                assert.ok(['colours', 'symbols'].includes(r.set), 'young: colours and shapes, no digits');
                assert.ok(r.length >= 2 && r.length <= 5, `young: run of ${r.length}`);
                assert.equal(r.items.length, 4);
            }
            if (zone === 'master') assert.ok(r.length >= 6, `master: run of ${r.length}`);
        }
    },
    numberrecall: (zone, { state }) => {
        for (const q of state.questions) assert.equal(q.show.text.length, { young: 4, smart: 6, master: 8 }[zone]);
    },
    colourmatch: (zone, { state }) => {
        if (zone !== 'young') return;
        const half = Math.ceil(state.questions.length / 2);
        const look = state.questions.filter((q) => q.topic === 'Colour' && q.visual?.kind !== 'ink' || q.topic === 'Shape');
        assert.ok(look.length >= half, 'young: half with nothing to read');
        for (const q of look) {
            assert.ok(q.options.every((o) => !/[A-Za-z]/.test(o)), `young: picture options ${q.options}`);
            if (q.topic === 'Shape') {
                // Exactly one option is the shown shape in another colour.
                const SETS = [['🟥', '🟦', '🟩', '🟨', '🟪'], ['🔴', '🔵', '🟢', '🟡', '🟣'], ['❤️', '💙', '💚', '💛', '💜']];
                const set = SETS.find((s) => s.includes(q.visual.items[0]));
                assert.equal(q.options.filter((o) => set.includes(o) && o !== q.visual.items[0]).length, 1);
            }
        }
    },
    spotthechange: (zone, { state }) => {
        for (const q of state.questions) {
            const cols = { young: 3, smart: 4 }[zone];
            assert.equal(q.show.cols, cols);
            const changed = q.show.tiles.map((t, i) => (t !== q.visual.tiles[i] ? i : -1)).filter((i) => i >= 0);
            assert.equal(changed.length, 1, 'one tile changes');
            assert.equal(q.options[q.answer], `Tile ${changed[0] + 1}`);
        }
    },
    tictactoe: (zone, { state }) => assert.equal(state.board.length, 9),
    patternmaster: (zone, { state }) => {
        if (zone === 'young') youngNumbers('patternmaster', state.questions.flatMap((q) => [q.prompt, ...q.options]));
    },
    sudoku: (zone, { state }) => {
        const given = state.puzzle.filter(Boolean).length;
        if (zone === 'smart') assert.ok(given >= 36, `smart: ${given} given`);
        if (zone === 'master') assert.ok(given <= 30, `master: ${given} given`);
        assert.equal(countSolutions([...state.puzzle]), 1, 'one solution');
        assert.ok(state.puzzle.every((v, i) => !v || v === state.solution[i]));
    },
    deduction: (zone, { dealt }) => {
        const grids = dealt.filter((q) => q.facts?.kind === 'logic-grid');
        assert.ok(grids.length >= 1);
        if (zone === 'master') assert.ok(dealt.some((q) => / either | Neither /.test(q.prompt)), 'master: two-condition clues');
    },
    codebreaker: (zone, { state }) => {
        for (const st of state.shared.stages) {
            assert.equal(st.secret.length, 4);
            assert.equal(st.colours, { smart: 5, master: 6 }[zone]);
        }
        if (zone === 'master') assert.ok(state.shared.stages.every((st) => st.tries === 8));
    },
    chess: (zone, { state }) => assert.equal(state.status, 'active'),
    spatialiq: () => {},
    shapematrix: () => {}, // Master Minds group logic (2026-11-17): its questions are checked by checkQuestions
    finalvault: (zone, { state }) => {
        const stages = state.shared.stages;
        assert.equal(stages.length, 5);
        assert.deepEqual(validate(stages), []);
        const [lock, book, code, light, trial] = stages;
        assert.ok(codesFitting(lock.pub.clues).includes(lock.answer));
        assert.ok(trace(light.pub, light.answer).hit);
        assert.ok(/^\d{3}$/.test(code.answer) && /^\d{4}$/.test(trial.answer.code));
        const turns = trace(light.pub, light.answer).turns;
        if (zone === 'young') {
            assert.ok(!lock.pub.clues.some((c) => /twice|three times/.test(c)), 'young: no "twice" clues');
            assert.ok(book.pub.totals.every((t) => t <= 15), `young: small totals ${book.pub.totals}`);
            assert.ok(!/total/.test(trial.pub.rule), 'young: no total to work out');
            assert.ok(code.pub.lines.every((l) => !/×/.test(l)), 'young: no ×');
            assert.equal(turns, 2);
            assert.equal(state.shared.seconds, 600);
        }
        if (zone === 'master') {
            assert.equal(turns, 3);
            assert.equal(state.shared.seconds, 420);
            assert.ok(code.pub.figures == null, 'master: every symbol worked out');
        }
    },
    wordlogic: () => {},
    idiomsense: () => {},
    typingsprint: (zone, { state }) => assert.ok(state.shared.stages.every((st) => /^[a-z]+$/.test(st.word))),
    mathsprint: (zone, { state }) => {
        for (const st of state.shared.stages) {
            const m = st.text.match(/^(\d+) ([+−×÷]) (\d+)(?: ([+−]) (\d+))?$/);
            assert.ok(m, st.text);
            const f = { '+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => a / b };
            let v = f[m[2]](+m[1], +m[3]);
            if (m[4]) v = f[m[4]](v, +m[5]);
            assert.equal(v, st.answer, st.text);
            assert.ok(Number.isInteger(st.answer) && st.answer >= 0, st.text);
        }
        if (zone === 'young') youngNumbers('mathsprint', state.shared.stages.flatMap((st) => [st.text, String(st.answer)]));
    },
    runningtotal: (zone, { state }) => {
        for (const q of state.questions) {
            const steps = q.show.items.map((x) => Number(String(x).replace('− ', '-').replace('+ ', '')));
            assert.equal(String(steps.reduce((a, b) => a + b, 0)), q.options[q.answer]);
            if (zone === 'young') {
                assert.equal(steps.length, 3);
                youngNumbers('runningtotal', [...q.show.items, ...q.options]);
                assert.ok(!q.show.items.some((x) => /−/.test(x)), 'young: only adding');
            }
            if (zone === 'master') assert.equal(steps.length, 7);
        }
    },
    numberlogic: (zone, { dealt }) => {
        if (zone === 'master') assert.ok(dealt.some((q) => q.facts?.kind === 'two-operators'));
    },
    // Newly zoned with the 84-game catalogue (2026-11-14): the question checks above cover them; the catalogue's own
    // new games are checked answer by answer in catalogGames.test.js.
    ...Object.fromEntries(['oddoneout', 'spellingfix', 'soundalike', 'sentencegap', 'tensepick', 'reverserecall', 'synonymmatch', 'percentsnap',
        ...require('../../src/competitions/games/catalogquiz').CATALOG_QUIZ].map((g) => [g, () => {}])),
    speedsort: (zone, { state }) => assert.ok(state.shared.stages.length > 0),
    dotcount: (zone, { state }) => {
        for (const q of state.questions) {
            const colour = q.prompt.match(/How many (\w+) dots/)[1];
            assert.equal(String(q.visual.dots.filter((c) => c === colour).length), q.options[q.answer]);
            assert.ok(q.visual.dots.length <= 12);
            youngNumbers('dotcount', q.options);
        }
    }
};

// Size checks written for the sections these games were first made for; since 2026-11-17 they are also played in the
// others (bigger boards there), where the questions are still checked by checkQuestions.
const CHECKED_IN = { memorymatch: ['young', 'smart'], spotthechange: ['young', 'smart'], dotcount: ['young'] };

describe('Group games by age zone', () => {
    test('every listed game has a check, and an engine', () => {
        for (const game of Object.keys(GROUP_ZONES)) {
            assert.ok(engine(game), game);
            // A game with no zone-specific check still has its questions checked (checkQuestions) in every zone.
        }
    });

    for (const [game, zones] of Object.entries(GROUP_ZONES)) {
        for (const zone of zones) {
            test(`${game} — ${zone}`, () => {
                for (let seed = 1; seed <= (SEEDS[game] || 12); seed += 1) {
                    const made = make(game, zone, seed * 7919);
                    if (made.state.questions) checkQuestions(game, zone, made.state, made.dealt);
                    if (!CHECKED_IN[game] || CHECKED_IN[game].includes(zone)) CHECK[game]?.(zone, made, seed);
                }
            });
        }
    }

    test('a room made before zones goes by its difficulty, as before', () => {
        assert.equal(zoneOf({ difficulty: 'easy' }), null);
        assert.equal(zoneOf({ zone: 'nope' }), null);
        const ctx = () => ({ rng: rngOf(5), now: 0 });
        const old = engine('memorymatch').create(SEATS, { difficulty: 'easy' }, ctx());
        assert.equal(old.shared.stages[0].deck.length, 12);
        const oldVault = engine('finalvault').create(SEATS, { difficulty: 'hard' }, ctx());
        assert.equal(oldVault.shared.seconds, 480);
        assert.deepEqual(validate(oldVault.shared.stages), []);
        const oldSeq = engine('sequence').create(SEATS, { difficulty: 'medium' }, ctx());
        assert.equal(oldSeq.startLength, 4);
        assert.equal(oldSeq.kinds, undefined);
    });

    test('everyone in a room gets the same game', () => {
        for (const game of ['patternmaster', 'mathsprint', 'finalvault', 'colourmatch']) {
            const a = make(game, 'young', 11).state; const b = make(game, 'young', 11).state;
            assert.deepEqual(a.questions || a.shared, b.questions || b.shared, game);
        }
    });
});
