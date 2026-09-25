/**
 * The wallet popup on a phone.
 *
 * Two things were wrong at 390px and both were measurable: the three tabs
 * needed 401px in one row, so the strip scrolled sideways and drew a scrollbar
 * across the popup; and the two figures in the header were right-aligned in a
 * loose row, which left them ragged — no label lining up with the one beside
 * it. So this test measures widths and edges rather than reading text.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';

// A phone's width, inside the 500px window headless Chrome insists on.
const PHONE = 390;

const WALLET = {
    // available: 0 shows as ₹1,50,000 — format.js adds an OPENING_BALANCE of
    // 150000 to every wallet before it is displayed. That is why the screen
    // reads ₹1,50,000 beside a TOTAL EARNED of ₹0.
    wallet: { available: 0, rewardPoints: 0, currency: 'INR', totalEarned: 0, totalSpent: 0 },
    rewardPointsValue: 0, monetaryEnabled: false,
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
  const tabs = $$('button').filter((b) => /Overview|Transactions|Reward points/.test(b.innerText));
  const strip = tabs[0].parentElement;`;

describe('the wallet popup on a phone', { skip: skipWithoutStyles }, () => {
    test('all three tabs fit, so the strip never scrolls sideways', async () => {
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
        assert.equal(result.count, 3);
        assert.equal(result.scrollW, result.clientW, 'nothing to scroll to, so no scrollbar');
        assert.deepEqual(result.clipped, [], 'and no tab has its name cut off');
        assert.equal(new Set(result.widths).size, 1, `the three share the width evenly, got ${result.widths}`);
        assert.deepEqual(result.labels, ['Overview', 'Transactions', 'Reward points']);
    });

    test('the two figures in the header line up as a pair', async () => {
        const { result, errors } = await screen({
            entry, api, styles: true, width: 500, script: `
                await sleep(800); ${measure}
                // The Overview body has a BALANCE tile of its own, so stay
                // inside the header — the band the heading sits in.
                const head = $$('h2').find((h) => /Wallet/.test(h.innerText)).parentElement.parentElement;
                const cells = Array.from(head.querySelectorAll('p'))
                    .filter((p) => /^(BALANCE|REWARD POINTS)$/i.test(p.innerText.trim()))
                    .map((p) => p.parentElement);
                const values = cells.map((c) => c.querySelector('p:last-child'));
                return {
                    cells: cells.map(r),
                    valueClipped: values.filter((v) => v.scrollWidth > v.clientWidth + 1).map((v) => v.innerText),
                    values: values.map((v) => v.innerText.trim()),
                    phone: r($('#phone'))
                };` });
        assert.deepEqual(errors, []);
        assert.equal(result.cells.length, 2);
        const [a, b] = result.cells;
        assert.equal(a.w, b.w, 'the two cells are the same width');
        assert.ok(b.l > a.r, 'side by side, not overlapping');
        assert.ok(a.l >= result.phone.l && b.r <= result.phone.r, 'both inside the popup');
        assert.deepEqual(result.valueClipped, [], 'and neither figure is cut off');
        assert.deepEqual(result.values, ['₹1,50,000', '0']);
    });

    test('the type is scaled down for a phone, not shrunk for everyone', async () => {
        // The popup was legible but oversized on a phone: a ₹1,50,000 set at
        // 24px, 16px tile padding, and the whole card 866px tall. Making it
        // smaller everywhere would have been the wrong fix, so this checks both
        // widths — small on a phone, unchanged on a desktop.
        const read = `
            await sleep(800);
            const fs = (sel, re) => { const el = $$(sel).find((e) => re.test(e.innerText)); return el ? Math.round(parseFloat(getComputedStyle(el).fontSize)) : null; };
            const tile = $$('#wallet div').find((d) => /TOTAL EARNED/.test(d.innerText) && d.className.includes('rounded-2xl'));
            return { height: Math.round($('#wallet').getBoundingClientRect().height),
                     heading: fs('h2', /Wallet/), balance: fs('p', /1,50,000/),
                     tilePad: Math.round(parseFloat(getComputedStyle(tile).paddingTop)) };`;

        const phone = await screen({ entry, api, styles: true, width: 500, script: read });
        const desk = await screen({ entry, api, styles: true, width: 1400, script: read });
        assert.deepEqual(phone.errors, []);
        assert.deepEqual(desk.errors, []);

        assert.ok(phone.result.balance < desk.result.balance,
            `the balance is smaller on a phone: ${phone.result.balance}px vs ${desk.result.balance}px`);
        assert.ok(phone.result.heading <= desk.result.heading, 'and so is the heading');
        assert.ok(phone.result.tilePad < desk.result.tilePad, 'the tiles are tighter too');
        assert.ok(phone.result.height < desk.result.height,
            `the whole card is shorter: ${phone.result.height}px vs ${desk.result.height}px`);
        assert.ok(phone.result.height <= 780, `and it stays under 780px, was ${phone.result.height}px`);

        // The desktop sizes are the ones that were already right.
        assert.equal(desk.result.balance, 24);
        assert.equal(desk.result.heading, 18);
        assert.equal(desk.result.tilePad, 16);
    });

    test('nothing pushes the popup wider than the phone', async () => {
        const { result, errors } = await screen({
            entry, api, styles: true, width: 500, script: `
                await sleep(800);
                const box = $('#phone');
                const wide = $$('#wallet *').filter((el) => el.getBoundingClientRect().right > box.getBoundingClientRect().right + 1)
                    .map((el) => el.tagName + '.' + String(el.className).slice(0, 40));
                return { overflow: box.scrollWidth - box.clientWidth, wide: wide.slice(0, 5) };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.wide, [], 'no element reaches past the right edge');
        assert.ok(result.overflow <= 0, `nothing to scroll sideways, had ${result.overflow}px`);
    });
});
