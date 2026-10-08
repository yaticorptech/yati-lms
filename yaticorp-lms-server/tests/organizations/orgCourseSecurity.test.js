/**
 * The fence around an organization's courses, against a hostile edit:
 * operator injection (`$set`/`$unset`), moving content into someone else's
 * course, borrowing a platform VdoCipher video, deleting one, and malformed
 * video ids. And that legitimate editing — an organization's own, and the
 * platform admin's — keeps working.
 *
 * VdoCipher is never called: axios is stubbed for the whole file and every
 * call it would have made is recorded. Builds two organizations, a platform
 * course, admins and students, and removes all of them afterwards.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');

const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
const hexId = () => crypto.randomBytes(16).toString('hex');

/* ── VdoCipher, stubbed ──────────────────────────────────────────────── */
const calls = [];
const real = { get: axios.get, put: axios.put, post: axios.post, delete: axios.delete };
const minted = [];
const stubAxios = () => {
    process.env.VDOCIPHER_API_KEY = 'test-key-not-real';
    axios.put = async (url) => { calls.push({ method: 'put', url }); const videoId = hexId(); minted.push(videoId); return { data: { clientPayload: { uploadLink: 'https://upload.example.com' }, videoId } }; };
    axios.get = async (url) => { calls.push({ method: 'get', url }); return { data: { status: 'ready', title: 'x', apiSecretLooking: 'never passed on' } }; };
    axios.post = async (url) => { calls.push({ method: 'post', url }); return { data: { otp: 'otp', playbackInfo: 'info' } }; };
    axios.delete = async (url) => { calls.push({ method: 'delete', url }); return { data: {} }; };
};
const deletedIds = () => calls.filter((c) => c.method === 'delete').map((c) => new URL(c.url).searchParams.get('videos'));

let orgApp, adminApp, vdoApp, userApp;
let orgA, orgB, adminA, adminB, platformAdmin, sA, sB;
let asA, asB, asPlatform, asPlatformVdo, otpAsA, otpAsB;
let courseA, courseB, moduleA, moduleA2, moduleB, lessonA, lessonB;
let platformCourse, platformModule, platformLesson;
const PLATFORM_VID = hexId();
const LEGACY_VID = hexId();
const SHARED_LEGACY_VID = hexId();
let A_VID, B_VID;

const makeOrg = (label) => require('../../src/organizations/models/Organization').create({
    orgCode: `S${label}-${STAMP}`, name: `Security ${label} College ${STAMP}`, organizationType: 'college',
    email: `sec-org-${label.toLowerCase()}-${STAMP}@example.com`, status: 'active',
    logo: 'https://cdn.example.com/logo.png', courseAccess: { enabled: true, limit: 5 }
});
const makeOrgAdmin = async (org) => {
    const Admin = require('../../src/models/Admin');
    const admin = await Admin.create({ name: `${org.name} Admin`, email: `sec-orgadmin-${org._id}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
    return { admin, token: jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }) };
};
const Course = () => require('../../src/models/Course');
const Module = () => require('../../src/models/Module');
const Lesson = () => require('../../src/models/Lesson');

before(async () => {
    stubAxios();
    await connect();
    orgApp = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    adminApp = startApp({ mount: '/api/admin', router: require('../../src/routes/adminRoutes') });
    vdoApp = startApp({ mount: '/api/vdocipher', router: require('../../src/routes/vdoCipherRoutes') });
    userApp = vdoApp;
    orgA = await makeOrg('A'); orgB = await makeOrg('B');
    adminA = await makeOrgAdmin(orgA); adminB = await makeOrgAdmin(orgB);
    platformAdmin = await makeAdmin('Platform');
    await require('../../src/models/Admin').updateOne({ _id: platformAdmin.admin._id }, { $set: { role: 'superadmin' } });
    sA = await makeUser('SecA'); sB = await makeUser('SecB');
    const User = require('../../src/models/User');
    await User.updateOne({ _id: sA.user._id }, { $set: { organizationId: orgA._id } });
    await User.updateOne({ _id: sB.user._id }, { $set: { organizationId: orgB._id } });
    asA = orgApp.call(adminA.token); asB = orgApp.call(adminB.token);
    asPlatform = adminApp.call(platformAdmin.token); asPlatformVdo = vdoApp.call(platformAdmin.token);
    otpAsA = userApp.call(sA.token); otpAsB = userApp.call(sB.token);

    // Content on every side: org A, org B, and the platform.
    courseA = (await asA('POST', '/me/courses', { title: `Sec A ${STAMP}`, isPublished: true })).body;
    courseB = (await asB('POST', '/me/courses', { title: `Sec B ${STAMP}` })).body;
    moduleA = (await asA('POST', '/me/modules', { courseId: courseA._id, title: 'A week 1' })).body;
    moduleA2 = (await asA('POST', '/me/modules', { courseId: courseA._id, title: 'A week 2' })).body;
    moduleB = (await asB('POST', '/me/modules', { courseId: courseB._id, title: 'B week 1' })).body;
    lessonA = (await asA('POST', '/me/lessons', { moduleId: moduleA._id, title: 'A lesson', type: 'video' })).body;
    lessonB = (await asB('POST', '/me/lessons', { moduleId: moduleB._id, title: 'B lesson', type: 'video' })).body;

    const made = await asPlatform('POST', '/courses', { title: `Sec platform ${STAMP}`, price: 4999, isPublished: false });
    assert.equal(made.status, 201, JSON.stringify(made.body));
    platformCourse = made.body;
    platformModule = (await asPlatform('POST', '/modules', { courseId: platformCourse._id, title: 'P week 1' })).body;
    platformLesson = (await asPlatform('POST', '/lessons', { moduleId: platformModule._id, title: 'P lesson', type: 'video' })).body;
    const pv = await asPlatform('PUT', `/lessons/${platformLesson._id}`, { videoSource: 'vdocipher', videoId: PLATFORM_VID });
    assert.equal(pv.status, 200, JSON.stringify(pv.body));

    // Each organization uploads one video of its own.
    A_VID = (await asA('POST', '/me/vdocipher/upload-credentials', { title: 'A upload' })).body.videoId;
    B_VID = (await asB('POST', '/me/vdocipher/upload-credentials', { title: 'B upload' })).body.videoId;
});

after(async () => {
    Object.assign(axios, real);
    const courseIds = [courseA, courseB, platformCourse].filter(Boolean).map((c) => c._id);
    const courses = await Course().find({ $or: [{ _id: { $in: courseIds } }, { organizationId: { $in: [orgA._id, orgB._id] } }] }).select('_id').lean();
    const modules = await Module().find({ courseId: { $in: courses.map((c) => c._id) } }).select('_id').lean();
    await Lesson().deleteMany({ moduleId: { $in: modules.map((m) => m._id) } });
    await Module().deleteMany({ _id: { $in: modules.map((m) => m._id) } });
    await Course().deleteMany({ _id: { $in: courses.map((c) => c._id) } });
    await require('../../src/organizations/models/VideoOwnership').deleteMany({ videoId: { $in: [...minted, PLATFORM_VID, LEGACY_VID, SHARED_LEGACY_VID] } });
    await require('../../src/organizations/models/Organization').deleteMany({ _id: { $in: [orgA._id, orgB._id] } });
    await new Promise((r) => adminApp.server.close(r));
    await new Promise((r) => vdoApp.server.close(r));
    await cleanup([sA.user, sB.user], orgApp.server, [adminA.admin, adminB.admin, platformAdmin.admin]);
});

describe('editing someone else\'s course', () => {
    test("org A cannot touch org B's course, module or lesson", async () => {
        assert.equal((await asA('PUT', `/me/courses/${courseB._id}`, { title: 'Taken' })).status, 404);
        assert.equal((await asA('PUT', `/me/modules/${moduleB._id}`, { title: 'Taken' })).status, 404);
        assert.equal((await asA('PUT', `/me/lessons/${lessonB._id}`, { title: 'Taken' })).status, 404);
        assert.equal((await Course().findById(courseB._id).lean()).title, `Sec B ${STAMP}`);
    });

    test('org A cannot touch a platform course, module or lesson', async () => {
        assert.equal((await asA('PUT', `/me/courses/${platformCourse._id}`, { title: 'Taken' })).status, 404);
        assert.equal((await asA('PUT', `/me/modules/${platformModule._id}`, { title: 'Taken' })).status, 404);
        assert.equal((await asA('PUT', `/me/lessons/${platformLesson._id}`, { title: 'Taken' })).status, 404);
        assert.equal((await asA('DELETE', `/me/lessons/${platformLesson._id}`)).status, 404);
    });
});

describe('operator injection has no effect', () => {
    test('$unset / $set on a course cannot change its owner or price', async () => {
        for (const body of [
            { $unset: { organizationId: 1 } },
            { $set: { organizationId: String(orgB._id) } },
            { $set: { price: 999, pricePoints: 50 } },
            { 'organizationId': null, price: 10, _id: '99999', createdAt: '2000-01-01' }
        ]) {
            const r = await asA('PUT', `/me/courses/${courseA._id}`, body);
            assert.equal(r.status, 200, JSON.stringify(r.body));
        }
        const saved = await Course().findById(courseA._id).lean();
        assert.equal(String(saved.organizationId), String(orgA._id), 'still org A\'s');
        assert.equal(saved.price, 0); assert.equal(saved.pricePoints, 0);
        assert.equal((await asA('GET', '/me/course-access')).body.used, 1, 'and it still counts against the limit');
    });

    test('$set on a module cannot move it to a platform course', async () => {
        const r = await asA('PUT', `/me/modules/${moduleA._id}`, { $set: { courseId: platformCourse._id }, 'courseId.x': 1 });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal((await Module().findById(moduleA._id).lean()).courseId, courseA._id);
    });

    test('$set on a lesson cannot move it to a platform module', async () => {
        const r = await asA('PUT', `/me/lessons/${lessonA._id}`, { $set: { moduleId: platformModule._id } });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(String((await Lesson().findById(lessonA._id).lean()).moduleId), String(moduleA._id));
    });

    test('nested operators in an id are not obeyed either', async () => {
        assert.equal((await asA('PUT', `/me/lessons/${lessonA._id}`, { moduleId: { $ne: null } })).status, 404);
        assert.equal((await asA('PUT', `/me/modules/${moduleA._id}`, { courseId: [courseA._id] })).status, 404);
    });
});

describe('moving content', () => {
    test("a module moves only into the organization's own course", async () => {
        assert.equal((await asA('PUT', `/me/modules/${moduleA2._id}`, { courseId: courseB._id })).status, 404);
        assert.equal((await asA('PUT', `/me/modules/${moduleA2._id}`, { courseId: platformCourse._id })).status, 404);
        assert.equal((await Module().findById(moduleA2._id).lean()).courseId, courseA._id);
    });

    test("a lesson moves only into the organization's own module", async () => {
        assert.equal((await asA('PUT', `/me/lessons/${lessonA._id}`, { moduleId: moduleB._id })).status, 404);
        assert.equal((await asA('PUT', `/me/lessons/${lessonA._id}`, { moduleId: platformModule._id })).status, 404);
        const ok = await asA('PUT', `/me/lessons/${lessonA._id}`, { moduleId: moduleA2._id });
        assert.equal(ok.status, 200, 'but into its own, yes');
        assert.equal((await asA('PUT', `/me/lessons/${lessonA._id}`, { moduleId: moduleA._id })).status, 200);
    });
});

describe('module titles', () => {
    test('a missing title is a 400, not a 500', async () => {
        assert.equal((await asA('POST', '/me/modules', { courseId: courseA._id })).status, 400);
    });

    test('a title is matched as text, not as a pattern', async () => {
        // `.*` would have matched "A week 1" and refused the module.
        const r = await asA('POST', '/me/modules', { courseId: courseA._id, title: '.*' });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        assert.equal((await asA('PUT', `/me/modules/${r.body._id}`, { title: '(a+)+$' })).status, 200);
        assert.equal((await asA('PUT', `/me/modules/${r.body._id}`, { title: 'A week 1' })).status, 400, 'a real clash is still caught');
        assert.equal((await asA('DELETE', `/me/modules/${r.body._id}`)).status, 200);
    });
});

describe('VdoCipher videos on an organization\'s lessons', () => {
    test('uploading records the organization as the owner', async () => {
        const VideoOwnership = require('../../src/organizations/models/VideoOwnership');
        assert.match(A_VID, /^[a-f0-9]{32}$/);
        assert.equal(String((await VideoOwnership.findOne({ videoId: A_VID }).lean()).organizationId), String(orgA._id));
        assert.equal(String((await VideoOwnership.findOne({ videoId: B_VID }).lean()).organizationId), String(orgB._id));
    });

    test('it cannot attach a platform video, or another organization\'s', async () => {
        for (const videoId of [PLATFORM_VID, B_VID, hexId()]) {
            const r = await asA('PUT', `/me/lessons/${lessonA._id}`, { videoSource: 'vdocipher', videoId });
            assert.equal(r.status, 403, videoId); assert.equal(r.body.code, 'VIDEO_NOT_OWNED');
        }
        // Not by parking the id under another source first, either.
        assert.equal((await asA('PUT', `/me/lessons/${lessonA._id}`, { videoSource: 'youtube', videoId: PLATFORM_VID })).status, 200);
        assert.equal((await asA('PUT', `/me/lessons/${lessonA._id}`, { videoSource: 'vdocipher' })).status, 403);
        const saved = await Lesson().findById(lessonA._id).lean();
        assert.notEqual(saved.videoSource, 'vdocipher');
    });

    test('a malformed id is refused', async () => {
        for (const videoId of [`${PLATFORM_VID},${A_VID}`, `${A_VID}?x=1`, 'abc123']) {
            assert.equal((await asA('PUT', `/me/lessons/${lessonA._id}`, { videoSource: 'vdocipher', videoId })).status, 400, videoId);
        }
    });

    test('its own upload attaches, and keeps working on later edits', async () => {
        const r = await asA('PUT', `/me/lessons/${lessonA._id}`, { title: 'A lesson', type: 'video', videoSource: 'vdocipher', videoId: A_VID, videoUrl: '', vdocipherStatus: 'queued', isPublished: true, attachments: [] });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.videoId, A_VID);
        const again = await asA('PUT', `/me/lessons/${lessonA._id}`, { title: 'A lesson, renamed', videoSource: 'vdocipher', videoId: A_VID });
        assert.equal(again.status, 200); assert.equal(again.body.title, 'A lesson, renamed');
    });

    test('status is answered for its own video only, and only the status', async () => {
        const mine = await asA('GET', `/me/vdocipher/status/${A_VID}`);
        assert.equal(mine.status, 200); assert.deepEqual(mine.body, { status: 'ready' });
        assert.equal((await asB('GET', `/me/vdocipher/status/${A_VID}`)).status, 404);
        assert.equal((await asA('GET', `/me/vdocipher/status/${PLATFORM_VID}`)).status, 404, 'not a platform video');
        assert.equal((await asA('GET', `/me/vdocipher/status/${hexId()}`)).status, 404, 'nor one nobody has claimed');
    });
});

describe('malformed video ids never reach VdoCipher', () => {
    test('every VdoCipher endpoint answers 400 first', async () => {
        const before = calls.length;
        const bad = [`${A_VID}%2C${PLATFORM_VID}`, `${A_VID}%3Fx%3D1`, 'abc', `${A_VID}0`];
        for (const id of bad) {
            assert.equal((await asA('GET', `/me/vdocipher/status/${id}`)).status, 400, `org status ${id}`);
            assert.equal((await asA('DELETE', `/me/vdocipher/video/${id}`)).status, 400, `org delete ${id}`);
            assert.equal((await asPlatformVdo('GET', `/status/${id}`)).status, 400, `platform status ${id}`);
            assert.equal((await asPlatformVdo('DELETE', `/video/${id}`)).status, 400, `platform delete ${id}`);
        }
        assert.equal((await otpAsA('POST', '/generate-otp', { videoId: `${A_VID},${PLATFORM_VID}` })).status, 400);
        assert.equal(calls.length, before, 'no VdoCipher call was made');
        assert.equal(await require('../../src/controllers/vdoCipherController').deleteVideo(`${A_VID},${PLATFORM_VID}`), false);
        assert.equal(calls.length, before);
    });
});

describe('playback OTPs', () => {
    test("a student gets one for a video in a course they can open, and only then", async () => {
        const before = calls.length;
        const ok = await otpAsA('POST', '/generate-otp', { videoId: A_VID });
        assert.equal(ok.status, 200, JSON.stringify(ok.body));
        assert.equal((await otpAsB('POST', '/generate-otp', { videoId: A_VID })).status, 404, "not another organization's");
        assert.equal((await otpAsA('POST', '/generate-otp', { videoId: PLATFORM_VID })).status, 404, 'not one in an unpublished course');
        assert.equal((await otpAsA('POST', '/generate-otp', { videoId: hexId() })).status, 404, 'not one no lesson uses');
        assert.equal(calls.length, before + 1, 'VdoCipher was asked only for the allowed one');
    });
});

describe('deleting videos from VdoCipher', () => {
    test('an organization cannot delete a platform or another organization\'s video', async () => {
        const before = calls.length;
        assert.equal((await asA('DELETE', `/me/vdocipher/video/${PLATFORM_VID}`)).status, 404);
        assert.equal((await asA('DELETE', `/me/vdocipher/video/${B_VID}`)).status, 404);
        assert.equal(calls.length, before);
    });

    test('a lesson pointed at a platform video (before this fix) is deleted, the video is not', async () => {
        // The state the old code allowed; written directly, since the API now refuses it.
        const planted = await Lesson().create({ moduleId: moduleA._id, title: 'Borrowed', videoSource: 'vdocipher', videoId: PLATFORM_VID });
        const r = await asA('DELETE', `/me/lessons/${planted._id}`);
        assert.equal(r.status, 200);
        assert.equal(await Lesson().exists({ _id: planted._id }), null, 'the lesson is gone');
        assert.ok(!deletedIds().includes(PLATFORM_VID), 'the platform video is not');
    });

    test('a legacy video (no upload record) is deleted only when every lesson using it is the organization\'s', async () => {
        const own = await Lesson().create({ moduleId: moduleA._id, title: 'Legacy own', videoSource: 'vdocipher', videoId: LEGACY_VID });
        await asA('DELETE', `/me/lessons/${own._id}`);
        assert.ok(deletedIds().includes(LEGACY_VID), 'its own legacy video goes');

        const mine = await Lesson().create({ moduleId: moduleA._id, title: 'Legacy shared', videoSource: 'vdocipher', videoId: SHARED_LEGACY_VID });
        const theirs = await Lesson().create({ moduleId: platformModule._id, title: 'Legacy platform', videoSource: 'vdocipher', videoId: SHARED_LEGACY_VID });
        await asA('DELETE', `/me/lessons/${mine._id}`);
        assert.ok(!deletedIds().includes(SHARED_LEGACY_VID), 'one the platform still plays stays');
        await Lesson().deleteOne({ _id: theirs._id });
    });

    test('its own video goes when its lesson is deleted', async () => {
        const extra = (await asA('POST', '/me/lessons', { moduleId: moduleA._id, title: 'Own upload', type: 'video' })).body;
        const vid = (await asA('POST', '/me/vdocipher/upload-credentials', { title: 'Own upload' })).body.videoId;
        assert.equal((await asA('PUT', `/me/lessons/${extra._id}`, { videoSource: 'vdocipher', videoId: vid })).status, 200);
        assert.equal((await asA('DELETE', `/me/lessons/${extra._id}`)).status, 200);
        assert.ok(deletedIds().includes(vid));
    });

    test('and from the editor\'s Delete Video button, for its own video', async () => {
        const vid = (await asA('POST', '/me/vdocipher/upload-credentials', { title: 'Replace me' })).body.videoId;
        const r = await asA('DELETE', `/me/vdocipher/video/${vid}`);
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.ok(deletedIds().includes(vid));
    });
});

describe('the platform admin', () => {
    test('edits a platform course as before, but not through operators', async () => {
        const r = await asPlatform('PUT', `/courses/${platformCourse._id}`, { title: `Sec platform ${STAMP} v2`, price: 1999, pricePoints: 100 });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.price, 1999); assert.equal(r.body.pricePoints, 100);
        assert.equal((await asPlatform('PUT', `/courses/${platformCourse._id}`, { $set: { organizationId: String(orgA._id) } })).status, 200);
        assert.equal((await Course().findById(platformCourse._id).lean()).organizationId, null, 'still a platform course');
    });

    test('edits modules and lessons as before', async () => {
        assert.equal((await asPlatform('PUT', `/modules/${platformModule._id}`, { title: 'P week 1, renamed', dripDays: 2 })).status, 200);
        const l = await asPlatform('PUT', `/lessons/${platformLesson._id}`, { title: 'P lesson, renamed', allowDownload: true });
        assert.equal(l.status, 200); assert.equal(l.body.title, 'P lesson, renamed'); assert.equal(l.body.videoId, PLATFORM_VID);
    });

    test('a shared video is kept until its last lesson is deleted', async () => {
        const twin = (await asPlatform('POST', '/lessons', { moduleId: platformModule._id, title: 'P twin', type: 'video' })).body;
        await asPlatform('PUT', `/lessons/${twin._id}`, { videoSource: 'vdocipher', videoId: PLATFORM_VID });
        assert.equal((await asPlatform('DELETE', `/lessons/${twin._id}`)).status, 200);
        assert.ok(!deletedIds().includes(PLATFORM_VID), 'the other lesson still plays it');
        assert.equal((await asPlatform('DELETE', `/lessons/${platformLesson._id}`)).status, 200);
        assert.ok(deletedIds().includes(PLATFORM_VID), 'now it goes');
    });

    test('deletes a platform course as before', async () => {
        const r = await asPlatform('DELETE', `/courses/${platformCourse._id}`);
        assert.equal(r.status, 200);
        assert.equal(await Course().exists({ _id: platformCourse._id }), null);
    });
});
