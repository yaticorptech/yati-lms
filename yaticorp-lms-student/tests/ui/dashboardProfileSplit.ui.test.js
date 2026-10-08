/**
 * The Dashboard and My Profile, split.
 *
 * The two were one page. They are two routes drawn by the same component
 * (pages/Profile.jsx, with a `view` prop), so what these tests guard is which
 * section lands where, that nothing was lost or doubled in the move, and that
 * each page still works on the data it always had:
 *
 *   Dashboard  — a welcome banner (photo, level, greeting, progress to the
 *                next level),
 *                Leaderboard, Wallet & Rewards, My Learning.
 *   My Profile — Personal Information (photo and its camera, Full Name,
 *                User ID, Email, Phone Number, Organization/College, Level,
 *                Edit Profile), Your Progress, My Certificates, Your Resume,
 *                Your Own AI Key.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles, DEVICES } from './harness.js';
import { apiModule } from './fixtures.js';

const PHONE = 500;      // the narrowest viewport headless Chrome will give
const DESKTOP = 1280;

// Figures a real account would return, so the tests can find them on screen
// and know they came from the API rather than from the page.
const api = apiModule({
    // The layout's notification bell reads these as lists.
    '/user/announcements': [], '/career/notifications': [], '/jobs/notifications': [],
    '/user/profile': { user: { level: 3, xp: 315 } },
    '/organizations/student/me': { member: true, organization: { name: 'Yaticorp', orgCode: 'YATI01' }, request: null },
    '/career/tasks/history': [],
    '/certificates': [{ _id: 'c1', courseId: { _id: 'k1', title: 'Modern React' }, issuedAt: '2026-09-01' }],
    '/user/courses': { courses: [{ _id: 'k1', title: 'Modern React', progress: 100 }], bundles: [] },
    '/user/available-courses': [],
    '/rewards/summary': {
        xp: 315, level: { level: 3 }, streak: { current: 4, longest: 6 }, badges: [],
        // The admin's level ladder: the banner's "XP to the next level" is read
        // against it, never against a table in the page.
        config: { levelThresholds: [0, 100, 300, 600, 1000, 1600, 2500, 3600, 4900, 6400] },
        stats: { lessons: { total: 12, thisWeek: 2 }, quizzes: { total: 3, passed: 3, thisWeek: 1 }, courses: { enrolled: 1, total: 1 }, xpThisWeek: 40 },
        series: {}
    },
    '/user/achievements': { achievements: [] },
    '/rewards/leaderboard': { entries: [], around: [], total: 0, me: null },
    '/rewards/wallet': {
        wallet: { available: 0, rewardPoints: 0, currency: 'INR', totalEarned: 0, totalSpent: 0 },
        rewardPointsValue: 0, monetaryEnabled: false, conversion: { pointsPerUnit: 100, unitValue: 10 }, limits: {}, recent: []
    }
});

const USER = { name: 'Bhagyashree Bangera', email: 'bhagya@example.com', phone: '9876543210', cardNumber: '2401 0001 9664', credits: 5 };

const page = (view) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import { RewardsProvider } from '${srcFile('context/RewardsContext.jsx')}';
import Profile from '${srcFile('pages/Profile.jsx')}';
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: ${JSON.stringify(USER)}, setUser: () => {}, isCareerPathEnabled: true, isGlobalQuizEnabled: true, isRewardsEnabled: true, isJobsEnabled: true }}>
    <RewardsProvider><MemoryRouter><Profile ${view ? `view="${view}"` : ''} /></MemoryRouter></RewardsProvider>
  </AuthContext.Provider>);`;

// Which of the nine sections are on screen. Each is found by words only it
// uses, so one section cannot stand in for another.
const SECTIONS = `
  const body = document.body.innerText;
  const has = (re) => re.test(body);
  const sections = {
    welcome: has(/Hello, Bhagyashree!/),
    personalInfo: has(/Personal Information/),
    leaderboard: has(/Leaderboard/),
    wallet: has(/Wallet/),
    myLearning: has(/Available Courses/) && has(/Weekly activity/i),
    resume: has(/Your Resume/),
    aiKey: has(/Your own AI key/i),
    progress: has(/Your Progress/),
    certificates: has(/My Certificates/)
  };`;

const BOTH = [];
const DASHBOARD_ONLY = ['welcome', 'leaderboard', 'wallet', 'myLearning'];
const PROFILE_ONLY = ['personalInfo', 'progress', 'certificates', 'resume', 'aiKey'];

describe('the Dashboard and My Profile', { skip: skipWithoutStyles }, () => {
    test('the Dashboard has its sections, and none of My Profile\'s', async () => {
        const { result, errors } = await screen({
            entry: page(), api, styles: true, width: DESKTOP, budget: 20_000,
            script: `await sleep(1500); ${SECTIONS} return { sections };` });
        assert.deepEqual(errors, []);
        for (const s of [...BOTH, ...DASHBOARD_ONLY]) assert.equal(result.sections[s], true, `the Dashboard shows ${s}`);
        for (const s of PROFILE_ONLY) assert.equal(result.sections[s], false, `the Dashboard no longer shows ${s}`);
    });

    test('My Profile has its sections, and none of the Dashboard\'s', async () => {
        const { result, errors } = await screen({
            entry: page('profile'), api, styles: true, width: DESKTOP, budget: 20_000,
            script: `await sleep(1500); ${SECTIONS} return { sections };` });
        assert.deepEqual(errors, []);
        for (const s of [...BOTH, ...PROFILE_ONLY]) assert.equal(result.sections[s], true, `My Profile shows ${s}`);
        for (const s of DASHBOARD_ONLY) assert.equal(result.sections[s], false, `My Profile does not repeat ${s}`);
    });

    // What each page's opening card holds. The details and the ways to change
    // them are My Profile's; the Dashboard greets without repeating them.
    const CARD = `
        await sleep(1500);
        const c = $('[data-welcome]') || $('[data-personal-info]'); const t = c.innerText;
        return {
            greeting: /Good (morning|afternoon|evening)/.test(t) && /Hello, Bhagyashree!/.test(t),
            level: /Lv 3/i.test(t),   // styled uppercase, so innerText reads "LV 3"
            card: t.includes('2401 0001 9664'), email: t.includes('bhagya@example.com'), phone: t.includes('9876543210'),
            edit: Array.from(c.querySelectorAll('button')).some((b) => /Edit Profile/.test(b.innerText)),
            camera: !!c.querySelector('button[aria-label="Change photo or avatar"]'),
            photo: (c.querySelector('[data-photo]') || c.querySelector('button img, button span')).offsetWidth,
            height: Math.round(c.getBoundingClientRect().height)
        };`;

    test('the Dashboard opens with a welcome banner, without the account details', async () => {
        const { result, errors } = await screen({ entry: page(), api, styles: true, width: DESKTOP, budget: 20_000, script: CARD });
        assert.deepEqual(errors, []);
        assert.equal(result.greeting, true, 'it greets the student by name');
        assert.equal(result.level, true, 'with their level on the photo');
        for (const k of ['card', 'email', 'phone', 'edit', 'camera']) {
            assert.equal(result[k], false, `and leaves ${k} to My Profile`);
        }
    });

    test('the banner names the level the student is at, and how far through it they are', async () => {
        // Hari's real standing: Level 3, 590 XP. Level 4 begins at 600, so 10
        // to go, and 290 of the level's 300 done — 97%. It used to read
        // "10 XP to reach Level 4", which named only the next level and was
        // taken for the one he was on; Level 4 must not appear at all.
        const hari = api.replace('"level":3,"xp":315', '"level":3,"xp":590');
        const { result, errors } = await screen({
            entry: page(), api: hari, styles: true, width: DESKTOP, budget: 20_000, script: `
                await sleep(1500);
                const b = $('[data-welcome]');
                const bar = b.querySelector('[role="progressbar"]');
                const link = bar.closest('a');
                return { text: b.innerText.replace(/\\s+/g, ' '), now: bar.getAttribute('aria-valuenow'),
                         fill: bar.firstElementChild.style.width, href: link && link.getAttribute('href'),
                         level4Anywhere: /Level 4|Lv 4/i.test(document.body.innerText) };` });
        assert.deepEqual(errors, []);
        assert.match(result.text, /Level 3 · 10 XP to the next level/);
        assert.equal(result.level4Anywhere, false, 'the Dashboard never says Level 4 for a Level 3 student');
        assert.equal(result.now, '97', 'the bar says 97% through Level 3');
        assert.equal(result.fill, '97%', 'and is drawn at 97%');
        assert.equal(result.href, '/career', 'it opens Career Path, where XP and levels are earned');
    });

    test('the banner sits side by side on a wide screen, and stacks when narrower', async () => {
        // The Dashboard's real width is the window less the 280px sidebar and
        // the page's padding, so the banner is measured in a box that size.
        const at = async (v) => (await screen({
            entry: page().replace('<Profile  />', `<div style={{ width: ${v - 344} }}><Profile /></div>`),
            api, styles: true, width: v, budget: 20_000, script: `
                await sleep(1500);
                const b = $('[data-welcome]'); const B = b.getBoundingClientRect();
                const T = b.querySelector('h1').parentElement.getBoundingClientRect();
                const P = b.querySelector('[role="progressbar"]').closest('a, div.rounded-2xl').getBoundingClientRect();
                const art = b.querySelector('svg');
                return { beside: P.left >= T.right && Math.abs(P.top - T.top) < 60,
                         below: P.top >= T.bottom,
                         overlap: !(P.left >= T.right || P.top >= T.bottom),
                         inside: P.right <= B.right && P.left >= B.left,
                         art: getComputedStyle(art).display !== 'none' };` })).result;
        const laptop = await at(1512);
        assert.equal(laptop.beside, true, 'on a 1512px laptop the progress sits beside the greeting');
        assert.equal(laptop.art, true, 'with the desk picture on the right');
        assert.equal(laptop.overlap, false, 'and nothing overlaps');
        const small = await at(1024);
        assert.equal(small.below, true, 'at 1024px it moves under the greeting rather than squeezing in');
        assert.equal(small.art, false, 'and the picture steps aside');
        assert.equal(small.inside, true, 'still inside the card');
    });

    test('on a phone, Edit Profile goes under the heading, so the heading keeps its line', async () => {
        // Beside the heading on a 344px phone it squeezed "Personal Information"
        // onto two lines and "Manage your profile information" onto three.
        const HEAD = `
            await sleep(1500);
            const c = $('[data-personal-info]'), h = $('#personal-info-title'), sub = h.nextElementSibling;
            const btn = [...c.querySelectorAll('button')].find((b) => /Edit Profile/.test(b.innerText));
            const lines = (el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
            const H = h.getBoundingClientRect(), B = btn.getBoundingClientRect();
            return { title: lines(h), sub: lines(sub), below: B.top >= H.bottom, beside: B.left > H.right,
                     fullWidth: B.width >= c.querySelector('#personal-info-title').closest('div.flex-wrap').clientWidth - 64 };`;
        const phone = await screen({ entry: page('profile'), api, styles: true, device: DEVICES.galaxyZFold6Folded, budget: 20_000, script: HEAD });
        assert.deepEqual(phone.errors, []);
        assert.equal(phone.result.title, 1, '"Personal Information" on one line');
        assert.equal(phone.result.sub, 1, 'and "Manage your profile information" on one line');
        assert.equal(phone.result.below, true, 'Edit Profile under them');
        assert.equal(phone.result.fullWidth, true, 'as a full-width button');
        const desk = await screen({ entry: page('profile'), api, styles: true, width: DESKTOP, budget: 20_000, script: HEAD });
        assert.equal(desk.result.beside, true, 'on a desktop it is back beside the heading');
        assert.equal(desk.result.fullWidth, false, 'at its own size');
    });

    test('My Profile opens with Personal Information: each detail under its label', async () => {
        const { result, errors } = await screen({
            entry: page('profile'), api, styles: true, width: DESKTOP, budget: 20_000, script: `
                await sleep(1500);
                const c = $('[data-personal-info]');
                const pairs = {};
                c.querySelectorAll('dl > div').forEach((d) => { pairs[d.querySelector('dt').innerText.trim()] = d.querySelector('dd').innerText.trim(); });
                return { heading: c.querySelector('h2').innerText.trim(), pairs,
                         edit: Array.from(c.querySelectorAll('button')).some((b) => /Edit Profile/.test(b.innerText)),
                         camera: !!c.querySelector('button[aria-label="Change photo or avatar"]'),
                         greeting: /Hello,|Good (morning|afternoon|evening)/.test(c.innerText) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.heading, 'Personal Information');
        assert.deepEqual(result.pairs, {
            'Full Name': 'Bhagyashree Bangera',
            'User ID': '2401 0001 9664',
            'Email': 'bhagya@example.com',
            'Phone Number': '9876543210',
            'Organization/College': 'Yaticorp',
            'Level': 'Level 3'
        }, 'each detail, from the account and the API');
        assert.equal(result.edit, true, 'with Edit Profile');
        assert.equal(result.camera, true, 'and the camera to change the photo');
        assert.equal(result.greeting, false, 'the greeting is the Dashboard\'s, not repeated here');
    });

    test('each detail is its own tile with its own icon, under a heading that says what the card is for', async () => {
        const { result, errors } = await screen({
            entry: page('profile'), api, styles: true, width: DESKTOP, budget: 20_000, script: `
                await sleep(1500);
                const c = $('[data-personal-info]');
                const tiles = [...c.querySelectorAll('dl > div')];
                const beside = c.querySelector('dl').previousElementSibling;
                return { subtitle: /Manage your profile information/.test(c.innerText),
                         photoColumn: beside.innerText.replace(/\\s+/g, ' ').trim(),
                         tiles: tiles.length,
                         icons: tiles.filter((t) => t.querySelector('svg')).length,
                         separate: tiles.every((t) => getComputedStyle(t).borderTopWidth !== '0px') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.subtitle, true, 'the subtitle under Personal Information');
        // This student has no photo, so the circle shows their initials, BB.
        assert.match(result.photoColumn, /^Level 3 BB Bhagyashree Bangera Learning to grow every day/,
            'beside the tiles: the level, the photo, then the name and the line under it');
        assert.equal(result.tiles, 6, 'six details');
        assert.equal(result.icons, 6, 'each with an icon');
        assert.equal(result.separate, true, 'each drawn as its own tile');
    });

    test('the laid-out order: Name, ID, Email down the left; Phone, Organization, Level down the right', async () => {
        const { result, errors } = await screen({
            entry: page('profile'), api, styles: true, width: DESKTOP, budget: 20_000, script: `
                await sleep(1500);
                const at = {};
                $('[data-personal-info]').querySelectorAll('dl > div').forEach((d) => {
                    const r = d.getBoundingClientRect(); at[d.querySelector('dt').innerText.trim()] = { x: Math.round(r.left), y: Math.round(r.top) };
                });
                return at;` });
        assert.deepEqual(errors, []);
        const left = ['Full Name', 'User ID', 'Email'], right = ['Phone Number', 'Organization/College', 'Level'];
        for (const col of [left, right]) {
            assert.equal(new Set(col.map((k) => result[k].x)).size, 1, `${col.join(', ')} share one column`);
            assert.ok(result[col[0]].y < result[col[1]].y && result[col[1]].y < result[col[2]].y, `${col.join(', ')} run top to bottom`);
        }
        assert.ok(result['Phone Number'].x > result['Full Name'].x, 'the second column is to the right');
        for (let i = 0; i < 3; i++) assert.equal(result[left[i]].y, result[right[i]].y, `${left[i]} and ${right[i]} share a row`);
    });

    test('the organization is still the way to link one: it opens the existing popup', async () => {
        const { result, errors } = await screen({
            entry: page('profile'), api, styles: true, width: DESKTOP, budget: 20_000, script: `
                await sleep(1500);
                const org = $$('[data-personal-info] dd button').find((b) => /Yaticorp/.test(b.innerText));
                org.click(); await sleep(300);
                return { opened: !!$('[aria-labelledby="organization-popup-title"]') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.opened, true);
    });

    test('on My Profile, Edit Profile opens the existing form, filled in', async () => {
        const { result, errors } = await screen({
            entry: page('profile'), api, styles: true, width: DESKTOP, budget: 20_000, script: `
                await sleep(1500);
                click(/Edit Profile/); await sleep(300);
                return { name: !!$$('input').find((i) => i.value === 'Bhagyashree Bangera'),
                         email: !!$$('input').find((i) => i.value === 'bhagya@example.com'),
                         cardLocked: !!$$('input[readonly]').find((i) => i.value === '2401 0001 9664') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.name, true, 'with the name');
        assert.equal(result.email, true, 'and the email');
        assert.equal(result.cardLocked, true, 'and the card number still read-only');
    });

    test('Your Progress shows the six figures, from the API', async () => {
        const { result, errors } = await screen({
            entry: page('profile'), api, styles: true, width: DESKTOP, budget: 20_000, script: `
                await sleep(1500);
                const t = document.body.innerText;
                return {
                    labels: ['Courses Enrolled', 'Lessons Completed', 'Quizzes Passed', 'XP Earned', 'Current Streak', 'Overall Progress'].filter((l) => t.includes(l)),
                    asked: window.__calls.map((c) => c[1]),
                    lessonsThisWeek: /\\+2 this week/.test(t),
                    xpThisWeek: /\\+40 this week · Level 3/.test(t),
                    bestStreak: /Best: 6 days/.test(t)
                };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.labels, ['Courses Enrolled', 'Lessons Completed', 'Quizzes Passed', 'XP Earned', 'Current Streak', 'Overall Progress']);
        assert.ok(result.asked.some((u) => u.includes('/rewards/summary')), 'the figures are fetched, not written into the page');
        // The big numbers count up on animation frames, which a headless
        // browser does not run reliably (see hooks/useCountUp.js), so the
        // source is proved with the figures beside them that do not animate —
        // each one only the server's response could have put there.
        assert.equal(result.lessonsThisWeek, true, 'lessons this week is the 2 the server sent');
        assert.equal(result.xpThisWeek, true, 'XP this week and the level are its 40 and 3');
        assert.equal(result.bestStreak, true, 'and the best streak is its 6');
    });

    test('My Certificates lists what the server has, and Upload Certificate opens the form', async () => {
        const { result, errors } = await screen({
            entry: page('profile'), api, styles: true, width: DESKTOP, budget: 20_000, script: `
                await sleep(1500);
                // Each certificate is drawn as a framed picture, with its title
                // in the tooltip rather than on the page.
                const listed = $$('article').some((a) => (a.title || '').startsWith('Modern React'));
                click(/Upload Certificate/); await sleep(300);
                return { listed, form: !!$('#cert-title'), fileInput: !!$('input[type="file"]'),
                         asked: window.__calls.map((c) => c[1]) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.listed, true, 'the certificate the server returned is listed');
        assert.ok(result.asked.includes('/certificates'), 'from the existing certificates endpoint');
        assert.equal(result.form, true, 'Upload Certificate opens the existing form');
        assert.equal(result.fileInput, true, 'with its file chooser');
    });

    for (const [name, view] of [['Dashboard', ''], ['My Profile', 'profile']]) {
        test(`${name} fits a phone without scrolling sideways`, async () => {
            const { result, errors } = await screen({
                entry: page(view), api, styles: true, width: PHONE, budget: 20_000, script: `
                    await sleep(1500);
                    return { width: window.innerWidth,
                             overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };` });
            assert.deepEqual(errors, []);
            assert.equal(result.width, PHONE, 'the viewport really is phone-sized');
            assert.ok(result.overflow <= 0, `nothing sticks out sideways, had ${result.overflow}px`);
        });
    }
});

describe('the navigation', { skip: skipWithoutStyles }, () => {
    const layout = (at) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import { RewardsContext } from '${srcFile('context/useRewards.js')}';
import StudentLayout from '${srcFile('layouts/StudentLayout.jsx')}';
const Where = () => <p id="where">{useLocation().pathname}</p>;
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: ${JSON.stringify(USER)}, isCreditSystemEnabled: true, isCareerPathEnabled: true, isJobsEnabled: true }}>
    <RewardsContext.Provider value={{ enabled: false, summary: null }}>
      <MemoryRouter initialEntries={['${at}']}>
        <Routes><Route path="/" element={<StudentLayout />}>
          <Route index element={<Where />} /><Route path="profile" element={<Where />} />
        </Route></Routes>
      </MemoryRouter>
    </RewardsContext.Provider>
  </AuthContext.Provider>);`;

    test('the sidebar opens with Dashboard, and My Profile sits at the foot beside Contact Support', async () => {
        const { result, errors } = await screen({
            entry: layout('/'), api, styles: true, width: DESKTOP, script: `
                await sleep(600);
                const aside = $('aside');
                const first = aside.querySelector('nav a');
                const mine = [...aside.querySelectorAll('a')].find((a) => a.getAttribute('aria-label') === 'My Profile');
                const inNav = !!mine && !!mine.closest('nav');
                const footer = mine && mine.parentElement;
                const support = footer && [...footer.querySelectorAll('button')].some((b) => b.innerText.includes('Contact Support'));
                mine.click();
                await sleep(300);
                return { first: first.innerText.trim(), href: mine.getAttribute('href'), inNav, support,
                         now: text($('#where')),
                         lit: [...$('aside').querySelectorAll('a')].find((a) => a.getAttribute('aria-label') === 'My Profile').className.includes('bg-indigo-600') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.first, 'Dashboard', 'the menu opens with Dashboard');
        assert.equal(result.href, '/profile');
        assert.equal(result.inNav, false, 'My Profile is not in the menu list');
        assert.equal(result.support, true, 'it sits in the footer with Contact Support');
        assert.equal(result.now, '/profile', 'and clicking it opens My Profile');
        assert.equal(result.lit, true, 'which it then shows as the current page');
    });

    test('the header menu\'s My Profile goes to /profile, not back to the Dashboard', async () => {
        // It pointed at "/" while the two pages were one.
        const { result, errors } = await screen({
            entry: layout('/'), api, styles: true, width: DESKTOP, script: `
                await sleep(600);
                const menuLinks = () => $$('a').filter((a) => a.innerText.trim() === 'My Profile').map((a) => a.getAttribute('href'));
                const before = menuLinks().length;
                const opener = $$('button').find((b) => b.innerText.includes('Bhagyashree'));
                if (opener) opener.click();
                await sleep(300);
                return { hrefs: menuLinks(), opened: menuLinks().length > before };` });
        assert.deepEqual(errors, []);
        assert.equal(result.opened, true, 'the header menu opens with a My Profile entry');
        assert.ok(result.hrefs.every((h) => h === '/profile'), `every My Profile link goes to /profile, found ${result.hrefs}`);
    });
});

describe('uploading a certificate', { skip: skipWithoutStyles }, () => {
    // The whole flow runs on the frame alone. On the full My Profile page,
    // choosing a file under headless Chrome's virtual clock stalls it — the
    // page also runs the progress card's count-up animation, whose loop does
    // not settle there (see hooks/useCountUp.js). The frame is mounted on My
    // Profile unchanged, with the same props, so this is the same upload.
    const uploadApi = apiModule({ '/user/achievements': { achievements: [] } },
        `(url, body) => url === '/user/achievements'
            ? { achievement: { id: 'a9', title: body.get('title'), fileType: 'pdf', fileUrl: 'https://files.example/a9.pdf' } }
            : {}`);
    const frame = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import CertificatesFrame from '${srcFile('components/CertificatesFrame.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter><CertificatesFrame certificates={[]} loading={false} certError={null} downloadingId={null} onDownload={() => {}} /></MemoryRouter>);`;

    test('choosing a file and submitting posts it, and it joins the frame', async () => {
        const { result, errors } = await screen({
            entry: frame, api: uploadApi, styles: true, width: DESKTOP, budget: 20_000,
            // After an upload the page also files a copy in Google Drive, over
            // a real network call. Stood in for: this tests the upload.
            modules: { 'integrations/google/saveToDrive': 'export default () => Promise.resolve(null);' },
            script: `
                await sleep(600);
                click(/Upload Certificate/); await sleep(300);
                // A file chooser cannot be driven headless, so the file is
                // handed to the input's own change handler, as a choice would.
                const input = $('input[type="file"]');
                const key = Object.keys(input).find((k) => k.startsWith('__reactProps'));
                input[key].onChange({ target: { files: [new File(['%PDF-1.4'], 'science-fair.pdf', { type: 'application/pdf' })] } });
                await sleep(300);
                const autoTitle = $('#cert-title').value;
                const setVal = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
                setVal($('#cert-title'), 'State Science Fair — 1st place');
                await sleep(100);
                $('button[type="submit"]').click();
                await sleep(600);
                const posted = window.__calls.filter((c) => c[0] === 'POST' && c[1] === '/user/achievements');
                const sent = posted[0] && posted[0][2];
                return { autoTitle, posted: posted.length,
                         title: sent && sent.get('title'), file: sent && sent.get('file') && sent.get('file').name,
                         formClosed: !$('#cert-title'),
                         shown: $$('article').some((a) => (a.title || '').startsWith('State Science Fair — 1st place')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.autoTitle, 'science fair', 'choosing the file suggests a title from its name');
        assert.equal(result.posted, 1, 'submitting posts to the existing endpoint, once');
        assert.equal(result.title, 'State Science Fair — 1st place', 'with the title');
        assert.equal(result.file, 'science-fair.pdf', 'and the file');
        assert.equal(result.formClosed, true, 'the form closes');
        assert.equal(result.shown, true, 'and the new certificate is in the frame');
    });
});
