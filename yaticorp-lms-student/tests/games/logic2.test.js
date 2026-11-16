/** Crown Garden (2026-11-16): one solution per garden. */
import test from 'node:test';
import assert from 'node:assert/strict';

const L = await import('../../src/career/data/bands/logic2.js');
const { seeded } = await import('../../src/career/data/seeded.js');
const SETTINGS = [];
for (const band of ['intermediate', 'analytical']) for (const d of [1, 2, 3]) for (const lv of [1, 6, 15, 30]) SETTINGS.push([band, d, lv]);

test('Crown Garden: exactly one solution, and the solver agrees with the rules', () => {
  for (const [band, d, lv] of SETTINGS) {
    const cfg = L.gardenConfig(band, d, lv);
    const b = L.makeGarden(seeded(lv * 7 + d), cfg);
    assert.equal(L.countGardenSolutions(b.size, b.regions, 3), 1);
    assert.equal(new Set(b.regions).size, b.size, 'one garden per crown');
    const marks = Array(b.size * b.size).fill(0);
    b.crowns.forEach((c, r) => { marks[r * b.size + c] = 2; });
    assert.ok(L.gardenSolved(b.size, b.regions, marks));
    marks[b.crowns[0]] = 0;
    assert.ok(!L.gardenSolved(b.size, b.regions, marks));
  }
});
