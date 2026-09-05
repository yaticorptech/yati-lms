import { Link } from 'react-router-dom';
import { ArrowRight, Lock, Trophy, Zap } from 'lucide-react';
import { phaseTitle, parseChoices } from '../../utils/roadmap';

/**
 * 🔓 What finishing today actually buys.
 *
 * The Overview could say where the student was and what to do, but never why
 * the next step was worth taking — so effort and reward sat on the same screen
 * without ever being connected. Two rows, both drawn from data already on the
 * page: the phase waiting after this one, and the level the XP ladder is
 * climbing towards.
 *
 * Both rendered only when they exist. On the final phase there is no next
 * phase, and a locked row promising one would be a lie about the roadmap.
 */
export default function NextUp({ nextPhase, levelProgress }) {
  const nextTitle = nextPhase ? phaseTitle(nextPhase) : null;
  const nextLead = nextTitle ? parseChoices(nextTitle)?.lead || nextTitle : null;
  const hasLevel = levelProgress && levelProgress.remaining > 0;

  if (!nextLead && !hasLevel) return null;

  // The backend awards 10 XP per completed task, so "how many more tasks" is a
  // goal in a way that "260 XP" is not.
  const tasksToLevel = hasLevel ? Math.max(1, Math.ceil(levelProgress.remaining / 10)) : 0;

  return (
    <section className="fp-lift flex h-full flex-col overflow-hidden rounded-3xl border border-line-200 bg-surface p-6 shadow-card">
      <p className="flex items-center gap-2 text-[0.68rem] font-black tracking-[0.16em] text-ink-500 uppercase">
        <span className="text-sm" aria-hidden>🔓</span>
        What you'll unlock
      </p>

      <div className="mt-5 flex flex-1 flex-col gap-3">
        {nextLead && (
          <div className="fp-lift animate-fade-in-up rounded-2xl border border-journey-100 bg-journey-50/60 p-4" style={{ animationDelay: '0.3s' }}>
            <p className="flex items-center gap-1.5 text-[0.68rem] font-black tracking-wider text-journey-700 uppercase">
              <Lock className="h-3 w-3" />
              Next phase
            </p>
            <p className="mt-1.5 line-clamp-2 text-sm leading-snug font-black text-ink-900">
              {nextLead}
            </p>
          </div>
        )}

        {hasLevel && (
          <div className="fp-lift animate-fade-in-up rounded-2xl border border-amber-100 bg-amber-50/60 p-4" style={{ animationDelay: '0.4s' }}>
            <p className="flex items-center gap-1.5 text-[0.68rem] font-black tracking-wider text-amber-700 uppercase">
              <Trophy className="h-3 w-3" />
              Level {levelProgress.nextLevel}
            </p>
            <p className="mt-1.5 text-sm leading-snug font-black text-ink-900">
              {tasksToLevel} more {tasksToLevel === 1 ? 'task' : 'tasks'}
            </p>
            {/* "110 XP from Level 2" under a heading reading "LEVEL 3" left it
                unclear which level the number was measured against. It is the
                distance still to travel, so it says that. */}
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-ink-500">
              <Zap className="h-3 w-3 text-amber-500" />
              <span className="tabular-nums">{levelProgress.remaining} XP</span> to go
            </p>
          </div>
        )}

        {/* The way to unlock either of them, at the foot so the card has a
            floor: it used to stop short of the streak card beside it. */}
        <Link
          to="/career/planner"
          data-guide="unlock"
          className="fp-btn fp-btn-primary group mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-journey-600 to-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-journey-500/25"
        >
          Unlock with today&apos;s task
          <ArrowRight className="fp-btn-arrow h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
