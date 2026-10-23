/**
 * The real games, through the real service: a competition match's game for
 * each of Chess, Ludo and Carrom — opened, joined by both players — and a
 * first move made from what the view offers. (Friendly rooms, and UNO, were
 * removed on 2026-10-23; the last test checks they are gone.)
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const PlayGame = require('../../src/competitions/models/PlayGame');
const { openMatchGame } = require('../../src/competitions/services/gameService');

let app, a, b, outsider;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/competitions', router: require('../../src/competitions') });
    a = await makeUser('Player A'); a.call = app.call(a.token);
    b = await makeUser('Player B'); b.call = app.call(b.token);
    outsider = await makeUser('Not In It'); outsider.call = app.call(outsider.token);
});
after(async () => {
    await PlayGame.deleteMany({ 'seats.userId': { $in: [a.user._id, b.user._id] } });
    await cleanup([a.user, b.user, outsider.user], app.server);
});

/** A started two-player match game of `game`, as the bracket opens one, both players joined. */
const start = async (game) => {
    const id = () => new mongoose.Types.ObjectId();
    const teams = [a, b].map((p) => ({ _id: id(), players: [{ userId: p.user._id, name: p.user.name }] }));
    const row = await openMatchGame({ competition: { _id: id(), game, playersPerSide: 1, gameOptions: {} }, match: { _id: id(), sides: teams.map((t) => ({ teamId: t._id, lineup: [] })) }, teams });
    const gameId = String(row._id);
    assert.equal((await a.call('POST', `/play/${gameId}/join`)).status, 200);
    const joined = await b.call('POST', `/play/${gameId}/join`);
    assert.equal(joined.status, 200, JSON.stringify(joined.body));
    assert.equal(joined.body.game.status, 'active', 'it starts once both are there');
    return gameId;
};
const as = async (who, id) => (await who.call('GET', `/play/${id}`)).body.game;
const common = (g) => {
    for (const k of ['game', 'status', 'you', 'turn', 'deadline', 'seats', 'message']) assert.ok(k in g.view, `the view has ${k}`);
    assert.equal(g.view.seats.length, 2);
};
const mover = (g) => (g.view.turn === g.you ? 'me' : 'other');

describe('the real games, in competition matches', () => {
    test('chess: White moves from the legal moves the view offers', async () => {
        const id = await start('chess');
        const white = await as(a, id);
        common(white);
        assert.equal(white.view.turn, 0);
        assert.ok(white.view.legalMoves.length === 20, 'twenty opening moves');
        const black = await as(b, id);
        assert.deepEqual(black.view.legalMoves, [], 'none for the side not to move');
        const [m] = white.view.legalMoves;
        const r = await a.call('POST', `/play/${id}/action`, { action: { type: 'move', from: m.from, to: m.to } });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal((await as(b, id)).view.turn, 1, 'Black to move');
        const wrong = await a.call('POST', `/play/${id}/action`, { action: { type: 'move', from: 'e2', to: 'e4' } });
        assert.equal(wrong.status, 400, 'not White\'s turn now');
    });

    test('ludo: the player to move rolls', async () => {
        const id = await start('ludo');
        const g = await as(a, id);
        common(g);
        const who = mover(g) === 'me' ? a : b;
        const r = await who.call('POST', `/play/${id}/action`, { action: { type: 'roll' } });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.ok(r.body.game.view.dice >= 1 && r.body.game.view.dice <= 6);
    });

    test('carrom: the player to shoot takes a shot and everyone sees it replayed', async () => {
        const id = await start('carrom');
        const g = await as(a, id);
        common(g);
        const who = mover(g) === 'me' ? a : b;
        const r = await who.call('POST', `/play/${id}/action`, { action: { type: 'shoot', position: 0.5, angle: 0, power: 0.6 } });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const other = await as(who === a ? b : a, id);
        assert.ok(other.view.lastShot?.frames?.length > 0, 'the shot\'s frames are there to animate');
    });

    test('a turn that times out is played by the server when anyone looks', async () => {
        const id = await start('ludo');
        const before = await as(a, id);
        // Ludo keeps the turn's end in state.deadline; the service mirrors it in nextDeadline.
        const past = Date.now() - 1000;
        await PlayGame.updateOne({ _id: id }, { $set: { nextDeadline: new Date(past), 'state.deadline': past } });
        const after = await as(b, id);
        assert.ok(after.version > before.version, 'the timeout moved the game on');
    });
});

describe('a match code (asked 2026-10-23)', () => {
    test('each match game has a 6-character code; its players open it by typing it, nobody else can', async () => {
        const id = () => new mongoose.Types.ObjectId();
        const teams = [a, b].map((p) => ({ _id: id(), players: [{ userId: p.user._id, name: p.user.name }] }));
        const row = await openMatchGame({ competition: { _id: id(), game: 'chess', playersPerSide: 1, gameOptions: {} }, match: { _id: id(), sides: teams.map((t) => ({ teamId: t._id, lineup: [] })) }, teams });
        assert.match(row.code, /^[A-Z2-9]{6}$/);
        const mine = await a.call('POST', '/matches/join', { code: row.code.toLowerCase() });
        assert.equal(mine.status, 200); assert.equal(mine.body.game.id, String(row._id));
        assert.equal((await a.call('GET', `/play/${row._id}`)).body.game.code, row.code, 'the players see it on the game');
        const other = await outsider.call('POST', '/matches/join', { code: row.code });
        assert.equal(other.status, 403); assert.match(other.body.message, /another match/);
        assert.equal((await outsider.call('GET', `/play/${row._id}`)).body.game.code, null, 'a spectator does not see it');
        assert.equal((await a.call('POST', '/matches/join', { code: 'ZZZZZ9' })).status, 404);
        assert.equal((await a.call('POST', '/matches/join', { code: 'abc' })).status, 400);
        await PlayGame.updateOne({ _id: row._id }, { $set: { status: 'finished' } });
        assert.equal((await a.call('POST', '/matches/join', { code: row.code })).status, 409, 'a match that is over');
    });

    test('a match game opened before codes existed is given one when it is listed', async () => {
        const { withCodes } = require('../../src/competitions/services/gameService');
        const old = await PlayGame.create({ kind: 'match', game: 'ludo', seats: [{ userId: a.user._id, name: 'A', side: 0 }] });
        const [row] = await withCodes([await PlayGame.findById(old._id).select('status code kind').lean()]);
        assert.match(row.code, /^[A-Z2-9]{6}$/);
        assert.equal((await PlayGame.findById(old._id).lean()).code, row.code, 'saved');
    });
});

describe('playing with friends, and UNO, are gone', () => {
    test('no rooms to make, join or list; UNO is not offered; a friendly game saved before answers 410', async () => {
        assert.equal((await a.call('POST', '/rooms', { game: 'chess' })).status, 404);
        assert.equal((await a.call('POST', '/rooms/join', { code: 'ABCDEF' })).status, 404);
        assert.equal((await a.call('GET', '/rooms/mine')).status, 404);
        const games = (await a.call('GET', '/games')).body.games.map((g) => g.id);
        assert.deepEqual(games, ['chess', 'ludo', 'carrom']);
        const old = await PlayGame.create({ kind: 'friendly', game: 'uno', code: 'OLD123', hostId: a.user._id, seats: [{ userId: a.user._id, name: 'A', side: 0, joinedAt: new Date() }] });
        const r = await a.call('GET', `/play/${old._id}`);
        assert.equal(r.status, 410); assert.match(r.body.message, /no longer available/);
        assert.equal((await a.call('POST', `/play/${old._id}/action`, { action: { type: 'draw' } })).status, 410);
    });
});
