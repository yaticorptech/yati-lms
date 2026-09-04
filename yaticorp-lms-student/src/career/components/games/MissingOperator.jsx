import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const apply = (a, op, b) => (op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : a / b);

/**
 * Build "a ? b = c" where exactly one operator works.
 *
 * Any puzzle a second operator also satisfies is thrown away and regenerated —
 * otherwise the game would mark a correct answer wrong. That happens more
 * often than it looks: 2 + 2 and 2 × 2 both make 4.
 */
const makePuzzle = (max, ops) => {
  for (let attempt = 0; attempt < 60; attempt++) {
    const op = ops[rnd(0, ops.length - 1)];
    let a = rnd(2, max);
    let b = rnd(2, max);

    if (op === '-' && b > a) [a, b] = [b, a];
    if (op === '÷') a = b * rnd(2, max);

    const target = apply(a, op, b);
    if (!Number.isInteger(target) || target < 0) continue;
    if (ops.some((other) => other !== op && apply(a, other, b) === target)) continue;

    return { a, b, target, answer: op, options: ops };
  }
  return { a: 6, b: 3, target: 2, answer: '÷', options: ops };
};

const configFor = (difficulty, levelNo) => ({
  max: between(8, 14, levelNo) + (difficulty - 1) * 3,
  ops: difficulty === 1 ? ['+', '-'] : difficulty === 2 ? ['+', '-', '×'] : ['+', '-', '×', '÷'],
  seconds: between(60, 40, levelNo),
  target: between(5, 14, levelNo) + (difficulty - 1) * 2
});

/** ➗ Math & speed: which sign makes the equation true? */
export default function MissingOperator({ onExit }) {
  const progress = useGameProgress('missing-operator');
  return (
    <Round
      key={`${progress.level}-${progress.attempt}`}
      progress={progress}
      onExit={onExit}
    />
  );
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const [puzzle, setPuzzle] = useState(() => makePuzzle(config.max, config.ops));
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null);
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started);

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const choose = (op) => {
    if (over) return;
    if (op === puzzle.answer) {
      setScore((s) => s + 1);
      setFlash('right');
    } else {
      setFlash('wrong');
    }
    setPuzzle(makePuzzle(config.max, config.ops));
    setTimeout(() => setFlash(null), 250);
  };

  return (
    <GameShell
      title="Missing Operator"
      blurb={`Reach ${config.target} correct before the clock runs out.`}
      tone="bg-gradient-to-br from-amber-500 to-red-600"
      score={`${score}/${config.target}`}
      seconds={seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Reach ${config.target} correct answers before the clock runs out.`,
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
              detail: `${score} of ${config.target} needed`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-ink-500">Fill in the missing sign</p>}
    >
      {started && !over && (
        <div className="mx-auto max-w-md text-center">
          <p
            className={`flex flex-wrap items-center justify-center gap-3 text-4xl font-black tabular-nums transition-colors sm:text-5xl ${
              flash === 'right' ? 'text-emerald-600' : flash === 'wrong' ? 'text-rose-600' : 'text-ink-900'
            }`}
          >
            <span>{puzzle.a}</span>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              ?
            </span>
            <span>{puzzle.b}</span>
            <span className="text-ink-400">=</span>
            <span>{puzzle.target}</span>
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            {puzzle.options.map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => choose(op)}
                aria-label={`Operator ${op}`}
                className="fp-press flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-50 text-2xl font-black text-ink-900 ring-1 ring-line-200 transition-all ring-inset hover:bg-amber-50 hover:ring-amber-300"
              >
                {op}
              </button>
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}
