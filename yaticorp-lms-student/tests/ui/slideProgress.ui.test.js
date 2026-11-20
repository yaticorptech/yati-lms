/**
 * Slide to open My progress (2026-11-18): on a phone, a track under the sections; dragged short it springs back,
 * dragged all the way the progress popup opens as a card with its own title bar and a close button.
 * (Setup copied from careerGames.ui.test.js.)
 * The brain games (Brain Boosters): the Games section of the menu (/games)
 * since 2026-10-23, and no longer a tab of Career Path (asked the same day).
 * On a phone the page leaves out a few lines of text.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { screen, srcFile, skipWithoutChrome, skipWithoutStyles, DEVICES } from './harness.js';
import { apiModule } from './fixtures.js';

const career = apiModule({ '/tasks': { tasks: [], day: { status: 'ready' } }, '/roadmap': null, '/badges': [], '/ai-usage': {}, '/notifications': [], '/games/leaderboard': { entries: [] }, '/games': {} });
const lms = apiModule({
    '/user/settings': {}, '/user/profile': { _id: 'u1', name: 'Asha', xp: 120, level: 2, profilePicture: 'https://example.com/a.png' },
    '/rewards/summary': { xp: 120, level: { level: 2 } }, '/rewards/events/unseen': { events: [] },
    '/user/announcements': [], '/career/notifications': [], '/jobs/notifications': [], '/career/profile/summary': {}
});
// The stub replaces the whole module, so the named helpers pages import from it are given too.
const modules = { 'career/services/api': `${career}
export const noneIfMissing = (promise) => promise.catch(() => null);
export const getTodaysPlan = () => Promise.resolve({ data: { tasks: [], day: { status: 'ready' } } });
export const careerWriteCount = () => 0;
export const clearCareerCache = () => {};` };

/** The whole app, signed in, at `route`. */
const app = (route) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import App from '${srcFile('App.jsx')}';
import { AuthProvider } from '${srcFile('context/AuthContext.jsx')}';
import MascotProvider from '${srcFile('mascot/MascotProvider.jsx')}';
localStorage.setItem('studentToken', 't');
localStorage.setItem('studentData', JSON.stringify({ _id: 'u1', name: 'Asha', profilePicture: 'https://example.com/a.png' }));
sessionStorage.setItem('yati.careerMascot.entered', '1');
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['${route}']}><AuthProvider><MascotProvider><App /></MascotProvider></AuthProvider></MemoryRouter>);`;


const script = `
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await wait(100); } return null; };
const knob = await until(() => document.querySelector('[data-slide-progress] [role="slider"]'));
if (!knob) return { error: 'no slider', text: document.body.innerText.slice(0, 300) };
knob.scrollIntoView({ block: 'center' });
await wait(300);
const track = knob.parentElement.getBoundingClientRect();
const k = knob.getBoundingClientRect();
const y = k.top + k.height / 2;
const fire = (type, x) => knob.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch' }));
// Half way: springs back, no popup.
fire('pointerdown', k.left + 20); fire('pointermove', k.left + 20 + (track.width - 56) * 0.5); fire('pointerup', k.left + 20 + (track.width - 56) * 0.5);
await wait(500);
const halfOpen = !!document.querySelector('[role="dialog"][aria-label="My progress"]');
// All the way: the popup opens.
fire('pointerdown', k.left + 20);
for (let i = 1; i <= 10; i++) { fire('pointermove', k.left + 20 + (track.width - 56) * i / 10); await wait(20); }
fire('pointerup', k.left + 20 + track.width);
const dialog = await until(() => document.querySelector('[role="dialog"][aria-label="My progress"]'), 3000);
await wait(500);
const card = dialog?.firstElementChild?.getBoundingClientRect();
return {
  halfOpen, opened: !!dialog,
  close: !!dialog?.querySelector('button[aria-label="Close"]'),
  cardInside: card ? card.left >= 0 && card.right <= innerWidth + 0.5 : false,
  sideways: document.documentElement.scrollWidth > innerWidth + 1
};`;

describe('Games on a phone: slide to open My progress', { skip: skipWithoutStyles }, () => {
  test('galaxyA55', async () => {
    const { result, errors } = await screen({ entry: app('/games?mode=solo'), api: lms, modules, styles: true, budget: 20000, device: DEVICES.galaxyA55, script, screenshot: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/slide-progress.png` : null });
    assert.ok(!result.error, JSON.stringify(result));
    assert.equal(result.halfOpen, false, 'opened on a half slide');
    assert.ok(result.opened, 'a full slide did not open My progress');
    assert.ok(result.close, 'no close button');
    assert.ok(result.cardInside, 'popup card off screen');
    assert.equal(result.sideways, false);
  });
});
