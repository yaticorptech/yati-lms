/**
 * Ask first (2026-10-28): an app that says it can ask (X-Wallet-Ask: 1) is
 * told a priced feature's price and the balance (428 WALLET_CONFIRM) before
 * any money moves, and is charged only when it comes back with the price
 * agreed (X-Wallet-Confirm). Nothing is asked when nothing would be taken —
 * free, already paid for, or a short balance (402 as before) — and an app
 * that cannot ask is charged straight away, as it always was.
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

let me, rewardsApp, priced, saved, savedCredit;
const setPrices = async (walletRules) => { await config.updateConfig({ walletRules }); config.invalidate(); };
const balance = async () => (await Wallet.findOne({ userId: me.user._id }).lean())?.available ?? 0;
const charges = () => WalletTransaction.countDocuments({ userId: me.user._id, source: 'feature_charge' });
const call = (base, method, path, body, headers = {}) => fetch(`${base}${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${me.token}`, ...headers }, body: body ? JSON.stringify(body) : undefined
}).then(async (r) => ({ status: r.status, charged: r.headers.get('x-wallet-charged'), body: await r.json().catch(() => ({})) }));
const ASK = { 'X-Wallet-Ask': '1' };

before(async () => {
    await connect();
    saved = { ...(await config.getConfig()).walletRules };
    savedCredit = (await config.getConfig()).startingCredit;
    await config.updateConfig({ startingCredit: 0 }); config.invalidate();
    me = await makeUser('WalletAsk');
    await wallet.credit({ userId: me.user._id, amount: 50, source: 'admin_adjustment', description: 'test top-up' });
    rewardsApp = startApp({ mount: '/api/rewards', router: require('../../src/rewards') });
    const r = express.Router();
    r.use(protectUser);
    r.post('/thing', chargeWallet('download_bio'), (req, res) => res.json({ ok: true }));
    priced = startApp({ mount: '/api/priced', router: r });
});
after(async () => {
    await setPrices(saved);
    await config.updateConfig({ startingCredit: savedCredit }); config.invalidate();
    priced.server.close();
    await cleanup([me.user], rewardsApp.server);
});

const spendBase = () => `http://127.0.0.1:${rewardsApp.server.address().port}/api/rewards`;
const thingBase = () => `http://127.0.0.1:${priced.server.address().port}/api/priced`;

describe('ask before taking wallet money', () => {
    test('a priced feature answers with its price and the balance, and takes nothing', async () => {
        await setPrices({ download_bio: 12, find_job: 5 });
        const r = await call(thingBase(), 'POST', '/thing', {}, ASK);
        assert.equal(r.status, 428);
        assert.equal(r.body.code, 'WALLET_CONFIRM');
        assert.equal(r.body.amount, 12);
        assert.equal(r.body.balance, 50);
        assert.equal(r.body.label, 'Downloading your learning bio');
        assert.equal(await balance(), 50);
        assert.equal(await charges(), 0);
    });

    test('agreeing to the price charges it once', async () => {
        const r = await call(thingBase(), 'POST', '/thing', {}, { ...ASK, 'X-Wallet-Confirm': '12' });
        assert.equal(r.status, 200);
        assert.equal(r.charged, '12');
        assert.equal(await balance(), 38);
    });

    test('a price changed since it was agreed is asked about again', async () => {
        await setPrices({ download_bio: 15, find_job: 5 });
        const r = await call(thingBase(), 'POST', '/thing', {}, { ...ASK, 'X-Wallet-Confirm': '12' });
        assert.equal(r.status, 428);
        assert.equal(r.body.amount, 15);
        assert.equal(await balance(), 38);
    });

    test('a job listing is asked about once; reopened, it is free and not asked about', async () => {
        const first = await call(spendBase(), 'POST', '/wallet/spend', { action: 'find_job', ref: 'ask-job-1' }, ASK);
        assert.equal(first.status, 428);
        assert.equal(first.body.amount, 5);
        const paid = await call(spendBase(), 'POST', '/wallet/spend', { action: 'find_job', ref: 'ask-job-1' }, { ...ASK, 'X-Wallet-Confirm': '5' });
        assert.equal(paid.status, 200);
        assert.equal(paid.body.charged, 5);
        const again = await call(spendBase(), 'POST', '/wallet/spend', { action: 'find_job', ref: 'ask-job-1' }, ASK);
        assert.equal(again.status, 200);
        assert.equal(again.body.alreadyPaid, true);
        assert.equal(await balance(), 33);
    });

    test('free features are never asked about', async () => {
        await setPrices({ download_bio: 0, find_job: 0 });
        const r = await call(thingBase(), 'POST', '/thing', {}, ASK);
        assert.equal(r.status, 200);
        assert.equal(r.charged, null);
    });

    test('a short balance says so (402) instead of asking', async () => {
        await setPrices({ download_bio: 1000, find_job: 0 });
        const r = await call(thingBase(), 'POST', '/thing', {}, ASK);
        assert.equal(r.status, 402);
        assert.equal(r.body.code, 'INSUFFICIENT_FUNDS');
        assert.equal(await balance(), 33);
    });

    test('an app that cannot ask is charged straight away, as before', async () => {
        await setPrices({ download_bio: 3, find_job: 0 });
        const r = await call(thingBase(), 'POST', '/thing', {});
        assert.equal(r.status, 200);
        assert.equal(r.charged, '3');
        assert.equal(await balance(), 30);
    });
});
