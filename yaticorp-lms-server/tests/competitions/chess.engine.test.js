/**
 * The chess engine on its own: no database, no server. Every act() here is fed
 * state that has been through JSON, the way the game service stores it, so a
 * rule that only works while the state is still a live object fails here.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { Chess } = require('chess.js');
const chess = require('../../src/competitions/games/chess');

const SEATS = [{ userId: 'u-white', name: 'Asha', side: 0 }, { userId: 'u-black', name: 'Bilal', side: 1 }];
const ctxAt = (now) => ({ now, rng: () => 0.5 });
const roundTrip = (state) => JSON.parse(JSON.stringify(state));
const deepFreeze = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };

const newGame = (options = {}, seats = SEATS) => chess.create(seats, options, ctxAt(0));

/** The move a SAN string names, as the action a player's browser sends. */
const moveFor = (state, san) => {
    const m = new Chess(state.fen).move(san);
    return { type: 'move', from: m.from, to: m.to, ...(m.promotion ? { promotion: m.promotion } : {}) };
};

/** Plays SAN moves one act() at a time, a second apart, through JSON each time. */
const play = (state, sans, { start = 0, step = 1000 } = {}) => {
    let s = state;
    let now = start;
    sans.forEach((san, i) => {
        now += step;
        const seat = (s.fen.split(' ')[1] === 'w') ? 0 : 1;
        s = roundTrip(chess.act(roundTrip(s), seat, moveFor(s, san), ctxAt(now)));
        assert.equal(s.history.length, state.history.length + i + 1);
    });
    return s;
};

const throwsGame = (fn, message) => assert.throws(fn, (e) => {
    assert.equal(e.name, 'GameError');
    assert.equal(e.status, 400);
    assert.equal(e.message, message);
    return true;
});

describe('the chess engine', () => {
    test('describes itself the way the contract asks', () => {
        assert.equal(chess.id, 'chess');
        assert.equal(chess.label, 'Chess');
        assert.equal(chess.emoji, '♟️');
        assert.equal(chess.minSeats, 2);
        assert.equal(chess.maxSeats, 2);
        assert.deepEqual(chess.seatsPerSide, { min: 1, max: 1 });
        assert.equal(typeof chess.summary, 'string');
        for (const fn of ['create', 'view', 'act', 'tick', 'deadline', 'outcome']) assert.equal(typeof chess[fn], 'function');
    });

    test('needs exactly two seats, and keeps the clock options within bounds', () => {
        throwsGame(() => chess.create([SEATS[0]], {}, ctxAt(0)), 'Chess needs exactly two players.');
        assert.equal(newGame().clocks[0], 10 * 60000, 'ten minutes by default');
        assert.equal(newGame({ clockMinutes: 999 }).clocks[1], 60 * 60000);
        assert.equal(newGame({ clockMinutes: 0 }).clocks[0], 60000);
        assert.equal(newGame({ clockMinutes: 'soon' }).clocks[0], 10 * 60000);
        assert.equal(newGame({ incrementSeconds: 5 }).incrementMs, 5000);
        const state = newGame();
        assert.deepEqual(roundTrip(state), state, 'state is plain JSON');
        assert.equal(chess.outcome(state), null);
        assert.equal(chess.deadline(state), 10 * 60000);
    });

    test('a legal move is played and the turn passes to Black', () => {
        const state = newGame();
        const next = chess.act(state, 0, { type: 'move', from: 'e2', to: 'e4' }, ctxAt(3000));
        assert.deepEqual(next.history, ['e4']);
        assert.deepEqual(next.lastMove, { from: 'e2', to: 'e4' });
        assert.match(next.fen, /^rnbqkbnr\/pppppppp\/8\/8\/4P3\/8\/PPPP1PPP\/RNBQKBNR b /);
        assert.equal(next.message, 'White played e4.');
        const view = chess.view(next, 1, ctxAt(3000));
        assert.equal(view.turn, 1);
        assert.equal(view.board[4][4].type, 'p');
        assert.equal(view.board[6][4], null);
    });

    test('an illegal move, a move out of turn and a move of the other side\'s piece are refused with a sentence', () => {
        const state = newGame();
        throwsGame(() => chess.act(state, 0, { type: 'move', from: 'e2', to: 'e5' }, ctxAt(1000)), 'That move is not legal.');
        throwsGame(() => chess.act(state, 1, { type: 'move', from: 'e7', to: 'e5' }, ctxAt(1000)), 'It is White\'s turn.');
        throwsGame(() => chess.act(state, 0, { type: 'move', from: 'e7', to: 'e5' }, ctxAt(1000)), 'The pawn on e7 is not yours.');
        throwsGame(() => chess.act(state, 0, { type: 'move', from: 'e4', to: 'e5' }, ctxAt(1000)), 'There is no piece on e4.');
        throwsGame(() => chess.act(state, 0, { type: 'move', from: 'z9', to: 'e5' }, ctxAt(1000)), 'That move is not legal.');
        throwsGame(() => chess.act(state, 2, { type: 'move', from: 'e2', to: 'e4' }, ctxAt(1000)), 'You are not playing in this game.');
        throwsGame(() => chess.act(state, null, { type: 'resign' }, ctxAt(1000)), 'You are not playing in this game.');
        throwsGame(() => chess.act(state, 0, { type: 'castle-twice' }, ctxAt(1000)), 'That is not something you can do in chess.');
        const afterE4 = chess.act(state, 0, { type: 'move', from: 'e2', to: 'e4' }, ctxAt(1000));
        throwsGame(() => chess.act(afterE4, 0, { type: 'move', from: 'd2', to: 'd4' }, ctxAt(2000)), 'It is Black\'s turn.');
    });

    test('fool\'s mate: checkmate, and the places name the SIDES, not the seats', () => {
        // White's seat plays for side 1 here, Black's for side 0.
        const seats = [{ userId: 'a', name: 'A', side: 1 }, { userId: 'b', name: 'B', side: 0 }];
        const state = play(newGame({}, seats), ['f3', 'e5', 'g4', 'Qh4#']);
        assert.equal(state.status, 'finished');
        assert.deepEqual(chess.outcome(state), { places: [[0], [1]], reason: 'Checkmate' });
        assert.equal(state.message, 'Black played Qh4# — checkmate.');
        assert.equal(chess.deadline(state), null);
        assert.equal(chess.tick(state, ctxAt(10 ** 9)), null);
        const view = chess.view(state, 0, ctxAt(5000));
        assert.equal(view.status, 'finished');
        assert.equal(view.turn, null);
        assert.equal(view.inCheck, true);
        assert.deepEqual(view.legalMoves, []);
        assert.deepEqual(view.outcome, { places: [[0], [1]], reason: 'Checkmate' });
        throwsGame(() => chess.act(state, 0, { type: 'move', from: 'e2', to: 'e4' }, ctxAt(6000)), 'The game is over.');
        throwsGame(() => chess.act(state, 0, { type: 'resign' }, ctxAt(6000)), 'The game is over.');
    });

    test('stalemate is a draw (Loyd\'s ten-move stalemate)', () => {
        const state = play(newGame(), ['e3', 'a5', 'Qh5', 'Ra6', 'Qxa5', 'h5', 'h4', 'Rah6', 'Qxc7', 'f6', 'Qxd7+', 'Kf7',
            'Qxb7', 'Qd3', 'Qxb8', 'Qh7', 'Qxc8', 'Kg6', 'Qe6']);
        assert.deepEqual(chess.outcome(state), { places: [[0, 1]], reason: 'Stalemate — a draw' });
    });

    test('a pawn reaching the last rank becomes a queen unless another piece is asked for', () => {
        const before = play(newGame(), ['a4', 'b5', 'axb5', 'a6', 'bxa6', 'Bb7', 'axb7', 'Nc6']);
        const view = chess.view(before, 0, ctxAt(9000));
        const promos = view.legalMoves.filter((m) => m.from === 'b7' && m.to === 'a8').map((m) => m.promotion).sort();
        assert.deepEqual(promos, ['b', 'n', 'q', 'r'], 'every promotion is offered to the client');

        const queen = chess.act(roundTrip(before), 0, { type: 'move', from: 'b7', to: 'a8' }, ctxAt(9000));
        assert.equal(queen.history.at(-1), 'bxa8=Q');
        assert.deepEqual(chess.view(queen, 1, ctxAt(9000)).board[0][0], { type: 'q', color: 'w' });

        const knight = chess.act(roundTrip(before), 0, { type: 'move', from: 'b7', to: 'b8', promotion: 'n' }, ctxAt(9000));
        assert.equal(knight.history.at(-1), 'b8=N');
        assert.deepEqual(chess.view(knight, 1, ctxAt(9000)).board[0][1], { type: 'n', color: 'w' });

        throwsGame(() => chess.act(before, 0, { type: 'move', from: 'b7', to: 'b8', promotion: 'k' }, ctxAt(9000)),
            'A pawn can only become a queen, rook, bishop or knight.');
    });

    test('threefold repetition is caught across separate act() calls with JSON in between', () => {
        const shuffle = ['Nf3', 'Nf6', 'Ng1', 'Ng8'];
        const twice = play(newGame(), [...shuffle, ...shuffle.slice(0, 3)]);
        assert.equal(twice.status, 'active', 'the starting position has been seen only twice so far');
        const thrice = play(twice, ['Ng8'], { start: 7000 });
        assert.equal(thrice.status, 'finished');
        assert.deepEqual(chess.outcome(thrice), { places: [[0, 1]], reason: 'Draw by threefold repetition' });
    });

    test('the 50-move rule and bare kings end the game as draws', () => {
        // A game set up from a position; only the engine's own fields are used.
        const fromPosition = (fen) => ({ ...newGame(), startFen: fen, fen });
        const fifty = play(fromPosition('4k3/8/8/8/8/8/4R3/4K3 w - - 99 80'), ['Ra2']);
        assert.deepEqual(chess.outcome(fifty), { places: [[0, 1]], reason: 'Draw by the 50-move rule' });
        const bare = play(fromPosition('4k3/8/8/8/8/8/3r4/4K3 w - - 0 40'), ['Kxd2']);
        assert.deepEqual(chess.outcome(bare), { places: [[0, 1]], reason: 'Draw — not enough pieces to mate' });
    });

    test('clocks: the side to move loses time, increments are added, and tick() drops the flag', () => {
        let state = newGame({ clockMinutes: 1, incrementSeconds: 2 });
        assert.equal(chess.deadline(state), 60000);
        assert.equal(chess.view(state, 1, ctxAt(15000)).clocks[0], 45000, 'White\'s clock runs from the start');
        assert.equal(chess.view(state, 1, ctxAt(15000)).clocks[1], 60000);

        state = roundTrip(chess.act(state, 0, { type: 'move', from: 'e2', to: 'e4' }, ctxAt(10000)));
        assert.equal(state.clocks[0], 52000, '60s − 10s thinking + 2s increment');
        assert.equal(chess.deadline(state), 10000 + 60000, 'now Black\'s clock runs');
        const view = chess.view(state, 0, ctxAt(30000));
        assert.deepEqual(view.clocks, { 0: 52000, 1: 40000 });

        assert.equal(chess.tick(state, ctxAt(69999)), null, 'nothing due a millisecond early');
        throwsGame(() => chess.act(state, 1, { type: 'move', from: 'e7', to: 'e5' }, ctxAt(70000)), 'Your clock has run out.');
        const flagged = chess.tick(state, ctxAt(70000));
        assert.equal(flagged.status, 'finished');
        assert.deepEqual(chess.outcome(flagged), { places: [[0], [1]], reason: 'Black ran out of time' });
        assert.equal(chess.view(flagged, null, ctxAt(99999)).clocks[1], 0);
        assert.equal(chess.deadline(flagged), null);
        assert.equal(chess.tick(flagged, ctxAt(99999)), null);
    });

    test('running out of time is a draw when the other side has nothing to mate with', () => {
        const base = newGame({ clockMinutes: 1 });
        const fen = '7k/7r/8/8/8/8/8/KN6 b - - 0 50';
        const state = { ...base, startFen: fen, fen };
        const flagged = chess.tick(state, ctxAt(60000));
        assert.deepEqual(flagged.result.places, [[0, 1]]);
        assert.match(flagged.result.reason, /^Draw — Black ran out of time/);
    });

    test('resigning hands the win to the other side, on either player\'s turn', () => {
        const state = chess.act(newGame(), 1, { type: 'resign' }, ctxAt(500));
        assert.deepEqual(chess.outcome(state), { places: [[0], [1]], reason: 'Black resigned' });
        const white = chess.act(newGame(), 0, { type: 'resign' }, ctxAt(500));
        assert.deepEqual(chess.outcome(white), { places: [[1], [0]], reason: 'White resigned' });
    });

    test('draw offers: offered, accepted, declined, and cleared by the opponent\'s move', () => {
        let state = roundTrip(chess.act(newGame(), 0, { type: 'offer-draw' }, ctxAt(1000)));
        assert.equal(state.drawOffer, 0);
        assert.equal(chess.view(state, 1, ctxAt(1000)).drawOffer, 0);
        throwsGame(() => chess.act(state, 0, { type: 'offer-draw' }, ctxAt(1000)), 'You have already offered a draw.');
        throwsGame(() => chess.act(state, 0, { type: 'accept-draw' }, ctxAt(1000)), 'There is no draw offer to accept.');

        const agreed = chess.act(state, 1, { type: 'accept-draw' }, ctxAt(2000));
        assert.deepEqual(chess.outcome(agreed), { places: [[0, 1]], reason: 'Draw agreed' });

        // The offerer's own move leaves the offer standing; the opponent's move clears it.
        state = roundTrip(chess.act(state, 0, { type: 'move', from: 'e2', to: 'e4' }, ctxAt(3000)));
        assert.equal(state.drawOffer, 0);
        state = roundTrip(chess.act(state, 1, { type: 'move', from: 'e7', to: 'e5' }, ctxAt(4000)));
        assert.equal(state.drawOffer, null);

        state = roundTrip(chess.act(state, 1, { type: 'offer-draw' }, ctxAt(5000)));
        assert.equal(chess.view(state, 0, ctxAt(5000)).canOfferDraw, false);
        state = roundTrip(chess.act(state, 0, { type: 'decline-draw' }, ctxAt(6000)));
        assert.equal(state.drawOffer, null);
        assert.equal(state.message, 'White declined the draw.');
        throwsGame(() => chess.act(state, 1, { type: 'offer-draw' }, ctxAt(7000)), 'Your draw offer was declined. Make a move before offering again.');
        throwsGame(() => chess.act(state, 0, { type: 'decline-draw' }, ctxAt(7000)), 'There is no draw offer to decline.');
    });

    test('view(): the common fields, the board from White\'s side, and legal moves only for the player to move', () => {
        const state = newGame();
        const white = chess.view(state, 0, ctxAt(0));
        for (const key of ['game', 'status', 'you', 'turn', 'deadline', 'seats', 'message', 'outcome']) assert.ok(key in white, key);
        assert.equal(white.game, 'chess');
        assert.equal(white.you, 0);
        assert.equal(white.turn, 0);
        assert.deepEqual(white.seats, [
            { name: 'Asha', side: 0, label: 'White', color: '#f8fafc' },
            { name: 'Bilal', side: 1, label: 'Black', color: '#0f172a' }
        ]);
        assert.equal(white.board.length, 8);
        assert.ok(white.board.every((row) => row.length === 8));
        assert.deepEqual(white.board[0][0], { type: 'r', color: 'b' }, 'a8 first');
        assert.deepEqual(white.board[7][4], { type: 'k', color: 'w' }, 'e1');
        assert.equal(white.legalMoves.length, 20);
        assert.ok(white.legalMoves.some((m) => m.from === 'g1' && m.to === 'f3'));
        assert.equal(white.inCheck, false);
        assert.deepEqual(white.history, []);
        assert.equal(white.drawOffer, null);

        assert.deepEqual(chess.view(state, 1, ctxAt(0)).legalMoves, [], 'not Black\'s turn');
        const spectator = chess.view(state, null, ctxAt(0));
        assert.equal(spectator.you, null);
        assert.deepEqual(spectator.legalMoves, []);
        assert.equal(spectator.canOfferDraw, false);
        assert.ok(!JSON.stringify(spectator).includes('u-white'), 'user ids stay on the server');
    });

    test('view() and tick() never change the state they are given', () => {
        const state = deepFreeze(roundTrip(play(newGame({ clockMinutes: 1 }), ['e4', 'e5'])));
        const before = JSON.stringify(state);
        chess.view(state, 0, ctxAt(4000));
        chess.view(state, null, ctxAt(4000));
        chess.tick(state, ctxAt(4000));
        chess.tick(state, ctxAt(10 ** 7));
        assert.equal(JSON.stringify(state), before);
    });

    test('act() never changes the state it is given', () => {
        const state = deepFreeze(roundTrip(play(newGame(), ['e4'])));
        const before = JSON.stringify(state);
        const after = chess.act(state, 1, { type: 'move', from: 'e7', to: 'e5' }, ctxAt(5000));
        chess.act(state, 1, { type: 'offer-draw' }, ctxAt(5000));
        chess.act(state, 0, { type: 'resign' }, ctxAt(5000));
        assert.equal(JSON.stringify(state), before);
        assert.notEqual(after, state);
        assert.deepEqual(after.history, ['e4', 'e5']);
        assert.deepEqual(state.history, ['e4']);
    });
});
