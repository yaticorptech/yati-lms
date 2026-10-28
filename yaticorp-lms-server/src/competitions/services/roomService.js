/**
 * Group Brain rooms (asked 2026-10-27): a student picks one of the ten games
 * (games/index.js ROOM_GAMES) and makes a room; the room has a 6-character
 * code they share; others type the code to join; each says they are ready;
 * the one who made it starts the game once enough players are in and every
 * one of them is ready. The game itself is played as any other
 * (./gameService.js: poll, act), as a PlayGame of kind 'room'.
 *
 *   A room holds the game's minSeats to maxSeats players: Chess exactly 2,
 *   the other games 2 to 4. A student is in one open room at a time.
 *   A room not started within ROOM_HOURS closes by itself.
 *   Leaving before the start frees the seat; if the maker leaves, the next
 *   player in becomes the host; the last one out closes the room. Once the
 *   game is on, leaving is resigning (in the game).
 *
 * History, the leaderboards and a player's dashboard come from the results
 * each finished room leaves (../groupbrain/): a win is first place alone, a
 * draw first place shared.
 */
const mongoose = require('mongoose');
const PlayGame = require('../models/PlayGame');
const { engine, ROOM_GAMES } = require('../games');
const { LEVELS } = require('../games/quizCore');
const games = require('./gameService');
const { getSettings } = require('../groupbrain/settings');

const { PlayError } = games;
const ROOM_HOURS = 2;
const OPEN = ['waiting', 'active'];
// Chess's clock by difficulty, in minutes each.
const CHESS_CLOCK = { easy: 15, medium: 10, hard: 5 };

const sameId = (a, b) => String(a) === String(b);
const isId = (id) => mongoose.isValidObjectId(id);

// How many players a room is for: its maker picks 2, 4 or 6 (Chess is always 2).
const SIZES = [2, 4, 6];

/** The options a room is made with: its difficulty (and Chess's clock from it), and its size. */
const roomOptions = (game, raw = {}) => {
    const difficulty = LEVELS.includes(raw.difficulty) ? raw.difficulty : 'medium';
    if (game === 'chess') return { difficulty, clockMinutes: CHESS_CLOCK[difficulty], players: 2 };
    const players = Number(raw.players ?? 4);
    if (!SIZES.includes(players) || players > engine(game).maxSeats) throw new PlayError('A room is for 2, 4 or 6 players.');
    return { difficulty, players };
};

/** How many a room holds: what its maker picked (older rooms: the game's most). */
const sizeOf = (game) => Math.min(engine(game.game).maxSeats, Number(game.options?.players) || engine(game.game).maxSeats);

/** The room I am in now, if any (made or joined, not yet over). */
// A player who has left a game still being played (resigned: in its state's
// `out`) is no longer in it: free to play something else (asked 2026-10-28).
const hasLeft = (game, userId) => {
    const seat = game.seats.findIndex((s) => sameId(s.userId, userId));
    return game.status === 'active' && seat >= 0 && (game.state?.out || []).includes(seat);
};
const openRoomOf = async (userId) => {
    const rows = await PlayGame.find({ kind: 'room', status: { $in: OPEN }, 'seats.userId': userId }).select('_id code game status options seats.userId state.out').sort({ createdAt: -1 }).lean();
    return rows.find((g) => !hasLeft(g, userId)) || null;
};

const busyError = (room) => Object.assign(new PlayError(`You are already in a ${engine(room.game)?.label || ''} room (code ${room.code}). Leave it or finish its game first.`, 409), { roomId: String(room._id) });

/** One room by id, its timeouts applied, with the player's seat. */
const loadRoom = async (gameId) => {
    const game = await games.catchUp(await games.load(gameId));
    if (game.kind !== 'room') throw new PlayError('Room not found.', 404);
    return game;
};

const presentRoom = async (game, userId) => ({ game: games.present(game, userId, await games.context(game)) });

/** Make a room for `gameId`; its maker sits in it, ready, as host. */
const createRoom = async (user, gameId, rawOptions) => {
    if (!ROOM_GAMES.includes(gameId)) throw new PlayError('Pick one of the Group Brain games.');
    // The admin's settings: the game switched on, the difficulty allowed.
    const settings = (await getSettings()).games[gameId];
    if (!settings.enabled) throw new PlayError(`${engine(gameId).label} is switched off for now.`, 403);
    if (rawOptions?.difficulty && !settings.difficulties.includes(rawOptions.difficulty)) throw new PlayError(`${engine(gameId).label} can be played at ${settings.difficulties.join(', ')}.`);
    if (!rawOptions?.difficulty && !settings.difficulties.includes('medium')) rawOptions = { ...rawOptions, difficulty: settings.difficulties[0] };
    // A room whose time ran out is closed first, so it does not hold its maker.
    const open = await openRoomOf(user._id);
    if (open && (await games.catchUp(await games.load(open._id))).status !== 'abandoned') throw busyError(open);
    for (let tries = 0; tries < 5; tries += 1) {
        try {
            const game = await PlayGame.create({
                kind: 'room', game: gameId, code: games.newCode(), hostId: user._id,
                options: roomOptions(gameId, rawOptions),
                seats: [{ userId: user._id, name: user.name || 'Player', side: 0, joinedAt: new Date(), lastSeenAt: new Date(), ready: true }],
                joinDeadline: new Date(Date.now() + ROOM_HOURS * 3600 * 1000)
            });
            return presentRoom(game, user._id);
        } catch (err) {
            if (err?.code !== 11000) throw err;       // a code already taken: draw another
        }
    }
    throw new PlayError('Could not make a room just now. Try again.', 503);
};

/**
 * Join with a room's code. The code must be a room's, the room still open
 * to join (not started, not full), and the player in no other open room.
 * Someone already in it just goes back to it.
 */
const joinRoom = async (user, rawCode) => {
    const code = games.normal(rawCode);
    if (!/^[A-Z0-9]{6}$/.test(code)) throw new PlayError('Enter the 6-character room code.');
    let game = await PlayGame.findOne({ code, kind: 'room' });
    if (!game) throw new PlayError('No room has that code. Check it with the person who made the room.', 404);
    game = await games.catchUp(game);
    for (let tries = 0; tries < 4; tries += 1) {
        if (games.seatOf(game, user._id) >= 0) return presentRoom(game, user._id);
        if (game.status === 'active') throw new PlayError('That room\'s game has already started.', 409);
        if (game.status !== 'waiting') throw new PlayError('That room is closed.', 410);
        const e = engine(game.game);
        const size = sizeOf(game);
        if (game.seats.length >= size) throw new PlayError(`That room is full: it is for ${size} players.`, 409);
        const other = await openRoomOf(user._id);
        if (other) throw busyError(other);
        const side = game.seats.length ? Math.max(...game.seats.map((s) => s.side)) + 1 : 0;
        const seats = [...game.seats.map((s) => s.toObject()), { userId: user._id, name: user.name || 'Player', side, joinedAt: new Date(), lastSeenAt: new Date(), ready: false }];
        const saved = await games.commit(game, { seats });
        if (saved) return presentRoom(saved, user._id);
        game = await games.catchUp(await PlayGame.findById(game._id));
    }
    throw new PlayError('Could not join just now. Try again.', 409);
};

/** Change a waiting room: `change(game, seat)` returns the fields to write. */
const change = async (gameId, userId, changeFn) => {
    let game = await loadRoom(gameId);
    for (let tries = 0; tries < 4; tries += 1) {
        const seat = games.seatOf(game, userId);
        if (seat < 0) throw new PlayError('You are not in this room.', 403);
        if (game.status !== 'waiting') throw new PlayError(game.status === 'active' ? 'The game has already started.' : 'This room is closed.', 409);
        const fields = await changeFn(game, seat);
        const saved = fields.status === 'active' ? await fields.start() : await games.commit(game, fields);
        if (saved) return presentRoom(saved, userId);
        game = await loadRoom(gameId);
    }
    throw new PlayError('The room changed while you were acting. Try again.', 409);
};

/** I am ready (or not, any more). The host is always ready. */
const setReady = (gameId, userId, ready) => change(gameId, userId, (game, seat) => {
    if (sameId(game.hostId, userId)) throw new PlayError('You made the room: start it when everyone is ready.');
    return { seats: game.seats.map((s, i) => (i === seat ? { ...s.toObject(), ready: !!ready } : s.toObject())) };
});

/** The host starts the game: enough players in, and every one ready. */
const startRoom = (gameId, userId) => change(gameId, userId, (game) => {
    if (!sameId(game.hostId, userId)) throw new PlayError('Only the player who made the room can start it.', 403);
    const e = engine(game.game);
    if (game.seats.length < e.minSeats) throw new PlayError(`${e.label} needs ${e.minSeats === e.maxSeats ? 'exactly' : 'at least'} ${e.minSeats} players. Share the code ${game.code}.`);
    const waiting = game.seats.filter((s) => !s.ready && !sameId(s.userId, game.hostId));
    if (waiting.length) throw new PlayError(`Waiting for ${waiting.map((s) => s.name).join(', ')} to be ready.`);
    const away = game.seats.filter((s) => s.online === false);
    if (away.length) throw new PlayError(`${away.map((s) => s.name).join(', ')} ${away.length === 1 ? 'has' : 'have'} lost connection. Wait for them, or remove them from the room.`);
    const seats = game.seats.map((s, i) => ({ ...s.toObject(), side: i }));
    // The admin's own questions for this game join the ones it makes.
    return { status: 'active', start: async () => { game.options = { ...(game.options || {}), extraQuestions: await require('../groupbrain/questions').forGame(game.game) }; return games.begin(game, seats); } };
});

/**
 * Leave a room before its game starts. The host's place passes to the next
 * player in; the last one out closes it.
 */
const leaveRoom = async (gameId, userId) => {
    // An online table: leave the search, the fee back (./onlineService.js).
    if (isId(gameId) && (await PlayGame.findById(gameId).select('kind options').lean())?.options?.online) return require('./onlineService').cancel(gameId, userId);
    return leaveWaitingRoom(gameId, userId);
};
const leaveWaitingRoom = (gameId, userId) => change(gameId, userId, (game, seat) => {
    const rest = game.seats.filter((_, i) => i !== seat).map((s, i) => ({ ...s.toObject(), side: i }));
    if (!rest.length) return { seats: [], status: 'abandoned', finishedAt: new Date(), outcome: { places: [], reason: 'Everyone left the room.' } };
    if (!sameId(game.hostId, userId)) return { seats: rest };
    rest[0].ready = true;
    return { seats: rest, hostId: rest[0].userId };
}).then((out) => ({ left: true, game: { id: out.game.id, status: out.game.status } }));

/** The host removes a player before the start (one who dropped off and did not come back). */
const removePlayer = (gameId, userId, seatIndex) => change(gameId, userId, (game, seat) => {
    if (!sameId(game.hostId, userId)) throw new PlayError('Only the host can remove a player.', 403);
    const i = Number(seatIndex);
    if (!Number.isInteger(i) || i < 0 || i >= game.seats.length || i === seat) throw new PlayError('Pick another player in the room.');
    return { seats: game.seats.filter((_, k) => k !== i).map((s, k) => ({ ...s.toObject(), side: k })) };
});

/* ── What has been played (from the saved results: ../groupbrain/stats.js) ── */

const stats = require('../groupbrain/stats');

/** The room I am in now, if any. */
const myRoom = async (userId) => {
    const open = await openRoomOf(userId);
    if (!open) return { room: null };
    const game = await games.catchUp(await games.load(open._id));
    if (!OPEN.includes(game.status)) return { room: null };
    const e = engine(game.game);
    return { room: { id: String(game._id), code: game.code, game: game.game, label: e.label, emoji: e.emoji, status: game.status, players: game.seats.length, maxSeats: sizeOf(game) } };
};

/** My finished rooms, newest first. */
const history = async (userId, limit = 30) => ({ games: await stats.history(userId, limit) });

/**
 * A leaderboard: `type` 'points' (wins, by `period` 'all' or 'week', of one
 * `game` or all), 'chess' (ratings) or 'xp'.
 */
const leaderboard = async ({ type = 'points', period = 'all', game, userId } = {}) => {
    if (game && !ROOM_GAMES.includes(game)) throw new PlayError('Pick one of the Group Brain games.');
    if (!['all', 'week'].includes(period)) throw new PlayError('The period is all or week.');
    if (type === 'chess') return { type, ...(await stats.chessBoard({ userId })) };
    if (type === 'xp') return { type, ...(await stats.xpBoard({ period, userId })) };
    if (type !== 'points') throw new PlayError('The board is points, chess or xp.');
    return { type, ...(await stats.board({ period, game: game || null, userId })) };
};

/** My dashboard: totals, game by game, Brain Performance Score, rating, XP, achievements, certificates. */
const profile = (user) => stats.dashboard(user);

/** The ten games, for the Games page, with what the admin allows of each. */
const catalogue = async () => {
    const settings = await getSettings();
    return ROOM_GAMES.map((id) => {
        const e = engine(id);
        return { id, label: e.label, emoji: e.emoji, summary: e.summary || '', minSeats: e.minSeats, maxSeats: e.maxSeats, enabled: settings.games[id].enabled, difficulties: settings.games[id].difficulties };
    });
};

module.exports = { openRoomOf, hasLeft, SIZES, sizeOf, ROOM_HOURS, createRoom, joinRoom, setReady, startRoom, leaveRoom, removePlayer, myRoom, history, leaderboard, profile, catalogue, roomOptions, isId };
