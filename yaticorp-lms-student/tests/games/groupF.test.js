/**
 * Group F (Master Minds): Spatial Rotation Vault, Interference Recall, Cipher Lab, Boolean Breaker.
 * Every generated round is valid: one right answer, solvable, checkers accept the solution and reject wrong ones,
 * and content grows with difficulty.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { seeded } = await import('../../src/career/data/seeded.js');
const inter = await import('../../src/career/data/bands/fInterference.js');
const coach = await import('../../src/career/components/games/coach/f.js');

const BANDS = ['advanced', 'analytical', null];
const LEVEL_NOS = [1, 10, 20, 30];
const SEEDS = 40;
const each = (fn) => {
  for (const band of BANDS) for (let d = 1; d <= 3; d++) for (const L of LEVEL_NOS) for (let s = 1; s <= SEEDS; s++) fn(band, d, L, seeded(s * 7919 + d * 131 + L), `${band}/d${d}/L${L}/s${s}`);
};

test('Interference Recall: bank has no repeats; tests hold every A word, lures from B, new words never shown', () => {
  const all = inter.GROUPS.flat();
  assert.equal(new Set(all).size, all.length, 'a word appears in two groups');
  for (const g of inter.GROUPS) assert.ok(g.length >= 3);
  each((band, d, L, rng, where) => {
    const cfg = inter.interferenceConfig(band, d, L);
    assert.ok(cfg.listSize <= inter.GROUPS.length);
    const tr = inter.makeInterferenceTrial(rng, cfg);
    assert.equal(tr.listA.length, cfg.listSize, where);
    assert.equal(tr.listB.length, cfg.listSize, where);
    assert.equal(new Set([...tr.listA, ...tr.listB]).size, cfg.listSize * 2, where);
    const words = tr.test.map((x) => x.word);
    assert.equal(new Set(words).size, words.length, where);
    for (const w of tr.listA) assert.ok(tr.test.some((x) => x.word === w && x.kind === 'A'), where);
    for (const x of tr.test) {
      if (x.kind === 'B') assert.ok(tr.listB.includes(x.word), where);
      if (x.kind === 'N') assert.ok(!tr.listA.includes(x.word) && !tr.listB.includes(x.word), where);
    }
    // Every B word shares a meaning group with an A word.
    for (const b of tr.listB) {
      const g = inter.GROUPS.find((gr) => gr.includes(b));
      assert.ok(tr.listA.some((a) => g.includes(a)), where);
    }
    assert.equal(tr.test.filter((x) => x.kind === 'B').length, cfg.lures, where);
    assert.equal(tr.test.filter((x) => x.kind === 'N').length, cfg.fresh, where);
    for (const s of tr.sums) {
      const [a, op, b] = s.text.split(' ');
      const val = op === '+' ? +a + +b : op === '-' ? a - b : a * b;
      assert.equal(val, s.answer, where);
      assert.equal(s.choices.filter((c) => c === s.answer).length, 1, where);
      assert.equal(new Set(s.choices).size, 3, where);
    }
    const perfect = inter.scoreRecall(tr, tr.listA);
    assert.equal(perfect.score, cfg.listSize, where);
    const lure = tr.test.find((x) => x.kind === 'B').word;
    const r2 = inter.scoreRecall(tr, [...tr.listA, lure]);
    assert.equal(r2.score, cfg.listSize - 1, where);
    assert.equal(r2.lureFA, 1, where);
    assert.equal(inter.scoreRecall(tr, tr.test.filter((x) => x.kind !== 'A').map((x) => x.word)).score, 0, where);
  });
  const easy = inter.interferenceConfig('advanced', 1, 1);
  const hard = inter.interferenceConfig('advanced', 3, 30);
  assert.ok(hard.listSize > easy.listSize && hard.lures > easy.lures && hard.studyMs < easy.studyMs);
});

test('coach and blurb cover Interference Recall', () => {
  for (const id of ['interference-recall']) {
    assert.equal(coach.COACH[id].steps.length, 3, id);
    assert.ok(coach.COACH[id].tip, id);
    assert.ok(coach.BLURB[id], id);
  }
});
