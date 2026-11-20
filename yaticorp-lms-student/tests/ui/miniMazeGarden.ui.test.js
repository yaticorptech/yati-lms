/**
 * Mini Maze Mission, the garden maze (2026-11-18): rabbit, carrot and lions on
 * a hedge maze in a wooden frame, on phone and desktop screens. The board fits
 * the width, the arrow buttons are big, a tap moves the rabbit or says "wall".
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles, DEVICES } from './harness.js';

const entry = (level) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import MiniMazeMission from '${srcFile('career/components/games/MiniMazeMission.jsx')}';
localStorage.setItem('yati:gameLevel:guest', JSON.stringify({ 'mini-maze-mission': ${level} }));
createRoot(document.getElementById('root')).render(<MemoryRouter><MiniMazeMission onExit={() => {}} /></MemoryRouter>);`;

const script = `
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await wait(100); } return null; };
const start = await until(() => [...document.querySelectorAll('button')].find((b) => /start|play/i.test(b.innerText)));
if (!start) return { error: 'no start button' };
start.click();
const board = await until(() => document.querySelector('[aria-label^="Maze,"]'));
if (!board) return { error: 'no board', text: document.body.innerText.slice(0, 300) };
const b = board.getBoundingClientRect();
const text = board.innerText;
const pads = [...document.querySelectorAll('button[aria-label^="Move "]')];
const before = board.getAttribute('aria-label');
pads.forEach((p) => p.click());
await wait(200);
board.scrollIntoView({ block: 'start' });
return {
  sideways: document.documentElement.scrollWidth > innerWidth + 1,
  inside: b.left >= 0 && b.right <= innerWidth + 0.5,
  boardW: Math.round(b.width),
  rabbit: board.querySelectorAll('img[data-piece="rabbit"]').length === 1, carrot: board.querySelectorAll('img[data-piece="carrot"]').length === 1, bee: (text.match(/🐝/gu) || []).length,
  lion: board.querySelectorAll('img[data-piece="lion"]').length, rock: (text.match(/🪨/gu) || []).length, puddle: text.includes('💦'),
  padMin: Math.round(Math.min(...pads.map((p) => p.getBoundingClientRect().width))),
  reacted: board.getAttribute('aria-label') !== before || !!document.querySelector('[role="status"]')?.innerText,
  howToPlay: /HOW TO PLAY/i.test(document.body.innerText)
};`;

const caughtScript = `
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await wait(100); } return null; };
const start = await until(() => [...document.querySelectorAll('button')].find((b) => /start|play/i.test(b.innerText)));
start.click();
await until(() => document.querySelector('[aria-label^="Maze,"]'));
const box = document.querySelector('[aria-label^="Maze,"]').getBoundingClientRect();
const dirs = ['up', 'down', 'left', 'right'];
for (let i = 0; i < 600 && !/Caught!/.test(document.body.innerText); i++) {
  const b = document.querySelector('button[aria-label="Move ' + dirs[Math.floor(Math.random() * 4)] + '"]');
  if (b) b.click();
  await wait(30);
}
await until(() => /Caught!/.test(document.body.innerText), 4000);
return { caught: /Caught!/.test(document.body.innerText), again: [...document.querySelectorAll('button')].some((b) => /again|retry|play/i.test(b.innerText)), ratio: box.height / box.width };`;

describe('Mini Maze Mission: caught by a lion or the bee loses the level', { skip: skipWithoutStyles }, () => {
  test('galaxyA55', async () => {
    const { result, errors } = await screen({ entry: entry(1), api: 'export default {};', script: caughtScript, device: DEVICES.galaxyA55, styles: true, budget: 120_000 });
    assert.deepEqual(errors, []);
    assert.ok(result.caught, 'never caught: ' + JSON.stringify(result));
    assert.ok(result.again, 'no way to play the level again');
    assert.ok(result.ratio > 1.1, 'board not taller on a phone: ' + result.ratio);
  });
});

describe('Mini Maze Mission: the garden maze', { skip: skipWithoutStyles }, () => {
  for (const [name, device] of Object.entries({ galaxyZFold6Folded: DEVICES.galaxyZFold6Folded, galaxyA55: DEVICES.galaxyA55, desktop: { width: 1280, height: 900, dpr: 1 } })) {
    test(name, async () => {
      const { result, errors } = await screen({ entry: entry(12), api: 'export default {};', script, device, styles: true, budget: 25_000, screenshot: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/mm-${name}.png` : null });
      assert.deepEqual(errors, []);
      assert.ok(!result.error, JSON.stringify(result));
      assert.equal(result.sideways, false);
      assert.ok(result.inside, `board off screen: ${JSON.stringify(result)}`);
      assert.ok(result.rabbit && result.carrot, 'rabbit and carrot on the board');
      assert.equal(result.lion, 2, 'two lions');
      assert.equal(result.rock, 1, 'one stone');
      assert.equal(result.bee, 1, 'one bee');
      assert.equal(result.puddle, false, 'no puddles any more');
      assert.ok(result.padMin >= 44, 'arrow buttons too small to tap');
      assert.ok(result.reacted);
    });
  }
});
