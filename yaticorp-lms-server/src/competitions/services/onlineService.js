/**
 * Group Brain "Play online" (asked 2026-10-28): like online Ludo. A student
 * picks a game, a table of 2 or 4, and an entry fee; the server seats them at
 * a waiting table of the same game, size and fee, or opens one. The fee comes
 * out of their XP as they sit down.
 *
 *   A full table starts at once. A table not full after WAIT_MS starts with
 *   whoever is there (at least the game's minSeats); a player left alone gets
 *   the fee back and is told no players were found.
 *   Leaving the table before the start gives the fee back.
 *   Once the game is on, leaving is resigning: the fee stays in the pot.
 *   When it finishes, first place takes PRIZE_SHARE of the pot (every fee
 *   paid), split between those level at the top; the rest is the platform's.
 *   A table that closes without a game refunds everyone.
 *
 * A table is a PlayGame of kind 'room' with options.online, so the game, its
 * results and XP are a room's: only how it fills and starts differs.
 * XP entries are keyed (referenceKey), so a fee, refund or prize can
 * never be written twice.
 */
const crypto = require('crypto');
const PlayGame = require('../models/PlayGame');
const { engine, ROOM_GAMES } = require('../games');
const games = require('./gameService');
const { getSettings } = require('../groupbrain/settings');

const { PlayError } = games;
const FEES = [0, 10, 25, 50];
// Tables of 2 to 20 (asked 2026-10-29: 8, 10 and more as well; Chess, Tic-Tac-Toe and Last Stone stay 2, their engines' maxSeats).
const SIZES = [2, 4, 6, 8, 10, 12, 16, 20];
const WAIT_MS = 30000;
const PRIZE_SHARE = 0.9;
// TEMPORARY, for trying it out (asked 2026-10-28, "until I say stop"): an
// online table of any of these games fills up with test players (the seeded
// test.ten*@yaticorp-test.invalid accounts, scripts/seedTenPlayers.js), one
// at a time a few seconds apart like players found online (asked
// 2026-10-29), while real players who pick the same game, size and fee join
// the same table. They pay nothing, and play by themselves (./testBots.js,
// from options.testers). Remove the entry to stop.
// Off under the test suite, which checks the real search.
const TEST_FILL = process.env.NODE_ENV === 'test' ? {} : Object.fromEntries(ROOM_GAMES.map((id) => [id, engine(id).maxSeats === 2 ? 2 : 4]));
const TEST_EMAILS = /^test\.ten\d+@yaticorp-test\.invalid$/;

// The fee, the refunds and the prize are XP (2026-10-31, was wallet rupees): the same calls, on the student's XP.
const wallet = () => {
    const xp = require('../../rewards/services/xpService');
    return {
        debit: ({ userId, amount, source, referenceKey, description }) => xp.spendXp({ userId, amount, source, refId: referenceKey, description })
            .catch((err) => { throw err.code === 'INSUFFICIENT_XP' ? Object.assign(err, { code: 'INSUFFICIENT_FUNDS' }) : err; }),
        credit: ({ userId, amount, source, referenceKey, description }) => xp.addXp({ userId, amount, source, refId: referenceKey, description })
    };
};
const money = (n) => Math.round(Number(n));
const sameId = (a, b) => String(a) === String(b);
const isOnline = (game) => game?.kind === 'room' && !!game.options?.online;

/** What a table of `size` at `fee` pays its winner. */
const prizeOf = (fee, size) => money(fee * size * PRIZE_SHARE);

/** Give one player's fee back (once). */
const refund = async (game, userId, why) => {
    const key = game.options?.paid?.[String(userId)];
    if (!key || !(game.options.fee > 0)) return;
    await wallet().credit({
        userId, amount: game.options.fee, source: 'game_refund', referenceKey: key.replace('gb-fee', 'gb-refund'),
        description: `${engine(game.game).label} online — fee returned (${why})`, meta: { gameId: String(game._id) }
    }).catch((err) => console.error('[group brain] refund failed:', err.message));
};

/** A table that closed without a game: everyone's fee back. */
const refundAll = async (game, why) => {
    for (const userId of Object.keys(game.options?.paid || {})) await refund(game, userId, why);
};

/** Start a table with the players at it. */
const start = async (game) => {
    const seats = game.seats.map((s, i) => ({ ...(s.toObject ? s.toObject() : s), side: i, ready: true }));
    game.options = { ...(game.options || {}), extraQuestions: await require('../groupbrain/questions').forGame(game.game) };
    return games.begin(game, seats);
};

/**
 * A waiting table whose time is up (from gameService's catchUp): start with
 * who is there, or close it and give the fees back. Returns the saved table, or null if it changed under us.
 */
const settle = async (game) => {
    if (game.seats.length >= engine(game.game).minSeats) return start(game);
    const saved = await games.commit(game, { status: 'abandoned', finishedAt: new Date(), outcome: { places: [], reason: 'No players found. Your entry fee XP is back.' } });
    if (saved) await refundAll(saved, 'no players found');
    return saved;
};

/**
 * Of the tables I could sit at, the one whose seated players' average recent form (options.perf, 0…1, from their
 * solo twin) is closest to mine; `tables` come oldest first, so a tie goes to the one waiting longest. Deterministic.
 */
const closestTable = (tables, perf) => {
    let best = null, gap = Infinity;
    for (const t of tables) {
        const vals = t.seats.map((s) => Number(t.options?.perf?.[String(s.userId)])).filter((n) => Number.isFinite(n));
        const d = vals.length ? Math.abs(vals.reduce((a, b) => a + b, 0) / vals.length - perf) : 0.5;
        if (d < gap) { best = t; gap = d; }
    }
    return best;
};

/** Sit me at a table: one waiting for this game, zone, size and fee, or a new one. */
const findTable = async (user, gameId, raw = {}) => {
    if (!ROOM_GAMES.includes(gameId)) throw new PlayError('Pick one of the Group Brain games.');
    // Group games: 30 minutes of play a day (career/controllers/gameController.js), then closed until midnight.
    { const gc = require('../../career/controllers/gameController'); if (await gc.groupTimeUp(user._id)) throw new PlayError(await gc.groupTimeUpMessage(user._id), 403); }
    const e = engine(gameId);
    const settings = (await getSettings()).games[gameId];
    if (!settings.enabled) throw new PlayError(`${e.label} is switched off for now.`, 403);
    // A game for two (Chess, Tic-Tac-Toe, Last Stone): a table of 2, whatever was asked.
    const players = e.maxSeats === 2 ? 2 : Number(raw.players);
    // Any number typed (2026-10-31), from 2 up to what the game seats.
    if (!Number.isInteger(players) || players < 2 || players > e.maxSeats) throw new PlayError(`A table is for 2 to ${e.maxSeats} players.`);
    // Earned in the solo games first (services/unlocks.js).
    await require('./unlocks').check(user._id, gameId, players, PlayError);
    const fee = Number(raw.fee ?? 0);
    if (!FEES.includes(fee)) throw new PlayError(`The entry fee is one of ${FEES.map((f) => (f ? `${f} XP` : 'Free')).join(', ')}.`);
    // The table's age zone (2026-11-13): picked, else my own (./zoneGate.js); its difficulty comes from the zone.
    // Tables only ever mix players of one zone; classes may differ within it.
    const zg = require('./zoneGate');
    const own = await zg.zoneOfUser(user._id);
    const zone = raw.zone != null && raw.zone !== '' ? raw.zone : zg.defaultZone(own.zone, gameId);
    if (!zg.isZone(zone)) throw new PlayError('Pick a zone: Young Thinkers, Rising Brains or Master Minds.');
    const difficulty = zg.ZONE_DIFFICULTY[zone];
    if (!settings.difficulties.includes(difficulty)) throw new PlayError(`${e.label} is open at ${settings.difficulties.join(', ')} only for now, so it can't be played in ${zg.ZONE_NAMES[zone]}. Try another zone.`, 403);
    await zg.assertCanPlay({ userId: user._id, name: user.name, you: true, game: gameId, label: e.label, zone, PlayError });
    // How I have been doing in this game's solo twin lately: tables of players at a like level are preferred.
    const perf = Math.round((await zg.recentPerf(user._id, gameId)) * 1000) / 1000;
    // A game I have left (resigned) does not hold me (roomService.openRoomOf).
    const busy = await require('./roomService').openRoomOf(user._id);
    if (busy) {
        // Already at a table for this same game: go back to it.
        if (busy.options?.online && busy.game === gameId && (busy.status !== 'waiting' || (busy.options.zone || zone) === zone)) return { game: { id: String(busy._id) } };
        // Still searching at another game's table: leave it (fee back), then on to this one.
        if (busy.options?.online && busy.status === 'waiting') await cancel(busy._id, user._id);
        else if (busy.options?.online) throw Object.assign(new PlayError(`You are playing ${engine(busy.game)?.label || 'another game'} online right now. Finish it or leave it first.`, 409), { roomId: String(busy._id) });
        else throw Object.assign(new PlayError(`You are already in a ${engine(busy.game)?.label || ''} room (code ${busy.code}). Leave it or finish its game first.`, 409), { roomId: String(busy._id) });
    }

    for (let tries = 0; tries < 6; tries += 1) {
        // A table still filling for this game, zone, size and fee — of those, the one whose players' recent form is
        // closest to mine (oldest first on a tie) — else a new one.
        const open = await PlayGame.find({
            kind: 'room', game: gameId, status: 'waiting', 'options.online': true, 'options.zone': zone, 'options.players': players, 'options.fee': fee,
            joinDeadline: { $gt: new Date(Date.now() + 2000) }, [`seats.${players - 1}`]: { $exists: false }
        }).sort({ createdAt: 1 }).limit(20);
        let table = closestTable(open, perf);
        const fresh = !table;
        if (fresh) {
            table = await PlayGame.create({
                kind: 'room', game: gameId, code: games.newCode(), hostId: user._id,
                options: { difficulty, zone, players, online: true, fee, paid: {}, perf: {} }, seats: [],
                joinDeadline: new Date(Date.now() + WAIT_MS)
            }).catch((err) => { if (err?.code === 11000) return null; throw err; });
            if (!table) continue;
        }
        // The fee first: no seat without it.
        const key = `gb-fee:${table._id}:${user._id}:${crypto.randomBytes(3).toString('hex')}`;
        if (fee > 0) {
            await wallet().debit({ userId: user._id, amount: fee, source: 'game_entry', referenceKey: key, description: `${e.label} online — entry fee`, meta: { gameId: String(table._id) } })
                .catch((err) => { throw new PlayError(err.code === 'INSUFFICIENT_FUNDS' ? `You have less than ${fee} XP. Pick a smaller fee or play free.` : err.message, 402); });
        }
        const seats = [...table.seats.map((s) => s.toObject()), { userId: user._id, name: user.name || 'Player', side: table.seats.length, joinedAt: new Date(), lastSeenAt: new Date(), ready: true }];
        const saved = await games.commit(table, { seats, options: { ...table.options, paid: { ...(table.options.paid || {}), [String(user._id)]: key }, perf: { ...(table.options.perf || {}), [String(user._id)]: perf } } });
        if (!saved) {
            // Someone sat down first: give the fee back and try again.
            if (fee > 0) await wallet().credit({ userId: user._id, amount: fee, source: 'game_refund', referenceKey: key.replace('gb-fee', 'gb-refund'), description: `${e.label} online — fee returned (seat taken)` }).catch(() => {});
            continue;
        }
        // Full: it starts now.
        if (saved.seats.length >= players) await start(saved);
        return { game: { id: String(saved._id) } };
    }
    throw new PlayError('Could not find a table just now. Try again.', 503);
};

/**
 * TEMPORARY (TEST_FILL, from ./testBots.js every second): a waiting table
 * gets its next test player once a few seconds have passed since the last
 * one sat down (4–7 s for the first, then 2–5 s), and starts when it is full.
 * A table with only test players left closes.
 */
const addTester = async (table) => {
    if (table.status !== 'waiting' || !isOnline(table) || !TEST_FILL[table.game]) return;
    const testers = table.options.testers || [];
    const humans = table.seats.filter((_, i) => !testers.includes(i));
    if (!humans.length) {
        await games.commit(table, { status: 'abandoned', finishedAt: new Date(), outcome: { places: [], reason: 'Everyone left the table.' } });
        return;
    }
    if (table.seats.length >= table.options.players) return;
    const last = Math.max(...table.seats.map((s) => new Date(s.joinedAt || table.createdAt).getTime()));
    const wait = testers.length ? 2000 + ((table.seats.length * 1543) % 3000) : 4000 + ((String(table._id).charCodeAt(23) * 97) % 3000);
    if (Date.now() - last < wait) return;
    const User = require('../../models/User');
    const taken = new Set(table.seats.map((s) => String(s.userId)));
    const { hasLeft } = require('./roomService');
    const busy = new Set((await PlayGame.find({ kind: 'room', status: { $in: ['waiting', 'active'] } }).select('status seats.userId state.out').lean()).flatMap((g) => g.seats.filter((s) => !hasLeft(g, s.userId)).map((s) => String(s.userId))));
    const free = (await User.find({ email: TEST_EMAILS }).select('name').lean()).filter((u) => !taken.has(String(u._id)) && !busy.has(String(u._id)));
    if (!free.length) return;
    const u = free[Math.floor(Math.random() * free.length)];
    const side = table.seats.length;
    // A different Indian first name every time (2026-11-17, the user), never one already at this table.
    const seat = { userId: u._id, name: require('../data/indianNames').pickName(table.seats.map((x) => x.name)), side, joinedAt: new Date(), lastSeenAt: new Date(), ready: true };
    const saved = await games.commit(table, { seats: [...table.seats.map((x) => (x.toObject ? x.toObject() : x)), seat], options: { ...table.options, testers: [...testers, side] } });
    if (saved && saved.seats.length >= saved.options.players) await start(saved);
};

/** Stop searching: my seat and my fee back. The last one out closes the table. */
const cancel = async (gameId, userId) => {
    for (let tries = 0; tries < 4; tries += 1) {
        const game = await games.load(gameId);
        if (!isOnline(game)) throw new PlayError('This is not an online table.', 404);
        const seat = games.seatOf(game, userId);
        if (seat < 0) return { left: true };
        if (game.status !== 'waiting') throw new PlayError('The game has already started: leaving now is resigning.', 409);
        const rest = game.seats.filter((_, i) => i !== seat).map((s, i) => ({ ...s.toObject(), side: i }));
        // The test players' seat numbers move up with everyone else's (TEST_FILL).
        const wasTester = new Set((game.options.testers || []).map((i) => String(game.seats[i]?.userId)));
        const testers = rest.map((s, i) => (wasTester.has(String(s.userId)) ? i : -1)).filter((i) => i >= 0);
        const paid = { ...(game.options.paid || {}) };
        const key = paid[String(userId)];
        delete paid[String(userId)];
        const fields = rest.length
            ? { seats: rest, options: { ...game.options, paid, testers }, ...(sameId(game.hostId, userId) ? { hostId: rest[0].userId } : {}) }
            : { seats: [], options: { ...game.options, paid }, status: 'abandoned', finishedAt: new Date(), outcome: { places: [], reason: 'Everyone left the table.' } };
        const saved = await games.commit(game, fields);
        if (!saved) continue;
        if (key) await refund({ ...game.toObject(), options: { ...game.options, paid: { [String(userId)]: key } } }, userId, 'left before the start');
        return { left: true };
    }
    throw new PlayError('The table changed while you were leaving. Try again.', 409);
};

/** A finished online game: first place takes the prize (from gameService's `finished`). */
const payOut = async (game) => {
    if (!isOnline(game) || game.status !== 'finished' || !(game.options.fee > 0)) return;
    const paidBy = Object.keys(game.options.paid || {});
    const pot = game.options.fee * paidBy.length;
    const firsts = (game.outcome?.places?.[0] || []).map((side) => game.seats.find((s) => s.side === side)).filter(Boolean);
    if (!firsts.length) return refundAll(game, 'no result');
    const each = money((pot * PRIZE_SHARE) / firsts.length);
    if (!(each > 0)) return;
    for (const s of firsts) {
        await wallet().credit({
            userId: s.userId, amount: each, source: 'game_prize', referenceKey: `gb-prize:${game._id}:${s.userId}`,
            description: `${engine(game.game).label} online — ${firsts.length > 1 ? 'shared ' : ''}winner's prize`, meta: { gameId: String(game._id), pot }
        }).catch((err) => console.error('[group brain] prize failed:', err.message));
    }
};

/** What the table's screen shows of the money: fee, pot, prize, when it starts by itself. */
const tableInfo = (game) => {
    if (!isOnline(game)) return null;
    const fee = game.options.fee || 0;
    const paid = Object.keys(game.options.paid || {}).length;
    const size = game.options.players;
    return { fee, players: size, pot: fee * (game.status === 'waiting' ? size : paid), prize: prizeOf(fee, game.status === 'waiting' ? size : paid), prizeShare: PRIZE_SHARE, startsBy: game.status === 'waiting' ? game.joinDeadline : null };
};

module.exports = { closestTable, FEES, SIZES, WAIT_MS, PRIZE_SHARE, prizeOf, isOnline, findTable, cancel, settle, payOut, refundAll, tableInfo, addTester };
