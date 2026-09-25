/**
 * The administrator's side of the Global Quiz: quizzes of the size they
 * choose, the questions inside each, publishing one as the students' paper,
 * and the on/off switch.
 *
 * Runs against the shared database: it builds its own quizzes, and puts back
 * the settings and whichever quiz was published before.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');

const TAG = `admin-quiz-${Date.now()}`;
let app, userApp, boss, me, api, studentApi, original, wasPublished = [];
const made = [];

const Q = (question, extra = {}) => ({ question, options: ['Venus', 'Mercury', 'Mars'], correctAnswerIndex: 1, explanation: 'Mercury orbits closest.', category: TAG, difficulty: 'easy', ...extra });
const newQuiz = async (size, title = `${TAG} ${size}`) => {
    const r = await api('POST', '/global-quiz/quizzes', { title, size, description: 'A test quiz' });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    made.push(r.body._id);
    return r.body;
};
const fill = async (quiz, n, from = 1) => {
    for (let i = from; i < from + n; i++) assert.equal((await api('POST', `/global-quiz/quizzes/${quiz._id}/questions`, Q(`Question number ${i}?`))).status, 201);
};

before(async () => {
    await connect();
    app = startApp({ mount: '/api/admin', router: require('../../src/routes/adminRoutes') });
    userApp = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    boss = await makeAdmin(); me = await makeUser('Quiz');
    api = app.call(boss.token); studentApi = userApp.call(me.token);
    const Setting = require('../../src/models/Setting');
    original = (await Setting.findOne().lean())?.globalQuiz;
    await Setting.updateOne({}, { $set: { globalQuiz: { enabled: true, defaultLength: 10 } } }, { upsert: true });
    await require('../../src/services/globalQuizService').ensureMigrated();
    wasPublished = await require('../../src/models/GlobalQuiz').find({ status: 'published' }).select('_id publishedAt').lean();
});

after(async () => {
    const GlobalQuiz = require('../../src/models/GlobalQuiz');
    await require('../../src/models/GlobalQuestion').deleteMany({ quizId: { $in: made } });
    await GlobalQuiz.deleteMany({ _id: { $in: made } });
    for (const q of wasPublished) await GlobalQuiz.updateOne({ _id: q._id }, { $set: { status: 'published', publishedAt: q.publishedAt } });
    await require('../../src/models/Setting').updateOne({}, original ? { $set: { globalQuiz: original } } : { $unset: { globalQuiz: 1 } });
    await new Promise((r) => userApp.server.close(r));
    await cleanup([me.user], app.server, [boss.admin]);
});

describe('quizzes', () => {
    test('need an administrator', async () => {
        assert.equal((await app.call(null)('GET', '/global-quiz/quizzes')).status, 401);
        assert.equal((await app.call(null)('POST', '/global-quiz/quizzes', { title: 'x', size: 5 })).status, 401);
    });

    test('a quiz is made at the size the admin chooses, as a draft', async () => {
        const five = await newQuiz(5);
        assert.equal(five.size, 5); assert.equal(five.status, 'draft'); assert.equal(five.questionCount, 0);
        const ten = await newQuiz(10);
        assert.equal(ten.size, 10);
        const list = (await api('GET', '/global-quiz/quizzes')).body.quizzes;
        assert.ok(list.some((q) => q._id === five._id) && list.some((q) => q._id === ten._id));
    });

    test('a nameless or wrongly sized quiz is refused', async () => {
        for (const [body, re] of [[{ title: '', size: 5 }, /name/], [{ title: 'Tiny', size: 2 }, /between 3 and 50/], [{ title: 'Huge', size: 51 }, /between 3 and 50/], [{ title: 'Odd', size: 'ten' }, /between/]]) {
            const r = await api('POST', '/global-quiz/quizzes', body);
            assert.equal(r.status, 400); assert.match(r.body.message, re);
        }
    });

    test('a quiz holds exactly its size: the next question is refused', async () => {
        const quiz = await newQuiz(3, `${TAG} full`);
        await fill(quiz, 3);
        const r = await api('POST', `/global-quiz/quizzes/${quiz._id}/questions`, Q('One too many?'));
        assert.equal(r.status, 409); assert.equal(r.body.code, 'QUIZ_FULL');
        assert.match(r.body.message, /3 of 3/);
    });

    test('a quiz cannot be made smaller than the questions it holds', async () => {
        const quiz = await newQuiz(5, `${TAG} shrink`);
        await fill(quiz, 4);
        const r = await api('PUT', `/global-quiz/quizzes/${quiz._id}`, { title: quiz.title, size: 3 });
        assert.equal(r.status, 400); assert.match(r.body.message, /Remove 1/);
        const ok = await api('PUT', `/global-quiz/quizzes/${quiz._id}`, { title: 'Renamed', size: 4, description: 'Now four' });
        assert.equal(ok.status, 200); assert.equal(ok.body.title, 'Renamed'); assert.equal(ok.body.size, 4); assert.equal(ok.body.questionCount, 4);
    });

    test('a half-written question is refused, and says why', async () => {
        const quiz = await newQuiz(5, `${TAG} checks`);
        const cases = [
            [Q('Eh?'), /Write the question out/],
            [Q('Only one answer?', { options: ['Only one'] }), /at least two answers/],
            [Q('Empty answers?', { options: ['a', '', '  '] }), /at least two answers/],
            [Q('Out of range?', { correctAnswerIndex: 9 }), /Mark which/]
        ];
        for (const [body, expected] of cases) {
            const r = await api('POST', `/global-quiz/quizzes/${quiz._id}/questions`, body);
            assert.equal(r.status, 400); assert.match(r.body.message, expected);
        }
    });
});

describe('publishing', () => {
    let a, b;

    test('only a full quiz can be published', async () => {
        a = await newQuiz(3, `${TAG} A`);
        await fill(a, 2);
        const early = await api('POST', `/global-quiz/quizzes/${a._id}/publish`);
        assert.equal(early.status, 400); assert.equal(early.body.code, 'QUIZ_NOT_FULL');
        assert.match(early.body.message, /2 of its 3/);
        await fill(a, 1, 3);
        const r = await api('POST', `/global-quiz/quizzes/${a._id}/publish`);
        assert.equal(r.status, 200); assert.equal(r.body.status, 'published');
    });

    test('students get the published quiz — all of it', async () => {
        const paper = await studentApi('GET', '/quizzes/global?limit=10');
        assert.equal(paper.status, 200);
        assert.equal(paper.body.quiz.title, `${TAG} A`);
        assert.equal(paper.body.questions.length, 3);
    });

    test('publishing another quiz replaces it, and the first goes back to draft', async () => {
        b = await newQuiz(4, `${TAG} B`);
        await fill(b, 4, 10);
        assert.equal((await api('POST', `/global-quiz/quizzes/${b._id}/publish`)).status, 200);
        const list = (await api('GET', '/global-quiz/quizzes')).body.quizzes;
        assert.equal(list.filter((q) => q.status === 'published').length, 1, 'one published quiz at a time');
        assert.equal(list.find((q) => q._id === a._id).status, 'draft');
        const paper = await studentApi('GET', '/quizzes/global');
        assert.equal(paper.body.quiz.title, `${TAG} B`); assert.equal(paper.body.questions.length, 4);
    });

    test('unpublishing leaves students with no quiz', async () => {
        const r = await api('POST', `/global-quiz/quizzes/${b._id}/unpublish`);
        assert.equal(r.status, 200); assert.equal(r.body.status, 'draft');
        const paper = await studentApi('GET', '/quizzes/global');
        assert.deepEqual(paper.body.questions, []); assert.equal(paper.body.quiz, null);
    });

    test('duplicating copies the questions into a new draft', async () => {
        const r = await api('POST', `/global-quiz/quizzes/${b._id}/duplicate`);
        assert.equal(r.status, 201); made.push(r.body._id);
        assert.equal(r.body.title, `Copy of ${TAG} B`); assert.equal(r.body.status, 'draft');
        assert.equal(r.body.questionCount, 4); assert.equal(r.body.size, 4);
        const qs = (await api('GET', `/global-quiz/quizzes/${r.body._id}/questions`)).body.questions;
        assert.equal(qs.length, 4); assert.ok(qs.every((q) => q.quizId === r.body._id));
    });

    test('deleting a quiz deletes its questions', async () => {
        const r = await api('DELETE', `/global-quiz/quizzes/${a._id}`);
        assert.equal(r.status, 200); assert.equal(r.body.deletedQuestions, 3);
        assert.equal((await api('GET', `/global-quiz/quizzes/${a._id}/questions`)).status, 404);
    });
});

describe('questions in a quiz', () => {
    let quiz, id;

    test('a question is added, rewritten and deleted', async () => {
        quiz = await newQuiz(5, `${TAG} edit`);
        const r = await api('POST', `/global-quiz/quizzes/${quiz._id}/questions`, Q('Which planet is closest to the Sun?'));
        assert.equal(r.status, 201); assert.equal(r.body.quizId, quiz._id); id = r.body._id;
        const upd = await api('PUT', `/global-quiz/${id}`, Q('Which planet orbits nearest the Sun?', { options: ['Mercury', 'Venus'], correctAnswerIndex: 0 }));
        assert.equal(upd.status, 200); assert.equal(upd.body.options.length, 2);
        assert.equal((await api('DELETE', `/global-quiz/${id}`)).status, 200);
        assert.equal((await api('DELETE', `/global-quiz/${id}`)).status, 404, 'deleting it twice is a miss, not a crash');
    });

    test('a whole set goes from one quiz, and never from another', async () => {
        const other = await newQuiz(3, `${TAG} other`);
        await fill(quiz, 3); await fill(other, 2);
        const bare = await api('DELETE', `/global-quiz/quizzes/${quiz._id}/questions`);
        assert.equal(bare.status, 400, 'a bare delete never empties a quiz');
        const r = await api('DELETE', `/global-quiz/quizzes/${quiz._id}/questions?category=${encodeURIComponent(TAG)}`);
        assert.equal(r.status, 200); assert.equal(r.body.deleted, 3);
        assert.equal((await api('GET', `/global-quiz/quizzes/${other._id}/questions`)).body.questions.length, 2, 'the other quiz is untouched');
        const all = await api('DELETE', `/global-quiz/quizzes/${other._id}/questions?all=true`);
        assert.equal(all.body.deleted, 2);
    });
});

describe('the on/off switch', () => {
    test('switching it off closes both student endpoints and tells the student app', async () => {
        await api('PUT', '/settings', { globalQuiz: { enabled: false } });
        const paper = await studentApi('GET', '/quizzes/global');
        assert.equal(paper.status, 403); assert.equal(paper.body.code, 'GLOBAL_QUIZ_OFF');
        assert.equal((await studentApi('POST', '/quizzes/global/submit', { answers: [{ questionId: 'x', answer: 0 }] })).status, 403);
        assert.equal((await studentApi('GET', '/settings')).body.isGlobalQuizEnabled, false);
    });

    test('switching it back on restores it', async () => {
        const r = await api('PUT', '/settings', { globalQuiz: { enabled: true } });
        assert.equal(r.body.globalQuiz.enabled, true);
        assert.equal((await studentApi('GET', '/quizzes/global')).status, 200);
    });
});
