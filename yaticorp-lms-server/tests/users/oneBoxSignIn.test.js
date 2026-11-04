/**
 * One sign-in box (2026-10-30): the student types their card number or their
 * mobile number, with the password, and lands on their own side — a student's
 * dashboard or a teacher's. A mobile number matches however it was saved; when
 * several accounts share it (a parent's phone), the password says whose it is,
 * and two with the same password are asked for the card instead. Older apps
 * still send { cardNumber }.
 */
// No real email: the set-password code is read from what would have been sent.
const sent = [];
require('../../src/utils/emailService').sendEmail = async (msg) => { sent.push(msg); };
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { connect, makeUser, cleanup } = require('../helpers');
const User = require('../../src/models/User');
const { Teacher } = require('../../src/teacher/models');

const STAMP = String(Date.now()).slice(-8);
// Numbers no other test account uses.
const PHONE_A = `7${STAMP}1`;          // one student
const PHONE_SHARED = `6${STAMP}2`;     // two siblings, different passwords
const PHONE_SAME = `6${STAMP}3`;       // two accounts, the same password
const PHONE_T = `8${STAMP}4`;          // a teacher
let app, server, a, sib1, sib2, same1, same2, teacher, leader, org, orgTeacher, mentor;
const PHONE_ORG = `8${STAMP}5`;       // a teacher an organization added, no card
const PHONE_NEW = `8${STAMP}6`;       // one added with no password yet

const call = (path, body) => fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Device-Id': `test-${STAMP}`, 'User-Agent': 'Mozilla/5.0 (Macintosh)' }, body: JSON.stringify(body)
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
const student = (body) => call('/api/auth/student/login', body);
const asTeacher = (body) => call('/api/teacher/auth/login', body);
const setPass = (u, p) => User.findById(u._id).then((d) => { d.password = p; return d.save({ validateBeforeSave: false }); });

before(async () => {
    await connect();
    a = await makeUser('OneBoxA'); sib1 = await makeUser('OneBoxSib1'); sib2 = await makeUser('OneBoxSib2');
    same1 = await makeUser('OneBoxSame1'); same2 = await makeUser('OneBoxSame2');
    // Real cards: twelve digits (the helper's IT… test cards are not).
    await User.updateOne({ _id: a.user._id }, { $set: { phone: PHONE_A, cardNumber: `98${STAMP}01` } });
    a.user.cardNumber = `98${STAMP}01`;
    await User.updateOne({ _id: sib1.user._id }, { $set: { phone: PHONE_SHARED } });
    await User.updateOne({ _id: sib2.user._id }, { $set: { phone: `+91 ${PHONE_SHARED.slice(0, 5)} ${PHONE_SHARED.slice(5)}` } });
    await setPass(sib2.user, 'Sibling-Two1!');
    await User.updateMany({ _id: { $in: [same1.user._id, same2.user._id] } }, { $set: { phone: PHONE_SAME } });
    teacher = await Teacher.create({ name: 'Dr. One Box', email: `onebox-${STAMP}@example.edu`, phone: `+91 ${PHONE_T}`, cardNumber: `97${STAMP}02`, password: 'Teach-Pass1!' });
    // A club leader: a teacher with no card, who signs in with their email.
    leader = await Teacher.create({ name: 'Club Leader', email: `onebox-leader-${STAMP}@example.edu`, phone: '9999999999', password: 'Teach-Pass1!' });
    org = await require('../../src/organizations/models/Organization').create({ orgCode: `OB-${STAMP}`, name: `One Box College ${STAMP}`, organizationType: 'college', email: `onebox-org-${STAMP}@example.com`, status: 'active' });
    orgTeacher = await Teacher.create({ name: 'Geeta Rao', email: `onebox-org-t-${STAMP}@example.edu`, phone: PHONE_ORG, password: 'Org-Pass1!', organizationId: org._id, createdBy: 'organization' });
    app = express(); app.use(express.json());
    app.use('/api/auth', require('../../src/routes/authRoutes'));
    app.use('/api/teacher', require('../../src/teacher'));
    server = app.listen(0);
});
after(async () => {
    await Teacher.deleteMany({ _id: { $in: [teacher._id, leader._id, orgTeacher._id, mentor?._id].filter(Boolean) } });
    await require('../../src/organizations/models/Organization').deleteOne({ _id: org._id });
    await cleanup([a.user, sib1.user, sib2.user, same1.user, same2.user], server);
});

describe('one box: card or mobile number', () => {
    test('a student signs in with their card number', async () => {
        const r = await student({ login: a.user.cardNumber, password: 'Passw0rd!x' });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.role, 'student');
        assert.equal(String(r.body._id), String(a.user._id));
    });

    test('…or with their mobile number, typed any way', async () => {
        for (const typed of [PHONE_A, `+91 ${PHONE_A}`, `0${PHONE_A}`, `${PHONE_A.slice(0, 5)}-${PHONE_A.slice(5)}`]) {
            const r = await student({ login: typed, password: 'Passw0rd!x' });
            assert.equal(r.status, 200, `${typed}: ${JSON.stringify(r.body)}`);
            assert.equal(String(r.body._id), String(a.user._id));
        }
    });

    test('siblings on one phone each get their own account by their own password', async () => {
        const one = await student({ login: PHONE_SHARED, password: 'Passw0rd!x' });
        const two = await student({ login: PHONE_SHARED, password: 'Sibling-Two1!' });
        assert.equal(String(one.body._id), String(sib1.user._id));
        assert.equal(String(two.body._id), String(sib2.user._id));
    });

    test('two accounts with the same number and password are asked for the card', async () => {
        const r = await student({ login: PHONE_SAME, password: 'Passw0rd!x' });
        assert.equal(r.status, 409);
        assert.equal(r.body.code, 'PHONE_SHARED');
        assert.match(r.body.message, /card number/);
    });

    test('a wrong password or an unknown number says which', async () => {
        assert.equal((await student({ login: PHONE_A, password: 'nope' })).body.code, 'WRONG_PASSWORD');
        assert.equal((await student({ login: `5${STAMP}9`, password: 'Passw0rd!x' })).body.code, 'NO_ACCOUNT');
    });

    test('older apps sending { cardNumber } still sign in', async () => {
        const r = await student({ cardNumber: a.user.cardNumber, password: 'Passw0rd!x' });
        assert.equal(r.status, 200);
    });
});

describe('one box: a teacher lands on the teacher side', () => {
    test("a teacher's card or number at the student sign-in is handed over", async () => {
        assert.equal((await student({ login: teacher.cardNumber, password: 'Teach-Pass1!' })).body.code, 'TEACHER_CARD');
        assert.equal((await student({ login: PHONE_T, password: 'Teach-Pass1!' })).body.code, 'TEACHER_ACCOUNT');
        // Nobody signs in by email (2026-10-31).
        assert.equal((await student({ login: teacher.email, password: 'Teach-Pass1!' })).body.code, 'USE_CARD_OR_PHONE');
    });

    test('and the teacher sign-in takes the card or the mobile number, never the email', async () => {
        for (const typed of [teacher.cardNumber, PHONE_T, `+91 ${PHONE_T}`]) {
            const r = await asTeacher({ login: typed, password: 'Teach-Pass1!' });
            assert.equal(r.status, 200, `${typed}: ${JSON.stringify(r.body)}`);
            assert.equal(String(r.body._id), String(teacher._id));
            assert.ok(r.body.token);
        }
        assert.equal((await asTeacher({ login: PHONE_T, password: 'wrong' })).body.code, 'WRONG_PASSWORD');
        // A teacher without a card: not their email; their mobile number (tested below).
        const byEmail = await asTeacher({ login: leader.email, password: 'Teach-Pass1!' });
        assert.equal(byEmail.status, 401);
        assert.equal(byEmail.body.code, 'USE_CARD_OR_PHONE');
    });
});

describe('a teacher without a card, added by their organization', () => {
    const check = (phone) => call('/api/teacher/auth/org-check', { phone });

    test('the sign-up check finds them by the mobile number, first name and organization only', async () => {
        const r = await check(`+91 ${PHONE_ORG}`);
        assert.equal(r.status, 200);
        assert.deepEqual(r.body, { verified: true, teachers: [{ firstName: 'Geeta', organization: `One Box College ${STAMP}`, active: true, needsPassword: false }] });
        assert.equal((await check(`5${STAMP}0`)).body.code, 'NOT_ADDED');
        // A teacher with a card is not "added by the organization" here.
        assert.equal((await check(PHONE_T)).body.code, 'NOT_ADDED');
    });

    test('then signs in with that mobile number and the password, and lands on the teacher side', async () => {
        assert.equal((await student({ login: PHONE_ORG, password: 'Org-Pass1!' })).body.code, 'TEACHER_ACCOUNT');
        const r = await asTeacher({ login: PHONE_ORG, password: 'Org-Pass1!' });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(String(r.body._id), String(orgTeacher._id));
        assert.ok(r.body.token);
    });
});


describe('added with name and mobile number only: they set up their own account', () => {
    const post = (path, body) => call(`/api/teacher/auth/org-check${path}`, body);

    test('cannot sign in until it is set up', async () => {
        mentor = await require('../../src/teacher/accounts').createActivityTeacher({ name: 'Ravi Kumar', phone: PHONE_NEW }, { organizationId: org._id });
        assert.equal(mentor.passwordPending, true);
        assert.equal(mentor.email, undefined, 'no email from the organization');
        assert.equal((await student({ login: PHONE_NEW, password: 'Anything-1!' })).body.code, 'PASSWORD_NOT_SET');
        assert.equal((await asTeacher({ login: PHONE_NEW, password: 'Anything-1!' })).body.code, 'PASSWORD_NOT_SET');
    });

    test('"Is this you?": the check gives their name and number while it waits', async () => {
        const r = await post('', { phone: `+91 ${PHONE_NEW}` });
        assert.equal(r.status, 200);
        assert.deepEqual(r.body.teachers, [{ firstName: 'Ravi', organization: `One Box College ${STAMP}`, active: true, needsPassword: true, id: String(mentor._id), name: 'Ravi Kumar', phone: PHONE_NEW }]);
    });

    test('a password, then their email and details, and they are in', async () => {
        const base = { phone: PHONE_NEW, teacherId: String(mentor._id), password: 'Mentor-Pass1!', email: `onebox-new-${STAMP}@example.edu`, designation: 'Assistant Professor', department: 'Commerce' };
        assert.equal((await post('/setup', { ...base, password: 'weak' })).body.field, 'password');
        assert.equal((await post('/setup', { ...base, email: 'not-an-email' })).body.field, 'email');
        assert.equal((await post('/setup', { ...base, email: teacher.email })).body.code, 'EMAIL_TAKEN');
        const done = await post('/setup', base);
        assert.equal(done.status, 200, JSON.stringify(done.body));
        assert.ok(done.body.token);
        assert.equal(done.body.email, base.email);
        assert.equal(done.body.designation, 'Assistant Professor');
        assert.equal(done.body.research, false);
        const fresh = await Teacher.findById(mentor._id).lean();
        assert.equal(fresh.passwordPending, false);
        assert.equal(fresh.department, 'Commerce');
    });

    test('then signs in every day with the mobile number; the set-up cannot be done again', async () => {
        const r = await asTeacher({ login: PHONE_NEW, password: 'Mentor-Pass1!' });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(String(r.body._id), String(mentor._id));
        const check = await post('', { phone: PHONE_NEW });
        assert.equal(check.body.teachers[0].needsPassword, false);
        assert.equal(check.body.teachers[0].name, undefined, 'the full name only while it waits');
        assert.equal((await post('/setup', { phone: PHONE_NEW, password: 'Other-Pass1!', email: `x-${STAMP}@example.edu` })).body.code, 'NOT_PENDING');
    });

    test('several teachers without an email can be added', async () => {
        const accounts = require('../../src/teacher/accounts');
        const two = await accounts.createActivityTeacher({ name: 'No Mail Two', phone: `8${STAMP}7` }, { organizationId: org._id });
        const three = await accounts.createActivityTeacher({ name: 'No Mail Three', phone: `8${STAMP}8` }, { organizationId: org._id });
        assert.ok(two._id && three._id);
        await Teacher.deleteMany({ _id: { $in: [two._id, three._id] } });
    });
});

describe('the organization turns Scouts & Guides and 360 on or off for each teacher', () => {
    const jwt = require('jsonwebtoken');
    const Admin = require('../../src/models/Admin');
    let orgAdmin;
    const asOrg = (method, path, body) => fetch(`http://127.0.0.1:${server.address().port}/api/organizations/me/teachers${path}`, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({ id: String(orgAdmin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' })}` }, body: body ? JSON.stringify(body) : undefined
    }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
    const signIn = () => asTeacher({ login: PHONE_NEW, password: 'Mentor-Pass1!' });
    const asMentor = async (path) => {
        const tok = (await signIn()).body.token;
        return fetch(`http://127.0.0.1:${server.address().port}/api/teacher${path}`, { headers: { Authorization: `Bearer ${tok}` } }).then((r) => r.status);
    };

    before(async () => {
        app.use('/api/organizations', require('../../src/organizations'));
        orgAdmin = await Admin.create({ name: 'OneBox Org', email: `onebox-orgadmin-${STAMP}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
        await Teacher.updateOne({ _id: mentor._id }, { $set: { passwordPending: false, password: await Teacher.hashPassword('Mentor-Pass1!') } });
    });
    after(async () => {
        await require('../helpers').forgetAudit({ orgs: [org._id], admins: [orgAdmin._id] });
        await Admin.deleteOne({ _id: orgAdmin._id });
    });

    test('both on: both in the dashboard', async () => {
        const row = (await asOrg('GET', '')).body.teachers.find((t) => String(t._id) === String(mentor._id));
        assert.deepEqual(row.features, { scouts: true, mentor360: true });
        const me = (await signIn()).body;
        assert.equal(me.scouts, true);
        assert.equal(me.mentor360, true);
        assert.equal(await asMentor('/360'), 200);
        assert.equal(await asMentor('/scout-units'), 200);
    });

    test('one off: only the other is open', async () => {
        const r = await asOrg('PUT', `/${mentor._id}/features`, { scouts: false });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.deepEqual(r.body.features, { scouts: false, mentor360: true });
        assert.match(r.body.message, /Scouts & Guides is off/);
        assert.equal((await signIn()).body.scouts, false);
        assert.equal(await asMentor('/scout-units'), 403);
        assert.equal(await asMentor('/360'), 200);
        await asOrg('PUT', `/${mentor._id}/features`, { scouts: true, mentor360: false });
        assert.equal(await asMentor('/360'), 403);
        assert.equal(await asMentor('/scout-units'), 200);
        assert.equal((await asOrg('PUT', `/${mentor._id}/features`, {})).status, 400);
    });
});
