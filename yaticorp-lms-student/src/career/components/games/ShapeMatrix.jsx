import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

/**
 * 🧩 Logic & deduction: the grid follows a rule. Finish it.
 *
 * A three by three matrix where colour advances along the rows and the count
 * of marks advances down the columns. The bottom-right cell is missing and
 * every wrong option is right about one axis and wrong about the other, so
 * spotting only half the rule does not get you there.
 */
const COLOURS = [
  { key: 'rose', dot: 'bg-rose-500' },
  { key: 'sky', dot: 'bg-sky-500' },
  { key: 'amber', dot: 'bg-amber-500' },
  { key: 'emerald', dot: 'bg-emerald-500' },
  { key: 'violet', dot: 'bg-violet-500' }
];

const configFor = (difficulty, levelNo) => ({
  seconds: between(80, 55, levelNo),
  target: between(4, 9, levelNo) + (difficulty - 1),
  // Higher bands start the counts further along, so the marks are denser and
  // the pattern is a little harder to read at a glance.
  offset: difficulty - 1 + Math.floor(between(0, 2, levelNo))
});

const cell = (colour, count) => ({ colour, count });

const makePuzzle = (offset) => {
  const palette = [...COLOURS].sort(() => Math.random() - 0.5).slice(0, 3);
  const grid = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      grid.push(cell(palette[col], row + 1 + offset));
    }
  }
  const answer = grid[8];

  // Each distractor is correct on exactly one axis.
  const wrongColour = palette[(palette.indexOf(answer.colour) + 1) % palette.length];
  const options = [
    answer,
    cell(wrongColour, answer.count),
    cell(answer.colour, answer.count === 1 ? answer.count + 1 : answer.count - 1),
    cell(wrongColour, answer.count + 1)
  ].sort(() => Math.random() - 0.5);

  return { grid: grid.slice(0, 8), options, answer };
};

const same = (a, b) => a.colour.key === b.colour.key && a.count === b.count;

/** One cell drawn as its marks. */
const Cell = ({ value, className = '' }) => (
  <span className={`flex h-16 w-16 flex-wrap content-center items-center justify-center gap-1 rounded-xl p-2 ${className}`}>
    {Array.from({ length: value.count }).map((_, i) => (
      <span key={i} className={`h-3 w-3 rounded-full ${value.colour.dot}`} />
    ))}
  </span>
);

export default function ShapeMatrix({ onExit }) {
  const progress = useGameProgress('shape-matrix');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const [started, setStarted] = useState(false);
  const [puzzle, setPuzzle] = useState(() => makePuzzle(config.offset));
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null);
  const { seconds, over } = useTimedRound(config.seconds, started);

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const choose = (value) => {
    if (over) return;
    const right = same(value, puzzle.answer);
    if (right) setScore((s) => s + 1);
    setFlash(right ? 'right' : 'wrong');
    setTimeout(() => {
      setFlash(null);
      setPuzzle(makePuzzle(config.offset));
    }, 400);
  };

  return (
    <GameShell
      title="Shape Matrix"
      blurb={`Reach ${config.target} correct before the clock runs out.`}
      tone="bg-gradient-to-br from-blue-600 to-cyan-700"
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
              objective: `Work out the rule and finish the grid. Reach ${config.target} correct.`,
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
      footer={<p className="text-center text-sm text-ink-500">Colour runs across; the count runs down</p>}
    >
      {started && !over && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-5">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-50 p-3 ring-1 ring-line-200 ring-inset">
            {puzzle.grid.map((value, i) => (
              <Cell key={i} value={value} className="bg-surface ring-1 ring-line-100 ring-inset" />
            ))}
            <span className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-cyan-300 text-2xl font-black text-cyan-500">
              ?
            </span>
          </div>

          <p className="text-sm font-black text-ink-900">Which one completes it?</p>

          <div className="flex flex-wrap justify-center gap-3">
            {puzzle.options.map((value, i) => (
              <button
                key={i}
                type="button"
                onClick={() => choose(value)}
                className={`fp-press rounded-2xl ring-1 transition-all ring-inset ${
                  flash === 'right' && same(value, puzzle.answer)
                    ? 'bg-emerald-50 ring-emerald-300'
                    : flash === 'wrong' && !same(value, puzzle.answer)
                      ? 'bg-rose-50 ring-rose-300'
                      : 'bg-surface-50 ring-line-200 hover:bg-cyan-50 hover:ring-cyan-300'
                }`}
              >
                <Cell value={value} />
              </button>
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}
