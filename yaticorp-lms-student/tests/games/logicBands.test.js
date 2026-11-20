/**
 * The five logic games by age band (2026-11-13): every generated question, puzzle and bot move is checked here —
 * one right answer per sequence question, one solution per sudoku and library nonogram, real forced wins in the
 * tic-tac-toe puzzles, a bot that never loses on 3×3 at full strength, and exact optimum moves for both tower rules.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const seq = await import('../../src/career/data/bands/sequences.js');
const sudoku = await import('../../src/career/data/bands/sudoku.js');
const nono = await import('../../src/career/data/bands/nonogram.js');
const ttt = await import('../../src/career/data/bands/tictactoe.js');
const towers = await import('../../src/career/data/bands/towers.js');
const { seeded } = await import('../../src/career/data/seeded.js');

const BANDS = ['foundation', 'developing', 'intermediate', 'analytical', 'advanced'];

/* ---- Next in Sequence --------------------------------------------------- */

test('every sequence question has exactly one correct option and distinct distractors (thousands of items)', () => {
  let checked = 0;
  for (const band of BANDS) {
    for (let seed = 1; seed <= 12; seed += 1) {
      const pool = seq.buildBandSequences(band, { seed: seed * 7919, perFamily: 20 });
      for (const q of pool) {
        checked += 1;
        const want = band === 'foundation' ? 3 : 4;
        assert.equal(q.options.length, want, `${band}: ${q.run.join(' ')} has ${q.options.length} options`);
        assert.equal(new Set(q.options.map(String)).size, q.options.length, `${band}: repeated option in ${q.run.join(' ')} → ${q.options.join(' ')}`);
        assert.equal(q.options.filter((o) => o === q.answer).length, 1, `${band}: answer not exactly once in ${q.options.join(' ')}`);
        assert.ok(!q.options.includes(seq.GAP), 'the gap marker is never an option');
        assert.ok([1, 2, 3].includes(q.level), `level ${q.level}`);
        assert.ok(q.run.filter((v) => v === seq.GAP).length <= 1, 'at most one gap');
        assert.ok(q.note && q.note.length > 5, 'every question explains its rule');
        if (q.kind === 'number') {
          assert.ok(q.options.every((o) => Number.isInteger(o)), `whole numbers only: ${q.options.join(' ')}`);
          const nums = q.run.filter((v) => v !== seq.GAP);
          if (nums.every((v) => v >= 0) && q.answer >= 0) assert.ok(q.options.every((o) => o >= 0), 'no negative distractors for a positive run');
        }
      }
    }
  }
  assert.ok(checked > 5000, `only ${checked} items checked`);
});

test('sequence pools are the same on every build, de-duplicated, and graded young-easy', () => {
  for (const band of BANDS) {
    const a = seq.buildBandSequences(band);
    const b = seq.buildBandSequences(band);
    assert.deepEqual(a, b, `${band} pool is not stable`);
    const keys = a.map((q) => `${q.run.join(',')}>${q.answer}`);
    assert.equal(new Set(keys).size, keys.length, `${band} pool repeats a question`);
    assert.ok(a.filter((q) => q.level === 1).length >= 30, `${band} has too few level-1 questions`);
  }
  // The youngest start with pictures; Classes 6+ are all numbers.
  const found = seq.buildBandSequences('foundation').filter((q) => q.level === 1);
  assert.ok(found.filter((q) => q.kind !== 'number').length > found.length / 2, 'foundation level 1 is mostly pictures');
  assert.ok(found.filter((q) => q.kind === 'number').every((q) => q.answer <= 20), 'foundation numbers stay tiny');
  for (const band of ['intermediate', 'analytical', 'advanced']) {
    assert.ok(seq.buildBandSequences(band).every((q) => q.kind === 'number'), `${band} is numbers only`);
  }
  assert.ok(seq.buildBandSequences('intermediate').some((q) => q.run.includes(seq.GAP)), 'intermediate has missing-middle questions');
  assert.equal(seq.sequenceBand(null), 'analytical');
});

test('a numeric answer actually continues (or fills) the run for the simple rule families', () => {
  // Arithmetic runs: a constant difference must carry through the answer.
  for (const band of BANDS) {
    for (const q of seq.buildBandSequences(band)) {
      if (q.kind !== 'number' || !/^(Add|Take away) \d+ each time\.?/.test(q.note)) continue;
      const full = q.run.includes(seq.GAP) ? q.run.map((v) => (v === seq.GAP ? q.answer : v)) : [...q.run, q.answer];
      const d = full[1] - full[0];
      full.forEach((v, i) => { if (i) assert.equal(v - full[i - 1], d, `${q.run.join(' ')} → ${q.answer}`); });
    }
  }
});

/* ---- Mini Sudoku -------------------------------------------------------- */

test('the sudoku counter knows the 288 4×4 grids', () => {
  assert.equal(sudoku.countSolutions(Array(16).fill(0), 4, 1000), 288);
});

test('every generated sudoku has exactly one solution, matching its givens', () => {
  const cases = [[4, 6, 60], [4, 10, 60], [6, 18, 30], [6, 22, 20], [9, 36, 8], [9, 48, 8]];
  for (const [size, blanks, runs] of cases) {
    const rng = seeded(size * 100 + blanks);
    for (let i = 0; i < runs; i += 1) {
      const p = sudoku.makeSudoku(size, blanks, rng);
      assert.ok(sudoku.isSolvedGrid(p.solution, size), 'solution is valid');
      p.given.forEach((v, j) => { if (v) assert.equal(v, p.solution[j], 'a given disagrees with the solution'); });
      assert.equal(sudoku.countSolutions(p.given, size, 2), 1, `${size}×${size} with ${blanks} blanks is not unique`);
      const holes = p.given.filter((v) => !v).length;
      assert.ok(holes <= blanks, 'never more blanks than asked');
      assert.ok(holes >= Math.min(blanks, size === 4 ? 6 : size === 6 ? 14 : 30), `${size}×${size}: only ${holes} blanks`);
      assert.equal(sudoku.clashes(p.given, size).size, 0, 'givens never clash');
    }
  }
});

test('sudoku size by band', () => {
  assert.equal(sudoku.sudokuConfig('foundation', 1, 1).size, 4);
  assert.equal(sudoku.sudokuConfig('foundation', 1, 1).symbols, true);
  assert.equal(sudoku.sudokuConfig('developing', 1, 12).size, 4);
  assert.equal(sudoku.sudokuConfig('intermediate', 2, 20).size, 6);
  assert.equal(sudoku.sudokuConfig('analytical', 2, 20).size, 6);
  assert.equal(sudoku.sudokuConfig('analytical', 3, 20).size, 9);
  assert.equal(sudoku.sudokuConfig('advanced', 2, 1).size, 9);
});

/* ---- Picture Logic ------------------------------------------------------ */

test('the nonogram counter agrees with brute force on 4×4', () => {
  const rng = seeded(31);
  for (let t = 0; t < 120; t += 1) {
    const cells = Array.from({ length: 16 }, () => rng() < 0.5);
    const { rows, cols } = nono.cluesOf(cells, 4);
    // Brute force over the rows each row clue allows, then every column checked.
    const bits = (m) => [0, 1, 2, 3].map((i) => Boolean((m >> i) & 1));
    const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
    const options = rows.map((clue) => [...Array(16).keys()].filter((m) => same(nono.runsOf(bits(m)), clue)));
    let brute = 0;
    for (const a of options[0]) for (const b of options[1]) for (const c of options[2]) for (const d of options[3]) {
      if (nono.meetsClues([a, b, c, d].flatMap(bits), 4, rows, cols)) brute += 1;
    }
    assert.equal(nono.countNonogramSolutions(rows, cols, 1e6), brute);
  }
});

test('every hand-made picture is uniquely solvable from its clues', () => {
  for (const p of nono.PICTURES) {
    const { rows, cols } = nono.cluesOf(p.cells, p.size);
    assert.equal(nono.countNonogramSolutions(rows, cols, 2), 1, `${p.name} (${p.size}×${p.size}) has more than one solution`);
  }
  assert.ok(nono.libraryFor(4).length >= 6 && nono.libraryFor(5).length >= 10);
});

test('generated nonograms meet their own clues and are unique when they say so', () => {
  const rng = seeded(77);
  for (const size of [4, 5, 6, 7, 8, 9, 10]) {
    for (let i = 0; i < 10; i += 1) {
      const p = nono.makeNonogram(size, size <= 5, rng);
      assert.ok(nono.meetsClues(p.cells, size, p.rows, p.cols));
      if (p.unique) assert.equal(nono.countNonogramSolutions(p.rows, p.cols, 2), 1);
      if (size <= 5) assert.ok(p.name, 'young sizes come from the picture library');
    }
  }
  assert.ok(nono.nonogramConfig('advanced', 3, 30).size <= 10 && nono.nonogramConfig('advanced', 2, 1).size >= 8);
  assert.ok(nono.nonogramConfig('intermediate', 1, 1).size >= 6 && nono.nonogramConfig('analytical', 3, 30).size <= 8);
});

/* ---- Tic-Tac-Toe -------------------------------------------------------- */

test('the full-strength 3×3 bot never loses, whatever X does', () => {
  const skill = { win: 1, block: 1, smart: 1 };
  const walk = (b) => {
    for (const i of ttt.emptyCells(b)) {
      const next = [...b];
      next[i] = 'X';
      let w = ttt.winnerOf(next, 3);
      assert.notEqual(w, 'X', `X won: ${next.map((v) => v || '-').join('')}`);
      if (w) continue;
      // Every best reply, not only the first: none may lose.
      for (const o of ttt.searchMoves(next, 3)) {
        const after = [...next];
        after[o] = 'O';
        w = ttt.winnerOf(after, 3);
        if (!w) walk(after);
      }
    }
  };
  walk(Array(9).fill(null));
  // botMove at full strength returns one of those moves.
  const b = ['X', null, null, null, null, null, null, null, null];
  assert.ok(ttt.searchMoves(b, 3).includes(ttt.botMove(b, 3, skill)));
});

test('bot moves are always legal and take wins / block at full strength on 4×4', () => {
  const rng = seeded(5);
  for (let t = 0; t < 200; t += 1) {
    const b = Array(16).fill(null);
    let p = 'X';
    while (!ttt.winnerOf(b, 4)) {
      const free = ttt.emptyCells(b);
      if (p === 'X') b[free[Math.floor(rng() * free.length)]] = 'X';
      else {
        const wins = ttt.winningCells(b, 4, 'O');
        const threats = ttt.winningCells(b, 4, 'X');
        const m = ttt.botMove(b, 4, { win: 1, block: 1, smart: 0.5 }, rng, 2);
        assert.equal(b[m], null, 'bot played on a taken square');
        if (wins.length) assert.ok(wins.includes(m), 'bot missed its own win');
        else if (threats.length) assert.ok(threats.includes(m), 'bot missed a block');
        b[m] = 'O';
      }
      p = p === 'X' ? 'O' : 'X';
    }
  }
});

test('forced-win puzzles are real: X wins against every defence when it plays right, never in one move', () => {
  const rng = seeded(11);
  for (const [n, k, moves, runs] of [[3, 3, 2, 60], [4, 4, 2, 40], [4, 4, 3, 8]]) {
    for (let r = 0; r < runs; r += 1) {
      const start = ttt.makeForcedWin(n, k, moves, rng);
      assert.ok(start, `no ${n}×${n} win-in-${moves} found`);
      const xs = start.filter((v) => v === 'X').length;
      assert.equal(xs, start.filter((v) => v === 'O').length, 'X to move');
      assert.equal(ttt.winnerOf(start, k), null);
      assert.equal(ttt.winningCells(start, k, 'X').length, 0, 'not a one-move win');
      if (moves > 2) assert.ok(!ttt.xForcesWin([...start], k, moves - 1), 'not quicker than asked');
      // Play it out: X picks a move that keeps the win, O defends as the game does.
      const b = [...start];
      let left = moves;
      let won = false;
      while (left > 0) {
        const wins = ttt.winningCells(b, k, 'X');
        if (wins.length) { b[wins[0]] = 'X'; won = true; break; }
        const good = ttt.emptyCells(b).find((i) => { b[i] = 'X'; const ok = ttt.oCannotEscape(b, k, left - 1); b[i] = null; return ok; });
        assert.notEqual(good, undefined, 'the winning line was lost');
        b[good] = 'X';
        left -= 1;
        const o = ttt.puzzleReply(b, k, left, rng);
        b[o] = 'O';
        assert.notEqual(ttt.winnerOf(b, k), 'O');
      }
      assert.ok(won, 'X did not win in the moves given');
    }
  }
});

test('a wrong move in a puzzle lets O escape', () => {
  const rng = seeded(3);
  const start = ttt.makeForcedWin(3, 3, 2, rng);
  const bad = ttt.emptyCells(start).find((i) => { const b = [...start]; b[i] = 'X'; return !ttt.oCannotEscape(b, 3, 1); });
  if (bad === undefined) return; // every move wins — nothing to test on this one
  const b = [...start];
  b[bad] = 'X';
  const o = ttt.puzzleReply(b, 3, 1, rng);
  b[o] = 'O';
  assert.ok(ttt.winnerOf(b, 3) === 'O' || ttt.winningCells(b, 3, 'X').length === 0, 'O’s reply should stop X winning next move');
});

/* ---- Tower Shift -------------------------------------------------------- */

test('tower optimum is 2^n − 1 (classic) and 3^n − 1 (next-door pegs only), by search', () => {
  for (let n = 1; n <= 6; n += 1) {
    for (const adjacent of [false, true]) {
      const start = [Array.from({ length: n }, (_, i) => n - i), [], []];
      assert.equal(towers.movesLeft(start, n, adjacent), towers.optimumMoves(n, adjacent), `n=${n} adjacent=${adjacent}`);
    }
  }
});

test('next-door rule forbids left↔right; tower sizes by band', () => {
  assert.equal(towers.legalHop(0, 2, true), false);
  assert.equal(towers.legalHop(0, 1, true), true);
  assert.equal(towers.legalHop(0, 2, false), true);
  const f = towers.towerConfig('foundation', 1, 1);
  assert.ok(f.rings >= 2 && f.rings <= 3);
  const d = towers.towerConfig('developing', 1, 30);
  assert.ok(d.rings >= 3 && d.rings <= 4);
  for (const band of ['intermediate', 'analytical']) {
    for (const diff of [1, 2, 3]) for (const lv of [1, 30]) {
      const c = towers.towerConfig(band, diff, lv);
      assert.ok(c.rings >= 4 && c.rings <= 6, `${band} ${diff} ${lv}: ${c.rings}`);
    }
  }
  const a = towers.towerConfig('advanced', 3, 30);
  assert.ok(a.adjacent && a.budget >= a.best && a.best === 3 ** a.rings - 1);
});
