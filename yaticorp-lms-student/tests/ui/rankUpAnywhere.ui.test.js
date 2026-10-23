/**
 * The leaderboard climb shows on the page the student is on (asked
 * 2026-10-16: "display in same page where user is there in current ... dont
 * give popup msg only in dashboard").
 *
 * RankUpWatcher is mounted on its own here, at the address of the page being
 * tested, with a board whose answer the script changes: the student's place
 * is stored on the first look, then goes up. A save the page never announced
 * (a forum post) must still bring the climb up; a lesson page shows it once
 * the lesson is done, but not over a playing video; the mock interview page
 * keeps it back.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';

// The board: six students, the one signed in at window.__rank.
const api = `
window.__calls = [];
window.__rank = 5;
const row = (rank) => rank === window.__rank
  ? { rank, name: 'You', xp: 100 - rank * 10, level: 1, streak: 0, userId: 'me1', isMe: true, profilePicture: '' }
  : { rank, name: 'Student ' + rank, xp: 100 - rank * 10, level: 1, streak: 0, userId: 'u' + rank, isMe: false, profilePicture: '' };
export default {
  get: (url, config) => {
    window.__calls.push(['GET', url, config && config.params && config.params.limit]);
    const limit = (config && config.params && config.params.limit) || 10;
    const entries = [1, 2, 3, 4, 5, 6].slice(0, limit).map(row);
    return Promise.resolve({ data: { period: 'weekly', periodKey: 'weekly:2026-W42', total: 6, entries, around: [], me: row(window.__rank) } });
  },
  post: (url) => { window.__calls.push(['POST', url]); return Promise.resolve({ data: {} }); },
  put: (url) => { window.__calls.push(['PUT', url]); return Promise.resolve({ data: {} }); },
  delete: (url) => { window.__calls.push(['DELETE', url]); return Promise.resolve({ data: {} }); }
};`;

// `page` is the address; `lesson` adds what the course player has: Yati kept
// off the page, and a video whose playing the script switches.
const entry = (page, { lesson = false } = {}) => `
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import { RewardsContext } from '${srcFile('context/useRewards.js')}';
import { useHideLoop } from '${srcFile('components/loopVisibility.js')}';
import RankUpWatcher from '${srcFile('components/rewards/RankUpWatcher.jsx')}';
localStorage.clear();
history.replaceState(null, '', '${page}');
window.__playing = false;
function Player() {
  useHideLoop();
  return <video id="v" ref={(v) => { if (v) Object.defineProperty(v, 'paused', { get: () => !window.__playing }); }} />;
}
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthContext.Provider value={{ user: { _id: 'me1', name: 'You' } }}>
      <RewardsContext.Provider value={{ enabled: true, summary: null, refresh: () => {}, celebrate: () => {}, pullEvents: () => {}, markEventsSeen: () => Promise.resolve() }}>
        <main><h1>The page</h1>${lesson ? '<Player />' : ''}</main>
        <RankUpWatcher />
      </RewardsContext.Provider>
    </AuthContext.Provider>
  </BrowserRouter>);`;

// Waits for the first look (2.5 s after opening), which stores place 5.
const SETTLE = `
for (let i = 0; i < 60 && !window.__calls.some((c) => c[0] === 'GET'); i++) await sleep(100);
await sleep(300);
const climb = () => { const d = $('[role="dialog"][aria-labelledby="rank-up-title"]'); return d ? d.innerText.replace(/\\s+/g, ' ') : null; };
const gets = () => window.__calls.filter((c) => c[0] === 'GET').map((c) => c[2]);`;

describe('the leaderboard climb on the page the student is on', { skip: skipWithoutChrome }, () => {
    test('a save the page never announced (a forum post) brings it up right there', async () => {
        const { result, errors } = await screen({
            entry: entry('/community'), api, budget: 20000, script: `
${SETTLE}
const first = { gets: gets(), stored: localStorage.getItem('rw:rank:me1:weekly:2026-W42'), climb: climb() };
window.__rank = 2;
window.dispatchEvent(new CustomEvent('yati:saved', { detail: { url: '/community' } }));
await sleep(4500);
return { first, gets: gets(), climb: climb(), path: location.pathname };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.first, { gets: [3], stored: '5', climb: null }, 'the first look is a quick one, and stores the place');
        assert.deepEqual(result.gets, [3, 3, 500], 'a quick look after the save, then the whole board for the climb');
        assert.match(result.climb || '', /climb/i, 'the climb is on screen');
        assert.equal(result.path, '/community', 'on the page the student was on');
    });

    test('a save that never pays XP does not look, and no climb means only the quick look', async () => {
        const { result, errors } = await screen({
            entry: entry('/jobs'), api, budget: 20000, script: `
${SETTLE}
window.dispatchEvent(new CustomEvent('yati:saved', { detail: { url: '/user/courses/c1/playback' } }));
window.dispatchEvent(new CustomEvent('yati:saved', { detail: { url: '/career/notifications/n1/read' } }));
await sleep(2500);
const afterSkipped = gets();
window.dispatchEvent(new CustomEvent('yati:saved', { detail: { url: '/jobs/applications' } }));
await sleep(2500);
return { afterSkipped, gets: gets(), climb: climb() };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.afterSkipped, [3], 'a video position or a notification read is not looked at');
        assert.deepEqual(result.gets, [3, 3], 'the same place: one quick look, no whole board');
        assert.equal(result.climb, null);
    });

    test('on a lesson page it shows once the lesson is done, but not over a playing video', async () => {
        const { result, errors } = await screen({
            entry: entry('/learn/c1', { lesson: true }), api, budget: 20000, script: `
${SETTLE}
window.__playing = true;
window.__rank = 3;
window.dispatchEvent(new CustomEvent('yati:progress-changed'));
await sleep(3000);
const whilePlaying = climb();
window.__playing = false;
await sleep(2000);
return { whilePlaying, after: climb(), path: location.pathname };` });
        assert.deepEqual(errors, []);
        assert.equal(result.whilePlaying, null, 'not over a playing video');
        assert.match(result.after || '', /climb/i, 'shown on the lesson page once the video stops');
        assert.equal(result.path, '/learn/c1');
    });

    test('two climbs before it shows are one popup, from the place before both', async () => {
        const { result, errors } = await screen({
            entry: entry('/community'), api, budget: 25000, script: `
${SETTLE}
// A level-up celebration is on screen, so the first climb has to wait.
const party = document.createElement('div'); party.setAttribute('role', 'dialog'); party.setAttribute('aria-modal', 'true'); document.body.appendChild(party);
window.__rank = 3;
window.dispatchEvent(new CustomEvent('yati:saved', { detail: { url: '/community' } }));
await sleep(2500);
window.__rank = 2;
window.dispatchEvent(new CustomEvent('yati:saved', { detail: { url: '/user/lessons/l1/quiz/submit' } }));
await sleep(2500);
const behindParty = climb();
party.remove();
await sleep(600);
const tooSoon = climb();
await sleep(2500);
return { behindParty, tooSoon, climb: climb(), stored: localStorage.getItem('rw:rank:me1:weekly:2026-W42') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.behindParty, null, 'not over another popup');
        assert.equal(result.tooSoon, null, 'and not the instant it closes');
        assert.match(result.climb || '', /was #5/, `one climb from the place before both: ${result.climb}`);
        assert.equal(result.stored, '2');
    });

    test('a celebration arriving just after the save holds it back until all is quiet', async () => {
        const { result, errors } = await screen({
            entry: entry('/community'), api, budget: 25000, script: `
${SETTLE}
window.__rank = 4;
window.dispatchEvent(new CustomEvent('yati:saved', { detail: { url: '/community' } }));
await sleep(2000);
window.dispatchEvent(new CustomEvent('yati:rewards', { detail: [{ kind: 'badge' }] }));
await sleep(1500);
const early = climb();
await sleep(2500);
return { early, climb: climb() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.early, null, 'not while rewards are still arriving');
        assert.match(result.climb || '', /climb/i, 'then it shows');
    });

    test('the mock interview page keeps it back', async () => {
        const { result, errors } = await screen({
            entry: entry('/interview/mock/s1'), api, budget: 20000, script: `
${SETTLE}
window.__rank = 1;
window.dispatchEvent(new CustomEvent('yati:saved', { detail: { url: '/interview/sessions/s1/answer' } }));
await sleep(3000);
const during = climb();
history.replaceState(null, '', '/interview/report/s1');
await sleep(2000);
return { during, after: climb() };` });
        assert.deepEqual(errors, []);
        assert.equal(result.during, null, 'not during the interview');
        assert.match(result.after || '', /climb/i, 'on the report once the interview is over');
    });
});
