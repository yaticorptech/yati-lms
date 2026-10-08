/**
 * The part-time job application flow, in a real browser: the student's side
 * and the guardian's, through every state.
 *
 * The server decides; these check that each state is drawn honestly — that a
 * pending request really does leave the student with no way forward, and that
 * the guardian's page offers the two buttons and nothing else.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';

const JOB = {
    title: 'Front Desk Assistant', company: 'ABC Company', hours: '4 hrs/day',
    duration: '18 Sept 2026', location: 'Whitefield, Bengaluru', pay: '₹800',
    safety: ['The organisation has been verified by the LMS.', 'An adult supervisor is present for the whole shift.']
};
const STEP_LABELS = ['Request sent', 'Parent review', 'Admin approval', 'Approved'];
const STEPS = {
    'needs-guardian': ['waiting', 'waiting', 'waiting', 'waiting'],
    'awaiting-guardian': ['done', 'active', 'waiting', 'waiting'],
    // The parent agreed; the LMS has still to sign it off.
    'awaiting-admin': ['done', 'done', 'active', 'waiting'],
    approved: ['done', 'done', 'done', 'done'],
    declined: ['done', 'blocked', 'blocked', 'blocked'],
    continued: ['done', 'done', 'done', 'done'],
    // Old enough that there is nothing to approve; the screen hides the
    // tracker for this one, but the server still reports the steps.
    ready: ['done', 'done', 'done', 'active']
};
const application = (status, extra = {}) => ({
    id: 'a1', opportunityId: 'o1', status,
    student: { name: 'Sowndarya', age: 13 },
    job: JOB,
    guardian: { name: 'Devaki', email: 'de••••@example.com', phone: '+91 XXXXX XXX10' },
    steps: STEPS[status].map((state, i) => ({ label: STEP_LABELS[i], state })),
    guardianAge: 18, reminders: 0, declineReason: '',
    canContinue: status === 'approved' || status === 'continued',
    guardianLink: status === 'needs-guardian' ? '' : '/jobs/guardian/tok',
    ...extra
});

/**
 * An API that starts in one state and moves on when the flow asks it to, so a
 * test can press a button and see the next screen.
 */
const api = (start, after = {}, sms = null) => `
const app = ${JSON.stringify(application('needs-guardian'))};
const states = ${JSON.stringify({ start, after, sms })};
let current = JSON.parse(JSON.stringify(states.start));
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url) => { window.__calls.push(['GET', url]); return reply({ application: current }); },
  post: (url, body) => {
    window.__calls.push(['POST', url, body]);
    const next = url.includes('/request') ? states.after.request
      : url.includes('/resend') ? states.after.resend
      : url.includes('/continue') ? states.after.continue : null;
    if (next) current = next;
    // The request route also reports what became of the text message.
    const mail = url.includes('/request') ? (states.sms || null) : url.includes('/resend') ? { sent: true, to: 'de••••@example.com', again: true } : null;
    return reply(mail ? { application: current, mail } : { application: current });
  },
  put: (url, body) => { window.__calls.push(['PUT', url, body]); return reply({ application: current }); },
  delete: (url) => { window.__calls.push(['DELETE', url]); return reply({ application: current }); }
};
void app;`;

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ApplyFlow from '${srcFile('opportunities/application/ApplyFlow.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter><div style={{ width: 720, padding: 16 }}><ApplyFlow opportunityId="o1" onClose={() => {}} /></div></MemoryRouter>);`;

/** The tracker as four words, read off the page. */
const TRACKER = `
    const stateOf = (li) => {
        const t = li.innerText;
        return /— done/.test(t) ? 'done' : /— in progress/.test(t) ? 'active' : /— stopped/.test(t) ? 'blocked' : 'waiting';
    };
    const tracker = $$('ol[aria-label="Approval progress"] > li').map(stateOf);`;

describe('the student applying', { skip: skipWithoutStyles }, () => {
    test('an under-15 student is told a guardian has to agree, and shown who', async () => {
        const { result, errors } = await screen({
            entry, api: api(application('needs-guardian')), styles: true, script: `
                await sleep(700);
                ${TRACKER}
                const body = text(document.body);
                return { body, tracker, buttons: $$('button').map((b) => b.innerText.replace(/\\s+/g, ' ').trim()).filter(Boolean) };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /Guardian approval required/);
        assert.match(result.body, /under 18/);
        assert.match(result.body, /Devaki/);
        assert.match(result.body, /de••••@example\.com/, 'the address is masked, never shown in full');
        assert.ok(result.buttons.some((b) => /Send approval request/i.test(b)));
        assert.ok(result.buttons.some((b) => /Change guardian/i.test(b)));
        assert.deepEqual(result.tracker, ['waiting', 'waiting', 'waiting', 'waiting']);
    });

    test('the job the guardian will be asked about is on screen', async () => {
        const { result } = await screen({
            entry, api: api(application('needs-guardian')), styles: true, script: `
                await sleep(700); return { body: text(document.body) };` });
        for (const bit of ['Front Desk Assistant', 'ABC Company', '4 hrs/day', 'Whitefield, Bengaluru', '₹800']) {
            assert.ok(result.body.includes(bit), `"${bit}" should be on the card`);
        }
    });

    test('sending the request moves the tracker and blocks the way forward', async () => {
        const { result } = await screen({
            entry, api: api(application('needs-guardian'), { request: application('awaiting-guardian') }), styles: true, script: `
                await sleep(700);
                click(/Send approval request/); await sleep(600);
                ${TRACKER}
                const body = text(document.body);
                return { body, tracker, buttons: $$('button').map((b) => b.innerText.replace(/\\s+/g, ' ').trim()).filter(Boolean) };` });
        assert.match(result.body, /Approval request sent/);
        assert.match(result.body, /Waiting for parent response/);
        assert.deepEqual(result.tracker, ['done', 'active', 'waiting', 'waiting']);
        assert.ok(result.buttons.some((b) => /View request details/i.test(b)));
        assert.ok(!result.buttons.some((b) => /^Continue application/i.test(b)), 'there is nothing to continue with yet');
        assert.match(result.body, /cannot continue this application until Devaki answers/);
    });

    test('a sent request that is not answered offers Send again, beside View request details', async () => {
        const sentOnce = application('awaiting-guardian', { mailSentAt: '2026-09-30T04:31:20.000Z', requestedAt: '2026-09-30T04:31:16.000Z' });
        const { result, errors } = await screen({
            entry, api: api(sentOnce, { resend: { ...sentOnce, mailSentAt: '2026-09-30T05:10:00.000Z' } }), styles: true, script: `
                await sleep(700);
                const row = $$('button').find((b) => /Send again/.test(b.innerText));
                const view = $$('button').find((b) => /View request details/.test(b.innerText));
                const sameRow = row && view && row.parentElement === view.parentElement;
                row && row.click(); await sleep(600);
                return { hadButton: !!row, sameRow, body: text(document.body),
                         posted: window.__calls.filter((c) => c[0] === 'POST').map((c) => c[1]) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.hadButton, true, 'Send again is offered');
        assert.equal(result.sameRow, true, 'in the same row as View request details');
        assert.ok(result.posted.some((u) => /\/resend$/.test(u)), 'pressing it sends the request again');
        assert.match(result.body, /Email sent again to de••••@example\.com/);
        assert.match(result.body, /If Devaki has not answered, use Send again/);
    });

    test('an email that really went says so, with the address masked', async () => {
        const { result } = await screen({
            entry,
            api: api(application('needs-guardian'), { request: application('awaiting-guardian') },
                { sent: true, to: 'de••••@example.com', link: '/jobs/guardian/tok' }),
            styles: true, script: `
                await sleep(700);
                click(/Send approval request/); await sleep(600);
                return { body: text(document.body) };` });
        assert.match(result.body, /Email sent to de••••@example\.com/);
        assert.equal(/could not be sent/.test(result.body), false);
    });

    test('a refused email is admitted, with a way to carry on', async () => {
        const { result } = await screen({
            entry,
            api: api(application('needs-guardian'), { request: application('awaiting-guardian') },
                { sent: false, to: 'de••••@example.com', link: '/jobs/guardian/tok' }),
            styles: true, script: `
                await sleep(700);
                click(/Send approval request/); await sleep(600);
                return { body: text(document.body),
                         hasGuardianPage: $$('a').some((a) => /Open the guardian's page/.test(a.innerText)) };` });
        assert.match(result.body, /The email could not be sent/);
        assert.ok(result.hasGuardianPage, 'and the guardian page is offered so the flow can still be tried');
    });

    test('a parent\'s yes hands it to the LMS; the student still waits', async () => {
        const { result } = await screen({
            entry, api: api(application('awaiting-admin')), styles: true, script: `
                await sleep(700);
                ${TRACKER}
                const go = $$('button').find((b) => /Continue application/i.test(b.innerText));
                return { body: text(document.body), tracker, hasGo: !!go };` });
        assert.match(result.body, /Parent approved/);
        assert.deepEqual(result.tracker, ['done', 'done', 'active', 'waiting']);
        assert.equal(result.hasGo, false, 'a parent saying yes is not the whole permission');
    });

    test('once the LMS signs it off too, the student can carry on', async () => {
        const { result } = await screen({
            entry, api: api(application('approved')), styles: true, script: `
                await sleep(700);
                ${TRACKER}
                const go = $$('button').find((b) => /Continue application/i.test(b.innerText));
                return { body: text(document.body), tracker, hasGo: !!go, goDisabled: go ? go.disabled : null };` });
        assert.match(result.body, /Approved/);
        assert.deepEqual(result.tracker, ['done', 'done', 'done', 'done']);
        assert.ok(result.hasGo, 'the way on is offered');
        assert.equal(result.goDisabled, false);
    });

    test('Continue application can be pressed once; after that it reads "Application continued" and cannot be pressed again', async () => {
        // A new application offers the way on; once taken, it is done
        // (the account owner's call, 2026-10-02).
        const continued = application('continued');
        const { result, errors } = await screen({
            entry, api: api(application('approved'), { continue: continued }), styles: true, script: `
                await sleep(700);
                const go = $$('button').find((b) => /Continue application/i.test(b.innerText));
                const before = go ? go.disabled : null;
                if (go) go.click();
                await sleep(500);
                const after = $$('button').find((b) => /Application continued/i.test(b.innerText));
                return { before, after: after ? after.disabled : null,
                         calls: window.__calls.filter((c) => /continue/.test(c[1])).length };` });
        assert.deepEqual(errors, []);
        assert.equal(result.before, false, 'a new application can be continued');
        assert.equal(result.calls, 1, 'pressing it continues the application');
        assert.equal(result.after, true, 'and then it reads "Application continued" and cannot be pressed again');
    });

    test('a guardian changed after the answer is the one on the card, just as before', async () => {
        // The student swapped Reshma for Geetha on the details form after
        // Reshma had agreed. The card shows Geetha, name and email, and no
        // more — a line about who answered was taken off again (2026-10-02).
        const answered = application('continued', {
            guardian: { name: 'Reshma', email: 're••••@example.com', phone: '' },
            currentGuardian: { name: 'Geetha', email: 'ge••••@example.com', phone: '' }
        });
        const { result, errors } = await screen({
            entry, api: api(answered), styles: true, script: `
                await sleep(700);
                const card = $$('p').find((p) => p.innerText.trim() === 'Geetha');
                return { card: !!card, body: text(document.body) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.card, true, 'the guardian card names Geetha');
        assert.match(result.body, /ge••••@example\.com/, 'with her address, masked');
        assert.equal(/answered this request/.test(result.body), false, 'and nothing more under it');
    });

    test('a declined request blocks the application and offers another job', async () => {
        const declined = application('declined', { declineReason: 'School exams that week.' });
        const { result } = await screen({
            entry, api: api(declined), styles: true, script: `
                await sleep(700);
                ${TRACKER}
                return { body: text(document.body), tracker,
                         buttons: $$('button').map((b) => b.innerText.replace(/\\s+/g, ' ').trim()).filter(Boolean) };` });
        assert.match(result.body, /Permission declined/);
        assert.match(result.body, /has not approved this application/);
        assert.match(result.body, /School exams that week\./);
        assert.deepEqual(result.tracker, ['done', 'blocked', 'blocked', 'blocked']);
        assert.ok(result.buttons.some((b) => /Choose another job/i.test(b)));
        assert.ok(!result.buttons.some((b) => /Continue application/i.test(b)), 'a declined application goes nowhere');
    });

    test('a student old enough is not asked for a guardian at all', async () => {
        const ready = application('ready', { student: { name: 'Elder', age: 16 }, canContinue: true, guardian: { name: '', phone: '' } });
        const { result } = await screen({
            entry, api: api(ready), styles: true, script: `
                await sleep(700);
                return { body: text(document.body), tracker: $$('ol[aria-label="Approval progress"]').length,
                         hasGo: $$('button').some((b) => /Continue application/i.test(b.innerText)) };` });
        assert.match(result.body, /no guardian permission is needed/i);
        assert.equal(result.tracker, 0, 'no approval tracker when there is nothing to approve');
        assert.ok(result.hasGo);
    });
});

describe("the guardian's own page", { skip: skipWithoutStyles }, () => {
    const guardianApi = (status, extra = {}) => `
const request = ${JSON.stringify({ id: 'a1', student: { name: 'Sowndarya', age: 13 }, job: JOB, guardian: { name: 'Devaki' }, requestedAt: null, decidedAt: null, declineReason: '', expired: false })};
let current = { ...request, status: ${JSON.stringify(status)}, steps: ${JSON.stringify(STEPS[status] || STEPS['awaiting-guardian'])}.map((state, i) => ({ label: ${JSON.stringify(STEP_LABELS)}[i], state })), ...${JSON.stringify(extra)} };
window.__calls = [];
const reply = () => Promise.resolve({ data: { request: current } });
export default {
  get: (url) => { window.__calls.push(['GET', url]); return reply(); },
  post: (url, body) => {
    window.__calls.push(['POST', url, body]);
    if (url.includes('/approve')) current = { ...current, status: 'awaiting-admin', guardianAnswered: true, steps: current.steps.map((s, i) => ({ ...s, state: i < 2 ? 'done' : i === 2 ? 'active' : 'waiting' })) };
    if (url.includes('/decline')) current = { ...current, status: 'declined', declineReason: (body && body.reason) || '', steps: current.steps.map((s, i) => ({ ...s, state: i < 1 ? 'done' : 'blocked' })) };
    return reply();
  },
  put: () => reply(), delete: () => reply()
};`;

    const guardianEntry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import GuardianReview from '${srcFile('opportunities/application/GuardianReview.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/jobs/guardian/tok']}>
    <Routes><Route path="/jobs/guardian/:token" element={<GuardianReview />} /></Routes>
  </MemoryRouter>);`;

    test('shows the student, the job and the safety notes, then asks the question', async () => {
        const { result, errors } = await screen({
            entry: guardianEntry, api: guardianApi('awaiting-guardian'), styles: true, script: `
                await sleep(700);
                const details = $$('details')[0];
                if (details) details.open = true;
                await sleep(200);
                return { body: text(document.body), heading: text($$('h1')[0]),
                         buttons: $$('button').map((b) => b.innerText.replace(/\\s+/g, ' ').trim()).filter(Boolean) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.heading, 'Part-Time Job Permission');
        assert.match(result.body, /Sowndarya/);
        assert.match(result.body, /Front Desk Assistant/);
        assert.match(result.body, /ABC Company/);
        assert.match(result.body, /Safety & job information/);
        assert.match(result.body, /supervisor is present/, 'the safety notes open');
        assert.match(result.body, /Do you allow this student to continue with this job application\?/);
        assert.ok(result.buttons.some((b) => /^Decline$/i.test(b)));
        assert.ok(result.buttons.some((b) => /Approve & continue/i.test(b)));
        assert.match(result.body, /Nobody at the school or the LMS can approve it for you/);
    });

    // The email's own buttons carry the answer in the link.
    const mailEntry = (answer) => guardianEntry.replace("initialEntries={['/jobs/guardian/tok']}", `initialEntries={['/jobs/guardian/tok?answer=${answer}']}`);

    test('the Approve button in the email records the answer on opening, with no second question', async () => {
        const { result, errors } = await screen({
            entry: mailEntry('approve'), api: guardianApi('awaiting-guardian'), styles: true, script: `
                await sleep(900);
                return { body: text(document.body), dialog: !!$('[role="dialog"]'),
                         posted: window.__calls.filter((c) => c[0] === 'POST').map((c) => c[1]) };` });
        assert.deepEqual(errors, []);
        assert.ok(result.posted.some((u) => /\/approve$/.test(u)), 'approved without a click on the page');
        assert.equal(result.dialog, false, 'nothing to confirm');
        assert.match(result.body, /Permission given/);
    });

    test('the Decline button in the email records that on opening too', async () => {
        const { result, errors } = await screen({
            entry: mailEntry('decline'), api: guardianApi('awaiting-guardian'), styles: true, script: `
                await sleep(900);
                return { body: text(document.body), posted: window.__calls.filter((c) => c[0] === 'POST').map((c) => c[1]) };` });
        assert.deepEqual(errors, []);
        assert.ok(result.posted.some((u) => /\/decline$/.test(u)));
        assert.match(result.body, /Permission declined/);
    });

    test('a link with an answer opened again later changes nothing', async () => {
        const { result } = await screen({
            entry: mailEntry('approve'), api: guardianApi('awaiting-admin', { guardianAnswered: true, decidedAt: '2026-09-29T08:00:00.000Z' }), styles: true, script: `
                await sleep(900);
                return { posted: window.__calls.filter((c) => c[0] === 'POST').length, body: text(document.body) };` });
        assert.equal(result.posted, 0, 'already answered: nothing is sent again');
    });

    test('approving asks once, then shows the guardian it landed', async () => {
        const { result } = await screen({
            entry: guardianEntry, api: guardianApi('awaiting-guardian'), styles: true, script: `
                await sleep(700);
                click(/Approve & continue/); await sleep(400);
                // Approving is confirmed, the same as declining: the button on
                // the page opens the question, it does not answer it.
                const asked = text(document.body);
                const postedBefore = window.__calls.filter((c) => c[0] === 'POST').length;
                click(/Yes, I approve/); await sleep(600);
                return { asked, postedBefore, body: text(document.body),
                         posted: window.__calls.filter((c) => c[0] === 'POST').map((c) => c[1]) };` });
        assert.match(result.asked, /Give permission\?/, 'it asks before it sends');
        assert.equal(result.postedBefore, 0, 'opening the dialog decides nothing');
        assert.match(result.body, /Permission given/);
        assert.ok(result.posted.some((u) => /\/approve$/.test(u)));
    });

    test('declining asks once more before it counts', async () => {
        const { result } = await screen({
            entry: guardianEntry, api: guardianApi('awaiting-guardian'), styles: true, script: `
                await sleep(700);
                click(/^Decline$/); await sleep(300);
                const asked = text($('[role="dialog"]'));
                const postedBefore = window.__calls.filter((c) => c[0] === 'POST').length;
                click(/^Cancel$/); await sleep(250);
                const goneAfterCancel = !$('[role="dialog"]');
                click(/^Decline$/); await sleep(300);
                const box = $('textarea');
                const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                setter.call(box, 'School exams that week.');
                box.dispatchEvent(new Event('input', { bubbles: true }));
                await sleep(200);
                click(/Decline permission/); await sleep(600);
                return { asked, postedBefore, goneAfterCancel, body: text(document.body),
                         posted: window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]) };` });
        assert.match(result.asked, /Decline permission\?/);
        assert.match(result.asked, /Are you sure you want to decline permission for this job application\?/);
        assert.equal(result.postedBefore, 0, 'opening the dialog decides nothing');
        assert.ok(result.goneAfterCancel, 'Cancel backs out');
        assert.match(result.body, /Permission declined/);
        const decline = result.posted.find(([u]) => /\/decline$/.test(u));
        assert.ok(decline, 'the decline was sent');
        assert.equal(decline[1].reason, 'School exams that week.', 'and the reason went with it');
    });

    test('a request already answered is not offered again', async () => {
        const { result } = await screen({
            entry: guardianEntry, api: guardianApi('approved'), styles: true, script: `
                await sleep(700);
                return { body: text(document.body), buttons: $$('button').map((b) => b.innerText.trim()).filter(Boolean) };` });
        assert.match(result.body, /Permission given/);
        assert.ok(!result.buttons.some((b) => /Approve|Decline/i.test(b)), 'the buttons are gone once it is answered');
    });
});
