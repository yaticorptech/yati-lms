import test from 'node:test';
import assert from 'node:assert/strict';

const A = await import('../../src/career/data/bands/arrowEscape.js');
const { seeded } = await import('../../src/career/data/seeded.js');

test('Arrow Escape: every board is fully packed and can be cleared; arrows are unbroken paths that end facing their way out', () => {
  for (const d of [1, 2, 3]) for (const lv of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 40]) for (let k = 0; k < 4; k += 1) {
    for (const aspect of [0.8, 1, 1.7, 2.2]) {
    const cfg = A.arrowConfig(d, lv, aspect);
    const b = A.makeArrowBoard(seeded(lv * 97 + d * 31 + k), cfg);
    assert.ok(b.arrows.length >= 4, 'a real board');
    if (cfg.label === 'Easy') { assert.equal(cfg.shape, null, 'easy levels are the plain board'); assert.equal(b.arrows.reduce((n, a) => n + a.cells.length, 0), cfg.rows * cfg.cols, 'every square used'); } else assert.ok(cfg.shape, 'medium and hard levels are pictures');
    assert.ok(b.arrows.every((a) => a.cells.every(([r, c]) => r < cfg.rows && c < cfg.cols)), 'inside the picture');
    assert.ok(A.clearable(b), 'clearable');
    const cells = b.arrows.flatMap((a) => a.cells.map(([r, c]) => `${r},${c}`));
    assert.equal(new Set(cells).size, cells.length, 'no overlap');
    for (const a of b.arrows) {
      assert.ok(a.cells.length >= 1 && a.cells.length <= cfg.maxLen + 2);
      for (let i = 1; i < a.cells.length; i += 1) assert.equal(Math.abs(a.cells[i][0] - a.cells[i - 1][0]) + Math.abs(a.cells[i][1] - a.cells[i - 1][1]), 1, 'unbroken');
      if (a.cells.length > 1) { const [dr, dc] = A.DIRS[a.dir]; const h = a.cells.at(-1); const n = a.cells.at(-2); assert.deepEqual([h[0] - n[0], h[1] - n[1]], [dr, dc], 'the head faces its way out'); }
    }
    }
  }
});
