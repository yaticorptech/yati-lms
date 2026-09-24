/**
 * Certificate numbers: YATI<card number>-<sequence>, where the sequence counts
 * the certificates the student already holds, so a second course gets -02 and
 * a re-download keeps the number it was first issued with.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

let app, me, api, courses;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/certificates', router: require('../../src/routes/certificateRoutes') });
    me = await makeUser('Cert'); api = app.call(me.token);
    const Course = require('../../src/models/Course');
    const Progress = require('../../src/models/Progress');
    courses = [await Course.create({ title: 'Cert course A' }), await Course.create({ title: 'Cert course B' }), await Course.create({ title: 'Cert course C' })];
    for (const c of courses.slice(0, 2)) await Progress.create({ userId: me.user._id, courseId: c._id, percentage: 100 });
    await Progress.create({ userId: me.user._id, courseId: courses[2]._id, percentage: 60 });
});

after(async () => {
    await require('../../src/models/Course').deleteMany({ _id: { $in: courses.map(c => c._id) } });
    await cleanup([me.user], app.server);
});

const issued = () => require('../../src/models/Certificate').find({ userId: me.user._id }).sort({ createdAt: 1 }).lean();

test('the first certificate is -01 and the second -02', async () => {
    let r = await api('POST', '/generate', { courseId: courses[0]._id });
    assert.equal(r.status, 200);
    r = await api('POST', '/generate', { courseId: courses[1]._id });
    assert.equal(r.status, 200);
    const certs = await issued();
    assert.deepEqual(certs.map(c => c.certificateNumber), [`YATI${me.user.cardNumber}-01`, `YATI${me.user.cardNumber}-02`]);
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
    assert.deepEqual(r.body.map(c => c.certificateNumber).sort(), [`YATI${me.user.cardNumber}-01`, `YATI${me.user.cardNumber}-02`]);
});
