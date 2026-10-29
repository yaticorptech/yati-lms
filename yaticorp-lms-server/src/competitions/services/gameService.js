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
    // Every player's screen hears of it at once (realtime.js); each then fetches its own view.
    if (next) require('../realtime').notify(next);
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
    // A game since removed (Lost Treasure, 2026-10-28): its old rooms say so rather than fail.
    if (!require('../games').engine(game.game)) throw new PlayError('This game is no longer available.', 410);
    return game;
};

/** Called once a game finishes; a competition match moves on from here (a room has nothing more to do). */
const finished = async (game) => {
    // A Group Brain room: its results, XP, ratings and awards, written once.
    if (game.kind === 'room') {
        try { await require('../groupbrain/results').record(game); }
        catch (err) { console.error('[group brain] recording a result failed:', err.message); }
        // An online table: the winner's prize from the pot.
        try { await require('./onlineService').payOut(game); }
        catch (err) { console.error('[group brain] paying a prize failed:', err.message); }
    }
    if (game.kind === 'match') {
        try { await require('./bracketService').recordGame(game); }
        catch (err) { console.error('[competitions] recording a result failed:', err.message); }
    }
};

/** The fields that change whenever the engine state does. */
/**
 * A Group Brain room never ends level (asked 2026-10-28: "only one can win"):
 * players level on points (and time) are split by more right answers, then
 * fewer mistakes, then who sat down first — 1st, 2nd, 3rd, 4th, one each.
 * Chess keeps its draws: a drawn chess game is a result of its own.
 */
const oneEach = (game, state, out) => {
    if (game.kind !== 'room' || game.game === 'chess' || !out?.places?.some((g) => g.length > 1)) return out;
    const seatOf = (side) => (state.seats || []).findIndex((x) => x.side === side);
    const right = (i) => state.correct?.[i] ?? state.progress?.[i]?.stage ?? 0;
    const wrong = (i) => state.progress?.[i]?.mistakes ?? state.mistakes?.[i] ?? 0;
    const places = out.places.flatMap((g) => [...g]
        .sort((a, b) => { const x = seatOf(a); const y = seatOf(b); return right(y) - right(x) || wrong(x) - wrong(y) || x - y; })
        .map((side) => [side]));
    const first = state.seats?.[seatOf(places[0][0])]?.name;
    const reason = out.places[0].length > 1 ? 'Level on points — decided by right answers, then mistakes, then who joined first' : out.reason;
    if (state.result) { state.result.places = places; state.result.reason = reason; }
    if (first) state.message = `${first} wins.`;
    return { ...out, places, reason };
};

const afterState = (game, state, c) => {
    const e = engine(game.game);
    const out = oneEach(game, state, e.outcome(state));
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

/* ── Presence in a room's lobby ─────────────────────────────────────── */

// A player is here while their screen checks in (every poll, at least every
// few seconds); gone after OFFLINE_MS without. A host gone HOST_GONE_MS hands
// the room to the next player still here, so the others can still start.
const OFFLINE_MS = 20000;
const HOST_GONE_MS = 45000;
const SEEN_EVERY_MS = 8000;

/** Mark who is here and pass on a vanished host; a change is committed (and pushed to everyone). */
const presence = async (game) => {
    const now = Date.now();
    const seen = (s) => new Date(s.lastSeenAt || s.joinedAt || game.createdAt).getTime();
    const seats = game.seats.map((s) => ({ ...(s.toObject ? s.toObject() : s), online: now - seen(s) < OFFLINE_MS }));
    let hostId = game.hostId;
    const host = seats.find((s) => String(s.userId) === String(hostId));
    const next = seats.find((s) => s.online && String(s.userId) !== String(hostId));
    if (host && now - seen(host) > HOST_GONE_MS && next) {
        hostId = next.userId;
        next.ready = true;
    }
    const changed = String(hostId) !== String(game.hostId) || seats.some((s, i) => s.online !== (game.seats[i].online !== false));
    return changed ? commit(game, { seats, hostId }) : null;
};

/** A seated player's screen checked in (not a change to the game: no version, no push). */
const touch = async (game, userId) => {
    if (game.kind !== 'room' || !['waiting', 'active'].includes(game.status)) return;
    const s = game.seats[seatOf(game, userId)];
    if (!s || (s.lastSeenAt && Date.now() - new Date(s.lastSeenAt).getTime() < SEEN_EVERY_MS)) return;
    await PlayGame.updateOne({ _id: game._id, 'seats.userId': s.userId }, { $set: { 'seats.$.lastSeenAt': new Date() } });
};

/** Apply whatever is due now: a join window closing, or a turn timing out. */
const catchUp = async (game) => {
    for (let tries = 0; tries < 3 && game; tries += 1) {
        const now = Date.now();
        // An online table whose wait is over starts with who is there (or closes, fees back: ./onlineService.js).
        if (game.status === 'waiting' && game.kind === 'room' && game.options?.online && game.joinDeadline && game.joinDeadline.getTime() <= now) {
            const next = await require('./onlineService').settle(game);
            if (next) return next;
            game = await PlayGame.findById(game._id);
            continue;
        }
        // A room nobody started in time closes.
        if (game.status === 'waiting' && game.kind === 'room' && game.joinDeadline && game.joinDeadline.getTime() <= now) {
            const next = await commit(game, { status: 'abandoned', finishedAt: new Date(), outcome: { places: [], reason: 'The room closed before the game was started.' } });
            if (next) return next;
            game = await PlayGame.findById(game._id);
            continue;
        }
        if (game.status === 'waiting' && game.kind === 'match' && game.joinDeadline && game.joinDeadline.getTime() <= now) {
            const next = await resolveJoin(game);
            if (next) return next;
            game = await PlayGame.findById(game._id);
            continue;
        }
        // A room's lobby: who is still here, and a host who has gone.
        if (game.status === 'waiting' && game.kind === 'room') return (await presence(game)) || game;
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
    const out = {
        id: String(game._id),
        kind: game.kind,
        game: game.game,
        label: e.label,
        emoji: e.emoji,
        status: game.status,
        version: game.version,
        you: seat >= 0 ? seat : null,
        // My own joining code, and whether I have taken my seat.
        // A room's code, to share, for everyone in it.
        code: seat < 0 ? null
            : game.kind === 'room' ? game.code
                : game.kind === 'match' ? (game.seats[seat].code && !game.seats[seat].code.startsWith('~') ? game.seats[seat].code : null) || game.code || null : null,
        joined: seat >= 0 ? !!game.seats[seat].joinedAt : null,
        seats: game.seats.map((s) => ({ name: s.name, side: s.side, joined: !!s.joinedAt, ...(game.kind === 'room' ? { ready: !!s.ready, host: String(s.userId) === String(game.hostId), online: s.online !== false } : {}) })),
        host: game.kind === 'room' ? seat >= 0 && String(game.hostId) === String(userId) : undefined,
        options: game.kind === 'room' ? game.options || {} : undefined,
        minSeats: e.minSeats,
        // A room holds what its maker picked (2 to 20).
        maxSeats: game.kind === 'room' && game.options?.players ? Math.min(e.maxSeats, Number(game.options.players)) : e.maxSeats,
        joinDeadline: game.joinDeadline,
        // An online table: its fee, pot and prize (./onlineService.js).
        online: game.kind === 'room' ? require('./onlineService').tableInfo(game) : undefined,
        outcome: game.outcome || null,
        view: game.state ? e.view(game.state, seat >= 0 ? seat : null, c) : null,
        ...extras
    };
    return extras.resultsHidden ? hideResults(out) : out;
};

/**
 * A competition match before its results are published: no winner, and in
 * the quiz games no scores — my own answers only. Chess keeps its board.
 */
const hideResults = (g) => {
    const outcome = g.status === 'finished' ? { places: [], reason: 'The match is over. Results are shown once the organizer publishes them.', hidden: true } : null;
    if (g.game === 'chess') return { ...g, outcome, view: g.view && { ...g.view, outcome: null, message: g.status === 'finished' ? outcome.reason : g.view.message } };
    const v = g.view && {
        ...g.view,
        scores: null, correct: null, answer: null, outcome: null, recap: null,
        message: g.status === 'finished' ? 'Your answers are in. Results are shown once the organizer publishes them.' : g.view.message,
        answers: (g.view.answers || []).map((a, i) => (!a ? null : i === g.you ? { choice: a.choice } : { answered: true }))
    };
    return { ...g, outcome, view: v };
};

/** One poll. `since` lets a caller hear "nothing new" without the body. */
const poll = async (gameId, userId, since) => {
    const game = await catchUp(playable(await load(gameId)));
    // A room is for the players in it: anyone else joins with its code first.
    if (game.kind === 'room' && seatOf(game, userId) < 0) throw new PlayError('This room is private. Join it with its room code.', 403);
    await touch(game, userId);
    if (since != null && Number(since) === game.version) return { unchanged: true, version: game.version };
    return { game: present(game, userId, { ...(await context(game)), ...(await myResult(game, userId)) }) };
};

/** A finished room's own result for this player: score, XP, rating change. */
const myResult = async (game, userId) => {
    if (game.kind !== 'room' || game.status !== 'finished') return {};
    const { GroupBrainResult } = require('../groupbrain/models');
    const read = () => GroupBrainResult.find({ gameId: game._id }).select('userId name place won draw score xp xpStatus resigned reason').sort({ place: 1 }).lean();
    let rows = await read();
    // The game has only just ended (every screen is told at once): its
    // results may still be being written by the request that ended it.
    // Write them here if nobody has started, else wait a moment for them.
    if (!rows.length) {
        await require('../groupbrain/results').record(game).catch(() => {});
        for (let i = 0; i < 30 && !rows.length; i += 1) {
            rows = await read();
            if (!rows.length) await new Promise((r) => setTimeout(r, 100));
        }
    }
    // Every player's place and XP, for the podium at the end (the same for everyone).
    const standings = rows.map((r) => ({ name: r.name, place: r.place, won: r.won, draw: r.draw, score: r.score, xp: r.xpStatus === 'paid' ? r.xp : 0, resigned: r.resigned, you: String(r.userId) === String(userId), seat: game.seats.findIndex((s) => String(s.userId) === String(r.userId)) }));
    // Won because the others left: say who left (the recorded reason), not the engine's "The others left".
    const left = rows.find((r) => /left the game/.test(r.reason || ''))?.reason;
    return { result: await require('../groupbrain/results').mine(game._id, userId), standings, ...(left ? { outcome: { ...(game.outcome || {}), reason: left } } : {}) };
};

/** The competition and match a game belongs to, for the page's header. */
const context = async (game) => {
    if (game.kind === 'room') {
        // Each player's picture, for the lobby and the scoreboard.
        const User = require('../../models/User');
        const users = await User.find({ _id: { $in: game.seats.map((s) => s.userId) } }).select('profilePicture').lean();
        const pic = new Map(users.map((u) => [String(u._id), u.profilePicture || '']));
        return { avatars: game.seats.map((s) => pic.get(String(s.userId)) || null) };
    }
    if (game.kind !== 'match') return {};
    const Competition = require('../models/Competition');
    const Match = require('../models/Match');
    const Team = require('../models/Team');
    const [comp, match, teams] = await Promise.all([
        Competition.findById(game.competitionId).select('name game resultsPublishedAt').lean(),
        Match.findById(game.matchId).select('roundName kind').lean(),
        Team.find({ _id: { $in: [...game.sideTeams, ...game.absentTeams] } }).select('teamName collegeName').lean()
    ]);
    const name = (id) => teams.find((t) => String(t._id) === String(id));
    return {
        competition: comp ? { id: String(comp._id), name: comp.name } : null,
        // No match result (or scores) for the players until the organizer publishes the competition's results.
        resultsHidden: !!comp && require('./views').resultsHidden(comp),
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
            return { game: present(saved, userId, { ...(await context(saved)), ...(await myResult(saved, userId)) }) };
        }
        game = await catchUp(await PlayGame.findById(game._id));
    }
    throw new PlayError('The game moved on while you were acting. Try again.', 409);
};

/** TEMPORARY (online test players, ./testBots.js): a move the server makes for a seat. Null if refused. */
const actForSeat = async (game, seat, action) => {
    if (game.status !== 'active') return null;
    const c = { ...ctx(), bot: true };
    let state;
    try {
        state = engine(game.game).act(game.state, seat, action, c);
    } catch (err) {
        if (err instanceof GameError || err?.name === 'GameError') return null;
        throw err;
    }
    const saved = await commit(game, afterState(game, state, c));
    if (saved?.status === 'finished') await finished(saved);
    return saved;
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

module.exports = { PlayError, JOIN_MINUTES, FRIENDLY_GONE, poll, act, actForSeat, join, catchUp, present, context, openMatchGame, gameOptions, withCodes, joinByCode, begin, commit, load, seatOf, newCode, normal };
