/**
 * Group Brain "Play online" (asked 2026-10-28): like online Ludo. A student
 * picks a game, a table of 2 or 4, and an entry fee; the server seats them at
 * a waiting table of the same game, size and fee, or opens one. The fee comes
 * out of their wallet as they sit down.
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
 * Wallet entries are keyed (referenceKey), so a fee, refund or prize can
 * never be written twice.
 */
const crypto = require('crypto');
const PlayGame = require('../models/PlayGame');
const { engine, ROOM_GAMES } = require('../games');
const games = require('./gameService');
const { getSettings } = require('../groupbrain/settings');

const { PlayError } = games;
const FEES = [0, 10, 25, 50];
const SIZES = [2, 4];
const WAIT_MS = 30000;
const PRIZE_SHARE = 0.9;
// TEMPORARY, for trying it out (asked 2026-10-28, "until I say stop"): an
// online table of any game (Chess 2, the rest 4) is filled at once with test players (the
// seeded test.ten*@yaticorp-test.invalid accounts, scripts/seedTenPlayers.js)
// up to this many, so it starts straight away. They pay nothing and do not
// play. Remove the entry to stop.
// Off under the test suite, which checks the real search.
const TEST_FILL = process.env.NODE_ENV === 'test' ? {} : Object.fromEntries(ROOM_GAMES.map((id) => [id, id === 'chess' ? 2 : 4]));
const TEST_EMAILS = /^test\.ten\d+@yaticorp-test\.invalid$/;

const wallet = () => require('../../rewards/services/walletService');
const money = (n) => Math.round(Number(n) * 100) / 100;
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
    const saved = await games.commit(game, { status: 'abandoned', finishedAt: new Date(), outcome: { places: [], reason: 'No players found. Your entry fee is back in your wallet.' } });
    if (saved) await refundAll(saved, 'no players found');
    return saved;
};

/** Sit me at a table: one waiting for this game, size and fee, or a new one. */
const findTable = async (user, gameId, raw = {}) => {
    if (!ROOM_GAMES.includes(gameId)) throw new PlayError('Pick one of the Group Brain games.');
    const e = engine(gameId);
    const settings = (await getSettings()).games[gameId];
    if (!settings.enabled) throw new PlayError(`${e.label} is switched off for now.`, 403);
    const players = TEST_FILL[gameId] || (gameId === 'chess' ? 2 : Number(raw.players));
    if (!SIZES.includes(players) || players > e.maxSeats) throw new PlayError('Pick a table of 2 or 4 players.');
    const fee = Number(raw.fee ?? 0);
    if (!FEES.includes(fee)) throw new PlayError(`The entry fee is one of ${FEES.map((f) => (f ? `₹${f}` : 'Free')).join(', ')}.`);
    const difficulty = settings.difficulties.includes('medium') ? 'medium' : settings.difficulties[0];
    // A game I have left (resigned) does not hold me (roomService.openRoomOf).
    const busy = await require('./roomService').openRoomOf(user._id);
    if (busy) {
        // Already at a table for this same game: go back to it.
        if (busy.options?.online && busy.game === gameId) return { game: { id: String(busy._id) } };
        // Still searching at another game's table: leave it (fee back), then on to this one.
        if (busy.options?.online && busy.status === 'waiting') await cancel(busy._id, user._id);
        else if (busy.options?.online) throw Object.assign(new PlayError(`You are playing ${engine(busy.game)?.label || 'another game'} online right now. Finish it or leave it first.`, 409), { roomId: String(busy._id) });
        else throw Object.assign(new PlayError(`You are already in a ${engine(busy.game)?.label || ''} room (code ${busy.code}). Leave it or finish its game first.`, 409), { roomId: String(busy._id) });
    }

    for (let tries = 0; tries < 6; tries += 1) {
        // The oldest table still filling, else a new one.
        let table = await PlayGame.findOne({
            kind: 'room', game: gameId, status: 'waiting', 'options.online': true, 'options.players': players, 'options.fee': fee,
            joinDeadline: { $gt: new Date(Date.now() + 2000) }, [`seats.${players - 1}`]: { $exists: false }
        }).sort({ createdAt: 1 });
        const fresh = !table;
        if (fresh) {
            table = await PlayGame.create({
                kind: 'room', game: gameId, code: games.newCode(), hostId: user._id,
                options: { difficulty, players, online: true, fee, paid: {} }, seats: [],
                joinDeadline: new Date(Date.now() + WAIT_MS)
            }).catch((err) => { if (err?.code === 11000) return null; throw err; });
            if (!table) continue;
        }
        // The fee first: no seat without it.
        const key = `gb-fee:${table._id}:${user._id}:${crypto.randomBytes(3).toString('hex')}`;
        if (fee > 0) {
            await wallet().debit({ userId: user._id, amount: fee, source: 'game_entry', referenceKey: key, description: `${e.label} online — entry fee`, meta: { gameId: String(table._id) } })
                .catch((err) => { throw new PlayError(err.code === 'INSUFFICIENT_FUNDS' ? `Your wallet has less than ₹${fee}. Pick a smaller fee or play free.` : err.message, 402); });
        }
        const seats = [...table.seats.map((s) => s.toObject()), { userId: user._id, name: user.name || 'Player', side: table.seats.length, joinedAt: new Date(), lastSeenAt: new Date(), ready: true }];
        const saved = await games.commit(table, { seats, options: { ...table.options, paid: { ...(table.options.paid || {}), [String(user._id)]: key } } });
        if (!saved) {
            // Someone sat down first: give the fee back and try again.
            if (fee > 0) await wallet().credit({ userId: user._id, amount: fee, source: 'game_refund', referenceKey: key.replace('gb-fee', 'gb-refund'), description: `${e.label} online — fee returned (seat taken)` }).catch(() => {});
            continue;
        }
        // Full: it starts now.
        if (saved.seats.length >= players) await start(saved);
        else if (TEST_FILL[gameId]) await fillWithTesters(saved, players);
        return { game: { id: String(saved._id) } };
    }
    throw new PlayError('Could not find a table just now. Try again.', 503);
};

/** TEMPORARY (TEST_FILL): seat test players in the empty seats, then start. */
const fillWithTesters = async (table, players) => {
    const User = require('../../models/User');
    const taken = new Set(table.seats.map((s) => String(s.userId)));
    const { hasLeft } = require('./roomService');
    const busy = new Set((await PlayGame.find({ kind: 'room', status: { $in: ['waiting', 'active'] } }).select('status seats.userId state.out').lean()).flatMap((g) => g.seats.filter((s) => !hasLeft(g, s.userId)).map((s) => String(s.userId))));
    const testers = (await User.find({ email: TEST_EMAILS }).select('name').lean()).filter((u) => !taken.has(String(u._id)) && !busy.has(String(u._id)));
    const extra = testers.slice(0, players - table.seats.length).map((u, k) => ({ userId: u._id, name: u.name || 'Test player', side: table.seats.length + k, joinedAt: new Date(), lastSeenAt: new Date(), ready: true }));
    if (!extra.length) return;
    const saved = await games.commit(table, { seats: [...table.seats.map((s) => s.toObject()), ...extra] });
    if (saved) await start(saved);
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
        const paid = { ...(game.options.paid || {}) };
        const key = paid[String(userId)];
        delete paid[String(userId)];
        const fields = rest.length
            ? { seats: rest, options: { ...game.options, paid }, ...(sameId(game.hostId, userId) ? { hostId: rest[0].userId } : {}) }
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

module.exports = { FEES, SIZES, WAIT_MS, PRIZE_SHARE, prizeOf, isOnline, findTable, cancel, settle, payOut, refundAll, tableInfo };
