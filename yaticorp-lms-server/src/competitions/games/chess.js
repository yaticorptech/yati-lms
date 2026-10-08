/**
 * Chess, for Games & Competitions. Follows ./contract.js exactly.
 *
 * Seat 0 plays White and seat 1 plays Black; the side each seat plays for
 * comes from the seats array. The rules themselves — legality, check, mate,
 * stalemate, insufficient material, threefold repetition and the 50-move
 * rule — are chess.js's. This file adds what chess.js does not know about:
 * the clocks, draw offers, resignation, and the plain-JSON state the game
 * service stores.
 *
 * State keeps the FEN and the game's moves in SAN. Threefold repetition needs
 * every position the game has passed through, which a FEN alone does not
 * carry, so act() rebuilds the board by replaying the moves from the start.
 *
 * Clocks: each seat has `clocks[seat]` milliseconds left as of `turnStartedAt`,
 * when the side to move started thinking. Only the side to move loses time.
 * A move takes the time spent off the mover's clock and adds the increment.
 * White's clock starts when the game is created.
 */
const { Chess, DEFAULT_POSITION } = require('chess.js');
const { GameError, clone } = require('./contract');

const COLOR_NAMES = ['White', 'Black'];
const SEAT_COLORS = ['#f8fafc', '#0f172a'];
const PROMOTIONS = ['q', 'r', 'b', 'n'];
const SQUARE = /^[a-h][1-8]$/;
const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

const name = (seat) => COLOR_NAMES[seat];
const other = (seat) => 1 - seat;
const seatOfColor = (color) => (color === 'w' ? 0 : 1);

/** A whole number from `value`, kept inside [min, max]; `fallback` when it is not a number. */
const clampNumber = (value, fallback, min, max) => {
    const n = Number(value);
    if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
};

/** The seat whose move it is, read from the FEN. */
const moverOf = (state) => seatOfColor(state.fen.split(' ')[1]);

/** A board with every position of this game behind it, so repetition is counted. */
const rebuild = (state) => {
    const chess = new Chess(state.startFen || DEFAULT_POSITION);
    for (const san of state.history) chess.move(san);
    return chess;
};

/** Milliseconds the side to move has left at `now`. */
const timeLeft = (state, now) => {
    const mover = moverOf(state);
    return state.clocks[mover] - Math.max(0, now - state.turnStartedAt);
};

const place = (state, winnerSeat) => [[state.seats[winnerSeat].side], [state.seats[other(winnerSeat)].side]];
const drawPlaces = (state) => [[state.seats[0].side, state.seats[1].side]];

const finish = (state, outcome, message, now) => {
    state.status = 'finished';
    state.result = outcome;
    state.message = message;
    state.drawOffer = null;
    state.finishedAt = now;
    return state;
};

/**
 * Whether `color` could never mate, approximately: a lone king, or a king and
 * a single bishop or knight. Used only when the other side's flag falls.
 */
const cannotMate = (chess, color) => {
    const pieces = [];
    for (const row of chess.board()) {
        for (const sq of row) if (sq && sq.color === color && sq.type !== 'k') pieces.push(sq.type);
    }
    return pieces.length === 0 || (pieces.length === 1 && (pieces[0] === 'b' || pieces[0] === 'n'));
};

const assertSeat = (state, seat) => {
    if (seat !== 0 && seat !== 1) throw new GameError('You are not playing in this game.');
    if (state.status !== 'active') throw new GameError('The game is over.');
};

const assertClockRunning = (state, seat, now) => {
    if (timeLeft(state, now) > 0) return;
    const mover = moverOf(state);
    throw new GameError(seat === mover ? 'Your clock has run out.' : `${name(mover)}'s clock has run out.`);
};

/** After a move: the result, if the position ends the game. */
const resultAfterMove = (state, chess, mover) => {
    if (chess.isCheckmate()) return { places: place(state, mover), reason: 'Checkmate' };
    if (chess.isStalemate()) return { places: drawPlaces(state), reason: 'Stalemate — a draw' };
    if (chess.isInsufficientMaterial()) return { places: drawPlaces(state), reason: 'Draw — not enough pieces to mate' };
    if (chess.isThreefoldRepetition()) return { places: drawPlaces(state), reason: 'Draw by threefold repetition' };
    if (chess.isDrawByFiftyMoves()) return { places: drawPlaces(state), reason: 'Draw by the 50-move rule' };
    return null;
};

const applyMove = (state, seat, action, now) => {
    const mover = moverOf(state);
    if (seat !== mover) throw new GameError(`It is ${name(mover)}'s turn.`);

    const from = typeof action.from === 'string' ? action.from.toLowerCase() : '';
    const to = typeof action.to === 'string' ? action.to.toLowerCase() : '';
    if (!SQUARE.test(from) || !SQUARE.test(to)) throw new GameError('That move is not legal.');
    let promotion = null;
    if (action.promotion !== undefined && action.promotion !== null && action.promotion !== '') {
        promotion = String(action.promotion).toLowerCase();
        if (!PROMOTIONS.includes(promotion)) throw new GameError('A pawn can only become a queen, rook, bishop or knight.');
    }

    const chess = rebuild(state);
    const piece = chess.get(from);
    if (!piece) throw new GameError(`There is no piece on ${from}.`);
    if (seatOfColor(piece.color) !== seat) throw new GameError(`The ${PIECE_NAMES[piece.type]} on ${from} is not yours.`);

    const candidates = chess.moves({ square: from, verbose: true }).filter((m) => m.to === to);
    if (!candidates.length) {
        throw new GameError(chess.inCheck() ? 'That move is not legal — your king is in check.' : 'That move is not legal.');
    }
    const isPromotion = candidates.some((m) => m.promotion);
    const chosen = isPromotion
        ? candidates.find((m) => m.promotion === (promotion || 'q'))
        : candidates[0];
    const played = chess.move({ from: chosen.from, to: chosen.to, ...(chosen.promotion ? { promotion: chosen.promotion } : {}) });

    const elapsed = Math.max(0, now - state.turnStartedAt);
    state.clocks[seat] = state.clocks[seat] - elapsed + state.incrementMs;
    state.turnStartedAt = now;
    state.fen = chess.fen();
    state.history.push(played.san);
    state.lastMove = { from: played.from, to: played.to };
    // A move answers any offer the opponent made: it is declined by playing on.
    if (state.drawOffer === other(seat)) state.drawOffer = null;
    state.offerBlocked[seat] = false;
    state.message = `${name(seat)} played ${played.san}.`;

    const result = resultAfterMove(state, chess, seat);
    if (result) {
        const verb = result.reason === 'Checkmate' ? `${name(seat)} played ${played.san} — checkmate.` : `${name(seat)} played ${played.san}. ${result.reason}.`;
        finish(state, result, verb, now);
    }
    return state;
};

const engine = {
    id: 'chess',
    label: 'Chess',
    emoji: '♟️',
    minSeats: 2,
    maxSeats: 2,
    seatsPerSide: { min: 1, max: 1 },
    summary: 'Classic chess on a clock: checkmate the other king before your time runs out.',

    create(seats, options = {}, ctx) {
        if (!Array.isArray(seats) || seats.length !== 2) throw new GameError('Chess needs exactly two players.');
        const opts = options || {};
        const clockMinutes = clampNumber(opts.clockMinutes, 10, 1, 60);
        const incrementSeconds = clampNumber(opts.incrementSeconds, 0, 0, 60);
        const clockMs = Math.round(clockMinutes * 60000);
        return {
            seats: seats.map((s) => ({ userId: String(s.userId ?? ''), name: String(s.name ?? ''), side: s.side })),
            startFen: DEFAULT_POSITION,
            fen: DEFAULT_POSITION,
            history: [],
            lastMove: null,
            clockMinutes,
            incrementSeconds,
            incrementMs: Math.round(incrementSeconds * 1000),
            clocks: [clockMs, clockMs],
            turnStartedAt: ctx.now,
            drawOffer: null,
            offerBlocked: [false, false],
            status: 'active',
            result: null,
            message: 'White to move.',
            createdAt: ctx.now,
            finishedAt: null
        };
    },

    view(state, seat, ctx) {
        const you = seat === 0 || seat === 1 ? seat : null;
        const active = state.status === 'active';
        const mover = moverOf(state);
        const chess = new Chess(state.fen);
        const clocks = { 0: state.clocks[0], 1: state.clocks[1] };
        if (active) clocks[mover] = Math.max(0, timeLeft(state, ctx.now));

        const view = {
            game: engine.id,
            status: state.status,
            you,
            turn: active ? mover : null,
            deadline: engine.deadline(state),
            seats: state.seats.map((s, i) => ({ name: s.name, side: s.side, label: COLOR_NAMES[i], color: SEAT_COLORS[i] })),
            message: state.message,
            outcome: engine.outcome(state),

            fen: state.fen,
            board: chess.board().map((row) => row.map((sq) => (sq ? { type: sq.type, color: sq.color } : null))),
            lastMove: state.lastMove ? { ...state.lastMove } : null,
            inCheck: chess.inCheck(),
            history: [...state.history],
            clocks,
            clock: { minutes: state.clockMinutes, incrementSeconds: state.incrementSeconds },
            drawOffer: state.drawOffer,
            canOfferDraw: active && you !== null && state.drawOffer === null && !state.offerBlocked[you],
            legalMoves: []
        };
        if (active && you !== null && you === mover) {
            view.legalMoves = chess.moves({ verbose: true }).map((m) => (m.promotion
                ? { from: m.from, to: m.to, promotion: m.promotion }
                : { from: m.from, to: m.to }));
        }
        return view;
    },

    act(input, seat, action, ctx) {
        const state = clone(input);
        const now = ctx.now;
        assertSeat(state, seat);
        // A flag that has fallen ends the game at the next tick(), whatever
        // anyone does in between.
        assertClockRunning(state, seat, now);
        const type = action && action.type;

        switch (type) {
            case 'move':
                return applyMove(state, seat, action, now);

            case 'resign':
                return finish(state, { places: place(state, other(seat)), reason: `${name(seat)} resigned` }, `${name(seat)} resigned.`, now);

            case 'offer-draw':
                if (state.drawOffer === seat) throw new GameError('You have already offered a draw.');
                if (state.drawOffer === other(seat)) throw new GameError(`${name(other(seat))} has already offered a draw — accept or decline it.`);
                if (state.offerBlocked[seat]) throw new GameError('Your draw offer was declined. Make a move before offering again.');
                state.drawOffer = seat;
                state.message = `${name(seat)} offers a draw.`;
                return state;

            case 'accept-draw':
                if (state.drawOffer !== other(seat)) throw new GameError('There is no draw offer to accept.');
                return finish(state, { places: drawPlaces(state), reason: 'Draw agreed' }, `${name(seat)} accepted the draw.`, now);

            case 'decline-draw':
                if (state.drawOffer !== other(seat)) throw new GameError('There is no draw offer to decline.');
                state.drawOffer = null;
                state.offerBlocked[other(seat)] = true;
                state.message = `${name(seat)} declined the draw.`;
                return state;

            default:
                throw new GameError('That is not something you can do in chess.');
        }
    },

    tick(input, ctx) {
        if (input.status !== 'active') return null;
        if (timeLeft(input, ctx.now) > 0) return null;
        const state = clone(input);
        const flagged = moverOf(state);
        const winner = other(flagged);
        state.clocks[flagged] = 0;
        state.turnStartedAt = ctx.now;
        const winnerColor = winner === 0 ? 'w' : 'b';
        if (cannotMate(new Chess(state.fen), winnerColor)) {
            const reason = `Draw — ${name(flagged)} ran out of time, but ${name(winner)} cannot mate`;
            return finish(state, { places: drawPlaces(state), reason }, `${reason}.`, ctx.now);
        }
        const reason = `${name(flagged)} ran out of time`;
        return finish(state, { places: place(state, winner), reason }, `${reason}.`, ctx.now);
    },

    deadline(state) {
        if (state.status !== 'active') return null;
        return state.turnStartedAt + state.clocks[moverOf(state)];
    },

    outcome(state) {
        if (state.status !== 'finished' || !state.result) return null;
        return { places: state.result.places.map((g) => [...g]), reason: state.result.reason };
    }
};

module.exports = engine;
