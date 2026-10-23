/**
 * Where "A new Global Quiz is live" comes up. At the top right on every page —
 * except My Profile, where that corner is Edit Profile's and the notice sat
 * right over it (found 2026-10-22). There it comes up at the bottom, above the
 * phone's bottom bar.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const api = apiModule({ '/user/quizzes/global/live': { quiz: { id: 'q1', title: 'Weekly general knowledge', publishedAt: '2026-10-22', attempted: false, closed: false } } });

const at = (route) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import GlobalQuizAlert from '${srcFile('components/GlobalQuizAlert.jsx')}';
localStorage.clear();
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { _id: 'u1', name: 'A Student' }, isGlobalQuizEnabled: true }}>
    <MemoryRouter initialEntries={['${route}']}><GlobalQuizAlert /></MemoryRouter>
  </AuthContext.Provider>);`;

// Animations do not run to their end under the harness clock, so the fade-in
// would be measured from its starting offset: measured where it comes to rest.
const READ = `
  const still = document.createElement('style'); still.textContent = '*{animation:none!important}'; document.head.appendChild(still);
  await sleep(1200);
  const n = [...document.querySelectorAll('[role=status]')].find((e) => e.innerText.includes('A new Global Quiz is live'));
  if (!n) return null;
  const r = n.getBoundingClientRect();
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), right: Math.round(r.right), H: innerHeight, W: document.documentElement.clientWidth };`;

describe('the Global Quiz notice', { skip: skipWithoutStyles }, () => {
    for (const [width, label] of [[1280, 'a laptop'], [500, 'a phone']]) {
        test(`on ${label}: at the top on other pages, at the bottom on My Profile`, async () => {
            const home = await screen({ entry: at('/'), api, styles: true, width, height: 900, budget: 15_000, script: READ });
            const profile = await screen({ entry: at('/profile'), api, styles: true, width, height: 900, budget: 15_000, script: READ });
            assert.deepEqual(home.errors, []);
            assert.deepEqual(profile.errors, []);
            assert.ok(home.result && home.result.top < 120, `top elsewhere: ${JSON.stringify(home.result)}`);
            assert.ok(profile.result, 'it still shows on My Profile');
            assert.ok(profile.result.top > profile.result.H / 2, `bottom half on My Profile: ${JSON.stringify(profile.result)}`);
            // Clear of the phone's bottom bar (6rem), and in the corner on a laptop.
            const gap = profile.result.H - profile.result.bottom;
            if (width < 1024) assert.ok(gap >= 96, `above the bottom bar: ${gap}px`);
            else assert.ok(gap >= 20 && gap <= 30, `in the bottom corner: ${gap}px`);
        });
    }
});
