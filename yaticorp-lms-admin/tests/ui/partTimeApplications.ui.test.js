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
  delete: () => Promise.resolve({ data: {} })
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

    test('an operator has nothing to press that would decide it', async () => {
        const { result } = await screen({
            entry, api: api(), script: `
                await sleep(800);
                return { buttons: $$('button').map((b) => b.innerText.replace(/\\s+/g, ' ').trim()).filter(Boolean),
                         body: text(document.body) };` });
        // The imperative forms only. "Approved (1)" is a filter chip, and the
        // word boundary keeps the past tense out of it.
        const deciding = result.buttons.filter((b) => /\b(approve|decline|reject|accept)\b/i.test(b));
        assert.deepEqual(deciding, [], `nothing here may decide, found ${JSON.stringify(deciding)}`);
        assert.match(result.body, /cannot be recorded here/, 'and the panel says so');
    });

    test('an empty list says so rather than showing nothing', async () => {
        const { result } = await screen({
            entry, api: api([]), script: `await sleep(800); return { body: text(document.body) };` });
        assert.match(result.body, /No applications yet/);
    });
});
