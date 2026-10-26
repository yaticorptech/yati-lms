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

/**
 * Playing with friends (rooms with a code) was removed on 2026-10-23: only
 * competition matches are played now. A friendly game saved before then is
 * turned away, not shown.
 */
const FRIENDLY_GONE = 'Playing with friends is no longer available. Play in a competition instead.';
const playable = (game) => {
    if (game.kind === 'friendly') throw new PlayError(FRIENDLY_GONE, 410);
    return game;
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
        // My own joining code, and whether I have taken my seat.
        code: game.kind === 'match' && seat >= 0 ? (game.seats[seat].code && !game.seats[seat].code.startsWith('~') ? game.seats[seat].code : null) || game.code || null : null,
        joined: seat >= 0 ? !!game.seats[seat].joinedAt : null,
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
    const game = await catchUp(playable(await load(gameId)));
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
    let game = await catchUp(playable(await load(gameId)));
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

const normal = (code) => String(code || '').trim().toUpperCase();

/**
 * A seated player says they are here, with their own joining code (a game
 * opened before codes per player existed asks for none). A match starts once
 * everyone is.
 */
const join = async (gameId, userId, code) => {
    let game = await catchUp(playable(await load(gameId)));
    for (let tries = 0; tries < 4; tries += 1) {
        const seat = seatOf(game, userId);
        if (seat < 0) throw new PlayError('You are not playing in this game.', 403);
        if (game.status !== 'waiting' || game.seats[seat].joinedAt) return { game: present(game, userId, await context(game)) };
        const own = game.seats[seat].code;
        // An entry fee not paid yet: no seat until it is.
        const owed = game.kind === 'match' ? await require('./entryFee').owedBy(game.competitionId, userId) : 0;
        if (owed) throw new PlayError(`Pay the ₹${owed} entry fee to join this competition.`, 402);
        if (own && !normal(code)) throw new PlayError('Enter your joining code to join.', 400);
        if (own && normal(code) !== own) throw new PlayError('That is not your joining code. Use the code sent to you.', 403);
        const seats = game.seats.map((s, i) => (i === seat ? { ...s.toObject(), joinedAt: new Date() } : s.toObject()));
        const everyone = game.kind === 'match' && seats.every((s) => s.joinedAt);
        const saved = everyone ? await begin(game, seats) : await commit(game, { seats });
        if (saved) return { game: present(saved, userId, await context(saved)) };
        game = await catchUp(await PlayGame.findById(game._id));
    }
    throw new PlayError('Could not join just now. Try again.', 409);
};

/* ── Match codes (asked 2026-10-23) ───────────────────────────────────── */

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 6 }, () => CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)]).join('');

/**
 * Every open match game in `rows` given its 6-character code, if it has none
 * yet (one opened before codes existed). Codes are unique; a clash draws
 * another. Changes the rows in place.
 */
const withCodes = async (rows) => {
    for (const g of rows) {
        if (g.code || g.kind !== 'match' || !['waiting', 'active'].includes(g.status)) continue;
        for (let tries = 0; tries < 5 && !g.code; tries += 1) {
            const code = newCode();
            try {
                const r = await PlayGame.updateOne({ _id: g._id, code: null }, { $set: { code } });
                if (r.modifiedCount) g.code = code;
                else g.code = (await PlayGame.findById(g._id).select('code').lean())?.code || null;
            } catch (err) { if (err?.code !== 11000) throw err; }
        }
    }
    return rows;
};

/**
 * A player types a joining code. Their own personal code takes their seat and
 * opens the game; another player's is refused. (A Quiz Arena code is the
 * arena's: see arena/student.js.) A match game opened before personal codes
 * still opens with its match code.
 */
const joinByCode = async (user, rawCode) => {
    const code = normal(rawCode);
    if (!/^[A-Z0-9]{6}$/.test(code)) throw new PlayError('Enter your 6-character joining code.');
    const mine = await PlayGame.findOne({ 'seats.code': code, kind: 'match' }).select('status seats').lean();
    if (mine) {
        const seat = mine.seats.find((s) => s.code === code);
        if (String(seat.userId) !== String(user._id)) throw new PlayError('This joining code belongs to another player. Use the code sent to you.', 403);
        if (!['waiting', 'active'].includes(mine.status)) throw new PlayError('That match is over. See the result in My Games.', 409);
        await join(mine._id, user._id, code);
        return { game: { id: String(mine._id) } };
    }
    const game = await PlayGame.findOne({ code, kind: 'match' }).select('status seats').lean();
    if (!game) return null;
    if (seatOf(game, user._id) < 0) throw new PlayError('That code is for another match. Your own joining code is in My Games.', 403);
    if (game.seats.some((s) => s.code)) throw new PlayError('Use your own joining code: it is in your notification and in My Games.', 403);
    if (!['waiting', 'active'].includes(game.status)) throw new PlayError('That match is over. See the result in My Games.', 409);
    return { game: { id: String(game._id) } };
};

/** A competition's game options, each clamped to what its engine allows (UNO's, Ludo's and Carrom's for one made before they were removed). */
const gameOptions = (game, raw = {}) => {
    const pick = (k, lo, hi) => (raw[k] == null || raw[k] === '' ? undefined : Math.max(lo, Math.min(hi, Number(raw[k]) || lo)));
    const o = {
        chess: { clockMinutes: pick('clockMinutes', 1, 60) },
        ludo: { tokensPerPlayer: pick('tokensPerPlayer', 2, 4), turnSeconds: pick('turnSeconds', 10, 120) },
        uno: { handSize: pick('handSize', 5, 7), turnSeconds: pick('turnSeconds', 10, 120) },
        carrom: { turnSeconds: pick('turnSeconds', 15, 120) },
        rapidfire: { questionCount: pick('questionCount', 10, 30), questionSeconds: pick('questionSeconds', 5, 20) },
        codeclash: { questionCount: pick('questionCount', 5, 15), questionSeconds: pick('questionSeconds', 20, 120) },
        brainsprint: { questionCount: pick('questionCount', 5, 20), questionSeconds: pick('questionSeconds', 10, 60) }
    }[game] || {};
    return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
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
    // One joining code per player per competition: a player who had one in an
    // earlier game of this competition (a replay after a draw, the next round)
    // keeps it; it moves from the finished game to this one.
    const kept = {};
    for (const s of seats) {
        const earlier = await PlayGame.findOne({ competitionId: competition._id, seats: { $elemMatch: { userId: s.userId, code: { $type: 'string', $not: /^~/ } } } }).sort({ createdAt: -1 }).select('seats').lean();
        const code = earlier?.seats.find((x) => String(x.userId) === String(s.userId))?.code;
        if (code) kept[String(s.userId)] = code;
    }
    // The finished game keeps a retired form of the code ("~CODE:game"), unique
    // and never shown, so the code itself is free for the new game.
    for (const code of Object.values(kept)) {
        const old = await PlayGame.find({ 'seats.code': code }).select('_id').lean();
        for (const g of old) await PlayGame.updateOne({ _id: g._id }, { $set: { 'seats.$[s].code': `~${code}:${g._id}` } }, { arrayFilters: [{ 's.code': code }] });
    }
    for (let tries = 0; ; tries += 1) {
        // Every other player their own new joining code, none the same.
        const codes = new Set(Object.values(kept));
        const fresh = [];
        while (fresh.length < seats.filter((s) => !kept[String(s.userId)]).length) {
            const c = newCode();
            if (!codes.has(c)) { codes.add(c); fresh.push(c); }
        }
        let k = 0;
        seats = seats.map((s) => ({ ...s, code: kept[String(s.userId)] || fresh[k++] }));
        try {
            return await PlayGame.create({
                kind: 'match', game: competition.game, code: newCode(),
                competitionId: competition._id, matchId: match._id,
                sideTeams: match.sides.map((s) => s.teamId),
                options: competition.gameOptions || {},
                seats,
                joinDeadline: new Date(Date.now() + JOIN_MINUTES * 60 * 1000)
            });
        } catch (err) {
            if (err?.code !== 11000 || tries >= 4) throw err;     // a code already taken: draw another
        }
    }
};

module.exports = { PlayError, JOIN_MINUTES, FRIENDLY_GONE, poll, act, join, catchUp, present, openMatchGame, gameOptions, withCodes, joinByCode };
