/**
 * The organization's Students section: the student list, and the Certificate
 * progress tab, where a course's name appears under a student the moment they
 * finish one of the organization's courses.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome, skipWithoutStyles } from './harness.js';

const PROGRESS = {
    courses: [
        { _id: 'c1', title: 'Campus Safety', isPublished: true },
        { _id: 'c2', title: 'Library Skills and Research Methods for First Years', isPublished: true }
    ],
    students: [
        { _id: 's1', name: 'Asha Rao', email: 'asha@example.com',
            courses: [
                { courseId: 'c1', title: 'Campus Safety', started: true, percentage: 100, completed: true, completedAt: '2026-09-20T00:00:00.000Z' },
                { courseId: 'c2', title: 'Library Skills and Research Methods for First Years', started: true, percentage: 40, completed: false }
            ],
            earned: [{ courseId: 'c1', title: 'Campus Safety', completedAt: '2026-09-20T00:00:00.000Z' }] },
        { _id: 's2', name: 'Ben Thomas', email: 'ben@example.com',
            courses: [
                { courseId: 'c1', title: 'Campus Safety', started: false, percentage: 0, completed: false },
                { courseId: 'c2', title: 'Library Skills and Research Methods for First Years', started: false, percentage: 0, completed: false }
            ],
            earned: [] }
    ],
    totals: { students: 2, certificates: 1, studentsWithCertificate: 1 }
};
const STUDENTS = [
    { _id: 's1', name: 'Asha Rao', email: 'asha@example.com', createdAt: '2026-09-01T00:00:00.000Z' },
    { _id: 's2', name: 'Ben Thomas', email: 'ben@example.com', createdAt: '2026-09-02T00:00:00.000Z' }
];
const api = `
window.__calls = [];
const reply = (data) => Promise.resolve({ data });
export default {
  get: (url) => { window.__calls.push(url);
    if (url.endsWith('/certificate-progress')) return reply(${JSON.stringify(PROGRESS)});
    return reply(${JSON.stringify(STUDENTS)}); },
  delete: () => reply({})
};`;
const entry = (route) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import OrgStudents from '${srcFile('pages/org/OrgStudents.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['${route}']}>
    {/* The padding the organization layout puts around every page. */}
    <div className="p-4"><Routes><Route path="/organization/students" element={<OrgStudents />} /></Routes></div>
  </MemoryRouter>);`;

describe('the Students section: certificate progress', { skip: skipWithoutChrome }, () => {
    test('opens on All students, and the Certificate progress tab loads its own data', async () => {
        const { result, errors } = await screen({ entry: entry('/organization/students'), api, script: `
            await sleep(600);
            const before = window.__calls.slice();
            [...document.querySelectorAll('button')].find((b) => text(b) === 'Certificate progress').click();
            await sleep(600);
            return { before, after: window.__calls.slice(), body: text(document.body) };` });
        assert.deepEqual(errors, []);
        assert.ok(!result.before.includes('/organizations/me/certificate-progress'), 'not fetched until opened');
        assert.ok(result.after.includes('/organizations/me/certificate-progress'));
        assert.match(result.body, /Completion rate/);
    });

    test("a finished course shows in the student's details, by name, as completed with its date", async () => {
        const { result } = await screen({ entry: entry('/organization/students?view=certificates'), api, script: `
            await sleep(700);
            const card = (n) => $('[aria-label="Certificate progress: ' + n + '"]');
            const collapsed = text(card('Asha Rao'));
            const section = text($('section[aria-label="Students"]'));
            card('Asha Rao').querySelector('button[aria-expanded]').click();
            card('Ben Thomas').querySelector('button[aria-expanded]').click(); await sleep(200);
            const rows = (n) => [...card(n).querySelectorAll('ul li')].map(text);
            return { collapsed, asha: rows('Asha Rao'), ben: rows('Ben Thomas'), section};` });
        assert.match(result.collapsed, /1 of 2 completed/);
        assert.doesNotMatch(result.collapsed, /Campus Safety/, 'no certificates column on the row itself');
        assert.doesNotMatch(result.section, /Certificates/i, 'and no Certificates heading');
        assert.ok(result.asha.some((r) => /^Campus Safety.*Completed · /.test(r)), 'the finished course, with its date');
        assert.ok(result.asha.some((r) => /Library Skills.*40%/.test(r)));
        assert.ok(result.ben.every((r) => /Not started/.test(r)), 'nothing finished, nothing completed');
    });

    test('fits a phone screen without sideways scrolling', { skip: skipWithoutStyles }, async () => {
        const { result } = await screen({ entry: entry('/organization/students?view=certificates'), api, styles: true, width: 500, script: `
            await sleep(800);
            const w = document.documentElement.clientWidth;
            // Clipped overflow counts too: a card cut off inside its box is just as broken.
            // (The tab switch's scroller bleeds 4px into the padding on purpose, so it can scroll edge to
            // edge; and the banner's decorative circles are clipped by the banner itself.)
            const spill = $$('#root > div > div *').filter((e) => !e.closest('.-mx-1') && !e.closest('[aria-hidden]')).filter((e) => e.getBoundingClientRect().right > w - 16 + 1).map((e) => e.tagName + ' ' + text(e).slice(0, 40));
            return { overflow: document.documentElement.scrollWidth - w, spill };` });
        assert.ok(result.overflow <= 0, 'overflow ' + result.overflow);
        assert.deepEqual(result.spill, [], 'nothing reaches past the page padding');
    });
});
