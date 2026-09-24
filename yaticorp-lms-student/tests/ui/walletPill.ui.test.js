/**
 * The wallet button in the phone header.
 *
 * The wallet only ever lived in the desktop bar, so on a phone — where most of
 * these students are — it was three taps away, behind the menu and a scroll.
 * Here it is an icon: a phone bar has no room for the figure, and the figure is
 * the first thing on the card the icon opens. The checks are that it fits
 * beside the bell and the menu, that it is big enough to hit, and that the
 * amount still reaches anyone using a screen reader.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';
import { apiModule } from './fixtures.js';

const api = apiModule({
    '/user/announcements': [], '/career/notifications': [], '/jobs/notifications': [],
    '/user/profile': { name: 'Bhagyashree' }, '/career/profile/summary': {},
    // The wallet card fetches its own figures; without this it throws on mount.
    '/rewards/wallet': {
        wallet: { available: 2450, rewardPoints: 10, totalEarned: 100, currency: 'INR' },
        conversion: { pointsPerUnit: 100, unitValue: 10 }, recent: []
    }
});

const entry = (paise) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import { RewardsContext } from '${srcFile('context/useRewards.js')}';
import StudentLayout from '${srcFile('layouts/StudentLayout.jsx')}';
const rewards = { enabled: true, summary: { wallet: { available: ${paise}, currency: 'INR' }, level: { level: 3 }, rewardPoints: 0 },
  refresh: () => {}, celebrate: () => {}, pullEvents: () => {} };
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { name: 'Bhagyashree', cardNumber: 'YC-1029' }, isCreditSystemEnabled: true, isCareerPathEnabled: true, isJobsEnabled: true }}>
    <RewardsContext.Provider value={rewards}>
      <MemoryRouter initialEntries={['/']}>
        <Routes><Route path="/" element={<StudentLayout />}><Route index element={<div style={{ height: 900 }} />} /></Route></Routes>
      </MemoryRouter>
    </RewardsContext.Provider>
  </AuthContext.Provider>);`;


/**
 * The same layout, but with the wallet card far down a tall page — so a click
 * has somewhere to scroll to.
 */
const withWallet = (paise) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import { RewardsContext } from '${srcFile('context/useRewards.js')}';
import StudentLayout from '${srcFile('layouts/StudentLayout.jsx')}';
import WalletCard from '${srcFile('components/rewards/WalletCard.jsx')}';
const rewards = { enabled: true, summary: { wallet: { available: ${paise}, currency: 'INR' }, level: { level: 3 }, rewardPoints: 0 },
  refresh: () => {}, celebrate: () => {}, pullEvents: () => {} };
const Home = () => (<div><div style={{ height: 1600 }} /><WalletCard /><div style={{ height: 800 }} /></div>);
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { name: 'Bhagyashree', cardNumber: 'YC-1029' }, isCreditSystemEnabled: true, isCareerPathEnabled: true, isJobsEnabled: true }}>
    <RewardsContext.Provider value={rewards}>
      <MemoryRouter initialEntries={['/']}>
        <Routes><Route path="/" element={<StudentLayout />}><Route index element={<Home />} /></Route></Routes>
      </MemoryRouter>
    </RewardsContext.Provider>
  </AuthContext.Provider>);`;

const MEASURE = `
    await sleep(900);
    const bar = $$('div').find((d) => String(d.className).includes('md:hidden')
        && String(d.className).includes('fixed') && String(d.className).includes('top-0'));
    const pill = $$('a').find((a) => (a.getAttribute('aria-label') || '').startsWith('Wallet balance'));
    const menu = $$('button').find((b) => b.querySelector('svg.lucide-menu'));
    if (!bar || !pill) return { noBar: !bar, noPill: !pill };
    const b = bar.getBoundingClientRect(), p = pill.getBoundingClientRect();
    const m = menu ? menu.getBoundingClientRect() : null;
    return {
        text: pill.innerText.replace(/\\s+/g, ' ').trim(),
        label: pill.getAttribute('aria-label'),
        href: pill.getAttribute('href'),
        size: Math.round(Math.min(p.width, p.height)),
        insideBar: p.left >= b.left - 0.5 && p.right <= b.right + 0.5 && p.top >= b.top - 0.5 && p.bottom <= b.bottom + 0.5,
        onOneLine: !!(m && Math.abs(Math.round(p.top) - Math.round(m.top)) < 24),
        overlapsMenu: !!(m && p.right > m.left + 0.5),
        pageWidens: document.documentElement.scrollWidth > innerWidth
    };`;

describe('the wallet balance on a phone', { skip: skipWithoutStyles }, () => {
    // 500 is the narrowest viewport headless Chrome honours, and the closest
    // this harness gets to a phone. Naming 360 or 390 here would be a lie: the
    // window would still be 500.
    {
        test('it sits in the header bar, beside the bell and the menu', async () => {
            const { result, errors } = await screen({
                entry: entry(150000), api, width: 500, height: 700, styles: true, budget: 20_000, script: MEASURE });
            assert.deepEqual(errors, []);
            assert.equal(result.noPill, undefined, 'the pill is rendered on a phone');
            assert.ok(result.insideBar, 'and inside the header bar, not spilling out of it');
            assert.ok(result.onOneLine, 'on the same line as the menu button');
            assert.equal(result.overlapsMenu, false, 'without running under it');
            assert.equal(result.pageWidens, false, 'and nothing pushed the page sideways');
        });
    }

    test('it is an icon only, and opens the wallet card', async () => {
        const { result } = await screen({
            entry: entry(2450), api, width: 500, height: 700, styles: true, budget: 20_000, script: MEASURE });
        assert.equal(result.text, '', `no figure is printed on a phone, saw "${result.text}"`);
        assert.equal(result.href, '/#wallet', 'it opens the wallet card on the dashboard');
        assert.ok(result.size >= 36, `the target is ${result.size}px, too small to hit`);
        // format.js adds OPENING_BALANCE (150000) to whatever the ledger holds,
        // so 2,450 earned reads as 1,52,450.
        assert.match(result.label, /1,52,450/,
            `the amount still reaches a screen reader, saw "${result.label}"`);
    });

    test('a large balance changes nothing about the bar', async () => {
        // An icon cannot grow with the figure, which is half the point of it.
        const { result } = await screen({
            entry: entry(100000000), api, width: 500, height: 700, styles: true, budget: 20_000, script: MEASURE });
        assert.ok(result.insideBar, 'it stayed in the bar');
        assert.equal(result.overlapsMenu, false, 'and did not run under the menu button');
        assert.equal(result.pageWidens, false, 'nor widen the page');
        assert.match(result.label, /10,01,50,000/, 'the figure is still in the label');
    });
    test('tapping it scrolls the Wallet & Rewards section into view', async () => {
        // It linked to /#wallet and the layout scrolled with behavior:'smooth'.
        // That call is a no-op in some browsers and webviews — it returns, and
        // nothing moves, so the button looked dead. The layout now checks and
        // jumps there instead when nothing has budged.
        const CLICK = `
            await sleep(1300);
            const main = $('main');
            const icon = $$('a').find((a) => (a.getAttribute('aria-label') || '').startsWith('Wallet balance'));
            icon.click();
            for (let i = 0; i < 14; i++) { await sleep(250); if (main.scrollTop > 0) break; }
            const s = document.getElementById('wallet');
            const r = s.getBoundingClientRect();
            return { scrolled: Math.round(main.scrollTop), sectionTop: Math.round(r.top),
                     inView: r.top >= -2 && r.top < innerHeight };`;
        const { result, errors } = await screen({
            entry: withWallet(2450), api, width: 500, height: 700, styles: true, budget: 25_000, script: CLICK });
        assert.deepEqual(errors, []);
        assert.ok(result.scrolled > 0, 'the page moved');
        assert.ok(result.inView, `the wallet section sat at ${result.sectionTop}px, not on screen`);
    });
});
