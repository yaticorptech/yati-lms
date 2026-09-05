import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3 } from 'lucide-react';
import useCountUp from '../../../hooks/useCountUp';
import { initialsOf, tilesFor } from '../../utils/skills';

/**
 * The three skills moving most, and how many more there are.
 *
 * The Overview used to list every tracked skill — eight bars the student had
 * not asked to read, on a page whose job is to say what to do today. Three
 * is enough to show that work is turning into skill; the Skills tab is where
 * the whole set lives.
 */
const LEVELS = {
  Beginner: 'bg-surface-100 text-ink-600',
  Intermediate: 'bg-blue-50 text-blue-700',
  Advanced: 'bg-journey-50 text-journey-700',
  Expert: 'bg-emerald-50 text-emerald-700'
};

function Row({ skill, tile, index }) {
  const value = Math.max(0, Math.min(100, Number(skill.progress) || 0));
  // Bar and number driven by one hook so they land together.
  const width = useCountUp(value, 900);
  const shown = useCountUp(value, 900);
  return (
    <li
      className="animate-fade-in-up flex items-center gap-3.5 py-3"
      style={{ animationDelay: `${0.1 + index * 0.08}s` }}
    >
      <span
        aria-hidden
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-black text-white shadow-sm ${tile}`}
      >
        {initialsOf(skill.skillName)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-bold text-ink-900">{skill.skillName}</span>
          <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[0.66rem] font-bold ${LEVELS[skill.level] || LEVELS.Beginner}`}>
            {skill.level || 'Beginner'}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-journey-400 to-indigo-600"
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
      <span className="w-11 shrink-0 text-right text-base font-black tabular-nums text-ink-900">{shown}%</span>
    </li>
  );
}

export default function SkillSnapshot({ skills = [], limit = 3 }) {
  const moving = [...skills]
    .filter((s) => (Number(s.progress) || 0) > 0)
    .sort((a, b) => (Number(b.progress) || 0) - (Number(a.progress) || 0));
  const shown = moving.slice(0, limit);
  const rest = moving.length - shown.length;
  const untouched = skills.length - moving.length;
  const tiles = tilesFor(skills);
  const avg = skills.length
    ? Math.round(skills.reduce((sum, s) => sum + (Number(s.progress) || 0), 0) / skills.length)
    : 0;

  return (
    <section className="rounded-3xl border border-line-200/80 bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-link ring-1 ring-brand-100 ring-inset">
            <BarChart3 className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.2} />
          </span>
          <div>
            <h3 className="text-lg font-bold text-ink-900">Skill progress</h3>
            <p className="mt-0.5 text-sm text-ink-500">Your three fastest-moving skills</p>
          </div>
        </div>
        <span className="rounded-full bg-journey-50 px-3 py-1 text-xs font-black text-journey-700 tabular-nums ring-1 ring-journey-100 ring-inset">
          {avg}% avg
        </span>
      </div>

      {shown.length > 0 ? (
        <ul className="mt-2 divide-y divide-line-100">
          {shown.map((skill, i) => (
            <Row key={skill._id || skill.skillName} skill={skill} tile={tiles.get(skill.skillName)} index={i} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-500">
          Nothing moving yet — finish today&apos;s task and the skill it teaches moves first.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line-100 pt-4">
        <p className="text-xs font-semibold text-ink-500 tabular-nums">
          {rest > 0 && `${rest} more in progress`}
          {rest > 0 && untouched > 0 && ' · '}
          {untouched > 0 && `${untouched} not started`}
        </p>
        <Link
          to="/career/skills"
          className="fp-btn fp-btn-soft inline-flex items-center gap-1.5 rounded-xl bg-journey-50 px-3.5 py-2 text-sm font-black text-journey-700 ring-1 ring-journey-100 ring-inset"
        >
          See all skills
          <ArrowRight className="fp-btn-arrow h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
