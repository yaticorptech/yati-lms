/**
 * Tic-Tac-Toe by age band (2026-11-13): boards, bots and forced-win puzzles. Pure, so node can test it.
 *
 * A board is an array of n·n cells holding 'X', 'O' or null; the student is X and moves first. `k` in a row wins.
 *   foundation    3×3 vs a gentle bot that often misses
 *   developing    3×3 vs a bot that takes its wins and blocks more and more
 *   intermediate  3×3 vs a strong bot (perfect most moves)
 *   analytical    3×3 games against a near-perfect bot, in turn with "win in 2" fork puzzles (4×4 at the top)
 *   advanced      4×4 four-in-a-row against a searching bot, in turn with 4×4 forced-win puzzles (win in 2 or 3)
 * Puzzles are checked by exhaustive search: X really can force a win within the moves given, and not in one.
 */

const LINE_CACHE = new Map();
/** Every line of k cells in an n×n board: rows, columns and both diagonals. */
export const linesFor = (n, k) => {
  const key = `${n}:${k}`;
  if (LINE_CACHE.has(key)) return LINE_CACHE.get(key);
  const out = [];
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      for (const [dr, dc] of dirs) {
        const er = r + dr * (k - 1);
        const ec = c + dc * (k - 1);
        if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
        out.push(Array.from({ length: k }, (_, i) => (r + dr * i) * n + (c + dc * i)));
      }
    }
  }
  LINE_CACHE.set(key, out);
  return out;
};

const sizeOf = (b) => Math.round(Math.sqrt(b.length));
const other = (p) => (p === 'X' ? 'O' : 'X');
export const emptyCells = (b) => b.reduce((acc, v, i) => (v ? acc : [...acc, i]), []);

/** 'X' | 'O' | 'draw' | null (game on). */
export const winnerOf = (b, k = 3) => {
  for (const line of linesFor(sizeOf(b), k)) {
    const v = b[line[0]];
    if (v && line.every((i) => b[i] === v)) return v;
  }
  return b.every(Boolean) ? 'draw' : null;
};

/** The line that won, for highlighting, or null. */
export const winningLine = (b, k = 3) => linesFor(sizeOf(b), k).find((line) => b[line[0]] && line.every((i) => b[i] === b[line[0]])) || null;

/** Empty cells where `p` would complete a line right now. */
export const winningCells = (b, k, p) => {
  const out = new Set();
  for (const line of linesFor(sizeOf(b), k)) {
    let mine = 0;
    let gap = -1;
    for (const i of line) {
      if (b[i] === p) mine += 1;
      else if (!b[i]) gap = gap === -1 ? i : -2;
      else { gap = -2; break; }
    }
    if (mine === k - 1 && gap >= 0) out.add(gap);
  }
  return [...out];
};

/* ---- 3×3: perfect play -------------------------------------------------- */

const MEMO3 = new Map();
/** Minimax value for `player` to move on a 3×3 board: +1 O wins, −1 X wins, 0 draw (with depth tie-break). */
const value3 = (b, player) => {
  const key = b.map((v) => v || '-').join('') + player;
  if (MEMO3.has(key)) return MEMO3.get(key);
  const w = winnerOf(b, 3);
  let v;
  if (w === 'O') v = 10;
  else if (w === 'X') v = -10;
  else if (w === 'draw') v = 0;
  else {
    v = player === 'O' ? -Infinity : Infinity;
    for (const i of emptyCells(b)) {
      b[i] = player;
      const s = value3(b, other(player));
      b[i] = null;
      // Shrink toward 0 a step a ply, so a quicker win (or slower loss) is preferred.
      const t = s > 0 ? s - 1 : s < 0 ? s + 1 : 0;
      v = player === 'O' ? Math.max(v, t) : Math.min(v, t);
    }
  }
  MEMO3.set(key, v);
  return v;
};

/** Every best move for `player` on a 3×3 board. */
export const bestMoves3 = (b, player = 'O') => {
  const scored = emptyCells(b).map((i) => {
    const next = [...b];
    next[i] = player;
    return { i, s: value3(next, other(player)) };
  });
  const best = player === 'O' ? Math.max(...scored.map((m) => m.s)) : Math.min(...scored.map((m) => m.s));
  return scored.filter((m) => m.s === best).map((m) => m.i);
};

/* ---- Bigger boards: alpha-beta to a depth, with a line heuristic -------- */

const heuristic = (b, k) => {
  let score = 0;
  for (const line of linesFor(sizeOf(b), k)) {
    let o = 0;
    let x = 0;
    for (const i of line) { if (b[i] === 'O') o += 1; else if (b[i] === 'X') x += 1; }
    if (o && x) continue;
    if (o) score += 4 ** o;
    if (x) score -= 4 ** x * 1.2;   // a little more wary of X's lines than keen on its own
  }
  return score;
};

const WIN = 1e6;
const alphaBeta = (b, k, player, depth, alpha, beta) => {
  const w = winnerOf(b, k);
  if (w === 'O') return WIN + depth;
  if (w === 'X') return -WIN - depth;
  if (w === 'draw') return 0;
  if (depth === 0) return heuristic(b, k);
  const moves = emptyCells(b);
  if (player === 'O') {
    let v = -Infinity;
    for (const i of moves) {
      b[i] = 'O';
      v = Math.max(v, alphaBeta(b, k, 'X', depth - 1, alpha, beta));
      b[i] = null;
      alpha = Math.max(alpha, v);
      if (alpha >= beta) break;
    }
    return v;
  }
  let v = Infinity;
  for (const i of moves) {
    b[i] = 'X';
    v = Math.min(v, alphaBeta(b, k, 'O', depth - 1, alpha, beta));
    b[i] = null;
    beta = Math.min(beta, v);
    if (alpha >= beta) break;
  }
  return v;
};

/** O's best moves on any board by a depth-limited search (exact on 3×3). */
export const searchMoves = (b, k, depth = 4) => {
  if (sizeOf(b) === 3) return bestMoves3(b, 'O');
  const work = [...b];
  const scored = emptyCells(work).map((i) => {
    work[i] = 'O';
    const s = alphaBeta(work, k, 'X', depth - 1, -Infinity, Infinity);
    work[i] = null;
    return { i, s };
  });
  const best = Math.max(...scored.map((m) => m.s));
  return scored.filter((m) => m.s >= best - 1e-9).map((m) => m.i);
};

const choose = (rng, list) => list[Math.floor(rng() * list.length)];

/**
 * The bot's reply. `skill`: { win, block, smart } — the chance it takes its own win, blocks X's win, and plays the
 * searched best move; otherwise a random free square. Always a legal empty cell.
 */
export const botMove = (b, k, skill, rng = Math.random, depth = 4) => {
  const free = emptyCells(b);
  if (!free.length) return null;
  const wins = winningCells(b, k, 'O');
  if (wins.length && rng() < skill.win) return choose(rng, wins);
  const threats = winningCells(b, k, 'X');
  if (threats.length && rng() < skill.block) return choose(rng, threats);
  if (rng() < skill.smart) return choose(rng, searchMoves(b, k, depth));
  return choose(rng, free);
};

/* ---- Forced-win puzzles ------------------------------------------------- */

/** Whether X, to move, can force a win within `left` X moves however O defends. Exact. */
export const xForcesWin = (b, k, left) => {
  if (left <= 0) return false;
  const moves = emptyCells(b);
  if (winningCells(b, k, 'X').length) return true;
  if (left === 1) return false;
  for (const i of moves) {
    b[i] = 'X';
    const ok = oCannotEscape(b, k, left - 1);
    b[i] = null;
    if (ok) return true;
  }
  return false;
};

/** O to move: every reply still loses to X within `left` X moves. */
export const oCannotEscape = (b, k, left) => {
  if (winnerOf(b, k)) return winnerOf(b, k) === 'X';
  if (winningCells(b, k, 'O').length) return false;   // O just wins
  for (const i of emptyCells(b)) {
    b[i] = 'O';
    const ok = xForcesWin(b, k, left);
    b[i] = null;
    if (!ok) return false;
  }
  return true;
};

/**
 * The defender's reply in a puzzle after X's move. If X is still winning, O blocks a threat when there is one (the
 * natural defence) or picks any reply; if X has let O off, O plays a reply that escapes (wins at once if it can).
 */
export const puzzleReply = (b, k, left, rng = Math.random) => {
  const work = [...b];
  const free = emptyCells(work);
  if (!free.length) return null;
  const wins = winningCells(work, k, 'O');
  if (wins.length) return choose(rng, wins);
  const escapes = free.filter((i) => {
    work[i] = 'O';
    const ok = !xForcesWin(work, k, left);
    work[i] = null;
    return ok;
  });
  if (escapes.length) {
    const blocks = escapes.filter((i) => winningCells(b, k, 'X').includes(i));
    return choose(rng, blocks.length ? blocks : escapes);
  }
  const threats = winningCells(work, k, 'X');
  return choose(rng, threats.length ? threats : free);
};

/**
 * A position, X to move, where X can force a win in exactly `moves` X moves (not fewer), nobody has won, and the
 * board is a real game position (X and O placed in turn). null if none found in the tries allowed.
 */
export const makeForcedWin = (n, k, moves, rng = Math.random, tries = 4000) => {
  const minStones = n === 3 ? 2 : 6;
  const maxStones = n === 3 ? 4 : 10;
  for (let t = 0; t < tries; t += 1) {
    const b = Array(n * n).fill(null);
    const pairs = Math.floor((minStones + Math.floor(rng() * (maxStones - minStones + 1))) / 2);
    let ok = true;
    for (let s = 0; s < pairs * 2; s += 1) {
      const p = s % 2 === 0 ? 'X' : 'O';
      const free = emptyCells(b);
      b[choose(rng, free)] = p;
      if (winnerOf(b, k)) { ok = false; break; }
    }
    if (!ok) continue;
    if (winningCells(b, k, 'X').length) continue;               // not a one-move win
    if (moves > 2 && xForcesWin(b, k, moves - 1)) continue;     // not quicker than asked
    if (!xForcesWin(b, k, moves)) continue;
    return b;
  }
  return null;
};

/* ---- Bands -------------------------------------------------------------- */

/**
 * The band's setup at a difficulty and step: board size, line length, bot skill, whether the "you can win here"
 * squares are shown, and the kinds of round dealt in turn ('game' or 'puzzle').
 */
export const tttConfig = (band, difficulty, levelNo) => {
  const t = Math.min(1, Math.max(0, (levelNo - 1) / 29));
  const lerp = (a, b) => Math.round(a + (b - a) * t);
  switch (band) {
    case 'foundation':
      return { n: 3, k: 3, rounds: ['game'], skill: { win: 0.4 + 0.3 * t, block: 0.1 + 0.25 * t, smart: 0 }, target: lerp(4, 6), seconds: lerp(150, 120) };
    case 'developing':
      return { n: 3, k: 3, rounds: ['game'], skill: { win: 0.85, block: 0.35 + 0.4 * t, smart: 0.15 + 0.3 * t }, target: lerp(4, 8), seconds: lerp(120, 90) };
    case 'intermediate':
      return { n: 3, k: 3, rounds: ['game'], skill: { win: 1, block: 0.9, smart: Math.min(0.9, 0.45 + (difficulty - 1) * 0.2 + 0.25 * t) }, target: lerp(4, 8) + (difficulty - 1) * 2, seconds: lerp(100, 70) };
    case 'advanced':
      return {
        n: 4, k: 4, rounds: ['puzzle', 'game'], puzzleMoves: difficulty >= 3 && t > 0.3 ? 3 : 2, depth: 4,
        skill: { win: 1, block: 1, smart: 0.8 + 0.15 * t }, target: lerp(6, 10) + (difficulty - 2) * 2, seconds: lerp(200, 150)
      };
    default: // analytical, and today's game for an unknown band
      return {
        n: 3, k: 3, rounds: ['game', 'puzzle'], puzzleMoves: 2, puzzleN: difficulty >= 3 ? 4 : 3,
        skill: { win: 1, block: 1, smart: Math.min(0.92, 0.7 + (difficulty - 1) * 0.08 + 0.1 * t) }, target: lerp(5, 9) + (difficulty - 1) * 2, seconds: lerp(120, 90)
      };
  }
};
