/**
 * The Google permission dialog on a phone.
 *
 * The card had no height of its own — only its middle did, capped at a guessed
 * 55vh that bore no relation to the space actually left over. With a real
 * account's permission text the card grew past the top edge of the phone, and
 * because it is anchored to the bottom on a phone, what overflowed went off
 * the *top*, where nothing can scroll to it.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles } from './harness.js';

const LONG = 'A full explanation of exactly what gets written to the account and why it is worth writing, at the length the server really sends. ';

const PERMISSIONS = [
    { key: 'drive', title: 'Keep a copy in your Google Drive', why: LONG, limit: 'We never read the rest of your Drive.' },
    { key: 'calendar', title: 'Put your study plan on your calendar', why: LONG + LONG, limit: LONG },
    { key: 'identity', title: 'Know which account you connected', why: LONG, limit: 'Your email address, and nothing else.' },
    { key: 'drive2', title: 'And one more', why: LONG + LONG, limit: LONG }
];

// This module builds its own axios client, so the shared `api` stub cannot
// reach it and the status call has to be replaced directly.
const googleApi = `
export const getStatus = () => Promise.resolve({ available: true, connected: false, needsReconnect: false, email: '', permissions: ${JSON.stringify(PERMISSIONS)} });
export const beginConnect = () => Promise.resolve({ url: 'https://accounts.google.com/o/oauth2/v2/auth' });
export const disconnect = () => Promise.resolve({});
export const saveFile = () => Promise.resolve({});
export default {};`;

const entry = `
import { createRoot } from 'react-dom/client';
import GoogleConsentDialog from '${srcFile('integrations/google/GoogleConsentDialog.jsx')}';
import { refresh, requestConsent } from '${srcFile('integrations/google/googleStore.js')}';
createRoot(document.getElementById('root')).render(<GoogleConsentDialog />);
refresh(true);
setTimeout(() => { requestConsent('resume'); }, 80);`;

const read = `
  await sleep(700);
  const overlay = $('[role="dialog"]');
  const card = overlay.firstElementChild;
  const c = card.getBoundingClientRect();
  const scroller = $$('[role="dialog"] div').find((x) => x.scrollHeight > x.clientHeight + 1);
  return {
    viewport: window.innerHeight,
    top: Math.round(c.top), bottom: Math.round(c.bottom), height: Math.round(c.height),
    gapBelow: Math.round(window.innerHeight - c.bottom),
    titleSize: (() => { const h = $('#google-consent-title'); return h ? Math.round(parseFloat(getComputedStyle(h).fontSize)) : null; })(),
    aboveScreen: Math.round(Math.max(0, -c.top)),
    belowScreen: Math.round(Math.max(0, c.bottom - window.innerHeight)),
    scrolls: !!scroller,
    // The first permission has to be reachable from the resting position —
    // that is the one that used to be pushed off the top.
    firstVisible: (() => {
        // The element whose own text IS the title, not an ancestor that
        // happens to contain it — an ancestor is as tall as the whole body.
        // innerText is undefined on SVG elements, so guard it.
        const h = $$('*').filter((e) => e.children.length === 0
            && /^Keep a copy in your Google Drive$/.test((e.innerText || '').trim()))[0];
        if (!h) return null;
        const b = h.getBoundingClientRect();
        return b.top >= c.top - 1 && b.bottom <= c.bottom + 1;
    })(),
    buttons: $$('button').map((b) => b.innerText.replace(/\\s+/g, ' ').trim()).filter(Boolean)
  };`;

describe('the Google permission dialog', { skip: skipWithoutStyles }, () => {
    // Four phone heights, including the short ones a browser leaves after its
    // own toolbars have taken their share.
    for (const height of [844, 700, 620, 560]) {
        test(`fits a ${height}px phone with the whole of it reachable`, async () => {
            const { result, errors } = await screen({
                entry, api: 'export default { get: () => Promise.resolve({ data: {} }), post: () => Promise.resolve({ data: {} }) };',
                modules: { 'integrations/google/api': googleApi },
                styles: true, width: 500, height, script: read });
            assert.deepEqual(errors, []);
            assert.equal(result.aboveScreen, 0, 'nothing is pushed off the top, where it could not be scrolled to');
            assert.equal(result.belowScreen, 0, 'and nothing off the bottom');
            assert.ok(result.height < result.viewport,
                `the card leaves a gap rather than filling the screen: ${result.height}px in ${result.viewport}px`);
            assert.ok(result.top > 20, `and it does not sit against the top edge, top was ${result.top}px`);
            assert.ok(result.gapBelow > 20, `nor against the bottom edge, gap was ${result.gapBelow}px`);
            assert.equal(result.scrolls, true, 'the permissions scroll inside it');
            assert.equal(result.firstVisible, true, 'starting at the first one');
            assert.ok(result.buttons.some((b) => /Continue to Google/.test(b)), 'the buttons stay put');
            assert.ok(result.buttons.some((b) => /Not now/.test(b)));
        });
    }
});
