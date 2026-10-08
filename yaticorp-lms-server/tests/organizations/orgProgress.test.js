/**
 * The numbers an organization sees for its students.
 *
 * Pinned down here: a student who moved from organization A to B does not
 * bring A's private courses into B's counts, averages or student page; a
 * duplicated Progress row cannot push a student past 100% or past the number
 * of courses they are enrolled in; and two first visits to a course at the same
 * moment leave one progress row, not two.
 *
 * Builds two organizations, three courses, a student and the admins, and
 * removes all of them afterwards.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');

const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;

const Organization = () => require('../../src/organizations/models/Organization');
const Course = () => require('../../src/models/Course');
const Enrollment = () => require('../../src/models/Enrollment');
const Progress = () => require('../../src/models/Progress');
const Certificate = () => require('../../src/models/Certificate');

let orgApp, userApp, orgA, orgB, adminB, boss, mover, asB, asBoss;
let courseA, courseB, platform, extraCourse;

const makeOrg = (label) => Organization().create({
    orgCode: `P${label}-${STAMP}`, name: `Progress ${label} College ${STAMP}`, organizationType: 'college',
    email: `prog-org-${label.toLowerCase()}-${STAMP}@example.com`, status: 'active'
});

before(async () => {
    await connect();
    await Progress().init(); // the unique { userId, courseId } index is built before anything races it
    orgApp = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    userApp = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });

    orgA = await makeOrg('A'); orgB = await makeOrg('B');
    const Admin = require('../../src/models/Admin');
    const admin = await Admin.create({ name: 'B Admin', email: `prog-orgadmin-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: orgB._id });
    adminB = { admin, token: jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }) };
    boss = await makeAdmin('ProgBoss');
    await Admin.updateOne({ _id: boss.admin._id }, { $set: { role: 'superadmin' } });
    asB = orgApp.call(adminB.token); asBoss = orgApp.call(boss.token);

    courseA = await Course().create({ title: `A private ${STAMP}`, organizationId: orgA._id, isPublished: true });
    courseB = await Course().create({ title: `B own ${STAMP}`, organizationId: orgB._id, isPublished: true });
    platform = await Course().create({ title: `Platform ${STAMP}`, isPublished: true });
    extraCourse = await Course().create({ title: `Race ${STAMP}`, isPublished: true });

    // Studied at A (finished A's private course and got its certificate), then moved to B.
    mover = await makeUser('Mover');
    await require('../../src/models/User').updateOne({ _id: mover.user._id }, { $set: { organizationId: orgB._id } });
    for (const c of [courseA, courseB, platform]) {
        await Enrollment().create({ userId: mover.user._id, courseId: c._id, type: 'Course', assignedBy: 'admin' });
    }
    await Progress().create({ userId: mover.user._id, courseId: courseA._id, percentage: 100 });
    await Progress().create({ userId: mover.user._id, courseId: courseB._id, percentage: 100 });
    await Progress().create({ userId: mover.user._id, courseId: platform._id, percentage: 50 });
    await Certificate().create({ userId: mover.user._id, courseId: courseA._id, pdfUrl: 'https://cdn.example.com/a.pdf' });
    await Certificate().create({ userId: mover.user._id, courseId: courseB._id, pdfUrl: 'https://cdn.example.com/b.pdf' });
});

after(async () => {
    const ids = [courseA, courseB, platform, extraCourse].filter(Boolean).map((c) => c._id);
    await Course().deleteMany({ _id: { $in: ids } });
    await Organization().deleteMany({ _id: { $in: [orgA?._id, orgB?._id].filter(Boolean) } });
    await new Promise((r) => userApp.server.close(r));
    await cleanup([mover.user], orgApp.server, [adminB.admin, boss.admin]);
});

describe('a student who moved organizations', () => {
    test("B's student list leaves out A's private course", async () => {
        const r = await asB('GET', '/me/students');
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const row = r.body.students.find((s) => String(s._id) === String(mover.user._id));
        assert.ok(row);
        assert.equal(row.coursesEnrolled, 2, 'platform + B, not A');
        assert.equal(row.coursesCompleted, 1, 'B only');
        assert.equal(row.progressPercent, 75, 'mean of 100 (B) and 50 (platform)');
        assert.equal(row.certificates, 1, "A's certificate is not B's to count");
    });

    test("B's student page does not show A's course or certificate", async () => {
        const r = await asB('GET', `/me/students/${mover.user._id}`);
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const titles = r.body.courses.map((c) => c.title);
        assert.ok(!titles.includes(courseA.title), JSON.stringify(titles));
        assert.ok(titles.includes(courseB.title) && titles.includes(platform.title));
        assert.equal(r.body.overview.coursesEnrolled, 2);
        assert.equal(r.body.overview.overallPercent, 75);
        assert.deepEqual(r.body.certificates.map((c) => String(c.courseId)), [String(courseB._id)]);
    });

    test("the superadmin's view of B is scoped the same way", async () => {
        const r = await asBoss('GET', `/admin/${orgB._id}/students`);
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const row = r.body.students.find((s) => String(s._id) === String(mover.user._id));
        assert.equal(row.coursesEnrolled, 2);
        assert.equal(row.progressPercent, 75);
    });

    test("the superadmin's any-student record still holds everything, and nothing was deleted", async () => {
        const r = await asBoss('GET', `/admin/students/${mover.user._id}`);
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.overview.coursesEnrolled, 3);
        assert.ok(await Progress().exists({ userId: mover.user._id, courseId: courseA._id }));
        assert.ok(await Certificate().exists({ userId: mover.user._id, courseId: courseA._id }));
    });
});

describe('duplicated progress rows', () => {
    // The unique index keeps duplicates out of this database, so rows written
    // before it existed are fed in by replacing the read.
    const withRows = async (rows, fn) => {
        const model = Progress();
        const realFind = model.find;
        model.find = () => ({ select: () => ({ lean: async () => rows }), lean: async () => rows });
        try { return await fn(); } finally { model.find = realFind; }
    };

    test('count once, never past 100% or past the courses enrolled', async () => {
        const { summariseStudents } = require('../../src/organizations/services/studentProgress');
        const u = mover.user._id;
        const rows = [
            { userId: u, courseId: String(courseB._id), percentage: 100, completedLessons: [] },
            { userId: u, courseId: String(courseB._id), percentage: 100, completedLessons: [] },
            { userId: u, courseId: String(courseB._id), percentage: 140, completedLessons: [] },
            { userId: u, courseId: String(platform._id), percentage: 100, completedLessons: [] },
            { userId: u, courseId: String(platform._id), percentage: -20, completedLessons: [] }
        ];
        const summary = await withRows(rows, () => summariseStudents([u], orgB._id));
        const row = summary.get(String(u));
        assert.equal(row.coursesEnrolled, 2);
        assert.equal(row.coursesCompleted, 2);
        assert.ok(row.coursesCompleted <= row.coursesEnrolled);
        assert.equal(row.progressPercent, 100);
    });

    test('the further-along row wins', () => {
        const { bestProgressByKey } = require('../../src/organizations/services/studentProgress');
        const best = bestProgressByKey([
            { userId: 'u', courseId: 'c', percentage: 40, completedLessons: [1, 2] },
            { userId: 'u', courseId: 'c', percentage: 80, completedLessons: [1] },
            { userId: 'u', courseId: 'c', percentage: 80, completedLessons: [1, 2, 3] }
        ]);
        assert.equal(best.size, 1);
        assert.equal(best.get('u|c').completedLessons.length, 3);
    });
});

describe('creating progress', () => {
    test('ten simultaneous first visits leave one row', async () => {
        const docs = await Promise.all(Array.from({ length: 10 }, () => Progress().findOrCreate(mover.user._id, extraCourse._id)));
        assert.equal(new Set(docs.map((d) => String(d._id))).size, 1);
        assert.equal(await Progress().countDocuments({ userId: mover.user._id, courseId: extraCourse._id }), 1);
    });

    test('opening a course in several tabs at once makes one row', async () => {
        const fresh = await Course().create({ title: `Tabs ${STAMP}`, isPublished: true });
        try {
            const as = userApp.call(mover.token);
            const replies = await Promise.all(Array.from({ length: 6 }, () => as('GET', `/courses/${fresh._id}`)));
            for (const r of replies) assert.equal(r.status, 200, JSON.stringify(r.body));
            assert.equal(await Progress().countDocuments({ userId: mover.user._id, courseId: fresh._id }), 1);
        } finally {
            await Course().deleteOne({ _id: fresh._id });
        }
    });

    test('a lesson completed twice at once still makes one row', async () => {
        const fresh = await Course().create({ title: `Lesson race ${STAMP}`, isPublished: true });
        const Module = require('../../src/models/Module');
        const Lesson = require('../../src/models/Lesson');
        const m = await Module.create({ courseId: fresh._id, title: 'M', order: 0 });
        const l = await Lesson.create({ moduleId: m._id, title: 'L', order: 0 });
        try {
            const as = userApp.call(mover.token);
            const replies = await Promise.all(Array.from({ length: 4 }, () => as('POST', '/progress/update', { courseId: fresh._id, lessonId: l._id })));
            for (const r of replies) assert.equal(r.status, 200, JSON.stringify(r.body));
            const rows = await Progress().find({ userId: mover.user._id, courseId: fresh._id }).lean();
            assert.equal(rows.length, 1);
            assert.equal(rows[0].percentage, 100);
        } finally {
            await Lesson.deleteMany({ moduleId: m._id });
            await Module.deleteMany({ _id: m._id });
            await Course().deleteOne({ _id: fresh._id });
        }
    });
});
