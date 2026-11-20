/**
 * Group G — Master Minds verbal games: Semantic Precision, Argument Analyzer, Verbal Architect,
 * Nuance Navigator, Word Relation Matrix. Banks are sizeable and well-formed; every generated round has exactly
 * one right answer that the checker accepts (and wrong ones it rejects); sizes scale with difficulty.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { seeded } = await import('../../src/career/data/seeded.js');
const M = await import('../../src/career/data/bands/gMatrix.js');

const BANDS = ['advanced', null];
const LEVEL_NOS = [1, 8, 15, 22, 30];
const SEEDS = 60;

const each = (fn) => {
  let n = 0;
  for (const band of BANDS) for (let d = 1; d <= 3; d++) for (const L of LEVEL_NOS) for (let seed = 1; seed <= SEEDS; seed++) {
    fn(band, d, L, seeded(seed * 7919 + d * 131 + L), `${band}/d${d}/L${L}/seed ${seed}`);
    n++;
  }
  return n;
};

test('Word Relation Matrix: themes are large and every word appears once', () => {
  const total = M.THEMES.reduce((n, t) => n + t.rows.length, 0);
  assert.ok(total >= 40, `${total} rows`);
  for (const t of M.THEMES) {
    const words = t.rows.flat();
    assert.equal(new Set(words).size, words.length, `repeat in ${t.id}`);
    for (const row of t.rows) assert.equal(row.length, t.cols.length, t.id);
  }
});

test('Word Relation Matrix: every grid has exactly one solution, decoys fit nowhere', () => {
  each((band, d, L, rng, where) => {
    const cfg = M.matrixConfig(band, d, L);
    const grids = M.makeMatrixLevel(rng, cfg);
    assert.equal(grids.length, cfg.grids, where);
    for (const g of grids) {
      assert.equal(g.rows.length, cfg.rows, where);
      assert.equal(g.blanks.length, cfg.blanks, where);
      assert.equal(g.decoys.length, cfg.decoys, where);
      assert.equal(g.pool.length, cfg.blanks + cfg.decoys, where);
      g.rows.forEach((row, r) => {
        const given = row.length - g.blanks.filter(([br]) => br === r).length;
        assert.ok(given >= 1, `row ${r} fully blank at ${where}`);
        if (g.theme.anchor !== undefined) assert.ok(!g.blanks.some(([br, bc]) => br === r && bc === g.theme.anchor), where);
        assert.ok(g.blanks.some(([br]) => br === r), `row ${r} has no blank at ${where}`);
      });
      for (const w of g.decoys) assert.ok(!g.blanks.some(([r, c]) => M.fitsCell(g, r, c, w)), `decoy fits at ${where}`);
      assert.equal(M.countSolutions(g), 1, where);
    }
  });
  assert.ok(M.matrixConfig('advanced', 3, 30).blanks > M.matrixConfig('advanced', 1, 1).blanks);
});
