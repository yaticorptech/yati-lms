import { useState } from 'react';
import { Flame } from 'lucide-react';
import GameShell from './GameShell';
import useGameProgress, { between, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Build a question whose answer is always a whole number.
 *
 * Division is generated from its own product rather than by dividing two
 * random numbers — the only way to guarantee it divides cleanly. Otherwise the
 * game would occasionally ask for 7 ÷ 3 and mark every answer wrong.
 */
const makeQuestion = (span, ops) => {
  const op = ops[rnd(0, ops.length - 1)];
  let a;
  let b;
  let answer;

  if (op === '+') {
    a = rnd(2, span * 2);
    b = rnd(2, span * 2);
    answer = a + b;
  } else if (op === '-') {
    a = rnd(4, span * 2);
    b = rnd(1, a - 1); // never negative
    answer = a - b;
  } else if (op === '×') {
    a = rnd(2, Math.min(12, span));
    b = rnd(2, Math.min(12, span));
    answer = a * b;
  } else {
    b = rnd(2, Math.min(12, span));
    answer = rnd(2, Math.min(12, span));
    a = b * answer;
  }

  const options = new Set([answer]);
  while (options.size < 4) {
    const drift = rnd(1, Math.max(3, Math.round(Math.abs(answer) * 0.25)));
    const candidate = answer + (Math.random() < 0.5 ? -drift : drift);
    if (candidate >= 0) options.add(candidate);
  }

  return { text: `${a} ${op} ${b}`, answer, options: [...options].sort(() => Math.random() - 0.5) };
};

/** Ten levels per band: the sums get bigger, the clock shorter, the bar higher. */
const configFor = (difficulty, levelNo) => ({
  span: between(6, 14, levelNo) + (difficulty - 1) * 4,
  ops: difficulty === 1 ? ['+', '-'] : difficulty === 2 ? ['+', '-', '×'] : ['+', '-', '×', '÷'],
  seconds: between(60, 45, levelNo),
  target: between(6, 16, levelNo) + (difficulty - 1) * 3
});

/** ⚡ Math & speed: as many correct answers as you can before time runs out. */
export default function MathSprint({ onExit }) {
  const progress = useGameProgress('math-sprint');
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
  const [question, setQuestion] = useState(() => makeQuestion(config.span, config.ops));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
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
      setStreak((s) => s + 1);
      setFlash('right');
    } else {
      // A wrong answer costs the streak, never the score — going backwards for
      // a slip is punishing, and this is meant to be played for two minutes.
      setStreak(0);
      setFlash('wrong');
    }
    setQuestion(makeQuestion(config.span, config.ops));
    setTimeout(() => setFlash(null), 300);
  };

  return (
    <GameShell
      title="Math Sprint"
      blurb={`Reach ${config.target} correct before the clock runs out.`}
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
      footer={
        <p className="flex items-center justify-center gap-1.5 text-center text-sm text-ink-500">
          <Flame className={`h-3.5 w-3.5 ${streak >= 3 ? 'text-orange-500' : 'text-ink-300'}`} />
          {streak >= 3 ? `${streak} in a row` : 'Answer correctly to build a streak'}
        </p>
      }
    >
      {started && !over && (
        <div className="mx-auto max-w-md text-center">
          <p
            className={`text-4xl font-black tabular-nums transition-colors sm:text-5xl ${
              flash === 'right' ? 'text-emerald-600' : flash === 'wrong' ? 'text-rose-600' : 'text-ink-900'
            }`}
          >
            {question.text}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => answer(option)}
                className="fp-press min-h-14 rounded-2xl bg-surface-50 text-xl font-black text-ink-900 ring-1 ring-line-200 transition-all ring-inset hover:bg-amber-50 hover:ring-amber-300 tabular-nums"
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
