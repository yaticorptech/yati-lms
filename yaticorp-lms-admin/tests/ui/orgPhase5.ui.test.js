/**
 * The organization panel at scale, and its popups by keyboard.
 *
 * Students come a page of 25 at a time, with the search, filter and sort sent
 * to the server and the page said as "1–25 of N"; a server that does not page
 * yet still gets the old full list arranged in the browser. Only one of the
 * table and the card list is ever built. The waiting-requests badge follows a
 * decision at once. Popups take focus, close on Escape and hand focus back.
 * Moving a student out of another organization asks first.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, wrap, skipWithoutChrome } from './harness.js';

const student = (i) => ({
    _id: `s${i}`, name: `Student ${String(i).padStart(2, '0')}`, email: `student${i}@example.com`, status: 'active',
    coursesEnrolled: 3, coursesCompleted: i % 4, progressPercent: (i * 7) % 100, lessonsCompleted: i, quizzesPassed: 0,
    certificates: 0, xp: i * 10, level: 1, lastActive: '2026-09-20T09:00:00.000Z'
});
const SIXTY = Array.from({ length: 60 }, (_, i) => student(i));

/** A server that pages: answers the asked-for page of 60 with `total`. */
const pagingApi = `
const ALL = ${JSON.stringify(SIXTY)};
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url, config) => {
    const params = (config && config.params) || {};
    window.__calls.push([url, params]);
    if (url.endsWith('/me/students')) {
      const page = params.page || 1, limit = params.limit || 25;
      if (!params.page) return reply({ students: ALL });
      if (params.filter === 'blocked') return reply({ students: [], total: 0, page, limit });
      return reply({ students: ALL.slice((page - 1) * limit, page * limit), total: 60, page, limit });
    }
    return reply({});
  },
  delete: () => reply({ message: 'Removed.' })
};`;

/** The server as it was: every student, no `total`, parameters ignored. */
const oldApi = (n) => `
const ALL = ${JSON.stringify(SIXTY.slice(0, n))};
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url, config) => { window.__calls.push([url, (config && config.params) || {}]); return reply({ students: ALL }); },
  delete: () => reply({ message: 'Removed.' })
};`;

const studentsPage = (route = '/organization/students') => wrap('pages/org/OrgStudents.jsx', 'OrgStudents', { route, path: '/organization/students' });

const TYPE = `
    const type = (el, v) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    };`;

describe('students, a page at a time', { skip: skipWithoutChrome }, () => {
    test('asks the server for one page, says "1–25 of 60", and pages, filters and searches through it', async () => {
        const { result, errors } = await screen({ entry: studentsPage(), api: pagingApi, script: `${TYPE}
            await sleep(600);
            const first = window.__calls.at(-1)[1];
            const pager = text($('nav[aria-label="Pages"]'));
            $('button[aria-label="Next page"]').click(); await sleep(500);
            const second = window.__calls.at(-1)[1];
            const pager2 = text($('nav[aria-label="Pages"]'));
            click(/^Blocked/); await sleep(500);
            const filtered = window.__calls.at(-1)[1];
            const empty = text(document.body);
            click(/^All$/); await sleep(400);
            type($('input[type="search"]'), 'student1'); await sleep(900);
            const searched = window.__calls.at(-1)[1];
            return { first, pager, second, pager2, filtered, empty, searched };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.first, { page: 1, limit: 25, sort: 'name', filter: 'all' });
        assert.match(result.pager, /1–25 of 60/);
        assert.equal(result.second.page, 2);
        assert.match(result.pager2, /26–50 of 60/);
        assert.equal(result.filtered.filter, 'blocked');
        assert.equal(result.filtered.page, 1, 'a new filter starts on page 1');
        assert.match(result.empty, /No student matches that filter/);
        assert.equal(result.searched.search, 'student1', 'the search goes to the server, after a pause');
    });

    test('the filter, sort and page live in the address', async () => {
        const { result, errors } = await screen({ entry: studentsPage('/organization/students?filter=active30&sort=progress&page=2'), api: pagingApi, script: `
            await sleep(600);
            return { asked: window.__calls.at(-1)[1], pressed: $$('button[aria-pressed="true"]').map(text) };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.asked, { page: 2, limit: 25, sort: 'progress', filter: 'active30' });
        assert.ok(result.pressed.includes('Active 30d') && result.pressed.includes('Progress'));
    });

    test('against a server that does not page, the full list is paged here, as "1–25 of 30"', async () => {
        const { result, errors } = await screen({ entry: studentsPage(), api: oldApi(30), script: `
            await sleep(600);
            return { pager: text($('nav[aria-label="Pages"]')), rows: $$('tbody tr').length };` });
        assert.deepEqual(errors, []);
        assert.match(result.pager, /1–25 of 30/);
        assert.equal(result.rows, 25);
    });

    test('Export CSV asks for every matching student, not just the page', async () => {
        const { result, errors } = await screen({ entry: studentsPage('/organization/students?filter=completed'), api: pagingApi, script: `
            await sleep(600);
            URL.createObjectURL = () => 'blob:x';
            click(/Export CSV/); await sleep(400);
            return { last: window.__calls.at(-1)[1] };` });
        assert.deepEqual(errors, []);
        assert.equal(result.last.page, undefined, 'the unpaged list');
        assert.equal(result.last.filter, 'completed', 'with the same filter');
    });

    test('only one of the table and the card list is in the page', async () => {
        const measure = `await sleep(600); return { tables: $$('table').length, cards: $$('ul > li').length, rows: $$('tbody tr').length };`;
        const wide = await screen({ entry: studentsPage(), api: oldApi(8), width: 1400, script: measure });
        const narrow = await screen({ entry: studentsPage(), api: oldApi(8), width: 390, script: measure });
        const tablet = await screen({ entry: studentsPage(), api: oldApi(8), width: 1024, script: measure });
        assert.deepEqual(wide.result, { tables: 1, cards: 0, rows: 8 });
        assert.deepEqual(narrow.result, { tables: 0, cards: 8, rows: 0 });
        assert.equal(tablet.result.tables, 0, 'a tablet gets the cards, not a table that scrolls sideways');
    });
});

describe('popups, by keyboard', { skip: skipWithoutChrome }, () => {
    test('the remove confirmation takes focus, is named by its title, closes on Escape and gives focus back', async () => {
        const { result, errors } = await screen({ entry: studentsPage(), api: oldApi(3), width: 1400, script: `
            await sleep(600);
            const trigger = $$('tbody button').find((b) => /Remove/.test(text(b)));
            trigger.focus(); trigger.click(); await sleep(200);
            const dialog = $('[role="dialog"]');
            const named = text(document.getElementById(dialog.getAttribute('aria-labelledby')));
            const focusInside = dialog.contains(document.activeElement);
            const focused = text(document.activeElement);
            document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await sleep(200);
            return { named, modal: dialog.getAttribute('aria-modal'), focusInside, focused, closed: !$('[role="dialog"]'), back: document.activeElement === trigger };` });
        assert.deepEqual(errors, []);
        assert.match(result.named, /^Remove Student 00\?$/);
        assert.equal(result.modal, 'true');
        assert.ok(result.focusInside, 'focus moves into the dialog');
        assert.equal(result.focused, 'Cancel', 'onto the safe choice');
        assert.ok(result.closed, 'Escape closes it');
        assert.ok(result.back, 'and focus returns to the button that opened it');
    });

    test('Tab stays inside the dialog', async () => {
        const { result } = await screen({ entry: studentsPage(), api: oldApi(3), width: 1400, script: `
            await sleep(600);
            $$('tbody button').find((b) => /Remove/.test(text(b))).click(); await sleep(200);
            const dialog = $('[role="dialog"]');
            const buttons = $$('[role="dialog"] button');
            buttons.at(-1).focus();
            document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
            return { wrapped: document.activeElement === buttons[0], inside: dialog.contains(document.activeElement) };` });
        assert.ok(result.inside && result.wrapped);
    });
});

describe('the waiting-requests badge', { skip: skipWithoutChrome }, () => {
    const ORG = { _id: 'o1', name: 'ABC College', orgCode: 'abc_college', status: 'active', typeLabel: 'College' };
    const REQUEST = {
        _id: 'r1', status: 'pending', requestedAt: '2026-09-20T09:00:00.000Z', decisionReason: '',
        student: { _id: 'u1', name: 'Asha Rao', email: 'asha@example.com', status: 'active' }
    };
    const api = `
window.__pending = 3; window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url) => { window.__calls.push(url);
    if (url.endsWith('/me/status')) return reply({ organization: ${JSON.stringify(ORG)} });
    if (url.endsWith('/me/requests/count')) return reply({ pending: window.__pending });
    if (url.endsWith('/me/requests')) return reply({ requests: window.__pending ? [${JSON.stringify(REQUEST)}] : [], pendingCount: window.__pending });
    return reply({});
  },
  put: () => { window.__pending -= 1; return reply({ message: 'Asha Rao is now a member of your organization.' }); },
  post: () => reply({}), delete: () => reply({})
};`;
    const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '${srcFile('context/AuthContext.jsx')}';
import OrgAdminLayout from '${srcFile('layouts/OrgAdminLayout.jsx')}';
import OrgRequests from '${srcFile('pages/org/OrgRequests.jsx')}';
localStorage.setItem('adminToken', 't');
localStorage.setItem('adminData', JSON.stringify({ name: 'Asha', email: 'a@abc.edu', role: 'orgadmin' }));
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/organization/requests']}>
    <AuthProvider><Routes>
      <Route path="/organization" element={<OrgAdminLayout />}>
        <Route path="requests" element={<OrgRequests />} />
        <Route path="*" element={<p>other</p>} />
      </Route>
    </Routes></AuthProvider>
  </MemoryRouter>);`;

    test('reads the count endpoint, and drops by one as soon as a request is approved', async () => {
        const { result, errors } = await screen({ entry, api, script: `
            await sleep(700);
            const badge = () => text($('aside a[href="/organization/requests"]'));
            const before = badge();
            click(/^Approve$/, 'li button'); await sleep(200);
            click(/^Approve$/, '[role="dialog"] button'); await sleep(600);
            return { before, after: badge(), usedCount: window.__calls.includes('/organizations/me/requests/count') };` });
        assert.deepEqual(errors, []);
        assert.ok(result.usedCount, 'the small count endpoint');
        assert.match(result.before, /Student requests\s*3/);
        assert.match(result.after, /Student requests\s*2/, 'not one behind after the decision');
    });

    test('an unknown address inside the panel says so, in the shell', async () => {
        const entry404 = entry.replace("<Route path=\"*\" element={<p>other</p>} />", '')
            .replace("import OrgRequests", `import OrgNotFound from '${srcFile('pages/org/OrgNotFound.jsx')}';\nimport OrgRequests`)
            .replace("<Route path=\"requests\" element={<OrgRequests />} />", '<Route path="requests" element={<OrgRequests />} /><Route path="*" element={<OrgNotFound />} />')
            .replace("'/organization/requests'", "'/organization/nope'");
        const { result, errors } = await screen({ entry: entry404, api, script: `
            await sleep(700);
            return { body: text($('main')), sidebar: !!$('aside') };` });
        assert.deepEqual(errors, []);
        assert.match(result.body, /This page does not exist/);
        assert.ok(result.sidebar, 'with the panel around it');
    });
});

describe('moving a student between organizations', { skip: skipWithoutChrome }, () => {
    const ABC = { _id: 'a1', orgCode: 'abc_college', name: 'ABC College', typeLabel: 'College', email: 'o@abc.edu', status: 'active', createdAt: '2026-09-01T00:00:00.000Z', studentCount: 0, pendingRequests: 0 };
    const api = `
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url, config) => { window.__calls.push(['GET', url]);
    if (url.includes('/assignable')) return reply({ students: [{ _id: 'c1', name: 'Ravi Kumar', email: 'ravi@x.in', currentOrganization: { name: 'XYZ Institute' } }], capped: false });
    if (url.includes('/students')) return reply({ organization: ${JSON.stringify(ABC)}, students: [] });
    return reply({ organizations: [${JSON.stringify(ABC)}], totals: { all: 1, active: 1 }, types: [] });
  },
  post: (url, body) => { window.__calls.push(['POST', url, body]); return reply({ message: 'Ravi Kumar was moved to ABC College.' }); },
  put: () => reply({}), delete: () => reply({})
};`;
    const entry = wrap('pages/Organizations.jsx', 'Organizations', { route: '/organizations', path: '/organizations' });

    test('"Move here" asks "Move X from A to B?" and sends nothing until confirmed', async () => {
        const { result, errors } = await screen({ entry, api, script: `
            await sleep(700);
            $$('tbody button').find((b) => /^0/.test(text(b))).click(); await sleep(500);
            $('[aria-label="Assign student"]').click(); await sleep(700);
            click(/Move here/, '[aria-label="Assign a student"] button'); await sleep(200);
            const asked = text($('[aria-label="Confirm move"]'));
            const postsBefore = window.__calls.filter(([m]) => m === 'POST').length;
            click(/^Move$/, '[aria-label="Confirm move"] button'); await sleep(600);
            return { asked, postsBefore, posts: window.__calls.filter(([m]) => m === 'POST') };` });
        assert.deepEqual(errors, []);
        assert.match(result.asked, /Move Ravi Kumar from XYZ Institute to ABC College\?/);
        assert.equal(result.postsBefore, 0, 'nothing sent on the first press');
        assert.equal(result.posts.length, 1);
        assert.deepEqual(result.posts[0][2], { studentId: 'c1' });
    });

    test('a rejected organization offers no way to assign, and its Reinstate says Reinstate', async () => {
        const rejected = api.replace(/"status":"active"/g, '"status":"rejected"');
        const { result, errors } = await screen({ entry, api: rejected, script: `
            await sleep(700);
            const label = text($$('tbody button').find((b) => /^0/.test(text(b))));
            click(/^Reinstate$/, 'tbody button'); await sleep(300);
            const confirm = $$('[aria-label="Confirm this decision"] button').map(text);
            return { label, confirm };` });
        assert.deepEqual(errors, []);
        assert.doesNotMatch(result.label, /Assign/);
        assert.ok(result.confirm.includes('Reinstate'), 'the confirm button names the action');
        assert.ok(!result.confirm.includes('Approve'));
    });
});
