/**
 * TEMPORARY, with onlineService's TEST_FILL (asked 2026-10-29: "even though
 * the others are test players, show their answers… a live playing feel"):
 * the test players seated at an online table play by themselves, and sit
 * down at a waiting table one at a time (onlineService.addTester).
 *
 * Every second, for each active online game with test players
 * (options.testers, their seat numbers), each one makes the move a player
 * would, through the game's own act(): answers at a human pace, mostly
 * right, sometimes wrong. Their moves are committed and pushed like anyone's,
 * so the real player sees them live. Each choice comes from a hash of the
 * game, the seat and the moment, so a seat does not change its mind between
 * ticks.
 *
 * Remove with TEST_FILL: drop the start() call in ./sweeper.js.
 */
const { Chess } = require('chess.js');
const PlayGame = require('../models/PlayGame');

const EVERY_MS = 1000;

/** A number in [0, 1) from the parts, the same every time. */
const hash = (...parts) => {
    let x = 2166136261;
    for (const ch of parts.join(':')) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); }
    x ^= x >>> 13; x = Math.imul(x, 0x5bd1e995); x ^= x >>> 15;
    return (x >>> 0) / 4294967296;
};

/** The move seat `i` makes now in `game`, or null (not yet, or nothing to do). */
const decide = (game, i, now) => {
    const s = game.state;
    if (!s || s.status !== 'active' || s.out?.includes(i)) return null;
    const k = (...p) => hash(game._id, i, ...p);

    if (game.game === 'chess') {
        const chess = new Chess(s.fen);
        if ((chess.turn() === 'w' ? 0 : 1) !== i) return null;
        const ply = s.history?.length || 0;
        if (now - s.turnStartedAt < 1500 + 3500 * k('think', ply)) return null;
        const moves = chess.moves({ verbose: true });
        if (!moves.length) return null;
        const captures = moves.filter((m) => m.captured);
        const pool = captures.length && k('take', ply) < 0.7 ? captures : moves;
        const m = pool[Math.floor(k('move', ply) * pool.length)];
        return { type: 'move', from: m.from, to: m.to, ...(m.promotion ? { promotion: 'q' } : {}) };
    }

    // Tic-Tac-Toe and Last Stone (games/turns.js): on its turn, after a moment's thought.
    if (game.game === 'tictactoe' || game.game === 'laststone') {
        if (s.turn !== i) return null;
        const n = s.round * 10 + (s.history?.length || 0) + (Array.isArray(s.board) ? s.board.filter((x) => x !== null).length : s.board.took.length);
        if (now - s.turnStartedAt < 1200 + 2500 * k('think', n)) return null;
        if (game.game === 'laststone') {
            const left = s.board.left;
            const best = left % 4;                          // leaves a multiple of four: the winning line
            return { type: 'move', take: best && k('smart', n) < 0.7 ? best : Math.min(left, 1 + Math.floor(k('take', n) * 3)) };
        }
        const { LINES } = require('../games/turns');
        const free = s.board.map((x, c) => (x === null ? c : -1)).filter((c) => c >= 0);
        const finishing = (who) => free.find((c) => LINES.some((l) => l.includes(c) && l.filter((x) => x !== c).every((x) => s.board[x] === who)));
        const win = finishing(i); const block = finishing(1 - i);
        const pick = win ?? (k('block', n) < 0.8 ? block : undefined) ?? (free.includes(4) && k('mid', n) < 0.6 ? 4 : free[Math.floor(k('cell', n) * free.length)]);
        return { type: 'move', cell: pick };
    }

    if (game.game === 'sudoku') {
        if (s.finishedAt?.[i] != null || s.mistakes[i] >= 5 || now >= s.endsAt) return null;
        const board = s.boards[i];
        const filled = board.filter((v, c) => v && !s.puzzle[c]).length;
        const made = filled + s.mistakes[i];
        const pace = 9000 + 9000 * k('pace');
        if (made >= Math.floor((now - s.startedAt - 3000) / pace)) return null;
        const empty = board.map((v, c) => (v ? -1 : c)).filter((c) => c >= 0);
        if (!empty.length) return null;
        const cell = empty[Math.floor(k('cell', made) * empty.length)];
        const wrong = s.mistakes[i] < 3 && k('slip', made) < 0.12;
        return { type: 'place', cell, digit: wrong ? (s.solution[cell] % 9) + 1 : s.solution[cell] };
    }

    // The adventures (The Final Vault, The Lost Kingdom): a chamber every so often, now and then a wrong try.
    if (s.progress) {
        if (s.phase !== 'play' || now >= s.phaseEndsAt) return null;
        const p = s.progress[i];
        if (p.done || p.failed || now < (p.jamUntil || 0)) return null;
        const stageMs = s.runMs * (0.1 + 0.1 * k('pace'));
        if (now < s.phaseStartedAt + (p.stage + 1) * stageMs) return null;
        return { type: 'bot-step', stage: p.stage, right: !(p.mistakes < 3 && k('slip', p.stage, p.mistakes) < 0.25) };
    }

    // The quiz games: one answer per question, at a human pace, mostly right.
    if (s.questions) {
        if (s.phase !== 'question' || now >= s.phaseEndsAt) return null;
        const tries = s.answers?.[s.index]?.[i];
        if (!tries || tries.length) return null;
        if (now < s.phaseStartedAt + (0.15 + 0.6 * k('when', s.index)) * s.questionMs) return null;
        const q = s.questions[s.index];
        const n = q.options.length;
        const choice = k('right', s.index) < 0.65 ? q.answer : (q.answer + 1 + Math.floor(k('wrong', s.index) * (n - 1))) % n;
        return { type: 'answer', choice };
    }

    // The round games (Memory Matrix, Sequence & Reaction).
    if (s.current) {
        if (s.phase !== 'answer' || now >= s.phaseEndsAt || s.answers?.[i]) return null;
        const r = s.current;
        const elapsed = now - s.phaseStartedAt;
        const span = s.phaseEndsAt - s.phaseStartedAt;
        if (game.game === 'memorymatrix') {
            // Tap the cells one by one (everyone sees the taps), a few of them wrong, then send.
            const others = Array.from({ length: r.size * r.size }, (_, c) => c).filter((c) => !r.cells.includes(c));
            const plan = [];
            r.cells.forEach((c, j) => {
                const miss = others.length && k('miss', s.index, j) < 0.2 ? others[Math.floor(k('where', s.index, j) * others.length)] : c;
                plan.push(plan.includes(miss) ? c : miss);
            });
            const picks = r.picks?.[i] || [];
            const start = 1000 + 1500 * k('start', s.index);
            const step = (span * 0.5) / r.count;
            const due = elapsed < start ? 0 : Math.floor((elapsed - start) / step) + 1;
            if (picks.length < r.count) return picks.length < due ? { type: 'pick', cell: plan.find((c) => !picks.includes(c)) } : null;
            return due > r.count ? { type: 'answer', cells: picks } : null;
        }
        if (game.game === 'sequence') {
            if (r.kind === 'reaction') return elapsed >= 250 + 500 * k('react', s.index) ? { type: 'answer' } : null;
            if (elapsed < (0.3 + 0.4 * k('when', s.index)) * span) return null;
            return { type: 'answer', sequence: r.sequence.map((x, j) => (k('slip', s.index, j) < 0.12 ? (x + 1) % r.items.length : x)) };
        }
    }
    return null;
};

let timer = null;
let running = false;

const tickOnce = async () => {
    const games = require('./gameService');
    // Tables still filling: the next test player sits down when it is time.
    const waiting = await PlayGame.find({ status: 'waiting', kind: 'room', 'options.online': true }).limit(50);
    for (const table of waiting) {
        try { await require('./onlineService').addTester(table); } catch (err) { console.warn('[games] seating a test player failed for', String(table._id), err.message); }
    }
    const tables = await PlayGame.find({ status: 'active', kind: 'room', 'options.testers.0': { $exists: true } }).limit(50);
    for (let game of tables) {
        try {
            game = await games.catchUp(game);
            // A few moves a tick at most: one per test player that is due.
            for (let n = 0; n < 8 && game?.status === 'active'; n += 1) {
                const now = Date.now();
                const seat = game.options.testers.find((i) => decide(game, i, now));
                if (seat === undefined) break;
                game = (await games.actForSeat(game, seat, decide(game, seat, now))) || await PlayGame.findById(game._id);
            }
        } catch (err) { console.warn('[games] test player move failed for', String(game?._id), err.message); }
    }
};

const start = () => {
    if (timer) return;
    timer = setInterval(() => {
        if (running) return;
        running = true;
        tickOnce().catch((err) => console.warn('[games] test players failed:', err.message)).finally(() => { running = false; });
    }, EVERY_MS);
    timer.unref?.();
};

module.exports = { start, tickOnce, decide };
