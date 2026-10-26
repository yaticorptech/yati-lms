/**
 * The brain games' engine on its own (games/quizCore.js, through Rapid Fire,
 * Code Clash and Brain Sprint): no database, no clock of its own.
 * Time is passed in; questions come from a seeded rng.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const rapidfire = require('../../src/competitions/games/rapidfire');
const codeclash = require('../../src/competitions/games/codeclash');
const brainsprint = require('../../src/competitions/games/brainsprint');
const { READY_MS } = require('../../src/competitions/games/quizCore');
const { GameError } = require('../../src/competitions/games/contract');
const games = require('../../src/competitions/games');

function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const T0 = 1_000_000;
const at = (now, seed = 1) => ({ now, rng: mulberry32(seed) });
const players = (n) => Array.from({ length: n }, (_, i) => ({ userId: `u${i}`, name: `P${i + 1}`, side: i }));

/** act(), checking the input was left alone. */
const play = (engine, state, seat, action, now) => {
    const before = JSON.stringify(state);
    const next = engine.act(state, seat, action, at(now));
    assert.equal(JSON.stringify(state), before, 'act() changed its input');
    return next;
};
/** A game past its countdown, on question 1, opened at T0 + READY_MS. */
const started = (engine, n = 2, options = {}) => {
    const s = engine.create(players(n), options, at(T0));
    const open = engine.tick(s, at(T0 + READY_MS));
    assert.equal(open.phase, 'question');
    return open;
};
const right = (s) => s.questions[s.index].answer;
const wrong = (s) => (right(s) + 1) % s.questions[s.index].options.length;

describe('setting up', () => {
    test('all four are offered, chess stays, and Ludo and Carrom are retired', () => {
        assert.deepEqual(games.IDS, ['chess', 'rapidfire', 'codeclash', 'brainsprint']);
        for (const id of ['ludo', 'carrom', 'uno']) {
            assert.ok(games.RETIRED.includes(id));
            assert.ok(games.engine(id), `${id} games saved earlier must still load`);
        }
        const ids = games.catalogue().map((g) => g.id);
        assert.ok(!ids.includes('ludo') && !ids.includes('carrom'));
    });

    test('options are clamped, and there is a countdown before question 1', () => {
        const s = brainsprint.create(players(3), { questionCount: 500, questionSeconds: 1 }, at(T0));
        assert.equal(s.questions.length, 20);
        assert.equal(s.questionMs, 10_000);
        assert.equal(s.phase, 'ready');
        assert.equal(brainsprint.deadline(s), T0 + READY_MS);
        assert.equal(brainsprint.tick(s, at(T0 + READY_MS - 1)), null);
        const defaults = codeclash.create(players(2), {}, at(T0));
        assert.equal(defaults.questions.length, 8);
        assert.equal(defaults.questionMs, 45_000);
    });

    test('2 to 4 players', () => {
        assert.throws(() => brainsprint.create(players(1), {}, at(T0)), GameError);
        assert.throws(() => brainsprint.create(players(5), {}, at(T0)), GameError);
    });

    test('the right answer stays with its option when the options are shuffled', () => {
        const BANK = require('../../src/competitions/games/banks/code');
        for (let seed = 1; seed < 40; seed += 1) {
            const s = codeclash.create(players(2), { questionCount: 15 }, at(T0, seed));
            for (const q of s.questions) {
                const source = BANK.find((b) => b.prompt === q.prompt && (b.code || null) === q.code);
                assert.equal(q.options[q.answer], source.options[source.answer]);
            }
        }
    });
});

describe('what a player may see', () => {
    test('the answer is never sent while the question is open', () => {
        const s = started(brainsprint, 2);
        for (const seat of [0, 1, null]) {
            const v = brainsprint.view(s, seat, at(T0 + READY_MS));
            assert.equal(v.answer, null);
            assert.equal(v.recap, null);
            assert.ok(!JSON.stringify(v).includes('"explain"'));
        }
        const v = brainsprint.view(s, 0, at(T0 + READY_MS));
        assert.equal(v.canAnswer, true);
        assert.equal(v.question.options.length, 4);
        for (const k of ['game', 'status', 'you', 'turn', 'deadline', 'seats', 'message', 'outcome']) assert.ok(k in v, k);
    });

    test('others see that you answered, not what', () => {
        let s = started(brainsprint, 3);
        s = play(brainsprint, s, 0, { type: 'answer', choice: wrong(s) }, T0 + READY_MS + 1000);
        const theirs = brainsprint.view(s, 1, at(T0 + READY_MS + 1000));
        assert.deepEqual(theirs.answers[0], { answered: true });
        const mine = brainsprint.view(s, 0, at(T0 + READY_MS + 1000));
        assert.equal(mine.answers[0].choice, wrong(s));
        assert.equal(mine.canAnswer, false);
        assert.equal(mine.answer, null, 'even after answering, the right one waits for the reveal');
    });
});

describe('scoring when all answer at once (Brain Sprint, Code Clash)', () => {
    test('right and fast scores more than right and slow; wrong scores nothing', () => {
        let s = started(brainsprint, 3, { questionSeconds: 20 });
        const open = T0 + READY_MS;
        s = play(brainsprint, s, 0, { type: 'answer', choice: right(s) }, open);             // instantly
        s = play(brainsprint, s, 1, { type: 'answer', choice: right(s) }, open + 10_000);    // half the time
        assert.equal(s.phase, 'question', 'still waiting for the third player');
        s = play(brainsprint, s, 2, { type: 'answer', choice: wrong(s) }, open + 12_000);
        assert.equal(s.phase, 'reveal', 'everyone answered: the answer shows at once');
        assert.deepEqual(s.scores, [150, 125, 0]);
        const v = brainsprint.view(s, 2, at(open + 12_000));
        assert.equal(v.answer.index, s.questions[0].answer);
        assert.equal(v.answers[0].correct, true);
    });

    test('one answer each; nothing after time is up; not before the question opens', () => {
        const fresh = brainsprint.create(players(2), {}, at(T0));
        assert.throws(() => play(brainsprint, fresh, 0, { type: 'answer', choice: 0 }, T0 + 1), /not opened/);
        let s = started(brainsprint, 2, { questionSeconds: 10 });
        const open = T0 + READY_MS;
        s = play(brainsprint, s, 0, { type: 'answer', choice: 0 }, open + 1);
        assert.throws(() => play(brainsprint, s, 0, { type: 'answer', choice: 1 }, open + 2), /already answered/);
        assert.throws(() => play(brainsprint, s, 1, { type: 'answer', choice: 0 }, open + 10_000), /Time is up/);
        assert.throws(() => play(brainsprint, s, 1, { type: 'answer', choice: 9 }, open + 5), /Choose one/);
        assert.throws(() => play(brainsprint, s, 1, { type: 'dance' }, open + 5), GameError);
    });

    test('a question nobody finishes closes on time, then the next opens', () => {
        let s = started(brainsprint, 2, { questionSeconds: 10 });
        const open = T0 + READY_MS;
        assert.equal(brainsprint.deadline(s), open + 10_000);
        s = brainsprint.tick(s, at(open + 10_000));
        assert.equal(s.phase, 'reveal');
        s = brainsprint.tick(s, at(brainsprint.deadline(s)));
        assert.equal(s.phase, 'question');
        assert.equal(s.index, 1);
    });

    test('ties on points go to the faster player; equal on both is a draw', () => {
        // Both right on every question, A always faster.
        const run = (engine, gapA, gapB) => {
            let s = started(engine, 2, { questionCount: 5, questionSeconds: 20 });
            while (s.status === 'active') {
                if (s.phase === 'question') {
                    s = play(engine, s, 0, { type: 'answer', choice: right(s) }, s.phaseStartedAt + gapA);
                    s = play(engine, s, 1, { type: 'answer', choice: right(s) }, s.phaseStartedAt + gapB);
                } else s = engine.tick(s, at(engine.deadline(s)));
            }
            return engine.outcome(s);
        };
        assert.deepEqual(run(brainsprint, 500, 500).places, [[0, 1]]);
        // 150 points each when both answer within 0.1 s of the opening, so
        // only the time on right answers can separate them.
        const close = run(brainsprint, 10, 30);
        assert.deepEqual(close.places, [[0], [1]]);
        assert.match(run(brainsprint, 6000, 2000).reason, /Most points/);
        assert.deepEqual(run(brainsprint, 6000, 2000).places, [[1], [0]]);
    });
});

describe('Rapid Fire scoring (answers hidden until the end)', () => {
    test('everyone answers once; nothing says right or wrong, and no scores, while it runs', () => {
        let s = started(rapidfire, 3);
        const open = T0 + READY_MS;
        s = play(rapidfire, s, 1, { type: 'answer', choice: right(s) }, open + 900);
        assert.equal(s.phase, 'question', 'a right answer does not close the question');
        s = play(rapidfire, s, 0, { type: 'answer', choice: wrong(s) }, open + 950);
        assert.throws(() => play(rapidfire, s, 0, { type: 'answer', choice: right(s) }, open + 960), /already answered/);
        for (const seat of [0, 1, 2]) {
            const seen = rapidfire.view(s, seat, at(open + 960));
            assert.equal(seen.answer, null);
            assert.equal(seen.scores, null);
            assert.equal(seen.correct, null);
            assert.ok(seen.answers.every((x) => !x || !('correct' in x) && !('points' in x)), 'no seat is told right or wrong');
        }
        assert.deepEqual(rapidfire.view(s, 0, at(open + 960)).answers[0], { choice: wrong(s) }, 'your own choice only');
        assert.doesNotMatch(s.message, /right|wrong/i);
    });

    test('once everyone has answered the next question opens at once, with no reveal', () => {
        let s = started(rapidfire, 2);
        const open = T0 + READY_MS;
        s = play(rapidfire, s, 0, { type: 'answer', choice: wrong(s) }, open + 100);
        s = play(rapidfire, s, 1, { type: 'answer', choice: right(s) }, open + 200);
        assert.equal(s.phase, 'question');
        assert.equal(s.index, 1);
        assert.deepEqual(s.scores, [-5, 10]);
    });

    test('time up: straight on to the next question; the answers and scores show once it is over', () => {
        let s = started(rapidfire, 2, { questionCount: 10 });
        for (let n = 0; n < 10; n += 1) {
            const t = rapidfire.tick(s, at(s.phaseEndsAt));
            assert.notEqual(t.phase, 'reveal');
            s = t;
        }
        assert.equal(s.status, 'finished');
        const seen = rapidfire.view(s, 0, at(s.finishedAt));
        assert.deepEqual(seen.scores, [0, 0]);
        assert.equal(seen.recap.length, 10);
        assert.ok(seen.recap.every((q) => Number.isInteger(q.answer)));
    });
});

describe('resigning', () => {
    test('two players: the other wins at once', () => {
        let s = started(codeclash, 2);
        s = play(codeclash, s, 0, { type: 'resign' }, T0 + READY_MS + 5);
        assert.equal(s.status, 'finished');
        assert.deepEqual(codeclash.outcome(s), { places: [[1], [0]], reason: 'The other side resigned' });
        assert.equal(codeclash.deadline(s), null);
    });

    test('four players: the game goes on, and the ones who left place last, latest highest', () => {
        let s = started(brainsprint, 4, { questionCount: 5 });
        const open = T0 + READY_MS;
        s = play(brainsprint, s, 3, { type: 'resign' }, open + 1);
        s = play(brainsprint, s, 1, { type: 'resign' }, open + 2);
        assert.equal(s.status, 'active');
        assert.throws(() => play(brainsprint, s, 1, { type: 'answer', choice: 0 }, open + 3), /left this game/);
        s = play(brainsprint, s, 0, { type: 'answer', choice: right(s) }, open + 1000);
        s = play(brainsprint, s, 2, { type: 'answer', choice: wrong(s) }, open + 2000);
        assert.equal(s.phase, 'reveal', 'only the players still in are waited for');
        while (s.status === 'active') s = brainsprint.tick(s, at(brainsprint.deadline(s)));
        assert.deepEqual(brainsprint.outcome(s).places, [[0], [2], [1], [3]]);
    });
});

describe('whole games', () => {
    test('every brain game, played at random to the end, survives JSON at every step', () => {
        for (const engine of [rapidfire, codeclash, brainsprint]) {
            for (let seed = 1; seed <= 25; seed += 1) {
                const rng = mulberry32(seed);
                const n = 2 + (seed % 3);
                let s = engine.create(players(n), {}, at(T0, seed));
                let now = T0;
                for (let steps = 0; s.status === 'active'; steps += 1) {
                    assert.ok(steps < 2000, 'the game never ended');
                    s = JSON.parse(JSON.stringify(s));
                    const seat = Math.floor(rng() * n);
                    const v = engine.view(s, seat, at(now));
                    if (v.canAnswer && rng() < 0.7) {
                        now = Math.min(now + Math.floor(rng() * 3000), engine.deadline(s) - 1);
                        s = engine.act(s, seat, { type: 'answer', choice: Math.floor(rng() * 4) }, at(now));
                    } else if (rng() < 0.01 && !s.out.includes(seat)) {
                        s = engine.act(s, seat, { type: 'resign' }, at(now));
                    } else {
                        now = engine.deadline(s);
                        s = engine.tick(s, at(now)) || s;
                    }
                }
                const out = engine.outcome(s);
                assert.deepEqual(out.places.flat().sort(), [...Array(n).keys()], 'every side placed exactly once');
                const v = engine.view(s, null, at(now));
                assert.equal(v.recap.length, s.questions.length);
                assert.equal(v.deadline, null);
            }
        }
    });
});
