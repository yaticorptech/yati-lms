/**
 * Credits XP made before XP stopped turning into wallet money (2026-10-26):
 * the money stays in the wallet, but the student's wallet no longer lists
 * them, nor "XP reward (earlier)" under where the money came from.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const Wallet = require('../../src/rewards/models/Wallet');
const WalletTransaction = require('../../src/rewards/models/WalletTransaction');

let me, app;

before(async () => {
    await connect();
    me = await makeUser('HiddenXp');
    app = startApp({ mount: '/api/rewards', router: require('../../src/rewards') });
    await Wallet.create({ userId: me.user._id, available: 1020, totalEarned: 1020, earnedBySource: { xp_reward: 20, starting_credit: 1000 }, currency: 'INR' });
    await WalletTransaction.create([
        { userId: me.user._id, type: 'credit', amount: 10, source: 'xp_reward', referenceKey: `xp-convert:${me.user._id}:1000`, description: '1,000 XP converted', status: 'completed' },
        { userId: me.user._id, type: 'credit', amount: 1000, source: 'starting_credit', referenceKey: `start:${me.user._id}`, description: 'Starting wallet credit', status: 'completed' }
    ]);
});

after(async () => {
    await WalletTransaction.deleteMany({ userId: me.user._id });
    await Wallet.deleteMany({ userId: me.user._id });
    await cleanup([me.user], app.server);
});

test('the wallet keeps the money but lists no old XP credits', async () => {
    const r = await app.call(me.token)('GET', '/wallet');
    assert.equal(r.status, 200);
    const stored = await Wallet.findOne({ userId: me.user._id }).lean();
    assert.equal(r.body.wallet.available, stored.available, 'the balance shown is the money held, XP credits included');
    assert.ok(stored.available >= 1020);
    assert.equal(r.body.wallet.earnedBySource.xp_reward, undefined, 'no "XP reward (earlier)" source');
    assert.equal(r.body.wallet.earnedBySource.starting_credit, 1000);
    assert.ok(r.body.recent.every((t) => t.source !== 'xp_reward'), 'not among the recent');

    const all = await app.call(me.token)('GET', '/wallet/transactions');
    assert.ok(all.body.rows.length >= 1);
    assert.ok(all.body.rows.every((t) => t.source !== 'xp_reward'), 'not in the full list');
    const asked = await app.call(me.token)('GET', '/wallet/transactions?source=xp_reward');
    assert.equal(asked.body.rows.length, 0, 'nor when asked for by name');
});
