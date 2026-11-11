import { useState } from 'react';
import { Flame } from 'lucide-react';
import GameShell from './GameShell';
import useGameProgress, { pressure, starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';
import useAnswerReveal from './useAnswerReveal';
import useFresh from './useFresh';

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** A number of exactly `d` digits. */
const digits = (d) => rnd(d === 1 ? 2 : 10 ** (d - 1), 10 ** d - 1);

/**
 * The stages, by how hard a level is (levels.js `pressure`; asked 2026-11-05:
 * "each next level harder — two digits, then three"). So they ride the same
 * roller coaster as every game: five easy levels, five medium, five hard, then
 * back down to a slightly harder easy. Each row: the digits of each side of a
 * + or −, the digits of × and ÷, the operations, the target and the clock.
 */
const STAGES = [
  { at: 0, add: [1, 1], mul: null, ops: ['+', '-'], target: 8, seconds: 60 },
  { at: 0.05, add: [2, 1], mul: null, ops: ['+', '-'], target: 7, seconds: 60 },
  { at: 0.09, add: [2, 2], mul: [1, 1], ops: ['+', '-', '×'], target: 7, seconds: 60 },
  { at: 0.15, add: [3, 2], mul: [2, 1], ops: ['+', '-', '×', '÷'], target: 6, seconds: 70 },
  { at: 0.22, add: [3, 3], mul: [2, 1], ops: ['+', '-', '×', '÷'], target: 6, seconds: 75 },
  { at: 0.35, add: [4, 3], mul: [2, 2], ops: ['+', '-', '×', '÷'], target: 5, seconds: 80 },
  { at: 0.55, add: [4, 4], mul: [3, 1], ops: ['+', '-', '×', '÷'], target: 5, seconds: 80 }
];

/**
 * Build a question whose answer is always a whole number.
 *
 * Division is generated from its own product rather than by dividing two
 * random numbers — the only way to guarantee it divides cleanly. Otherwise the
 * game would occasionally ask for 7 ÷ 3 and mark every answer wrong.
 */
const makeQuestion = ({ add, mul, ops }) => {
  const op = ops[rnd(0, ops.length - 1)];
  let a;
  let b;
  let answer;

  if (op === '+') {
    [a, b] = Math.random() < 0.5 ? [digits(add[0]), digits(add[1])] : [digits(add[1]), digits(add[0])];
    answer = a + b;
  } else if (op === '-') {
    const x = digits(add[0]);
    const y = digits(add[1]);
    // Never negative, never zero: the larger first.
    [a, b] = x === y ? [x + 1, y] : [Math.max(x, y), Math.min(x, y)];
    answer = a - b;
  } else if (op === '×') {
    a = mul[0] === 1 ? rnd(2, 12) : digits(mul[0]);
    b = mul[1] === 1 ? rnd(2, 9) : digits(mul[1]);
    answer = a * b;
  } else {
    b = mul[1] === 1 ? rnd(2, 9) : rnd(11, 25);
    answer = mul[0] === 1 ? rnd(2, 12) : digits(mul[0]);
    a = b * answer;
  }

  // Near misses — a slipped carry, a column off by ten — not numbers that can be ruled out at a glance.
  const misses = [1, -1, 2, -2, 10, -10, ...(answer >= 100 ? [100, -100, 11, -9] : [3, -3])];
  const options = new Set([answer]);
  while (options.size < 4) {
    const candidate = answer + misses[rnd(0, misses.length - 1)];
    if (candidate >= 0) options.add(candidate);
  }

  return { text: `${a} ${op} ${b}`, answer, options: [...options].sort(() => Math.random() - 0.5) };
};

/** The stage a level plays: the bigger sums take longer, so the bar drops a little as they grow. */
const configFor = (level) => [...STAGES].reverse().find((s) => pressure(level) >= s.at);

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
  const config = configFor(progress.level);
  const fresh = useFresh();
  const [question, setQuestion] = useState(() => fresh(() => makeQuestion(config)));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState(null);
  const [started, setStarted] = useState(false);
  const { busy, showWrong, toneOf } = useAnswerReveal();
  const { seconds, over } = useTimedRound(config.seconds, started, score >= starsCap(config.target));

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars);

  const answer = (value) => {
    if (over || busy) return;
    const next = () => setQuestion(fresh(() => makeQuestion(config)));
    if (value === question.answer) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
      setFlash('right');
      next();
      setTimeout(() => setFlash(null), 300);
    } else {
      // A wrong answer costs the streak, never the score — going backwards for
      // a slip is punishing, and this is meant to be played for two minutes.
      // The buzz, the pick red and the right answer green, then the next sum.
      setStreak(0);
      showWrong(value, question.answer, next);
    }
  };

  return (
    <GameShell
      title="Math Sprint"
      blurb={`Reach ${config.target} correct before the clock runs out.`}
      tone="bg-gradient-to-br from-amber-500 to-orange-600"
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
              detail: `${score} correct`,
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
                disabled={busy}
                className={`fp-press min-h-14 rounded-2xl bg-surface-50 text-xl font-black text-ink-900 ring-1 ring-line-200 transition-all ring-inset tabular-nums ${busy ? '' : 'hover:bg-amber-50 hover:ring-amber-300'} ${toneOf(option)}`}
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
