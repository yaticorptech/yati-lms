import { Flame } from 'lucide-react';
import useCountUp from '../../hooks/useCountUp';

/**
 * The anchor tile of the bento: the one number the dashboard exists to protect.
 *
 * Set as a display numeral rather than a sentence — a 96px "3" is read before
 * any headline is, which is the right reading order here. The week strip sits
 * directly under it so the claim and its evidence share one tile.
 *
 * Rendering: a static dot field and one flat gradient. No blurred layers, no
 * backdrop-filter, no looping animation. Everything here paints once. The panel
 * sits behind a scrolling page and must paint exactly once.
 */
export default function StreakTile({ name, greeting, streak, activity }) {
  const firstName = name?.split(' ')[0] || 'there';
  const streakCount = useCountUp(streak);
  const activeDays = activity.filter((d) => d.active).length;

  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-900 to-slate-900 p-6 text-white shadow-float sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />

      <div className="relative flex flex-1 flex-col">
        <p className="text-sm font-medium text-brand-200">
          {greeting}, <span className="font-bold text-white">{firstName}</span>
        </p>

        <div className="mt-4 flex items-end gap-4">
          <span className="text-[4.25rem] leading-[0.82] font-black tabular-nums sm:text-[5.25rem]">
            {streakCount}
          </span>
          <div className="pb-1.5">
            <span className="flex items-center gap-1.5 text-lg font-bold text-amber-300">
              <Flame className="h-5 w-5 fill-amber-400/30" />
              day streak
            </span>
            <p className="mt-0.5 text-sm text-brand-200">
              {streak > 0 ? 'Keep it alive today' : 'Complete a task to begin one'}
            </p>
          </div>
        </div>

        {/* ---- Last seven days ----
            Filled = work done that day. The date sits inside each cell so the
            strip doubles as a mini calendar rather than seven anonymous dots. */}
        <div className="mt-auto pt-7">
          <div className="mb-2.5 flex items-baseline justify-between gap-4 border-t border-white/10 pt-4">
            <span className="text-[0.68rem] font-bold tracking-[0.14em] text-brand-300 uppercase">
              Last 7 days
            </span>
            <span className="text-[0.68rem] font-semibold text-brand-300 tabular-nums">
              {activeDays} active
            </span>
          </div>

          <div className="flex gap-1.5">
            {activity.map((day) => {
              const dayNumber = day.key?.split('-')[2]?.replace(/^0/, '');
              return (
                <div key={day.key} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    title={`${day.key}${day.active ? ' — active' : ' — no activity'}`}
                    className={`flex h-11 w-full items-center justify-center rounded-lg text-xs font-bold tabular-nums transition-colors ${
                      day.active
                        ? 'bg-amber-400 text-ink-900'
                        : 'bg-white/[0.07] text-brand-300/70 hover:bg-white/[0.13]'
                    } ${day.isToday ? 'outline-2 outline-offset-2 outline-white/60' : ''}`}
                  >
                    {dayNumber}
                  </div>
                  <span className="text-[0.6rem] font-semibold text-brand-300/80">{day.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
