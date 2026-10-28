/**
 * Scouts & Guides units (src/nccnss/units.js): an organization adds units with
 * a section and leaders from its own teachers, puts members and events in
 * them, and a rename reaches both. Another organization's unit or teacher is
 * never accepted, and a unit with members on record is retired, not deleted.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connect, startApp } = require('../helpers');
const User = require('../../src/models/User');
const Admin = require('../../src/models/Admin');
const Organization = require('../../src/organizations/models/Organization');
const { Teacher } = require('../../src/teacher/models');
const { ScoutUnit, NccNssMember, NccNssEvent } = require('../../src/nccnss/models');

const STAMP = `${Date.now()}`.slice(-7);
let app, org, other, admin, teacher, outsider, student, asOrg, asStudent;

before(async () => {
    await connect();
    app = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    const mk = (code) => Organization.create({ orgCode: `TSU-${code}-${STAMP}`, name: `Scout School ${code} ${STAMP}`, organizationType: 'school', email: `scout-${code}-${STAMP}@example.com`, status: 'active' });
    org = await mk('a'); other = await mk('b');
    admin = await Admin.create({ name: 'Scout Admin', email: `scout-admin-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
    teacher = await Teacher.create({ name: 'Leader One', email: `leader-${STAMP}@example.com`, phone: '9999999999', cardNumber: `TSU1${STAMP}`, password: 'Passw0rd!x', organizationId: org._id });
    outsider = await Teacher.create({ name: 'Elsewhere', email: `leader2-${STAMP}@example.com`, phone: '9999999999', cardNumber: `TSU2${STAMP}`, password: 'Passw0rd!x', organizationId: other._id });
    student = await User.create({ name: 'Cub Student', email: `cub-${STAMP}@example.com`, phone: '9999999999', cardNumber: `TSU3${STAMP}`, password: 'Passw0rd!x', organizationId: org._id });
    asOrg = app.call(jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }));
    asStudent = app.call(jwt.sign({ id: String(student._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }));
});

after(async () => {
    const orgs = [org._id, other._id];
    await Promise.all([
        ScoutUnit.deleteMany({ organizationId: { $in: orgs } }),
        NccNssMember.deleteMany({ organizationId: { $in: orgs } }),
        NccNssEvent.deleteMany({ organizationId: { $in: orgs } }),
        User.deleteOne({ _id: student._id }),
        Teacher.deleteMany({ _id: { $in: [teacher._id, outsider._id] } }),
        Admin.deleteOne({ _id: admin._id }),
        Organization.deleteMany({ _id: { $in: orgs } })
    ]);
    await new Promise((r) => app.server.close(r));
    await mongoose.disconnect();
});

const U = '/me/nccnss/units';

test('a unit needs a name and a section; leaders are only my teachers; names are unique', async () => {
    assert.equal((await asOrg('POST', U, { name: '1st Cub Pack' })).status, 400);
    const res = await asOrg('POST', U, { name: '1st Cub Pack', section: 'cubs', leaderTeacherIds: [String(teacher._id), String(outsider._id)] });
    assert.equal(res.status, 201);
    assert.deepEqual(res.body.unit.leaderTeacherIds.map(String), [String(teacher._id)]);
    assert.equal((await asOrg('POST', U, { name: '1st cub pack', section: 'cubs' })).status, 409);
    const list = await asOrg('GET', U);
    assert.equal(list.body.units.length, 1);
    assert.equal(list.body.units[0].leaderTeacherIds[0].name, 'Leader One');
});

test('a member and an event go into a unit; another organization\'s unit is refused', async () => {
    const unit = await ScoutUnit.findOne({ organizationId: org._id });
    const foreign = await ScoutUnit.create({ organizationId: other._id, name: 'Theirs', section: 'scouts' });
    assert.equal((await asOrg('POST', '/me/nccnss/members', { userId: String(student._id), scheme: 'SCOUTS', unitId: String(foreign._id) })).status, 400);
    const added = await asOrg('POST', '/me/nccnss/members', { userId: String(student._id), scheme: 'SCOUTS', unitId: String(unit._id) });
    assert.equal(added.status, 201);
    assert.equal(added.body.member.unit, '1st Cub Pack');
    assert.equal(added.body.member.section, 'cubs');
    const ev = await asOrg('POST', '/me/nccnss/events', { scheme: 'SCOUTS', unitId: String(unit._id), title: 'Pack meeting', date: new Date().toISOString() });
    assert.equal(ev.status, 201);
    assert.equal(ev.body.event.unit, '1st Cub Pack');
    const filtered = await asOrg('GET', `/me/nccnss/members?scheme=SCOUTS&unitId=${unit._id}`);
    assert.equal(filtered.body.members.length, 1);
});

test('a rename reaches members and events; a unit with members is retired, not deleted', async () => {
    const unit = await ScoutUnit.findOne({ organizationId: org._id });
    assert.equal((await asOrg('PUT', `${U}/${unit._id}`, { name: 'Akela Pack' })).status, 200);
    assert.equal((await NccNssMember.findOne({ unitId: unit._id })).unit, 'Akela Pack');
    assert.equal((await NccNssEvent.findOne({ unitId: unit._id })).unit, 'Akela Pack');
    assert.equal((await asOrg('DELETE', `${U}/${unit._id}`)).status, 409);
    assert.equal((await asOrg('PUT', `${U}/${unit._id}`, { status: 'inactive' })).status, 200);
    // Their member can still be edited while in the retired unit.
    const member = await NccNssMember.findOne({ unitId: unit._id });
    assert.equal((await asOrg('PUT', `/me/nccnss/members/${member._id}`, { unitId: String(unit._id), enrolmentNo: 'C-1' })).status, 200);
});

test('a student sees the active units and joins one', async () => {
    const unit = await ScoutUnit.create({ organizationId: org._id, name: '2nd Bulbul Flock', section: 'bulbuls' });
    await NccNssMember.deleteMany({ userId: student._id });
    const mine = await asStudent('GET', '/student/nccnss');
    assert.deepEqual(mine.body.scoutUnits.map((u) => u.name), ['2nd Bulbul Flock']);
    const join = await asStudent('POST', '/student/nccnss/join', { scheme: 'SCOUTS', unitId: String(unit._id) });
    assert.equal(join.status, 201);
    const row = await NccNssMember.findById(join.body.memberId);
    assert.equal(row.unit, '2nd Bulbul Flock');
    assert.equal(row.section, 'bulbuls');
    assert.equal(row.status, 'pending');
});
