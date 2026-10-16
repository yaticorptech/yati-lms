/**
 * The Dashboard's opening, and My Profile's small popups.
 *
 *   - "Continue: <course> · Resume" under the welcome banner when a course is
 *     under way, linking straight into it; nothing when none is.
 *   - The banner's level re-reads when progress changes without a page
 *     change (a lesson, a quiz, a Career Path task).
 *   - A wallet refresh no longer throws the page back to #wallet.
 *   - The signup-organization note only says "whenever you have the right
 *     Organization ID" when the ID was the problem.
 *   - The Credits tile goes when the credit system is off.
 *   - The photo viewer is a dialog; Escape closes it.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

const routes = (courses) => ({
    '/user/announcements': [], '/career/notifications': [], '/jobs/notifications': [],
    '/user/profile': { user: { level: 3, xp: 450 } },
    '/career/tasks/history': [],
    '/certificates': [],
    '/user/courses/available': { availableCourses: [] },
    '/user/courses': { courses, bundles: [] },
    '/user/achievements': { achievements: [] },
    '/rewards/leaderboard': { entries: [], around: [], total: 0, me: null },
    '/rewards/wallet': { wallet: { available: 100, rewardPoints: 0, currency: 'INR', totalEarned: 100, totalSpent: 0 }, conversion: { pointsPerUnit: 100, unitValue: 10 }, limits: {}, recent: [] }
});
const ONGOING = [{ _id: 'kA', title: 'Finished Course', progress: 100 }, { _id: 'kB', title: 'Ongoing Course', progress: 40 }, { _id: 'kC', title: 'Barely Started', progress: 5 }];

const USER = { _id: 'u1', name: 'Meera Active', email: 'meera@example.com', profilePicture: '/avatars/girls/3.jpg', credits: 7 };

/**
 * Profile with a rewards context the test can change (window.__setSummary),
 * inside a router at `at`. `before` runs first (storage set-up).
 */
const page = ({ view = 'dashboard', at = '/', credits = true, rewardsOn = false, before = '' } = {}) => `
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import { RewardsContext } from '${srcFile('context/useRewards.js')}';
import Profile from '${srcFile('pages/Profile.jsx')}';
${before}
const SUMMARY = { xp: 450, level: { level: 3 }, streak: { current: 1, calendar: [] }, badges: [], config: { levelThresholds: [0, 100, 300, 600] },
  wallet: { available: 100, currency: 'INR' }, stats: { lessons: { total: 0, thisWeek: 0 }, quizzes: { total: 0, passed: 0, thisWeek: 0 }, courses: { enrolled: 0, total: 0 }, xpThisWeek: 0 }, series: {} };
function App() {
  const [summary, setSummary] = useState(SUMMARY);
  window.__setSummary = setSummary;
  const rewards = { enabled: ${rewardsOn}, summary, refresh: () => {}, celebrate: () => {}, pullEvents: () => {} };
  return (
    <AuthContext.Provider value={{ user: ${JSON.stringify(USER)}, setUser: () => {}, isCareerPathEnabled: true, isGlobalQuizEnabled: false, isCreditSystemEnabled: ${credits}, isJobsEnabled: true }}>
      <RewardsContext.Provider value={rewards}>
        <MemoryRouter initialEntries={['${at}']}><Profile view="${view}" /></MemoryRouter>
      </RewardsContext.Provider>
    </AuthContext.Provider>);
}
createRoot(document.getElementById('root')).render(<App />);`;

describe('the Dashboard opening', { skip: skipWithoutChrome }, () => {
    test('a course under way gets a Continue strip under the banner, straight into it', async () => {
        const { result, errors } = await screen({
            entry: page(), api: apiModule(routes(ONGOING)), script: `
                await sleep(1200);
                const strip = $('[data-continue-strip]');
                const banner = $('[data-welcome]');
                return { text: text(strip), href: strip && strip.getAttribute('href'),
                         after: !!(banner && strip && (banner.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING)) };` });
        assert.deepEqual(errors, []);
        assert.match(result.text, /^Continue: Ongoing Course/, 'the furthest-along unfinished course');
        assert.match(result.text, /40% done.*Resume/);
        assert.equal(result.href, '/learn/kB');
        assert.equal(result.after, true, 'under the welcome banner');
    });

    test('no strip when nothing is under way', async () => {
        const { result } = await screen({
            entry: page(), api: apiModule(routes([{ _id: 'kA', title: 'Finished Course', progress: 100 }])),
            script: `await sleep(1200); return { strip: !!$('[data-continue-strip]') };` });
        assert.equal(result.strip, false);
    });

    test('the banner reads the level again when progress changes', async () => {
        const { result } = await screen({
            entry: page(), api: apiModule(routes(ONGOING)), script: `
                await sleep(1200);
                const count = () => window.__calls.filter((c) => c[0] === 'GET' && c[1] === '/user/profile').length;
                const before = count();
                window.dispatchEvent(new CustomEvent('yati:progress-changed')); await sleep(200);
                window.dispatchEvent(new CustomEvent('yati:rewards', { detail: [] })); await sleep(200);
                return { before, after: count() };` });
        assert.equal(result.after, result.before + 2);
    });

    test('XP the course list brings back (a completion found on reading it) goes to the celebrations', async () => {
        const withEvents = apiModule({ ...routes(ONGOING), '/user/courses': { courses: ONGOING, bundles: [], rewards: { events: [{ type: 'course_complete', xp: 50 }] } } });
        const { result, errors } = await screen({
            entry: page({ before: `window.__heard = []; window.addEventListener('yati:rewards', (e) => window.__heard.push(e.detail));` }), api: withEvents,
            script: `await sleep(1200); return { heard: window.__heard, strip: !!$('[data-continue-strip]') };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.heard[0], [{ type: 'course_complete', xp: 50 }]);
        assert.equal(result.strip, true, 'and the lists still load');
    });

    test('a wallet refresh does not throw the page back to #wallet', async () => {
        const { result, errors } = await screen({
            entry: page({ at: '/#wallet', rewardsOn: true }), api: apiModule(routes(ONGOING)), height: 700, script: `
                await sleep(1500);
                document.body.style.minHeight = '5000px';
                window.scrollTo(0, 0); await sleep(100);
                window.__setSummary((s) => ({ ...s, wallet: { available: 90, currency: 'INR' } })); await sleep(800);
                return { y: window.scrollY };` });
        assert.deepEqual(errors, []);
        assert.equal(result.y, 0, 'the student stays where they scrolled to');
    });

    for (const [reason, says, not] of [
        ['not_found', /whenever you have the right Organization ID/, null],
        ['invalid', /whenever you have the right Organization ID/, null],
        ['error', /You can try again from My Profile/, /right Organization ID/],
        ['unknown', /You can add it from My Profile/, /right Organization ID/],
        ['', /You can add it from My Profile/, /right Organization ID/]
    ]) {
        test(`the signup organization note, when the reason is "${reason || 'not given'}"`, async () => {
            const org = { requested: false, orgCode: 'st_x', message: 'Could not send your request.', ...(reason ? { reason } : {}) };
            const { result } = await screen({
                entry: page({ before: `sessionStorage.setItem('yati.signupOrg', ${JSON.stringify(JSON.stringify(org))});` }), api: apiModule(routes([])),
                script: `await sleep(1000); return { note: text($$('p').find((p) => /My Profile/.test(p.innerText))) };` });
            assert.match(result.note, says);
            if (not) assert.doesNotMatch(result.note, not);
        });
    }
});

describe('My Profile', { skip: skipWithoutChrome }, () => {
    test('the Credits tile is shown only while the credit system is on', async () => {
        const tiles = async (credits) => (await screen({
            entry: page({ view: 'profile', credits }), api: apiModule(routes([])),
            script: `await sleep(1200); return { credits: /Credits/.test(text(document.body)), streak: /Streak/.test(text(document.body)) };` })).result;
        const on = await tiles(true);
        const off = await tiles(false);
        assert.deepEqual(on, { credits: true, streak: true });
        assert.deepEqual(off, { credits: false, streak: true });
    });

    test('the photo viewer is a named dialog, and Escape closes it', async () => {
        const { result, errors } = await screen({
            entry: page(), api: apiModule(routes([])), script: `
                await sleep(1000);
                $('button[aria-label="View your photo"]').click(); await sleep(200);
                const dialog = $('[role=dialog][aria-modal=true]');
                const named = dialog && dialog.getAttribute('aria-label');
                const close = !!(dialog && dialog.querySelector('button[aria-label="Close photo"]'));
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await sleep(200);
                return { named, close, gone: !$('[role=dialog][aria-modal=true]') };` });
        assert.deepEqual(errors, []);
        assert.match(result.named, /Profile photo/);
        assert.equal(result.close, true);
        assert.equal(result.gone, true);
    });
});
