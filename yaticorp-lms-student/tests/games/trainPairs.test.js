/** Train Builder and Chef's Memory (2026-11-16): every order and every board is answerable, with one right answer. */
import test from 'node:test';
import assert from 'node:assert/strict';

const tb = await import('../../src/career/data/bands/trainBuilder.js');
const cm = await import('../../src/career/data/bands/chefMemory.js');
const { seeded } = await import('../../src/career/data/seeded.js');

test('Train Builder: every station can be reached with the yard', () => {
  const subsets = (list) => list.reduce((acc, v) => [...acc, ...acc.map((s) => [...s, v])], [[]]);
  for (const band of ['foundation', 'developing']) {
    for (let level = 1; level <= 30; level += 1) {
      for (const st of tb.makeTrainLevel(seeded(level * 7 + band.length), tb.trainConfig(band, level))) {
        const values = st.yard.map((c) => c.value);
        if (st.kind === 'pattern') {
          assert.equal(values.filter((v) => v === st.missing).length, 1, 'one carriage fits the gap');
          assert.ok(tb.trainWorks(st, [st.missing]));
          const step = st.seq[1] - st.seq[0];
          st.seq.forEach((v, i) => i && assert.equal(v - st.seq[i - 1], step));
        } else {
          assert.ok(subsets(values).some((s) => tb.trainWorks(st, s)), `no train makes ${st.target}`);
        }
      }
    }
  }
});

test("Chef's Memory: every order can be cooked from the pantry, twists applied", () => {
  for (const band of ['intermediate', 'analytical']) {
    for (const d of [1, 2, 3]) {
      for (let level = 1; level <= 30; level += 4) {
        const cfg = cm.chefConfig(band, d, level);
        for (const o of cm.makeChefLevel(seeded(level * 17 + d), cfg)) {
          const want = cm.unitsOf(o.answer);
          assert.ok(want.length > 0);
          assert.ok(want.every((e) => o.pantry.includes(e)), 'every ingredient is in the pantry');
          assert.ok(cm.cooks(o, want, cfg.ordered), 'the answer cooks');
          assert.ok(!cm.cooks(o, want.slice(1), cfg.ordered), 'one missing does not');
          if (!o.twist) assert.deepEqual(o.answer, o.shown);
          else assert.ok(o.twist.text.length > 8);
          assert.equal(new Set(o.pantry).size, o.pantry.length);
        }
      }
    }
  }
});
