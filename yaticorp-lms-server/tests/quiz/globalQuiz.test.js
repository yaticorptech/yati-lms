/**
 * The Global Quiz: one paper drawn from the quizzes inside the courses a
 * student can open. Builds its own course, module, lessons and quizzes, and
 * removes them again.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

const COURSE_ID = `test-quiz-${Date.now()}`;
const OTHER_ID = `test-quiz-locked-${Date.now()}`;
let app, me, stranger, api, strangerApi, made = { modules: [], lessons: [], quizzes: [] };

const buildCourse = async (courseId, title, questions) => {
    const Course = require('../../src/models/Course');
    const Module = require('../../src/models/Module');
    const Lesson = require('../../src/models/Lesson');
    const Quiz = require('../../src/models/Quiz');
    await Course.create({ _id: courseId, title, description: 'fixture', isPublished: true });
    const mod = await Module.create({ courseId, title: 'Module 1', order: 0 });
    const lesson = await Lesson.create({ moduleId: mod._id, title: 'Lesson 1', order: 0, isPublished: true });
    const quiz = await Quiz.create({ lessonId: lesson._id, passingScore: 80, questions });
    made.modules.push(mod._id); made.lessons.push(lesson._id); made.quizzes.push(quiz._id);
    return { mod, lesson, quiz };
};

before(async () => {
    await connect();
    app = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    me = await makeUser('Quiz'); stranger = await makeUser('Stranger');
    api = app.call(me.token); strangerApi = app.call(stranger.token);
    const mine = await buildCourse(COURSE_ID, 'Fixture Course', [
        { questionText: 'What is 2 + 2?', options: ['3', '4', '5'], correctAnswerIndex: 1, explanation: 'Two and two make four.' },
        { questionText: 'Which is a colour?', options: ['Blue', 'Chair'], correctAnswerIndex: 0, explanation: 'Blue is a colour.' },
        { questionText: 'Capital of France?', options: ['Rome', 'Paris'], correctAnswerIndex: 1, explanation: '' },
        // Enough of them that a requested length can be smaller than the pool.
        ...[3, 4, 5].map((n) => ({ questionText: `Filler question ${n}`, options: ['a', 'b'], correctAnswerIndex: n % 2, explanation: '' }))
    ]);
    await buildCourse(OTHER_ID, 'Course I am not in', [{ questionText: 'Secret?', options: ['a', 'b'], correctAnswerIndex: 1, explanation: '' }]);
    await require('../../src/models/Enrollment').create({ userId: me.user._id, courseId: COURSE_ID, type: 'Course', assignedBy: 'admin' });
    me.quiz = mine.quiz;
});

after(async () => {
    const db = mongoose.connection.db;
    await db.collection('quizzes').deleteMany({ _id: { $in: made.quizzes } });
    await db.collection('lessons').deleteMany({ _id: { $in: made.lessons } });
    await db.collection('modules').deleteMany({ _id: { $in: made.modules } });
    await db.collection('courses').deleteMany({ _id: { $in: [COURSE_ID, OTHER_ID] } });
    await cleanup([me.user, stranger.user], app.server);
});

describe('drawing the paper', () => {
    test('needs a signed-in student', async () => { assert.equal((await app.call(null)('GET', '/quizzes/global')).status, 401); });

    test('draws only from courses the student can open', async () => {
        const r = await api('GET', '/quizzes/global');
        assert.equal(r.status, 200);
        assert.equal(r.body.available, 6, 'every question in the enrolled course, and none from the locked one');
        assert.deepEqual(r.body.courses, ['Fixture Course']);
        assert.equal(r.body.questions.length, 6);
        for (const q of r.body.questions) {
            assert.ok(q.quizId && q.questionId && q.questionText && Array.isArray(q.options));
            assert.equal(q.courseTitle, 'Fixture Course');
            assert.equal(q.lessonTitle, 'Lesson 1');
            // The answer never leaves the server.
            assert.equal(q.correctAnswerIndex, undefined);
            assert.equal(q.explanation, undefined);
        }
    });

    test('a student with nothing to draw from gets an empty paper, not an error', async () => {
        const r = await strangerApi('GET', '/quizzes/global');
        assert.equal(r.status, 200); assert.equal(r.body.available, 0); assert.deepEqual(r.body.questions, []);
    });

    test('the length is honoured, floored and capped', async () => {
        assert.equal((await api('GET', '/quizzes/global?limit=4')).body.questions.length, 4);
        assert.equal((await api('GET', '/quizzes/global?limit=999')).body.questions.length, 6, 'never more than exist');
        assert.equal((await api('GET', '/quizzes/global?limit=1')).body.questions.length, 3, 'a one-question quiz is not a quiz: three is the floor');
        assert.equal((await api('GET', '/quizzes/global?limit=-4')).body.questions.length, 3, 'a silly limit falls back to the floor');
    });

    test('the questions are not always the same ones in the same order', async () => {
        const order = async () => (await api('GET', '/quizzes/global?limit=6')).body.questions.map((q) => q.questionText).join('|');
        const seen = new Set(); for (let i = 0; i < 8; i++) seen.add(await order());
        assert.ok(seen.size > 1, 'the paper is shuffled between draws');
    });
});

describe('marking it', () => {
    const answersFor = (questions, pick) => questions.map((q) => ({ quizId: q.quizId, questionId: q.questionId, answer: pick(q) }));
    const RIGHT = { 'What is 2 + 2?': 1, 'Which is a colour?': 0, 'Capital of France?': 1, 'Filler question 3': 1, 'Filler question 4': 0, 'Filler question 5': 1 };

    test('scores every answer and explains it', async () => {
        const { questions } = (await api('GET', '/quizzes/global')).body;
        const r = await api('POST', '/quizzes/global/submit', { answers: answersFor(questions, (q) => RIGHT[q.questionText]) });
        assert.equal(r.status, 200);
        assert.equal(r.body.score, 100); assert.equal(r.body.correctCount, 6); assert.equal(r.body.totalQuestions, 6);
        assert.equal(r.body.practiceOnly, true);
        assert.ok(r.body.results.every((x) => x.isCorrect));
        assert.match(r.body.results.find((x) => x.questionText === 'What is 2 + 2?').explanation, /make four/);
    });

    test('a wrong answer comes back with the right one', async () => {
        const { questions } = (await api('GET', '/quizzes/global')).body;
        const r = await api('POST', '/quizzes/global/submit', { answers: answersFor(questions, (q) => (RIGHT[q.questionText] + 1) % 2) });
        assert.ok(r.body.score < 100);
        const wrong = r.body.results.find((x) => !x.isCorrect);
        assert.equal(wrong.correctAnswer, RIGHT[wrong.questionText]);
        assert.notEqual(wrong.providedAnswer, wrong.correctAnswer);
    });

    test('a partly finished paper is marked out of what was answered', async () => {
        const { questions } = (await api('GET', '/quizzes/global')).body;
        const one = [{ quizId: questions[0].quizId, questionId: questions[0].questionId, answer: RIGHT[questions[0].questionText] }];
        const r = await api('POST', '/quizzes/global/submit', { answers: one });
        assert.equal(r.body.totalQuestions, 1); assert.equal(r.body.score, 100);
    });

    test('an empty submission is refused', async () => {
        assert.equal((await api('POST', '/quizzes/global/submit', { answers: [] })).status, 400);
        assert.equal((await api('POST', '/quizzes/global/submit', {})).status, 400);
    });

    test('questions from a course the student cannot open are refused', async () => {
        const { questions } = (await api('GET', '/quizzes/global')).body;
        const r = await strangerApi('POST', '/quizzes/global/submit', { answers: answersFor(questions, () => 0) });
        assert.equal(r.status, 400, 'a stranger cannot have someone else\'s questions marked');
        assert.match(r.body.message, /not from your courses/);
    });

    test('it records nothing: no credits, no progress, no reward activity', async () => {
        const db = mongoose.connection.db;
        const before = {
            credits: (await db.collection('users').findOne({ _id: me.user._id })).credits || 0,
            progress: await db.collection('progresses').countDocuments({ userId: me.user._id }),
            activity: await db.collection('rewards_learning_activities').countDocuments({ userId: me.user._id }),
            xp: await db.collection('rewards_xp_transactions').countDocuments({ userId: me.user._id })
        };
        const { questions } = (await api('GET', '/quizzes/global')).body;
        await api('POST', '/quizzes/global/submit', { answers: answersFor(questions, (q) => RIGHT[q.questionText]) });
        assert.equal((await db.collection('users').findOne({ _id: me.user._id })).credits || 0, before.credits, 'credits unchanged');
        assert.equal(await db.collection('progresses').countDocuments({ userId: me.user._id }), before.progress, 'no course progress written');
        assert.equal(await db.collection('rewards_learning_activities').countDocuments({ userId: me.user._id }), before.activity, 'no reward activity');
        assert.equal(await db.collection('rewards_xp_transactions').countDocuments({ userId: me.user._id }), before.xp, 'no XP');
    });
});
