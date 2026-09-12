import test from 'node:test';
import assert from 'node:assert/strict';

const { GAME_COACH, GAME_QUOTE, coachFor, quoteFor } = await import(
  '../../src/career/components/games/gameCoach.js'
);

/* Every game the hub lists. Kept by hand because the hub itself imports
   React and the API client, which do not load under node. */
const GAMES = [
  'memory-match', 'sequence-recall', 'number-recall', 'colour-match', 'spot-the-change', 'grid-recall', 'reverse-recall', 'seen-before', 'dot-count', 'match-back',
  'code-breaker', 'next-in-sequence', 'odd-one-out', 'deduction', 'lights-out', 'tic-tac-toe', 'mini-sudoku', 'scale-balance', 'shape-matrix', 'spin-match', 'last-stone',
  'word-scramble', 'synonym-match', 'sentence-gap', 'spelling-fix', 'word-roots', 'typing-sprint', 'antonym-match', 'idiom-sense', 'tense-pick', 'sound-alike',
  'math-sprint', 'quick-compare', 'missing-operator', 'percent-snap', 'running-total', 'binary-blitz', 'speed-sort', 'number-bonds', 'rounding-rush', 'fraction-match', 'clock-read'
];

test('every game has how-to-play steps and a tip of its own', () => {
  for (const id of GAMES) {
    const coach = GAME_COACH[id];
    assert.ok(coach, `${id} has no coach entry and would show the generic steps`);
    assert.ok(coach.steps.length >= 2 && coach.steps.length <= 3, `${id} steps`);
    assert.ok(coach.tip, `${id} tip`);
    assert.equal(coachFor(id), coach);
  }
});

test('every game has a briefing line of its own, in the three-part shape', () => {
  for (const id of GAMES) {
    const q = GAME_QUOTE[id];
    assert.ok(q, `${id} has no quote and would fall back to the rotating lines`);
    for (const part of ['lead', 'hot', 'rest', 'line', 'cheer']) assert.ok(q[part], `${id} ${part}`);
    assert.equal(quoteFor(id, 7), q);
  }
});
