/**
 * A superadmin opening an organization's own dashboard, read-only, without
 * that organization's password.
 *
 * From Organizations, an active organization has a Dashboard button. It opens
 * the organization panel as that organization sees it, with a bar across the
 * top saying whose it is and that it is read-only, and an Exit back. The API
 * client names the organization (X-View-Organization) on the panel's own
 * requests and nowhere else; the server lets only a superadmin use it, and
 * only to read.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';

const ORG = { _id: 'o1', name: 'ABC College', orgCode: 'abc_college', status: 'active', typeLabel: 'College', statusReason: '', logo: '' };

const api = `
const ORG = ${JSON.stringify(ORG)};
const LIST = {
  organizations: [
    { ...ORG, organizationType: 'college', email: 'office@abc.edu', contactPerson: 'Asha', createdAt: '2026-09-01T00:00:00.000Z', studentCount: 3, pendingRequests: 0, courseAccess: { enabled: false, limit: 5 }, courseCount: 0 },
    { _id: 'p1', name: 'Pending Place', orgCode: 'pending_place', status: 'pending', typeLabel: 'School', organizationType: 'school', email: 'p@x.edu', createdAt: '2026-09-02T00:00:00.000Z', studentCount: 0, pendingRequests: 0, courseAccess: { enabled: false, limit: 5 }, courseCount: 0 }
  ],
  totals: { all: 2, pending: 1, active: 1 }, types: []
};
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url) => {
    if (url.endsWith('/me/status')) return reply({ organization: ORG });
    if (url.endsWith('/me/requests')) return reply({ requests: [], pendingCount: 0 });
    if (url.endsWith('/me/dashboard')) return reply({ organization: ORG, stats: { students: 3, activeStudents: 1, averageProgress: 10, certificates: 0, coursesCompleted: 0, totalXp: 0, pendingRequests: 0 }, recentActivity: [] });
    return reply(LIST);
  },
  post: () => reply({}), put: () => reply({}), delete: () => reply({})
};`;

const app = (route, viewing) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '${srcFile('context/AuthContext.jsx')}';
import OrgAdminLayout from '${srcFile('layouts/OrgAdminLayout.jsx')}';
import OrgDashboard from '${srcFile('pages/org/OrgDashboard.jsx')}';
import Organizations from '${srcFile('pages/Organizations.jsx')}';
localStorage.setItem('adminToken', 't');
localStorage.setItem('adminData', JSON.stringify({ name: 'Boss', email: 'boss@yati.com', role: 'superadmin' }));
${viewing ? `sessionStorage.setItem('viewOrganization', JSON.stringify(${JSON.stringify(viewing)}));` : "sessionStorage.removeItem('viewOrganization');"}
const Where = () => { window.__path = useLocation().pathname; return null; };
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['${route}']}>
    <AuthProvider>
      <Where />
      <Routes>
        <Route path="/organizations" element={<Organizations />} />
        <Route path="/organization" element={<OrgAdminLayout />}>
          <Route index element={<OrgDashboard />} />
        </Route>
      </Routes>
    </AuthProvider>
  </MemoryRouter>
);`;

describe("a superadmin viewing an organization's dashboard", { skip: skipWithoutChrome }, () => {
    test('an active organization has a Dashboard button, which opens its panel', async () => {
        const { result, errors } = await screen({ entry: app('/organizations'), api, width: 1300, script: `
            await sleep(700);
            // Counted in the table: without the stylesheet the phone cards are on the page too.
            const buttons = $$('table button').filter((b) => /Dashboard/.test(text(b)));
            const count = buttons.length;
            buttons[0].click();
            await sleep(900);
            return { count, stored: JSON.parse(sessionStorage.getItem('viewOrganization')), path: window.__path, bar: text($('[role="status"]')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.count, 1, 'only for the active one, not the pending one');
        assert.deepEqual(result.stored, { id: 'o1', name: 'ABC College' });
        assert.equal(result.path, '/organization');
        assert.match(result.bar, /Viewing ABC College/);
        assert.match(result.bar, /read-only/);
    });

    test('the panel says whose it is, and Exit goes back to Organizations', async () => {
        const { result, errors } = await screen({ entry: app('/organization', { id: 'o1', name: 'ABC College' }), api, width: 1300, script: `
            await sleep(900);
            const bar = text($('[role="status"]'));
            const dashboard = text(document.body);
            $$('button').find((b) => /Exit/.test(text(b))).click();
            await sleep(600);
            return { bar, dashboard, path: window.__path, stored: sessionStorage.getItem('viewOrganization') };` });
        assert.deepEqual(errors, []);
        assert.match(result.bar, /Viewing ABC College as the platform administrator · read-only/);
        assert.match(result.dashboard, /ABC College/);
        assert.equal(result.path, '/organizations');
        assert.equal(result.stored, null, 'the view ends with Exit');
    });

    test('its menu offers the way back, not a log out', async () => {
        const { result } = await screen({ entry: app('/organization', { id: 'o1', name: 'ABC College' }), api, width: 1300, script: `
            await sleep(900);
            $('button[aria-label="Account menu"]').click();
            await sleep(300);
            return text(document.body);` });
        assert.match(result, /Back to Organizations/);
        assert.match(result, /Super Admin · viewing/);
        assert.doesNotMatch(result, /Log out/);
    });
});

describe('the API client', { skip: skipWithoutChrome }, () => {
    // The real client (utils/api.js — the harness stubs only the bare 'utils/api'),
    // with a fake network that returns the headers it was given.
    const entry = `
import api from '${srcFile('utils/api.js')}';
window.__run = async () => {
  const adapter = (config) => Promise.resolve({ data: { ...config.headers }, status: 200, statusText: 'OK', headers: {}, config });
  localStorage.setItem('adminToken', 't');
  sessionStorage.setItem('viewOrganization', JSON.stringify({ id: 'o1', name: 'ABC College' }));
  const panel = (await api.get('/organizations/me/dashboard', { adapter })).data;
  const platform = (await api.get('/admin/courses', { adapter })).data;
  sessionStorage.removeItem('viewOrganization');
  const after = (await api.get('/organizations/me/dashboard', { adapter })).data;
  return { panel: panel['X-View-Organization'], platform: platform['X-View-Organization'], after: after['X-View-Organization'] };
};`;

    test("names the viewed organization on the panel's requests only", async () => {
        const { result, errors } = await screen({ entry, api: 'export default {};', script: 'return await window.__run();' });
        assert.deepEqual(errors, []);
        assert.equal(result.panel, 'o1');
        assert.equal(result.platform, undefined, 'not on the platform API');
        assert.equal(result.after, undefined, 'and not once the view has ended');
    });
});
