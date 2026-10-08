/**
 * The lock on the Jobs section: five Career Path skills, each at 25% or more,
 * open it (the account owner's rule, 2026-10-02). A few accounts are exempt;
 * the server decides both, and the student app only asks.
 *
 * A gate is worth testing from both sides. Too strict and students who have
 * done the work are told to go away; too loose and it may as well not be there
 * — which is what it was, while the Career Path job tile listed jobs to anyone.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const skill = (name, progress) => ({ name, progress });
/** The server's answer for a student with these skills. */
const access = (skills, extra = {}) => {
    const ready = skills.filter((s) => s.progress >= 25).length;
    return apiModule({ '/user/jobs-access': { open: ready >= 5, alwaysOpen: false, ready, required: { skills: 5, percent: 25 }, skills, ...extra } });
};

const entry = (careerPathEnabled = true) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import useJobsAccess from '${srcFile('hooks/useJobsAccess.js')}';
import JobsLockedNotice from '${srcFile('jobs/JobsLockedNotice.jsx')}';
const Gate = () => {
  const a = useJobsAccess();
  if (a.loading) return <p>loading</p>;
  if (a.open) return <p id="open">The jobs board</p>;
  return <JobsLockedNotice {...a} careerPathEnabled={${careerPathEnabled}} />;
};
createRoot(document.getElementById('root')).render(<MemoryRouter><Gate /></MemoryRouter>);`;

const read = `
    await sleep(800);
    const go = [...document.querySelectorAll('a')].find((a) => /Grow my skills/.test(a.innerText));
    return { open: !!$('#open'), body: text(document.body), go: go && go.getAttribute('href'),
             ticks: document.querySelectorAll('li > span.bg-emerald-500').length,
             asked: window.__calls.map((c) => c[1]) };`;

describe('who may open the Jobs section', { skip: skipWithoutStyles }, () => {
    test('five skills at 25% or more open it', async () => {
        const five = [skill('React', 60), skill('JavaScript', 40), skill('CSS', 30), skill('Git', 25), skill('HTML', 25)];
        const { result, errors } = await screen({ entry: entry(), api: access(five), styles: true, script: read });
        assert.deepEqual(errors, []);
        assert.ok(result.open, 'five at 25% is the bar');
        assert.ok(result.asked.includes('/user/jobs-access'), 'asked the server, which holds the rule');
    });

    test('two of five is held back, and shown each skill against the bar', async () => {
        const some = [skill('React', 60), skill('JavaScript', 30), skill('CSS', 20), skill('Git', 10), skill('HTML', 0)];
        const { result } = await screen({ entry: entry(), api: access(some), styles: true, script: read });
        assert.equal(result.open, false);
        assert.match(result.body, /5 skills/);
        assert.match(result.body, /25%/);
        assert.match(result.body, /2 of 5/, 'how many are there');
        assert.match(result.body, /3 more to go/, 'and how many are left');
        assert.match(result.body, /React/);
        assert.equal(result.ticks, 2, 'a tick on each skill past 25%');
        assert.equal(result.go, '/career/skills', 'and the way to grow them');
    });

    test('a high average is not the rule: one skill short of 25% keeps it shut', async () => {
        const nearly = [skill('React', 100), skill('JavaScript', 90), skill('CSS', 80), skill('Git', 70), skill('HTML', 20)];
        const { result } = await screen({ entry: entry(), api: access(nearly), styles: true, script: read });
        assert.equal(result.open, false);
        assert.match(result.body, /4 of 5/);
    });

    test('a student with no skills yet is asked to set them up', async () => {
        const { result } = await screen({ entry: entry(), api: access([]), styles: true, script: read });
        assert.equal(result.open, false);
        assert.match(result.body, /Set up your skills in Career Path/);
    });

    test('fewer than five skills: told how many more to add', async () => {
        const { result } = await screen({ entry: entry(), api: access([skill('React', 50), skill('CSS', 40)]), styles: true, script: read });
        assert.match(result.body, /Add 3 more skills in Career Path/);
    });

    test('an exempt account is open with no skills at all', async () => {
        const { result } = await screen({ entry: entry(), api: access([], { open: true, alwaysOpen: true }), styles: true, script: read });
        assert.ok(result.open, 'Bhagyashree and Yaticorp do not wait on skills');
    });

    test('with Career Path switched off, it says so rather than sending them there', async () => {
        const { result } = await screen({ entry: entry(false), api: access([]), styles: true, script: read });
        assert.equal(result.open, false);
        assert.match(result.body, /Career Path is switched off/);
        assert.equal(result.go, undefined, 'no link into a section that is off');
    });

    test('a failed check opens nothing, and offers to try again', async () => {
        // It used to open the section, which made the lock as good as absent
        // whenever the server was slow.
        const failing = `window.__calls = []; let n = 0;
export default { get: (url) => { window.__calls.push(['GET', url]); n += 1;
  return n === 1 ? Promise.reject(new Error('down'))
    : Promise.resolve({ data: { open: true, alwaysOpen: false, ready: 5, required: { skills: 5, percent: 25 }, skills: [] } }); },
  post: () => Promise.resolve({ data: {} }), put: () => Promise.resolve({ data: {} }), delete: () => Promise.resolve({ data: {} }) };`;
        const { result } = await screen({ entry: entry(), api: failing, styles: true, script: `
            await sleep(700);
            const first = { open: !!$('#open'), body: text(document.body) };
            click(/Try again/); await sleep(700);
            return { first, after: !!$('#open'), asked: window.__calls.length };` });
        assert.equal(result.first.open, false, 'not opened by the failure');
        assert.match(result.first.body, /couldn.t check/i);
        assert.equal(result.after, true, 'Try again asks once more, and opens it when it may');
        assert.equal(result.asked, 2);
    });
});

describe('the Career Path job tile', { skip: skipWithoutStyles }, () => {
    const tile = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import JobMatchesTile from '${srcFile('career/components/dashboard/JobMatchesTile.jsx')}';
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ isJobsEnabled: true }}><MemoryRouter><div id="tile"><JobMatchesTile /></div></MemoryRouter></AuthContext.Provider>);`;
    const routes = (open) => apiModule({
        '/user/jobs-access': { open, alwaysOpen: false, ready: open ? 5 : 1, required: { skills: 5, percent: 25 }, skills: [] },
        '/career/goals': { careerGoal: 'Frontend Developer' },
        '/career/skills': [{ skillName: 'React', progress: 40 }],
        '/jobs/recommend': { results: [{ id: 'j1', title: 'Junior Frontend Developer', company: 'Acme', location: 'Bengaluru', url: 'https://example.com', match: { total: 70 } }] }
    });
    const look = `await sleep(1200); return { text: text($('#tile')), asked: window.__calls.map((c) => c[1]) };`;

    test('a student the Jobs section is shut to is shown no jobs here either', async () => {
        const { result, errors } = await screen({ entry: tile, api: routes(false), styles: true, script: look });
        assert.deepEqual(errors, []);
        assert.equal(result.text.trim(), '', 'the tile is not drawn');
        assert.ok(!result.asked.some((u) => /\/jobs\/recommend/.test(u)), 'and no jobs are even asked for');
    });

    test('once the section is open, the tile lists jobs as before', async () => {
        const { result } = await screen({ entry: tile, api: routes(true), styles: true, script: look });
        assert.match(result.text, /Junior Frontend Developer/);
    });
});
