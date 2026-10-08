/**
 * The carrom engine: physics and rules, with no database.
 *
 * Every shot is played on the server, so these tests set up boards by hand —
 * a coin lined up in front of a pocket, a clear lane for the striker — and
 * check both that the simulation behaves like a board (it stops, it never
 * gains energy, pieces never end up inside each other) and that the rules
 * read what fell correctly.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const carrom = require('../../src/competitions/games/carrom');

const { CONSTANTS: K } = carrom;
const singles = [{ userId: 'u1', name: 'Asha', side: 0 }, { userId: 'u2', name: 'Ravi', side: 1 }];
const doubles = [
    { userId: 'u1', name: 'Asha', side: 0 }, { userId: 'u2', name: 'Ravi', side: 1 },
    { userId: 'u3', name: 'Meera', side: 0 }, { userId: 'u4', name: 'Kiran', side: 1 }
];
const at = (now) => ({ now, rng: () => 0.5 });
const fresh = (seats = singles, options = {}) => carrom.create(seats, options, at(0));

/** A singles game with the board replaced by `pieces` and the given pockets/queen. */
const board = (pieces, { white = [], black = [], queen = { state: 'board' }, turn = 0, seats = singles } = {}) => {
    const s = fresh(seats);
    s.pieces = pieces.map((p) => ({ ...p }));
    s.pocketed = { white: [...white], black: [...black] };
    s.queen = queen;
    s.turn = turn;
    return s;
};
const ids = (prefix, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${from + i}`);

/** The angle that sends the striker from `position` on `seat`'s baseline straight at `target`. */
const aimAt = (state, seat, position, target) => {
    const start = carrom.strikerStart(state, seat, position);
    const { forward, right } = carrom.seatFrame(state, seat);
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    return (Math.atan2(dx * right.x + dy * right.y, dx * forward.x + dy * forward.y) * 180) / Math.PI;
};
/** A point `fraction` of the way from the striker's start to a pocket: a coin there goes straight in. */
const lineUp = (state, seat, position, pocket, fraction = 0.75) => {
    const start = carrom.strikerStart(state, seat, position);
    const p = K.POCKETS[pocket];
    return {
        spot: { x: start.x + (p.x - start.x) * fraction, y: start.y + (p.y - start.y) * fraction },
        angle: aimAt(state, seat, position, p)
    };
};

const radius = (kind) => K.RADIUS[kind];
const overlaps = (pieces) => {
    const bad = [];
    for (let i = 0; i < pieces.length; i++) {
        for (let j = i + 1; j < pieces.length; j++) {
            const a = pieces[i];
            const b = pieces[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < radius(a.kind) + radius(b.kind) - 1e-6) bad.push(`${a.id}/${b.id} ${d.toFixed(3)}`);
        }
    }
    return bad;
};
const inside = (pieces) => pieces.every((p) => p.x >= radius(p.kind) - 1e-9 && p.y >= radius(p.kind) - 1e-9
    && p.x <= K.BOARD - radius(p.kind) + 1e-9 && p.y <= K.BOARD - radius(p.kind) + 1e-9);
/** Every piece is somewhere: on the board, in a pocket, or the queen pending/covered. */
const accounted = (s) => s.pieces.length + s.pocketed.white.length + s.pocketed.black.length + (s.queen.state === 'board' ? 0 : 1);

describe('the opening board', () => {
    test('the queen in the centre and nine of each colour round her, none overlapping', () => {
        const s = fresh();
        assert.equal(s.pieces.length, 19);
        assert.equal(s.pieces.filter((p) => p.kind === 'white').length, 9);
        assert.equal(s.pieces.filter((p) => p.kind === 'black').length, 9);
        const queen = s.pieces.find((p) => p.kind === 'queen');
        assert.deepEqual([queen.x, queen.y], [K.CENTRE, K.CENTRE]);
        assert.deepEqual(overlaps(s.pieces), []);
        assert.equal(new Set(s.pieces.map((p) => p.id)).size, 19, 'every piece has its own id');
        // two rings: six touching the queen, twelve outside them
        const d = s.pieces.filter((p) => p.kind !== 'queen').map((p) => Math.hypot(p.x - K.CENTRE, p.y - K.CENTRE));
        assert.equal(d.filter((x) => Math.abs(x - 2 * K.COIN_R) < 1e-9).length, 6);
        assert.equal(d.filter((x) => x > 2 * K.COIN_R + 1).length, 12);
    });

    test('White breaks; the turn clock is 45 s unless set, and clamped to 15–120', () => {
        const s = fresh();
        assert.equal(s.turn, 0);
        assert.equal(carrom.deadline(s), 45000);
        assert.equal(fresh(singles, { turnSeconds: 5 }).turnSeconds, 15);
        assert.equal(fresh(singles, { turnSeconds: 500 }).turnSeconds, 120);
        assert.equal(fresh(singles, { turnSeconds: 60, unknown: 1 }).turnSeconds, 60);
        assert.equal(carrom.outcome(s), null);
    });

    test('the wrong number of seats, or partners not opposite, is refused', () => {
        assert.throws(() => carrom.create(singles.slice(0, 1), {}, at(0)), { name: 'GameError' });
        assert.throws(() => carrom.create([...singles, singles[0]], {}, at(0)), { name: 'GameError' });
        assert.throws(() => carrom.create([singles[0], { ...singles[1], side: 0 }], {}, at(0)), { name: 'GameError' });
        const wrong = [doubles[0], doubles[1], doubles[3], doubles[2]];
        assert.throws(() => carrom.create(wrong, {}, at(0)), /partners sit opposite/);
    });

    test('the engine describes itself the way the contract asks', () => {
        assert.equal(carrom.id, 'carrom');
        assert.equal(carrom.minSeats, 2);
        assert.equal(carrom.maxSeats, 4);
        assert.deepEqual(carrom.seatsPerSide, { min: 1, max: 2 });
        assert.equal(carrom.emoji, '🟤');
    });
});

describe('the physics', () => {
    test('a full-power straight break moves pieces and stops well inside the step cap', () => {
        const s = fresh();
        const next = carrom.act(s, 0, { type: 'shoot', position: 0.5, angle: 0, power: 1 }, at(1000));
        const moved = next.pieces.filter((p) => {
            const before = s.pieces.find((q) => q.id === p.id);
            return Math.hypot(before.x - p.x, before.y - p.y) > 1;
        });
        assert.ok(moved.length >= 10, `the break scatters the pack (${moved.length} moved)`);
        assert.ok(next.lastShot.frames.length > 10 && next.lastShot.frames.length <= K.MAX_FRAMES);

        const start = carrom.strikerStart(s, 0, 0.5);
        const v = carrom.shotVelocity(s, 0, 0, 1);
        const sim = carrom.simulate([{ id: 'S', kind: 'striker', ...start, ...v }, ...s.pieces]);
        assert.equal(sim.capped, false, 'everything came to rest by itself');
        assert.ok(sim.steps < K.MAX_STEPS);
    });

    test('a full-power shot on an empty board crosses it and comes back off a few cushions', () => {
        const s = fresh();
        const start = carrom.strikerStart(s, 0, 0.5);
        const sim = carrom.simulate([{ id: 'S', kind: 'striker', ...start, ...carrom.shotVelocity(s, 0, 0, 1) }]);
        const ys = [start.y, ...sim.frames.flatMap((f) => f.moved.map((e) => e[2]))];
        let turns = 0;
        let dir = -1;
        for (let i = 1; i < ys.length; i++) {
            const d = Math.sign(ys[i] - ys[i - 1]);
            if (d && d !== dir) { turns += 1; dir = d; }
        }
        assert.ok(turns >= 2 && turns <= 5, `bounced ${turns} times`);
        assert.ok(Math.min(...ys) <= K.STRIKER_R + 0.1, 'it reached the far cushion');
        assert.equal(sim.capped, false);
    });

    test('the same shot on the same board always plays out the same', () => {
        const s = fresh();
        const shot = { type: 'shoot', position: 0.37, angle: 7.5, power: 0.93 };
        const a = carrom.act(s, 0, shot, at(1000));
        const b = carrom.act(s, 0, shot, at(1000));
        assert.deepStrictEqual(a, b);
        assert.deepStrictEqual(a.lastShot.frames, b.lastShot.frames);
        const c = carrom.act(s, 0, { ...shot, angle: 7.6 }, at(1000));
        assert.notDeepStrictEqual(c.pieces, a.pieces, 'a different shot is a different result');
    });

    test('energy never increases during a shot', () => {
        const s = fresh();
        for (const [position, angle, power] of [[0.5, 0, 1], [0.2, 25, 1], [0.9, -40, 0.7], [0, 60, 1]]) {
            const start = carrom.strikerStart(s, 0, position);
            const sim = carrom.simulate([{ id: 'S', kind: 'striker', ...start, ...carrom.shotVelocity(s, 0, angle, power) }, ...s.pieces], { trace: true });
            assert.ok(sim.energy.length > 10);
            for (let i = 1; i < sim.energy.length; i++) {
                assert.ok(sim.energy[i] <= sim.energy[i - 1] * (1 + 1e-12) + 1e-9, `energy rose at step ${i}: ${sim.energy[i - 1]} → ${sim.energy[i]}`);
            }
            assert.equal(sim.energy.at(-1), 0, 'and ends at rest');
        }
    });

    test('nothing ends inside anything else, or outside the cushions, whatever the shot', () => {
        const s = fresh();
        for (const position of [0, 0.25, 0.5, 0.75, 1]) {
            for (const angle of [-70, -20, 0, 15, 45]) {
                for (const power of [0.3, 1]) {
                    const next = carrom.act(s, 0, { type: 'shoot', position, angle, power }, at(1000));
                    assert.deepEqual(overlaps(next.pieces), [], `after ${position}/${angle}/${power}`);
                    assert.ok(inside(next.pieces), `inside after ${position}/${angle}/${power}`);
                    assert.equal(accounted(next), 19);
                }
            }
        }
    });

    test('a long game of varied shots keeps every piece accounted for and apart', () => {
        let s = fresh(doubles);
        let seed = 12345;
        const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
        for (let shot = 0; shot < 60 && s.status === 'active'; shot++) {
            const action = { type: 'shoot', position: rand(), angle: rand() * 140 - 70, power: 0.3 + rand() * 0.7 };
            try {
                s = carrom.act(s, s.turn, action, at(1000 * shot));
            } catch (e) {
                assert.match(e.message, /on top of a coin/, 'the only refusal is a striker placed on a coin');
                continue;
            }
            assert.deepEqual(overlaps(s.pieces), [], `after shot ${shot}`);
            assert.ok(inside(s.pieces));
            assert.equal(accounted(s), 19, `after shot ${shot}`);
        }
    });

    test('frames list only what moved, and pocketed pieces name the frame they vanish after', () => {
        const s0 = fresh();
        const { spot, angle } = lineUp(s0, 0, 0, 0);
        const s = board([{ id: 'W1', kind: 'white', ...spot }, { id: 'Q', kind: 'queen', x: 370, y: 370 }]);
        const next = carrom.act(s, 0, { type: 'shoot', position: 0, angle, power: 0.5 }, at(1000));
        const shot = next.lastShot;
        assert.ok(shot.frames.every((f) => f.moved.every((e) => e[0] !== 'Q')), 'the queen never moved, so never appears');
        assert.equal(shot.start.length, 3, 'start has the striker and both pieces');
        assert.deepEqual(shot.pocketed.map((p) => p.id), ['W1']);
        const fell = shot.pocketed[0].frame;
        assert.ok(fell >= 0 && fell < shot.frames.length);
        assert.ok(shot.frames.slice(fell + 1).every((f) => f.moved.every((e) => e[0] !== 'W1')), 'nothing moves W1 once it is in');
        const last = shot.frames[fell].moved.find((e) => e[0] === 'W1');
        assert.ok(last && Math.hypot(last[1] - K.POCKETS[0].x, last[2] - K.POCKETS[0].y) < K.POCKET_R, 'the frame it vanishes after shows it over the pocket');
        assert.equal(shot.pocketed[0].pocket, 0);
        for (let i = 1; i < shot.frames.length; i++) assert.ok(shot.frames[i].t > shot.frames[i - 1].t, 'frame times rise');
        assert.equal(shot.duration, shot.frames.at(-1).t);
    });
});

describe('pocketing and whose turn it is', () => {
    test('a coin lined up with a pocket goes in, and White, having pocketed white, shoots again', () => {
        const s0 = fresh();
        const { spot, angle } = lineUp(s0, 0, 0, 0);
        const s = board([{ id: 'W1', kind: 'white', ...spot }, { id: 'B1', kind: 'black', x: 600, y: 300 }, { id: 'Q', kind: 'queen', x: 370, y: 370 }]);
        const next = carrom.act(s, 0, { type: 'shoot', position: 0, angle, power: 0.5 }, at(1000));
        assert.deepEqual(next.pocketed, { white: ['W1'], black: [] });
        assert.equal(next.pieces.some((p) => p.id === 'W1'), false);
        assert.equal(next.turn, 0, 'same player again');
        assert.equal(next.deadline, 1000 + 45000, 'with a fresh clock');
        assert.match(next.message, /Asha pocketed a white coin.*Asha shoots again/);
        assert.equal(next.lastShot.foul, false);
    });

    test('pocketing only the opponent\'s coin credits them and passes the turn', () => {
        const s0 = fresh();
        const { spot, angle } = lineUp(s0, 0, 1, 1);
        const s = board([{ id: 'B4', kind: 'black', ...spot }, { id: 'Q', kind: 'queen', x: 370, y: 370 }]);
        const next = carrom.act(s, 0, { type: 'shoot', position: 1, angle, power: 0.5 }, at(1000));
        assert.deepEqual(next.pocketed, { white: [], black: ['B4'] });
        assert.equal(next.turn, 1);
        assert.match(next.message, /Ravi to shoot/);
    });

    test('Black shoots from the top: the board is turned, so position 0 is Black\'s left (the east end)', () => {
        const s0 = fresh();
        const frame = carrom.seatFrame(s0, 1);
        assert.deepEqual(frame.from, { x: K.CENTRE + K.BASE_HALF, y: K.BASE_INSET });
        assert.deepEqual(frame.forward, { x: 0, y: 1 });
        const { spot, angle } = lineUp(s0, 1, 0, 2); // bottom-right pocket, from Black's left end
        const s = board([{ id: 'B1', kind: 'black', ...spot }, { id: 'Q', kind: 'queen', x: 370, y: 370 }], { turn: 1 });
        const next = carrom.act(s, 1, { type: 'shoot', position: 0, angle, power: 0.5 }, at(1000));
        assert.deepEqual(next.pocketed.black, ['B1']);
        assert.equal(next.turn, 1);
    });

    test('pocketing the striker is a foul: the turn passes and one of the shooter\'s coins comes back', () => {
        const s0 = fresh();
        const angle = aimAt(s0, 0, 0, K.POCKETS[0]);
        const s = board([{ id: 'W3', kind: 'white', x: 500, y: 300 }, { id: 'Q', kind: 'queen', x: 370, y: 370 }], { white: ['W1', 'W2'], black: ['B1'] });
        const next = carrom.act(s, 0, { type: 'shoot', position: 0, angle, power: 0.6 }, at(1000));
        assert.deepEqual(next.lastShot.pocketed.map((p) => p.id), ['S']);
        assert.equal(next.lastShot.foul, true);
        assert.deepEqual(next.pocketed, { white: ['W1'], black: ['B1'] }, 'the last white in comes back; black is untouched');
        assert.ok(next.pieces.some((p) => p.id === 'W2'), 'W2 is back on the board');
        assert.deepEqual(overlaps(next.pieces), [], 'placed clear of the queen in the centre');
        assert.equal(next.turn, 1);
        assert.match(next.message, /Foul — the striker went in\. One white coin goes back to the centre\./);
    });

    test('a striker foul with nothing pocketed yet costs nothing more than the turn', () => {
        const s0 = fresh();
        const angle = aimAt(s0, 0, 0, K.POCKETS[0]);
        const s = board([{ id: 'Q', kind: 'queen', x: 370, y: 370 }]);
        const next = carrom.act(s, 0, { type: 'shoot', position: 0, angle, power: 0.6 }, at(1000));
        assert.equal(next.turn, 1);
        assert.deepEqual(next.pocketed, { white: [], black: [] });
        assert.equal(next.pieces.length, 1);
    });

    test('the striker may not be placed on top of a coin', () => {
        const s = board([{ id: 'W1', kind: 'white', x: 370, y: 623 }, { id: 'Q', kind: 'queen', x: 370, y: 370 }]);
        assert.throws(() => carrom.act(s, 0, { type: 'shoot', position: 0.5, angle: 0, power: 1 }, at(1000)), /on top of a coin/);
        assert.doesNotThrow(() => carrom.act(s, 0, { type: 'shoot', position: 0.1, angle: 0, power: 0.2 }, at(1000)));
    });
});

describe('the queen', () => {
    const setup = () => {
        const s0 = fresh();
        const queen = lineUp(s0, 0, 0, 0);   // the queen in front of the top-left pocket
        const coin = lineUp(s0, 0, 1, 1);    // a white coin in front of the top-right
        return {
            s: board([{ id: 'Q', kind: 'queen', ...queen.spot }, { id: 'W1', kind: 'white', ...coin.spot }, { id: 'B1', kind: 'black', x: 370, y: 300 }]),
            queenAngle: queen.angle, coinAngle: coin.angle
        };
    };

    test('pocketed, she waits for cover and the same player shoots again; an own coin next covers her', () => {
        const { s, queenAngle, coinAngle } = setup();
        const one = carrom.act(s, 0, { type: 'shoot', position: 0, angle: queenAngle, power: 0.5 }, at(1000));
        assert.equal(carrom.view(one, 0, at(1000)).queenState, 'pending:0');
        assert.equal(one.turn, 0);
        assert.match(one.message, /Cover the queen with a white coin on the next shot/);
        const two = carrom.act(one, 0, { type: 'shoot', position: 1, angle: coinAngle, power: 0.5 }, at(2000));
        assert.equal(carrom.view(two, 0, at(2000)).queenState, 'covered:0');
        assert.equal(two.turn, 0, 'covering pocketed a white coin, so White goes on');
        assert.match(two.message, /The queen is covered — she belongs to White/);
        assert.equal(accounted(two), 3);
    });

    test('not covered on the next shot, she goes back to the centre and the turn passes', () => {
        const { s, queenAngle } = setup();
        const one = carrom.act(s, 0, { type: 'shoot', position: 0, angle: queenAngle, power: 0.5 }, at(1000));
        const two = carrom.act(one, 0, { type: 'shoot', position: 0.5, angle: 0, power: 0.05 }, at(2000));
        assert.equal(two.queen.state, 'board');
        const q = two.pieces.find((p) => p.id === 'Q');
        assert.ok(q, 'the queen is back on the board');
        assert.ok(Math.hypot(q.x - K.CENTRE, q.y - K.CENTRE) < 40, 'at (or right by) the centre');
        assert.deepEqual(overlaps(two.pieces), []);
        assert.equal(two.turn, 1);
        assert.match(two.message, /not covered and goes back to the centre/);
    });

    test('running out of time while she waits sends her back too', () => {
        const { s, queenAngle } = setup();
        const one = carrom.act(s, 0, { type: 'shoot', position: 0, angle: queenAngle, power: 0.5 }, at(1000));
        const late = carrom.tick(one, at(one.deadline));
        assert.equal(late.queen.state, 'board');
        assert.ok(late.pieces.some((p) => p.id === 'Q'));
        assert.equal(late.turn, 1);
    });

    test('a side cannot sink its last coin while the queen is still on the board', () => {
        const s0 = fresh();
        const { spot, angle } = lineUp(s0, 0, 0, 0);
        const s = board([{ id: 'W9', kind: 'white', ...spot }, { id: 'Q', kind: 'queen', x: 370, y: 370 }, { id: 'B1', kind: 'black', x: 600, y: 200 }],
            { white: ids('W', 1, 8), black: ids('B', 2, 9) });
        const next = carrom.act(s, 0, { type: 'shoot', position: 0, angle, power: 0.5 }, at(1000));
        assert.equal(next.pocketed.white.length, 8, 'the ninth comes back');
        assert.ok(next.pieces.some((p) => p.id === 'W9'));
        assert.deepEqual(overlaps(next.pieces), [], 'beside the queen, not on her');
        assert.equal(next.turn, 1, 'and it is a foul, so the turn passes');
        assert.equal(next.status, 'active');
        assert.match(next.message, /last coin cannot go in before the queen is covered/);
    });

    test('nor sink the opponent\'s last coin for them', () => {
        const s0 = fresh();
        const { spot, angle } = lineUp(s0, 0, 1, 1);
        const s = board([{ id: 'B9', kind: 'black', ...spot }, { id: 'Q', kind: 'queen', x: 370, y: 370 }, { id: 'W1', kind: 'white', x: 300, y: 200 }],
            { black: ids('B', 1, 8), white: ids('W', 2, 9) });
        const next = carrom.act(s, 0, { type: 'shoot', position: 1, angle, power: 0.5 }, at(1000));
        assert.equal(next.pocketed.black.length, 8);
        assert.equal(next.turn, 1);
        assert.equal(next.status, 'active');
    });
});

describe('the end of the game', () => {
    test('the last coin with the queen covered wins, and outcome() says who', () => {
        const s0 = fresh();
        const { spot, angle } = lineUp(s0, 0, 0, 0);
        const s = board([{ id: 'W9', kind: 'white', ...spot }, { id: 'B1', kind: 'black', x: 600, y: 200 }],
            { white: ids('W', 1, 8), black: ids('B', 2, 9), queen: { state: 'covered', side: 1, seat: 1 } });
        const next = carrom.act(s, 0, { type: 'shoot', position: 0, angle, power: 0.5 }, at(1000));
        assert.equal(next.status, 'finished');
        assert.deepEqual(carrom.outcome(next), { places: [[0], [1]], reason: 'White cleared the board' });
        assert.equal(carrom.deadline(next), null);
        assert.equal(carrom.tick(next, at(10 ** 9)), null);
        const v = carrom.view(next, 1, at(1000));
        assert.equal(v.status, 'finished');
        assert.equal(v.turn, null);
        assert.deepEqual(v.outcome, carrom.outcome(next));
        assert.equal(v.baseline, null);
        assert.throws(() => carrom.act(next, 1, { type: 'shoot', position: 0.5, angle: 0, power: 1 }, at(2000)), /already over/);
    });

    test('a resignation loses for the whole side', () => {
        const s = fresh(doubles);
        const next = carrom.act(s, 3, { type: 'resign' }, at(500));
        assert.deepEqual(carrom.outcome(next), { places: [[0], [1]], reason: 'Black resigned' });
        assert.match(next.message, /Kiran resigned — White wins/);
        const solo = carrom.act(fresh(), 0, { type: 'resign' }, at(500));
        assert.deepEqual(carrom.outcome(solo).places, [[1], [0]]);
    });

    test('sides keep the numbers they were given', () => {
        const s = carrom.create([{ userId: 'a', name: 'A', side: 4 }, { userId: 'b', name: 'B', side: 7 }], {}, at(0));
        const next = carrom.act(s, 1, { type: 'resign' }, at(1));
        assert.deepEqual(carrom.outcome(next).places, [[4], [7]]);
        assert.deepEqual(carrom.view(s, 0, at(0)).score.map((x) => x.side), [4, 7]);
    });
});

describe('the clock', () => {
    test('tick() does nothing early, then forfeits the shot and passes the turn', () => {
        const s = fresh();
        assert.equal(carrom.tick(s, at(44999)), null);
        const next = carrom.tick(s, at(45000));
        assert.equal(next.turn, 1);
        assert.equal(next.deadline, 90000);
        assert.match(next.message, /Asha ran out of time — the shot is forfeited\. Ravi to shoot\./);
        assert.deepEqual(next.pieces, s.pieces, 'the board is untouched');
        assert.equal(s.turn, 0, 'and the input state is untouched');
    });

    test('doubles pass the turn round the table 0 → 1 → 2 → 3 → 0', () => {
        let s = fresh(doubles);
        const order = [];
        for (let i = 0; i < 5; i++) { s = carrom.tick(s, at(s.deadline)); order.push(s.turn); }
        assert.deepEqual(order, [1, 2, 3, 0, 1]);
    });
});

describe('what act() accepts', () => {
    const s = fresh();
    const bad = [
        [{ type: 'shoot', position: 0.5, angle: 81, power: 1 }, /angle must be between -80° and 80°/],
        [{ type: 'shoot', position: 0.5, angle: -90, power: 1 }, /angle/],
        [{ type: 'shoot', position: 0.5, angle: '10', power: 1 }, /angle/],
        [{ type: 'shoot', position: 0.5, angle: NaN, power: 1 }, /angle/],
        [{ type: 'shoot', position: -0.1, angle: 0, power: 1 }, /position must be a number from 0 to 1/],
        [{ type: 'shoot', position: 1.01, angle: 0, power: 1 }, /position/],
        [{ type: 'shoot', angle: 0, power: 1 }, /position/],
        [{ type: 'shoot', position: 0.5, angle: 0, power: 1.5 }, /Power must be a number from 0 to 1/],
        [{ type: 'shoot', position: 0.5, angle: 0, power: -0.2 }, /Power/],
        [{ type: 'shoot', position: 0.5, angle: 0, power: Infinity }, /Power/],
        [{ type: 'move' }, /only shoot or resign/],
        [null, /not a carrom move/]
    ];
    for (const [action, message] of bad) {
        test(`refuses ${JSON.stringify(action)}`, () => {
            assert.throws(() => carrom.act(s, 0, action, at(1)), (e) => e.name === 'GameError' && e.status === 400 && message.test(e.message));
        });
    }

    test('refuses a shot out of turn and a seat that is not in the game', () => {
        assert.throws(() => carrom.act(s, 1, { type: 'shoot', position: 0.5, angle: 0, power: 1 }, at(1)), /It is Asha's shot, not yours/);
        assert.throws(() => carrom.act(s, 2, { type: 'resign' }, at(1)), /not playing/);
        assert.throws(() => carrom.act(s, null, { type: 'resign' }, at(1)), /not playing/);
    });

    test('the edges of every range are allowed', () => {
        for (const action of [{ position: 0, angle: -80, power: 0 }, { position: 1, angle: 80, power: 1 }]) {
            assert.doesNotThrow(() => carrom.act(s, 0, { type: 'shoot', ...action }, at(1)));
        }
    });

    test('act() and tick() never change the state they are given', () => {
        const before = structuredClone(s);
        carrom.act(s, 0, { type: 'shoot', position: 0.5, angle: 0, power: 1 }, at(1));
        carrom.act(s, 1, { type: 'resign' }, at(1));
        carrom.tick(s, at(10 ** 6));
        assert.deepStrictEqual(s, before);
    });

    test('the state survives a trip through JSON and plays on identically', () => {
        const one = carrom.act(s, 0, { type: 'shoot', position: 0.42, angle: -3, power: 0.88 }, at(1000));
        const stored = JSON.parse(JSON.stringify(one));
        const shot = { type: 'shoot', position: 0.6, angle: 12, power: 0.7 };
        const a = carrom.act(one, one.turn, shot, at(2000));
        const b = carrom.act(stored, stored.turn, shot, at(2000));
        assert.equal(JSON.stringify(a), JSON.stringify(b));
        assert.deepEqual(JSON.parse(JSON.stringify(carrom.view(stored, 0, at(2000)))), carrom.view(one, 0, at(2000)));
    });
});

describe('view()', () => {
    test('carries the contract\'s common fields and the board for the table', () => {
        const s = fresh();
        const v = carrom.view(s, 0, at(10));
        for (const key of ['game', 'status', 'you', 'turn', 'deadline', 'seats', 'message', 'outcome']) assert.ok(key in v, key);
        assert.equal(v.game, 'carrom');
        assert.equal(v.status, 'active');
        assert.equal(v.you, 0);
        assert.equal(v.turn, 0);
        assert.equal(v.deadline, 45000);
        assert.deepEqual(v.seats.map((x) => x.label), ['White', 'Black']);
        assert.ok(v.seats.every((x) => /^#[0-9a-f]{6}$/i.test(x.color)));
        assert.equal(v.pieces.length, 19);
        assert.deepEqual(v.pocketed, { white: 0, black: 0 });
        assert.equal(v.queenState, 'board');
        assert.equal(v.orientation, 0);
        assert.equal(v.canShoot, true);
        assert.deepEqual(v.legal, { type: 'shoot', position: [0, 1], angle: [-80, 80], power: [0, 1] });
        assert.deepEqual(v.baseline.from, { x: 135, y: 623 });
        assert.deepEqual(v.baseline.to, { x: 605, y: 623 });
        assert.equal(v.lastShot, null);
        assert.equal(v.board.pockets.length, 4);
    });

    test('Black sees the board turned half round; a spectator sees it as White does and may not shoot', () => {
        const s = fresh();
        const black = carrom.view(s, 1, at(10));
        assert.equal(black.orientation, 180);
        assert.equal(black.canShoot, false);
        assert.equal(black.legal, null);
        assert.equal(black.yourColour, 'black');
        const watcher = carrom.view(s, null, at(10));
        assert.equal(watcher.you, null);
        assert.equal(watcher.orientation, 0);
        assert.equal(watcher.canShoot, false);
    });

    test('doubles: four labelled seats, each turned to the bottom for its player', () => {
        const v = carrom.view(fresh(doubles), 2, at(0));
        assert.equal(v.mode, 'doubles');
        assert.deepEqual(v.seats.map((x) => x.label), ['White (A)', 'Black (A)', 'White (B)', 'Black (B)']);
        assert.deepEqual(v.seats.map((x) => x.side), [0, 1, 0, 1]);
        assert.deepEqual(v.orientations, [0, 90, 180, 270]);
        assert.equal(v.orientation, 180);
        const right = v.baselines[1];
        assert.deepEqual(right.from, { x: 623, y: 605 }, 'the right-hand player\'s left end is towards the bottom');
        assert.deepEqual(right.forward, { x: -1, y: 0 });
    });

    test('the last shot is sent with its frames while it is fresh, then without them', () => {
        const s = carrom.act(fresh(), 0, { type: 'shoot', position: 0.5, angle: 0, power: 1 }, at(1000));
        const soon = carrom.view(s, 1, at(2000)).lastShot;
        assert.equal(soon.id, 1);
        assert.equal(soon.seat, 0);
        assert.ok(soon.frames.length > 0);
        assert.ok(soon.duration > 500 && soon.duration < 12000, `lasted ${soon.duration} ms`);
        assert.ok(soon.frames.every((f) => typeof f.t === 'number' && Array.isArray(f.moved)));
        assert.equal(soon.start[0].id, 'S');
        assert.equal(typeof soon.result, 'string');
        const later = carrom.view(s, 1, at(1000 + K.FRESH_MS + 1)).lastShot;
        assert.equal(later.id, 1);
        assert.deepEqual(later.frames, []);
        const again = carrom.act(s, s.turn, { type: 'shoot', position: 0.5, angle: 0, power: 0.2 }, at(3000));
        assert.equal(again.lastShot.id, 2, 'shot ids count up');
    });
});
