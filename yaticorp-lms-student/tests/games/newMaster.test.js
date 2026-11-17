/**
 * Master Minds games (2026-11-13): Probability Lab and Algorithm Builder.
 *
 * Probability: every exact answer (closed-form rational arithmetic) is re-derived by enumerating the
 * experiment's equally likely outcomes, and checked again by a seeded simulation, for many generated rounds.
 * Algorithms: every level's reference solution runs to success in the game's own interpreter and uses exactly
 * the optimal number of blocks — and a brute-force search proves no shorter program solves the fixed levels.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const P = await import('../../src/career/data/bands/probability.js');
const A = await import('../../src/career/data/bands/algorithm.js');
const { seeded } = await import('../../src/career/data/seeded.js');

const BANDS = ['analytical', 'advanced'];

/** Exact P(judge) over an equally likely space, null outcomes left out (conditioning). */
const enumerate = (space, judge) => {
  let hit = 0;
  let n = 0;
  for (const o of space) {
    const j = judge(o);
    if (j === null) continue;
    n += 1;
    if (j) hit += 1;
  }
  return P.frac(hit, n);
};

/** Simulated frequency must sit within 4.5 standard errors of the exact value. */
const assertSim = (exact, draw, judge, label, trials = 6000) => {
  const rng = seeded(12345);
  let hit = 0;
  let n = 0;
  for (let t = 0; t < trials * 4 && n < trials; t++) {
    const j = judge(draw(rng));
    if (j === null) continue;
    n += 1;
    if (j) hit += 1;
  }
  const p = P.toNum(exact);
  const se = Math.sqrt(Math.max(p * (1 - p), 1e-4) / n);
  assert.ok(Math.abs(hit / n - p) <= 4.5 * se + 1e-9, `${label}: simulated ${hit}/${n} vs exact ${P.fmt(exact)}`);
};

test('fractions reduce and compare exactly', () => {
  assert.deepEqual(P.frac(6, 36), { n: 1, d: 6 });
  assert.deepEqual(P.add(P.frac(1, 3), P.frac(1, 6)), { n: 1, d: 2 });
  assert.deepEqual(P.sub(P.frac(1, 4), P.frac(1, 2)), { n: -1, d: 4 });
  assert.deepEqual(P.div(P.frac(9, 36), P.frac(27, 36)), { n: 1, d: 3 });
  assert.equal(P.cmp(P.frac(2, 7), P.frac(1, 3)), -1);
  assert.equal(P.choose(8, 3), 56);
  assert.equal(P.fmtMoney(P.frac(-5, 4)), '−1.25');
});

test('probability: every round’s exact answer matches enumeration and simulation', () => {
  let rounds = 0;
  const kinds = new Set();
  for (const band of BANDS) {
    for (let d = 1; d <= 3; d++) {
      for (let seed = 1; seed <= 40; seed++) {
        const levelNo = 1 + ((seed * 7) % 30);
        const level = P.probabilityLevel(seeded(seed * 101 + d), band, d, levelNo);
        assert.ok(level.length >= 5 && level.length <= 7);
        for (const r of level) {
          rounds += 1;
          kinds.add(`${band}:${r.kind}`);
          if (r.kind === 'estimate') {
            const exact = enumerate(r.space(), r.judge);
            assert.ok(P.eq(exact, r.exact), `${r.prompt}: enumeration ${P.fmt(exact)} ≠ ${P.fmt(r.exact)}`);
            assert.ok(P.toNum(r.exact) >= 0 && P.toNum(r.exact) <= 1);
            // The slider can reach a correct answer, and its two extremes are wrong unless the answer is 0 or 1.
            const ks = Array.from({ length: r.den + 1 }, (_, k) => k);
            assert.ok(ks.some((k) => P.estimateOk(r, k)), `${r.prompt}: no slider stop within tolerance`);
            if (seed % 5 === 0) assertSim(r.exact, r.draw, r.judge, r.prompt);
          } else if (r.kind === 'bags') {
            r.bags.forEach((_, i) => {
              const exact = enumerate(r.space(i), r.judge);
              assert.ok(P.eq(exact, r.probs[i]), `bag ${i}: ${P.fmt(exact)} ≠ ${P.fmt(r.probs[i])}`);
              if (seed % 8 === 0) assertSim(r.probs[i], (g) => r.draw(g, i), r.judge, `bag ${i}`);
            });
            const best = r.probs.filter((p) => P.eq(p, r.probs[r.answer]));
            assert.equal(best.length, 1, 'the best bag is unique');
            r.probs.forEach((p) => assert.ok(P.cmp(p, r.probs[r.answer]) <= 0));
            assert.equal(r.pair, band === 'advanced', 'advanced bags draw two without replacement');
          } else {
            assert.equal(band, 'advanced', 'expected value is an advanced idea');
            r.games.forEach((g, i) => {
              const space = r.space(i);
              let total = P.frac(0);
              space.forEach((o) => { total = P.add(total, P.frac(r.value(i, o))); });
              const ev = P.div(total, P.frac(space.length));
              assert.ok(P.eq(ev, g.ev), `game ${i}: enumerated EV ${P.fmt(ev)} ≠ ${P.fmt(g.ev)}`);
              assert.ok(P.eq(g.ev, P.sub(P.mul(g.p, P.frac(g.prize)), P.frac(g.fee))));
            });
            assert.equal(P.cmp(r.games[r.answer].ev, r.games[1 - r.answer].ev), 1, 'the answer has the strictly higher EV');
            if (seed % 6 === 0) {
              const rng = seeded(seed);
              const means = r.games.map((_, i) => {
                let s = 0;
                for (let t = 0; t < 20000; t++) s += r.value(i, r.draw(rng, i));
                return s / 20000;
              });
              r.games.forEach((g, i) => {
                const spread = g.prize * Math.sqrt(P.toNum(g.p) * (1 - P.toNum(g.p)) / 20000);
                assert.ok(Math.abs(means[i] - P.toNum(g.ev)) <= 4.5 * spread + 1e-9, `game ${i} simulated mean`);
              });
            }
          }
        }
      }
    }
  }
  assert.ok(rounds > 1000);
  for (const k of ['analytical:bags', 'analytical:estimate', 'advanced:bags', 'advanced:estimate', 'advanced:bets']) assert.ok(kinds.has(k), `no ${k} rounds`);
  assert.ok(!kinds.has('analytical:bets'));
});

test('probability: analytical rounds never use conditioning; advanced ones do', () => {
  let conditional = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const a = P.estimateRound(seeded(seed), 'analytical', 2);
    assert.ok(a.space().every((o) => a.judge(o) !== null), a.prompt);
    const b = P.estimateRound(seeded(seed), 'advanced', 2);
    if (b.space().some((o) => b.judge(o) === null)) conditional += 1;
  }
  assert.ok(conditional > 20);
});

test('algorithm interpreter: brackets, crashes, early finish, step limit', () => {
  assert.equal(A.parse([{ op: 'end' }]).ok, false);
  assert.equal(A.parse([{ op: 'repeat', n: 2 }, { op: 'fwd' }]).ok, false);
  assert.deepEqual(A.depths([{ op: 'repeat', n: 2 }, { op: 'fwd' }, { op: 'end' }, { op: 'fwd' }]), [0, 1, 0, 0]);
  assert.equal(A.matchingEnd([{ op: 'repeat', n: 2 }, { op: 'ifWall' }, { op: 'end' }, { op: 'end' }], 0), 3);
  const level = { type: 'robot', map: A.parseMap(['>.G#']) };
  assert.equal(A.runOnce(level, [{ op: 'fwd' }], null).ok, false);
  assert.equal(A.runOnce(level, [{ op: 'repeat', n: 9 }, { op: 'fwd' }, { op: 'end' }], null).ok, true, 'stops at the last gem');
  assert.match(A.runOnce(level, [{ op: 'left' }, { op: 'fwd' }], null).error, /wall/);
  const reg = { type: 'register', target: 'A', cases: [{ A: 0 }], goal: () => 1 };
  assert.match(A.runOnce(reg, [{ op: 'repeat', n: 9 }, { op: 'repeat', n: 9 }, { op: 'repeat', n: 9 }, { op: 'repeat', n: 9 }, { op: 'inc', r: 'A' }, { op: 'end' }, { op: 'end' }, { op: 'end' }, { op: 'end' }], { A: 0 }).error, /too long/);
  const traced = A.runOnce(level, [{ op: 'fwd' }, { op: 'fwd' }], null, { trace: true });
  assert.equal(traced.frames.length, 2);
  assert.deepEqual([A.starsForBlocks(4, 4), A.starsForBlocks(6, 4), A.starsForBlocks(7, 4)], [3, 2, 1]);
});

test('algorithm: every fixed level’s reference solves it, at the optimum, and nothing shorter does', () => {
  assert.ok(A.ALL_FIXED.length >= 20);
  for (const { band, level } of A.ALL_FIXED) {
    const r = A.verify(level, level.ref);
    assert.ok(r.ok, `${level.title}: ${r.error}`);
    assert.equal(A.blockCount(level.ref), level.opt);
    if (band === 'analytical') assert.ok(!level.palette.some((p) => ['ifWall', 'ifGt', 'ifOdd'].includes(p.op)), `${level.title}: analytical uses no conditionals`);
    for (const p of A.programs(level.palette, level.opt - 1, level.maxRepeat)) {
      assert.ok(!A.verify(level, p).ok, `${level.title}: shorter solution\n${A.programText(p)}`);
    }
  }
});

test('algorithm: generated levels for every band, difficulty and step are solvable at their optimum', () => {
  let n = 0;
  const types = new Set();
  for (const band of BANDS) {
    for (let d = 1; d <= 3; d++) {
      for (let levelNo = 1; levelNo <= 30; levelNo++) {
        for (let seed = 1; seed <= 3; seed++) {
          const l = A.algorithmLevel(band, d, levelNo, seeded(seed * 1000 + levelNo * 10 + d));
          types.add(`${band}:${l.type}${l.mode ? `:${l.mode}` : ''}`);
          const r = A.verify(l, l.ref);
          assert.ok(r.ok, `${band} ${d}/${levelNo} ${l.title}: ${r.error}`);
          assert.equal(A.blockCount(l.ref), l.opt);
          assert.ok(l.opt <= l.maxBlocks);
          if (l.type === 'cards' && l.mode === 'swap') {
            assert.ok(l.deck.length >= 3 && l.deck.length <= 5);
            assert.ok(l.opt >= 2);
          }
          n += 1;
        }
      }
    }
  }
  assert.ok(n >= 540);
  for (const t of ['analytical:robot', 'analytical:cards:swap', 'analytical:register', 'advanced:robot', 'advanced:cards:machine', 'advanced:register']) assert.ok(types.has(t), `no ${t}`);
});

test('algorithm: card levels — swaps cannot beat the inversion count, the sorting machine has no shorter program', () => {
  const deck = [3, 1, 2];
  const swapLevel = { type: 'cards', mode: 'swap', deck };
  const palette = [{ op: 'swap', i: 0 }, { op: 'swap', i: 1 }];
  for (const p of A.programs(palette, 1)) assert.ok(!A.verify(swapLevel, p).ok);
  assert.ok(A.verify(swapLevel, A.bubbleSwaps(deck)).ok);
  assert.equal(A.bubbleSwaps([5, 4, 3, 2, 1]).length, 10);
  for (const deal of [[3, 2, 1], [4, 1, 3, 2]]) {
    const n = deal.length;
    const l = A.algorithmLevel('advanced', 2, 1, seeded(1));
    const level = { ...l, deck: deal };
    const ref = [{ op: 'repeat', n: n - 1 }, { op: 'home' }, { op: 'repeat', n: n - 1 }, { op: 'cmpSwap' }, { op: 'step' }, { op: 'end' }, { op: 'end' }];
    assert.ok(A.verify(level, ref).ok);
    for (const p of A.programs(level.palette, 4, 6)) assert.ok(!A.verify(level, p).ok, A.programText(p));
  }
});
