/**
 * The dashboard on a phone.
 *
 * Headless Chrome will not open a window narrower than 500px, so that is the
 * narrowest real viewport these run at. It is below Tailwind's `sm` break, so
 * the mobile side of every responsive class is the one being exercised —
 * pinning the page in CSS instead would not move the media queries and would
 * quietly test the desktop layout in a narrow box.
 */
const PHONE = 500;      // the narrowest viewport headless Chrome will give
const DESKTOP = 1280;
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles, DEVICES } from './harness.js';
import { apiModule } from './fixtures.js';

const api = apiModule({
    '/user/courses': { courses: [], bundles: [] },
    '/user/settings': {},
    '/rewards/summary': { xp: 315, level: 3, streak: 4, badges: [] },
    '/user/available-courses': [],
    '/quizzes/global': { available: 6, categories: ['General'], questions: [{ questionId: 'q1', questionText: 'Which planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Saturn'], category: 'General', difficulty: 'easy' }] }
});

const course = (id, title, progress) => ({
    _id: id, title, description: 'A course about building things on the web, end to end.',
    thumbnail: '', price: 1499, progress, totalLessons: 24, completedLessons: Math.round(progress * 0.24),
    instructor: { name: 'A Teacher' }, category: 'Web Development', level: 'Beginner', duration: 12
});
const COURSES = [
    course('c1', 'Modern React from the Ground Up', 62),
    course('c2', 'JavaScript Fundamentals for Absolute Beginners', 100),
    course('c3', 'Node and Express APIs', 15)
];

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import { RewardsProvider } from '${srcFile('context/RewardsContext.jsx')}';
import Dashboard from '${srcFile('pages/Dashboard.jsx')}';
createRoot(document.getElementById('root')).render(
  <>
    <AuthContext.Provider value={{ user: { name: 'Bhagyashree' }, isGlobalQuizEnabled: true, isCreditSystemEnabled: true, isCareerPathEnabled: true, isJobsEnabled: true, isRewardsEnabled: true }}>
      <RewardsProvider>
        <MemoryRouter>
          <div className="p-4">
            <Dashboard courses={${JSON.stringify(COURSES)}} bundles={[]} availableCourses={[]} loading={false} error={null}
                       buyingCourseId={null} enrollCourse={() => {}} refresh={() => {}} weeklyActivity={<div />} />
          </div>
        </MemoryRouter>
      </RewardsProvider>
    </AuthContext.Provider>
  </>);`;

// The same section with one course to enrol in, and a stand-in for the
// Enrolled Courses page so the test can see where enrolling leads.
const enrollEntry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import { RewardsProvider } from '${srcFile('context/RewardsContext.jsx')}';
import Dashboard from '${srcFile('pages/Dashboard.jsx')}';
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { name: 'Bhagyashree' }, isGlobalQuizEnabled: true, isRewardsEnabled: true }}>
    <RewardsProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Dashboard courses={[]} bundles={[]} availableCourses={[{ _id: 'a1', title: 'SQL Essentials', price: 0 }]}
                   loading={false} error={null} buyingCourseId={null} enrollCourse={() => Promise.resolve()} refresh={() => {}} weeklyActivity={<div />} />} />
          <Route path="/enrolled-courses" element={<p id="enrolled-page">Enrolled Courses</p>} />
        </Routes>
      </MemoryRouter>
    </RewardsProvider>
  </AuthContext.Provider>);`;

/**
 * Anything whose content is wider than the box it was given, ignoring what
 * already deals with its own overflow — a truncated title, a card that clips
 * its decoration, an absolutely positioned flourish.
 */
const OVERFLOW = `
    const handled = (el) => {
        const st = getComputedStyle(el);
        return ['auto', 'scroll', 'hidden', 'clip'].includes(st.overflowX) || st.position === 'absolute';
    };
    const offenders = [...document.querySelectorAll('*')]
        .filter((el) => el.clientWidth > 4 && el.scrollWidth > el.clientWidth + 1 && !handled(el))
        .map((el) => el.tagName.toLowerCase() + '[' + String(el.className || '').split(' ').filter(Boolean).slice(0, 4).join(' ') + ']'
            + ' needs ' + el.scrollWidth + ' has ' + el.clientWidth);`;

describe('the dashboard on a phone', { skip: skipWithoutStyles }, () => {
    test('no tab runs off the side of the screen', async () => {
        const { result, errors } = await screen({
            entry, api, width: PHONE, styles: true, budget: 25_000, script: `
                await sleep(900);
                const labels = ['Available Courses', 'Completed', 'Bundles', 'Global Quiz', 'Weekly activity'];
                const out = {};
                for (const label of labels) {
                    const tab = $$('button').find((b) => b.innerText.trim().startsWith(label));
                    if (tab) tab.click();
                    await sleep(500);
                    ${OVERFLOW}
                    out[label] = offenders;
                }
                return { out, width: window.innerWidth };` });
        assert.deepEqual(errors, []);
        assert.equal(result.width, PHONE, 'the viewport really is phone-sized');
        for (const [label, offenders] of Object.entries(result.out)) {
            assert.deepEqual(offenders, [], `${label} does not fit: ${offenders.join(' | ')}`);
        }
    });

    test('the tabs are one scrolling line, not three wrapped ones', async () => {
        const { result, errors } = await screen({
            entry, api, width: PHONE, styles: true, script: `
                await sleep(900);
                const strip = $('[role="tablist"]');
                const tabs = $$('[role="tab"]');
                const tops = [...new Set(tabs.map((t) => Math.round(t.getBoundingClientRect().top)))];
                return {
                    rows: tops.length,
                    count: tabs.length,
                    names: tabs.map((t) => t.innerText.trim()),
                    scrollable: strip.scrollWidth > strip.clientWidth,
                    pageScrollsSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                    barHeight: strip.offsetHeight - strip.clientHeight,
                    moreRight: strip.parentElement.dataset.moreRight,
                    moreLeft: strip.parentElement.dataset.moreLeft
                };` });
        assert.deepEqual(errors, []);
        assert.equal(result.count, 5, 'all five tabs are there');
        assert.ok(!result.names.some((n) => /My Courses/.test(n)), `My Courses is not one of them: ${result.names.join(', ')}`);
        // In this order: Available Courses first, Bundles third. (Completed carries
        // a count when a course is finished, dropped here.)
        assert.deepEqual(result.names.map((n) => n.replace(/\s*\d+$/, '')),
            ['Available Courses', 'Completed', 'Bundles', 'Global Quiz', 'Weekly activity']);
        assert.equal(result.rows, 1, `they sit on one line, found ${result.rows}`);
        assert.equal(result.scrollable, true, 'and that line scrolls, since five do not fit a phone');
        assert.equal(result.pageScrollsSideways, false, 'the page itself stays put');
        assert.equal(result.barHeight, 0, 'no scrollbar is drawn under the tabs');
        assert.equal(result.moreRight, 'true', 'the right edge fades, to say there is more that way');
        assert.equal(result.moreLeft, 'false', 'and the left does not, since it starts at the start');
    });

    test('choosing a tab off the edge brings it into view', async () => {
        // The reason this strip used to wrap: a tab past the edge was a tab
        // nobody found. Scrolling is only acceptable if the chosen one comes
        // to the front. The strip scrolls smoothly, which takes real time, so
        // this runs on a real phone width in the device mode.
        const { result, errors } = await screen({
            entry, api, device: DEVICES.galaxyA55, styles: true, budget: 20_000, script: `
                await sleep(900);
                const strip = $('[role="tablist"]');
                const last = $$('[role="tab"]').find((t) => /Weekly activity/.test(t.innerText));
                const before = { left: Math.round(strip.scrollLeft),
                                 visible: last.getBoundingClientRect().right <= strip.getBoundingClientRect().right + 1 };
                last.click();
                await sleep(900);
                const s = strip.getBoundingClientRect(), l = last.getBoundingClientRect();
                return { before,
                         after: { left: Math.round(strip.scrollLeft),
                                  visible: l.left >= s.left - 1 && l.right <= s.right + 1 },
                         moreLeft: strip.parentElement.dataset.moreLeft,
                         moreRight: strip.parentElement.dataset.moreRight };` });
        assert.deepEqual(errors, []);
        assert.equal(result.before.visible, false, 'the last tab starts off the edge');
        assert.equal(result.after.visible, true, 'and choosing it scrolls it fully into view');
        assert.ok(result.after.left > result.before.left, 'the strip really moved');
        assert.equal(result.moreLeft, 'true', 'now the left edge fades instead');
        assert.equal(result.moreRight, 'false', 'and the right does not, at the end of the strip');
    });

    test('tapping a tab moves it to the front, and brings the next one into view', async () => {
        // On a real phone width. Tapping Completed used to leave it where it
        // was, second, with Bundles cut off under the right-hand fade until the
        // strip was swiped.
        const { result, errors } = await screen({
            entry, api, device: DEVICES.galaxyA55, styles: true, script: `
                await sleep(900);
                const strip = $('[role="tablist"]');
                const tab = (re) => $$('[role="tab"]').find((t) => re.test(t.innerText));
                const S = () => strip.getBoundingClientRect();
                const before = { completedAt: Math.round(tab(/Completed/).getBoundingClientRect().left - S().left),
                                 bundlesWhole: tab(/Bundles/).getBoundingClientRect().right <= S().right };
                tab(/Completed/).click();
                await sleep(900);
                const C = tab(/Completed/).getBoundingClientRect(), B = tab(/Bundles/).getBoundingClientRect();
                return { before, vw: innerWidth,
                         completedAt: Math.round(C.left - S().left),
                         pad: parseFloat(getComputedStyle(strip).scrollPaddingInlineStart),
                         bundlesWhole: B.left >= S().left && B.right <= S().right,
                         pageMoved: scrollX !== 0 || scrollY !== 0 };` });
        assert.deepEqual(errors, []);
        assert.equal(result.vw, 384, 'a real phone width');
        assert.equal(result.before.bundlesWhole, false, 'at first Bundles is cut off at the edge');
        assert.ok(result.before.completedAt > 100, 'and Completed sits second, behind Available Courses');
        assert.ok(Math.abs(result.completedAt - result.pad) <= 2,
            `after the tap Completed is at the front, just clear of the fade: ${result.completedAt}px in, the fade is ${result.pad}px`);
        assert.equal(result.bundlesWhole, true, 'and Bundles, after it, is now whole');
        assert.equal(result.pageMoved, false, 'only the strip scrolled, not the page');
    });

    test('there is no My Courses tab: the section opens on Available Courses, with no course list', async () => {
        // The student's enrolled courses have their own page, Enrolled
        // Courses; the Dashboard does not repeat them.
        const { result, errors } = await screen({
            entry, api, width: DESKTOP, styles: true, script: `
                await sleep(900);
                const selected = $$('[role="tab"]').find((t) => t.getAttribute('aria-selected') === 'true');
                const body = document.body.innerText;
                return { selected: selected && selected.innerText.trim(),
                         myCourses: /My Courses/.test(body),
                         continueCard: /Continue where you left off/.test(body),
                         courseListed: /Modern React from the Ground Up/.test(body),
                         xpPill: /315 XP/.test(body) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.selected, 'Available Courses', 'the first tab is the one open');
        assert.equal(result.myCourses, false, 'My Courses is nowhere on the section');
        assert.equal(result.continueCard, false, 'nor its Course progress card');
        assert.equal(result.courseListed, false, 'nor its list of enrolled courses');
        assert.equal(result.xpPill, false, 'and no XP pill beside the tabs (the summary says 315 XP)');
    });

    test('enrolling in an available course opens Enrolled Courses', async () => {
        // It used to switch to My Courses to show the new course. That list is
        // on Enrolled Courses now, so that is where the student is taken.
        const { result, errors } = await screen({
            entry: enrollEntry, api, width: DESKTOP, styles: true, script: `
                await sleep(900);
                $$('[role="tab"]').find((t) => /Available Courses/.test(t.innerText)).click();
                await sleep(300);
                $$('button').find((b) => /Enroll Now/.test(b.innerText)).click();
                await sleep(300);
                $$('button').find((b) => /Confirm Enroll/.test(b.innerText)).click();
                await sleep(600);
                return { landed: !!$('#enrolled-page') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.landed, true);
    });
    // "Hello, Bhagyashree!" broke into "Bhagyashre / e!" on a 360px phone: at
    // a fixed 30px the name was wider than the room beside the photo, and
    // break-words split it (2026-09-30). The banner alone, at real phone
    // widths, with a name that long and one longer still.
    for (const [w, first] of [[320, 'Bhagyashree'], [344, 'Bhagyashree'], [360, 'Bhagyashree'], [384, 'Bhagyashree'], [344, 'Bhagyalakshmi']]) {
        test(`"${first}!" stays whole on one line at ${w}px`, async () => {
            const banner = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import WelcomeBanner from '${srcFile('components/WelcomeBanner.jsx')}';
createRoot(document.getElementById('root')).render(<MemoryRouter><div className="bg-slate-50 p-4">
  <WelcomeBanner name="${first} Bangera" firstName="${first}" level={3} greeting="Good evening" greetingIcon="*" xpRemaining={260} percent={40} /></div></MemoryRouter>);`;
            const { result, errors } = await screen({
                entry: banner, api: 'export default {};', styles: true, budget: 15_000,
                device: { width: w, height: 800, dpr: 3 }, script: `
                    await sleep(500);
                    const name = $('h1 span');
                    // One top per line the name's letters are laid out on.
                    const range = document.createRange(); range.selectNodeContents(name);
                    const tops = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)));
                    return { lines: tops.size, sideways: document.documentElement.scrollWidth > innerWidth };` });
            assert.deepEqual(errors, []);
            assert.equal(result.lines, 1, `the name is split over ${result.lines} lines`);
            assert.equal(result.sideways, false, 'and nothing pushes the page sideways');
        });
    }
});
