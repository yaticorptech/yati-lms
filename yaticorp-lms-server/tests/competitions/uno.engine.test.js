/**
 * The UNO engine on its own: no database, no clock, a seeded random source,
 * so every game here plays out the same way on every run.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const uno = require('../../src/competitions/games/uno');

/** mulberry32: a small seeded generator returning [0, 1). */
const seeded = (seed) => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};
const ctxAt = (now = 1_000_000, seed = 7) => ({ now, rng: seeded(seed) });
const NAMES = ['Asha', 'Ravi', 'Meera', 'Kiran'];
const seatsFor = (n) => NAMES.slice(0, n).map((name, i) => ({ userId: `u${i}`, name, side: i }));
const newGame = (n = 2, options = {}, seed = 7) => uno.create(seatsFor(n), options, ctxAt(1_000_000, seed));

const allCards = (s) => [...s.hands.flat(), ...s.drawPile, ...s.discard, ...s.outOfPlay];
const ids = (cards) => cards.map((c) => c.id);
const isGameError = (re) => (err) => err.name === 'GameError' && (!re || re.test(err.message));

/**
 * Rearranges a fresh game's cards into a known position. `hands` lists card
 * ids per seat, `top` is the discard pile's top card, `next` the cards the draw
 * pile hands out next (first drawn first); every other card stays in the pile.
 */
const arrange = (state, { hands, top, next = [], color, under = [], pile = null }) => {
    const byId = new Map(allCards(state).map((c) => [c.id, c]));
    const take = (id) => {
        const c = byId.get(id);
        assert.ok(c, `no card ${id}`);
        byId.delete(id);
        return c;
    };
    state.hands = hands.map((h) => h.map(take));
    const underCards = under.map(take);
    const topCard = take(top);
    state.discard = [...underCards, topCard];
    const nextCards = next.map(take);
    const rest = pile === null ? [...byId.values()] : pile.map(take);
    state.outOfPlay = pile === null ? [] : [...byId.values()];
    state.drawPile = [...rest, ...nextCards.reverse()];
    state.currentColor = color || (topCard.color === 'wild' ? 'red' : topCard.color);
    return state;
};

describe('the deck and the deal', () => {
    test('108 cards with unique ids: per colour one 0, two of 1–9, two Skip, Reverse and Draw Two; four Wild and four Wild Draw Four', () => {
        const s = newGame(4);
        const cards = allCards(s);
        assert.equal(cards.length, 108);
        assert.equal(new Set(ids(cards)).size, 108, 'every card has its own id');
        const count = (pred) => cards.filter(pred).length;
        for (const color of ['red', 'yellow', 'green', 'blue']) {
            assert.equal(count((c) => c.color === color), 25, `${color} has 25 cards`);
            assert.equal(count((c) => c.color === color && c.value === '0'), 1);
            for (const v of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2']) {
                assert.equal(count((c) => c.color === color && c.value === v), 2, `two ${color} ${v}`);
            }
        }
        assert.equal(count((c) => c.color === 'wild' && c.value === 'wild'), 4);
        assert.equal(count((c) => c.color === 'wild' && c.value === 'wild4'), 4);
    });

    test('ids are stable: the same card has the same id in every game', () => {
        const a = new Set(ids(allCards(newGame(2, {}, 1))));
        const b = new Set(ids(allCards(newGame(3, {}, 99))));
        assert.deepEqual([...a].sort(), [...b].sort());
        assert.ok(a.has('red-0-1') && a.has('blue-draw2-2') && a.has('wild4-4'));
    });

    test('deals handSize to each seat, seat 0 starts clockwise, and the first discard is a number card', () => {
        for (let seed = 1; seed <= 40; seed++) {
            const s = newGame(1 + (seed % 3) + 1, {}, seed);
            for (const h of s.hands) assert.equal(h.length, 7);
            assert.ok(/^[0-9]$/.test(s.discard.at(-1).value), `seed ${seed}: first discard ${s.discard.at(-1).id} is a number`);
            assert.equal(s.discard.length, 1);
            assert.equal(s.currentColor, s.discard[0].color);
            assert.equal(s.turn, 0);
            assert.equal(s.direction, 1);
            assert.equal(allCards(s).length, 108);
        }
    });

    test('options: handSize 5–7 (default 7), turnSeconds 10–120 (default 30)', () => {
        assert.equal(newGame(2, { handSize: 5 }).hands[0].length, 5);
        assert.equal(newGame(2, { handSize: 2 }).hands[0].length, 5, 'clamped up to 5');
        assert.equal(newGame(2, { handSize: 12 }).hands[0].length, 7, 'clamped down to 7');
        assert.equal(newGame(2, { handSize: 'lots' }).hands[0].length, 7, 'nonsense falls back to the default');
        assert.equal(newGame(2).options.turnSeconds, 30);
        assert.equal(newGame(2, { turnSeconds: 3 }).options.turnSeconds, 10);
        assert.equal(newGame(2, { turnSeconds: 999 }).options.turnSeconds, 120);
        const s = newGame(2, { turnSeconds: 45, somethingElse: true });
        assert.equal(uno.deadline(s), 1_000_000 + 45_000);
    });

    test('2 to 4 seats; the engine describes itself', () => {
        assert.throws(() => newGame(1), isGameError());
        assert.throws(() => uno.create([...seatsFor(4), { userId: 'u5', name: 'Five', side: 4 }], {}, ctxAt()), isGameError());
        assert.equal(uno.id, 'uno');
        assert.equal(uno.emoji, '🃏');
        assert.equal(uno.minSeats, 2);
        assert.equal(uno.maxSeats, 4);
        assert.deepEqual(uno.seatsPerSide, { min: 1, max: 1 });
        for (const fn of ['create', 'view', 'act', 'tick', 'deadline', 'outcome']) assert.equal(typeof uno[fn], 'function');
    });

    test('the shuffle comes only from ctx.rng: the same seed deals the same game', () => {
        assert.deepEqual(newGame(3, {}, 42), newGame(3, {}, 42));
        assert.notDeepEqual(ids(newGame(3, {}, 42).hands[0]), ids(newGame(3, {}, 43).hands[0]));
    });
});

describe('playing cards', () => {
    test('a card matching the colour or the value can be played; anything else is refused', () => {
        const s = arrange(newGame(2), { hands: [['red-3-1', 'blue-7-1', 'green-5-1', 'yellow-2-1'], ['blue-1-1', 'blue-2-1']], top: 'red-7-1' });
        const ctx = ctxAt();
        const byColour = uno.act(s, 0, { type: 'play', card: 'red-3-1' }, ctx);
        assert.equal(byColour.discard.at(-1).id, 'red-3-1');
        assert.equal(byColour.turn, 1);
        const byValue = uno.act(s, 0, { type: 'play', card: 'blue-7-1' }, ctx);
        assert.equal(byValue.currentColor, 'blue', 'the colour follows the card played');
        assert.throws(() => uno.act(s, 0, { type: 'play', card: 'green-5-1' }, ctx), isGameError(/does not match/));
        assert.throws(() => uno.act(s, 1, { type: 'play', card: 'blue-1-1' }, ctx), isGameError(/not your turn/));
        assert.throws(() => uno.act(s, 0, { type: 'play', card: 'blue-1-1' }, ctx), isGameError(/not in your hand/));
        assert.throws(() => uno.act(s, 0, { type: 'dance' }, ctx), isGameError());
        assert.deepEqual(uno.view(s, 0, ctx).playable.sort(), ['blue-7-1', 'red-3-1']);
    });

    test('symbols match symbols: a Skip on a Skip of another colour', () => {
        const s = arrange(newGame(2), { hands: [['blue-skip-1', 'green-4-1'], ['red-1-1']], top: 'red-skip-1' });
        assert.deepEqual(uno.view(s, 0, ctxAt()).playable, ['blue-skip-1']);
    });

    test('a wild can always be played but needs a colour, which the next player must then follow', () => {
        const s = arrange(newGame(2), { hands: [['wild-1', 'green-4-1', 'blue-9-1'], ['red-5-1', 'blue-5-1', 'yellow-1-1']], top: 'red-7-1' });
        const ctx = ctxAt();
        assert.throws(() => uno.act(s, 0, { type: 'play', card: 'wild-1' }, ctx), isGameError(/colour/));
        assert.throws(() => uno.act(s, 0, { type: 'play', card: 'wild-1', color: 'purple' }, ctx), isGameError(/colour/));
        const after = uno.act(s, 0, { type: 'play', card: 'wild-1', color: 'blue' }, ctx);
        assert.equal(after.currentColor, 'blue');
        assert.equal(after.turn, 1);
        assert.match(after.message, /Asha played Wild and chose blue/);
        const v = uno.view(after, 1, ctx);
        assert.equal(v.currentColor, 'blue');
        assert.deepEqual(v.top, { id: 'wild-1', color: 'wild', value: 'wild' });
        assert.deepEqual(v.playable, ['blue-5-1'], 'red no longer matches after a wild chose blue');
        assert.throws(() => uno.act(after, 1, { type: 'play', card: 'red-5-1' }, ctx), isGameError(/blue/));
    });

    test('Skip jumps the next player', () => {
        const s = arrange(newGame(3), { hands: [['red-skip-1', 'red-1-1'], ['red-2-1'], ['red-3-1']], top: 'red-7-1' });
        const after = uno.act(s, 0, { type: 'play', card: 'red-skip-1', uno: true }, ctxAt());
        assert.equal(after.turn, 2);
        assert.match(after.message, /Ravi is skipped/);
    });

    test('Reverse turns the play around with three or more players', () => {
        const s = arrange(newGame(3), { hands: [['red-reverse-1', 'red-1-1', 'red-4-1'], ['red-2-1'], ['red-3-1', 'red-5-1']], top: 'red-7-1' });
        const ctx = ctxAt();
        const a = uno.act(s, 0, { type: 'play', card: 'red-reverse-1' }, ctx);
        assert.equal(a.direction, -1);
        assert.equal(a.turn, 2, 'anticlockwise from seat 0 is seat 2');
        assert.equal(uno.view(a, 1, ctx).direction, -1);
        const b = uno.act(a, 2, { type: 'play', card: 'red-3-1', uno: true }, ctx);
        assert.equal(b.turn, 1, 'and on to seat 1');
    });

    test('Reverse with two players acts as a Skip: the same player goes again', () => {
        const s = arrange(newGame(2), { hands: [['red-reverse-1', 'red-1-1', 'red-4-1'], ['red-2-1', 'red-6-1']], top: 'red-7-1' });
        const after = uno.act(s, 0, { type: 'play', card: 'red-reverse-1' }, ctxAt());
        assert.equal(after.turn, 0);
        assert.equal(after.turnNumber, s.turnNumber + 1, 'it is a fresh turn');
        assert.match(after.message, /Ravi is skipped/);
    });

    test('Draw Two: the next player draws 2 and loses their turn', () => {
        const s = arrange(newGame(3), { hands: [['red-draw2-1', 'red-1-1', 'red-4-1'], ['red-2-1'], ['red-3-1']], top: 'red-7-1', next: ['blue-1-1', 'blue-2-1'] });
        const after = uno.act(s, 0, { type: 'play', card: 'red-draw2-1' }, ctxAt());
        assert.deepEqual(ids(after.hands[1]), ['red-2-1', 'blue-1-1', 'blue-2-1']);
        assert.equal(after.turn, 2);
        assert.match(after.message, /Ravi draws 2 and misses a turn/);
    });

    test('Wild Draw Four: the next player draws 4 and loses their turn, and the colour is chosen', () => {
        const s = arrange(newGame(3), { hands: [['wild4-1', 'red-1-1', 'red-4-1'], ['red-2-1'], ['red-3-1']], top: 'red-7-1' });
        const after = uno.act(s, 0, { type: 'play', card: 'wild4-1', color: 'green' }, ctxAt());
        assert.equal(after.hands[1].length, 5);
        assert.equal(after.turn, 2);
        assert.equal(after.currentColor, 'green');
        assert.throws(() => uno.act(s, 0, { type: 'play', card: 'wild4-1' }, ctxAt()), isGameError(/colour/));
    });
});

describe('drawing and passing', () => {
    const hands = [['green-4-1', 'yellow-9-1', 'blue-1-1'], ['red-2-1', 'red-3-1']];

    test('drawing a playable card: you may play that card and only that card', () => {
        const s = arrange(newGame(2), { hands, top: 'red-7-1', next: ['red-5-1'] });
        const ctx = ctxAt();
        assert.equal(uno.view(s, 0, ctx).canPass, false);
        assert.equal(uno.view(s, 0, ctx).canDraw, true);
        const drawn = uno.act(s, 0, { type: 'draw' }, ctx);
        assert.equal(drawn.turn, 0, 'still your turn');
        const v = uno.view(drawn, 0, ctx);
        assert.equal(v.hasDrawn, true);
        assert.deepEqual(v.playable, ['red-5-1']);
        assert.equal(v.canPass, true);
        assert.equal(v.canDraw, false);
        assert.equal(uno.view(drawn, 1, ctx).hasDrawn, true, 'everyone can see the current player has drawn');
        assert.doesNotMatch(drawn.message, /red|5/i, 'the message does not say what was drawn');
        assert.throws(() => uno.act(drawn, 0, { type: 'draw' }, ctx), isGameError(/already drawn/));
        const played = uno.act(drawn, 0, { type: 'play', card: 'red-5-1' }, ctx);
        assert.equal(played.discard.at(-1).id, 'red-5-1');
        assert.equal(played.turn, 1);
    });

    test('after drawing, a different card that would match cannot be played', () => {
        const s = arrange(newGame(2), { hands: [['red-4-1', 'yellow-9-1'], ['red-2-1']], top: 'red-7-1', next: ['red-5-1'] });
        const drawn = uno.act(s, 0, { type: 'draw' }, ctxAt());
        assert.deepEqual(uno.view(drawn, 0, ctxAt()).playable, ['red-5-1']);
        assert.throws(() => uno.act(drawn, 0, { type: 'play', card: 'red-4-1' }, ctxAt()), isGameError(/only play the card you drew/));
    });

    test('drawing a playable card and passing', () => {
        const s = arrange(newGame(2), { hands, top: 'red-7-1', next: ['red-5-1'] });
        const drawn = uno.act(s, 0, { type: 'draw' }, ctxAt());
        const passed = uno.act(drawn, 0, { type: 'pass' }, ctxAt(1_005_000));
        assert.equal(passed.turn, 1);
        assert.equal(passed.hands[0].length, 4);
        assert.equal(passed.hasDrawn, false);
        assert.equal(uno.deadline(passed), 1_005_000 + 30_000, 'the next player gets a full turn');
    });

    test('drawing an unplayable card passes the turn on its own', () => {
        const s = arrange(newGame(2), { hands, top: 'red-7-1', next: ['blue-5-1'] });
        const drawn = uno.act(s, 0, { type: 'draw' }, ctxAt());
        assert.equal(drawn.turn, 1);
        assert.equal(drawn.hands[0].length, 4);
        assert.equal(drawn.hasDrawn, false);
    });

    test('you cannot pass without drawing first', () => {
        const s = arrange(newGame(2), { hands, top: 'red-7-1' });
        assert.throws(() => uno.act(s, 0, { type: 'pass' }, ctxAt()), isGameError(/Draw a card before/));
        assert.throws(() => uno.act(s, 1, { type: 'draw' }, ctxAt()), isGameError(/not your turn/));
    });

    test('when the draw pile runs out the discard pile, all but its top card, is shuffled into it', () => {
        const s = arrange(newGame(2), {
            hands: [['green-4-1', 'yellow-9-1'], ['red-2-1', 'red-3-1']], top: 'red-7-1',
            under: ['blue-1-1', 'blue-2-1', 'blue-3-1', 'green-1-1', 'green-2-1'], pile: []
        });
        assert.equal(s.drawPile.length, 0);
        const before = allCards(s).length;
        const drawn = uno.act(s, 0, { type: 'draw' }, ctxAt());
        assert.equal(drawn.discard.length, 1);
        assert.equal(drawn.discard[0].id, 'red-7-1', 'the top card stays');
        assert.equal(drawn.drawPile.length + drawn.hands[0].length, 4 + 3);
        assert.equal(allCards(drawn).length, before, 'no card is lost or made up');
        assert.equal(drawn.reshuffles, 1);
        assert.equal(uno.view(drawn, 1, ctxAt()).drawPileCount, drawn.drawPile.length);
    });

    test('with nothing at all left to draw, drawing passes the turn', () => {
        const s = arrange(newGame(2), { hands: [['green-4-1'], ['red-2-1', 'red-3-1']], top: 'red-7-1', pile: [] });
        const after = uno.act(s, 0, { type: 'draw' }, ctxAt());
        assert.equal(after.turn, 1);
        assert.equal(after.hands[0].length, 1);
        assert.match(after.message, /no cards left/);
    });
});

describe('calling UNO', () => {
    const position = () => arrange(newGame(2), { hands: [['red-3-1', 'blue-9-1'], ['red-2-1', 'red-4-1']], top: 'red-7-1', next: ['green-1-1', 'green-2-1'] });

    test('playing down to one card without calling UNO costs 2 penalty cards, and the message says so', () => {
        const after = uno.act(position(), 0, { type: 'play', card: 'red-3-1' }, ctxAt());
        assert.deepEqual(ids(after.hands[0]), ['blue-9-1', 'green-1-1', 'green-2-1']);
        assert.match(after.message, /did not call UNO and draws 2 penalty cards/);
        assert.equal(after.turn, 1);
    });

    test('calling it keeps you on one card', () => {
        const after = uno.act(position(), 0, { type: 'play', card: 'red-3-1', uno: true }, ctxAt());
        assert.deepEqual(ids(after.hands[0]), ['blue-9-1']);
        assert.match(after.message, /calls UNO/);
        assert.deepEqual(uno.view(after, 1, ctxAt()).handCounts, [1, 2]);
    });

    test('uno:true with more cards left changes nothing', () => {
        const s = arrange(newGame(2), { hands: [['red-3-1', 'blue-9-1', 'blue-8-1'], ['red-2-1']], top: 'red-7-1' });
        const after = uno.act(s, 0, { type: 'play', card: 'red-3-1', uno: true }, ctxAt());
        assert.equal(after.hands[0].length, 2);
    });
});

describe('timeouts', () => {
    test('nothing is due before the deadline', () => {
        const s = newGame(2);
        assert.equal(uno.tick(s, ctxAt(uno.deadline(s) - 1)), null);
    });

    test('a player who has not drawn draws one card and passes — even a playable card is not played for them', () => {
        const s = arrange(newGame(2), { hands: [['green-4-1', 'yellow-9-1'], ['red-2-1']], top: 'red-7-1', next: ['red-5-1'] });
        const timedOut = uno.tick(s, ctxAt(uno.deadline(s)));
        assert.ok(timedOut);
        assert.deepEqual(ids(timedOut.hands[0]), ['green-4-1', 'yellow-9-1', 'red-5-1']);
        assert.equal(timedOut.discard.at(-1).id, 'red-7-1', 'nothing was played');
        assert.equal(timedOut.turn, 1);
        assert.equal(uno.deadline(timedOut), uno.deadline(s) + 30_000);
        assert.match(timedOut.message, /ran out of time/);
    });

    test('a player who has already drawn just passes', () => {
        const s = arrange(newGame(2), { hands: [['green-4-1', 'yellow-9-1'], ['red-2-1']], top: 'red-7-1', next: ['red-5-1'] });
        const drawn = uno.act(s, 0, { type: 'draw' }, ctxAt());
        const timedOut = uno.tick(drawn, ctxAt(uno.deadline(drawn) + 500));
        assert.equal(timedOut.hands[0].length, 3);
        assert.equal(timedOut.turn, 1);
        assert.equal(timedOut.hasDrawn, false);
    });
});

describe('winning, places and resigning', () => {
    test('emptying your hand ends the game; the others are placed by fewest cards, ties together', () => {
        const s = arrange(newGame(4), {
            hands: [['red-3-1'], ['red-2-1', 'red-4-1', 'red-5-1'], ['blue-2-1'], ['blue-3-1', 'blue-4-1', 'blue-5-1']], top: 'red-7-1'
        });
        assert.equal(uno.outcome(s), null, 'no outcome while the game is on');
        const won = uno.act(s, 0, { type: 'play', card: 'red-3-1' }, ctxAt());
        assert.equal(won.status, 'finished');
        assert.deepEqual(uno.outcome(won), { places: [[0], [2], [1, 3]], reason: 'Asha played their last card' });
        assert.equal(uno.deadline(won), null);
        assert.equal(uno.tick(won, ctxAt(9e15)), null);
        const v = uno.view(won, 1, ctxAt());
        assert.equal(v.status, 'finished');
        assert.equal(v.turn, null);
        assert.equal(v.deadline, null);
        assert.deepEqual(v.outcome, uno.outcome(won));
        assert.deepEqual(v.playable, []);
        assert.throws(() => uno.act(won, 1, { type: 'draw' }, ctxAt()), isGameError(/over/));
    });

    test('a last Draw Two still makes the next player draw before the places are counted', () => {
        const s = arrange(newGame(3), { hands: [['red-draw2-1'], ['red-2-1'], ['blue-2-1', 'blue-3-1']], top: 'red-7-1' });
        const won = uno.act(s, 0, { type: 'play', card: 'red-draw2-1' }, ctxAt());
        assert.equal(won.hands[1].length, 3);
        assert.deepEqual(uno.outcome(won).places, [[0], [2], [1]]);
    });

    test('a resigned player\'s cards leave play, the turn moves on, and they place last', () => {
        const s = arrange(newGame(3), { hands: [['red-3-1', 'red-9-1'], ['red-2-1', 'red-4-1'], ['blue-2-1', 'blue-4-1', 'blue-5-1']], top: 'red-7-1' });
        const ctx = ctxAt();
        const r1 = uno.act(s, 1, { type: 'resign' }, ctx);
        assert.equal(r1.status, 'active');
        assert.equal(r1.turn, 0, 'resigning out of turn does not move the turn');
        assert.deepEqual(uno.view(r1, 0, ctx).handCounts, [2, 0, 3]);
        assert.deepEqual(uno.view(r1, 0, ctx).resigned, [false, true, false]);
        assert.equal(allCards(r1).length, 108);
        assert.throws(() => uno.act(r1, 1, { type: 'draw' }, ctx), isGameError(/resigned/));
        const played = uno.act(r1, 0, { type: 'play', card: 'red-3-1', uno: true }, ctx);
        assert.equal(played.turn, 2, 'the resigned seat is passed over');
        const drew = uno.act(played, 2, { type: 'draw' }, ctx); // seat 2 has nothing to play: draws
        const last = drew.turn === 0 ? drew : uno.act(drew, 2, { type: 'pass' }, ctx);
        const done = uno.act(last, 0, { type: 'play', card: 'red-9-1' }, ctx);
        assert.deepEqual(uno.outcome(done).places, [[0], [2], [1]]);
    });

    test('when the player to move resigns the next one gets the turn; when one player is left they win', () => {
        const s = newGame(3);
        const ctx = ctxAt(1_002_000);
        const r0 = uno.act(s, 0, { type: 'resign' }, ctx);
        assert.equal(r0.turn, 1);
        assert.equal(uno.deadline(r0), 1_002_000 + 30_000);
        const r2 = uno.act(r0, 2, { type: 'resign' }, ctx);
        assert.equal(r2.status, 'finished');
        assert.deepEqual(uno.outcome(r2).places, [[1], [2], [0]], 'the later resigner places above the earlier one');
        assert.match(uno.outcome(r2).reason, /Ravi/);
    });
});

describe('what a seat may see', () => {
    test('your own hand only: no other hand and no draw pile order anywhere in the view', () => {
        const s = newGame(3, {}, 11);
        const ctx = ctxAt();
        const v = uno.view(s, 0, ctx);
        const json = JSON.stringify(v);
        for (const card of [...s.hands[1], ...s.hands[2], ...s.drawPile]) {
            assert.equal(json.includes(`"${card.id}"`), false, `seat 0's view leaks ${card.id}`);
        }
        assert.deepEqual(ids(v.hand), ids(s.hands[0]));
        assert.deepEqual(v.handCounts, [7, 7, 7]);
        assert.equal(v.drawPileCount, s.drawPile.length);
        assert.equal(Object.hasOwn(v, 'drawPile'), false);
        assert.equal(Object.hasOwn(v, 'hands'), false);
    });

    test('the common contract fields', () => {
        const s = newGame(3);
        const v = uno.view(s, 1, ctxAt());
        assert.equal(v.game, 'uno');
        assert.equal(v.status, 'active');
        assert.equal(v.you, 1);
        assert.equal(v.turn, 0);
        assert.equal(v.deadline, uno.deadline(s));
        assert.equal(typeof v.message, 'string');
        assert.equal(v.outcome, null);
        assert.equal(v.seats.length, 3);
        for (const [i, seat] of v.seats.entries()) {
            assert.equal(seat.name, NAMES[i]);
            assert.equal(seat.side, i);
            assert.equal(seat.label, `Player ${i + 1}`);
            assert.match(seat.color, /^#[0-9a-f]{6}$/i);
            assert.equal(Object.hasOwn(seat, 'userId'), false);
        }
        assert.deepEqual(v.playable, [], 'nothing is playable when it is not your turn');
        assert.equal(v.canPass, false);
        assert.equal(v.canDraw, false);
        assert.equal(v.direction, 1);
        assert.ok(['red', 'yellow', 'green', 'blue'].includes(v.currentColor));
        assert.deepEqual(Object.keys(v.top).sort(), ['color', 'id', 'value']);
    });

    test('a spectator sees no hand at all', () => {
        const s = newGame(2);
        const v = uno.view(s, null, ctxAt());
        assert.equal(v.you, null);
        assert.equal(v.hand, null);
        const json = JSON.stringify(v);
        for (const card of [...s.hands.flat(), ...s.drawPile]) assert.equal(json.includes(`"${card.id}"`), false);
    });
});

describe('state handling', () => {
    test('act() and tick() never change the state they are given', () => {
        const s = arrange(newGame(3), { hands: [['red-3-1', 'wild4-1', 'blue-1-1'], ['red-2-1', 'red-1-1'], ['red-4-1', 'red-6-1']], top: 'red-7-1', next: ['red-5-1'] });
        const frozen = structuredClone(s);
        const ctx = ctxAt();
        uno.act(s, 0, { type: 'play', card: 'red-3-1' }, ctx);
        uno.act(s, 0, { type: 'play', card: 'wild4-1', color: 'blue' }, ctx);
        uno.act(s, 0, { type: 'draw' }, ctx);
        uno.act(s, 1, { type: 'resign' }, ctx);
        assert.throws(() => uno.act(s, 0, { type: 'pass' }, ctx));
        uno.tick(s, ctxAt(uno.deadline(s) + 1));
        assert.deepEqual(s, frozen);
    });

    test('whole games played at random survive a JSON round-trip at every step and always end', () => {
        for (let seed = 1; seed <= 25; seed++) {
            const players = 2 + (seed % 3);
            const pick = seeded(seed * 31);
            let now = 1_000_000;
            let s = uno.create(seatsFor(players), { handSize: 5 + (seed % 3), turnSeconds: 20 }, { now, rng: seeded(seed) });
            const rng = seeded(seed + 1000);
            let steps = 0;
            while (s.status === 'active') {
                assert.ok(++steps < 5000, `seed ${seed}: the game should finish`);
                s = JSON.parse(JSON.stringify(s));
                now += 1000;
                const ctx = { now, rng };
                const v = uno.view(s, s.turn, ctx);
                const roll = pick();
                let next;
                const stillIn = s.resigned.map((r, i) => (r ? -1 : i)).filter((i) => i >= 0);
                if (roll < 0.03) next = uno.tick(s, { now: uno.deadline(s), rng });
                else if (roll < 0.04 && stillIn.length > 2) next = uno.act(s, stillIn[Math.floor(pick() * stillIn.length)], { type: 'resign' }, ctx);
                else if (v.playable.length && roll < 0.9) {
                    const card = v.playable[Math.floor(pick() * v.playable.length)];
                    const wild = v.hand.find((c) => c.id === card).color === 'wild';
                    next = uno.act(s, s.turn, { type: 'play', card, uno: pick() < 0.8, ...(wild ? { color: ['red', 'yellow', 'green', 'blue'][Math.floor(pick() * 4)] } : {}) }, ctx);
                } else if (v.canDraw) next = uno.act(s, s.turn, { type: 'draw' }, ctx);
                else next = uno.act(s, s.turn, { type: 'pass' }, ctx);
                assert.equal(allCards(next).length, 108, `seed ${seed}: cards are conserved`);
                assert.equal(new Set(ids(allCards(next))).size, 108);
                s = next;
            }
            const out = uno.outcome(s);
            assert.ok(out && out.places.flat().length === players, `seed ${seed}: every side is placed`);
            assert.deepEqual(JSON.parse(JSON.stringify(out)), out);
        }
    });
});
