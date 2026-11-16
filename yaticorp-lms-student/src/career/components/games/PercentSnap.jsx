import { useState } from 'react';
import GameShell from './GameShell';
import useGameProgress, { starsCap, starsFor, starsOn } from './levels';
import useTimedRound from './useTimedRound';
import useRecordStars from './useRecordStars';
import useFresh from './useFresh';
import useAnswerReveal from './useAnswerReveal';
import { percentConfig, percentQuestion } from '../../data/bands/math';

/**
 * Parts of a whole, by age band (data/bands/math.js, 2026-11-13): Classes 1–2 pick the shape cut into equal parts
 * and name the part coloured; 3–5 name fractions and take ½, ¼, ⅓… of a number, shown as groups; 6–8 take 10, 25,
 * 50% (then 5, 20, 75%) of a number; 9–10 increase, decrease and percentage change; 11–12 discounts, GST, successive
 * changes, simple and compound interest. Every answer is exact.
 */
const OBJECTIVE = {
  foundation: (t) => `Look at the shapes. Find the equal parts! Get ${t} right.`,
  developing: (t) => `Fractions: how much is coloured, and how many in a share. Get ${t} right.`,
  intermediate: (t) => `Percentages of numbers, in your head. Get ${t} right before time runs out.`,
  analytical: (t) => `Increase, decrease and percentage change. Get ${t} right before time runs out.`,
  advanced: (t) => `Discounts, tax, interest and changes on changes. Get ${t} right before time runs out.`
};

/** A shape cut into parts (weights), some coloured — drawn exactly, so equal parts really are equal. */
function Parts({ pic, size = 'h-28 w-28' }) {
  const total = pic.parts.reduce((a, b) => a + b, 0);
  const fill = (i) => (pic.shaded.includes(i) ? '#84cc16' : '#ffffff');
  // Where each part starts, as a share of the whole.
  const starts = pic.parts.map((_, i) => pic.parts.slice(0, i).reduce((a, b) => a + b, 0));
  if (pic.shape === 'rect') {
    return (
      <svg viewBox="0 0 100 64" className={size} aria-hidden="true">
        {pic.parts.map((w, i) => {
          const x = 4 + (starts[i] / total) * 92;
          return <rect key={i} x={x} y={4} width={(w / total) * 92} height={56} fill={fill(i)} stroke="#334155" strokeWidth="2.5" />;
        })}
      </svg>
    );
  }
  const point = (t) => {
    const a = (t / total) * 2 * Math.PI - Math.PI / 2;
    return `${50 + 45 * Math.cos(a)},${50 + 45 * Math.sin(a)}`;
  };
  return (
    <svg viewBox="0 0 100 100" className={size} aria-hidden="true">
      {pic.parts.map((w, i) => {
        const from = starts[i];
        const large = w / total > 0.5 ? 1 : 0;
        return <path key={i} d={`M50,50 L${point(from)} A45,45 0 ${large} 1 ${point(from + w)} Z`} fill={fill(i)} stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />;
      })}
    </svg>
  );
}

/** N things in n equal groups, the first `take` groups picked out. */
function Groups({ pic }) {
  return (
    <div className="mx-auto mb-3 flex max-w-sm flex-wrap justify-center gap-2" role="img" aria-label={`${pic.groups} groups of ${pic.per}`}>
      {Array.from({ length: pic.groups }, (_, g) => (
        <span key={g} className={`flex max-w-[5.5rem] flex-wrap justify-center gap-1 rounded-xl p-1.5 ring-2 ring-inset ${g < pic.take ? 'bg-lime-100 ring-lime-500' : 'bg-surface-50 ring-line-200'}`}>
          {Array.from({ length: pic.per }, (_, i) => <span key={i} className={`h-2.5 w-2.5 rounded-full ${g < pic.take ? 'bg-lime-600' : 'bg-ink-300'}`} />)}
        </span>
      ))}
    </div>
  );
}

/** Text with a/b drawn as a stacked fraction. */
function MathText({ text }) {
  return String(text).split(/(\d+\/\d+)/).map((part, i) => {
    const m = part.match(/^(\d+)\/(\d+)$/);
    if (!m) return <span key={i}>{part}</span>;
    return (
      <span key={i} className="mx-0.5 inline-flex flex-col items-center align-middle text-[0.7em] leading-none" aria-label={`${m[1]} over ${m[2]}`}>
        <span>{m[1]}</span>
        <span className="my-0.5 h-0.5 w-full min-w-[1.1em] rounded bg-current" />
        <span>{m[2]}</span>
      </span>
    );
  });
}

/** 📊 Math & speed: parts, fractions and percentages, in your head, against the clock. */
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
  const config = percentConfig(progress.ageBand, progress.difficulty, progress.levelNo);
  const young = config.band === 'foundation' || config.band === 'developing';
  const fresh = useFresh();
  const [question, setQuestion] = useState(() => fresh(() => percentQuestion(config)));
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState(null);
  const [started, setStarted] = useState(false);
  const { busy, showWrong, toneOf } = useAnswerReveal(2400);
  const { seconds, over } = useTimedRound(config.seconds, started, score >= starsCap(config.target));

  const passed = score >= config.target;
  const stars = over ? starsFor(score, config.target) : 0;
  useRecordStars(progress, over, stars, { correct: score, wrong, hints: 0, score, limitMs: config.seconds * 1000 });

  const answer = (id) => {
    if (over || busy) return;
    const next = () => setQuestion(fresh(() => percentQuestion(config)));
    if (id === question.answer) {
      setScore((s) => s + 1);
      setFlash('right');
      next();
      setTimeout(() => setFlash(null), 250);
    } else {
      // The pick red, the right answer green and one line of why, then the next one.
      setWrong((w) => w + 1);
      showWrong(id, question.answer, next);
    }
  };

  const pictures = question.options.some((o) => o.pic);

  return (
    <GameShell
      title="Percent Snap"
      blurb={`Reach ${config.target} correct before the clock runs out.`}
      tone="bg-gradient-to-br from-lime-500 to-emerald-700"
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
      footer={<p className="text-center text-sm text-ink-500">{young ? 'Look closely, then tap' : 'Work it out in your head'}</p>}
    >
      {started && !over && (
        <div className="mx-auto max-w-md text-center">
          <p className={`font-black text-ink-700 ${young ? 'text-xl' : 'text-base'}`}>
            <MathText text={question.prompt} />
          </p>
          {question.sub && <p className="text-sm font-bold text-ink-500">{question.sub}</p>}
          {question.pic?.shape && (
            <div className="mt-3 flex justify-center">
              <Parts pic={question.pic} size="h-32 w-32 sm:h-36 sm:w-36" />
            </div>
          )}
          {question.pic?.groups && <div className="mt-3"><Groups pic={question.pic} /></div>}
          {question.line && (
            <p
              className={`mt-2 font-black tabular-nums transition-colors ${question.line.length > 22 ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-5xl'} ${
                flash === 'right' ? 'text-emerald-600' : 'text-ink-900'
              }`}
            >
              <MathText text={question.line} />
            </p>
          )}
          <p className="mt-2 min-h-5 text-sm font-bold text-rose-700" role="status" aria-live="polite">
            {busy ? question.explain : ''}
          </p>
          <div className={`mt-3 grid gap-2.5 ${question.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {question.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => answer(option.id)}
                disabled={busy}
                aria-label={option.pic ? `${option.pic.parts.length} parts${option.pic.parts.every((w) => w === option.pic.parts[0]) ? '' : ', not equal'}` : undefined}
                className={`fp-press flex min-w-0 items-center justify-center rounded-2xl bg-surface-50 font-black [overflow-wrap:anywhere] text-ink-900 ring-1 ring-line-200 transition-all ring-inset tabular-nums ${
                  pictures ? 'min-h-24 p-2' : young ? 'min-h-16 text-3xl' : 'min-h-14 px-1 text-lg sm:text-xl'
                } ${busy ? '' : 'hover:bg-emerald-50 hover:ring-emerald-300'} ${toneOf(option.id)}`}
              >
                {option.pic ? <Parts pic={option.pic} size="h-20 w-20" /> : <MathText text={option.label} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}
