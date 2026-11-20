/**
 * Master Minds' relaxed set (2026-11-17): every generated puzzle can be solved, and every question has one clear answer.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const M = await import('../../src/career/data/bands/mindful.js');
const MM = await import('../../src/career/data/bands/masterMath.js');
const { seeded } = await import('../../src/career/data/seeded.js');

const each = (fn) => { for (let seed = 1; seed <= 60; seed++) for (const d of [2, 3]) for (const lv of [1, 10, 20, 30]) fn(seeded(seed * 31 + d * 7 + lv), d, lv); };

test('logic boards are solvable', () => {
  each((rng, d, lv) => {
    const fp = M.makeFloodPuzzle(rng, M.floodConfig(d, lv));
    assert.ok(fp.limit >= fp.par && fp.par === M.floodGreedy(fp.cells, fp.size, fp.colours));
  });
});

test('word games: hidden words are really there', () => {
  each((rng, d, lv) => {
    const ws = M.makeSearchPuzzle(rng, M.searchConfig(d, lv));
    for (const w of ws.words) {
      assert.equal(w.cells.map((i) => ws.grid[i]).join(''), w.word);
      assert.equal(M.matchLine(ws, M.lineCells(w.cells.at(-1), w.cells[0], ws.size)).word, w.word);
    }
  });
});

test('maths (Class 11+): targets reachable, bills add up, one best deal, values ordered, nearest estimate is the answer', () => {
  each((rng, d, lv) => {
    const pc = MM.popConfig(d, lv);
    const nums = MM.refillBubbles(rng, Array(pc.bubbles).fill(null), pc);
    for (let k = 0; k < 4; k += 1) assert.ok(MM.canMake(nums, MM.nextTarget(rng, nums, pc, k)));
    assert.ok(!nums.includes(0));
    for (const r of MM.makeChangeRound(rng, MM.changeConfig(d, lv))) {
      assert.ok(r.change > 0 && r.best >= 1 && Number.isInteger(r.total), r.why);
      assert.equal(r.subtotal, r.lines.reduce((a, l) => a + l.price * l.qty, 0));
    }
    for (let k = 0; k < 6; k += 1) {
      const b = MM.makeBuyQuestion(rng, MM.buyConfig(d, lv));
      assert.ok(b.best >= 0 && b.best < b.offers.length && b.offers.length >= 2, b.prompt);
      assert.equal(new Set(b.offers.map((o) => o.label)).size, b.offers.length, b.prompt);
    }
    const tc = MM.trailConfig(d, lv);
    const board = MM.makeTrailBoard(rng, tc);
    assert.ok(board.length >= tc.count - 1);
    board.forEach((c, i) => { if (i) assert.ok(c.value > board[i - 1].value, `${board[i - 1].label} < ${c.label}`); });
    for (const q of MM.makeEstimateRound(rng, MM.estimateConfig(d, lv))) {
      assert.equal(new Set(q.options).size, 4, q.show);
      const nearest = q.options.reduce((x, o) => (Math.abs(o - q.exact) < Math.abs(x - q.exact) ? o : x));
      assert.equal(nearest, q.answer, q.show);
    }
  });
});
