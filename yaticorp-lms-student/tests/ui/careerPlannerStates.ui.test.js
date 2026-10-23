/**
 * Today's Plan and a task's lesson, in the states the October 2026 audit
 * found them getting wrong.
 *
 * - A day whose build failed offers "Try again" — and never "Generate today's
 *   task", a second door to the same AI call (#50).
 * - A day failed because the AI allowance is spent says when it comes back,
 *   at a real time, and offers no retry at all (#50, #64).
 * - A plan that did not load is a failure with a retry, not an empty day (#50).
 * - "Try again" asks the server again, past the read cache, with ?retry=1 (#23).
 * - A tick-only task keeps its tick after a video was built for it (#29).
 * - A finished task says what it actually paid, not the rule (#77).
 * - A lesson that did not load says so, rather than showing the paid
 *   "How do you want to learn this?" chooser (#26).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

const lms = apiModule({
    '/user/settings': {}, '/user/profile': { _id: 'u1', name: 'Asha', xp: 120, level: 2 },
    '/rewards/summary': { xp: 120, level: { level: 2 } }, '/rewards/events/unseen': [],
    '/user/announcements': [], '/career/notifications': [], '/jobs/notifications': []
});

/**
 * A stand-in for the Career Path client. `failing` names URL fragments whose
 * GET is refused the way axios refuses a 500.
 */
const careerApi = (routes, failing = []) => `
const routes = ${JSON.stringify(routes)};
const failing = ${JSON.stringify(failing)};
const pick = (url) => { const key = Object.keys(routes).find((k) => url.includes(k)); return key ? routes[key] : {}; };
window.__calls = [];
const refuse = () => Promise.reject(Object.assign(new Error('Server Error'), { response: { status: 500, data: { message: 'Server Error' } } }));
export default {
  get: (url, config) => {
    window.__calls.push(['GET', url, config && config.params, !!(config && config.fresh)]);
    return failing.some((f) => url.includes(f)) ? refuse() : Promise.resolve({ data: pick(url) });
  },
  post: (url, body) => { window.__calls.push(['POST', url, body]); return Promise.resolve({ data: pick(url) }); },
  put: (url, body) => { window.__calls.push(['PUT', url, body]); return Promise.resolve({ data: pick(url) }); },
  delete: (url) => { window.__calls.push(['DELETE', url]); return Promise.resolve({ data: {} }); }
};
export const noneIfMissing = (promise) => promise.catch(() => null);
export const getTodaysPlan = () => Promise.resolve({ data: routes['/tasks'] });
export const careerWriteCount = () => 0;
export const clearCareerCache = () => {};`;

const page = (component, path) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '${srcFile('context/AuthContext.jsx')}';
import { RewardsContext } from '${srcFile('context/useRewards.js')}';
import CareerProviders from '${srcFile('career/CareerProviders.jsx')}';
${component}
localStorage.setItem('studentToken', 't');
localStorage.setItem('studentData', JSON.stringify({ _id: 'u1', name: 'Asha' }));
const rewards = { enabled: true, summary: { xpRules: { career_task: 15 } }, refresh: () => Promise.resolve(null), celebrate: () => {}, pullEvents: () => {}, markEventsSeen: () => Promise.resolve() };
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['${path}']}><AuthProvider><RewardsContext.Provider value={rewards}><CareerProviders><Screen /></CareerProviders></RewardsContext.Provider></AuthProvider></MemoryRouter>);`;

const planner = page(`import Screen from '${srcFile('career/pages/dashboard/Planner.jsx')}';`, '/career/planner');

const run = (routes, script, failing = []) => screen({
    entry: planner,
    api: lms,
    modules: { 'career/services/api': careerApi(routes, failing) },
    script
});

const read = `await sleep(2500); return { text: document.body.innerText.replace(/\\s+/g, ' ') };`;

describe("Today's Plan", { skip: skipWithoutChrome }, () => {
    test('a failed day offers "Try again", and "Try again" asks the server to rebuild it', async () => {
        const { result, errors } = await run(
            { '/tasks': { tasks: [], day: { status: 'failed', message: "We couldn't build today's plan just now.", retryAfter: '2000-01-01T00:00:00.000Z' } } },
            `await sleep(2500);
             const before = document.body.innerText.replace(/\\s+/g, ' ');
             click(/^Try again$/);
             await sleep(800);
             return { before, calls: window.__calls.filter((c) => c[1] === '/tasks') };`
        );
        assert.deepEqual(errors, []);
        assert.match(result.before, /Today's plan could not be built/);
        assert.match(result.before, /Try again/);
        assert.doesNotMatch(result.before, /Generate today's task/, 'no second door to the same AI call');
        const retry = result.calls.find((c) => c[2] && Number(c[2].retry) === 1);
        assert.ok(retry, 'the retry asks for a rebuild');
        assert.equal(retry[3], true, 'past the read cache');
    });

    test('a spent allowance says when it comes back, with no retry and no Generate', async () => {
        const resetsAt = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
        const { result, errors } = await run(
            { '/tasks': { tasks: [], day: { status: 'failed', code: 'student-daily-cap', message: "You have used today's AI allowance.", resetsAt } } },
            read
        );
        assert.deepEqual(errors, []);
        assert.match(result.text, /You've used today's AI requests/);
        assert.match(result.text, /Back at .+\(in about \d+ hours?\)/, 'a real time, not "at midnight"');
        assert.doesNotMatch(result.text, /Generate today's task|Try again/);
    });

    test('a plan that did not load is a failure with a retry, not an empty day', async () => {
        const { result, errors } = await run({}, read, ['/tasks']);
        assert.deepEqual(errors, []);
        assert.match(result.text, /We couldn't load today's plan/);
        assert.match(result.text, /Retry/);
        assert.doesNotMatch(result.text, /Generate today's task|No tasks for today/);
    });

    test('a tick-only task keeps its tick once a video is built, and a finished task shows what it paid', async () => {
        const { result, errors } = await run(
            {
                '/tasks': {
                    tasks: [
                        { _id: 't1', title: 'Push to GitHub', status: 'Pending', learning: 'none', hasLesson: true, guidance: ['Commit'] },
                        { _id: 't2', title: 'Write a README', status: 'Completed', learning: 'none', xpPaid: 7, completedAt: '2026-10-14T05:00:00.000Z' }
                    ],
                    day: { status: 'ready' }
                }
            },
            `await sleep(2500);
             return {
               text: document.body.innerText.replace(/\\s+/g, ' '),
               tick: !!document.querySelector('[aria-label="Mark \\\\"Push to GitHub\\\\" as done"]')
             };`
        );
        assert.deepEqual(errors, []);
        assert.equal(result.tick, true, 'the manual tick stays beside the optional video');
        assert.match(result.text, /Done · \+7 XP/, 'what the task paid');
        assert.doesNotMatch(result.text, /Done · \+15 XP/, 'not the rule as it stands today');
    });
});

describe("A task's lesson", { skip: skipWithoutChrome }, () => {
    test('a lesson that did not load says so, instead of offering to build (and charge for) a new one', async () => {
        const panel = page(`import TaskStudyPanel from '${srcFile('career/components/study/TaskStudyPanel.jsx')}';
const Screen = () => <TaskStudyPanel task={{ _id: 't1', title: 'Joins', learning: 'video', status: 'Pending' }} />;`, '/career/planner');
        const { result, errors } = await screen({
            entry: panel,
            api: lms,
            modules: { 'career/services/api': careerApi({}, ['/study']) },
            script: read
        });
        assert.deepEqual(errors, []);
        assert.match(result.text, /This lesson didn't load/);
        assert.match(result.text, /Retry/);
        assert.doesNotMatch(result.text, /How do you want to learn this\?/);
    });
});
