/**
 * Organizations at scale, and the workflow gaps around membership: paging the
 * student list, the request badge agreeing with the list, a student leaving an
 * organization that has closed, closing an organization settling its queue,
 * deleting a rejected registration, sessions ending on a password change,
 * contact details in request history, races on approval and on the course
 * limit, the logo upload, the audit log, and the status rules.
 *
 * Builds its own organizations, administrators and students, and removes every
 * one of them — with their courses, requests and audit rows — afterwards.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');

const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
const Organization = () => require('../../src/organizations/models/Organization');
const JoinRequest = () => require('../../src/organizations/models/JoinRequest');
const OrgAuditLog = () => require('../../src/organizations/models/OrgAuditLog');
const User = () => require('../../src/models/User');
const Admin = () => require('../../src/models/Admin');
const Course = () => require('../../src/models/Course');

let orgApp, adminApp, base;
let boss, plain;
const orgs = [];
const orgAdmins = [];
const students = [];

const makeOrg = async (label, over = {}) => {
    const org = await Organization().create({
        orgCode: `w_${label.toLowerCase()}_${STAMP}`, name: `Workflow ${label} ${STAMP}`, organizationType: 'college',
        email: `wf-${label.toLowerCase()}-${STAMP}@example.com`, status: 'active', approvedAt: new Date(), ...over
    });
    orgs.push(org);
    return org;
};
const makeOrgAdmin = async (org) => {
    const admin = await Admin().create({ name: `${org.name} Admin`, email: `wf-admin-${org._id}@example.com`, password: 'Passw0rd!x', role: 'orgadmin', organizationId: org._id });
    orgAdmins.push(admin);
    return { admin, token: jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: '10m' }) };
};
const student = async (label, set = {}) => {
    const s = await makeUser(label);
    students.push(s.user);
    if (Object.keys(set).length) await User().updateOne({ _id: s.user._id }, { $set: set });
    return s;
};
const api = (token, headers = {}) => (method, path, body) => fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined
}).then(async (r) => ({ status: r.status, headers: r.headers, body: await r.json().catch(() => ({})) }));

before(async () => {
    await connect();
    orgApp = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    adminApp = startApp({ mount: '/api/admin', router: require('../../src/routes/adminRoutes') });
    base = `http://127.0.0.1:${orgApp.server.address().port}/api/organizations`;
    boss = await makeAdmin('WfSuper');
    await Admin().updateOne({ _id: boss.admin._id }, { $set: { role: 'superadmin' } });
    plain = await makeAdmin('WfPlain');
});

after(async () => {
    const ids = orgs.map((o) => o._id);
    await Course().deleteMany({ organizationId: { $in: ids } });
    await JoinRequest().deleteMany({ organizationId: { $in: ids } });
    await OrgAuditLog().deleteMany({ orgId: { $in: ids } });
    await Organization().deleteMany({ _id: { $in: ids } });
    await require('../../src/models/Enrollment').deleteMany({ userId: { $in: students.map((s) => s._id) } });
    await new Promise((r) => adminApp.server.close(r));
    await cleanup(students, orgApp.server, [...orgAdmins, boss.admin, plain.admin]);
});

describe('the paged student list', () => {
    let org, asOrg, course;

    before(async () => {
        org = await makeOrg('Paged');
        asOrg = api((await makeOrgAdmin(org)).token);
        const now = Date.now();
        // Five members: one finished every course, one active recently with
        // nothing started, one blocked, two never active.
        const done = await student(`Pg${STAMP}Amy`, { organizationId: org._id, organizationJoinedAt: new Date(now - 5000) });
        await student(`Pg${STAMP}Bob`, { organizationId: org._id, organizationJoinedAt: new Date(now - 4000), lastActiveDate: new Date(now - 2 * 86400000) });
        await student(`Pg${STAMP}Cat`, { organizationId: org._id, organizationJoinedAt: new Date(now - 3000), status: 'blocked' });
        await student(`Pg${STAMP}Dan`, { organizationId: org._id, organizationJoinedAt: new Date(now - 2000), lastActiveDate: new Date(now - 90 * 86400000) });
        await student(`Pg${STAMP}Eve`, { organizationId: org._id, organizationJoinedAt: new Date(now - 1000) });

        course = await Course().create({ title: `Paged course ${STAMP}`, organizationId: org._id });
        await require('../../src/models/Enrollment').create({ userId: done.user._id, courseId: course._id, type: 'Course' });
        await require('../../src/models/Progress').create({ userId: done.user._id, courseId: course._id, percentage: 100 });
    });

    test('without page, the whole list in its old shape', async () => {
        const r = await asOrg('GET', '/me/students');
        assert.equal(r.status, 200);
        assert.equal(r.body.students.length, 5);
        assert.equal(r.body.total, undefined, 'no paging fields unless asked');
    });

    test('pages carry total, page and limit, sorted by name', async () => {
        const p1 = await asOrg('GET', '/me/students?page=1&limit=2');
        assert.equal(p1.status, 200);
        assert.deepEqual([p1.body.total, p1.body.page, p1.body.limit], [5, 1, 2]);
        assert.deepEqual(p1.body.students.map((s) => s.name.replace(`Pg${STAMP}`, '')), ['Amy Student', 'Bob Student']);
        const p3 = await asOrg('GET', '/me/students?page=3&limit=2');
        assert.equal(p3.body.students.length, 1);
        assert.equal((await asOrg('GET', '/me/students?page=1&limit=1000')).body.limit, 100, 'limit is capped');
        assert.equal((await asOrg('GET', '/me/students?page=1')).body.limit, 25, 'and defaults to 25');
    });

    test('search is literal and case-insensitive', async () => {
        const r = await asOrg('GET', `/me/students?page=1&search=${encodeURIComponent(`pg${STAMP}dAN`)}`);
        assert.equal(r.body.total, 1);
        assert.match(r.body.students[0].name, /Dan/);
        assert.equal((await asOrg('GET', '/me/students?page=1&search=.*')).body.total, 0, 'a pattern is not a wildcard');
    });

    test('sorts by progress, recent activity and join date', async () => {
        const progress = await asOrg('GET', '/me/students?page=1&sort=progress');
        assert.match(progress.body.students[0].name, /Amy/);
        assert.equal(progress.body.students[0].progressPercent, 100);
        const recent = await asOrg('GET', '/me/students?page=1&sort=recent');
        assert.match(recent.body.students[0].name, /Amy|Bob/);
        assert.deepEqual(recent.body.students.map((s) => s.name), (await asOrg('GET', '/me/students?page=1&sort=active')).body.students.map((s) => s.name), 'active is an alias');
        const joined = await asOrg('GET', '/me/students?page=1&sort=joined');
        assert.match(joined.body.students[0].name, /Eve/, 'newest member first');
    });

    test('filters partition the members', async () => {
        const count = async (f) => (await asOrg('GET', `/me/students?page=1&filter=${f}`)).body.total;
        const [all, active30, inactive, blocked, notStarted, completed] = await Promise.all(
            ['all', 'active30', 'inactive', 'blocked', 'notStarted', 'completed'].map(count)
        );
        assert.equal(all, 5);
        assert.equal(blocked, 1);
        assert.equal(active30 + inactive + blocked, all, 'active30 + inactive + blocked = all');
        assert.equal(active30, 2, 'Amy (progress just now) and Bob (two days ago)');
        assert.equal(completed, 1);
        assert.equal(notStarted, 4);
    });
});

describe('the request badge and the list agree', () => {
    test('a request from a deleted account counts in neither', async () => {
        const org = await makeOrg('Badge');
        const asOrg = api((await makeOrgAdmin(org)).token);
        const live = await student('BadgeLive');
        const gone = await student('BadgeGone');
        await JoinRequest().create({ userId: live.user._id, organizationId: org._id });
        await JoinRequest().create({ userId: gone.user._id, organizationId: org._id });
        await User().deleteOne({ _id: gone.user._id });

        const count = await asOrg('GET', '/me/requests/count');
        assert.equal(count.status, 200);
        assert.deepEqual(count.body, { pending: 1 });
        const list = await asOrg('GET', '/me/requests');
        assert.equal(list.body.requests.length, 1);
        assert.equal(list.body.pendingCount, 1);
        assert.equal((await asOrg('GET', '/me/dashboard')).body.stats.pendingRequests, 1);
    });
});

describe('leaving, and being told you were removed', () => {
    test('an active organization cannot be left; a suspended one can', async () => {
        const org = await makeOrg('Leave');
        const s = await student('Leaver', { organizationId: org._id, organizationJoinedAt: new Date() });
        await JoinRequest().create({ userId: s.user._id, organizationId: org._id, status: 'approved' });
        const asS = api(s.token);

        const refused = await asS('POST', '/student/leave');
        assert.equal(refused.status, 409);
        assert.equal(refused.body.code, 'ORGANIZATION_ACTIVE');

        await Organization().updateOne({ _id: org._id }, { $set: { status: 'suspended' } });
        const left = await asS('POST', '/student/leave');
        assert.equal(left.status, 200);
        assert.equal((await User().findById(s.user._id).lean()).organizationId, null);
        const req = await JoinRequest().findOne({ userId: s.user._id, organizationId: org._id }).lean();
        assert.equal(req.status, 'cancelled');
        assert.equal(req.decisionReason, 'Left the organization');

        assert.equal((await asS('POST', '/student/leave')).status, 400, 'nothing left to leave');
    });

    test('a dangling organization counts as none: leave works and joining is not blocked by it', async () => {
        const target = await makeOrg('Target');
        const ghost = new (require('mongoose').Types.ObjectId)();
        const s = await student('Ghosted', { organizationId: ghost });
        const asS = api(s.token);
        const join = await asS('POST', '/student/requests', { orgCode: target.orgCode });
        assert.equal(join.status, 201, 'a deleted organization does not block a new request');
        assert.equal((await asS('POST', '/student/leave')).status, 200);
    });

    test('the student sees who removed them', async () => {
        const org = await makeOrg('Remover');
        const asOrg = api((await makeOrgAdmin(org)).token);
        const s = await student('Removed', { organizationId: org._id, organizationJoinedAt: new Date() });
        await JoinRequest().create({ userId: s.user._id, organizationId: org._id, status: 'approved' });
        assert.equal((await asOrg('DELETE', `/me/students/${s.user._id}`)).status, 200);

        const me = await api(s.token)('GET', '/student/me');
        assert.equal(me.body.member, false);
        assert.equal(me.body.removed.organizationName, org.name);
        assert.equal(me.body.removed.reason, 'Removed by the organization');
        assert.ok(me.body.removed.at);

        const other = await student('NeverRemoved');
        assert.equal('removed' in (await api(other.token)('GET', '/student/me')).body, false, 'absent when it does not apply');
    });

    test('createRequest points a member of a closed organization at leaving', async () => {
        const closed = await makeOrg('Closed', { status: 'inactive' });
        const open = await makeOrg('Open');
        const s = await student('Stuck', { organizationId: closed._id });
        const r = await api(s.token)('POST', '/student/requests', { orgCode: open.orgCode });
        assert.equal(r.status, 409);
        assert.match(r.body.message, /Leave organization/);
    });
});

describe('closing an organization', () => {
    test('suspending it closes its waiting requests with a reason', async () => {
        const org = await makeOrg('Suspend');
        const s = await student('Waiting');
        await JoinRequest().create({ userId: s.user._id, organizationId: org._id });
        const r = await api(boss.token)('PUT', `/admin/${org._id}/status`, { status: 'suspended', reason: 'Audit' });
        assert.equal(r.status, 200);
        const req = await JoinRequest().findOne({ userId: s.user._id }).lean();
        assert.equal(req.status, 'cancelled');
        assert.equal(req.decisionReason, 'Organization is not accepting members');
        const me = await api(s.token)('GET', '/student/me');
        assert.equal(me.body.request.decisionReason, 'Organization is not accepting members', 'and the student is shown it');
    });

    test('illegal transitions are refused', async () => {
        const pending = await makeOrg('Pend', { status: 'pending', approvedAt: null });
        const active = await makeOrg('Act');
        const asBoss = api(boss.token);
        assert.equal((await asBoss('PUT', `/admin/${pending._id}/status`, { status: 'suspended' })).status, 400);
        assert.equal((await asBoss('PUT', `/admin/${active._id}/status`, { status: 'rejected', reason: 'x' })).body.code, 'ILLEGAL_TRANSITION');
        await Organization().updateOne({ _id: active._id }, { $set: { status: 'suspended' } });
        assert.equal((await asBoss('PUT', `/admin/${active._id}/status`, { status: 'inactive' })).status, 400, 'no jumping between closed states');
        assert.equal((await asBoss('PUT', `/admin/${active._id}/status`, { status: 'active' })).status, 200);
    });

    test('nobody can be assigned to a rejected organization', async () => {
        const rejected = await makeOrg('Rej', { status: 'rejected', approvedAt: null });
        const s = await student('NotAssigned');
        const r = await api(boss.token)('POST', `/admin/${rejected._id}/students`, { studentId: String(s.user._id) });
        assert.equal(r.status, 400);
        assert.match(r.body.message, /rejected/i);
    });
});

describe('deleting a rejected registration', () => {
    test('only rejected, never approved, empty — and it frees the ID and email', async () => {
        const asBoss = api(boss.token);
        const active = await makeOrg('DelActive');
        assert.equal((await asBoss('DELETE', `/admin/${active._id}`)).status, 409);
        const once = await makeOrg('DelOnce', { status: 'rejected' }); // approvedAt set: it once operated
        assert.equal((await asBoss('DELETE', `/admin/${once._id}`)).status, 409);
        const full = await makeOrg('DelFull', { status: 'rejected', approvedAt: null });
        await student('Member', { organizationId: full._id });
        assert.equal((await asBoss('DELETE', `/admin/${full._id}`)).status, 409, 'not with a member');

        const squat = await makeOrg('DelSquat', { status: 'rejected', approvedAt: null });
        const { admin } = await makeOrgAdmin(squat);
        await JoinRequest().create({ userId: students[0]._id, organizationId: squat._id, status: 'rejected' });
        assert.equal((await api(plain.token)('DELETE', `/admin/${squat._id}`)).status, 403, 'superadmins only');
        const r = await asBoss('DELETE', `/admin/${squat._id}`);
        assert.equal(r.status, 200);
        assert.equal(await Organization().exists({ _id: squat._id }), null);
        assert.equal(await Admin().exists({ _id: admin._id }), null);
        assert.equal(await JoinRequest().countDocuments({ organizationId: squat._id }), 0);
        const free = await api(null)('GET', `/code-available?code=${squat.orgCode}`);
        assert.equal(free.body.available, true, 'the ID is free again');
        const log = await asBoss('GET', `/admin/${squat._id}/audit`);
        assert.ok(log.body.entries.some((e) => e.action === 'delete'), 'and who did it is logged');
    });
});

describe('deleting a student', () => {
    test('their join requests go with them', async () => {
        const org = await makeOrg('DelUser');
        const s = await student('Deleted');
        await JoinRequest().create({ userId: s.user._id, organizationId: org._id });
        const r = await adminApp.call(plain.token)('DELETE', `/users/${s.user._id}`);
        assert.equal(r.status, 200);
        assert.equal(await JoinRequest().countDocuments({ userId: s.user._id }), 0);
    });
});

describe('sessions end when a password changes', () => {
    test('a platform admin token issued before the change is refused', async () => {
        const { admin } = await makeAdmin('WfRotate');
        orgAdmins.push(admin);
        const old = jwt.sign({ id: String(admin._id), iat: Math.floor(Date.now() / 1000) - 5 }, process.env.JWT_SECRET);
        assert.notEqual((await adminApp.call(old)('GET', '/admins')).status, 401, 'works before the change');
        const doc = await Admin().findById(admin._id);
        doc.password = 'Rotated#Pass123';
        await doc.save();
        const r = await adminApp.call(old)('GET', '/admins');
        assert.equal(r.status, 401);
        assert.equal(r.body.code, 'PASSWORD_CHANGED');
        const fresh = jwt.sign({ id: String(admin._id) }, process.env.JWT_SECRET);
        assert.notEqual((await adminApp.call(fresh)('GET', '/admins')).status, 401, 'a new sign-in works');
    });
});

describe('request history', () => {
    test('contact details only for pending requests and current members', async () => {
        const org = await makeOrg('History');
        const asOrg = api((await makeOrgAdmin(org)).token);
        const asking = await student('Asking');
        const turnedDown = await student('TurnedDown');
        const member = await student('Member', { organizationId: org._id });
        await JoinRequest().create({ userId: asking.user._id, organizationId: org._id });
        await JoinRequest().create({ userId: turnedDown.user._id, organizationId: org._id, status: 'rejected' });
        await JoinRequest().create({ userId: member.user._id, organizationId: org._id, status: 'approved' });

        const pending = (await asOrg('GET', '/me/requests')).body.requests[0].student;
        assert.equal(pending.email, asking.user.email);
        const rejected = (await asOrg('GET', '/me/requests?status=rejected')).body.requests[0].student;
        assert.deepEqual(Object.keys(rejected).sort(), ['_id', 'contactHidden', 'name', 'profilePicture']);
        const approved = (await asOrg('GET', '/me/requests?status=approved')).body.requests[0].student;
        assert.equal(approved.email, member.user.email, 'a current member keeps theirs');
    });
});

describe('races', () => {
    test('approve and reject at once: one wins, and the record agrees with it', async () => {
        const org = await makeOrg('Race');
        const { token } = await makeOrgAdmin(org);
        const s = await student('Raced');
        const req = await JoinRequest().create({ userId: s.user._id, organizationId: org._id });
        const [a, b] = await Promise.all([
            api(token)('PUT', `/me/requests/${req._id}`, { decision: 'approve' }),
            api(token)('PUT', `/me/requests/${req._id}`, { decision: 'reject' })
        ]);
        assert.deepEqual([a.status, b.status].sort(), [200, 404]);
        const final = await JoinRequest().findById(req._id).lean();
        const user = await User().findById(s.user._id).lean();
        if (final.status === 'approved') assert.equal(String(user.organizationId), String(org._id));
        else { assert.equal(final.status, 'rejected'); assert.equal(user.organizationId, null); }
    });

    test('a student who joined elsewhere meanwhile: 409, and the request is settled', async () => {
        const org = await makeOrg('Late');
        const other = await makeOrg('Earlier');
        const { token } = await makeOrgAdmin(org);
        const s = await student('Elsewhere');
        const req = await JoinRequest().create({ userId: s.user._id, organizationId: org._id });
        await User().updateOne({ _id: s.user._id }, { $set: { organizationId: other._id } });
        const r = await api(token)('PUT', `/me/requests/${req._id}`, { decision: 'approve' });
        assert.equal(r.status, 409);
        const final = await JoinRequest().findById(req._id).lean();
        assert.equal(final.status, 'cancelled');
        assert.equal(final.decisionReason, 'Joined another organization');
        assert.equal(String((await User().findById(s.user._id).lean()).organizationId), String(other._id), 'not moved');
    });

    test('creating courses at once never passes the limit', async () => {
        const org = await makeOrg('Limit', { logo: 'https://cdn.example.com/l.png', courseAccess: { enabled: true, limit: 2 } });
        const { token } = await makeOrgAdmin(org);
        const results = await Promise.all(Array.from({ length: 6 }, (_, i) => api(token)('POST', '/me/courses', { title: `Race course ${i} ${STAMP}` })));
        const made = await Course().countDocuments({ organizationId: org._id });
        assert.ok(made <= 2, `made ${made}`);
        assert.equal(results.filter((r) => r.status === 201).length, made);
        assert.ok(results.every((r) => r.status === 201 || r.status === 409));
    });
});

describe('the logo', () => {
    test('an SVG upload is refused by its content', async () => {
        const org = await makeOrg('Logo');
        const { token } = await makeOrgAdmin(org);
        const fd = new FormData();
        fd.append('image', new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], { type: 'image/svg+xml' }), 'logo.svg');
        const r = await fetch(`${base}/me/logo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        assert.equal(r.status, 400);
        const renamed = new FormData();
        renamed.append('image', new Blob(['<svg/>'], { type: 'image/png' }), 'logo.png');
        assert.equal((await fetch(`${base}/me/logo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: renamed })).status, 400, 'nor one renamed .png');
        assert.equal((await Organization().findById(org._id).lean()).logo, '');
    });

    test('magic bytes decide', () => {
        const { isRasterImage } = require('../../src/organizations/controllers/orgAdminController');
        assert.equal(isRasterImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])), true);
        assert.equal(isRasterImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])), true);
        assert.equal(isRasterImage(Buffer.from('RIFF\0\0\0\0WEBPVP8 ')), true);
        assert.equal(isRasterImage(Buffer.from('GIF89a......')), true);
        assert.equal(isRasterImage(Buffer.from('<svg xmlns="x"/>')), false);
    });

    test('PUT /me ignores a logo', async () => {
        const org = await makeOrg('LogoPut');
        const { token } = await makeOrgAdmin(org);
        assert.equal((await api(token)('PUT', '/me', { logo: 'https://evil.example/x.png', phone: '9876543210' })).status, 200);
        const fresh = await Organization().findById(org._id).lean();
        assert.equal(fresh.logo, '');
        assert.equal(fresh.phone, '9876543210');
    });
});

describe('the audit log', () => {
    test('status changes and view-mode writes are recorded', async () => {
        const org = await makeOrg('Audit');
        const asBoss = api(boss.token);
        assert.equal((await asBoss('PUT', `/admin/${org._id}/status`, { status: 'suspended', reason: 'Audit test' })).status, 200);
        assert.equal((await asBoss('PUT', `/admin/${org._id}/status`, { status: 'active' })).status, 200);
        const viewing = api(boss.token, { 'X-View-Organization': String(org._id) });
        assert.equal((await viewing('PUT', '/me', { phone: '9123456789' })).status, 200);
        assert.equal((await viewing('GET', '/me')).status, 200);

        // The view-mode row is written once the response has finished.
        let entries = [];
        for (let i = 0; i < 20; i += 1) {
            entries = (await asBoss('GET', `/admin/${org._id}/audit`)).body.entries;
            if (entries.some((e) => e.action === 'view-mode-write')) break;
            await new Promise((r) => setTimeout(r, 100));
        }
        assert.equal(entries.filter((e) => e.action === 'status').length, 2);
        const write = entries.find((e) => e.action === 'view-mode-write');
        assert.ok(write, 'the view-mode write is there');
        assert.equal(write.method, 'PUT');
        assert.equal(String(write.adminId), String(boss.admin._id));
        assert.equal(entries.filter((e) => e.action === 'view-mode-write').length, 1, 'reads are not logged');
        assert.equal((await api(plain.token)('GET', `/admin/${org._id}/audit`)).status, 403);
    });
});

describe('the paged superadmin lists', () => {
    test('organizations and an organization\'s students page on request', async () => {
        const asBoss = api(boss.token);
        const unpaged = await asBoss('GET', `/admin?search=${STAMP}`);
        assert.equal(unpaged.body.total, undefined);
        const paged = await asBoss('GET', `/admin?search=${STAMP}&page=1&limit=3`);
        assert.equal(paged.body.organizations.length, 3);
        assert.equal(paged.body.total, unpaged.body.organizations.length);
        assert.deepEqual([paged.body.page, paged.body.limit], [1, 3]);

        const org = orgs.find((o) => o.name.includes('Paged'));
        const r = await asBoss('GET', `/admin/${org._id}/students?page=2&limit=2`);
        assert.deepEqual([r.body.total, r.body.page, r.body.limit, r.body.students.length], [5, 2, 2, 2]);
        const searched = await asBoss('GET', `/admin/${org._id}/students?page=1&search=${encodeURIComponent(`Pg${STAMP}Eve`)}`);
        assert.equal(searched.body.total, 1);
    });
});

describe('lookups are rate limited', () => {
    test('code-available and student lookup carry the lookup limiter', async () => {
        const s = await student('Looker');
        const lookup = await api(s.token)('GET', '/student/lookup/w_none_here');
        assert.equal(lookup.headers.get('ratelimit-limit') || lookup.headers.get('ratelimit-policy')?.split(';')[0], '60');
        let last;
        for (let i = 0; i < 61; i += 1) last = await api(null)('GET', `/code-available?code=w_probe_${i}`);
        assert.equal(last.status, 429);
    });
});

describe('a rejected organization', () => {
    test('can read its own status, and nothing else under /me', async () => {
        const org = await makeOrg('Rejected', { status: 'rejected', statusReason: 'Not a real institution' });
        const { token } = await makeOrgAdmin(org);
        const asOrg = api(token);
        const status = await asOrg('GET', '/me/status');
        assert.equal(status.status, 200);
        assert.equal(status.body.organization.status, 'rejected');
        for (const path of ['/me', '/me/dashboard', '/me/students', '/me/requests', '/me/requests/count', '/me/courses']) {
            const r = await asOrg('GET', path);
            assert.equal(r.status, 403, path);
            assert.equal(r.body.code, 'ORGANIZATION_NOT_ACTIVE', path);
        }
        const write = await asOrg('PUT', '/me', { name: 'Renamed' });
        assert.equal(write.status, 403);
    });
});
