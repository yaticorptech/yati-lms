/**
 * Straight to Advanced (asked 2026-10-31: "if the user goes directly to the advanced section, conduct one assessment;
 * based on that decide whether he is eligible for advanced or not; if not, he will learn from the basics" — then "an
 * assessment of how much English they know"): the Advanced entry test, 10 questions on Beginner and 10 on Advanced,
 * one try. Half of each right: Advanced opens and the student is at Advanced. Not: Advanced stays shut and they
 * learn Beginner from its start, its assessment at its end as for everyone.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const svc = require('../../src/linguistic/service');
const { LinguisticLesson } = require('../../src/linguistic/models');

let app, eve, sam, gate, entry;
before(async () => {
    await connect();
    app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
    await require('../../src/linguistic/seed').ensureSeeded();
    eve = await makeUser('Ling Jump Fails');
    sam = await makeUser('Ling Jump Passes');
    for (const s of [eve, sam]) assert.equal((await app.call(s.token)('POST', '/level', { level: 'beginner' })).status, 200);
    gate = await LinguisticLesson.findOne({ seedKey: 'review-assessment-beginner' }).lean();
    entry = await LinguisticLesson.findOne({ seedKey: 'review-entry-advanced' }).lean();
});
after(async () => { await cleanup([eve.user, sam.user], app.server); });

const answersOf = async (s) => Object.fromEntries(svc.quizOf(svc.serve(entry, await svc.progressOf(s.user._id))).map((q) => [q.id, q.answer]));
const beginnerSecond = (path) => path.levels[0].units.flatMap((u) => u.lessons).filter((x) => !x.stop)[1];

describe('the Advanced entry test', () => {
    test('Advanced shut, with an entry test; it is not on the path, and opens only for one whose Advanced is shut', async () => {
        assert.ok(entry, 'seeded');
        assert.equal((await svc.lessonsFor(await svc.progressOf(eve.user._id))).some((l) => l.review === 'entry'), false, 'not a stop on the path');
        const api = app.call(eve.token);
        const path = (await api('GET', '/path')).body;
        assert.deepEqual([path.levels[1].open, path.levels[1].jump], [false, { from: 'beginner', status: 'new' }]);
        assert.equal((await api('GET', `/lessons/${gate._id}`)).status, 403, 'the assessment shut at the end of Beginner');
        const start = await api('POST', '/jump', { level: 'advanced' });
        assert.equal(start.status, 200);
        assert.deepEqual([start.body.lesson, start.body.module], [String(entry._id), 'vocabulary']);
        const lesson = await api('GET', `/lessons/${entry._id}`);
        assert.equal(lesson.status, 200, 'the entry test opens');
        assert.equal(lesson.body.quiz.length, 20);
        assert.deepEqual([lesson.body.quiz.filter((q) => q.id.startsWith('h0~')).length, lesson.body.quiz.filter((q) => q.id.startsWith('h1~')).length], [10, 10], 'ten on Beginner, ten on Advanced');
        assert.ok(lesson.body.quiz.every((q) => q.answer === undefined), 'no answers sent');
        assert.match(lesson.body.learn.intro, /entry test.*10 on Beginner, 10 on Advanced.*half of each right.*one try/i);
        const adv = svc.quizOf(svc.serve(entry, await svc.progressOf(eve.user._id))).filter((q) => q.id.startsWith('h1~'));
        assert.ok(adv.length === 10, 'Advanced questions from the Advanced section');
        assert.equal(beginnerSecond((await api('GET', '/path')).body).open, false, 'the rest of Beginner keeps its order');
        assert.equal((await api('POST', '/jump', { level: 'beginner' })).status, 400, 'not to the first section');
    });

    test('only Beginner right (50% in all): not passed — Advanced stays shut, they learn Beginner from its start, and no second try', async () => {
        const api = app.call(eve.token);
        const answers = await answersOf(eve);
        for (const id of Object.keys(answers).filter((x) => x.startsWith('h1~'))) answers[id] = 'not this';
        const r = await api('POST', `/lessons/${entry._id}/quiz`, { answers });
        const halves = [{ level: 'beginner', percent: 100 }, { level: 'advanced', percent: 0 }];
        assert.deepEqual([r.body.percent, r.body.passed, r.body.jump], [50, false, { from: 'beginner', to: 'advanced', passed: false, halves }]);
        const path = (await api('GET', '/path')).body;
        assert.deepEqual([path.levels[1].open, path.levels[1].jump], [false, { from: 'beginner', status: 'failed', percent: 50, halves }]);
        assert.equal(path.level, 'beginner');
        assert.equal(beginnerSecond(path).open, false, 'Beginner from its start: its second lesson waits for the first');
        assert.equal((await api('GET', `/lessons/${gate._id}`)).status, 403, 'the assessment at the end of Beginner, as for everyone');
        assert.equal((await api('GET', `/lessons/${entry._id}`)).status, 403, 'the entry test: one try');
        const again = await api('POST', '/jump', { level: 'advanced' });
        assert.equal(again.status, 409);
        assert.match(again.body.message, /learn Beginner from its start/);
    });

    test('passed: Advanced opens and the student is at Advanced', async () => {
        const api = app.call(sam.token);
        assert.equal((await api('POST', '/jump', { level: 'advanced' })).status, 200);
        const r = await api('POST', `/lessons/${entry._id}/quiz`, { answers: await answersOf(sam) });
        assert.deepEqual([r.body.passed, r.body.jump], [true, { from: 'beginner', to: 'advanced', passed: true, halves: [{ level: 'beginner', percent: 100 }, { level: 'advanced', percent: 100 }] }]);
        assert.equal(r.body.next?.level, 'advanced', 'next up: an Advanced lesson');
        const path = (await api('GET', '/path')).body;
        assert.deepEqual([path.levels[1].open, path.levels[1].jump?.status, path.level], [true, 'passed', 'advanced']);
        assert.ok(path.levels[1].units.some((u) => u.lessons.some((x) => !x.stop && x.open)), 'its lessons open');
        assert.equal((await api('GET', '/')).body.level, 'advanced');
        assert.equal((await api('POST', '/jump', { level: 'advanced' })).status, 409, 'open already');
    });
});
