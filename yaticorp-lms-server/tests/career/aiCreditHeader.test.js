/**
 * "Free AI credits used" (2026-11-02): an answer that spent the platform's
 * Gemini credits carries `X-AI-Credits: platform`, which opens the student's
 * "use your own free key" popup once per sign-in. Not when the call ran on
 * the student's own key, not for a demo card, not for a failed call.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { withAiContext, currentStore } = require('../../src/career/services/aiContext');
const aiQuota = require('../../src/career/services/aiQuota');
const { resolveGeminiKey } = require('../../src/utils/userAiKey');

let app, student;

before(async () => {
    await connect();
    student = await makeUser('AiCreditHeader');
    const router = express.Router();
    router.use(withAiContext);
    router.use((req, _res, next) => { req.user = { _id: student.user._id }; next(); });
    // A stand-in for a generation: look the key up as geminiClient does, then record the call.
    router.get('/generate', async (req, res) => {
        await resolveGeminiKey();
        if (req.query.own) currentStore().ownGeminiKey = 'AIza-own-key';
        if (req.query.demo) currentStore().fullAccess = true;
        aiQuota.record({ kind: 'test', model: 'test', ok: req.query.fail ? false : true, ms: 1 });
        res.json({ ok: true });
    });
    router.get('/no-ai', (_req, res) => res.json({ ok: true }));
    app = startApp({ mount: '/api/test-ai', router });
});

after(async () => { await cleanup([student.user], app.server); });

const hit = async (path) => {
    const r = await fetch(`http://127.0.0.1:${app.server.address().port}/api/test-ai${path}`);
    return r.headers.get('x-ai-credits');
};

test('an answer that spent the platform\'s free credits says so', async () => {
    assert.equal(await hit('/generate'), 'platform');
});

test('not on the student\'s own key, a demo card, a failed call or a call with no AI', async () => {
    assert.equal(await hit('/generate?own=1'), null, 'their own key');
    assert.equal(await hit('/generate?demo=1'), null, 'a demo card cannot add a key');
    assert.equal(await hit('/generate?fail=1'), null, 'nothing was spent');
    assert.equal(await hit('/no-ai'), null);
});

test('the browser may read the header (CORS)', () => {
    const src = require('node:fs').readFileSync(require.resolve('../../server.js'), 'utf8');
    assert.match(src, /exposedHeaders:\s*\[[^\]]*'X-AI-Credits'/);
});
