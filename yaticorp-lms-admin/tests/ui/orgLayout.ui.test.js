/**
 * The organization administrator's shell, measured in a real browser with the
 * app's real stylesheet.
 *
 * On a phone the sidebar gives way to a bar along the bottom: every section is
 * one tap away, the waiting-requests count rides on its tab, and nothing on the
 * page ends up hidden underneath it. On a desktop it is the other way round.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';

const ORG = {
    _id: 'o1', name: 'ABC College', orgCode: 'ABC-2026-0001', status: 'active',
    typeLabel: 'College', statusReason: ''
};

const STUDENTS = Array.from({ length: 8 }, (_, i) => ({
    _id: `s${i}`, name: `Student ${i}`, email: `student${i}@example.com`, status: 'active',
    coursesEnrolled: 3, coursesCompleted: i % 3, progressPercent: (i * 13) % 100,
    lessonsCompleted: i, quizzesPassed: i, certificates: i % 2, xp: i * 40, level: 2,
    lastActive: '2026-09-20T09:00:00.000Z'
}));

const api = `
const ORG = ${JSON.stringify(ORG)};
const STUDENTS = ${JSON.stringify(STUDENTS)};
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url) => {
    if (url.endsWith('/me/status')) return reply({ organization: ORG });
    if (url.endsWith('/me/requests')) return reply({ requests: [], pendingCount: 3 });
    if (url.endsWith('/me/students')) return reply({ students: STUDENTS });
    if (url.endsWith('/me/dashboard')) return reply({
      organization: ORG,
      stats: { students: 8, activeStudents: 5, averageProgress: 42, certificates: 4, coursesCompleted: 7, totalXp: 1120, pendingRequests: 3 },
      recentActivity: STUDENTS.slice(0, 5)
    });
    return reply({});
  },
  post: () => reply({}), put: () => reply({}), delete: () => reply({})
};`;

const entry = (route) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '${srcFile('context/AuthContext.jsx')}';
import OrgAdminLayout from '${srcFile('layouts/OrgAdminLayout.jsx')}';
import OrgDashboard from '${srcFile('pages/org/OrgDashboard.jsx')}';
import OrgStudents from '${srcFile('pages/org/OrgStudents.jsx')}';
localStorage.setItem('adminToken', 't');
localStorage.setItem('adminData', JSON.stringify({ name: 'Asha Rao', email: 'asha@abc.edu', role: 'orgadmin' }));
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['${route}']}>
    <AuthProvider>
      <Routes>
        <Route path="/organization" element={<OrgAdminLayout />}>
          <Route index element={<OrgDashboard />} />
          <Route path="students" element={<OrgStudents />} />
        </Route>
      </Routes>
    </AuthProvider>
  </MemoryRouter>
);`;

const MEASURE = `
    await sleep(900);
    const shown = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
    const navs = $$('nav[aria-label="Organization"]');
    const bottom = navs.find((n) => getComputedStyle(n).position === 'fixed');
    const aside = $('aside');
    const scroller = $('main > div.overflow-y-auto');
    scroller.scrollTop = scroller.scrollHeight;
    await sleep(100);
    const last = scroller.firstElementChild.getBoundingClientRect();
    return {
        bottomShown: shown(bottom),
        sidebarShown: shown(aside),
        tabs: bottom ? Array.from(bottom.querySelectorAll('a')).map((a) => a.innerText.replace(/\\s+/g, ' ').trim()) : [],
        current: bottom ? text(bottom.querySelector('[aria-current="page"]')) : null,
        navTop: bottom ? Math.round(bottom.getBoundingClientRect().top) : null,
        contentBottom: Math.round(last.bottom),
        heading: text($('header p')),
        pageSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };`;

describe('the organization shell', { skip: skipWithoutStyles }, () => {
    test('on a phone, the sections are a bar along the bottom and the sidebar is gone', async () => {
        const { result, errors } = await screen({
            entry: entry('/organization'), api, styles: true, width: 390, height: 780, script: MEASURE
        });
        assert.deepEqual(errors, []);
        assert.ok(result.bottomShown, 'the bottom bar is on screen');
        assert.ok(!result.sidebarShown, 'the sidebar is not');
        assert.equal(result.tabs.length, 4);
        assert.match(result.tabs[0], /Home/);
        assert.match(result.tabs[2], /Requests/);
        assert.match(result.tabs[2], /3/, 'the waiting count rides on the Requests tab');
        assert.match(result.current, /Home/, 'the open section is marked');
        assert.equal(result.heading, 'Dashboard', 'the header names the page');
        assert.ok(result.contentBottom <= result.navTop, `scrolled to the end, nothing sits under the bar (${result.contentBottom} > ${result.navTop})`);
        assert.ok(!result.pageSideways, 'and nothing runs off the side');
    });

    test('on a phone, the students page marks its own tab', async () => {
        const { result, errors } = await screen({
            entry: entry('/organization/students'), api, styles: true, width: 390, height: 780, script: MEASURE
        });
        assert.deepEqual(errors, []);
        assert.match(result.current, /Students/);
        assert.equal(result.heading, 'Students');
        assert.ok(result.contentBottom <= result.navTop, 'the last student is clear of the bar');
        assert.ok(!result.pageSideways);
    });

    test('on a desktop, it is the sidebar, and no bottom bar', async () => {
        const { result, errors } = await screen({
            entry: entry('/organization'), api, styles: true, width: 1400, height: 900, script: MEASURE
        });
        assert.deepEqual(errors, []);
        assert.ok(result.sidebarShown, 'the sidebar is on screen');
        assert.ok(!result.bottomShown, 'the bottom bar is not');
    });
});
