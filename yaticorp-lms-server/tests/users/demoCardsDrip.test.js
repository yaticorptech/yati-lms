/**
 * Content dripping and the demo cards (services/fullAccess.js; the account
 * owner's rule, 2026-10-09): a module set to open N days after enrolment is
 * open at once for the ten demo cards, lessons and all. Every other student
 * still waits for it, and sees only the lesson titles until then.
 *
 * The controller is called directly with a fake req/res. The course, its
 * modules and lessons are made here and removed afterwards.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, cleanup } = require('../helpers');
const { DEMO_CARDS } = require('../../src/services/fullAccess');
const { normaliseCardNumber } = require('../../src/utils/cardNumber');
const { getCourseContent } = require('../../src/controllers/userCourseController');
const Course = require('../../src/models/Course');
const Module = require('../../src/models/Module');
const Lesson = require('../../src/models/Lesson');
const Enrollment = require('../../src/models/Enrollment');

/** Call a controller the way Express would, and resolve with what it sent. */
const invoke = (handler, user, params) =>
    new Promise((resolve, reject) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(payload) { resolve({ status: this.statusCode, body: payload }); return this; }
        };
        Promise.resolve(handler({ user, params, body: {}, query: {} }, res)).catch(reject);
    });

const COURSE_ID = `drip-test-${Date.now()}`;
let demo, plain, card, modules;

before(async () => {
    await connect();
    demo = await makeUser('DemoDrip');
    plain = await makeUser('PlainDrip');
    card = normaliseCardNumber(demo.user.cardNumber);
    DEMO_CARDS.add(card);
    await Course.create({ _id: COURSE_ID, title: 'Drip test course', isPublished: true });
    modules = await Module.insertMany([
        { courseId: COURSE_ID, title: 'Week 1', order: 1, dripDays: 0 },
        { courseId: COURSE_ID, title: 'Week 2', order: 2, dripDays: 7 }
    ]);
    await Lesson.insertMany(modules.map((m, i) => ({ moduleId: m._id, title: `Lesson ${i + 1}`, type: 'pdf', order: 1, isPublished: true, pdfUrl: `https://cdn.example.com/lesson-${i + 1}.pdf` })));
    for (const who of [demo, plain]) await Enrollment.create({ userId: who.user._id, courseId: COURSE_ID, type: 'Course' });
});

after(async () => {
    DEMO_CARDS.delete(card);
    await Lesson.deleteMany({ moduleId: { $in: modules.map((m) => m._id) } });
    await Module.deleteMany({ courseId: COURSE_ID });
    await Course.deleteOne({ _id: COURSE_ID });
    await cleanup([demo.user, plain.user]);
});

test('a demo card gets every module at once — no drip', async () => {
    const res = await invoke(getCourseContent, demo.user, { id: COURSE_ID });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const week2 = res.body.modules.find((m) => m.title === 'Week 2');
    assert.equal(week2.locked, false, 'the 7-day module is open on day one');
    assert.equal(week2.unlockAt, null);
    assert.equal(week2.lessons[0].pdfUrl, 'https://cdn.example.com/lesson-2.pdf', 'with the lesson itself, not just its title');
});

test('any other student still waits for a dripped module', async () => {
    const res = await invoke(getCourseContent, plain.user, { id: COURSE_ID });
    assert.equal(res.status, 200);
    const [week1, week2] = res.body.modules;
    assert.equal(week1.locked, false);
    assert.equal(week2.locked, true, 'still locked for 7 days');
    assert.ok(new Date(week2.unlockAt) > new Date(), 'and says when it opens');
    assert.equal(week2.lessons[0].pdfUrl, undefined, 'only titles until then');
    assert.equal(week2.lessons[0].locked, true);
});
