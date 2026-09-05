import { Star, Play, Target, Timer, Trophy, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';
import Mascot from '../mascot/Mascot';
import { coachFor } from './gameCoach';
import '../artwork.css';

/** Three stars, filled to `earned`. */
function Stars({ earned, size = 'h-8 w-8', animate = false }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          className={`${size} transition-all ${
            n <= earned ? 'fill-amber-400 text-amber-400' : 'fill-surface-200 text-line-300'
          } ${animate && n <= earned ? 'animate-badge-burst' : ''}`}
          style={animate ? { animationDelay: `${0.15 * n}s` } : undefined}
        />
      ))}
    </div>
  );
}

// One burst of confetti: colour, where it starts across the panel, when.
const CONFETTI = [
  ['#7c3aed', 6, 0], ['#f472b6', 18, 0.12], ['#fbbf24', 30, 0.05], ['#34d399', 42, 0.18],
  ['#60a5fa', 54, 0.08], ['#f97316', 66, 0.22], ['#a78bfa', 78, 0.14], ['#fde68a', 90, 0.3],
  ['#f472b6', 24, 0.34], ['#34d399', 72, 0.26], ['#60a5fa', 48, 0.4], ['#fbbf24', 84, 0.36]
];

/**
 * The screen before a level starts.
 *
 * One card, three things: which level, what the bar is, and the button.
 * It used to stack a dark banner, a stars line, a trail of past levels, two
 * rule tiles and a button — a briefing that took longer to read than the
 * level took to play. The mascot stands in for the decoration and points
 * the student at Start.
 */
export function LevelIntro({ gameId, level, objective, seconds, stars, onStart, tone }) {
  const coach = coachFor(gameId);
  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-journey-50 via-surface to-pink-50 p-5 ring-1 ring-journey-100 ring-inset sm:p-7">
        <div
          aria-hidden
          className="fp-float pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-journey-200/40 blur-3xl"
        />

        <div className="relative grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              <div className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl text-white shadow-lg shadow-journey-600/30 ${tone}`}>
                <span className="text-[0.58rem] font-black tracking-[0.2em] text-white/75 uppercase">Level</span>
                <span className="yatiArt-bob text-3xl leading-none font-black tabular-nums">{level}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[0.68rem] font-black tracking-[0.16em] text-journey-600 uppercase">Ready?</p>
                <p className="mt-1 text-xl leading-tight font-black text-ink-900 sm:text-2xl">
                  {stars > 0 ? 'Beat your best' : 'Clear this level'}
                </p>
                {stars > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <Stars earned={stars} size="h-5 w-5" />
                    <span className="text-xs font-semibold text-ink-500">best {stars} of 3</span>
                  </div>
                )}
              </div>
            </div>

            {/* The one thing to know, and the clock if there is one. */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-2 text-sm font-bold text-ink-800 shadow-card ring-1 ring-line-200/80 ring-inset">
                <Target className="h-4 w-4 shrink-0 text-journey-600" />
                {objective}
              </span>
              {seconds !== undefined && (
                <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3.5 py-2 text-sm font-bold text-orange-700 ring-1 ring-orange-100 ring-inset">
                  <Timer className="h-4 w-4 shrink-0" />
                  {seconds}s
                </span>
              )}
            </div>

            <button
              type="button"
              data-guide="game-start"
              onClick={onStart}
              autoFocus
              className="fp-btn fp-btn-primary fp-sweep mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-journey-500 to-indigo-600 text-base font-black text-white shadow-lg shadow-journey-600/30 sm:w-auto sm:px-10"
            >
              <Play className="h-5 w-5 fill-current" />
              Start level {level}
            </button>
          </div>

          {/* ---- The coach: the mascot explains this game ---- */}
          <div className="relative flex items-end gap-3">
            <div className="relative shrink-0" aria-hidden>
              <span className="absolute bottom-1 left-1/2 h-8 w-24 -translate-x-1/2 rounded-full bg-blue-300/40 blur-lg" />
              <Mascot pose="guide" height={124} motion="mc-nod" className="relative" />
            </div>
            <div className="mc-bubble relative mb-6 min-w-0 flex-1 rounded-2xl border border-blue-100 bg-white p-3.5 shadow-xl">
              <span aria-hidden className="absolute top-8 -left-2 h-4 w-4 rotate-45 border-b border-l border-blue-100 bg-white" />
              <p className="text-[0.66rem] font-black tracking-[0.16em] text-blue-600 uppercase">How to play</p>
              <ol className="mt-1.5 space-y-1">
                {coach.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-xs leading-snug font-semibold text-slate-800">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[0.6rem] font-black text-blue-700 ring-1 ring-blue-100 ring-inset">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="mt-2 flex items-start gap-1.5 text-[0.7rem] font-semibold text-amber-700">
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                {coach.tip}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The screen after a level ends: the mascot's reaction first, then the
 * stars, the numbers, and the way onward.
 *
 * A clear is celebrated properly — the dance, confetti, stars bursting in.
 * A miss gets the same card with the mascot encouraging rather than a
 * scolding.
 */
export function LevelResult({ passed, stars, headline, detail, atEnd, onNext, onRetry, tone }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div
        className={`relative overflow-hidden rounded-3xl p-5 ring-1 ring-inset sm:p-7 ${
          passed
            ? 'bg-gradient-to-r from-emerald-50 via-surface to-amber-50 ring-emerald-200'
            : 'bg-gradient-to-r from-journey-50 via-surface to-pink-50 ring-journey-100'
        }`}
      >
        {passed &&
          CONFETTI.map(([color, left, delay], i) => (
            <span
              key={i}
              aria-hidden
              className="fp-confetti"
              style={{ left: `${left}%`, background: color, animationDelay: `${delay}s` }}
            />
          ))}

        <div className="relative grid items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
          <div className="relative justify-self-center" aria-hidden>
            <span className={`absolute bottom-2 left-1/2 h-10 w-32 -translate-x-1/2 rounded-full blur-xl ${passed ? 'bg-emerald-300/50' : 'bg-blue-300/40'}`} />
            <Mascot
              pose={passed ? (stars >= 3 ? 'star' : 'confetti') : 'flex'}
              height={150}
              motion={passed ? 'mc-dance' : 'mc-encourage'}
              className="relative"
            />
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <p className={`text-[0.68rem] font-black tracking-[0.2em] uppercase ${passed ? 'text-emerald-600' : 'text-journey-600'}`}>
              {passed ? 'Level complete' : 'Not quite'}
            </p>
            <div className="mt-2 flex justify-center sm:justify-start">
              <Stars earned={stars} animate={passed} />
            </div>
            <p className="mt-3 text-2xl leading-tight font-black text-ink-900">{headline}</p>
            {detail && <p className="mt-1 text-sm font-semibold text-ink-500">{detail}</p>}
            <p className={`mt-2 text-sm font-bold ${passed ? 'text-emerald-700' : 'text-journey-700'}`}>
              {passed ? 'Brilliant! 🎉 On to the next one?' : "Almost there — don't give up. Try again!"}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
              {passed && !atEnd && (
                <button
                  type="button"
                  onClick={onNext}
                  autoFocus
                  className={`fp-btn fp-btn-primary fp-sweep inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 text-base font-black text-white shadow-lg shadow-journey-600/30 ${tone}`}
                >
                  Next level
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
              {passed && atEnd && (
                <span className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 ring-1 ring-amber-200 ring-inset">
                  <Trophy className="h-4 w-4" />
                  Every level cleared!
                </span>
              )}
              <button
                type="button"
                onClick={onRetry}
                autoFocus={!passed}
                className={`fp-btn inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black ${
                  passed
                    ? 'fp-btn-soft bg-surface text-ink-700 ring-1 ring-line-200 ring-inset'
                    : 'fp-btn-primary bg-gradient-to-r from-journey-500 to-indigo-600 text-white shadow-lg shadow-journey-600/30'
                }`}
              >
                <RotateCcw className="h-4 w-4" />
                {passed ? 'Play again' : 'Try again'}
              </button>
              {!passed && (
                <span className="inline-flex items-center gap-1.5 self-center text-xs font-semibold text-ink-400">
                  <Sparkles className="h-3.5 w-3.5 text-journey-400" />
                  Every try makes you quicker.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
