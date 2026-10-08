import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsOn } from './levels';
import useRecordStars from './useRecordStars';

/** Pressing a tile flips it and its four neighbours. */
const neighbours = (index, size) => {
  const row = Math.floor(index / size);
  const col = index % size;
  const out = [index];
  if (row > 0) out.push(index - size);
  if (row < size - 1) out.push(index + size);
  if (col > 0) out.push(index - 1);
  if (col < size - 1) out.push(index + 1);
  return out;
};

const press = (board, index, size) => {
  const next = [...board];
  neighbours(index, size).forEach((i) => {
    next[i] = !next[i];
  });
  return next;
};

/**
 * Build a board by scrambling a solved one.
 *
 * Generated backwards on purpose: a randomly filled grid is often impossible,
 * and handing a student an unsolvable puzzle is worse than handing them an
 * easy one. Scrambling from solved guarantees a solution exists, and in at
 * most `shuffles` moves.
 */
const makeBoard = (size, shuffles) => {
  let board = Array(size * size).fill(false);
  const used = new Set();
  for (let i = 0; i < shuffles; i += 1) {
    let at;
    do {
      at = Math.floor(Math.random() * board.length);
    } while (used.has(at) && used.size < board.length);
    used.add(at);
    board = press(board, at, size);
  }
  // An already-solved board would be no puzzle at all.
  return board.some(Boolean) ? board : press(board, 0, size);
};

/**
 * Stars for a solve in `moves`: three for the scramble's own length or
 * fewer, two up to halfway from there to the budget, one within the budget.
 */
const starsForMoves = (moves, best, budget) => {
  if (moves > budget) return 0;
  if (moves <= best) return 3;
  if (moves <= Math.floor((best + budget) / 2)) return 2;
  return 1;
};

const configFor = (difficulty, levelNo) => {
  const size = difficulty === 1 ? 3 : difficulty === 2 ? 4 : 5;
  // The board size cannot change inside a band, so the shuffle count carries
  // the whole ramp. Across two to ten it has a step for most levels rather
  // than five settings shared between thirty.
  const shuffles = between(2, 10, levelNo) + (difficulty - 1);
  return { size, shuffles, moveBudget: shuffles + 4 + (3 - difficulty) };
};

/**
 * 💡 Logic & deduction: turn every light off.
 *
 * Pressing a tile flips it and its neighbours, so the order does not matter —
 * only which tiles you press. Working that out is the puzzle.
 */
export default function LightsOut({ onExit }) {
  const progress = useGameProgress('lights-out');
  return (
    <Round
      key={`${progress.level}-${progress.attempt}`}
      progress={progress}
      onExit={onExit}
    />
  );
}

function Round({ progress, onExit }) {
  const [started, setStarted] = useState(false);
  const config = configFor(progress.difficulty, progress.levelNo);
  const [board, setBoard] = useState(() => makeBoard(config.size, config.shuffles));
  const [moves, setMoves] = useState(0);

  const lit = board.filter(Boolean).length;
  const solved = lit === 0;
  const outOfMoves = !solved && moves >= config.moveBudget;
  const passed = solved;
  const finishedRound = (solved || outOfMoves);
  // Stars only for a dark board: running out of moves used the whole budget,
  // which starsFor read as "within budget" and paid a star for failing.
  // Graded on the scramble itself rather than 70% of the budget: the board
  // was made with `shuffles` presses, so that many always solves it, and that
  // is three stars. 70% of the budget fell below `shuffles` at the top of the
  // hardest band, where a perfect solve could earn only two.
  const stars = solved ? starsForMoves(moves, config.shuffles, config.moveBudget) : 0;
  useRecordStars(progress, finishedRound, stars);

  const tap = (index) => {
    if (solved || outOfMoves) return;
    setBoard(press(board, index, config.size));
    setMoves((m) => m + 1);
  };

  return (
    <GameShell
      title="Lights Out"
      blurb={`Turn every light off in ${config.moveBudget} moves or fewer.`}
      tone="bg-gradient-to-br from-indigo-600 to-blue-800"
      score={`${moves}/${config.moveBudget}`}
      scoreLabel="Moves"
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Turn every light off in ${config.moveBudget} moves or fewer.`,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        finishedRound
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'So close',
              detail: `${moves} moves used of ${config.moveBudget}`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500">
          Tapping a tile flips it and its neighbours · {lit} still lit
        </p>
      }
    >
      {started && !(solved || outOfMoves) && (
        <div className="mx-auto max-w-xs">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${config.size}, minmax(0, 1fr))` }}
          >
            {board.map((on, i) => (
              <button
                key={i}
                type="button"
                onClick={() => tap(i)}
                aria-label={`Tile ${i + 1} ${on ? 'lit' : 'off'}`}
                className={`fp-press aspect-square rounded-xl transition-all duration-150 ${
                  on
                    ? 'bg-gradient-to-br from-amber-300 to-orange-400 shadow-lg shadow-orange-500/30'
                    : 'bg-surface-100 ring-1 ring-line-200 ring-inset'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}
