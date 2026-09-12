import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { between, starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';

const rnd = (n) => Math.floor(Math.random() * n);

const shuffle = (list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const same = (p, q) => p[0] * q[1] === q[0] * p[1];

/**
 * A fraction in lowest terms and one that equals it, scaled up. Half the
 * time from the second band on, the question runs the other way — a scaled
 * fraction is shown and its simplest form has to be found. The wrong answers
 * are one off in the top or the bottom, which is exactly the slip the game is
 * there to train out.
 */
const makeRound = (difficulty) => {
  let a;
  let b;
  do {
    b = 2 + rnd(difficulty === 1 ? 5 : 8);
    a = 1 + rnd(b - 1);
  } while (gcd(a, b) !== 1);
  const k = 2 + rnd(difficulty === 1 ? 2 : 4);
  const scaled = [a * k, b * k];
  const simplest = [a, b];
  const reverse = difficulty > 1 && Math.random() < 0.5;
  const shown = reverse ? scaled : simplest;
  const answer = reverse ? simplest : scaled;

  const wrongs = [];
  const seen = new Set([answer.join('/')]);
  const candidates = shuffle([
    [answer[0] + 1, answer[1]],
    [answer[0] - 1, answer[1]],
    [answer[0], answer[1] + 1],
    [answer[0], answer[1] - 1],
    [answer[0] + 1, answer[1] + 1],
    [answer[0] - 1, answer[1] + 1]
  ]);
  for (const c of candidates) {
    if (wrongs.length >= 3) break;
    if (c[0] < 1 || c[1] < 2 || c[0] >= c[1] || same(c, shown) || seen.has(c.join('/'))) continue;
    seen.add(c.join('/'));
    wrongs.push(c);
  }
  return {
    shown,
    answer,
    reverse,
    options: shuffle([answer, ...wrongs])
  };
};

const configFor = (difficulty, levelNo) => ({
  seconds: between(60, 45, levelNo),
  target: between(6, 14, levelNo) + (difficulty - 1) * 2
});

/** A fraction drawn as one number over another, the way it is written by hand. */
function Fraction({ value, size = 'text-2xl', tone = 'text-ink-900' }) {
  return (
    <span className={`inline-flex flex-col items-center leading-none font-black tabular-nums ${size} ${tone}`}>
      <span>{value[0]}</span>
      <span className="my-0.5 h-0.5 w-full min-w-6 rounded bg-current" />
      <span>{value[1]}</span>
    </span>
  );
}

/**
 * ➗ Numbers & speed: which fraction is the same amount?
 *
 * Equivalent fractions are the hinge of everything after arithmetic —
 * ratios, percentages, probability. Seeing that 6/8 and 3/4 are the same
 * amount at a glance is what makes all of those quick.
 */
export default function FractionMatch({ onExit }) {
  const progress = useGameProgress('fraction-match');
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
    if (same(round.options[i], round.answer)) setScore((s) => s + 1);
    setTimeout(() => {
      setPicked(null);
      setRound(makeRound(progress.difficulty));
    }, 380);
  };

  return (
    <GameShell
      title="Fraction Match"
      blurb={`Find the fraction worth the same. Reach ${config.target}.`}
      tone="bg-gradient-to-br from-orange-500 to-rose-600"
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
              objective: `Pick the fraction equal to the one shown. Reach ${config.target} correct before the clock runs out.`,
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
          Same amount means top and bottom scaled by the <strong className="font-black">same</strong> number
        </p>
      }
    >
      {started && !over && (
        <div className="mx-auto max-w-md text-center">
          <p className="text-sm font-bold text-ink-500">
            {round.reverse ? 'In its simplest form, this is…' : 'Which of these equals…'}
          </p>
          <div className="mt-3 inline-flex rounded-2xl bg-surface-50 px-8 py-3 ring-1 ring-line-200 ring-inset">
            <Fraction value={round.shown} size="text-4xl" tone="text-journey-700" />
          </div>

          <div className="mt-6 grid grid-cols-4 gap-2.5">
            {round.options.map((option, i) => {
              const show = picked !== null;
              const right = same(option, round.answer);
              const state =
                show && right
                  ? 'bg-emerald-50 text-emerald-800 ring-emerald-400'
                  : show && picked === i
                    ? 'bg-rose-50 text-rose-700 ring-rose-300'
                    : 'bg-surface-50 text-ink-900 ring-line-200 hover:bg-journey-50 hover:ring-journey-300';
              return (
                <button
                  key={`${option[0]}/${option[1]}`}
                  type="button"
                  onClick={() => choose(i)}
                  aria-label={`${option[0]} over ${option[1]}`}
                  className={`fp-press flex min-h-20 items-center justify-center rounded-2xl ring-1 transition-colors ring-inset ${state}`}
                >
                  <Fraction value={option} size="text-xl" tone="" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </GameShell>
  );
}
