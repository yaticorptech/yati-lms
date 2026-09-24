/**
 * The administrator sets a student's progress in a course: by percentage,
 * which marks the first lessons in course order, or by ticking lessons, which
 * sets the percentage to match. The student's own view of the course agrees.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');

const TAG = `admin-progress-${Date.now()}`;
let app, boss, me, api, course, lessons;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/admin', router: require('../../src/routes/adminRoutes') });
    boss = await makeAdmin(); me = await makeUser('Progress');
    api = app.call(boss.token);

    const Course = require('../../src/models/Course');
    const Module = require('../../src/models/Module');
    const Lesson = require('../../src/models/Lesson');
    course = await Course.create({ title: `Progress course ${TAG}` });
    const m1 = await Module.create({ courseId: course._id, title: 'One', order: 0 });
    const m2 = await Module.create({ courseId: course._id, title: 'Two', order: 1 });
    lessons = [];
    lessons.push(await Lesson.create({ moduleId: m1._id, title: 'L1', order: 0 }));
    lessons.push(await Lesson.create({ moduleId: m1._id, title: 'L2', order: 1 }));
    lessons.push(await Lesson.create({ moduleId: m2._id, title: 'L3', order: 0 }));
    lessons.push(await Lesson.create({ moduleId: m2._id, title: 'L4', order: 1 }));
    await Lesson.create({ moduleId: m2._id, title: 'Draft', order: 2, isPublished: false });
    await require('../../src/models/Enrollment').create({ userId: me.user._id, courseId: course._id, type: 'Course', assignedBy: 'admin' });
});

after(async () => {
    const Module = require('../../src/models/Module');
    const ids = (await Module.find({ courseId: course._id }).select('_id')).map(m => m._id);
    await require('../../src/models/Lesson').deleteMany({ moduleId: { $in: ids } });
    await Module.deleteMany({ courseId: course._id });
    await require('../../src/models/Course').deleteOne({ _id: course._id });
    await cleanup([me.user], app.server, [boss.admin]);
});

describe('setting progress', () => {
    const url = () => `/users/${me.user._id}/progress/${course._id}`;

    test('needs an administrator', async () => {
        assert.equal((await app.call(null)('GET', url())).status, 401);
        assert.equal((await app.call(null)('PUT', url(), { percentage: 50 })).status, 401);
    });

    test('the detail lists published lessons by module, none done yet', async () => {
        const r = await api('GET', url());
        assert.equal(r.status, 200);
        assert.equal(r.body.percentage, 0);
        assert.equal(r.body.totalLessons, 4);
        assert.deepEqual(r.body.modules.map(m => m.lessons.length), [2, 2]);
        assert.ok(r.body.modules.every(m => m.lessons.every(l => l.completed === false)));
    });

    test('a bad body is refused', async () => {
        assert.equal((await api('PUT', url(), {})).status, 400);
        assert.equal((await api('PUT', url(), { percentage: 120 })).status, 400);
        assert.equal((await api('PUT', url(), { percentage: 'lots' })).status, 400);
        const r = await api('PUT', url(), { completedLessons: ['000000000000000000000000'] });
        assert.equal(r.status, 400);
    });

    test('a percentage marks the first lessons in course order', async () => {
        const r = await api('PUT', url(), { percentage: 50 });
        assert.equal(r.status, 200);
        assert.equal(r.body.progress.percentage, 50);
        assert.equal(r.body.progress.completedLessons, 2);

        const d = await api('GET', url());
        assert.deepEqual(d.body.modules.flatMap(m => m.lessons.map(l => l.completed)), [true, true, false, false]);
    });

    test('ticking lessons sets the percentage to match', async () => {
        const r = await api('PUT', url(), { completedLessons: [lessons[0]._id, lessons[3]._id, lessons[3]._id] });
        assert.equal(r.status, 200);
        assert.equal(r.body.progress.percentage, 50);
        assert.equal(r.body.progress.completedLessons, 2);

        const d = await api('GET', url());
        assert.deepEqual(d.body.modules.flatMap(m => m.lessons.map(l => l.completed)), [true, false, false, true]);
    });

    test('100% completes every lesson, 0% clears them', async () => {
        let r = await api('PUT', url(), { percentage: 100 });
        assert.equal(r.body.progress.completedLessons, 4);
        r = await api('PUT', url(), { percentage: 0 });
        assert.equal(r.body.progress.percentage, 0);
        assert.equal(r.body.progress.completedLessons, 0);
    });

    test('the user detail page reports the new figure', async () => {
        await api('PUT', url(), { percentage: 75 });
        const r = await api('GET', `/users/${me.user._id}`);
        assert.equal(r.status, 200);
        const row = r.body.progressSummary.find(p => p.courseId === course._id);
        assert.ok(row);
        assert.equal(row.percentage, 75);
        assert.equal(row.completedLessons, 3);
        assert.equal(row.via, 'Course');
    });

    test('unknown student or course is a 404', async () => {
        assert.equal((await api('PUT', `/users/000000000000000000000000/progress/${course._id}`, { percentage: 10 })).status, 404);
        assert.equal((await api('PUT', `/users/${me.user._id}/progress/no-such-course`, { percentage: 10 })).status, 404);
    });
});
