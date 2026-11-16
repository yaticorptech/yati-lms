/**
 * Shadow Detective and Treasure Path: every map can be solved, and every
 * shadow round holds its answer exactly once.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { seeded } = await import('../../src/career/data/seeded.js');
const shadow = await import('../../src/career/data/bands/shadow.js');
const paths = await import('../../src/career/data/bands/paths.js');

const BANDS = ['foundation', 'developing', 'intermediate', 'analytical', 'advanced', null];
const LEVEL_NOS = [1, 10, 20, 30];

test('every Treasure Path map is solvable, within its limits, and the shortest path wins', () => {
  let count = 0;
  for (const band of BANDS) {
    for (let difficulty = 1; difficulty <= 3; difficulty++) {
      for (const levelNo of LEVEL_NOS) {
        const cfg = paths.pathConfig(band, difficulty, levelNo);
        for (let seed = 1; seed <= 120; seed++) {
          const rng = seeded(seed * 7919 + difficulty * 31 + levelNo);
          const map = paths.makePathMap(rng, cfg);
          count++;
          const where = `${band}/d${difficulty}/L${levelNo}/seed ${seed}`;
          assert.equal(map.rows, cfg.rows, where);
          assert.equal(map.cols, cfg.cols, where);
          const best = paths.solvePath(map);
          assert.ok(best, `unsolvable map at ${where}`);
          assert.equal(best.steps, map.optimal, where);
          assert.ok(map.optimal >= 1, where);
          // The BFS solution, as cards, reaches the treasure in exactly the optimal steps and fits the slots.
          const cards = paths.toCards(map.solution, map.repeatMax);
          assert.ok(cards.length <= map.slots, `solution needs ${cards.length} cards, only ${map.slots} slots at ${where}`);
          const run = paths.runProgram(map, cards);
          assert.equal(run.outcome, 'win', where);
          assert.equal(run.steps, map.optimal, where);
          // Start and treasure are open ground.
          assert.equal(map.grid[map.start[0]][map.start[1]], '.', where);
          assert.equal(map.grid[map.goal[0]][map.goal[1]], '.', where);
          if (cfg.keys && map.hasKey) {
            const locked = { ...map, grid: map.grid.map((row) => row.map((c) => (c === 'D' ? '#' : c === 'K' ? '.' : c))) };
            assert.equal(paths.solvePath(locked), null, `key does not matter at ${where}`);
          }
          if (cfg.repeat) assert.ok(map.minCards >= 1 && map.minCards <= cards.length, where);
        }
      }
    }
  }
  assert.ok(count >= 8000, `only ${count} maps checked`);
});

test('the youngest get small maps and short clues', () => {
  const cfg = paths.pathConfig('foundation', 1, 1);
  for (let seed = 1; seed <= 500; seed++) {
    const map = paths.makePathMap(seeded(seed), cfg);
    assert.equal(map.rows, 4);
    assert.ok(map.optimal >= 2 && map.optimal <= 4, `optimal ${map.optimal}`);
    assert.match(map.clue, /^Go \d (up|down|left|right)(, then \d (up|down|left|right))*\.$/);
  }
});

test('runProgram stops on a bump and when the cards run out', () => {
  const map = { rows: 3, cols: 3, grid: [['.', '#', '.'], ['.', '.', '.'], ['.', '.', '.']], start: [0, 0], goal: [2, 2] };
  assert.equal(paths.runProgram(map, [{ dir: 'right', times: 1 }]).outcome, 'bump');
  assert.equal(paths.runProgram(map, [{ dir: 'up', times: 1 }]).outcome, 'bump');
  assert.equal(paths.runProgram(map, [{ dir: 'down', times: 1 }]).outcome, 'short');
  const win = paths.runProgram(map, [{ dir: 'down', times: 2 }, { dir: 'right', times: 3 }]);
  assert.equal(win.outcome, 'win');
  assert.equal(win.steps, 4);
  assert.equal(paths.solvePath(map).steps, 4);
  assert.equal(paths.fewestCards(map, 3), 2);
});

test('every shadow round holds each answer exactly once and no choice twice', () => {
  let count = 0;
  for (const band of BANDS) {
    for (let difficulty = 1; difficulty <= 3; difficulty++) {
      for (const levelNo of LEVEL_NOS) {
        const cfg = shadow.shadowConfig(band, difficulty, levelNo);
        for (let seed = 1; seed <= 150; seed++) {
          const rounds = shadow.makeShadowLevel(seeded(seed * 104729 + difficulty * 17 + levelNo), cfg);
          assert.equal(rounds.length, cfg.rounds);
          assert.ok(cfg.pass >= 1 && cfg.pass <= cfg.rounds);
          for (const round of rounds) {
            count++;
            const emojis = round.choices.map((c) => c.emoji);
            assert.equal(new Set(emojis).size, emojis.length, 'a choice appears twice');
            assert.equal(round.choices.length, cfg.choices);
            assert.equal(round.targets.length, round.kind === 'pair' ? 2 : 1);
            for (const t of round.targets) {
              assert.equal(emojis.filter((e) => e === t.emoji).length, 1, `${t.name} not exactly once`);
            }
            if (round.kind === 'pair') assert.notEqual(round.targets[0].group, round.targets[1].group);
            if (shadow.shadowBand(band) === 'foundation') {
              // Very distinct: no two choices from the same look-alike pair, no turns, no clouds, no pairs.
              const groups = round.choices.map((c) => c.group);
              assert.equal(new Set(groups).size, groups.length, 'look-alikes on a foundation board');
              assert.equal(round.kind, 'single');
              assert.equal(round.turn, 0);
              assert.equal(round.hide, null);
            }
          }
        }
      }
    }
  }
  assert.ok(count >= 30000, `only ${count} rounds checked`);
});

test('shadow bands scale choices: 3 young, 4–5 developing, 5–6 and two-shadow scenes older', () => {
  assert.equal(shadow.shadowConfig('foundation', 3, 30).choices, 3);
  for (let d = 1; d <= 3; d++) {
    const c = shadow.shadowConfig('developing', d, 15).choices;
    assert.ok(c >= 4 && c <= 5);
  }
  assert.equal(shadow.shadowConfig(null, 1, 1).band, 'developing');
  const older = shadow.shadowConfig('intermediate', 2, 10);
  assert.ok(older.choices >= 5 && older.pairs > 0);
});
