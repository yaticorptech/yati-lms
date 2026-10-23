/**
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
    '/user/settings': {}, '/user/profile': { _id: 'u1', name: 'Asha', xp: 120, level: 2 },
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
localStorage.setItem('studentData', JSON.stringify({ _id: 'u1', name: 'Asha' }));
sessionStorage.setItem('yati.careerMascot.entered', '1');
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['${route}']}><AuthProvider><MascotProvider><App /></MascotProvider></AuthProvider></MemoryRouter>);`;

const look = `
const strip = () => [...document.querySelectorAll('a[href^="/career"]')];
const names = () => strip().map((a) => a.innerText.trim()).filter(Boolean);
const games = () => document.querySelectorAll('[data-game]').length;`;

describe('the brain games: the Games section, not Career Path', { skip: skipWithoutChrome }, () => {
    test('Career Path\'s strip has no Games tab any more', async () => {
        const { result, errors } = await screen({ entry: app('/career/badges'), api: lms, modules, budget: 8000, script: `${look}
            await sleep(2500);
            return { names: names(), games: strip().some((a) => a.getAttribute('href') === '/career/games') };` });
        assert.deepEqual(errors, []);
        assert.ok(result.names.includes('Rewards'), `the strip is there (${result.names.join(', ')})`);
        assert.equal(result.games, false, 'no Games tab');
        assert.ok(!result.names.includes('Games'));
    });

    test('/games opens the brain games; the old /career/games address goes there', async () => {
        const { result, errors } = await screen({ entry: app('/career/games'), api: lms, modules, budget: 8000, script: `${look}
            await sleep(3000);
            return { games: games(), where: location.pathname };` });
        assert.deepEqual(errors, []);
        assert.ok(result.games >= 40, `the brain games are on the page (${result.games})`);
    });
});

describe('Games on a phone', { skip: skipWithoutStyles }, () => {
    test('the banner line, the stars note and a game\'s tagline and goal are left out on a phone, and kept on a laptop', async () => {
        // The page, then a game's "Ready?" screen (Sequence Recall's).
        const script = `
            await sleep(3000);
            const line = (re) => [...document.querySelectorAll('p')].find((p) => re.test(p.textContent));
            const shown = (el) => !!el && el.getClientRects().length > 0;
            const banner = line(/Where every challenge makes you/), stars = line(/Your level and stars in each game/);
            const page = { banner: shown(banner), bannerThere: !!banner, stars: shown(stars), starsThere: !!stars };
            const card = document.querySelector('[data-game="sequence-recall"]');
            (card.matches('button') ? card : card.querySelector('button')).click();
            await sleep(1500);
            const tagline = line(/Repeating a sequence back is how every skill starts/);
            const goal = [...document.querySelectorAll('span')].find((el) => /^Repeat a run of \\d+ to clear this level\\.$/.test(el.textContent));
            return { ...page, tagline: shown(tagline), taglineThere: !!tagline, goal: shown(goal), goalThere: !!goal };`;
        const phone = await screen({ entry: app('/games'), api: lms, modules, styles: true, budget: 9000, device: DEVICES.galaxyZFold6Folded, script });
        const laptop = await screen({ entry: app('/games'), api: lms, modules, styles: true, budget: 9000, width: 1366, height: 900, script });
        for (const k of ['bannerThere', 'starsThere', 'taglineThere', 'goalThere']) assert.equal(phone.result[k], true, `${k}: rendered`);
        assert.equal(phone.result.banner, false, 'phone: no "Where every challenge makes you sharper…"');
        assert.equal(phone.result.stars, false, 'phone: no "Your level and stars in each game are saved…"');
        assert.equal(phone.result.tagline, false, 'phone: no "Repeating a sequence back is how every skill starts."');
        assert.equal(phone.result.goal, false, 'phone: no "Repeat a run of 3 to clear this level."');
        for (const k of ['banner', 'stars', 'tagline', 'goal']) assert.equal(laptop.result[k], true, `laptop: ${k} is there`);
    });
});
