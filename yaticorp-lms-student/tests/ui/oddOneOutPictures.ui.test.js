/**
 * Odd One Out in pictures (2026-11-18): four picture cards in a coloured scene,
 * on phone and desktop screens; tapping one shows the secret rule and a fact,
 * and the next round (a different kind of rule) comes on its own.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles, DEVICES } from './harness.js';

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import OddOneOut from '${srcFile('career/components/games/OddOneOut.jsx')}';
createRoot(document.getElementById('root')).render(<MemoryRouter><OddOneOut onExit={() => {}} /></MemoryRouter>);`;

const script = `
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await wait(100); } return null; };
const start = await until(() => [...document.querySelectorAll('button')].find((b) => /start|play/i.test(b.innerText)));
if (!start) return { error: 'no start button' };
start.click();
const group = await until(() => document.querySelector('[aria-label="Which one does not belong?"]'));
if (!group) return { error: 'no cards', text: document.body.innerText.slice(0, 300) };
await wait(600);
const cards = [...group.querySelectorAll('button')];
const rects = cards.map((b) => b.getBoundingClientRect());
const title1 = document.querySelector('.oo-stage span.rounded-full')?.innerText;
group.scrollIntoView({ block: 'start' });
cards[0].click();
await wait(400);
const why = document.querySelector('[aria-live="polite"] button')?.innerText || '';
await until(() => document.querySelector('.oo-stage span.rounded-full')?.innerText !== title1 || !document.querySelector('[aria-live="polite"] button'), 6000);
const title2 = document.querySelector('.oo-stage span.rounded-full')?.innerText;
return {
  sideways: document.documentElement.scrollWidth > innerWidth + 1,
  count: cards.length,
  minSide: Math.round(Math.min(...rects.map((r) => Math.min(r.width, r.height)))),
  inside: rects.every((r) => r.left >= 0 && r.right <= innerWidth + 0.5),
  why, title1, title2
};`;

const SCREENS = { galaxyZFold6Folded: DEVICES.galaxyZFold6Folded, galaxyA55: DEVICES.galaxyA55, desktop: { width: 1280, height: 900, dpr: 1 } };

describe('Odd One Out: picture cards, a new rule every round', { skip: skipWithoutStyles }, () => {
  for (const [name, device] of Object.entries(SCREENS)) {
    test(name, async () => {
      const { result, errors } = await screen({ entry, api: 'export default {};', script, device, styles: true, budget: 30_000, screenshot: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/oo-${name}.png` : null });
      assert.deepEqual(errors, []);
      assert.ok(!result.error, JSON.stringify(result));
      assert.equal(result.sideways, false);
      assert.equal(result.count, 4);
      assert.ok(result.inside);
      assert.ok(result.minSide >= 100, `cards too small: ${result.minSide}`);
      assert.match(result.why, /💡/, 'no rule and fact after the tap');
      assert.notEqual(result.title2, result.title1, 'the next round did not come with a new rule');
    });
  }
});
