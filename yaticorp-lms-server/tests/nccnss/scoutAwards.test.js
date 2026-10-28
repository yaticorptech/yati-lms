/**
 * Ranks, badges and trainings (src/nccnss/awards.js): a unit leader proposes
 * one, the organization approves it, and the member's current rank follows —
 * on the organization's list, the leader's unit and the student's own page,
 * and through a transfer. A rank must be one of the section's; a staff
 * sign-in records only in the units its teacher leads.
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
const { ScoutUnit, ScoutAward, NccNssMember } = require('../../src/nccnss/models');

const STAMP = `${Date.now()}`.slice(-7);
let orgApp, teacherApp, org, admin, leader, kid, troop, crew, otherUnit, asOrg, asLeader, asKid, memberId;
const sign = (id, extra = {}) => jwt.sign({ id: String(id), ...extra }, process.env.JWT_SECRET, { expiresIn: '10m' });

before(async () => {
    await connect();
    orgApp = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    const r = express.Router();
    r.use(protectTeacher, require('../../src/nccnss/leader'));
    teacherApp = startApp({ mount: '/api/teacher/scout-units', router: r });
    org = await Organization.create({ orgCode: `TSA-${STAMP}`, name: `Awards School ${STAMP}`, organizationType: 'school', email: `tsa-${STAMP}@example.com`, status: 'active' });
    admin = await Admin.create({ name: 'Awards Admin', email: `tsa-admin-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
    leader = await Teacher.create({ name: 'Akela', email: `tsa-lead-${STAMP}@example.com`, phone: '9999999999', password: 'Passw0rd!x', organizationId: org._id });
    kid = await User.create({ name: 'Rank Scout', email: `tsa-kid-${STAMP}@example.com`, phone: '9999999999', cardNumber: `TSA${STAMP}`, password: 'Passw0rd!x', organizationId: org._id });
    troop = await ScoutUnit.create({ organizationId: org._id, name: 'Awards Troop', section: 'scouts', leaderTeacherIds: [leader._id] });
    crew = await ScoutUnit.create({ organizationId: org._id, name: 'Awards Crew', section: 'rovers' });
    otherUnit = await ScoutUnit.create({ organizationId: org._id, name: 'Other Company', section: 'guides' });
    asOrg = orgApp.call(sign(admin._id));
    asLeader = teacherApp.call(sign(leader._id, { role: 'teacher' }));
    asKid = orgApp.call(sign(kid._id));
    memberId = (await asOrg('POST', '/me/nccnss/members', { userId: String(kid._id), scheme: 'SCOUTS', unitId: String(troop._id) })).body.member._id;
});

after(async () => {
    await Promise.all([
        ScoutUnit.deleteMany({ organizationId: org._id }),
        ScoutAward.deleteMany({ organizationId: org._id }),
        NccNssMember.deleteMany({ userId: kid._id }),
        User.deleteOne({ _id: kid._id }),
        Teacher.deleteOne({ _id: leader._id }),
        Admin.deleteMany({ organizationId: org._id }),
        Organization.deleteOne({ _id: org._id })
    ]);
    await new Promise((r) => orgApp.server.close(r));
    await new Promise((r) => teacherApp.server.close(r));
    await mongoose.disconnect();
});

test('a leader proposes a rank of the section; the organization approves it', async () => {
    const wrong = await asLeader('POST', `/${troop._id}/members/${memberId}/awards`, { type: 'rank', name: 'Golden Arrow' });
    assert.equal(wrong.status, 400);
    const proposed = await asLeader('POST', `/${troop._id}/members/${memberId}/awards`, { type: 'rank', name: 'Pratham Sopan', examiner: 'DOC' });
    assert.equal(proposed.status, 201);
    // Not on the record until approved.
    assert.equal((await asOrg('GET', '/me/nccnss/members?scheme=SCOUTS')).body.members[0].rank, '');
    const queue = await asOrg('GET', '/me/nccnss/awards');
    assert.equal(queue.body.awards.length, 1);
    assert.equal((await asOrg('PUT', `/me/nccnss/awards/${proposed.body.award._id}`, { decision: 'approve' })).status, 200);
    assert.equal((await asOrg('GET', '/me/nccnss/members?scheme=SCOUTS')).body.members[0].rank, 'Pratham Sopan');
    const unit = await asLeader('GET', `/${troop._id}`);
    assert.equal(unit.body.members[0].rank, 'Pratham Sopan');
    assert.deepEqual(unit.body.ranks.slice(0, 2), ['Pravesh', 'Pratham Sopan']);
});

test('the organization records a badge and a higher rank; the furthest rank counts', async () => {
    assert.equal((await asOrg('POST', `/me/nccnss/members/${memberId}/awards`, { type: 'badge', name: 'First Aid' })).status, 201);
    assert.equal((await asOrg('POST', `/me/nccnss/members/${memberId}/awards`, { type: 'rank', name: 'Pravesh', date: '2025-01-01' })).status, 201);
    const detail = await asOrg('GET', `/me/nccnss/members/${memberId}`);
    assert.equal(detail.body.rank, 'Pratham Sopan');
    assert.equal(detail.body.awards.length, 3);
    const mine = await asKid('GET', '/student/nccnss');
    assert.equal(mine.body.memberships[0].rank, 'Pratham Sopan');
    assert.equal(mine.body.memberships[0].awards.length, 3);
});

test('the record follows a transfer to another section', async () => {
    const moved = await asOrg('POST', `/me/nccnss/members/${memberId}/transfer`, { unitId: String(crew._id) });
    assert.equal(moved.status, 201);
    const detail = await asOrg('GET', `/me/nccnss/members/${moved.body.member._id}`);
    // Not a Rover rank, so the latest dated rank stands until they pass one.
    assert.equal(detail.body.rank, 'Pratham Sopan');
    assert.equal(detail.body.awards.length, 3);
    assert.deepEqual(detail.body.ranks, ['Pravesh', 'Nipun', 'Rajya Puraskar', 'Rashtrapati Rover']);
    memberId = moved.body.member._id;
});

test('a staff sign-in records only in units its teacher leads', async () => {
    const staff = await Admin.create({ name: 'Staff', email: `tsa-staff-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id, staff: true, staffTeacherId: leader._id });
    const asStaff = orgApp.call(sign(staff._id));
    // The member is in the crew now, which the leader does not lead.
    assert.equal((await asStaff('POST', `/me/nccnss/members/${memberId}/awards`, { type: 'badge', name: 'Camper' })).status, 403);
    await ScoutUnit.updateOne({ _id: crew._id }, { $set: { leaderTeacherIds: [leader._id] } });
    assert.equal((await asStaff('POST', `/me/nccnss/members/${memberId}/awards`, { type: 'badge', name: 'Camper' })).status, 201);
});
