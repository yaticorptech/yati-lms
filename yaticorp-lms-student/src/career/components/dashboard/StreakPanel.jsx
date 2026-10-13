import './overviewCardArt.css';
import { Flame } from 'lucide-react';
import useCountUp from '../../../hooks/useCountUp';

/**
 * 🔥 The learning streak: the run of days, the last seven of them, and the
 * week's quests against the week before.
 *
 * The habit half of MomentumCard, on its own so the LMS Dashboard's Weekly
 * activity tab can show the very same panel. It draws no frame of its own —
 * MomentumCard sets it beside the level, the Dashboard sets it in a card —
 * so `className` carries whatever border the host needs, and `children`
 * lands at the foot of it, under the week's line.
 *
 * `extra` is for a host that has more to say in the same card (the Dashboard:
 * courses completed and certificates). It goes under the streak number, and on
 * a wide screen the panel becomes two columns — the number and the extra on
 * the left, the seven days and the week on the right — so a full-width card is
 * filled rather than its seven day tiles stretched across it. Without it the
 * panel is exactly what MomentumCard has always shown.
 *
 * Outside Career Path it needs the `.futurepath` scope around it: the flame's
 * flicker is defined there.
 */
export default function StreakPanel({ streak, activity = [], weekly, className = '', extra = null, children }) {
  const streakCount = useCountUp(streak);
  const shownWeekly = useCountUp(weekly?.recent || 0, 900);
  const activeDays = activity.filter((d) => d.active).length;

  const header = (
    <p className="animate-fade-in-up flex items-center gap-2 text-[0.68rem] font-black tracking-[0.16em] text-amber-700 uppercase">
      <span className="fp-bob-soft text-sm" aria-hidden>🔥</span>
      Learning streak
    </p>
  );

  const number = (
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
  );

  /* Filled = work done that day. The date sits inside each cell so the
     strip doubles as a mini calendar rather than seven anonymous dots. */
  const strip = (
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
  );

  /* ---------------- The week ----------------
     A different fact from the strip above it: that one says which days were
     active, this says how much was done and whether the student is ahead of
     where they were. The comparison is to their own previous week — the only
     weekly target this data can honestly support. ---- */
  const week = weekly && (weekly.recent > 0 || weekly.prior > 0) && (
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
  );

  return (
    <div className={`isolate relative flex flex-col overflow-hidden p-6 sm:p-7 ${className}`}>
      {/* Decoration only — painted first so every line below stacks over
          it, and faint enough that the numbers stay the loudest thing. */}
      <span aria-hidden className="oc-art oc-streak" />
      <span aria-hidden className="oc-core oc-fx-embers" />
      <div
        aria-hidden
        className="fp-float pointer-events-none absolute -top-16 -left-10 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl"
      />

      {extra ? (
        <div className="relative grid flex-1 gap-x-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="flex flex-col">
            {header}
            {number}
            {extra}
          </div>
          <div className="flex flex-col">
            {strip}
            {week}
            {children}
          </div>
        </div>
      ) : (
        <div className="relative flex flex-1 flex-col">
          {header}
          {number}
          {strip}
          {week}
          {children}
        </div>
      )}
    </div>
  );
}
