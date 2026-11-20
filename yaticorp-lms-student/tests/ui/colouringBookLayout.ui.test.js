/**
 * Colouring Book (PictureLogic) layout (2026-11-18): the drawing on top, the
 * crayons in tidy rows under it — on a phone and on a desktop — and levels 1–2
 * colour a single thing before the scenes. Built stylesheet, real screens.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles, DEVICES } from './harness.js';

const entry = (level) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import PictureLogic from '${srcFile('career/components/games/PictureLogic.jsx')}';
localStorage.setItem('yati:gameLevel:guest', JSON.stringify({ 'picture-logic': ${level} }));
createRoot(document.getElementById('root')).render(<MemoryRouter><PictureLogic onExit={() => {}} /></MemoryRouter>);`;

const script = `
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await wait(100); } return null; };
const start = await until(() => [...document.querySelectorAll('button')].find((b) => /start|play/i.test(b.innerText)));
if (!start) return { error: 'no start button', text: document.body.innerText.slice(0, 300) };
start.click();
const crayons = await until(() => document.querySelector('[role="radiogroup"][aria-label="Crayons"]'));
if (!crayons) return { error: 'no crayons', text: document.body.innerText.slice(0, 300) };
crayons.scrollIntoView({ block: 'center' });
await wait(100);
const svg = document.querySelector('svg[viewBox="0 0 100 100"]') || [...document.querySelectorAll('svg')].sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
const d = svg.getBoundingClientRect();
const buttons = [...crayons.querySelectorAll('button')].map((b) => b.getBoundingClientRect());
return {
  sideways: document.documentElement.scrollWidth > innerWidth + 1,
  width: innerWidth,
  drawingBottom: d.bottom, drawingW: Math.round(d.width),
  crayonsTop: crayons.getBoundingClientRect().top,
  rows: new Set(buttons.map((r) => Math.round(r.top))).size,
  perRow: buttons.filter((r) => Math.round(r.top) === Math.round(buttons[0].top)).length,
  count: buttons.length,
  minW: Math.round(Math.min(...buttons.map((r) => r.width))),
  inside: buttons.every((r) => r.left >= 0 && r.right <= innerWidth + 0.5),
  badge: document.body.innerText.match(/Colour (.+?) from memory/)?.[1] || null
};`;

const SCREENS = { galaxyZFold6Folded: DEVICES.galaxyZFold6Folded, galaxyA55: DEVICES.galaxyA55, iPadMini: DEVICES.iPadMini, desktop: { width: 1280, height: 900, dpr: 1 } };
const OBJECTS = ['a teddy bear', 'a kitten', 'an owl', 'a bunny', 'a cupcake', 'a ladybird', 'a penguin'];

describe('Colouring Book: drawing on top, crayons in rows below', { skip: skipWithoutStyles }, () => {
  for (const [name, device] of Object.entries(SCREENS)) {
    test(name, async () => {
      const { result, errors } = await screen({ entry: entry(4), api: 'export default {};', script, device, styles: true, budget: 25_000, screenshot: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/cb-${name}.png` : null });
      assert.deepEqual(errors, []);
      assert.ok(!result.error, JSON.stringify(result));
      assert.equal(result.sideways, false, 'page scrolls sideways');
      assert.ok(result.crayonsTop >= result.drawingBottom, `crayons are not under the drawing: ${JSON.stringify(result)}`);
      assert.ok(result.rows >= 1 && result.rows <= 2, `crayons in ${result.rows} rows`);
      assert.ok(result.count <= 8 && result.perRow === Math.min(4, result.count), `want 4 a row: ${result.count} crayons, ${result.perRow} in the first row`);
      assert.ok(result.inside, 'a crayon runs off the screen');
      assert.ok(result.minW >= 44, `crayons too small to tap: ${result.minW}`);
      assert.ok(!OBJECTS.includes(result.badge), `level 4 should be a scene, got ${result.badge}`);
    });
  }

  test('levels 1 and 2 colour a single thing', async () => {
    for (const level of [1, 2]) {
      const { result } = await screen({ entry: entry(level), api: 'export default {};', script, device: DEVICES.galaxyA55, styles: true, budget: 25_000 });
      assert.ok(OBJECTS.includes(result.badge), `level ${level}: ${result.badge}`);
    }
  });
});
