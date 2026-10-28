/**
 * Unit leaders (src/nccnss/leader.js): a teacher the organization made a
 * unit's leader sees only that unit, approves its join requests, schedules its
 * events and marks attendance. A staff sign-in to the organization panel
 * changes Scouts only in the units its teacher leads, and never the units.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const express = require('express');
const mongoose = require('mongoose');
const { connect, startApp } = require('../helpers');
const User = require('../../src/models/User');
const Admin = require('../../src/models/Admin');
const Organization = require('../../src/organizations/models/Organization');
const { Teacher } = require('../../src/teacher/models');
const { protectTeacher } = require('../../src/teacher/auth');
const { ScoutUnit, NccNssMember, NccNssEvent, NccNssSetting } = require('../../src/nccnss/models');

const STAMP = `${Date.now()}`.slice(-7);
let orgApp, teacherApp, org, leader, other, staff, s1, s2, mineUnit, otherUnit, asLeader, asOther, asStaff;

before(async () => {
    await connect();
    orgApp = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    const leaderRouter = express.Router();
    leaderRouter.use(protectTeacher, require('../../src/nccnss/leader'));
    teacherApp = startApp({ mount: '/api/teacher/scout-units', router: leaderRouter });
    org = await Organization.create({ orgCode: `TSL-${STAMP}`, name: `Leader School ${STAMP}`, organizationType: 'school', email: `scout-lead-${STAMP}@example.com`, status: 'active' });
    const teacher = (n) => Teacher.create({ name: `Teacher ${n}`, email: `tsl-${n}-${STAMP}@example.com`, phone: '9999999999', cardNumber: `TSL${n}${STAMP}`, password: 'Passw0rd!x', organizationId: org._id });
    leader = await teacher(1); other = await teacher(2);
    mineUnit = await ScoutUnit.create({ organizationId: org._id, name: 'Lead Troop', section: 'scouts', leaderTeacherIds: [leader._id] });
    otherUnit = await ScoutUnit.create({ organizationId: org._id, name: 'Other Company', section: 'guides', leaderTeacherIds: [other._id] });
    const student = (n) => User.create({ name: `Scout ${n}`, email: `tsl-s${n}-${STAMP}@example.com`, phone: '9999999999', cardNumber: `TSLS${n}${STAMP}`, password: 'Passw0rd!x', organizationId: org._id });
    s1 = await student(1); s2 = await student(2);
    await NccNssMember.create({ organizationId: org._id, userId: s1._id, scheme: 'SCOUTS', unitId: mineUnit._id, unit: mineUnit.name, section: 'scouts', status: 'pending', addedBy: 'student' });
    await NccNssMember.create({ organizationId: org._id, userId: s2._id, scheme: 'SCOUTS', unitId: otherUnit._id, unit: otherUnit.name, section: 'guides', status: 'active' });
    staff = await Admin.create({ name: 'Staff', email: `tsl-staff-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id, staff: true, staffTeacherId: leader._id });
    const t = (id, extra = {}) => jwt.sign({ id: String(id), ...extra }, process.env.JWT_SECRET, { expiresIn: '10m' });
    asLeader = teacherApp.call(t(leader._id, { role: 'teacher' }));
    asOther = teacherApp.call(t(other._id, { role: 'teacher' }));
    asStaff = orgApp.call(t(staff._id));
});

after(async () => {
    await Promise.all([
        ScoutUnit.deleteMany({ organizationId: org._id }),
        NccNssMember.deleteMany({ organizationId: org._id }),
        NccNssEvent.deleteMany({ organizationId: org._id }),
        NccNssSetting.deleteMany({ organizationId: org._id }),
        User.deleteMany({ _id: { $in: [s1._id, s2._id] } }),
        Teacher.deleteMany({ _id: { $in: [leader._id, other._id] } }),
        Admin.deleteOne({ _id: staff._id }),
        Organization.deleteOne({ _id: org._id })
    ]);
    await new Promise((r) => orgApp.server.close(r));
    await new Promise((r) => teacherApp.server.close(r));
    await mongoose.disconnect();
});

test('a leader sees only their own units', async () => {
    const list = await asLeader('GET', '/');
    assert.deepEqual(list.body.units.map((u) => u.name), ['Lead Troop']);
    assert.equal(list.body.units[0].pending, 1);
    assert.equal((await asLeader('GET', `/${otherUnit._id}`)).status, 404);
    // A retired unit drops out of the leader's list.
    await ScoutUnit.updateOne({ _id: mineUnit._id }, { status: 'inactive' });
    assert.equal((await asLeader('GET', '/')).body.units.length, 0);
    await ScoutUnit.updateOne({ _id: mineUnit._id }, { status: 'active' });
});

test('a leader approves a request, adds an event and marks attendance in their unit only', async () => {
    const detail = await asLeader('GET', `/${mineUnit._id}`);
    const request = detail.body.members.find((m) => m.status === 'pending');
    assert.equal((await asOther('PUT', `/${mineUnit._id}/members/${request._id}`, { status: 'active' })).status, 404);
    assert.equal((await asLeader('PUT', `/${mineUnit._id}/members/${request._id}`, { status: 'active' })).status, 200);
    const ev = await asLeader('POST', `/${mineUnit._id}/events`, { title: 'Hike', kind: 'Camp', date: new Date(Date.now() - 60000).toISOString(), hours: 3 });
    assert.equal(ev.status, 201);
    assert.equal(ev.body.event.unit, 'Lead Troop');
    assert.equal(ev.body.event.kind, 'camp');
    const s2Member = await NccNssMember.findOne({ userId: s2._id });
    const att = await asLeader('PUT', `/${mineUnit._id}/events/${ev.body.event._id}/attendance`, { presentMemberIds: [request._id, String(s2Member._id)] });
    assert.equal(att.status, 200);
    // The other unit's member is dropped.
    assert.deepEqual((await NccNssEvent.findById(ev.body.event._id)).presentMemberIds.map(String), [request._id]);
    const after = await asLeader('GET', `/${mineUnit._id}`);
    assert.equal(after.body.members[0].summary.camps, 1);
});

test('a staff sign-in changes Scouts only in units its teacher leads, and never the units', async () => {
    const s2Member = await NccNssMember.findOne({ userId: s2._id });
    assert.equal((await asStaff('PUT', `/me/nccnss/members/${s2Member._id}`, { enrolmentNo: 'X' })).status, 403);
    const s1Member = await NccNssMember.findOne({ userId: s1._id });
    assert.equal((await asStaff('PUT', `/me/nccnss/members/${s1Member._id}`, { enrolmentNo: 'S-1' })).status, 200);
    assert.equal((await asStaff('POST', '/me/nccnss/events', { scheme: 'SCOUTS', title: 'All', date: new Date().toISOString() })).status, 403);
    assert.equal((await asStaff('POST', '/me/nccnss/events', { scheme: 'SCOUTS', unitId: String(mineUnit._id), title: 'Mine', date: new Date().toISOString() })).status, 201);
    assert.equal((await asStaff('PUT', '/me/nccnss/settings', { scheme: 'SCOUTS', requiredCamps: 2 })).status, 403);
    assert.equal((await asStaff('POST', '/me/nccnss/units', { name: 'New', section: 'cubs' })).status, 403);
    assert.equal((await asStaff('GET', '/me/nccnss/units')).status, 200);
    // NCC/NSS stay as they were for staff.
    assert.equal((await asStaff('PUT', '/me/nccnss/settings', { scheme: 'NSS', requiredHours: 240 })).status, 200);
});
