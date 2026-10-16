/**
 * Enrolled Courses when things go wrong, and its bundle popup.
 *
 *   - A first load that fails says so, with Try again. It used to fall
 *     through to "Nothing enrolled yet", telling a student on a dropped
 *     connection that they had no courses.
 *   - The bundle popup is a real dialog (named, modal, out at the end of the
 *     page), closes with Escape and its labelled ×, and reads each course's
 *     progress from the bundle itself: a course taken only through the bundle
 *     is not in My courses, and read 0% and "Start Course" however far along.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, wrap, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

const BUNDLE = {
    _id: 'b1', title: 'Full Stack Bundle', progress: 70,
    courses: [
        { _id: 'bc1', title: 'Finished through the bundle', progress: 100 },
        { _id: 'bc2', title: 'Half way through the bundle', progress: 40 },
        { _id: 'bc3', title: 'Not started yet', progress: 0 }
    ]
};
const page = () => wrap('pages/EnrolledCourses.jsx', 'EnrolledCourses', {
    route: '/enrolled-courses?tab=bundles', path: '/enrolled-courses', extraRoutes: '<Route path="/learn/:id" element={<p id="player">player</p>} />'
});

describe('Enrolled Courses: a failed load', { skip: skipWithoutChrome }, () => {
    test('says so, with Try again — not "Nothing enrolled yet" — and Try again loads the courses', async () => {
        const failingOnce = `
            window.__calls = []; let reads = 0;
            const reply = (data) => Promise.resolve({ data });
            export default {
              get: (url) => { window.__calls.push(['GET', url]);
                if (url.includes('/user/courses/organization')) return reply({ organization: null, courses: [] });
                reads += 1;
                if (reads === 1) return Promise.reject(Object.assign(new Error('Network Error'), { isAxiosError: true }));
                return reply({ courses: [{ _id: 'p1', title: 'Web Development Basics', progress: 10 }], bundles: [] }); },
              post: () => reply({}), put: () => reply({}), delete: () => reply({})
            };`;
        const entry = wrap('pages/EnrolledCourses.jsx', 'EnrolledCourses', { route: '/enrolled-courses', path: '/enrolled-courses' });
        const { result, errors } = await screen({ entry, api: failingOnce, script: `
            await sleep(700);
            const failed = text(document.body);
            const alert = text($('[role="alert"]'));
            const clicked = click(/Try again/);
            await sleep(700);
            return { failed, alert, clicked, after: text(document.body) };` });
        assert.deepEqual(errors, []);
        assert.match(result.alert, /could not be loaded/);
        assert.doesNotMatch(result.failed, /Nothing enrolled yet/);
        assert.equal(result.clicked, true);
        assert.match(result.after, /Web Development Basics/);
        assert.doesNotMatch(result.after, /could not be loaded/);
    });
});

describe('Enrolled Courses: the bundle popup', { skip: skipWithoutChrome }, () => {
    const api = apiModule({
        '/user/courses/organization': { organization: null, courses: [] },
        // Not enrolled in any of the bundle's courses: My courses is empty.
        '/user/courses': { courses: [], bundles: [BUNDLE] }
    });

    test('is a named, modal dialog at the end of the page, with each course\'s own progress', async () => {
        const { result, errors } = await screen({ entry: page(), api, script: `
            await sleep(700);
            click(/View Courses Inside/);
            await sleep(300);
            const dialog = $('[role="dialog"]');
            const name = dialog && document.getElementById(dialog.getAttribute('aria-labelledby'));
            const cards = $$('[role="dialog"] h3').map(text);
            const links = $$('[role="dialog"] a').map(text);
            return {
              modal: dialog && dialog.getAttribute('aria-modal'),
              name: text(name),
              outsideThePage: !!dialog && !document.getElementById('root').contains(dialog),
              close: ($$('[role="dialog"] button').find((b) => b.getAttribute('aria-label')) || {}).getAttribute?.('aria-label'),
              cards, links, body: text(dialog)
            };` });
        assert.deepEqual(errors, []);
        assert.equal(result.modal, 'true');
        assert.equal(result.name, 'Full Stack Bundle');
        assert.equal(result.outsideThePage, true, 'rendered through the Portal, outside #root');
        assert.equal(result.close, 'Close');
        assert.deepEqual(result.links, ['Review Course', 'Resume Course', 'Start Course']);
        assert.match(result.body, /100%/); assert.match(result.body, /40%/);
    });

    test('closes with Escape, and with its ×', async () => {
        const { result, errors } = await screen({ entry: page(), api, script: `
            await sleep(700);
            click(/View Courses Inside/); await sleep(200);
            const opened = !!$('[role="dialog"]');
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await sleep(200);
            const afterEscape = !!$('[role="dialog"]');
            click(/View Courses Inside/); await sleep(200);
            $('[role="dialog"] button[aria-label="Close"]').click(); await sleep(200);
            return { opened, afterEscape, afterClose: !!$('[role="dialog"]') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.opened, true);
        assert.equal(result.afterEscape, false);
        assert.equal(result.afterClose, false);
    });
});
