/**
 * The rewards moments behave: celebrations are not lost, toasts add up, and
 * the rest of the app hears about course XP.
 *
 *  - Closing a celebration twice (a double click, Escape on top of a click)
 *    dismissed the NEXT one in the queue unseen; and events were marked seen
 *    the moment they were fetched, so a reload with celebrations waiting lost
 *    them. Now each closes once and is marked seen when it is dismissed.
 *  - A screen that celebrated a level itself can mark it seen, and it leaves
 *    the queue here too.
 *  - A lesson-quiz's "+50 XP" was replaced by the lesson's "+10 XP" a moment
 *    later; awards that close together add up in one toast.
 *  - Course XP now says 'yati:progress-changed' (once, not echoed back into a
 *    second refresh), and that event also looks for queued celebrations.
 *  - The wallet card says when it cannot load, and tries again; its sheet has
 *    an id of its own and closes on Android's back button.
 *  - A leaderboard photo that will not load shows the initials.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

const EVENTS = [
    { _id: 'e1', kind: 'badge', title: 'Quiz Master unlocked!', message: '', payload: { emoji: '🧠' } },
    { _id: 'e2', kind: 'level_up', title: 'Level 4 reached!', message: '', payload: { level: 4 } },
    { _id: 'e3', kind: 'streak_milestone', title: '7-Day Streak Achieved!', message: '', payload: { days: 7 } }
];

const provider = (inner = '') => `
import { createRoot } from 'react-dom/client';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import { RewardsProvider } from '${srcFile('context/RewardsContext.jsx')}';
import { useRewards } from '${srcFile('context/useRewards.js')}';
const Mark = () => { const r = useRewards(); return <button id="mark" onClick={() => r.markEventsSeen({ kind: 'level_up', level: 4 })}>mark</button>; };
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { _id: 'u1', name: 'Asha' }, isRewardsEnabled: true }}>
    <RewardsProvider><Mark />${inner}</RewardsProvider>
  </AuthContext.Provider>);`;

const seenPosts = `__calls.filter((c) => c[0] === 'POST' && c[1].includes('/rewards/events/seen')).map((c) => c[2])`;

describe('the rewards moments', { skip: skipWithoutChrome }, () => {
    test('a double close dismisses one celebration, each is marked seen only when dismissed, and one marked elsewhere leaves the queue', async () => {
        const { result, errors } = await screen({
            entry: provider(), api: apiModule({ '/rewards/events/unseen': EVENTS, '/rewards/summary': {} }),
            script: `
                await sleep(600);
                const dialog = () => document.querySelector('[role="dialog"]');
                const first = dialog()?.getAttribute('aria-label');
                const inPortal = dialog()?.parentElement === document.body;
                const seenBefore = ${seenPosts};
                const btn = [...dialog().querySelectorAll('button')].find((b) => /Next|Keep learning/.test(b.innerText));
                btn.click(); btn.click();
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                await sleep(500);
                const second = dialog()?.getAttribute('aria-label');
                const seenAfterOne = ${seenPosts};
                document.getElementById('mark').click();
                await sleep(300);
                const third = dialog()?.getAttribute('aria-label');
                // Android's back button closes the last one.
                window.dispatchEvent(new Event('yati:back', { cancelable: true }));
                await sleep(500);
                return { first, inPortal, seenBefore, second, seenAfterOne, third, after: dialog()?.getAttribute('aria-label') || null, seenAll: ${seenPosts} };` });
        assert.deepEqual(errors, []);
        assert.equal(result.first, 'Quiz Master unlocked!');
        assert.equal(result.inPortal, true, 'rendered at the end of <body>, through the Portal');
        assert.deepEqual(result.seenBefore, [], 'nothing is marked seen just for being fetched');
        assert.equal(result.second, 'Level 4 reached!', 'two clicks and Escape closed one celebration, not two');
        assert.deepEqual(result.seenAfterOne, [{ ids: ['e1'] }]);
        assert.equal(result.third, '7-Day Streak Achieved!', 'the level-up another screen celebrated left the queue');
        assert.deepEqual(result.seenAll, [{ ids: ['e1'] }, { kind: 'level_up', level: 4 }, { ids: ['e3'] }]);
        assert.equal(result.after, null);
    });

    test('awards close together add up in one toast, and course XP tells the app once', async () => {
        const { result, errors } = await screen({
            entry: provider(), api: apiModule({ '/rewards/events/unseen': [], '/rewards/summary': {} }),
            script: `
                await sleep(500);
                const count = (part) => __calls.filter((c) => c[0] === 'GET' && c[1].includes(part)).length;
                let changed = 0;
                window.addEventListener('yati:progress-changed', () => { changed += 1; });
                const before = { summary: count('/rewards/summary'), unseen: count('/events/unseen') };
                window.dispatchEvent(new CustomEvent('yati:rewards', { detail: [{ kind: 'xp', amount: 50 }] }));
                await sleep(300);
                window.dispatchEvent(new CustomEvent('yati:rewards', { detail: [{ kind: 'xp', amount: 10 }, { kind: 'streak', current: 3 }] }));
                await sleep(50);
                const toast = document.querySelector('[role="status"]')?.innerText.trim();
                await sleep(800);
                const afterRewards = { summary: count('/rewards/summary'), unseen: count('/events/unseen'), changed };
                // Progress changed somewhere else (Career Path, the Global Quiz):
                // celebrations queued there are looked for.
                window.dispatchEvent(new CustomEvent('yati:progress-changed'));
                await sleep(800);
                return { toast, before, afterRewards, afterProgress: { summary: count('/rewards/summary'), unseen: count('/events/unseen') } };` });
        assert.deepEqual(errors, []);
        assert.equal(result.toast, '+60 XP · 🔥 3-day streak', 'the second award added to the first');
        assert.equal(result.afterRewards.changed, 2, "each award said 'progress changed' once");
        assert.equal(result.afterRewards.summary - result.before.summary, 2, 'and the provider did not refresh twice for its own announcement');
        assert.equal(result.afterRewards.unseen - result.before.unseen, 1, 'one look for celebrations after the pair');
        assert.equal(result.afterProgress.unseen - result.afterRewards.unseen, 1, 'progress changing elsewhere looks for them too');
        assert.equal(result.afterProgress.summary - result.afterRewards.summary, 1);
    });

    test('the wallet card says when it cannot load and tries again; the sheet has its own id and closes on back', async () => {
        const WALLET = { wallet: { available: 500, currency: 'INR', totalEarned: 40 }, xpBalance: 200, conversion: { pointsPerUnit: 1000, unitValue: 10 }, recent: [], xp: 200, fromXp: 0, xpConverted: 0 };
        const api = `
let n = 0;
window.__calls = [];
export default {
  get: (url) => { window.__calls.push(['GET', url]);
    if (url.includes('/rewards/wallet')) { n += 1; return n === 1 ? Promise.reject({ response: { data: { message: 'The wallet is resting' } } }) : Promise.resolve({ data: ${JSON.stringify(WALLET)} }); }
    return Promise.resolve({ data: { rows: [], total: 0 } }); },
  post: () => Promise.resolve({ data: {} })
};`;
        const entry = `
import { createRoot } from 'react-dom/client';
import WalletCard from '${srcFile('components/rewards/WalletCard.jsx')}';
createRoot(document.getElementById('root')).render(<WalletCard />);`;
        const { result, errors } = await screen({
            entry, api, script: `
                await sleep(500);
                const alert = document.querySelector('[role="alert"]')?.innerText || '';
                [...document.querySelectorAll('button')].find((b) => /Try again/.test(b.innerText)).click();
                await sleep(500);
                const loaded = /Wallet Balance/.test(document.body.innerText);
                [...document.querySelectorAll('button')].find((b) => /View All Transactions/.test(b.innerText)).click();
                await sleep(500);
                const open = !!document.querySelector('[role="dialog"]');
                const ids = { wallet: document.querySelectorAll('#wallet').length, sheet: document.querySelectorAll('#wallet-sheet').length };
                window.dispatchEvent(new Event('yati:back', { cancelable: true }));
                await sleep(300);
                return { alert, loaded, open, ids, closed: !document.querySelector('[role="dialog"]') };` });
        assert.deepEqual(errors, []);
        assert.match(result.alert, /The wallet is resting/);
        assert.match(result.alert, /Try again/);
        assert.equal(result.loaded, true, 'the retry loaded the wallet');
        assert.equal(result.open, true);
        assert.deepEqual(result.ids, { wallet: 1, sheet: 1 }, 'one #wallet (the card), and the sheet under its own id');
        assert.equal(result.closed, true, "Android's back closed the sheet");
    });

    test('a leaderboard photo that will not load shows the initials instead', async () => {
        const entry = `
import { createRoot } from 'react-dom/client';
import LeaderboardPodium from '${srcFile('components/rewards/LeaderboardPodium.jsx')}';
const row = (rank, name, profilePicture) => ({ rank, userId: 'u' + rank, name, profilePicture, xp: 100 * (4 - rank), streak: 1, isMe: false });
createRoot(document.getElementById('root')).render(<LeaderboardPodium podium={[row(1, 'Asha Rao', 'data:image/png;base64,AAAA'), row(2, 'Ben Das', ''), row(3, 'Cy Li', '')]} />);`;
        const { result, errors } = await screen({
            entry, api: apiModule({}), script: `
                await sleep(800);
                return { imgs: document.querySelectorAll('img').length, text: document.body.innerText };` });
        assert.deepEqual(errors, []);
        assert.equal(result.imgs, 0, 'no broken image left on the podium');
        assert.match(result.text, /AR/);
    });
});
