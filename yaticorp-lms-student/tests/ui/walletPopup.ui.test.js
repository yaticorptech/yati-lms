/**
 * The wallet popup on a phone.
 *
 * Measured at 390px rather than read: the tabs share one row evenly and
 * never scroll sideways, and the header's balance fits. (Since 2026-10-26 the
 * wallet has two tabs, Overview and Transactions, and the header shows the
 * balance alone: XP is not wallet money. Since 2026-10-27 the header is the
 * violet band of the Wallet & Rewards card, with the balance shown once.)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';

// A phone's width, inside the 500px window headless Chrome insists on.
const PHONE = 390;

const WALLET = {
    // ₹1,50,000 — the starting credit, which is a real spend-only ledger entry
    // now rather than a figure added on for display — so the header has a
    // long number to fit beside the XP.
    wallet: { available: 150000, spendOnly: 150000, rewardPoints: 0, currency: 'INR', totalEarned: 0, totalSpent: 0 },
    rewardPointsValue: 0, monetaryEnabled: false, xp: 1250,
    conversion: { pointsPerUnit: 100, unitValue: 10 },
    limits: {}, bySource: [], recent: []
};

const api = `
export default {
  get: () => Promise.resolve({ data: ${JSON.stringify(WALLET)} }),
  post: () => Promise.resolve({ data: {} })
};`;

const entry = `
import { createRoot } from 'react-dom/client';
import WalletSection from '${srcFile('components/rewards/WalletSection.jsx')}';
createRoot(document.getElementById('root')).render(
  <div id="phone" style={{ width: ${PHONE}, padding: 8 }}><WalletSection /></div>);`;

const measure = `
  const r = (el) => { const b = el.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) }; };
  const tabs = $$('button').filter((b) => /Overview|Transactions|^\\W*XP$/.test(b.innerText.trim()));
  const strip = tabs[0].parentElement;`;

describe('the wallet popup on a phone', { skip: skipWithoutStyles }, () => {
    test('both tabs fit, so the strip never scrolls sideways', async () => {
        const { result, errors } = await screen({
            entry, api, styles: true, width: 500, script: `
                await sleep(800); ${measure}
                return {
                    count: tabs.length,
                    scrollW: strip.scrollWidth, clientW: strip.clientWidth,
                    widths: tabs.map((b) => Math.round(b.getBoundingClientRect().width)),
                    clipped: tabs.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.innerText.trim()),
                    labels: tabs.map((b) => b.innerText.replace(/[\\n\\t ]+/g, ' ').trim())
                };` });
        assert.deepEqual(errors, []);
        assert.equal(result.count, 2);
        assert.equal(result.scrollW, result.clientW, 'nothing to scroll to, so no scrollbar');
        assert.deepEqual(result.clipped, [], 'and no tab has its name cut off');
        assert.equal(new Set(result.widths).size, 1, `the two share the width evenly, got ${result.widths}`);
        assert.deepEqual(result.labels, ['Overview', 'Transactions'], 'no XP tab');
    });

    test('the header shows the balance once, what was spent, and no XP', async () => {
        const { result, errors } = await screen({
            entry, api, styles: true, width: 500, script: `
                await sleep(800); ${measure}
                const head = $$('h2').find((h) => /Wallet/.test(h.innerText)).parentElement;
                const labels = Array.from(document.querySelectorAll('#wallet-sheet p'))
                    .filter((p) => /^(WALLET BALANCE|BALANCE|XP)$/i.test(p.innerText.trim()));
                const value = labels[0].nextElementSibling;
                return {
                    labels: labels.map((p) => p.innerText.trim()),
                    inHeader: head.contains(labels[0]),
                    cell: r(value),
                    valueClipped: value.scrollWidth > value.clientWidth + 1,
                    value: value.innerText.trim(),
                    head: head.innerText.replace(/\\s+/g, ' '),
                    phone: r($('#phone'))
                };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.labels, ['WALLET BALANCE'], 'the balance once: no second Balance tile below');
        assert.equal(result.inHeader, true);
        assert.ok(result.cell.l >= result.phone.l && result.cell.r <= result.phone.r, 'inside the popup');
        assert.equal(result.valueClipped, false, 'and the figure is not cut off');
        assert.equal(result.value, '₹1,50,000');
        assert.match(result.head, /Spent so far ₹0/);
        assert.doesNotMatch(result.head, /\bXP\b/);
    });

    test('the type is scaled down for a phone, not shrunk for everyone', async () => {
        // The popup was legible but oversized on a phone: a ₹1,50,000 set at
        // 24px, 16px tile padding, and the whole card 866px tall. Making it
        // smaller everywhere would have been the wrong fix, so this checks both
        // widths — small on a phone, unchanged on a desktop.
        const read = `
            await sleep(800);
            const fs = (sel, re) => { const el = $$(sel).find((e) => re.test(e.innerText)); return el ? Math.round(parseFloat(getComputedStyle(el).fontSize)) : null; };
            const head = $$('h2').find((h) => /Wallet/.test(h.innerText)).parentElement;
            return { height: Math.round($('#wallet-sheet').getBoundingClientRect().height),
                     heading: fs('h2', /Wallet/), balance: fs('p', /^₹1,50,000$/),
                     headPad: Math.round(parseFloat(getComputedStyle(head).paddingTop)) };`;

        const phone = await screen({ entry, api, styles: true, width: 500, script: read });
        const desk = await screen({ entry, api, styles: true, width: 1400, script: read });
        assert.deepEqual(phone.errors, []);
        assert.deepEqual(desk.errors, []);

        assert.ok(phone.result.balance < desk.result.balance,
            `the balance is smaller on a phone: ${phone.result.balance}px vs ${desk.result.balance}px`);
        assert.ok(phone.result.heading <= desk.result.heading, 'and so is the heading');
        assert.ok(phone.result.headPad < desk.result.headPad, 'the header is tighter too');
        // (No phone-vs-desktop height comparison any more: without the XP
        // parts the desktop card is short too. The cap below still holds.)
        assert.ok(phone.result.height <= 780, `and it stays under 780px, was ${phone.result.height}px`);

        // The desktop sizes of the violet header (2026-10-27).
        assert.equal(desk.result.balance, 36);
        assert.equal(desk.result.heading, 18);
        assert.equal(desk.result.headPad, 24);
    });

    test('nothing pushes the popup wider than the phone', async () => {
        const { result, errors } = await screen({
            entry, api, styles: true, width: 500, script: `
                await sleep(800);
                const box = $('#phone');
                const wide = $$('#wallet-sheet *').filter((el) => el.getBoundingClientRect().right > box.getBoundingClientRect().right + 1)
                    .map((el) => el.tagName + '.' + String(el.className).slice(0, 40));
                return { overflow: box.scrollWidth - box.clientWidth, wide: wide.slice(0, 5) };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.wide, [], 'no element reaches past the right edge');
        assert.ok(result.overflow <= 0, `nothing to scroll sideways, had ${result.overflow}px`);
    });
});

describe('the wallet card on My Courses', { skip: skipWithoutStyles }, () => {
    // The card in the My Courses banner (HeroWallet): no "View all" button;
    // the whole card opens the wallet (asked 2026-10-27).
    const hero = `
import { createRoot } from 'react-dom/client';
import { RewardsContext } from '${srcFile('context/useRewards.js')}';
import HeroWallet from '${srcFile('components/rewards/HeroWallet.jsx')}';
const value = { enabled: true, summary: { wallet: { available: 147210, totalSpent: 2800, currency: 'INR' } }, refresh: () => {}, celebrate: () => {}, pullEvents: () => {}, markEventsSeen: () => Promise.resolve() };
createRoot(document.getElementById('root')).render(
  <RewardsContext.Provider value={value}><div style={{ width: 360, padding: 24 }}><HeroWallet /></div></RewardsContext.Provider>);`;

    test('there is no View all; a tap anywhere on the card, or Enter, opens the wallet', async () => {
        const { result, errors } = await screen({
            entry: hero, api, styles: true, width: 500, script: `
            await sleep(300);
            const card = $('#wallet button');
            const before = { text: card.innerText.replace(/\\s+/g, ' ').trim(), viewAll: $$('button').some((b) => /View all/i.test(b.innerText)), buttons: $$('#wallet button').length, label: card.getAttribute('aria-label') };
            // A tap on the "Spent so far" figure, not the middle of the card.
            [...card.querySelectorAll('span')].find((s) => /^₹2,800$/.test(s.innerText.trim())).click();
            await sleep(400);
            const opened = !!$('#wallet-sheet');
            window.dispatchEvent(new Event('yati:back', { cancelable: true }));
            await sleep(300);
            const closed = !$('#wallet-sheet');
            card.focus();
            card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            card.click();
            await sleep(400);
            return { before, opened, closed, reopened: !!$('#wallet-sheet') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.before.viewAll, false, 'no View all button');
        assert.equal(result.before.buttons, 1, 'the card itself is the one button');
        assert.match(result.before.text, /Wallet & Rewards Wallet balance ₹1,47,210 Spend it on courses and features SPENT SO FAR ₹2,800/);
        assert.equal(result.before.label, 'Wallet & Rewards: ₹1,47,210 to spend. Open the wallet and its transactions.');
        assert.equal(result.opened, true, 'a tap anywhere opens the wallet popup');
        assert.equal(result.closed, true, 'back closes it');
        assert.equal(result.reopened, true);
    });
});
