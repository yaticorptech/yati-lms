import { useState, useEffect } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useRecordStars from './useRecordStars';

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * A stream of steps whose running total never goes negative.
 *
 * A subtraction bigger than the total so far is replaced by an addition, so
 * the student is never asked to hold a negative number they were not warned
 * about — and the four options can always be positive.
 */
const makeStream = (length, max, allowMinus) => {
  const steps = [];
  let total = 0;
  for (let i = 0; i < length; i += 1) {
    const size = rnd(2, max);
    const minus = allowMinus && i > 0 && Math.random() < 0.4 && total - size >= 0;
    steps.push(minus ? -size : size);
    total += minus ? -size : size;
  }
  // Options are built here, with the round, rather than during render: built
  // in render they would reshuffle on every re-render and move the buttons
  // under the player's finger between reading them and tapping one.
  const set = new Set([total]);
  while (set.size < 4) {
    const drift = rnd(1, Math.max(3, Math.round(Math.abs(total) * 0.3)));
    const candidate = total + (Math.random() < 0.5 ? -drift : drift);
    if (candidate >= 0) set.add(candidate);
  }
  const options = [...set].sort(() => Math.random() - 0.5);

  return { steps, total, options };
};

const configFor = (difficulty, levelNo) => ({
  length: between(4, 8, levelNo) + (difficulty - 1),
  max: between(6, 14, levelNo) + (difficulty - 1) * 4,
  allowMinus: difficulty > 1,
  stepMs: Math.max(550, between(1300, 800, levelNo) - (difficulty - 1) * 150),
  rounds: 3
});

/**
 * ➕ Math & speed: numbers appear one at a time. Keep the running total.
 *
 * Arithmetic under memory load — you cannot write it down and the next number
 * arrives whether you are ready or not.
 */
export default function RunningTotal({ onExit }) {
  const progress = useGameProgress('running-total');
  return (
    <Round
      key={`${progress.level}-${progress.attempt}`}
      progress={progress}
      onExit={onExit}
    />
  );
}

function Round({ progress, onExit }) {
  const [started, setStarted] = useState(false);
  const config = configFor(progress.difficulty, progress.levelNo);
  const [stream, setStream] = useState(() => makeStream(config.length, config.max, config.allowMinus));
  const [shown, setShown] = useState(0);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [verdict, setVerdict] = useState(null);

  const playing = shown < stream.steps.length;

  // Only the timer callback writes state, so nothing is set during the effect.
  useEffect(() => {
    // The number stream ran behind the intro panel.
    if (!started || !playing) return undefined;
    const t = setTimeout(() => setShown((n) => n + 1), config.stepMs);
    return () => clearTimeout(t);
  }, [started, playing, shown, config.stepMs]);

  const done = round > config.rounds;
  const passed = score >= Math.ceil(config.rounds * 0.67);
  const finishedRound = done;
  const stars = finishedRound ? starsFor(score, Math.ceil(config.rounds * 0.67), false) : 0;
  useRecordStars(progress, finishedRound, stars);

  const answer = (value) => {
    if (verdict !== null) return;
    const right = value === stream.total;
    if (right) setScore((s) => s + 1);
    setVerdict(right ? 'right' : 'wrong');
  };

  const nextRound = () => {
    setStream(makeStream(config.length, config.max, config.allowMinus));
    setShown(0);
    setVerdict(null);
    setRound((r) => r + 1);
  };

  return (
    <GameShell
      title="Running Total"
      blurb={`Keep the total in your head. Get ${Math.ceil(config.rounds * 0.67)} of ${config.rounds}.`}
      tone="bg-gradient-to-br from-emerald-500 to-teal-700"
      score={`${score}/${config.rounds}`}
      progress={progress}
      onRestart={progress.retry}
      onExit={onExit}
      intro={
        !started
          ? {
              gameId: progress.gameId,
              level: progress.level,
              objective: `Get ${Math.ceil(config.rounds * 0.67)} of ${config.rounds} totals right.`,
              stars: starsOn(progress.gameId, progress.level),
              onStart: () => setStarted(true)
            }
          : null
      }
      result={
        finishedRound
          ? {
              passed,
              stars,
              headline: passed ? `Level ${progress.level} cleared!` : 'So close',
              detail: `${score} of ${config.rounds} correct`,
              atEnd: progress.atEnd,
              onNext: progress.advance,
              onRetry: progress.retry
            }
          : null
      }
      footer={
        <p className="text-center text-sm text-ink-500">
          {playing
            ? `Round ${round} of ${config.rounds} — keep adding`
            : verdict === null
              ? 'What was the total?'
              : verdict === 'right'
                ? '✅ Correct'
                : `❌ It was ${stream.total}`}
        </p>
      }
    >
      {started && !done && (
        <div className="mx-auto max-w-md text-center">
          {playing ? (
            <p
              key={shown}
              className={`animate-badge-burst text-6xl font-black tabular-nums ${
                stream.steps[shown] < 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {stream.steps[shown] < 0 ? '−' : '+'}
              {Math.abs(stream.steps[shown])}
            </p>
          ) : (
            <>
              <p className="text-2xl font-black text-ink-900">Total?</p>
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {stream.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => answer(option)}
                    disabled={verdict !== null}
                    className={`fp-press min-h-14 rounded-2xl text-xl font-black ring-1 transition-all ring-inset tabular-nums ${
                      verdict !== null && option === stream.total
                        ? 'bg-emerald-50 text-emerald-800 ring-emerald-300'
                        : 'bg-surface-50 text-ink-900 ring-line-200 hover:bg-emerald-50 hover:ring-emerald-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {verdict !== null && (
                <button
                  type="button"
                  onClick={nextRound}
                  className="fp-press mt-5 min-h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 text-sm font-black text-white"
                >
                  {round === config.rounds ? 'See result' : `Round ${round + 1}`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </GameShell>
  );
}
