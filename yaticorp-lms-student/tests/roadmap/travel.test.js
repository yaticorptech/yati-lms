/**
 * The clock the roadmap's arrival plays to. Pure, so it is pinned here: the
 * caps are what stop a fifteen-phase roadmap taking four seconds to draw and
 * a one-phase one flashing by, and every figure on the hero lands on `arrive`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { travel, LEAD_S, TRAVEL_S, STEP_MAX_S } = await import(
  '../../src/career/components/journey/journeyTravel.js'
);

const states = (done, total = 16) =>
  Array.from({ length: total }, (_, i) => (i < done ? 'done' : i === done ? 'current' : 'upcoming'));

test('nothing done: the fill has nowhere to go, so it arrives at the lead', () => {
  const t = travel(states(0));
  assert.equal(t.done, 0);
  assert.equal(t.arrive, LEAD_S);
});

test('one done: a single segment takes the full step, so it does not flash by', () => {
  const t = travel(states(1));
  assert.equal(t.step, STEP_MAX_S);
  assert.equal(t.arrive, LEAD_S + STEP_MAX_S);
});

test('many done: the whole fill is capped, however long the roadmap', () => {
  for (const done of [8, 15, 40]) {
    const t = travel(states(done, done + 1));
    assert.ok(t.arrive <= LEAD_S + TRAVEL_S + 1e-9, `${done} done arrived at ${t.arrive}s`);
    assert.ok(t.step < STEP_MAX_S, 'the step did not shrink to fit');
  }
});

test('arrival never moves backwards as more gets done', () => {
  let last = -1;
  for (let done = 0; done <= 16; done++) {
    const { arrive } = travel(states(done, 17));
    assert.ok(arrive >= last, `${done} done arrived earlier (${arrive}) than ${done - 1} (${last})`);
    last = arrive;
  }
});

test('it counts finished phases wherever they sit, and ignores everything else', () => {
  assert.equal(travel(['done', 'current', 'done', 'upcoming']).done, 2);
  assert.equal(travel([]).done, 0);
  assert.equal(travel().arrive, LEAD_S);
});
