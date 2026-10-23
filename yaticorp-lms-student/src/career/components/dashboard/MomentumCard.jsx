import { Link } from 'react-router-dom';
import './overviewCardArt.css';
import { ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import LevelRing from '../ui/LevelRing';
import StreakPanel from './StreakPanel';
import useCountUp from '../../../hooks/useCountUp';
import { useXpRule } from '../../../context/useRewards';

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
  // The admin's 'career_task' rule (Rewards → Reward rules), not a number of our own.
  const TASK_XP = useXpRule('career_task');
  const shownXp = useCountUp(progress.xp, 1000);
  // A finished task pays the admin's 'career_task' rule, so a task count is a
  // target in a way that a raw XP number is not. Only while that rule pays
  // something: null (Rewards locked) or 0 means tasks earn no XP, and the
  // distance is said in XP alone rather than as a count nobody can meet.
  const promisesXp = TASK_XP > 0;
  const tasksToNextLevel = promisesXp ? Math.max(1, Math.ceil(progress.remaining / TASK_XP)) : 0;

  return (
    <section className="grid overflow-hidden rounded-3xl border border-line-200 bg-surface shadow-card lg:grid-cols-[1.15fr_1fr]">
      {/* ---------------- The habit ----------------
          Its own component so the LMS Dashboard can show it too. */}
      <StreakPanel
        streak={streak}
        activity={activity}
        weekly={weekly}
        className="border-b border-line-200 lg:border-r lg:border-b-0"
      />

      {/* ---------------- The ladder ---------------- */}
      <div className="isolate relative flex flex-col items-center overflow-hidden bg-gradient-to-br from-journey-50/70 to-surface p-6 text-center sm:p-7">
        <span aria-hidden className="oc-art oc-level" />
        <span aria-hidden className="oc-core oc-fx-rings" />
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
          {progress.remaining > 0 && promisesXp ? (
            <>
              <span className="font-black text-ink-900">
                {tasksToNextLevel} more {tasksToNextLevel === 1 ? 'task' : 'tasks'}
              </span>{' '}
              to Level {progress.nextLevel}
            </>
          ) : progress.remaining > 0 ? (
            <>
              <span className="font-black text-ink-900 tabular-nums">{progress.remaining} XP</span> to Level{' '}
              {progress.nextLevel}
            </>
          ) : (
            'Level target hit — new ground from here.'
          )}
        </p>

        {/* The chain the ring is part of. The level system was always on this
            page; what it never said was why a finished task should matter. */}
        <div className="mt-auto w-full pt-6">
          {promisesXp && (
          <div className="animate-fade-in-up flex items-center gap-2 rounded-2xl border border-line-200 bg-surface p-3" style={{ animationDelay: '0.5s' }}>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span className="truncate text-xs font-bold text-ink-700">Finish a task</span>
            </span>
            <ArrowRight className="fp-nudge-x h-3.5 w-3.5 shrink-0 text-ink-300" />
            <span className="fp-effort-gradient fp-chip-breathe inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black text-white">
              <Zap className="fp-bolt h-3 w-3 fill-white/40" />
              +{TASK_XP} XP
            </span>
          </div>
          )}

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
