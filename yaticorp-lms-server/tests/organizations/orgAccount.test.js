/**
 * An organization's account: signing in, changing the email it signs in with,
 * and getting back in after forgetting the password.
 *
 * The things pinned down here were each a way to lose or take over an
 * account: an email edit that moved the organization but not its login, a
 * login that depended on the case the address was typed in, and no way back
 * in for an organization that forgot its password other than asking for a
 * password to be set by hand.
 *
 * No real email is sent: the mailer is replaced, and the reset link is read
 * out of the message the way the organization would read it.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeAdmin, startApp, cleanup } = require('../helpers');

const mailer = require('../../src/utils/emailService');
const sent = [];
mailer.sendEmail = async (msg) => { sent.push(msg); };

const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
const GOOD_PASSWORD = 'Passw0rd!x';
const NEW_PASSWORD = 'N3w-Passw0rd!';
const handle = (label) => `t_${String(label).replace(/[^a-z0-9]/gi, '').slice(0, 8)}_${STAMP}`.toLowerCase();
const mixedEmail = (label) => `Info-${label}-${STAMP}@School.edu`;

let orgApp, authApp, adminApp;
let boss, plainAdmin;
let schoolA, schoolB;

const Admin = require('../../src/models/Admin');
const Organization = require('../../src/organizations/models/Organization');

/** Create an active organization through the superadmin form; returns it and its admin. */
const createOrg = async (label, email = mixedEmail(label)) => {
    const r = await orgApp.call(boss.token)('POST', '/admin', {
        name: `${label} Academy ${STAMP}`, organizationType: 'college', contactPerson: 'Asha Rao',
        email, password: GOOD_PASSWORD, orgCode: handle(label)
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const admin = await Admin.findOne({ organizationId: r.body.organization._id, role: 'orgadmin' });
    return { organization: r.body.organization, admin };
};

const login = (email, password = GOOD_PASSWORD) => authApp.call(null)('POST', '/admin/login', { email, password });

/** The newest reset email to this address, once it arrives (the request does not wait for it). */
const resetTokenFor = async (to) => {
    for (let i = 0; i < 40; i++) {
        const msg = [...sent].reverse().find((m) => m.to === to);
        if (msg) return /reset-password\?token=([a-f0-9]+)/.exec(msg.htmlContent)[1];
        await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`no reset email reached ${to}`);
};

before(async () => {
    await connect();
    orgApp = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    authApp = startApp({ mount: '/api/auth', router: require('../../src/routes/authRoutes') });
    adminApp = startApp({ mount: '/api/admin', router: require('../../src/routes/adminRoutes') });
    boss = await makeAdmin('Boss');
    plainAdmin = await makeAdmin('Plain');
    await Admin.updateOne({ _id: boss.admin._id }, { $set: { role: 'superadmin' } });
    schoolA = await createOrg('alpha');
    schoolB = await createOrg('beta');
});

after(async () => {
    const ours = await Organization.find({ name: new RegExp(STAMP) }).select('_id').lean();
    const ids = ours.map((o) => o._id);
    await Admin.deleteMany({ organizationId: { $in: ids } });
    await Admin.deleteMany({ email: new RegExp(STAMP) });
    await Organization.deleteMany({ _id: { $in: ids } });
    for (const app of [authApp, adminApp]) await new Promise((r) => app.server.close(r));
    await cleanup([], orgApp.server, [boss.admin, plainAdmin.admin]);
});

/* ────────────────────────────────────────────────────────────────────────── */

describe('signing in as an organization', () => {
    test('the email is stored lower-case, and the organization signs in with it', async () => {
        assert.equal(schoolA.admin.email, mixedEmail('alpha').toLowerCase());
        const r = await login(schoolA.admin.email);
        assert.equal(r.status, 200);
        assert.equal(r.body.role, 'orgadmin');
        assert.equal(r.body.organizationId, String(schoolA.organization._id));
    });

    test('Info@School.edu, info@school.edu and INFO@SCHOOL.EDU are one account', async () => {
        const ids = [];
        for (const typed of [mixedEmail('alpha'), mixedEmail('alpha').toLowerCase(), mixedEmail('alpha').toUpperCase(), `  ${mixedEmail('alpha')}  `]) {
            const r = await login(typed);
            assert.equal(r.status, 200, `signs in as typed: ${typed}`);
            ids.push(r.body._id);
        }
        assert.equal(new Set(ids).size, 1, 'every spelling reaches the same account');
    });

    test('a wrong password, an unknown email or an operator in place of an email is refused alike', async () => {
        assert.equal((await login(schoolA.admin.email, 'Wrong-pass1!')).status, 401);
        assert.equal((await login(`nobody-${STAMP}@school.edu`)).status, 401);
        assert.equal((await authApp.call(null)('POST', '/admin/login', { email: { $ne: null }, password: GOOD_PASSWORD })).status, 401);
    });

    test('an account stored before emails were lower-cased still signs in', async () => {
        const legacy = `Legacy-${STAMP}@Example.com`;
        const bcrypt = require('bcrypt');
        await Admin.collection.insertOne({ name: 'Legacy', email: legacy, password: await bcrypt.hash(GOOD_PASSWORD, 10), role: 'admin', organizationId: null });
        try {
            assert.equal((await login(legacy.toLowerCase())).status, 200);
            assert.equal((await login(legacy.toUpperCase())).status, 200);
        } finally {
            await Admin.collection.deleteOne({ email: legacy });
        }
    });
});

describe('a case variant of an existing email cannot become a second account', () => {
    test('registering an organization', async () => {
        const r = await orgApp.call(null)('POST', '/register', {
            name: `Copycat ${STAMP}`, organizationType: 'college', contactPerson: 'X Y', email: mixedEmail('alpha').toUpperCase(),
            phone: '9876543210', password: GOOD_PASSWORD, confirmPassword: GOOD_PASSWORD, orgCode: handle('copycat')
        });
        assert.equal(r.status, 400);
        assert.match(r.body.message, /already/i);
    });

    test('a superadmin creating an organization', async () => {
        const r = await orgApp.call(boss.token)('POST', '/admin', {
            name: `Copycat Two ${STAMP}`, organizationType: 'college', email: mixedEmail('beta').toUpperCase(),
            password: GOOD_PASSWORD, orgCode: handle('copycat2')
        });
        assert.equal(r.status, 400);
    });

    test('a superadmin adding a platform admin', async () => {
        const r = await adminApp.call(boss.token)('POST', '/admins', {
            name: 'Copy', email: schoolA.admin.email.toUpperCase(), password: GOOD_PASSWORD, role: 'admin'
        });
        assert.equal(r.status, 400);
        assert.equal(await Admin.countDocuments({ email: schoolA.admin.email }), 1);
    });
});

describe('changing the email an organization signs in with', () => {
    test('the organization changes it: the sign-in moves with it', async () => {
        const next = `Moved-alpha-${STAMP}@School.edu`;
        const r = await orgApp.call(await tokenFor(schoolA.admin.email))('PUT', '/me', { email: next });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.organization.email, next.toLowerCase());
        const account = await Admin.findById(schoolA.admin._id);
        assert.equal(account.email, next.toLowerCase(), 'the login moved too');
        assert.equal((await login(next)).status, 200, 'the new address signs in');
        assert.equal((await login(schoolA.admin.email)).status, 401, 'the old one no longer does');
        schoolA.admin = account;
    });

    test('a superadmin changes it: the sign-in moves with it', async () => {
        const next = `moved-beta-${STAMP}@school.edu`;
        const r = await orgApp.call(boss.token)('PUT', `/admin/${schoolB.organization._id}`, { email: next });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal((await Admin.findById(schoolB.admin._id)).email, next);
        assert.equal((await login(next)).status, 200);
        schoolB.admin = await Admin.findById(schoolB.admin._id);
    });

    test("another organization's email is refused, and nothing else on the form is saved", async () => {
        const before = await Organization.findById(schoolA.organization._id).lean();
        const r = await orgApp.call(await tokenFor(schoolA.admin.email))('PUT', '/me', {
            name: `Renamed ${STAMP}`, email: schoolB.admin.email.toUpperCase()
        });
        assert.equal(r.status, 400);
        const afterOrg = await Organization.findById(schoolA.organization._id).lean();
        assert.equal(afterOrg.name, before.name, 'no partial update');
        assert.equal(afterOrg.email, before.email);
        assert.equal((await Admin.findById(schoolA.admin._id)).email, schoolA.admin.email);
    });

    test("a platform admin's email is refused too", async () => {
        const r = await orgApp.call(boss.token)('PUT', `/admin/${schoolA.organization._id}`, { email: plainAdmin.admin.email });
        assert.equal(r.status, 400);
        assert.match(r.body.message, /already in use/i);
        assert.equal((await Admin.findById(schoolA.admin._id)).email, schoolA.admin.email);
    });

    test('if the organization cannot be saved, the sign-in is not changed either', async () => {
        const r = await orgApp.call(boss.token)('PUT', `/admin/${schoolA.organization._id}`, {
            email: `never-${STAMP}@school.edu`, name: 'y'.repeat(200)
        });
        assert.equal(r.status, 400);
        assert.equal((await Admin.findById(schoolA.admin._id)).email, schoolA.admin.email, 'rolled back with the organization');
        assert.equal((await Organization.findById(schoolA.organization._id).lean()).email, schoolA.admin.email);
    });

    test('an invalid address is refused', async () => {
        const r = await orgApp.call(await tokenFor(schoolA.admin.email))('PUT', '/me', { email: 'not-an-email' });
        assert.equal(r.status, 400);
    });
});

describe('a superadmin looking at an organization cannot change its password', () => {
    for (const path of ['/me/password', '/me/password/', '/ME/PASSWORD', '/me/Password//']) {
        test(`PUT ${path}`, async () => {
            const res = await fetch(`${orgBase()}${path}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${boss.token}`, 'X-View-Organization': String(schoolA.organization._id) },
                body: JSON.stringify({ currentPassword: GOOD_PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD })
            });
            assert.equal(res.status, 403);
            const bossAccount = await Admin.findById(boss.admin._id);
            assert.equal(await bossAccount.matchPassword(NEW_PASSWORD), false, "the superadmin's own password is untouched");
        });
    }
});

describe('forgetting the password', () => {
    const forgot = (email) => authApp.call(null)('POST', '/admin/forgot-password', { email });
    const reset = (body) => authApp.call(null)('POST', '/admin/reset-password', body);

    test('an unknown address gets the same answer as a real one, and no email', async () => {
        const before = sent.length;
        const unknown = await forgot(`nobody-${STAMP}@school.edu`);
        const real = await forgot(schoolA.admin.email.toUpperCase());
        assert.equal(unknown.status, 200);
        assert.equal(real.status, 200);
        assert.equal(unknown.body.message, real.body.message);
        await resetTokenFor(schoolA.admin.email);
        assert.equal(sent.slice(before).filter((m) => m.to === `nobody-${STAMP}@school.edu`).length, 0);
    });

    test('platform admins are not offered the link (same answer, no email)', async () => {
        const before = sent.length;
        const r = await forgot(plainAdmin.admin.email);
        assert.equal(r.status, 200);
        await new Promise((res) => setTimeout(res, 300));
        assert.equal(sent.slice(before).filter((m) => m.to === plainAdmin.admin.email).length, 0);
    });

    test('only a hash of the token is stored, and the link expires within the hour', async () => {
        sent.length = 0;
        await forgot(schoolA.admin.email);
        const token = await resetTokenFor(schoolA.admin.email);
        const row = await Admin.findById(schoolA.admin._id).select('+resetPasswordTokenHash +resetPasswordExpiry').lean();
        assert.notEqual(row.resetPasswordTokenHash, token);
        assert.equal(row.resetPasswordTokenHash, require('crypto').createHash('sha256').update(token).digest('hex'));
        assert.ok(row.resetPasswordExpiry - Date.now() <= 60 * 60 * 1000 + 1000);
    });

    test('a weak password is refused without using up the link; a good one works once', async () => {
        sent.length = 0;
        await forgot(schoolA.admin.email);
        const token = await resetTokenFor(schoolA.admin.email);

        const weak = await reset({ token, newPassword: 'short', confirmPassword: 'short' });
        assert.equal(weak.status, 400);

        const ok = await reset({ token, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
        assert.equal(ok.status, 200, JSON.stringify(ok.body));
        const account = await Admin.findById(schoolA.admin._id);
        assert.notEqual(account.password, NEW_PASSWORD, 'hashed by the model, never stored in the clear');
        assert.equal((await login(schoolA.admin.email, NEW_PASSWORD)).status, 200, 'the new password signs in');
        assert.equal((await login(schoolA.admin.email, GOOD_PASSWORD)).status, 401, 'the old one no longer does');

        const again = await reset({ token, newPassword: 'An0ther-Pass!', confirmPassword: 'An0ther-Pass!' });
        assert.equal(again.status, 400, 'a used link is refused');
    });

    test('an expired link is refused', async () => {
        sent.length = 0;
        await forgot(schoolA.admin.email);
        const token = await resetTokenFor(schoolA.admin.email);
        await Admin.updateOne({ _id: schoolA.admin._id }, { $set: { resetPasswordExpiry: new Date(Date.now() - 1000) } });
        const r = await reset({ token, newPassword: 'Expir3d-Pass!', confirmPassword: 'Expir3d-Pass!' });
        assert.equal(r.status, 400);
        assert.equal((await login(schoolA.admin.email, NEW_PASSWORD)).status, 200, 'the password did not change');
    });

    test('a made-up token is refused', async () => {
        const r = await reset({ token: 'f'.repeat(64), newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
        assert.equal(r.status, 400);
    });
});

describe('a superadmin sending the reset link', () => {
    test('emails the organization admin a link; nobody types a password for them', async () => {
        sent.length = 0;
        const r = await orgApp.call(boss.token)('POST', `/admin/${schoolB.organization._id}/send-password-reset`);
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.ok(!('token' in r.body) && !JSON.stringify(r.body).includes('reset-password?token'), 'the link is not shown to the superadmin');
        const token = await resetTokenFor(schoolB.admin.email);
        const ok = await authApp.call(null)('POST', '/admin/reset-password', { token, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
        assert.equal(ok.status, 200);
        assert.equal((await login(schoolB.admin.email, NEW_PASSWORD)).status, 200);
    });

    test('is for superadmins only', async () => {
        const r = await orgApp.call(plainAdmin.token)('POST', `/admin/${schoolB.organization._id}/send-password-reset`);
        assert.equal(r.status, 403);
        const own = await orgApp.call(await tokenFor(schoolB.admin.email, NEW_PASSWORD))('POST', `/admin/${schoolB.organization._id}/send-password-reset`);
        assert.ok(own.status === 401 || own.status === 403, `an org admin is refused, got ${own.status}`);
    });
});

/* ────────────────────────────────────────────────────────────────────────── */

/** A signed-in organization admin's token. */
async function tokenFor(email, password = GOOD_PASSWORD) {
    const r = await login(email, password);
    assert.equal(r.status, 200, `could sign in as ${email}`);
    return r.body.token;
}

function orgBase() {
    return `http://127.0.0.1:${orgApp.server.address().port}/api/organizations`;
}
