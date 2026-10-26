/**
 * My Learning's tabs keep the address in step, both ways.
 *
 *   - /?tab=quiz opens the Global Quiz tab — on arrival, and when the "new
 *     Global Quiz" notice sends a student there while they are already on the
 *     Dashboard (it read ?tab once, so "Take the quiz" changed the address and
 *     nothing else).
 *   - A tap writes the tab back into the address, so the notice can tell the
 *     student is on the quiz already.
 *   - ?tab=quiz with the Global Quiz switched off opens the default tab.
 *   - The strip is a tab list from the keyboard: arrows move along it and open
 *     the tab, only the open tab is in the Tab order, and the panel is named
 *     by its tab.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule, paper } from './fixtures.js';

const api = apiModule({
    '/quizzes/global/history': { winScore: 60, attempts: [] },
    '/quizzes/global': { ...paper, quiz: { title: 'Weekly GK', description: '', timeLimitMinutes: 10 }, attempt: null }
});

const entry = ({ at = '/', quiz = true, available = '[]', enrollCourse = '() => {}' } = {}) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import { RewardsContext } from '${srcFile('context/useRewards.js')}';
import Dashboard from '${srcFile('pages/Dashboard.jsx')}';
const rewards = { enabled: false, summary: null, refresh: () => {}, celebrate: () => {}, pullEvents: () => {} };
function Where() { const l = useLocation(); window.__nav = useNavigate(); return <p id="where">{l.pathname}{l.search}</p>; }
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { _id: 'u1', name: 'Meera' }, isGlobalQuizEnabled: ${quiz}, isCareerPathEnabled: true }}>
    <RewardsContext.Provider value={rewards}>
      <MemoryRouter initialEntries={['${at}']}>
        <Where />
        <Dashboard courses={[]} availableCourses={${available}} loading={false} error={null}
                   buyingCourseId={null} enrollCourse={${enrollCourse}} refresh={() => { window.__refreshed = (window.__refreshed || 0) + 1; }} weeklyActivity={<div id="weekly" />} />
      </MemoryRouter>
    </RewardsContext.Provider>
  </AuthContext.Provider>);`;

const READ = `({
    selected: text($('[role=tab][aria-selected=true]')),
    where: text($('#where')),
    quizShown: /Test your general knowledge/.test(text(document.body))
})`;

describe('My Learning tabs and the address', { skip: skipWithoutChrome }, () => {
    test('arriving on /?tab=quiz opens the Global Quiz tab', async () => {
        const { result, errors } = await screen({ entry: entry({ at: '/?tab=quiz' }), api, script: `await sleep(900); return ${READ};` });
        assert.deepEqual(errors, []);
        assert.equal(result.selected, 'Global Quiz');
        assert.equal(result.quizShown, true);
    });

    test('"Take the quiz" while already on the Dashboard switches to the quiz', async () => {
        const { result, errors } = await screen({
            entry: entry(), api, script: `
                await sleep(600);
                const before = ${READ};
                window.__nav('/?tab=quiz'); await sleep(700);
                return { before, after: ${READ} };` });
        assert.deepEqual(errors, []);
        assert.equal(result.before.selected, 'Available Courses');
        assert.equal(result.after.selected, 'Global Quiz');
        assert.equal(result.after.quizShown, true);
    });

    test('a tapped tab is written into the address, and the default tab leaves it clean', async () => {
        const { result } = await screen({
            entry: entry(), api, script: `
                await sleep(600);
                click(/Completed/, '[role=tab]'); await sleep(300);
                const completed = text($('#where'));
                click(/Global Quiz/, '[role=tab]'); await sleep(300);
                const quiz = text($('#where'));
                click(/Available Courses/, '[role=tab]'); await sleep(300);
                return { completed, quiz, back: text($('#where')) };` });
        assert.equal(result.completed, '/?tab=completed');
        assert.equal(result.quiz, '/?tab=quiz');
        assert.equal(result.back, '/');
    });

    test('?tab=quiz with the Global Quiz switched off opens the default tab', async () => {
        const { result } = await screen({ entry: entry({ at: '/?tab=quiz', quiz: false }), api, script: `await sleep(900); return ${READ};` });
        assert.equal(result.selected, 'Available Courses');
        assert.equal(result.quizShown, false);
    });

    test('the arrow keys move along the tabs and open them; only the open tab is in the Tab order', async () => {
        const { result, errors } = await screen({
            entry: entry(), api, script: `
                await sleep(600);
                const key = (k) => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
                $('[role=tab][aria-selected=true]').focus();
                key('ArrowRight'); await sleep(200);
                const right = { selected: text($('[role=tab][aria-selected=true]')), focused: text(document.activeElement) };
                key('ArrowLeft'); await sleep(200);
                key('ArrowLeft'); await sleep(200);
                const wrapped = text($('[role=tab][aria-selected=true]'));
                const panel = $('[role=tabpanel]');
                return {
                    right, wrapped,
                    tabbable: $$('[role=tab]').filter((t) => t.tabIndex === 0).map(text),
                    controls: $$('[role=tab]').every((t) => t.getAttribute('aria-controls') === panel.id),
                    panelLabel: panel.getAttribute('aria-labelledby') === $('[role=tab][aria-selected=true]').id
                };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.right, { selected: 'Completed', focused: 'Completed' });
        assert.equal(result.wrapped, 'Weekly activity', 'left from the first tab wraps to the last');
        assert.deepEqual(result.tabbable, ['Weekly activity']);
        assert.equal(result.controls, true);
        assert.equal(result.panelLabel, true);
    });

    test('a course that is already the student\'s in a bundle says so, and offers to open it (no Bundles tab)', async () => {
        // The server refuses to charge for it (409 IN_BUNDLE) when the list was
        // loaded before the bundle opened.
        const refuse = `() => Promise.reject({ response: { status: 409, data: { code: 'IN_BUNDLE', message: 'This course is already yours in the "QA" bundle, so there is nothing to pay. Open it from Bundles.' } } })`;
        const { result, errors } = await screen({
            entry: entry({ available: JSON.stringify([{ _id: 'kP', title: 'Priced Course', price: 500 }]), enrollCourse: refuse }), api, script: `
                await sleep(600);
                click(/Enroll Now/); await sleep(200);
                click(/Enroll Now/, '[role=dialog] button'); await sleep(300);
                const said = text($('[role=dialog] [role=alert]'));
                const offered = $$('[role=dialog] button').map((b) => b.innerText.trim());
                click(/Open course/, '[role=dialog] button'); await sleep(400);
                return { said, offered, refreshed: window.__refreshed || 0, open: !!$('[role=dialog]'), ${READ.slice(2, -2)} };` });
        assert.deepEqual(errors, []);
        assert.match(result.said, /already yours, with nothing to pay/);
        assert.ok(result.offered.includes('Open course'), `buttons: ${JSON.stringify(result.offered)}`);
        assert.ok(!result.offered.some((b) => /Enroll Now/.test(b)), 'no payment is offered for it');
        assert.equal(result.refreshed, 1, 'the stale list is read again');
        assert.equal(result.open, false);
        assert.equal(result.where, '/learn/kP', 'the course opens');
    });
});
