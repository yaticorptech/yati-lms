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
