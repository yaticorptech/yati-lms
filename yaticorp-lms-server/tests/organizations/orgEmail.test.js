/**
 * Organization emails carry what people typed — the registration form is
 * public and unauthenticated — so none of it may reach the message as markup.
 * An organization named `<a href="…">` must arrive as those characters, not as
 * a working link the platform mailed on someone's behalf, and a line break in
 * a name must not reach a subject line.
 *
 * No real email is sent: the mailer is replaced before the routes load, and
 * the messages it was handed are read back.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { connect, makeAdmin, startApp, cleanup } = require('../helpers');

const mailer = require('../../src/utils/emailService');
const sent = [];
mailer.sendEmail = async (msg) => { sent.push(msg); };

const STAMP = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
const ADMIN_INBOX = `platform-${STAMP}@example.com`;
const EVIL_NAME = `Evil <script>alert(1)</script> "College" 'X' ${STAMP}\r\nBcc: victim@example.com`;
const EVIL_CONTACT = `<a href="https://phish.example.com">Click here</a>`;
const EVIL_REASON = `<img src=x onerror="steal()"> see <a href='https://phish.example.com'>this</a>`;
const ORG_EMAIL = `evil-org-${STAMP}@example.com`;

const { escapeHtml, plainHeader } = require('../../src/utils/escapeHtml');

let orgApp, boss, organization;

/** Messages to `to` once they arrive (sending is not awaited by the routes). */
const mailTo = async (to, count = 1) => {
    for (let i = 0; i < 60; i++) {
        const found = sent.filter((m) => m.to === to);
        if (found.length >= count) return found;
        await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`no email reached ${to}`);
};

/** No raw markup from the inputs survives, and their text is there escaped. */
const assertSafe = (html) => {
    assert.ok(!/<script/i.test(html), 'no <script>');
    assert.ok(!/<a href="https:\/\/phish/i.test(html) && !/<a href='https:\/\/phish/i.test(html), 'no injected link');
    assert.ok(!/<img/i.test(html), 'no injected image');
    assert.ok(!/onerror="/i.test(html), 'no injected handler attribute');
};
const assertPlainHeader = (value) => assert.ok(!/[\r\n]/.test(value), `header has no line break: ${JSON.stringify(value)}`);

before(async () => {
    process.env.ADMIN_EMAIL = ADMIN_INBOX;
    await connect();
    orgApp = startApp({ mount: '/api/organizations', router: require('../../src/organizations') });
    boss = await makeAdmin('EmailBoss');
    await require('../../src/models/Admin').updateOne({ _id: boss.admin._id }, { $set: { role: 'superadmin' } });
});

after(async () => {
    delete process.env.ADMIN_EMAIL;
    const Organization = require('../../src/organizations/models/Organization');
    const Admin = require('../../src/models/Admin');
    const org = await Organization.findOne({ email: ORG_EMAIL }).select('_id').lean();
    if (org) {
        await Admin.deleteMany({ organizationId: org._id });
        await Organization.deleteOne({ _id: org._id });
    }
    await cleanup([], orgApp.server, [boss.admin]);
});

describe('the escape helper', () => {
    test('escapes the five characters and flattens headers', () => {
        assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
        assert.equal(escapeHtml(null), '');
        assert.equal(plainHeader('New:\r\nBcc: x@example.com'), 'New: Bcc: x@example.com');
    });
});

describe('registration emails', () => {
    test('the applicant and the platform admin both get escaped text', async () => {
        const r = await orgApp.call(null)('POST', '/register', {
            name: EVIL_NAME, organizationType: 'college', contactPerson: EVIL_CONTACT,
            email: ORG_EMAIL, phone: '9876543210', orgCode: `evil_${STAMP}`.slice(0, 30),
            password: 'Passw0rd!x', confirmPassword: 'Passw0rd!x'
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        organization = await require('../../src/organizations/models/Organization').findOne({ email: ORG_EMAIL }).lean();

        const [toApplicant] = await mailTo(ORG_EMAIL);
        assertSafe(toApplicant.htmlContent);
        assert.ok(toApplicant.htmlContent.includes('Evil &lt;script&gt;alert(1)&lt;/script&gt; &quot;College&quot; &#39;X&#39;'));
        assert.ok(toApplicant.htmlContent.includes('&lt;a href=&quot;https://phish.example.com&quot;&gt;Click here&lt;/a&gt;'));
        assertPlainHeader(toApplicant.subject);
        assertPlainHeader(toApplicant.toName);

        const [toPlatform] = await mailTo(ADMIN_INBOX);
        assertSafe(toPlatform.htmlContent);
        assert.ok(toPlatform.htmlContent.includes('&lt;script&gt;'));
        assertPlainHeader(toPlatform.subject);
        assert.ok(toPlatform.subject.includes('Evil <script>'), 'the subject is plain text, not HTML-escaped');
    });
});

describe('status emails', () => {
    test('a rejection with a hostile reason arrives escaped', async () => {
        assert.ok(organization, 'registered above');
        const r = await orgApp.call(boss.token)('PUT', `/admin/${organization._id}/status`, { status: 'rejected', reason: EVIL_REASON });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const msgs = await mailTo(ORG_EMAIL, 2);
        const msg = msgs[msgs.length - 1];
        assertSafe(msg.htmlContent);
        assert.ok(msg.htmlContent.includes('&lt;img src=x onerror=&quot;steal()&quot;&gt;'));
        assert.ok(msg.htmlContent.includes('&lt;a href=&quot;https://phish.example.com&quot;&gt;Click here&lt;/a&gt;'), 'contact escaped');
        assertPlainHeader(msg.subject);
        assertPlainHeader(msg.toName);
    });

    test('an approval escapes the name and still shows the organization ID', async () => {
        const r = await orgApp.call(boss.token)('PUT', `/admin/${organization._id}/status`, { status: 'active' });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const msgs = await mailTo(ORG_EMAIL, 3);
        const msg = msgs[msgs.length - 1];
        assertSafe(msg.htmlContent);
        assert.ok(msg.htmlContent.includes(organization.orgCode));
        assert.ok(msg.htmlContent.includes('&lt;script&gt;'));
    });
});
