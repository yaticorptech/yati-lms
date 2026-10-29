/**
 * The solo games played in turns, as Group Brain games for two (added 2026-10-29): Tic-Tac-Toe and Last
 * Stone, one against one as Chess is. A match is up to five rounds, the first move alternating; the first to
 * three round wins takes it, otherwise most round wins (level: a draw, split as rooms split them). Each move
 * has a clock (TURN_MS); when it runs out a random legal move is made for that player, so a match never
 * stalls. Follows ./contract.js.
 */
const { GameError, clone } = require('./contract');
const { PALETTE } = require('./quizCore');

const TURN_MS = 20000;
const ROUNDS = 5;
const TO_WIN = 3;
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

/** A two-player, turn-by-turn match of rounds; `rules` says what a round is. */
const makeTurnEngine = (rules) => {
    const other = (seat) => 1 - seat;
    const newRound = (s, now) => {
        s.round += 1;
        s.turn = (s.round - 1) % 2;                         // the first move alternates
        s.board = rules.fresh(s);
        s.turnStartedAt = now;
        s.message = `Round ${s.round}: ${s.seats[s.turn].name} to move.`;
        return s;
    };
    const finish = (s, now, why) => {
        s.status = 'finished'; s.turn = null; s.finishedAt = now;
        const [a, b] = s.wins;
        const places = a === b ? [[s.seats[0].side, s.seats[1].side]] : a > b ? [[s.seats[0].side], [s.seats[1].side]] : [[s.seats[1].side], [s.seats[0].side]];
        s.result = { places, reason: why || (a === b ? 'Level on rounds — a draw' : `${Math.max(a, b)}–${Math.min(a, b)} on rounds`) };
        s.message = a === b ? 'A draw.' : `${s.seats[a > b ? 0 : 1].name} wins.`;
        s.scores = s.wins.map((w) => w * 100);
        s.correct = [...s.wins];
        return s;
    };
    /** After a move: the round's end (won or drawn), the match's end, or the other player's turn. */
    const after = (s, seat, now) => {
        const r = rules.result(s.board, seat);
        if (r === 'win' || r === 'draw') {
            if (r === 'win') s.wins[seat] += 1;
            s.history.push({ round: s.round, winner: r === 'win' ? seat : null });
            s.message = r === 'win' ? `${s.seats[seat].name} takes round ${s.round}.` : `Round ${s.round} is a draw.`;
            if (s.wins[seat] >= TO_WIN || s.round >= ROUNDS) return finish(s, now);
            return newRound(s, now);
        }
        s.turn = other(seat); s.turnStartedAt = now;
        return s;
    };

    const engine = {
        id: rules.id, label: rules.label, emoji: rules.emoji, summary: rules.summary,
        minSeats: 2, maxSeats: 2, seatsPerSide: { min: 1, max: 1 },

        create(seats, options, ctx) {
            if (!Array.isArray(seats) || seats.length !== 2) throw new GameError(`${rules.label} is played one against one.`);
            const s = {
                game: rules.id, status: 'active', difficulty: options?.difficulty || 'medium',
                seats: seats.map((x) => ({ name: x.name || 'Player', side: x.side })),
                round: 0, rounds: ROUNDS, wins: [0, 0], history: [], out: [],
                scores: [0, 0], correct: [0, 0], result: null, startedAt: ctx.now, finishedAt: null
            };
            return newRound(s, ctx.now);
        },

        view(s, seat, ctx) {
            const you = seat === 0 || seat === 1 ? seat : null;
            const active = s.status === 'active';
            return {
                game: s.game, status: s.status, you, turn: active ? s.turn : null,
                deadline: engine.deadline(s), serverNow: ctx?.now ?? null,
                seats: s.seats.map((x, i) => ({ name: x.name, side: x.side, label: rules.marks[i], color: PALETTE[i] })),
                message: s.message, outcome: engine.outcome(s),
                round: s.round, rounds: ROUNDS, toWin: TO_WIN, wins: [...s.wins], history: [...s.history],
                board: rules.publicBoard(s.board), scores: [...s.scores], out: [...s.out],
                turnMs: TURN_MS, turnStartedAt: s.turnStartedAt,
                canMove: active && you !== null && s.turn === you
            };
        },

        act(input, seat, action, ctx) {
            const s = clone(input);
            if (seat !== 0 && seat !== 1) throw new GameError('You are not playing in this game.');
            if (s.status !== 'active') throw new GameError('The game is over.');
            if (action?.type === 'resign') {
                s.out.push(seat); s.wins[other(seat)] = Math.max(s.wins[other(seat)], s.wins[seat] + 1);
                return finish(s, ctx.now, `${s.seats[seat].name} left`);
            }
            if (action?.type !== 'move') throw new GameError(`That is not something you can do in ${rules.label}.`);
            if (s.turn !== seat) throw new GameError('Wait for your turn.');
            s.board = rules.move(s.board, seat, action);
            return after(s, seat, ctx.now);
        },

        tick(input, ctx) {
            if (input.status !== 'active' || engine.deadline(input) > ctx.now) return null;
            const s = clone(input);
            const seat = s.turn;
            s.board = rules.move(s.board, seat, rules.anyMove(s.board, ctx.rng));
            s.message = `Time ran out: a move was made for ${s.seats[seat].name}.`;
            return after(s, seat, ctx.now);
        },

        deadline(s) { return s.status === 'active' ? s.turnStartedAt + TURN_MS : null; },
        outcome(s) { return s.status === 'finished' && s.result ? { places: s.result.places.map((g) => [...g]), reason: s.result.reason } : null; }
    };
    return engine;
};

const tictactoe = makeTurnEngine({
    id: 'tictactoe', label: 'Tic-Tac-Toe', emoji: '❌', summary: 'Three in a row, one against one — best of five rounds.',
    marks: ['X', 'O'],
    fresh: () => Array(9).fill(null),
    publicBoard: (b) => [...b],
    move: (b, seat, a) => {
        const at = Number(a.cell);
        if (!Number.isInteger(at) || at < 0 || at > 8) throw new GameError('Pick a square.');
        if (b[at] !== null) throw new GameError('That square is taken.');
        const n = [...b]; n[at] = seat; return n;
    },
    result: (b, seat) => (LINES.some((l) => l.every((i) => b[i] === seat)) ? 'win' : b.every((x) => x !== null) ? 'draw' : null),
    anyMove: (b, rng) => { const free = b.map((x, i) => (x === null ? i : -1)).filter((i) => i >= 0); return { cell: free[Math.floor(rng() * free.length)] }; }
});

const laststone = makeTurnEngine({
    id: 'laststone', label: 'Last Stone', emoji: '🪨', summary: 'Take one, two or three stones. Take the last and win the round — best of five.',
    marks: ['Player 1', 'Player 2'],
    fresh: (s) => ({ left: 13 + ((s.round * 7) % 9), took: [] }),
    publicBoard: (b) => ({ left: b.left, took: [...b.took] }),
    move: (b, seat, a) => {
        const n = Number(a.take);
        if (![1, 2, 3].includes(n)) throw new GameError('Take one, two or three stones.');
        if (n > b.left) throw new GameError(`Only ${b.left} left.`);
        return { left: b.left - n, took: [...b.took, { seat, n }] };
    },
    result: (b) => (b.left === 0 ? 'win' : null),
    anyMove: (b, rng) => ({ take: Math.min(b.left, 1 + Math.floor(rng() * 3)) })
});

const ENGINES = { tictactoe, laststone };
module.exports = { TURNS: Object.keys(ENGINES), turnEngine: (id) => ENGINES[id] || null, LINES };
