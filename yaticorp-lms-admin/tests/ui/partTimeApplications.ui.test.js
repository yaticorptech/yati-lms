/**
 * The admin panel for part-time job applications.
 *
 * It exists to answer "where has this permission got to", and to make it
 * obvious that an operator cannot answer for the guardian. That second point
 * is worth a test of its own: a panel with an Approve button would quietly
 * undo the whole design.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';

const steps = (states) => states.map((state, i) =>
    ({ label: ['Request sent', 'Guardian review', 'Approval', 'Application continues'][i], state }));

const row = (id, name, status, states, extra = {}) => ({
    id, userId: `u-${id}`,
    student: { name, age: 13 }, underAge: true,
    job: { title: 'Front Desk Assistant', company: 'ABC Company' },
    guardian: { name: 'Devaki', phone: '+91 •••••43210' },
    status, steps: steps(states),
    requestedAt: '2026-09-11T10:00:00.000Z', decidedAt: null, declineReason: '',
    updatedAt: '2026-09-11T10:00:00.000Z', ...extra
});

const APPLICATIONS = [
    row('a1', 'Sowndarya', 'awaiting-guardian', ['done', 'active', 'waiting', 'waiting']),
    row('a2', 'Hari Kiran', 'approved', ['done', 'done', 'done', 'active'], { decidedAt: '2026-09-11T12:00:00.000Z' }),
    row('a3', 'Sneha Pai', 'declined', ['done', 'done', 'blocked', 'blocked'],
        { decidedAt: '2026-09-11T13:00:00.000Z', declineReason: 'School exams that week.' })
];

const api = (applications = APPLICATIONS) => `
const applications = ${JSON.stringify(applications)};
window.__calls = [];
export default {
  get: (url, config) => { window.__calls.push(['GET', url, config && config.params]);
    const wanted = config && config.params && config.params.status;
    const rows = wanted ? applications.filter((a) => a.status === wanted) : applications;
    const counts = applications.reduce((acc, a) => ({ ...acc, [a.status]: (acc[a.status] || 0) + 1 }), {});
    return Promise.resolve({ data: { applications: rows, total: rows.length, counts } }); },
  post: () => Promise.resolve({ data: {} }),
  put: () => Promise.resolve({ data: {} }),
  delete: (url) => { window.__calls.push(['DELETE', url]); return Promise.resolve({ data: { deleted: true } }); }
};`;

const entry = `
import { createRoot } from 'react-dom/client';
import PartTimeApplicationsPanel from '${srcFile('components/PartTimeApplicationsPanel.jsx')}';
createRoot(document.getElementById('root')).render(<PartTimeApplicationsPanel />);`;

describe('the part-time applications panel', { skip: skipWithoutChrome }, () => {
    test('lists the student, the job, the guardian and where the permission stands', async () => {
        const { result, errors } = await screen({
            entry, api: api(), script: `
                await sleep(800);
                return { body: text(document.body), asked: window.__calls.map((c) => c[1]) };` });
        assert.deepEqual(errors, []);
        for (const bit of ['Sowndarya', 'Under 15', 'Front Desk Assistant', 'ABC Company', 'Devaki', '+91 •••••43210']) {
            assert.ok(result.body.includes(bit), `"${bit}" should be listed`);
        }
        assert.ok(result.asked.some((u) => /admin\/opportunities\/applications/.test(u)));
    });

    test('each of the three answers reads differently', async () => {
        const { result } = await screen({
            entry, api: api(), script: `
                await sleep(800); return { body: text(document.body) };` });
        assert.match(result.body, /Waiting for guardian/);
        assert.match(result.body, /Approved/);
        assert.match(result.body, /Declined/);
        assert.match(result.body, /School exams that week\./, "the guardian's reason is passed on");
    });

    test('the same four steps the student and the guardian see', async () => {
        const { result } = await screen({
            entry, api: api([APPLICATIONS[0]]), script: `
                await sleep(800);
                return { steps: $$('ol li').map((li) => li.innerText.replace(/\\s+/g, ' ').trim()).filter(Boolean) };` });
        assert.deepEqual(result.steps.slice(0, 4).map((s) => s.replace(/\s*›$/, '').trim()),
            ['Request sent', 'Guardian review', 'Approval', 'Application continues']);
    });

    test('filtering narrows the list without asking the guardian anything', async () => {
        const { result } = await screen({
            entry, api: api(), script: `
                await sleep(800);
                click(/^Declined/); await sleep(600);
                return { body: text(document.body), params: window.__calls.map((c) => c[2]).filter(Boolean) };` });
        assert.match(result.body, /Sneha Pai/);
        assert.equal(/Sowndarya/.test(result.body), false, 'the waiting one is filtered out');
        assert.ok(result.params.some((p) => p.status === 'declined'));
    });

    test('nothing here can answer for a parent who has not answered', async () => {
        // The rows in the fixture are waiting on a parent, or already settled.
        // None of them is the operator's to decide, so none of them may offer
        // a button that would.
        const { result } = await screen({
            entry, api: api(), script: `
                await sleep(800);
                return { buttons: $$('button').map((b) => b.innerText.replace(/\\s+/g, ' ').trim()).filter(Boolean),
                         body: text(document.body) };` });
        // The imperative forms only. "Approved (1)" is a filter chip, and the
        // word boundary keeps the past tense out of it.
        const deciding = result.buttons.filter((b) => /\b(approve|decline|reject|accept)\b/i.test(b));
        assert.deepEqual(deciding, [], `nothing here may decide, found ${JSON.stringify(deciding)}`);
        assert.match(result.body, /only once the parent has agreed/i,
            'and the panel says when a row becomes theirs to answer');
    });

    test('a row the parent has approved is the operator\'s to sign off', async () => {
        // canDecide comes from the server, which only sets it once a parent has
        // agreed. This is the one state where buttons belong.
        const waiting = [row('a4', 'Meera Rao', 'awaiting-admin', ['done', 'done', 'active', 'waiting'],
            { decidedAt: '2026-09-12T09:00:00.000Z', canDecide: true })];
        const { result } = await screen({
            entry, api: api(waiting), script: `
                await sleep(800);
                return { buttons: $$('button').map((b) => b.innerText.replace(/\\s+/g, ' ').trim()).filter(Boolean),
                         body: text(document.body) };` });
        assert.ok(result.buttons.some((b) => /^Approve$/i.test(b)), `an Approve button, saw ${JSON.stringify(result.buttons)}`);
        assert.ok(result.buttons.some((b) => /^Reject$/i.test(b)), 'and a Reject button');
        assert.match(result.body, /Meera Rao/);
    });

    test('a request nobody has been told about can be withdrawn', async () => {
        // canDelete comes from the server and means only one thing: no message
        // has gone out, so there is nothing of the parent's to erase.
        const unsent = [row('a5', 'Tejas Shetty', 'needs-guardian', ['waiting', 'waiting', 'waiting', 'waiting'],
            { requestedAt: null, canDelete: true })];
        const { result } = await screen({
            entry, api: api(unsent), script: `
                await sleep(800);
                click(/^\\s*Delete\\s*$/); await sleep(200);
                const asking = text(document.body);
                click(/Yes, delete it/); await sleep(400);
                return { asking, calls: window.__calls.filter((c) => c[0] === 'DELETE').map((c) => c[1]) };` });
        assert.match(result.asking, /Yes, delete it/, 'it asks before it deletes');
        assert.deepEqual(result.calls, ['/jobs/admin/opportunities/applications/a5']);
    });

    test('a request the parent has already seen offers no delete', async () => {
        // Every row in the fixture has been sent; none of them carries
        // canDelete, so the button must not be anywhere on the page.
        const { result } = await screen({
            entry, api: api(), script: `
                await sleep(800);
                return { buttons: $$('button').map((b) => b.innerText.replace(/\\s+/g, ' ').trim()) };` });
        const removing = result.buttons.filter((b) => /^Delete$/i.test(b));
        assert.deepEqual(removing, [], `no delete belongs here, found ${JSON.stringify(removing)}`);
    });

    test('an empty list says so rather than showing nothing', async () => {
        const { result } = await screen({
            entry, api: api([]), script: `await sleep(800); return { body: text(document.body) };` });
        assert.match(result.body, /No applications yet/);
    });
});
