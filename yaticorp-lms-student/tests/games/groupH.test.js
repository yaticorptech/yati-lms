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
