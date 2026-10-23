/**
 * A course's Preview: GET /api/user/courses/:id/outline.
 *
 * What a student sees before enrolling: the sections, each lesson's title and
 * kind, and counts. Nothing that plays (no video, PDF, quiz or assignment
 * reference), a published course only, an organization's course to its own
 * students only, and whether the student can open it already (enrolled, or
 * through a bundle), for its "Open course".
 *
 * Builds its own courses, bundle and students, and removes them afterwards.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
const ORG = new mongoose.Types.ObjectId();
let app, plain, member, asPlain, asMember, asNobody;
const ids = { open: `TO${STAMP}`, draft: `TD${STAMP}`, org: `TG${STAMP}`, bundle: `TB${STAMP}` };

before(async () => {
    await connect();
    app = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    const Course = require('../../src/models/Course');
    const Module = require('../../src/models/Module');
    const Lesson = require('../../src/models/Lesson');

    await Course.create({ _id: ids.open, title: 'Outline Course', description: 'All about outlines.', instructor: 'Asha', price: 499, isPublished: true });
    await Course.create({ _id: ids.draft, title: 'Draft Course', isPublished: false });
    await Course.create({ _id: ids.org, title: 'Org Course', isPublished: true, organizationId: ORG });

    // Made out of order on purpose: the outline follows `order`, not insertion.
    const second = await Module.create({ courseId: ids.open, title: 'Practice', order: 2, dripDays: 3 });
    const first = await Module.create({ courseId: ids.open, title: 'Basics', description: 'Start here.', order: 1 });
    await Lesson.create([
        { moduleId: first._id, title: 'Watch this', type: 'video', videoSource: 'youtube', videoId: 'SECRET-VIDEO-ID', videoUrl: 'https://youtu.be/SECRET-VIDEO-ID', order: 1 },
        { moduleId: first._id, title: 'Read this', type: 'pdf', pdfUrl: 'https://cdn.example.com/SECRET.pdf', order: 2 },
        { moduleId: first._id, title: 'Quiz yourself', type: 'quiz', quizId: 'SECRET-QUIZ-ID', order: 3 },
        { moduleId: first._id, title: 'Hidden draft lesson', type: 'video', videoId: 'SECRET-DRAFT', order: 4, isPublished: false },
        { moduleId: second._id, title: 'Build something', type: 'assignment', assignmentId: 'SECRET-ASSIGNMENT', order: 1 },
        { moduleId: second._id, title: 'Wrap up', type: 'generic', order: 2 }
    ]);
    await Module.create({ courseId: ids.org, title: 'Org basics', order: 1 });

    plain = await makeUser('OutlinePlain');
    member = await makeUser('OutlineMember');
    await require('../../src/models/User').updateOne({ _id: member.user._id }, { $set: { organizationId: ORG } });
    asPlain = app.call(plain.token); asMember = app.call(member.token); asNobody = app.call(null);
});

after(async () => {
    const courseIds = [ids.open, ids.draft, ids.org];
    const Module = require('../../src/models/Module');
    const modules = await Module.find({ courseId: { $in: courseIds } }).select('_id').lean();
    await require('../../src/models/Lesson').deleteMany({ moduleId: { $in: modules.map((m) => m._id) } });
    await Module.deleteMany({ courseId: { $in: courseIds } });
    await require('../../src/models/Course').deleteMany({ _id: { $in: courseIds } });
    await require('../../src/models/Bundle').deleteMany({ _id: ids.bundle });
    await cleanup([plain.user, member.user], app.server);
});

describe('a course outline', () => {
    test('lists the sections in order, each lesson by title and kind, with counts', async () => {
        const r = await asPlain('GET', `/courses/${ids.open}/outline`);
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.deepEqual(r.body.course, { id: ids.open, title: 'Outline Course', description: 'All about outlines.', thumbnail: '', instructor: 'Asha', price: 499 });
        assert.deepEqual(r.body.modules, [
            { title: 'Basics', description: 'Start here.', dripDays: 0, lessons: [
                { title: 'Watch this', kind: 'video' }, { title: 'Read this', kind: 'reading' }, { title: 'Quiz yourself', kind: 'quiz' }
            ] },
            { title: 'Practice', description: '', dripDays: 3, lessons: [
                { title: 'Build something', kind: 'assignment' }, { title: 'Wrap up', kind: 'lesson' }
            ] }
        ]);
        assert.deepEqual(r.body.totals, { modules: 2, lessons: 5, video: 1, reading: 1, quiz: 1, assignment: 1 });
        assert.equal(r.body.canOpen, false);
    });

    test('gives away nothing that plays, and no unpublished lesson', async () => {
        const r = await asPlain('GET', `/courses/${ids.open}/outline`);
        const text = JSON.stringify(r.body);
        assert.doesNotMatch(text, /SECRET/);
        assert.doesNotMatch(text, /videoUrl|videoId|pdfUrl|quizId|assignmentId|_id/);
        assert.doesNotMatch(text, /Hidden draft lesson/);
    });

    test('a draft course, a missing one and another organization\'s course do not exist', async () => {
        assert.equal((await asPlain('GET', `/courses/${ids.draft}/outline`)).status, 404);
        assert.equal((await asPlain('GET', '/courses/does-not-exist/outline')).status, 404);
        assert.equal((await asPlain('GET', `/courses/${ids.org}/outline`)).status, 404);
        const own = await asMember('GET', `/courses/${ids.org}/outline`);
        assert.equal(own.status, 200);
        assert.equal(own.body.modules[0].title, 'Org basics');
    });

    test('says when the student can open the course already, enrolled in it or in a bundle', async () => {
        const Enrollment = require('../../src/models/Enrollment');
        await Enrollment.create({ userId: plain.user._id, courseId: ids.open, type: 'Course' });
        assert.equal((await asPlain('GET', `/courses/${ids.open}/outline`)).body.canOpen, true);

        // A bundle that is not published, so only its enrolment can open it.
        await require('../../src/models/Bundle').create({ _id: ids.bundle, title: 'Outline Bundle', courses: [ids.open], isPublished: false });
        assert.equal((await asMember('GET', `/courses/${ids.open}/outline`)).body.canOpen, false);
        await Enrollment.create({ userId: member.user._id, bundleId: ids.bundle, type: 'Bundle' });
        assert.equal((await asMember('GET', `/courses/${ids.open}/outline`)).body.canOpen, true);
    });

    test('needs a signed-in student', async () => {
        assert.equal((await asNobody('GET', `/courses/${ids.open}/outline`)).status, 401);
    });
});
