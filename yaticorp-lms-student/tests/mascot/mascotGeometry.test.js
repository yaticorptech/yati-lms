/**
 * Where the Career Path mascot stands and how it gets there: beside the thing
 * it is about to point at, never on it, never on another button when there is
 * a side with room, never under a bar — and at a human pace.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { standBeside, homeSpot, walkMs, facingFor, scrollDelta, overlap, centreSpot, wanderSpot, gazeToward, GAP } =
    await import('../../src/career/mascot/mascotGeometry.js');

const box = (left, top, w, h) => ({ left, top, right: left + w, bottom: top + h });
const GUIDE = { w: 140, h: 176 };
const SCREEN = box(0, 0, 1200, 800);
const at = (spot) => box(spot.x, spot.y, GUIDE.w, GUIDE.h);

test('it stands 16px to the right of a target with room there, facing it', () => {
    assert.equal(GAP, 16);
    const target = box(300, 300, 120, 40);
    const spot = standBeside(target, GUIDE, SCREEN);
    assert.equal(spot.side, 'right');
    assert.equal(spot.x, target.right + GAP);
    assert.equal(spot.facing, 'left', 'turned towards what it is about to point at');
    assert.equal(overlap(at(spot), target), 0);
});

test('against the right edge it goes to the left of the target instead', () => {
    const target = box(1000, 300, 150, 40);
    const spot = standBeside(target, GUIDE, SCREEN);
    assert.equal(spot.side, 'left');
    assert.equal(spot.x, target.left - GAP - GUIDE.w);
    assert.equal(spot.facing, 'right');
});

test('it would rather take another side than stand on a neighbouring button', () => {
    const target = box(500, 300, 120, 40);
    const neighbour = box(636, 250, 160, 160);
    const spot = standBeside(target, GUIDE, SCREEN, [neighbour]);
    assert.notEqual(spot.side, 'right');
    assert.equal(overlap(at(spot), neighbour), 0);
});

test('it never leaves the safe area, even beside a target near its top', () => {
    const safe = box(8, 72, 1184, 640);
    const spot = standBeside(box(300, 80, 100, 30), GUIDE, safe);
    assert.ok(spot.y >= safe.top);
    assert.ok(spot.x + GUIDE.w <= safe.right);
});

test('beside a target that spans the screen, it has to stand above or below', () => {
    const spot = standBeside(box(0, 300, 1200, 40), GUIDE, SCREEN);
    assert.ok(['above', 'below'].includes(spot.side));
    assert.equal(overlap(at(spot), box(0, 300, 1200, 40)), 0);
});

test('it rests in the bottom right corner, or the bottom left when that is clearer', () => {
    const clear = homeSpot(SCREEN, GUIDE);
    assert.equal(clear.x, SCREEN.right - GUIDE.w - 16);
    assert.equal(clear.y, SCREEN.bottom - GUIDE.h);
    const busyRight = homeSpot(SCREEN, GUIDE, [box(1000, 600, 200, 200)]);
    assert.equal(busyRight.x, SCREEN.left + 16, 'the right corner is taken');
});

test('with a button in both corners, it ducks below it and peeks, rather than stand on it', () => {
    const spot = homeSpot(SCREEN, GUIDE, [box(1000, 700, 200, 100), box(0, 700, 200, 100)]);
    assert.ok(spot.y > SCREEN.bottom - GUIDE.h, 'it dropped');
    assert.ok(spot.y <= SCREEN.bottom - 56, 'but still shows');
});

test('a walk takes 2ms a pixel, a step at least, a screen at most three seconds or so', () => {
    assert.equal(walkMs({ x: 0, y: 0 }, { x: 0, y: 0 }), 0);
    assert.equal(walkMs({ x: 0, y: 0 }, { x: 200, y: 0 }), 400);
    assert.equal(walkMs({ x: 0, y: 0 }, { x: 10, y: 0 }), 250);
    assert.equal(walkMs({ x: 0, y: 0 }, { x: 5000, y: 0 }), 3200);
});

test('it faces the way it walks, and keeps its facing on a walk straight up or down', () => {
    assert.equal(facingFor({ x: 0, y: 0 }, { x: 100, y: 0 }), 'right');
    assert.equal(facingFor({ x: 100, y: 0 }, { x: 0, y: 0 }), 'left');
    assert.equal(facingFor({ x: 0, y: 0 }, { x: 0, y: 100 }, 'left'), 'left');
});

test('a target off screen is scrolled to the middle; one on screen is left alone', () => {
    assert.equal(scrollDelta(box(100, 300, 100, 40), SCREEN), 0);
    assert.equal(scrollDelta(box(100, 1200, 100, 40), SCREEN), 820);
    assert.ok(scrollDelta(box(100, -200, 100, 40), SCREEN) < 0);
});

test('the centre is the middle of the floor; a wander is a short step along it that lands on nothing', () => {
    const centre = centreSpot(SCREEN, GUIDE);
    assert.equal(centre.x, 600 - GUIDE.w / 2);
    const from = { x: 600, y: SCREEN.bottom - GUIDE.h };
    const seq = [0.9, 0.1];
    const spot = wanderSpot(from, GUIDE, SCREEN, [box(700, 600, 300, 200)], 160, () => seq.shift() ?? 0.1);
    assert.ok(spot && spot.x < from.x, 'the right was blocked, so it went left');
    assert.equal(spot.y, from.y);
    assert.equal(wanderSpot(from, GUIDE, SCREEN, [box(0, 600, 1200, 200)], 160, () => 0.9), null, 'nowhere clear');
});

test('a gaze points from the eyes toward a point, clamped to one', () => {
    const mascot = box(500, 500, 140, 176);
    const right = gazeToward(mascot, { x: 900, y: 552 }, 400);
    assert.ok(right.x > 0.8 && Math.abs(right.y) < 0.1);
    assert.deepEqual(gazeToward(mascot, { x: -5000, y: 5000 }, 400), { x: -1, y: 1 });
});
