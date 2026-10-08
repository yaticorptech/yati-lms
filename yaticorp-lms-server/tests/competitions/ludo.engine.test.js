/**
 * The Ludo engine on its own: no database, no clock, no randomness of its own.
 * Dice come from a scripted rng (each call hands out the next chosen value) or
 * from a seeded one for whole games played out at random.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const ludo = require('../../src/competitions/games/ludo');
const { GameError } = require('../../src/competitions/games/contract');

const NOW = 1_000_000;
/** An rng that rolls exactly these dice, in order, and fails loudly if asked for more. */
const dice = (...values) => {
    let i = 0;
    return () => {
        if (i >= values.length) throw new Error(`the test only scripted ${values.length} roll(s)`);
        return (values[i++] - 1) / 6 + 0.01;
    };
};
const at = (now, ...rolls) => ({ now, rng: dice(...rolls) });
const ctx = (...rolls) => at(NOW, ...rolls);

function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const players = (n) => Array.from({ length: n }, (_, i) => ({ userId: `user-${i}-secret`, name: `Player ${i + 1}`, side: i }));
const fresh = (n = 2, options = {}) => ludo.create(players(n), options, ctx());
/** A game with tokens placed by hand: tokens[seat] = steps per token. */
const placed = (n, tokens, extra = {}) => Object.assign(fresh(n), { tokens }, extra);
/** act(), checking on the way that the input was left alone. */
const play = (state, seat, action, c) => {
    const before = JSON.stringify(state);
    const next = ludo.act(state, seat, action, c);
    assert.equal(JSON.stringify(state), before, 'act() must not change the state it was given');
    return next;
};
const throwsGame = (fn, re) => assert.throws(fn, (e) => e instanceof GameError && e.status === 400 && re.test(e.message));

describe('ludo: setting up', () => {
    test('the engine says what it is', () => {
        assert.equal(ludo.id, 'ludo');
        assert.equal(ludo.emoji, '🎲');
        assert.equal(ludo.minSeats, 2);
        assert.equal(ludo.maxSeats, 4);
        assert.deepEqual(ludo.seatsPerSide, { min: 1, max: 1 });
        for (const fn of ['create', 'view', 'act', 'tick', 'deadline', 'outcome']) assert.equal(typeof ludo[fn], 'function');
    });

    test('two players sit opposite as Red and Yellow; three are Red, Green, Yellow; four use every colour', () => {
        const labels = (n) => ludo.view(fresh(n), 0).seats.map((s) => s.label);
        assert.deepEqual(labels(2), ['Red', 'Yellow']);
        assert.deepEqual(labels(3), ['Red', 'Green', 'Yellow']);
        assert.deepEqual(labels(4), ['Red', 'Green', 'Yellow', 'Blue']);
        const v = ludo.view(fresh(2), 0);
        assert.deepEqual(v.colorIndex, [0, 2]);
        for (const s of v.seats) assert.match(s.color, /^#[0-9a-f]{6}$/i);
        // Yellow's first token comes out on Yellow's start square, top right.
        let s = placed(2, [[5, -1, -1, -1], [-1, -1, -1, -1]], { turn: 1 });
        s = play(play(s, 1, { type: 'roll' }, ctx(6)), 1, { type: 'move', token: 0 }, ctx());
        assert.deepEqual(ludo.view(s, 1).tokens[1][0], { steps: 0, cell: [1, 8] });
    });

    test('one or five players are refused', () => {
        throwsGame(() => ludo.create(players(1), {}, ctx()), /2 to 4/);
        throwsGame(() => ludo.create(players(5), {}, ctx()), /2 to 4/);
    });

    test('options: tokens per player 2–4 (default 4), turn seconds 10–120 (default 30)', () => {
        assert.equal(fresh(2).tokens[0].length, 4);
        assert.equal(fresh(2, { tokensPerPlayer: 2 }).tokens[1].length, 2);
        assert.equal(fresh(2, { tokensPerPlayer: 9 }).tokensPerPlayer, 4);
        assert.equal(fresh(2, { tokensPerPlayer: 1 }).tokensPerPlayer, 2);
        assert.equal(fresh(2).turnSeconds, 30);
        assert.equal(fresh(2, { turnSeconds: 3 }).turnSeconds, 10);
        assert.equal(fresh(2, { turnSeconds: 999 }).turnSeconds, 120);
        assert.equal(fresh(2, { turnSeconds: 'soon' }).turnSeconds, 30);
        assert.equal(ludo.deadline(fresh(2)), NOW + 30_000);
        assert.equal(ludo.deadline(fresh(2, { turnSeconds: 45 })), NOW + 45_000);
    });
});

describe('ludo: rolling and moving', () => {
    test('a token needs a 6 to leave the yard; without one the turn passes on its own', () => {
        let s = fresh(2);
        s = play(s, 0, { type: 'roll' }, ctx(4));
        assert.equal(s.turn, 1, 'no token could move, so Yellow is up');
        assert.equal(s.rolled, false);
        assert.equal(s.dice, 4, 'the roll is still shown');
        assert.equal(s.diceBy, 0);
        assert.match(s.message, /Red rolled a 4 and cannot move/);
        assert.deepEqual(s.tokens[0], [-1, -1, -1, -1]);

        s = play(s, 1, { type: 'roll' }, ctx(6));
        assert.equal(s.turn, 1);
        assert.equal(s.rolled, true);
        assert.deepEqual(ludo.view(s, 1).movable, [0, 1, 2, 3], 'any yard token may come out on a 6');
    });

    test('a 6 brings a token out onto its start square and gives another roll', () => {
        let s = play(fresh(2), 0, { type: 'roll' }, ctx(6));
        s = play(s, 0, { type: 'move', token: 2 }, ctx());
        assert.deepEqual(s.tokens[0], [-1, -1, 0, -1]);
        assert.deepEqual(ludo.view(s, 0).tokens[0][2].cell, [13, 6], 'Red\'s start square');
        assert.equal(s.turn, 0, 'Red goes again');
        assert.equal(s.rolled, false);
        assert.match(s.message, /goes again/);

        s = play(s, 0, { type: 'roll' }, ctx(6));
        s = play(s, 0, { type: 'move', token: 2 }, ctx());
        assert.equal(s.message, 'Red rolled a 6 and goes again');
        assert.equal(s.turn, 0);
        assert.equal(s.sixesInRow, 2);

        s = play(s, 0, { type: 'roll' }, ctx(3));
        s = play(s, 0, { type: 'move', token: 2 }, ctx());
        assert.equal(s.tokens[0][2], 9);
        assert.equal(s.turn, 1, 'a 3 ends the turn');
        assert.equal(s.message, 'Red moved 3');
    });

    test('three 6s in a row: the third is forfeited and the turn passes', () => {
        let s = fresh(2);
        s = play(play(s, 0, { type: 'roll' }, ctx(6)), 0, { type: 'move', token: 0 }, ctx());
        s = play(play(s, 0, { type: 'roll' }, ctx(6)), 0, { type: 'move', token: 0 }, ctx());
        assert.equal(s.tokens[0][0], 6);
        s = play(s, 0, { type: 'roll' }, ctx(6));
        assert.equal(s.turn, 1);
        assert.equal(s.rolled, false);
        assert.equal(s.sixesInRow, 0, 'the count starts again for Yellow');
        assert.equal(s.tokens[0][0], 6, 'the third 6 is never played');
        assert.match(s.message, /third 6/);
    });

    test('a 6 after a capture\'s bonus roll starts the count again', () => {
        // Red has already rolled one 6 this turn, then captures with a 3, then rolls 6 and 6:
        // only two in a row since the 3, so it is still Red's go.
        let s = placed(2, [[25, -1, -1, -1], [2, -1, -1, -1]], { sixesInRow: 1 });
        s = play(play(s, 0, { type: 'roll' }, ctx(3)), 0, { type: 'move', token: 0 }, ctx());
        assert.equal(s.turn, 0);
        s = play(play(s, 0, { type: 'roll' }, ctx(6)), 0, { type: 'move', token: 0 }, ctx());
        s = play(s, 0, { type: 'roll' }, ctx(6));
        assert.equal(s.turn, 0, 'two 6s since the 3');
        assert.equal(s.rolled, true);
    });

    test('landing on a lone opponent sends it back to its yard and gives another roll', () => {
        // Red at 25 is two squares behind Yellow's token at Yellow-step 2 (track square 28).
        let s = placed(2, [[25, -1, -1, -1], [2, 10, -1, -1]]);
        s = play(s, 0, { type: 'roll' }, ctx(3));
        s = play(s, 0, { type: 'move', token: 0 }, ctx());
        assert.deepEqual(s.tokens[1], [-1, 10, -1, -1], 'Yellow\'s token is back in its yard');
        assert.equal(s.tokens[0][0], 28);
        assert.equal(s.turn, 0, 'a capture earns another roll, even on a 3');
        assert.equal(s.rolled, false);
        assert.equal(s.message, 'Red captured Yellow\'s token and goes again');
        assert.deepEqual(s.lastMove, { seat: 0, token: 0, from: 25, to: 28, captured: [{ seat: 1, token: 0 }] });
        assert.deepEqual(ludo.view(s, 0).tokens[1][0].cell, [1, 10], 'drawn back in Yellow\'s yard, top right');
    });

    test('safe squares: no capture on a star or a start square, and tokens share them', () => {
        // Yellow-step 8 is track square 34, a star. Red reaches it from 31 with a 3.
        let s = placed(2, [[31, -1, -1, -1], [8, -1, -1, -1]]);
        s = play(play(s, 0, { type: 'roll' }, ctx(3)), 0, { type: 'move', token: 0 }, ctx());
        assert.deepEqual(s.tokens[1], [8, -1, -1, -1], 'nobody is sent home on a star');
        assert.equal(s.turn, 1, 'and no bonus roll');
        const v = ludo.view(s, null);
        assert.deepEqual(v.tokens[0][0].cell, v.tokens[1][0].cell, 'both on the same square');
        assert.ok(v.safe.some((c) => c[0] === v.tokens[0][0].cell[0] && c[1] === v.tokens[0][0].cell[1]));
        assert.equal(v.safe.length, 8);

        // Red sits on Yellow's start square (track 26); Yellow brings a token out onto it.
        s = placed(2, [[26, -1, -1, -1], [-1, -1, -1, -1]], { turn: 1 });
        s = play(play(s, 1, { type: 'roll' }, ctx(6)), 1, { type: 'move', token: 0 }, ctx());
        assert.equal(s.tokens[0][0], 26, 'a start square is safe too');
        assert.equal(s.tokens[1][0], 0);
    });

    test('two tokens of one colour on a square are not captured', () => {
        let s = placed(2, [[25, -1, -1, -1], [2, 2, -1, -1]]);
        s = play(play(s, 0, { type: 'roll' }, ctx(3)), 0, { type: 'move', token: 0 }, ctx());
        assert.deepEqual(s.tokens[1], [2, 2, -1, -1]);
        assert.equal(s.turn, 1);
    });

    test('a token needs the exact roll to get home; overshooting is not a move', () => {
        let s = placed(2, [[53, -1, -1, -1], [-1, -1, -1, -1]]);
        s = play(s, 0, { type: 'roll' }, ctx(5));
        assert.equal(s.turn, 1, '53 + 5 overshoots home, and nothing else can move');
        assert.match(s.message, /cannot move/);

        s = placed(2, [[53, 20, -1, -1], [-1, -1, -1, -1]]);
        s = play(s, 0, { type: 'roll' }, ctx(4));
        assert.deepEqual(ludo.view(s, 0).movable, [1], 'only the token that can use a 4');
        throwsGame(() => ludo.act(s, 0, { type: 'move', token: 0 }, ctx()), /needs exactly 3/);
        throwsGame(() => ludo.act(s, 0, { type: 'move', token: 2 }, ctx()), /need a 6/);

        s = placed(2, [[53, 20, -1, -1], [-1, -1, -1, -1]]);
        s = play(play(s, 0, { type: 'roll' }, ctx(3)), 0, { type: 'move', token: 0 }, ctx());
        assert.equal(s.tokens[0][0], 56);
        assert.equal(ludo.view(s, 0).finishSteps, 56);
        assert.deepEqual(ludo.view(s, 0).tokens[0][0].cell, [7, 7], 'in the centre');
        assert.equal(s.turn, 0, 'getting a token home earns another roll');
        assert.match(s.message, /got a token home and goes again/);
        s = play(s, 0, { type: 'roll' }, ctx(1));
        throwsGame(() => ludo.act(s, 0, { type: 'move', token: 0 }, ctx()), /already home/);
    });

    test('home-column squares are the colour\'s own and nobody is captured there', () => {
        // Red at 50 (last track square) and Yellow nowhere near: Red climbs its column.
        let s = placed(2, [[50, -1, -1, -1], [-1, -1, -1, -1]]);
        s = play(play(s, 0, { type: 'roll' }, ctx(2)), 0, { type: 'move', token: 0 }, ctx());
        assert.deepEqual(ludo.view(s, 0).tokens[0][0], { steps: 52, cell: [12, 7] });
    });
});

describe('ludo: whose turn it is', () => {
    test('acting out of turn, rolling twice, moving before rolling and nonsense are refused', () => {
        const s = fresh(3);
        throwsGame(() => ludo.act(s, 1, { type: 'roll' }, ctx(6)), /Red's turn, not yours/);
        throwsGame(() => ludo.act(s, 0, { type: 'move', token: 0 }, ctx()), /Roll the dice first/);
        throwsGame(() => ludo.act(s, 0, { type: 'dance' }, ctx()), /not understood/);
        throwsGame(() => ludo.act(s, 7, { type: 'roll' }, ctx(6)), /not playing/);
        throwsGame(() => ludo.act(s, null, { type: 'roll' }, ctx(6)), /not playing/);
        const rolled = ludo.act(s, 0, { type: 'roll' }, ctx(6));
        throwsGame(() => ludo.act(rolled, 0, { type: 'roll' }, ctx(6)), /already rolled a 6/);
        throwsGame(() => ludo.act(rolled, 0, { type: 'move', token: 4 }, ctx()), /own tokens/);
        throwsGame(() => ludo.act(rolled, 0, { type: 'move', token: '1' }, ctx()), /own tokens/);
        throwsGame(() => ludo.act(rolled, 1, { type: 'move', token: 0 }, ctx()), /not yours/);
    });

    test('turns go round in seat order and skip a player who resigned', () => {
        let s = fresh(4);
        s = play(s, 0, { type: 'roll' }, ctx(2));
        assert.equal(s.turn, 1);
        s = play(s, 2, { type: 'resign' }, ctx());
        assert.equal(s.status, 'active');
        assert.equal(s.message, 'Yellow resigned');
        s = play(s, 1, { type: 'roll' }, ctx(2));
        assert.equal(s.turn, 3, 'Yellow is skipped');
        throwsGame(() => ludo.act(s, 2, { type: 'roll' }, ctx(6)), /resigned/);
    });

    test('resigning on your own turn passes it, and the tokens leave the board', () => {
        let s = placed(3, [[-1, -1, -1, -1], [10, 20, -1, -1], [-1, -1, -1, -1]], { turn: 1 });
        s = play(s, 1, { type: 'roll' }, ctx(3));
        s = play(s, 1, { type: 'resign' }, at(NOW + 5000));
        assert.equal(s.turn, 2);
        assert.equal(s.rolled, false);
        assert.equal(ludo.deadline(s), NOW + 5000 + 30_000);
        assert.deepEqual(ludo.view(s, 0).tokens[1], [], 'Green\'s tokens are gone');
        assert.deepEqual(ludo.view(s, 0).resigned, [false, true, false]);
    });
});

describe('ludo: the clock', () => {
    test('nothing happens before the deadline', () => {
        const s = fresh(2);
        assert.equal(ludo.tick(s, at(NOW + 29_999)), null);
    });

    test('on timeout the turn is played: it rolls, then moves', () => {
        const s = fresh(2);
        const before = JSON.stringify(s);
        const t = ludo.tick(s, at(NOW + 30_000, 6));
        assert.equal(JSON.stringify(s), before, 'tick() must not change its input');
        assert.deepEqual(t.tokens[0], [0, -1, -1, -1], 'the 6 brought the first token out');
        assert.equal(t.turn, 0, 'and the 6 still earns another roll');
        assert.equal(t.rolled, false);
        assert.equal(ludo.deadline(t), NOW + 60_000, 'with a fresh clock');
        assert.match(t.message, /^Time ran out — Red brought a token out/);

        const u = ludo.tick(t, at(NOW + 60_000, 2));
        assert.deepEqual(u.tokens[0], [2, -1, -1, -1]);
        assert.equal(u.turn, 1);

        const v = ludo.tick(u, at(NOW + 90_000, 5));
        assert.equal(v.turn, 0, 'Yellow could not move a 5 and the turn passed');
        assert.match(v.message, /Time ran out — Yellow rolled a 5 and cannot move/);
    });

    test('an automatic move prefers a capture, then the token furthest along', () => {
        // Red has rolled a 3: token 0 (at 40) is further along, but token 1 (at 25) captures on 28.
        const capture = placed(2, [[40, 25, -1, -1], [2, -1, -1, -1]], { rolled: true, dice: 3, diceBy: 0 });
        const t = ludo.tick(capture, at(NOW + 30_000));
        assert.deepEqual(t.tokens[0], [40, 28, -1, -1]);
        assert.deepEqual(t.tokens[1], [-1, -1, -1, -1]);

        const plain = placed(2, [[25, 40, -1, -1], [-1, -1, -1, -1]], { rolled: true, dice: 3, diceBy: 0 });
        assert.deepEqual(ludo.tick(plain, at(NOW + 30_000)).tokens[0], [25, 43, -1, -1]);
    });
});

describe('ludo: the end', () => {
    test('the game ends when the first player gets every token home; the rest are placed by progress, resigned last', () => {
        const seats = [{ userId: 'a', name: 'Asha', side: 10 }, { userId: 'b', name: 'Bhagya', side: 11 },
            { userId: 'c', name: 'Chinmay', side: 12 }, { userId: 'd', name: 'Divya', side: 13 }];
        let s = ludo.create(seats, {}, ctx());
        s = play(s, 3, { type: 'resign' }, ctx());
        // Green 10 + 20 = 30, Yellow 30 + 0 = 30: a tie, placed together.
        s.tokens = [[56, 56, 56, 55], [10, 20, -1, -1], [30, 0, -1, -1], [-1, -1, -1, -1]];
        s = play(s, 0, { type: 'roll' }, ctx(1));
        assert.deepEqual(ludo.view(s, 0).movable, [3]);
        s = play(s, 0, { type: 'move', token: 3 }, ctx());
        assert.equal(s.status, 'finished');
        assert.deepEqual(ludo.outcome(s), { places: [[10], [11, 12], [13]], reason: 'Red got all four tokens home' });
        assert.equal(ludo.deadline(s), null);
        assert.equal(ludo.tick(s, at(NOW + 999_999)), null);
        throwsGame(() => ludo.act(s, 1, { type: 'roll' }, ctx(6)), /over/);
        const v = ludo.view(s, 2);
        assert.equal(v.turn, null);
        assert.equal(v.deadline, null);
        assert.deepEqual(v.outcome, ludo.outcome(s));
        assert.equal(v.message, 'Red got all four tokens home');
    });

    test('a shorter game: two tokens each, and the first home finishes the game', () => {
        let s = placed(3, [[56, 54], [-1, 40], [3, 3]], { tokensPerPlayer: 2 });
        s = play(play(s, 0, { type: 'roll' }, ctx(2)), 0, { type: 'move', token: 1 }, ctx());
        assert.deepEqual(ludo.outcome(s), { places: [[0], [1], [2]], reason: 'Red got both tokens home' });
    });

    test('resigning leaves the last player standing as the winner', () => {
        const two = play(fresh(2), 0, { type: 'resign' }, ctx());
        assert.equal(two.status, 'finished');
        assert.deepEqual(ludo.outcome(two), { places: [[1], [0]], reason: 'Red resigned' });

        let three = placed(3, [[10, -1, -1, -1], [-1, -1, -1, -1], [5, -1, -1, -1]]);
        three = play(three, 2, { type: 'resign' }, ctx());
        three = play(three, 0, { type: 'resign' }, ctx());
        assert.deepEqual(ludo.outcome(three), { places: [[1], [0], [2]], reason: 'Everyone else resigned — Green wins' });
        assert.equal(ludo.outcome(fresh(3)), null, 'no outcome while the game is on');
    });
});

describe('ludo: what each player sees', () => {
    test('the common fields, and every token is visible to everyone', () => {
        const s = placed(3, [[5, -1, -1, -1], [12, 56, -1, -1], [-1, -1, -1, -1]]);
        const red = ludo.view(s, 0);
        const spectator = ludo.view(s, null);
        for (const key of ['game', 'status', 'you', 'turn', 'deadline', 'seats', 'message', 'outcome']) assert.ok(key in red, key);
        assert.equal(red.game, 'ludo');
        assert.equal(red.you, 0);
        assert.equal(spectator.you, null);
        assert.deepEqual(spectator.tokens, red.tokens, 'nothing in Ludo is secret');
        assert.deepEqual(red.seats.map((x) => Object.keys(x).sort()), [0, 1, 2].map(() => ['color', 'label', 'name', 'side']));
        assert.equal(red.tokens.flat().length, 12);
        assert.deepEqual(red.tokens[0][1].cell, [10, 4], 'yard tokens sit in their yard spots');
        assert.doesNotMatch(JSON.stringify(red), /secret|userId/, 'no account ids in a view');
        assert.equal(red.dice, null);
        assert.equal(red.rolled, false);
        assert.equal(red.sixesInRow, 0);
    });

    test('only the player on turn, after rolling, is told which tokens may move', () => {
        let s = placed(2, [[5, -1, -1, -1], [-1, -1, -1, -1]]);
        assert.equal(ludo.view(s, 0).canRoll, true);
        assert.equal(ludo.view(s, 1).canRoll, false);
        assert.deepEqual(ludo.view(s, 0).movable, []);
        s = play(s, 0, { type: 'roll' }, ctx(6));
        const mine = ludo.view(s, 0);
        assert.equal(mine.rolled, true);
        assert.equal(mine.dice, 6);
        assert.equal(mine.canRoll, false);
        assert.deepEqual(mine.movable, [0, 1, 2, 3]);
        assert.deepEqual(ludo.view(s, 1).movable, []);
        assert.deepEqual(ludo.view(s, null).movable, []);
        assert.equal(ludo.view(s, 1).rolled, true, 'everyone can see Red has rolled');
    });

    test('state survives a JSON round trip and plays on identically', () => {
        let s = fresh(4);
        s = play(play(s, 0, { type: 'roll' }, ctx(6)), 0, { type: 'move', token: 1 }, ctx());
        s = play(s, 0, { type: 'roll' }, ctx(4));
        const copy = JSON.parse(JSON.stringify(s));
        assert.deepEqual(copy, s);
        assert.deepEqual(ludo.act(copy, 0, { type: 'move', token: 1 }, ctx()), ludo.act(s, 0, { type: 'move', token: 1 }, ctx()));
        assert.deepEqual(ludo.view(copy, 2), ludo.view(s, 2));
    });
});

describe('ludo: whole games at random', () => {
    for (const [n, seed] of [[2, 1], [3, 7], [4, 42], [4, 2026]]) {
        test(`${n} players, seed ${seed}: plays to a finish without breaking a rule`, () => {
            const rng = mulberry32(seed);
            let s = ludo.create(players(n), { tokensPerPlayer: n === 4 ? 4 : 3 }, { now: 0, rng });
            let now = 0;
            let actions = 0;
            while (s.status === 'active') {
                assert.ok(++actions < 20_000, 'the game should finish');
                now += 1000;
                const c = { now, rng };
                const seat = s.turn;
                const before = JSON.stringify(s);
                if (rng() < 0.05) {
                    s = ludo.tick(s, { now: ludo.deadline(s), rng }); // a player wandered off
                } else if (!s.rolled) {
                    s = ludo.act(s, seat, { type: 'roll' }, c);
                } else {
                    const movable = ludo.view(s, seat).movable;
                    assert.ok(movable.length > 0, 'a roll that cannot be used passes the turn instead');
                    s = ludo.act(s, seat, { type: 'move', token: movable[Math.floor(rng() * movable.length)] }, c);
                }
                assert.notEqual(JSON.stringify(s), before, 'every action changes something');
                assert.deepEqual(JSON.parse(JSON.stringify(s)), s, 'plain JSON');
                for (const list of s.tokens) for (const steps of list) assert.ok(steps >= -1 && steps <= 56);
                // Whoever just moved onto a plain track square left no lone opponent token there.
                const last = s.lastMove;
                if (last && JSON.stringify(last) !== JSON.stringify(JSON.parse(before).lastMove) && last.to >= 0 && last.to <= 50) {
                    const v = ludo.view(s, null);
                    const cell = v.tokens[last.seat][last.token].cell.join();
                    if (!v.safe.some((c2) => c2.join() === cell)) {
                        v.tokens.forEach((list, other) => {
                            if (other === last.seat) return;
                            const here = list.filter((t) => t.steps >= 0 && t.steps <= 50 && t.cell.join() === cell).length;
                            assert.notEqual(here, 1, 'a lone token on the landing square should have been captured');
                        });
                    }
                }
            }
            const out = ludo.outcome(s);
            assert.deepEqual(out.places.flat().sort(), players(n).map((p) => p.side).sort(), 'every side placed once');
            assert.ok(s.tokens[out.places[0][0]].every((t) => t === 56), 'the winner has every token home');
            assert.match(out.reason, /got (both|all three|all four) tokens home/);
        });
    }
});
