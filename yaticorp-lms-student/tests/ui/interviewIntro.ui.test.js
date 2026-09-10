/** The mock interview's welcome screen, taken in a real browser. */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

// Starting an interview asks for the microphone first. Headless Chrome has no
// device, so the page falls back to typed answers; the session still starts.
const api = apiModule({ '/sessions': { id: 'new-session', type: 'full', role: 'Full Stack Developer', status: 'active', turns: [], maxQuestions: 8 } });

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MockInterview from '${srcFile('interview/MockInterview.jsx')}';
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/interview/mock/new?role=Full%20Stack%20Developer']}>
    <Routes>
      <Route path="/interview/mock/:id" element={<MockInterview />} />
      <Route path="/interview" element={<p>the dashboard</p>} />
    </Routes>
  </MemoryRouter>);`;

describe('the mock interview welcome screen', { skip: skipWithoutChrome }, () => {
    test('introduces the interview and what it will do', async () => {
        const { result, errors } = await screen({
            entry, api, script: `
                await sleep(600);
                const body = text(document.body);
                return {
                    eyebrow: /AI Mock Interview/i.test(body),
                    heading: text($$('h1')[0]),
                    explains: /asks the next question/.test(body),
                    back: !!find(/Interview Ready/, 'a')
                };` });
        assert.deepEqual(errors, []);
        assert.equal(result.eyebrow, true);
        assert.equal(result.heading, 'Welcome to your mock interview!');
        assert.ok(result.explains, 'it says what the interviewer does');
        assert.ok(result.back, 'there is a way back to Interview Ready');
    });

    test('says what a mock interview gives you, in three', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(600);
                // The robot's checklist is decoration and is marked as such, so
                // filtering on that leaves only the real list.
                const real = $$('li').filter((li) => !li.closest('[aria-hidden]'));
                return {
                    features: real.map((li) => Array.from(li.querySelectorAll('span > span')).map((s) => s.textContent.trim())),
                    decorative: $$('li').length - real.length
                };` });
        assert.deepEqual(result.features, [
            ['Speak naturally', 'Like a real interview'],
            ['Get instant feedback', 'After each answer'],
            ['Improve continuously', 'With AI insights']
        ]);
        assert.equal(result.decorative, 3, "the robot's checklist is hidden from screen readers");
    });

    test('the duration follows the interview type', async () => {
        const { result } = await screen({
            entry, api, script: `
                const shown = () => $$('p').map(text).find((t) => /minutes/.test(t || ''));
                await sleep(600);
                const full = shown();
                const select = $$('select')[0];
                select.value = 'hr';
                select.dispatchEvent(new Event('change', { bubbles: true }));
                await sleep(200);
                return { full, hr: shown(), types: Array.from(select.options).map((o) => o.text) };` });
        assert.equal(result.full, '12–15 minutes');
        assert.equal(result.hr, '8–10 minutes', 'a shorter interview shows a shorter time');
        assert.ok(result.types.includes('Full Mock Interview'));
        assert.ok(result.types.includes('HR Interview'));
    });

    test('the role they arrived with is the one chosen, and it stays on the list', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(600);
                const roles = $$('select')[1];
                return { chosen: roles.value, options: Array.from(roles.options).map((o) => o.text) };` });
        assert.equal(result.chosen, 'Full Stack Developer');
        assert.ok(result.options.includes('Data Analyst'), 'the rest of the list is there too');
        assert.equal(result.options[result.options.length - 1], 'Other role…');
    });

    test('a role that is not on the list is kept rather than dropped', async () => {
        const oddRole = entry.replace('role=Full%20Stack%20Developer', 'role=Sound%20Engineer');
        const { result } = await screen({
            entry: oddRole, api, script: `
                await sleep(600);
                const roles = $$('select')[1];
                return { chosen: roles.value, first: roles.options[0].text };` });
        assert.equal(result.chosen, 'Sound Engineer');
        assert.equal(result.first, 'Sound Engineer', 'it is put at the top of the list');
    });

    test('"Other role" opens a box, and what is typed there is what is started', async () => {
        const { result } = await screen({
            entry, api, budget: 30_000, script: `
                await sleep(600);
                const before = $$('input').length;
                const roles = $$('select')[1];
                roles.value = '__other__';
                roles.dispatchEvent(new Event('change', { bubbles: true }));
                await sleep(300);
                const after = $$('input').length;

                const box = $$('input')[0];
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                setter.call(box, 'Site Reliability Engineer');
                box.dispatchEvent(new Event('input', { bubbles: true }));
                await sleep(300);

                // Asking for the microphone comes first and gives up after
                // twelve seconds when there is no device, as here.
                click(/Start Interview/);
                await sleep(13500);
                return { before, after, posted: window.__calls.filter((c) => c[0] === 'POST').map((c) => c[2]) };` });
        assert.equal(result.before, 0, 'there is no box until it is asked for');
        assert.equal(result.after, 1);
        assert.deepEqual(result.posted, [{ type: 'full', role: 'Site Reliability Engineer' }]);
    });

    test('starting sends the type and role that are on screen', async () => {
        const { result } = await screen({
            entry, api, budget: 30_000, script: `
                await sleep(600);
                click(/Start Interview/);
                await sleep(13500);
                return { posted: window.__calls.filter((c) => c[0] === 'POST').map((c) => c[2]) };` });
        assert.deepEqual(result.posted, [{ type: 'full', role: 'Full Stack Developer' }]);
    });

    test('it explains the microphone before asking for it', async () => {
        const { result } = await screen({
            entry, api, script: `
                await sleep(600);
                const body = text(document.body);
                return {
                    title: /Why we ask for your microphone/.test(body),
                    nothingRecorded: /Nothing is recorded or uploaded/.test(body),
                    canType: /You can type any answer instead at any time/.test(body),
                    privacy: /Your privacy is safe with us/.test(body)
                };` });
        assert.ok(result.title);
        assert.ok(result.nothingRecorded, 'it is plain that no audio leaves the machine');
        assert.ok(result.canType, 'typing is offered as a way out');
        assert.ok(result.privacy);
    });
});
