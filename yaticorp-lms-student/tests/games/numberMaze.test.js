import test from 'node:test';
import assert from 'node:assert/strict';

const M = await import('../../src/career/data/bands/numberMaze.js');
const { seeded } = await import('../../src/career/data/seeded.js');

test('Number Maze: every maze has a hidden route that keeps its rule, from the left edge to the right', () => {
  for (const band of ['intermediate', 'analytical']) for (const d of [1, 2, 3]) for (const lv of [1, 5, 12, 30]) {
    const cfg = M.mazeConfig(band, d, lv);
    for (let k = 0; k < 6; k += 1) {
      const maze = M.makeMaze(seeded(lv * 97 + d * 13 + k), cfg);
      assert.equal(maze.values.length, cfg.rows * cfg.cols);
      assert.ok(maze.values.every((v) => Number.isInteger(v) && v > 0), 'positive whole numbers');
      assert.equal(maze.start % cfg.cols, 0, 'starts on the left edge');
      assert.equal(maze.exit % cfg.cols, cfg.cols - 1, 'ends on the right edge');
      assert.ok(maze.route.length >= cfg.minLen);
      assert.ok(M.mazeSolved(maze, maze.route), `${maze.rule.key}: the hidden route solves it`);
      assert.ok(!M.mazeSolved(maze, [maze.start]), 'the start alone is not a solution');
    }
  }
});
