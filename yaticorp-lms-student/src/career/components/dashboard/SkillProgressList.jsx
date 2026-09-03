import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import useCountUp from '../../../hooks/useCountUp';

/**
 * Where every tracked skill stands.
 *
 * Two tiers, because eleven skills with eight of them untouched is not eleven
 * equal rows. Giving a skill at 0% the same bar, the same weight and the same
 * height as one the student has actually worked buries the three that are
 * moving under eight that are not, and makes a page that should feel like
 * progress read as a list of things not done.
 *
 * So: the started ones get the rows, and the rest collapse into a single line
 * of names that opens on request. Nothing is hidden — it is just not shouted.
 */
// Same ladder as the Skills page, so a level chip means one thing everywhere.
const LEVELS = {
  Beginner: 'bg-surface-100 text-ink-600',
  Intermediate: 'bg-blue-50 text-blue-700',
  Advanced: 'bg-journey-50 text-journey-700',
  Expert: 'bg-emerald-50 text-emerald-700'
};

function SkillRow({ skill, index }) {
  const value = Math.max(0, Math.min(100, skill.progress || 0));
  // Both driven by the same rAF hook, so the bar and the number land together.
  // A CSS width transition cannot work here: React paints the final width on
  // the first frame, leaving nothing to transition from.
  const width = useCountUp(value, 900);
  const shown = useCountUp(value, 900);

  return (
    <li
      className="animate-fade-in-up flex items-center gap-4 py-3"
      style={{ animationDelay: `${0.05 + index * 0.06}s` }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-bold text-ink-900">{skill.skillName}</span>
          <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[0.68rem] font-bold ${
              LEVELS[skill.level] || LEVELS.Beginner
            }`}
          >
            {skill.level}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-journey-400 to-indigo-600"
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
      <span className="w-11 shrink-0 text-right text-base font-black text-ink-900 tabular-nums">
        {shown}%
      </span>
    </li>
  );
}

export default function SkillProgressList({ skills = [] }) {
  const [showAll, setShowAll] = useState(false);

  const ordered = [...skills].sort((a, b) => (b.progress || 0) - (a.progress || 0));
  const started = ordered.filter((s) => (s.progress || 0) > 0);
  const untouched = ordered.filter((s) => !(s.progress || 0));

  return (
    <div className="flex flex-col">
      {started.length > 0 ? (
        <>
          <p className="text-[0.68rem] font-bold tracking-[0.12em] text-ink-400 uppercase">
            In progress · {started.length}
          </p>
          <ul className="divide-y divide-line-100">
            {started.map((skill, i) => (
              <SkillRow key={skill._id || skill.skillName} skill={skill} index={i} />
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-ink-500">
          Nothing started yet. Finish today's task and the skill it teaches moves first.
        </p>
      )}

      {untouched.length > 0 && (
        <div className={started.length > 0 ? 'mt-5 border-t border-line-100 pt-4' : 'mt-4'}>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="flex min-h-9 w-full items-center gap-2 text-left"
          >
            <span className="text-[0.68rem] font-bold tracking-[0.12em] text-ink-400 uppercase">
              Not started · {untouched.length}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-ink-400 transition-transform duration-200 ${
                showAll ? 'rotate-180' : ''
              }`}
            />
          </button>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {(showAll ? untouched : untouched.slice(0, 4)).map((skill, i) => (
              <span
                key={skill._id || skill.skillName}
                className="animate-fade-in-up rounded-lg bg-surface-50 px-2.5 py-1.5 text-xs font-semibold text-ink-500 ring-1 ring-line-100 ring-inset"
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                {skill.skillName}
              </span>
            ))}
            {!showAll && untouched.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-link hover:underline"
              >
                +{untouched.length - 4} more
              </button>
            )}
          </div>
        </div>
      )}

      <Link
        to="/career/skills"
        className="mt-5 inline-flex items-center gap-1.5 self-start text-sm font-bold text-link hover:underline"
      >
        Open Skills
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
