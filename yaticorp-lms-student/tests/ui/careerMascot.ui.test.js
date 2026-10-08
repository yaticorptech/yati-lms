/**
 * The Career Path mascot, in a real browser: it lives in the Career Path and
 * nowhere else; walks in once a session, waves and points at the start with
 * its own arm; claps and celebrates a finished step and glides on to the next; answers quizzes; shakes its
 * head at a locked step and points at what unlocks it; scrolls with scrollTo,
 * never scrollIntoView; nudges after ten quiet seconds and sleeps after
 * thirty; reads, watches and thinks with the section on screen; teleports
 * under reduced motion; and never plays two moments at once.
 *
 * Every picture is the real one from public/mascot, and the rig is driven
 * frame by frame — no CSS keyframes from the kit.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { screen, srcFile, skipWithoutChrome, ROOT } from './harness.js';
import { apiModule } from './fixtures.js';

const ASSETS = {};
for (const dir of ['stills', 'raster-parts']) {
    for (const file of readdirSync(path.join(ROOT, 'public', 'mascot', dir)).filter((f) => f.endsWith('.png'))) {
        ASSETS[`/mascot/${dir}/${file}`] = readFileSync(path.join(ROOT, 'public', 'mascot', dir, file));
    }
}

// Headless Chrome's virtual clock runs on while an image decodes off the main
// thread; a loaded image is decoded enough for these screens.
const FAST_DECODE = 'HTMLImageElement.prototype.decode = function () { return Promise.resolve(); };';
const REDUCED = `const realMatch = window.matchMedia.bind(window);
window.matchMedia = (q) => q.includes('prefers-reduced-motion')
  ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : realMatch(q);`;
const ENTERED = "sessionStorage.setItem('yati.careerMascot.entered', '1');";

const TASKS = [
    { _id: 't1', title: 'Write a README', status: 'Pending', learning: 'none', guidance: ['Say what it does'] },
    { _id: 't2', title: 'Sketch a landing page', status: 'Pending', learning: 'none', guidance: ['Hero first'] }
];
// Key order matters: a key is found by `url.includes(key)`, first match wins.
const career = apiModule({
    '/tasks/t1': { ...TASKS[0], status: 'Completed', completedAt: '2026-09-29T10:00:00.000Z' },
    '/tasks/history': [], '/tasks': { tasks: TASKS, day: { status: 'ready' } },
    '/roadmap': null, '/badges': [], '/ai-usage': {}, '/notifications': []
});
const COURSE = {
    course: { _id: 'c1', title: 'Web Basics' },
    modules: [{ _id: 'm1', title: 'Start here', lessons: [{ _id: 'l1', title: 'Welcome', type: 'text' }] }],
    progress: { completedLessons: [], percentage: 0 }
};
const lms = apiModule({
    '/user/settings': {}, '/user/profile': { _id: 'u1', name: 'Bhagyashree', xp: 120, level: 2 },
    '/rewards/summary': { xp: 120, level: { level: 2 } }, '/rewards/events/unseen': { events: [] },
    '/user/announcements': [], '/career/notifications': [], '/jobs/notifications': [], '/career/profile/summary': {},
    '/user/courses/c1': COURSE
});
// The stub replaces the whole module, so the named helpers the pages import
// from it are given here too: the 404-means-none rule and today's plan read.
const careerModule = `${career}
export const noneIfMissing = (promise) => promise.catch(() => null);
export const getTodaysPlan = () => Promise.resolve({ data: routes['/tasks'] });`;
const modules = { 'career/services/api': careerModule };

/** The whole app, as main.jsx mounts it, signed in, at `route`. */
const app = (route, { entered = true } = {}) => `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import App from '${srcFile('App.jsx')}';
import { AuthProvider } from '${srcFile('context/AuthContext.jsx')}';
import MascotProvider from '${srcFile('mascot/MascotProvider.jsx')}';
${FAST_DECODE}
localStorage.setItem('studentToken', 't');
localStorage.setItem('studentData', JSON.stringify({ _id: 'u1', name: 'Bhagyashree' }));
localStorage.setItem('yati.careerMascot.celebrated', '[]');
${entered ? ENTERED : ''}
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['${route}']}><AuthProvider><MascotProvider><App /></MascotProvider></AuthProvider></MemoryRouter>);`;

/** Just the mascot around `body` (JSX) at `route`, with `window.__mascot` to direct it. */
const alone = (body, { route = '/career/planner', entered = true, reduced = false, imports = '' } = {}) => `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import CareerPathMascot from '${srcFile('career/mascot/CareerPathMascot.jsx')}';
import { useMascot, useMascotRegion } from '${srcFile('career/mascot/useMascot.js')}';
${imports}
${FAST_DECODE}
${reduced ? REDUCED : ''}
localStorage.setItem('yati.careerMascot.celebrated', '[]');
${entered ? ENTERED : ''}
function Page() { window.__mascot = useMascot(); return <main style={{ position: 'fixed', inset: 0, overflowY: 'auto' }}>${body}</main>; }
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['${route}']}><CareerPathMascot><Page /></CareerPathMascot></MemoryRouter>);`;

/** Records, from the moment the mascot appears: its stills, states, contexts, lines, spots and x positions. */
const WATCH = `
const log = { stills: [], gestures: [], states: [], contexts: [], lines: [], spots: [], xs: [], ring: false, atPoint: null, walked: false };
let live = null;
for (let i = 0; i < 200 && !(live = document.querySelector('.career-mascot ~ [aria-live]')); i++) await sleep(50);
if (!live) throw new Error('no mascot on the page');
new MutationObserver(() => {
  const text = live.textContent.trim();
  if (text && text !== log.lines[log.lines.length - 1]) log.lines.push(text);
}).observe(live, { childList: true, subtree: true, characterData: true });
new MutationObserver(() => { if (document.querySelector('.career-mascot-ring')) log.ring = true; })
  .observe(document.querySelector('.career-mascot'), { childList: true, subtree: true });
const body = document.querySelector('.career-mascot-body');
for (let i = 0; i < 400 && body.style.visibility === 'hidden'; i++) await sleep(50);
if (body.style.visibility === 'hidden') throw new Error('the mascot never appeared');
const boxOf = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
// Where the mascot decided to stand: its last spot, or where it is.
const xOf = () => Number((body.style.transform.match(/translate3d\\((-?[\\d.]+)px/) || [])[1]);
const yOf = () => Number((body.style.transform.match(/translate3d\\(-?[\\d.]+px, (-?[\\d.]+)px/) || [])[1]);
const spotBox = () => {
  const spot = body.getAttribute('data-mascot-spot');
  const [x, y] = spot ? spot.split(',').map(Number) : [xOf(), yOf()];
  return { left: x, top: y, right: x + body.offsetWidth, bottom: y + body.offsetHeight };
};
const facing = () => body.getAttribute('data-mascot-facing');
const state = () => body.getAttribute('data-mascot-state');
const prev = {};
const note = (key, attr) => {
  const value = body.getAttribute(attr);
  if (value !== prev[key]) { if (value) log[key].push(value); prev[key] = value; }
  if (key === 'gestures' && value === 'point' && !log.atPoint) log.atPoint = { box: spotBox(), facing: facing() };
  if (key === 'states' && value === 'walking') log.walked = true;
};
const noteAll = () => { note('stills', 'data-mascot-still'); note('gestures', 'data-mascot-gesture'); note('states', 'data-mascot-state'); note('contexts', 'data-mascot-context'); };
noteAll();
new MutationObserver(noteAll).observe(body, { attributes: true, attributeFilter: ['data-mascot-still', 'data-mascot-gesture', 'data-mascot-state', 'data-mascot-context'] });
log.xs.push(xOf());
new MutationObserver(() => {
  const x = xOf(); if (x !== log.xs[log.xs.length - 1]) log.xs.push(x);
  const spot = body.getAttribute('data-mascot-spot'); if (spot && spot !== log.spots[log.spots.length - 1]) log.spots.push(spot);
}).observe(body, { attributes: true, attributeFilter: ['style', 'data-mascot-spot'] });
const tick = (title) => $$('button').find((b) => b.getAttribute('aria-label') === 'Mark "' + title + '" as done');`;

const apart = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
const FIXED = (left, top, w = 140, h = 44) => `style={{ position: 'fixed', left: ${left}, top: ${top}, width: ${w}, height: ${h} }}`;

describe('the Career Path mascot', { skip: skipWithoutChrome }, () => {
    // The mascot was taken off the website's pages: it stays on the sign-in
    // pages and the loading screen only. The component itself still works —
    // every test below mounts it directly — so it can be put back.
    test('is not on the Career Path pages or the lesson page any more', async () => {
        for (const route of ['/career/planner', '/learn/c1']) {
            const { result, errors } = await screen({ entry: app(route), api: lms, modules, files: ASSETS, budget: 8000, script: `
await sleep(2500);
return { mascot: !!$('.career-mascot'), lessonMascot: !!$('.mascot-dock') };` });
            assert.deepEqual(errors, [], route);
            assert.deepEqual(result, { mascot: false, lessonMascot: false }, `no mascot on ${route}`);
        }
    });

    test('mounted, it is driven by hand, not by the kit\'s keyframes, and clicks pass through it', async () => {
        const inside = await screen({ entry: alone(''), api: apiModule({}), modules, files: ASSETS, budget: 10000, script: `${WATCH}
await sleep(1200);
const rig = $('.career-mascot-rig svg');
return { hidden: $('.career-mascot').getAttribute('aria-hidden'),
  pointer: getComputedStyle($('.career-mascot')).pointerEvents, keyframes: rig.innerHTML.includes('@keyframes'),
  pivots: rig.querySelectorAll('[data-pivot]').length };` });
        assert.deepEqual(inside.errors, []);
        assert.equal(inside.result.hidden, 'true');
        assert.equal(inside.result.pointer, 'none', 'clicks pass through it');
        assert.equal(inside.result.keyframes, false, 'no baked CSS loops');
        assert.ok(inside.result.pivots >= 15, `${inside.result.pivots} parts`);
    });

    test('the rig is driven frame by frame: in real time the head breathes and the eyes blink, with no keyframes at all', async () => {
        // Real time, through DevTools: headless Chrome's virtual clock freezes animation frames.
        const { result, errors } = await screen({
            entry: alone(''), api: apiModule({}), modules, files: ASSETS, budget: 15000,
            device: { width: 1280, height: 900, dpr: 1, mobile: false }, script: `${WATCH}
await sleep(1500);
const head = document.querySelector('.career-mascot-rig #head');
const eyes = document.querySelector('.career-mascot-rig #eyes');
const heads = new Set(); const eyesSeen = new Set();
for (let i = 0; i < 40; i++) { await sleep(100); heads.add(head.getAttribute('transform')); eyesSeen.add(eyes.getAttribute('transform')); }
const arms = [...document.querySelectorAll('.career-mascot-rig #arm-left, .career-mascot-rig #arm-right')].map((a) => Number((a.getAttribute('transform') || '').match(/rotate\\((-?[\\d.]+)\\)/)?.[1] || 0));
return { heads: heads.size, eyes: eyesSeen.size, arms, keyframes: !!document.querySelector('.career-mascot-rig style') };` });
        assert.deepEqual(errors, []);
        assert.ok(result.heads > 10, `the head took ${result.heads} positions in four seconds`);
        assert.ok(result.eyes > 5, `the eyes took ${result.eyes} positions`);
        assert.ok(result.arms.every((deg) => Math.abs(deg) <= 12), `arms at ${result.arms}`);
        assert.equal(result.keyframes, false);
    });

    test('the first view of the Overview: in from the left, a wave, then over to the quest button to point at it', async () => {
        const { result, errors } = await screen({
            entry: alone(`<a href="#q" data-mascot-target="start-quest" ${FIXED(520, 260, 180)}>Start today's quest</a>`, { route: '/career', entered: false }),
            api: apiModule({}), modules, files: ASSETS, budget: 26000, script: `${WATCH}
await sleep(13000);
return { log, target: boxOf($('[data-mascot-target="start-quest"]')), entered: sessionStorage.getItem('yati.careerMascot.entered'), state: state() };` });
        assert.deepEqual(errors, []);
        const { log, target } = result;
        assert.deepEqual(log.stills, [], 'no pictures: the rig itself waves and points');
        assert.deepEqual(log.gestures, ['wave', 'point']);
        assert.deepEqual(log.lines, ['Start here']);
        assert.ok(log.walked, 'it walked, on its legs');
        assert.ok(log.xs[0] < 0 && log.xs.at(-1) > 0, `in from the left (${log.xs.slice(0, 3)} … ${log.xs.at(-1)})`);
        assert.ok(log.ring, 'a pulse ring around the target');
        const mascot = log.atPoint.box;
        assert.ok(apart(mascot, target), 'beside the button, not on it');
        assert.ok(mascot.left >= target.right + 16 - 1 || mascot.right <= target.left - 16 + 1, '16px clear of it, to one side');
        assert.equal(log.atPoint.facing, (mascot.left + mascot.right) / 2 > (target.left + target.right) / 2 ? 'left' : 'right', 'facing it');
        assert.ok(log.states.includes('pointing'));
        assert.equal(result.entered, '1');
        assert.equal(result.state, 'idle', 'back to idle once the pointing is done');
    });

    // Tall enough that Try again is on screen: the mascot points only at what the student can see.
    const quiz = (grade) => screen({ height: 4200,
        entry: alone('<QuizRunner material={material} onSubmit={async () => window.__grade} submitting={false} />', {
            imports: `import QuizRunner from '${srcFile('career/components/study/QuizRunner.jsx')}';
const material = { _id: 'm1', quiz: ['one', 'two', 'three'].map((n) => ({ question: 'Question ' + n + '?', options: ['Yes ' + n, 'No ' + n] })) };`
        }),
        api: apiModule({}), modules, files: ASSETS, budget: 32000, script: `${WATCH}
window.__grade = ${JSON.stringify(grade)};
// The quiz on screen is thought about first; only then does the student answer.
for (let i = 0; i < 120 && !log.stills.includes('thinking'); i++) await sleep(100);
await sleep(300);
const contextBefore = body.getAttribute('data-mascot-context');
for (const n of ['one', 'two', 'three']) {
  click(new RegExp('Yes ' + n));
  await sleep(50);
  if (!click(/Next question/)) click(/Submit answers/);
  await sleep(100);
}
await sleep(15000);
const retry = find(/Try again/);
return { log, contextBefore, retry: retry ? boxOf(retry) : null, spot: spotBox() };` });

    test('with the quiz on screen it thinks; passed is a jump; failed is sad, then encouraged and pointing at Try again', async () => {
        const passed = await quiz({ passed: true, score: 3, total: 3, results: [0, 1, 2].map(() => ({ correct: true, correctIndex: 0 })) });
        assert.deepEqual(passed.errors, []);
        assert.equal(passed.result.contextBefore, 'thinking', 'the quiz on screen makes it think');
        assert.ok(passed.result.log.stills.includes('thinking'), `${passed.result.log.stills}`);
        assert.ok(passed.result.log.gestures.includes('celebrate'), `${passed.result.log.gestures}`);
        const failed = await quiz({ passed: false, score: 1, total: 3, results: [true, false, false].map((correct) => ({ correct, correctIndex: correct ? 0 : 1 })) });
        assert.deepEqual(failed.errors, []);
        assert.ok(failed.result.log.stills.includes('sad'));
        assert.ok(failed.result.log.gestures.at(-1) === 'point', `${failed.result.log.gestures}`);
        assert.deepEqual(failed.result.log.lines, ["It's okay, let's try again!"]);
        assert.ok(failed.result.retry && apart(failed.result.spot, failed.result.retry), 'beside Try again, not on it');
    });

    test('a locked step pressed: curious, a head shake, then over to what unlocks it', async () => {
        const { result, errors } = await screen({
            entry: alone(`<button data-mascot-target="current-roadmap-position" ${FIXED(200, 260, 120)}>Class 11</button>
<button data-mascot-locked="Class 11" data-mascot-prerequisite="current-roadmap-position" ${FIXED(700, 260, 160)}>Class 12</button>`, { route: '/career/roadmap' }),
            api: apiModule({}), modules, files: ASSETS, budget: 20000, script: `${WATCH}
await sleep(6500);
const seen = log.gestures.length;
const locked = $('[data-mascot-locked]');
locked.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }));
let shook = false;
for (let i = 0; i < 40 && !shook; i++) { await sleep(50); shook = state() === 'reacting'; }
await sleep(7000);
return { shook, gestures: log.gestures.slice(seen), lines: log.lines, spot: spotBox(), target: boxOf($('[data-mascot-target="current-roadmap-position"]')) };` });
        assert.deepEqual(errors, []);
        assert.ok(result.shook, 'a head shake, on the rig');
        assert.deepEqual(result.gestures, ['point']);
        assert.ok(result.lines.includes('Finish Class 11 to unlock this'));
        assert.ok(apart(result.spot, result.target), 'beside the prerequisite');
        assert.ok(Math.abs(result.spot.left - (result.target.right + 16)) < 1 || Math.abs(result.spot.right - (result.target.left - 16)) < 1, '16px beside it');
    });

    test('a target below the fold is left alone: the mascot never scrolls the page', async () => {
        const body = `<div style={{ height: 2400 }} /><button id="deep" style={{ marginLeft: 300 }}>Deep down</button><div style={{ height: 800 }} />`;
        const { result, errors } = await screen({
            entry: alone(body), api: apiModule({}), modules, files: ASSETS, budget: 15000, script: `
window.__into = 0; window.__to = 0;
Element.prototype.scrollIntoView = function () { window.__into += 1; };
const realScrollTo = HTMLElement.prototype.scrollTo;
HTMLElement.prototype.scrollTo = function (...args) { window.__to += 1; return realScrollTo.apply(this, args); };
${WATCH}
await sleep(1500);
window.__mascot.point(document.getElementById('deep'), 'Down here');
await sleep(6000);
const target = boxOf(document.getElementById('deep'));
const scrolled = Math.max(document.scrollingElement.scrollTop, document.querySelector('main')?.scrollTop || 0);
return { into: window.__into, to: window.__to, target, scrolled, vh: innerHeight, log };` });
        assert.deepEqual(errors, []);
        assert.equal(result.into, 0, 'no scrollIntoView');
        assert.equal(result.to, 0, 'no scrollTo either');
        assert.equal(result.scrolled, 0, 'the page is where the student left it');
        assert.ok(result.target.top > result.vh, 'the target is still below the fold');
        assert.ok(!result.log.gestures.includes('point'), 'and is not pointed at from off screen');
    });

    test('ten quiet seconds bring a nudge to the page\'s call to action; thirty, sleep until any input', async () => {
        const { result, errors } = await screen({
            entry: alone(`<button data-mascot-target="start-task" ${FIXED(300, 300, 160)}>Start</button>`),
            api: apiModule({}), modules, files: ASSETS, budget: 60000, script: `${WATCH}
// The page's own entrance points at the task; the nudge is the second pointing.
await sleep(7000);
const afterEnter = log.gestures.length;
for (let i = 0; i < 150 && log.gestures.length === afterEnter; i++) await sleep(100);
const nudgedAt = performance.now();
const nudge = { gestures: log.gestures.slice(afterEnter), lines: [...log.lines] };
let sleptAt = null;
for (let i = 0; i < 400 && !sleptAt; i++) { await sleep(100); if (state() === 'sleeping') sleptAt = performance.now(); }
window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
await sleep(600);
return { nudge, nudgedAt, sleptAt, woken: state() };` });
        assert.deepEqual(errors, []);
        assert.deepEqual(result.nudge.gestures, ['point']);
        assert.ok(result.nudge.lines.includes('Ready for the next step?'));
        assert.ok(result.sleptAt, 'it slept');
        assert.ok(result.sleptAt - result.nudgedAt > 12000, `slept ${Math.round(result.sleptAt - result.nudgedAt)}ms after the nudge`);
        assert.notEqual(result.woken, 'sleeping', 'any input ends the sleep');
    });

    test('with the notes on screen it reads; a playing video is watched; paused with nothing to read, it waits', async () => {
        const { result, errors } = await screen({
            entry: alone(`<Study />`, {
                imports: `function Study() {
  const reading = useMascotRegion('reading');
  return <><div ref={reading} style={{ height: 500, marginTop: 100 }}>notes</div><div style={{ height: 1200 }} /><div id="video" style={{ height: 300 }} /><div style={{ height: 3000 }} /></>;
}`
            }),
            // Real time, through DevTools: contexts come from IntersectionObserver,
            // which only reports on animation frames, and the virtual clock freezes those.
            api: apiModule({}), modules, files: ASSETS, budget: 24000, device: { width: 1280, height: 900, dpr: 1, mobile: false }, script: `${WATCH}
const main = document.querySelector('main');
const ctx = () => body.getAttribute('data-mascot-context');
await sleep(3000);
const reading = ctx();
main.scrollTo({ top: 1650, behavior: 'auto' });
await sleep(1500);
const away = ctx();
window.__mascot.video('playing', document.getElementById('video'));
await sleep(2000);
const watching = ctx();
window.__mascot.video('paused', document.getElementById('video'));
await sleep(2000);
const paused = ctx();
main.scrollTo({ top: 0, behavior: 'auto' });
await sleep(1500);
const back = ctx();
window.__mascot.video('playing', document.getElementById('video'));
await sleep(1500);
const again = ctx();
return { reading, away, watching, paused, back, again };` });
        assert.deepEqual(errors, []);
        assert.equal(result.reading, 'reading', 'the notes on screen');
        assert.equal(result.away, null, 'nothing to read or watch on screen');
        assert.equal(result.watching, 'watching');
        assert.equal(result.paused, 'waiting', 'paused, with nothing else to do');
        assert.equal(result.back, 'reading', 'the notes again, the video still paused');
        assert.equal(result.again, 'watching', 'a playing video comes first');
    });

    test('under reduced motion it never walks, but still gets there and points', async () => {
        const { result, errors } = await screen({
            entry: alone(`<button data-mascot-target="start-task" ${FIXED(300, 260, 160)}>Start</button>`, { reduced: true }),
            api: apiModule({}), modules, files: ASSETS, budget: 15000, script: `${WATCH}
await sleep(7000);
return { log, target: boxOf($('[data-mascot-target="start-task"]')) };` });
        assert.deepEqual(errors, []);
        assert.equal(result.log.walked, false, 'no walking state, ever');
        assert.deepEqual(result.log.gestures, ['point'], 'the pointing still happens');
        assert.ok(apart(result.log.atPoint.box, result.target));
    });

    test('on a phone it keeps to its corner: at rest only head and shoulders show, a target below the fold is not scrolled to, and one on screen is pointed at from just under it', async () => {
        // A real phone screen, in real time: the dock is a layout decision, and the walk is a glide.
        const { result, errors } = await screen({
            entry: alone(`<button id="high" style={{ position: 'absolute', top: 120, left: 16, width: 160, height: 44 }}>Up here</button><div style={{ height: 900 }} /><button data-mascot-target="start-task" style={{ display: 'block', width: '100%', height: 48 }}>Start</button><div style={{ height: 1400 }} />`),
            api: apiModule({}), modules, files: ASSETS, budget: 22000, device: { width: 390, height: 844, dpr: 3, mobile: true }, script: `${WATCH}
// An active student: a key now and then, so the ten-second nudge never comes.
for (let i = 0; i < 3; i++) { await sleep(3000); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' })); }
const target = boxOf($('[data-mascot-target="start-task"]'));
for (let i = 0; i < 2; i++) { await sleep(3000); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' })); }
const rest = { top: yOf(), left: xOf(), h: body.offsetHeight, w: body.offsetWidth };
// A target near the top of the page, which cannot be scrolled down to it: it rises to stand just under it.
window.__mascot.point(document.getElementById('high'), 'Up here');
let upAt = null;
for (let i = 0; i < 100 && !upAt; i++) { await sleep(100); if (body.getAttribute('data-mascot-gesture') === 'point') upAt = spotBox(); }
const high = boxOf(document.getElementById('high'));
const scrolled = Math.max(document.scrollingElement.scrollTop, document.querySelector('main')?.scrollTop || 0);
return { log, target, upAt, high, rest, scrolled, vw: innerWidth, vh: innerHeight, width: body.offsetWidth };` });
        assert.deepEqual(errors, []);
        const { log, target, rest } = result;
        assert.equal(result.width, 96, 'the phone size');
        assert.equal(log.walked, false, 'docked, it never walks');
        // The page's own target is below the fold: not scrolled to, not pointed at.
        // Only the one the test asks for is; the key presses keep the idle nudge away.
        assert.ok(target.top > result.vh, 'the page target starts below the fold');
        assert.equal(result.scrolled, 0, 'the page was never scrolled');
        assert.deepEqual(log.gestures, ['point']);
        const at = log.atPoint.box;
        assert.ok(at.left >= result.vw / 2 || at.right <= result.vw / 2, 'in a corner, not over the middle of the page');
        assert.ok(at.bottom <= result.vh, 'raised to full height while pointing');
        assert.ok(rest.top + rest.h > result.vh + 20, `at rest it sinks: ${Math.round(rest.top + rest.h - result.vh)}px of it below the edge`);
        // 16px inside a safe area that is itself 8px in from the edge.
        assert.ok(rest.left + rest.w >= result.vw - 32 || rest.left <= 32, `and stays in the corner (left ${Math.round(rest.left)})`);
        const { upAt, high } = result;
        assert.ok(upAt, 'it pointed at the high target');
        assert.ok(Math.abs(upAt.top - (high.bottom + 12)) < 2, `it rose to stand just under it (top ${Math.round(upAt.top)}, target bottom ${Math.round(high.bottom)})`);
        assert.ok(upAt.bottom < result.vh - rest.h / 2, 'well above the floor');
        assert.ok(upAt.left >= high.right, 'in the corner away from it');
    });

    test('the workbench at /dev/mascot renders, and its buttons send the mascot real moments', async () => {
        const entry = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import MascotDemo from '${srcFile('pages/dev/MascotDemo.jsx')}';
${FAST_DECODE}
${ENTERED}
localStorage.setItem('yati.careerMascot.celebrated', '[]');
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/dev/mascot']}><MascotDemo /></MemoryRouter>);`;
        const { result, errors } = await screen({ entry, api: apiModule({}), modules, files: ASSETS, budget: 30000, script: `${WATCH}
await sleep(4000);
const before = log.stills.length;
// The student is looking at Try again: the mascot only points at what is on screen.
document.querySelector('[data-mascot-target="retry"]').scrollIntoView({ block: 'center' });
await sleep(500);
click(/^Quiz failed$/);
await sleep(16000);
return { buttons: $$('.dev-panel button').length, stills: log.stills.slice(before), gestures: log.gestures, lines: log.lines, targets: $$('[data-mascot-target]').length };` });
        assert.deepEqual(errors, []);
        assert.ok(result.buttons > 50, `${result.buttons} buttons`);
        assert.ok(result.targets >= 12, `${result.targets} targets on the page`);
        // Sad for the failed quiz; the quiz panel, now on screen, may bring its thinking pose after.
        assert.ok(result.stills.includes('sad'), `${result.stills}`);
        assert.equal(result.gestures.at(-1), 'point', `${result.gestures}`);
        assert.ok(result.lines.includes("It's okay, let's try again!"));
    });

    test('one moment at a time: the next earned one waits out the breath, small talk is dropped, none is cut short', async () => {
        const { result, errors } = await screen({ entry: alone(''), api: apiModule({}), modules, files: ASSETS, budget: 20000, script: `${WATCH}
await sleep(1500);
const starts = [];
new MutationObserver(() => {
  const value = body.getAttribute('data-mascot-still');
  if (value && value !== starts.at(-1)?.[0]) starts.push([value, performance.now()]);
}).observe(body, { attributes: true, attributeFilter: ['data-mascot-still'] });
window.__mascot.react('cheer-jump');
await sleep(100);
window.__mascot.react('thumbs-up');
window.__mascot.quizAnswer(true);
await sleep(9000);
return { starts };` });
        assert.deepEqual(errors, []);
        const [first, second, ...rest] = result.starts;
        assert.equal(first[0], 'cheer-jump');
        assert.equal(second[0], 'thumbs-up');
        assert.deepEqual(rest, [], 'the answer was small talk, and was dropped');
        assert.ok(second[1] - first[1] >= 2900, `${Math.round(second[1] - first[1])}ms apart`);
    });
});
