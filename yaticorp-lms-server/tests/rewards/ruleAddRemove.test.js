/**
 * Rules the admin adds and removes under Reward rules.
 *
 * Optional rules (a forum post's XP, the Ideas list's price…) do nothing until
 * added; a removed rule pays or costs nothing for anyone, and a removed
 * default stays removed rather than reappearing from the code's defaults. An
 * optional XP rule pays only after its request succeeds, once per its ref.
 * The rulebook is shared: it is put back exactly as it was.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

const config = require('../../src/rewards/services/configService');
const { xpOnSuccess } = require('../../src/rewards/services/xpHooks');
const { protectUser } = require('../../src/middleware/authMiddleware');
const User = require('../../src/models/User');

let me, saved, app;
const fresh = async () => { config.invalidate(); return config.getConfig(); };

before(async () => {
    await connect();
    const c = await fresh();
    saved = { xp: { ...c.xpRules }, wallet: { ...c.walletRules } };
    me = await makeUser('RuleAddRemove');
    const r = express.Router();
    r.use(protectUser);
    r.post('/post', xpOnSuccess('forum_post', () => 'post:test-day'), (req, res) => (req.body?.fail ? res.status(400).json({ message: 'no' }) : res.json({ ok: true })));
    app = startApp({ mount: '/api/t', router: r });
});
after(async () => {
    const c = await fresh();
    await config.updateConfig({
        xpRules: saved.xp, walletRules: saved.wallet,
        removeRules: { xp: Object.keys(c.xpRules).filter((k) => !(k in saved.xp)), wallet: Object.keys(c.walletRules).filter((k) => !(k in saved.wallet)) }
    });
    config.invalidate();
    await cleanup([me.user], app.server);
});

describe('adding and removing rules', () => {
    test('Find scholarship is a wallet rule from the start; the optional ones are not', async () => {
        const c = await fresh();
        assert.ok('find_scholarship' in c.walletRules);
        assert.ok(!('generate_ideas' in c.walletRules) || 'generate_ideas' in saved.wallet);
        assert.ok(!('forum_post' in c.xpRules) || 'forum_post' in saved.xp);
    });

    test('an added rule is live, and a removed one is gone for everyone', async () => {
        await config.updateConfig({ walletRules: { generate_ideas: 3 }, xpRules: { resume_upload: 15 } });
        let c = await fresh();
        assert.equal(c.walletRules.generate_ideas, 3);
        assert.equal(await config.xpFor('resume_upload'), 15);
        await config.updateConfig({ removeRules: { wallet: ['generate_ideas'], xp: ['resume_upload'] } });
        c = await fresh();
        assert.ok(!('generate_ideas' in c.walletRules));
        assert.equal(await config.walletCostFor('generate_ideas'), 0);
        assert.equal(await config.xpFor('resume_upload'), 0);
    });

    test('a removed default stays removed, and adding it again brings it back', async () => {
        await config.updateConfig({ removeRules: { wallet: ['download_bio'], xp: ['daily_activity'] } });
        let c = await fresh();
        assert.ok(!('download_bio' in c.walletRules), 'not refilled from the defaults');
        assert.equal(await config.xpFor('daily_activity'), 0);
        await config.updateConfig({ walletRules: { download_bio: 4 }, xpRules: { daily_activity: 6 } });
        c = await fresh();
        assert.equal(c.walletRules.download_bio, 4);
        assert.equal(await config.xpFor('daily_activity'), 6);
    });

    test('an optional XP rule pays nothing until added, then once per ref, and never for a failed request', async () => {
        const call = app.call(me.token);
        const xp = async () => { await new Promise((r) => setTimeout(r, 400)); return (await User.findById(me.user._id).select('xp').lean()).xp || 0; };
        await call('POST', '/post', {});
        assert.equal(await xp(), 0, 'no rule, no XP');
        await config.updateConfig({ xpRules: { forum_post: 7 } }); config.invalidate();
        await call('POST', '/post', { fail: true });
        assert.equal(await xp(), 0, 'a failed post pays nothing');
        await call('POST', '/post', {});
        assert.equal(await xp(), 7);
        await call('POST', '/post', {});
        assert.equal(await xp(), 7, 'the same ref pays once');
    });
});
