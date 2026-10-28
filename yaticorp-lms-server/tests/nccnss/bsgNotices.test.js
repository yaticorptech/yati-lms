/**
 * Bharat Scouts & Guides offices and notices (src/nccnss/notices.js): a
 * superadmin makes the national office and one office per state; each
 * publishes exams, camps and events with their rules; an institution's
 * Scouts & Guides — through it, their leader and themselves — see the
 * national ones and their own state's, and nobody else's.
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
const { ScoutUnit, NccNssMember, BsgNotice } = require('../../src/nccnss/models');

const STAMP = `${Date.now()}`.slice(-7);
const PASS = 'Office-Pass1!';
let app, teacherApp, superAdmin, asSuper, school, otherSchool, schoolAdmin, kid, leader;
const sign = (id, extra = {}) => jwt.sign({ id: String(id), ...extra }, process.env.JWT_SECRET, { expiresIn: '10m' });
const offices = {};

before(async () => {
    await connect();
    // A test database may hold offices from an earlier run that failed half-way.
    await Organization.deleteMany({ bsgOffice: { $in: ['national', 'state'] }, orgCode: /^tbn_/ });
    app = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    const r = express.Router();
    r.use(protectTeacher, require('../../src/nccnss/leader'));
    teacherApp = startApp({ mount: '/api/teacher/scout-units', router: r });
    superAdmin = await Admin.create({ name: 'Super', email: `tbn-super-${STAMP}@example.com`, password: PASS, role: 'superadmin' });
    asSuper = app.call(sign(superAdmin._id));
    school = await Organization.create({ orgCode: `TBN-S-${STAMP}`, name: `Karnataka School ${STAMP}`, organizationType: 'school', email: `tbn-s-${STAMP}@example.com`, status: 'active' });
    otherSchool = await Organization.create({ orgCode: `TBN-O-${STAMP}`, name: `Kerala School ${STAMP}`, organizationType: 'school', email: `tbn-o-${STAMP}@example.com`, status: 'active', state: 'Kerala' });
    schoolAdmin = await Admin.create({ name: 'School', email: `tbn-sa-${STAMP}@example.com`, password: PASS, role: 'orgadmin', organizationId: school._id });
    leader = await Teacher.create({ name: 'Leader', email: `tbn-l-${STAMP}@example.com`, phone: '9999999999', password: PASS, organizationId: school._id });
    kid = await User.create({ name: 'Notice Scout', email: `tbn-k-${STAMP}@example.com`, phone: '9999999999', cardNumber: `TBN${STAMP}`, password: PASS, organizationId: school._id });
    const unit = await ScoutUnit.create({ organizationId: school._id, name: 'Notice Troop', section: 'scouts', leaderTeacherIds: [leader._id] });
    await NccNssMember.create({ organizationId: school._id, userId: kid._id, scheme: 'SCOUTS', unitId: unit._id, unit: unit.name, section: 'scouts', status: 'active' });
});

after(async () => {
    const ids = [school._id, otherSchool._id, ...Object.values(offices)];
    await Promise.all([
        BsgNotice.deleteMany({ officeId: { $in: ids } }),
        ScoutUnit.deleteMany({ organizationId: school._id }),
        NccNssMember.deleteMany({ userId: kid._id }),
        User.deleteOne({ _id: kid._id }),
        Teacher.deleteOne({ _id: leader._id }),
        Admin.deleteMany({ $or: [{ organizationId: { $in: ids } }, { _id: superAdmin._id }] }),
        Organization.deleteMany({ _id: { $in: ids } })
    ]);
    await new Promise((r) => app.server.close(r));
    await new Promise((r) => teacherApp.server.close(r));
    await mongoose.disconnect();
});

const makeOffice = (bsgOffice, state, code) => asSuper('POST', '/admin', {
    name: `BSG ${bsgOffice} ${state || ''} ${STAMP}`, orgCode: `tbn_${code}_${STAMP}`, organizationType: 'government',
    email: `tbn-${code}-${STAMP}@example.com`, password: PASS, bsgOffice, state
});

test('a superadmin makes one national office and one office per state', async () => {
    const national = await makeOffice('national', '', 'nat');
    if (national.status === 409) return test.skip('a national office already exists in this database');
    assert.equal(national.status, 201, JSON.stringify(national.body));
    offices.national = national.body.organization._id;
    assert.equal((await makeOffice('state', '', 'nostate')).status, 400);
    const ka = await makeOffice('state', 'Karnataka', 'ka');
    assert.equal(ka.status, 201);
    offices.ka = ka.body.organization._id;
    assert.equal((await makeOffice('state', 'Karnataka', 'ka2')).status, 409);
});

test('offices publish; an institution cannot', async () => {
    assert.ok(offices.ka, 'needs the offices from the first test');
    const kaAdmin = await Admin.findOne({ organizationId: offices.ka });
    const asKa = app.call(sign(kaAdmin._id));
    const exam = await asKa('POST', '/me/bsg/notices', { kind: 'exam', title: 'Rajya Puraskar test', date: '2030-01-10', sections: ['scouts', 'guides'], minRank: 'Tritiya Sopan', rules: 'Tie 10 knots\nFirst aid basics' });
    assert.equal(exam.status, 201, JSON.stringify(exam.body));
    assert.deepEqual(exam.body.notice.rules, ['Tie 10 knots', 'First aid basics']);
    assert.equal(exam.body.notice.state, 'Karnataka');
    if (offices.national) {
        const natAdmin = await Admin.findOne({ organizationId: offices.national });
        assert.equal((await app.call(sign(natAdmin._id))('POST', '/me/bsg/notices', { kind: 'camp', title: 'National jamboree', date: '2030-02-01' })).status, 201);
    }
    assert.equal((await app.call(sign(schoolAdmin._id))('POST', '/me/bsg/notices', { title: 'Mine', date: '2030-01-01' })).status, 403);
    // An office's state is fixed.
    await asKa('PUT', '/me', { state: 'Kerala' });
    assert.equal((await Organization.findById(offices.ka)).state, 'Karnataka');
});

test('an institution sees national notices and its own state\'s, once its state is set', async () => {
    const asSchool = app.call(sign(schoolAdmin._id));
    const before = (await asSchool('GET', '/me/bsg/feed')).body.notices.map((n) => n.title);
    assert.ok(!before.includes('Rajya Puraskar test'));
    assert.equal((await asSchool('PUT', '/me', { state: 'Atlantis' })).status, 400);
    assert.equal((await asSchool('PUT', '/me', { state: 'Karnataka' })).status, 200);
    const feed = (await asSchool('GET', '/me/bsg/feed')).body.notices;
    assert.ok(feed.some((n) => n.title === 'Rajya Puraskar test' && n.from === 'BSG Karnataka'));
    const kerala = await Admin.create({ name: 'Kerala', email: `tbn-ke-${STAMP}@example.com`, password: PASS, role: 'orgadmin', organizationId: otherSchool._id });
    const keralaFeed = (await app.call(sign(kerala._id))('GET', '/me/bsg/feed')).body.notices;
    assert.ok(!keralaFeed.some((n) => n.title === 'Rajya Puraskar test'));
});

test('the leader and the student see them too', async () => {
    const units = await teacherApp.call(sign(leader._id, { role: 'teacher' }))('GET', '/');
    assert.ok(units.body.notices.some((n) => n.title === 'Rajya Puraskar test'));
    const mine = await app.call(sign(kid._id))('GET', '/student/nccnss');
    assert.ok(mine.body.bsgNotices.some((n) => n.title === 'Rajya Puraskar test'));
});

test('the overview counts Scouts & Guides through institutions and direct', async () => {
    assert.ok(offices.ka, 'needs the offices from the first test');
    const kaAdmin = await Admin.findOne({ organizationId: offices.ka });
    const view = await app.call(sign(kaAdmin._id))('GET', '/me/bsg/overview');
    assert.equal(view.status, 200);
    assert.ok(view.body.totals.throughInstitutions >= 1);
    assert.equal(view.body.totals.direct, 0);
    assert.ok(view.body.sections.some((r) => r.section === 'scouts' && r.throughInstitutions >= 1));
    if (offices.national) {
        const direct = await User.create({ name: 'Direct Guide', email: `tbn-d-${STAMP}@example.com`, phone: '9999999999', cardNumber: `TBND${STAMP}`, password: PASS, organizationId: offices.national });
        await NccNssMember.create({ organizationId: offices.national, userId: direct._id, scheme: 'SCOUTS', section: 'guides', status: 'active' });
        const natAdmin = await Admin.findOne({ organizationId: offices.national });
        const nat = await app.call(sign(natAdmin._id))('GET', '/me/bsg/overview');
        assert.ok(nat.body.totals.direct >= 1);
        assert.ok(nat.body.sections.some((r) => r.section === 'guides' && r.direct >= 1));
        await NccNssMember.deleteMany({ userId: direct._id });
        await User.deleteOne({ _id: direct._id });
    }
});

test('rules need no date and never drop out; attendance is marked for those the office reaches', async () => {
    const kaAdmin = await Admin.findOne({ organizationId: offices.ka });
    const asKa = app.call(sign(kaAdmin._id));
    const rules = await asKa('POST', '/me/bsg/notices', { kind: 'rules', title: 'Uniform rules', rules: 'Scarf and woggle at every meeting' });
    assert.equal(rules.status, 201, JSON.stringify(rules.body));
    await BsgNotice.updateOne({ _id: rules.body.notice._id }, { $set: { date: new Date('2020-01-01') } });
    const camp = await asKa('POST', '/me/bsg/notices', { kind: 'camp', title: 'State camp', date: new Date().toISOString().slice(0, 10) });
    const member = await NccNssMember.findOne({ userId: kid._id });
    const found = await asKa('GET', `/me/bsg/notices/${camp.body.notice._id}/attendance?search=Notice%20Scout`);
    assert.equal(found.body.found.length, 1);
    // A Kerala scout is outside Karnataka's reach and is dropped.
    const keralaKid = await User.create({ name: 'Kerala Scout', email: `tbn-kk-${STAMP}@example.com`, phone: '9999999999', cardNumber: `TBNK${STAMP}`, password: PASS, organizationId: otherSchool._id });
    const keralaMember = await NccNssMember.create({ organizationId: otherSchool._id, userId: keralaKid._id, scheme: 'SCOUTS', status: 'active' });
    const saved = await asKa('PUT', `/me/bsg/notices/${camp.body.notice._id}/attendance`, { presentMemberIds: [String(member._id), String(keralaMember._id)] });
    assert.equal(saved.status, 200);
    assert.match(saved.body.message, /1 present/);
    const mine = await app.call(sign(kid._id))('GET', '/student/nccnss');
    assert.equal(mine.body.bsgNotices.find((n) => n.title === 'State camp').attended, true);
    assert.ok(mine.body.bsgNotices.some((n) => n.title === 'Uniform rules'));
    assert.ok(!('presentMemberIds' in mine.body.bsgNotices[0]));
    await NccNssMember.deleteOne({ _id: keralaMember._id });
    await User.deleteOne({ _id: keralaKid._id });
});
