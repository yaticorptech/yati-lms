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

/**
 * No message leaves this machine.
 *
 * These tests used to send for real, through whatever provider the developer's
 * .env happened to point at, to a fixture address that does not exist. Every
 * one of them bounced back into the sender's own inbox — thirty-seven of them
 * in a single afternoon. A test suite has no business putting mail on the
 * internet, so the sender is replaced here, once, for the whole file.
 *
 * What the mail actually contains is asserted where it matters, by swapping
 * this stub for one that keeps the message (see the buttons test below).
 * Real delivery is proved in tests/email/emailService.test.js, against an SMTP
 * server that runs inside that test.
 */
const mailer = require('../../src/utils/emailService');
const sentHere = [];
mailer.sendEmail = async (msg) => { sentHere.push(msg); };

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
    // Sending a real request opens a pooled SMTP connection; left open, the
    // test process stays alive after the last assertion and never exits.
    require('../../src/utils/emailService').closeEmailTransport();
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
        // A request already delivered is never sent twice, so this test asks
        // down the one path that does send: the retry after a refused send.
        await Application.updateOne({ _id: row._id }, { $set: { mailSentAt: null } });
        const r = await api('POST', `/opportunities/applications/${row.id}/request`);
        assert.ok(r.body.mail, 'the send is reported back');
        assert.equal(typeof r.body.mail.sent, 'boolean');
        assert.match(r.body.mail.link, /\/jobs\/guardian\/[A-Za-z0-9_-]{20,}$/, 'the link in the message opens the request');
        assert.match(r.body.mail.to, /•/, 'the address is masked even here');
        assert.equal(/devaki\.rao@example\.com/.test(JSON.stringify(r.body)), false, 'and never returned in full');
    });

    test('the mail carries both answers as buttons, and neither one decides on its own', async () => {
        const mailer = require('../../src/utils/emailService');
        const real = mailer.sendEmail;
        let html = '';
        mailer.sendEmail = async (msg) => { html = msg.htmlContent; };
        try {
            const row = await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) });
            await Application.updateOne({ _id: row._id }, { $set: { mailSentAt: null } });
            await api('POST', `/opportunities/applications/${row.id}/request`);
        } finally {
            mailer.sendEmail = real;
        }

        const token = (await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) })).linkToken;
        assert.ok(html.includes(`/jobs/guardian/${token}?answer=approve`), 'an approve button');
        assert.ok(html.includes(`/jobs/guardian/${token}?answer=decline`), 'and a decline button');
        assert.match(html, /I approve/);
        assert.match(html, /do not approve/);

        // The answer is carried, never acted on: a scanner fetching either
        // address must leave the application exactly where it was.
        assert.equal((await Application.findById((await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) }))._id)).status,
            'awaiting-guardian', 'building the mail decides nothing');
    });

    test('the student still cannot continue while it is pending', async () => {
        const r = await api('POST', `/opportunities/applications/${await id()}/continue`);
        assert.equal(r.status, 409);
        assert.match(r.body.error, /cannot continue/);
    });

    test('pressing send again mails nobody a second time', async () => {
        const before = await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) }).lean();
        assert.ok(before.mailSentAt, 'the first send was accepted');

        const mailer = require('../../src/utils/emailService');
        const real = mailer.sendEmail;
        let sends = 0;
        mailer.sendEmail = async () => { sends += 1; };
        let r;
        try {
            r = await api('POST', `/opportunities/applications/${await id()}/request`);
        } finally {
            mailer.sendEmail = real;
        }

        assert.equal(sends, 0, 'no second message left the server');
        assert.equal(r.status, 409);
        assert.match(r.body.error, /already sent/i);

        const after = await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) }).lean();
        assert.equal(after.linkToken, before.linkToken, 'the link the guardian already has keeps working');
        assert.deepEqual(after.mailSentAt, before.mailSentAt, 'and the record of the one send is untouched');
    });

    test('a send the provider refused may be tried again', async () => {
        const row = await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) });
        // Put it back to the state a refused send leaves behind.
        await Application.updateOne({ _id: row._id }, { $set: { mailSentAt: null } });

        const mailer = require('../../src/utils/emailService');
        const real = mailer.sendEmail;
        let sends = 0;
        mailer.sendEmail = async () => { sends += 1; };
        try {
            const r = await api('POST', `/opportunities/applications/${row.id}/request`);
            assert.equal(r.status, 200, 'a message that never arrived may be sent again');
        } finally {
            mailer.sendEmail = real;
        }
        assert.equal(sends, 1, 'exactly one retry, not a flood');

        const after = await Application.findOne({ _id: row._id }).lean();
        assert.ok(after.mailSentAt, 'and once accepted, the door closes again');
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

    test('approving hands the application to the LMS, it does not finish it', async () => {
        const r = await guardianCall('POST', `/guardian-approval/${await token()}/approve`);
        assert.equal(r.status, 200);
        assert.equal(r.body.request.status, 'awaiting-admin');
        const student = await api('GET', `/opportunities/applications/${String((await Application.findOne({ userId: young.user._id }))._id)}`);
        assert.equal(student.body.application.status, 'awaiting-admin');
        // The parent's step is done; the wait has moved to the admin's step.
        assert.deepEqual(student.body.application.steps.map((s) => s.state), ['done', 'done', 'active', 'waiting']);
        assert.equal(student.body.application.canContinue, false, 'a parent saying yes is not the whole permission');
    });

    test('a decision cannot be changed by opening the link again', async () => {
        const r = await guardianCall('POST', `/guardian-approval/${await token()}/decline`, { reason: 'changed my mind' });
        assert.equal(r.status, 409);
        assert.match(r.body.error, /already been answered/);
    });

    test('the student still cannot continue on the parent\'s word alone', async () => {
        const id = String((await Application.findOne({ userId: young.user._id }))._id);
        const r = await api('POST', `/opportunities/applications/${id}/continue`);
        assert.equal(r.status, 409, 'the LMS has not signed it off yet');
        assert.equal((await Application.findById(id)).status, 'awaiting-admin');
    });

    test('the admin signs it off, and only then does the student go on', async () => {
        const id = String((await Application.findOne({ userId: young.user._id }))._id);

        const decided = await adminApi('POST', `/admin/opportunities/applications/${id}/approve`, { note: 'Checked with the school.' });
        assert.equal(decided.status, 200);
        assert.equal(decided.body.application.status, 'approved');
        assert.equal(decided.body.application.canDecide, false, 'there is nothing left to press');

        const student = await api('GET', `/opportunities/applications/${id}`);
        assert.equal(student.body.application.status, 'approved');
        assert.deepEqual(student.body.application.steps.map((s) => s.state), ['done', 'done', 'done', 'done']);
        assert.equal(student.body.application.canContinue, true);

        const on = await api('POST', `/opportunities/applications/${id}/continue`);
        assert.equal(on.status, 200);
        assert.equal(on.body.application.status, 'continued');
    });

    test('the admin cannot decide the same application twice', async () => {
        const id = String((await Application.findOne({ userId: young.user._id }))._id);
        const again = await adminApi('POST', `/admin/opportunities/applications/${id}/decline`, { note: 'second thoughts' });
        assert.equal(again.status, 409);
        assert.equal((await Application.findById(id)).status, 'continued', 'the record is untouched');
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
        assert.deepEqual(student.body.application.steps.map((s) => s.state), ['done', 'blocked', 'blocked', 'blocked']);

        const blocked = await api('POST', `/opportunities/applications/${id}/continue`);
        assert.equal(blocked.status, 409, 'a declined application goes nowhere');

        // The new admin route must not become a way around a parent's no.
        const override = await adminApi('POST', `/admin/opportunities/applications/${id}/approve`, {});
        assert.equal(override.status, 409, 'an operator cannot overturn a parent who said no');
        assert.equal((await Application.findById(id)).status, 'declined');
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

    test('the Approved tab keeps an application the student has carried on with', async () => {
        // The Front Desk application was approved and then continued. A filter
        // naming an outcome must not lose it the moment the student moves on.
        const row = await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) }).lean();
        assert.equal(row.status, 'continued', 'the case this test is about');

        const r = await adminApi('GET', '/admin/opportunities/applications?status=approved');
        assert.equal(r.status, 200);
        const listed = r.body.applications.find((a) => a.id === String(row._id));
        assert.ok(listed, 'a continued application still shows as approved');
        assert.ok(listed.adminDecidedAt, 'and carries the sign-off it was given');
        assert.ok(listed.continuedAt, 'and says the student went on with it');
    });

    test('a filter button still knows its number while another filter is on', async () => {
        const r = await adminApi('GET', '/admin/opportunities/applications?status=declined');
        // Counted over every application, not over the handful just returned.
        assert.ok(r.body.counts.approved >= 1, 'the Approved button keeps its count');
        assert.ok(r.body.counts[''] >= r.body.applications.length, 'and All counts everything');
    });
});
