/**
 * The Dashboard's My Learning: the bundle and enrol popups, the course list's
 * background refresh, and the Weekly activity tiles.
 *
 *   - A course inside a bundle shows the student's own progress on it, which
 *     the server puts on the course: one reached only through the bundle is
 *     not in the enrolled list, and read 0% and "Start Course".
 *   - Both popups are dialogs with a name, so the app's pop-in notices wait
 *     for them and Yati keeps off them; Escape closes them.
 *   - A short wallet points to Career Path only while it is switched on.
 *   - The 30-second refresh keeps the list on screen: no spinner.
 *   - The seven day tiles come from the rewards streak, the same record as the
 *     streak number above them.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const DESKTOP = 1280;

// The rewards streak's calendar ends today (server time); the last three days active.
const CALENDAR = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 9, 4 + i));
    return { day: d.toISOString().slice(0, 10), active: i >= 7 };
});

const api = apiModule({
    '/user/announcements': [], '/career/notifications': [], '/jobs/notifications': [],
    '/user/profile': { user: { level: 3, xp: 450 } },
    '/organizations/student/me': { member: false, organization: null, request: null },
    '/career/tasks/history': [],
    '/certificates': [],
    // Before '/user/courses': the stub matches the first key the address contains.
    '/user/courses/available': { availableCourses: [{ _id: 'kP', title: 'Priced Course', price: 500, description: 'A course that costs money.' }] },
    '/user/courses': {
        courses: [{ _id: 'kA', title: 'Finished Course', progress: 100 }, { _id: 'kB', title: 'Ongoing Course', progress: 40 }],
        bundles: [{
            _id: 'b1', title: 'QA Bundle', progress: 50,
            courses: [
                { _id: 'kA', title: 'Finished Course', progress: 100 },
                { _id: 'kC', title: 'Bundle-only Course', progress: 50 },
                { _id: 'kD', title: 'Untouched Course', progress: 0 }
            ]
        }]
    },
    '/rewards/summary': {
        xp: 450, level: { level: 3 }, streak: { current: 3, longest: 3, doneToday: true, alive: true, calendar: CALENDAR }, badges: [],
        config: { levelThresholds: [0, 100, 300, 600, 1000] },
        wallet: { available: 100, currency: 'INR' },
        stats: { lessons: { total: 2, thisWeek: 2 }, quizzes: { total: 1, passed: 1, thisWeek: 1 }, courses: { enrolled: 2, total: 2 }, xpThisWeek: 120 },
        series: {}
    },
    '/user/achievements': { achievements: [] },
    '/rewards/leaderboard': { entries: [], around: [], total: 0, me: null },
    '/rewards/wallet': {
        wallet: { available: 100, rewardPoints: 0, currency: 'INR', totalEarned: 100, totalSpent: 0 },
        rewardPointsValue: 0, monetaryEnabled: false, conversion: { pointsPerUnit: 100, unitValue: 10 }, limits: {}, recent: []
    }
});

// The same API, except that once `window.__slow` is set the course lists take
// a moment to come back, as they do over a network. Answered at once, React
// folds "loading" and the new data into one render and a blink cannot show.
const slowApi = api.split('export default {').join('const base = {') + `
export default { ...base, get: (url, config) => base.get(url, config).then((r) => (window.__slow && url.includes('/user/courses') ? new Promise((ok) => setTimeout(() => ok(r), 800)) : r)) };`;

const USER = { _id: 'u1', name: 'Meera Active', email: 'meera@example.com', profilePicture: '/avatars/girls/3.jpg' };

const page = ({ career = true } = {}) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import { RewardsProvider } from '${srcFile('context/RewardsContext.jsx')}';
import Profile from '${srcFile('pages/Profile.jsx')}';
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: ${JSON.stringify(USER)}, setUser: () => {}, isCareerPathEnabled: ${career}, isGlobalQuizEnabled: true, isRewardsEnabled: true, isJobsEnabled: true }}>
    <RewardsProvider><MemoryRouter><Profile /></MemoryRouter></RewardsProvider>
  </AuthContext.Provider>);`;

const tab = (name) => `$$('[role=tab]').find((t) => ${name}.test(t.innerText)).click(); await sleep(500);`;
const escape = `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(300);`;
// A dialog's name, from aria-labelledby or aria-label.
const NAME = `const nameOf = (d) => d && (d.getAttribute('aria-label') || text(document.getElementById(d.getAttribute('aria-labelledby'))));`;

describe("the Dashboard's My Learning", { skip: skipWithoutStyles }, () => {
    test("a bundle's courses show the student's own progress, with Review for a finished one", async () => {
        const { result, errors } = await screen({
            entry: page(), api, styles: true, width: DESKTOP, budget: 20_000, script: `
                await sleep(1500);
                ${tab('/Bundles/')}
                click(/View Courses Inside/); await sleep(500);
                ${NAME}
                const dialog = $('[role=dialog][aria-modal=true]');
                const cards = dialog ? [...dialog.querySelectorAll('h3')].map((h) => {
                    const card = h.closest('.lift');
                    return { title: text(h), progress: text([...card.querySelectorAll('span')].find((s) => /^\\d+%$/.test(s.innerText.trim()))), action: text(card.querySelector('a')) };
                }) : [];
                const r = { name: nameOf(dialog), close: !!dialog?.querySelector('button[aria-label=Close]'), cards };
                ${escape}
                return { ...r, closedByEscape: !$('[role=dialog][aria-modal=true]') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.name, 'QA Bundle', 'the popup is a dialog named by its bundle');
        assert.ok(result.close, 'its X has a name');
        assert.deepEqual(result.cards, [
            { title: 'Finished Course', progress: '100%', action: 'Review Course' },
            { title: 'Bundle-only Course', progress: '50%', action: 'Resume Course' },
            { title: 'Untouched Course', progress: '0%', action: 'Start Course' }
        ]);
        assert.ok(result.closedByEscape, 'Escape closes it');
    });

    for (const career of [true, false]) {
        test(`the enrol popup is a named dialog, and a short wallet ${career ? 'points to Career Path' : 'does not name Career Path while it is off'}`, async () => {
            const { result, errors } = await screen({
                entry: page({ career }), api, styles: true, width: DESKTOP, budget: 20_000, script: `
                    await sleep(1500);
                    click(/Enroll Now/); await sleep(500);
                    ${NAME}
                    const dialog = $('[role=dialog][aria-modal=true]');
                    const short = dialog && [...dialog.querySelectorAll('p')].find((p) => /Not enough in your wallet/.test(p.innerText));
                    const r = { name: nameOf(dialog), short: text(short), careerLink: !!short?.querySelector('a[href="/career"]') };
                    ${escape}
                    return { ...r, closedByEscape: !$('[role=dialog][aria-modal=true]') };` });
            assert.deepEqual(errors, []);
            assert.equal(result.name, 'Enroll in Course');
            assert.ok(result.short, 'the short-wallet line is there');
            assert.equal(result.careerLink, career, career ? 'Career Path is linked' : 'no link to a page that is switched off');
            if (!career) assert.match(result.short, /finishing lessons and quizzes/);
            assert.ok(result.closedByEscape, 'Escape closes it');
        });
    }

    test('the 30-second refresh re-reads the courses without blanking the list', async () => {
        const { result, errors } = await screen({
            entry: page(), api: slowApi, styles: true, width: DESKTOP, budget: 60_000, script: `
                await sleep(1500);
                window.__slow = true;
                const listed = () => /Priced Course/.test(document.body.innerText);
                const spinner = () => !!$('.animate-spin.h-12');
                const before = { listed: listed(), reads: window.__calls.filter((c) => c[1] === '/user/courses').length };
                let blanked = false;
                const watch = new MutationObserver(() => { if (spinner() || !listed()) blanked = true; });
                watch.observe(document.body, { childList: true, subtree: true });
                await sleep(31_000);
                watch.disconnect();
                return { before, after: window.__calls.filter((c) => c[1] === '/user/courses').length, blanked, listed: listed() };` });
        assert.deepEqual(errors, []);
        assert.ok(result.before.listed, 'the list is up first');
        assert.ok(result.after > result.before.reads, 'the courses were read again');
        assert.equal(result.blanked, false, 'no spinner, and the list never left the screen');
        assert.ok(result.listed);
    });

    test('Weekly activity: the day tiles come from the same streak as the number', async () => {
        const { result, errors } = await screen({
            entry: page(), api, styles: true, width: DESKTOP, budget: 20_000, script: `
                await sleep(1500);
                ${tab('/Weekly activity/')}
                await sleep(1500);
                const tiles = $$('[title*=" — "]').map((t) => ({ day: t.title.split(' — ')[0], active: /— active/.test(t.title) }));
                return { tiles, count: text($$('span').find((s) => /^\\d+ active$/.test(s.innerText.trim()))),
                         careerNote: /Turn on Career Path/.test(document.body.innerText) };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.tiles, CALENDAR.slice(-7).map((d) => ({ day: d.day, active: d.active })), 'the last seven days of the streak calendar');
        assert.equal(result.count, '3 active', 'three days, as the 3-day streak says');
        assert.equal(result.careerNote, false);
    });
});
