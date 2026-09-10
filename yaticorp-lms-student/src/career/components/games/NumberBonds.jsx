import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

/**
 * ➕ Math & speed: find the two tiles that make the target.
 *
 * A search rather than a sum, which is the point. Adding two given numbers is
 * arithmetic; scanning a grid for the pair that lands on a target is the thing
 * mental maths is actually for, and it gets quicker with practice in a way
 * that reciting tables does not.
 *
 * Every grid is guaranteed to contain at least one valid pair, planted before
 * the rest is filled in.
 */
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const configFor = (difficulty, levelNo) => ({
  tiles: Math.min(12, between(6, 9, levelNo) + (difficulty - 1)),
  max: between(12, 30, levelNo) + (difficulty - 1) * 10,
  seconds: between(70, 50, levelNo),
  target: between(5, 12, levelNo) + (difficulty - 1) * 2
});

const makeGrid = (tiles, max) => {
  const a = rnd(2, max);
  const b = rnd(2, max);
  const goal = a + b;
  const values = [a, b];
  // Fill the rest, refusing any number that would create a second easy pair
  // with a tile already on the board.
  let guard = 0;
  while (values.length < tiles && guard < 400) {
    guard += 1;
    const n = rnd(2, max);
    if (values.some((v) => v + n === goal)) continue;
    values.push(n);
  }
  while (values.length < tiles) values.push(rnd(2, max));
  return { goal, values: values.sort(() => Math.random() - 0.5) };
};

export default function NumberBonds({ onExit }) {
  const progress = useGameProgress('number-bonds');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const [started, setStarted] = useState(false);
  const [grid, setGrid] = useState(() => makeGrid(config.tiles, config.max));
  const [picked, setPicked] = useState([]);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null);
  const { seconds, over } = useTimedRound(config.seconds, started);

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const tap = (index) => {
    if (over || flash || picked.includes(index)) return;
    const next = [...picked, index];
    if (next.length < 2) {
      setPicked(next);
      return;
    }
    const sum = grid.values[next[0]] + grid.values[next[1]];
    const right = sum === grid.goal;
    if (right) setScore((s) => s + 1);
    setPicked(next);
    setFlash(right ? 'right' : 'wrong');
    setTimeout(() => {
      setFlash(null);
      setPicked([]);
      if (right) setGrid(makeGrid(config.tiles, config.max));
    }, 380);
  };

  const tileClass = (index) => {
    const chosen = picked.includes(index);
    if (flash === 'right' && chosen) return 'bg-emerald-50 text-emerald-800 ring-emerald-300';
    if (flash === 'wrong' && chosen) return 'bg-rose-50 text-rose-700 ring-rose-300';
    if (chosen) return 'bg-amber-100 text-amber-900 ring-amber-400';
    return 'bg-surface-50 text-ink-900 ring-line-200 hover:bg-amber-50 hover:ring-amber-300';
  };

  return (
    <GameShell
      title="Number Bonds"
      blurb={`Reach ${config.target} pairs before the clock runs out.`}
      tone="bg-gradient-to-br from-amber-500 to-orange-600"
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
              objective: `Tap the two tiles that add up to the target. Find ${config.target} pairs.`,
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
      footer={<p className="text-center text-sm text-ink-500">Two tiles, one target. There is always a pair.</p>}
    >
      {started && !over && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-5">
          <div className="flex items-baseline gap-2">
            <span className="text-[0.7rem] font-black tracking-[0.14em] text-amber-600 uppercase">Make</span>
            <span className="text-4xl font-black text-ink-900 tabular-nums">{grid.goal}</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {grid.values.map((n, i) => (
              <button
                key={i}
                type="button"
                onClick={() => tap(i)}
                className={`fp-press flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-black tabular-nums ring-1 transition-all ring-inset ${tileClass(i)}`}
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
