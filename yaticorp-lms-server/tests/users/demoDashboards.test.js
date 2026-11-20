/**
 * A demo card's dashboards (services/demoDashboards.js, routes/demoDashboardRoutes.js): its
 * switch pass opens the card's student, its demo teacher and the demo organisation — from inside
 * any of them — and nothing but a demo card's pass does. Every demo account belongs to the demo
 * organisation.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { DEMO_CARDS } = require('../../src/services/fullAccess');
const { normaliseCardNumber } = require('../../src/utils/cardNumber');
const dashboards = require('../../src/services/demoDashboards');
const { Teacher } = require('../../src/teacher/models');
const Admin = require('../../src/models/Admin');
const User = require('../../src/models/User');
const Organization = require('../../src/organizations/models/Organization');

let app, demo, plain, card, pass, hadOrganization, hadAdmin, chosenBefore;

before(async () => {
    await connect();
    // The built-in demo organisation, whatever this database holds: no organisation has this ID.
    chosenBefore = process.env.DEMO_ORG_CODE;
    process.env.DEMO_ORG_CODE = 'no_such_organisation_for_tests';
    const built = await Organization.findOne({ orgCode: dashboards.DEMO_ORG_CODE }).select('_id').lean();
    hadOrganization = Boolean(built);
    hadAdmin = built ? Boolean(await Admin.exists({ organizationId: built._id })) : false;
    app = startApp({ mount: '/api/auth/demo', router: require('../../src/routes/demoDashboardRoutes') });
    demo = await makeUser('Demo Dash');
    plain = await makeUser('Plain Dash');
    // A real card is all digits; the test account's ("IT…") is given its digits, as a demo card has.
    card = normaliseCardNumber(demo.user.cardNumber);
    await User.updateOne({ _id: demo.user._id }, { $set: { cardNumber: card } });
    DEMO_CARDS.add(card);
    pass = dashboards.switchPass(card);
});

after(async () => {
    DEMO_CARDS.delete(card);
    if (chosenBefore === undefined) delete process.env.DEMO_ORG_CODE; else process.env.DEMO_ORG_CODE = chosenBefore;
    await Teacher.deleteMany({ demoCard: card });
    const organization = await Organization.findOne({ orgCode: dashboards.DEMO_ORG_CODE }).select('_id').lean();
    if (organization && !hadAdmin) await Admin.deleteMany({ organizationId: organization._id });
    if (organization && !hadOrganization) {
        await require('../../src/organizations/models/OrgAuditLog').deleteMany({ orgId: organization._id }).catch(() => {});
        await Organization.deleteOne({ _id: organization._id });
    }
    await cleanup([demo.user, plain.user], app.server);
});

const open = (dashboard, token = pass) => app.call()('POST', '/open', { token, dashboard });

test('the switch pass opens the card as a student, in the demo organisation', async () => {
    const res = await open('student');
    assert.equal(res.status, 200);
    assert.equal(res.body.role, 'student');
    assert.equal(String(res.body._id), String(demo.user._id));
    assert.equal(res.body.demo, true);
    assert.equal(dashboards.cardForSwitch(res.body.demoSwitch), card, 'a fresh pass comes with it');
    const organization = await Organization.findOne({ orgCode: dashboards.DEMO_ORG_CODE });
    assert.equal(String((await User.findById(demo.user._id)).organizationId), String(organization._id), 'the demo student joined the demo organisation');
    for (const k of ['website', 'address', 'state', 'contactPerson', 'phone']) assert.ok(organization[k], `the built-in organisation has its ${k}`);
});

test('…as its own demo teacher, with the research tools, in the same organisation', async () => {
    const first = await open('teacher');
    assert.equal(first.status, 200);
    assert.equal(first.body.role, 'teacher');
    assert.equal(first.body.research, true, 'research without an AI card of its own');
    assert.equal(first.body.mentor360, true);
    assert.equal(jwt.verify(first.body.token, process.env.JWT_SECRET).role, 'teacher');
    assert.equal(dashboards.cardForSwitch(first.body.demoSwitch), card);
    const teacher = await Teacher.findOne({ demoCard: card });
    assert.equal(String(teacher._id), String(first.body._id));
    assert.equal(String(teacher.organizationId), String((await User.findById(demo.user._id)).organizationId));
    assert.equal(String((await open('teacher')).body._id), String(first.body._id), 'the same teacher the next time');
});

test('the demo teacher works as a head of department: the HOD tasks show', async () => {
    const teacherApp = startApp({ mount: '/api/teacher', router: require('../../src/teacher') });
    try {
        const session = (await open('teacher')).body;
        const mine = await teacherApp.call(session.token)('GET', '/campus');
        assert.equal(mine.status, 200);
        assert.equal(mine.body.hodOf.length, 1, 'one department to head');
        // As its head: the department's own pages answer.
        const subjects = await teacherApp.call(session.token)('GET', `/campus/hod/subjects?departmentId=${mine.body.hodOf[0]._id}`);
        assert.equal(subjects.status, 200);
        assert.equal((await Teacher.findById(session._id)).designation, 'HOD');
        // The department's own head is untouched: nothing was written to it.
        const organization = await Organization.findOne({ orgCode: dashboards.DEMO_ORG_CODE }).select('+campus').lean();
        assert.equal(organization.campus.departments.length, 1, 'one department, however often the organisation is opened');
        const dept = organization.campus.departments.find((d) => String(d._id) === String(mine.body.hodOf[0]._id));
        assert.notEqual(String(dept.headId || ''), String(session._id));
    } finally { teacherApp.server.close(); }
});

test('…and as the demo organisation, through a pass the admin app trades', async () => {
    const handed = await open('organization');
    assert.equal(handed.status, 200);
    assert.equal(handed.body.organization.orgCode, dashboards.DEMO_ORG_CODE);
    assert.equal(jwt.verify(handed.body.code, process.env.JWT_SECRET).id, undefined, 'the pass is not a session');
    const session = await app.call()('POST', '/organization/exchange', { code: handed.body.code });
    assert.equal(session.status, 200);
    assert.equal(session.body.role, 'orgadmin');
    assert.equal(session.body.organizationStatus, 'active');
    assert.equal(dashboards.cardForSwitch(session.body.demoSwitch), card, 'the panel can change back to the card’s other dashboards');
    const admin = await Admin.findById(jwt.verify(session.body.token, process.env.JWT_SECRET).id);
    assert.equal(String(admin.organizationId), session.body.organizationId);
    // Anything else is not a pass: a student's session, the switch pass, or nonsense.
    for (const code of [demo.token, pass, 'nope']) assert.equal((await app.call()('POST', '/organization/exchange', { code })).status, 410);
});

test('nothing but a demo card’s switch pass opens anything', async () => {
    assert.equal((await open('teacher', dashboards.switchPass(plain.user.cardNumber))).status, 410, 'an ordinary card');
    assert.equal((await open('student', demo.token)).status, 410, 'a session is not a pass');
    assert.equal((await open('student', '')).status, 410);
    assert.equal((await open('parent')).status, 400, 'not built yet');
});

test('a reset takes the demo teacher with it; the next open makes a new one', async () => {
    const before = await Teacher.findOne({ demoCard: card }).select('_id').lean();
    await dashboards.resetTeacher(card);
    assert.equal(await Teacher.exists({ demoCard: card }), null);
    const next = await open('teacher');
    assert.equal(next.status, 200);
    assert.notEqual(String(next.body._id), String(before._id));
});
