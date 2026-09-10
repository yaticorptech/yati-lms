/**
 * The Global Quiz as students meet it: a general-knowledge paper drawn from
 * the bank an administrator writes, never from the quizzes inside courses.
 * Builds its own bank and removes it.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

const TAG = `test-bank-${Date.now()}`;
let app, me, api, made = [], original;

const add = async (question, options, correctAnswerIndex, extra = {}) => {
    const row = await require('../../src/models/GlobalQuestion').create({ question, options, correctAnswerIndex, category: TAG, ...extra });
    made.push(row._id); return row;
};

before(async () => {
    await connect();
    app = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    me = await makeUser('Quiz'); api = app.call(me.token);
    const Setting = require('../../src/models/Setting');
    original = (await Setting.findOne().lean())?.globalQuiz;
    await Setting.updateOne({}, { $set: { globalQuiz: { enabled: true, defaultLength: 10 } } }, { upsert: true });
    // Everything the bank must survive: a plain question, one with an
    // explanation, one held back as a draft.
    await add('What is 2 + 2?', ['3', '4', '5'], 1, { explanation: 'Two and two make four.' });
    await add('Which is a colour?', ['Blue', 'Chair'], 0, { explanation: 'Blue is a colour.' });
    await add('Capital of France?', ['Rome', 'Paris'], 1);
    for (const n of [4, 5, 6]) await add(`Filler question ${n}`, ['a', 'b'], n % 2);
    await add('A draft nobody should see', ['a', 'b'], 0, { isPublished: false });
});

after(async () => {
    await require('../../src/models/GlobalQuestion').deleteMany({ _id: { $in: made } });
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
        assert.equal(rows.length, 6, 'the six published questions, and not the draft');
        for (const q of rows) {
            assert.ok(q.questionId && q.questionText && Array.isArray(q.options));
            assert.equal(q.correctAnswerIndex, undefined);
            assert.equal(q.explanation, undefined);
            // Nothing ties a question to a course any more.
            assert.equal(q.courseTitle, undefined); assert.equal(q.quizId, undefined);
        }
        assert.ok(r.body.categories.includes(TAG));
    });

    test('a draft is never asked', async () => {
        const r = await api('GET', '/quizzes/global?limit=25');
        assert.ok(!r.body.questions.some((q) => q.questionText.includes('draft nobody should see')));
    });

    test('the length is honoured, floored and capped', async () => {
        assert.equal((await api('GET', '/quizzes/global?limit=4')).body.questions.length, 4);
        assert.equal((await api('GET', '/quizzes/global?limit=1')).body.questions.length, 3, 'three is the floor');
        assert.ok((await api('GET', '/quizzes/global?limit=999')).body.questions.length <= 25, 'twenty-five is the cap');
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
