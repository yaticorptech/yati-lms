import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

/*
 * Shapes as cells on a grid. Every one is chiral — its mirror image cannot
 * be turned into it — which is the whole point: the wrong answers are the
 * shape flipped, and only a real rotation is right.
 */
const SHAPES = {
  L: { cells: [[0, 0], [0, 1], [0, 2], [1, 2]], level: 1 },
  S: { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], level: 1 },
  P: { cells: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]], level: 1 },
  N: { cells: [[1, 0], [1, 1], [0, 2], [1, 2], [0, 3]], level: 2 },
  Y: { cells: [[1, 0], [0, 1], [1, 1], [1, 2], [1, 3]], level: 2 },
  F: { cells: [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]], level: 3 },
  R: { cells: [[0, 0], [1, 0], [1, 1], [2, 1], [1, 2]], level: 3 }
};

const rnd = (n) => Math.floor(Math.random() * n);

const shuffle = (list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** Shift a shape into the corner so two placements of it compare equal. */
const normalise = (cells) => {
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells.map(([x, y]) => [x - minX, y - minY]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};

const rotate = (cells) => normalise(cells.map(([x, y]) => [-y, x]));
const mirror = (cells) => normalise(cells.map(([x, y]) => [-x, y]));
const turns = (cells, n) => Array.from({ length: n }).reduce((c) => rotate(c), normalise(cells));
const key = (cells) => normalise(cells).map((c) => c.join(',')).join(';');

/**
 * One shape, and four candidates: it turned a quarter, half or three
 * quarters, plus three impostors — the shape flipped and turned, or another
 * shape altogether — none of which is the original in disguise.
 */
const makeRound = (difficulty) => {
  const names = Object.keys(SHAPES).filter((n) => SHAPES[n].level <= difficulty);
  const name = names[rnd(names.length)];
  const base = normalise(SHAPES[name].cells);
  const answer = turns(base, 1 + rnd(3));
  const seen = new Set([key(answer)]);
  const options = [{ cells: answer, right: true }];

  const flipped = mirror(base);
  const pool = shuffle([turns(flipped, 0), turns(flipped, 1), turns(flipped, 2), turns(flipped, 3)]);
  for (const cells of pool) {
    if (options.length >= 3) break;
    if (!seen.has(key(cells))) {
      seen.add(key(cells));
      options.push({ cells, right: false });
    }
  }
  const others = shuffle(names.filter((n) => n !== name));
  for (const other of others) {
    if (options.length >= 4) break;
    const cells = turns(SHAPES[other].cells, rnd(4));
    if (!seen.has(key(cells))) {
      seen.add(key(cells));
      options.push({ cells, right: false });
    }
  }
  // A band with only three shapes can run short of impostors; a second flip
  // of the same shape fills the last slot without ever being a rotation.
  for (const cells of pool) {
    if (options.length >= 4) break;
    if (!seen.has(key(cells))) {
      seen.add(key(cells));
      options.push({ cells, right: false });
    }
  }
  return { base, options: shuffle(options) };
};

const configFor = (difficulty, levelNo) => ({
  seconds: between(60, 45, levelNo),
  target: between(6, 12, levelNo) + (difficulty - 1) * 2
});

/** A shape drawn on a four-by-four grid, in the given colour. */
function Shape({ cells, fill, size = 96 }) {
  const unit = size / 4;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" aria-hidden>
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x * unit + 2} y={y * unit + 2} width={unit - 4} height={unit - 4} rx={unit / 5} fill={fill} />
      ))}
    </svg>
  );
}

/**
 * 🔄 Logic & deduction: which of these is the same shape, just turned?
 *
 * Mental rotation — turning a thing in the head instead of on the page. It
 * is the skill behind reading a map the wrong way up, and every wrong answer
 * here is a mirror image, which is what makes it a skill rather than a
 * matching exercise.
 */
export default function SpinMatch({ onExit }) {
  const progress = useGameProgress('spin-match');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const [round, setRound] = useState(() => makeRound(progress.difficulty));
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started, score >= starsCap(config.target));

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const choose = (i) => {
    if (over || picked !== null) return;
    setPicked(i);
    if (round.options[i].right) setScore((s) => s + 1);
    setTimeout(() => {
      setPicked(null);
      setRound(makeRound(progress.difficulty));
    }, 420);
  };

  return (
    <GameShell
      title="Spin Match"
      blurb={`Find the shape that is only turned, never flipped. Reach ${config.target}.`}
      tone="bg-gradient-to-br from-cyan-500 to-blue-700"
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
              objective: `Pick the option that is the same shape rotated — the others are mirror images. Reach ${config.target} correct.`,
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
          Turned is fine. <strong className="font-black">Flipped</strong> is a different shape
        </p>
      }
    >
      {started && !over && (
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto h-28 w-28 rounded-2xl bg-surface-50 p-2 ring-1 ring-line-200 ring-inset">
            <Shape cells={round.base} fill="#6c3bff" />
          </div>
          <p className="mt-3 text-sm font-bold text-ink-500">Which one is this shape, turned?</p>

          <div className="mt-4 grid grid-cols-4 gap-2.5 sm:gap-3">
            {round.options.map((option, i) => {
              const show = picked !== null;
              const state =
                show && option.right
                  ? 'bg-emerald-50 ring-emerald-400'
                  : show && picked === i
                    ? 'bg-rose-50 ring-rose-300'
                    : 'bg-surface-50 ring-line-200 hover:bg-journey-50 hover:ring-journey-300';
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => choose(i)}
                  aria-label={`Option ${i + 1}`}
                  className={`fp-press aspect-square rounded-2xl p-2 ring-1 transition-colors ring-inset ${state}`}
                >
                  <Shape cells={option.cells} fill={show && option.right ? '#059669' : '#334155'} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </GameShell>
  );
}
