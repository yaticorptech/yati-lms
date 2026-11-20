/**
 * Treasure Path for Young Thinkers (2026-11-18): an ancient map with a trail of
 * landmarks and a riddle at each. A right answer walks the explorer on; on phone
 * and desktop screens the map and the answers fit; the in-game How to play is
 * left out on a phone for this section.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutStyles, DEVICES } from './harness.js';

const entryFor = (band) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { setAgeBand } from '${srcFile('career/components/games/levels.js')}';
import TreasurePath from '${srcFile('career/components/games/TreasurePath.jsx')}';
setAgeBand({ minDifficulty: 1, maxDifficulty: 1, maxStep: 24 }, '${band}');
createRoot(document.getElementById('root')).render(<MemoryRouter><TreasurePath onExit={() => {}} /></MemoryRouter>);`;
const entry = entryFor('foundation');

const script = `
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await wait(100); } return null; };
const start = await until(() => [...document.querySelectorAll('button')].find((b) => /start|play/i.test(b.innerText)));
if (!start) return { error: 'no start button' };
start.click();
const map = await until(() => document.querySelector('[aria-label^="Ancient map"]'));
if (!map) return { error: 'no map', text: document.body.innerText.slice(0, 300) };
const m = map.getBoundingClientRect();
const first = map.getAttribute('aria-label');
// Answer until the explorer moves: try each answer in turn.
let moved = false;
for (let k = 0; k < 4 && !moved; k++) {
  const btns = [...document.querySelectorAll('[aria-label="Answers"] button')];
  const b = btns.find((x) => !x.disabled);
  if (!b) break;
  btns[k]?.click();
  moved = !!(await until(() => map.getAttribute("aria-label") !== first, 8000));
}
map.scrollIntoView({ block: 'start' });
await wait(1500);
const answers = [...document.querySelectorAll('[aria-label="Answers"] button')].map((b) => b.getBoundingClientRect());
const riddleSeen = /Riddle of the/.test(document.body.innerText);
const mapW = map.getBoundingClientRect().width;
const howSeen = /HOW TO PLAY/i.test(document.body.innerText);
// Every riddle on the trail: no answer's words spill out of its button.
let spill = [];
for (let k = 0; k < 12 && document.querySelector('[aria-label="Answers"]'); k++) {
  await wait(700);
  const btns = [...document.querySelectorAll('[aria-label="Answers"] button')];
  btns.forEach((b) => { if (!b.innerText.includes('✓') && b.scrollWidth > b.clientWidth + 1) spill.push(b.innerText); });
  const free = btns.filter((b) => !b.disabled);
  if (!free.length) { await wait(2800); continue; }
  free[0].click();
  await wait(2600);
}

return {
  sideways: document.documentElement.scrollWidth > innerWidth + 1,
  inside: m.left >= 0 && m.right <= innerWidth + 0.5,
  riddle: riddleSeen,
  moved,
  answerMin: answers.length ? Math.round(Math.min(...answers.map((r) => r.height))) : 0,
  howToPlay: howSeen,
  spill, mapShare: mapW / innerWidth
};`;

describe('Treasure Path, Young Thinkers: the ancient-map hunt', { skip: skipWithoutStyles }, () => {
  for (const [name, device] of Object.entries({ galaxyZFold6Folded: DEVICES.galaxyZFold6Folded, galaxyA55: DEVICES.galaxyA55, desktop: { width: 1280, height: 900, dpr: 1 } })) {
    test(name, async () => {
      const { result, errors } = await screen({ entry: name === 'galaxyZFold6Folded' ? entryFor('developing') : entry, api: 'export default {};', script, device, styles: true, budget: 120_000, screenshot: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/th-${name}.png` : null });
      assert.deepEqual(errors, []);
      assert.ok(!result.error && !result.__error, JSON.stringify(result));
      assert.equal(result.sideways, false);
      assert.ok(result.inside, 'map off screen');
      assert.ok(result.riddle, 'no riddle');
      assert.ok(result.moved, 'the explorer did not walk on after a right answer');
      assert.ok(result.answerMin >= 56, 'answers too small to tap');
      if (name !== 'desktop') assert.equal(result.howToPlay, false, 'How to play shown on a phone for Young Thinkers');
      assert.deepEqual(result.spill, [], 'answer text spills out of its button: ' + JSON.stringify(result.spill));
      if (name !== 'desktop') assert.ok(result.mapShare > 0.85, `map too small on a phone: ${result.mapShare}`);
    });
  }
});
