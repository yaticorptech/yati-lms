/**
 * Young Thinkers group A: Animal Pair Safari, What's Missing?, Shape Builder, Mini Maze Mission, Count & Catch,
 * Number Hop. Every generated round is valid: one right answer, solvable, checker accepts the solution and
 * rejects wrong ones, sizes grow with difficulty.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { seeded } = await import('../../src/career/data/seeded.js');
const A = await import('../../src/career/data/bands/youngA.js');

const BANDS = ['foundation', 'developing'];
const LEVEL_NOS = [1, 9, 10, 15, 20, 30];
const each = (fn) => {
  for (const band of BANDS) for (let d = 1; d <= 3; d++) for (const L of LEVEL_NOS) fn(band, d, L, `${band}/d${d}/L${L}`);
};

test('Animal Pair Safari: each animal pairs with exactly one partner nobody else on the board could claim', () => {
  let count = 0;
  each((band, d, L, where) => {
    const cfg = A.safariConfig(band, d, L);
    for (let seed = 1; seed <= 80; seed++) {
      const deck = A.makeSafariDeck(seeded(seed * 7919 + d * 31 + L), cfg);
      count++;
      assert.equal(deck.length, cfg.pairs * 2, where);
      assert.ok(cfg.cols * Math.ceil(deck.length / cfg.cols) >= deck.length);
      const partners = deck.filter((c) => c.kind !== 'animal');
      const animals = deck.filter((c) => c.kind === 'animal');
      assert.equal(animals.length, cfg.pairs, where);
      assert.equal(new Set(partners.map((p) => p.word.toLowerCase())).size, partners.length, `repeat partner at ${where}`);
      for (const p of partners) assert.ok(cfg.kinds.includes(p.kind), where);
      for (const a of animals) {
        const mine = deck.filter((c) => c.pair === a.pair);
        assert.equal(mine.length, 2, where);
        const partner = mine.find((c) => c !== a);
        assert.ok(A.safariMatch(a, partner));
        assert.ok(!A.safariMatch(a, a));
        for (const other of animals) {
          if (other === a) continue;
          const info = A.SAFARI_ANIMALS.find((x) => x.name === other.word);
          assert.ok(!A.safariFacts(info).has(partner.word.toLowerCase()), `${partner.word} also fits ${other.word} at ${where}`);
          assert.ok(!A.safariMatch(other, partner));
        }
      }
      if (cfg.band === 'foundation') assert.ok(partners.every((p) => p.kind === 'sound'));
      else assert.ok(new Set(partners.map((p) => p.kind)).size >= 2, `not mixed at ${where}`);
    }
  });
  assert.ok(count >= 2500);
  assert.equal(A.safariConfig('foundation', 1, 1).pairs * 2, 8); assert.equal(A.safariConfig('developing', 1, 1).pairs * 2, 8); // level 1: 2 rows of 4 (2026-11-18)
});

test("What's Missing?: the missing things are in the tray once, and only they are right", () => {
  each((band, d, L, where) => {
    const cfg = A.missingConfig(band, d, L);
    for (let seed = 1; seed <= 80; seed++) {
      const rounds = A.makeMissingLevel(seeded(seed * 104729 + d * 17 + L), cfg);
      assert.equal(rounds.length, cfg.rounds);
      for (const r of rounds) {
        assert.equal(r.scene.length, cfg.objects, where);
        assert.equal(r.missing.length, cfg.missing, where);
        assert.equal(r.after.length, cfg.objects - cfg.missing, where);
        assert.equal(r.tray.length, cfg.tray, where);
        const trayE = r.tray.map((t) => t.emoji);
        assert.equal(new Set(trayE).size, trayE.length, where);
        const slotsBefore = r.scene.map((o) => o.slot);
        const slotsAfter = r.after.map((o) => o.slot);
        assert.equal(new Set(slotsBefore).size, slotsBefore.length);
        assert.equal(new Set(slotsAfter).size, slotsAfter.length);
        assert.ok([...slotsBefore, ...slotsAfter].every((s) => s >= 0 && s < cfg.slots));
        const afterE = new Set(r.after.map((o) => o.emoji));
        for (const m of r.missing) {
          assert.equal(trayE.filter((e) => e === m.emoji).length, 1);
          assert.ok(!afterE.has(m.emoji));
          assert.ok(A.missingCheck(r, m.emoji));
        }
        for (const t of r.tray) if (!r.missing.some((m) => m.emoji === t.emoji)) assert.ok(!A.missingCheck(r, t.emoji));
        if (!cfg.shuffle) for (const o of r.after) assert.equal(o.slot, r.scene.find((s) => s.emoji === o.emoji).slot);
        const stillThere = r.tray.filter((t) => afterE.has(t.emoji)).length;
        assert.equal(stillThere, cfg.present, where);
      }
    }
  });
  assert.equal(A.missingConfig('foundation', 1, 1).missing, 1);
  assert.equal(A.missingConfig('developing', 3, 30).missing, 2);
});

test('Shape Builder: the pieces exactly fill the silhouette, and a turned triangle does not fit', () => {
  let count = 0;
  each((band, d, L, where) => {
    const cfg = A.shapeConfig(band, d, L);
    for (let seed = 1; seed <= 60; seed++) {
      const puzzles = A.makeShapeLevel(seeded(seed * 31337 + d * 13 + L), cfg);
      assert.equal(puzzles.length, cfg.puzzles);
      for (const p of puzzles) {
        count++;
        assert.equal(p.tray.length, cfg.pieces, where);
        const area = p.tray.reduce((s, t) => s + A.SHAPE_PIECES[t.type].cells.length, 0);
        assert.equal(area, Object.keys(p.target).length, where);
        // The solution places, in order, and fills every cell.
        const filled = new Set();
        for (const s of p.solution) {
          const abs = A.placeAt(p.target, filled, A.pieceCells(s.type, s.rot), s.r, s.c);
          assert.ok(abs, `solution misfit at ${where}`);
          abs.forEach((a) => filled.add(`${a.r},${a.c}`));
          // A placed piece cannot go on top of itself again.
          assert.equal(A.placeAt(p.target, filled, A.pieceCells(s.type, s.rot), s.r, s.c), null);
        }
        assert.equal(filled.size, Object.keys(p.target).length);
        // Every tray piece can be turned into a solution orientation.
        for (const t of p.tray) {
          const reachable = [0, 1, 2, 3].map((k) => JSON.stringify(A.pieceCells(t.type, t.rot + k)));
          assert.ok(p.solution.some((s) => s.type === t.type && reachable.includes(JSON.stringify(A.pieceCells(s.type, s.rot)))));
          if (!cfg.rotate) assert.ok(p.solution.some((s) => s.type === t.type && s.rot === t.rot));
        }
        // A triangle turned the wrong way never fits a triangle cell.
        for (const [k, t] of Object.entries(p.target)) {
          if (t === 'F') continue;
          const [r, c] = k.split(',').map(Number);
          const wrong = ['tl', 'tr', 'br', 'bl'].find((x) => x !== t);
          assert.equal(A.fitPiece(p.target, new Set(), [{ r: 0, c: 0, t: wrong }], r, c), null);
          assert.ok(A.fitPiece(p.target, new Set(), [{ r: 0, c: 0, t }], r, c));
        }
      }
    }
  });
  assert.ok(count >= 2000);
  // Four quarter turns are the identity; a turned L is still three cells.
  const L = A.pieceCells('ell', 0);
  assert.deepEqual(A.rotateCells(L, 4), L);
  assert.deepEqual(A.pieceCells('tri', 1), [{ r: 0, c: 0, t: 'tl' }]);
  assert.ok(A.shapeConfig('developing', 3, 30).pieces > A.shapeConfig('foundation', 1, 1).pieces);
});

test('Mini Maze Mission: the goal and every star are reachable without touching a hazard; the bee stays off the route', () => {
  let count = 0;
  each((band, d, L, where) => {
    const cfg = A.mazeConfig(band, d, L);
    for (let seed = 1; seed <= 40; seed++) {
      const mazes = A.makeMazeLevel(seeded(seed * 65537 + d * 7 + L), cfg);
      assert.equal(mazes.length, cfg.mazes);
      for (const m of mazes) {
        count++;
        assert.equal(m.size, cfg.size);
        assert.notDeepEqual(m.start, m.goal);
        const hazards = A.mazeHazards(m);
        const route = A.mazePath(m, m.start, m.goal, hazards);
        assert.ok(route, `unsolvable at ${where}`);
        assert.equal(route.length - 1, m.optimal);
        assert.equal(m.puddles.length, cfg.puddles, where);
        assert.equal(m.stars.length, cfg.stars, where);
        if (cfg.bee) {
          assert.ok(m.bee.length >= 2, where);
          for (let i = 1; i < m.bee.length; i++) {
            const [r, c] = m.bee[i - 1];
            assert.ok(Object.keys(A.MAZE_DIRS).some((dir) => {
              const n = A.mazeStep(m, r, c, dir);
              return n && n[0] === m.bee[i][0] && n[1] === m.bee[i][1];
            }), 'bee patrol not joined');
          }
          for (let t = 0; t < 10; t++) assert.ok(m.bee.some((b) => b === A.beeAt(m, t)));
        } else assert.equal(m.bee.length, 0);
        assert.ok(!hazards.has(`${m.start[0]},${m.start[1]}`) && !hazards.has(`${m.goal[0]},${m.goal[1]}`));
        const reach = A.mazeDistances(m, m.start, hazards);
        for (const [r, c] of m.stars) assert.ok(reach.has(`${r},${c}`), `star unreachable at ${where}`);
        assert.ok(Number.isFinite(A.mazeTour(m, m.stars)));
        assert.equal(A.mazeTour(m, []), m.optimal);
        // Walking the route move by move works, and the score for a clean run is the maximum.
        let [r, c] = m.start;
        for (const [nr, nc] of route.slice(1)) {
          const dir = Object.keys(A.MAZE_DIRS).find((k) => { const n = A.mazeStep(m, r, c, k); return n && n[0] === nr && n[1] === nc; });
          assert.ok(dir);
          [r, c] = [nr, nc];
        }
        assert.equal(A.mazeScore(m, cfg, { moves: A.mazeTour(m, m.stars), bumps: 0, collected: m.stars }), 4 + m.stars.length);
        assert.equal(A.mazeScore(m, cfg, { moves: 999, bumps: 99, collected: [] }), 2);
      }
    }
  });
  assert.ok(count >= 2000);
  // Walls on the outside edge always stop you.
  const m = A.makeMaze(seeded(5), A.mazeConfig('foundation', 1, 1));
  assert.equal(A.mazeStep(m, 0, 0, 'up'), null);
  assert.equal(A.mazeStep(m, 0, 0, 'left'), null);
  assert.ok(A.mazeConfig('developing', 3, 30).size > A.mazeConfig('foundation', 1, 1).size);
});

test('Count & Catch: enough of each asked kind falls, the sum is right, and only an exact basket passes', () => {
  each((band, d, L, where) => {
    const cfg = A.catchConfig(band, d, L);
    for (let seed = 1; seed <= 80; seed++) {
      const rounds = A.makeCatchLevel(seeded(seed * 2654435 + d * 11 + L), cfg);
      assert.equal(rounds.length, cfg.rounds);
      for (const r of rounds) {
        assert.ok(cfg.modes.includes(r.mode));
        if (r.mode === 'more') assert.equal(r.targets[0].count, r.a + r.b);
        if (r.mode === 'fewer') assert.equal(r.targets[0].count, r.a - r.b);
        if (r.mode === 'two') assert.equal(r.targets.length, 2);
        for (const t of r.targets) {
          assert.ok(t.count >= 1 && t.count <= 12, where);
          const supply = r.stream.filter((s) => s.kind === t.kind).length;
          assert.ok(supply >= t.count + cfg.extra, `too few ${t.kind} at ${where}`);
          assert.ok(r.prompt.includes(String(r.mode === 'plain' || r.mode === 'two' ? t.count : r.a)));
        }
        assert.ok(r.stream.some((s) => !r.targets.some((t) => t.kind === s.kind)), 'no other kinds to avoid');
        assert.ok(r.stream.every((s) => s.x >= 5 && s.x <= 95 && s.dur > 2000));
        const ids = r.stream.map((s) => s.id);
        assert.equal(new Set(ids).size, ids.length);
        const exact = r.targets.flatMap((t) => Array(t.count).fill(t.kind));
        assert.ok(A.catchCheck(r, exact));
        assert.ok(!A.catchCheck(r, exact.slice(1)), 'under-catch passed');
        assert.ok(!A.catchCheck(r, [...exact, r.targets[0].kind]), 'over-catch passed');
        const other = r.stream.find((s) => !r.targets.some((t) => t.kind === s.kind)).kind;
        assert.ok(!A.catchCheck(r, [...exact, other]), 'wrong kind passed');
        if (cfg.band === 'foundation') assert.equal(r.mode, 'plain');
      }
    }
  });
  assert.ok(A.catchConfig('developing', 3, 30).maxCount > A.catchConfig('foundation', 1, 1).maxCount);
});

test('Number Hop: the answer is on exactly one pad, the frog starts on another, and the sums are right', () => {
  each((band, d, L, where) => {
    const cfg = A.hopConfig(band, d, L);
    for (let seed = 1; seed <= 120; seed++) {
      const rounds = A.makeHopLevel(seeded(seed * 9973 + d * 5 + L), cfg);
      assert.equal(rounds.length, cfg.rounds);
      for (const r of rounds) {
        const w = `${where}/${r.mode}`;
        assert.equal(new Set(r.pads).size, r.pads.length, w);
        assert.ok(r.pads.length >= 3 && r.pads.length <= cfg.pads, w);
        assert.equal(r.pads.filter((p) => p === r.answer).length, 1, w);
        assert.ok(r.pads.includes(r.start), w);
        assert.notEqual(r.start, r.answer, w);
        assert.ok(r.pads.every((p) => Number.isInteger(p) && p >= 0 && p <= cfg.max), w);
        const expect = {
          add: () => r.a + r.b, sub: () => r.a - r.b, tens: () => r.a + r.b,
          after: () => r.a + 1, before: () => r.a - 1,
          skip: () => r.a + r.step * r.b, skip2: () => r.seq[2] + 2, missing: () => r.seq[r.gap]
        }[r.mode]();
        assert.equal(r.answer, expect, w);
        if (r.mode === 'missing') for (let i = 1; i < r.seq.length; i++) assert.equal(r.seq[i] - r.seq[i - 1], r.step);
        assert.ok(A.hopCheck(r, r.answer));
        assert.ok(r.pads.filter((p) => p !== r.answer).every((p) => !A.hopCheck(r, p)));
        assert.ok(r.prompt.length > 5);
      }
    }
  });
  assert.equal(A.hopConfig('foundation', 1, 1).max, 10);
  assert.equal(A.hopConfig('developing', 1, 1).max, 100);
});
