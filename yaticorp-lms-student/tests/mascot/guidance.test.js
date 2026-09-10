/**
 * The whole guided moment, end to end, without a browser: the mascot appears,
 * walks to a real named element, points at it, waits for the student to
 * actually click it, reacts, and docks.
 *
 * The DOM is stubbed only as far as the target system touches it, so what is
 * being tested is the guidance logic rather than the stub.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

/* ---- The smallest DOM the target system needs ------------------------- */

const elements = new Map();
const listeners = new Map();

const makeEl = (name, rect = { top: 200, left: 300, width: 160, height: 48 }) => {
  const el = {
    name,
    isConnected: true,
    scrollIntoView() {},
    contains: (other) => other === el,
    getBoundingClientRect: () => ({
      ...rect,
      bottom: rect.top + rect.height,
      right: rect.left + rect.width
    })
  };
  elements.set(name, el);
  return el;
};

globalThis.CSS = { escape: (s) => s };
globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
};
globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.window = {
  innerWidth: 1200,
  innerHeight: 800,
  // Reduced motion keeps the scroll settle instant, so the test is not timing.
  matchMedia: () => ({ matches: true }),
  addEventListener() {},
  removeEventListener() {}
};
globalThis.document = {
  hidden: false,
  querySelector(sel) {
    const m = /\[data-[a-z-]+="([^"]+)"\]/.exec(sel);
    const el = m ? elements.get(m[1]) : null;
    return el && el.isConnected ? el : null;
  },
  addEventListener(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
  },
  removeEventListener(type, fn) {
    listeners.get(type)?.delete(fn);
  }
};
/** What a student clicking the element looks like from here. */
const clickOn = (name) => {
  const el = elements.get(name);
  for (const fn of listeners.get('click') || []) fn({ target: el });
};

const { default: mascot, getSnapshot } = await import('../../src/career/components/mascot/mascotBus.js');
const { guide } = await import('../../src/career/components/mascot/mascotScript.js');

const settle = (ms = 30) => new Promise((r) => setTimeout(r, ms));

/* `hold` is how long each step blocks; short here so the test is quick. */
const SCRIPT = (target) => [
  { say: "Let's start here!", ms: 400, hold: 60 },
  { walkTo: target, hold: 80 },
  { point: target, say: 'Click here to begin.', ms: 9000, hold: 60 },
  { waitFor: { target, event: 'click', timeout: 3000 } },
  { react: 'taskStart', hold: 60 },
  { dock: true }
];

test('it starts hidden, costing nothing', () => {
  const s = getSnapshot();
  assert.equal(s.mode, 'hidden');
  assert.equal(s.visible, false);
});

test('a full guided moment: appear, walk, point, wait, react, dock', async () => {
  makeEl('lesson-1');
  const done = guide(SCRIPT('lesson-1'));

  // It appears and speaks.
  await settle(10);
  assert.notEqual(getSnapshot().mode, 'hidden', 'it never appeared');
  assert.match(getSnapshot().message, /start here/);

  // It sets off toward the real element.
  await settle(70);
  const walking = getSnapshot();
  assert.equal(walking.state, 'walking', 'it did not walk');
  assert.equal(walking.anchor, 'lesson-1', 'it walked to nowhere in particular');

  // It arrives, points, and says why.
  await settle(90);
  const pointing = getSnapshot();
  assert.equal(pointing.state, 'pointing');
  assert.equal(pointing.anchor, 'lesson-1');
  assert.match(pointing.message, /Click here/);

  // And now it waits. This is the part that makes it a guide.
  await settle(120);
  assert.equal(getSnapshot().state, 'pointing', 'it stopped waiting on its own');

  // The student acts.
  clickOn('lesson-1');
  await settle(40);
  assert.equal(getSnapshot().state, 'reading', 'it did not react to the click');

  await done;
  assert.equal(getSnapshot().mode, 'docked', 'it never docked afterwards');
  assert.equal(getSnapshot().message, null, 'it was still talking');
});

test('a target that disappears mid-guidance cancels rather than pointing at a hole', async () => {
  makeEl('lesson-2');
  const done = guide(SCRIPT('lesson-2'));
  await settle(80);
  assert.equal(getSnapshot().anchor, 'lesson-2');

  // The card unmounts underneath it, as a route change would do.
  elements.get('lesson-2').isConnected = false;
  await done;
  assert.equal(getSnapshot().mode, 'docked', 'it was left stranded');
});

test('an ignored prompt ends politely instead of pointing forever', async () => {
  makeEl('lesson-3');
  const done = guide([
    { point: 'lesson-3', say: 'Click here.', ms: 9000 },
    { waitFor: { target: 'lesson-3', event: 'click', timeout: 60 } },
    { dock: true }
  ]);
  await settle(30);
  assert.equal(getSnapshot().state, 'pointing');
  await done;
  assert.equal(getSnapshot().mode, 'docked');
});

test('a second script abandons the first, so two cannot run at once', async () => {
  makeEl('lesson-4');
  makeEl('lesson-5');
  guide(SCRIPT('lesson-4'));
  await settle(30);
  const second = guide([{ point: 'lesson-5', say: 'Over here.', ms: 800, hold: 120 }, { dock: true }]);
  await settle(50);
  assert.equal(getSnapshot().anchor, 'lesson-5', 'the first script was still driving');
  await second;
});

test('hiding cancels whatever was in flight', async () => {
  makeEl('lesson-6');
  guide(SCRIPT('lesson-6'));
  await settle(30);
  mascot.hide();
  await settle(60);
  assert.equal(getSnapshot().mode, 'hidden');
});
