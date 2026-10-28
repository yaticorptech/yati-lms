/**
 * Live games over Socket.IO (asked 2026-10-27, for Group Brain rooms; match
 * games use it too): the server tells every player in a game the moment it
 * changes — someone joins, gets ready, starts, answers, moves, a timer runs
 * out — and each browser then fetches its own view (GET /play/:id), which
 * is the only way a player ever sees the game. The push carries no game
 * state: what a seat may see (its own answer, never another's) stays decided
 * by the engine's view(), on the server.
 *
 *   connect  with the student's sign-in token (handshake auth.token)
 *   watch    { gameId } — allowed only to a player seated in that game
 *   unwatch  { gameId }
 *   server → 'game:changed' { id, version, status }
 *
 * Every change to a game goes through gameService's commit(), which calls
 * notify() here. Polling stays in the student app as a fallback (slower
 * while the socket is connected), so a dropped connection never stalls a
 * game, and a player who reconnects simply catches up.
 *
 * One server process: the socket rooms are in memory. With several
 * instances, add the Socket.IO Redis adapter so a change on one reaches
 * players connected to another.
 */
const jwt = require('jsonwebtoken');

let io = null;
const roomOf = (gameId) => `game:${gameId}`;

/** Attach Socket.IO to the HTTP server. `allowOrigin(origin)` is the API's own CORS rule. */
const init = (httpServer, { allowOrigin } = {}) => {
    const { Server } = require('socket.io');
    io = new Server(httpServer, {
        path: '/socket.io',
        cors: { origin: (origin, cb) => cb(null, !origin || !allowOrigin || allowOrigin(origin)), credentials: true }
    });
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error('Sign in first.'));
            const { id } = jwt.verify(token, process.env.JWT_SECRET);
            const User = require('../models/User');
            const user = await User.findById(id).select('_id').lean();
            if (!user) return next(new Error('Sign in first.'));
            socket.data.userId = String(user._id);
            return next();
        } catch {
            return next(new Error('Sign in first.'));
        }
    });
    io.on('connection', (socket) => {
        socket.on('watch', async ({ gameId } = {}, ack) => {
            try {
                const PlayGame = require('./models/PlayGame');
                if (!require('mongoose').isValidObjectId(gameId)) throw new Error('Game not found.');
                const game = await PlayGame.findById(gameId).select('seats').lean();
                // Only a seated player follows a game: a room is private to its players.
                if (!game || !game.seats.some((s) => String(s.userId) === socket.data.userId)) throw new Error('You are not in this game.');
                socket.join(roomOf(gameId));
                if (typeof ack === 'function') ack({ ok: true });
            } catch (err) {
                if (typeof ack === 'function') ack({ ok: false, message: err.message });
            }
        });
        socket.on('unwatch', ({ gameId } = {}) => socket.leave(roomOf(gameId)));
    });
    return io;
};

/** Tell a game's players it changed (from gameService's commit). Never throws. */
const notify = (game) => {
    if (!io || !game?._id) return;
    try { io.to(roomOf(game._id)).emit('game:changed', { id: String(game._id), version: game.version, status: game.status }); } catch { /* the poll catches up */ }
};

const close = () => new Promise((resolve) => (io ? io.close(() => resolve()) : resolve()));

module.exports = { init, notify, close };
