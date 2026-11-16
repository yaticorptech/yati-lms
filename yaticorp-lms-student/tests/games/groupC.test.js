/**
 * Group C (Rising Brains): Sequence Vault, Grid Navigator, Focus Filter, Dual-Image Recall, Tower Strategy, Clue Chain.
 * Every generated round is valid, answerable in exactly one way, and the checkers accept the answer and reject others.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { seeded } = await import('../../src/career/data/seeded.js');
const vault = await import('../../src/career/data/bands/cVault.js');
const nav = await import('../../src/career/data/bands/cGridNav.js');
const focus = await import('../../src/career/data/bands/cFocus.js');
const dual = await import('../../src/career/data/bands/cDual.js');
const towers = await import('../../src/career/data/bands/cTowers.js');
const clues = await import('../../src/career/data/bands/cClues.js');

const BANDS = ['intermediate', 'analytical', 'foundation', 'advanced', null];
const LEVEL_NOS = [1, 10, 20, 30];

const each = (configFn, seeds, fn) => {
  let count = 0;
  for (const band of BANDS) {
    for (let d = 1; d <= 3; d++) {
      for (const levelNo of LEVEL_NOS) {
        const cfg = configFn(band, d, levelNo);
        for (let seed = 1; seed <= seeds; seed++) {
          fn(cfg, seeded(seed * 7919 + d * 31 + levelNo), `${band}/d${d}/L${levelNo}/seed ${seed}`, { band, d, levelNo });
          count++;
        }
      }
    }
  }
  return count;
};

test('configs stay inside the smart section and grow with difficulty', () => {
  for (const fn of [vault.vaultConfig, nav.navConfig, focus.focusConfig, dual.dualConfig, towers.towerStratConfig, clues.clueConfig]) {
    for (const band of BANDS) assert.ok(['intermediate', 'analytical'].includes(fn(band, 1, 1).band));
  }
  const vi = vault.vaultConfig('intermediate', 1, 1);
  const va = vault.vaultConfig('analytical', 3, 30);
  assert.ok(va.doors * va.length > vi.doors * vi.length && va.rules > vi.rules);
  assert.ok(nav.navConfig('analytical', 3, 30).moves > nav.navConfig('intermediate', 1, 1).moves);
  assert.ok(focus.focusConfig('analytical', 3, 30).windowMs < focus.focusConfig('intermediate', 1, 1).windowMs);
  const di = dual.dualConfig('intermediate', 1, 1);
  const da = dual.dualConfig('analytical', 3, 30);
  assert.ok(da.rows * da.cols > di.rows * di.cols && di.tell && !da.tell);
  assert.equal(towers.towerStratConfig('analytical', 1, 1).misere, true);
  assert.equal(towers.towerStratConfig('intermediate', 3, 1).misere, false);
  assert.ok(clues.clueConfig('analytical', 3, 30).people > clues.clueConfig('intermediate', 1, 1).people);
});

test('Sequence Vault: every round is a fresh vault, and its answer is the code after every change', () => {
  const n = each(vault.vaultConfig, 60, (cfg, rng, where) => {
    const level = vault.makeVaultLevel(rng, cfg);
    assert.equal(level.steps.length, cfg.asks, where);
    level.steps.forEach((s, i) => {
      assert.equal(s.doors.length, cfg.doors, where);
      assert.equal(new Set(s.doors.map((d) => d.code.join(''))).size, cfg.doors, `codes repeat at ${where}`);
      assert.equal(s.changes.length, i === 0 ? Math.max(0, cfg.rules - 1) : cfg.rules, where);
      const cur = s.doors.map((d) => [...d.code]);
      for (const { rule, ruleText } of s.changes) {
        const before = cur[rule.door].join('');
        cur[rule.door] = vault.applyRule(cur[rule.door], rule);
        assert.notEqual(cur[rule.door].join(''), before, `rule changes nothing at ${where}`);
        assert.ok(cfg.kinds.includes(rule.kind), where);
        assert.ok(ruleText.length > 10, where);
      }
      assert.deepEqual(s.answer, cur[s.door], where);
      assert.ok(s.answer.every((d) => d >= 0 && d <= 9), where);
      assert.ok(vault.checkCode(s.answer, s.answer.join('')), where);
      const wrong = [...s.answer];
      wrong[0] = (wrong[0] + 1) % 10;
      assert.ok(!vault.checkCode(s.answer, wrong), where);
      assert.ok(!vault.checkCode(s.answer, s.answer.slice(1)), where);
    });
    // The codes keep changing: no two rounds share the same vault.
    assert.ok(new Set(level.steps.map((s) => s.doors.map((d) => d.code.join('')).join('|'))).size > 1, where);
  });
  assert.ok(n >= 3000);
  assert.deepEqual(vault.applyRule([9, 0, 5], { kind: 'add', pos: 0, delta: 2 }), [1, 0, 5]);
  assert.deepEqual(vault.applyRule([9, 0, 5], { kind: 'add', pos: 1, delta: -1 }), [9, 9, 5]);
  assert.deepEqual(vault.applyRule([1, 2, 3], { kind: 'rotate' }), [2, 3, 1]);
});

test('Grid Navigator: moves stay on the grid, never collide, and the checker wants the final cells', () => {
  each(nav.navConfig, 60, (cfg, rng, where) => {
    const b = nav.makeNavBoard(rng, cfg);
    assert.equal(b.items.length, cfg.items, where);
    assert.equal(b.moves.length, cfg.moves, `only ${b.moves.length} moves at ${where}`);
    assert.equal(b.texts.length, b.moves.length, where);
    const at = b.items.map((it) => [...it.start]);
    const distinct = () => new Set(at.map((p) => p.join())).size === at.length;
    assert.ok(distinct(), where);
    for (const m of b.moves) {
      if (m.kind === 'swap') { assert.ok(cfg.swaps, where); [at[m.a], at[m.b]] = [at[m.b], at[m.a]]; } else {
        assert.ok(m.dy !== 0 || m.dx !== 0, where);
        at[m.item] = [at[m.item][0] + m.dy, at[m.item][1] + m.dx];
      }
      assert.ok(at.every(([r, c]) => r >= 0 && c >= 0 && r < cfg.size && c < cfg.size), `off the grid at ${where}`);
      assert.ok(distinct(), `collision at ${where}`);
    }
    assert.deepEqual(b.final, at, where);
    assert.ok(nav.checkPlacement(b, at).every(Boolean), where);
    const off = at.map((p) => [...p]);
    [off[0], off[1]] = [off[1], off[0]];
    const res = nav.checkPlacement(b, off);
    assert.equal(res[0], false, where);
    assert.equal(nav.checkPlacement(b, at.map(() => null)).filter(Boolean).length, 0, where);
  });
  const t = nav.describeMove({ kind: 'step', item: 0, dy: -2, dx: 1 }, [{ name: 'key' }]);
  assert.equal(t, 'The key moves 2 steps up and 1 step right.');
});

test('Focus Filter: arrow answers follow the rule, boards hold exactly their targets', () => {
  each(focus.focusConfig, 40, (cfg, rng, where) => {
    const level = focus.makeFocusLevel(rng, cfg);
    assert.equal(level.trials.length, cfg.trials, where);
    assert.equal(level.boards.length, cfg.boards, where);
    for (const t of level.trials) {
      const arrows = focus.trialArrows(t);
      assert.equal(arrows[2], t.centre, where);
      assert.equal(t.answer, t.flip ? (t.centre === 'L' ? 'R' : 'L') : t.centre, where);
      if (cfg.switches === 0) assert.equal(t.flip, false, where);
    }
    let max = level.trials.length;
    for (const b of level.boards) {
      assert.equal(b.cells.length, b.cols * b.rows, where);
      const found = b.cells.map((c, i) => (c === b.target ? i : -1)).filter((i) => i >= 0);
      assert.deepEqual(found, b.targets, where);
      assert.ok(b.targets.length >= cfg.targets[0] && b.targets.length <= cfg.targets[1], where);
      assert.equal(focus.boardPoints(b, b.targets), b.targets.length, where);
      const wrongCell = b.cells.findIndex((c) => c !== b.target);
      assert.equal(focus.boardPoints(b, [...b.targets, wrongCell]), b.targets.length - 1, where);
      assert.equal(focus.boardPoints(b, [wrongCell]), 0, where);
      max += b.targets.length;
    }
    assert.equal(level.max, max, where);
    assert.ok(level.pass <= level.max && level.pass > 0, where);
    assert.equal(new Set(level.boards.map((b) => b.target)).size, level.boards.length, where);
  });
  for (const s of focus.SEARCH_SETS) assert.ok(!s.others.includes(s.target));
});

test('Dual-Image Recall: the changed tiles are exactly those that differ; "both" means both', () => {
  each(dual.dualConfig, 60, (cfg, rng, where) => {
    const c = dual.makeChangeRound(rng, cfg);
    assert.equal(c.a.length, cfg.rows * cfg.cols, where);
    assert.equal(new Set(c.a.map((t) => t.emoji)).size, c.a.length, where);
    assert.equal(new Set(c.b.map((t) => t.emoji)).size, c.b.length, `scene B repeats a picture at ${where}`);
    const differ = c.a.map((t, i) => (t.emoji !== c.b[i].emoji || t.tint !== c.b[i].tint ? i : -1)).filter((i) => i >= 0);
    assert.deepEqual(differ, c.changed, where);
    assert.ok(c.changed.length >= cfg.changes[0] && c.changed.length <= cfg.changes[1], `${c.changed.length} changes at ${where}`);
    assert.equal(c.told, cfg.tell ? c.changed.length : null, where);
    assert.ok(dual.checkChanges(c, c.changed).perfect, where);
    assert.ok(!dual.checkChanges(c, c.changed.slice(1)).perfect, where);
    const extra = c.a.findIndex((_, i) => !c.changed.includes(i));
    assert.ok(!dual.checkChanges(c, [...c.changed, extra]).perfect, where);
    if (cfg.both) {
      const r = dual.makeBothRound(rng, cfg);
      const inA = new Set(r.a.map((x) => x.emoji));
      const inB = new Set(r.b.map((x) => x.emoji));
      const both = r.pool.filter((x) => inA.has(x.emoji) && inB.has(x.emoji)).map((x) => x.emoji);
      assert.deepEqual(new Set(both), new Set(r.answer), where);
      assert.equal([...inA].filter((e) => inB.has(e)).length, r.answer.length, where);
      assert.ok(r.pool.length > r.answer.length, where);
      assert.equal(new Set(r.pool.map((x) => x.emoji)).size, r.pool.length, where);
      assert.ok(dual.checkBoth(r, r.answer).perfect, where);
      assert.ok(!dual.checkBoth(r, r.pool.map((x) => x.emoji)).perfect, where);
    }
  });
});

/** Normal play with a take limit k: the mover loses exactly when the heights mod (k+1) XOR to zero. */
const xorRule = (heaps, k) => heaps.reduce((x, h) => x ^ (h % (k + 1)), 0) !== 0;

test('Tower Strategy: the solver is right, starts are wins, and perfect play beats the computer', () => {
  for (let k = 1; k <= 4; k++) {
    for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 6; c++) {
      assert.equal(towers.isWinning([a, b, c], k, false), xorRule([a, b, c], k), `${a},${b},${c} k${k}`);
    }
  }
  // Misère sanity: one block left — the mover must take it and loses.
  assert.equal(towers.isWinning([1, 0, 0], 3, true), false);
  assert.equal(towers.isWinning([2, 0, 0], 3, true), true);
  each(towers.towerStratConfig, 25, (cfg, rng, where) => {
    const games = towers.makeTowerLevel(rng, cfg);
    assert.equal(games.length, cfg.games, where);
    for (const start of games) {
      assert.equal(start.length, cfg.towers, where);
      assert.ok(start.every((h) => h >= cfg.sizes[0] && h <= cfg.sizes[1]), where);
      assert.ok(towers.isWinning(start, cfg.maxTake, cfg.misere), where);
      // You play perfectly; the computer plays perfectly too (no slips): you still win.
      let heaps = start;
      let mover = 'you';
      let winner = null;
      for (let turn = 0; turn < 200 && !winner; turn++) {
        const m = mover === 'you'
          ? towers.winningMoves(heaps, cfg.maxTake, cfg.misere)[0]
          : towers.computerMove(rng, heaps, { ...cfg, slip: 0 });
        assert.ok(m && m.take >= 1 && m.take <= cfg.maxTake && heaps[m.tower] >= m.take, where);
        heaps = towers.applyMove(heaps, m);
        winner = towers.gameOver(heaps, mover, cfg.misere);
        mover = mover === 'you' ? 'cpu' : 'you';
      }
      assert.equal(winner, 'you', where);
    }
  });
});

test('Clue Chain: every rank puzzle has exactly one order, with no clue to spare; chains link up', () => {
  each(clues.clueConfig, 30, (cfg, rng, where) => {
    const level = clues.makeClueLevel(rng, cfg);
    assert.equal(level.length, cfg.puzzles, where);
    for (const p of level) {
      assert.notDeepEqual(p.items, p.answer, where);
      assert.deepEqual([...p.items].sort(), [...p.answer].sort(), where);
      assert.ok(clues.checkOrder(p, p.answer).every(Boolean), where);
      assert.ok(!clues.checkOrder(p, p.items).every(Boolean), where);
      if (p.kind === 'rank') {
        assert.equal(p.answer.length, cfg.people, where);
        const n = p.names.length;
        assert.equal(clues.countOrders(n, p.clues), 1, `not unique at ${where}`);
        for (const c of p.clues) {
          assert.ok(cfg.kinds.includes(c.kind), where);
          assert.ok(clues.countOrders(n, p.clues.filter((x) => x !== c), 2) > 1, `redundant clue at ${where}`);
        }
        // The answer satisfies every clue.
        const pos = p.names.map((name) => p.answer.indexOf(name));
        assert.ok(p.clues.every((c) => clues.clueHolds(c, pos)), where);
        assert.equal(p.texts.length, p.clues.length, where);
      } else {
        assert.equal(p.answer.length, cfg.chainCards, where);
        // Each card's result is the next card's condition.
        const texts = p.answer.map((id) => p.cards[id]);
        for (let i = 0; i + 1 < texts.length; i++) {
          const then = texts[i].split(', then ')[1].replace(/\.$/, '');
          assert.ok(texts[i + 1].startsWith(`If ${then}, then `), where);
        }
      }
    }
  });
  for (const chain of clues.CHAINS) {
    assert.equal(new Set(chain).size, chain.length);
    assert.ok(chain.length >= 5);
    for (const s of chain) assert.ok(!s.includes(', then '));
  }
});
