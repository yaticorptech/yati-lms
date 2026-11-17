/** The 2026-11-16 logic games: every puzzle has a solution, and the solvers agree with the rules. */
import test from 'node:test';
import assert from 'node:assert/strict';

const L = await import('../../src/career/data/bands/logicNew.js');
const { seeded } = await import('../../src/career/data/seeded.js');
const SETTINGS = [];
for (const band of ['intermediate', 'analytical']) for (const d of [1, 2, 3]) for (const lv of [1, 5, 12, 30]) SETTINGS.push([band, d, lv]);

test('Pipe Flow: scrambled at the start, and the solution flows', () => {
  for (const [band, d, lv] of SETTINGS) {
    const cfg = L.pipeConfig(band, d, lv);
    for (let k = 0; k < 3; k += 1) {
      const p = L.makePipePuzzle(seeded(lv * 13 + d * 5 + k), cfg);
      assert.equal(p.tiles.length, cfg.rows * cfg.cols);
      assert.ok(!L.pipeFlows(p, p.tiles), 'not solved at the start');
      const solved = p.tiles.map((t, i) => (p.solution[i] === null ? t : { ...t, rot: p.solution[i] }));
      assert.ok(L.pipeFlows(p, solved), 'the solution flows');
      assert.ok(p.par >= 1);
    }
  }
});

test('Emoji Equations: the lines fix every value and the answer follows', () => {
  for (const [band, d, lv] of SETTINGS) {
    const cfg = L.emojiConfig(band, d, lv);
    const p = L.makeEmojiPuzzle(seeded(lv * 17 + d), cfg);
    p.lines.forEach((l) => assert.equal(L.evaluate(l.terms, p.values), l.total));
    // Solve in order: line 1 is 3a, line 2 is a + 2b, line 3 gives c.
    const a = p.lines[0].total / 3;
    assert.equal(a, p.values[0]);
    assert.equal((p.lines[1].total - a) / 2, p.values[1]);
    assert.equal(L.evaluate(p.question.terms, p.values), p.answer);
    assert.equal(p.options.filter((o) => o === p.answer).length, 1);
    assert.equal(new Set(p.options).size, p.options.length);
  }
  assert.equal(L.evaluate([2, '+', 3, '×', 4], []), 14);
  assert.equal(L.evaluate([{ item: 0 }, '×', { item: 1 }, '−', 2], [3, 5]), 13);
});

test('Tower Strategy: every puzzle can be sorted, in about the best number of moves for its level', () => {
  for (const [band, d, lv] of SETTINGS) {
    const cfg = L.towerConfig(band, d, lv);
    for (let k = 0; k < 3; k += 1) {
      const p = L.makeTowerPuzzle(seeded(lv * 19 + d * 3 + k), cfg);
      assert.equal(p.towers.flat().length, cfg.per * 3);
      assert.ok(p.towers.every((t) => t.length <= cfg.cap));
      assert.ok(!L.towersSolved(p.towers, cfg.per), 'not sorted at the start');
      assert.equal(L.towerPar(p.towers, { ...cfg, strict: p.strict }), p.par);
      assert.ok(p.par >= 3);
    }
  }
  const sorted = [[0, 0, 0], [1, 1, 1], [2, 2, 2]];
  assert.ok(L.towersSolved(sorted, 3));
  assert.ok(!L.canMove(sorted, 0, 0, { cap: 4, strict: false }));
  assert.ok(L.canMove(sorted, 0, 1, { cap: 4, strict: false }));
  assert.ok(!L.canMove(sorted, 0, 1, { cap: 4, strict: true }), 'strict: not onto another colour');
  assert.ok(!L.canMove(sorted, 0, 2, { cap: 4, adjacent: true }), 'next-door only: not 1 → 3');
  assert.ok(L.canMove(sorted, 0, 1, { cap: 4, adjacent: true }));
  assert.equal(L.towerConfig('intermediate', 1, 1).adjacent, true);
});
