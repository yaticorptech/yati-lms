/**
 * The wallet card's Recent Transactions: three rows tall, the rest scrolling
 * inside the card (the account owner's call, 2026-10-05). It used to show the
 * first four and drop the rest.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles, DEVICES } from './harness.js';
import { apiModule } from './fixtures.js';

const txn = (i) => ({
    _id: `t${i}`, type: i % 3 ? 'debit' : 'credit', amount: 10000 + i * 100, status: 'completed',
    source: i % 3 ? 'feature_charge' : 'starting_credit', description: `Transaction number ${i + 1}`,
    createdAt: new Date(Date.now() - i * 3600e3).toISOString()
});
const walletWith = (n) => apiModule({
    '/rewards/wallet': {
        wallet: { available: 150000, rewardPoints: 10, totalEarned: 150000, currency: 'INR' },
        conversion: { pointsPerUnit: 100, unitValue: 10 }, limits: {}, monetaryEnabled: false,
        recent: Array.from({ length: n }, (_, i) => txn(i))
    }
});

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import WalletCard from '${srcFile('components/rewards/WalletCard.jsx')}';
createRoot(document.getElementById('root')).render(<MemoryRouter><div style={{ maxWidth: 560, padding: 12 }}><WalletCard /></div></MemoryRouter>);`;

const MEASURE = `
    await sleep(900);
    const list = $('[data-transactions]');
    const rows = [...list.querySelectorAll('li')];
    const box = list.getBoundingClientRect();
    const visible = rows.filter((r) => { const b = r.getBoundingClientRect(); return b.top >= box.top - 1 && b.bottom <= box.bottom + 1; }).length;
    const before = list.scrollTop;
    list.scrollTop = list.scrollHeight; await sleep(100);
    const last = rows.at(-1).getBoundingClientRect();
    return { rows: rows.length, visible, height: Math.round(box.height), scrolls: list.scrollHeight > list.clientHeight + 1,
             lastReachable: last.bottom <= list.getBoundingClientRect().bottom + 1, moved: list.scrollTop > before,
             sideways: document.documentElement.scrollWidth > innerWidth };`;

describe('the wallet card\'s recent transactions', { skip: skipWithoutStyles }, () => {
    for (const device of [null, DEVICES.galaxyA55]) {
        test(`eight transactions: all listed, three in view, the rest scroll inside${device ? ' (phone)' : ''}`, async () => {
            const { result, errors } = await screen({ entry, api: walletWith(8), styles: true, ...(device ? { device } : { width: 1200, height: 900 }), script: MEASURE });
            assert.deepEqual(errors, []);
            assert.equal(result.rows, 8, 'every transaction is in the list, not just the first four');
            assert.equal(result.visible, 3, `three rows in view, saw ${result.visible}`);
            assert.equal(result.scrolls, true, 'the rest scroll');
            assert.equal(result.moved && result.lastReachable, true, 'down to the last one');
            assert.equal(result.sideways, false);
        });
    }

    test('three or fewer: no scrolling, and the list is only as tall as its rows', async () => {
        const two = await screen({ entry, api: walletWith(2), styles: true, width: 1200, height: 900, script: MEASURE });
        const three = await screen({ entry, api: walletWith(3), styles: true, width: 1200, height: 900, script: MEASURE });
        assert.equal(two.result.scrolls, false);
        assert.equal(three.result.scrolls, false, 'three fit exactly');
        assert.ok(two.result.height < three.result.height, 'two rows make a shorter list than three');
    });
});
