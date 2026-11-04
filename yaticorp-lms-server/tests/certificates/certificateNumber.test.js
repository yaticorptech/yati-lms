/**
 * Certificate numbers: YATI<card number>-<three digits> (2026-10-31) —
 * YATI240100019664-001 — one series for every certificate on the student's
 * profile (course, competition and uploaded), oldest first: a second course
 * gets -002 (or later, if something else was numbered in between), a
 * re-download keeps its number, a number is never given twice, and numbers
 * made in older formats are put right.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

let app, userApp, me, other, api, courses;
const num = (n) => `YATI${me.user.cardNumber}-${String(n).padStart(3, '0')}`;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/certificates', router: require('../../src/routes/certificateRoutes') });
    userApp = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    me = await makeUser('Cert'); api = app.call(me.token);
    other = await makeUser('CertOther');
    const Course = require('../../src/models/Course');
    const Module = require('../../src/models/Module');
    const Lesson = require('../../src/models/Lesson');
    const Progress = require('../../src/models/Progress');
    courses = [await Course.create({ title: 'Cert course A' }), await Course.create({ title: 'Cert course B' }), await Course.create({ title: 'Cert course C' })];
    // Completion is counted from the lessons, not a stored percentage: A and
    // B have their one lesson done, C one of its two.
    const lessonsOf = async (course, n) => {
        const m = await Module.create({ courseId: course._id, title: 'Module', order: 1 });
        const out = [];
        for (let i = 0; i < n; i++) out.push(await Lesson.create({ moduleId: m._id, title: `Lesson ${i + 1}`, order: i }));
        return out;
    };
    for (const c of courses.slice(0, 2)) {
        const [only] = await lessonsOf(c, 1);
        await Progress.create({ userId: me.user._id, courseId: c._id, percentage: 100, completedLessons: [only._id] });
    }
    const [first] = await lessonsOf(courses[2], 2);
    await Progress.create({ userId: me.user._id, courseId: courses[2]._id, percentage: 50, completedLessons: [first._id] });
});

after(async () => {
    const Module = require('../../src/models/Module');
    const moduleIds = (await Module.find({ courseId: { $in: courses.map(c => c._id) } }).select('_id').lean()).map((m) => m._id);
    await require('../../src/models/Lesson').deleteMany({ moduleId: { $in: moduleIds } });
    await Module.deleteMany({ _id: { $in: moduleIds } });
    await require('../../src/models/Course').deleteMany({ _id: { $in: courses.map(c => c._id) } });
    await new Promise((r) => userApp.server.close(r));
    await cleanup([me.user, other.user], app.server);
});

const issued = () => require('../../src/models/Certificate').find({ userId: me.user._id }).sort({ createdAt: 1 }).lean();

test('the first certificate is -001 and the second -002', async () => {
    let r = await api('POST', '/generate', { courseId: courses[0]._id });
    assert.equal(r.status, 200);
    r = await api('POST', '/generate', { courseId: courses[1]._id });
    assert.equal(r.status, 200);
    const certs = await issued();
    assert.deepEqual(certs.map(c => c.certificateNumber), [num(1), num(2)]);
});

test('downloading again keeps the original number', async () => {
    const before = await issued();
    assert.equal((await api('POST', '/generate', { courseId: courses[0]._id })).status, 200);
    const now = await issued();
    assert.equal(now.length, 2);
    assert.deepEqual(now.map(c => c.certificateNumber), before.map(c => c.certificateNumber));
});

test('an unfinished course gets no certificate and uses no number', async () => {
    const r = await api('POST', '/generate', { courseId: courses[2]._id });
    assert.equal(r.status, 400);
    assert.equal((await issued()).length, 2);
});

test('the listing shows the numbers', async () => {
    const r = await api('GET', '/');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.map(c => c.certificateNumber).sort(), [num(1), num(2)]);
});

test('Delete takes a certificate off the profile, and it keeps its number', async () => {
    const [first] = await issued();
    const r = await api('DELETE', `/${first._id}`);
    assert.equal(r.status, 200);
    const listed = (await api('GET', '/')).body.map(c => c.certificateNumber);
    assert.deepEqual(listed, [num(2)], 'the deleted one is no longer listed');
    // Hidden, not destroyed: the school and the resume still see the course done.
    assert.equal((await issued()).length, 2, 'the record itself is kept');
});

test('downloading it again from the course puts it back, with the same number', async () => {
    assert.equal((await api('POST', '/generate', { courseId: courses[0]._id })).status, 200);
    const listed = (await api('GET', '/')).body.map(c => c.certificateNumber).sort();
    assert.deepEqual(listed, [num(1), num(2)]);
});

test('another student cannot delete it', async () => {
    const [first] = await issued();
    const r = await app.call(other.token)('DELETE', `/${first._id}`);
    assert.equal(r.status, 404);
    assert.equal((await api('GET', '/')).body.length, 2, 'still on the owner\'s profile');
    assert.equal((await app.call(other.token)('DELETE', '/not-an-id')).status, 404);
});

test('every certificate on the profile gets the next number, once, oldest first', async () => {
    const certs = await issued();
    const ask = (items) => userApp.call(me.token)('POST', '/certificate-numbers', { items });
    const items = [
        { key: `course-${certs[0]._id}`, added: '2026-01-01' },
        { key: 'up-upload-late', added: '2026-10-02' },
        { key: 'competition-chess-1', added: '2026-10-01' },
        { key: 'not a key', added: '2026-10-03' }
    ];
    const r = await ask(items);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(r.body.numbers, {
        [`course-${certs[0]._id}`]: num(1),          // the number on its PDF
        'competition-chess-1': num(3),              // the next ones, oldest first
        'up-upload-late': num(4)
    });
    assert.deepEqual((await ask(items)).body.numbers, r.body.numbers, 'asked again: the same numbers');
    // A number once given is not given again, even after its certificate goes.
    assert.deepEqual((await ask([{ key: 'up-another', added: '2026-10-05' }])).body.numbers, { 'up-another': num(5) });
    // Another student's series is their own.
    const theirs = await userApp.call(other.token)('POST', '/certificate-numbers', { items: [{ key: 'up-x', added: '2026-10-01' }] });
    assert.deepEqual(theirs.body.numbers, { 'up-x': `YATI${other.user.cardNumber}-001` });
});

test('a course certificate issued later takes the next number in the same series', async () => {
    const Progress = require('../../src/models/Progress');
    const Lesson = require('../../src/models/Lesson');
    const Module = require('../../src/models/Module');
    const m = await Module.findOne({ courseId: courses[2]._id });
    const all = await Lesson.find({ moduleId: m._id }).select('_id').lean();
    await Progress.updateOne({ userId: me.user._id, courseId: courses[2]._id }, { $set: { percentage: 100, completedLessons: all.map((l) => l._id) } });
    assert.equal((await api('POST', '/generate', { courseId: courses[2]._id })).status, 200);
    const third = (await issued()).find((c) => String(c.courseId) === String(courses[2]._id));
    assert.equal(third.certificateNumber, num(6));
});

test('numbers in an older format are put right: the whole series again, oldest first, -001 onwards', async () => {
    const Certificate = require('../../src/models/Certificate');
    const User = require('../../src/models/User');
    const old = await makeUser('CertOld');
    const card = old.user.cardNumber;
    const c1 = await Certificate.create({ userId: old.user._id, courseId: 'old-course-1', pdfUrl: 'dynamic', certificateNumber: `YATI${card}-01`, issuedAt: new Date('2026-01-10') });
    const c2 = await Certificate.create({ userId: old.user._id, courseId: 'old-course-2', pdfUrl: 'dynamic', certificateNumber: `YATI${card}-02`, issuedAt: new Date('2026-03-10') });
    const up = await require('../../src/models/Achievement').create({ userId: old.user._id, title: 'Hackathon', fileUrl: 'https://cdn.example/a.pdf', fileType: 'pdf', createdAt: new Date('2026-02-01') });
    await User.updateOne({ _id: old.user._id }, { $set: { certificateSeq: 1, certificateNumbers: [{ key: `up-${up._id}`, number: `YATI${card}001` }] } });
    try {
        const r = await userApp.call(old.token)('POST', '/certificate-numbers', { items: [{ key: `course-${c1._id}`, added: '2026-01-10' }, { key: `up-${up._id}`, added: '2026-02-01' }, { key: `course-${c2._id}`, added: '2026-03-10' }] });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.deepEqual(r.body.numbers, { [`course-${c1._id}`]: `YATI${card}-001`, [`up-${up._id}`]: `YATI${card}-002`, [`course-${c2._id}`]: `YATI${card}-003` });
        // The course certificates print the new numbers.
        assert.deepEqual((await Certificate.find({ userId: old.user._id }).sort({ issuedAt: 1 }).lean()).map((c) => c.certificateNumber), [`YATI${card}-001`, `YATI${card}-003`]);
        // And the next one, uploaded or earned, is -004.
        assert.deepEqual((await userApp.call(old.token)('POST', '/certificate-numbers', { items: [{ key: 'up-new', added: '2026-10-31' }] })).body.numbers, { 'up-new': `YATI${card}-004` });
        assert.ok(Object.values((await User.findById(old.user._id).select('+certificateNumbers').lean()).certificateNumbers).every((e) => new RegExp(`^YATI${card}-\\d{3}$`).test(e.number)), 'every number is YATI<card>-<three digits>');
    } finally {
        // Not cleanup(): it disconnects, and the file's own after() still needs the database.
        await require('../../src/models/Achievement').deleteMany({ userId: old.user._id });
        await Certificate.deleteMany({ userId: old.user._id });
        await User.deleteOne({ _id: old.user._id });
    }
});
