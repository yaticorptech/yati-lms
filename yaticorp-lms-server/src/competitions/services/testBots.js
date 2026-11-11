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

const PIECE = { p: 1, n: 3, b: 3.2, r: 5, q: 9, k: 0 };
const CENTER = new Set(['d4', 'e4', 'd5', 'e5']);

/**
 * A chess move at medium strength (asked 2026-11-05: "play wisely, quickly,
 * not too sharp"). Each move is scored by material after it, less the best
 * capture the opponent then has (a defended target costs them their piece),
 * plus small opening habits: castle, take the centre, develop, give check.
 * Mate in one is always played; otherwise it usually plays the best score,
 * sometimes a near-best one, and now and then a looser move.
 */
const chessPick = (chess, ply, roll) => {
    const moves = chess.moves({ verbose: true });
    if (!moves.length) return null;
    const us = chess.turn();
    const material = () => chess.board().flat().reduce((t, sq) => t + (sq ? (sq.color === us ? 1 : -1) * PIECE[sq.type] : 0), 0);

    const scored = moves.map((m) => {
        chess.move(m);
        let score;
        if (chess.isCheckmate()) score = 1000;
        else if (chess.isDraw()) score = Math.min(0, -material());     // a draw only when behind
        else {
            let threat = 0;
            for (const r of chess.moves({ verbose: true })) {
                if (r.san.includes('#')) { threat = 1000; break; }
                if (!r.captured && !r.promotion) continue;
                let gain = (r.captured ? PIECE[r.captured] : 0) + (r.promotion ? PIECE.q - 1 : 0);
                if (chess.isAttacked(r.to, us)) gain -= PIECE[r.piece];
                threat = Math.max(threat, gain);
            }
            score = material() - threat;
            if (chess.inCheck()) score += 0.3;
            if (m.flags.includes('k') || m.flags.includes('q')) score += 0.6;
            if (ply < 16) {
                if (CENTER.has(m.to) && (m.piece === 'p' || m.piece === 'n')) score += 0.25;
                if ((m.piece === 'n' || m.piece === 'b') && /[18]/.test(m.from[1])) score += 0.3;
                if ((m.piece === 'n' || m.piece === 'b') && /[18]/.test(m.to[1])) score -= 0.4;   // not back home
                if (m.piece === 'n' && /[ah]/.test(m.to[0])) score -= 0.4;                     // a knight on the rim
                if (m.piece === 'p' && /[abgh]/.test(m.to[0])) score -= 0.15;
                if (m.piece === 'r') score -= 0.3;
                if (m.piece === 'q' && ply < 10) score -= 0.3;
                if (m.piece === 'k' && !m.flags.includes('k') && !m.flags.includes('q')) score -= 0.5;
            }
        }
        chess.undo();
        return { m, score: score + roll(`j${m.from}${m.to}`) * 0.15 };  // a little variety between equal moves
    }).sort((a, b) => b.score - a.score);

    if (scored[0].score >= 900) return scored[0].m;
    const r = roll('style');
    const slack = r < 0.65 ? 0.3 : r < 0.9 ? 1.2 : 2.5;
    const pool = scored.filter((x) => x.score >= scored[0].score - slack).slice(0, 4);
    return pool[Math.floor(roll('move') * pool.length)].m;
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
        // Thinking time (2026-11-06: "the same for both players, not fast for the bot"): about the opponent's own
        // average per move so far — their clock used, plus the increments they got back, over their moves — give or
        // take a fifth; 3–6 s before the opponent has moved; never more than a twentieth of the bot's clock left.
        const opp = 1 - i;
        const oppMoves = Math.floor((ply + (opp === 0 ? 1 : 0)) / 2);
        const startMs = Math.round((s.clockMinutes || 0) * 60000);
        const oppUsed = startMs ? startMs - (s.clocks?.[opp] ?? startMs) + oppMoves * (s.incrementMs || 0) : 0;
        const pace = oppMoves && oppUsed > 0 ? oppUsed / oppMoves : 3000 + 3000 * k('first', ply);
        const think = Math.min(Math.max(1500, pace * (0.8 + 0.4 * k('think', ply))), 45000, Math.max(1500, (s.clocks?.[i] ?? 60000) / 20));
        if (now - s.turnStartedAt < think) return null;
        const m = chessPick(chess, ply, (p) => k(p, ply));
        if (!m) return null;
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
