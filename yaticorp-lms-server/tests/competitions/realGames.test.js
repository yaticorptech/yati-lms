/**
 * The real games, through the real service: a friendly room for each of
 * Chess, Ludo, UNO and Carrom — made, joined, started — and a first move made
 * from what the view offers. What one player may not see (an UNO hand) is
 * checked from the other player's side of the API.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const PlayGame = require('../../src/competitions/models/PlayGame');

let app, a, b;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/competitions', router: require('../../src/competitions') });
    a = await makeUser('Player A'); a.call = app.call(a.token);
    b = await makeUser('Player B'); b.call = app.call(b.token);
});
after(async () => {
    await PlayGame.deleteMany({ 'seats.userId': { $in: [a.user._id, b.user._id] } });
    await cleanup([a.user, b.user], app.server);
});

/** A started two-player friendly game of `game`, as both players see it. */
const start = async (game) => {
    const made = await a.call('POST', '/rooms', { game });
    assert.equal(made.status, 201, JSON.stringify(made.body));
    const joined = await b.call('POST', '/rooms/join', { code: made.body.game.code });
    assert.equal(joined.status, 200, JSON.stringify(joined.body));
    const started = await a.call('POST', `/play/${made.body.game.id}/start`);
    assert.equal(started.status, 200, JSON.stringify(started.body));
    assert.equal(started.body.game.status, 'active');
    return made.body.game.id;
};
const as = async (who, id) => (await who.call('GET', `/play/${id}`)).body.game;
const common = (g) => {
    for (const k of ['game', 'status', 'you', 'turn', 'deadline', 'seats', 'message']) assert.ok(k in g.view, `the view has ${k}`);
    assert.equal(g.view.seats.length, 2);
};
const mover = (g) => (g.view.turn === g.you ? 'me' : 'other');

describe('the real games, in friendly rooms', () => {
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

    test('uno: a player sees their own hand and never the other\'s', async () => {
        const id = await start('uno');
        const mine = await as(a, id);
        const theirs = await as(b, id);
        common(mine);
        assert.equal(mine.view.hand.length, 7);
        assert.equal(theirs.view.hand.length, 7);
        const bView = JSON.stringify(theirs);
        for (const card of mine.view.hand) assert.ok(!bView.includes(`"${card.id}"`), `B's view must not contain A's ${card.id}`);
        const who = mover(mine) === 'me' ? a : b;
        const r = await who.call('POST', `/play/${id}/action`, { action: { type: 'draw' } });
        assert.equal(r.status, 200, JSON.stringify(r.body));
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
