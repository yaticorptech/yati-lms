import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

/**
 * ⚖️ Logic & deduction: work out the order from the clues.
 *
 * Every puzzle has exactly one consistent answer, because the clues are read
 * off a hidden ordering rather than invented and checked afterwards. The
 * clues are then shuffled and thinned, so the student has to chain them
 * rather than find the answer written in one of them.
 */
const SHAPES = ['🟥', '🟦', '🟩', '🟨', '🟪', '🟧'];

const configFor = (difficulty, levelNo) => ({
  items: Math.min(6, between(3, 5, levelNo) + (difficulty - 1)),
  seconds: between(80, 60, levelNo),
  target: between(4, 9, levelNo) + (difficulty - 1)
});

/**
 * Build a puzzle from a hidden heaviest-to-lightest order. Only neighbouring
 * pairs are given, so every clue is needed to reach the ends.
 */
const makePuzzle = (count) => {
  const order = [...SHAPES].sort(() => Math.random() - 0.5).slice(0, count);
  const clues = [];
  for (let i = 0; i < order.length - 1; i += 1) clues.push([order[i], order[i + 1]]);
  const askHeaviest = Math.random() < 0.5;
  return {
    clues: clues.sort(() => Math.random() - 0.5),
    options: [...order].sort(() => Math.random() - 0.5),
    answer: askHeaviest ? order[0] : order[order.length - 1],
    askHeaviest
  };
};

export default function ScaleBalance({ onExit }) {
  const progress = useGameProgress('scale-balance');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const [started, setStarted] = useState(false);
  const [puzzle, setPuzzle] = useState(() => makePuzzle(config.items));
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null);
  const { seconds, over } = useTimedRound(config.seconds, started, score >= starsCap(config.target));

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const choose = (shape) => {
    if (over) return;
    const right = shape === puzzle.answer;
    if (right) setScore((s) => s + 1);
    setFlash(right ? 'right' : 'wrong');
    setTimeout(() => {
      setFlash(null);
      setPuzzle(makePuzzle(config.items));
    }, 400);
  };

  return (
    <GameShell
      title="Scale Balance"
      blurb={`Reach ${config.target} correct before the clock runs out.`}
      tone="bg-gradient-to-br from-sky-500 to-indigo-700"
      score={score}
      seconds={seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Read the scales, then pick the heaviest or lightest. Reach ${config.target} correct.`,
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
              detail: `${score} correct`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-ink-500">Every clue matters; none of them names the answer</p>}
    >
      {started && !over && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-5">
          <ul className="w-full space-y-2">
            {puzzle.clues.map(([heavy, light], i) => (
              <li
                key={`${heavy}-${light}-${i}`}
                className="flex items-center justify-center gap-3 rounded-2xl bg-surface-50 py-2.5 text-2xl ring-1 ring-line-200 ring-inset"
              >
                <span>{heavy}</span>
                <span className="text-xs font-black text-ink-400">heavier than</span>
                <span>{light}</span>
              </li>
            ))}
          </ul>

          <p className="text-sm font-black text-ink-900">
            Which is the {puzzle.askHeaviest ? 'heaviest' : 'lightest'}?
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {puzzle.options.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => choose(s)}
                className={`fp-press flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ring-1 transition-all ring-inset ${
                  flash === 'right' && s === puzzle.answer
                    ? 'bg-emerald-50 ring-emerald-300'
                    : flash === 'wrong' && s !== puzzle.answer
                      ? 'bg-rose-50 ring-rose-300'
                      : 'bg-surface-50 ring-line-200 hover:bg-sky-50 hover:ring-sky-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}
