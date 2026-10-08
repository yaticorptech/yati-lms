/**
 * The mascot on screen: the breathing rig at rest, a still for every
 * reaction, and the lesson page's own moments — the greeting, the wink at the
 * primary button, a finished lesson, a graded quiz, a long quiet spell.
 *
 * Every picture is the real one from public/mascot. A still is decoded before
 * it is shown, so a stage served nothing would never react at all.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { screen, srcFile, skipWithoutChrome, skipWithoutStyles, ROOT, DEVICES } from './harness.js';
import { apiModule } from './fixtures.js';

const ASSETS = {};
for (const dir of ['stills', 'raster-parts']) {
    for (const file of readdirSync(path.join(ROOT, 'public', 'mascot', dir)).filter((f) => f.endsWith('.png'))) {
        ASSETS[`/mascot/${dir}/${file}`] = readFileSync(path.join(ROOT, 'public', 'mascot', dir, file));
    }
}

// Headless Chrome's virtual clock keeps running while an image decodes off the
// main thread, so a real decode can take "seconds" of page time and push every
// reaction behind the script's sleeps. The fetch still happens — and stops the
// clock — so a loaded image is decoded enough for these screens.
const FAST_DECODE = 'HTMLImageElement.prototype.decode = function () { return Promise.resolve(); };';

/** Records every reaction the dock shows, in order, once the dock is up. */
const WATCH = `
let stage;
for (let i = 0; i < 80 && !(stage = $('.mascot-dock-body > div')); i++) await sleep(50);
if (!stage) throw new Error('no mascot dock on the page');
const seen = [];
let prev = null;
const note = () => { const r = stage.getAttribute('data-mascot-reaction'); if (r !== prev) { if (r) seen.push(r); prev = r; } };
note();
new MutationObserver(note).observe(stage, { attributes: true, attributeFilter: ['data-mascot-reaction'] });
const showing = () => stage.getAttribute('data-mascot-reaction');`;

const COURSE = (completedLessons = []) => ({
    course: { _id: 'c1', title: 'Web Basics' },
    modules: [{
        _id: 'm1', title: 'Start here',
        lessons: [{ _id: 'l1', title: 'Welcome', type: 'text' }, { _id: 'l2', title: 'Check yourself', type: 'quiz', quizId: 'q1' }]
    }],
    progress: { completedLessons, percentage: completedLessons.length * 50 }
});
const QUIZ = {
    passingScore: 60,
    questions: ['one', 'two', 'three'].map((n) => ({ questionText: `Question ${n}?`, options: [`Yes ${n}`, `No ${n}`] }))
};
// A finished lesson is added to the progress; a submitted quiz gets whatever grade the test set.
const POST = `(url, body) => {
  if (url.includes('/progress/update')) {
    window.__completed = (window.__completed || []).concat(body.lessonId);
    return { progress: { completedLessons: window.__completed, percentage: 50 * window.__completed.length } };
  }
  if (url.includes('/quiz/submit')) return window.__grade;
  return {};
}`;
const lessonApi = (completedLessons) => apiModule({ '/user/courses/c1': COURSE(completedLessons), '/user/lessons/l2/quiz': QUIZ }, POST);

const lessonPage = `
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '${srcFile('context/AuthContext.jsx')}';
import MascotProvider from '${srcFile('mascot/MascotProvider.jsx')}';
import CoursePlayer from '${srcFile('pages/CoursePlayer.jsx')}';
${FAST_DECODE}
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: { name: 'Bhagyashree', profilePicture: '/avatars/girls/1.jpg' }, setUser: () => {} }}>
    <MascotProvider><MemoryRouter initialEntries={['/learn/c1']}>
      <Routes><Route path="/learn/:courseId" element={<CoursePlayer />} /></Routes>
    </MemoryRouter></MascotProvider>
  </AuthContext.Provider>);`;

/** A bare stage the script drives through `window.__react`, counting onDone. */
const bareStage = (before = '') => `
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import MascotStage from '${srcFile('mascot/MascotStage.jsx')}';
${FAST_DECODE}
${before}
window.__done = 0;
function Demo() {
  const [reaction, setReaction] = useState(null);
  window.__react = setReaction;
  return <MascotStage reaction={reaction} onDone={() => { window.__done += 1; setReaction(null); }} />;
}
createRoot(document.getElementById('root')).render(<Demo />);`;
const LOOK = `
const stage = $('#root > div');
const look = () => {
  const [rig, still] = stage.children;
  const img = stage.querySelector('img');
  return { reaction: stage.getAttribute('data-mascot-reaction'), rig: rig.style.opacity, still: still ? still.style.opacity : null,
    fade: still ? getComputedStyle(still).transitionDuration : null, src: img && img.getAttribute('src'), pop: img ? img.className : null, done: window.__done };
};`;

describe('the mascot stage', { skip: skipWithoutChrome }, () => {
    test('rests on the breathing rig, shows a reaction through its fade and hold, then hands back', async () => {
        const { result, errors } = await screen({
            entry: bareStage(), api: apiModule({}), files: ASSETS, script: `${LOOK}
await sleep(500);
const box = stage.getBoundingClientRect();
const rest = { ...look(), layers: stage.querySelectorAll('svg image').length, breathing: !!stage.querySelector('svg style'), width: box.width, height: box.height };
window.__react('cheer-jump');
await sleep(300); const showing = look();
await sleep(1300); const holding = look();
await sleep(300); const leaving = look();
await sleep(300); const after = look();
return { rest, showing, holding, leaving, after };` });
        assert.deepEqual(errors, []);
        const { rest, showing, holding, leaving, after } = result;
        assert.equal(rest.reaction, null);
        assert.equal(rest.rig, '1', 'the rig shows once its layers have loaded');
        assert.ok(rest.layers >= 15, `the rig is drawn from its raster layers (${rest.layers})`);
        assert.ok(rest.breathing, 'the rig breathes');
        assert.equal(rest.width, 200);
        assert.ok(Math.abs(rest.height - (200 * 1408) / 1117) < 1, `keeps 1117/1408 (${rest.height})`);

        assert.equal(showing.reaction, 'cheer-jump');
        assert.equal(showing.src, '/mascot/stills/cheer-jump.png');
        assert.deepEqual([showing.rig, showing.still], ['0', '1'], 'a cross-fade: the rig out, the still in');
        assert.equal(showing.fade, '0.25s');
        assert.equal(showing.pop, 'mascot-stage-pop');
        assert.equal(holding.still, '1', 'still held 1.6s in');
        assert.equal(holding.done, 0);
        assert.deepEqual([leaving.still, leaving.rig, leaving.done], ['0', '1', 0], 'fading back, not yet done');
        assert.equal(after.done, 1, 'onDone once the rig is back');
    });

    test('under reduced motion the rig stands still and a reaction swaps with no fade and no pop', async () => {
        const reduced = `const real = window.matchMedia.bind(window);
window.matchMedia = (q) => q.includes('prefers-reduced-motion')
  ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : real(q);`;
        const { result, errors } = await screen({
            entry: bareStage(reduced), api: apiModule({}), files: ASSETS, script: `${LOOK}
await sleep(500);
const breathing = !!stage.querySelector('svg style');
window.__react('sad');
await sleep(100); const showing = look();
await sleep(1500); const after = look();
return { breathing, showing, after };` });
        assert.deepEqual(errors, []);
        assert.equal(result.breathing, false, 'no breathing loop');
        assert.equal(result.showing.still, '1');
        assert.equal(result.showing.fade, '0s', 'an instant swap');
        assert.equal(result.showing.pop, '', 'no pop');
        assert.deepEqual([result.after.still, result.after.done], ['0', 1], 'held 1.5s, then straight back');
    });
});

// The lesson page no longer has the corner mascot: it is kept only on the
// sign-in pages and the loading screen. The dock itself still works — the
// stage tests above and the corner test below mount it directly.
describe('the lesson page', { skip: skipWithoutChrome }, () => {
    test('has no mascot, and finishing a lesson still works', async () => {
        const { result, errors } = await screen({
            entry: lessonPage, api: lessonApi([]), files: ASSETS, budget: 12000, script: `
await sleep(2600);
const mascot = !!$('.mascot-dock');
const reserved = document.documentElement.hasAttribute('data-mascot-dock');
find(/Mark Complete/).click();
await sleep(1500);
return { mascot, reserved, completed: window.__completed || null };` });
        assert.deepEqual(errors, []);
        assert.equal(result.mascot, false, 'no mascot in the corner');
        assert.equal(result.reserved, false, 'and no space kept for one');
        assert.deepEqual(result.completed, ['l1']);
    });
});

// The dock is no longer mounted anywhere in the app, so the production build
// leaves its stylesheet out; the dock's own CSS is put on the page here.
const DOCK_CSS = JSON.stringify(readFileSync(path.join(ROOT, 'src', 'mascot', 'mascot.css'), 'utf8'));

describe('the mascot\'s corner', { skip: skipWithoutStyles }, () => {
    test('it ducks below a primary button in its corner, and only for an enabled one', async () => {
        const entry = `
import { createRoot } from 'react-dom/client';
{ const style = document.createElement('style'); style.textContent = ${DOCK_CSS}; document.head.appendChild(style); }
import MascotProvider from '${srcFile('mascot/MascotProvider.jsx')}';
import MascotDock from '${srcFile('mascot/MascotDock.jsx')}';
${FAST_DECODE}
createRoot(document.getElementById('root')).render(<MascotProvider><MascotDock />
  <button id="cta" data-mascot-cta style={{ position: 'fixed', right: 60, bottom: 150, width: 120, height: 40 }}>Continue</button>
</MascotProvider>);`;
        const { result, errors } = await screen({
            entry, api: apiModule({}), files: ASSETS, styles: true, width: 1400, height: 1000, script: `
for (let i = 0; i < 80 && !$('.mascot-dock-body > div'); i++) await sleep(50);
await sleep(700);
const body = $('.mascot-dock-body');
const cta = $('#cta');
const look = () => ({ moved: body.style.transform, top: body.firstElementChild.getBoundingClientRect().top, ctaBottom: cta.getBoundingClientRect().bottom });
const behind = look();
cta.disabled = true; await sleep(700); const disabled = look();
cta.disabled = false; cta.style.right = '700px'; await sleep(700); const elsewhere = look();
return { behind, disabled, elsewhere };` });
        assert.deepEqual(errors, []);
        const { behind, disabled, elsewhere } = result;
        assert.match(behind.moved, /^translateY\(\d+px\)$/);
        assert.ok(behind.top >= behind.ctaBottom, `the mascot's top (${behind.top}) must clear the button (${behind.ctaBottom})`);
        assert.equal(disabled.moved, '', 'a disabled button is not worth ducking for');
        assert.equal(elsewhere.moved, '', 'back up once the corner is clear');
    });
});
