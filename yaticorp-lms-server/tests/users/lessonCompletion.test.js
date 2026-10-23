/**
 * Completing a lesson, the rules the server now holds as well as the page:
 *
 *   - a quiz lesson is completed by passing its quiz, not by asking. A failed
 *     first attempt earned credits, and the page took any credits as a pass:
 *     the lesson, the course and its certificate followed without a pass
 *     (found 2026-10-12 testing My Courses);
 *   - lessons are completed in the order the course runs: the next one is the
 *     first not yet done, as the player unlocks them. A request could finish
 *     them in any order, or all at once;
 *   - a lesson already done can be sent again (nothing changes);
 *   - two lessons with the same order number come back in one fixed order (by
 *     id), so the player and this check never disagree about which is next.
 *
 * Builds a course with three lessons (a reading, a video, a quiz) and a
 * student, and removes them afterwards.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
const COURSE = `LC${STAMP}`;
let app, student, as, lessons, quiz;

const Course = () => require('../../src/models/Course');
const Module = () => require('../../src/models/Module');
const Lesson = () => require('../../src/models/Lesson');
const Quiz = () => require('../../src/models/Quiz');
const Enrollment = () => require('../../src/models/Enrollment');
const Progress = () => require('../../src/models/Progress');

before(async () => {
    await connect();
    app = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    await Course().create({ _id: COURSE, title: 'Lesson completion', isPublished: true });
    const m = await Module().create({ courseId: COURSE, title: 'Only module', order: 1 });
    // The first two share an order number on purpose: their order is decided by id.
    const [a, b] = await Lesson().create([
        { moduleId: m._id, title: 'Reading', type: 'generic', order: 1 },
        { moduleId: m._id, title: 'Video', type: 'video', videoSource: 'generic', videoUrl: 'https://example.com/v.mp4', order: 1 }
    ]);
    const q = await Lesson().create({ moduleId: m._id, title: 'Quiz', type: 'quiz', order: 2 });
    quiz = await Quiz().create({ lessonId: q._id, passingScore: 80, questions: [
        { questionText: 'Two plus two?', options: ['4', '5'], correctAnswerIndex: 0 },
        { questionText: 'Capital of India?', options: ['Mumbai', 'New Delhi'], correctAnswerIndex: 1 }
    ] });
    lessons = { first: a._id < b._id ? a : b, second: a._id < b._id ? b : a, quiz: q };
    student = await makeUser('LessonCompletion');
    await Enrollment().create({ userId: student.user._id, type: 'Course', courseId: COURSE });
    as = app.call(student.token);
});

after(async () => {
    const mods = await Module().find({ courseId: COURSE }).select('_id').lean();
    const ls = await Lesson().find({ moduleId: { $in: mods.map((m) => m._id) } }).select('_id').lean();
    await Quiz().deleteMany({ lessonId: { $in: ls.map((l) => l._id) } });
    await Lesson().deleteMany({ _id: { $in: ls.map((l) => l._id) } });
    await Module().deleteMany({ courseId: COURSE });
    await Course().deleteOne({ _id: COURSE });
    await cleanup([student.user], app.server);
});

const complete = (lesson) => as('POST', '/progress/update', { courseId: COURSE, lessonId: String(lesson._id) });
const stored = async () => (await Progress().findOne({ userId: student.user._id, courseId: COURSE }).lean()) || { completedLessons: [], percentage: 0 };

describe('completing lessons', () => {
    test('two lessons with the same order number are listed by id, the same way every time', async () => {
        const r = await as('GET', `/courses/${COURSE}`);
        assert.equal(r.status, 200);
        const titles = r.body.modules[0].lessons.map((l) => String(l._id));
        assert.deepEqual(titles, [String(lessons.first._id), String(lessons.second._id), String(lessons.quiz._id)]);
    });

    test('a later lesson cannot be completed before the earlier ones', async () => {
        for (const later of [lessons.second, lessons.quiz]) {
            const r = await complete(later);
            assert.equal(r.status, 403, `${later.title}: ${JSON.stringify(r.body)}`);
            assert.equal(r.body.code, 'LESSON_LOCKED');
        }
        assert.equal((await stored()).percentage, 0);
    });

    test('in order, each one completes; one already done can be sent again', async () => {
        assert.equal((await complete(lessons.first)).status, 200);
        assert.equal((await complete(lessons.second)).status, 200);
        assert.equal((await complete(lessons.first)).status, 200, 'sent again');
        assert.equal((await stored()).percentage, 67);
    });

    test('a failed quiz does not complete its lesson, even when the attempt earned credits', async () => {
        const graded = await as('POST', `/lessons/${lessons.quiz._id}/quiz/submit`, { answers: [1, 1] });   // 1 of 2: 50%, the pass mark is 80
        assert.equal(graded.status, 200); assert.equal(graded.body.passed, false);
        const r = await complete(lessons.quiz);
        assert.equal(r.status, 403, JSON.stringify(r.body)); assert.equal(r.body.code, 'QUIZ_NOT_PASSED');
        const p = await stored();
        assert.equal(p.percentage, 67);
        assert.ok(!p.completedLessons.map(String).includes(String(lessons.quiz._id)));
    });

    test('passing the quiz lets it complete, and the course reaches 100%', async () => {
        const graded = await as('POST', `/lessons/${lessons.quiz._id}/quiz/submit`, { answers: [0, 1] });
        assert.equal(graded.body.passed, true);
        assert.equal((await complete(lessons.quiz)).status, 200);
        assert.equal((await stored()).percentage, 100);
    });
});
