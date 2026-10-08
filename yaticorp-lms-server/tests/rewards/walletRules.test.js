/**
 * Wallet rules: features priced in the admin's rulebook are paid for from the
 * student's wallet, on the server.
 *
 * Free by default; a price set by the admin is what every student pays from
 * the next use; a short balance is refused with 402 and a message that says
 * what it costs; the same job listing is paid for once; and a feature that
 * fails after being charged gives the money back, with both moves in the
 * wallet history. The rulebook is shared: whatever a test changes is put back.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

const config = require('../../src/rewards/services/configService');
const wallet = require('../../src/rewards/services/walletService');
const { chargeWallet } = require('../../src/rewards/services/walletRuleService');
const { Wallet, WalletTransaction } = require('../../src/rewards/models');
const { protectUser } = require('../../src/middleware/authMiddleware');

let app, me, api, saved, savedCredit, priced;
const setPrices = async (walletRules) => { await config.updateConfig({ walletRules }); config.invalidate(); };
const balance = async () => (await Wallet.findOne({ userId: me.user._id }).lean())?.available ?? 0;

before(async () => {
    await connect();
    saved = { ...(await config.getConfig()).walletRules };
    savedCredit = (await config.getConfig()).startingCredit;
    // These cases count rupees from zero; the starting credit is its own concern.
    await config.updateConfig({ startingCredit: 0 }); config.invalidate();
    me = await makeUser('WalletRules');
    app = startApp({ mount: '/api/rewards', router: require('../../src/rewards') });
    api = app.call(me.token);
    // A route priced by the middleware that fails when asked to, to see the refund.
    const r = express.Router();
    r.use(protectUser);
    r.post('/thing', chargeWallet('download_bio'), (req, res) => (req.body?.fail ? res.status(500).json({ message: 'broke' }) : res.json({ ok: true })));
    priced = startApp({ mount: '/api/priced', router: r });
});
after(async () => {
    await setPrices(saved);
    await config.updateConfig({ startingCredit: savedCredit }); config.invalidate();
    await cleanup([me.user], app.server);
    priced.server.close();
});

describe('wallet rules', () => {
    test('every feature is free until the admin prices it', async () => {
        await setPrices({ find_job: 0 });
        const r = await api('POST', '/wallet/spend', { action: 'find_job', ref: 'job-free' });
        assert.equal(r.status, 200);
        assert.equal(r.body.charged, 0);
    });

    test('a priced job listing is paid once from the wallet, and reopening it is free', async () => {
        await wallet.credit({ userId: me.user._id, amount: 10, source: 'admin_adjustment', description: 'test top-up' });
        await setPrices({ find_job: 7 });
        const first = await api('POST', '/wallet/spend', { action: 'find_job', ref: 'job-1' });
        assert.equal(first.status, 200, JSON.stringify(first.body));
        assert.equal(first.body.charged, 7);
        assert.equal(await balance(), 3);
        const again = await api('POST', '/wallet/spend', { action: 'find_job', ref: 'job-1' });
        assert.equal(again.body.charged, 0);
        assert.equal(again.body.alreadyPaid, true);
        assert.equal(await balance(), 3, 'not charged twice');
    });

    test('a short balance is refused with 402, saying what it costs, and nothing is taken', async () => {
        const r = await api('POST', '/wallet/spend', { action: 'find_job', ref: 'job-2' });
        assert.equal(r.status, 402);
        assert.equal(r.body.code, 'INSUFFICIENT_FUNDS');
        assert.equal(r.body.needed, 7);
        assert.match(r.body.message, /costs ₹7/);
        assert.equal(await balance(), 3);
    });

    test('only features without a request of their own can be paid for by asking', async () => {
        const r = await api('POST', '/wallet/spend', { action: 'download_bio' });
        assert.equal(r.status, 400);
    });

    test('a priced feature that fails gives the money back, and the history shows both', async () => {
        await wallet.credit({ userId: me.user._id, amount: 4, source: 'admin_adjustment', description: 'test top-up' });
        await setPrices({ download_bio: 2 });
        const call = priced.call(me.token);
        const ok = await call('POST', '/thing', {});
        assert.equal(ok.status, 200);
        assert.equal(await balance(), 5, 'charged for the bio that was made');
        const broke = await call('POST', '/thing', { fail: true });
        assert.equal(broke.status, 500);
        await new Promise((r) => setTimeout(r, 300));
        assert.equal(await balance(), 5, 'the failed one was refunded');
        const rows = await WalletTransaction.find({ userId: me.user._id, source: { $in: ['feature_charge', 'feature_refund'] } }).sort({ createdAt: 1 }).lean();
        assert.deepEqual(rows.map((t) => [t.source, t.amount]), [['feature_charge', 7], ['feature_charge', 2], ['feature_charge', 2], ['feature_refund', 2]]);
    });

    test('an admin price change reaches every student through the shared rulebook', async () => {
        await setPrices({ start_mock_interview: 25 });
        assert.equal(await config.walletCostFor('start_mock_interview'), 25);
        const s = await api('GET', '/summary');
        assert.equal(s.body.walletRules.start_mock_interview, 25);
    });
});
