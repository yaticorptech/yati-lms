/**
 * Admin audit log and Overall analytics (admin panel).
 *
 * A change made through any protectAdmin route is recorded with who made it,
 * what it was done to (named, even after a delete) and whether it worked; a
 * sign-in is recorded, kept or failed; passwords never reach a row; only a
 * super admin can read the log. Overall analytics answers every admin.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { connect, makeUser, makeAdmin, cleanup } = require('../helpers');

const Admin = require('../../src/models/Admin');
const AdminAuditLog = require('../../src/models/AdminAuditLog');

let student, superAdmin, plainAdmin, server, base;
const call = (token) => (method, path, body) => fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
    .then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
// The row is written once the response has gone out: give it a moment.
const rowsFor = async (adminId, extra = {}) => {
    for (let i = 0; i < 20; i++) {
        const rows = await AdminAuditLog.find({ adminId, ...extra }).sort({ at: -1 }).lean();
        if (rows.length) return rows;
        await new Promise((r) => setTimeout(r, 100));
    }
    return [];
};

before(async () => {
    await connect();
    student = await makeUser('Audit');
    superAdmin = await makeAdmin('AuditSuper');
    await Admin.updateOne({ _id: superAdmin.admin._id }, { $set: { role: 'superadmin' } });
    plainAdmin = await makeAdmin('AuditPlain');
    const app = express(); app.use(express.json());
    app.use('/api/auth', require('../../src/routes/authRoutes'));
    app.use('/api/admin', require('../../src/routes/adminRoutes'));
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
    await AdminAuditLog.deleteMany({ adminId: { $in: [superAdmin.admin._id, plainAdmin.admin._id] } });
    await cleanup([student.user], server, [superAdmin.admin, plainAdmin.admin]);
});

describe('admin audit log', () => {
    test('a change is recorded with who, what, on whom and the result', async () => {
        const r = await call(plainAdmin.token)('PUT', `/admin/users/${student.user._id}/status`, { status: 'active', password: 'NeverStoreMe1!' });
        assert.equal(r.status, 200);
        const [row] = await rowsFor(plainAdmin.admin._id, { path: `/api/admin/users/${student.user._id}/status` });
        assert.ok(row, 'row written');
        assert.equal(row.scope, 'platform');
        assert.equal(row.label, "Changed a student's status");
        assert.equal(row.area, 'Students');
        assert.equal(row.status, 200);
        assert.equal(row.adminName, 'AuditPlain Admin');
        assert.equal(row.target.name, 'Audit Student');
        assert.equal(row.target.kind, 'student');
        assert.equal(row.details.status, 'active');
        assert.ok(!JSON.stringify(row).includes('NeverStoreMe1!'), 'no password in the row');
    });

    test('reading a student\'s password is recorded; plain reads are not', async () => {
        await call(plainAdmin.token)('GET', `/admin/users/${student.user._id}/password`);
        await call(plainAdmin.token)('GET', `/admin/users/${student.user._id}`);
        const rows = await rowsFor(plainAdmin.admin._id, { method: 'GET' });
        assert.deepEqual(rows.map((x) => x.label), ["Viewed a student's password"]);
    });

    test('sign-ins are recorded, kept and failed, never with the password', async () => {
        const email = superAdmin.admin.email;
        assert.equal((await call()('POST', '/auth/admin/login', { email, password: 'Wrong-pass-1!' })).status, 401);
        assert.equal((await call()('POST', '/auth/admin/login', { email, password: 'Passw0rd!x' })).status, 200);
        const rows = await rowsFor(superAdmin.admin._id, { area: 'Sign-in' });
        await new Promise((r) => setTimeout(r, 300));
        const all = await AdminAuditLog.find({ adminId: superAdmin.admin._id, area: 'Sign-in' }).lean();
        assert.ok(rows.length);
        assert.deepEqual(all.map((x) => x.label).sort(), ['Failed sign-in (wrong password)', 'Signed in']);
        assert.ok(!JSON.stringify(all).includes('Passw0rd!x'));
    });

    test('only a super admin can read the log; it lists every platform admin, not organization admins', async () => {
        assert.equal((await call(plainAdmin.token)('GET', '/admin/audit-log')).status, 403);
        const r = await call(superAdmin.token)('GET', `/admin/audit-log?adminId=${plainAdmin.admin._id}&area=Students&days=1`);
        assert.equal(r.status, 200);
        assert.ok(r.body.rows.length >= 2);
        assert.ok(r.body.rows.every((x) => x.area === 'Students' && String(x.adminId) === String(plainAdmin.admin._id)));
        assert.ok(r.body.rows.some((x) => x.target?.name === 'Audit Student'));
        // Every platform admin account is offered, with or without entries.
        for (const a of [superAdmin.admin, plainAdmin.admin]) assert.ok(r.body.admins.some((x) => String(x._id) === String(a._id)));
        assert.ok(r.body.admins.every((x) => ['superadmin', 'admin'].includes(x.role)));
        // An organization admin's own action is kept but not listed.
        const orgAdminId = new (require('mongoose').Types.ObjectId)();
        await AdminAuditLog.collection.insertOne({ orgId: new (require('mongoose').Types.ObjectId)(), adminId: orgAdminId, adminName: 'Audit Org Admin', role: 'orgadmin', action: 'access-hours', at: new Date() });
        try {
            const o = await call(superAdmin.token)('GET', '/admin/audit-log?q=Audit%20Org%20Admin&days=1');
            assert.equal(o.body.rows.length, 0);
        } finally { await AdminAuditLog.collection.deleteOne({ adminId: orgAdminId }); }
        const s = await call(superAdmin.token)('GET', '/admin/audit-log?q=Audit%20Student&days=1');
        assert.ok(s.body.rows.some((x) => x.target?.name === 'Audit Student'));
    });
});

describe('overall analytics', () => {
    test('answers any platform admin with the whole-site figures', async () => {
        const r = await call(plainAdmin.token)('GET', '/admin/overall-analytics?fresh=1');
        assert.equal(r.status, 200);
        assert.ok(r.body.people.students >= 1);
        assert.equal(r.body.daily.length, 30);
        for (const k of ['today', 'week', 'month']) assert.equal(typeof r.body.active[k], 'number');
        assert.ok(Array.isArray(r.body.features) && r.body.features.every((f) => typeof f.total === 'number' && typeof f.last30 === 'number'));
        assert.equal(typeof r.body.rewards.walletAvailable, 'number');
    });
});
