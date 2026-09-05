import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Flame, Zap } from 'lucide-react';
import LevelRing from '../ui/LevelRing';
import useCountUp from '../../../hooks/useCountUp';

/**
 * 🔥 One card for everything the student has built up: the habit and the ladder.
 *
 * This replaces two separate tiles. The streak tile carried a 96px numeral and
 * a week strip; the level tile carried a ring and an XP fraction — and above
 * them the hero already stated the streak and the level in words. Three places
 * on one screen, two of them saying it twice.
 *
 * Merged, the split is honest: the hero makes the CLAIM ("7 days in a row",
 * "Level 3"), and this card is the EVIDENCE — which seven days, and how far
 * into the level. Nothing is repeated, because the two halves answer different
 * questions.
 *
 * Amber on the left because effort is amber everywhere in this section; violet
 * on the right because levelling is part of the journey.
 */
export default function MomentumCard({ streak, activity = [], level, progress, weekly }) {
  const streakCount = useCountUp(streak);
  const shownXp = useCountUp(progress.xp, 1000);
  const shownWeekly = useCountUp(weekly?.recent || 0, 900);
  const activeDays = activity.filter((d) => d.active).length;
  // Backend awards 10 XP per completed task, so a task count is a target in a
  // way that a raw XP number is not.
  const tasksToNextLevel = Math.max(1, Math.ceil(progress.remaining / 10));

  return (
    <section className="grid overflow-hidden rounded-3xl border border-line-200 bg-surface shadow-card lg:grid-cols-[1.15fr_1fr]">
      {/* ---------------- The habit ---------------- */}
      <div className="relative flex flex-col overflow-hidden border-b border-line-200 p-6 sm:p-7 lg:border-r lg:border-b-0">
        <div
          aria-hidden
          className="fp-float pointer-events-none absolute -top-16 -left-10 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl"
        />

        <div className="relative flex flex-1 flex-col">
          <p className="animate-fade-in-up flex items-center gap-2 text-[0.68rem] font-black tracking-[0.16em] text-amber-700 uppercase">
            <span className="fp-bob-soft text-sm" aria-hidden>🔥</span>
            Learning streak
          </p>

          <div className="mt-auto flex items-end gap-4 pt-4">
            {/* The number lands with a pop, then light keeps moving through
                its gradient — the one figure on this card that must be seen. */}
            <span
              className={`animate-pop-in fp-effort-gradient bg-clip-text text-[4.5rem] leading-[0.8] font-black tabular-nums text-transparent sm:text-[5.5rem] ${
                streak > 0 ? 'fp-text-shimmer' : ''
              }`}
              style={{ animationDelay: '0.15s' }}
            >
              {streakCount}
            </span>
            <div className="pb-2">
              <span className="animate-fade-in-up flex items-center gap-1.5 text-base font-black text-ink-900" style={{ animationDelay: '0.3s' }}>
                <Flame
                  className={`h-5 w-5 fill-amber-400/50 text-amber-500 ${streak > 0 ? 'fp-flame-live' : 'futurepath-flame'}`}
                />
                day{streak === 1 ? '' : 's'}
              </span>
              <p className="animate-fade-in-up mt-0.5 text-sm font-medium text-ink-500" style={{ animationDelay: '0.4s' }}>
                {streak > 0 ? 'Keep it alive today' : 'Finish a task to begin'}
              </p>
            </div>
          </div>

          {/* Filled = work done that day. The date sits inside each cell so the
              strip doubles as a mini calendar rather than seven anonymous dots. */}
          <div className="mt-6 mb-auto">
            <div className="mb-2.5 flex items-baseline justify-between gap-4">
              <span className="text-[0.68rem] font-black tracking-[0.14em] text-ink-400 uppercase">
                Last 7 days
              </span>
              <span className="text-[0.68rem] font-black text-ink-500 tabular-nums">
                {activeDays} active
              </span>
            </div>

            <div className="flex gap-1.5 sm:gap-2">
              {activity.map((day) => {
                const dayNumber = day.key?.split('-')[2]?.replace(/^0/, '');
                return (
                  <div key={day.key} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      title={`${day.key}${day.active ? ' — active' : ' — no activity'}`}
                      style={{ animationDelay: `${0.3 + activity.indexOf(day) * 0.06}s` }}
                      className={`animate-pop-in relative flex h-12 w-full items-center justify-center rounded-xl text-sm font-black tabular-nums transition-all hover:-translate-y-0.5 ${
                        day.active
                          ? 'fp-effort-gradient text-white shadow-sm shadow-orange-500/30'
                          : 'bg-surface-50 text-ink-400 ring-1 ring-line-200 ring-inset'
                      } ${day.isToday ? 'fp-breathe outline-2 outline-offset-2 outline-journey-400' : ''}`}
                    >
                      {dayNumber}
                      {day.active && (
                        <span
                          aria-hidden
                          className="animate-pop-in absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface text-amber-500 shadow-sm ring-1 ring-amber-200"
                          style={{ animationDelay: `${0.5 + activity.indexOf(day) * 0.06}s` }}
                        >
                          <Flame className="h-2.5 w-2.5 fill-amber-400" />
                        </span>
                      )}
                    </div>
                    <span className="text-[0.68rem] font-bold text-ink-400">{day.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ---------------- The week ----------------
              A different fact from the strip above it: that one says which
              days were active, this says how much was done and whether the
              student is ahead of where they were. The comparison is to their
              own previous week — the only weekly target this data can honestly
              support. ---- */}
          {weekly && (weekly.recent > 0 || weekly.prior > 0) && (
            <p className="animate-fade-in-up mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-line-100 pt-3.5 text-sm" style={{ animationDelay: '0.7s' }}>
              <span aria-hidden>🎯</span>
              <span className="font-black text-ink-900 tabular-nums">{shownWeekly}</span>
              <span className="text-ink-500">
                {weekly.recent === 1 ? 'quest' : 'quests'} this week
              </span>
              {weekly.ahead > 0 ? (
                <span className="font-bold text-emerald-600">
                  — {weekly.ahead} ahead of last week
                </span>
              ) : weekly.ahead === 0 ? (
                <span className="font-bold text-ink-500">— level with last week</span>
              ) : (
                <span className="font-bold text-amber-700">
                  — {Math.abs(weekly.ahead)} to match last week
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* ---------------- The ladder ---------------- */}
      <div className="relative flex flex-col items-center overflow-hidden bg-gradient-to-br from-journey-50/70 to-surface p-6 text-center sm:p-7">
        <p className="flex items-center gap-2 self-start text-[0.68rem] font-black tracking-[0.16em] text-journey-700 uppercase">
          <span className="text-sm" aria-hidden>⚡</span>
          Your level
        </p>

        <LevelRing level={level} percent={progress.percent} size={132} />

        <p className="mt-4 text-2xl font-black tabular-nums text-ink-900">
          {shownXp}
          <span className="text-base font-bold text-ink-400"> / {progress.ceiling} XP</span>
        </p>

        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
          {progress.remaining > 0 ? (
            <>
              <span className="font-black text-ink-900">
                {tasksToNextLevel} more {tasksToNextLevel === 1 ? 'task' : 'tasks'}
              </span>{' '}
              to Level {progress.nextLevel}
            </>
          ) : (
            'Level target hit — new ground from here.'
          )}
        </p>

        {/* The chain the ring is part of. The level system was always on this
            page; what it never said was why a finished task should matter. */}
        <div className="mt-auto w-full pt-6">
          <div className="animate-fade-in-up flex items-center gap-2 rounded-2xl border border-line-200 bg-surface p-3" style={{ animationDelay: '0.5s' }}>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span className="truncate text-xs font-bold text-ink-700">Finish a task</span>
            </span>
            <ArrowRight className="fp-nudge-x h-3.5 w-3.5 shrink-0 text-ink-300" />
            <span className="fp-effort-gradient fp-chip-breathe inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black text-white">
              <Zap className="fp-bolt h-3 w-3 fill-white/40" />
              +10 XP
            </span>
          </div>

          <Link
            to="/career/badges"
            className="fp-btn fp-btn-soft group mt-3 inline-flex items-center gap-1.5 rounded-xl bg-journey-50 px-3.5 py-2 text-sm font-black text-journey-700 ring-1 ring-journey-100 ring-inset"
          >
            See what you've earned
            <ArrowRight className="fp-btn-arrow h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
