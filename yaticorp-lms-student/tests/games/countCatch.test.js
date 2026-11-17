/** Count & Catch (2026-11-16, the falling version): every sum is right, and enough of the right thing falls. */
import test from 'node:test';
import assert from 'node:assert/strict';

const cc = await import('../../src/career/data/bands/countCatch.js');
const { seeded } = await import('../../src/career/data/seeded.js');

const solve = (text) => {
  const [a, op, b] = text.split(' ');
  const x = Number(a);
  const y = Number(b);
  return op === '+' ? x + y : op === '−' ? x - y : op === '×' ? x * y : x / y;
};

test('every round can be caught exactly', () => {
  for (const band of ['foundation', 'developing']) {
    for (let level = 1; level <= 30; level += 1) {
      const cfg = cc.countConfig(band, level);
      for (const r of cc.makeCountLevel(seeded(level * 5 + band.length), cfg)) {
        assert.equal(solve(r.sum), r.answer, r.sum);
        assert.ok(Number.isInteger(r.answer) && r.answer >= 2 && r.answer <= cfg.maxAnswer, r.sum);
        assert.ok(cfg.ops.includes(r.sum.split(' ')[1]));
        const targets = r.stream.filter((it) => it.target);
        assert.ok(targets.length > r.answer, 'more falls than needed, so the child must stop');
        assert.ok(r.stream.some((it) => !it.target), 'some others to leave');
        assert.ok(targets.every((it) => it.emoji === r.kind.emoji));
        assert.ok(r.stream.filter((it) => !it.target).every((it) => it.emoji !== r.kind.emoji));
        assert.ok(r.stream.every((it) => it.x >= 10 && it.x <= 90));
      }
    }
  }
});
