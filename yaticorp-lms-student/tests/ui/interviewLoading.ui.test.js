/**
 * Opening Interview Ready:
 *   - while the first answer is on its way, the sign is the section's sound
 *     waves, not a spinning circle
 *   - the last answer is kept on the device and shown at once on the next
 *     visit, then replaced by the fresh one when it arrives
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';

const dash = (overall) => ({
    student: { name: 'Asha Rao', firstName: 'Asha', goal: 'Frontend Developer', strongSkills: ['React'], learningSkills: ['Node'], projects: ['Portfolio'] },
    readiness: {
        overall, breakdown: [['communication', 'Communication', 60], ['technical', 'Technical Skills', 70], ['problemSolving', 'Problem Solving', 65], ['confidence', 'Confidence', 62], ['practice', 'Interview Practice', 40]].map(([key, label, value]) => ({ key, label, value })),
        prep: { practiced: 3, total: 22, mocks: 1 }, history: [{ id: 's1', type: 'full', score: 61, date: '2026-10-01T10:00:00.000Z' }], best: 61,
        areas: ['Practise answering out loud with a clear structure.'], badge: { threshold: 75, earned: false }
    },
    topics: [{ id: 't1', topic: 'React hooks', reason: 'From your skills', score: 40 }],
    practice: { total: 22, practiced: 3, sample: [{ id: 'q1', question: 'Explain React hooks.', category: 'technical', topic: 'React' }], generating: false },
    activeSession: null, types: ['hr', 'technical', 'project', 'behavioral', 'full'], ai: { configured: true, model: 'gemini' }
});

// The dashboard answers only when the test says so (window.__answer()).
const api = `
export default {
  get: (url) => url.includes('/interview/dashboard')
    ? new Promise((resolve) => { window.__answer = (data) => resolve({ data }); })
    : Promise.resolve({ data: {} }),
  post: () => Promise.resolve({ data: {} }), put: () => Promise.resolve({ data: {} }), delete: () => Promise.resolve({ data: {} })
};`;

const entry = (pre = '') => `
${pre}
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import InterviewDashboard from '${srcFile('interview/InterviewDashboard.jsx')}';
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { _id: 'u1', name: 'Asha Rao' }, setUser: () => {} }}>
    <MemoryRouter initialEntries={['/interview']}><InterviewDashboard /></MemoryRouter>
  </AuthContext.Provider>);`;

describe('opening Interview Ready', { skip: skipWithoutStyles }, () => {
    test('the first wait shows sound waves, not a spinning circle; then the page', async () => {
        const { result, errors } = await screen({ entry: entry(), api, styles: true, script: `
            await sleep(500);
            const sign = $('[data-analyzing]');
            const waiting = { text: text(sign), waves: sign.querySelectorAll('.iv-wave > span').length, spinner: !!sign.querySelector('.animate-spin') };
            window.__answer(${JSON.stringify(dash(68))}); await sleep(600);
            return { waiting, loaded: !$('[data-analyzing]'), body: text(document.body) };` });
        assert.deepEqual(errors, []);
        assert.match(result.waiting.text, /Checking your interview readiness/);
        assert.equal(result.waiting.waves, 7, 'seven wave bars');
        assert.equal(result.waiting.spinner, false, 'no circle');
        assert.equal(result.loaded, true);
        assert.match(result.body, /Asha/);
    });

    test('a return visit shows the last answer at once, then the fresh one', async () => {
        const { result, errors } = await screen({ entry: entry(`localStorage.setItem('interview:dashboard:u1', ${JSON.stringify(JSON.stringify(dash(68)))});`), api, styles: true, script: `
            // The readiness figure counts up on screen, so give it a moment to settle.
            await sleep(1800);
            const atOnce = { waiting: !!$('[data-analyzing]'), body: text(document.body) };
            window.__answer(${JSON.stringify(dash(72))}); await sleep(1800);
            return { atOnce, after: text(document.body), kept: JSON.parse(localStorage.getItem('interview:dashboard:u1')).readiness.overall };` });
        assert.deepEqual(errors, []);
        assert.equal(result.atOnce.waiting, false, 'no loader: the page is there already');
        assert.match(result.atOnce.body, /68%\s*READINESS/, 'with the last readiness');
        assert.match(result.after, /72%\s*READINESS/, 'the fresh readiness replaces it');
        assert.equal(result.kept, 72, 'and is kept for next time');
    });
});
