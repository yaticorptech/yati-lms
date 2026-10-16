/**
 * The course rules the server now holds as well as the page (audit, 2026-10-14):
 *
 *   - a course already free in a published bundle is not offered for sale,
 *     and enrolling in it charges nothing (it is refused, with why);
 *   - a lesson's quiz opens only in order and once its module's drip date
 *     has passed, like marking the lesson done;
 *   - a quiz lesson with no quiz, or a quiz with no questions, does not hold
 *     the course up — and an administrator cannot save an empty quiz;
 *   - a failed quiz says which answers were wrong, not what the right ones
 *     are; a pass is decided on the exact share, not a rounded one; the first
 *     attempt's credits are paid once, however many submits arrive at once;
 *   - the stored percentage follows the course as it is now, a lesson done
 *     twice at once counts once, and finishing a course issues its
 *     certificate and pays its XP without a download.
 *
 * Builds its own courses, bundle and students, and removes them afterwards.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');
const { progressFigures } = require('../../src/services/courseCompletion');

const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
const ids = { flow: `PF${STAMP}`, bundled: `PB${STAMP}`, drip: `PD${STAMP}`, bundle: `PN${STAMP}` };
const PRICE = 120;
let userApp, adminApp, student, other, boss, as, asOther, asAdmin, rewardsWas;
const L = {};
const quizzes = {};

const M = (name) => require(`../../src/models/${name}`);

before(async () => {
    await connect();
    // Rewards on for this run, so the streak checks below mean something; put back after.
    rewardsWas = (await M('Setting').findOne().select('isRewardsEnabled').lean())?.isRewardsEnabled;
    await M('Setting').updateOne({}, { $set: { isRewardsEnabled: true } });
    require('../../src/rewards/services/configService').invalidate();
    userApp = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    adminApp = startApp({ mount: '/api/admin', router: require('../../src/routes/adminRoutes') });
    const Course = M('Course'); const Module = M('Module'); const Lesson = M('Lesson'); const Quiz = M('Quiz');

    // flow: a reading, a quiz lesson with no quiz at all, a quiz with no
    // questions, and a real quiz whose pass mark sits between two roundings.
    await Course.create({ _id: ids.flow, title: 'Progress rules', isPublished: true });
    const m = await Module.create({ courseId: ids.flow, title: 'Only module', order: 1 });
    L.reading = await Lesson.create({ moduleId: m._id, title: 'Reading', type: 'generic', order: 1 });
    L.noQuiz = await Lesson.create({ moduleId: m._id, title: 'Quiz never written', type: 'quiz', order: 2 });
    L.emptyQuiz = await Lesson.create({ moduleId: m._id, title: 'Quiz with no questions', type: 'quiz', order: 3 });
    L.quiz = await Lesson.create({ moduleId: m._id, title: 'Real quiz', type: 'quiz', order: 4 });
    quizzes.empty = await Quiz.create({ lessonId: L.emptyQuiz._id, passingScore: 80, questions: [] });
    // 2 of 3 is 66.67%, which rounds to 67: the pass mark of 67 is not reached.
    quizzes.real = await Quiz.create({ lessonId: L.quiz._id, passingScore: 67, questions: [
        { questionText: 'One?', options: ['1', '2'], correctAnswerIndex: 0, explanation: 'One is one.' },
        { questionText: 'Two?', options: ['1', '2'], correctAnswerIndex: 1, explanation: 'Two is two.' },
        { questionText: 'Three?', options: ['3', '4'], correctAnswerIndex: 0, explanation: 'Three is three.' }
    ] });

    // bundled: priced, but inside a published bundle.
    await Course.create({ _id: ids.bundled, title: 'Bundled and priced', price: PRICE, isPublished: true });
    const bm = await Module.create({ courseId: ids.bundled, title: 'Module', order: 1 });
    L.bundled = await Lesson.create({ moduleId: bm._id, title: 'Watch', type: 'generic', order: 1 });
    await M('Bundle').create({ _id: ids.bundle, title: 'Free bundle', courses: [ids.bundled], isPublished: true });

    // drip: a first module open now, a second that opens in a week.
    await Course.create({ _id: ids.drip, title: 'Dripped', isPublished: true });
    const d1 = await Module.create({ courseId: ids.drip, title: 'Week one', order: 1 });
    const d2 = await Module.create({ courseId: ids.drip, title: 'Week two', order: 2, dripDays: 7 });
    L.dripFirst = await Lesson.create({ moduleId: d1._id, title: 'Open now', type: 'generic', order: 1 });
    L.dripQuiz = await Lesson.create({ moduleId: d2._id, title: 'Next week', type: 'quiz', order: 1 });
    await Quiz.create({ lessonId: L.dripQuiz._id, questions: [{ questionText: 'Q?', options: ['a', 'b'], correctAnswerIndex: 0 }] });

    student = await makeUser('ProgressRules'); other = await makeUser('ProgressRulesOther');
    boss = await makeAdmin('ProgressRules');
    for (const u of [student, other]) {
        await M('Enrollment').create({ userId: u.user._id, type: 'Course', courseId: ids.flow });
        await M('Enrollment').create({ userId: u.user._id, type: 'Course', courseId: ids.drip });
    }
    as = userApp.call(student.token); asOther = userApp.call(other.token); asAdmin = adminApp.call(boss.token);
});

after(async () => {
    const courseIds = Object.values(ids);
    const modules = await M('Module').find({ courseId: { $in: courseIds } }).select('_id').lean();
    const lessonIds = (await M('Lesson').find({ moduleId: { $in: modules.map((m) => m._id) } }).select('_id').lean()).map((l) => l._id);
    await M('Quiz').deleteMany({ lessonId: { $in: lessonIds } });
    await M('Lesson').deleteMany({ _id: { $in: lessonIds } });
    await M('Module').deleteMany({ courseId: { $in: courseIds } });
    await M('Course').deleteMany({ _id: { $in: courseIds } });
    await M('Bundle').deleteMany({ _id: ids.bundle });
    await M('Setting').updateOne({}, rewardsWas === undefined ? { $unset: { isRewardsEnabled: 1 } } : { $set: { isRewardsEnabled: rewardsWas } });
    require('../../src/rewards/services/configService').invalidate();
    await new Promise((r) => adminApp.server.close(r));
    await cleanup([student.user, other.user], userApp.server, [boss.admin]);
});

const complete = (who, courseId, lesson) => who('POST', '/progress/update', { courseId, lessonId: String(lesson._id) });
const stored = async (user, courseId) => (await M('Progress').findOne({ userId: user._id, courseId }).lean()) || { completedLessons: [], percentage: 0 };

describe('progress figures', () => {
    test('complete only when every lesson is done; 199 of 200 shows 99', () => {
        const lessons = Array.from({ length: 200 }, (_, i) => `L${i}`);
        assert.deepEqual(progressFigures(lessons.slice(0, 199), lessons), { done: 199, total: 200, complete: false, percentage: 99 });
        assert.deepEqual(progressFigures(lessons, lessons), { done: 200, total: 200, complete: true, percentage: 100 });
        assert.deepEqual(progressFigures(['L1', 'L1', 'gone'], ['L1', 'L2', 'L3']), { done: 1, total: 3, complete: false, percentage: 33 });
        assert.equal(progressFigures([], []).complete, false, 'a course with no lessons is not complete');
    });
});

describe('a course free in a published bundle', () => {
    test('is not offered for sale', async () => {
        const r = await as('GET', '/courses/available');
        assert.equal(r.status, 200);
        assert.ok(!r.body.availableCourses.some((c) => c._id === ids.bundled));
    });

    test('enrolling in it is refused, with why, and charges nothing', async () => {
        const walletService = require('../../src/rewards/services/walletService');
        await walletService.grantStartingCredit(student.user._id);
        const { Wallet, WalletTransaction } = require('../../src/rewards/models');
        const before = (await Wallet.findOne({ userId: student.user._id }).lean())?.available;
        const r = await as('POST', `/courses/${ids.bundled}/enroll`);
        assert.equal(r.status, 409, JSON.stringify(r.body));
        assert.equal(r.body.code, 'IN_BUNDLE');
        assert.match(r.body.message, /Free bundle/);
        assert.equal((await Wallet.findOne({ userId: student.user._id }).lean())?.available, before);
        assert.equal(await WalletTransaction.countDocuments({ userId: student.user._id, 'meta.courseId': ids.bundled }), 0);
        assert.equal(await M('Enrollment').countDocuments({ userId: student.user._id, courseId: ids.bundled }), 0);
        // It opens all the same.
        assert.equal((await as('GET', `/courses/${ids.bundled}`)).status, 200);
    });
});

describe('the lesson gate on quizzes', () => {
    test('a quiz further on is locked until the lessons before it are done', async () => {
        const r = await as('GET', `/lessons/${L.quiz._id}/quiz`);
        assert.equal(r.status, 403); assert.equal(r.body.code, 'LESSON_LOCKED');
        const s = await as('POST', `/lessons/${L.quiz._id}/quiz/submit`, { answers: [0, 1, 0] });
        assert.equal(s.status, 403);
        assert.doesNotMatch(JSON.stringify(s.body), /One is one/);
    });

    test("a quiz in a module still drip-locked is closed, and so is marking it done", async () => {
        assert.equal((await complete(as, ids.drip, L.dripFirst)).status, 200);
        const r = await as('GET', `/lessons/${L.dripQuiz._id}/quiz`);
        assert.equal(r.status, 403); assert.equal(r.body.code, 'LESSON_DRIP_LOCKED');
        assert.ok(r.body.unlockAt);
        const done = await complete(as, ids.drip, L.dripQuiz);
        assert.equal(done.status, 403); assert.equal(done.body.code, 'LESSON_DRIP_LOCKED');
    });
});

describe('a quiz lesson with nothing to pass', () => {
    test('a lesson with no quiz says so, and can be marked done', async () => {
        assert.equal((await complete(as, ids.flow, L.reading)).status, 200);
        const r = await as('GET', `/lessons/${L.noQuiz._id}/quiz`);
        assert.equal(r.status, 404); assert.equal(r.body.code, 'NO_QUIZ');
        assert.equal((await complete(as, ids.flow, L.noQuiz)).status, 200);
    });

    test('a quiz with no questions is the same', async () => {
        const r = await as('GET', `/lessons/${L.emptyQuiz._id}/quiz`);
        assert.equal(r.status, 404); assert.equal(r.body.code, 'NO_QUIZ');
        assert.equal((await as('POST', `/lessons/${L.emptyQuiz._id}/quiz/submit`, { answers: [] })).body.code, 'NO_QUIZ');
        assert.equal((await complete(as, ids.flow, L.emptyQuiz)).status, 200);
    });

    test('an administrator cannot save a quiz with no questions', async () => {
        const r = await asAdmin('POST', `/lessons/${L.emptyQuiz._id}/quiz`, { passingScore: 80, questions: [] });
        assert.equal(r.status, 400); assert.equal(r.body.code, 'QUIZ_EMPTY');
        const fresh = await asAdmin('POST', `/lessons/${L.noQuiz._id}/quiz`, { passingScore: 80 });
        assert.equal(fresh.status, 400);
        assert.equal(await M('Quiz').countDocuments({ lessonId: L.noQuiz._id }), 0);
    });
});

describe('the real quiz', () => {
    test('a fail tells which answers were wrong, never the right ones; the pass is on the exact share', async () => {
        const r = await as('POST', `/lessons/${L.quiz._id}/quiz/submit`, { answers: [0, 1, 1] });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.score, 67, 'shown rounded');
        assert.equal(r.body.passed, false, '66.67% does not reach a pass mark of 67');
        assert.deepEqual(r.body.results.map((x) => x.isCorrect), [true, true, false]);
        for (const x of r.body.results) { assert.equal(x.correctAnswer, undefined); assert.equal(x.explanation, undefined); }
        assert.equal((await complete(as, ids.flow, L.quiz)).body.code, 'QUIZ_NOT_PASSED');
    });

    test('a pass comes with the full review', async () => {
        const r = await as('POST', `/lessons/${L.quiz._id}/quiz/submit`, { answers: [0, 1, 0] });
        assert.equal(r.body.passed, true);
        assert.equal(r.body.results[2].correctAnswer, 0);
        assert.match(r.body.results[2].explanation, /Three/);
    });

    test("the first attempt's credits are paid once, however many submits arrive together", async () => {
        const User = M('User');
        const before = (await User.findById(other.user._id).lean()).credits || 0;
        for (const l of [L.reading, L.noQuiz, L.emptyQuiz]) assert.equal((await complete(asOther, ids.flow, l)).status, 200);
        const replies = await Promise.all(Array.from({ length: 4 }, () => asOther('POST', `/lessons/${L.quiz._id}/quiz/submit`, { answers: [0, 1, 1] })));
        const paid = replies.filter((r) => r.body.creditsEarned > 0);
        const credits = (await User.findById(other.user._id).lean()).credits || 0;
        const isOn = (await M('Setting').findOne().lean())?.isCreditSystemEnabled !== false;
        if (isOn) {
            assert.equal(paid.length, 1, 'one of the four was paid');
            assert.equal(credits, before + 67);
            assert.equal(paid[0].body.totalCredits, credits, 'the balance comes back from the server');
        } else {
            assert.equal(paid.length, 0); assert.equal(credits, before);
        }
    });
});

describe('finishing the course', () => {
    test('a lesson completed twice at once counts once', async () => {
        const Progress = M('Progress');
        const [a, b] = await Promise.all([complete(as, ids.flow, L.quiz), complete(as, ids.flow, L.quiz)]);
        assert.equal(a.status, 200); assert.equal(b.status, 200);
        const p = await stored(student.user, ids.flow);
        assert.equal(p.completedLessons.filter((id) => String(id) === String(L.quiz._id)).length, 1);
        assert.equal(p.percentage, 100);
        const { LearningActivity } = require('../../src/rewards/models');
        assert.ok(await LearningActivity.countDocuments({ userId: student.user._id, type: 'lesson_complete', refId: String(L.quiz._id) }) <= 1);
        // A row stored with a repeat from before is put right when it is read.
        await Progress.updateOne({ userId: student.user._id, courseId: ids.flow }, { $push: { completedLessons: L.reading._id } });
        await as('GET', '/courses');
        const fixed = await stored(student.user, ids.flow);
        assert.equal(fixed.completedLessons.length, new Set(fixed.completedLessons.map(String)).size);
    });

    test('issues the certificate and pays its XP, with no download', async () => {
        const cert = await M('Certificate').findOne({ userId: student.user._id, courseId: ids.flow }).lean();
        assert.ok(cert, 'the certificate is in the profile already');
        assert.match(cert.certificateNumber, /^YATI.+-\d\d$/);
        const { LearningActivity } = require('../../src/rewards/models');
        // Recorded once, whether or not the admin pays XP for it.
        assert.equal(await LearningActivity.countDocuments({ userId: student.user._id, type: 'certificate_earned', refId: ids.flow }), 1);
        assert.equal(await LearningActivity.countDocuments({ userId: student.user._id, type: 'course_complete', refId: ids.flow }), 1);
    });

    test('a lesson added later takes the course back under 100%, and removing it finishes it again', async () => {
        const mod = await M('Module').findOne({ courseId: ids.flow }).lean();
        const extra = await M('Lesson').create({ moduleId: mod._id, title: 'Added later', type: 'generic', order: 9 });
        let r = await as('GET', `/courses/${ids.flow}`);
        assert.equal(r.status, 200);
        assert.equal(r.body.progress.percentage, 80);
        assert.equal((await stored(student.user, ids.flow)).percentage, 80, 'saved back');
        assert.equal((await as('GET', '/courses')).body.courses.find((c) => c._id === ids.flow).progress, 80);
        await M('Lesson').updateOne({ _id: extra._id }, { $set: { isPublished: false } });
        r = await as('GET', `/courses/${ids.flow}`);
        assert.equal(r.body.progress.percentage, 100);
        assert.equal(await M('Certificate').countDocuments({ userId: student.user._id, courseId: ids.flow }), 1, 'still the one certificate');
    });

    test('a course finished before certificates were issued on completion gets one when it is read — without counting today toward the streak', async () => {
        // The other student finished the same course, but their certificate
        // was never made (it used to wait for a download).
        assert.equal((await complete(asOther, ids.flow, L.quiz)).status, 403, 'not passed yet');
        await M('Progress').updateOne({ userId: other.user._id, courseId: ids.flow }, { $addToSet: { completedLessons: L.quiz._id }, $set: { percentage: 100 } });
        await M('Certificate').deleteMany({ userId: other.user._id });
        // They finished it in January, and their streak has not moved since.
        const { LearningActivity, Streak } = require('../../src/rewards/models');
        await LearningActivity.updateMany({ userId: other.user._id, type: 'lesson_complete', courseId: ids.flow }, { $set: { day: '2026-01-02' } });
        const january = { current: 3, longest: 5, lastActivityDay: '2026-01-02', runStartDay: '2025-12-31', activeDays: ['2025-12-31', '2026-01-01', '2026-01-02'] };
        await Streak.updateOne({ userId: other.user._id }, { $set: january }, { upsert: true });
        const streakOf = async () => {
            const s = await Streak.findOne({ userId: other.user._id }).lean();
            return { current: s.current, longest: s.longest, lastActivityDay: s.lastActivityDay, runStartDay: s.runStartDay, activeDays: s.activeDays, claimedMilestones: s.claimedMilestones };
        };
        const before = await streakOf();

        const r = await asOther('GET', '/courses');
        assert.equal(r.status, 200);
        assert.equal(await M('Certificate').countDocuments({ userId: other.user._id, courseId: ids.flow }), 1);
        // Opening the course and downloading are reads too: neither moves it.
        assert.equal((await asOther('GET', `/courses/${ids.flow}`)).status, 200);
        assert.deepEqual(await streakOf(), before, 'the streak is exactly as it was');
        // What was missed is recorded once, on the day the course was really finished.
        for (const type of ['course_complete', 'certificate_earned']) {
            const rows = await LearningActivity.find({ userId: other.user._id, type, refId: ids.flow }).lean();
            assert.equal(rows.length, 1, type);
            assert.equal(rows[0].day, '2026-01-02', `${type} is dated the day it was finished`);
        }
    });

    test('a real completion still counts toward the streak', async () => {
        const { Streak } = require('../../src/rewards/models');
        const s = await Streak.findOne({ userId: student.user._id }).lean();
        assert.ok(s, 'the student who finished it has a streak');
        assert.equal(s.lastActivityDay, require('../../src/rewards/config/constants').dayKey());
    });
});
