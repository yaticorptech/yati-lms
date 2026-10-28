/**
 * A teacher without an AI card (src/teacher/accounts.js createActivityTeacher):
 * the organization adds them for its clubs and Scouts units, they sign in with
 * email, and reach only their clubs, units and profile — the research side is
 * refused. Several such teachers can exist at once (cardNumber is unique only
 * where there is one), and a carded teacher never signs in by email.
 */
require('../../src/utils/emailService').sendEmail = async () => {};
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connect, startApp } = require('../helpers');
const Admin = require('../../src/models/Admin');
const Organization = require('../../src/organizations/models/Organization');
const { Teacher } = require('../../src/teacher/models');
const { ScoutUnit } = require('../../src/nccnss/models');
const Card = require('../../src/models/Card');

const STAMP = `${Date.now()}`.slice(-7);
const PASS = 'Leader-Pass1!';
let orgApp, teacherApp, org, admin, carded, asOrg;

before(async () => {
    await connect();
    orgApp = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    teacherApp = startApp({ mount: '/api/teacher', router: require('../../src/teacher') });
    org = await Organization.create({ orgCode: `TNC-${STAMP}`, name: `No Card School ${STAMP}`, organizationType: 'school', email: `tnc-${STAMP}@example.com`, status: 'active' });
    admin = await Admin.create({ name: 'NC Admin', email: `tnc-admin-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
    carded = await Teacher.create({ name: 'Carded', email: `tnc-carded-${STAMP}@example.com`, phone: '9999999999', cardNumber: `91${STAMP}000`, password: PASS, organizationId: org._id });
    asOrg = orgApp.call(jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }));
});

after(async () => {
    await Promise.all([
        Teacher.deleteMany({ organizationId: org._id }),
        ScoutUnit.deleteMany({ organizationId: org._id }),
        Card.deleteMany({ qrCodeNumber: `TNCQR${STAMP}` }),
        Admin.deleteOne({ _id: admin._id }),
        Organization.deleteOne({ _id: org._id })
    ]);
    await new Promise((r) => orgApp.server.close(r));
    await new Promise((r) => teacherApp.server.close(r));
    await mongoose.disconnect();
});

const add = (n) => asOrg('POST', '/me/teachers', { access: { teacher: true, research: false }, name: `Leader ${n}`, email: `tnc-leader${n}-${STAMP}@example.com`, phone: '9876543210', password: PASS });

test('an organization adds two teachers without a card', async () => {
    const one = await add(1);
    assert.equal(one.status, 201, JSON.stringify(one.body));
    assert.equal((await add(2)).status, 201);
    const t = await Teacher.findById(one.body._id).lean();
    assert.equal(t.cardNumber, undefined);
    assert.equal(String(t.organizationId), String(org._id));
});

test('a card-less teacher signs in with email and reaches only clubs and units', async () => {
    const login = await teacherApp.call(null)('POST', '/auth/login', { email: `TNC-LEADER1-${STAMP}@example.com`, password: PASS });
    assert.equal(login.status, 200);
    assert.equal(login.body.research, false);
    const asLeader = teacherApp.call(login.body.token);
    assert.equal((await asLeader('GET', '/me')).status, 200);
    assert.equal((await asLeader('GET', '/scout-units')).status, 200);
    assert.equal((await asLeader('GET', '/clubs')).status, 200);
    assert.equal((await asLeader('GET', '/overview')).status, 403);
    assert.equal((await asLeader('GET', '/projects')).status, 403);
    assert.equal((await asLeader('GET', '/plagiarism/reports')).status, 403);
    assert.equal((await teacherApp.call(null)('POST', '/auth/login', { email: `tnc-leader1-${STAMP}@example.com`, password: 'wrong' })).status, 401);
});

test('a carded teacher keeps the research side and never signs in by email', async () => {
    assert.equal((await teacherApp.call(null)('POST', '/auth/login', { email: carded.email, password: PASS })).status, 401);
    const login = await teacherApp.call(null)('POST', '/auth/login', { cardNumber: carded.cardNumber, password: PASS });
    assert.equal(login.status, 200);
    assert.equal(login.body.research, true);
    assert.equal((await teacherApp.call(login.body.token)('GET', '/overview')).status, 200);
});

test('the teachers list says who has a card and what each leads', async () => {
    const leader = await Teacher.findOne({ email: `tnc-leader1-${STAMP}@example.com` });
    await ScoutUnit.create({ organizationId: org._id, name: 'NC Troop', section: 'scouts', leaderTeacherIds: [leader._id] });
    const list = await asOrg('GET', '/me/teachers');
    const row = list.body.teachers.find((t) => String(t._id) === String(leader._id));
    assert.equal(row.research, false);
    assert.deepEqual(row.leads, [{ kind: 'unit', name: 'NC Troop', section: 'Scouts' }]);
    assert.equal(list.body.teachers.find((t) => String(t._id) === String(carded._id)).research, true);
});

test('the organization gives a card-less teacher an AI card later', async () => {
    const leader = await Teacher.findOne({ email: `tnc-leader2-${STAMP}@example.com` });
    const card = await Card.create({ CardNumber: `92${STAMP}000`, CVV: 'AB1CD', qrCodeNumber: `TNCQR${STAMP}`, status: 'unactivated', verified: true });
    const body = { CardNumber: card.CardNumber, CVV: card.CVV, qrCodeNumber: card.qrCodeNumber };
    assert.equal((await asOrg('PUT', `/me/teachers/${leader._id}/card`, { ...body, CVV: 'WRONG' })).status, 400);
    const given = await asOrg('PUT', `/me/teachers/${leader._id}/card`, body);
    assert.equal(given.status, 200, JSON.stringify(given.body));
    assert.equal((await Card.findById(card._id)).status, 'used');
    // A second card for the same teacher is refused.
    assert.equal((await asOrg('PUT', `/me/teachers/${leader._id}/card`, body)).status, 400);
    assert.equal((await teacherApp.call(null)('POST', '/auth/login', { email: leader.email, password: PASS })).status, 401);
    const login = await teacherApp.call(null)('POST', '/auth/login', { cardNumber: card.CardNumber, password: PASS });
    assert.equal(login.status, 200);
    assert.equal(login.body.research, true);
    assert.equal((await teacherApp.call(login.body.token)('GET', '/overview')).status, 200);
});

test('a removed teacher added again comes back with the same account', async () => {
    const leader = await Teacher.findOne({ email: `tnc-leader1-${STAMP}@example.com` });
    assert.equal((await asOrg('DELETE', `/me/teachers/${leader._id}`)).status, 200);
    const again = await add(1);
    assert.equal(again.status, 201, JSON.stringify(again.body));
    assert.equal(again.body.rejoined, true);
    assert.equal(String(again.body._id), String(leader._id));
    assert.equal(String((await Teacher.findById(leader._id)).organizationId), String(org._id));
    // Already back: a second add says so.
    assert.equal((await add(1)).status, 400);
});

test('the admin sign-in sends a teacher to the LMS, only with their right password', async () => {
    const authApp = startApp({ mount: '/api/auth', router: require('../../src/routes/authRoutes') });
    try {
        const right = await authApp.call(null)('POST', '/admin/login', { email: `tnc-leader1-${STAMP}@example.com`, password: PASS });
        assert.equal(right.status, 401);
        assert.equal(right.body.code, 'TEACHER_ACCOUNT');
        assert.match(right.body.message, /choose Teacher, then Email/);
        const wrong = await authApp.call(null)('POST', '/admin/login', { email: `tnc-leader1-${STAMP}@example.com`, password: 'Wrong-Pass1!' });
        assert.equal(wrong.body.message, 'Invalid email or password');
    } finally { await new Promise((r) => authApp.server.close(r)); }
});
