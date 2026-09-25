/**
 * The Global Quiz as students meet it: the quiz an administrator has
 * published, never the quizzes inside courses. Builds its own published quiz
 * and a draft beside it, and puts back whichever quiz was published before.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

const TAG = `test-bank-${Date.now()}`;
let app, me, api, original, live, draft, wasPublished = [];

const add = (quiz, question, options, correctAnswerIndex, extra = {}) =>
    require('../../src/models/GlobalQuestion').create({ question, options, correctAnswerIndex, category: TAG, quizId: quiz._id, ...extra });

before(async () => {
    await connect();
    app = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    me = await makeUser('Quiz'); api = app.call(me.token);
    const Setting = require('../../src/models/Setting');
    original = (await Setting.findOne().lean())?.globalQuiz;
    await Setting.updateOne({}, { $set: { globalQuiz: { enabled: true, defaultLength: 10 } } }, { upsert: true });
    // Real questions from before quizzes existed are moved into a quiz first,
    // so the one published here is the only one — and the real one comes back.
    await require('../../src/services/globalQuizService').ensureMigrated();
    const GlobalQuiz = require('../../src/models/GlobalQuiz');
    wasPublished = (await GlobalQuiz.find({ status: 'published' }).select('_id publishedAt').lean());
    await GlobalQuiz.updateMany({ status: 'published' }, { $set: { status: 'draft' } });
    live = await GlobalQuiz.create({ title: `${TAG} live`, size: 6, status: 'published', publishedAt: new Date() });
    draft = await GlobalQuiz.create({ title: `${TAG} draft`, size: 3 });
    // A plain question, and some with explanations; and one in a draft quiz.
    await add(live, 'What is 2 + 2?', ['3', '4', '5'], 1, { explanation: 'Two and two make four.' });
    await add(live, 'Which is a colour?', ['Blue', 'Chair'], 0, { explanation: 'Blue is a colour.' });
    await add(live, 'Capital of France?', ['Rome', 'Paris'], 1);
    for (const n of [4, 5, 6]) await add(live, `Filler question ${n}`, ['a', 'b'], n % 2);
    await add(draft, 'A draft nobody should see', ['a', 'b'], 0);
});

after(async () => {
    const GlobalQuiz = require('../../src/models/GlobalQuiz');
    await require('../../src/models/GlobalQuestion').deleteMany({ quizId: { $in: [live._id, draft._id] } });
    await GlobalQuiz.deleteMany({ _id: { $in: [live._id, draft._id] } });
    for (const q of wasPublished) await GlobalQuiz.updateOne({ _id: q._id }, { $set: { status: 'published', publishedAt: q.publishedAt } });
    await require('../../src/models/Setting').updateOne({}, original ? { $set: { globalQuiz: original } } : { $unset: { globalQuiz: 1 } });
    await cleanup([me.user], app.server);
});

const mine = (questions) => questions.filter((q) => q.category === TAG);

describe('drawing the paper', () => {
    test('needs a signed-in student', async () => { assert.equal((await app.call(null)('GET', '/quizzes/global')).status, 401); });

    test('draws general questions, never their answers', async () => {
        const r = await api('GET', '/quizzes/global?limit=25');
        assert.equal(r.status, 200);
        const rows = mine(r.body.questions);
        assert.equal(rows.length, 6, "the published quiz's six questions, and not the draft quiz's");
        for (const q of rows) {
            assert.ok(q.questionId && q.questionText && Array.isArray(q.options));
            assert.equal(q.correctAnswerIndex, undefined);
            assert.equal(q.explanation, undefined);
            // Nothing ties a question to a course any more.
            assert.equal(q.courseTitle, undefined); assert.equal(q.quizId, undefined);
        }
        assert.ok(r.body.categories.includes(TAG));
    });

    test('a draft quiz is never asked', async () => {
        const r = await api('GET', '/quizzes/global?limit=25');
        assert.ok(!r.body.questions.some((q) => q.questionText.includes('draft nobody should see')));
    });

    test('every student gets the whole published quiz, whatever length they ask for', async () => {
        for (const limit of [1, 4, 10, 999]) {
            const r = await api('GET', `/quizzes/global?limit=${limit}`);
            assert.equal(r.body.questions.length, 6, `limit=${limit}`);
            assert.equal(r.body.quiz.title, `${TAG} live`);
        }
    });

    test('with no quiz published there is no paper, and the student app says so', async () => {
        const GlobalQuiz = require('../../src/models/GlobalQuiz');
        await GlobalQuiz.updateOne({ _id: live._id }, { $set: { status: 'draft' } });
        const r = await api('GET', '/quizzes/global');
        await GlobalQuiz.updateOne({ _id: live._id }, { $set: { status: 'published' } });
        assert.equal(r.status, 200);
        assert.deepEqual(r.body.questions, []);
        assert.equal(r.body.quiz, null);
    });

    test('the paper is shuffled between draws', async () => {
        const order = async () => (await api('GET', '/quizzes/global?limit=25')).body.questions.map((q) => q.questionId).join('|');
        const seen = new Set(); for (let i = 0; i < 8; i++) seen.add(await order());
        assert.ok(seen.size > 1);
    });
});

describe('marking it', () => {
    const RIGHT = { 'What is 2 + 2?': 1, 'Which is a colour?': 0, 'Capital of France?': 1, 'Filler question 4': 0, 'Filler question 5': 1, 'Filler question 6': 0 };
    const answersFor = (rows, pick) => rows.map((q) => ({ questionId: q.questionId, answer: pick(q) }));

    test('scores every answer and explains it', async () => {
        const rows = mine((await api('GET', '/quizzes/global?limit=25')).body.questions);
        const r = await api('POST', '/quizzes/global/submit', { answers: answersFor(rows, (q) => RIGHT[q.questionText]) });
        assert.equal(r.status, 200);
        assert.equal(r.body.score, 100); assert.equal(r.body.correctCount, 6); assert.equal(r.body.practiceOnly, true);
        assert.match(r.body.results.find((x) => x.questionText === 'What is 2 + 2?').explanation, /make four/);
    });

    test('a wrong answer comes back with the right one', async () => {
        const rows = mine((await api('GET', '/quizzes/global?limit=25')).body.questions);
        const r = await api('POST', '/quizzes/global/submit', { answers: answersFor(rows, (q) => (RIGHT[q.questionText] + 1) % 2) });
        assert.ok(r.body.score < 100);
        const wrong = r.body.results.find((x) => !x.isCorrect);
        assert.equal(wrong.correctAnswer, RIGHT[wrong.questionText]);
    });

    test('a partly finished paper is marked out of what was answered', async () => {
        const rows = mine((await api('GET', '/quizzes/global?limit=25')).body.questions).slice(0, 1);
        const r = await api('POST', '/quizzes/global/submit', { answers: answersFor(rows, (q) => RIGHT[q.questionText]) });
        assert.equal(r.body.totalQuestions, 1); assert.equal(r.body.score, 100);
    });

    test('an empty or unknown submission is refused', async () => {
        assert.equal((await api('POST', '/quizzes/global/submit', { answers: [] })).status, 400);
        assert.equal((await api('POST', '/quizzes/global/submit', {})).status, 400);
        const stranger = await api('POST', '/quizzes/global/submit', { answers: [{ questionId: new mongoose.Types.ObjectId().toString(), answer: 0 }] });
        assert.equal(stranger.status, 400); assert.match(stranger.body.message, /not in the quiz bank/);
        const rubbish = await api('POST', '/quizzes/global/submit', { answers: [{ questionId: 'not-an-id', answer: 0 }] });
        assert.equal(rubbish.status, 400);
    });

    test('it records nothing: no credits, no progress, no reward activity', async () => {
        const db = mongoose.connection.db;
        const before = {
            credits: (await db.collection('users').findOne({ _id: me.user._id })).credits || 0,
            progress: await db.collection('progresses').countDocuments({ userId: me.user._id }),
            activity: await db.collection('rewards_learning_activities').countDocuments({ userId: me.user._id }),
            xp: await db.collection('rewards_xp_transactions').countDocuments({ userId: me.user._id })
        };
        const rows = mine((await api('GET', '/quizzes/global?limit=25')).body.questions);
        await api('POST', '/quizzes/global/submit', { answers: answersFor(rows, (q) => RIGHT[q.questionText]) });
        assert.equal((await db.collection('users').findOne({ _id: me.user._id })).credits || 0, before.credits);
        assert.equal(await db.collection('progresses').countDocuments({ userId: me.user._id }), before.progress);
        assert.equal(await db.collection('rewards_learning_activities').countDocuments({ userId: me.user._id }), before.activity);
        assert.equal(await db.collection('rewards_xp_transactions').countDocuments({ userId: me.user._id }), before.xp);
    });
});
