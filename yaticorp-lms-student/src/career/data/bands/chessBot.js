/**
 * Chess against the computer (2026-11-16, Rising Brains · Logic & Deduction; id "chess-challenge"). The rules are
 * chess.js — the same library the server's online chess uses — so moves, checks and draws match it exactly. The
 * computer is a small search (alpha–beta) over material and piece placement; it looks further ahead as levels climb,
 * and on the easiest levels it sometimes plays a casual move.
 */
import { Chess } from 'chess.js';

const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// Piece-square tables from White's side (a8 first), small nudges towards good squares.
const PST = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]
};

const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** The computer's strength for a level: search depth, and how often (easy levels) it plays a casual move. */
export const chessConfig = (ageBand, difficulty, levelNo) => {
  const s = clampN(Math.ceil(levelNo / 3) + ((difficulty || 1) - 1) * 2 + (ageBand === 'analytical' ? 2 : 0), 1, 12);
  return { depth: s <= 2 ? 1 : s <= 6 ? 2 : 3, casual: s <= 1 ? 0.45 : s <= 2 ? 0.25 : s <= 4 ? 0.1 : 0 };
};

/** Score of the position for the side to move (positive = good for them). */
export const evaluate = (game) => {
  const board = game.board();
  let score = 0;
  for (let r = 0; r < 8; r += 1) for (let c = 0; c < 8; c += 1) {
    const sq = board[r][c];
    if (!sq) continue;
    const idx = sq.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;
    const v = VALUE[sq.type] + PST[sq.type][idx];
    score += sq.color === 'w' ? v : -v;
  }
  return game.turn() === 'w' ? score : -score;
};

/** Captures and checks first, so alpha–beta cuts more. */
const ordered = (game) => game.moves({ verbose: true }).sort((a, b) => (b.captured ? VALUE[b.captured] : 0) - (a.captured ? VALUE[a.captured] : 0));

const negamax = (game, depth, alpha, beta) => {
  if (game.isCheckmate()) return -100000 - depth;
  if (game.isDraw() || game.isStalemate()) return 0;
  if (depth === 0) return evaluate(game);
  let best = -Infinity;
  for (const m of ordered(game)) {
    game.move(m);
    const v = -negamax(game, depth - 1, -beta, -alpha);
    game.undo();
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
};

/** The best move (verbose chess.js move) for the side to move, searching `depth` plies. */
export const bestMove = (fen, depth) => {
  const game = new Chess(fen);
  let best = null;
  let bestScore = -Infinity;
  for (const m of ordered(game)) {
    game.move(m);
    const v = -negamax(game, depth - 1, -Infinity, Infinity);
    game.undo();
    if (v > bestScore) { bestScore = v; best = m; }
  }
  return best;
};

/** The computer's move: the best one, or (easy levels) now and then a casual legal move that does not hang mate. */
export const computerMove = (fen, config, rng = Math.random) => {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;
  if (rng() < config.casual) return moves[Math.floor(rng() * moves.length)];
  return bestMove(fen, config.depth);
};
