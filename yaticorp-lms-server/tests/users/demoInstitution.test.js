/**
 * The demo cards see Institution, Student Ranking (360) and Extra Curricular without being in an organization
 * (src/services/demoInstitution.js, 2026-11-18): they count as students of YATICORPX3 Institution. A plain card in
 * no organization still sees none of the three.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeUser, startApp, cleanup } = require('../helpers');
const { DEMO_CARDS } = require('../../src/services/fullAccess');
const { normaliseCardNumber } = require('../../src/utils/cardNumber');
const User = require('../../src/models/User');

let org, user, demo, plain, demoCard;

before(async () => {
    await connect();
    org = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    user = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });
    demo = await makeUser('Demo Card');
    plain = await makeUser('Plain Card');
    demoCard = normaliseCardNumber(demo.user.cardNumber);
    DEMO_CARDS.add(demoCard);
});

after(async () => {
    DEMO_CARDS.delete(demoCard);
    const { NccNssMember } = require('../../src/nccnss/models');
    await NccNssMember.deleteMany({ userId: { $in: [demo.user._id, plain.user._id] } });
    await cleanup([demo.user, plain.user], org.server);
    user.server.close();
});

test('a demo card has the Institution dashboard, admitted, with attendance and marks', async () => {
    const me = await org.call(demo.token)('GET', '/student/campus/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.available, true);
    assert.equal(me.body.admitted, true);
    assert.equal(me.body.institution.name, 'YATICORPX3 Institution');
    const dash = await org.call(demo.token)('GET', '/student/campus/dashboard');
    assert.equal(dash.status, 200, JSON.stringify(dash.body).slice(0, 300));
    const saved = await User.findById(demo.user._id).select('organizationId campus').lean();
    assert.equal(saved.organizationId ?? null, null, 'never joined to it');
    assert.ok(saved.campus.attendance.length > 0);
});

test('a demo card has Student Ranking with its activities', async () => {
    const r = await user.call(demo.token)('GET', '/360');
    assert.equal(r.status, 200);
    assert.equal(r.body.enabled, true, JSON.stringify(r.body).slice(0, 300));
    // Four proofs already sent: two accepted (5 + 5 marks), one waiting, one sent back.
    assert.deepEqual(r.body.proofs.map((p) => p.status).sort(), ['approved', 'approved', 'pending', 'rejected']);
    assert.equal(r.body.totals.total, 10);
});

test('a demo card has Extra Curricular, and joining a club needs nobody to confirm', async () => {
    const r = await org.call(demo.token)('GET', '/student/nccnss');
    assert.equal(r.status, 200);
    assert.equal(r.body.organization?.name, 'YATICORPX3 Institution');
    assert.ok(r.body.clubs.length >= 1);
    // Already in Scouts & Guides, from the first visit (2026-11-18).
    const scouts = r.body.memberships.find((m) => m.scheme === 'SCOUTS');
    assert.equal(scouts?.status, 'active');
    assert.equal(scouts?.unit, '1st YATICORPX3 Scout Troop');
    const join = await org.call(demo.token)('POST', '/student/nccnss/join', { scheme: 'CLUB', clubId: r.body.clubs[0]._id });
    assert.equal(join.status, 201, JSON.stringify(join.body));
    const again = await org.call(demo.token)('GET', '/student/nccnss');
    assert.equal(again.body.memberships.find((m) => m.scheme === 'CLUB')?.status, 'active');
});

test('a plain card in no organization sees none of the three', async () => {
    assert.equal((await org.call(plain.token)('GET', '/student/campus/me')).body.available, false);
    assert.equal((await user.call(plain.token)('GET', '/360')).body.enabled, false);
    assert.equal((await org.call(plain.token)('GET', '/student/nccnss')).body.organization, null);
});
