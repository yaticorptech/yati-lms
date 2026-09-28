/**
 * An organization's own courses in the admin app: the super admin's Course
 * access card, and the organization admin's Courses page — which is the
 * platform's course list, builder and lesson editor, pointed at the
 * organization's own endpoints.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, wrap, skipWithoutChrome } from './harness.js';

/* ── The organization admin's Courses page ─────────────────────────────── */

const COURSES = [
    { _id: '71001', title: 'Campus Safety', description: 'x', isPublished: true, price: 0, lessonsCount: 3, createdAt: '2026-09-20T00:00:00.000Z' },
    { _id: '71002', title: 'Library Skills', description: 'x', isPublished: false, price: 0, lessonsCount: 1, createdAt: '2026-09-21T00:00:00.000Z' }
];
const orgApi = (access) => `
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url) => { window.__calls.push(['GET', url]);
    if (url.endsWith('/course-access')) return reply(${JSON.stringify(access)});
    return reply(${JSON.stringify(COURSES)}); },
  post: (url, body) => { window.__calls.push(['POST', url, body]); return reply({ ...body, _id: '71003' }); },
  put: (url, body) => { window.__calls.push(['PUT', url, body]); return reply(body); },
  delete: (url) => { window.__calls.push(['DELETE', url]); return reply({}); }
};`;
const orgEntry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Courses from '${srcFile('pages/Courses.jsx')}';
import { CourseScope, ORGANIZATION_SCOPE } from '${srcFile('utils/courseScope.js')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/organization/courses']}>
    <CourseScope.Provider value={ORGANIZATION_SCOPE}>
      <Routes>
        <Route path="/organization/courses" element={<Courses />} />
        <Route path="/organization/courses/:id" element={<p id="builder">builder</p>} />
      </Routes>
    </CourseScope.Provider>
  </MemoryRouter>);`;

describe("the organization's Courses page", { skip: skipWithoutChrome }, () => {
    test('while courses are off it says so, and lists nothing', async () => {
        const { result, errors } = await screen({ entry: orgEntry, api: orgApi({ enabled: false, limit: 5, used: 0, hasLogo: true }), script: `
            await sleep(700);
            return { body: text(document.body), calls: window.__calls.map((c) => c[1]) };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /Courses are not switched on yet/);
        assert.deepEqual(result.calls, ['/organizations/me/course-access'], 'the course list is never asked for');
    });

    test('switched on but without a logo: the logo is asked for first, and nothing is listed', async () => {
        const { result, errors } = await screen({ entry: orgEntry, api: orgApi({ enabled: true, limit: 5, used: 0, hasLogo: false }), script: `
            await sleep(700);
            const step = $('[aria-label="Upload your logo"]');
            return { step: Boolean(step), text: text(step), upload: text($$('button').find((b) => /Upload logo/.test(text(b)))), disabled: $$('button').find((b) => /Upload logo/.test(text(b))).disabled, calls: window.__calls.map((c) => c[1]), create: Boolean($('button[aria-label="Create Course"]')) };` });
        assert.deepEqual(errors, []);
        assert.ok(result.step);
        assert.match(result.text, /Upload your institution's logo/);
        assert.match(result.text, /then you can create and publish your own courses/i);
        assert.equal(result.disabled, true, 'nothing to upload until an image is chosen');
        assert.ok(!result.calls.includes('/organizations/me/courses'), 'courses are not asked for yet');
        assert.equal(result.create, false, 'and there is no Create button');
    });

    test('once the logo is uploaded, the course list opens', async () => {
        // The first access answer has no logo; after the upload, it has one.
        const api = orgApi({ enabled: true, limit: 5, used: 2, hasLogo: false }).replace(
            "if (url.endsWith('/course-access')) return reply(",
            "if (url.endsWith('/course-access')) return reply(window.__logo ? { enabled: true, limit: 5, used: 2, hasLogo: true } : ")
            .replace("post: (url, body) => { window.__calls.push(['POST', url, body]);", "post: (url, body) => { window.__calls.push(['POST', url, body]); if (url.endsWith('/me/logo')) { window.__logo = true; return reply({ logo: 'https://cdn.example.com/logo.png', organization: {} }); }");
        const { result, errors } = await screen({ entry: orgEntry, api, script: `
            await sleep(700);
            const input = $('input[type="file"][aria-label="Logo image"]');
            const dt = new DataTransfer();
            dt.items.add(new File([new Uint8Array([137, 80, 78, 71])], 'logo.png', { type: 'image/png' }));
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            await sleep(200);
            let said = null;
            window.addEventListener('organization-logo', (e) => { said = e.detail; });
            $$('button').find((b) => /Upload logo/.test(text(b))).click();
            await sleep(800);
            return { posted: window.__calls.filter((c) => c[0] === 'POST').map((c) => c[1]), said, step: Boolean($('[aria-label="Upload your logo"]')), titles: $$('h3').map(text) };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.posted, ['/organizations/me/logo']);
        assert.equal(result.said, 'https://cdn.example.com/logo.png', 'the panel header is told about the new logo');
        assert.equal(result.step, false);
        assert.ok(result.titles.includes('Campus Safety'), 'and the courses are listed');
    });

    test('it lists its own courses from its own endpoint, with how many of its limit are used', async () => {
        const { result } = await screen({ entry: orgEntry, api: orgApi({ enabled: true, limit: 5, used: 2, hasLogo: true }), script: `
            await sleep(700);
            const cards = text(document.body);
            $('button[aria-label="Create Course"]').click(); await sleep(250);
            const form = text($('form'));
            return { calls: window.__calls.map((c) => c[1]), limit: text($('[aria-label="Course limit"]')), titles: $$('h3').map(text), create: $('button[aria-label="Create Course"]').disabled, cards, form };` });
        assert.ok(result.calls.includes('/organizations/me/courses'));
        assert.match(result.limit, /2 of 5 courses/);
        assert.match(result.limit, /add 3 more/);
        assert.ok(result.titles.includes('Campus Safety'));
        assert.doesNotMatch(result.cards, /₹|\bFree\b/, 'no price on the course cards');
        assert.doesNotMatch(result.form, /Price|Wallet points/, 'and none in the form');
        assert.equal(result.create, false);
    });

    test('at the limit, Create is switched off and says why', async () => {
        const { result } = await screen({ entry: orgEntry, api: orgApi({ enabled: true, limit: 2, used: 2, hasLogo: true }), script: `
            await sleep(700);
            const b = $('button[aria-label="Create Course"]');
            return { disabled: b.disabled, why: b.title, limit: text($('[aria-label="Course limit"]')) };` });
        assert.equal(result.disabled, true);
        assert.match(result.why, /can have 2 courses/);
        assert.match(result.limit, /reached your limit/);
    });

    test('a new course is made on its own endpoint and opens in its own builder', async () => {
        const { result } = await screen({ entry: orgEntry, api: orgApi({ enabled: true, limit: 5, used: 2, hasLogo: true }), script: `
            await sleep(700);
            $('button[aria-label="Create Course"]').click(); await sleep(250);
            const setter = (el, v) => { Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
            setter($('input[placeholder="Enter course title"]'), 'Exam Prep');
            setter($('textarea'), 'Getting ready for finals');
            await sleep(100);
            click(/^\\s*Create Course\\s*$/, 'form button'); await sleep(500);
            return { post: window.__calls.find((c) => c[0] === 'POST'), builder: !!$('#builder') };` });
        assert.equal(result.post[1], '/organizations/me/courses');
        assert.equal(result.post[2].title, 'Exam Prep');
        assert.ok(result.builder, 'straight into /organization/courses/:id');
    });
});

/* ── The super admin's Course access card ──────────────────────────────── */

const ORG = { _id: 'o1', name: 'ABC College', orgCode: 'ABC-2026-0001', organizationType: 'college', typeLabel: 'College', email: 'abc@x.edu', status: 'active', createdAt: '2026-09-01T00:00:00.000Z', studentCount: 3, pendingRequests: 0, statusHistory: [], courseAccess: { enabled: false, limit: 5 } };
const superApi = `
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url) => { window.__calls.push(['GET', url]);
    if (url === '/organizations/admin/o1') return reply({ organization: ${JSON.stringify(ORG)}, admins: [], studentCount: 3, pendingRequests: 0, courseCount: 4 });
    return reply({ organizations: [${JSON.stringify(ORG)}], totals: { all: 1, active: 1 }, types: [{ value: 'college', label: 'College' }] }); },
  put: (url, body) => { window.__calls.push(['PUT', url, body]);
    return reply({ message: 'ABC College can now have up to ' + body.limit + ' courses.', courseAccess: { enabled: body.enabled, limit: body.limit }, courseCount: 4 }); },
  post: () => reply({}), delete: () => reply({})
};`;
const superEntry = wrap('pages/Organizations.jsx', 'Organizations', { route: '/organizations', path: '/organizations' });

describe("the super admin's Course access card", { skip: skipWithoutChrome }, () => {
    test('switches courses on with a limit, and says what it did', async () => {
        const { result, errors } = await screen({ entry: superEntry, api: superApi, script: `
            await sleep(700);
            click(/^\\s*(Review|View)\\s*$/); await sleep(500);
            const card = $('section[aria-label="Course access"]');
            const before = { on: card.querySelector('[role=switch]').getAttribute('aria-checked'), made: text(card) };
            card.querySelector('[role=switch]').click(); await sleep(100);
            const box = card.querySelector('input[aria-label="Most courses allowed"]');
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(box, '3');
            box.dispatchEvent(new Event('input', { bubbles: true })); await sleep(100);
            const warn = text(card);
            click(/Save course access/); await sleep(400);
            return { before, warn, put: window.__calls.find((c) => c[0] === 'PUT'), after: text(card.querySelector('[role=status]')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.before.on, 'false');
        assert.match(result.before.made, /Made so far\s*4/);
        assert.match(result.warn, /already have 4\. Nothing is deleted/, 'a limit under what they have is explained');
        assert.deepEqual(result.put, ['PUT', '/organizations/admin/o1/course-access', { enabled: true, limit: 3 }]);
        assert.match(result.after, /up to 3 courses/);
    });
    test('the list has one Courses button per organization, opening its own Course access popup', async () => {
        const { result, errors } = await screen({ entry: superEntry, api: superApi, script: `
            await sleep(700);
            const cell = $('button[aria-label="Course access for ABC College"]');
            const label = text(cell);
            const oneLine = cell.getBoundingClientRect().height < 40;
            cell.click(); await sleep(400);
            const pop = $('[role=dialog][aria-label="Course access: ABC College"]');
            const card = pop && pop.querySelector('section[aria-label="Course access"]');
            card.querySelector('[role=switch]').click(); await sleep(100);
            click(/Save course access/); await sleep(400);
            return { header: $$('th').map(text).includes('Courses'), label, oneLine, open: !!card, put: window.__calls.find((c) => c[0] === 'PUT') };` });
        assert.deepEqual(errors, []);
        assert.ok(result.header);
        assert.equal(result.label, 'Enable');
        assert.ok(result.oneLine, 'a single-line button');
        assert.ok(result.open, 'the popup holds the Course access settings');
        assert.deepEqual(result.put, ['PUT', '/organizations/admin/o1/course-access', { enabled: true, limit: 5 }]);
    });
});

/* ── The Add lesson popup's upload ──────────────────────────────────────── */

const uploadEntry = (scope) => `
import { createRoot } from 'react-dom/client';
import AddLessonModal from '${srcFile('components/AddLessonModal.jsx')}';
import { CourseScope, ${scope} } from '${srcFile('utils/courseScope.js')}';
createRoot(document.getElementById('root')).render(
  <CourseScope.Provider value={${scope}}>
    <AddLessonModal isOpen onClose={() => {}} onSave={() => {}} />
  </CourseScope.Provider>);`;
const uploadApi = `
window.__calls = [];
export default { post: (url) => { window.__calls.push(url); return Promise.resolve({ data: { url: 'https://cdn.example/v.mp4', videoSource: 'bunny' } }); } };`;
const UPLOAD = `
    await sleep(300);
    const input = $('input[type=file]');
    const dt = new DataTransfer();
    dt.items.add(new File(['x'], 'talk.mp4', { type: 'video/mp4' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(400);
    return { calls: window.__calls, body: text(document.body) };`;

describe('uploading from the Add lesson popup', { skip: skipWithoutChrome }, () => {
    test("an organization's upload goes to its own endpoint, not platform admin's", async () => {
        const { result, errors } = await screen({ entry: uploadEntry('ORGANIZATION_SCOPE'), api: uploadApi, script: UPLOAD });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.calls, ['/organizations/me/lessons/upload']);
        assert.doesNotMatch(result.body, /cannot access platform administration/);
    });

    test('the platform admin still uploads to the admin endpoint', async () => {
        const { result } = await screen({ entry: uploadEntry('PLATFORM_SCOPE'), api: uploadApi, script: UPLOAD });
        assert.deepEqual(result.calls, ['/admin/lessons/upload']);
    });
});
