/**
 * The daily puzzle (ContinuePanel) waits for a free moment.
 *
 * It opened the moment its question came back — over a lesson's video, a mock
 * interview or a game. It now follows the "new Global Quiz" notice's rule
 * (components/busyScreen.js): not on a busy page, not over a popup, not while
 * the student is typing; it comes up once they are free. And "seen this
 * session" is per student, not one flag for whoever uses the browser next.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

const api = apiModule({
    '/career/activity/answer': { correct: true, answer: 0, why: 'Because.', xpAwarded: 5 },
    '/career/activity': { eligible: true, done: false, activity: { kind: 'Aptitude', prompt: 'What is 2 + 2?', options: ['4', '5', '6', '7'] } },
    '/career/today': { eligible: true, returning: true, planReady: true, task: null, streak: 2 }
});

const entry = (at) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import ContinuePanel from '${srcFile('components/ContinuePanel.jsx')}';
sessionStorage.clear();
function Nav() { window.__nav = useNavigate(); return null; }
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { _id: 'u1', name: 'Meera Active' }, isCareerPathEnabled: true }}>
    <MemoryRouter initialEntries={['${at}']}><Nav /><ContinuePanel /></MemoryRouter>
  </AuthContext.Provider>);`;

const SHOWN = `!!$('[role=dialog][aria-label="Today\\'s activity"]')`;

describe('the daily puzzle', { skip: skipWithoutChrome }, () => {
    test('does not open over a lesson, and opens once the student leaves it', async () => {
        const { result, errors } = await screen({
            entry: entry('/learn/course-1'), api, script: `
                await sleep(1800);
                const duringLesson = ${SHOWN};
                window.__nav('/'); await sleep(1500);
                return { duringLesson, after: ${SHOWN}, seen: sessionStorage.getItem('yati:dailyActivitySeen.u1') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.duringLesson, false, 'it waits while a lesson is open');
        assert.equal(result.after, true, 'and comes up on the next free page');
        assert.equal(result.seen, '1', 'remembered for this student, this session');
    });

    test('waits while another popup is open', async () => {
        const { result } = await screen({
            entry: entry('/'), api, script: `
                const other = document.createElement('div');
                other.setAttribute('role', 'dialog'); other.setAttribute('aria-modal', 'true'); other.setAttribute('aria-label', 'Something else');
                document.body.appendChild(other);
                await sleep(1800);
                const underPopup = ${SHOWN};
                other.remove(); await sleep(1500);
                return { underPopup, after: ${SHOWN} };` });
        assert.equal(result.underPopup, false);
        assert.equal(result.after, true);
    });
});
