/**
 * Only English, Kannada and Hindi to learn (2026-11-13, the user: "except Kannada, Hindi and English, lock the other
 * languages for every card except DEVICE_LIMIT_EXEMPT_CARDS"): every other course is shown locked and cannot be chosen;
 * a developer card (DEVICE_LIMIT_EXEMPT_CARDS) may learn any; a student already on a locked course keeps it.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const svc = require('../../src/linguistic/service');
const { LinguisticProgress } = require('../../src/linguistic/models');

let app, plain, dev, early;
const saved = {};
before(async () => {
    // This test's own settings: the lock as it is outside the tests, and one developer card.
    for (const k of ['LINGUISTIC_OPEN_COURSES', 'DEVICE_LIMIT_EXEMPT_CARDS']) saved[k] = process.env[k];
    delete process.env.LINGUISTIC_OPEN_COURSES;
    await connect();
    app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
    plain = await makeUser('Ling Lock Plain');
    dev = await makeUser('Ling Lock Developer');
    early = await makeUser('Ling Lock Already Spanish');
    process.env.DEVICE_LIMIT_EXEMPT_CARDS = String(dev.user.cardNumber);
    for (const s of [plain, dev, early]) assert.equal((await app.call(s.token)('POST', '/language', { language: 'kn' })).status, 200);
});
after(async () => {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    await cleanup([plain.user, dev.user, early.user], app.server);
});

const coursesOf = async (s) => (await app.call(s.token)('GET', '/')).body.courses;

describe('only English, Kannada and Hindi to learn', () => {
    test('a student: the others shown locked; Spanish refused, Hindi chosen', async () => {
        const list = await coursesOf(plain);
        assert.deepEqual(list.filter((c) => !c.locked).map((c) => c.code).sort(), ['en', 'hi', 'kn']);
        assert.ok(list.filter((c) => c.locked).length >= 18, 'the other languages locked');
        const es = await app.call(plain.token)('POST', '/course', { course: 'es', start: 'beginner' });
        assert.equal(es.status, 400);
        assert.match(es.body.message, /Spanish is not open yet. You can learn English, Kannada or Hindi/);
        assert.equal((await app.call(plain.token)('POST', '/course', { course: 'hi', start: 'beginner' })).status, 200);
    });

    test('a developer card (DEVICE_LIMIT_EXEMPT_CARDS): every language open; Spanish chosen', async () => {
        const list = await coursesOf(dev);
        assert.deepEqual(list.filter((c) => c.locked).map((c) => c.code), [], 'nothing locked');
        assert.equal((await app.call(dev.token)('POST', '/course', { course: 'es', start: 'beginner' })).status, 200);
    });

    test('a student already learning a locked language keeps it', async () => {
        await LinguisticProgress.updateOne({ userId: early.user._id }, { $set: { course: 'es', courseStart: { es: 'beginner' } } });
        const list = await coursesOf(early);
        assert.equal(list.find((c) => c.code === 'es').locked, undefined, 'their own course not locked');
        assert.equal(list.find((c) => c.code === 'ja').locked, true, 'the others still locked');
        const p = await svc.progressOf(early.user._id);
        assert.equal(p.course, 'es');
    });
});
