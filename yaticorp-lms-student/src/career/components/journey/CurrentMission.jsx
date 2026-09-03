import { Link } from 'react-router-dom';
import { ArrowRight, Check, Zap } from 'lucide-react';

// What the server pays for a finished task, matching TASK_XP in
// taskCompletionService. Verified end to end: completing one moves the profile
// by exactly this much, so it is a promise rather than a guess.
const TASK_XP = 10;

/**
 * ⚡ The one button the dashboard exists to get pressed.
 *
 * Deliberately small. It began as a full-width panel carrying the task title,
 * a description, chips and its own footer link — a card to read, on the one
 * element meant to be pressed without thinking. Shrinking it to a pill did
 * more for its prominence than any amount of size did: it now sits inside the
 * hero next to "View journey", so it is the first coloured thing in the first
 * viewport rather than a large block competing with the panel above it.
 *
 * Amber against the hero's purple. Warm on cool is the loudest contrast
 * available, and it costs nothing semantically — amber is already this
 * product's colour for XP and effort, which is exactly what this offers.
 *
 * Near-black text: white on #FFB800 measures about 1.9:1 and is unreadable,
 * near-black clears 10:1.
 */
export default function CurrentMission({ task, completedToday = 0, totalToday = 0 }) {
  const allDone = totalToday > 0 && completedToday >= totalToday;

  if (!task) {
    return (
      <Link
        to="/career/planner"
        className="fp-press group inline-flex min-h-12 items-center gap-2.5 rounded-2xl bg-emerald-400 px-4 py-3 text-sm sm:px-5 font-black text-emerald-950 shadow-lg shadow-emerald-900/25 transition-transform hover:scale-[1.03]"
      >
        <Check className="h-4 w-4 shrink-0" strokeWidth={3} />
        {allDone ? "Today's quest is done 🎉" : 'Open the planner'}
        <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
      </Link>
    );
  }

  return (
    <Link
      to="/career/planner"
      aria-label={`Start today's quest and earn ${TASK_XP} XP`}
      className="fp-sweep fp-press group relative inline-flex min-h-12 items-center gap-2 overflow-hidden rounded-2xl whitespace-nowrap sm:gap-2.5 bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 text-sm sm:px-5 font-black text-orange-950 shadow-lg shadow-orange-900/30 transition-transform hover:scale-[1.03]"
    >
      <Zap className="h-4 w-4 shrink-0 fill-orange-950/25" />
      {/* At 360px the full label wraps mid-phrase and pushes the XP chip out
          of line, so the narrowest screens get the short form. */}
      <span className="hidden sm:inline">Complete today&apos;s quest</span>
      <span className="sm:hidden">Today&apos;s quest</span>
      <span className="rounded-lg bg-orange-950/20 px-2 py-0.5 text-xs tabular-nums">
        +{TASK_XP} XP
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
