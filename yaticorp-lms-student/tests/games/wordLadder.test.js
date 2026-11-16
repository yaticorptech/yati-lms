/** Word Ladder (2026-11-16): every rung changes exactly one letter; every level has enough ladders. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const W = await import('../../src/career/data/bands/wordLadder.js');
const { seeded } = await import('../../src/career/data/seeded.js');

test('each rung changes exactly one letter and has a clue; the goal is the last word', () => {
  for (const L of W.ALL_LADDERS) {
    let prev = L.start;
    assert.ok(L.steps.length >= 3, `${L.start} is too short`);
    for (const s of L.steps) {
      assert.ok(W.changedAt(prev, s.word) >= 0, `${prev} → ${s.word}`);
      assert.ok(s.clue.length > 3);
      prev = s.word;
    }
    assert.equal(L.goal, prev);
    const words = [L.start, ...L.steps.map((s) => s.word)];
    assert.equal(new Set(words).size, words.length, `${L.start} repeats a word`);
  }
});

test('every level gets distinct ladders of the allowed lengths', () => {
  for (const band of ['easy', 'intermediate', 'analytical']) {
    for (let d = 1; d <= 3; d += 1) {
      for (let lv = 1; lv <= 30; lv += 1) {
        const c = W.ladderConfig(band, d, lv);
        const list = W.makeLadderLevel(seeded(lv * 31 + d), c);
        assert.equal(list.length, c.count);
        assert.equal(new Set(list.map((l) => l.start)).size, c.count);
        list.forEach((l) => assert.ok(c.lengths.includes(l.start.length)));
        assert.ok(c.pass <= c.count);
      }
    }
  }
});

test('changedAt', () => {
  assert.equal(W.changedAt('cold', 'cord'), 2);
  assert.equal(W.changedAt('cold', 'cold'), -1);
  assert.equal(W.changedAt('cold', 'card'), -1);
  assert.equal(W.changedAt('cat', 'cats'), -1);
});
