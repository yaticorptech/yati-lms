/**
 * The demo cards see everything (src/services/fullAccess.js): Jobs without the
 * skills rule, and every section an admin can switch off still open to them.
 *
 * The site-wide switches are never touched in the database here — the tests
 * share it with the dev app — so "switched off" is played by standing in for
 * Setting.findOne for the length of a test.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { DEMO_CARDS, hasFullAccess, fullAccessFromRequest } = require('../../src/services/fullAccess');
const { normaliseCardNumber } = require('../../src/utils/cardNumber');
const Setting = require('../../src/models/Setting');
const User = require('../../src/models/User');

let app, demo, plain, demoCard;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    demo = await makeUser('Demo Card');
    plain = await makeUser('Plain Card');
    // Stand a test account in for one of the ten.
    demoCard = normaliseCardNumber(demo.user.cardNumber);
    DEMO_CARDS.add(demoCard);
});

after(async () => {
    DEMO_CARDS.delete(demoCard);
    await cleanup([demo.user, plain.user], app.server);
});

/** Every switch off, for the length of `fn`, without writing to the database. */
const allSwitchedOff = async (fn) => {
    const off = { isCreditSystemEnabled: false, isCareerPathEnabled: false, isJobsEnabled: false, isRewardsEnabled: false, globalQuiz: { enabled: false } };
    const real = Setting.findOne;
    const chain = { select: () => chain, lean: async () => off, then: (ok, ko) => Promise.resolve(off).then(ok, ko) };
    Setting.findOne = () => chain;
    const gates = [require('../../src/career/middleware/featureGate'), require('../../src/jobboard/middleware/featureGate')];
    gates[0].invalidateCareerSetting(); gates[1].invalidateJobsSetting();
    try { return await fn(); } finally {
        Setting.findOne = real;
        gates[0].invalidateCareerSetting(); gates[1].invalidateJobsSetting();
    }
};

test('the ten demo cards are on the list, by their digits however they are written', () => {
    assert.equal(DEMO_CARDS.size >= 10, true);
    for (const card of ['240100034472', '2401 0004 4304', 240100044305, '240100024637']) {
        assert.equal(hasFullAccess({ cardNumber: card }), true, `${card}`);
    }
    assert.equal(hasFullAccess({ cardNumber: '240100045056' }), false, 'an ordinary card is not');
    assert.equal(hasFullAccess(null), false);
});

test('Jobs opens for a demo card with no skills yet; not for anyone else', async () => {
    const mine = await app.call(demo.token)('GET', '/jobs-access');
    assert.equal(mine.status, 200);
    assert.equal(mine.body.ready, 0, 'no skills at 25% yet');
    assert.equal(mine.body.open, true);
    const theirs = await app.call(plain.token)('GET', '/jobs-access');
    assert.equal(theirs.body.open, false, 'the 5-skills rule still holds for others');
});

test('with every section switched off, a demo card still sees them all', async () => {
    await allSwitchedOff(async () => {
        const mine = (await app.call(demo.token)('GET', '/settings')).body;
        assert.deepEqual(mine, { isCreditSystemEnabled: true, isCareerPathEnabled: true, isJobsEnabled: true, isRewardsEnabled: false, isGlobalQuizEnabled: true },
            'all sections on; rewards follows the site-wide switch');
        const theirs = (await app.call(plain.token)('GET', '/settings')).body;
        assert.deepEqual(theirs, { isCreditSystemEnabled: false, isCareerPathEnabled: false, isJobsEnabled: false, isRewardsEnabled: false, isGlobalQuizEnabled: false });
    });
});

test('the Career Path and Jobs locks let a demo card through, and no one else', async () => {
    const { requireCareerPathEnabled } = require('../../src/career/middleware/featureGate');
    const { requireJobsEnabled } = require('../../src/jobboard/middleware/featureGate');
    const run = (gate, token) => new Promise((resolve) => {
        const res = { status: (code) => ({ json: (body) => resolve({ code, body }) }) };
        gate({ headers: token ? { authorization: `Bearer ${token}` } : {} }, res, () => resolve({ code: 'through' }));
    });
    await allSwitchedOff(async () => {
        for (const gate of [requireCareerPathEnabled, requireJobsEnabled]) {
            assert.equal((await run(gate, demo.token)).code, 'through', 'a demo card goes through');
            assert.equal((await run(gate, plain.token)).code, 403, 'another student is stopped');
            assert.equal((await run(gate, null)).code, 403, 'no token, no way through');
            assert.equal((await run(gate, 'not-a-token')).code, 403, 'nor a bad one');
        }
    });
});

test('a demo card that is no longer active gets nothing extra', async () => {
    await User.updateOne({ _id: demo.user._id }, { $set: { status: 'inactive' } });
    try {
        assert.equal(await fullAccessFromRequest({ headers: { authorization: `Bearer ${demo.token}` } }), false);
    } finally {
        await User.updateOne({ _id: demo.user._id }, { $set: { status: 'active' } });
    }
});
