/**
 * An organization's access hours (Dashboard → Access hours): outside them its
 * students can sign in, but the student API answers 423 PLATFORM_CLOSED with
 * when it opens; the closed screen's own needs stay open. Students of no
 * organization, and an administrator viewing as a student, are not affected.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connect, makeUser, startApp, forgetAudit } = require('../helpers');
const Admin = require('../../src/models/Admin');
const User = require('../../src/models/User');
const Organization = require('../../src/organizations/models/Organization');

const STAMP = `${Date.now()}`.slice(-7);
let orgApp, userApp, org, orgAdmin, asOrg, member, loner;

// The window "two to three hours from now" (closed) and "an hour ago to an hour on" (open), India time.
const istMinute = () => { const d = new Date(Date.now() + 330 * 60000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const hhmm = (m) => { const x = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

before(async () => {
    await connect();
    orgApp = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    userApp = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    org = await Organization.create({ orgCode: `THRS-${STAMP}`, name: `Hours College ${STAMP}`, organizationType: 'college', email: `org-hrs-${STAMP}@example.com`, status: 'active', logo: 'https://cdn.example.com/x.png' });
    orgAdmin = await Admin.create({ name: 'Hours Admin', email: `orgadmin-hrs-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
    asOrg = orgApp.call(jwt.sign({ id: String(orgAdmin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }));
    member = await makeUser('HoursMember');
    loner = await makeUser('HoursLoner');
    await User.updateOne({ _id: member.user._id }, { $set: { organizationId: org._id } });
});

after(async () => {
    await forgetAudit({ orgs: [org._id], admins: [orgAdmin._id] });
    await User.deleteMany({ _id: { $in: [member.user._id, loner.user._id] } });
    await Admin.deleteOne({ _id: orgAdmin._id });
    await Organization.deleteOne({ _id: org._id });
    await new Promise((r) => userApp.server.close(r));
    await new Promise((r) => orgApp.server.close(r));
    await mongoose.disconnect();
});

test('the organization sets its hours; mistakes are refused', async () => {
    assert.equal((await asOrg('GET', '/me/schedule')).body.schedule.enabled, false);
    assert.equal((await asOrg('PUT', '/me/schedule', { enabled: true, days: [], start: '09:00', end: '17:00' })).status, 400);
    assert.equal((await asOrg('PUT', '/me/schedule', { enabled: true, days: [1], start: '9am', end: '17:00' })).status, 400);
    const r = await asOrg('PUT', '/me/schedule', { enabled: true, days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' });
    assert.equal(r.status, 200);
    assert.equal(r.body.hours, 'Monday to Friday, 9:00 am to 5:00 pm');
});

test('outside the hours a student is shown when it opens; the closed screen still loads', async () => {
    const now = istMinute();
    await asOrg('PUT', '/me/schedule', { enabled: true, days: ALL_DAYS, start: hhmm(now + 120), end: hhmm(now + 180) });
    const asMember = userApp.call(member.token);
    const blocked = await asMember('GET', '/courses');
    assert.equal(blocked.status, 423);
    assert.equal(blocked.body.code, 'PLATFORM_CLOSED');
    const opensIn = (new Date(blocked.body.opensAt) - Date.now()) / 60000;
    assert.ok(opensIn > 110 && opensIn <= 121, `opens in about two hours (${opensIn.toFixed(0)} min)`);
    assert.equal((await asMember('GET', '/profile')).status, 200, 'the profile still loads');
    const status = await orgApp.call(member.token)('GET', '/student/schedule');
    assert.equal(status.body.applies, true);
    assert.equal(status.body.open, false);

    assert.equal((await userApp.call(loner.token)('GET', '/courses')).status, 200, 'a student of no organization is not affected');
    const asAdminView = userApp.call(jwt.sign({ id: String(member.user._id), impersonatedBy: String(orgAdmin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }));
    assert.equal((await asAdminView('GET', '/courses')).status, 200, 'an administrator viewing as the student is let through');
});

test('inside the hours, and with them switched off, everything is open', async () => {
    const now = istMinute();
    await asOrg('PUT', '/me/schedule', { enabled: true, days: ALL_DAYS, start: hhmm(now - 60), end: hhmm(now + 60) });
    const asMember = userApp.call(member.token);
    assert.equal((await asMember('GET', '/courses')).status, 200);
    const status = await orgApp.call(member.token)('GET', '/student/schedule');
    assert.equal(status.body.open, true);
    assert.ok(status.body.closesAt, 'and says when it closes');
    await asOrg('PUT', '/me/schedule', { enabled: false });
    assert.equal((await orgApp.call(member.token)('GET', '/student/schedule')).body.applies, false);
});

test('a student using the platform is shut out as soon as the organization changes its hours', async () => {
    const now = istMinute();
    const asMember = userApp.call(member.token);
    await asOrg('PUT', '/me/schedule', { enabled: true, days: ALL_DAYS, start: hhmm(now - 60), end: hhmm(now + 60) });
    assert.equal((await asMember('GET', '/courses')).status, 200, 'open while they work');
    // Today taken out of the days: closed at once, on their very next request.
    const today = new Date(Date.now() + 330 * 60000).getUTCDay();
    await asOrg('PUT', '/me/schedule', { enabled: true, days: ALL_DAYS.filter((d) => d !== today), start: hhmm(now - 60), end: hhmm(now + 60) });
    const blocked = await asMember('GET', '/courses');
    assert.equal(blocked.status, 423);
    assert.equal(blocked.body.code, 'PLATFORM_CLOSED');
    assert.equal((await orgApp.call(member.token)('GET', '/student/schedule')).body.open, false);
    await asOrg('PUT', '/me/schedule', { enabled: false });
});
