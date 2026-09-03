import {
  BookOpen, CalendarClock, GraduationCap, PartyPopper, PenLine, Sparkles
} from 'lucide-react';

// A face per kind of event, so the tile says what it is before the tag is read.
// Keys match the CalendarEvent enum exactly; anything else falls back.
const TYPE_ICON = {
  Exam: GraduationCap,
  Assignment: PenLine,
  Class: BookOpen,
  Holiday: PartyPopper,
  Other: Sparkles
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Whole days from today to `key`, so "in 2 days" can be said instead of a date. */
const daysAway = (key, todayKey) => {
  const [ya, ma, da] = key.split('-').map(Number);
  const [yb, mb, db] = todayKey.split('-').map(Number);
  return Math.round((Date.UTC(ya, ma - 1, da) - Date.UTC(yb, mb - 1, db)) / 86400000);
};

/**
 * What is actually coming, in date order.
 *
 * The grid shows a month at a time, so an exam eleven days out is a coloured
 * square the student has to go looking for. This is the same events, read as a
 * list — and only the ones still ahead, because a calendar already shows the
 * past and a list of things that have been and gone is not a heads-up.
 *
 * Each row selects its day on the grid rather than linking anywhere: the detail
 * panel beside it is where an event is read, edited and deleted, and sending
 * the student somewhere else to do that would be a second place for one job.
 */
export default function ComingUpNext({ events = [], todayKey, styleFor, onSelect, limit = 3 }) {
  const upcoming = events
    .filter((e) => e.date && e.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);

  if (upcoming.length === 0) return null;

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-card">
      <h3 className="flex items-center gap-2 text-sm font-black text-ink-900">
        <CalendarClock className="h-4 w-4 text-journey-500" />
        Coming up next
      </h3>

      <ul className="mt-4 space-y-2">
        {upcoming.map((event) => {
          const style = styleFor(event.type);
          const [, month, day] = event.date.split('-').map(Number);
          const Icon = TYPE_ICON[event.type] || TYPE_ICON.Other;
          const away = daysAway(event.date, todayKey);
          const when = away === 0 ? 'Today' : away === 1 ? 'Tomorrow' : `in ${away} days`;

          return (
            <li key={event._id}>
              <button
                type="button"
                onClick={() => onSelect(event.date)}
                className="fp-press flex w-full items-center gap-3 rounded-xl border border-line-200 bg-surface p-2.5 text-left transition-colors hover:border-journey-300 hover:bg-journey-50/50"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${style.bg} ${style.text} ${style.ring}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.3} />
                </span>

                <span className="flex shrink-0 flex-col items-center">
                  <span className="text-sm leading-none font-black tabular-nums text-ink-900">
                    {day}
                  </span>
                  <span className="mt-0.5 text-[0.68rem] leading-none font-bold text-ink-400">
                    {MONTHS_SHORT[month - 1]}
                  </span>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-ink-900">
                    {event.title}
                  </span>
                  {/* The student's own note, where they left one. Otherwise how
                      soon it is, which is the next most useful thing this row
                      can say — never an empty second line. */}
                  <span className="mt-0.5 block truncate text-xs font-medium text-ink-500">
                    {event.notes || when}
                  </span>
                </span>

                <span
                  className={`shrink-0 rounded-md px-2 py-1 text-[0.68rem] font-black ${style.bg} ${style.text}`}
                >
                  {event.type}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
