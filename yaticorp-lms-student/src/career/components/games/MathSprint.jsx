import { useState } from 'react';
import { Flame } from 'lucide-react';
import GameShell from './GameShell';
import useGameProgress, { starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';
import useAnswerReveal from './useAnswerReveal';
import useFresh from './useFresh';
import { sprintConfig, sprintQuestion, fmt } from '../../data/bands/math';

/**
 * What a sprint asks, by age band (data/bands/math.js, 2026-11-13): Classes 1–2 count pictures and add or take away
 * within 20 — never ×; Classes 3–5 work to 100 with times tables and simple ÷; 6–8 meet negatives and two-step
 * sums; 9–10 order of operations and squares; 11–12 percentages of, powers, roots and brackets. The band's own
 * level (difficulty, step) climbs inside that, so every age gets the roller coaster without leaving its syllabus.
 */
const OBJECTIVE = {
  foundation: (t) => `Count and add! Tap the right number. Get ${t} right.`,
  developing: (t) => `Add, take away, times and share. Get ${t} right before time runs out.`,
  intermediate: (t) => `Negatives and two-step sums. Get ${t} right before time runs out.`,
  analytical: (t) => `× and ÷ before + and −, brackets first. Get ${t} right before time runs out.`,
  advanced: (t) => `Percentages, powers, roots and brackets. Get ${t} right before time runs out.`
};

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

/** One picture item; `crossed` ones are being taken away. */
function Thing({ emoji, crossed }) {
  return (
    <span className={`relative inline-flex h-10 w-10 items-center justify-center text-3xl leading-none sm:h-11 sm:w-11 sm:text-4xl ${crossed ? 'opacity-40' : ''}`} aria-hidden="true">
      {emoji}
      {crossed && <span className="absolute inset-0 flex items-center justify-center text-3xl font-black text-rose-600">✕</span>}
    </span>
  );
}

function Things({ emoji, n, crossed = 0 }) {
  return (
    <span className="inline-flex max-w-[15rem] flex-wrap justify-center gap-1">
      {Array.from({ length: n }, (_, i) => <Thing key={i} emoji={emoji} crossed={i >= n - crossed} />)}
    </span>
  );
}

/** The pictures for the youngest: a group to count, two groups to join, or one with some crossed out. */
function Picture({ pic }) {
  const label = !pic.op ? `${pic.a} ${pic.emoji}` : pic.op === '+' ? `${pic.a} and ${pic.b} more` : `${pic.a}, take away ${pic.b}`;
  return (
    <div role="img" aria-label={label} className="mx-auto mb-4 flex flex-wrap items-center justify-center gap-3 rounded-3xl bg-amber-50 p-3 ring-1 ring-amber-200 ring-inset">
      {!pic.op && <Things emoji={pic.emoji} n={pic.a} />}
      {pic.op === '+' && (
        <>
          <Things emoji={pic.emoji} n={pic.a} />
          <span className="text-3xl font-black text-amber-700">+</span>
          <Things emoji={pic.emoji} n={pic.b} />
        </>
      )}
      {pic.op === '−' && <Things emoji={pic.emoji} n={pic.a} crossed={pic.b} />}
    </div>
  );
}

function Round({ progress, onExit }) {
  const config = sprintConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = config.band === 'foundation';
  const fresh = useFresh();
  const [question, setQuestion] = useState(() => fresh(() => sprintQuestion(config)));
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState(null);
  const [started, setStarted] = useState(false);
  // Long enough to read why: the right answer and one line of working stay up after a miss.
  const { busy, showWrong, toneOf } = useAnswerReveal(young ? 2400 : 2000);
  const { seconds, over } = useTimedRound(config.seconds, started, score >= starsCap(config.target));

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars, { correct: score, wrong, hints: 0, score, limitMs: config.seconds * 1000 });

  const answer = (value) => {
    if (over || busy) return;
    const next = () => setQuestion(fresh(() => sprintQuestion(config)));
    if (value === question.answer) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
      setFlash('right');
      next();
      setTimeout(() => setFlash(null), 300);
    } else {
      // A wrong answer costs the streak, never the score. The pick red, the right answer green and why, then on.
      setStreak(0);
      setWrong((w) => w + 1);
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
              objective: OBJECTIVE[config.band](config.target),
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
          {question.pic && <Picture pic={question.pic} />}
          <p
            className={`font-black break-words tabular-nums transition-colors ${question.kind === 'count' ? 'text-3xl' : question.text.length > 16 ? 'text-2xl min-[400px]:text-3xl sm:text-4xl' : 'text-3xl min-[400px]:text-4xl sm:text-5xl'} ${
              flash === 'right' ? 'text-emerald-600' : 'text-ink-900'
            }`}
          >
            {question.text}
          </p>
          <p className="mt-2 min-h-5 text-sm font-bold text-rose-700" role="status" aria-live="polite">
            {busy ? `It's ${fmt(question.answer)}. ${question.explain}` : ''}
          </p>
          <div className={`mt-4 grid gap-2.5 ${question.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => answer(option)}
                disabled={busy}
                className={`fp-press rounded-2xl bg-surface-50 font-black text-ink-900 ring-1 ring-line-200 transition-all ring-inset tabular-nums ${young ? 'min-h-16 text-3xl' : 'min-h-14 text-xl'} ${busy ? '' : 'hover:bg-amber-50 hover:ring-amber-300'} ${toneOf(option)}`}
              >
                {fmt(option)}
              </button>
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}
