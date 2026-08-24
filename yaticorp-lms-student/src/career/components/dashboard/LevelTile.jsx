import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Trophy } from 'lucide-react';
import LevelRing from '../ui/LevelRing';

/**
 * The reward tile: how far into this level the student is, and the single next
 * action that moves them.
 *
 * Split out of the old combined hero so the bento can put progress on white
 * beside the streak on dark. Two tiles, two jobs — the previous single panel
 * had a student's eye landing on four competing things at once.
 */
export default function LevelTile({ level, progress, nextTask }) {
  // A specific number outperforms encouragement. "2 tasks to Level 3" is a goal;
  // "keep going!" is noise. Backend awards 10 XP per completed task.
  const tasksToNextLevel = Math.max(1, Math.ceil(progress.remaining / 10));

  return (
    <section className="flex h-full flex-col rounded-2xl border border-line-200 bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[0.68rem] font-bold tracking-wide text-amber-700 ring-1 ring-amber-100 ring-inset">
          <Trophy className="h-3 w-3" />
          Level {level}
        </span>
        <span className="text-[0.68rem] font-bold tracking-[0.12em] text-ink-400 uppercase">
          Progress
        </span>
      </div>

      <div className="mt-5 flex flex-col items-center text-center">
        <LevelRing level={level} percent={progress.percent} size={124} />

        <p className="mt-4 text-2xl font-black tabular-nums text-ink-900">
          {progress.into}
          <span className="text-base font-bold text-ink-400"> / {progress.span} XP</span>
        </p>

        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
          {progress.remaining > 0 ? (
            <>
              <span className="font-bold text-ink-900">
                {tasksToNextLevel} more {tasksToNextLevel === 1 ? 'task' : 'tasks'}
              </span>{' '}
              to Level {progress.nextLevel}
            </>
          ) : (
            'Level target hit — new ground from here.'
          )}
        </p>
      </div>

      <div className="mt-auto pt-6">
        {nextTask ? (
          <Link
            to="/career/planner"
            className="group block rounded-xl border border-line-200 bg-surface-50 p-3.5 transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            <span className="flex items-center gap-1.5 text-[0.62rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
              <Sparkles className="h-3 w-3" />
              Up next
            </span>
            <span className="mt-1 flex items-center justify-between gap-3">
              <span className="line-clamp-2 text-sm font-bold text-ink-900">{nextTask.title}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-1 group-hover:text-link" />
            </span>
          </Link>
        ) : (
          <Link
            to="/career/planner"
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-bold text-white transition-colors hover:bg-slate-800"
          >
            Plan today
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </div>
    </section>
  );
}
