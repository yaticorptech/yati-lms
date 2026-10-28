/**
 * Group Brain rooms, live: several players at once, each with their own
 * Socket.IO connection, as separate browsers would be. The server pushes
 * every change to every player in the room (and to nobody else); each
 * player's own view comes from the server. Also: presence in the lobby, a
 * vanished host handing over, starting only with everyone connected, and
 * the host removing a player.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { io } = require('socket.io-client');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const PlayGame = require('../../src/competitions/models/PlayGame');
const realtime = require('../../src/competitions/realtime');

let app, p, url;
const sockets = [];

before(async () => {
    await connect();
    app = startApp({ mount: '/api/competitions', router: require('../../src/competitions') });
    realtime.init(app.server);
    url = `http://127.0.0.1:${app.server.address().port}`;
    p = [];
    for (const name of ['Live Host', 'Live Two', 'Live Three', 'Live Outsider']) {
        const u = await makeUser(name);
        u.call = app.call(u.token);
        p.push(u);
    }
});
after(async () => {
    sockets.forEach((s) => s.disconnect());
    await realtime.close();
    await PlayGame.deleteMany({ 'seats.userId': { $in: p.map((x) => x.user._id) } });
    await PlayGame.deleteMany({ kind: 'room', hostId: { $in: p.map((x) => x.user._id) } });
    await cleanup(p.map((x) => x.user), app.server);
});

/** A player's live connection, with every push it hears. */
const live = (who) => new Promise((resolve, reject) => {
    const s = io(url, { path: '/socket.io', auth: { token: who.token }, transports: ['websocket'], reconnection: false });
    s.heard = [];
    s.on('game:changed', (e) => s.heard.push(e));
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
    sockets.push(s);
});
const watch = (s, gameId) => new Promise((resolve) => s.emit('watch', { gameId }, resolve));
const until = async (fn, ms = 3000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 40)); }
    return false;
};

describe('a room, live, with three players', () => {
    test('no sign-in, no socket', async () => {
        await assert.rejects(new Promise((resolve, reject) => {
            const s = io(url, { path: '/socket.io', auth: { token: 'nope' }, transports: ['websocket'], reconnection: false });
            s.on('connect', resolve); s.on('connect_error', reject); sockets.push(s);
        }), /Sign in/);
    });

    test('every change reaches every player in the room at once, and nobody outside it', async () => {
        const made = (await p[0].call('POST', '/rooms', { game: 'numberlogic', options: { difficulty: 'easy' } })).body.game;
        const [host, two, three, outsider] = await Promise.all(p.map(live));
        assert.deepEqual(await watch(host, made.id), { ok: true });
        assert.equal((await watch(outsider, made.id)).ok, false, 'only a player in the room may follow it');

        // Two joins: the host hears it straight away.
        await p[1].call('POST', '/rooms/join', { code: made.code });
        assert.ok(await until(() => host.heard.length >= 1), 'the host hears the join');
        await watch(two, made.id);
        await p[2].call('POST', '/rooms/join', { code: made.code });
        await watch(three, made.id);
        const before = two.heard.length;
        await p[1].call('POST', `/play/${made.id}/ready`, { ready: true });
        await p[2].call('POST', `/play/${made.id}/ready`, { ready: true });
        assert.ok(await until(() => two.heard.length >= before + 2 && host.heard.some((e) => e.version >= 4)), 'ready, pushed to all');

        // Start: all three hear it, and each one's own view is the same question.
        await p[0].call('POST', `/play/${made.id}/start`);
        assert.ok(await until(() => [host, two, three].every((s) => s.heard.some((e) => e.status === 'active'))), 'everyone hears the start');
        await PlayGame.updateOne({ _id: made.id }, { $set: { nextDeadline: new Date(Date.now() - 1), 'state.phaseEndsAt': Date.now() - 1 } });
        const views = await Promise.all(p.slice(0, 3).map(async (x) => (await x.call('GET', `/play/${made.id}`)).body.game.view));
        assert.ok(views.every((v) => v.phase === 'question' && v.question.prompt === views[0].question.prompt), 'the same live question for all');
        assert.ok(views.every((v) => v.answer === null), 'nobody is sent the answer');

        // An answer: the others are told at once — that someone answered, not what.
        const heard = three.heard.length;
        assert.equal((await p[0].call('POST', `/play/${made.id}/action`, { action: { type: 'answer', choice: 0 } })).status, 200);
        assert.ok(await until(() => three.heard.length > heard), 'the answer is pushed');
        const seen = (await p[2].call('GET', `/play/${made.id}`)).body.game.view.answers[0];
        assert.deepEqual(seen, { answered: true });
        assert.equal((await p[0].call('POST', `/play/${made.id}/action`, { action: { type: 'answer', choice: 1 } })).status, 400, 'one answer, never two');
        assert.equal(outsider.heard.length, 0, 'the outsider heard nothing');

        // A dropped connection: reconnect, watch again, and the view is where the game is.
        two.disconnect();
        const back = await live(p[1]);
        assert.deepEqual(await watch(back, made.id), { ok: true });
        assert.equal((await p[1].call('GET', `/play/${made.id}`)).body.game.status, 'active');
        for (const x of [p[1], p[2]]) await x.call('POST', `/play/${made.id}/action`, { action: { type: 'resign' } });
        assert.ok(await until(() => host.heard.some((e) => e.status === 'finished')), 'the end is pushed too');
    });
});

describe('presence in the lobby', () => {
    test('a player who drops off shows offline and blocks the start; the host can remove them', async () => {
        const made = (await p[0].call('POST', '/rooms', { game: 'wordlogic' })).body.game;
        await p[1].call('POST', '/rooms/join', { code: made.code });
        await p[1].call('POST', `/play/${made.id}/ready`, { ready: true });
        await PlayGame.updateOne({ _id: made.id }, { $set: { 'seats.1.lastSeenAt': new Date(Date.now() - 60000) } });
        const lobby = (await p[0].call('GET', `/play/${made.id}`)).body.game;
        assert.equal(lobby.seats[1].online, false);
        const start = await p[0].call('POST', `/play/${made.id}/start`);
        assert.equal(start.status, 400);
        assert.match(start.body.message, /lost connection/);
        assert.equal((await p[1].call('POST', `/play/${made.id}/remove`, { seat: 0 })).status, 403, 'only the host removes');
        assert.equal((await p[0].call('POST', `/play/${made.id}/remove`, { seat: 1 })).status, 200);
        assert.equal((await p[0].call('GET', `/play/${made.id}`)).body.game.seats.length, 1);
        assert.equal((await p[1].call('GET', `/play/${made.id}`)).status, 403, 'removed: no longer in it');
        await p[0].call('POST', `/play/${made.id}/leave`);
    });

    test('a host who vanishes hands the room to a player still there', async () => {
        const made = (await p[0].call('POST', '/rooms', { game: 'spatialiq' })).body.game;
        await p[2].call('POST', '/rooms/join', { code: made.code });
        await PlayGame.updateOne({ _id: made.id }, { $set: { 'seats.0.lastSeenAt': new Date(Date.now() - 120000) } });
        const g = (await p[2].call('GET', `/play/${made.id}`)).body.game;
        assert.equal(g.host, true, 'the player still here is the host now');
        assert.equal(g.seats[0].online, false);
        for (const x of [p[0], p[2]]) await x.call('POST', `/play/${made.id}/leave`);
    });
});
