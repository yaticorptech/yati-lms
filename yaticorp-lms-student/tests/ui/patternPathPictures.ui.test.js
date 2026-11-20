/**
 * Pattern Path in pictures (2026-11-18): the pattern on its stage (necklace,
 * train or stepping stones) and four big picture choices, on phone and desktop
 * screens; a tap shows what repeats, and the next pattern comes on its own.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles, DEVICES } from './harness.js';

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import PatternPath from '${srcFile('career/components/games/PatternPath.jsx')}';
createRoot(document.getElementById('root')).render(<MemoryRouter><PatternPath onExit={() => {}} /></MemoryRouter>);`;

const script = `
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await wait(100); } return null; };
const start = await until(() => [...document.querySelectorAll('button')].find((b) => /start|play/i.test(b.innerText)));
if (!start) return { error: 'no start button' };
start.click();
const group = await until(() => document.querySelector('[aria-label="What goes in the gap?"]'));
if (!group) return { error: 'no choices', text: document.body.innerText.slice(0, 300) };
await wait(700);
const row = document.querySelector('[aria-label^="Pattern:"]');
const rowRect = row.getBoundingClientRect();
const choices = [...group.querySelectorAll('button')];
const rects = choices.map((b) => b.getBoundingClientRect());
const first = row.getAttribute('aria-label');
document.querySelector('.oo-stage').scrollIntoView({ block: 'start' });
choices[0].click();
await wait(500);
const why = document.querySelector('[aria-live="polite"] button')?.innerText || '';
const moved = await until(() => document.querySelector('[aria-label^="Pattern:"]')?.getAttribute('aria-label') !== first, 6000);
return {
  sideways: document.documentElement.scrollWidth > innerWidth + 1,
  rowInside: rowRect.left >= 0 && rowRect.right <= innerWidth + 0.5,
  count: choices.length,
  minH: Math.round(Math.min(...rects.map((r) => r.height))),
  why, moved: !!moved
};`;

const SCREENS = { galaxyZFold6Folded: DEVICES.galaxyZFold6Folded, galaxyA55: DEVICES.galaxyA55, desktop: { width: 1280, height: 900, dpr: 1 } };

describe('Pattern Path: pictures on a stage, four picture choices', { skip: skipWithoutStyles }, () => {
  for (const [name, device] of Object.entries(SCREENS)) {
    test(name, async () => {
      const { result, errors } = await screen({ entry, api: 'export default {};', script, device, styles: true, budget: 30_000, screenshot: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/pp-${name}.png` : null });
      assert.deepEqual(errors, []);
      assert.ok(!result.error, JSON.stringify(result));
      assert.equal(result.sideways, false);
      assert.ok(result.rowInside, 'the pattern runs off the screen');
      assert.equal(result.count, 4);
      assert.ok(result.minH >= 80, `choices too small: ${result.minH}`);
      assert.ok(result.why.length > 10, 'no explanation after the tap');
      assert.ok(result.moved, 'the next pattern did not come');
    });
  }
});
