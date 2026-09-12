import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

/**
 * 🔟 Math & speed: round it, fast.
 *
 * The skill underneath every sanity check a person ever does on a number. The
 * wrong options are the mistakes people actually make: rounding the wrong way
 * at a five, and rounding to the wrong place entirely.
 */
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const configFor = (difficulty, levelNo) => ({
  // Bigger numbers and coarser places as the ladder rises.
  places: difficulty === 1 ? [10] : difficulty === 2 ? [10, 100] : [10, 100, 1000],
  max: between(200, 9000, levelNo),
  seconds: between(60, 45, levelNo),
  target: between(7, 16, levelNo) + (difficulty - 1) * 3
});

const roundTo = (n, place) => Math.round(n / place) * place;

const makeQuestion = (max, places) => {
  const place = places[rnd(0, places.length - 1)];
  const value = rnd(place, max);
  const answer = roundTo(value, place);

  const wrong = new Set();
  // The classic errors: one step the wrong way, and the wrong place value.
  wrong.add(answer + place);
  wrong.add(Math.max(0, answer - place));
  const otherPlace = place === 1000 ? 100 : place * 10;
  wrong.add(roundTo(value, otherPlace));
  wrong.delete(answer);

  const options = [answer, ...[...wrong].slice(0, 3)].sort(() => Math.random() - 0.5);
  return { value, place, answer, options };
};

export default function RoundingRush({ onExit }) {
  const progress = useGameProgress('rounding-rush');
  return <Round key={`${progress.level}-${progress.attempt}`} progress={progress} onExit={onExit} />;
}

function Round({ progress, onExit }) {
  const config = configFor(progress.difficulty, progress.levelNo);
  const [started, setStarted] = useState(false);
  const [q, setQ] = useState(() => makeQuestion(config.max, config.places));
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null);
  const { seconds, over } = useTimedRound(config.seconds, started, score >= starsCap(config.target));

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const choose = (value) => {
    if (over || flash) return;
    const right = value === q.answer;
    if (right) setScore((s) => s + 1);
    setFlash(right ? 'right' : 'wrong');
    setTimeout(() => {
      setFlash(null);
      setQ(makeQuestion(config.max, config.places));
    }, 300);
  };

  return (
    <GameShell
      title="Rounding Rush"
      blurb={`Reach ${config.target} correct before the clock runs out.`}
      tone="bg-gradient-to-br from-yellow-500 to-amber-600"
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
              objective: `Round each number to the place asked for. Reach ${config.target} correct.`,
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
      footer={<p className="text-center text-sm text-ink-500">Halfway rounds up</p>}
    >
      {started && !over && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-5">
          <div className="text-center">
            <p className="text-[0.7rem] font-black tracking-[0.14em] text-amber-600 uppercase">
              Round to the nearest {q.place}
            </p>
            <p className="mt-1 text-5xl font-black text-ink-900 tabular-nums sm:text-6xl">{q.value}</p>
          </div>

          <div className="grid w-full grid-cols-2 gap-3">
            {q.options.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => choose(n)}
                className={`fp-press flex min-h-16 items-center justify-center rounded-2xl text-2xl font-black tabular-nums ring-1 transition-all ring-inset ${
                  flash === 'right' && n === q.answer
                    ? 'bg-emerald-50 text-emerald-800 ring-emerald-300'
                    : flash === 'wrong' && n !== q.answer
                      ? 'bg-rose-50 text-rose-700 ring-rose-300'
                      : 'bg-surface-50 text-ink-900 ring-line-200 hover:bg-amber-50 hover:ring-amber-300'
                }`}
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
