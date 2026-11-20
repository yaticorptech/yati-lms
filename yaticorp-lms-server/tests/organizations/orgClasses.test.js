/**
 * Classes (2026-11-19, Campus → Departments → Add class): an organization adds a class with several sections at once,
 * a student asks to join in one of them, and on approval that class counts them; removing them takes them off it.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { connect, makeUser, startApp, cleanup } = require('../helpers');

const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
const Organization = require('../../src/organizations/models/Organization');
const JoinRequest = require('../../src/organizations/models/JoinRequest');
const Admin = require('../../src/models/Admin');
const User = require('../../src/models/User');

let app, base, org, admin, adminToken, kid;
const call = (token) => (method, path, body) => fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined })
    .then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

before(async () => {
    await connect();
    app = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    base = `http://127.0.0.1:${app.server.address().port}/api/organizations`;
    org = await Organization.create({ orgCode: `cls_${STAMP}`, name: `Class School ${STAMP}`, organizationType: 'school', email: `cls-${STAMP}@example.com`, status: 'active', approvedAt: new Date(), campusAllowed: true });
    admin = await Admin.create({ name: 'Class Admin', email: `cls-admin-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
    adminToken = jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' });
    kid = await makeUser('Class Kid');
});

after(async () => {
    await JoinRequest.deleteMany({ organizationId: org._id });
    await Organization.deleteOne({ _id: org._id });
    await cleanup([kid.user], app.server, [admin]);
});

test('sections together, a class chosen on joining, and the class counting its students', async () => {
    const o = call(adminToken);
    const added = await o('POST', '/me/campus/classes', { name: '9th', section: 'A, B, C', subjects: 6 });
    assert.equal(added.status, 201, JSON.stringify(added.body));
    let list = (await o('GET', '/me/campus/classes')).body.classes;
    assert.deepEqual(list.map((c) => `${c.name}${c.section}`), ['9thA', '9thB', '9thC']);
    assert.ok(list.every((c) => c.students === 0 && c.subjects === 6));
    assert.equal((await o('POST', '/me/campus/classes', { name: '9th', section: 'B' })).status, 400, 'no 9th B twice');

    const s = call(kid.token);
    const found = await s('GET', `/student/lookup/${org.orgCode}`);
    assert.equal(found.status, 200);
    assert.equal(found.body.classes.length, 3);
    assert.equal((await s('POST', '/student/requests', { orgCode: org.orgCode })).status, 400, 'a class is needed');
    const nineB = found.body.classes.find((c) => c.section === 'B');
    const asked = await s('POST', '/student/requests', { orgCode: org.orgCode, classId: nineB._id });
    assert.equal(asked.status, 201, JSON.stringify(asked.body));

    const request = await JoinRequest.findOne({ userId: kid.user._id, organizationId: org._id, status: 'pending' }).lean();
    const ok = await o('PUT', `/me/requests/${request._id}`, { decision: 'approve' });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.match(ok.body.message, /9th · Section B/);
    list = (await o('GET', '/me/campus/classes')).body.classes;
    assert.equal(list.find((c) => c.section === 'B').students, 1, 'counted in 9th B');
    assert.equal(list.find((c) => c.section === 'A').students, 0);
    // Their names, from the count (2026-11-19).
    const names = await o('GET', `/me/campus/classes/${list.find((c) => c.section === 'B')._id}/students`);
    assert.deepEqual(names.body.students.map((u) => u.name), [kid.user.name]);

    assert.equal((await o('DELETE', `/me/students/${kid.user._id}`)).status, 200);
    assert.equal((await User.findById(kid.user._id).select('orgClassId').lean()).orgClassId, null);
    list = (await o('GET', '/me/campus/classes')).body.classes;
    assert.equal(list.find((c) => c.section === 'B').students, 0, 'removed: no longer counted');
});

test('the class and section are filled in from the profile, and from their class there before (2026-11-19)', async () => {
    const Goal = require('../../src/career/models/Goal');
    const s = call(kid.token);
    try {
        // Removed from 9th B in the test before: that class was kept.
        const kept = (await User.findById(kid.user._id).select('lastOrgClass').lean()).lastOrgClass;
        assert.deepEqual({ name: kept.name, section: kept.section }, { name: '9th', section: 'B' });
        await User.updateOne({ _id: kid.user._id }, { $unset: { lastOrgClass: 1 } });
        // Career Path says "Class 9", the account's class says "9 C": 9th, Section C.
        await Goal.collection.updateOne({ userId: kid.user._id }, { $set: { userId: kid.user._id, currentClass: 'Class 9', careerGoal: 'Doctor' } }, { upsert: true });
        await User.updateOne({ _id: kid.user._id }, { $set: { className: '9 C' } });
        let found = (await s('GET', `/student/lookup/${org.orgCode}`)).body;
        const nineC = found.classes.find((c) => c.section === 'C');
        assert.equal(found.suggestedClass.name, '9th');
        assert.equal(found.suggestedClass.classId, String(nineC._id));
        assert.equal(found.suggestedClass.from, 'your Career Path profile');
        // Removed from 9th B earlier: joining again fills in 9th B, before the profile.
        await User.updateOne({ _id: kid.user._id }, { $set: { lastOrgClass: { organizationId: org._id, name: '9th', section: 'B' } } });
        found = (await s('GET', `/student/lookup/${org.orgCode}`)).body;
        assert.equal(found.suggestedClass.classId, String(found.classes.find((c) => c.section === 'B')._id));
        assert.equal(found.suggestedClass.from, 'your class here before');
    } finally {
        await Goal.collection.deleteOne({ userId: kid.user._id });
    }
});
