/**
 * Group E (2026-11-14): Number Pattern Lab, Ratio Relay, Data Dash, Mental Math Circuit (smart) and Matrix Recall,
 * (Dual-Stream Memory removed 2026-11-16.) Every generated round is checked for a single, reachable answer.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { seeded } = await import('../../src/career/data/seeded.js');
const S = await import('../../src/career/data/bands/eSmartMath.js');
const M = await import('../../src/career/data/bands/eMasterMemory.js');

const SMART = ['intermediate', 'analytical'];
const LEVEL_NOS = [1, 10, 20, 30];
const SEEDS = 60;
const each = (bands, fn) => {
  for (const band of bands) for (let d = 1; d <= 3; d++) for (const L of LEVEL_NOS) for (let s = 1; s <= SEEDS; s++) fn(band, d, L, seeded(s * 7919 + d * 131 + L), `${band}/d${d}/L${L}/seed ${s}`);
};
const sum = (a) => a.reduce((x, v) => x + v, 0);

test('Number Pattern Lab: every puzzle is forced by its visible cells and its rules hold', () => {
  const hiddenBy = {};
  each(SMART, (band, d, L, rng, where) => {
    const cfg = S.patternConfig(band, d, L);
    const level = S.makePatternLevel(rng, cfg);
    assert.equal(level.length, cfg.puzzles, where);
    for (const p of level) {
      assert.ok(p.hidden.length >= 2, `${p.kind} hides ${p.hidden.length} at ${where}`);
      for (const rl of p.rules) assert.equal(sum(rl.cells.map(([r, c], k) => rl.coef[k] * p.values[r][c])), rl.total, `${p.kind} rule broken at ${where}`);
      const solved = S.solvePattern(p, S.visibleGrid(p));
      assert.deepEqual(solved, p.values, `${p.kind} not forced at ${where}`);
      assert.ok(p.values.flat().every((v) => Number.isInteger(v) && v > 0), where);
      const right = Object.fromEntries(p.hidden.map((id) => { const [r, c] = id.split('-').map(Number); return [id, String(p.values[r][c])]; }));
      assert.deepEqual(S.checkPattern(p, right), [], where);
      const wrong = { ...right, [p.hidden[0]]: String(Number(right[p.hidden[0]]) + 1) };
      assert.deepEqual(S.checkPattern(p, wrong), [p.hidden[0]], where);
      assert.equal(S.checkPattern(p, { ...right, [p.hidden[0]]: '' }).length, 1, where);
      const key = `${band}/${d}`;
      hiddenBy[key] = (hiddenBy[key] || 0) + p.hidden.length;
    }
  });
  assert.ok(hiddenBy['analytical/3'] > hiddenBy['intermediate/1'], 'harder levels hide more');
});

test('Ratio Relay: every leg has a whole answer that becomes the next leg’s number', () => {
  each(SMART, (band, d, L, rng, where) => {
    const cfg = S.relayConfig(band, d, L);
    const relays = S.makeRelayLevel(rng, cfg);
    assert.equal(relays.length, cfg.relays, where);
    for (const relay of relays) {
      assert.equal(relay.legs.length, cfg.legs, where);
      assert.ok(cfg.legs >= 4 && cfg.legs <= 6, where);
      relay.legs.forEach((leg, i) => {
        assert.ok(cfg.kinds.includes(leg.kind), where);
        assert.equal(S.legAnswer(leg), leg.answer, `${leg.kind} at ${where}`);
        assert.ok(Number.isInteger(leg.answer) && leg.answer >= 3 && leg.answer <= cfg.maxValue, where);
        assert.ok(leg.text.includes(String(leg.q)), where);
        if (i) assert.equal(leg.q, relay.legs[i - 1].answer, `chain broken at ${where}`);
      });
    }
  });
});

test('Data Dash: answers are computed from the chart and choices have one right option', () => {
  each(SMART, (band, d, L, rng, where) => {
    const cfg = S.dashConfig(band, d, L);
    const sets = S.makeDashLevel(rng, cfg);
    assert.equal(sets.length, cfg.sets, where);
    for (const set of sets) {
      assert.equal(set.questions.length, cfg.perSet, where);
      if (set.chart === 'pie') assert.equal(sum(set.values), 100, where);
      if (set.values) assert.equal(set.values.length, set.labels.length, where);
      if (set.series) set.series.forEach((s) => assert.equal(s.values.length, set.labels.length, where));
      const series = set.series ? set.series.flatMap((s) => s.values) : set.values;
      assert.ok(series.every((v) => Number.isInteger(v) && v > 0), where);
      for (const q of set.questions) {
        if (q.type === 'num') assert.ok(Number.isInteger(q.answer) && q.answer >= 0, `${q.prompt} = ${q.answer} at ${where}`);
        else assert.equal(q.options.filter((o) => o === q.answer).length, 1, where);
      }
      // Independent spot checks of the arithmetic.
      if (set.chart === 'bar' || set.chart === 'table') {
        for (const q of set.questions) {
          if (q.prompt.startsWith('What is the total')) assert.equal(q.answer, sum(set.values), where);
          if (q.prompt.startsWith('What is the mean')) assert.equal(q.answer * set.values.length, sum(set.values), where);
          if (q.prompt.startsWith('Which has the largest')) assert.equal(set.values[set.labels.indexOf(q.answer)], Math.max(...set.values), where);
        }
      }
      if (set.chart === 'pie') {
        for (const q of set.questions) {
          const m = /chose (\w+)\?$/.exec(q.prompt);
          if (q.prompt.startsWith('How many') && m && !q.prompt.includes('more')) assert.equal(q.answer, (set.values[set.labels.indexOf(m[1])] * set.total) / 100, where);
        }
      }
    }
  });
});

test('Mental Math Circuit: a route always exists, exactly one setting reaches the target', () => {
  let routes = 0;
  each(SMART, (band, d, L, rng, where) => {
    const cfg = S.circuitConfig(band, d, L);
    const level = S.makeCircuitLevel(rng, cfg);
    assert.equal(level.length, cfg.circuits, where);
    for (const c of level) {
      assert.equal(c.layers.length, cfg.layers, where);
      const trail = S.runCircuit(c, c.solution);
      assert.equal(trail[trail.length - 1], c.target, where);
      assert.ok(trail.every((v) => v !== null && Number.isInteger(v) && v >= 0 && v <= cfg.maxValue), where);
      if (c.mode === 'route') {
        routes++;
        c.layers.forEach((opts) => assert.equal(opts.length, cfg.options, where));
        assert.deepEqual(S.solveCircuit(c), [c.solution], where);
      } else {
        c.layers.forEach((opts) => assert.equal(opts.length, 1, where));
      }
    }
  });
  assert.ok(routes > 1000);
  assert.equal(S.applyOp(7, { op: '/', k: 2 }), null);
  assert.equal(S.applyOp(3, { op: '-', k: 5 }), null);
});

test('Matrix Recall: every question has its answer in the matrix, and the checker agrees', () => {
  each(['advanced'], (band, d, L, rng, where) => {
    const cfg = M.matrixConfig(band, d, L);
    assert.ok(cfg.size >= 4 && cfg.size <= 6, where);
    const level = M.makeMatrixLevel(rng, cfg);
    for (const mx of level) {
      assert.equal(mx.grid.length, cfg.size, where);
      assert.equal(mx.grid.flat().filter((v) => v === mx.unique).length, 1, where);
      assert.equal(mx.queries.length, cfg.queries, where);
      for (const q of mx.queries) {
        if (q.kind === 'where') {
          const [r, c] = q.answer.split('-').map(Number);
          assert.equal(mx.grid[r][c], q.digit, where);
          assert.ok(M.checkMatrixQuery(q, q.answer));
          assert.ok(!M.checkMatrixQuery(q, `${(r + 1) % cfg.size}-${c}`));
        } else if (q.kind === 'fill') {
          const resp = Object.fromEntries(q.cells.map((id) => { const [r, c] = id.split('-').map(Number); return [id, String(mx.grid[r][c])]; }));
          assert.equal(new Set(q.cells).size, q.cells.length, where);
          assert.ok(M.checkMatrixQuery(q, resp), where);
          assert.ok(!M.checkMatrixQuery(q, { ...resp, [q.cells[0]]: String((Number(resp[q.cells[0]]) % 9) + 1) }), where);
        } else {
          if (q.kind === 'rowsum') assert.equal(q.answer, sum(mx.grid[q.line.row]), where);
          if (q.kind === 'colsum') assert.equal(q.answer, sum(mx.grid.map((row) => row[q.line.col])), where);
          if (q.kind === 'count') assert.ok(q.answer >= 1, where);
          assert.ok(M.checkMatrixQuery(q, String(q.answer)), where);
          assert.ok(!M.checkMatrixQuery(q, String(q.answer + 1)), where);
          assert.ok(!M.checkMatrixQuery(q, ''), where);
        }
      }
    }
  });
  assert.ok(M.matrixConfig('advanced', 3, 30).size > M.matrixConfig('advanced', 1, 1).size);
});

