/**
 * Live games: the bridge between a stored PlayGame and its engine.
 *
 * Everything a player does comes through here — join, act, poll — and every
 * change is written conditionally on the game's `version`, so two players
 * pressing at the same instant cannot both get their move in: the second write
 * finds the version moved, reloads, and is judged against the new position.
 *
 * Timeouts are applied lazily, whenever anyone looks at the game, and by the
 * sweeper (./sweeper.js) for games nobody is looking at — so a player who
 * walks away cannot stall a match.
 */
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const PlayGame = require('../models/PlayGame');
const { engine } = require('../games');
const { GameError } = require('../games/contract');

/** How long a match's players have to turn up once it opens. */
const JOIN_MINUTES = 10;

const rng = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32;
const ctx = () => ({ now: Date.now(), rng });

class PlayError extends Error {
    constructor(message, status = 400) { super(message); this.status = status; }
}

const seatOf = (game, userId) => game.seats.findIndex((s) => String(s.userId) === String(userId));
const isId = (id) => mongoose.isValidObjectId(id);

/** The sides present among `seats`, in order, renumbered 0..k-1 for the engine. */
const engineSeats = (seats) => seats.map((s) => ({ userId: String(s.userId), name: s.name, side: s.side }));

/**
 * Write `changes` if nobody else has written since `game` was read. Returns
 * the saved document, or null when the version had moved on.
 */
const commit = async (game, changes) => {
    const next = await PlayGame.findOneAndUpdate(
        { _id: game._id, version: game.version },
        { $set: { ...changes, version: game.version + 1 } },
        { returnDocument: 'after' }
    );
    return next;
};

/** Called once a game finishes; a competition match moves on from here. */
const finished = async (game) => {
    if (game.kind === 'match') {
        try { await require('./bracketService').recordGame(game); }
        catch (err) { console.error('[competitions] recording a result failed:', err.message); }
    }
};

/** The fields that change whenever the engine state does. */
const afterState = (game, state, c) => {
    const e = engine(game.game);
    const out = e.outcome(state);
    const deadline = out ? null : e.deadline(state);
    return {
        state,
        nextDeadline: deadline ? new Date(deadline) : null,
        ...(out ? { status: 'finished', outcome: out, finishedAt: new Date(c.now) } : {})
    };
};

/**
 * Start play: the engine deals, sets up the board, starts the clocks.
 * `seats` are the players actually at the table (a match drops no-shows).
 */
const begin = async (game, seats, extra = {}) => {
    const c = ctx();
    const e = engine(game.game);
    const state = e.create(engineSeats(seats), game.options || {}, c);
    const saved = await commit(game, { ...extra, seats, startedAt: new Date(c.now), status: 'active', ...afterState(game, state, c) });
    if (saved?.status === 'finished') await finished(saved);
    return saved;
};

/**
 * A match whose join time has run out: play with whoever came; a side with
 * nobody loses by walkover; if nobody came at all, the admin decides.
 */
const resolveJoin = async (game) => {
    const present = game.seats.filter((s) => s.joinedAt);
    const sidesPresent = [...new Set(present.map((s) => s.side))].sort((a, b) => a - b);
    const sidesAll = [...new Set(game.seats.map((s) => s.side))].sort((a, b) => a - b);
    const absent = sidesAll.filter((s) => !sidesPresent.includes(s));
    const absentTeams = absent.map((s) => game.sideTeams[s]).filter(Boolean);

    if (sidesPresent.length === 0) {
        const saved = await commit(game, { status: 'abandoned', finishedAt: new Date(), outcome: { places: [], reason: 'Nobody joined the game.' } });
        if (saved) await finished(saved);
        return saved;
    }
    if (sidesPresent.length === 1) {
        const places = [sidesPresent, absent].filter((g) => g.length);
        const saved = await commit(game, {
            status: 'finished', finishedAt: new Date(),
            outcome: { places, reason: 'Walkover: the other side did not join in time.', walkover: true }
        });
        if (saved) await finished(saved);
        return saved;
    }
    // Renumber the sides that came to 0..k-1 for the engine, keeping the team
    // each new side number stands for.
    const map = new Map(sidesPresent.map((s, i) => [s, i]));
    let seats = present.map((s) => ({ ...s.toObject?.() ?? s, side: map.get(s.side) }));
    const e = engine(game.game);
    // Carrom plays 2 or 4 seats: three players means a partner is missing, so
    // each side plays singles with its first player.
    if (seats.length > e.maxSeats || (game.game === 'carrom' && seats.length === 3)) {
        seats = sidesPresent.map((_, i) => seats.find((s) => s.side === i));
    }
    const sideTeams = sidesPresent.map((s) => game.sideTeams[s]);
    return begin(game, seats, { sideTeams, absentTeams });
};

/** Apply whatever is due now: a join window closing, or a turn timing out. */
const catchUp = async (game) => {
    for (let tries = 0; tries < 3 && game; tries += 1) {
        const now = Date.now();
        if (game.status === 'waiting' && game.kind === 'match' && game.joinDeadline && game.joinDeadline.getTime() <= now) {
            const next = await resolveJoin(game);
            if (next) return next;
            game = await PlayGame.findById(game._id);
            continue;
        }
        if (game.status !== 'active' || !game.nextDeadline || game.nextDeadline.getTime() > now) return game;
        const c = ctx();
        const state = engine(game.game).tick(game.state, c);
        if (!state) return game;
        const saved = await commit(game, afterState(game, state, c));
        if (saved) {
            if (saved.status === 'finished') await finished(saved);
            game = saved;
            continue;     // a second timeout may already be due
        }
        game = await PlayGame.findById(game._id);
    }
    return game;
};

const load = async (gameId) => {
    if (!isId(gameId)) throw new PlayError('Game not found.', 404);
    const game = await PlayGame.findById(gameId);
    if (!game) throw new PlayError('Game not found.', 404);
    return game;
};

/**
 * What one person sees of one game. Seated players see their own hand; anyone
 * else signed in sees the table as a spectator.
 */
const present = (game, userId, extras = {}) => {
    const seat = seatOf(game, userId);
    const e = engine(game.game);
    const c = ctx();
    return {
        id: String(game._id),
        kind: game.kind,
        game: game.game,
        label: e.label,
        emoji: e.emoji,
        status: game.status,
        version: game.version,
        you: seat >= 0 ? seat : null,
        host: game.hostId ? String(game.hostId) === String(userId) : false,
        code: game.kind === 'friendly' && seat >= 0 ? game.code : null,
        seats: game.seats.map((s) => ({ name: s.name, side: s.side, joined: !!s.joinedAt })),
        minSeats: e.minSeats,
        maxSeats: e.maxSeats,
        joinDeadline: game.joinDeadline,
        outcome: game.outcome || null,
        view: game.state ? e.view(game.state, seat >= 0 ? seat : null, c) : null,
        ...extras
    };
};

/** One poll. `since` lets a caller hear "nothing new" without the body. */
const poll = async (gameId, userId, since) => {
    const game = await catchUp(await load(gameId));
    if (since != null && Number(since) === game.version) return { unchanged: true, version: game.version };
    return { game: present(game, userId, await context(game)) };
};

/** The competition and match a game belongs to, for the page's header. */
const context = async (game) => {
    if (game.kind !== 'match') return {};
    const Competition = require('../models/Competition');
    const Match = require('../models/Match');
    const Team = require('../models/Team');
    const [comp, match, teams] = await Promise.all([
        Competition.findById(game.competitionId).select('name').lean(),
        Match.findById(game.matchId).select('roundName kind').lean(),
        Team.find({ _id: { $in: [...game.sideTeams, ...game.absentTeams] } }).select('teamName collegeName').lean()
    ]);
    const name = (id) => teams.find((t) => String(t._id) === String(id));
    return {
        competition: comp ? { id: String(comp._id), name: comp.name } : null,
        match: match ? { id: String(match._id), roundName: match.kind === 'third-place' ? 'Third place' : match.roundName } : null,
        sides: game.sideTeams.map((id) => ({ teamName: name(id)?.teamName || '', collegeName: name(id)?.collegeName || '' }))
    };
};

/** Apply one action from one player, retrying if someone else wrote first. */
const act = async (gameId, userId, action) => {
    let game = await catchUp(await load(gameId));
    for (let tries = 0; tries < 4; tries += 1) {
        const seat = seatOf(game, userId);
        if (seat < 0) throw new PlayError('You are not playing in this game.', 403);
        if (game.status === 'waiting') throw new PlayError('The game has not started yet.', 409);
        if (game.status !== 'active') throw new PlayError('This game is over.', 409);
        const c = ctx();
        let state;
        try {
            state = engine(game.game).act(game.state, seat, action || {}, c);
        } catch (err) {
            if (err instanceof GameError || err?.name === 'GameError') throw new PlayError(err.message, 400);
            throw err;
        }
        const saved = await commit(game, afterState(game, state, c));
        if (saved) {
            if (saved.status === 'finished') await finished(saved);
            return { game: present(saved, userId, await context(saved)) };
        }
        game = await catchUp(await PlayGame.findById(game._id));
    }
    throw new PlayError('The game moved on while you were acting. Try again.', 409);
};

/** A seated player says they are here. A match starts once everyone is. */
const join = async (gameId, userId) => {
    let game = await catchUp(await load(gameId));
    for (let tries = 0; tries < 4; tries += 1) {
        const seat = seatOf(game, userId);
        if (seat < 0) throw new PlayError('You are not playing in this game.', 403);
        if (game.status !== 'waiting' || game.seats[seat].joinedAt) return { game: present(game, userId, await context(game)) };
        const seats = game.seats.map((s, i) => (i === seat ? { ...s.toObject(), joinedAt: new Date() } : s.toObject()));
        const everyone = game.kind === 'match' && seats.every((s) => s.joinedAt);
        const saved = everyone ? await begin(game, seats) : await commit(game, { seats });
        if (saved) return { game: present(saved, userId, await context(saved)) };
        game = await catchUp(await PlayGame.findById(game._id));
    }
    throw new PlayError('Could not join just now. Try again.', 409);
};

/* ── Friendly rooms ───────────────────────────────────────────────────── */

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 6 }, () => CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)]).join('');

/** Options a student may set on a friendly game, each clamped by its engine. */
const friendlyOptions = (game, raw = {}) => {
    const pick = (k, lo, hi) => (raw[k] == null || raw[k] === '' ? undefined : Math.max(lo, Math.min(hi, Number(raw[k]) || lo)));
    const o = {
        chess: { clockMinutes: pick('clockMinutes', 1, 60) },
        ludo: { tokensPerPlayer: pick('tokensPerPlayer', 2, 4), turnSeconds: pick('turnSeconds', 10, 120) },
        uno: { handSize: pick('handSize', 5, 7), turnSeconds: pick('turnSeconds', 10, 120) },
        carrom: { turnSeconds: pick('turnSeconds', 15, 120) }
    }[game] || {};
    return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
};

const createRoom = async (user, game, options) => {
    if (!engine(game)) throw new PlayError('Choose Chess, Ludo, Carrom or UNO.');
    for (let tries = 0; tries < 5; tries += 1) {
        try {
            const row = await PlayGame.create({
                kind: 'friendly', game, code: newCode(), hostId: user._id,
                options: friendlyOptions(game, options),
                seats: [{ userId: user._id, name: user.name || 'Player', side: 0, joinedAt: new Date() }]
            });
            return { game: present(row, user._id) };
        } catch (err) {
            if (err?.code !== 11000) throw err;     // a code already taken: draw another
        }
    }
    throw new PlayError('Could not make a room just now. Try again.', 503);
};

const joinRoom = async (user, rawCode) => {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) throw new PlayError('Enter the 6-character room code.');
    for (let tries = 0; tries < 4; tries += 1) {
        const game = await PlayGame.findOne({ code, kind: 'friendly', status: { $in: ['waiting', 'active'] } });
        if (!game) throw new PlayError('No open room has that code.', 404);
        if (seatOf(game, user._id) >= 0) return { game: present(game, user._id) };
        if (game.status !== 'waiting') throw new PlayError('That game has already started.', 409);
        const e = engine(game.game);
        if (game.seats.length >= e.maxSeats) throw new PlayError(`That room is full (${e.maxSeats} players).`, 409);
        const seats = [...game.seats.map((s) => s.toObject()), { userId: user._id, name: user.name || 'Player', side: game.seats.length, joinedAt: new Date() }];
        const saved = await commit(game, { seats });
        if (saved) return { game: present(saved, user._id) };
    }
    throw new PlayError('Could not join just now. Try again.', 409);
};

/** The host starts a friendly game once enough players have joined. */
const startRoom = async (gameId, userId) => {
    const game = await load(gameId);
    if (game.kind !== 'friendly') throw new PlayError('Competition games start on their own.', 400);
    if (String(game.hostId) !== String(userId)) throw new PlayError('Only the person who made the room can start it.', 403);
    if (game.status !== 'waiting') return { game: present(game, userId) };
    const e = engine(game.game);
    const n = game.seats.length;
    if (n < e.minSeats) throw new PlayError(`${e.label} needs at least ${e.minSeats} players.`);
    if (game.game === 'carrom' && n === 3) throw new PlayError('Carrom is played by 2 (singles) or 4 (doubles).');
    // Carrom doubles: partners sit opposite (sides 0, 1, 0, 1).
    const seats = game.seats.map((s, i) => ({ ...s.toObject(), side: game.game === 'carrom' && n === 4 ? i % 2 : i }));
    const saved = await begin(game, seats);
    if (!saved) throw new PlayError('The room changed while starting. Try again.', 409);
    return { game: present(saved, userId) };
};

/** Leave a room before it starts; the host leaving closes it. */
const leaveRoom = async (gameId, userId) => {
    const game = await load(gameId);
    if (game.kind !== 'friendly' || game.status !== 'waiting') throw new PlayError('Only a room that has not started can be left.', 409);
    if (seatOf(game, userId) < 0) return { left: true };
    if (String(game.hostId) === String(userId)) {
        await commit(game, { status: 'abandoned', finishedAt: new Date() });
        return { left: true, closed: true };
    }
    const seats = game.seats.filter((s) => String(s.userId) !== String(userId)).map((s, i) => ({ ...s.toObject(), side: i }));
    await commit(game, { seats });
    return { left: true };
};

/** My friendly games still open or in play, newest first. */
const myRooms = async (userId) => {
    const rows = await PlayGame.find({ kind: 'friendly', 'seats.userId': userId, status: { $in: ['waiting', 'active'] } })
        .sort({ updatedAt: -1 }).limit(10);
    return rows.map((g) => {
        const p = present(g, userId);
        delete p.view;
        return p;
    });
};

/**
 * Open a competition match's game: seats from the teams' line-ups, and a
 * join window. Used by the bracket service.
 */
const openMatchGame = async ({ competition, match, teams }) => {
    const per = competition.playersPerSide || 1;
    const sides = match.sides.map((side) => {
        const team = teams.find((t) => String(t._id) === String(side.teamId));
        const chosen = (side.lineup?.length ? side.lineup.map(String) : team.players.map((p) => String(p.userId))).slice(0, per);
        return chosen.map((id) => ({ userId: id, name: team.players.find((p) => String(p.userId) === id)?.name || 'Player' }));
    });
    let seats;
    if (competition.game === 'carrom' && per === 2) {
        // Doubles: A1, B1, A2, B2 — partners opposite.
        seats = [0, 1].flatMap((k) => sides.map((players, side) => (players[k] ? { ...players[k], side } : null))).filter(Boolean);
    } else {
        seats = sides.flatMap((players, side) => players.map((p) => ({ ...p, side })));
    }
    return PlayGame.create({
        kind: 'match', game: competition.game,
        competitionId: competition._id, matchId: match._id,
        sideTeams: match.sides.map((s) => s.teamId),
        options: competition.gameOptions || {},
        seats,
        joinDeadline: new Date(Date.now() + JOIN_MINUTES * 60 * 1000)
    });
};

module.exports = {
    PlayError, JOIN_MINUTES, poll, act, join, catchUp, present,
    createRoom, joinRoom, startRoom, leaveRoom, myRooms, openMatchGame, friendlyOptions
};
