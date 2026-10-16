/**
 * The student layout's bell, menu drawer, Contact Support and page scroll.
 *
 *   - The phone's notification panel answers taps. Two bells are drawn (the
 *     phone's top bar and the desktop header) and they shared one ref, which
 *     pointed at the desktop copy — so a tap inside the phone's panel counted
 *     as outside it, the panel closed on mousedown, and its items and
 *     "Clear all" never got the click.
 *   - "Clear all" empties only the feeds the server really cleared.
 *   - Rewards notices (type 'reward') say "Rewards" and go where they point,
 *     the wallet by default — and come with Career Path switched off, when
 *     the rest of the career feed does not.
 *   - The feeds are not fetched again on every page change, and a closed
 *     (403) career feed is not asked again.
 *   - What has been seen is remembered per student, by time, not as one
 *     device-wide count.
 *   - Items are real buttons and say "Unread" to a screen reader; Escape
 *     closes the panel and gives the focus back to the bell.
 *   - The drawer and Contact Support are dialogs that behave as dialogs.
 *   - A new page starts at the top; the browser's back and a page's own
 *     address rewrites do not.
 *
 * No stylesheet: both headers are on the page at once here, the way both are
 * in the DOM on a phone (the desktop one hidden by CSS). The phone's bell is
 * the first, so "its panel works" is checked on it.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';

const now = Date.now();
// The bell shows only today's notices (the platform's day, IST unless the
// build says otherwise), so every fixture must fall on today whatever time the
// tests run: early in the morning the offsets are squeezed into the part of
// the day already gone, keeping their order.
const minutesIntoToday = (() => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(now));
    return Number(parts.find((p) => p.type === 'hour').value) * 60 + Number(parts.find((p) => p.type === 'minute').value);
})();
const squeeze = Math.min(1, Math.max(0.001, (minutesIntoToday - 1) / 700));
const ago = (mins) => new Date(now - mins * 60_000 * squeeze).toISOString();
// Before today began, for the notices the bell must leave out.
const yesterday = new Date(now - (minutesIntoToday + 120) * 60_000).toISOString();

const FEEDS = {
    '/user/announcements': [
        { _id: 'a1', title: 'Exams next week', message: 'Revise well.', createdAt: ago(30) },
        { _id: 'a2', title: 'Holiday on Friday', message: 'No classes.', createdAt: ago(300) }
    ],
    '/career/notifications': [
        { _id: 'r1', type: 'reward', title: 'Badge earned: Fast Learner', message: 'Five lessons in a day.', link: '/career/badges', isRead: false, createdAt: ago(5) },
        { _id: 'r2', type: 'reward', title: '+20 XP added to your wallet', message: 'Quiz passed.', isRead: false, createdAt: ago(10) },
        { _id: 'c1', type: 'system', title: 'New in Career Path: Planner', message: 'Plan your week.', link: '/career/planner', isRead: true, createdAt: ago(600) }
    ],
    '/jobs/notifications': [
        { _id: 'j1', title: '3 new React jobs', message: 'In Mangaluru.', link: '/jobs?skills=React', isRead: false, createdAt: ago(60) }
    ],
    '/user/profile': { user: { xp: 120, level: 2 } }
};

/** The API: answers from `routes`; `forbid` answers 403, `failDelete` makes a DELETE fail. */
const bellApi = ({ routes = FEEDS, forbid = [], failDelete = [] } = {}) => `
const routes = ${JSON.stringify(routes)};
const forbid = ${JSON.stringify(forbid)};
const failDelete = ${JSON.stringify(failDelete)};
const pick = (url) => { const key = Object.keys(routes).find((k) => url.includes(k)); return key ? routes[key] : {}; };
window.__calls = [];
export default {
  get: (url) => { window.__calls.push(['GET', url]);
    if (forbid.some((f) => url.includes(f))) return Promise.reject({ response: { status: 403, data: { message: 'Locked' } } });
    return Promise.resolve({ data: pick(url) }); },
  post: (url, body) => { window.__calls.push(['POST', url, body]); return Promise.resolve({ data: pick(url) }); },
  put: (url, body) => { window.__calls.push(['PUT', url, body]); return Promise.resolve({ data: {} }); },
  delete: (url) => { window.__calls.push(['DELETE', url]);
    if (failDelete.some((f) => url.includes(f))) return Promise.reject({ response: { status: 500, data: {} } });
    return Promise.resolve({ data: {} }); }
};`;

const USER = { _id: 'u1', name: 'Meera Active', email: 'meera@example.com', profilePicture: '/avatars/girls/3.jpg', cardNumber: 'YC-1' };

const entry = ({ career = true, jobs = true, before = '' } = {}) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import { RewardsContext } from '${srcFile('context/useRewards.js')}';
import StudentLayout from '${srcFile('layouts/StudentLayout.jsx')}';
${before}
const rewards = { enabled: false, summary: null, refresh: () => {}, celebrate: () => {}, pullEvents: () => {} };
function Probe() {
  const l = useLocation(); const nav = useNavigate(); window.__nav = nav;
  return (<div style={{ height: 3000 }}>
    <p id="where">{l.pathname}{l.search}{l.hash}</p>
    <Link id="to-community" to="/community">Community</Link>
  </div>);
}
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: ${JSON.stringify(USER)}, setUser: () => {}, logout: () => {}, isCreditSystemEnabled: true, isCareerPathEnabled: ${career}, isJobsEnabled: ${jobs}, isGlobalQuizEnabled: false }}>
    <RewardsContext.Provider value={rewards}>
      <MemoryRouter initialEntries={['/']}>
        <Routes><Route path="/" element={<StudentLayout />}><Route index element={<Probe />} /><Route path="*" element={<Probe />} /></Route></Routes>
      </MemoryRouter>
    </RewardsContext.Provider>
  </AuthContext.Provider>);`;

// A tap the way a phone delivers it: mousedown (the outside-click check
// runs here), a beat, then the click.
const TAP = `const tap = async (el) => { el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); await sleep(40); el.click(); await sleep(250); };`;
const OPEN_PHONE_BELL = `${TAP} await sleep(900); $$('button[data-bell]')[0].click(); await sleep(300); const panel = () => $('#notifications-mobile');`;
const gets = (part) => `window.__calls.filter((c) => c[0] === 'GET' && c[1].includes('${part}')).length`;

describe('the notification bell', { skip: skipWithoutChrome }, () => {
    test('on the phone, a tap on an item inside the panel opens it', async () => {
        const { result, errors } = await screen({
            entry: entry(), api: bellApi(), script: `${OPEN_PHONE_BELL}
                const item = [...panel().querySelectorAll('li button')].find((b) => /Badge earned/.test(b.innerText));
                await tap(item);
                return { where: text($('#where')), open: !!panel() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.where, '/career/badges', 'the badge notice goes where it points');
        assert.equal(result.open, false, 'and the panel closes behind it');
    });

    test('rewards notices say Rewards, and one without a link goes to the wallet', async () => {
        const { result, errors } = await screen({
            entry: entry(), api: bellApi(), script: `${OPEN_PHONE_BELL}
                const rows = [...panel().querySelectorAll('li')].map(text);
                const xp = [...panel().querySelectorAll('li button')].find((b) => /\\+20 XP/.test(b.innerText));
                await tap(xp);
                return { rows, where: text($('#where')) };` });
        assert.deepEqual(errors, []);
        assert.ok(result.rows.some((r) => /Badge earned.*Rewards ·/.test(r)), `rows: ${JSON.stringify(result.rows)}`);
        assert.ok(!result.rows.some((r) => /Badge earned.*Career ·/.test(r)), 'not labelled Career');
        assert.ok(result.rows.some((r) => /Exams next week.*Notice ·/.test(r)));
        assert.equal(result.where, '/#wallet');
    });

    test('Clear all, tapped on the phone, clears only the feeds the server cleared', async () => {
        const { result, errors } = await screen({
            entry: entry(), api: bellApi({ failDelete: ['/career/notifications'] }), script: `${OPEN_PHONE_BELL}
                const clear = [...panel().querySelectorAll('button')].find((b) => /Clear all/.test(b.innerText));
                await tap(clear);
                return {
                    rows: [...panel().querySelectorAll('li')].map(text),
                    alert: text(panel().querySelector('[role=alert]')),
                    asked: window.__calls.filter((c) => c[0] === 'DELETE' || (c[0] === 'POST' && c[1].includes('clear'))).map((c) => c[1])
                };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.asked.sort(), ['/career/notifications', '/jobs/notifications', '/user/announcements/clear']);
        assert.ok(result.rows.some((r) => /Badge earned/.test(r)), 'the career feed failed to clear, so its items stay');
        assert.ok(!result.rows.some((r) => /Exams next week|React jobs/.test(r)), 'the cleared feeds are emptied');
        assert.match(result.alert, /could not be cleared/);
    });

    test('items that lead somewhere are buttons, and unread ones say so to a screen reader', async () => {
        const { result, errors } = await screen({
            entry: entry(), api: bellApi(), script: `${OPEN_PHONE_BELL}
                const rows = [...panel().querySelectorAll('li')];
                const row = (re) => rows.find((li) => re.test(li.innerText));
                return {
                    jobIsButton: row(/React jobs/).firstElementChild.tagName,
                    noticeIsButton: row(/Exams next week/).firstElementChild.tagName,
                    unread: rows.filter((li) => li.querySelector('.sr-only') && /Unread/.test(li.querySelector('.sr-only').textContent)).length,
                    roleButtons: panel().querySelectorAll('[role=button]').length,
                    expanded: $$('button[data-bell]')[0].getAttribute('aria-expanded')
                };` });
        assert.deepEqual(errors, []);
        assert.equal(result.jobIsButton, 'BUTTON');
        assert.equal(result.noticeIsButton, 'DIV', 'an announcement leads nowhere, so it is not a button');
        // Unread: two announcements (never seen on this device), two rewards and the job alert.
        assert.equal(result.unread, 5);
        assert.equal(result.roleButtons, 0, 'no divs dressed up as buttons');
        assert.equal(result.expanded, 'true');
    });

    test('Escape closes the panel and gives the focus back to the bell', async () => {
        const { result } = await screen({
            entry: entry(), api: bellApi(), script: `${OPEN_PHONE_BELL}
                const was = !!panel();
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                await sleep(200);
                return { was, open: !!panel(), focus: document.activeElement && document.activeElement.hasAttribute('data-bell') };` });
        assert.equal(result.was, true);
        assert.equal(result.open, false);
        assert.equal(result.focus, true);
    });

    test('announcements are remembered per student, by time, and the old shared count is retired', async () => {
        const { result, errors } = await screen({
            entry: entry({ before: `localStorage.clear(); localStorage.setItem('notif_seen', '5');` }), api: bellApi(), script: `
                await sleep(900);
                const label = $$('button[data-bell]')[0].getAttribute('aria-label');
                return { label, legacy: localStorage.getItem('notif_seen'), mine: Number(localStorage.getItem('yati.notifSeenAt.u1')) };` });
        assert.deepEqual(errors, []);
        // The old count (5) covered both announcements: only the two rewards and the job alert are unread.
        assert.equal(result.label, 'Notifications, 3 unread');
        assert.equal(result.legacy, null, 'the device-wide count is dropped');
        assert.ok(result.mine > 0, 'this student starts from the newest announcement');
    });

    test('opening the bell marks this student\'s announcements seen, by time', async () => {
        const { result } = await screen({
            entry: entry({ before: `localStorage.clear();` }), api: bellApi(), script: `${OPEN_PHONE_BELL}
                const before = $$('button[data-bell]')[0].getAttribute('aria-label');
                $$('button[data-bell]')[0].click(); await sleep(400);
                return { before, after: $$('button[data-bell]')[0].getAttribute('aria-label'), mine: localStorage.getItem('yati.notifSeenAt.u1'),
                         reads: [...new Set(window.__calls.filter((c) => c[0] === 'PUT').map((c) => c[1]))].sort() };` });
        assert.equal(result.after, 'Notifications');
        assert.equal(Number(result.mine), Date.parse(FEEDS['/user/announcements'][0].createdAt), 'the newest announcement\'s time');
        assert.deepEqual(result.reads, ['/career/notifications/r1/read', '/career/notifications/r2/read', '/jobs/notifications/j1/read']);
    });

    test('the feeds are not fetched again on every page change', async () => {
        const { result, errors } = await screen({
            entry: entry(), api: bellApi(), script: `
                await sleep(900);
                const before = { ann: ${gets('/user/announcements')}, career: ${gets('/career/notifications')}, profile: ${gets('/user/profile')} };
                $('#to-community').click(); await sleep(300);
                window.__nav('/enrolled-courses'); await sleep(300);
                return { before, after: { ann: ${gets('/user/announcements')}, career: ${gets('/career/notifications')}, profile: ${gets('/user/profile')} }, summary: ${gets('/career/profile/summary')} };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.after, result.before, 'two page changes, no new requests');
        assert.equal(result.summary, 0, 'the Career Path summary is only asked for inside Career Path');
    });

    test('with Career Path off, a closed career feed is asked once, and only rewards notices from it are shown', async () => {
        const closed = await screen({
            entry: entry({ career: false }), api: bellApi({ forbid: ['/career/'] }), script: `${OPEN_PHONE_BELL}
                return { career: ${gets('/career/')}, profile: ${gets('/user/profile')}, rows: [...panel().querySelectorAll('li')].map(text) };` });
        assert.deepEqual(closed.errors, []);
        assert.equal(closed.result.career, 1, 'a 403 is not asked again when the bell opens');
        assert.equal(closed.result.profile, 0);
        assert.ok(closed.result.rows.some((r) => /Exams next week/.test(r)), 'announcements still come');

        const open = await screen({
            entry: entry({ career: false }), api: bellApi(), script: `${OPEN_PHONE_BELL}
                return { rows: [...panel().querySelectorAll('li')].map(text) };` });
        assert.ok(open.result.rows.some((r) => /Badge earned/.test(r)), 'rewards notices come with Career Path off');
        assert.ok(!open.result.rows.some((r) => /New in Career Path/.test(r)), 'Career Path\'s own notices do not');
    });

    test('only today\'s notifications are shown, and only they count in the red badge', async () => {
        // One of each kind from yesterday, unread, next to today's.
        const routes = {
            ...FEEDS,
            '/user/announcements': [...FEEDS['/user/announcements'], { _id: 'a0', title: 'Old notice from yesterday', message: 'Gone.', createdAt: yesterday }],
            '/career/notifications': [...FEEDS['/career/notifications'], { _id: 'r0', type: 'reward', title: 'Old badge from yesterday', message: 'Gone.', isRead: false, createdAt: yesterday }],
            '/jobs/notifications': [...FEEDS['/jobs/notifications'], { _id: 'j0', title: 'Old jobs from yesterday', message: 'Gone.', isRead: false, createdAt: yesterday }]
        };
        const { result, errors } = await screen({
            entry: entry(), api: bellApi({ routes }), script: `
                await sleep(900);
                const badge = $$('button[data-bell]')[0].getAttribute('aria-label');
                $$('button[data-bell]')[0].click(); await sleep(300);
                const panel = $('#notifications-mobile');
                return { badge, rows: [...panel.querySelectorAll('li')].map(text), head: text(panel) };` });
        assert.deepEqual(errors, []);
        assert.ok(!result.rows.some((r) => /yesterday/.test(r)), `nothing from yesterday: ${JSON.stringify(result.rows)}`);
        assert.ok(result.rows.some((r) => /Badge earned/.test(r)) && result.rows.some((r) => /Exams next week/.test(r)) && result.rows.some((r) => /React jobs/.test(r)), 'today\'s are all there');
        // Today: announcements a1, a2 (never seen), rewards r1, r2 and job j1 unread = 5; yesterday's three are not counted.
        assert.equal(result.badge, 'Notifications, 5 unread');
        assert.match(result.head, /5 new/);
    });

    test('with nothing from today, the panel says so', async () => {
        const routes = { ...FEEDS, '/user/announcements': [{ _id: 'a0', title: 'Old notice', message: 'Gone.', createdAt: yesterday }], '/career/notifications': [], '/jobs/notifications': [] };
        const { result } = await screen({
            entry: entry(), api: bellApi({ routes }), script: `${OPEN_PHONE_BELL}
                return { text: text(panel()), badge: $$('button[data-bell]')[0].getAttribute('aria-label') };` });
        assert.match(result.text, /Nothing new today/);
        assert.doesNotMatch(result.text, /Old notice/);
        assert.equal(result.badge, 'Notifications');
    });

    test('competition notices say Competitions and open the competition, with Career Path on or off', async () => {
        const routes = {
            ...FEEDS,
            '/career/notifications': [
                ...FEEDS['/career/notifications'],
                { _id: 'k1', type: 'competition', title: 'Matches drawn: Final', message: 'Team 0 plays Team 1.', link: '/competitions/cup1', isRead: false, createdAt: ago(2) },
                // One written before competition notices had a type of their own.
                { _id: 'k0', type: 'reward', title: '🏆 1st place!', message: 'Team 0 finished 1st.', link: '/competitions', isRead: false, createdAt: ago(3) }
            ]
        };
        for (const career of [true, false]) {
            const { result, errors } = await screen({
                entry: entry({ career }), api: bellApi({ routes }), script: `${OPEN_PHONE_BELL}
                    const rows = [...panel().querySelectorAll('li')].map(text);
                    const drawn = [...panel().querySelectorAll('li button')].find((b) => /Matches drawn/.test(b.innerText));
                    await tap(drawn);
                    return { rows, where: text($('#where')) };` });
            assert.deepEqual(errors, []);
            assert.ok(result.rows.some((r) => /Matches drawn.*Competitions ·/.test(r)), `career ${career}: ${JSON.stringify(result.rows)}`);
            assert.ok(result.rows.some((r) => /1st place.*Competitions ·/.test(r)), 'an older one, saved as a rewards notice, is labelled Competitions too');
            assert.equal(result.where, '/competitions/cup1', 'it opens the competition');
        }
    });

    test('with Jobs locked, Clear all does not ask the jobs feed', async () => {
        const { result } = await screen({
            entry: entry({ jobs: false }), api: bellApi(), script: `${OPEN_PHONE_BELL}
                const clear = [...panel().querySelectorAll('button')].find((b) => /Clear all/.test(b.innerText));
                await tap(clear);
                return { asked: window.__calls.filter((c) => c[0] === 'DELETE').map((c) => c[1]), jobsGets: ${gets('/jobs/')} };` });
        assert.deepEqual(result.asked, ['/career/notifications']);
        assert.equal(result.jobsGets, 0);
    });
});

describe('the menu drawer and Contact Support', { skip: skipWithoutChrome }, () => {
    test('the drawer takes the focus, closes on Escape and hands the focus back, and closes when the page changes', async () => {
        const { result, errors } = await screen({
            entry: entry(), api: bellApi(), script: `
                await sleep(800);
                const opener = $('button[aria-label="Open menu"]');
                opener.click(); await sleep(200);
                const drawer = () => $('#mobile-menu');
                const focusedIn = drawer() && drawer().contains(document.activeElement);
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await sleep(200);
                const closedByEscape = !drawer();
                const focusBack = document.activeElement === opener;
                opener.click(); await sleep(200);
                window.__nav('/community'); await sleep(250);
                return { focusedIn, closedByEscape, focusBack, closedByNav: !drawer(), expanded: opener.getAttribute('aria-expanded') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.focusedIn, true, 'the focus moves into the drawer');
        assert.equal(result.closedByEscape, true);
        assert.equal(result.focusBack, true, 'and back to the menu button');
        assert.equal(result.closedByNav, true, 'a page change closes it');
        assert.equal(result.expanded, 'false');
    });

    test('Contact Support is a named dialog with labelled fields, and says which page it was sent from', async () => {
        const { result, errors } = await screen({
            entry: entry(), api: bellApi(), script: `
                await sleep(800);
                window.__nav('/community'); await sleep(200);
                [...document.querySelectorAll('button')].find((b) => /Contact Support/.test(b.innerText)).click(); await sleep(200);
                const dialog = $('[role=dialog][aria-modal=true][aria-labelledby="contact-support-title"]');
                const labels = [...dialog.querySelectorAll('label')].map((l) => l.htmlFor);
                const subject = $('#contact-subject'); const message = $('#contact-message');
                const setValue = (el, v) => { const proto = Object.getPrototypeOf(el); Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
                setValue(subject, 'Video will not play'); setValue(message, 'Lesson 3 stops.');
                dialog.querySelector('form').requestSubmit(); await sleep(300);
                const sent = window.__calls.find((c) => c[0] === 'POST' && c[1] === '/tickets');
                return {
                    named: !!dialog, labels,
                    close: !!dialog.querySelector('button[aria-label="Close"]'), sent: sent && sent[2]
                };` });
        assert.deepEqual(errors, []);
        assert.equal(result.named, true);
        assert.deepEqual(result.labels, ['contact-subject', 'contact-message']);
        assert.equal(result.close, true, 'the X has a name');
        assert.equal(result.sent.page, 'dashboard', 'the ticket\'s page stays one of the values the server accepts');
        assert.equal(result.sent.path, '/community');
        assert.match(result.sent.message, /Lesson 3 stops\.\s+— Sent from \/community$/);
    });
});

describe('the page scroll', { skip: skipWithoutChrome }, () => {
    test('a new page starts at the top; the back button and a page\'s own address rewrites do not move it', async () => {
        const { result, errors } = await screen({
            entry: entry(), api: bellApi(), script: `
                await sleep(800);
                const main = $('main'); main.style.overflow = 'auto'; main.style.height = '600px';
                main.scrollTop = 900; await sleep(50);
                $('#to-community').click(); await sleep(200);
                const afterPush = main.scrollTop;
                main.scrollTop = 700; await sleep(50);
                window.__nav('/community?tab=x', { replace: true }); await sleep(200);
                const afterReplace = main.scrollTop;
                window.__nav(-1); await sleep(200);
                const afterBack = main.scrollTop;
                return { afterPush, afterReplace, afterBack };` });
        assert.deepEqual(errors, []);
        assert.equal(result.afterPush, 0, 'a link opens the new page at its top');
        assert.equal(result.afterReplace, 700, 'a page rewriting its own address stays where it is');
        assert.equal(result.afterBack, 700, 'back is left alone');
    });
});
