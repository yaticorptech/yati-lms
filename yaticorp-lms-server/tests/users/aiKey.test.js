/**
 * Bring your own Gemini key: a student saves their key (checked live with
 * Google first), it is stored sealed, every AI call made for them then uses it
 * and skips the platform's daily cap, and removing it puts them back on the
 * platform key.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

let app, me, api;
const PLATFORM = String(process.env.GEMINI_API_KEY || '').trim();

before(async () => {
    await connect();
    app = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    me = await makeUser('Key'); api = app.call(me.token);
});

after(async () => { await cleanup([me.user], app.server); });

describe('the key endpoints', () => {
    test('needs a student', async () => {
        assert.equal((await app.call(null)('GET', '/ai-key')).status, 401);
    });

    test('starts without a key', async () => {
        const r = await api('GET', '/ai-key');
        assert.equal(r.status, 200);
        assert.equal(r.body.hasKey, false);
        assert.equal(r.body.platformKeyAvailable, !!PLATFORM);
    });

    test('a string that is not a Gemini key is refused before Google is asked', async () => {
        for (const key of ['', 'short', 'has spaces in it which is never right for a key']) {
            const r = await api('PUT', '/ai-key', { key });
            assert.equal(r.status, 400, key);
            assert.match(r.body.message, /does not look like a Gemini API key/);
        }
    });

    test('a well-formed key Google rejects is not saved', async () => {
        const r = await api('PUT', '/ai-key', { key: 'AIzaSyBogusBogusBogusBogusBogusBogusBogu' });
        assert.equal(r.status, 400);
        assert.match(r.body.message, /not saved/);
        assert.equal((await api('GET', '/ai-key')).body.hasKey, false);
    });

    test('a working key is saved sealed, and shown masked', { skip: !PLATFORM && 'no GEMINI_API_KEY to use as a sample key' }, async () => {
        const r = await api('PUT', '/ai-key', { key: PLATFORM });
        assert.equal(r.status, 200, r.body.message);
        assert.equal(r.body.hasKey, true);
        assert.equal(r.body.masked, `${PLATFORM.slice(0, 4)}…${PLATFORM.slice(-4)}`);

        const raw = await require('../../src/models/User').findById(me.user._id).select('+geminiApiKey').lean();
        assert.ok(raw.geminiApiKey.startsWith('v1.'));
        assert.ok(!raw.geminiApiKey.includes(PLATFORM), 'the key must not be stored in the clear');
        assert.ok(raw.geminiApiKeyAddedAt);

        // The default user read never carries it.
        const plain = await require('../../src/models/User').findById(me.user._id).lean();
        assert.equal(plain.geminiApiKey, undefined);

        const g = await api('GET', '/ai-key');
        assert.equal(g.body.hasKey, true); assert.equal(g.body.masked, r.body.masked);
    });
});

describe('what the AI services see', () => {
    const { runFor } = require('../../src/career/services/aiContext');
    const keys = require('../../src/utils/userAiKey');

    test('inside a call for this student, their own key is used', { skip: !PLATFORM && 'no sample key' }, async () => {
        const seen = await runFor(me.user._id, () => keys.resolveGeminiKey());
        assert.equal(seen.own, true); assert.equal(seen.key, PLATFORM);
        assert.equal(await runFor(me.user._id, () => keys.usingOwnKey()), true);
        assert.equal(await keys.aiConfiguredFor(me.user._id), true);
    });

    test('outside any student context, the platform key is used', async () => {
        const seen = await keys.resolveGeminiKey();
        assert.equal(seen.own, false); assert.equal(seen.key, PLATFORM);
    });

    test('the platform daily cap does not apply to a student on their own key', { skip: !PLATFORM && 'no sample key' }, async () => {
        const AiUsage = require('../../src/career/models/AiUsage');
        const aiQuota = require('../../src/career/services/aiQuota');
        const day = new Date().toISOString().slice(0, 10);
        const rows = Array.from({ length: 40 }, () => ({ userId: me.user._id, day, kind: 'test', model: 'x', ok: true, ms: 1 }));
        await AiUsage.insertMany(rows).catch(() => {});
        await assert.doesNotReject(runFor(me.user._id, () => aiQuota.assertWithinBudget()));
    });

    test('removing the key puts the student back on the platform key', async () => {
        const r = await api('DELETE', '/ai-key');
        assert.equal(r.status, 200); assert.equal(r.body.hasKey, false);
        const seen = await runFor(me.user._id, () => keys.resolveGeminiKey());
        assert.equal(seen.own, false);
        assert.equal((await api('GET', '/ai-key')).body.hasKey, false);
    });
});
