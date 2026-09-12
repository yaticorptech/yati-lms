/**
 * When a level is over. Two rules, both pure, both pinned: the score at which
 * a level has nothing left to give, and the clock's reasons to stop.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { starsCap, starsFor } = await import('../../src/career/components/games/stars.js');
const { isOver } = await import('../../src/career/components/games/useTimedRound.js');

test('the cap is always a whole score that earns exactly three stars', () => {
  for (let target = 1; target <= 40; target++) {
    const cap = starsCap(target);
    assert.equal(cap, Math.floor(cap), `cap for ${target} is not a whole score`);
    assert.equal(starsFor(cap, target), 3, `${cap} of ${target} did not pay three stars`);
    assert.ok(starsFor(cap - 1, target) < 3, `${cap - 1} of ${target} already paid three — the cap is one too high`);
  }
});

test('a round is over when the clock runs out', () => {
  assert.equal(isOver(true, 0), true);
  assert.equal(isOver(true, 5), false);
});

test('a round is over the moment the game says it is done, clock or no clock', () => {
  assert.equal(isOver(true, 40, true), true);
  assert.equal(isOver(true, 40, false), false);
});

test('nothing is over before it has started, whatever the clock or the game say', () => {
  assert.equal(isOver(false, 0), false);
  assert.equal(isOver(false, 0, true), false);
});
