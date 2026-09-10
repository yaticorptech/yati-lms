/**
 * The walk itself. Running the model is the test: a character that teleports,
 * overshoots, or slides its feet shows up here as a wrong phase order, a
 * position past the target, or a gait rate that does not match its speed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const L = await import('../../src/career/components/mascot/mascotLocomotion.js');

const DT = 1 / 60;

/** Run the model to a standstill and record everything that happened. */
const walk = (from, to, limit = 1200) => {
  let body = L.createBody(from.x, from.y, from.facingLeft ?? false);
  const phases = [];
  const speeds = [];
  let frames = 0;
  do {
    body = L.step(body, to, DT);
    if (phases[phases.length - 1] !== body.phase) phases.push(body.phase);
    speeds.push(body.speed);
    frames += 1;
  } while (L.isTravelling(body) && frames < limit);
  return { body, phases, speeds, frames };
};

test('it does not teleport: a walk takes real time and passes through phases', () => {
  const { phases, frames } = walk({ x: 0, y: 0 }, { x: 600, y: 0 });
  assert.ok(frames > 20, `arrived in ${frames} frames, which is a teleport`);
  assert.deepEqual(phases.slice(0, 2), ['prepare', 'accelerate'], 'no anticipation before setting off');
  assert.ok(phases.includes('decelerate'), 'it never slowed down');
  assert.equal(phases[phases.length - 1], 'idle', 'it never settled');
});

test('it gathers itself before moving at all', () => {
  let body = L.createBody(0, 0);
  body = L.step(body, { x: 600, y: 0 }, DT);
  assert.equal(body.phase, 'prepare');
  assert.equal(body.speed, 0);
  assert.equal(body.x, 0, 'it moved during the anticipation');
});

test('it stops on the mark rather than overshooting', () => {
  const { body } = walk({ x: 0, y: 0 }, { x: 600, y: 0 });
  assert.ok(Math.abs(body.x - 600) < 0.5, `stopped at ${body.x}`);
  assert.equal(body.speed, 0);
  assert.equal(body.phase, 'idle');
});

test('speed rises then falls, and never runs backwards', () => {
  const { speeds } = walk({ x: 0, y: 0 }, { x: 700, y: 0 });
  const peak = Math.max(...speeds);
  assert.ok(peak > 200, `peak speed was only ${peak}`);
  assert.ok(speeds.every((s) => s >= 0));
  assert.equal(speeds[speeds.length - 1], 0);
  const peakAt = speeds.indexOf(peak);
  assert.ok(peakAt > 0 && peakAt < speeds.length - 1, 'it never cruised between speeding up and slowing down');
});

test('the gait matches the speed, so the feet cannot slide', () => {
  let body = L.createBody(0, 0);
  assert.equal(L.gaitRate(body), 0, 'a standing character had a moving gait');
  const target = { x: 900, y: 0 };
  let fast = null;
  for (let i = 0; i < 40; i += 1) {
    body = L.step(body, target, DT);
    if (body.speed > 0) fast = { speed: body.speed, rate: L.gaitRate(body) };
  }
  assert.ok(fast, 'it never moved');
  assert.ok(fast.rate > 0.4, 'a moving character had no gait');
  // Halving the speed halves the cycle, inside the clamped range.
  const half = L.gaitRate({ ...body, speed: fast.speed / 2 });
  assert.ok(half < fast.rate, 'the gait ignored the speed');
});

test('it faces the way it travels, then turns to face what it came for', () => {
  // Walk leftward to something whose target side wants it looking right.
  let body = L.createBody(600, 0, false);
  const target = { x: 100, y: 0, facingLeft: false };
  body = L.step(body, target, DT);
  assert.equal(body.facingLeft, true, 'it walked left while facing right');

  let frames = 0;
  while (L.isTravelling(body) && frames < 1200) {
    body = L.step(body, target, DT);
    frames += 1;
  }
  assert.equal(body.facingLeft, false, 'it never turned to face the target');
  assert.equal(body.phase, 'idle');
});

test('a few pixels is a shuffle, not a performance', () => {
  let body = L.createBody(100, 100);
  body = L.step(body, { x: 104, y: 100 }, DT);
  assert.equal(body.phase, 'idle', 'a 4px move triggered a walk cycle');
  assert.equal(body.x, 104);
});

test('reduced motion puts it there with no walk at all', () => {
  const body = L.teleport(L.createBody(0, 0), { x: 500, y: 300, facingLeft: true });
  assert.deepEqual(
    { x: body.x, y: body.y, phase: body.phase, speed: body.speed, facingLeft: body.facingLeft },
    { x: 500, y: 300, phase: 'idle', speed: 0, facingLeft: true }
  );
});

test('the phase names the animation the body should be playing', () => {
  assert.equal(L.motionState({ phase: 'prepare' }), 'preparing');
  assert.equal(L.motionState({ phase: 'cruise' }), 'walking');
  assert.equal(L.motionState({ phase: 'decelerate' }), 'walking');
  assert.equal(L.motionState({ phase: 'turn' }), 'turning');
  assert.equal(L.motionState({ phase: 'idle' }), null, 'a standing body overrode its own state');
});
