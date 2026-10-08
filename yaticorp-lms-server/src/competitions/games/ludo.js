/**
 * Ludo — classic rules, 2 to 4 players, one colour each.
 *
 * Follows ./contract.js. Every dice roll comes from ctx.rng and every time from
 * ctx.now, so a test can replay a game exactly.
 *
 * Colours, in board order (clockwise): Red, Green, Yellow, Blue. Two players
 * sit opposite each other as Red and Yellow; three are Red, Green and Yellow.
 *
 * A token's position is its `steps` from its own colour's start square:
 *   -1        in the yard
 *    0 … 50   on the shared 52-square track (0 is the colour's start square)
 *   51 … 55   in the colour's own home column
 *   56        home, in the centre (FINISH)
 * That is 51 track squares and then six moves up the home column into the
 * centre — the five coloured squares of a standard 15x15 board, then home.
 *
 * The board, as [row, col] on the 15x15 grid (row 0 at the top), is drawn
 * with Red's yard bottom-left, Green's top-left, Yellow's top-right and Blue's
 * bottom-right; tokens run clockwise. view() gives each token's cell on that
 * grid so the table never has to know the track.
 *
 * Actions:
 *   { type: 'roll' }               on your turn, before moving
 *   { type: 'move', token: index } after rolling; index into your tokens
 *   { type: 'resign' }             any time; your tokens leave the board
 *
 * The game ends as soon as one player has every token home. The others are
 * placed by how far their tokens have travelled; anyone who resigned is last.
 */
const { GameError, clone } = require('./contract');

const COLOURS = [
    { label: 'Red', color: '#dc2626' },
    { label: 'Green', color: '#16a34a' },
    { label: 'Yellow', color: '#eab308' },
    { label: 'Blue', color: '#2563eb' }
];
/** Which colours a table of n players uses: opposite corners for two. */
const COLOURS_FOR = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };

const TRACK_SQUARES = 52;
const LAST_TRACK_STEP = 50;
const FINISH = 56;

/** The shared track, clockwise, starting at Red's start square. Colour c starts at index 13c. */
const TRACK = [
    [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
    [7, 0],
    [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 7],
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    [7, 14],
    [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    [14, 7],
    [14, 6]
];
/** Each colour's five home-column squares, in the order a token climbs them. */
const HOME_COLUMN = [
    [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]]
];
/** Top-left cell of each colour's 6x6 yard, and the four token spots inside it. */
const YARD_ORIGIN = [[9, 0], [0, 0], [0, 9], [9, 9]];
const YARD_SPOTS = [[1, 1], [1, 4], [4, 1], [4, 4]];
const CENTRE = [7, 7];
/** The four start squares and the four stars (eight squares past each start). No captures here. */
const SAFE = [0, 8, 13, 21, 26, 34, 39, 47];

const ALL_HOME = { 2: 'both tokens', 3: 'all three tokens', 4: 'all four tokens' };

const clampInt = (value, min, max, fallback) => {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
};

const labelOf = (state, seat) => COLOURS[state.colours[seat]].label;
const activeSeats = (state) => state.seats.map((_, i) => i).filter((i) => !state.resigned[i]);
/** Where on the shared track a token is, or null when it is not on the track. */
const trackIndex = (colour, steps) => (steps >= 0 && steps <= LAST_TRACK_STEP ? (colour * 13 + steps) % TRACK_SQUARES : null);

const cellOf = (colour, steps, token) => {
    if (steps < 0) {
        const [r, c] = YARD_ORIGIN[colour];
        const [dr, dc] = YARD_SPOTS[token % YARD_SPOTS.length];
        return [r + dr, c + dc];
    }
    if (steps <= LAST_TRACK_STEP) return [...TRACK[trackIndex(colour, steps)]];
    if (steps < FINISH) return [...HOME_COLUMN[colour][steps - LAST_TRACK_STEP - 1]];
    return [...CENTRE];
};

/** Where a token would land with this roll, or null when it cannot move. */
const target = (from, dice) => {
    if (from >= FINISH) return null;
    if (from < 0) return dice === 6 ? 0 : null;
    return from + dice <= FINISH ? from + dice : null;
};

const legalMoves = (state, seat, dice) => state.tokens[seat]
    .map((from, token) => (target(from, dice) === null ? null : token))
    .filter((token) => token !== null);

/** The opponents' tokens a token of `seat` would send home by landing on `steps`: lone tokens only, never on a safe square. */
const victimsAt = (state, seat, steps) => {
    const at = trackIndex(state.colours[seat], steps);
    if (at === null || SAFE.includes(at)) return [];
    const victims = [];
    state.tokens.forEach((list, other) => {
        if (other === seat || state.resigned[other]) return;
        const here = [];
        list.forEach((s, token) => { if (trackIndex(state.colours[other], s) === at) here.push(token); });
        if (here.length === 1) victims.push({ seat: other, token: here[0] });
    });
    return victims;
};

const progress = (state, seat) => state.tokens[seat].reduce((sum, s) => sum + Math.max(0, s), 0);

const startTurn = (state, seat, ctx) => {
    state.turn = seat;
    state.rolled = false;
    state.sixesInRow = 0;
    state.deadline = ctx.now + state.turnSeconds * 1000;
};
const nextSeat = (state, from) => {
    const n = state.seats.length;
    for (let k = 1; k <= n; k++) {
        const seat = (from + k) % n;
        if (!state.resigned[seat]) return seat;
    }
    return from;
};

/** Ends the game. `winner` is the seat that got home, or the last one left. */
const finish = (state, winner, reason) => {
    const placed = [[winner]];
    const rest = state.seats.map((_, i) => i).filter((i) => i !== winner && !state.resigned[i]);
    const byProgress = new Map();
    for (const seat of rest) {
        const p = progress(state, seat);
        if (!byProgress.has(p)) byProgress.set(p, []);
        byProgress.get(p).push(seat);
    }
    [...byProgress.keys()].sort((a, b) => b - a).forEach((p) => placed.push(byProgress.get(p)));
    // The last to resign places above those who gave up earlier.
    [...state.resignOrder].reverse().forEach((seat) => placed.push([seat]));

    const seen = new Set();
    const places = placed
        .map((group) => group.map((seat) => state.seats[seat].side).filter((side) => !seen.has(side) && seen.add(side)))
        .filter((group) => group.length);

    state.status = 'finished';
    state.turn = null;
    state.rolled = false;
    state.deadline = null;
    state.winner = winner;
    state.result = { places, reason };
};

/** Rolls for the seat on turn. Passes the turn when the roll cannot be used. */
const roll = (state, ctx) => {
    const seat = state.turn;
    const me = labelOf(state, seat);
    const dice = Math.min(6, Math.max(1, 1 + Math.floor(ctx.rng() * 6)));
    state.dice = dice;
    state.diceBy = seat;
    state.rollCount += 1;
    state.sixesInRow = dice === 6 ? state.sixesInRow + 1 : 0;

    if (state.sixesInRow >= 3) {
        state.message = `${me} rolled a third 6 in a row and loses the turn`;
        startTurn(state, nextSeat(state, seat), ctx);
        return;
    }
    if (!legalMoves(state, seat, dice).length) {
        state.message = `${me} rolled a ${dice} and cannot move`;
        startTurn(state, nextSeat(state, seat), ctx);
        return;
    }
    state.rolled = true;
    state.deadline = ctx.now + state.turnSeconds * 1000;
    state.message = `${me} rolled a ${dice}`;
};

/** Moves one token of the seat on turn by the dice already rolled. The move must be legal. */
const move = (state, token, ctx) => {
    const seat = state.turn;
    const me = labelOf(state, seat);
    const dice = state.dice;
    const from = state.tokens[seat][token];
    const to = target(from, dice);
    const victims = victimsAt(state, seat, to);

    state.tokens[seat][token] = to;
    for (const v of victims) state.tokens[v.seat][v.token] = -1;
    state.lastMove = { seat, token, from, to, captured: victims };
    state.rolled = false;

    if (to === FINISH && state.tokens[seat].every((s) => s === FINISH)) {
        const reason = `${me} got ${ALL_HOME[state.tokensPerPlayer] || 'every token'} home`;
        state.message = reason;
        finish(state, seat, reason);
        return;
    }

    if (victims.length) {
        const whose = [...new Set(victims.map((v) => labelOf(state, v.seat)))];
        state.message = `${me} captured ${whose.join("'s and ")}'s token${victims.length > 1 ? 's' : ''} and goes again`;
    } else if (to === FINISH) {
        state.message = `${me} got a token home and goes again`;
    } else if (from < 0) {
        state.message = `${me} brought a token out and goes again`;
    } else if (dice === 6) {
        state.message = `${me} rolled a 6 and goes again`;
    } else {
        state.message = `${me} moved ${dice}`;
    }

    if (dice === 6 || victims.length || to === FINISH) state.deadline = ctx.now + state.turnSeconds * 1000;
    else startTurn(state, nextSeat(state, seat), ctx);
};

/** The move a player who ran out of time makes: a capture first, then the token furthest along. */
const autoPick = (state, seat) => legalMoves(state, seat, state.dice)
    .map((token) => {
        const from = state.tokens[seat][token];
        return { token, from, captures: victimsAt(state, seat, target(from, state.dice)).length > 0 };
    })
    .sort((a, b) => (Number(b.captures) - Number(a.captures)) || (b.from - a.from) || (a.token - b.token))[0].token;

const engine = {
    id: 'ludo',
    label: 'Ludo',
    emoji: '🎲',
    minSeats: 2,
    maxSeats: 4,
    seatsPerSide: { min: 1, max: 1 },
    summary: 'Roll a 6 to bring a token out, send rivals back to their yard, and race all your tokens home.',

    create(seats, options, ctx) {
        if (!Array.isArray(seats) || seats.length < 2 || seats.length > 4) throw new GameError('Ludo needs 2 to 4 players.');
        const opts = options || {};
        const tokensPerPlayer = clampInt(opts.tokensPerPlayer, 2, 4, 4);
        const turnSeconds = clampInt(opts.turnSeconds, 10, 120, 30);
        const colours = COLOURS_FOR[seats.length];
        return {
            seats: seats.map((s, i) => ({ name: String(s.name || COLOURS[colours[i]].label), side: Number.isInteger(s.side) ? s.side : i })),
            colours: [...colours],
            tokensPerPlayer,
            turnSeconds,
            tokens: seats.map(() => Array(tokensPerPlayer).fill(-1)),
            resigned: seats.map(() => false),
            resignOrder: [],
            status: 'active',
            turn: 0,
            rolled: false,
            dice: null,
            diceBy: null,
            rollCount: 0,
            sixesInRow: 0,
            lastMove: null,
            deadline: ctx.now + turnSeconds * 1000,
            message: `${COLOURS[colours[0]].label} rolls first`,
            winner: null,
            result: null
        };
    },

    view(state, seat) {
        const you = Number.isInteger(seat) && seat >= 0 && seat < state.seats.length ? seat : null;
        const active = state.status === 'active';
        const yourTurn = active && you !== null && state.turn === you;
        return {
            game: 'ludo',
            status: state.status,
            you,
            turn: active ? state.turn : null,
            deadline: engine.deadline(state),
            seats: state.seats.map((s, i) => ({ name: s.name, side: s.side, label: COLOURS[state.colours[i]].label, color: COLOURS[state.colours[i]].color })),
            message: state.message,
            outcome: engine.outcome(state),

            colorIndex: [...state.colours],
            tokensPerPlayer: state.tokensPerPlayer,
            finishSteps: FINISH,
            dice: state.dice,
            diceBy: state.diceBy,
            rollCount: state.rollCount,
            rolled: active && state.rolled,
            sixesInRow: state.sixesInRow,
            resigned: [...state.resigned],
            tokens: state.tokens.map((list, i) => (state.resigned[i] ? []
                : list.map((steps, token) => ({ steps, cell: cellOf(state.colours[i], steps, token) })))),
            safe: SAFE.map((at) => [...TRACK[at]]),
            lastMove: state.lastMove ? clone(state.lastMove) : null,
            canRoll: yourTurn && !state.rolled,
            movable: yourTurn && state.rolled ? legalMoves(state, you, state.dice) : []
        };
    },

    act(input, seat, action, ctx) {
        if (input.status !== 'active') throw new GameError('This game is over.');
        if (!Number.isInteger(seat) || seat < 0 || seat >= input.seats.length) throw new GameError('You are not playing in this game.');
        if (input.resigned[seat]) throw new GameError('You have resigned from this game.');
        const type = action && action.type;
        const state = clone(input);
        const me = labelOf(state, seat);

        if (type === 'resign') {
            state.resigned[seat] = true;
            state.resignOrder.push(seat);
            state.tokens[seat] = state.tokens[seat].map(() => -1);
            if (state.lastMove && (state.lastMove.seat === seat)) state.lastMove = null;
            const left = activeSeats(state);
            if (left.length === 1) {
                const winner = left[0];
                const reason = state.seats.length === 2 ? `${me} resigned` : `Everyone else resigned — ${labelOf(state, winner)} wins`;
                state.message = reason;
                finish(state, winner, reason);
                return state;
            }
            state.message = `${me} resigned`;
            if (state.turn === seat) startTurn(state, nextSeat(state, seat), ctx);
            return state;
        }

        if (type !== 'roll' && type !== 'move') throw new GameError('That move was not understood.');
        if (state.turn !== seat) throw new GameError(`It is ${labelOf(state, state.turn)}'s turn, not yours.`);

        if (type === 'roll') {
            if (state.rolled) throw new GameError(`You have already rolled a ${state.dice}. Tap a token to move it.`);
            roll(state, ctx);
            return state;
        }

        if (!state.rolled) throw new GameError('Roll the dice first.');
        const token = action.token;
        if (!Number.isInteger(token) || token < 0 || token >= state.tokensPerPlayer) throw new GameError('Choose one of your own tokens to move.');
        const from = state.tokens[seat][token];
        if (target(from, state.dice) === null) {
            if (from >= FINISH) throw new GameError('That token is already home.');
            if (from < 0) throw new GameError(`You need a 6 to bring a token out — you rolled a ${state.dice}.`);
            throw new GameError(`That token needs exactly ${FINISH - from} to get home.`);
        }
        move(state, token, ctx);
        return state;
    },

    tick(input, ctx) {
        if (input.status !== 'active' || input.deadline === null || ctx.now < input.deadline) return null;
        const state = clone(input);
        const seat = state.turn;
        if (!state.rolled) roll(state, ctx);
        if (state.status === 'active' && state.turn === seat && state.rolled) move(state, autoPick(state, seat), ctx);
        state.message = `Time ran out — ${state.message}`;
        return state;
    },

    deadline(state) {
        return state.status === 'active' ? state.deadline : null;
    },

    outcome(state) {
        return state.status === 'finished' && state.result
            ? { places: state.result.places.map((g) => [...g]), reason: state.result.reason }
            : null;
    }
};

module.exports = engine;
