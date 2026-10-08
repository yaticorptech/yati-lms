/**
 * Applying for a part-time job when a guardian has to agree first.
 *
 * The age check is the point of this suite: it happens on the server, and a
 * student under eighteen cannot get past it by asking nicely. The other half is
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
    await profileFor(older.user._id, 19);

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
    test('a student under eighteen is stopped and asked for a guardian', async () => {
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

    test('two presses at the same instant make one application, not an error', async () => {
        // The check for an existing row and the insert are two separate trips.
        // A double-tap puts both requests in the air together: each finds
        // nothing and each inserts, and the unique index refuses the loser.
        // That refusal used to reach the student as the driver's own sentence,
        // "E11000 duplicate key error collection...".
        const starts = new Date(); starts.setDate(starts.getDate() + 5);
        const second = await Opportunity.create({
            slug: `race-${Date.now()}`, title: 'Weekend Stall Helper',
            organization: { name: 'ABC Company', verified: true },
            category: 'events', opportunityType: 'event-support',
            startsAt: starts, endsAt: starts, hoursPerSession: '2-4',
            minimumAge: 13, location: { area: 'Whitefield', city: 'Bengaluru' },
            compensation: { label: '₹600' }, safetyClassification: 'supervised',
            status: 'open', guardianApprovalRequired: true
        });

        const pressed = await Promise.all([0, 1, 2, 3].map(() => apply(api, String(second._id))));

        for (const r of pressed) {
            assert.ok(r.status === 200 || r.status === 201, `every press is answered, got ${r.status}`);
            assert.equal(/E11000|duplicate key/i.test(JSON.stringify(r.body)), false,
                'and none of them shows the database talking');
            assert.equal(r.body.application.status, 'needs-guardian');
        }
        assert.equal(await Application.countDocuments({ userId: young.user._id, opportunityId: String(second._id) }), 1,
            'one application, however many times it was pressed');

        await Application.deleteMany({ opportunityId: String(second._id) });
        await Opportunity.deleteOne({ _id: second._id });
    });

    test('a student of eighteen or over carries straight on', async () => {
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

    test('an application not yet sent follows a corrected date of birth', async () => {
        // Started as an adult, then the profile is corrected to sixteen, then
        // to thirteen: the age on the application, and whether a parent is
        // needed, follow the profile each time it is opened.
        const starts = new Date(); starts.setDate(starts.getDate() + 6);
        const job2 = await Opportunity.create({
            slug: `stock-count-${Date.now()}`, title: 'Stock count', organization: { name: 'Depot', verified: true },
            category: 'events', opportunityType: 'event-support', startsAt: starts, endsAt: starts, hoursPerSession: '2-4',
            minimumAge: 13, location: { area: 'Peenya', city: 'Bengaluru' }, compensation: { label: '₹700' },
            safetyClassification: 'supervised', status: 'open', guardianApprovalRequired: true
        });
        const grown = await makeUser('Grown');
        const profile = await profileFor(grown.user._id, 23);
        const elder = startApp({ mount: '/api/jobs', router: require('../../src/jobboard') });
        const call = elder.call(grown.token);
        try {
            const started = await call('POST', '/opportunities/applications', { opportunityId: String(job2._id) });
            assert.equal(started.body.application.status, 'ready');
            assert.equal(started.body.application.student.age, 23);

            await OpportunityProfile.updateOne({ _id: profile._id }, { $set: { dateOfBirth: bornYearsAgo(16) } });
            const asTeen = await call('GET', `/opportunities/applications/${started.body.application.id}`);
            assert.equal(asTeen.body.application.student.age, 16, 'the age shown is the profile\'s now');
            assert.equal(asTeen.body.application.status, 'needs-guardian', 'and at sixteen a parent is needed after all');

            await OpportunityProfile.updateOne({ _id: profile._id }, { $set: { dateOfBirth: bornYearsAgo(13) } });
            const asChild = await call('POST', '/opportunities/applications', { opportunityId: String(job2._id) });
            assert.equal(asChild.body.application.student.age, 13);
            assert.equal(asChild.body.application.status, 'needs-guardian', 'and thirteen needs one');
            assert.equal(asChild.body.application.guardian.name, 'Devaki', 'with the guardian taken from the profile');
        } finally {
            elder.server.close();
            await Application.deleteMany({ opportunityId: String(job2._id) });
            await Opportunity.deleteOne({ _id: job2._id });
            await OpportunityProfile.deleteOne({ _id: profile._id });
            await require('../../src/models/User').deleteOne({ _id: grown.user._id });
        }
    });

    test('a parent address that cannot take mail is refused before anything is sent', async () => {
        // A typo in the domain, and the student's own address: both used to be
        // accepted, mailed, and bounced back to the LMS's mailbox unseen.
        const row = await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) });
        const typo = await api('PUT', `/opportunities/applications/${row.id}/guardian`, { name: 'Devaki', email: 'devaki.rao@gmial.com' });
        assert.equal(typo.status, 400);
        assert.match(typo.body.error, /cannot find a mail server for "gmial\.com"/);

        const me = await require('../../src/models/User').findById(young.user._id).lean();
        if (me?.email) {
            const own = await api('PUT', `/opportunities/applications/${row.id}/guardian`, { name: 'Devaki', email: me.email });
            assert.equal(own.status, 400);
            assert.match(own.body.error, /your own email address/);
        }

        const fine = await api('PUT', `/opportunities/applications/${row.id}/guardian`, { name: 'Devaki', email: 'devaki.rao@example.com' });
        assert.equal(fine.status, 200, 'a real domain is still accepted');
    });

    test('a bounced request is marked, resent to the school, and may be sent again to a corrected address', async () => {
        const { failedRecipients, handleBounce } = require('../../src/utils/bounceWatcher');
        assert.deepEqual(failedRecipients('Subject: Delivery Status Notification (Failure)\r\nX-Failed-Recipients: Devaki.Rao@example.com\r\n'), ['devaki.rao@example.com']);
        assert.deepEqual(failedRecipients('Subject: hello\r\n'), [], 'a message that names no failed address is not a bounce');

        const mailer = require('../../src/utils/emailService');
        const real = mailer.sendEmail; const sent = [];
        mailer.sendEmail = async (msg) => { sent.push(msg); };
        const savedFallback = process.env.GUARDIAN_FALLBACK_EMAIL;
        process.env.GUARDIAN_FALLBACK_EMAIL = 'office@school.example';
        try {
            // A request out to the parent, as the route leaves it. Its own
            // address: every test user here shares the fixture's parent.
            const bad = `devaki.${Date.now()}@example.com`;
            const row = await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) });
            await Application.updateOne({ _id: row._id }, { $set: { status: 'awaiting-guardian', 'guardian.email': bad, mailSentAt: new Date(), mailBouncedAt: null, fallbackSentAt: null } });

            const n = await handleBounce(bad);
            assert.equal(n, 1, 'the waiting request was found');
            const after = await Application.findById(row._id);
            assert.ok(after.mailBouncedAt, 'marked as bounced');
            assert.equal(after.mailSentAt, null, 'and no longer counted as sent');
            assert.match(after.mailError, /could not be found/);
            assert.ok(after.fallbackSentAt, 'the request went on to the school');
            assert.equal(sent.length, 1);
            assert.equal(sent[0].to, 'office@school.example', 'to the fallback mailbox');
            assert.match(sent[0].subject, /^Address not found — /);
            assert.match(sent[0].htmlContent, /Address not found/, 'saying why it came there');
            assert.ok(sent[0].htmlContent.includes(`/jobs/guardian/${after.linkToken}?answer=approve`), 'with the same request inside');

            // The student sees it, and can correct the address and send again.
            const seen = await api('GET', `/opportunities/applications/${row.id}`);
            assert.ok(seen.body.application.mailBouncedAt);
            assert.ok(seen.body.application.fallbackSentAt);
            const again = await api('POST', `/opportunities/applications/${row.id}/request`);
            assert.equal(again.status, 200, 'not refused as "already sent"');
            assert.equal(sent.length, 2, 'a second message went, to the parent');

            assert.equal(await handleBounce(bad), 0, 'the same bounce is not handled twice');
        } finally {
            mailer.sendEmail = real;
            if (savedFallback === undefined) delete process.env.GUARDIAN_FALLBACK_EMAIL; else process.env.GUARDIAN_FALLBACK_EMAIL = savedFallback;
        }
    });

    test('Send again mails the request once more, to the guardian as they stand now', async () => {
        const mailer = require('../../src/utils/emailService');
        const real = mailer.sendEmail; const sent = [];
        mailer.sendEmail = async (msg) => { sent.push(msg); };
        const long = new Date(Date.now() - 10 * 60 * 1000);
        const made = await Application.create({
            userId: young.user._id, opportunityId: `resend-${Date.now()}`, student: { name: 'Sowndarya Student', age: 13 },
            job: { title: 'A job waiting on the parent' }, guardian: { name: 'Devaki', email: 'devaki.new@example.com' },
            status: 'awaiting-guardian', requestedAt: long, mailSentAt: long, mailBouncedAt: long, fallbackSentAt: long, mailError: 'bounced',
            linkToken: `resend-token-${Date.now()}-abcdefghij`
        });
        try {
            const r = await api('POST', `/opportunities/applications/${made._id}/resend`);
            assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 160));
            assert.equal(r.body.mail.sent, true);
            assert.equal(r.body.mail.again, true);
            assert.equal(sent.length, 1, 'one message');
            assert.equal(sent[0].to, 'devaki.new@example.com', 'to the address on the application now');
            assert.ok(sent[0].htmlContent.includes(`/jobs/guardian/${made.linkToken}?answer=approve`), 'with the same link as before');
            const after = await Application.findById(made._id).lean();
            assert.ok(after.mailSentAt > long, 'sent time moved on');
            assert.equal(after.mailBouncedAt, null, 'an earlier bounce no longer counts');
            assert.equal(after.fallbackSentAt, null);
            assert.equal(after.status, 'awaiting-guardian', 'still waiting on the parent');

            const twice = await api('POST', `/opportunities/applications/${made._id}/resend`);
            assert.equal(twice.status, 429, 'not twice within a minute');
            assert.equal(sent.length, 1);

            // A bounce notice dated before this send is about the earlier one.
            const { handleBounce } = require('../../src/utils/bounceWatcher');
            assert.equal(await handleBounce('devaki.new@example.com', { bouncedAt: long }), 0, 'an old bounce does not mark the new send');

            await Application.updateOne({ _id: made._id }, { $set: { status: 'awaiting-admin' } });
            const answered = await api('POST', `/opportunities/applications/${made._id}/resend`);
            assert.equal(answered.status, 409, 'nothing to send once the parent has answered');
        } finally {
            mailer.sendEmail = real;
            await Application.deleteOne({ _id: made._id });
        }
    });

    test('every job is open to every student; age decides only who must agree first', async () => {
        // A job marked for adults, a thirteen-year-old and a nineteen-year-old. The board used to
        // hide it (nothing at all was open under 14, and a minimum age was
        // enforced). Now it is shown and can be applied for, and what the age
        // changes is the guardian step.
        const starts = new Date(); starts.setDate(starts.getDate() + 5);
        const adultJob = await Opportunity.create({
            slug: `night-stock-${Date.now()}`, title: 'Night stocktake', organization: { name: 'Big Mart', verified: false },
            category: 'delivery', opportunityType: 'part-time', startsAt: starts, endsAt: starts, hoursPerSession: '4+',
            minimumAge: 18, location: { area: 'Peenya', city: 'Bengaluru' }, compensation: { label: '₹900' },
            safetyClassification: 'general', status: 'open', guardianApprovalRequired: false
        });
        try {
            const seen = await api('GET', `/opportunities/${adultJob._id}`);
            assert.equal(seen.status, 200, JSON.stringify(seen.body).slice(0, 160));
            const started = await api('POST', '/opportunities/applications', { opportunityId: String(adultJob._id) });
            assert.equal(started.status, 201, JSON.stringify(started.body).slice(0, 160));
            assert.equal(started.body.application.status, 'needs-guardian', 'a thirteen-year-old still needs a parent first');
            assert.equal(started.body.application.guardianNeeded, true);

            const elder = startApp({ mount: '/api/jobs', router: require('../../src/jobboard') });
            const grown = await elder.call(older.token)('POST', '/opportunities/applications', { opportunityId: String(adultJob._id) });
            elder.server.close();
            assert.equal(grown.status, 201);
            assert.equal(grown.body.application.status, 'ready', 'a nineteen-year-old goes straight on');
            assert.equal(grown.body.application.guardianNeeded, false, 'and is told no parent was involved');
        } finally {
            await Application.deleteMany({ opportunityId: String(adultJob._id) });
            await Opportunity.deleteOne({ _id: adultJob._id });
        }
    });

    test('the link in the mail points at the site the student is using, not a fixed setting', async () => {
        // FRONTEND_URL on the machine that sent real requests was localhost,
        // so every button in those emails opened nothing on a parent's phone.
        // The link follows the request's own origin when it is one of ours.
        const mailer = require('../../src/utils/emailService');
        const real = mailer.sendEmail;
        const savedFront = process.env.FRONTEND_URL, savedAllowed = process.env.ALLOWED_ORIGINS;
        process.env.FRONTEND_URL = 'http://localhost:5173';
        process.env.ALLOWED_ORIGINS = 'https://learn.yaticorp.com';
        const base = `http://127.0.0.1:${jobsServer.address().port}/api/jobs`;
        const row = await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) });
        const request = async (origin) => {
            let html = '';
            mailer.sendEmail = async (msg) => { html = msg.htmlContent; };
            await Application.updateOne({ _id: row._id }, { $set: { mailSentAt: null } });
            const r = await fetch(`${base}/opportunities/applications/${row.id}/request`, { method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${young.token}`, ...(origin ? { Origin: origin } : {}) } });
            return { link: (await r.json()).mail.link, html };
        };
        try {
            const live = await request('https://learn.yaticorp.com');
            assert.match(live.link, /^https:\/\/learn\.yaticorp\.com\/jobs\/guardian\//, 'from the live site, the link is to the live site');
            assert.ok(live.html.includes('https://learn.yaticorp.com/jobs/guardian/'), 'in the mail too');
            const stranger = await request('https://evil.example.com');
            assert.match(stranger.link, /^http:\/\/localhost:5173\//, 'an origin that is not ours is not trusted: back to FRONTEND_URL');
            const none = await request(null);
            assert.match(none.link, /^http:\/\/localhost:5173\//, 'and so is a request with no origin at all');
        } finally {
            mailer.sendEmail = real;
            process.env.FRONTEND_URL = savedFront; process.env.ALLOWED_ORIGINS = savedAllowed;
            if (savedAllowed === undefined) delete process.env.ALLOWED_ORIGINS;
        }
    });

    test('a refused send is written on the record, and cleared once one goes', async () => {
        const mailer = require('../../src/utils/emailService');
        const real = mailer.sendEmail;
        const row = await Application.findOne({ userId: young.user._id, opportunityId: String(job._id) });
        try {
            mailer.sendEmail = async () => { throw new Error('535 Username and Password not accepted'); };
            await Application.updateOne({ _id: row._id }, { $set: { mailSentAt: null } });
            await api('POST', `/opportunities/applications/${row.id}/request`);
            let after = await Application.findById(row._id);
            assert.equal(after.mailSentAt, null, 'nothing went');
            assert.match(after.mailError, /535/, 'and the provider\'s reason is on the record');

            mailer.sendEmail = async () => {};
            await api('POST', `/opportunities/applications/${row.id}/request`);
            after = await Application.findById(row._id);
            assert.ok(after.mailSentAt, 'the retry went');
            assert.equal(after.mailError, '', 'and the old reason is cleared');
        } finally {
            mailer.sendEmail = real;
        }
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

describe('a new guardian on the details form', () => {
    // A student swapped Reshma for Geetha on the form and still found Reshma
    // on their applications (2026-10-02).
    let app, call, fourth, appId;
    const saveGuardian = async (guardianName, guardianEmail) => {
        await new Promise((r) => setTimeout(r, 15));   // strictly later than what came before
        const from = new Date(); const to = new Date(from); to.setDate(to.getDate() + 20);
        const r = await call('PUT', '/opportunities/profile', {
            dateOfBirth: bornYearsAgo(13).toISOString().slice(0, 10),
            wantFrom: from.toISOString().slice(0, 10), wantTo: to.toISOString().slice(0, 10),
            interests: ['events'], guardianName, guardianEmail, guardianPhone: '7635492435'
        });
        assert.equal(r.status, 200, JSON.stringify(r.body));
    };
    const open = async () => (await call('GET', `/opportunities/applications/${appId}`)).body.application;

    before(async () => {
        app = startApp({ mount: '/api/jobs', router: require('../../src/jobboard') });
        call = app.call(young.token);
        const starts = new Date(); starts.setDate(starts.getDate() + 11);
        fourth = await Opportunity.create({
            slug: `stall-help-${Date.now()}`, title: 'Book Fair Stall Help',
            organization: { name: 'ABC Company', verified: true },
            category: 'events', opportunityType: 'event-support',
            startsAt: starts, endsAt: starts, hoursPerSession: '1-2',
            minimumAge: 13, location: { area: 'Whitefield', city: 'Bengaluru' },
            status: 'open', guardianApprovalRequired: true
        });
        await saveGuardian('Devaki', 'devaki.rao@example.com');
        appId = (await call('POST', '/opportunities/applications', { opportunityId: String(fourth._id) })).body.application.id;
    });
    after(async () => {
        app.server.close();
        if (fourth) await Opportunity.deleteOne({ _id: fourth._id });
        // Back to the guardian the rest of this file expects.
        await OpportunityProfile.updateOne({ userId: young.user._id }, { $set: { 'guardian.guardianName': 'Devaki', 'guardian.email': 'devaki.rao@example.com' } });
    });

    test('an application nobody has answered takes the new guardian', async () => {
        await saveGuardian('Geetha', 'geetha.k@example.com');
        const a = await open();
        assert.equal(a.guardian.name, 'Geetha');
        assert.match(a.guardian.email, /^ge•+@example\.com$/);
        assert.equal(a.currentGuardian, null, 'nothing to explain: Geetha is the guardian on it');
    });

    test('a guardian changed on the application itself is not undone by an older form', async () => {
        const put = await call('PUT', `/opportunities/applications/${appId}/guardian`, { name: 'Asha', email: 'asha.r@example.com' });
        assert.equal(put.status, 200, JSON.stringify(put.body));
        assert.equal((await open()).guardian.name, 'Asha', 'the form still says Geetha, but Asha came later');
    });

    test('a request already sent to the old guardian is marked unsent, so it goes to the new one', async () => {
        const sent = await call('POST', `/opportunities/applications/${appId}/request`);
        assert.equal(sent.status, 200, JSON.stringify(sent.body));
        assert.ok(sent.body.application.mailSentAt, 'it went to Asha');
        await saveGuardian('Meera', 'meera.s@example.com');
        const a = await open();
        assert.equal(a.status, 'awaiting-guardian');
        assert.equal(a.guardian.name, 'Meera');
        assert.equal(a.mailSentAt, null, 'not yet sent to Meera');
        const again = await call('POST', `/opportunities/applications/${appId}/request`);
        assert.equal(again.status, 200, JSON.stringify(again.body));
        assert.match(sentHere.at(-1).to, /meera\.s@example\.com/, 'and sending now reaches Meera');
    });

    test('once a parent has answered, the record stays theirs and the new guardian is shown beside it', async () => {
        await Application.updateOne({ _id: appId }, { $set: {
            status: 'approved', decidedAt: new Date(), guardianSetAt: new Date(),
            guardian: { name: 'Reshma', email: 'reshma.n@example.com', phone: '' } } });
        await saveGuardian('Geetha', 'geetha.k@example.com');
        const a = await open();
        assert.equal(a.status, 'approved', 'the answer stands');
        assert.equal(a.guardian.name, 'Reshma', 'she is the one who agreed');
        assert.equal(a.currentGuardian?.name, 'Geetha', 'and the guardian now on the profile comes with it');
        assert.match(a.currentGuardian.email, /^ge•+@example\.com$/);
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

    test('an application nobody was told about can be deleted', async () => {
        // Started and never sent: no parent has seen it, nothing was decided.
        const made = await Application.create({
            userId: young.user._id, opportunityId: 'del-1',
            student: { name: 'Sowndarya Student', age: 13 },
            job: { title: 'A job nobody was asked about' },
            guardian: { name: 'Devaki', email: 'devaki.rao@example.com' },
            status: 'needs-guardian'
        });

        const listed = await adminApi('GET', '/admin/opportunities/applications');
        const seen = listed.body.applications.find((a) => a.id === String(made._id));
        assert.equal(seen.canDelete, true, 'the row offers a delete');

        const r = await adminApi('DELETE', `/admin/opportunities/applications/${made._id}`);
        assert.equal(r.status, 200);
        assert.equal(await Application.countDocuments({ _id: made._id }), 0, 'and it is gone');
    });

    test('every application can be deleted, whatever its state', async () => {
        // Sent and waiting on the parent, answered by the parent, and approved:
        // each offers Delete, says a parent was contacted, and goes when asked.
        const states = [
            { opportunityId: 'del-sent', status: 'awaiting-guardian', requestedAt: new Date(), mailSentAt: new Date() },
            { opportunityId: 'del-answered', status: 'awaiting-admin', requestedAt: new Date(), mailSentAt: new Date(), decidedAt: new Date() },
            { opportunityId: 'del-approved', status: 'approved', requestedAt: new Date(), mailSentAt: new Date(), decidedAt: new Date(), adminDecidedAt: new Date() }
        ];
        for (const extra of states) {
            const made = await Application.create({
                userId: young.user._id, student: { name: 'Sowndarya Student', age: 13 },
                job: { title: `A job (${extra.status})` }, guardian: { name: 'Devaki', email: 'devaki.rao@example.com' }, ...extra
            });
            const listed = await adminApi('GET', '/admin/opportunities/applications');
            const seen = listed.body.applications.find((a) => a.id === String(made._id));
            assert.equal(seen.canDelete, true, `${extra.status}: Delete is offered`);
            assert.equal(seen.parentContacted, true, `${extra.status}: and it says the parent was emailed`);
            const r = await adminApi('DELETE', `/admin/opportunities/applications/${made._id}`);
            assert.equal(r.status, 200, `${extra.status}: deleted`);
            assert.equal(await Application.countDocuments({ _id: made._id }), 0);
        }
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
