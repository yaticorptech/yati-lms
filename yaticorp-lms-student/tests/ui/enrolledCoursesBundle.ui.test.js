/**
 * Enrolled Courses when things go wrong, and without bundles.
 *
 *   - A first load that fails says so, with Try again. It used to fall
 *     through to "Nothing enrolled yet", telling a student on a dropped
 *     connection that they had no courses.
 *   - No Bundles tab (bundles were taken off every dashboard, 2026-10-26):
 *     an old ?tab=bundles link opens My courses, where the server lists a
 *     course open through a bundle with the student's own.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, wrap, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

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

describe('Enrolled Courses: no bundles', { skip: skipWithoutChrome }, () => {
    test('an old ?tab=bundles link opens My courses, with no Bundles tab', async () => {
        const api = apiModule({
            '/user/courses/organization': { organization: null, courses: [] },
            '/user/courses': { courses: [{ _id: 'bc1', title: 'Course from a bundle', progress: 40 }], bundles: [] }
        });
        const { result, errors } = await screen({ entry: page(), api, script: `
            await sleep(700);
            return { body: text(document.body), tabs: $$('button').map(text).filter((t) => /My courses|Bundles|Organization/.test(t)) };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /Course from a bundle/);
        assert.ok(!result.tabs.some((t) => /Bundles/.test(t)), `tabs: ${result.tabs.join(', ')}`);
    });
});
