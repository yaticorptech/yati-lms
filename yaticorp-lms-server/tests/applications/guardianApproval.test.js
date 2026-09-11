/**
 * Applying for a part-time job when a guardian has to agree first.
 *
 * The age check is the point of this suite: it happens on the server, and a
 * student under fifteen cannot get past it by asking nicely. The other half is
 * who may answer — the guardian, through their link, and nobody else.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { connect, makeUser, makeAdmin, startApp, cleanup } = require('../helpers');

const Opportunity = require('../../src/jobboard/models/Opportunity');
const OpportunityProfile = require('../../src/jobboard/models/OpportunityProfile');
const Application = require('../../src/jobboard/models/JobApplication');

let server, jobsServer, api, guardianCall, adminApi, young, older, admin, job, made = [];

/** A date of birth that makes someone exactly `years` old today. */
const bornYearsAgo = (years) => { const d = new Date(); d.setFullYear(d.getFullYear() - years); d.setDate(d.getDate() - 1); return d; };

const profileFor = async (userId, age) => {
    const from = new Date();
    const to = new Date(from); to.setDate(to.getDate() + 20);
    const row = await OpportunityProfile.create({
        userId, dateOfBirth: bornYearsAgo(age), wantFrom: from, wantTo: to, interests: [],
        guardian: { status: 'none', guardianName: 'Devaki', email: 'devaki.rao@example.com', phone: '9876543210' }
    });
    made.push(row._id);
    return row;
};

before(async () => {
    await connect();
    young = await makeUser('Sowndarya');
    older = await makeUser('Elder');
    admin = await makeAdmin('Ops');
    await profileFor(young.user._id, 13);
    await profileFor(older.user._id, 17);

    const starts = new Date(); starts.setDate(starts.getDate() + 3);
    job = await Opportunity.create({
        slug: `front-desk-${Date.now()}`, title: 'Front Desk Assistant',
        organization: { name: 'ABC Company', verified: true },
        category: 'events', opportunityType: 'event-support',
        startsAt: starts, endsAt: starts, hoursPerSession: '2-4',
        minimumAge: 13, location: { area: 'Whitefield', city: 'Bengaluru' },
        compensation: { label: '₹800' }, safetyClassification: 'supervised',
        safetyNotes: 'An adult supervisor is present for the whole shift.',
        status: 'open', guardianApprovalRequired: true
    });

    const app = startApp({ mount: '/api/jobs', router: require('../../src/jobboard') });
    jobsServer = app.server; server = app.server;
    api = app.call(young.token);
    guardianCall = app.call(null);          // a guardian has no token
    adminApi = app.call(admin.token);
});

after(async () => {
    await Application.deleteMany({ userId: { $in: [young.user._id, older.user._id] } });
    await OpportunityProfile.deleteMany({ _id: { $in: made } });
    if (job) await Opportunity.deleteOne({ _id: job._id });
    if (jobsServer) jobsServer.close();
    await cleanup([young.user, older.user], server, [admin.admin]);
});

/** A fresh application for whoever is calling. */
const apply = async (call, opportunityId) => {
    const r = await call('POST', '/opportunities/applications', { opportunityId });
    return r;
};

describe('the age check', () => {
    test('a student under fifteen is stopped and asked for a guardian', async () => {
        const r = await apply(api, String(job._id));
        assert.equal(r.status, 201);
        assert.equal(r.body.application.status, 'needs-guardian');
        assert.equal(r.body.application.student.age, 13);
        assert.equal(r.body.application.canContinue, false, 'they cannot get on with it yet');
    });

    test('applying again returns the same application rather than a second one', async () => {
        const again = await apply(api, String(job._id));
        assert.equal(again.status, 200);
        const rows = await Application.countDocuments({ userId: young.user._id, opportunityId: String(job._id) });
        assert.equal(rows, 1);
    });

    test('a student of fifteen or over carries straight on', async () => {
        const elder = startApp({ mount: '/api/jobs', router: require('../../src/jobboard') });
        const r = await elder.call(older.token)('POST', '/opportunities/applications', { opportunityId: String(job._id) });
        elder.server.close();
        assert.equal(r.body.application.status, 'ready');
        assert.equal(r.body.application.canContinue, true);
    });

    test('the job the guardian will see is copied off the listing, not linked to it', async () => {
        const r = await api('GET', `/opportunities/applications/${(await Application.findOne({ userId: young.user._id })).id}`);
        const { job: snapshot } = r.body.application;
        assert.equal(snapshot.title, 'Front Desk Assistant');
        assert.equal(snapshot.company, 'ABC Company');
        assert.equal(snapshot.hours, '4 hrs/day');
        assert.equal(snapshot.location, 'Whitefield, Bengaluru');
        assert.ok(snapshot.safety.some((s) => /verified/i.test(s)), 'the safety notes come with it');
    });
});

describe('sending the request', () => {
    const id = async () => String((await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) }))._id);

    test('the guardian is shown by name, with their address masked', async () => {
        const r = await api('GET', `/opportunities/applications/${await id()}`);
        assert.equal(r.body.application.guardian.name, 'Devaki');
        assert.match(r.body.application.guardian.email, /^de•+@example\.com$/);
        assert.equal(/devaki\.rao@example\.com/.test(JSON.stringify(r.body)), false, 'the full address never leaves the server');
        assert.equal(/9876543210/.test(JSON.stringify(r.body)), false, 'nor the full number');
    });

    test('sending it moves the tracker on and mints the guardian a link', async () => {
        const r = await api('POST', `/opportunities/applications/${await id()}/request`);
        assert.equal(r.status, 200);
        const a = r.body.application;
        assert.equal(a.status, 'awaiting-guardian');
        assert.deepEqual(a.steps.map((s) => s.state), ['done', 'active', 'waiting', 'waiting']);
        assert.match(a.guardianLink, /^\/jobs\/guardian\/[A-Za-z0-9_-]{20,}$/);
    });

    test('the guardian is emailed their link, and the reply says whether it went', async () => {
        const row = await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) });
        // Send again so this test sees a fresh reply of its own.
        const r = await api('POST', `/opportunities/applications/${row.id}/request`);
        assert.ok(r.body.mail, 'the send is reported back');
        assert.equal(typeof r.body.mail.sent, 'boolean');
        assert.match(r.body.mail.link, /\/jobs\/guardian\/[A-Za-z0-9_-]{20,}$/, 'the link in the message opens the request');
        assert.match(r.body.mail.to, /•/, 'the address is masked even here');
        assert.equal(/devaki\.rao@example\.com/.test(JSON.stringify(r.body)), false, 'and never returned in full');
    });

    test('the student still cannot continue while it is pending', async () => {
        const r = await api('POST', `/opportunities/applications/${await id()}/continue`);
        assert.equal(r.status, 409);
        assert.match(r.body.error, /cannot continue/);
    });

    test('pressing send again is a reminder, not a second request', async () => {
        const before = await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) }).lean();
        const r = await api('POST', `/opportunities/applications/${await id()}/request`);
        assert.ok(r.body.application.reminders >= 1, 'the press counted as a reminder');
        const after = await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) }).lean();
        assert.equal(after.linkToken, before.linkToken, 'the link the guardian already has keeps working');
    });
});

describe('the guardian decides', () => {
    const token = async () => (await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) })).linkToken;

    test('the link shows the job and the child, and nothing else about the account', async () => {
        const r = await guardianCall('GET', `/guardian-approval/${await token()}`);
        assert.equal(r.status, 200);
        const req = r.body.request;
        assert.equal(req.student.name, 'Sowndarya Student');
        assert.equal(req.job.title, 'Front Desk Assistant');
        assert.equal(req.guardian.name, 'Devaki');
        assert.equal(req.guardian.phone, undefined, 'a guardian is not shown their own number back');
        assert.equal(/@example\.com/.test(JSON.stringify(r.body)), false, 'no email reaches the link');
    });

    test('a made-up link opens nothing', async () => {
        const r = await guardianCall('GET', '/guardian-approval/nottherightlinkatall0000000000');
        assert.equal(r.status, 404);
    });

    test('an operator cannot answer for the guardian, however they try', async () => {
        const id = String((await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) }))._id);
        const before = (await Application.findById(id)).status;
        // Every shape an operator might reach for. None of them may land.
        const attempts = [
            ['POST', `/admin/opportunities/applications/${id}/approve`, {}],
            ['PATCH', `/admin/opportunities/applications/${id}`, { status: 'approved' }],
            ['POST', '/admin/opportunities/applications', { id, status: 'approved' }],
            ['PUT', `/admin/opportunities/applications/${id}`, { status: 'approved' }]
        ];
        for (const [method, path, body] of attempts) {
            const r = await adminApi(method, path, body);
            assert.ok(r.status >= 400, `${method} ${path} should be refused, got ${r.status}`);
        }
        assert.equal((await Application.findById(id)).status, before, 'the decision is untouched');
    });

    test('approving moves every screen on together', async () => {
        const r = await guardianCall('POST', `/guardian-approval/${await token()}/approve`);
        assert.equal(r.status, 200);
        assert.equal(r.body.request.status, 'approved');
        const student = await api('GET', `/opportunities/applications/${String((await Application.findOne({ userId: young.user._id }))._id)}`);
        assert.equal(student.body.application.status, 'approved');
        assert.deepEqual(student.body.application.steps.map((s) => s.state), ['done', 'done', 'done', 'active']);
        assert.equal(student.body.application.canContinue, true);
    });

    test('a decision cannot be changed by opening the link again', async () => {
        const r = await guardianCall('POST', `/guardian-approval/${await token()}/decline`, { reason: 'changed my mind' });
        assert.equal(r.status, 409);
        assert.match(r.body.error, /already been answered/);
    });

    test('the student can now continue, and only now', async () => {
        const id = String((await Application.findOne({ userId: young.user._id }))._id);
        const r = await api('POST', `/opportunities/applications/${id}/continue`);
        assert.equal(r.status, 200);
        assert.equal(r.body.application.status, 'continued');
        assert.deepEqual(r.body.application.steps.map((s) => s.state), ['done', 'done', 'done', 'done']);
    });
});

describe('when the guardian says no', () => {
    let second;
    before(async () => {
        const starts = new Date(); starts.setDate(starts.getDate() + 5);
        second = await Opportunity.create({
            slug: `stall-help-${Date.now()}`, title: 'Stall Helper',
            organization: { name: 'ABC Company', verified: true },
            category: 'events', opportunityType: 'event-support',
            startsAt: starts, endsAt: starts, hoursPerSession: '1-2',
            minimumAge: 13, location: { area: 'Jayanagar', city: 'Bengaluru' },
            status: 'open', guardianApprovalRequired: true
        });
    });
    after(async () => { if (second) await Opportunity.deleteOne({ _id: second._id }); });

    test('the application is blocked, with the reason kept', async () => {
        const made = await apply(api, String(second._id));
        const id = made.body.application.id;
        await api('POST', `/opportunities/applications/${id}/request`);
        const row = await Application.findById(id);

        const r = await guardianCall('POST', `/guardian-approval/${row.linkToken}/decline`, { reason: 'School exams that week.' });
        assert.equal(r.body.request.status, 'declined');

        const student = await api('GET', `/opportunities/applications/${id}`);
        assert.equal(student.body.application.status, 'declined');
        assert.equal(student.body.application.canContinue, false);
        assert.equal(student.body.application.declineReason, 'School exams that week.');
        assert.deepEqual(student.body.application.steps.map((s) => s.state), ['done', 'done', 'blocked', 'blocked']);

        const blocked = await api('POST', `/opportunities/applications/${id}/continue`);
        assert.equal(blocked.status, 409, 'a declined application goes nowhere');
    });
});

describe('the parent\'s details, entered once', () => {
    test('the name saved with the profile is the one the request is addressed to', async () => {
        const app = startApp({ mount: '/api/jobs', router: require('../../src/jobboard') });
        let third;
        try {
        const call = app.call(young.token);
        // The student fills in the part-time form: dates, interests, parent.
        const from = new Date(); const to = new Date(from); to.setDate(to.getDate() + 20);
        const saved = await call('PUT', '/opportunities/profile', {
            dateOfBirth: bornYearsAgo(13).toISOString().slice(0, 10),
            wantFrom: from.toISOString().slice(0, 10), wantTo: to.toISOString().slice(0, 10),
            interests: ['events'], guardianName: 'Devaki', guardianEmail: 'devaki.rao@example.com', guardianPhone: '7635492435'
        });
        assert.equal(saved.status, 200, JSON.stringify(saved.body));
        assert.equal(saved.body.profile.guardianName, 'Devaki', 'the form gets its own answer back');
        assert.equal(saved.body.profile.guardianEmail, 'devaki.rao@example.com');

        // A new application picks both up without being asked again.
        const starts = new Date(); starts.setDate(starts.getDate() + 9);
        third = await Opportunity.create({
            slug: `counter-help-${Date.now()}`, title: 'Counter Helper',
            organization: { name: 'ABC Company', verified: true },
            category: 'events', opportunityType: 'event-support',
            startsAt: starts, endsAt: starts, hoursPerSession: '1-2',
            minimumAge: 13, location: { area: 'Whitefield', city: 'Bengaluru' },
            status: 'open', guardianApprovalRequired: true
        });
        const made = await call('POST', '/opportunities/applications', { opportunityId: String(third._id) });
        assert.equal(made.body.application.guardian.name, 'Devaki');
        assert.match(made.body.application.guardian.email, /^de•+@example\.com$/, 'the address they typed, masked');

        // And it can be sent without a second trip to the form.
        const sent = await call('POST', `/opportunities/applications/${made.body.application.id}/request`);
        assert.equal(sent.status, 200, JSON.stringify(sent.body));
        assert.equal(sent.body.application.status, 'awaiting-guardian');

        } finally {
            app.server.close();
            if (third) await Opportunity.deleteOne({ _id: third._id });
        }
    });

    test('a young student cannot save the form without a guardian address', async () => {
        const app = startApp({ mount: '/api/jobs', router: require('../../src/jobboard') });
        let r;
        try {
        const from = new Date(); const to = new Date(from); to.setDate(to.getDate() + 20);
        r = await app.call(young.token)('PUT', '/opportunities/profile', {
            dateOfBirth: bornYearsAgo(13).toISOString().slice(0, 10),
            wantFrom: from.toISOString().slice(0, 10), wantTo: to.toISOString().slice(0, 10),
            interests: ['events'], guardianPhone: '7635492435'
        });
        } finally { app.server.close(); }
        assert.equal(r.status, 400);
        assert.match(r.body.error, /email/i);
    });
});

describe('what an operator sees', () => {
    test('every application, its guardian and where the permission stands', async () => {
        const r = await adminApi('GET', '/admin/opportunities/applications');
        assert.equal(r.status, 200);
        const ours = r.body.applications.filter((a) => a.student.name.startsWith('Sowndarya'));
        assert.ok(ours.length >= 2, 'both applications are listed');
        const row = ours.find((a) => a.job.title === 'Front Desk Assistant');
        assert.equal(row.guardian.name, 'Devaki');
        assert.equal(row.underAge, true);
        assert.match(row.guardian.email, /•/, 'the address stays masked for operators too');
        assert.ok(Array.isArray(row.steps) && row.steps.length === 4);
    });
});
