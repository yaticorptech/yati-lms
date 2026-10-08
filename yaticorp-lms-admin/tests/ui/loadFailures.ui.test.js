/**
 * What a page shows when the server does not answer: a failed load says it
 * failed and offers a Retry, instead of crashing or reading as an empty list,
 * and a refused action shows the server's reason.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';

const ORG = { _id: 'o1', name: 'Hillside College', orgCode: 'hc_2026_abc', typeLabel: 'College', email: 'a@hillside.edu', approvedAt: '2026-09-01T00:00:00.000Z', createdAt: '2026-08-01T00:00:00.000Z' };

// Every GET fails until window.__failGets runs out; then the given reply.
const failingApi = (okReply, failures = 99) => `
window.__calls = [];
window.__failGets = ${failures};
const refuse = (message) => Promise.reject(Object.assign(new Error(message), { response: { status: 500, data: { message } } }));
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url) => { window.__calls.push(['GET', url]);
    if (window.__failGets > 0) { window.__failGets -= 1; return refuse('Server error'); }
    return reply((${okReply})(url)); },
  put: (url) => { window.__calls.push(['PUT', url]); return refuse('Add at least one lesson before publishing.'); },
  post: () => reply({}), delete: () => reply({})
};`;

const page = (file, name, route, routePath = route) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '${srcFile('context/AuthContext.jsx')}';
import ${name} from '${srcFile(file)}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['${route}']}>
    <AuthProvider><Routes><Route path="${routePath}" element={<${name} />} /></Routes></AuthProvider>
  </MemoryRouter>);`;

describe('failed loads and refused actions', { skip: skipWithoutChrome }, () => {
    test('Organization Settings: a failed load shows an error and Retry, and Retry loads it', async () => {
        const { result, errors } = await screen({
            entry: page('pages/org/OrgSettings.jsx', 'OrgSettings', '/organization/settings'),
            api: failingApi(`() => ({ organization: ${JSON.stringify(ORG)} })`, 1),
            script: `
                await sleep(500);
                const failed = text(document.body);
                const retried = click(/^Retry$/); await sleep(500);
                return { failed, retried, after: text(document.body) };` });
        assert.deepEqual(errors, []);
        assert.match(result.failed, /Server error/);
        assert.match(result.failed, /Please try again/);
        assert.ok(result.retried, 'a Retry button is offered');
        assert.match(result.after, /hc_2026_abc/, 'Retry loads the organization');
    });

    test('Students: a failed load is not "no students yet"', async () => {
        const { result, errors } = await screen({
            entry: page('pages/org/OrgStudents.jsx', 'OrgStudents', '/organization/students'),
            api: failingApi('() => ({ students: [] })'),
            script: `await sleep(500); return { body: text(document.body), retry: !!find(/^Retry$/) };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /Unable to load your students\. Please try again\./);
        assert.doesNotMatch(result.body, /No students have joined/);
        assert.doesNotMatch(result.body, /0 students in your organization/);
        assert.ok(result.retry);
    });

    test('Organizations: a failed load is not "no organizations registered"', async () => {
        const { result, errors } = await screen({
            entry: page('pages/Organizations.jsx', 'Organizations', '/organizations'),
            api: failingApi('() => ({ organizations: [], totals: {}, types: [] })'),
            script: `await sleep(500); return { body: text(document.body), retry: !!find(/^Retry$/) };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /Unable to load organizations\. Please try again\./);
        assert.doesNotMatch(result.body, /No organizations have been registered yet/);
        assert.ok(result.retry);
    });

    test('Courses: a refused publish shows the server\'s reason', async () => {
        const course = { _id: 'c1', title: 'Campus Safety', isPublished: false, lessonsCount: 0, createdAt: '2026-09-01T00:00:00.000Z' };
        const { result, errors } = await screen({
            entry: page('pages/Courses.jsx', 'Courses', '/courses'),
            api: failingApi(`() => [${JSON.stringify(course)}]`, 0),
            script: `
                await sleep(500);
                $('button[aria-label="More actions for Campus Safety"]').click(); await sleep(150);
                click(/Publish/, '[role=menuitem]'); await sleep(300);
                return { body: text(document.body), put: window.__calls.find((c) => c[0] === 'PUT') };` });
        assert.deepEqual(errors, []);
        assert.ok(result.put, 'the publish was sent');
        assert.match(result.body, /Add at least one lesson before publishing\./);
    });

    test('a page that throws shows the error boundary, not a blank panel', async () => {
        const { result, errors } = await screen({
            api: 'export default {};',
            entry: `
import { createRoot } from 'react-dom/client';
import ErrorBoundary from '${srcFile('components/ErrorBoundary.jsx')}';
const Broken = () => { const organization = null; return <p>{organization.logo}</p>; };
createRoot(document.getElementById('root')).render(<ErrorBoundary resetKey="/a"><Broken /></ErrorBoundary>);`,
            script: `await sleep(300); return { body: text(document.body), reload: !!find(/Reload page/) };` });
        // React reports the caught error itself; the page must still render.
        assert.ok(errors.length <= 1, JSON.stringify(errors));
        assert.match(result.body, /Something went wrong on this page/);
        assert.ok(result.reload);
    });
});
