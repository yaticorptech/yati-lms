/**
 * Sudoku Challenge, a Group Brain game: every player solves the same 9×9
 * puzzle on their own board, at the same time. The puzzle is made fresh for
 * each game and has exactly one solution; easy gives 40 numbers, medium 32,
 * hard 27.
 *
 * Every number placed is checked on the server against the solution: a right
 * one stays (+10), a wrong one is not placed and counts as a mistake (−5).
 * Five mistakes and your board is closed. Three hints a player, each filling
 * one empty cell (−15). Finishing the board scores 200, 150, 100 or 50 more,
 * by who finished first.
 *
 * The game ends when every player has finished or been closed out, or when
 * the time runs out (easy 15 minutes, medium 20, hard 25). Places go by
 * points, then who finished first. Nobody sees another player's board — only
 * how far along they are — and the solution is shown once it is over.
 */
const { GameError, clone } = require('./contract');
const { PALETTE, LEVELS } = require('./quizCore');

const CLUES = { easy: 40, medium: 32, hard: 27 };
const MINUTES = { easy: 15, medium: 20, hard: 25 };
const MAX_MISTAKES = 5;
const HINTS = 3;
const BONUS = [200, 150, 100, 50];

/* ── Making a puzzle ───────────────────────────────────────────────────── */

const rowOf = (i) => Math.floor(i / 9);
const colOf = (i) => i % 9;
const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);
// For each cell, the 20 others it may not repeat.
const PEERS = Array.from({ length: 81 }, (_, i) => Array.from({ length: 81 }, (_, j) => j)
    .filter((j) => j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i))));

const fits = (grid, i, d) => PEERS[i].every((j) => grid[j] !== d);

/** Fill `grid` (0 = empty) in place, trying digits in an order from rng. */
const fill = (grid, rng) => {
    const i = grid.indexOf(0);
    if (i < 0) return true;
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let k = digits.length - 1; k > 0; k -= 1) {
        const j = Math.floor(rng() * (k + 1));
        [digits[k], digits[j]] = [digits[j], digits[k]];
    }
    for (const d of digits) {
        if (!fits(grid, i, d)) continue;
        grid[i] = d;
        if (fill(grid, rng)) return true;
    }
    grid[i] = 0;
    return false;
};

/** How many solutions `grid` has, counting no further than `limit`. */
const countSolutions = (grid, limit = 2) => {
    let best = -1; let bestOptions = null;
    for (let i = 0; i < 81; i += 1) {
        if (grid[i]) continue;
        const options = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => fits(grid, i, d));
        if (!options.length) return 0;
        if (!bestOptions || options.length < bestOptions.length) { best = i; bestOptions = options; }
        if (options.length === 1) break;
    }
    if (best < 0) return 1;
    let found = 0;
    for (const d of bestOptions) {
        grid[best] = d;
        found += countSolutions(grid, limit - found);
        grid[best] = 0;
        if (found >= limit) break;
    }
    return found;
};

/**
 * A puzzle with `clues` numbers given and one solution: a full grid, then
 * cells emptied in a random order, each kept emptied only if the puzzle
 * still has just the one solution.
 */
const makePuzzle = (rng, clues) => {
    const solution = Array(81).fill(0);
    fill(solution, rng);
    const puzzle = [...solution];
    const order = Array.from({ length: 81 }, (_, i) => i);
    for (let k = order.length - 1; k > 0; k -= 1) {
        const j = Math.floor(rng() * (k + 1));
        [order[k], order[j]] = [order[j], order[k]];
    }
    let given = 81;
    for (const i of order) {
        if (given <= clues) break;
        const keep = puzzle[i];
        puzzle[i] = 0;
        if (countSolutions([...puzzle]) === 1) given -= 1;
        else puzzle[i] = keep;
    }
    return { puzzle, solution };
};

/* ── The game ──────────────────────────────────────────────────────────── */

const playing = (s) => s.seats.map((_, i) => i).filter((i) => !s.out.includes(i));
const doneOf = (s, i) => s.finishedAt[i] != null || s.mistakes[i] >= MAX_MISTAKES || s.out.includes(i);
const emptyLeft = (s, i) => s.boards[i].filter((v) => !v).length;

const placesOf = (s) => {
    const ranked = playing(s)
        .map((i) => ({ side: s.seats[i].side, points: s.scores[i], at: s.finishedAt[i] ?? Infinity }))
        .sort((a, b) => b.points - a.points || a.at - b.at);
    const groups = [];
    let last = null;
    for (const r of ranked) {
        if (last && last.points === r.points && last.at === r.at) groups[groups.length - 1].push(r.side);
        else groups.push([r.side]);
        last = r;
    }
    for (const i of [...s.out].reverse()) groups.push([s.seats[i].side]);
    return groups;
};

const finish = (s, now, why) => {
    s.status = 'finished';
    s.finishedAtGame = now;
    const places = placesOf(s);
    s.result = { places, reason: why || (places[0]?.length > 1 ? 'Level on points — a draw' : 'Most points') };
    s.message = places[0]?.length === 1 ? `${s.seats.find((x) => x.side === places[0][0]).name} wins.` : 'A draw.';
    return s;
};

/** Once every player is finished or closed out, the game is over. */
const maybeOver = (s, now) => (playing(s).every((i) => doneOf(s, i)) ? finish(s, now, playing(s).some((i) => s.finishedAt[i] != null) ? 'Every board is done' : 'Every board is closed') : s);

/** A player's board is complete: their place among the finishers, and its bonus. */
const complete = (s, i, now) => {
    const order = s.finishedAt.filter((t) => t != null).length;
    s.finishedAt[i] = now;
    s.scores[i] += BONUS[order] ?? 0;
    s.message = `${s.seats[i].name} finished the puzzle${order === 0 ? ' first' : ''}!`;
};

const engine = {
    id: 'sudoku',
    label: 'Sudoku Challenge',
    emoji: '🔢',
    summary: 'Race to solve the same 9×9 Sudoku. Every number is checked: mistakes cost, hints cost more, finishing first scores most.',
    minSeats: 2,
    maxSeats: 20,
    seatsPerSide: { min: 1, max: 1 },

    create(seats, options, ctx) {
        if (!Array.isArray(seats) || seats.length < 2 || seats.length > 6) throw new GameError('Sudoku Challenge needs 2 to 6 players.');
        const level = LEVELS.includes(options?.difficulty) ? options.difficulty : 'medium';
        const { puzzle, solution } = makePuzzle(ctx.rng, CLUES[level]);
        return {
            game: 'sudoku',
            difficulty: level,
            status: 'active',
            seats: seats.map((x) => ({ name: x.name || 'Player', side: x.side })),
            puzzle,
            solution,
            boards: seats.map(() => [...puzzle]),
            mistakes: seats.map(() => 0),
            hints: seats.map(() => HINTS),
            scores: seats.map(() => 0),
            finishedAt: seats.map(() => null),
            out: [],
            startedAt: ctx.now,
            endsAt: ctx.now + MINUTES[level] * 60000,
            result: null,
            message: 'Go! Fill the grid: every row, column and 3×3 box holds 1 to 9 once.',
            finishedAtGame: null
        };
    },

    view(s, seat, ctx) {
        const you = Number.isInteger(seat) && seat >= 0 && seat < s.seats.length ? seat : null;
        const active = s.status === 'active';
        const total = s.puzzle.filter((v) => !v).length;
        return {
            game: 'sudoku',
            status: s.status,
            you,
            turn: null,
            deadline: active ? s.endsAt : null,
            seats: s.seats.map((x, i) => ({ name: x.name, side: x.side, label: `Player ${i + 1}`, color: PALETTE[i % PALETTE.length] })),
            message: s.message,
            outcome: engine.outcome(s),
            difficulty: s.difficulty,
            serverNow: ctx?.now ?? null,
            startedAt: s.startedAt,
            endsAt: s.endsAt,
            puzzle: [...s.puzzle],
            board: you !== null ? [...s.boards[you]] : null,
            solution: active ? null : [...s.solution],
            maxMistakes: MAX_MISTAKES,
            hintsLeft: you !== null ? s.hints[you] : null,
            // Everyone's progress, never their numbers: which cells each has
            // filled (2 a given, 1 filled, 0 empty), for the boards in the corners.
            players: s.seats.map((_, i) => ({
                cells: s.boards[i].map((v, k) => (s.puzzle[k] ? 2 : v ? 1 : 0)),
                filled: total - emptyLeft(s, i),
                of: total,
                mistakes: s.mistakes[i],
                finished: s.finishedAt[i] != null,
                closed: s.mistakes[i] >= MAX_MISTAKES,
                left: s.out.includes(i)
            })),
            scores: [...s.scores],
            canPlay: active && you !== null && !doneOf(s, you)
        };
    },

    act(input, seat, action, ctx) {
        const s = clone(input);
        if (!Number.isInteger(seat) || seat < 0 || seat >= s.seats.length) throw new GameError('You are not playing in this game.');
        if (s.status !== 'active') throw new GameError('The game is over.');
        if (s.out.includes(seat)) throw new GameError('You have left this game.');
        const type = action && action.type;
        if (type === 'resign') {
            s.out.push(seat);
            s.message = `${s.seats[seat].name} resigned.`;
            if (playing(s).length <= 1) return finish(s, ctx.now, 'The others resigned');
            return maybeOver(s, ctx.now);
        }
        if (ctx.now >= s.endsAt) throw new GameError('Time is up.');
        if (s.finishedAt[seat] != null) throw new GameError('You have finished the puzzle.');
        if (s.mistakes[seat] >= MAX_MISTAKES) throw new GameError(`${MAX_MISTAKES} mistakes: your board is closed.`);
        const board = s.boards[seat];
        if (type === 'hint') {
            if (s.hints[seat] <= 0) throw new GameError('You have no hints left.');
            const empty = board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
            const cell = Number.isInteger(action.cell) && board[action.cell] === 0 ? action.cell : empty[Math.floor(ctx.rng() * empty.length)];
            board[cell] = s.solution[cell];
            s.hints[seat] -= 1;
            s.scores[seat] -= 15;
            s.message = `${s.seats[seat].name} used a hint.`;
        } else if (type === 'place') {
            const cell = Number(action.cell); const digit = Number(action.digit);
            if (!Number.isInteger(cell) || cell < 0 || cell > 80) throw new GameError('Pick a cell on the grid.');
            if (!Number.isInteger(digit) || digit < 1 || digit > 9) throw new GameError('Enter a number from 1 to 9.');
            if (s.puzzle[cell]) throw new GameError('That number is part of the puzzle.');
            if (board[cell]) throw new GameError('That cell is already filled.');
            if (s.solution[cell] !== digit) {
                s.mistakes[seat] += 1;
                s.scores[seat] -= 5;
                s.message = `${s.seats[seat].name} made a mistake (${s.mistakes[seat]} of ${MAX_MISTAKES}).`;
                return maybeOver(s, ctx.now);
            }
            board[cell] = digit;
            s.scores[seat] += 10;
        } else {
            throw new GameError('That is not something you can do in Sudoku Challenge.');
        }
        if (!board.includes(0)) complete(s, seat, ctx.now);
        return maybeOver(s, ctx.now);
    },

    tick(input, ctx) {
        if (input.status !== 'active' || input.endsAt > ctx.now) return null;
        return finish(clone(input), ctx.now, 'Time ran out');
    },

    deadline(s) {
        return s.status === 'active' ? s.endsAt : null;
    },

    outcome(s) {
        if (s.status !== 'finished' || !s.result) return null;
        return { places: s.result.places.map((g) => [...g]), reason: s.result.reason };
    }
};

module.exports = { ...engine, makePuzzle, countSolutions, MAX_MISTAKES, HINTS };
