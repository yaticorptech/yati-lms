/**
 * "Jump here?" on a unit (2026-11-13, the user's Duolingo picture "UP NEXT … JUMP HERE?" — "give both options: what is
 * there now, and this"; chose "the unit just before it" and "skipped units open, still to do"): a shut unit of an open
 * section offers its test, the unit review of the unit before it. Not passed, nothing opens and it can be tried again;
 * passed, the unit opens, and the units skipped open too, still to do. Unit by unit stays as it was.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const svc = require('../../src/linguistic/service');
const { LinguisticLesson } = require('../../src/linguistic/models');

let app, u;
const others = [];
before(async () => {
    await connect();
    app = startApp({ mount: '/api/linguistic', router: require('../../src/linguistic') });
    await require('../../src/linguistic/seed').ensureSeeded();
    u = await makeUser('Ling Unit Jump');
    const api = app.call(u.token);
    assert.equal((await api('POST', '/language', { language: 'kn' })).status, 200);
    assert.equal((await api('POST', '/level', { level: 'beginner' })).status, 200);
});
after(async () => { await cleanup([u.user, ...others], app.server); });

const beginnerOf = async (api) => (await api('GET', '/path')).body.levels.find((l) => l.level === 'beginner');
const lessonsIn = (unit) => unit.lessons.filter((x) => !x.stop);
const answersOf = async (doc, right = true) => Object.fromEntries(svc.quizOf(svc.serve(doc, await svc.progressOf(u.user._id))).map((q) => [q.id, right ? q.answer : 'not this']));

describe('jump here? on a unit', () => {
    test('a shut unit offers its test; failed, nothing opens; again; passed, it opens and the units skipped open, still to do', async () => {
        const api = app.call(u.token);
        let level = await beginnerOf(api);
        const shut = level.units.filter((x) => x.jump);
        assert.ok(shut.length >= 2, `shut units with "Jump here?" (${shut.length})`);
        assert.ok(level.units.filter((x) => x.open).every((x) => !x.jump), 'an open unit has none');
        // The unit two along: its test is the review of the unit just before it.
        const target = shut[1];
        const ti = level.units.findIndex((x) => x.id === target.id);
        const review = level.units[ti - 1].lessons.find((x) => x.review === 'unit');
        assert.equal(target.jump.review, review.id, 'the review of the unit before it');
        const doc = await LinguisticLesson.findById(review.id).lean();
        assert.equal((await api('GET', `/lessons/${review.id}`)).status, 403, 'shut until the jump is asked for');

        const start = await api('POST', '/jump-unit', { unit: target.id });
        assert.equal(start.status, 200, JSON.stringify(start.body));
        assert.deepEqual([start.body.unit, start.body.lesson], [target.id, review.id]);
        assert.equal((await api('GET', `/lessons/${review.id}`)).status, 200, 'its test opens');

        // Not passed: nothing opens, not even the units before it.
        const failed = await api('POST', `/lessons/${review.id}/quiz`, { answers: await answersOf(doc, false) });
        assert.deepEqual([failed.body.passed, failed.body.unitJump], [false, { to: target.id, passed: false }]);
        level = await beginnerOf(api);
        assert.equal(lessonsIn(level.units[ti])[0].open, false, 'the unit stays shut');
        assert.equal(lessonsIn(level.units[ti - 1])[0].open, false, 'the unit before it too');
        assert.ok(level.units[ti].jump, 'still offered');

        // Again, and passed.
        assert.equal((await api('POST', '/jump-unit', { unit: target.id })).status, 200, 'tried again');
        const passed = await api('POST', `/lessons/${review.id}/quiz`, { answers: await answersOf(doc) });
        assert.deepEqual([passed.body.passed, passed.body.unitJump], [true, { to: target.id, passed: true }]);
        assert.equal(passed.body.next?.id, lessonsIn(level.units[ti])[0].id, 'Continue: the unit jumped to');
        level = await beginnerOf(api);
        assert.equal(lessonsIn(level.units[ti])[0].open, true, 'the unit opens');
        assert.equal(level.units[ti].jump, undefined, 'no "Jump here?" on it any more');
        const skipped = lessonsIn(level.units[ti - 1]).filter((x) => x.review !== 'unit');
        assert.ok(skipped.every((x) => x.open && x.status !== 'completed'), 'the unit skipped: open, still to do');
        assert.equal((await api('POST', '/jump-unit', { unit: target.id })).status, 409, 'open already');
    });

    test('not for an open unit, a section\'s review, or a unit that is not there', async () => {
        const api = app.call(u.token);
        const level = await beginnerOf(api);
        assert.equal((await api('POST', '/jump-unit', { unit: level.units.find((x) => x.open).id })).status, 409);
        const review = level.units.find((x) => x.kind === 'review');
        if (review) assert.equal((await api('POST', '/jump-unit', { unit: review.id })).status, 409);
        assert.equal((await api('POST', '/jump-unit', { unit: 'beginner-99' })).status, 404);
    });
});

/*
 * And every next unit (2026-11-16, the user's picture "UP NEXT … JUMP HERE?": "when the user works on unit 1, show unit 2
 * like this"): a unit before it with no review — the Letters unit, a new section's unit — has its last lesson as the
 * test; passed, the unit opens.
 */
describe('jump here? where the unit before has no review', () => {
    let v;
    before(async () => {
        v = await makeUser('Ling Unit Jump New Section');
        others.push(v.user);
        const api = app.call(v.token);
        assert.equal((await api('POST', '/language', { language: 'kn' })).status, 200);
        assert.equal((await api('POST', '/level', { level: 'beginner' })).status, 200);
        await require('./unlock').placeAt(v.user, 'elementary');
    });

    test('Beginner\'s Family (after Letters) and Daily life\'s Shopping (after At home): the last lesson of the unit before is the test', async () => {
        const api = app.call(v.token);
        const path = (await api('GET', '/path')).body;
        const daily = path.levels.find((l) => l.level === 'elementary');
        assert.equal(daily.open, true, 'Daily life open');
        const shopping = daily.units.find((x) => x.title === 'Shopping');
        const atHome = daily.units.find((x) => x.title === 'At home');
        assert.ok(shopping.jump, 'Shopping offers "Jump here?"');
        assert.equal(shopping.jump.review, lessonsIn(atHome).at(-1).id, 'its test: At home\'s last lesson, its conversation');
        const start = await api('POST', '/jump-unit', { unit: shopping.id });
        assert.equal(start.status, 200, JSON.stringify(start.body));
        const doc = await LinguisticLesson.findById(start.body.lesson).lean();
        const done = (await api('POST', `/lessons/${doc._id}/quiz`, { answers: await (async () => Object.fromEntries(svc.quizOf(svc.serve(doc, await svc.progressOf(v.user._id))).map((q) => [q.id, q.answer])))() })).body;
        assert.deepEqual([done.passed, done.unitJump?.passed], [true, true]);
        const after = (await api('GET', '/path')).body.levels.find((l) => l.level === 'elementary').units.find((x) => x.title === 'Shopping');
        assert.equal(after.open, true, 'Shopping opens');
        assert.equal(lessonsIn(after)[0].open, true, 'at its first lesson');
    });
});
