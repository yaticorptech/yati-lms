import { Link } from 'react-router-dom';
import { ArrowRight, Check, Sparkles, Zap } from 'lucide-react';

// What the server pays for a finished task, matching TASK_XP in
// taskCompletionService. Verified end to end: completing one moves the profile
// by exactly this much, so it is a promise rather than a guess.
const TASK_XP = 10;

/**
 * ⚡ The one button the dashboard exists to get pressed.
 *
 * Three states, decided from today's counts rather than from whether a task
 * object happened to be handed in — the counter beside it says "0/1", so the
 * button must agree with it:
 *
 *   waiting   work left today       → loud, warm, pulsing: start the quest
 *   done      everything finished   → green and calm: come back tomorrow
 *   no plan   nothing generated yet → violet: go and get today's quest
 *
 * Amber against the pale hero: warm on cool is the loudest contrast on the
 * page, and amber is already this product's colour for XP and effort, which
 * is exactly what this offers. Near-black text on it clears 10:1.
 */
export default function CurrentMission({ completedToday = 0, totalToday = 0 }) {
  const allDone = totalToday > 0 && completedToday >= totalToday;
  const waiting = totalToday > 0 && !allDone;
  const started = waiting && completedToday > 0;

  if (allDone) {
    return (
      <Link
        to="/career/planner"
        data-guide="quest"
        className="fp-btn fp-btn-soft group inline-flex min-h-12 items-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-4 py-3 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-900/25 sm:px-5"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/60">
          <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
        </span>
        Quest complete <span aria-hidden>🎉</span>
        <span className="hidden text-xs font-bold text-emerald-900/70 sm:inline">· see tomorrow&apos;s</span>
        <ArrowRight className="fp-btn-arrow h-4 w-4 shrink-0" />
      </Link>
    );
  }

  if (!waiting) {
    return (
      <Link
        to="/career/planner"
        data-guide="quest"
        className="fp-btn fp-btn-primary group inline-flex min-h-12 items-center gap-2.5 rounded-2xl bg-gradient-to-r from-journey-600 to-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-journey-900/25 sm:px-5"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-amber-300" />
        Get today&apos;s quest
        <ArrowRight className="fp-btn-arrow h-4 w-4 shrink-0" />
      </Link>
    );
  }

  return (
    <Link
      to="/career/planner"
      data-guide="quest"
      aria-label={`${started ? 'Continue' : 'Start'} today's quest and earn ${TASK_XP} XP`}
      className="fp-sweep fp-btn fp-btn-warm fp-beacon group relative inline-flex min-h-12 items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 px-4 py-3 text-sm font-black whitespace-nowrap text-white sm:gap-2.5 sm:px-5"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/25">
        <Zap className="fp-bolt h-4 w-4 fill-white" />
      </span>
      {/* At 360px the full label wraps mid-phrase and pushes the XP chip out
          of line, so the narrowest screens get the short form. */}
      <span className="hidden sm:inline">{started ? 'Continue today’s quest' : 'Start today’s quest'}</span>
      <span className="sm:hidden">{started ? 'Continue quest' : 'Start quest'}</span>
      <span className="fp-chip-breathe rounded-lg px-2 py-0.5 text-xs tabular-nums">+{TASK_XP} XP</span>
      <ArrowRight className="fp-btn-arrow h-4 w-4 shrink-0" />
    </Link>
  );
}
