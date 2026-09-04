import { Link } from 'react-router-dom';
import { Flame, TrendingUp, Zap } from 'lucide-react';
import { levelProgress } from '../../utils/progress';

/**
 * 🔥 Why today is worth doing, in three tiles.
 *
 * A task on its own is a chore. The same task read as "keeps a 4-day streak
 * alive, gets you 30 XP closer to Level 3, and moves Node.js forward" is a
 * reason. Every figure is real: the streak is counted from task history, the
 * level maths mirrors the backend ladder, and the skill is the one the task
 * itself names.
 */
export default function MomentumStrip({
  streak = 0,
  countedToday = false,
  remaining = 0,
  user,
  nextTask,
  taskXp = 10
}) {
  const level = levelProgress(user?.xp, user?.level);
  const tasksToLevel = Math.max(1, Math.ceil(level.remaining / taskXp));
  const canLevelToday = remaining > 0 && level.remaining <= remaining * taskXp;

  // Streak copy that never scolds. Anchored on whether today already counts,
  // because a streak is not extended twice by finishing two tasks.
  let streakTitle;
  let streakLine;
  if (countedToday) {
    streakTitle = `${streak}-day streak`;
    streakLine = streak === 1 ? 'Day one is on the board. Same time tomorrow.' : 'Alive and well. Come back tomorrow to keep it.';
  } else if (streak > 0) {
    streakTitle = `${streak}-day streak on the line`;
    streakLine = `Finish one task today and it becomes ${streak + 1}.`;
  } else {
    streakTitle = 'Start a streak';
    streakLine = 'One task today is day one.';
  }

  const tiles = [
    {
      icon: Flame,
      tone: 'bg-orange-50 text-orange-500 ring-orange-100',
      title: streakTitle,
      line: streakLine
    },
    {
      icon: Zap,
      tone: 'bg-amber-50 text-amber-500 ring-amber-100',
      title: canLevelToday
        ? `Level ${level.nextLevel} is within reach today`
        : `${level.remaining} XP to Level ${level.nextLevel}`,
      line: canLevelToday
        ? `Only ${level.remaining} XP away — today's plan covers it.`
        : `About ${tasksToLevel} ${tasksToLevel === 1 ? 'task' : 'tasks'} at ${taskXp} XP each.`
    },
    nextTask?.skill
      ? {
          icon: TrendingUp,
          tone: 'bg-journey-50 text-journey-600 ring-journey-100',
          title: `Moves ${nextTask.skill}`,
          line: 'Every task you finish pushes the skill it teaches forward.',
          to: '/career/skills'
        }
      : {
          icon: TrendingUp,
          tone: 'bg-journey-50 text-journey-600 ring-journey-100',
          title: 'Builds your skill map',
          line: 'Finished tasks are what your skills page is made of.',
          to: '/career/skills'
        }
  ];

  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {tiles.map((t, i) => {
        const Icon = t.icon;
        const body = (
          <>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${t.tone}`}>
              <Icon className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-ink-900">{t.title}</span>
              <span className="mt-0.5 block text-xs leading-snug text-ink-500">{t.line}</span>
            </span>
          </>
        );
        const cls =
          'flex h-full items-center gap-3 rounded-2xl border border-line-200/80 bg-surface p-3.5 shadow-card transition-all';
        return (
          <li key={i} className="animate-fade-in-up" style={{ animationDelay: `${0.08 + i * 0.06}s` }}>
            {t.to ? (
              <Link to={t.to} className={`${cls} hover:-translate-y-0.5 hover:border-journey-200 hover:shadow-card-hover`}>
                {body}
              </Link>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
