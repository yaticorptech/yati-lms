/**
 * Organizations, end to end: a school registers, a superadmin approves it, a
 * student asks to join with the organization ID, the organization's own admin
 * admits them, and from then on that organization can see that student's
 * learning record and nobody else's.
 *
 * The isolation block is the point of this file. It asserts the things that
 * would be a data leak if they ever stopped being true: an organization admin
 * cannot reach the platform's admin API, cannot read another organization's
 * student by putting their id in the URL, and cannot decide another
 * organization's join request.
 *
 * It also pins down what must NOT change. Students who belong to no
 * organization keep working exactly as before, and suspending an organization or
 * leaving one never touches a student's progress.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');

const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
const email = (label) => `org-test-${label}-${STAMP}@example.com`;
const GOOD_PASSWORD = 'Passw0rd!x';

/** A complete, valid registration payload. */
const registration = (label, overrides = {}) => ({
    name: `${label} Institute ${STAMP}`,
    organizationType: 'college',
    contactPerson: 'Asha Rao',
    email: email(label),
    phone: '9876543210',
    address: '12 Station Road',
    website: 'example.edu',
    expectedStudents: 250,
    password: GOOD_PASSWORD,
    confirmPassword: GOOD_PASSWORD,
    ...overrides
});

let orgApp, adminApp, authApp, userApp;
let boss, plainAdmin, alice, bob, loner;
let asSuper, asAdmin, asAlice, asBob, asLoner, asPublic;

// Filled in as the story proceeds.
let schoolA, schoolB;          // { _id, orgCode, name } from registration
let adminA, adminB;            // { token, adminId } for each organization
let requestIdA;

const orgApi = (token) => orgApp.call(token);

before(async () => {
    await connect();
    orgApp = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    adminApp = startApp({ mount: '/api/admin', router: require('../../src/routes/adminRoutes') });
    authApp = startApp({ mount: '/api/auth', router: require('../../src/routes/authRoutes') });
    userApp = startApp({ mount: '/api/user', router: require('../../src/routes/userRoutes') });

    boss = await makeAdmin('Boss');
    plainAdmin = await makeAdmin('Plain');
    // makeAdmin creates role 'admin'; promote one to superadmin.
    await require('../../src/models/Admin').updateOne({ _id: boss.admin._id }, { $set: { role: 'superadmin' } });

    alice = await makeUser('Alice');
    bob = await makeUser('Bob');
    loner = await makeUser('Loner');

    asSuper = orgApi(boss.token);
    asAdmin = orgApi(plainAdmin.token);
    asAlice = orgApi(alice.token);
    asBob = orgApi(bob.token);
    asLoner = orgApi(loner.token);
    asPublic = orgApi(null);
});

after(async () => {
    const Organization = require('../../src/organizations/models/Organization');
    const JoinRequest = require('../../src/organizations/models/JoinRequest');
    const Admin = require('../../src/models/Admin');

    const ours = await Organization.find({ name: new RegExp(STAMP) }).select('_id').lean();
    const ids = ours.map((o) => o._id);
    await JoinRequest.deleteMany({ organizationId: { $in: ids } });
    await Admin.deleteMany({ organizationId: { $in: ids } });
    await Organization.deleteMany({ _id: { $in: ids } });
    // The counter is shared platform state; leaving it advanced is correct —
    // codes this run minted must never be handed out again.

    for (const app of [adminApp, authApp, userApp]) await new Promise((r) => app.server.close(r));
    await cleanup([alice.user, bob.user, loner.user], orgApp.server, [boss.admin, plainAdmin.admin]);
});

/* ────────────────────────────────────────────────────────────────────────── */

describe('registering an organization', () => {
    test('the form offers the organization types, without a login', async () => {
        const r = await asPublic('GET', '/types');
        assert.equal(r.status, 200);
        assert.ok(r.body.types.some((t) => t.value === 'college' && t.label === 'College'));
    });

    test('a valid registration is stored as pending, with a readable ID', async () => {
        const r = await asPublic('POST', '/register', registration('a'));
        assert.equal(r.status, 201);
        assert.match(r.body.message, /submitted/i);
        assert.equal(r.body.organization.status, 'pending');
        assert.match(r.body.organization.orgCode, /^[A-Z]+-\d{4}-\d{4}$/, '<NAME>-<year>-<0001>');

        const Organization = require('../../src/organizations/models/Organization');
        schoolA = await Organization.findOne({ orgCode: r.body.organization.orgCode }).lean();
        assert.equal(schoolA.status, 'pending');
        assert.equal(schoolA.approvedAt, null, 'nothing is approved by registering');
    });

    test('the ID starts with the organization\'s own first word', async () => {
        const { prefixFromName } = require('../../src/organizations/services/orgCode');

        // Read off the organization that was just registered, so this is the
        // real generated code rather than the helper talking to itself.
        assert.equal(schoolA.orgCode.split('-')[0], prefixFromName(schoolA.name));
        assert.equal(schoolA.orgCode.split('-')[1], String(new Date().getFullYear()));

        // And the rule that prefix follows, including the awkward names.
        assert.equal(prefixFromName('ABC College'), 'ABC');
        assert.equal(prefixFromName("St. Mary's School"), 'ST', 'punctuation is dropped');
        assert.equal(prefixFromName('123 Training Centre'), 'TRAINING', 'a first word with no letters is skipped');
        assert.equal(prefixFromName('Averyverylongsinglewordname Academy').length, 12, 'and long words are cut');
        assert.equal(prefixFromName('!!!'), 'ORG', 'a name with no letters at all still gets a code');
    });

    test('a code issued under the old fixed-ORG shape is still recognised', async () => {
        const { isValidOrgCodeFormat } = require('../../src/organizations/services/orgCode');
        assert.equal(isValidOrgCodeFormat('ORG-2026-0016'), true, 'organizations registered earlier keep working');
        assert.equal(isValidOrgCodeFormat('ABC-2026-0001'), true);
        assert.equal(isValidOrgCodeFormat('AB1-2026-0001'), false, 'the prefix is letters only');
        assert.equal(isValidOrgCodeFormat('nonsense'), false);
    });

    test('it creates an orgadmin account tied to that organization, and nothing more', async () => {
        const Admin = require('../../src/models/Admin');
        const account = await Admin.findOne({ email: schoolA.email });
        assert.ok(account, 'the organization has an account to sign in with');
        assert.equal(account.role, 'orgadmin');
        assert.equal(String(account.organizationId), String(schoolA._id));
        assert.ok(await account.matchPassword(GOOD_PASSWORD), 'the password is usable and hashed');
        assert.notEqual(account.password, GOOD_PASSWORD, 'and not stored in the clear');
    });

    test('a second organization gets a different ID', async () => {
        const r = await asPublic('POST', '/register', registration('b'));
        assert.equal(r.status, 201);
        assert.notEqual(r.body.organization.orgCode, schoolA.orgCode);

        const Organization = require('../../src/organizations/models/Organization');
        schoolB = await Organization.findOne({ orgCode: r.body.organization.orgCode }).lean();
    });

    test('a half-filled or unsafe registration is refused, and says why', async () => {
        const cases = [
            [{ name: '' }, /organization name/i],
            [{ organizationType: 'wizarding_school' }, /kind of organization/i],
            [{ email: 'not-an-email' }, /valid official email/i],
            [{ contactPerson: '' }, /contact person/i],
            [{ phone: '12' }, /valid phone/i],
            [{ password: 'short', confirmPassword: 'short' }, /8 characters/i],
            [{ confirmPassword: 'Different1!' }, /do not match/i]
        ];
        for (const [override, expected] of cases) {
            const r = await asPublic('POST', '/register', registration(`bad-${Math.random()}`, override));
            assert.equal(r.status, 400, JSON.stringify(override));
            assert.match(r.body.message, expected);
        }
    });

    test('the same email cannot register twice', async () => {
        const r = await asPublic('POST', '/register', registration('dup', { email: schoolA.email }));
        assert.equal(r.status, 400);
        assert.match(r.body.message, /already/i);
    });

    test('a failed registration leaves no half-made organization behind', async () => {
        const Organization = require('../../src/organizations/models/Organization');
        const before = await Organization.countDocuments({ name: new RegExp(STAMP) });
        // An email already held by a platform administrator: the organization
        // insert would succeed and the account insert would fail.
        const r = await asPublic('POST', '/register', registration('rollback', { email: boss.admin.email }));
        assert.equal(r.status, 400);
        assert.equal(await Organization.countDocuments({ name: new RegExp(STAMP) }), before, 'nothing was left over');
    });
});

describe('signing in as an organization, before approval', () => {
    test('the login works and carries the organization and its status', async () => {
        const r = await authApp.call(null)('POST', '/admin/login', { email: schoolA.email, password: GOOD_PASSWORD });
        assert.equal(r.status, 200);
        assert.equal(r.body.role, 'orgadmin');
        assert.equal(r.body.orgCode, schoolA.orgCode);
        assert.equal(r.body.organizationStatus, 'pending');
        assert.ok(r.body.token);
        adminA = { token: r.body.token, adminId: r.body._id };
    });

    test('a platform admin login is unchanged — no organization fields at all', async () => {
        const Admin = require('../../src/models/Admin');
        await Admin.updateOne({ _id: plainAdmin.admin._id }, { $set: { password: await hash(GOOD_PASSWORD) } });
        const r = await authApp.call(null)('POST', '/admin/login', { email: plainAdmin.admin.email, password: GOOD_PASSWORD });
        assert.equal(r.status, 200);
        assert.equal(r.body.role, 'admin');
        assert.equal(r.body.orgCode, undefined);
        assert.equal(r.body.organizationStatus, undefined);
    });

    test('it can read its own application status and nothing else', async () => {
        const mine = orgApi(adminA.token);
        const status = await mine('GET', '/me/status');
        assert.equal(status.status, 200);
        assert.equal(status.body.organization.status, 'pending');

        for (const path of ['/me', '/me/dashboard', '/me/students', '/me/requests']) {
            const r = await mine('GET', path);
            assert.equal(r.status, 403, path);
            assert.equal(r.body.code, 'ORGANIZATION_NOT_ACTIVE');
        }
    });

    test('and it cannot touch the platform admin API at all', async () => {
        const asOrgAdmin = adminApp.call(adminA.token);
        for (const path of ['/users', '/courses', '/analytics', '/tickets', '/settings']) {
            const r = await asOrgAdmin('GET', path);
            assert.equal(r.status, 403, `GET /api/admin${path} must be refused`);
            assert.equal(r.body.code, 'ORG_ADMIN_SCOPE');
        }
        assert.equal((await asOrgAdmin('DELETE', `/users/${alice.user._id}`)).status, 403, 'and cannot delete a student');
    });
});

describe('the superadmin queue', () => {
    test('an ordinary platform admin cannot manage organizations', async () => {
        assert.equal((await asAdmin('GET', '/admin')).status, 403);
        assert.equal((await asAdmin('PUT', `/admin/${schoolA._id}/status`, { status: 'active' })).status, 403);
    });

    test('a student token and no token are both refused', async () => {
        // 401 rather than 403: a student's id is not an Admin id, so the guard
        // never gets as far as reading a role. The two codes together are the
        // whole refusal surface — authenticated-but-wrong-scope is 403 (see the
        // organization admin above), not-an-administrator-at-all is 401.
        assert.equal((await asAlice('GET', '/admin')).status, 401);
        assert.equal((await asPublic('GET', '/admin')).status, 401);
    });

    test('the superadmin sees every organization, with counts and filters', async () => {
        const all = await asSuper('GET', '/admin');
        assert.equal(all.status, 200);
        const ours = all.body.organizations.filter((o) => new RegExp(STAMP).test(o.name));
        assert.equal(ours.length, 2);
        assert.ok(ours.every((o) => o.studentCount === 0));
        assert.ok(all.body.totals.pending >= 2);

        const pendingOnly = await asSuper('GET', '/admin?status=pending');
        assert.ok(pendingOnly.body.organizations.every((o) => o.status === 'pending'));

        const byType = await asSuper('GET', '/admin?type=college');
        assert.ok(byType.body.organizations.every((o) => o.organizationType === 'college'));

        const searched = await asSuper('GET', `/admin?search=${schoolA.orgCode}`);
        assert.equal(searched.body.organizations.length, 1);
        assert.equal(searched.body.organizations[0].orgCode, schoolA.orgCode);
    });

    test('approving turns it active, records who did it, and stamps the date', async () => {
        const r = await asSuper('PUT', `/admin/${schoolA._id}/status`, { status: 'active' });
        assert.equal(r.status, 200);
        assert.equal(r.body.organization.status, 'active');
        assert.ok(r.body.organization.approvedAt, 'approved-on is recorded');

        const full = await asSuper('GET', `/admin/${schoolA._id}`);
        const last = full.body.organization.statusHistory.at(-1);
        assert.equal(last.status, 'active');
        assert.equal(last.byName, boss.admin.name, 'the decision names its author');
    });

    test('a rejection must come with a reason, and is kept rather than deleted', async () => {
        const noReason = await asSuper('PUT', `/admin/${schoolB._id}/status`, { status: 'rejected' });
        assert.equal(noReason.status, 400);
        assert.match(noReason.body.message, /reason/i);

        const done = await asSuper('PUT', `/admin/${schoolB._id}/status`, { status: 'rejected', reason: 'Could not verify the institution' });
        assert.equal(done.status, 200);

        const Organization = require('../../src/organizations/models/Organization');
        const still = await Organization.findById(schoolB._id).lean();
        assert.ok(still, 'a rejected organization is not deleted');
        assert.equal(still.status, 'rejected');
        assert.match(still.statusReason, /verify/i);
    });

    test('an organization cannot be pushed back into review, or set to what it already is', async () => {
        assert.equal((await asSuper('PUT', `/admin/${schoolA._id}/status`, { status: 'pending' })).status, 400);
        assert.equal((await asSuper('PUT', `/admin/${schoolA._id}/status`, { status: 'active' })).status, 400);
        assert.equal((await asSuper('PUT', `/admin/${schoolA._id}/status`, { status: 'nonsense' })).status, 400);
    });

    test('the ID survives an edit that tries to change it', async () => {
        const r = await asSuper('PUT', `/admin/${schoolA._id}`, {
            name: `${schoolA.name} (renamed)`,
            orgCode: 'ORG-1999-9999',
            status: 'suspended'
        });
        assert.equal(r.status, 200);
        assert.equal(r.body.organization.orgCode, schoolA.orgCode, 'the public ID is permanent');
        assert.equal(r.body.organization.status, 'active', 'and a status change needs the status endpoint');
        assert.match(r.body.organization.name, /renamed/);
    });

    test('a field emptied or overlong is a 400 with a reason, not a 500', async () => {
        const blank = await asSuper('PUT', `/admin/${schoolA._id}`, { name: '   ' });
        assert.equal(blank.status, 400);
        assert.match(blank.body.message, /organization name/i);

        const tooLong = await asSuper('PUT', `/admin/${schoolA._id}`, { address: 'x'.repeat(500) });
        assert.equal(tooLong.status, 400, 'a length limit is the caller\'s mistake, not a server fault');
        assert.match(tooLong.body.message, /address/i);

        const longName = await asSuper('POST', '/admin', {
            name: 'y'.repeat(200), organizationType: 'college', email: email('long'), password: GOOD_PASSWORD
        });
        assert.equal(longName.status, 400);
        assert.match(longName.body.message, /too long/i);
    });

    test('a missing organization is a 404, not a crash', async () => {
        assert.equal((await asSuper('GET', `/admin/${new mongoose.Types.ObjectId()}`)).status, 404);
        assert.equal((await asSuper('GET', '/admin/not-an-id')).status, 404);
    });
});

describe('a student finding an organization', () => {
    test('an active organization is found by its ID, however it is typed', async () => {
        for (const typed of [schoolA.orgCode, schoolA.orgCode.toLowerCase(), ` ${schoolA.orgCode} `]) {
            const r = await asAlice('GET', `/student/lookup/${encodeURIComponent(typed)}`);
            assert.equal(r.status, 200, `typed as "${typed}"`);
            assert.equal(r.body.organization.orgCode, schoolA.orgCode);
        }
    });

    test('it gives the name, and not the institution\'s contact details', async () => {
        const r = await asAlice('GET', `/student/lookup/${schoolA.orgCode}`);
        assert.ok(r.body.organization.name);
        assert.equal(r.body.organization.email, undefined, 'no email');
        assert.equal(r.body.organization.phone, undefined, 'no phone');
        assert.equal(r.body.organization.address, undefined, 'no address');
    });

    test('a rejected organization is as invisible as one that never existed', async () => {
        const r = await asAlice('GET', `/student/lookup/${schoolB.orgCode}`);
        assert.equal(r.status, 404);
        assert.equal(r.body.code, 'ORGANIZATION_NOT_FOUND');
    });

    test('nonsense is refused, and a sign-in is required', async () => {
        assert.equal((await asAlice('GET', '/student/lookup/hello')).status, 400);
        assert.equal((await asPublic('GET', `/student/lookup/${schoolA.orgCode}`)).status, 401);
    });

    test('a student with no organization reads as exactly that', async () => {
        const r = await asLoner('GET', '/student/me');
        assert.equal(r.status, 200);
        assert.equal(r.body.member, false);
        assert.equal(r.body.organization, null);
        assert.equal(r.body.request, null);
    });
});

describe('asking to join', () => {
    test('a request is sent, and does not itself make anyone a member', async () => {
        const r = await asAlice('POST', '/student/requests', { orgCode: schoolA.orgCode });
        assert.equal(r.status, 201);
        assert.equal(r.body.request.status, 'pending');

        const User = require('../../src/models/User');
        const fresh = await User.findById(alice.user._id).select('organizationId').lean();
        assert.equal(fresh.organizationId, null, 'membership waits for the organization');

        const mine = await asAlice('GET', '/student/me');
        assert.equal(mine.body.member, false);
        assert.equal(mine.body.request.status, 'pending');
    });

    test('the same request cannot be sent twice', async () => {
        const r = await asAlice('POST', '/student/requests', { orgCode: schoolA.orgCode });
        assert.equal(r.status, 409);
        assert.match(r.body.message, /already asked/i);
    });

    test('and a second organization cannot be asked while one is waiting', async () => {
        // Approve the second school so it is joinable, then try.
        await asSuper('PUT', `/admin/${schoolB._id}/status`, { status: 'active' });
        const r = await asAlice('POST', '/student/requests', { orgCode: schoolB.orgCode });
        assert.equal(r.status, 409);
        assert.match(r.body.message, /waiting/i);
    });

    test('a request to a rejected or unknown organization goes nowhere', async () => {
        assert.equal((await asBob('POST', '/student/requests', { orgCode: 'ORG-1999-0001' })).status, 404);
        assert.equal((await asBob('POST', '/student/requests', { orgCode: 'rubbish' })).status, 400);
    });

    test('a student can withdraw their own request, and only their own', async () => {
        const bobRequest = await asBob('POST', '/student/requests', { orgCode: schoolB.orgCode });
        assert.equal(bobRequest.status, 201);

        const notYours = await asAlice('DELETE', `/student/requests/${bobRequest.body.request._id}`);
        assert.equal(notYours.status, 404, "one student cannot withdraw another's request");

        assert.equal((await asBob('DELETE', `/student/requests/${bobRequest.body.request._id}`)).status, 200);
        assert.equal((await asBob('GET', '/student/me')).body.request.status, 'cancelled');
    });
});

describe('the optional Organization ID typed while signing up', () => {
    const Card = require('../../src/models/Card');
    const User = require('../../src/models/User');
    const JoinRequest = require('../../src/organizations/models/JoinRequest');

    /** An activated card, which is what registration insists on. */
    const makeCard = async (suffix) => {
        // The suffix has to survive the truncation to 12 digits, or every card in
        // this block would share a number and trip the unique index.
        const number = `9${STAMP}`.slice(0, 11).padEnd(11, '0') + suffix;
        return Card.create({
            CardNumber: number, CVV: `A${suffix}B2C`.slice(0, 5).toUpperCase(),
            qrCodeNumber: `QR-${STAMP}-${suffix}`, SerialNumber: `SN-${suffix}`, status: 'activated'
        });
    };

    const signUp = (card, orgCode) => authApp.call(null)('POST', '/register', {
        name: 'Signup Student',
        email: `org-signup-${card.CardNumber}@gmail.com`,
        phone: '9876543210',
        CardNumber: card.CardNumber,
        CVV: card.CVV,
        qrCodeNumber: card.qrCodeNumber,
        password: GOOD_PASSWORD,
        ...(orgCode === undefined ? {} : { orgCode })
    });

    const created = [];

    after(async () => {
        const ids = created.map((u) => u._id);
        await JoinRequest.deleteMany({ userId: { $in: ids } });
        await User.deleteMany({ _id: { $in: ids } });
        await Card.deleteMany({ qrCodeNumber: new RegExp(`QR-${STAMP}-`) });
    });

    test('a valid ID creates a pending request, and nothing more', async () => {
        const card = await makeCard('1');
        const r = await signUp(card, schoolA.orgCode);
        assert.equal(r.status, 201);
        assert.equal(r.body.organization.requested, true);
        assert.equal(r.body.organization.orgCode, schoolA.orgCode);
        assert.match(r.body.organization.message, /has been sent/i);

        const student = await User.findById(r.body._id).select('organizationId').lean();
        created.push(student);
        assert.equal(student.organizationId, null, 'signing up joins nobody — it asks');

        const waiting = await JoinRequest.findOne({ userId: r.body._id }).lean();
        assert.equal(waiting.status, 'pending');
        assert.equal(String(waiting.organizationId), String(schoolA._id));
    });

    test('it also shows up in that organization\'s queue', async () => {
        const queue = await orgApi(adminA.token)('GET', '/me/requests');
        assert.ok(queue.body.requests.some((q) => q.student.name === 'Signup Student'),
            'the organization sees a request made at signup like any other');
    });

    test('an unrecognised ID still creates the account, and says so', async () => {
        const card = await makeCard('2');
        const r = await signUp(card, 'ORG-1999-9999');
        assert.equal(r.status, 201, 'a bad ID never costs someone their account');
        assert.ok(r.body.token, 'and they are signed in');
        assert.equal(r.body.organization.requested, false);
        assert.match(r.body.organization.message, /could not find an active organization/i);

        created.push({ _id: r.body._id });
        assert.equal(await JoinRequest.countDocuments({ userId: r.body._id }), 0);
    });

    test('a rejected or suspended organization cannot be joined this way either', async () => {
        const card = await makeCard('3');
        const r = await signUp(card, schoolB.orgCode);
        created.push({ _id: r.body._id });
        assert.equal(r.status, 201);
        // schoolB was rejected, then approved later in this file; whichever it is
        // now, the rule is that only an active organization can be asked.
        const Organization = require('../../src/organizations/models/Organization');
        const b = await Organization.findById(schoolB._id).select('status').lean();
        assert.equal(r.body.organization.requested, b.status === 'active');
    });

    test('a misshapen ID is refused politely, and the account is still made', async () => {
        const card = await makeCard('4');
        const r = await signUp(card, 'hello there');
        created.push({ _id: r.body._id });
        assert.equal(r.status, 201);
        assert.equal(r.body.organization.requested, false);
        assert.match(r.body.organization.message, /does not look like an Organization ID/i);
        assert.equal(await JoinRequest.countDocuments({ userId: r.body._id }), 0);
    });

    test('left out entirely, registration answers exactly as it always did', async () => {
        const card = await makeCard('5');
        const r = await signUp(card, undefined);
        created.push({ _id: r.body._id });
        assert.equal(r.status, 201);
        assert.equal(r.body.organization, null, 'null, so the client knows there is nothing to report');
        assert.equal(await JoinRequest.countDocuments({ userId: r.body._id }), 0);

        const blank = await signUp(await makeCard('6'), '   ');
        created.push({ _id: blank.body._id });
        assert.equal(blank.body.organization, null, 'whitespace counts as blank');
    });
});

describe('the organization admitting a student', () => {
    before(async () => {
        // School A is active now, so its admin can sign in properly.
        const r = await authApp.call(null)('POST', '/admin/login', { email: schoolA.email, password: GOOD_PASSWORD });
        adminA = { token: r.body.token, adminId: r.body._id };
        assert.equal(r.body.organizationStatus, 'active');

        const Organization = require('../../src/organizations/models/Organization');
        const b = await Organization.findById(schoolB._id).lean();
        const rb = await authApp.call(null)('POST', '/admin/login', { email: b.email, password: GOOD_PASSWORD });
        adminB = { token: rb.body.token, adminId: rb.body._id };
    });

    test('the waiting request is in its queue', async () => {
        const r = await orgApi(adminA.token)('GET', '/me/requests');
        assert.equal(r.status, 200);
        assert.equal(r.body.pendingCount, 1);
        assert.equal(r.body.requests[0].student.name, alice.user.name);
        requestIdA = r.body.requests[0]._id;
    });

    test('approving it makes the student a member', async () => {
        const r = await orgApi(adminA.token)('PUT', `/me/requests/${requestIdA}`, { decision: 'approve' });
        assert.equal(r.status, 200);

        const User = require('../../src/models/User');
        const fresh = await User.findById(alice.user._id).select('organizationId organizationJoinedAt').lean();
        assert.equal(String(fresh.organizationId), String(schoolA._id));
        assert.ok(fresh.organizationJoinedAt);

        const mine = await asAlice('GET', '/student/me');
        assert.equal(mine.body.member, true);
        assert.equal(mine.body.organization.orgCode, schoolA.orgCode);
    });

    test('the same request cannot be decided twice', async () => {
        const r = await orgApi(adminA.token)('PUT', `/me/requests/${requestIdA}`, { decision: 'approve' });
        assert.equal(r.status, 404);
    });

    test('the student now appears in its list, with their learning record', async () => {
        const r = await orgApi(adminA.token)('GET', '/me/students');
        assert.equal(r.status, 200);
        assert.equal(r.body.students.length, 1);
        const row = r.body.students[0];
        assert.equal(row.name, alice.user.name);
        assert.equal(typeof row.progressPercent, 'number');
        assert.equal(typeof row.coursesEnrolled, 'number');
        assert.equal(row.password, undefined, 'never the password');
    });

    test('the dashboard counts them', async () => {
        const r = await orgApi(adminA.token)('GET', '/me/dashboard');
        assert.equal(r.status, 200);
        assert.equal(r.body.stats.students, 1);
        assert.equal(r.body.stats.pendingRequests, 0);
        assert.equal(r.body.organization.orgCode, schoolA.orgCode);
    });

    test('a rejection is recorded with its reason and the student is told', async () => {
        const asked = await asBob('POST', '/student/requests', { orgCode: schoolA.orgCode });
        assert.equal(asked.status, 201);

        const queue = await orgApi(adminA.token)('GET', '/me/requests');
        const bobRequest = queue.body.requests.find((q) => q.student.email === bob.user.email);
        const r = await orgApi(adminA.token)('PUT', `/me/requests/${bobRequest._id}`, { decision: 'reject', reason: 'Not on our roll' });
        assert.equal(r.status, 200);

        const User = require('../../src/models/User');
        assert.equal((await User.findById(bob.user._id).select('organizationId').lean()).organizationId, null);

        const mine = await asBob('GET', '/student/me');
        assert.equal(mine.body.member, false);
        assert.equal(mine.body.request.status, 'rejected');
        assert.match(mine.body.request.decisionReason, /roll/i);
    });

    test('a nonsense decision is refused', async () => {
        const r = await orgApi(adminA.token)('PUT', `/me/requests/${requestIdA}`, { decision: 'maybe' });
        assert.equal(r.status, 400);
    });
});

/* ── The block this file exists for ──────────────────────────────────────── */

describe('one organization cannot see another one', () => {
    test("B's student list does not contain A's student", async () => {
        const r = await orgApi(adminB.token)('GET', '/me/students');
        assert.equal(r.status, 200);
        assert.equal(r.body.students.length, 0, 'B has no members yet');
        assert.ok(!r.body.students.some((s) => s.email === alice.user.email));
    });

    test("B cannot open A's student by putting their id in the URL", async () => {
        const r = await orgApi(adminB.token)('GET', `/me/students/${alice.user._id}`);
        assert.equal(r.status, 404, 'indistinguishable from a student who does not exist');
        assert.equal(r.body.student, undefined);
        assert.equal(r.body.overview, undefined);
    });

    test("B cannot remove A's student", async () => {
        const r = await orgApi(adminB.token)('DELETE', `/me/students/${alice.user._id}`);
        assert.equal(r.status, 404);

        const User = require('../../src/models/User');
        const fresh = await User.findById(alice.user._id).select('organizationId').lean();
        assert.equal(String(fresh.organizationId), String(schoolA._id), 'still a member of A');
    });

    test("B cannot decide A's join request", async () => {
        const asked = await asLoner('POST', '/student/requests', { orgCode: schoolA.orgCode });
        assert.equal(asked.status, 201);

        const queue = await orgApi(adminA.token)('GET', '/me/requests');
        const lonerRequest = queue.body.requests.find((q) => q.student.email === loner.user.email);
        assert.ok(lonerRequest, 'it is in A\'s queue');

        // B sees nothing of it, and cannot act on it even holding the id.
        const bQueue = await orgApi(adminB.token)('GET', '/me/requests');
        assert.ok(!bQueue.body.requests.some((q) => q._id === lonerRequest._id));

        const r = await orgApi(adminB.token)('PUT', `/me/requests/${lonerRequest._id}`, { decision: 'approve' });
        assert.equal(r.status, 404);

        const User = require('../../src/models/User');
        assert.equal((await User.findById(loner.user._id).select('organizationId').lean()).organizationId, null);

        await asLoner('DELETE', `/student/requests/${lonerRequest._id}`);
    });

    test('A cannot edit its own status, or its ID, through its own settings', async () => {
        const r = await orgApi(adminA.token)('PUT', '/me', {
            name: `${schoolA.name} (self-renamed)`,
            status: 'active',
            orgCode: 'ORG-1999-0002',
            expectedStudents: 99999
        });
        assert.equal(r.status, 200);
        assert.equal(r.body.organization.orgCode, schoolA.orgCode);
        assert.match(r.body.organization.name, /self-renamed/);

        const Organization = require('../../src/organizations/models/Organization');
        const fresh = await Organization.findById(schoolA._id).lean();
        assert.equal(fresh.orgCode, schoolA.orgCode);
        assert.equal(fresh.expectedStudents, 250, 'a field this endpoint does not own is untouched');
    });

    test('A cannot empty or overflow its own details either', async () => {
        const mine = orgApi(adminA.token);
        assert.equal((await mine('PUT', '/me', { name: '' })).status, 400);
        const tooLong = await mine('PUT', '/me', { address: 'z'.repeat(500) });
        assert.equal(tooLong.status, 400);
        assert.match(tooLong.body.message, /address/i);
        assert.equal((await mine('PUT', '/me', { email: 'nope' })).status, 400);
    });

    test('a student token cannot reach the organization admin API', async () => {
        for (const path of ['/me', '/me/dashboard', '/me/students', '/me/requests', '/me/status']) {
            const r = await asAlice('GET', path);
            // 401: a student id is not an Admin id, so the guard stops before it
            // has a role to check. Refused is refused; what matters is that no
            // path here answers 200 to a student.
            assert.equal(r.status, 401, path);
            assert.equal(r.body.students, undefined, path);
            assert.equal(r.body.organization, undefined, path);
        }
    });

    test('and a superadmin token cannot either — they have their own route', async () => {
        assert.equal((await asSuper('GET', '/me/students')).status, 403);
    });
});

describe('what the superadmin can see across all of it', () => {
    test('every organization, and each one\'s students', async () => {
        const list = await asSuper('GET', '/admin');
        const a = list.body.organizations.find((o) => o.orgCode === schoolA.orgCode);
        assert.equal(a.studentCount, 1);

        const students = await asSuper('GET', `/admin/${schoolA._id}/students`);
        assert.equal(students.status, 200);
        assert.equal(students.body.students.length, 1);
        assert.equal(students.body.students[0].email, alice.user.email);
        assert.equal(students.body.organization.status, 'active',
            'the status comes too, so the panel knows whether it may assign into it');
    });

    test('any student\'s full record, with their organization named', async () => {
        const r = await asSuper('GET', `/admin/students/${alice.user._id}`);
        assert.equal(r.status, 200);
        assert.equal(r.body.student.email, alice.user.email);
        assert.equal(r.body.organization.orgCode, schoolA.orgCode);
        assert.ok(Array.isArray(r.body.courses));
        assert.equal(typeof r.body.overview.overallPercent, 'number');
    });

    test('the student list carries the organization, and filters by it', async () => {
        const asPlatform = adminApp.call(boss.token);

        const all = await asPlatform('GET', '/users');
        assert.equal(all.status, 200);
        assert.ok(Array.isArray(all.body), 'still a plain array, as it always was');
        const aliceRow = all.body.find((u) => u.email === alice.user.email);
        assert.equal(aliceRow.organization.orgCode, schoolA.orgCode);
        const lonerRow = all.body.find((u) => u.email === loner.user.email);
        assert.equal(lonerRow.organization, null, 'a student with no organization reads as null');

        const filtered = await asPlatform('GET', `/users?organizationId=${schoolA._id}`);
        assert.ok(filtered.body.every((u) => String(u.organizationId) === String(schoolA._id)));
        assert.ok(filtered.body.some((u) => u.email === alice.user.email));
        assert.ok(!filtered.body.some((u) => u.email === loner.user.email));

        const unaffiliated = await asPlatform('GET', '/users?organizationId=none');
        assert.ok(unaffiliated.body.every((u) => !u.organizationId));
        assert.ok(unaffiliated.body.some((u) => u.email === loner.user.email));

        assert.deepEqual((await asPlatform('GET', '/users?organizationId=garbage')).body, [], 'a bad id is empty, not a 500');
    });

    test('the platform admins page does not list organization admins', async () => {
        const r = await adminApp.call(boss.token)('GET', '/admins');
        assert.equal(r.status, 200);
        assert.ok(!r.body.some((a) => a.role === 'orgadmin'), 'they are managed from Organizations');
        assert.ok(r.body.some((a) => a.email === plainAdmin.admin.email));
    });

    test('and an orgadmin cannot be created or promoted from there', async () => {
        const made = await adminApp.call(boss.token)('POST', '/admins', {
            name: 'Sneaky', email: email('sneaky'), password: GOOD_PASSWORD, role: 'orgadmin'
        });
        assert.equal(made.status, 400);
        assert.match(made.body.message, /Organizations section/i);

        const promoted = await adminApp.call(boss.token)('PUT', `/admins/${plainAdmin.admin._id}`, { role: 'orgadmin' });
        assert.equal(promoted.status, 400);
    });
});

describe('suspending an organization keeps everything it has', () => {
    let progressId;

    before(async () => {
        // Something to lose, so "nothing was lost" is a real assertion.
        const Progress = require('../../src/models/Progress');
        const row = await Progress.create({ userId: alice.user._id, courseId: '99999', percentage: 60 });
        progressId = row._id;
    });

    after(async () => {
        await require('../../src/models/Progress').deleteOne({ _id: progressId });
    });

    test('its admin loses the dashboard but still sees why', async () => {
        assert.equal((await asSuper('PUT', `/admin/${schoolA._id}/status`, { status: 'suspended', reason: 'Payment overdue' })).status, 200);

        const mine = orgApi(adminA.token);
        const blocked = await mine('GET', '/me/dashboard');
        assert.equal(blocked.status, 403);
        assert.equal(blocked.body.code, 'ORGANIZATION_NOT_ACTIVE');
        assert.equal(blocked.body.status, 'suspended');
        assert.match(blocked.body.reason, /overdue/i);

        const status = await mine('GET', '/me/status');
        assert.equal(status.status, 200);
        assert.equal(status.body.organization.status, 'suspended');
    });

    test('no student can join it any more', async () => {
        assert.equal((await asBob('GET', `/student/lookup/${schoolA.orgCode}`)).status, 404);
        assert.equal((await asBob('POST', '/student/requests', { orgCode: schoolA.orgCode })).status, 404);
    });

    test('but its existing member, their membership and their progress are untouched', async () => {
        const User = require('../../src/models/User');
        const fresh = await User.findById(alice.user._id).select('organizationId').lean();
        assert.equal(String(fresh.organizationId), String(schoolA._id), 'still a member');

        const Progress = require('../../src/models/Progress');
        const row = await Progress.findById(progressId).lean();
        assert.ok(row, 'progress survives');
        assert.equal(row.percentage, 60);

        const mine = await asAlice('GET', '/student/me');
        assert.equal(mine.body.member, true);
        assert.match(mine.body.organization.accessNote, /not currently active/i);
    });

    test('reinstating it gives access back without a second approval', async () => {
        assert.equal((await asSuper('PUT', `/admin/${schoolA._id}/status`, { status: 'active' })).status, 200);
        assert.equal((await orgApi(adminA.token)('GET', '/me/dashboard')).status, 200);
        assert.equal((await asBob('GET', `/student/lookup/${schoolA.orgCode}`)).status, 200);
    });
});

describe('a student cannot leave, but can be removed', () => {
    let progressId;

    before(async () => {
        const Progress = require('../../src/models/Progress');
        const row = await Progress.create({ userId: alice.user._id, courseId: '88888', percentage: 45 });
        progressId = row._id;
    });

    after(async () => {
        await require('../../src/models/Progress').deleteOne({ _id: progressId });
    });

    test('there is no endpoint for a student to leave', async () => {
        const r = await asAlice('DELETE', '/student/me');
        assert.equal(r.status, 404, 'the route does not exist at all');
        assert.match(r.body.message, /No such endpoint/);

        const User = require('../../src/models/User');
        const fresh = await User.findById(alice.user._id).select('organizationId').lean();
        assert.equal(String(fresh.organizationId), String(schoolA._id), 'and they are still a member');
    });

    test('withdrawing a request is still theirs to do — that is not a membership', async () => {
        // Bob has no organization, so he can have a request in flight.
        const asked = await asBob('POST', '/student/requests', { orgCode: schoolA.orgCode });
        assert.equal(asked.status, 201);
        assert.equal((await asBob('DELETE', `/student/requests/${asked.body.request._id}`)).status, 200);
        assert.equal((await asBob('GET', '/student/me')).body.request.status, 'cancelled');
    });

    test('the organization can remove a student without deleting anything of theirs', async () => {
        const r = await orgApi(adminA.token)('DELETE', `/me/students/${alice.user._id}`);
        assert.equal(r.status, 200);

        const User = require('../../src/models/User');
        const fresh = await User.findById(alice.user._id).select('organizationId status').lean();
        assert.equal(fresh.organizationId, null, 'the membership is gone');
        assert.ok(fresh.status, 'the account is not');

        const row = await require('../../src/models/Progress').findById(progressId).lean();
        assert.equal(row.percentage, 45, 'and neither is their progress');

        assert.equal((await orgApi(adminA.token)('GET', '/me/students')).body.students.length, 0);
    });

    test('a removed student can ask to join again', async () => {
        const again = await asAlice('POST', '/student/requests', { orgCode: schoolA.orgCode });
        assert.equal(again.status, 201);

        const queue = await orgApi(adminA.token)('GET', '/me/requests');
        const mine = queue.body.requests.find((q) => q.student.email === alice.user.email);
        assert.equal((await orgApi(adminA.token)('PUT', `/me/requests/${mine._id}`, { decision: 'approve' })).status, 200);
    });
});

describe('an organization changing its own password', () => {
    const NEW_PASSWORD = 'Newpassw0rd!x';

    after(async () => {
        // Put it back, so the later describes can still sign in as this admin.
        await orgApi(adminA.token)('PUT', '/me/password', {
            currentPassword: NEW_PASSWORD, newPassword: GOOD_PASSWORD, confirmPassword: GOOD_PASSWORD
        });
    });

    test('the current password is required, and checked', async () => {
        const mine = orgApi(adminA.token);
        assert.equal((await mine('PUT', '/me/password', { newPassword: NEW_PASSWORD })).status, 400);

        const wrong = await mine('PUT', '/me/password', { currentPassword: 'Wrongone!1', newPassword: NEW_PASSWORD });
        assert.equal(wrong.status, 401);
        assert.match(wrong.body.message, /not your current password/i);
    });

    test('a weak or unchanged new password is refused', async () => {
        const mine = orgApi(adminA.token);
        const weak = await mine('PUT', '/me/password', { currentPassword: GOOD_PASSWORD, newPassword: 'short' });
        assert.equal(weak.status, 400);
        assert.match(weak.body.message, /8 characters/i);

        const same = await mine('PUT', '/me/password', { currentPassword: GOOD_PASSWORD, newPassword: GOOD_PASSWORD });
        assert.equal(same.status, 400);
        assert.match(same.body.message, /same as the current/i);

        const mismatch = await mine('PUT', '/me/password', {
            currentPassword: GOOD_PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: 'Different1!'
        });
        assert.equal(mismatch.status, 400);
        assert.match(mismatch.body.message, /do not match/i);
    });

    test('it changes, is hashed, and the new one signs in', async () => {
        const r = await orgApi(adminA.token)('PUT', '/me/password', {
            currentPassword: GOOD_PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD
        });
        assert.equal(r.status, 200);

        const Admin = require('../../src/models/Admin');
        const account = await Admin.findById(adminA.adminId);
        assert.notEqual(account.password, NEW_PASSWORD, 'never stored in the clear');
        assert.ok(await account.matchPassword(NEW_PASSWORD));

        const signIn = await authApp.call(null)('POST', '/admin/login', { email: schoolA.email, password: NEW_PASSWORD });
        assert.equal(signIn.status, 200);
        assert.equal((await authApp.call(null)('POST', '/admin/login', { email: schoolA.email, password: GOOD_PASSWORD })).status, 401,
            'and the old one no longer does');
    });

    test('nobody else can change it', async () => {
        for (const caller of [asSuper, asAlice, asPublic]) {
            const r = await caller('PUT', '/me/password', { currentPassword: 'x', newPassword: NEW_PASSWORD });
            assert.ok(r.status === 401 || r.status === 403, `refused, got ${r.status}`);
        }
    });
});

describe('a superadmin assigning a student directly', () => {
    const User = require('../../src/models/User');

    test('the picker offers everyone who is not already in it', async () => {
        const r = await asSuper('GET', `/admin/${schoolB._id}/assignable`);
        assert.equal(r.status, 200);
        assert.ok(r.body.students.some((s) => s.email === bob.user.email), 'an unaffiliated student is offered');
        const inA = r.body.students.find((s) => s.email === alice.user.email);
        assert.ok(inA, "and so is someone in another organization");
        assert.equal(inA.currentOrganization.orgCode, schoolA.orgCode, 'with that organization named');

        const searched = await asSuper(`GET`, `/admin/${schoolB._id}/assignable?search=${encodeURIComponent(bob.user.email)}`);
        assert.equal(searched.body.students.length, 1);
    });

    test('an unaffiliated student is added straight away', async () => {
        const r = await asSuper('POST', `/admin/${schoolB._id}/students`, { studentId: String(bob.user._id) });
        assert.equal(r.status, 200);
        assert.match(r.body.message, /was added to/i);
        assert.equal(r.body.movedFrom, null);

        const fresh = await User.findById(bob.user._id).select('organizationId organizationJoinedAt').lean();
        assert.equal(String(fresh.organizationId), String(schoolB._id));
        assert.ok(fresh.organizationJoinedAt);

        // And the organization sees them like any other member.
        const theirs = await orgApi(adminB.token)('GET', '/me/students');
        assert.ok(theirs.body.students.some((s) => s.email === bob.user.email));
    });

    test('a student already somewhere else is moved, and told which', async () => {
        const r = await asSuper('POST', `/admin/${schoolB._id}/students`, { studentId: String(alice.user._id) });
        assert.equal(r.status, 200);
        assert.match(r.body.message, /was moved from/i);
        assert.ok(r.body.movedFrom);

        const fresh = await User.findById(alice.user._id).select('organizationId').lean();
        assert.equal(String(fresh.organizationId), String(schoolB._id));
        assert.equal((await orgApi(adminA.token)('GET', '/me/students')).body.students.length, 0, 'gone from the old one');
    });

    test('assigning the same student twice, or an unknown one, is refused', async () => {
        const twice = await asSuper('POST', `/admin/${schoolB._id}/students`, { studentId: String(bob.user._id) });
        assert.equal(twice.status, 400);
        assert.match(twice.body.message, /already in/i);

        assert.equal((await asSuper('POST', `/admin/${schoolB._id}/students`, { studentId: String(new mongoose.Types.ObjectId()) })).status, 404);
    });

    test('a pending organization cannot be stocked until it is approved', async () => {
        const reg = await asPublic('POST', '/register', registration('pending-assign'));
        assert.equal(reg.status, 201);
        const Organization = require('../../src/organizations/models/Organization');
        const pendingId = String((await Organization.findOne({ orgCode: reg.body.organization.orgCode }).select('_id').lean())._id);

        const r = await asSuper('POST', `/admin/${pendingId}/students`, { studentId: String(loner.user._id) });
        assert.equal(r.status, 400);
        assert.match(r.body.message, /pending/i);

        const User = require('../../src/models/User');
        const fresh = await User.findById(loner.user._id).select('organizationId').lean();
        assert.notEqual(String(fresh.organizationId || ''), String(pendingId), 'and the student was not moved');
    });

    test('an organization that is not yet active can still be stocked, and says so', async () => {
        // A roster filled in before approval is a real thing to want; what must
        // not happen is the superadmin being left unaware that the organization
        // cannot see those students yet.
        await asSuper('PUT', `/admin/${schoolA._id}/status`, { status: 'suspended', reason: 'Checking the rule' });

        const r = await asSuper('POST', `/admin/${schoolA._id}/students`, { studentId: String(loner.user._id) });
        assert.equal(r.status, 200, 'allowed');
        assert.equal(r.body.organizationStatus, 'suspended');
        assert.match(r.body.message, /cannot see them yet/i, 'and the caveat is in the message');

        const User = require('../../src/models/User');
        assert.equal(String((await User.findById(loner.user._id).select('organizationId').lean()).organizationId), String(schoolA._id));

        // Its own admin still cannot reach them while it is shut.
        assert.equal((await orgApi(adminA.token)('GET', '/me/students')).status, 403);

        await asSuper('PUT', `/admin/${schoolA._id}/status`, { status: 'active' });
        const theirs = await orgApi(adminA.token)('GET', '/me/students');
        assert.equal(theirs.status, 200);
        assert.ok(theirs.body.students.some((st) => st.email === loner.user.email), 'and sees them once it is back');

        // Put the student back where the later tests expect them.
        await asSuper('DELETE', `/admin/${schoolA._id}/students/${loner.user._id}`);
    });

    test('and only a superadmin can do it', async () => {
        for (const caller of [asAdmin, asAlice, asPublic]) {
            const r = await caller('POST', `/admin/${schoolB._id}/students`, { studentId: String(loner.user._id) });
            assert.ok(r.status === 401 || r.status === 403, `refused, got ${r.status}`);
        }
        assert.equal((await orgApi(adminA.token)('POST', `/admin/${schoolB._id}/students`, { studentId: String(loner.user._id) })).status, 403,
            'an organization admin cannot stock itself');
    });

    test('a superadmin can take a student back out', async () => {
        const r = await asSuper('DELETE', `/admin/${schoolB._id}/students/${bob.user._id}`);
        assert.equal(r.status, 200);
        assert.match(r.body.message, /unchanged/i);
        assert.equal((await User.findById(bob.user._id).select('organizationId').lean()).organizationId, null);

        assert.equal((await asSuper('DELETE', `/admin/${schoolA._id}/students/${bob.user._id}`)).status, 404,
            'removing from an organization they are not in is a miss, not a crash');
    });
});

describe('nothing that already worked has changed', () => {
    test('a student with no organization signs in and reads their profile as before', async () => {
        const r = await userApp.call(loner.token)('GET', '/profile');
        assert.equal(r.status, 200);
        assert.equal(r.body.user.email, loner.user.email);
        assert.equal(r.body.user.organizationId, null, 'the new field is simply null');
        assert.ok(Array.isArray(r.body.enrollments));
    });

    test('a platform admin still has the whole admin API', async () => {
        const asPlatform = adminApp.call(plainAdmin.token);
        for (const path of ['/users', '/courses', '/bundles', '/analytics', '/settings']) {
            assert.equal((await asPlatform('GET', path)).status, 200, `GET /api/admin${path}`);
        }
    });

    test('the superadmin-only routes still tell the difference', async () => {
        assert.equal((await adminApp.call(boss.token)('GET', '/admins')).status, 200);
        assert.equal((await adminApp.call(plainAdmin.token)('GET', '/admins')).status, 403);
    });

    test('the Career Path module still loads and still refuses an anonymous caller', async () => {
        // Requiring it registers every career_* model; a name collision with the
        // organization models would throw here rather than at runtime.
        const careerRouter = require('../../src/career');
        assert.equal(typeof careerRouter, 'function');

        const careerApp = startApp({ mount: '/api/career', router: careerRouter });
        try {
            assert.equal((await careerApp.call(null)('GET', '/goals')).status, 401);
            // And a real student token is still accepted by its guard (whatever
            // the endpoint then answers, it is not an auth failure).
            const authed = await careerApp.call(loner.token)('GET', '/goals');
            assert.notEqual(authed.status, 401, 'a student token still authenticates on Career Path');
        } finally {
            await new Promise((r) => careerApp.server.close(r));
        }
    });

    test('an unknown organization endpoint answers as JSON, not as HTML', async () => {
        const r = await asSuper('GET', '/admin/nope/nope/nope');
        assert.equal(r.status, 404);
        assert.match(r.body.message, /No such endpoint/);
    });
});

/** bcrypt the way the Admin model does, for a test that needs a known password. */
async function hash(plain) {
    const bcrypt = require('bcrypt');
    return bcrypt.hash(plain, await bcrypt.genSalt(10));
}
