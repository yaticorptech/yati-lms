/**
 * One rule matters here and it is a negative: a scholarship list must never be
 * shown to a student who has not answered the eligibility form. Negatives are
 * easy to break by accident, so every combination is checked rather than the
 * happy path alone.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { default: view } = await import('../../src/pages/scholarshipView.js');

test('a student who has not answered the form never sees a list', () => {
  for (const asking of [true, false]) {
    const screen = view({ loading: false, hasGoal: true, hasProfile: false, asking });
    assert.equal(screen, 'form', `showed "${screen}" to someone who had not answered`);
  }
});

test('answering the form is what reveals the list', () => {
  assert.equal(view({ loading: false, hasGoal: true, hasProfile: false, asking: false }), 'form');
  assert.equal(view({ loading: false, hasGoal: true, hasProfile: true, asking: false }), 'list');
});

test('reopening the form on purpose works even once it has been answered', () => {
  assert.equal(view({ loading: false, hasGoal: true, hasProfile: true, asking: true }), 'form');
});

test('no career goal asks for the goal, not for caste and income', () => {
  for (const hasProfile of [true, false]) {
    assert.equal(view({ loading: false, hasGoal: false, hasProfile, asking: false }), 'need-goal');
  }
});

test('loading beats everything, so nothing flashes before the answer arrives', () => {
  assert.equal(view({ loading: true, hasGoal: true, hasProfile: true, asking: false }), 'loading');
  assert.equal(view({ loading: true, hasGoal: false, hasProfile: false, asking: true }), 'loading');
});

test('every combination: the list appears only with a goal and an answered form', () => {
  const bool = [true, false];
  for (const loading of bool) {
    for (const hasGoal of bool) {
      for (const hasProfile of bool) {
        for (const asking of bool) {
          const screen = view({ loading, hasGoal, hasProfile, asking });
          if (screen === 'list') {
            assert.ok(!loading && hasGoal && hasProfile && !asking,
              `list shown for loading=${loading} hasGoal=${hasGoal} hasProfile=${hasProfile} asking=${asking}`);
          }
        }
      }
    }
  }
});
