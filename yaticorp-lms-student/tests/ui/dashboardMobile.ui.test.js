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
import { screen, srcFile, skipWithoutStyles } from './harness.js';
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
                const labels = ['My Courses', 'Bundles', 'Completed', 'Available Courses', 'Global Quiz', 'Weekly activity'];
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

    test('the continue row keeps a readable title, instead of being crushed', async () => {
        const { result } = await screen({
            entry, api, width: PHONE, styles: true, script: `
                await sleep(900);
                const title = $$('p').find((p) => p.className.includes('truncate') && /Modern React/.test(p.innerText));
                return { box: title ? title.clientWidth : 0, text: title ? title.innerText.trim() : null };` });
        assert.equal(result.text, 'Modern React from the Ground Up');
        // It was 45px before, which showed about four characters.
        assert.ok(result.box >= 180, `the title column is only ${result.box}px wide`);
    });

    test('Continue takes its own full-width line on a phone', async () => {
        const { result } = await screen({
            entry, api, width: PHONE, styles: true, script: `
                await sleep(900);
                const link = $$('a').find((a) => /Continue/.test(a.innerText));
                const row = link.closest('li');
                return { link: link.getBoundingClientRect().width, row: row.clientWidth, sameLine: Math.abs(link.getBoundingClientRect().top - row.getBoundingClientRect().top) < 20 };` });
        assert.ok(result.link > result.row - 40, 'the button spans the row');
        assert.equal(result.sameLine, false, 'and sits below the title rather than beside it');
    });

    test('on a desktop it still sits beside the progress ring', async () => {
        const { result } = await screen({
            entry, api, width: DESKTOP, styles: true, script: `
                await sleep(900);
                const link = $$('a').find((a) => /Continue/.test(a.innerText));
                const row = link.closest('li');
                const rings = row.querySelectorAll('[role="img"]');
                return {
                    link: link.getBoundingClientRect().width, row: row.clientWidth,
                    ringVisible: rings.length > 0 && rings[0].getBoundingClientRect().width > 0,
                    sameLine: Math.abs(link.getBoundingClientRect().top - row.getBoundingClientRect().top) < 30
                };` });
        assert.ok(result.link < 200, 'the button is its own size, not the whole row');
        assert.ok(result.ringVisible, 'the ring is back');
        assert.equal(result.sameLine, true, 'everything on one line');
    });
});
