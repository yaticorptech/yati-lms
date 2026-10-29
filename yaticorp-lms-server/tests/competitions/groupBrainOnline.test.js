/**
 * Group Brain "Play online": a seat at a table of the same game, size and
 * fee; the fee from the wallet; a full table starts at once; the winner
 * takes 90% of the pot; leaving before the start, or nobody else coming,
 * gives the fee back.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const PlayGame = require('../../src/competitions/models/PlayGame');
const { Wallet, WalletTransaction } = require('../../src/rewards/models');
const walletService = require('../../src/rewards/services/walletService');

let app, p;
const balance = async (u) => (await Wallet.findOne({ userId: u.user._id }).lean())?.available ?? 0;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/competitions', router: require('../../src/competitions') });
    p = [];
    for (const name of ['Online One', 'Online Two', 'Online Three']) {
        const u = await makeUser(name);
        u.call = app.call(u.token);
        await walletService.credit({ userId: u.user._id, amount: 100, source: 'admin_adjustment', description: 'test money' });
        p.push(u);
    }
});
after(async () => {
    const ids = p.map((x) => x.user._id);
    await PlayGame.deleteMany({ 'seats.userId': { $in: ids } });
    await PlayGame.deleteMany({ kind: 'room', hostId: { $in: ids } });
    await WalletTransaction.deleteMany({ userId: { $in: ids } });
    await Wallet.deleteMany({ userId: { $in: ids } });
    await cleanup(p.map((x) => x.user), app.server);
});

describe('Play online', () => {
    test('the fees on offer', async () => {
        const r = await p[0].call('GET', '/rooms/online');
        assert.deepEqual(r.body.fees, [0, 10, 25, 50]);
        assert.deepEqual(r.body.sizes, [2, 4, 6, 8, 10, 12, 16, 20]);
    });

    test('a fee not on offer, or more than the wallet holds, is refused', async () => {
        assert.equal((await p[0].call('POST', '/rooms/online', { game: 'numberlogic', players: 2, fee: 7 })).status, 400);
        await Wallet.updateOne({ userId: p[2].user._id }, { $set: { available: 5 } });
        const r = await p[2].call('POST', '/rooms/online', { game: 'numberlogic', players: 2, fee: 10 });
        assert.equal(r.status, 402);
        assert.match(r.body.message, /less than ₹10/);
        await Wallet.updateOne({ userId: p[2].user._id }, { $set: { available: 100 } });
    });

    test('two players at ₹10: seated together, charged, started; the winner gets ₹18', async () => {
        const a = (await p[0].call('POST', '/rooms/online', { game: 'numberlogic', players: 2, fee: 10 })).body.game;
        assert.equal(await balance(p[0]), 90, 'the fee, as I sit down');
        const waiting = (await p[0].call('GET', `/play/${a.id}`)).body.game;
        assert.equal(waiting.status, 'waiting');
        assert.equal(waiting.online.fee, 10);
        assert.equal(waiting.online.prize, 18);

        const b = (await p[1].call('POST', '/rooms/online', { game: 'numberlogic', players: 2, fee: 10 })).body.game;
        assert.equal(b.id, a.id, 'the same table');
        assert.equal(await balance(p[1]), 90);
        const on = (await p[0].call('GET', `/play/${a.id}`)).body.game;
        assert.equal(on.status, 'active', 'a full table starts at once');

        // Two resigns: One wins.
        await p[1].call('POST', `/play/${a.id}/action`, { action: { type: 'resign' } });
        const done = (await p[0].call('GET', `/play/${a.id}`)).body.game;
        assert.equal(done.status, 'finished');
        assert.equal(await balance(p[0]), 108, '90 + 18');
        assert.equal(await balance(p[1]), 90);
        // Paid once only.
        await require('../../src/competitions/services/onlineService').payOut(await PlayGame.findById(a.id));
        assert.equal(await balance(p[0]), 108);
    });

    test('leaving the search gives the fee back', async () => {
        const before = await balance(p[2]);
        const t = (await p[2].call('POST', '/rooms/online', { game: 'sequence', players: 4, fee: 25 })).body.game;
        assert.equal(await balance(p[2]), before - 25);
        const r = await p[2].call('POST', `/play/${t.id}/leave`);
        assert.equal(r.status, 200);
        assert.equal(await balance(p[2]), before);
        assert.equal((await PlayGame.findById(t.id)).status, 'abandoned');
    });

    test('nobody else came: the table closes and the fee comes back', async () => {
        const before = await balance(p[2]);
        const t = (await p[2].call('POST', '/rooms/online', { game: 'wordlogic', players: 4, fee: 50 })).body.game;
        assert.equal(await balance(p[2]), before - 50);
        await PlayGame.updateOne({ _id: t.id }, { $set: { joinDeadline: new Date(Date.now() - 1000) } });
        const g = (await p[2].call('GET', `/play/${t.id}`)).body.game;
        assert.equal(g.status, 'abandoned');
        assert.match(g.outcome.reason, /No players found/);
        assert.equal(await balance(p[2]), before);
    });

    test('left a game the others still play: free to play another at once', async () => {
        const t = (await p[0].call('POST', '/rooms/online', { game: 'deduction', players: 4, fee: 0 })).body.game;
        await p[1].call('POST', '/rooms/online', { game: 'deduction', players: 4, fee: 0 });
        await p[2].call('POST', '/rooms/online', { game: 'deduction', players: 4, fee: 0 });
        await PlayGame.updateOne({ _id: t.id }, { $set: { joinDeadline: new Date(Date.now() - 1000) } });
        assert.equal((await p[0].call('GET', `/play/${t.id}`)).body.game.status, 'active');
        await p[0].call('POST', `/play/${t.id}/action`, { action: { type: 'resign' } });
        assert.equal((await PlayGame.findById(t.id)).status, 'active', 'the other two play on');
        assert.equal((await p[0].call('GET', '/rooms/mine')).body.room, null, 'not "in a room" any more');
        const next = await p[0].call('POST', '/rooms/online', { game: 'chess', fee: 0 });
        assert.equal(next.status, 200);
        assert.notEqual(next.body.game.id, t.id, 'a Chess table, not the game I left');
        await p[0].call('POST', `/play/${next.body.game.id}/leave`);
        for (const u of [p[1], p[2]]) await u.call('POST', `/play/${t.id}/action`, { action: { type: 'resign' } });
    });

    test('time up with two of four: it starts with them', async () => {
        const t = (await p[0].call('POST', '/rooms/online', { game: 'patternmaster', players: 4, fee: 0 })).body.game;
        await p[1].call('POST', '/rooms/online', { game: 'patternmaster', players: 4, fee: 0 });
        await PlayGame.updateOne({ _id: t.id }, { $set: { joinDeadline: new Date(Date.now() - 1000) } });
        const g = (await p[0].call('GET', `/play/${t.id}`)).body.game;
        assert.equal(g.status, 'active');
        assert.equal(g.seats.length, 2);
    });
});
