/**
 * A course's lessons open only to a student who has the course.
 *
 * The course player (GET /user/courses/:id), its progress, its lesson quizzes
 * and its VdoCipher video key all refuse a student who is not enrolled, so a
 * priced course cannot be watched by opening its address. Enrolling (and
 * paying, from the wallet) opens it; so does a bundle the student is enrolled
 * in, or any published bundle, since those are open to everyone. An
 * organization's course stays its members' only, and is free to them.
 *
 * Builds its own courses, bundle and students, and removes them afterwards.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
const ORG = new mongoose.Types.ObjectId();
const PRICE = 150;
// A VdoCipher id is 32 hex characters.
const VIDEO = `${'a'.repeat(24)}${STAMP.slice(-8)}`;
const ids = { paid: `EP${STAMP}`, inBundle: `EB${STAMP}`, org: `EG${STAMP}`, bundle: `EN${STAMP}` };
let userApp, videoApp, buyer, other, member, asBuyer, asOther, asMember, videoAs;
const lessons = {};
let savedRewards;

const config = () => require('../../src/rewards/services/configService');

before(async () => {
    await connect();
    userApp = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    videoApp = startApp({ mount: '/api/vdocipher', router: require('../../src/routes/vdoCipherRoutes') });
    // The price is taken from the wallet only while Rewards is on.
    savedRewards = (await config().getConfig()).enabled;
    if (savedRewards === false) { await config().updateConfig({ enabled: true }); config().invalidate(); }

    const Course = require('../../src/models/Course');
    const Module = require('../../src/models/Module');
    const Lesson = require('../../src/models/Lesson');
    await Course.create({ _id: ids.paid, title: 'Paid Course', price: PRICE, isPublished: true });
    await Course.create({ _id: ids.inBundle, title: 'Bundled Course', price: PRICE, isPublished: true });
    await Course.create({ _id: ids.org, title: 'Members Course', isPublished: true, organizationId: ORG });
    for (const id of [ids.paid, ids.inBundle, ids.org]) {
        const m = await Module.create({ courseId: id, title: 'Module', order: 1 });
        lessons[id] = await Lesson.create({ moduleId: m._id, title: 'Watch', type: 'video', videoSource: 'vdocipher', videoId: id === ids.paid ? VIDEO : undefined, order: 1 });
    }
    lessons.quiz = await Lesson.create({ moduleId: lessons[ids.paid].moduleId, title: 'Check', type: 'quiz', order: 2 });
    await require('../../src/models/Quiz').create({ lessonId: lessons.quiz._id, questions: [{ questionText: 'Two plus two?', options: ['4', '5'], correctAnswerIndex: 0 }] });

    buyer = await makeUser('EnrolBuyer'); other = await makeUser('EnrolOther'); member = await makeUser('EnrolMember');
    await require('../../src/models/User').updateOne({ _id: member.user._id }, { $set: { organizationId: ORG } });
    asBuyer = userApp.call(buyer.token); asOther = userApp.call(other.token); asMember = userApp.call(member.token);
    videoAs = (who) => videoApp.call(who.token);
});

after(async () => {
    const courseIds = Object.values(ids);
    const Module = require('../../src/models/Module');
    const Lesson = require('../../src/models/Lesson');
    const modules = await Module.find({ courseId: { $in: courseIds } }).select('_id').lean();
    const lessonIds = (await Lesson.find({ moduleId: { $in: modules.map((m) => m._id) } }).select('_id').lean()).map((l) => l._id);
    await require('../../src/models/Quiz').deleteMany({ lessonId: { $in: lessonIds } });
    await Lesson.deleteMany({ _id: { $in: lessonIds } });
    await Module.deleteMany({ courseId: { $in: courseIds } });
    await require('../../src/models/Course').deleteMany({ _id: { $in: courseIds } });
    await require('../../src/models/Bundle').deleteMany({ _id: ids.bundle });
    if (savedRewards === false) { await config().updateConfig({ enabled: false }); config().invalidate(); }
    await new Promise((r) => videoApp.server.close(r));
    await cleanup([buyer.user, other.user, member.user], userApp.server);
});

describe('a priced course, before enrolling', () => {
    test('the player, its progress and its lesson quiz refuse the student', async () => {
        const r = await asBuyer('GET', `/courses/${ids.paid}`);
        assert.equal(r.status, 403);
        assert.equal(r.body.code, 'NOT_ENROLLED');
        assert.doesNotMatch(JSON.stringify(r.body), new RegExp(VIDEO), 'no lesson content in the refusal');

        assert.equal((await asBuyer('POST', '/progress/update', { courseId: ids.paid, lessonId: String(lessons[ids.paid]._id) })).status, 403);
        assert.equal(await require('../../src/models/Progress').countDocuments({ userId: buyer.user._id, courseId: ids.paid }), 0, 'no progress row');
        assert.equal((await asBuyer('GET', `/lessons/${lessons.quiz._id}/quiz`)).status, 404);
        assert.equal((await asBuyer('POST', `/lessons/${lessons.quiz._id}/quiz/submit`, { answers: [0] })).status, 404);
    });

    test('no key to play its VdoCipher video', async () => {
        const r = await videoAs(buyer)('POST', '/generate-otp', { videoId: VIDEO });
        assert.equal(r.status, 404);
    });
});

describe('enrolling', () => {
    test('takes the price from the wallet, and then the course opens', async () => {
        const walletService = require('../../src/rewards/services/walletService');
        await walletService.grantStartingCredit(buyer.user._id);
        const { Wallet } = require('../../src/rewards/models');
        const before = (await Wallet.findOne({ userId: buyer.user._id }).lean()).available;

        const r = await asBuyer('POST', `/courses/${ids.paid}/enroll`);
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.charged, PRICE);
        assert.equal((await Wallet.findOne({ userId: buyer.user._id }).lean()).available, before - PRICE);

        const open = await asBuyer('GET', `/courses/${ids.paid}`);
        assert.equal(open.status, 200);
        assert.equal(open.body.modules[0].lessons[0].videoId, VIDEO, 'the lessons, video and all');
        // The quiz is the second lesson: it opens once the first is done, as
        // the player unlocks it (the server holds the order too now).
        assert.equal((await asBuyer('GET', `/lessons/${lessons.quiz._id}/quiz`)).status, 403);
        assert.equal((await asBuyer('POST', '/progress/update', { courseId: ids.paid, lessonId: String(lessons[ids.paid]._id) })).status, 200);
        assert.equal((await asBuyer('GET', `/lessons/${lessons.quiz._id}/quiz`)).status, 200);
    });

    test('opens it for that student only', async () => {
        assert.equal((await asOther('GET', `/courses/${ids.paid}`)).status, 403);
    });
});

describe('bundles', () => {
    test('a bundle the student is enrolled in opens its courses', async () => {
        const Bundle = require('../../src/models/Bundle');
        await Bundle.create({ _id: ids.bundle, title: 'Enrolment Bundle', courses: [ids.inBundle], isPublished: false });
        assert.equal((await asOther('GET', `/courses/${ids.inBundle}`)).status, 403, 'not without the enrolment');
        await require('../../src/models/Enrollment').create({ userId: other.user._id, bundleId: ids.bundle, type: 'Bundle' });
        assert.equal((await asOther('GET', `/courses/${ids.inBundle}`)).status, 200);
    });

    test('a published bundle opens its courses to every student', async () => {
        assert.equal((await asBuyer('GET', `/courses/${ids.inBundle}`)).status, 403);
        await require('../../src/models/Bundle').updateOne({ _id: ids.bundle }, { $set: { isPublished: true } });
        assert.equal((await asBuyer('GET', `/courses/${ids.inBundle}`)).status, 200);
    });

    test("each course in a bundle carries the student's own progress on it", async () => {
        // The buyer is not enrolled in the bundled course; it is listed in
        // `courses` all the same (bundles are hidden from students), and the
        // bundle still carries the progress for the admin side.
        const Progress = require('../../src/models/Progress');
        // Opening the course above already gave the buyer a Progress record.
        // Its one lesson done: the figure is worked out from the lessons.
        await Progress.updateOne({ userId: buyer.user._id, courseId: ids.inBundle }, { $set: { completedLessons: [lessons[ids.inBundle]._id] } }, { upsert: true });
        try {
            const res = await asBuyer('GET', '/courses');
            assert.equal(res.status, 200);
            // Bundles are not shown to students any more: a course open through
            // one is listed with their courses, with their progress on it.
            const listed = res.body.courses.find((c) => c._id === ids.inBundle);
            assert.ok(listed, 'a course open through a bundle is among their courses');
            assert.equal(listed.progress, 100);
            const bundle = res.body.bundles.find((b) => b._id === ids.bundle);
            assert.equal(bundle.courses.find((c) => c._id === ids.inBundle).progress, 100);
            assert.equal(bundle.progress, 100);
            // Somebody else's progress is their own.
            const theirs = (await asOther('GET', '/courses')).body.bundles.find((b) => b._id === ids.bundle);
            assert.equal(theirs.courses.find((c) => c._id === ids.inBundle).progress, 0);
        } finally {
            await Progress.deleteMany({ userId: buyer.user._id, courseId: ids.inBundle });
        }
    });
});

describe("an organization's course", () => {
    test('a member enrols for free and then opens it; anyone else never sees it', async () => {
        assert.equal((await asMember('GET', `/courses/${ids.org}`)).status, 403);
        const r = await asMember('POST', `/courses/${ids.org}/enroll`);
        assert.equal(r.status, 200);
        assert.equal(r.body.charged, 0);
        assert.equal((await asMember('GET', `/courses/${ids.org}`)).status, 200);
        assert.equal((await asBuyer('GET', `/courses/${ids.org}`)).status, 404);
    });
});
