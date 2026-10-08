/**
 * Wallet rules on the student's side: a priced feature says its price on its
 * button, "Find Job" pays before it opens a listing (and stays a plain link
 * while free), and a refusal for a short balance reaches the student in the
 * server's own words. The charging itself is the server's, tested there.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule, paper } from './fixtures.js';

const withRules = (walletRules, body, imports) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { RewardsContext } from '${srcFile('context/useRewards.js')}';
${imports}
const value = { enabled: true, summary: { walletRules: ${JSON.stringify(walletRules)}, wallet: { currency: 'INR' } }, refresh: () => {}, celebrate: () => {}, pullEvents: () => {} };
createRoot(document.getElementById('root')).render(
  <RewardsContext.Provider value={value}><MemoryRouter>${body}</MemoryRouter></RewardsContext.Provider>);`;

const JOB = { id: 'j1', title: 'Junior Developer', company: 'Acme', url: 'https://jobs.example.com/j1', score: 80, matched: ['React'], missing: [] };
const card = (walletRules) => withRules(walletRules, `<MatchCard job={${JSON.stringify(JOB)}} />`, `import { MatchCard } from '${srcFile('jobs/CareerMatchTab.jsx')}';`);
// window.open is replaced so nothing really opens; what it was asked to open is kept.
const stubOpen = `window.__opened = []; window.open = () => { const tab = { closed: false, close() { this.closed = true; }, location: { set href(u) { window.__opened.push(u); } } }; return tab; };`;

describe('wallet rules on the student pages', { skip: skipWithoutChrome }, () => {
    test('a priced Find Job says its price and pays before the listing opens', async () => {
        const { result, errors } = await screen({
            entry: card({ find_job: 5 }), api: apiModule({ '/rewards/wallet/spend': { charged: 5 } }), script: `${stubOpen}
await sleep(500);
const link = $$('a').find((a) => /Find Job/.test(a.innerText));
const label = link.innerText.replace(/\\s+/g, ' ').trim();
link.click(); await sleep(400);
return { label, spend: window.__calls.filter((c) => c[0] === 'POST').map((c) => [c[1], c[2]]), opened: window.__opened };` });
        assert.deepEqual(errors, []);
        assert.match(result.label, /Find Job · ₹5/);
        assert.deepEqual(result.spend, [['/rewards/wallet/spend', { action: 'find_job', ref: 'j1' }]]);
        assert.deepEqual(result.opened, ['https://jobs.example.com/j1']);
    });

    test('a free Find Job shows no price and is a plain link, with no payment asked for', async () => {
        const { result, errors } = await screen({
            entry: card({ find_job: 0 }), api: apiModule({}), script: `${stubOpen}
await sleep(500);
const link = $$('a').find((a) => /Find Job/.test(a.innerText));
let defaultPrevented = null;
link.addEventListener('click', (e) => { defaultPrevented = e.defaultPrevented; e.preventDefault(); });
link.click(); await sleep(300);
return { label: link.innerText.trim(), defaultPrevented, posts: window.__calls.filter((c) => c[0] === 'POST').length };` });
        assert.deepEqual(errors, []);
        assert.doesNotMatch(result.label, /₹/);
        assert.equal(result.defaultPrevented, false, 'the link opens the listing itself');
        assert.equal(result.posts, 0);
    });

    test("a short balance on Start quiz is told in the server's words, and the price is on the button", async () => {
        const refusal = `(url) => { if (url.includes('/global/start')) { const e = new Error('402'); e.response = { status: 402, data: { code: 'INSUFFICIENT_FUNDS', message: 'Starting the Global Quiz costs ₹20 from your wallet, and your balance is ₹5.' } }; throw e; } return {}; }`;
        const quizPaper = { ...paper, quiz: { title: 'Weekly GK', timeLimitMinutes: 10 }, attempt: null };
        const { result, errors } = await screen({
            entry: withRules({ start_global_quiz: 20 }, '<GlobalQuiz />', `import GlobalQuiz from '${srcFile('components/GlobalQuiz.jsx')}';`),
            api: apiModule({ '/quizzes/global': quizPaper }, refusal), script: `
await sleep(700);
const btn = $$('button').find((b) => /Start quiz/.test(b.innerText));
const label = btn.innerText.replace(/\\s+/g, ' ').trim();
btn.click(); await sleep(500);
return { label, text: document.body.innerText.replace(/\\s+/g, ' ') };` });
        assert.deepEqual(errors, []);
        assert.match(result.label, /Start quiz · ₹20/);
        assert.match(result.text, /costs ₹20 from your wallet, and your balance is ₹5/);
    });
});
