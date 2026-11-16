/**
 * Group D (Rising Brains): Constraint Grid, Analogy Master, Context Detective,
 * Word Association Grid, Equation Rush, Fraction Battle — every generated round
 * is valid, has exactly one right answer, and scales with the band and difficulty.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { seeded } = await import('../../src/career/data/seeded.js');
const G = await import('../../src/career/data/bands/dGrid.js');
const A = await import('../../src/career/data/bands/dAnalogy.js');
const C = await import('../../src/career/data/bands/dContext.js');
const W = await import('../../src/career/data/bands/dAssoc.js');
const E = await import('../../src/career/data/bands/dEquation.js');
const F = await import('../../src/career/data/bands/dFraction.js');

const BANDS = ['intermediate', 'analytical', null, 'advanced', 'foundation'];
const LEVEL_NOS = [1, 10, 20, 30];
const each = (fn) => {
  for (const band of BANDS) for (let d = 1; d <= 3; d++) for (const levelNo of LEVEL_NOS) fn(band, d, levelNo);
};

/* ---------------- Constraint Grid ---------------- */

test('constraint grids: Latin solution, cages met, exactly one solution', () => {
  let count = 0;
  for (const band of ['intermediate', 'analytical']) {
    for (let d = 1; d <= 3; d++) {
      for (const levelNo of LEVEL_NOS) {
        const cfg = G.gridConfig(band, d, levelNo);
        for (let seed = 1; seed <= (cfg.size === 6 ? 12 : 30); seed++) {
          const where = `${band}/d${d}/L${levelNo}/seed ${seed}`;
          const p = G.makeGrid(seeded(seed * 101 + d * 7 + levelNo), cfg);
          count++;
          assert.equal(p.n, cfg.size, where);
          // Every cell in exactly one cage, cages connected, ops allowed.
          const owner = G.cageIndex(p.n, p.cages);
          assert.ok(owner.every((row) => row.every((v) => v >= 0)), where);
          assert.equal(p.cages.reduce((s, c) => s + c.cells.length, 0), p.n * p.n, where);
          for (const cage of p.cages) {
            assert.ok(cage.op === '' || cfg.ops.includes(cage.op), `${where} op ${cage.op}`);
            assert.equal(cage.op === '', cage.cells.length === 1, where);
            if (cage.op === '−' || cage.op === '÷') assert.equal(cage.cells.length, 2, where);
          }
          // The solution is a Latin square that meets every cage.
          assert.ok(G.checkGrid(p, p.solution).solved, where);
          // Unique.
          const { count: n, solutions } = G.solveGrid(p.n, p.cages, 2);
          assert.equal(n, 1, `not unique at ${where}`);
          assert.deepEqual(solutions[0], p.solution, where);
          // A swapped row is rejected.
          const bad = p.solution.map((r) => [...r]);
          [bad[0][0], bad[0][1]] = [bad[0][1], bad[0][0]];
          assert.equal(G.checkGrid(p, bad).solved, false, where);
          // An empty board is not solved, and a duplicate is flagged.
          const empty = p.solution.map((r) => r.map(() => 0));
          assert.equal(G.checkGrid(p, empty).full, false);
          empty[0][0] = 1; empty[0][1] = 1;
          assert.equal(G.checkGrid(p, empty).conflicts.size, 2);
        }
      }
    }
  }
  assert.ok(count >= 500, `only ${count}`);
});

test('constraint grids grow with the band', () => {
  assert.equal(G.gridConfig('intermediate', 3, 30).size, 4);
  assert.equal(G.gridConfig('analytical', 1, 1).size, 5);
  assert.equal(G.gridConfig('analytical', 3, 1).size, 6);
  assert.deepEqual(G.gridConfig('intermediate', 1, 1).ops, ['+']);
  assert.ok(G.gridConfig('analytical', 3, 30).ops.includes('÷'));
  assert.equal(G.gridStars({ solved: false, checks: 0 }), 0);
  assert.equal(G.gridStars({ solved: true, checks: 0 }), 3);
  assert.equal(G.gridStars({ solved: true, checks: 9 }), 1);
});

/* ---------------- Analogy Master ---------------- */

test('analogy bank: 80+ items, distinct tiles, known relations', () => {
  const all = [...A.ANALOGIES.intermediate, ...A.ANALOGIES.analytical];
  assert.ok(all.length >= 80, `${all.length} analogies`);
  const seen = new Set();
  for (const it of all) {
    assert.ok(A.RELATION_KEYS.includes(it.rel), `${it.a}: relation ${it.rel}`);
    assert.equal(it.wrong.length, 3, it.a);
    const tiles = [it.d, ...it.wrong].map((w) => w.toLowerCase());
    assert.equal(new Set(tiles).size, 4, `${it.a}:${it.b} tiles repeat`);
    assert.ok(!it.wrong.includes(it.d), it.a);
    for (const w of [it.a, it.b, it.c, it.d]) assert.ok(/^[A-Za-z-]+$/.test(w), `${w}`);
    const k = `${it.a}|${it.c}`;
    assert.ok(!seen.has(k), `duplicate ${k}`);
    seen.add(k);
  }
  // Every relation is used in both bands.
  for (const band of ['intermediate', 'analytical']) {
    for (const r of A.RELATION_KEYS) assert.ok(A.ANALOGIES[band].some((x) => x.rel === r), `${band} lacks ${r}`);
  }
});

test('analogy levels: no repeats, the answer among tiles once, relation chips include the answer', () => {
  each((band, d, levelNo) => {
    const cfg = A.analogyConfig(band, d, levelNo);
    for (let seed = 1; seed <= 40; seed++) {
      const level = A.makeAnalogyLevel(seeded(seed * 13 + d), cfg);
      assert.equal(level.length, cfg.rounds);
      assert.equal(new Set(level.map((r) => r.item.id + r.item.band)).size, level.length);
      for (const r of level) {
        assert.equal(r.tiles.filter((t) => t === r.item.d).length, 1);
        assert.equal(r.tiles.length, 4);
        assert.ok(r.relations.includes(r.item.rel));
        assert.equal(r.relations.length, cfg.relationChoices);
        const right = A.scoreAnalogy(r, r.item.d, r.item.rel, cfg.relationRequired);
        assert.ok(right.won && right.points === 3);
        const wrongWord = A.scoreAnalogy(r, r.item.wrong[0], r.item.rel, cfg.relationRequired);
        assert.equal(wrongWord.won, false);
        const other = A.RELATION_KEYS.find((k) => k !== r.item.rel);
        assert.equal(A.scoreAnalogy(r, r.item.d, other, cfg.relationRequired).won, !cfg.relationRequired);
      }
    }
  });
  assert.equal(A.analogyConfig('analytical', 1, 1).relationRequired, true);
  assert.equal(A.analogyConfig('intermediate', 1, 1).relationRequired, false);
});

/* ---------------- Context Detective ---------------- */

test('context bank: 40+ passages, one target word, at least one clue, four distinct meanings', () => {
  const all = [...C.PASSAGES.easy, ...C.PASSAGES.intermediate, ...C.PASSAGES.analytical];
  assert.ok(all.length >= 60, `${all.length} passages`);
  assert.ok(C.PASSAGES.easy.length >= 20, 'an easy start');
  assert.equal(C.contextConfig('intermediate', 1, 1).pool, 'easy');
  assert.equal(C.contextConfig('intermediate', 1, 20).pool, 'intermediate');
  assert.equal(C.contextConfig('analytical', 2, 10).pool, 'analytical');
  for (const p of all) {
    assert.equal(p.tokens.filter((t) => t.target).length, 1, p.word);
    assert.ok(p.tokens.filter((t) => t.clue).length >= 1, p.word);
    assert.ok(!p.tokens.some((t) => t.target && t.clue), p.word);
    assert.ok(p.tokens.every((t) => t.text && !/[[\]{}]/.test(t.text)), p.word);
    assert.equal(p.wrong.length, 3, p.word);
    assert.equal(new Set([p.meaning, ...p.wrong]).size, 4, p.word);
    assert.ok(p.word.length >= 3);
  }
  assert.equal(new Set(all.map((p) => p.word.toLowerCase())).size, all.length, 'a word is used twice');
});

test('context levels: no passage twice, the meaning once among options, clue scoring', () => {
  each((band, d, levelNo) => {
    const cfg = C.contextConfig(band, d, levelNo);
    for (let seed = 1; seed <= 40; seed++) {
      const level = C.makeContextLevel(seeded(seed * 17 + levelNo), cfg);
      assert.equal(level.length, cfg.rounds);
      assert.equal(new Set(level.map((r) => r.passage.id)).size, level.length);
      for (const { passage, options } of level) {
        assert.equal(options.filter((o) => o === passage.meaning).length, 1);
        const clue = passage.tokens.findIndex((t) => t.clue);
        const plain = passage.tokens.findIndex((t) => !t.clue && !t.target);
        assert.equal(C.scoreClues(passage, [clue]).points, 2);
        assert.equal(C.scoreClues(passage, [clue, plain]).points, 1);
        assert.equal(C.scoreClues(passage, [plain]).points, 0);
        assert.equal(C.scoreClues(passage, []).points, 0);
        assert.equal(C.scoreMeaning(passage, passage.meaning), 2);
        assert.equal(C.scoreMeaning(passage, passage.wrong[0]), 0);
      }
      assert.ok(cfg.pass <= cfg.max);
    }
  });
});

/* ---------------- Word Association Grid ---------------- */

test('association bank: 40+ groups of four, every word in one group only', () => {
  assert.ok(W.GROUPS.length >= 40, `${W.GROUPS.length} groups`);
  const words = W.GROUPS.flatMap((g) => g.words.map((w) => w.toLowerCase()));
  const dupes = words.filter((w, i) => words.indexOf(w) !== i);
  assert.deepEqual(dupes, []);
  for (const g of W.GROUPS) {
    assert.equal(g.words.length, 4, g.label);
    assert.ok([1, 2, 3].includes(g.tier), g.label);
  }
});

test('association boards: right size, pairwise compatible groups, judge works', () => {
  each((band, d, levelNo) => {
    const cfg = W.assocConfig(band, d, levelNo);
    for (let seed = 1; seed <= 60; seed++) {
      const where = `${band}/d${d}/L${levelNo}/${seed}`;
      const board = W.makeAssocBoard(seeded(seed * 29 + d + levelNo), cfg);
      assert.equal(board.groups.length, cfg.groups, where);
      assert.equal(board.words.length, cfg.groups * 4, where);
      assert.equal(new Set(board.words.map((w) => w.word)).size, board.words.length, where);
      assert.deepEqual(board.groups.map((g) => g.tier), cfg.tiers, where);
      for (let i = 0; i < board.groups.length; i++) {
        for (let j = i + 1; j < board.groups.length; j++) assert.ok(W.compatible(board.groups[i], board.groups[j]), where);
      }
      const [g0, g1] = board.groups;
      const right = W.judgeSet(board, g0.words);
      assert.equal(right.result, 'right', where);
      assert.equal(right.group.id, g0.id);
      assert.equal(W.judgeSet(board, g0.words, [g0.id]).result, 'wrong');
      assert.equal(W.judgeSet(board, [...g0.words.slice(0, 3), g1.words[0]]).result, 'one-away');
      assert.equal(W.judgeSet(board, [...g0.words.slice(0, 2), ...g1.words.slice(0, 2)]).result, 'wrong');
    }
  });
  assert.equal(W.assocConfig('intermediate', 1, 1).groups, 3);
  assert.equal(W.assocConfig('analytical', 1, 1).groups, 4);
});

/* ---------------- Equation Rush ---------------- */

test('equations: whole-number answers, steps lead to x, the right step offered once', () => {
  let count = 0;
  each((band, d, levelNo) => {
    const cfg = E.equationConfig(band, d, levelNo);
    for (let seed = 1; seed <= 40; seed++) {
      const level = E.makeEquationLevel(seeded(seed * 31 + d * 3 + levelNo), cfg);
      assert.equal(level.length, cfg.count);
      for (const eq of level) {
        count++;
        const where = `${band}/d${d}/L${levelNo}/${seed} ${E.treeText(eq.lines[0].left)} = ${E.treeText(eq.lines[0].right)}`;
        assert.ok(Number.isInteger(eq.x) && eq.x !== 0, where);
        if (!cfg.negatives) assert.ok(eq.x > 0, where);
        // Evaluate the question at x: both sides agree.
        const evalTree = (n) => {
          if (n.t === 'x') return eq.x;
          if (n.t === 'num') return n.v;
          if (n.t === 'xside') return n.c * eq.x + n.d;
          const v = evalTree(n.e);
          return n.t === 'add' ? v + n.k : n.t === 'mul' ? v * n.k : v / n.k;
        };
        assert.equal(evalTree(eq.lines[0].left), evalTree(eq.lines[0].right), where);
        // Every line holds at x, and the last line is x = answer.
        for (const line of eq.lines) assert.ok(evalTree(line.left) === evalTree(line.right), where);
        const last = eq.lines[eq.lines.length - 1];
        assert.equal(last.left.t, 'x', where);
        assert.equal(last.right.v, eq.x, where);
        assert.equal(eq.lines.length, eq.steps.length + 1, where);
        assert.match(eq.finalText, /^x = /, where);
        // Options: four distinct labels, the right step exactly once.
        eq.options.forEach((opts, i) => {
          assert.equal(opts.length, 4, where);
          assert.equal(new Set(opts.map(E.stepLabel)).size, 4, where);
          assert.equal(opts.filter((o) => E.sameStep(o, eq.steps[i])).length, 1, where);
        });
      }
    }
  });
  assert.ok(count > 5000, `${count}`);
  // Harder bands use more steps.
  const steps = (band, d) => {
    const cfg = E.equationConfig(band, d, 20);
    const lv = E.makeEquationLevel(seeded(5), cfg);
    return lv.reduce((s, e) => s + e.steps.length, 0) / lv.length;
  };
  assert.ok(steps('intermediate', 1) < steps('analytical', 3));
});

test('equation text', () => {
  assert.equal(E.treeText(E.chainTree([['mul', 3], ['add', 5]])), '3x + 5');
  assert.equal(E.treeText(E.chainTree([['add', -2], ['mul', 4]])), '4(x − 2)');
  assert.equal(E.treeText(E.chainTree([['mul', 2], ['div', 3], ['add', -1]])), '2x/3 − 1');
  assert.equal(E.stepLabel({ type: 'add', k: -5 }), '− 5');
  assert.equal(E.stepLabel({ type: 'div', k: -3 }), '÷ (−3)');
});

/* ---------------- Fraction Battle ---------------- */

test('fraction arithmetic is exact', () => {
  assert.deepEqual(F.add({ n: 1, d: 3 }, { n: 1, d: 6 }), { n: 1, d: 2 });
  assert.deepEqual(F.sub({ n: 3, d: 4 }, { n: 1, d: 6 }), { n: 7, d: 12 });
  assert.ok(F.equal({ n: 2, d: 4 }, { n: 3, d: 6 }));
  assert.ok(F.cmp({ n: 1, d: 10 }, { n: 1, d: 5 }) < 0);
  // 0.1 + 0.2 style traps are exact here.
  assert.deepEqual(F.add({ n: 1, d: 10 }, { n: 2, d: 10 }), { n: 3, d: 10 });
});

test('fraction rounds: one right answer, judges accept it and reject wrong ones', () => {
  let count = 0;
  each((band, d, levelNo) => {
    const cfg = F.fractionConfig(band, d, levelNo);
    for (let seed = 1; seed <= 40; seed++) {
      const level = F.makeFractionLevel(seeded(seed * 37 + d + levelNo), cfg);
      assert.equal(level.length, cfg.rounds);
      for (const r of level) {
        count++;
        const cards = r.kind === 'duel' ? [r.mine, r.theirs] : r.kind === 'order' ? r.cards : [...r.hand, r.theirs];
        for (const c of cards) {
          assert.ok(c.d >= 2 && c.n >= 1, JSON.stringify(c));
          if (!cfg.improper && r.kind !== 'beat') assert.ok(c.n < c.d, JSON.stringify(c));
        }
        if (r.kind === 'duel') {
          assert.ok(F.judgeDuel(r, r.answer));
          for (const other of ['mine', 'theirs', 'equal'].filter((x) => x !== r.answer)) assert.equal(F.judgeDuel(r, other), false);
          const c = F.cmp(r.mine, r.theirs);
          assert.equal(r.answer, c > 0 ? 'mine' : c < 0 ? 'theirs' : 'equal');
        } else if (r.kind === 'order') {
          assert.equal(r.cards.length, cfg.orderSize);
          assert.ok(F.judgeOrder(r, r.answer));
          assert.equal(F.judgeOrder(r, [...r.answer].reverse()), false);
        } else {
          assert.equal(r.hand.length, cfg.hand);
          const pairs = [];
          for (let i = 0; i < r.hand.length; i++) for (let j = i + 1; j < r.hand.length; j++) pairs.push([i, j]);
          assert.ok(r.winners.length >= 1 && r.winners.length < pairs.length);
          for (const [i, j] of pairs) {
            const v = F.combine(r.hand[i], r.hand[j], r.op);
            const wins = r.winners.some(([a, b]) => a === i && b === j);
            const res = F.judgeBeat(r, i, j, v.n * 2, v.d * 2);   // an unreduced but equal answer
            assert.equal(res.correctValue, true);
            assert.equal(res.won, wins);
            assert.equal(F.judgeBeat(r, i, j, v.n + 1, v.d).correctValue, false);
          }
        }
      }
    }
  });
  assert.ok(count > 5000);
});
