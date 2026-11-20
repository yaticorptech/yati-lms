/**
 * The demo cards in Multilingo (2026-11-19, the owner: "English to Kannada is already downloaded — play our TTS voice
 * only; the other languages locked, working on it"): a demo card starts as an English speaker learning Kannada;
 * only English and Kannada can be spoken or learnt; every other language is shown locked, as being worked on.
 * Nothing changes for any other card.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { DEMO_CARDS } = require('../../src/services/fullAccess');
const { normaliseCardNumber } = require('../../src/utils/cardNumber');

let app, demo, plain, card;
const saved = {};
before(async () => {
    for (const k of ['LINGUISTIC_OPEN_COURSES', 'DEMO_LINGO_LANGS']) saved[k] = process.env[k];
    delete process.env.LINGUISTIC_OPEN_COURSES;
    delete process.env.DEMO_LINGO_LANGS;
    await connect();
    app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
    demo = await makeUser('Ling Demo Card');
    plain = await makeUser('Ling Demo Plain');
    card = normaliseCardNumber(demo.user.cardNumber);
    DEMO_CARDS.add(card);
});
after(async () => {
    DEMO_CARDS.delete(card);
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    await cleanup([demo.user, plain.user], app.server);
});

test('a demo card opens Multilingo as an English speaker learning Kannada', async () => {
    const home = (await app.call(demo.token)('GET', '/')).body;
    assert.equal(home.language.code, 'en');
    assert.equal(home.languageChosen, true);
    assert.equal(home.course.code, 'kn');
});

test('only English and Kannada are open to it; the rest are locked, as being worked on', async () => {
    const home = (await app.call(demo.token)('GET', '/')).body;
    assert.deepEqual(home.courses.filter((c) => !c.locked).map((c) => c.code).sort(), ['en', 'kn']);
    assert.ok(home.courses.filter((c) => c.locked).every((c) => c.soon), 'each locked course says it is being worked on');
    assert.deepEqual(home.languages.filter((l) => !l.locked).map((l) => l.code).sort(), ['en', 'kn']);
    const hindi = await app.call(demo.token)('POST', '/course', { course: 'hi', start: 'beginner' });
    assert.equal(hindi.status, 400);
    assert.match(hindi.body.message, /Hindi is being worked on/);
    const speak = await app.call(demo.token)('POST', '/language', { language: 'hi' });
    assert.equal(speak.status, 400);
    assert.match(speak.body.message, /Hindi is being worked on/);
});

test('the other way round is open too: a Kannada speaker learning English', async () => {
    assert.equal((await app.call(demo.token)('POST', '/course', { course: 'en' })).status, 200);
    assert.equal((await app.call(demo.token)('POST', '/language', { language: 'kn' })).status, 200);
    const home = (await app.call(demo.token)('GET', '/')).body;
    assert.equal(home.language.code, 'kn');
    assert.equal(home.course.code, 'en', 'a choice already made is not put back');
});

test('nothing changes for any other card', async () => {
    const home = (await app.call(plain.token)('GET', '/')).body;
    assert.equal(home.languageChosen, false);
    assert.equal(home.course.code, 'en');
    assert.deepEqual(home.courses.filter((c) => !c.locked).map((c) => c.code).sort(), ['en', 'hi', 'kn']);
    assert.ok(home.languages.every((l) => !l.locked));
    assert.equal((await app.call(plain.token)('POST', '/language', { language: 'hi' })).status, 200);
});
