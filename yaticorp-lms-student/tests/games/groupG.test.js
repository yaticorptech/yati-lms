/**
 * Group G — Master Minds verbal games: Semantic Precision, Argument Analyzer, Verbal Architect,
 * Nuance Navigator, Word Relation Matrix. Banks are sizeable and well-formed; every generated round has exactly
 * one right answer that the checker accepts (and wrong ones it rejects); sizes scale with difficulty.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { seeded } = await import('../../src/career/data/seeded.js');
const S = await import('../../src/career/data/bands/gSemantic.js');
const A = await import('../../src/career/data/bands/gArgument.js');
const V = await import('../../src/career/data/bands/gArchitect.js');
const N = await import('../../src/career/data/bands/gNuance.js');
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

test('Semantic Precision: bank is large and well-formed', () => {
  assert.ok(S.SEMANTIC_ITEMS.length >= 40, `${S.SEMANTIC_ITEMS.length} items`);
  for (const it of S.SEMANTIC_ITEMS) {
    assert.ok(it.vague && it.best && it.plain.includes(it.vague), it.plain);
    assert.equal(new Set([it.best, ...it.near]).size, 5, `duplicate shelf word in ${it.plain}`);
    assert.ok(!it.near.includes(it.vague) && it.best !== it.vague, it.plain);
    assert.ok(it.plain.includes(it.clue), `clue not in sentence: ${it.clue}`);
    for (const f of it.foils) {
      assert.ok(it.plain.includes(f), `foil not in sentence: ${f}`);
      assert.ok(!it.clue.includes(f) && !f.includes(it.clue), `foil overlaps clue: ${f}`);
    }
    assert.equal(new Set([it.clue, ...it.foils]).size, 3);
  }
  for (const t of [1, 2, 3]) assert.ok(S.SEMANTIC_ITEMS.filter((i) => i.tier === t).length >= 12, `tier ${t}`);
});

test('Semantic Precision: rounds hold the precise word exactly once', () => {
  const n = each((band, d, L, rng, where) => {
    const cfg = S.semanticConfig(band, d, L);
    const rounds = S.makeSemanticLevel(rng, cfg);
    assert.equal(rounds.length, cfg.rounds, where);
    assert.equal(new Set(rounds.map((r) => r.item.id)).size, rounds.length, `repeat at ${where}`);
    for (const r of rounds) {
      assert.equal(r.shelf.length, cfg.shelf, where);
      assert.equal(r.shelf.filter((w) => S.checkSemanticWord(r, w)).length, 1, where);
      assert.equal(new Set(r.shelf).size, r.shelf.length, where);
      if (cfg.why) assert.equal(r.why.filter((p) => S.checkSemanticWhy(r, p)).length, 1, where);
      else assert.equal(r.why, null);
    }
  });
  assert.ok(n > 1000);
  assert.ok(S.semanticConfig('advanced', 3, 30).shelf > S.semanticConfig('advanced', 1, 1).shelf);
});

test('Argument Analyzer: bank is large and every argument complete', () => {
  assert.ok(A.ARGUMENTS.length >= 40, `${A.ARGUMENTS.length}`);
  for (const a of A.ARGUMENTS) {
    assert.ok(a.p.length >= 1 && a.c && a.x && a.a && a.n && a.r, a.c);
    assert.ok(['weaken', 'strengthen'].includes(a.k));
    assert.equal(a.w.length, 3);
    assert.equal(new Set([a.r, ...a.w]).size, 4, a.c);
  }
  assert.ok(A.ARGUMENTS.filter((a) => a.k === 'strengthen').length >= 10);
});

test('Argument Analyzer: one conclusion, tags score right, one right option', () => {
  each((band, d, L, rng, where) => {
    const cfg = A.argumentConfig(band, d, L);
    const rounds = A.makeArgumentLevel(rng, cfg);
    assert.equal(rounds.length, cfg.rounds, where);
    for (const r of rounds) {
      const all = [...r.lines, ...r.unstated];
      assert.equal(r.lines.filter((l) => l.role === 'conclusion').length, 1, where);
      assert.ok(all.every((l) => cfg.roles.includes(l.role)), `role outside ${cfg.roles} at ${where}`);
      assert.equal(r.options.length, cfg.options, where);
      assert.equal(r.options.filter((o) => o === r.answer).length, 1, where);
      assert.equal(A.scoreTags(r, all.map((l) => l.role)), all.length, where);
      assert.ok(A.scoreTags(r, all.map(() => 'nothing')) === 0);
      if (cfg.assumption) assert.ok(r.unstated.some((l) => l.role === 'assumption'), where);
      if (/^(so|therefore)\b/i.test(r.arg.c)) assert.equal(r.lines[r.lines.length - 1].role, 'conclusion', where);
    }
  });
  assert.ok(A.argumentConfig('advanced', 3, 1).options > A.argumentConfig('advanced', 1, 1).options);
});

test('Verbal Architect: paragraphs are distinct and enough of each length', () => {
  assert.ok(V.PARAGRAPHS.length >= 40);
  for (const len of [4, 5, 6]) assert.ok(V.PARAGRAPHS.filter((p) => p.length === len).length >= 12, `length ${len}`);
  for (const p of V.PARAGRAPHS) assert.equal(new Set(p).size, p.length);
});

test('Verbal Architect: dealt shuffled, the intended order solves it, others do not', () => {
  each((band, d, L, rng, where) => {
    const cfg = V.architectConfig(band, d, L);
    const rounds = V.makeArchitectLevel(rng, cfg);
    assert.equal(rounds.length, cfg.rounds, where);
    for (const r of rounds) {
      assert.equal(r.sentences.length, cfg.length, where);
      assert.deepEqual([...r.start].sort((a, b) => a - b), r.sentences.map((_, i) => i), where);
      assert.ok(!V.isSolved(r.start), `dealt solved at ${where}`);
      if (cfg.lockFirst) assert.equal(r.start[0], 0, where);
      assert.ok(V.isSolved(r.sentences.map((_, i) => i)));
      assert.ok(V.placedRight(r.start) < cfg.length);
    }
  });
});

test('Nuance Navigator: scales are strict orders with no repeats', () => {
  assert.ok(N.INTENSITY.length + N.CONNOTATION.length + N.REGISTER.length >= 40);
  const seen = new Set();
  for (const l of [...N.INTENSITY, ...N.CONNOTATION, ...N.REGISTER]) {
    assert.equal(new Set(l.words).size, l.words.length, l.idea);
    assert.ok(!seen.has(l.idea), `idea twice: ${l.idea}`);
    seen.add(l.idea);
  }
  for (const l of [...N.CONNOTATION, ...N.REGISTER]) assert.equal(l.words.length, 3);
  for (const l of N.INTENSITY) assert.ok(l.words.length >= 4);
});

test('Nuance Navigator: rounds keep ladder order and check placements', () => {
  each((band, d, L, rng, where) => {
    const cfg = N.nuanceConfig(band, d, L);
    const rounds = N.makeNuanceLevel(rng, cfg);
    assert.equal(rounds.length, cfg.rounds, where);
    for (const r of rounds) {
      if (r.kind === 'intensity') {
        assert.equal(r.order.length, cfg.length, where);
        const ladder = N.INTENSITY.find((l) => l.idea === r.idea).words;
        const idx = r.order.map((w) => ladder.indexOf(w));
        assert.ok(idx.every((v, i) => v >= 0 && (i === 0 || v > idx[i - 1])), `order broken at ${where}`);
      } else assert.equal(r.order.length, 3);
      assert.deepEqual([...r.chips].sort(), [...r.order].sort(), where);
      assert.ok(r.chips.some((w, i) => w !== r.order[i]), `dealt in order at ${where}`);
      assert.equal(N.nuanceRight(r, r.order), r.order.length);
      assert.ok(N.nuanceRight(r, r.chips) < r.order.length);
    }
  });
});

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
