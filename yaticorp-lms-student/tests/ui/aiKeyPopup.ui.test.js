/**
 * The Gemini key popup (2026-11-02): after an answer spends the platform's
 * free AI credits (the server's X-AI-Credits: platform header) it offers the
 * student's own key — once per sign-in, and never while they are busy; when
 * the credits are spent it opens at once. The key box first, then the three
 * steps; it must fit a phone and a laptop.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { screen, srcFile, skipWithoutStyles, DEVICES, ROOT } from './harness.js';

const SHOTS = process.env.UI_SHOTS || '';
const files = Object.fromEntries(['step1.svg', 'step2.svg', 'step3.svg'].map((f) => [`/illustrations/ai-key/${f}`, fs.readFileSync(path.join(ROOT, 'public', 'illustrations', 'ai-key', f), 'utf8')]));

const api = `
window.__calls = [];
export default {
  get: () => Promise.resolve({ data: {} }),
  put: (url, body) => { window.__calls.push(['PUT', url, body]); return Promise.resolve({ data: { hasKey: true } }); },
  post: () => Promise.resolve({ data: {} }), delete: () => Promise.resolve({ data: {} })
};`;

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Dialog from '${srcFile('components/GeminiExhaustedDialog.jsx')}';
import { flagAiExhausted } from '${srcFile('utils/aiExhausted.js')}';
window.__flag = flagAiExhausted;
localStorage.setItem('studentToken', 'token-of-the-first-sign-in');
localStorage.removeItem('yati.aiKeyNudge');
createRoot(document.getElementById('root')).render(<MemoryRouter><main className="min-h-screen bg-slate-50 p-4"><h1>Career Path</h1><input aria-label="Notes" /></main><Dialog /></MemoryRouter>);`;

// What the script measures: the popup on screen, its key box and its close button inside the screen.
const MEASURE = `
const fits = () => {
  const d = $('[role=dialog]');
  if (!d) return null;
  const r = d.getBoundingClientRect();
  const box = (el) => el && el.getBoundingClientRect();
  const keyBox = box($('#gemini-new-key'));
  const closeBtn = box([...d.querySelectorAll('button')].find((b) => /Maybe later|Close/.test(b.innerText)));
  return { inside: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1,
    keyVisible: !!keyBox && keyBox.bottom <= innerHeight && keyBox.top >= 0,
    closeVisible: !!closeBtn && closeBtn.bottom <= innerHeight,
    sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, width: Math.round(r.width) };
};`;

describe('the Gemini key popup', { skip: skipWithoutStyles }, () => {
    test('on a phone: after free credits are used, once per sign-in, not while typing; key box and close in view', async () => {
        const { result, errors } = await screen({ entry, api, files, styles: true, device: DEVICES.galaxyA55, budget: 15000,
            screenshot: SHOTS && path.join(SHOTS, 'ai-key-phone.png'), script: `
            ${MEASURE}
            await sleep(300);
            // Busy: the cursor in a field. The note waits.
            $('input[aria-label=Notes]').focus();
            window.__flag({ headers: { 'x-ai-credits': 'platform' }, data: {} });
            await sleep(1200);
            const whileTyping = !!$('[role=dialog]');
            $('input[aria-label=Notes]').blur();
            await sleep(1000);
            const shown = $('[role=dialog]') ? $('[role=dialog]').innerText : '';
            const layout = fits();
            // Through the steps: Open, Create, Paste.
            const stepButtons = [...document.querySelectorAll('[aria-label=Steps] button')].map((b) => b.innerText.replace(/\\s+/g, ' ').trim());
            [...document.querySelectorAll('button')].find((b) => /Next step/.test(b.innerText)).click(); await sleep(200);
            const step2 = $('[role=dialog]').innerText;
            [...document.querySelectorAll('button')].find((b) => /Maybe later/.test(b.innerText)).click(); await sleep(300);
            // The same sign-in: not again.
            window.__flag({ headers: { 'x-ai-credits': 'platform' }, data: {} });
            await sleep(1200);
            const again = !!$('[role=dialog]');
            // A new sign-in: once more.
            localStorage.setItem('studentToken', 'token-of-the-next-sign-in');
            window.__flag({ headers: { 'x-ai-credits': 'platform' }, data: {} });
            await sleep(1200);
            const nextSignIn = !!$('[role=dialog]');
            const r = $('[role=dialog]').getBoundingClientRect();
            return { whileTyping, shown, layout, stepButtons, step2, again, nextSignIn, clip: { x: 0, y: 0, width: innerWidth, height: innerHeight } };` });
        assert.deepEqual(errors, []);
        assert.equal(result.whileTyping, false, 'it waits while the student types');
        assert.match(result.shown, /You just used free AI credits/);
        assert.match(result.shown, /Your own AI key/);
        assert.match(result.shown, /How to get a key — 3 steps/);
        assert.match(result.shown, /Open Google AI Studio/);
        assert.deepEqual(result.layout && { ...result.layout, width: undefined }, { inside: true, keyVisible: true, closeVisible: true, sideways: false, width: undefined }, JSON.stringify(result.layout));
        assert.deepEqual(result.stepButtons, ['1 Open', '2 Create', '3 Paste']);
        assert.match(result.step2, /Step 2 of 3\s*Create an API key/i);
        assert.equal(result.again, false, 'once per sign-in');
        assert.equal(result.nextSignIn, true, 'again after the next sign-in');
    });

    test('on a laptop: when the credits are spent it opens at once, and saves the key', async () => {
        const { result, errors } = await screen({ entry, api, files, styles: true, width: 1280, height: 800, script: `
            ${MEASURE}
            await sleep(300);
            window.__flag({ response: { data: { code: 'student-daily-cap', message: 'Daily limit' } } });
            await sleep(300);
            const shown = $('[role=dialog]').innerText;
            const layout = fits();
            [...document.querySelectorAll('[role=dialog] button')].find((b) => b.innerText.trim() === 'Save key').click(); await sleep(200);
            const empty = $('[role=dialog]').innerText;
            const box = $('#gemini-new-key');
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(box, '  AIzaSyTestKey123  ');
            box.dispatchEvent(new Event('input', { bubbles: true })); await sleep(100);
            [...document.querySelectorAll('[role=dialog] button')].find((b) => b.innerText.trim() === 'Save key').click(); await sleep(400);
            return { shown, layout, empty, put: window.__calls[0], done: $('[role=dialog]').innerText };` });
        assert.deepEqual(errors, []);
        assert.match(result.shown, /Today’s free AI credits are used up/);
        assert.match(result.shown, /Close/);
        assert.equal(result.layout.inside, true);
        assert.equal(result.layout.keyVisible, true);
        assert.ok(result.layout.width <= 520, `a neat popup, not the whole width (${result.layout.width}px)`);
        assert.match(result.empty, /Paste the key you copied from Google AI Studio/);
        assert.deepEqual(result.put, ['PUT', '/user/ai-key', { key: 'AIzaSyTestKey123' }]);
        assert.match(result.done, /You’re all set/);
    });

    test('on the smallest phone, a Galaxy Z Fold folded (344px), it still fits', async () => {
        const { result, errors } = await screen({ entry, api, files, styles: true, device: DEVICES.galaxyZFold6Folded, budget: 12000,
            screenshot: SHOTS && path.join(SHOTS, 'ai-key-fold.png'), script: `
            ${MEASURE}
            await sleep(300);
            window.__flag({ response: { data: { code: 'own-key-quota' } } });
            await sleep(400);
            return { ...fits(), clip: { x: 0, y: 0, width: innerWidth, height: innerHeight } };` });
        assert.deepEqual(errors, []);
        assert.equal(result.inside, true);
        assert.equal(result.keyVisible, true);
        assert.equal(result.closeVisible, true);
        assert.equal(result.sideways, false);
    });
});
