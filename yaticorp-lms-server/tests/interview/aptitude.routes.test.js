/**
 * Aptitude practice through its real routes (aptitudeRoutes.js): a Class 10
 * student's "IQ & Reasoning", a set answered one question at a time, the
 * scores, and the guards. Needs the test database.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const Goal = require('../../src/career/models/Goal');
const { AptitudeSet } = require('../../src/interview/models');

let app, asha, ravi, ashaApi, raviApi;
before(async () => {
    await connect(); app = startApp();
    asha = await makeUser('Asha'); ravi = await makeUser('Ravi');
    ashaApi = app.call(asha.token); raviApi = app.call(ravi.token);
    await Goal.create({ userId: asha.user._id, educationLevel: 'High School (Class 9–10)', currentClass: 'Class 10', board: 'CBSE', careerGoal: 'Doctor' });
});
after(async () => { await cleanup([asha.user, ravi.user], app.server); });

describe('the section', () => {
    test('a Class 10 student sees "IQ & Reasoning", for Class 10', async () => {
        const r = await ashaApi('GET', '/aptitude'); assert.equal(r.status, 200);
        assert.equal(r.body.title, 'IQ & Reasoning'); assert.equal(r.body.level, 'Class 10'); assert.equal(r.body.placed, true); assert.equal(r.body.school, true);
        assert.deepEqual(r.body.sections.map((s) => s.id), ['mixed', 'asked', 'maths', 'patterns', 'reasoning', 'words']);
        assert.deepEqual(r.body.stats, { sets: 0, best: null, last: null, recent: [] });
        assert.equal(r.body.open, null);
    });
    test('a student the app cannot place sees "Aptitude Practice", and is told so', async () => {
        const r = await raviApi('GET', '/aptitude');
        assert.equal(r.body.title, 'Aptitude Practice'); assert.equal(r.body.placed, false); assert.equal(r.body.level, '');
    });
});

describe('a set', () => {
    let set;
    test('starts with ten questions and none of their answers', async () => {
        const r = await ashaApi('POST', '/aptitude/sets', { section: 'mixed' }); assert.equal(r.status, 201);
        set = r.body;
        assert.equal(set.total, 10); assert.equal(set.answered, 0); assert.equal(set.status, 'open'); assert.equal(set.sectionLabel, 'Mixed');
        for (const q of set.questions) { assert.equal(q.answer, undefined); assert.equal(q.explanation, undefined); assert.ok(q.options.length >= 2); }
        assert.equal(set.questions.filter((q) => q.faq).length, 2, 'two of them are often asked in interviews');
        const saved = await AptitudeSet.findById(set.id).lean();
        assert.equal(saved.level, 'high');
    });
    test('an answer comes back right or wrong, with the answer and why', async () => {
        const saved = await AptitudeSet.findById(set.id).lean();
        const q = saved.questions[0];
        const wrong = (q.answer + 1) % q.options.length;
        const r = await ashaApi('POST', `/aptitude/sets/${set.id}/answer`, { id: q.id, choice: wrong }); assert.equal(r.status, 200);
        assert.deepEqual(r.body.result, { right: false, answer: q.answer, explanation: q.explanation });
        assert.equal(r.body.set.answered, 1); assert.equal(r.body.set.correct, 0);
        assert.equal(r.body.set.questions[0].answer, q.answer, 'the answered question now shows its answer');
        assert.equal(r.body.set.questions[1].answer, undefined, 'the others still do not');
    });
    test('a question cannot be answered twice', async () => {
        const saved = await AptitudeSet.findById(set.id).lean();
        const q = saved.questions[0];
        const r = await ashaApi('POST', `/aptitude/sets/${set.id}/answer`, { id: q.id, choice: q.answer });
        assert.equal(r.body.result.right, false, 'the first answer stands'); assert.equal(r.body.set.correct, 0);
    });
    test('the rest, right: the set finishes with 9 of 10 and the scores count it', async () => {
        const saved = await AptitudeSet.findById(set.id).lean();
        let last;
        for (const q of saved.questions.slice(1)) last = await ashaApi('POST', `/aptitude/sets/${set.id}/answer`, { id: q.id, choice: q.answer });
        assert.equal(last.body.set.status, 'completed'); assert.equal(last.body.set.correct, 9); assert.equal(last.body.set.percent, 90);
        const page = (await ashaApi('GET', '/aptitude')).body;
        assert.equal(page.stats.sets, 1); assert.equal(page.stats.best, 90); assert.equal(page.stats.last.correct, 9); assert.equal(page.stats.recent.length, 1);
        const dash = (await ashaApi('GET', '/dashboard')).body;
        assert.deepEqual({ title: dash.aptitude.title, sets: dash.aptitude.sets, best: dash.aptitude.best }, { title: 'IQ & Reasoning', sets: 1, best: 90 });
        const done = await ashaApi('POST', `/aptitude/sets/${set.id}/answer`, { id: saved.questions[0].id, choice: 0 });
        assert.equal(done.status, 409, 'a finished set takes no more answers');
    });
    test('one section only, and a new set leaves an unfinished one behind', async () => {
        const first = (await ashaApi('POST', '/aptitude/sets', { section: 'words' })).body;
        assert.ok(first.questions.every((q) => q.section === 'words')); assert.equal(first.sectionLabel, 'Words');
        assert.equal((await ashaApi('GET', '/aptitude')).body.open.id, first.id);
        const second = (await ashaApi('POST', '/aptitude/sets', { section: 'maths' })).body;
        assert.equal((await AptitudeSet.findById(first.id).lean()).status, 'abandoned');
        assert.equal((await ashaApi('GET', '/aptitude')).body.open.id, second.id);
        assert.equal((await ashaApi('GET', '/aptitude')).body.stats.sets, 1, 'an abandoned set is not counted');
    });
});

describe('guards', () => {
    test('a wrong section, question or choice is refused', async () => {
        assert.equal((await ashaApi('POST', '/aptitude/sets', { section: 'chess' })).status, 400);
        const s = (await ashaApi('POST', '/aptitude/sets', { section: 'patterns' })).body;
        assert.equal((await ashaApi('POST', `/aptitude/sets/${s.id}/answer`, { id: 'q99', choice: 0 })).status, 400);
        assert.equal((await ashaApi('POST', `/aptitude/sets/${s.id}/answer`, { id: 'q1', choice: 7 })).status, 400);
        assert.equal((await ashaApi('POST', `/aptitude/sets/${s.id}/answer`, { id: 'q1', choice: 'a' })).status, 400);
    });
    test('another student can neither see nor answer a set', async () => {
        const s = (await ashaApi('POST', '/aptitude/sets', { section: 'mixed' })).body;
        assert.equal((await raviApi('GET', `/aptitude/sets/${s.id}`)).status, 404);
        assert.equal((await raviApi('POST', `/aptitude/sets/${s.id}/answer`, { id: 'q1', choice: 0 })).status, 404);
        assert.equal((await raviApi('GET', '/aptitude/sets/not-an-id')).status, 404);
    });
    test('signed out, nothing', async () => {
        assert.equal((await app.call(null)('GET', '/aptitude')).status, 401);
    });
});
