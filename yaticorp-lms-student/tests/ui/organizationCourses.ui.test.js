/**
 * The Organization tab on Enrolled Courses: every course the student's own
 * organization has published. A student who is not in an organization never
 * sees the tab; one who is can start a course in one click (it enrols them,
 * free) or resume one they are already taking.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, wrap, skipWithoutChrome, skipWithoutStyles, DEVICES } from './harness.js';
import { apiModule } from './fixtures.js';

const ORG = { _id: 'o1', name: 'St Agnes College', logo: null };
const ORG_COURSES = [
    { _id: 'c1', title: 'Campus Safety', description: 'Know your campus.', organizationId: 'o1', enrolled: true, progress: 40 },
    { _id: 'c2', title: 'Library Skills and Research Methods for First Years', description: '', organizationId: 'o1', enrolled: false, progress: 0 }
];
const api = (organization) => apiModule({
    // Listed first: the stub matches on "includes", and /user/courses would swallow it.
    '/user/courses/organization': organization ? { organization, courses: ORG_COURSES } : { organization: null, courses: [] },
    // The server's My courses includes the enrolled organization course; the page must leave it out.
    '/user/courses': { courses: [{ _id: 'p1', title: 'Web Development Basics', progress: 10 }, { ...ORG_COURSES[0] }], bundles: [] }
}, `(url) => ({ message: 'Enrolled successfully!' })`);
const page = (route) => wrap('pages/EnrolledCourses.jsx', 'EnrolledCourses', {
    route, path: '/enrolled-courses', extraRoutes: '<Route path="/learn/:id" element={<p id="player">player</p>} />'
});

describe('Enrolled Courses: organization courses', { skip: skipWithoutChrome }, () => {
    test('?tab=organization with no organization falls back to My courses, without crashing', async () => {
        const { result, errors } = await screen({ entry: page('/enrolled-courses?tab=organization'), api: api(null), script: `
            await sleep(700);
            return { pressed: text($('button[aria-pressed="true"]')), body: text(document.body) };` });
        assert.deepEqual(errors, []);
        assert.match(result.pressed, /My courses/);
        assert.match(result.body, /Web Development Basics/);
    });

    test('being removed from the organization during an auto-refresh does not crash the open tab', async () => {
        // The first read finds the organization; the refresh finds none.
        const removing = `
            window.__calls = []; let orgReads = 0;
            const reply = (data) => Promise.resolve({ data });
            export default {
              get: (url) => { window.__calls.push(['GET', url]);
                if (url.includes('/user/courses/organization')) {
                  orgReads += 1;
                  return reply(orgReads === 1 ? { organization: ${JSON.stringify(ORG)}, courses: ${JSON.stringify(ORG_COURSES)} } : { organization: null, courses: [] });
                }
                return reply({ courses: [{ _id: 'p1', title: 'Web Development Basics', progress: 10 }], bundles: [] }); },
              post: () => reply({}), put: () => reply({}), delete: () => reply({})
            };`;
        const { result, errors } = await screen({ entry: page('/enrolled-courses?tab=organization'), api: removing, script: `
            await sleep(700);
            const before = text(document.body);
            // The same refresh useAutoRefresh runs on its timer, started early.
            document.dispatchEvent(new Event('visibilitychange')); await sleep(500);
            return { before, pressed: text($('button[aria-pressed="true"]')), body: text(document.body), tabs: $$('button[aria-pressed]').length };` });
        assert.deepEqual(errors, []);
        assert.match(result.before, /St Agnes College/);
        assert.match(result.pressed, /My courses/);
        assert.equal(result.tabs, 2, 'the Organization tab is gone');
        assert.match(result.body, /Web Development Basics/);
    });

    test('no organization, no tab', async () => {
        const { result, errors } = await screen({ entry: page('/enrolled-courses'), api: api(null), script: `
            await sleep(600);
            return $$('button[aria-pressed]').map(text);` });
        assert.deepEqual(errors, []);
        assert.equal(result.length, 2);
        assert.ok(!result.some((t) => /Organization/.test(t)));
    });

    test("My courses keeps only the platform's courses; the organization's are in their own tab", async () => {
        const { result } = await screen({ entry: page('/enrolled-courses'), api: api(ORG), script: `
            await sleep(600);
            const mine = text($('.lms-stagger.grid'));
            const tabs = $$('button[aria-pressed]').map(text);
            find(/Organization/, 'button[aria-pressed]').click(); await sleep(300);
            return { tabs, mine, body: text(document.body) };` });
        assert.match(result.tabs[0], /My courses\s*1/);
        assert.match(result.tabs[2], /Organization\s*2/);
        assert.match(result.mine, /Web Development Basics/);
        assert.doesNotMatch(result.mine, /Campus Safety/, 'the organization course is not in My courses');
        assert.match(result.body, /St Agnes College/);
        assert.match(result.body, /Courses from your organization, only for its students/);
        assert.match(result.body, /Campus Safety/);
        assert.match(result.body, /Resume course/, 'the one they are taking resumes');
        assert.match(result.body, /Library Skills/);
    });

    test('the hero has no organization panel', async () => {
        const { result } = await screen({ entry: page('/enrolled-courses'), api: api(ORG), script: `
            await sleep(600);
            return { panel: !!$('button[aria-label^="Open courses from"]'), hero: text($('h1').closest('.relative')) };` });
        assert.equal(result.panel, false);
        assert.doesNotMatch(result.hero, /Your organization|St Agnes College/);
    });

    test('Start course enrols them and opens the player', async () => {
        const { result } = await screen({ entry: page('/enrolled-courses?tab=organization'), api: api(ORG), script: `
            await sleep(600);
            $$('button').find((b) => /Start course/.test(text(b))).click();
            await sleep(400);
            return { posts: window.__calls.filter((c) => c[0] === 'POST').map((c) => c[1]), player: !!$('#player') };` });
        assert.deepEqual(result.posts, ['/user/courses/c2/enroll']);
        assert.equal(result.player, true);
    });

    // At real phone widths through device mode: the 500px window is the
    // narrowest headless Chrome opens, and three tabs that fit there ran the
    // third one off the edge of a 360px phone.
    for (const [name, sizing] of [
        ['a 500px window', { width: 500 }],
        ['a 360px phone', { device: { width: 360, height: 780, dpr: 3, mobile: true } }],
        [`the narrowest phone (${DEVICES.galaxyZFold6Folded.width}px)`, { device: DEVICES.galaxyZFold6Folded }]
    ]) {
        test(`three tabs fit ${name}, and nothing spills sideways`, { skip: skipWithoutStyles }, async () => {
            const { result } = await screen({ entry: page('/enrolled-courses?tab=organization'), api: api(ORG), styles: true, ...sizing, script: `
                await sleep(800);
                const w = document.documentElement.clientWidth;
                const bar = $('button[aria-pressed]').parentElement.getBoundingClientRect();
                const tabs = $$('button[aria-pressed]').map((b) => ({ w: b.scrollWidth - b.clientWidth, right: b.getBoundingClientRect().right, label: text(b) }));
                return { overflow: document.documentElement.scrollWidth - w, barRight: bar.right, w, tabs, clipped: tabs.filter((t) => t.w > 0).length };` });
            assert.ok(result.overflow <= 0, 'page overflow ' + result.overflow);
            assert.ok(result.barRight <= result.w, `the bar ends at ${result.barRight} on a ${result.w}px screen`);
            assert.equal(result.clipped, 0, 'no tab label is cut off');
            assert.equal(result.tabs.length, 3);
            assert.ok(result.tabs.every((t) => t.right <= result.barRight + 0.5), 'every tab sits inside the bar: ' + JSON.stringify(result.tabs));
            assert.match(result.tabs[2].label, /Organization\s*2/);
        });
    }
});
