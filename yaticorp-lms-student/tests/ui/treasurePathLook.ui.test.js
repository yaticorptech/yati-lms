/**
 * Treasure Path's island look (2026-11-18): on real phone and desktop screens,
 * with the built stylesheet, the map fits the width, the arrow pad and Go
 * button are big enough to tap, and a card can be added and run.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles, DEVICES } from './harness.js';

const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import TreasurePath from '${srcFile('career/components/games/TreasurePath.jsx')}';
localStorage.setItem('yati:gameLevel:guest', JSON.stringify({ 'treasure-path': 4 }));
createRoot(document.getElementById('root')).render(<MemoryRouter><TreasurePath onExit={() => {}} /></MemoryRouter>);`;

const script = `
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await wait(100); } return null; };
const start = await until(() => [...document.querySelectorAll('button')].find((b) => /start|play/i.test(b.innerText)));
if (!start) return { error: 'no start button' };
start.click();
const map = await until(() => document.querySelector('.tp-map'));
if (!map) return { error: 'no map', text: document.body.innerText.slice(0, 300) };
const pad = [...document.querySelectorAll('button[aria-label^="Add "]')];
pad[3].click(); pad[2].click();
await wait(200);
const cards = document.querySelectorAll('[aria-label="Your program"] button').length;
const goBtn = [...document.querySelectorAll('button')].find((b) => /Go/.test(b.innerText));
const m = map.getBoundingClientRect();
map.scrollIntoView({ block: 'start' });
await wait(150);
return {
  sideways: document.documentElement.scrollWidth > innerWidth + 1,
  mapInside: m.left >= 0 && m.right <= innerWidth + 0.5,
  mapW: Math.round(m.width),
  padMin: Math.round(Math.min(...pad.map((b) => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height)))),
  cards,
  go: goBtn ? Math.round(goBtn.getBoundingClientRect().height) : 0,
  water: getComputedStyle(document.querySelector('.tp-grass-a, .tp-grass-b')).backgroundImage.includes('gradient')
};`;

const SCREENS = { galaxyZFold6Folded: DEVICES.galaxyZFold6Folded, galaxyA55: DEVICES.galaxyA55, desktop: { width: 1280, height: 900, dpr: 1 } };

describe('Treasure Path: the island board', { skip: skipWithoutStyles }, () => {
  for (const [name, device] of Object.entries(SCREENS)) {
    test(name, async () => {
      const { result, errors } = await screen({ entry, api: 'export default {};', script, device, styles: true, budget: 25_000, screenshot: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/tp-${name}.png` : null });
      assert.deepEqual(errors, []);
      assert.ok(!result.error, JSON.stringify(result));
      assert.equal(result.sideways, false, 'page scrolls sideways');
      assert.ok(result.mapInside, `map off screen: ${JSON.stringify(result)}`);
      assert.ok(result.padMin >= 44, `arrow buttons too small: ${result.padMin}`);
      assert.ok(result.go >= 44, 'Go button too small');
      assert.equal(result.cards, 2, 'cards were not added');
      assert.ok(result.water, 'island styles missing');
    });
  }
});
