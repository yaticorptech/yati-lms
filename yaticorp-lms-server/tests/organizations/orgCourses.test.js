/**
 * An organization's own courses: switched on and capped by a superadmin,
 * written by its administrator, and seen by its own students only.
 *
 * Builds two organizations, their administrators and students, and removes
 * every one of them — and every course they made — afterwards.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');

const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
let orgApp, userApp, adminApp;
let orgA, orgB, adminA, adminB, boss, plain, sA, sB, sNone;
let asA, asB, asBoss, asPlain, asStudentA, asStudentB, asStudentNone;
let courseA, moduleA, lessonA, courseB, moduleB;

const makeOrg = (label, logo = '') => require('../../src/organizations/models/Organization').create({
    orgCode: `T${label}-${STAMP}`, name: `Test ${label} College ${STAMP}`, organizationType: 'college',
    email: `org-${label.toLowerCase()}-${STAMP}@example.com`, status: 'active', logo
});
const makeOrgAdmin = async (org) => {
    const Admin = require('../../src/models/Admin');
    const admin = await Admin.create({ name: `${org.name} Admin`, email: `orgadmin-${org._id}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
    return { admin, token: jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }) };
};

before(async () => {
    await connect();
    orgApp = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    userApp = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    adminApp = startApp({ mount: '/api/admin', router: require('../../src/routes/adminRoutes') });
    // A starts without a logo, to show the logo step; B already has one.
    orgA = await makeOrg('A'); orgB = await makeOrg('B', 'https://cdn.example.com/b-logo.png');
    adminA = await makeOrgAdmin(orgA); adminB = await makeOrgAdmin(orgB);
    boss = await makeAdmin('Super'); await require('../../src/models/Admin').updateOne({ _id: boss.admin._id }, { $set: { role: 'superadmin' } });
    plain = await makeAdmin('Plain');
    sA = await makeUser('OrgA'); sB = await makeUser('OrgB'); sNone = await makeUser('NoOrg');
    const User = require('../../src/models/User');
    await User.updateOne({ _id: sA.user._id }, { $set: { organizationId: orgA._id } });
    await User.updateOne({ _id: sB.user._id }, { $set: { organizationId: orgB._id } });
    asA = orgApp.call(adminA.token); asB = orgApp.call(adminB.token);
    asBoss = orgApp.call(boss.token); asPlain = orgApp.call(plain.token);
    asStudentA = userApp.call(sA.token); asStudentB = userApp.call(sB.token); asStudentNone = userApp.call(sNone.token);
});

after(async () => {
    const Course = require('../../src/models/Course');
    const Module = require('../../src/models/Module');
    const Lesson = require('../../src/models/Lesson');
    const courses = await Course.find({ organizationId: { $in: [orgA._id, orgB._id] } }).select('_id').lean();
    const modules = await Module.find({ courseId: { $in: courses.map((c) => c._id) } }).select('_id').lean();
    await require('../../src/models/Quiz').deleteMany({ lessonId: { $in: (await Lesson.find({ moduleId: { $in: modules.map((m) => m._id) } }).select('_id').lean()).map((l) => l._id) } });
    await Lesson.deleteMany({ moduleId: { $in: modules.map((m) => m._id) } });
    await Module.deleteMany({ _id: { $in: modules.map((m) => m._id) } });
    await Course.deleteMany({ _id: { $in: courses.map((c) => c._id) } });
    await require('../../src/organizations/models/Organization').deleteMany({ _id: { $in: [orgA._id, orgB._id] } });
    await new Promise((r) => userApp.server.close(r));
    await new Promise((r) => adminApp.server.close(r));
    await cleanup([sA.user, sB.user, sNone.user], orgApp.server, [adminA.admin, adminB.admin, boss.admin, plain.admin]);
});

describe('switching courses on', () => {
    test('courses are off until a superadmin switches them on', async () => {
        const access = await asA('GET', '/me/course-access');
        assert.equal(access.status, 200);
        assert.equal(access.body.enabled, false);
        const r = await asA('GET', '/me/courses');
        assert.equal(r.status, 403); assert.equal(r.body.code, 'COURSES_DISABLED');
    });

    test('only a superadmin can switch them on and set the limit', async () => {
        assert.equal((await asPlain('PUT', `/admin/${orgA._id}/course-access`, { enabled: true, limit: 2 })).status, 403);
        assert.equal((await asA('PUT', `/admin/${orgA._id}/course-access`, { enabled: true, limit: 2 })).status, 403, 'not the organization itself');
        for (const bad of [0, 501, 2.5, 'ten']) {
            assert.equal((await asBoss('PUT', `/admin/${orgA._id}/course-access`, { limit: bad })).status, 400, `limit ${bad}`);
        }
        const r = await asBoss('PUT', `/admin/${orgA._id}/course-access`, { enabled: true, limit: 2 });
        assert.equal(r.status, 200); assert.deepEqual(r.body.courseAccess, { enabled: true, limit: 2 });
        assert.match(r.body.message, /up to 2 courses/);
        const detail = await asBoss('GET', `/admin/${orgA._id}`);
        assert.deepEqual(detail.body.organization.courseAccess, { enabled: true, limit: 2 });
        assert.equal(detail.body.courseCount, 0);
    });
});

describe('an organization building its courses', () => {
    test('its logo comes first: no course is made until it has one', async () => {
        assert.equal((await asA('GET', '/me/course-access')).body.hasLogo, false);
        const refused = await asA('POST', '/me/courses', { title: 'Too early' });
        assert.equal(refused.status, 403);
        assert.equal(refused.body.code, 'LOGO_REQUIRED');
        assert.match(refused.body.message, /logo/i);

        assert.equal((await asA('POST', '/me/logo')).status, 400, 'an upload with no image says so');

        // A logo cannot be typed in through PUT /me — only the upload sets it.
        assert.equal((await asA('PUT', '/me', { logo: 'https://cdn.example.com/a-logo.png' })).status, 200);
        assert.equal((await asA('GET', '/me/course-access')).body.hasLogo, false, 'PUT /me ignores logo');

        // The upload itself goes to the CDN; its result is the logo URL saved
        // on the organization, as here.
        await require('../../src/organizations/models/Organization').updateOne({ _id: orgA._id }, { $set: { logo: 'https://cdn.example.com/a-logo.png' } });
        assert.equal((await asA('GET', '/me/course-access')).body.hasLogo, true);
    });

    test('a course it makes is its own, taught by it', async () => {
        const r = await asA('POST', '/me/courses', { title: 'Campus Safety', description: 'For our students', isPublished: false });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        assert.equal(String(r.body.organizationId), String(orgA._id));
        assert.equal(r.body.instructor, orgA.name);
        courseA = r.body;
    });

    test('without a logo a draft can be saved, but not published', async () => {
        const Organization = require('../../src/organizations/models/Organization');
        await Organization.updateOne({ _id: orgA._id }, { $set: { logo: '' } });
        try {
            const publish = await asA('PUT', `/me/courses/${courseA._id}`, { isPublished: true });
            assert.equal(publish.status, 403); assert.equal(publish.body.code, 'LOGO_REQUIRED');
            assert.equal((await asA('PUT', `/me/courses/${courseA._id}`, { description: 'Still a draft' })).status, 200);
        } finally {
            await Organization.updateOne({ _id: orgA._id }, { $set: { logo: 'https://cdn.example.com/a-logo.png' } });
        }
    });

    test('the limit is enforced', async () => {
        assert.equal((await asA('POST', '/me/courses', { title: 'Second course' })).status, 201);
        const third = await asA('POST', '/me/courses', { title: 'Third course' });
        assert.equal(third.status, 409); assert.equal(third.body.code, 'COURSE_LIMIT');
        assert.match(third.body.message, /can have 2 courses, and has 2/);
        assert.equal((await asA('GET', '/me/course-access')).body.used, 2);
    });

    test('titles only clash within one organization', async () => {
        await asBoss('PUT', `/admin/${orgB._id}/course-access`, { enabled: true, limit: 3 });
        const r = await asB('POST', '/me/courses', { title: 'Campus Safety' });
        assert.equal(r.status, 201, 'another organization may use the same title');
        courseB = r.body;
        assert.equal((await asA('PUT', `/me/courses/${courseA._id}`, { title: 'second course' })).status, 400, 'but not the same organization');
    });

    test("an organization's course is free: no price or points can be set", async () => {
        const made = await asB('POST', '/me/courses', { title: 'Priced attempt', price: 4999, pricePoints: 300 });
        assert.equal(made.status, 201);
        assert.equal(made.body.price, 0); assert.equal(made.body.pricePoints, 0);
        const edited = await asB('PUT', `/me/courses/${made.body._id}`, { price: 999, pricePoints: 50, creditCost: 10 });
        assert.equal(edited.status, 200);
        assert.equal(edited.body.price, 0); assert.equal(edited.body.pricePoints, 0);
        assert.ok(!edited.body.creditCost, 'no credit cost either');
    });

    test('each sees only its own courses', async () => {
        const mine = (await asA('GET', '/me/courses')).body.map((c) => c._id);
        assert.ok(mine.includes(courseA._id)); assert.ok(!mine.includes(courseB._id));
    });

    test("another organization's course answers as if it did not exist", async () => {
        assert.equal((await asA('GET', `/me/courses/${courseB._id}`)).status, 404);
        assert.equal((await asA('PUT', `/me/courses/${courseB._id}`, { title: 'Taken over' })).status, 404);
        assert.equal((await asA('DELETE', `/me/courses/${courseB._id}`)).status, 404);
    });

    test('an edit cannot hand a course to someone else', async () => {
        const r = await asA('PUT', `/me/courses/${courseA._id}`, { title: 'Campus Safety', organizationId: String(orgB._id), isPublished: true });
        assert.equal(r.status, 200);
        assert.equal(String(r.body.organizationId), String(orgA._id));
        assert.equal(r.body.isPublished, true);
    });

    test('modules and lessons go only into its own courses', async () => {
        const m = await asA('POST', '/me/modules', { courseId: courseA._id, title: 'Week 1' });
        assert.equal(m.status, 201, JSON.stringify(m.body)); moduleA = m.body;
        assert.equal((await asA('POST', '/me/modules', { courseId: courseB._id, title: 'Sneaky' })).status, 404);
        moduleB = (await asB('POST', '/me/modules', { courseId: courseB._id, title: 'B week 1' })).body;

        const l = await asA('POST', '/me/lessons', { moduleId: moduleA._id, title: 'Fire exits', type: 'quiz' });
        assert.equal(l.status, 201, JSON.stringify(l.body)); lessonA = l.body;
        assert.equal((await asA('POST', '/me/lessons', { moduleId: moduleB._id, title: 'Sneaky' })).status, 404);
        assert.equal((await asA('PUT', `/me/lessons/${lessonA._id}`, { moduleId: moduleB._id })).status, 404, 'nor moved into another');
        assert.equal((await asA('PUT', `/me/modules/${moduleA._id}`, { courseId: courseB._id })).status, 404);
        assert.equal((await asB('PUT', `/me/lessons/${lessonA._id}`, { title: 'Hijack' })).status, 404, 'nor edited by another');
        assert.equal((await asA('PUT', '/me/lessons/reorder', { orderData: [{ id: lessonA._id, order: 1 }] })).status, 200);
        assert.equal((await asB('PUT', '/me/modules/reorder', { orderData: [{ id: moduleA._id, order: 3 }] })).status, 404);
        await asA('PUT', `/me/lessons/${lessonA._id}`, { isPublished: true });
    });

    test('a quiz is saved on its own lessons only', async () => {
        const quiz = { questions: [{ questionText: 'Where is the exit?', options: ['Left', 'Right'], correctAnswerIndex: 0 }] };
        assert.equal((await asA('POST', `/me/lessons/${lessonA._id}/quiz`, quiz)).status < 300, true);
        assert.equal((await asB('GET', `/me/lessons/${lessonA._id}/quiz`)).status, 404);
    });
});

describe('previewing a course', () => {
    test("an organization's admin previews its own course, and only its own", async () => {
        const previewAs = (token) => adminApp.call(token);
        const own = await previewAs(adminA.token)('GET', `/preview/${courseA._id}`);
        assert.equal(own.status, 200, JSON.stringify(own.body));
        assert.equal(own.body.course.title, 'Campus Safety');
        assert.ok(own.body.modules.length >= 1);
        assert.equal((await previewAs(adminA.token)('GET', `/preview/${courseB._id}`)).status, 404, "not another organization's");
        const platform = await require('../../src/models/Course').findOne({ organizationId: null }).select('_id').lean();
        if (platform) assert.equal((await previewAs(adminA.token)('GET', `/preview/${platform._id}`)).status, 404, 'nor a platform course');
        assert.equal((await previewAs(adminA.token)('GET', '/courses')).status, 403, 'and the rest of platform admin stays closed');
    });

    test('platform admins still preview any course', async () => {
        assert.equal((await adminApp.call(plain.token)('GET', `/preview/${courseA._id}`)).status, 200);
        assert.equal((await adminApp.call(null)('GET', `/preview/${courseA._id}`)).status, 401);
    });
});

describe('students', () => {
    test("the organization's own students see it and can take it", async () => {
        const available = (await asStudentA('GET', '/courses/available')).body.availableCourses.map((c) => c._id);
        assert.ok(available.includes(courseA._id));
        assert.equal((await asStudentA('GET', `/courses/${courseA._id}`)).status, 200);
        assert.equal((await asStudentA('POST', `/courses/${courseA._id}/enroll`)).status, 200);
        assert.ok((await asStudentA('GET', '/courses')).body.courses.some((c) => c._id === courseA._id));
        assert.equal((await asStudentA('GET', `/lessons/${lessonA._id}/quiz`)).status, 200);
        assert.equal((await asStudentA('POST', '/progress/update', { courseId: courseA._id, lessonId: lessonA._id })).status, 200);
    });

    test('students of another organization, or of none, never see it', async () => {
        for (const [who, api] of [['org B', asStudentB], ['no organization', asStudentNone]]) {
            const available = (await api('GET', '/courses/available')).body.availableCourses.map((c) => c._id);
            assert.ok(!available.includes(courseA._id), `${who}: not listed`);
            assert.equal((await api('GET', `/courses/${courseA._id}`)).status, 404, `${who}: cannot open it`);
            assert.equal((await api('POST', `/courses/${courseA._id}/enroll`)).status, 404, `${who}: cannot enroll`);
            assert.equal((await api('GET', `/lessons/${lessonA._id}/quiz`)).status, 404, `${who}: cannot see its quiz`);
            assert.equal((await api('POST', `/lessons/${lessonA._id}/quiz/submit`, { answers: [0] })).status, 404, `${who}: cannot submit it`);
            assert.equal((await api('POST', '/progress/update', { courseId: courseA._id, lessonId: lessonA._id })).status, 404, `${who}: cannot record progress`);
        }
    });

    test("the student's Organization tab lists its published courses, with their progress", async () => {
        const mine = (await asStudentA('GET', '/courses/organization')).body;
        assert.equal(mine.organization.name, orgA.name);
        const a = mine.courses.find((c) => c._id === courseA._id);
        assert.ok(a, 'its course is listed');
        assert.equal(a.enrolled, true);
        assert.ok(a.progress > 0, 'with the progress just recorded');
        assert.ok(mine.courses.every((c) => c.organizationId === String(orgA._id)), 'and nothing from anywhere else');

        const other = (await asStudentB('GET', '/courses/organization')).body;
        assert.ok(!other.courses.some((c) => c._id === courseA._id), "another organization's student never sees it");
        assert.deepEqual((await asStudentNone('GET', '/courses/organization')).body, { organization: null, courses: [] });
    });

    test('a platform admin cannot enroll an outsider into it', async () => {
        const asAdmin = adminApp.call(plain.token);
        const r = await asAdmin('POST', '/enrollments', { userId: String(sB.user._id), courseId: courseA._id, type: 'Course' });
        assert.equal(r.status, 400); assert.match(r.body.message, /organization this student is not in/);
    });

    test("the platform's own course list does not include organizations' courses", async () => {
        const list = (await adminApp.call(plain.token)('GET', '/courses')).body.map((c) => c._id);
        assert.ok(!list.includes(courseA._id) && !list.includes(courseB._id));
    });

    test('a student who leaves loses the course, but not the enrollment', async () => {
        const User = require('../../src/models/User');
        await User.updateOne({ _id: sA.user._id }, { $set: { organizationId: null } });
        const mine = (await asStudentA('GET', '/courses')).body.courses.map((c) => c._id);
        assert.ok(!mine.includes(courseA._id), 'hidden from My Courses');
        assert.equal((await asStudentA('GET', `/courses/${courseA._id}`)).status, 404);
        const Enrollment = require('../../src/models/Enrollment');
        assert.ok(await Enrollment.exists({ userId: sA.user._id, courseId: courseA._id }), 'the enrollment is kept, for if they rejoin');
        await User.updateOne({ _id: sA.user._id }, { $set: { organizationId: orgA._id } });
        assert.ok((await asStudentA('GET', '/courses')).body.courses.some((c) => c._id === courseA._id), 'and it comes back when they do');
    });
});

describe('how its students are doing', () => {
    test('each course shows how many of its students are taking it, and finished it', async () => {
        const row = (await asA('GET', '/me/courses')).body.find((c) => c._id === courseA._id);
        assert.equal(row.learners, 1, 'student A, and no outsider');
        assert.equal(row.completed, 1, 'who finished its one lesson');
    });

    test('certificate progress lists each student with the courses they completed', async () => {
        const r = await asA('GET', '/me/certificate-progress');
        assert.equal(r.status, 200);
        assert.ok(r.body.courses.some((c) => c.title === 'Campus Safety'));
        const a = r.body.students.find((s) => s.email === sA.user.email);
        assert.ok(a, 'the student is listed');
        const course = a.courses.find((c) => c.courseId === courseA._id);
        assert.equal(course.percentage, 100); assert.equal(course.completed, true);
        assert.deepEqual(a.earned.map((e) => e.title), ['Campus Safety'], 'the course name appears once it is completed');
        assert.ok(!r.body.students.some((s) => s.email === sB.user.email), "another organization's student never appears");
        assert.equal(r.body.totals.certificates, 1);
    });

    test("another organization sees only its own students' progress", async () => {
        const r = await asB('GET', '/me/certificate-progress');
        assert.ok(!r.body.students.some((s) => s.email === sA.user.email));
        assert.ok(!r.body.courses.some((c) => c._id === courseA._id));
    });
});

describe("a superadmin looking at an organization's own panel", () => {
    // The helper's `call` sends only the token, so the header is added here.
    const asViewer = (token, orgId) => (method, path, body) => fetch(`http://127.0.0.1:${orgApp.server.address().port}/api/organizations${path}`, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(orgId ? { 'X-View-Organization': String(orgId) } : {}) },
        body: body ? JSON.stringify(body) : undefined
    }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

    test('sees it exactly as the organization does, without its password', async () => {
        const view = asViewer(boss.token, orgA._id);
        const me = await view('GET', '/me');
        assert.equal(me.status, 200);
        assert.equal(me.body.organization.name, orgA.name);
        const courses = await view('GET', '/me/courses');
        assert.equal(courses.status, 200);
        assert.ok(courses.body.some((c) => c._id === courseA._id), 'its courses');
        assert.equal((await view('GET', '/me/certificate-progress')).status, 200);
        const b = await asViewer(boss.token, orgB._id)('GET', '/me/courses');
        assert.ok(!b.body.some((c) => c._id === courseA._id), 'and each organization only its own');
    });

    test('and can edit it, as the organization would', async () => {
        const view = asViewer(boss.token, orgA._id);
        const Organization = require('../../src/organizations/models/Organization');
        const saved = await view('PUT', '/me', { name: 'Edited by the platform' });
        assert.equal(saved.status, 200);
        assert.equal((await Organization.findById(orgA._id).lean()).name, 'Edited by the platform');
        // Put the name back for the tests that follow.
        assert.equal((await view('PUT', '/me', { name: orgA.name })).status, 200);
        const b = await asViewer(boss.token, orgB._id)('GET', '/me');
        assert.equal(b.body.organization.name, orgB.name, 'and only the organization named');
    });

    test('except the sign-in password, which is not theirs to change', async () => {
        const r = await asViewer(boss.token, orgA._id)('PUT', '/me/password', { currentPassword: 'x', newPassword: 'Another#Pass123', confirmPassword: 'Another#Pass123' });
        assert.equal(r.status, 403);
        assert.equal(r.body.code, 'NOT_YOUR_PASSWORD');
    });

    test('only a superadmin, only with an organization named, and only a real one', async () => {
        assert.equal((await asViewer(plain.token, orgA._id)('GET', '/me')).status, 403, 'a platform admin cannot');
        assert.equal((await asViewer(adminB.token, orgA._id)('GET', '/me')).body.organization.name, orgB.name, "an organization's own admin stays in its own, whatever the header says");
        assert.equal((await asViewer(boss.token)('GET', '/me')).status, 403, 'a superadmin without the header is not an organization');
        assert.equal((await asViewer(boss.token, 'nope')('GET', '/me')).status, 404);
        assert.equal((await asViewer(boss.token, new (require('mongoose').Types.ObjectId)())('GET', '/me')).status, 404);
    });
});

describe('switching courses off', () => {
    test('stops building, and keeps the courses for the students', async () => {
        assert.equal((await asBoss('PUT', `/admin/${orgA._id}/course-access`, { enabled: false })).status, 200);
        assert.equal((await asA('GET', '/me/courses')).status, 403);
        assert.equal((await asA('POST', '/me/lessons', { moduleId: moduleA._id, title: 'More' })).status, 403);
        assert.equal((await asStudentA('GET', `/courses/${courseA._id}`)).status, 200, 'students keep what was published');
    });
});
