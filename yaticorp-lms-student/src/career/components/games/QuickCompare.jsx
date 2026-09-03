import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Two expressions whose values are never equal.
 *
 * A tie would make the question unanswerable — both buttons right, neither
 * scoring — so it is regenerated rather than shown.
 */
const makePair = (max, ops) => {
  const build = () => {
    const a = rnd(2, max);
    const b = rnd(2, Math.max(3, max - 3));
    const op = ops[rnd(0, ops.length - 1)];
    return { text: `${a} ${op} ${b}`, value: op === '×' ? a * b : a + b };
  };
  for (let attempt = 0; attempt < 40; attempt++) {
    const left = build();
    const right = build();
    if (left.value !== right.value) return { left, right };
  }
  return { left: { text: '2 × 3', value: 6 }, right: { text: '2 + 3', value: 5 } };
};

const configFor = (difficulty, levelNo) => ({
  max: between(9, 18, levelNo) + (difficulty - 1) * 4,
  ops: difficulty === 1 ? ['+'] : ['+', '×'],
  seconds: between(50, 35, levelNo),
  target: between(8, 20, levelNo) + (difficulty - 1) * 3
});

/** ⚡ Math & speed: which side is bigger? */
export default function QuickCompare({ onExit }) {
  const progress = useGameProgress('quick-compare');
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
  const [pair, setPair] = useState(() => makePair(config.max, config.ops));
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null);
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started);

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const choose = (side) => {
    if (over) return;
    const bigger = pair.left.value > pair.right.value ? 'left' : 'right';
    if (side === bigger) {
      setScore((s) => s + 1);
      setFlash('right');
    } else {
      setFlash('wrong');
    }
    setPair(makePair(config.max, config.ops));
    setTimeout(() => setFlash(null), 250);
  };

  const sideClass = `fp-press flex min-h-32 flex-1 basis-40 items-center justify-center rounded-3xl text-3xl font-black tabular-nums ring-1 transition-all ring-inset ${
    flash === 'right'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-300'
      : flash === 'wrong'
        ? 'bg-rose-50 text-rose-700 ring-rose-300'
        : 'bg-surface-50 text-ink-900 ring-line-200 hover:bg-amber-50 hover:ring-amber-300'
  }`;

  return (
    <GameShell
      title="Quick Compare"
      blurb={`Reach ${config.target} correct before the clock runs out.`}
      tone="bg-gradient-to-br from-orange-500 to-rose-600"
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
      footer={<p className="text-center text-sm text-ink-500">Tap the side with the larger value</p>}
    >
      {started && !over && (
        <div className="mx-auto flex max-w-md flex-wrap items-stretch gap-3">
          <button type="button" onClick={() => choose('left')} className={sideClass}>
            {pair.left.text}
          </button>
          <span className="flex items-center text-sm font-black text-ink-400">vs</span>
          <button type="button" onClick={() => choose('right')} className={sideClass}>
            {pair.right.text}
          </button>
        </div>
      )}
    </GameShell>
  );
}
