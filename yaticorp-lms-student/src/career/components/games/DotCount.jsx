import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

const DOTS = [
  { name: 'RED', dot: 'bg-rose-500', word: 'text-rose-600' },
  { name: 'BLUE', dot: 'bg-sky-500', word: 'text-sky-600' },
  { name: 'GREEN', dot: 'bg-emerald-500', word: 'text-emerald-600' },
  { name: 'YELLOW', dot: 'bg-amber-400', word: 'text-amber-500' },
  { name: 'PURPLE', dot: 'bg-violet-500', word: 'text-violet-600' }
];

/* Literal, because Tailwind compiles only class names it can read. */
const COLS = { 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6' };

const rnd = (n) => Math.floor(Math.random() * n);

const shuffle = (list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * A field of coloured dots and one colour to count. The answers offered are
 * the true count and three of its neighbours, so a rough glance is never
 * enough — the whole grid has to be scanned.
 */
const makeRound = (colours, side) => {
  const palette = DOTS.slice(0, colours);
  const ask = palette[rnd(palette.length)];
  const grid = Array.from({ length: side * side }, () => palette[rnd(palette.length)]);
  const count = grid.filter((d) => d.name === ask.name).length;
  const near = shuffle([count - 2, count - 1, count + 1, count + 2, count + 3].filter((n) => n >= 0)).slice(0, 3);
  return { ask, grid, count, options: shuffle([count, ...near]) };
};

const configFor = (difficulty, levelNo) => ({
  side: 3 + difficulty,
  colours: 2 + difficulty,
  seconds: between(60, 45, levelNo),
  target: between(6, 14, levelNo) + (difficulty - 1) * 2
});

/**
 * 🔵 Memory & focus: how many dots of one colour are on the board?
 *
 * Counting under a clock is attention in its plainest form — the eye wants
 * to skim, and the score depends on not letting it.
 */
export default function DotCount({ onExit }) {
  const progress = useGameProgress('dot-count');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const [round, setRound] = useState(() => makeRound(config.colours, config.side));
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null);
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started, score >= starsCap(config.target));

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const choose = (n) => {
    if (over || flash) return;
    const right = n === round.count;
    if (right) setScore((s) => s + 1);
    setFlash(right ? 'right' : 'wrong');
    setTimeout(() => {
      setFlash(null);
      setRound(makeRound(config.colours, config.side));
    }, 260);
  };

  return (
    <GameShell
      title="Dot Count"
      blurb={`Count one colour across the board. Reach ${config.target}.`}
      tone="bg-gradient-to-br from-violet-500 to-fuchsia-700"
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
              objective: `Count the dots of the colour asked. Reach ${config.target} correct before the clock runs out.`,
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
      footer={
        <p className="text-center text-sm text-ink-500">
          Scan <strong className="font-black">row by row</strong> — the eye skips when it jumps about
        </p>
      }
    >
      {started && !over && (
        <div className="mx-auto max-w-md text-center">
          <p className="text-lg font-bold text-ink-700">
            How many <span className={`font-black ${round.ask.word}`}>{round.ask.name}</span> dots?
          </p>

          <div
            className={`mx-auto mt-5 grid w-fit gap-2 rounded-2xl bg-surface-50 p-3 ring-1 ring-line-200 ring-inset transition-transform ${COLS[config.side]} ${
              flash === 'right' ? 'scale-[1.03]' : flash === 'wrong' ? 'opacity-60' : ''
            }`}
          >
            {round.grid.map((d, i) => (
              <span key={i} className={`h-7 w-7 rounded-full sm:h-8 sm:w-8 ${d.dot}`} />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-4 gap-2.5">
            {round.options.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => choose(n)}
                className="fp-press min-h-14 rounded-2xl bg-surface-50 text-xl font-black text-ink-900 ring-1 ring-line-200 transition-colors ring-inset tabular-nums hover:bg-journey-50 hover:ring-journey-300"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}
