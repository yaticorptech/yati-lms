import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const winnerOf = (b) => {
  for (const [a, c, d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return b.every(Boolean) ? 'draw' : null;
};

/** Perfect play, so the top band cannot be beaten by luck. */
const minimax = (b, player) => {
  const w = winnerOf(b);
  if (w === 'O') return { score: 1 };
  if (w === 'X') return { score: -1 };
  if (w === 'draw') return { score: 0 };
  let best = { score: player === 'O' ? -2 : 2 };
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    const next = [...b];
    next[i] = player;
    const { score } = minimax(next, player === 'O' ? 'X' : 'O');
    if (player === 'O' ? score > best.score : score < best.score) best = { score, move: i };
  }
  return best;
};

const randomMove = (b) => {
  const free = b.map((v, i) => (v ? null : i)).filter((i) => i !== null);
  return free[Math.floor(Math.random() * free.length)];
};

/** The computer's reply: perfect with probability `smart`, random otherwise. */
const computerMove = (b, smart) => (Math.random() < smart ? minimax(b, 'O').move : randomMove(b));

const configFor = (difficulty, levelNo) => ({
  // How often the computer plays the perfect move rather than a random one.
  smart: Math.min(1, ((difficulty - 1) * 30 + levelNo) / 60),
  seconds: between(90, 60, levelNo),
  // Points: a win is 2, a draw is 1. Losing scores nothing.
  target: between(4, 8, levelNo) + (difficulty - 1) * 2
});

/** 🧩 Logic: noughts and crosses against a computer that gets sharper. */
export default function TicTacToe({ onExit }) {
  const progress = useGameProgress('tic-tac-toe');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [points, setPoints] = useState(0);
  const [games, setGames] = useState({ won: 0, drawn: 0, lost: 0 });
  const [ended, setEnded] = useState(null); // 'X' | 'O' | 'draw' for the flash
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started);

  const passed = points >= config.target;
  const stars = over ? starsFor(points, config.target) : 0;
  useRecordStars(progress, over, stars);

  const finish = (result) => {
    setEnded(result);
    setGames((g) => ({
      won: g.won + (result === 'X' ? 1 : 0),
      drawn: g.drawn + (result === 'draw' ? 1 : 0),
      lost: g.lost + (result === 'O' ? 1 : 0)
    }));
    if (result === 'X') setPoints((p) => p + 2);
    if (result === 'draw') setPoints((p) => p + 1);
    setTimeout(() => {
      setBoard(Array(9).fill(null));
      setEnded(null);
    }, 800);
  };

  const play = (i) => {
    if (over || ended || board[i]) return;
    const next = [...board];
    next[i] = 'X';
    let w = winnerOf(next);
    if (w) {
      setBoard(next);
      finish(w);
      return;
    }
    const move = computerMove(next, config.smart);
    next[move] = 'O';
    setBoard(next);
    w = winnerOf(next);
    if (w) finish(w);
  };

  return (
    <GameShell
      title="Tic-Tac-Toe"
      blurb={`Score ${config.target} points: a win is 2, a draw is 1.`}
      tone="bg-gradient-to-br from-sky-500 to-indigo-700"
      score={`${points}/${config.target}`}
      scoreLabel="Points"
      seconds={seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `You are X and go first. A win is 2 points, a draw is 1. Reach ${config.target} points before the clock runs out. The computer plays the perfect move ${Math.round(config.smart * 100)}% of the time.`,
              seconds: config.seconds,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        over
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'So close',
              detail: `${games.won} won · ${games.drawn} drawn · ${games.lost} lost — ${points} of ${config.target} points`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500">
          {ended === 'X' ? 'You won!' : ended === 'O' ? 'Computer wins that one.' : ended === 'draw' ? 'A draw.' : 'Three in a row wins'}
        </p>
      }
    >
      {started && !over && (
        <div className="mx-auto grid max-w-[260px] grid-cols-3 gap-2">
          {board.map((cell, i) => (
            <button
              key={i}
              type="button"
              onClick={() => play(i)}
              disabled={!!cell || !!ended}
              aria-label={`Square ${i + 1}${cell ? `, ${cell}` : ''}`}
              className={`fp-press flex aspect-square items-center justify-center rounded-2xl text-4xl font-black ring-1 transition-all ring-inset ${
                cell === 'X'
                  ? 'bg-sky-50 text-sky-700 ring-sky-200'
                  : cell === 'O'
                    ? 'bg-rose-50 text-rose-600 ring-rose-200'
                    : 'bg-surface text-ink-900 ring-line-200 hover:bg-sky-50 hover:ring-sky-300'
              }`}
            >
              {cell}
            </button>
          ))}
        </div>
      )}
    </GameShell>
  );
}
