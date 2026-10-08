/**
 * The contract every online game in Games & Competitions follows.
 *
 * One file per game sits beside this one — chess.js, ludo.js, uno.js,
 * carrom.js — and exports an ENGINE: pure rules, no database, no clock of its
 * own, no randomness of its own. The game service (../services/gameService.js)
 * keeps the state in Mongo, decides who is sitting in which seat, polls the
 * engine for timeouts and sends each player only what engine.view() lets them
 * see. Players' browsers ask for the game about once a second (HTTP polling, no
 * sockets), so every rule — dice, shuffles, legality, physics — is decided
 * here on the server and nowhere else.
 *
 * ── Seats and sides ────────────────────────────────────────────────────────
 *   seats: [{ userId: string, name: string, side: number }]
 *   The index in this array is the SEAT number used everywhere below. `side`
 *   is the competitor the seat plays for (a college team in a competition, a
 *   person in a friendly game). Chess: 2 seats, sides 0 and 1. Carrom: 2 seats
 *   (sides 0, 1) or 4 seats for doubles (sides 0, 1, 0, 1 — partners sit
 *   opposite). Ludo and UNO: 2–4 seats, normally one per side.
 *
 * ── Context ────────────────────────────────────────────────────────────────
 *   ctx: { now: number /* ms since epoch *\/, rng: () => number /* [0, 1) *\/ }
 *   Engines take the time and every random number from ctx, never from
 *   Date.now() or Math.random(), so a test can replay a game exactly.
 *
 * ── The engine ─────────────────────────────────────────────────────────────
 *   module.exports = {
 *     id: 'chess', label: 'Chess', emoji: '♟️',
 *     minSeats, maxSeats,              // seats a game may be started with
 *     seatsPerSide: { min, max },      // chess {1,1}, carrom {1,2}, ludo/uno {1,1}
 *     summary: 'one line for the lobby',
 *
 *     create(seats, options, ctx) -> state
 *        options are game-specific (e.g. { clockMinutes }, { turnSeconds });
 *        unknown options are ignored. `state` is plain JSON: it is stored as-is.
 *
 *     view(state, seat, ctx) -> object
 *        What `seat` may see (seat is null for a spectator or an organizer).
 *        Never leaks hidden information (another player's UNO hand, the order
 *        of a deck). ALWAYS includes these common fields, which the shared
 *        game page draws itself:
 *          game:     the engine id
 *          status:   'active' | 'finished'
 *          you:      seat | null
 *          turn:     the seat to act now, or null
 *          deadline: ms when the current turn times out, or null
 *          seats:    [{ name, side, label, color }]  label e.g. "White", "Red",
 *                    color a CSS hex for that seat's pieces
 *          message:  one short line about the last thing that happened
 *          outcome:  null, or the same object outcome() returns
 *        plus whatever the game's own table needs (board, hand, dice…), and,
 *        when it is the viewer's turn, what they may legally do.
 *
 *     act(state, seat, action, ctx) -> newState
 *        Applies one action from one seat. MUST NOT mutate `state` (clone
 *        first — structuredClone is fine). Throws GameError with a sentence a
 *        student can read when the action is not allowed (not your turn,
 *        illegal move…). Every engine accepts { type: 'resign' } at any time
 *        from a seat still in the game.
 *
 *     tick(state, ctx) -> newState | null
 *        Applies whatever timeout is due at ctx.now (a chess flag falling, a
 *        Ludo turn played automatically, an UNO turn drawn-and-passed, a carrom
 *        shot forfeited). Returns null when nothing was due.
 *
 *     deadline(state) -> number | null
 *        When tick() next has something to do. Null once the game is over.
 *
 *     outcome(state) -> null | { places: number[][], reason: string }
 *        null while the game is on. Once over, the SIDES in finishing order,
 *        best first; sides that tie share a group: [[0], [1]] is a win for
 *        side 0, [[0, 1]] a draw. `reason` is a short sentence ("Checkmate",
 *        "Red got all four tokens home", "Time ran out").
 *   }
 *
 * ── The table (student app) ────────────────────────────────────────────────
 *   Each game also has a React table in
 *   yaticorp-lms-student/src/competitions/games/<Name>Table.jsx:
 *     export default function ChessTable({ view, onAction, busy })
 *   `view` is exactly what engine.view() returned for this student; `onAction`
 *   sends one action and returns a promise (it rejects with an Error whose
 *   message is the GameError's sentence, which the page shows). The page
 *   around the table draws the title, the seats, whose turn it is, the
 *   countdown to `deadline`, Resign and the final result — the table draws
 *   only the board and the game's own controls.
 */
class GameError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GameError';
        this.status = 400;
    }
}

/** A deep copy of plain JSON state, for engines that must not mutate their input. */
const clone = (state) => structuredClone(state);

module.exports = { GameError, clone };
