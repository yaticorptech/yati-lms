import { useMemo, useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';
import { sfx } from './gameSfx';
import {
  botMove, makeForcedWin, oCannotEscape, puzzleReply, tttConfig, winnerOf, winningLine
} from '../../data/bands/tictactoe';

const PAUSE_MS = 900;

/**
 * 🧩 Logic: noughts and crosses, played differently per age band (data/bands/tictactoe.js): a gentle computer for the
 * youngest, a sharper one through the middle years, and from Classes 9–10 forced-win
 * puzzles in turn with games — on a 4×4 four-in-a-row board for Classes 11–12.
 */
export default function TicTacToe({ onExit }) {
  const progress = useGameProgress('tic-tac-toe');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

/** A fresh round of the kind due: an empty board for a game, a forced-win position for a puzzle. */
const dealRound = (config, index) => {
  const kind = config.rounds[index % config.rounds.length];
  if (kind === 'puzzle') {
    const n = config.puzzleN || config.n;
    const k = n === 3 ? 3 : 4;
    const board = makeForcedWin(n, k, config.puzzleMoves);
    if (board) return { kind, n, k, board, left: config.puzzleMoves };
  }
  return { kind: 'game', n: config.n, k: config.k, board: Array(config.n * config.n).fill(null), left: 0 };
};

function Round({ progress, onExit }) {
  const band = progress.ageBand || 'analytical';
  const config = useMemo(() => tttConfig(band, progress.difficulty, progress.levelNo), [band, progress.difficulty, progress.levelNo]);
  const young = band === 'foundation' || band === 'developing';
  const [round, setRound] = useState(() => dealRound(config, 0));
  const [played, setPlayed] = useState(0);
  const [points, setPoints] = useState(0);
  const [tally, setTally] = useState({ won: 0, drawn: 0, lost: 0, solved: 0, missed: 0 });
  const [ended, setEnded] = useState(null); // { result, text } while the finished board shows
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started, points >= starsCap(config.target));

  const passed = points >= config.target;
  const stars = over ? starsFor(points, config.target) : 0;
  useRecordStars(progress, over, stars, {
    correct: tally.won + tally.solved,
    wrong: tally.lost + tally.missed,
    score: points,
    limitMs: config.seconds * 1000
  });

  const { board, n, k, kind } = round;
  const line = ended ? winningLine(board, k) : null;

  const next = () => {
    const i = played + 1;
    setPlayed(i);
    setRound(dealRound(config, i));
    setEnded(null);
  };

  const finish = (result, text, gained, change) => {
    setEnded({ result, text });
    if (!gained) sfx.wrong();
    setTally((t) => ({ ...t, [change]: t[change] + 1 }));
    if (gained) setPoints((p) => p + gained);
    setTimeout(next, PAUSE_MS + (kind === 'puzzle' ? 500 : 0));
  };

  const play = (i) => {
    if (over || ended || board[i]) return;
    const b = [...board];
    b[i] = 'X';
    if (kind === 'puzzle') {
      if (winnerOf(b, k) === 'X') { setRound({ ...round, board: b }); finish('X', 'Solved! ⭐ +2', 2, 'solved'); return; }
      const left = round.left - 1;
      const still = left > 0 && oCannotEscape(b, k, left);
      const reply = puzzleReply(b, k, left);
      if (reply !== null) b[reply] = 'O';
      setRound({ ...round, board: b, left });
      if (!still) { finish('O', 'That lets O escape — look for two threats at once.', 0, 'missed'); return; }
      return;
    }
    let w = winnerOf(b, k);
    if (!w) {
      const move = botMove(b, k, config.skill, Math.random, config.depth || 4);
      if (move !== null) b[move] = 'O';
      w = winnerOf(b, k);
    }
    setRound({ ...round, board: b });
    if (w === 'X') finish('X', young ? 'You won! 🎉 +2' : 'You won! +2', 2, 'won');
    else if (w === 'O') finish('O', young ? 'The computer got three. Try again!' : 'Computer wins that one.', 0, 'lost');
    else if (w === 'draw') finish('draw', 'A draw. +1', 1, 'drawn');
  };

  const cellPx = n === 3 ? (young ? 'max-w-[300px]' : 'max-w-[270px]') : 'max-w-[320px]';
  const status = ended
    ? ended.text
    : kind === 'puzzle'
      ? `Puzzle: X to play and win in ${round.left} move${round.left === 1 ? '' : 's'}. O defends perfectly.`
      : n === 4 ? 'Four in a row wins' : 'Three in a row wins';

  const objective = {
    foundation: `You are X. Get three X in a line to win! A win is 2 points, a draw is 1. Get ${config.target} points.`,
    developing: `You are X and go first. Three in a row wins. A win is 2 points, a draw is 1. Get ${config.target} points. Watch out: the computer blocks!`,
    intermediate: `You are X and go first. A win is 2 points, a draw is 1. Reach ${config.target} points. The computer plays its best move ${Math.round(config.skill.smart * 100)}% of the time.`,
    advanced: `On a 4×4 board you need four in a row. Rounds alternate: a forced-win puzzle (win in ${config.puzzleMoves} against perfect defence, 2 points) and a game against a searching computer (win 2, draw 1). Reach ${config.target} points.`
  }[band] || `Rounds alternate: a game against a near-perfect computer (win 2, draw 1) and a "win in 2" puzzle — make a move that creates two threats at once (2 points). Reach ${config.target} points.`;

  return (
    <GameShell
      title="Tic-Tac-Toe"
      blurb={`Score ${config.target} points: a win is 2, a draw is 1.`}
      tone="bg-gradient-to-br from-sky-500 to-indigo-700"
      score={points}
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
              objective,
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
              detail: [
                `${tally.won} won · ${tally.drawn} drawn · ${tally.lost} lost`,
                tally.solved + tally.missed ? `${tally.solved} of ${tally.solved + tally.missed} puzzles solved` : ''
              ].filter(Boolean).join(' · '),
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className={`text-center text-sm font-bold ${ended?.result === 'X' ? 'text-emerald-600' : ended?.result === 'O' ? 'text-rose-600' : 'text-ink-500'}`} role="status" aria-live="polite">
          {status}
        </p>
      }
    >
      {started && !over && (
        <div className={`mx-auto ${cellPx}`}>
          {kind === 'puzzle' && (
            <p className="mb-2 rounded-xl bg-indigo-50 px-3 py-2 text-center text-xs font-black tracking-wide text-indigo-700 uppercase">
              Puzzle · win in {round.left}
            </p>
          )}
          <div className={`grid gap-2 ${n === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
            {board.map((cell, i) => {
              const inLine = line?.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => play(i)}
                  disabled={!!cell || !!ended}
                  aria-label={`Row ${Math.floor(i / n) + 1}, column ${(i % n) + 1}${cell ? `, ${cell}` : ', empty'}`}
                  className={`fp-press flex aspect-square min-h-11 items-center justify-center rounded-2xl font-black ring-1 transition-all ring-inset ${n === 3 ? 'text-4xl' : 'text-3xl'} ${
                    inLine
                      ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400'
                      : cell === 'X'
                        ? 'bg-sky-50 text-sky-700 ring-sky-200'
                        : cell === 'O'
                          ? 'bg-rose-50 text-rose-600 ring-rose-200'
                          : 'bg-surface text-ink-900 ring-line-200 hover:bg-sky-50 hover:ring-sky-300'
                  }`}
                >
                  {cell || ''}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </GameShell>
  );
}
