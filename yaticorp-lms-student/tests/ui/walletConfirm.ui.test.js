/**
 * Ask first (2026-10-28): when the server answers a priced request with its
 * price (428 WALLET_CONFIRM), the student sees "Pay from your wallet?" with the
 * price, the balance and what is left. "Pay" sends the same request again with
 * the price agreed; "Cancel" sends nothing and rejects with a cancellation the
 * pages stay quiet about. Drives the real interceptor (utils/walletCharge) and
 * the real dialog; the HTTP client is a stand-in that records what it is asked.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome } from './harness.js';
import { apiModule } from './fixtures.js';

const entry = `
import { createRoot } from 'react-dom/client';
import WalletConfirmDialog from '${srcFile('components/rewards/WalletConfirmDialog.jsx')}';
import { onWalletError, isWalletCancel } from '${srcFile('utils/walletCharge.js')}';
window.__wc = { onWalletError, isWalletCancel };
createRoot(document.getElementById('root')).render(<WalletConfirmDialog />);`;

// A 428 the way axios hands it over, and a client that records the retry.
const ask = `
window.__sent = [];
const client = { request: (cfg) => { window.__sent.push(cfg); return Promise.resolve({ data: { ok: true }, status: 200, config: cfg }); } };
const error = { config: { url: '/user/resume/ats', method: 'get', headers: { Authorization: 'Bearer t' } },
  response: { status: 428, data: { code: 'WALLET_CONFIRM', action: 'download_resume', label: 'Downloading your resume', amount: 20, balance: 150000, currency: 'INR' } } };
const outcome = window.__wc.onWalletError(error, client).then((r) => ({ ok: r.data.ok }), (e) => ({ cancelled: window.__wc.isWalletCancel(e), message: e.message }));
await sleep(300);
const dialog = document.querySelector('[role="dialog"]');
const text = dialog ? dialog.innerText.replace(/\\s+/g, ' ') : '';
const sentBefore = window.__sent.length;`;

describe('ask before taking wallet money', { skip: skipWithoutChrome }, () => {
    test('shows the price and balance, and Proceed sends the request again with the price agreed', async () => {
        const { result, errors } = await screen({
            entry, api: apiModule({}), script: `${ask}
$$('button').find((b) => b.innerText.trim() === 'Proceed').click();
const done = await outcome; await sleep(200);
return { text, sentBefore, done, sent: window.__sent.map((c) => ({ url: c.url, confirm: c.headers['X-Wallet-Confirm'], auth: c.headers.Authorization })), open: !!document.querySelector('[role="dialog"]') };` });
        assert.deepEqual(errors, []);
        assert.match(result.text, /Pay from your wallet\?/);
        assert.match(result.text, /Downloading your resume costs ₹20/);
        assert.match(result.text, /Wallet balance ₹1,50,000/);
        assert.match(result.text, /Left after ₹1,49,980/);
        assert.equal(result.sentBefore, 0, 'nothing sent before the student answers');
        assert.deepEqual(result.done, { ok: true });
        assert.deepEqual(result.sent, [{ url: '/user/resume/ats', confirm: '20', auth: 'Bearer t' }]);
        assert.equal(result.open, false);
    });

    test('Cancel sends nothing and rejects with a quiet cancellation', async () => {
        const { result, errors } = await screen({
            entry, api: apiModule({}), script: `${ask}
$$('button').find((b) => b.innerText.trim() === 'Cancel').click();
const done = await outcome; await sleep(200);
return { done, sent: window.__sent.length, open: !!document.querySelector('[role="dialog"]') };` });
        assert.deepEqual(errors, []);
        assert.equal(result.done.cancelled, true);
        assert.match(result.done.message, /Nothing was taken from your wallet/);
        assert.equal(result.sent, 0);
        assert.equal(result.open, false);
    });
});
