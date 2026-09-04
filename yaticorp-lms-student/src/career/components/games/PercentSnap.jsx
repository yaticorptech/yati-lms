import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Percentages that always come out whole.
 *
 * The base is built as a multiple of 100/percent, so "35% of 140" never
 * appears — a fractional answer would have no correct option to offer.
 */
const makeQuestion = (percents, maxStep) => {
  const percent = percents[rnd(0, percents.length - 1)];
  const step = 100 / percent; // whole because every percent listed divides 100
  const base = step * rnd(2, maxStep);
  const answer = (base * percent) / 100;

  const options = new Set([answer]);
  while (options.size < 4) {
    const drift = rnd(1, Math.max(2, Math.round(answer * 0.4)));
    const candidate = answer + (Math.random() < 0.5 ? -drift : drift);
    if (candidate > 0) options.add(candidate);
  }

  return { percent, base, answer, options: [...options].sort(() => Math.random() - 0.5) };
};

const configFor = (difficulty, levelNo) => ({
  // Every percent divides 100, so the answer is always a whole number.
  percents: difficulty === 1 ? [50, 25, 10] : difficulty === 2 ? [50, 25, 20, 10, 5] : [50, 25, 20, 10, 5, 4, 2],
  maxStep: between(4, 12, levelNo),
  seconds: between(60, 45, levelNo),
  target: between(6, 15, levelNo) + (difficulty - 1) * 2
});

/** 📊 Math & speed: percentages, in your head, against the clock. */
export default function PercentSnap({ onExit }) {
  const progress = useGameProgress('percent-snap');
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
  const [question, setQuestion] = useState(() => makeQuestion(config.percents, config.maxStep));
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null);
  const [started, setStarted] = useState(false);
  const { seconds, over } = useTimedRound(config.seconds, started);

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const answer = (value) => {
    if (over) return;
    if (value === question.answer) {
      setScore((s) => s + 1);
      setFlash('right');
    } else {
      setFlash('wrong');
    }
    setQuestion(makeQuestion(config.percents, config.maxStep));
    setTimeout(() => setFlash(null), 250);
  };

  return (
    <GameShell
      title="Percent Snap"
      blurb={`Reach ${config.target} correct before the clock runs out.`}
      tone="bg-gradient-to-br from-lime-500 to-emerald-700"
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
      footer={<p className="text-center text-sm text-ink-500">Work it out in your head</p>}
    >
      {started && !over && (
        <div className="mx-auto max-w-md text-center">
          <p
            className={`text-4xl font-black tabular-nums transition-colors sm:text-5xl ${
              flash === 'right' ? 'text-emerald-600' : flash === 'wrong' ? 'text-rose-600' : 'text-ink-900'
            }`}
          >
            {question.percent}% of {question.base}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => answer(option)}
                className="fp-press min-h-14 rounded-2xl bg-surface-50 text-xl font-black text-ink-900 ring-1 ring-line-200 transition-all ring-inset hover:bg-emerald-50 hover:ring-emerald-300 tabular-nums"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}
