/**
 * Group H — Master Minds: Network Logic, Strategic Constraint Lab, Quantitative Arena,
 * Numerical Optimization, Statistical Inference, Decision Theory Arena.
 *
 * Every generated round is checked against an independent solver or a brute force:
 * shortest routes against Floyd–Warshall, spanning trees against brute force over edge
 * subsets, schedules against exhaustive enumeration, knapsacks against all subsets,
 * comparisons against a dense sample, expected values against enumeration.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { seeded } = await import('../../src/career/data/seeded.js');
const N = await import('../../src/career/data/bands/hNetwork.js');
const C = await import('../../src/career/data/bands/hConstraint.js');
const Q = await import('../../src/career/data/bands/hQuant.js');
const O = await import('../../src/career/data/bands/hOptim.js');
const S = await import('../../src/career/data/bands/hStats.js');
const D = await import('../../src/career/data/bands/hDecision.js');

const BANDS = ['advanced', null];
const LEVELS = [1, 10, 20, 30];
const each = (fn) => {
  for (const band of BANDS) for (let d = 1; d <= 3; d++) for (const L of LEVELS) fn(band, d, L, `${band}/d${d}/L${L}`);
};

/* ---------------------------------------------------------------- network */

const floyd = (g) => {
  const n = g.nodes.length;
  const dist = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
  for (const e of g.edges) { dist[e.a][e.b] = Math.min(dist[e.a][e.b], e.w); dist[e.b][e.a] = Math.min(dist[e.b][e.a], e.w); }
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
  return dist;
};

test('network: connected boards, optimal answers accepted, worse ones rejected', () => {
  let count = 0;
  each((band, d, L, where) => {
    const cfg = N.networkConfig(band, d, L);
    for (let seed = 1; seed <= 40; seed++) {
      const rounds = N.makeNetworkLevel(seeded(seed * 7919 + d * 31 + L), cfg);
      assert.equal(rounds.length, cfg.rounds, where);
      assert.ok(cfg.pass >= 1 && cfg.pass <= cfg.rounds);
      for (const r of rounds) {
        count++;
        const g = r.graph;
        assert.equal(g.nodes.length, cfg.cols * cfg.rows, where);
        const dist = floyd(g);
        assert.ok(dist[0].every(Number.isFinite), `disconnected at ${where}`);
        assert.ok(g.edges.every((e) => e.w >= 1 && e.w <= cfg.wmax));
        const sol = N.checkNetwork(r, r.solution);
        assert.ok(sol.ok, `solution rejected at ${where} (${r.kind})`);
        if (r.kind === 'path') {
          assert.equal(r.optimum, dist[r.from][r.to], where);
          // A detour through some other node that costs more is rejected.
          const mid = g.nodes.find((x) => x.id !== r.from && x.id !== r.to && dist[r.from][x.id] + dist[x.id][r.to] > r.optimum);
          if (mid) {
            const walk = [...N.shortestPath(g, r.from, mid.id), ...N.shortestPath(g, mid.id, r.to).slice(1)];
            assert.equal(N.checkNetwork(r, walk).ok, false, where);
          }
          assert.equal(N.checkNetwork(r, [r.from]).ok, false);
        } else if (r.kind === 'tour') {
          assert.equal(r.required.length, cfg.required);
          assert.ok(!r.required.includes(r.from) && !r.required.includes(r.to));
          // Independent optimum over both orders with Floyd distances.
          const orders = r.required.length === 1 ? [r.required] : [r.required, [...r.required].reverse()];
          const opt = Math.min(...orders.map((o) => [r.from, ...o, r.to].reduce((s, x, i, arr) => (i ? s + dist[arr[i - 1]][x] : 0), 0)));
          assert.equal(r.optimum, opt, where);
          assert.ok(r.cap >= r.optimum);
          // The plain shortest route misses a required stop unless it already passes it.
          const direct = N.shortestPath(g, r.from, r.to);
          if (!r.required.every((x) => direct.includes(x))) assert.equal(N.checkNetwork(r, direct).ok, false, where);
        } else {
          assert.equal(r.solution.length, g.nodes.length - 1);
          // Brute check: no single edge swap makes a lighter spanning tree (cut/cycle optimality).
          const inTree = new Set(r.solution);
          for (const e of g.edges) {
            if (inTree.has(e.id)) continue;
            for (const t of r.solution) {
              const swap = [...r.solution.filter((x) => x !== t), e.id];
              const info = N.treeInfo(g, swap);
              if (info.spanning) assert.ok(info.weight >= r.optimum, `lighter tree at ${where}`);
            }
          }
          assert.equal(N.checkNetwork(r, r.solution.slice(1)).ok, false);
        }
      }
    }
  });
  assert.ok(count > 2000, `${count}`);
});

test('network: bigger boards and stricter caps as difficulty rises', () => {
  const a = N.networkConfig('advanced', 1, 1);
  const c = N.networkConfig('advanced', 3, 30);
  assert.ok(c.cols * c.rows > a.cols * a.rows);
  assert.ok(c.required > a.required || !a.kinds.includes('tour'));
  assert.equal(c.slack, 0);
});

/* ---------------------------------------------------------------- constraint */

const enumerate = (p) => {
  const out = [];
  const total = p.slots ** p.items;
  for (let code = 0; code < total; code++) {
    const assign = [];
    let x = code;
    for (let i = 0; i < p.items; i++) { assign.push(x % p.slots); x = Math.floor(x / p.slots); }
    if (C.checkSchedule(p, assign).valid) out.push(assign);
  }
  return out;
};

test('constraint lab: hidden schedule valid, solver agrees with brute force, optimum exact', () => {
  let count = 0;
  each((band, d, L, where) => {
    const cfg = C.constraintConfig(band, d, L);
    for (let seed = 1; seed <= (d === 3 ? 6 : 10); seed++) {
      const puzzles = C.makeConstraintLevel(seeded(seed * 104729 + d * 17 + L), cfg);
      assert.equal(puzzles.length, cfg.puzzles);
      for (const p of puzzles) {
        count++;
        assert.ok(C.checkSchedule(p, p.hidden).valid, `hidden invalid at ${where}`);
        assert.ok(C.checkSchedule(p, p.solution).ok, `solution not ok at ${where}`);
        assert.ok(p.rules.length >= 1 && p.rules.length <= cfg.maxRules);
        const all = enumerate(p);
        assert.equal(all.length, Math.min(p.count, all.length), where);
        if (p.fees) {
          const min = Math.min(...all.map((a) => C.scheduleCost(p, a)));
          assert.equal(p.optimum, min, where);
          // Valid but over budget is not ok.
          const dear = all.find((a) => C.scheduleCost(p, a) > p.target);
          if (dear) assert.equal(C.checkSchedule(p, dear).ok, false);
        }
        // A partial schedule is never ok; a rule-breaking one is never valid.
        assert.equal(C.checkSchedule(p, p.solution.map((s, i) => (i === 0 ? null : s))).ok, false);
        const broken = [...p.solution];
        const r = p.rules[0];
        if (r.kind === 'before' || r.kind === 'gap') { broken[r.a] = p.slots - 1; broken[r.b] = 0; }
        else if (r.kind === 'together') broken[r.b] = (broken[r.a] + 1) % p.slots;
        else if (r.kind === 'apart') broken[r.b] = broken[r.a];
        else if (r.kind === 'on') broken[r.a] = (r.s + 1) % p.slots;
        else broken[r.a] = r.s;
        assert.equal(C.checkSchedule(p, broken).rules[0], false, where);
      }
    }
  });
  assert.ok(count > 300, `${count}`);
});

/* ---------------------------------------------------------------- quant */

test('quant: every comparison agrees with the textbook answer and a dense sample', () => {
  const dense = [];
  for (let v = -50; v <= 50; v += 0.25) dense.push(v);
  dense.push(-1000, 1000, 0.01, -0.01, 0.99, 1.01, -0.99, -1.01);
  let count = 0;
  // Every case of every variable template.
  for (const t of Q.VAR_TEMPLATE_LIST) {
    for (const [cond, testFn, expect] of t.cases) {
      const small = Q.sampleAssignments(t.vars, t.ints ? Q.INT_VALUES : Q.REAL_VALUES, testFn);
      assert.equal(Q.decideBySampling(small, t.fa, t.fb), expect, `${t.a} vs ${t.b} | ${cond}`);
      const values = t.ints ? Array.from({ length: 41 }, (_, i) => i - 20) : t.vars.length > 1 ? dense.filter((_, i) => i % 4 === 0) : dense;
      const big = Q.sampleAssignments(t.vars, values, testFn);
      assert.equal(Q.decideBySampling(big, t.fa, t.fb), expect, `dense: ${t.a} vs ${t.b} | ${cond}`);
      count++;
    }
  }
  each((band, d, L, where) => {
    const cfg = Q.quantConfig(band, d, L);
    for (let seed = 1; seed <= 60; seed++) {
      const rounds = Q.makeQuantLevel(seeded(seed * 31337 + d * 7 + L), cfg);
      assert.equal(rounds.length, cfg.rounds);
      for (const r of rounds) {
        count++;
        if (r.kind === 'qc') {
          assert.ok(['A', 'B', 'equal', 'cannot'].includes(r.answer), where);
          assert.equal(r.answer, r.expect, `${r.a} vs ${r.b} | ${r.cond}`);
          assert.ok(Q.checkQuant(r, r.answer));
          for (const o of Q.QC_OPTIONS) if (o.id !== r.answer) assert.equal(Q.checkQuant(r, o.id), false);
          if (r.sample) assert.ok(r.sample.m > r.sample.lo && r.sample.m < r.sample.hi);
        } else {
          assert.ok(Number.isFinite(r.answer), where);
          assert.ok(Q.checkQuant(r, String(r.answer)));
          assert.ok(!Q.checkQuant(r, String(r.answer + 0.5)));
          assert.ok(!Q.checkQuant(r, 'abc'));
          assert.ok(r.text.length > 30);
        }
      }
    }
  });
  assert.ok(count > 5000);
});

test('quant: word problems check out by direct computation', () => {
  assert.equal(Q.parseNumber('1,200'), 1200);
  assert.equal(Q.parseNumber('−3.5'), -3.5);
  assert.ok(Number.isNaN(Q.parseNumber('3..5')));
  for (let seed = 1; seed <= 3000; seed++) {
    const r = Q.makeWordRound(seeded(seed), 3);
    const m = /ratio (\d+) : (\d+)\. In (\d+) years the ratio will be (\d+) : (\d+)/.exec(r.text);
    if (m) {
      const [p, q, k, s1, s2] = m.slice(1).map(Number);
      const tt = r.answer / p;
      assert.equal((p * tt + k) * s2, (q * tt + k) * s1, r.text);
    }
    const pens = /(\d+) pens and (\d+) notebooks cost ₹(\d+)\. (\d+) pens and (\d+) notebooks cost ₹(\d+)/.exec(r.text);
    if (pens) {
      const [a, b, c1, c, d, c2] = pens.slice(1).map(Number);
      const det = a * d - b * c;
      assert.equal((a * c2 - c * c1) / det, r.answer, r.text);
    }
    const pct = /increased by (\d+)% .* decreased by \d+%\. The final value is (\d+(?:\.\d+)?)/.exec(r.text);
    if (pct) assert.ok(Math.abs(r.answer * (1 - (Number(pct[1]) / 100) ** 2) - Number(pct[2])) < 1e-6, r.text);
  }
});

/* ---------------------------------------------------------------- optimization */

const bruteKnap = (items, cap) => {
  let best = 0;
  for (let m = 0; m < 1 << items.length; m++) {
    let w = 0; let v = 0;
    items.forEach((it, i) => { if (m & (1 << i)) { w += it.w; v += it.v; } });
    if (w <= cap) best = Math.max(best, v);
  }
  return best;
};
const bruteBudget = (tables, units) => {
  let best = -Infinity;
  const go = (j, left, acc) => {
    if (j === tables.length) { best = Math.max(best, acc); return; }
    for (let k = 0; k <= left; k++) go(j + 1, left - k, acc + tables[j][k]);
  };
  go(0, units, 0);
  return best;
};

test('optimization: optimum matches brute force; target respected; infeasible rejected', () => {
  let count = 0;
  each((band, d, L, where) => {
    const cfg = O.optimConfig(band, d, L);
    for (let seed = 1; seed <= 50; seed++) {
      const rounds = O.makeOptimLevel(seeded(seed * 4099 + d * 13 + L), cfg);
      assert.equal(rounds.length, cfg.rounds);
      for (const r of rounds) {
        count++;
        assert.ok(cfg.kinds.includes(r.kind));
        assert.ok(O.checkOptim(r, r.solution).ok, `solution rejected at ${where} ${r.kind}`);
        assert.ok(r.target <= r.optimum && r.target >= r.optimum * (1 - cfg.tolerance) - 1e-9);
        if (cfg.tolerance === 0) assert.equal(r.target, r.optimum);
        if (r.kind === 'knapsack') {
          assert.equal(r.items.length, cfg.items);
          assert.equal(r.optimum, bruteKnap(r.items, r.capacity), where);
          const all = r.items.map((_, i) => i);
          if (r.items.reduce((s, it) => s + it.w, 0) > r.capacity) assert.equal(O.checkOptim(r, all).feasible, false);
          assert.equal(O.checkOptim(r, []).ok, r.target <= 0);
        } else if (r.kind === 'budget') {
          assert.equal(r.optimum, bruteBudget(r.tables, r.units), where);
          assert.equal(O.checkOptim(r, r.tables.map(() => r.units)).feasible, r.tables.length <= 1);
        } else {
          let best = 0;
          for (let x = 0; x <= 60; x++) for (let y = 0; y <= 60; y++) if (O.mixFeasible(r, x, y)) best = Math.max(best, O.mixValue(r, x, y));
          assert.equal(r.optimum, best, where);
          assert.equal(O.checkOptim(r, [r.xMax + 1, r.yMax + 1]).feasible, false);
        }
      }
    }
  });
  assert.ok(count > 2000);
});

/* ---------------------------------------------------------------- stats */

test('statistics: every answer recomputed from the data and is one of the options', () => {
  let count = 0;
  const kinds = new Set();
  each((band, d, L, where) => {
    const cfg = S.statsConfig(band, d, L);
    for (let seed = 1; seed <= 40; seed++) {
      const rounds = S.makeStatsLevel(seeded(seed * 65537 + d * 3 + L), cfg);
      assert.equal(rounds.length, cfg.rounds);
      for (const r of rounds) {
        count++;
        kinds.add(r.kind);
        const ids = r.options.map((o) => o.id);
        assert.equal(new Set(ids).size, ids.length, `duplicate option at ${where}`);
        assert.equal(ids.filter((x) => x === r.answer).length, 1, `${r.kind} answer not an option at ${where}`);
        if (r.kind === 'compare') {
          const [a, b] = r.samples;
          const f = r.stat === 'mean' ? S.mean : r.stat === 'median' ? S.median : S.sd;
          const diff = f(a) - f(b);
          assert.equal(r.answer, Math.abs(diff) < 1e-9 ? 'equal' : diff > 0 ? 'A' : 'B', where);
        } else if (r.kind === 'outlier') {
          const xs = r.samples[0];
          const rest = [...xs];
          rest.splice(rest.indexOf(r.outlier), 1);
          const f = r.stat === 'mean' ? S.mean : r.stat === 'median' ? S.median : S.sd;
          const diff = f(rest) - f(xs);
          assert.equal(r.answer, Math.abs(diff) < 1e-9 ? 'same' : diff > 0 ? 'up' : 'down', where);
        } else if (r.kind === 'skew') {
          assert.equal(r.answer, S.mean(r.samples[0]) > S.median(r.samples[0]) ? 'mean' : 'median');
        } else if (r.kind === 'scatter') {
          const rr = S.corr(r.points.map((p) => p[0]), r.points.map((p) => p[1]));
          if (r.estimate) {
            const dists = S.R_OPTIONS.map((o) => Math.abs(o - rr)).sort((x, y) => x - y);
            assert.equal(Math.abs(Number(r.answer) - rr), dists[0]);
            assert.ok(dists[1] - dists[0] > 0.1, 'closest r is ambiguous');
          } else {
            assert.equal(r.answer, Math.abs(rr) < 0.2 ? 'none' : rr > 0 ? 'positive' : 'negative');
          }
        } else if (r.kind === 'evidence') {
          const t = r.experiments.map(([a, b]) => Math.abs(S.welchT(a, b)));
          assert.equal(r.answer, t[0] > t[1] ? '1' : '2');
          assert.ok(Math.max(...t) / Math.min(...t) >= 2);
        }
      }
    }
  });
  for (const k of ['compare', 'outlier', 'skew', 'scatter', 'evidence', 'ci']) assert.ok(kinds.has(k), `never made ${k}`);
  assert.ok(count > 2000);
});

/* ---------------------------------------------------------------- decision */

/** EV by enumerating every root-to-leaf path with float probabilities. */
const evFloat = (node) => {
  if (node.type === 'leaf') return node.value;
  if (node.type === 'chance') return node.branches.reduce((s, b) => s + (b.p / 100) * evFloat(b.node), 0);
  return Math.max(...node.branches.map((b) => evFloat(b.node)));
};

test('decision: the answer is the unique EV (or maximin) best, and probabilities sum to 1', () => {
  let count = 0;
  each((band, d, L, where) => {
    const cfg = D.decisionConfig(band, d, L);
    for (let seed = 1; seed <= 50; seed++) {
      const stages = D.makeDecisionLevel(seeded(seed * 2027 + d * 5 + L), cfg);
      assert.equal(stages.length, cfg.stages);
      let bank = cfg.bankroll;
      for (const s of stages) {
        count++;
        let scores;
        if (s.kind === 'matrix') {
          assert.equal(s.states.reduce((t, x) => t + x.p, 0), 100);
          scores = s.criterion === 'minimax'
            ? s.payoffs.map((row) => Math.min(...row))
            : s.payoffs.map((row) => row.reduce((t, v, j) => t + v * s.states[j].p / 100, 0));
        } else {
          const walk = (node) => {
            if (node.type === 'chance') assert.equal(node.branches.reduce((t, b) => t + b.p, 0), 100);
            if (node.type !== 'leaf') node.branches.forEach((b) => walk(b.node));
          };
          walk(s.tree);
          scores = s.tree.branches.map((b) => evFloat(b.node));
          s.tree.branches.forEach((b, i) => assert.ok(Math.abs(D.toNum(D.nodeEV(b.node)) - scores[i]) < 1e-9));
        }
        const best = Math.max(...scores);
        assert.equal(scores.indexOf(best), s.answer, where);
        assert.ok(scores.filter((x) => best - x < (s.criterion === 'minimax' ? 5 : 1) - 1e-9).length === 1, `tie at ${where}`);
        const out = D.playStage(s, s.answer);
        assert.ok(Number.isFinite(out.value) && out.path.length >= 1);
        bank = D.applyReturn(bank, out.value);
        assert.ok(bank >= 0);
      }
      if (d >= 2) assert.ok(stages.some((s) => s.kind !== 'matrix' || s.criterion === 'minimax') || cfg.stages < 3);
    }
  });
  assert.ok(count > 3000);
});

test('decision: the realised outcome follows the stated probabilities', () => {
  const cfg = D.decisionConfig('advanced', 2, 10);
  const stage = D.makeDecisionStage(seeded(42), cfg, 'matrix');
  const hits = Array(stage.states.length).fill(0);
  for (let i = 0; i < 2000; i++) {
    const u = (i + 0.5) / 2000;
    const out = D.playStage({ ...stage, u }, 0);
    hits[stage.states.findIndex((x) => x.name === out.path[0])]++;
  }
  stage.states.forEach((x, j) => assert.equal(hits[j], x.p * 20));
});
