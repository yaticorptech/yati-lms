import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Zap } from 'lucide-react';
import { dailyBoost } from '../../utils/motivation';
import SummitArt from './SummitArt';

/**
 * The banner at the top of the calendar: who is looking, and what they have
 * built up so far.
 *
 * Both chips are real — the level and XP come from the student's record, the
 * streak is computed from their own completion history. Nothing here is
 * decorative except the hillside.
 */
export default function JourneyBanner({ name, greeting, level = 1, progress, streak = 0 }) {
  const firstName = name?.split(' ')[0];

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-journey-50 via-surface to-amber-50/70 shadow-card ring-1 ring-journey-100 ring-inset">
      <div
        aria-hidden
        className="fp-float pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-journey-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="fp-float-slow pointer-events-none absolute right-1/3 -bottom-24 h-56 w-56 rounded-full bg-pink-200/40 blur-3xl"
      />

      {/* The art sits in the corner and is allowed to be cropped: it is
          scenery, so losing its left edge on a narrow card costs nothing.
          Hidden below sm, where the banner is barely wider than the text. */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 hidden h-full w-[48%] max-w-[420px] [mask-image:linear-gradient(to_right,transparent,black_30%)] sm:block"
      >
        <SummitArt />
      </div>

      <div className="relative max-w-lg p-5 sm:p-6">
        <p className="text-sm font-semibold text-ink-500">
          {greeting}
          {firstName ? (
            <>
              , <span className="font-black text-ink-900">{firstName}</span> 👋
            </>
          ) : (
            ' 👋'
          )}
        </p>

        <h1 className="mt-1.5 text-2xl leading-tight font-black text-ink-900 sm:text-3xl">
          Plan your journey.{' '}
          <span className="bg-gradient-to-r from-journey-600 to-indigo-600 bg-clip-text text-transparent">
            Build your future.
          </span>
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Your tasks, exams and classes in one place — so every day already knows what it is for.
        </p>

        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-journey-100/60 px-2.5 py-1 text-xs font-bold text-journey-700">
          <span aria-hidden>💪</span>
          {dailyBoost()}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface/90 py-1.5 pr-3.5 pl-1.5 shadow-card ring-1 ring-line-200/80 ring-inset backdrop-blur">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-500 ring-1 ring-amber-100 ring-inset">
              <Zap className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            <span className="text-sm font-black text-ink-900">Level {level}</span>
            {progress && (
              <span className="text-xs font-semibold text-ink-500 tabular-nums">
                {progress.xp} / {progress.ceiling} XP
              </span>
            )}
          </span>

          <span className="inline-flex items-center gap-2 rounded-full bg-surface/90 py-1.5 pr-3.5 pl-1.5 shadow-card ring-1 ring-line-200/80 ring-inset backdrop-blur">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-orange-500 ring-1 ring-orange-100 ring-inset">
              <Flame className="futurepath-flame h-3.5 w-3.5 fill-orange-300" strokeWidth={2.4} />
            </span>
            <span className="text-sm font-black tabular-nums text-ink-900">{streak}</span>
            <span className="text-xs font-semibold text-ink-500">
              day{streak === 1 ? '' : 's'} streak
            </span>
          </span>

          <Link
            to="/career/planner"
            className="fp-press group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-journey-600 to-indigo-600 px-4 py-2 text-sm font-black text-white shadow-md shadow-journey-500/30 transition-all hover:from-journey-700 hover:to-indigo-700"
          >
            Today&apos;s plan
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
