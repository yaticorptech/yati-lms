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
let app, me, api, other, otherApi, original, live, draft, wasPublished = [];
const extraUsers = [];

const add = (quiz, question, options, correctAnswerIndex, extra = {}) =>
    require('../../src/models/GlobalQuestion').create({ question, options, correctAnswerIndex, category: TAG, quizId: quiz._id, ...extra });

before(async () => {
    await connect();
    app = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    me = await makeUser('Quiz'); api = app.call(me.token);
    other = await makeUser('Once'); otherApi = app.call(other.token);
    const Setting = require('../../src/models/Setting');
    original = (await Setting.findOne().lean())?.globalQuiz;
    await Setting.updateOne({}, { $set: { globalQuiz: { enabled: true, defaultLength: 10 } } }, { upsert: true });
    // Real questions from before quizzes existed are moved into a quiz first,
    // so the one published here is the only one — and the real one comes back.
    await require('../../src/services/globalQuizService').ensureMigrated();
    const GlobalQuiz = require('../../src/models/GlobalQuiz');
    wasPublished = (await GlobalQuiz.find({ status: 'published' }).select('_id publishedAt').lean());
    await GlobalQuiz.updateMany({ status: 'published' }, { $set: { status: 'draft' } });
    live = await GlobalQuiz.create({ title: `${TAG} live`, size: 6, timeLimitMinutes: 12, status: 'published', publishedAt: new Date() });
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
    await cleanup([me.user, other.user, ...extraUsers], app.server);
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
        assert.equal(r.body.quiz.timeLimitMinutes, 12, 'the time limit travels with the paper');
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

describe('the "a new Global Quiz is live" check', () => {
    const Setting = () => require('../../src/models/Setting');
    test('says which quiz is live, with no questions, and that this student has not taken it', async () => {
        const r = await api('GET', '/quizzes/global/live');
        assert.equal(r.status, 200);
        assert.equal(r.body.quiz.id, String(live._id));
        assert.equal(r.body.quiz.title, `${TAG} live`);
        assert.equal(r.body.quiz.attempted, false);
        assert.equal(r.body.quiz.closed, false);
        assert.ok(r.body.quiz.publishedAt);
        assert.doesNotMatch(JSON.stringify(r.body), /2 \+ 2|options|correctAnswerIndex/, 'not a word of the paper');
    });

    test('once the student has started it, it is theirs: attempted', async () => {
        const third = await makeUser('LiveCheck'); extraUsers.push(third.user);
        const call = app.call(third.token);
        assert.equal((await call('POST', '/quizzes/global/start', {})).status < 300, true);
        assert.equal((await call('GET', '/quizzes/global/live')).body.quiz.attempted, true);
    });

    test('nothing to announce with no quiz published, or with the Global Quiz switched off', async () => {
        const GlobalQuiz = require('../../src/models/GlobalQuiz');
        await GlobalQuiz.updateOne({ _id: live._id }, { $set: { status: 'draft' } });
        try { assert.equal((await api('GET', '/quizzes/global/live')).body.quiz, null); }
        finally { await GlobalQuiz.updateOne({ _id: live._id }, { $set: { status: 'published' } }); }
        await Setting().updateOne({}, { $set: { 'globalQuiz.enabled': false } });
        try { assert.equal((await api('GET', '/quizzes/global/live')).body.quiz, null); }
        finally { await Setting().updateOne({}, { $set: { 'globalQuiz.enabled': true } }); }
        assert.ok((await api('GET', '/quizzes/global/live')).body.quiz, 'back on, it is announced again');
    });

    test('needs a signed-in student', async () => {
        assert.equal((await app.call(null)('GET', '/quizzes/global/live')).status, 401);
    });
});

const RIGHT = { 'What is 2 + 2?': 1, 'Which is a colour?': 0, 'Capital of France?': 1, 'Filler question 4': 0, 'Filler question 5': 1, 'Filler question 6': 0 };
const answersFor = (rows, pick) => rows.map((q) => ({ questionId: q.questionId, answer: pick(q) }));

describe('marking without an attempt', () => {
    // Marking used to work with no attempt at all, for "an older app": it
    // marked any question in the bank and sent back every answer and
    // explanation, with no clock and no one-try rule.
    test('nothing is marked, and no answer or explanation comes back', async () => {
        const rows = mine((await api('GET', '/quizzes/global?limit=25')).body.questions);
        const r = await api('POST', '/quizzes/global/submit', { answers: answersFor(rows, (q) => RIGHT[q.questionText]) });
        assert.equal(r.status, 409); assert.equal(r.body.code, 'NO_ATTEMPT');
        assert.doesNotMatch(JSON.stringify(r.body), /make four|correctAnswer|explanation/);
    });

    test('an empty submission is refused', async () => {
        assert.equal((await api('POST', '/quizzes/global/submit', { answers: [] })).status, 400);
        assert.equal((await api('POST', '/quizzes/global/submit', {})).status, 400);
    });

    test('it records nothing: no credits, no progress, no reward activity', async () => {
        const db = mongoose.connection.db;
        const before = {
            credits: (await db.collection('users').findOne({ _id: me.user._id })).credits || 0,
            progress: await db.collection('progresses').countDocuments({ userId: me.user._id }),
            activity: await db.collection('rewards_learning_activities').countDocuments({ userId: me.user._id }),
            xp: await db.collection('rewards_xp_transactions').countDocuments({ userId: me.user._id }),
            attempts: await db.collection('global_quiz_attempts').countDocuments({ userId: me.user._id })
        };
        const rows = mine((await api('GET', '/quizzes/global?limit=25')).body.questions);
        await api('POST', '/quizzes/global/submit', { answers: answersFor(rows, (q) => RIGHT[q.questionText]) });
        assert.equal((await db.collection('users').findOne({ _id: me.user._id })).credits || 0, before.credits);
        assert.equal(await db.collection('progresses').countDocuments({ userId: me.user._id }), before.progress);
        assert.equal(await db.collection('rewards_learning_activities').countDocuments({ userId: me.user._id }), before.activity);
        assert.equal(await db.collection('rewards_xp_transactions').countDocuments({ userId: me.user._id }), before.xp);
        assert.equal(await db.collection('global_quiz_attempts').countDocuments({ userId: me.user._id }), before.attempts);
    });
});

/* These run last: once an attempt exists the paper's order is fixed, which the shuffle test above must not see. */
describe('one attempt', () => {
    let order;
    const idOf = (rows, text) => rows.find((q) => q.questionText === text).questionId;

    test('Start opens the attempt and fixes the paper; starting again resumes it', async () => {
        const before = await api('GET', '/quizzes/global');
        assert.equal(before.body.attempt, null, 'nothing until Start');
        const r = await api('POST', '/quizzes/global/start');
        assert.equal(r.status, 201, JSON.stringify(r.body));
        assert.equal(r.body.attempt.status, 'open');
        assert.ok(r.body.attempt.elapsedMs < 5000);
        assert.deepEqual(r.body.attempt.answers, {});
        order = mine(r.body.questions).map((q) => q.questionId);
        assert.equal(order.length, 6);
        for (let i = 0; i < 3; i++) {
            const again = await api('GET', '/quizzes/global');
            assert.equal(again.body.attempt.status, 'open');
            assert.deepEqual(mine(again.body.questions).map((q) => q.questionId), order, 'the same order every time now');
        }
        const resumed = await api('POST', '/quizzes/global/start');
        assert.equal(resumed.status, 200, 'the same attempt, not a new one');
        assert.equal(resumed.body.attempt.startedAt, r.body.attempt.startedAt);
    });

    test('answers are kept as they are marked, and the first answer to a question stands', async () => {
        const rows = mine((await api('GET', '/quizzes/global')).body.questions);
        const q = idOf(rows, 'What is 2 + 2?');
        const first = await api('POST', '/quizzes/global/submit', { answers: [{ questionId: q, answer: 1 }] });
        assert.equal(first.status, 200); assert.equal(first.body.results[0].isCorrect, true);
        assert.equal(first.body.attempt.answers[q].providedAnswer, 1);
        const second = await api('POST', '/quizzes/global/submit', { answers: [{ questionId: q, answer: 0 }] });
        assert.equal(second.status, 200);
        assert.equal(second.body.results[0].providedAnswer, 1, 'the answer on record is the one marked');
        assert.equal(second.body.results[0].isCorrect, true);
        const paper = await api('GET', '/quizzes/global');
        assert.deepEqual(Object.keys(paper.body.attempt.answers), [q]);
        assert.match(paper.body.attempt.answers[q].explanation, /make four/);
    });

    test('a question sent many times in one submission is kept once', async () => {
        // One request carrying the same question over and over used to store
        // every copy, and score each — a paper could pass 100%.
        const rows = mine((await api('GET', '/quizzes/global')).body.questions);
        const q = idOf(rows, 'Which is a colour?');
        const r = await api('POST', '/quizzes/global/submit', { answers: Array.from({ length: 20 }, () => ({ questionId: q, answer: 1 })) });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.results.length, 1);
        assert.equal(r.body.results[0].isCorrect, false);
        const stored = await require('../../src/models/GlobalQuizAttempt').findOne({ userId: me.user._id, quizId: live._id }).lean();
        assert.equal(stored.answers.filter((a) => String(a.questionId) === q).length, 1);
    });

    test('a question not on this paper is not marked', async () => {
        const Q = require('../../src/models/GlobalQuestion');
        const fromDraft = await Q.findOne({ quizId: draft._id }).select('_id').lean();
        const r = await api('POST', '/quizzes/global/submit', { answers: [{ questionId: String(fromDraft._id), answer: 0 }, { questionId: 'not-an-id', answer: 0 }] });
        assert.equal(r.status, 400); assert.match(r.body.message, /not in this quiz/);
        assert.doesNotMatch(JSON.stringify(r.body), /correctAnswer/);
    });

    test('the score closes the attempt, and the quiz cannot be taken again', async () => {
        const r = await api('POST', '/quizzes/global/finish', { timedOut: false });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.attempt.status, 'finished');
        assert.equal(r.body.attempt.correctCount, 1); assert.equal(r.body.attempt.totalQuestions, 6); assert.equal(r.body.attempt.score, 17);
        assert.equal(r.body.attempt.timedOut, false);
        const paper = await api('GET', '/quizzes/global');
        assert.equal(paper.body.attempt.status, 'finished');
        assert.equal(paper.body.attempt.score, 17);
        assert.deepEqual(mine(paper.body.questions).map((q) => q.questionId), order, 'the finished paper keeps its order');
        const again = await api('POST', '/quizzes/global/start');
        assert.equal(again.status, 409); assert.equal(again.body.code, 'ALREADY_ATTEMPTED');
        const late = await api('POST', '/quizzes/global/submit', { answers: [{ questionId: order[0], answer: 0 }] });
        assert.equal(late.status, 409); assert.equal(late.body.code, 'ALREADY_ATTEMPTED');
        const twice = await api('POST', '/quizzes/global/finish');
        assert.equal(twice.status, 200); assert.equal(twice.body.attempt.score, 17, 'closing again changes nothing');
    });

    test('an attempt whose time has run out is closed as timed out, with the score so far', async () => {
        const opened = await otherApi('POST', '/quizzes/global/start');
        assert.equal(opened.status, 201);
        const rows = mine(opened.body.questions);
        assert.equal((await otherApi('POST', '/quizzes/global/submit', { answers: [{ questionId: idOf(rows, 'Which is a colour?'), answer: 0 }] })).status, 200);
        // The quiz allows 12 minutes; the clock is wound back twenty.
        await require('../../src/models/GlobalQuizAttempt').updateOne({ userId: other.user._id, quizId: live._id }, { $set: { startedAt: new Date(Date.now() - 20 * 60_000) } });
        const late = await otherApi('POST', '/quizzes/global/submit', { answers: [{ questionId: idOf(rows, 'Capital of France?'), answer: 1 }] });
        assert.equal(late.status, 409); assert.equal(late.body.code, 'TIME_UP');
        const paper = await otherApi('GET', '/quizzes/global');
        assert.equal(paper.body.attempt.status, 'finished');
        assert.equal(paper.body.attempt.timedOut, true);
        assert.equal(paper.body.attempt.correctCount, 1, 'only the answer given in time counts');
        assert.equal(paper.body.attempt.totalQuestions, 6);
        // It finished when its twelve minutes ran out, not when it was found.
        assert.equal(paper.body.attempt.elapsedMs, 12 * 60_000);
        assert.equal((await otherApi('POST', '/quizzes/global/start')).status, 409);
    });

    test('a different published quiz is a fresh attempt', async () => {
        const GlobalQuiz = require('../../src/models/GlobalQuiz');
        await GlobalQuiz.updateOne({ _id: live._id }, { $set: { status: 'draft' } });
        await GlobalQuiz.updateOne({ _id: draft._id }, { $set: { status: 'published', publishedAt: new Date() } });
        try {
            const paper = await api('GET', '/quizzes/global');
            assert.equal(paper.body.quiz.title, `${TAG} draft`);
            assert.equal(paper.body.attempt, null, 'no attempt at this one yet');
            const r = await api('POST', '/quizzes/global/start');
            assert.equal(r.status, 201);
        } finally {
            await GlobalQuiz.updateOne({ _id: draft._id }, { $set: { status: 'draft', publishedAt: null } });
            await GlobalQuiz.updateOne({ _id: live._id }, { $set: { status: 'published' } });
        }
    });
});

/* After 'one attempt': by now this student has finished the live quiz (1 of 6)
   and opened, but not finished, the other one. */
describe('past quizzes', () => {
    test('needs a signed-in student', async () => {
        assert.equal((await app.call(null)('GET', '/quizzes/global/history')).status, 401);
    });

    test('lists finished attempts, newest first, with their scores', async () => {
        // One more, finished a week ago, at a quiz that has since been deleted.
        const gone = new mongoose.Types.ObjectId();
        await require('../../src/models/GlobalQuizAttempt').create({
            userId: me.user._id, quizId: gone, startedAt: new Date(Date.now() - 7 * 86400000 - 90_000),
            finishedAt: new Date(Date.now() - 7 * 86400000), correctCount: 4, totalQuestions: 5, score: 80
        });
        const r = await api('GET', '/quizzes/global/history');
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const rows = r.body.attempts;
        // The attempt left open at the other quiz, which is no longer the
        // published one, could never be finished: it is closed now, as it
        // stood, and listed — newest, since it closed just now.
        assert.equal(rows.length, 3);
        const [stranded, latest, older] = rows;
        assert.equal(stranded.title, `${TAG} draft`);
        assert.equal(stranded.correctCount, 0); assert.equal(stranded.totalQuestions, 1); assert.equal(stranded.current, false);
        assert.equal(latest.title, `${TAG} live`);
        assert.equal(latest.score, 17); assert.equal(latest.correctCount, 1); assert.equal(latest.totalQuestions, 6);
        assert.equal(latest.current, true, 'the published quiz is flagged: the tab already shows it');
        assert.equal(older.title, 'A past quiz', 'a deleted quiz keeps its row');
        assert.equal(older.score, 80); assert.equal(older.current, false);
        assert.equal(older.elapsedMs, 90_000);
        assert.ok(new Date(latest.finishedAt) > new Date(older.finishedAt));
    });

    test('an attempt stored with a repeated answer is scored again from its answers', async () => {
        const fixed = await makeUser('Repaired'); extraUsers.push(fixed.user);
        const Attempt = require('../../src/models/GlobalQuizAttempt');
        const q = new mongoose.Types.ObjectId();
        await Attempt.create({
            userId: fixed.user._id, quizId: new mongoose.Types.ObjectId(), order: [q, new mongoose.Types.ObjectId()],
            answers: [1, 2, 3].map(() => ({ questionId: q, answer: 0, isCorrect: true })),
            startedAt: new Date(Date.now() - 60_000), finishedAt: new Date(), correctCount: 3, totalQuestions: 2, score: 150
        });
        const r = await app.call(fixed.token)('GET', '/quizzes/global/history');
        assert.equal(r.body.attempts[0].correctCount, 1);
        assert.equal(r.body.attempts[0].score, 50);
        const stored = await Attempt.findOne({ userId: fixed.user._id }).lean();
        assert.equal(stored.answers.length, 1, 'the repeats are gone from the record');
        assert.equal(stored.score, 50);
    });

    test("never shows another student's attempts", async () => {
        const rows = (await otherApi('GET', '/quizzes/global/history')).body.attempts;
        assert.equal(rows.length, 1);
        assert.equal(rows[0].timedOut, true);
        assert.equal(rows[0].correctCount, 1);
    });
});

/* A win, and "Finish the Global Quiz", paid once each by the request that
   closes the attempt; the win kept on the attempt as it was decided then. */
describe('finishing and winning', () => {
    const config = () => require('../../src/rewards/services/configService');
    let saved;
    before(async () => {
        const cfg = await config().getConfig();
        const Setting = require('../../src/models/Setting');
        saved = { rewardsOn: (await Setting.findOne().select('isRewardsEnabled').lean())?.isRewardsEnabled, winScore: cfg.globalQuiz?.winScore, xp: { ...cfg.xpRules } };
        await Setting.updateOne({}, { $set: { isRewardsEnabled: true } });
        await config().updateConfig({ xpRules: { global_quiz_complete: 5, global_quiz_win: 7 }, globalQuiz: { winScore: 50 } });
        config().invalidate();
    });
    after(async () => {
        const keys = ['global_quiz_complete', 'global_quiz_win'];
        await require('../../src/models/Setting').updateOne({}, saved.rewardsOn === undefined ? { $unset: { isRewardsEnabled: 1 } } : { $set: { isRewardsEnabled: saved.rewardsOn } });
        await config().updateConfig({
            removeRules: { xp: keys.filter((k) => !(k in saved.xp)) },
            xpRules: Object.fromEntries(keys.filter((k) => k in saved.xp).map((k) => [k, saved.xp[k]])),
            ...(saved.winScore !== undefined ? { globalQuiz: { winScore: saved.winScore } } : {})
        });
        config().invalidate();
    });

    test('pays the win and the finish once, to the request that closed it, and says so', async () => {
        const winner = await makeUser('Winner'); extraUsers.push(winner.user);
        const call = app.call(winner.token);
        const opened = await call('POST', '/quizzes/global/start');
        assert.equal(opened.status, 201);
        const rows = mine(opened.body.questions);
        for (const q of rows) assert.equal((await call('POST', '/quizzes/global/submit', { answers: [{ questionId: q.questionId, answer: RIGHT[q.questionText] }] })).status, 200);
        const done = await call('POST', '/quizzes/global/finish', {});
        assert.equal(done.status, 200, JSON.stringify(done.body));
        assert.equal(done.body.attempt.score, 100);
        assert.equal(done.body.win.won, true); assert.equal(done.body.win.winScore, 50); assert.equal(done.body.win.xp, 7);
        assert.ok(done.body.rewards.events.some((e) => e.kind === 'xp'), 'the XP comes back for the app to show');

        const { LearningActivity } = require('../../src/rewards/models');
        const finishes = () => LearningActivity.countDocuments({ userId: winner.user._id, type: 'global_quiz_complete' });
        assert.equal(await finishes(), 1);
        assert.equal((await LearningActivity.findOne({ userId: winner.user._id, type: 'global_quiz_complete' }).lean()).refId, `global-complete:${live._id}`);
        // Finish again: the attempt was already closed, so nothing more is paid.
        const again = await call('POST', '/quizzes/global/finish', {});
        assert.equal(again.status, 200);
        assert.equal(again.body.win.xp, 0);
        assert.deepEqual(again.body.rewards.events, []);
        assert.equal(await finishes(), 1);
    });

    test('a later change to the win score does not rewrite a past win', async () => {
        await config().updateConfig({ globalQuiz: { winScore: 100 } }); config().invalidate();
        const loser = await makeUser('Loser'); extraUsers.push(loser.user);
        const call = app.call(loser.token);
        const rows = mine((await call('POST', '/quizzes/global/start')).body.questions);
        // Five of six right: 83%, short of the new win score of 100.
        for (const [i, q] of rows.entries()) await call('POST', '/quizzes/global/submit', { answers: [{ questionId: q.questionId, answer: i === 0 ? (RIGHT[q.questionText] + 1) % 2 : RIGHT[q.questionText] }] });
        const done = await call('POST', '/quizzes/global/finish', {});
        assert.equal(done.body.attempt.score, 83); assert.equal(done.body.win.won, false);
        await config().updateConfig({ globalQuiz: { winScore: 80 } }); config().invalidate();
        const history = (await call('GET', '/quizzes/global/history')).body.attempts;
        assert.equal(history[0].won, false, 'decided against the score in force when it closed');
        const winnerRow = await require('../../src/models/GlobalQuizAttempt').findOne({ quizId: live._id, score: 100 }).lean();
        assert.equal(winnerRow.won, true); assert.equal(winnerRow.winScore, 50);
    });
});
