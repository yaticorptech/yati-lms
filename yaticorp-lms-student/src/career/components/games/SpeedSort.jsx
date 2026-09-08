import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = (list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** A board of distinct numbers, scattered. */
const makeBoard = (count, max) => {
  const set = new Set();
  while (set.size < count) set.add(rnd(1, max));
  return shuffle([...set]).map((value, i) => ({ value, key: `${value}-${i}` }));
};

const configFor = (difficulty, levelNo) => ({
  count: between(6, 12, levelNo) + (difficulty - 1) * 2,
  max: between(20, 99, levelNo) * difficulty,
  seconds: between(60, 45, levelNo),
  // Boards cleared, not numbers tapped: a wrong tap costs the board.
  target: between(3, 7, levelNo) + (difficulty - 1)
});

/** ⚡ Math & speed: tap the numbers from smallest to largest. */
export default function SpeedSort({ onExit }) {
  const progress = useGameProgress('speed-sort');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const [board, setBoard] = useState(() => makeBoard(config.count, config.max));
  const [done, setDone] = useState([]); // values already tapped, in order
  const [cleared, setCleared] = useState(0);
  const [shake, setShake] = useState(false);
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started);

  const passed = cleared >= config.target;
  const stars = over ? starsFor(cleared, config.target) : 0;
  useRecordStars(progress, over, stars);

  const remaining = board.filter((c) => !done.includes(c.value)).map((c) => c.value);
  const nextValue = Math.min(...remaining);

  const tap = (value) => {
    if (over || done.includes(value)) return;
    if (value === nextValue) {
      const nextDone = [...done, value];
      if (nextDone.length === board.length) {
        setCleared((n) => n + 1);
        setBoard(makeBoard(config.count, config.max));
        setDone([]);
      } else {
        setDone(nextDone);
      }
    } else {
      // Start the board over, so a wrong tap costs time rather than a life.
      setShake(true);
      setDone([]);
      setTimeout(() => setShake(false), 350);
    }
  };

  return (
    <GameShell
      title="Speed Sort"
      blurb={`Clear ${config.target} boards, smallest to largest, before the clock runs out.`}
      tone="bg-gradient-to-br from-amber-500 to-red-600"
      score={`${cleared}/${config.target}`}
      scoreLabel="Boards"
      seconds={seconds}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Tap every number from smallest to largest. A wrong tap restarts the board. Clear ${config.target} boards in time.`,
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
              detail: `${cleared} of ${config.target} boards`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={<p className="text-center text-sm text-ink-500">Next up: the smallest number still on the board</p>}
    >
      {started && !over && (
        <div className={`mx-auto grid max-w-md grid-cols-3 gap-2.5 sm:grid-cols-4 ${shake ? 'animate-[fp-wiggle_0.35s_ease-in-out]' : ''}`}>
          {board.map((cell) => {
            const tapped = done.includes(cell.value);
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => tap(cell.value)}
                disabled={tapped}
                className={`fp-press min-h-16 rounded-2xl text-2xl font-black tabular-nums ring-1 transition-all ring-inset ${
                  tapped
                    ? 'bg-emerald-500 text-white ring-emerald-500'
                    : 'bg-surface text-ink-900 ring-line-200 hover:bg-amber-50 hover:ring-amber-300'
                }`}
              >
                {cell.value}
              </button>
            );
          })}
        </div>
      )}
    </GameShell>
  );
}
