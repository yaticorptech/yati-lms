/**
 * Light-Up Garden's place-it-back mode (2026-11-18): from level 2 the pictures
 * hide and 4 choices sit under the grid; the student picks one and taps where
 * it was. On real phone screens, with the built stylesheet: nothing runs off
 * the side, the 4 choices sit in one row big enough to tap, and the grid and
 * the choices both fit the width.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles, DEVICES } from './harness.js';

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import LightUpGarden from '${srcFile('career/components/games/LightUpGarden.jsx')}';
localStorage.setItem('yati:gameLevel:guest', JSON.stringify({ 'light-up-garden': 3 }));
createRoot(document.getElementById('root')).render(<MemoryRouter><LightUpGarden onExit={() => {}} /></MemoryRouter>);`;

const script = `
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await wait(100); } return null; };
const start = await until(() => [...document.querySelectorAll('button')].find((b) => /start|play/i.test(b.innerText)));
if (!start) return { error: 'no start button', text: document.body.innerText.slice(0, 300) };
start.click();
const tray = await until(() => document.querySelector('[aria-label="Pictures to place"]'));
if (!tray) return { error: 'no choices tray', text: document.body.innerText.slice(0, 300) };
const choices = [...tray.querySelectorAll('button')].map((b) => b.getBoundingClientRect());
const tiles = [...document.querySelectorAll('button[aria-label^="Tile "]')].map((b) => b.getBoundingClientRect());
// Pick a choice and drop it somewhere: the round must react (placed, or the miss message).
tray.querySelector('button').click();
await wait(200);
const holding = tray.querySelector('button[aria-pressed="true"]') != null;
tray.scrollIntoView({ block: 'end' });
return {
  sideways: document.documentElement.scrollWidth > innerWidth + 1,
  width: innerWidth,
  choices: choices.map((r) => ({ left: r.left, right: r.right, top: Math.round(r.top), w: Math.round(r.width) })),
  tiles: tiles.map((r) => ({ left: r.left, right: r.right, w: Math.round(r.width) })),
  holding
};`;

describe('Light-Up Garden: place it back, on phones', { skip: skipWithoutStyles }, () => {
  for (const [name, device] of Object.entries({ galaxyZFold6Folded: DEVICES.galaxyZFold6Folded, galaxyA55: DEVICES.galaxyA55, iPhone16ProMax: DEVICES.iPhone16ProMax, iPadMini: DEVICES.iPadMini })) {
    test(name, async () => {
      const { result, errors } = await screen({ entry, api: 'export default {};', script, device, styles: true, budget: 25_000, screenshot: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/lug-${name}.png` : null });
      assert.deepEqual(errors, []);
      assert.ok(!result.error, JSON.stringify(result));
      assert.equal(result.sideways, false, 'page scrolls sideways');
      assert.equal(result.choices.length, 4);
      assert.equal(new Set(result.choices.map((c) => c.top)).size, 1, 'the 4 choices sit in one row');
      for (const c of [...result.choices, ...result.tiles]) assert.ok(c.left >= 0 && c.right <= result.width + 0.5, `off screen: ${JSON.stringify(c)}`);
      assert.ok(result.choices.every((c) => c.w >= 44), `choices too small to tap: ${result.choices.map((c) => c.w)}`);
      assert.ok(result.tiles.every((t) => t.w >= 44), `tiles too small: ${result.tiles.map((t) => t.w)}`);
      assert.ok(result.holding, 'picking a choice does not hold it');
    });
  }
});
