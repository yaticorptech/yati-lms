/**
 * The administrator's side of the Global Quiz: writing, editing and removing
 * the general questions, and the two settings that govern the paper.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');

const TAG = `admin-bank-${Date.now()}`;
let app, userApp, boss, me, api, studentApi, original;

const GOOD = { question: 'Which planet is closest to the Sun?', options: ['Venus', 'Mercury', 'Mars'], correctAnswerIndex: 1, explanation: 'Mercury orbits closest.', category: TAG, difficulty: 'easy' };

before(async () => {
    await connect();
    app = startApp({ mount: '/api/admin', router: require('../../src/routes/adminRoutes') });
    userApp = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    boss = await makeAdmin(); me = await makeUser('Quiz');
    api = app.call(boss.token); studentApi = userApp.call(me.token);
    const Setting = require('../../src/models/Setting');
    original = (await Setting.findOne().lean())?.globalQuiz;
    await Setting.updateOne({}, { $set: { globalQuiz: { enabled: true, defaultLength: 10 } } }, { upsert: true });
});

after(async () => {
    await require('../../src/models/GlobalQuestion').deleteMany({ category: TAG });
    await require('../../src/models/Setting').updateOne({}, original ? { $set: { globalQuiz: original } } : { $unset: { globalQuiz: 1 } });
    await new Promise((r) => userApp.server.close(r));
    await cleanup([me.user], app.server, [boss.admin]);
});

describe('writing the bank', () => {
    let id;

    test('needs an administrator', async () => {
        assert.equal((await app.call(null)('GET', '/global-quiz')).status, 401);
        assert.equal((await app.call(null)('POST', '/global-quiz', GOOD)).status, 401);
    });

    test('a question is added and comes back with its answer', async () => {
        const r = await api('POST', '/global-quiz', GOOD);
        assert.equal(r.status, 201);
        assert.equal(r.body.question, GOOD.question); assert.equal(r.body.correctAnswerIndex, 1);
        assert.equal(r.body.category, TAG); assert.equal(r.body.isPublished, true);
        id = r.body._id;
    });

    test('a half-written question is refused, and says why', async () => {
        const cases = [
            [{ ...GOOD, question: 'Eh?' }, /Write the question out/],
            [{ ...GOOD, options: ['Only one'] }, /at least two answers/],
            [{ ...GOOD, options: ['a', '', '  '] }, /at least two answers/],
            [{ ...GOOD, correctAnswerIndex: 9 }, /Mark which/],
            [{ ...GOOD, correctAnswerIndex: -1 }, /Mark which/]
        ];
        for (const [body, expected] of cases) {
            const r = await api('POST', '/global-quiz', body);
            assert.equal(r.status, 400, JSON.stringify(body).slice(0, 60));
            assert.match(r.body.message, expected);
        }
    });

    test('the list reports what the bank holds', async () => {
        await api('POST', '/global-quiz', { ...GOOD, question: 'A held-back question?', isPublished: false });
        const r = await api('GET', '/global-quiz');
        assert.equal(r.status, 200);
        const ours = r.body.questions.filter((q) => q.category === TAG);
        assert.equal(ours.length, 2);
        assert.ok(r.body.totals.published >= 1); assert.ok(r.body.totals.drafts >= 1);
        assert.ok(ours.every((q) => q.correctAnswerIndex !== undefined), 'an administrator sees the answers');
    });

    test('a question can be rewritten', async () => {
        const r = await api('PUT', `/global-quiz/${id}`, { ...GOOD, question: 'Which planet orbits nearest the Sun?', difficulty: 'hard' });
        assert.equal(r.status, 200);
        assert.match(r.body.question, /orbits nearest/); assert.equal(r.body.difficulty, 'hard');
        assert.equal((await api('PUT', `/global-quiz/${new mongoose.Types.ObjectId()}`, GOOD)).status, 404);
    });

    test('a question can be deleted, and stops being asked', async () => {
        const extra = (await api('POST', '/global-quiz', { ...GOOD, question: 'Doomed question?' })).body;
        assert.equal((await api('DELETE', `/global-quiz/${extra._id}`)).status, 200);
        const left = (await api('GET', '/global-quiz')).body.questions.filter((q) => q.category === TAG);
        assert.ok(!left.some((q) => q.question === 'Doomed question?'));
        assert.equal((await api('DELETE', `/global-quiz/${extra._id}`)).status, 404, 'deleting it twice is a miss, not a crash');
    });

    test('students are asked the published ones and never the draft', async () => {
        const paper = await studentApi('GET', '/quizzes/global?limit=25');
        assert.equal(paper.status, 200);
        const ours = paper.body.questions.filter((q) => q.category === TAG);
        assert.equal(ours.length, 1, 'the one published question of ours');
        assert.match(ours[0].questionText, /orbits nearest/);
    });
});

describe('the two settings', () => {
    test('a length outside three to twenty-five is refused', async () => {
        for (const n of [2, 26, 'ten']) assert.equal((await api('PUT', '/settings', { globalQuiz: { defaultLength: n } })).status, 400, `length ${n}`);
    });

    test('the length is saved and used as the student default', async () => {
        const saved = await api('PUT', '/settings', { globalQuiz: { defaultLength: 5 } });
        assert.equal(saved.body.globalQuiz.defaultLength, 5);
        const paper = await studentApi('GET', '/quizzes/global');
        assert.ok(paper.body.questions.length <= 5);
    });

    test('switching it off closes both student endpoints and tells the student app', async () => {
        await api('PUT', '/settings', { globalQuiz: { enabled: false } });
        const paper = await studentApi('GET', '/quizzes/global');
        assert.equal(paper.status, 403); assert.equal(paper.body.code, 'GLOBAL_QUIZ_OFF');
        assert.equal((await studentApi('POST', '/quizzes/global/submit', { answers: [{ questionId: 'x', answer: 0 }] })).status, 403);
        assert.equal((await studentApi('GET', '/settings')).body.isGlobalQuizEnabled, false);
    });

    test('switching it back on restores it, and one setting does not disturb the other', async () => {
        const r = await api('PUT', '/settings', { globalQuiz: { enabled: true } });
        assert.equal(r.body.globalQuiz.defaultLength, 5, 'the length survived the switch');
        assert.equal((await studentApi('GET', '/quizzes/global')).status, 200);
        assert.equal((await api('PUT', '/settings', { globalQuiz: { defaultLength: 15 } })).body.globalQuiz.enabled, true);
    });
});
