/**
 * An organization's users and audit log (src/organizations/users.js): the
 * owner adds a user with full rights, who signs in and works; every sign-in
 * and change is in the audit log under the right name; the owner cannot be
 * removed or edited by others, nobody removes themselves, and a teacher's
 * limited panel sign-in cannot reach either page.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connect, startApp } = require('../helpers');
const Admin = require('../../src/models/Admin');
const Organization = require('../../src/organizations/models/Organization');
const OrgAuditLog = require('../../src/organizations/models/OrgAuditLog');

const STAMP = `${Date.now()}`.slice(-7);
const PASS = 'Org-User-Pass1!';
let orgApp, adminApp, org, owner, staff, asOwner, asStaff, userId;
const token = (id) => jwt.sign({ id: String(id) }, process.env.JWT_SECRET, { expiresIn: '10m' });

before(async () => {
    await connect();
    orgApp = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    adminApp = startApp({ mount: '/api/auth', router: require('../../src/routes/authRoutes') });
    org = await Organization.create({ orgCode: `TOU-${STAMP}`, name: `Users College ${STAMP}`, organizationType: 'college', email: `tou-${STAMP}@example.com`, status: 'active' });
    owner = await Admin.create({ name: 'Owner', email: `tou-owner-${STAMP}@example.com`, password: PASS, role: 'orgadmin', organizationId: org._id });
    staff = await Admin.create({ name: 'Staff', email: `tou-staff-${STAMP}@example.com`, password: PASS, role: 'orgadmin', organizationId: org._id, staff: true });
    asOwner = orgApp.call(token(owner._id));
    asStaff = orgApp.call(token(staff._id));
});

after(async () => {
    await Promise.all([
        Admin.deleteMany({ organizationId: org._id }),
        OrgAuditLog.deleteMany({ orgId: org._id }),
        Organization.deleteOne({ _id: org._id })
    ]);
    await new Promise((r) => orgApp.server.close(r));
    await new Promise((r) => adminApp.server.close(r));
    await mongoose.disconnect();
});

test('the owner adds a user, who signs in and has full rights', async () => {
    const added = await asOwner('POST', '/me/users', { name: 'Second', email: `tou-second-${STAMP}@example.com`, password: PASS });
    assert.equal(added.status, 201, JSON.stringify(added.body));
    userId = added.body.user._id;
    const login = await adminApp.call(null)('POST', '/admin/login', { email: `tou-second-${STAMP}@example.com`, password: PASS });
    assert.equal(login.status, 200);
    assert.equal(login.body.organizationId, String(org._id));
    const asUser = orgApp.call(login.body.token);
    // Full rights: settings and teachers, which a staff sign-in cannot reach.
    assert.equal((await asUser('PUT', '/me', { phone: '9876543210' })).status, 200);
    assert.equal((await asUser('GET', '/me/teachers')).status, 200);
    const list = await asOwner('GET', '/me/users');
    assert.deepEqual(list.body.users.map((u) => [u.name, u.owner]), [['Owner', true], ['Second', false]]);
});

test('the owner is protected, and nobody removes themselves', async () => {
    const asUser = orgApp.call(token(userId));
    assert.equal((await asUser('DELETE', `/me/users/${owner._id}`)).status, 403);
    assert.equal((await asUser('PUT', `/me/users/${owner._id}`, { name: 'Hijack' })).status, 403);
    assert.equal((await asUser('DELETE', `/me/users/${userId}`)).status, 400);
    assert.equal((await asOwner('DELETE', `/me/users/${staff._id}`)).status, 404);
});

test('the audit log names who signed in and what they changed', async () => {
    await new Promise((r) => setTimeout(r, 200));
    const log = await asOwner('GET', '/me/audit');
    assert.equal(log.status, 200);
    const mine = log.body.rows.filter((r) => String(r.adminId) === userId).map((r) => r.action);
    assert.ok(mine.includes('Signed in'), JSON.stringify(mine));
    assert.ok(mine.includes('Edited the organization\'s details'), JSON.stringify(mine));
    assert.ok(log.body.rows.some((r) => r.who === 'Owner' && r.action === 'Added a user'));
    const filtered = await asOwner('GET', `/me/audit?adminId=${userId}`);
    assert.ok(filtered.body.rows.every((r) => String(r.adminId) === userId));
});

test('a staff sign-in reaches neither users nor the audit log', async () => {
    assert.equal((await asStaff('GET', '/me/users')).status, 403);
    assert.equal((await asStaff('GET', '/me/audit')).status, 403);
    assert.equal((await asOwner('DELETE', `/me/users/${userId}`)).status, 200);
});
