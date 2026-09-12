/**
 * Where the mascot is allowed to stand. The corner in particular: it used to
 * be computed from the minimum `top` of every fixed band, and a pinned header
 * has a top of zero, so the corner resolved to the top of the screen and the
 * character shot upward every time it docked or left.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const H = 800;
const W = 1200;
let furniture = [];

globalThis.window = { innerWidth: W, innerHeight: H };
globalThis.document = {
  querySelector(sel) {
    return furniture.find((f) => f.sel === sel)?.el || null;
  },
  // Marked furniture is found by the plural form, and there can be more than
  // one of it, so the stub has to answer both.
  querySelectorAll(sel) {
    return furniture.filter((f) => f.sel === sel).map((f) => f.el);
  }
};

const band = (sel, top, height) => ({
  sel,
  el: { getBoundingClientRect: () => ({ top, bottom: top + height, height, left: 0, right: W, width: W }) }
});

const P = await import('../../src/career/components/mascot/mascotPlacement.js');

test('with a pinned header, the corner is at the foot of the screen', () => {
  furniture = [band('header', 0, 64)];
  const spot = P.cornerSpot(98);
  assert.ok(spot.y > H * 0.75, `corner sat at y=${spot.y}, near the top of an ${H}px viewport`);
  assert.ok(spot.y <= H - P.EDGE);
});

test('a bottom navigation bar pushes it up, but only as far as the bar', () => {
  furniture = [band('header', 0, 64), band('nav[aria-label="Main sections"]', H - 90, 76)];
  const spot = P.cornerSpot(66);
  assert.ok(spot.y < H - 90, 'it stood behind the floating navigation');
  assert.ok(spot.y > H * 0.6, `it flew up to y=${spot.y} instead of resting above the bar`);
});

test('with no fixed furniture at all it rests on the bottom edge', () => {
  furniture = [];
  assert.equal(P.cornerSpot(98).y, H - P.EDGE);
});

test('it never leaves the screen, however tall the character', () => {
  furniture = [band('header', 0, 64), band('nav[aria-label="Main sections"]', 40, 700)];
  const spot = P.cornerSpot(300);
  assert.ok(spot.y >= P.EDGE + 300, 'its head went off the top');
  assert.ok(spot.y <= H, 'its feet went off the bottom');
});

test('off stage is beside the screen, not above it', () => {
  furniture = [band('header', 0, 64)];
  const off = P.offStageSpot(98);
  assert.ok(off.x > W, 'it did not leave sideways');
  assert.ok(off.y > H * 0.75, `it left upward, at y=${off.y}`);
});

test('the corner is on the right, clear of the edge', () => {
  furniture = [];
  const spot = P.cornerSpot(98);
  assert.ok(spot.x < W - P.EDGE && spot.x > W * 0.8);
});

/**
 * The phone's top bar. It is a plain div rather than the `<header>` the
 * desktop width uses, and the `<header>` is still in the document at phone
 * width — hidden, so it measures as a zero-height box. Between the two, the
 * character was told there was no top bar at all and walked up behind it.
 */
const AVOID = '[data-mascot-avoid]';

test('a top bar that is not a <header> still blocks the top of the screen', () => {
  furniture = [band(AVOID, 0, 64)];
  const top = P.forbiddenBands().filter((b) => b.side === 'top');
  assert.equal(top.length, 1, 'the phone bar was not seen at all');
  assert.equal(top[0].bottom, 64);
});

test('a hidden bar is not a bar', () => {
  // The desktop <header> at phone width: present, display:none, zero box.
  furniture = [band('header', 0, 0), band(AVOID, 0, 64)];
  const top = P.forbiddenBands().filter((b) => b.side === 'top');
  assert.equal(top.length, 1, 'the hidden header was counted as furniture');
  assert.equal(top[0].bottom, 64);
});

test('marked furniture at the foot of the screen is still read as bottom', () => {
  furniture = [band(AVOID, H - 70, 70)];
  const bands = P.forbiddenBands();
  assert.equal(bands.filter((b) => b.side === 'bottom').length, 1);
  assert.equal(bands.filter((b) => b.side === 'top').length, 0);
});

test('it never stands with its head behind the top bar', () => {
  furniture = [band(AVOID, 0, 64)];
  // A target scrolled up under the bar — the case that produced the bug,
  // where every candidate is poor and the least-bad one was still behind it.
  const rect = { top: 8, bottom: 44, left: 120, right: 320, width: 200, height: 36 };
  const size = 98;
  const spot = P.standBeside(rect, size);
  assert.ok(
    spot.y - size >= 64,
    `its head was at y=${spot.y - size}, inside a bar reaching to 64`
  );
});

test('with no top bar there is nothing to clamp to', () => {
  furniture = [];
  assert.equal(P.topGuard(P.forbiddenBands()), 0);

  const rect = { top: 8, bottom: 44, left: 120, right: 320, width: 200, height: 36 };
  const spot = P.standBeside(rect, 98);
  assert.ok(spot.y - 98 >= P.EDGE, 'it left the top of the screen');
});

test('the guard is the lowest of several top bars, not the first', () => {
  furniture = [band('header', 0, 48), band(AVOID, 0, 64)];
  assert.equal(P.topGuard(P.forbiddenBands()), 64);
});

/* ---- Standing on the words ----------------------------------------------
 * A worked example of the keep-out rule, measured off the game briefing
 * when the companion still appeared there (it no longer does). The shape is
 * what matters and recurs elsewhere: a full-width button with words above
 * and below it leaves no "beside" to take, and the least-bad spot is on top
 * of something unless the words are marked.
 */
const box = (x, y, w, h) => ({
  sel: '[data-mascot-clear]',
  el: { getBoundingClientRect: () => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h }) }
});
const rectOf = (f) => f.el.getBoundingClientRect();

/** How much of `target` the character's body would cover, as a percentage. */
const coverage = (spot, size, target) => {
  const half = size * 0.42;
  const body = { left: spot.x - half, right: spot.x + half, top: spot.y - size, bottom: spot.y };
  const w = Math.min(body.right, target.right) - Math.max(body.left, target.left);
  const h = Math.min(body.bottom, target.bottom) - Math.max(body.top, target.top);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / ((target.right - target.left) * (target.bottom - target.top)) * 100;
};

/* The phone briefing, measured off it: a full-width Start button with the
   headline and objective above and the how-to-play card below. */
const HEADLINE = box(160, 376, 155, 30);
const OBJECTIVE = box(61, 446, 279, 32);
const COACH = box(61, 585, 308, 131);
const NAV = box(0, 871, 430, 76);
const PANEL_BOTTOM = 740;
const PHONE_SIZE = 88;

/** Runs a case at its own viewport, then puts the window back for the rest. */
const atViewport = (w, h, fn) => {
  const { innerWidth, innerHeight } = globalThis.window;
  globalThis.window.innerWidth = w;
  globalThis.window.innerHeight = h;
  try {
    return fn();
  } finally {
    globalThis.window.innerWidth = innerWidth;
    globalThis.window.innerHeight = innerHeight;
  }
};

test('beside the phone briefing\'s Start button, every spot is on top of text', () => {
  /*
   * The reason the gameStart reaction points at the how-to-play card instead.
   * On a phone the Start button runs the full width of the panel, so there is
   * no left or right to take: below is the card, above is the headline and the
   * objective. Marking them does not rescue it — with every neighbour spoken
   * for, the least-bad placement is still on top of something. This asserts
   * the dead end, so nobody re-points it at the button expecting marks to fix
   * it.
   */
  const start = { left: 61, top: 501, right: 369, bottom: 560, width: 308, height: 59 };
  const words = [HEADLINE, OBJECTIVE, COACH];

  atViewport(430, 971, () => {
    furniture = words;
    const spot = P.standBeside(start, PHONE_SIZE);
    const onWords = words.reduce((n, w) => n + coverage(spot, PHONE_SIZE, rectOf(w)), 0);
    assert.ok(onWords > 10, `it found a clear spot beside the button (${Math.round(onWords)}%)`);
  });
});

test('under the how-to-play card it covers none of the briefing', () => {
  const words = [HEADLINE, OBJECTIVE, COACH];

  atViewport(430, 971, () => {
    furniture = [...words, NAV];
    const spot = P.standBeside(rectOf(COACH), PHONE_SIZE, 'below');

    for (const w of words) {
      assert.equal(coverage(spot, PHONE_SIZE, rectOf(w)), 0, 'it stood on the briefing');
    }
    assert.ok(spot.y - PHONE_SIZE > PANEL_BOTTOM, 'its head was still over the panel');
    assert.ok(spot.y <= rectOf(NAV).top, 'its feet went behind the phone navigation');
  });
});

test('on a wide screen it goes under the card rather than off the side', () => {
  const coach = box(900, 300, 350, 210);
  const size = 110;

  atViewport(1440, 900, () => {
    furniture = [box(220, 300, 260, 34), box(220, 360, 420, 44), coach];
    const spot = P.standBeside(rectOf(coach), size, 'below');
    assert.equal(coverage(spot, size, rectOf(coach)), 0);
    assert.ok(spot.x > 0 && spot.x < 1440, 'it left the screen sideways');
    assert.ok(spot.y < 900, 'it left the screen downwards');
  });
});
