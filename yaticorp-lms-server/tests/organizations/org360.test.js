/**
 * Courses and 360 (2026-10-30): the organization lists its courses (BBA,
 * BCA…) and how many sections each has, saved at once; each teacher with 360
 * on marks, in their 360 dashboard, the course, section and subject they
 * teach, and keeps their own set of students to track. A student sees the
 * teachers tracking them once the organization opens 360.
 *
 * Activities (2026-10-31): the organization lists them in categories, each
 * "up to N marks" or "N per proof"; only students a 360 teacher has added
 * take part: they upload proof, and that teacher gives one mark per "up to N"
 * activity from all its proof (N for each accepted "per proof"), or sends
 * proof back with a reason.
 *
 * Unlocked by the platform (2026-11-04): until the superadmin unlocks 360 for
 * an organization, it cannot set activities or open 360, its teachers keep
 * only What I teach, and its students do not see 360.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, forgetAudit } = require('../helpers');
const Admin = require('../../src/models/Admin');
const User = require('../../src/models/User');
const Organization = require('../../src/organizations/models/Organization');
const { Teacher } = require('../../src/teacher/models');

const STAMP = `${Date.now()}`.slice(-7);
const same = (a, b) => String(a) === String(b);
const PASS = 'Teach-Pass1!';
let orgApp, userApp, teacherApp, org, other, orgAdmin, staff, superAdmin, asOrg, asSuper, s1, s2, outsider, geeta, ravi, plain;

const signIn = async (t) => teacherApp.call((await teacherApp.call(null)('POST', '/auth/login', { login: t.phone, password: PASS })).body.token);

before(async () => {
    await connect();
    orgApp = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    userApp = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    teacherApp = startApp({ mount: '/api/teacher', router: require('../../src/teacher') });
    org = await Organization.create({ orgCode: `T360-${STAMP}`, name: `Three Sixty College ${STAMP}`, organizationType: 'college', email: `org-360-${STAMP}@example.com`, status: 'active' });
    other = await Organization.create({ orgCode: `T36O-${STAMP}`, name: `Other College ${STAMP}`, organizationType: 'college', email: `org-36o-${STAMP}@example.com`, status: 'active' });
    orgAdmin = await Admin.create({ name: '360 Admin', email: `orgadmin-360-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
    staff = await Admin.create({ name: '360 Staff', email: `orgstaff-360-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id, staff: true });
    asOrg = orgApp.call(jwt.sign({ id: String(orgAdmin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }));
    superAdmin = await Admin.create({ name: '360 Super', email: `super-360-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'superadmin' });
    asSuper = orgApp.call(jwt.sign({ id: String(superAdmin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }));
    s1 = await makeUser('ThreeSixtyOne'); s2 = await makeUser('ThreeSixtyTwo'); outsider = await makeUser('ThreeSixtyOut');
    await User.updateMany({ _id: { $in: [s1.user._id, s2.user._id] } }, { $set: { organizationId: org._id } });
    await User.updateOne({ _id: outsider.user._id }, { $set: { organizationId: other._id } });
    const teacher = (name, n, extra = {}) => Teacher.create({ name, phone: `9${STAMP}${n}`, password: PASS, organizationId: org._id, createdBy: 'organization', mentor360: true, ...extra });
    geeta = await teacher('Geeta Rao', '21');
    ravi = await teacher('Ravi Kumar', '22');
    plain = await teacher('No Three Sixty', '23', { mentor360: false });
});

after(async () => {
    await forgetAudit({ orgs: [org._id, other._id], admins: [orgAdmin._id, staff._id, superAdmin._id] });
    await Teacher.deleteMany({ _id: { $in: [geeta._id, ravi._id, plain._id] } });
    await User.deleteMany({ _id: { $in: [s1.user._id, s2.user._id, outsider.user._id] } });
    await Admin.deleteMany({ _id: { $in: [orgAdmin._id, staff._id, superAdmin._id] } });
    await Organization.deleteMany({ _id: { $in: [org._id, other._id] } });
    for (const a of [orgApp, userApp, teacherApp]) await new Promise((r) => a.server.close(r));
    await mongoose.disconnect();
});

let bca, bba;
const save = (programs) => asOrg('PUT', '/me/classes/programs', { programs });

test('the organization saves its courses and sections at once; mistakes are 400s', async () => {
    assert.deepEqual((await asOrg('GET', '/me/classes')).body, { allowed: false, enabled: false, activityGroups: [], programs: [] });
    assert.equal((await save([{ name: '', sections: 2 }])).body.field, 'name');
    assert.equal((await save([{ name: 'BCA', sections: 0 }])).body.field, 'sections');
    const twice = await save([{ name: 'BCA', sections: 2 }, { name: 'bca', sections: 1 }]);
    assert.equal(twice.status, 400);
    assert.equal(twice.body.row, 1);
    const r = await save([{ name: 'BCA', sections: 2 }, { name: 'BBA', sections: 1 }]);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    [bca, bba] = r.body.programs;
    assert.deepEqual(bca.sections.map((x) => x.name), ['Section A', 'Section B']);
    assert.deepEqual(bba.sections.map((x) => x.name), ['Section A']);
});

test('staff accounts cannot change the courses', async () => {
    const asStaff = orgApp.call(jwt.sign({ id: String(staff._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }));
    assert.equal((await asStaff('GET', '/me/classes')).status, 403);
});

test('until the platform unlocks 360, the organization, its teachers and students cannot use it (2026-11-04)', async () => {
    assert.equal((await asOrg('GET', '/me/classes')).body.allowed, false);
    const open = await asOrg('PUT', '/me/classes', { enabled: true });
    assert.equal(open.status, 403, 'a 403, never a 401 that signs the panel out');
    assert.equal(open.body.code, 'THREE60_LOCKED');
    assert.equal((await asOrg('PUT', '/me/classes/activities', { groups: [] })).status, 403);
    const asGeeta = await signIn(geeta);
    const dash = await asGeeta('GET', '/360');
    assert.equal(dash.status, 200);
    assert.equal(dash.body.locked, true);
    assert.deepEqual(dash.body.students, []);
    assert.equal((await asGeeta('GET', '/360/students')).body.code, 'THREE60_LOCKED');
    // A student never sees it, even with the organization's own switch on.
    await Organization.updateOne({ _id: org._id }, { $set: { 'three60.enabled': true } });
    assert.deepEqual((await userApp.call(s1.token)('GET', '/360')).body, { enabled: false });
    await Organization.updateOne({ _id: org._id }, { $set: { 'three60.enabled': false } });
});

// While locked: What I teach (the classes) still works.
test('a teacher with 360 marks the course, section and subject they teach', async () => {
    const asGeeta = await signIn(geeta);
    const empty = await asGeeta('GET', '/360');
    assert.equal(empty.status, 200, JSON.stringify(empty.body));
    assert.deepEqual(empty.body.courses.map((c) => `${c.name}:${c.sections.length}`), ['BCA:2', 'BBA:1']);
    assert.deepEqual(empty.body.classes, []);
    const secA = String(bca.sections[0]._id);
    assert.equal((await asGeeta('POST', '/360/classes', { programId: String(bca._id), sectionId: secA })).body.field, 'subject');
    assert.equal((await asGeeta('POST', '/360/classes', { programId: String(bca._id), sectionId: String(bba.sections[0]._id), subject: 'Java' })).body.field, 'sectionId', 'the section must be of that course');
    assert.equal((await asGeeta('POST', '/360/classes', { programId: String(bca._id), sectionId: secA, subject: 'Java' })).status, 201);
    assert.equal((await asGeeta('POST', '/360/classes', { programId: String(bca._id), sectionId: secA, subject: 'java' })).status, 400, 'not the same subject twice');
    await asGeeta('POST', '/360/classes', { programId: String(bca._id), sectionId: secA, subject: 'DBMS' });
    await (await signIn(ravi))('POST', '/360/classes', { programId: String(bca._id), sectionId: secA, subject: 'Maths' });
    const mine = (await asGeeta('GET', '/360')).body.classes;
    assert.deepEqual(mine.map((c) => `${c.course} ${c.section} ${c.subject}`), ['BCA Section A Java', 'BCA Section A DBMS']);
    assert.equal((await asOrg('GET', '/me/classes')).body.programs[0].teachers, 2, 'the organization sees how many teachers marked it');
    const row = (await asOrg('GET', '/me/teachers')).body.teachers.find((t) => String(t._id) === String(geeta._id));
    assert.deepEqual(row.teaches.map((c) => `${c.course} ${c.section} ${c.subject}`), ['BCA Section A Java', 'BCA Section A DBMS'], 'the organization sees what each teacher teaches');
    const dbms = mine.find((c) => c.subject === 'DBMS');
    assert.equal((await (await signIn(ravi))('DELETE', `/360/classes/${dbms._id}`)).status, 404, 'not someone else’s');
    assert.equal((await asGeeta('DELETE', `/360/classes/${dbms._id}`)).body.classes.length, 1);
});

test('editing the list keeps what teachers marked; fewer sections drop the last', async () => {
    const r = await save([{ _id: String(bca._id), name: 'B.C.A.', sections: 3 }, { _id: String(bba._id), name: 'BBA', sections: 1 }, { name: 'B.Com', sections: 2 }]);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(String(r.body.programs[0]._id), String(bca._id));
    assert.deepEqual(r.body.programs[0].sections.map((x) => x.name), ['Section A', 'Section B', 'Section C']);
    assert.equal(String(r.body.programs[0].sections[0]._id), String(bca.sections[0]._id), 'section ids kept');
    const mine = (await (await signIn(geeta))('GET', '/360')).body.classes;
    assert.deepEqual(mine.map((c) => `${c.course} ${c.section} ${c.subject}`), ['B.C.A. Section A Java']);
    const fewer = await save([{ _id: String(bca._id), name: 'B.C.A.', sections: 1 }, { name: 'B.Com', sections: 2, _id: String(r.body.programs[2]._id) }]);
    assert.deepEqual(fewer.body.programs.map((p) => `${p.name}:${p.sections.length}`), ['B.C.A.:1', 'B.Com:2'], 'BBA left out is removed');
});

test('a teacher without 360 has no 360 dashboard', async () => {
    assert.equal((await (await signIn(plain))('GET', '/360')).status, 403);
});

test('only a superadmin unlocks 360, and the organization sees it unlocked (2026-11-04)', async () => {
    assert.notEqual((await asOrg('PUT', `/admin/${org._id}/three60`, { enabled: true })).status, 200, 'not the organization itself');
    assert.equal((await asSuper('PUT', `/admin/${org._id}/three60`, { enabled: 'yes' })).status, 400);
    const r = await asSuper('PUT', `/admin/${org._id}/three60`, { enabled: true });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.three60Allowed, true);
    assert.equal((await asSuper('GET', `/admin/${org._id}`)).body.organization.three60Allowed, true);
    assert.equal((await asOrg('GET', '/me/classes')).body.allowed, true);
    assert.equal((await (await signIn(geeta))('GET', '/360')).body.locked, false);
});

test('each teacher keeps their own set of the organization’s students', async () => {
    const asGeeta = await signIn(geeta);
    const list = await asGeeta('GET', '/360/students');
    assert.ok(list.body.students.some((x) => String(x._id) === String(s1.user._id)));
    assert.ok(!list.body.students.some((x) => String(x._id) === String(outsider.user._id)), 'only its own students');
    const r = await asGeeta('POST', '/360/students', { studentIds: [String(s1.user._id), String(s2.user._id), String(outsider.user._id)] });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(r.body.students.map((x) => String(x._id)).sort(), [String(s1.user._id), String(s2.user._id)].sort(), 'another organization’s student is not added');
    assert.deepEqual((await (await signIn(ravi))('GET', '/360')).body.students, [], 'Ravi’s set is his own');
    assert.equal((await asGeeta('GET', '/360/students')).body.students.find((x) => String(x._id) === String(s1.user._id)).mine, true);
    const out = await asGeeta('DELETE', `/360/students/${s2.user._id}`);
    assert.deepEqual(out.body.students.map((x) => x.name), [s1.user.name]);
});

test('a student sees the teachers tracking them once the organization opens 360', async () => {
    assert.deepEqual((await userApp.call(s1.token)('GET', '/360')).body, { enabled: false });
    await asOrg('PUT', '/me/classes', { enabled: true });
    const r = await userApp.call(s1.token)('GET', '/360');
    assert.equal(r.body.enabled, true);
    assert.deepEqual(r.body.teachers.map((t) => `${t.name}:${t.subjects.join(',')}`), ['Geeta Rao:Java']);
    assert.deepEqual((await userApp.call(s2.token)('GET', '/360')).body, { enabled: false, notAdded: true }, 'no 360 teacher has s2: 360 stays shut for them');
});

test('a teacher who leaves stops teaching and tracking', async () => {
    await (await signIn(ravi))('POST', '/360/students', { studentIds: [String(s1.user._id)] });
    await asOrg('DELETE', `/me/teachers/${ravi._id}`);
    assert.deepEqual((await Teacher.findById(ravi._id).lean()).students360, []);
    const org1 = await Organization.findById(org._id).lean();
    assert.ok(!org1.three60.programs.some((p) => p.sections.some((x) => x.teachers.some((t) => String(t.teacherId) === String(ravi._id)))));
});

/* ── Activities ────────────────────────────────────────────────────────── */

let pres, notes, gig;
const saveActivities = (groups) => asOrg('PUT', '/me/classes/activities', { groups });
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 0xff, 0xd9]);
const sendProof = (student, fields, file = true) => {
    const fd = new FormData();
    if (file) fd.append('file', new Blob([JPEG], { type: 'image/jpeg' }), 'certificate.jpg');
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    return fetch(`http://127.0.0.1:${userApp.server.address().port}/api/user/360/proofs`, { method: 'POST', headers: { Authorization: `Bearer ${student.token}` }, body: fd })
        .then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
};
// Proof goes to the student's own Google Drive (2026-11-02): a pretend one here (helpers.js fakeDrive).
let drive;
const withStorage = async (fn) => {
    drive = require('../helpers').fakeDrive();
    try { return await fn(); } finally { drive.restore(); }
};

test('the organization lists its activities in categories, saved at once; mistakes are 400s', async () => {
    const noName = await saveActivities([{ name: '', activities: [] }]);
    assert.equal(noName.status, 400);
    assert.deepEqual([noName.body.group, noName.body.field], [0, 'name']);
    const tooMany = await saveActivities([{ name: 'Academic Excellence', activities: [{ name: 'Presentations', marks: 2000 }] }]);
    assert.deepEqual([tooMany.status, tooMany.body.activity, tooMany.body.field], [400, 0, 'marks']);
    const twice = await saveActivities([{ name: 'Sports', activities: [] }, { name: 'sports', activities: [] }]);
    assert.deepEqual([twice.status, twice.body.group], [400, 1]);
    const r = await saveActivities([
        { name: 'Academic Excellence', activities: [{ name: 'Presentations', mode: 'max', marks: 10 }, { name: 'Handwritten Assignments', marks: 5 }] },
        { name: 'Earn While Learn', activities: [{ name: 'Individual activities', mode: 'each', marks: 1 }] }
    ]);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(r.body.activityGroups.map((g) => `${g.name}: ${g.activities.map((a) => `${a.name} ${a.mode} ${a.marks}`).join(', ')}`),
        ['Academic Excellence: Presentations max 10, Handwritten Assignments max 5', 'Earn While Learn: Individual activities each 1']);
    [pres, notes] = r.body.activityGroups[0].activities;
    [gig] = r.body.activityGroups[1].activities;
    // Saved again with their ids: the ids stay, so proof already sent keeps its activity.
    const again = await saveActivities(r.body.activityGroups);
    assert.equal(String(again.body.activityGroups[0].activities[0]._id), String(pres._id));
    assert.equal((await asOrg('GET', '/me/classes')).body.activityGroups.length, 2);
    const asStaff = orgApp.call(jwt.sign({ id: String(staff._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }));
    assert.equal((await asStaff('PUT', '/me/classes/activities', { groups: [] })).status, 403);
    assert.equal((await (await signIn(geeta))('GET', '/360')).body.activityGroups.length, 2, 'the 360 teachers see the list');
});

test('only students a 360 teacher added take part; that teacher gives one mark per activity from the proof', async () => withStorage(async () => {
    // s2 is on no 360 teacher's list: 360 stays shut for them.
    assert.deepEqual((await userApp.call(s2.token)('GET', '/360')).body, { enabled: false, notAdded: true });
    assert.equal((await sendProof(s2, { activityId: String(pres._id) })).body.code, 'NOT_ADDED');
    assert.equal((await sendProof(outsider, { activityId: String(pres._id) })).status, 403, '360 is not open in the other organization');

    const mine = await userApp.call(s1.token)('GET', '/360');
    assert.deepEqual([mine.body.activityGroups.length, mine.body.proofs.length, mine.body.totals.total], [2, 0, 0]);
    // Not linked to Google Drive: no upload until it is.
    const unlinked = await sendProof(s1, { activityId: String(pres._id) });
    assert.deepEqual([unlinked.status, unlinked.body.code], [409, 'DRIVE_REQUIRED']);
    drive.link(s1.user._id); drive.link(s2.user._id);
    assert.equal((await sendProof(s1, { activityId: String(pres._id) }, false)).status, 400, 'a file is needed');
    assert.equal((await sendProof(s1, { activityId: String(new mongoose.Types.ObjectId()) })).status, 400, 'an activity of the list');
    const p1 = await sendProof(s1, { activityId: String(pres._id), note: 'Corrected sheet: 18 / 20' });
    assert.equal(p1.status, 201, JSON.stringify(p1.body));
    assert.deepEqual([p1.body.proof.status, p1.body.proof.groupName, p1.body.proof.fileType], ['pending', 'Academic Excellence', 'image']);
    // In their Drive, shared by link: the view link is what the teacher opens; nothing kept here.
    assert.match(p1.body.proof.fileUrl, /^https:\/\/drive\.google\.com\/file\/d\/drive-file-\d+\/view$/);
    assert.match(p1.body.proof.previewUrl, /^https:\/\/drive\.google\.com\/thumbnail\?id=drive-file-\d+/);
    assert.equal(p1.body.proof.inDrive, true);
    assert.equal([...drive.files.values()].filter((f) => f.userId === String(s1.user._id) && f.shared).length, 1);
    const p2 = (await sendProof(s1, { activityId: String(pres._id), note: 'Second sheet' })).body.proof;
    const g1 = (await sendProof(s1, { activityId: String(gig._id) })).body.proof;
    const g2 = (await sendProof(s1, { activityId: String(gig._id) })).body.proof;

    const asGeeta = await signIn(geeta);
    const list = await asGeeta('GET', '/360/proofs');
    assert.equal(list.status, 200, JSON.stringify(list.body));
    assert.deepEqual([list.body.proofs.length, list.body.pending], [4, 4]);
    assert.deepEqual([list.body.proofs[0].activity, list.body.proofs[0].mark], [{ mode: 'max', marks: 10 }, null]);
    assert.equal((await asGeeta('GET', '/360')).body.students.find((x) => same(x._id, s1.user._id)).waiting, 4);
    assert.equal((await (await signIn(plain))('GET', '/360/proofs')).status, 403, 'not without 360');

    // From the queue: accepting one proof sets the activity's mark, 0–10.
    const check = (proof, body) => asGeeta('PUT', `/360/proofs/${s1.user._id}/${proof._id}`, body);
    assert.equal((await check(p1.body.proof, { decision: 'approve', marks: 12 })).body.field, 'marks', 'not above what the organization set');
    assert.equal((await check(p1.body.proof, { decision: 'approve' })).body.field, 'marks', 'marks are needed');
    assert.equal((await check(p1.body.proof, { decision: 'approve', marks: 6 })).status, 200);
    const next = (await asGeeta('GET', '/360/proofs')).body.proofs.find((x) => same(x._id, p2._id));
    assert.deepEqual([next.mark.marks, next.accepted], [6, 1], 'the next proof shows the mark given so far');

    // From the student: all their proof, and one mark for the activity, which accepts the proof still waiting.
    const sheet = (await asGeeta('GET', `/360/students/${s1.user._id}/activities`)).body;
    const presRow = sheet.groups[0].activities[0];
    assert.deepEqual([presRow.name, presRow.proofs.length, presRow.mark.marks, presRow.got, sheet.waiting], ['Presentations', 2, 6, 6, 3]);
    const mark = (activity, body) => asGeeta('PUT', `/360/students/${s1.user._id}/activities/${activity._id}`, body);
    assert.equal((await mark(pres, { marks: 11 })).body.field, 'marks');
    const marked = await mark(pres, { marks: 8 });
    assert.equal(marked.status, 200, JSON.stringify(marked.body));
    assert.deepEqual([marked.body.groups[0].activities[0].mark.marks, marked.body.groups[0].activities[0].proofs.map((x) => x.status)], [8, ['approved', 'approved']]);
    assert.equal((await mark(notes, { marks: 5 })).status, 400, 'marks are given on proof: none for this one');
    assert.equal((await mark(gig, { marks: 1 })).status, 400, 'per proof: accept the proof instead');

    // Per proof: each accepted proof gives the activity's marks; one sent back needs a reason.
    assert.equal((await check(g1, { decision: 'reject' })).body.field, 'note');
    assert.equal((await check(g1, { decision: 'reject', note: 'Not readable' })).status, 200);
    assert.equal((await check(g2, { decision: 'approve', marks: 99 })).status, 200);

    const after1 = (await userApp.call(s1.token)('GET', '/360')).body;
    assert.equal(after1.totals.total, 9);
    assert.equal(after1.totals.byActivity[String(pres._id)], 8);
    assert.equal(after1.marks.find((m) => same(m.activityId, pres._id)).byName, 'Geeta Rao');
    assert.equal(after1.proofs.find((x) => same(x._id, g1._id)).reviewNote, 'Not readable');
    assert.equal(after1.proofs.find((x) => same(x._id, g2._id)).marks, 1);
    assert.equal((await asGeeta('GET', '/360')).body.students.find((x) => same(x._id, s1.user._id)).marks, 9);

    // Accepted proof stays; proof sent back can be removed.
    assert.equal((await userApp.call(s1.token)('DELETE', `/360/proofs/${p1.body.proof._id}`)).status, 400);
    const before = drive.files.size;
    assert.equal((await userApp.call(s1.token)('DELETE', `/360/proofs/${g1._id}`)).status, 200);
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(drive.files.size, before - 1, 'removed from their Drive too');
    assert.equal((await asGeeta('GET', '/360/proofs')).body.pending, 0);

    // Only the student's own 360 teachers see and mark them.
    assert.equal((await asGeeta('GET', `/360/students/${s2.user._id}/activities`)).status, 403);
    assert.equal((await asGeeta('PUT', `/360/students/${s2.user._id}/activities/${pres._id}`, { marks: 5 })).status, 403);
    // Once she adds s2, 360 opens for them.
    await asGeeta('POST', '/360/students', { studentIds: [String(s2.user._id)] });
    assert.equal((await userApp.call(s2.token)('GET', '/360')).body.enabled, true);
    assert.equal((await sendProof(s2, { activityId: String(notes._id) })).status, 201);
}));
