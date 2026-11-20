import test from 'node:test';
import assert from 'node:assert/strict';

const S = await import('../../src/career/data/bands/speedDistance.js');
const { seeded } = await import('../../src/career/data/seeded.js');

test('Speed, Time & Distance: every answer sits on its track, on a step, and the working is right', () => {
  for (const d of [1, 2, 3]) for (const lv of [1, 6, 15, 30]) for (let k = 0; k < 30; k += 1) {
    const cfg = S.speedConfig(d, lv);
    for (const q of S.makeSpeedLevel(seeded(lv * 101 + d * 17 + k), cfg)) {
      const { min, max, step } = q.track;
      assert.ok(q.answer > min && q.answer < max, `${q.kind}: ${q.answer} inside ${min}–${max}`);
      assert.equal((q.answer - min) % step, 0, `${q.kind}: on a step`);
      assert.equal(S.snap(q.track, q.answer), q.answer);
      assert.ok(q.prompt && q.note && q.movers.length >= 1);
      for (const m of q.movers) assert.equal(m.to, q.answer);
    }
  }
});
