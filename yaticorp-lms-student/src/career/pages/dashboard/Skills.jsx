import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  ArrowRight, ChevronRight, LayoutGrid, List as ListIcon, Sparkles, Target, Zap
} from 'lucide-react';
import SkillMapArt from '../../components/journey/SkillMapArt';
import SkillsBanner from '../../components/journey/SkillsBanner';
import useCountUp from '../../../hooks/useCountUp';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import { SkeletonPage } from '../../components/ui/Skeleton';

/**
 * A tile for a skill, coloured from its own name.
 *
 * Skill names are written by the model — "React.js / Next.js", "Basic Docker &
 * Cloud Deployment" — so there is no fixed set to map brand logos onto, and
 * guessing one would put a React atom next to something that is not React. The
 * initials in a colour derived from the name are always right, always distinct,
 * and stay stable for a given skill across sessions.
 */
const TILE_COLOURS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-600',
  'from-fuchsia-500 to-purple-600',
  'from-cyan-500 to-sky-600'
];

const tileFor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TILE_COLOURS[hash % TILE_COLOURS.length];
};

/**
 * Up to two initials, taken from the words that carry meaning.
 *
 * Short tokens are skipped because they are almost always file extensions and
 * conjunctions rather than the name: splitting "React.js / Next.js" gives
 * [React, js, Next, js], and taking the first two letters blindly produced
 * "RJ" — the R of React and the j of a file extension. Dropping anything under
 * three characters gets "RN", which is what the skill is actually called.
 */
const initialsOf = (name) => {
  const words = String(name)
    .split(/[\s/&(),.-]+/)
    .filter((w) => /[a-z0-9]/i.test(w));
  if (!words.length) return '?';

  const meaningful = words.filter((w) => w.length >= 3);
  const pick = meaningful.length ? meaningful : words;
  if (pick.length === 1) return pick[0].slice(0, 2).toUpperCase();
  return (pick[0][0] + pick[1][0]).toUpperCase();
};

// The ladder every skill climbs, weakest first.
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

// A ladder the student can read as a ladder. The four levels used to be four
// unrelated tints — grey, blue, violet, amber — which said "these are
// different" but never "this one is further on". Now they climb through the
// section's own families: untouched grey, then learning blue, then the
// journey's violet, then the green this section uses everywhere for mastered.
const LEVEL_STYLES = {
  Beginner: { chip: 'bg-surface-100 text-ink-600 ring-line-200', bar: 'bg-ink-300' },
  Intermediate: {
    chip: 'bg-blue-50 text-blue-700 ring-blue-100',
    bar: 'bg-gradient-to-r from-blue-500 to-cyan-400'
  },
  Advanced: {
    chip: 'bg-journey-50 text-journey-700 ring-journey-100',
    bar: 'bg-gradient-to-r from-journey-500 to-indigo-500'
  },
  Expert: {
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    bar: 'fp-done-gradient'
  }
};

// What one finished task is worth, matching the server exactly.
//
// It used to be added to EVERY tracked skill, which is why this page once hid
// the percentages: they were one number copied across every row. A task now
// credits only the skill it actually taught, so the percentages differ, mean
// something, and are worth showing.
const PER_TASK = 5;

const tasksToNextLevel = (progress) => Math.ceil((100 - (Number(progress) || 0)) / PER_TASK);

const nextLevel = (level) => LEVELS[LEVELS.indexOf(level) + 1] || null;

/** One skill: what it is, where it sits, and how far to the next rung. */
/** The bits every skill view needs, worked out once. */
function useSkillView(skill) {
  const progress = Math.max(0, Math.min(100, Number(skill.progress) || 0));
  // Bar and number driven by one hook so they land together. A CSS width
  // transition cannot do this: React paints the final width on the first frame,
  // leaving nothing to transition from.
  const width = useCountUp(progress, 900);
  const shown = useCountUp(progress, 900);
  return {
    progress,
    width,
    shown,
    style: LEVEL_STYLES[skill.level] || LEVEL_STYLES.Beginner,
    up: nextLevel(skill.level),
    left: tasksToNextLevel(progress),
    untouched: progress === 0,
    tile: tileFor(skill.skillName),
    initials: initialsOf(skill.skillName)
  };
}

/** One skill as a row: tile, name, bar, percentage, distance to the next rung. */
function SkillRow({ skill, index, highlight }) {
  const v = useSkillView(skill);

  return (
    <li
      className={`animate-fade-in-up flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors sm:px-5 ${
        highlight
          ? 'bg-journey-50/70 ring-1 ring-journey-300 ring-inset'
          : 'hover:bg-surface-50/70'
      }`}
      style={{ animationDelay: `${0.04 + index * 0.05}s` }}
    >
      <span
        aria-hidden
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-black text-white shadow-sm ${v.tile}`}
      >
        {v.initials}
      </span>

      <span
        className={`min-w-0 flex-1 basis-44 font-bold ${
          v.untouched ? 'text-ink-600' : 'text-ink-900'
        }`}
      >
        {skill.skillName}
      </span>

      <span className="flex min-w-0 flex-1 basis-40 items-center gap-3">
        <span
          role="progressbar"
          aria-valuenow={v.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${skill.skillName} progress`}
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-100"
        >
          <span className={`block h-full rounded-full ${v.style.bar}`} style={{ width: `${v.width}%` }} />
        </span>
        <span
          className={`w-11 shrink-0 text-right text-base font-black tabular-nums ${
            v.untouched ? 'text-ink-300' : 'text-ink-900'
          }`}
        >
          {v.shown}%
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        <span className="w-24 text-right text-xs leading-tight font-semibold text-ink-500">
          {v.up ? (
            <>
              {v.left} {v.left === 1 ? 'task' : 'tasks'} to
              <br />
              {v.up}
            </>
          ) : (
            <span className="font-black text-amber-700">Top level 🏅</span>
          )}
        </span>
        <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-ink-300" />
      </span>
    </li>
  );
}

/** The same skill as a card, for the grid. */
function SkillCard({ skill, index, highlight }) {
  const v = useSkillView(skill);

  return (
    <li
      className={`fp-lift animate-fade-in-up rounded-2xl border p-4 ${
        highlight ? 'border-journey-300 bg-journey-50/70 ring-1 ring-journey-200' : 'border-line-200 bg-surface'
      }`}
      style={{ animationDelay: `${0.04 + index * 0.05}s` }}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-black text-white shadow-sm ${v.tile}`}
        >
          {v.initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm leading-snug font-bold text-ink-900">
            {skill.skillName}
          </span>
        </span>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-black tabular-nums text-ink-900">{v.shown}%</span>
        <span className="text-xs font-semibold text-ink-500">
          {v.up ? `${v.left} to ${v.up}` : 'Top level 🏅'}
        </span>
      </div>

      <span
        role="progressbar"
        aria-valuenow={v.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${skill.skillName} progress`}
        className="mt-2 block h-2.5 overflow-hidden rounded-full bg-surface-100"
      >
        <span className={`block h-full rounded-full ${v.style.bar}`} style={{ width: `${v.width}%` }} />
      </span>
    </li>
  );
}

export default function Skills() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  // Rows or cards, over the same data. A list compares progress down a column;
  // a grid shows more skills at once. Presentation only — no second fetch.
  const [view, setView] = useState('list');

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const { data } = await api.get('/skills');
        setSkills(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSkills();
  }, []);

  /**
   * Grouped by level, but ordered by momentum.
   *
   * "Strongest level first" sounds right and reads wrong: a level is the
   * model's opening assessment of what the goal demands, not something earned
   * here, so a skill the student has never touched can sit at Advanced. Sorting
   * by level alone therefore put three untouched groups above the only skills
   * actually moving, and the page opened on work nobody had done.
   *
   * Groups are ordered by their furthest-along skill, and skills within a group
   * by their own progress. Level still labels each group — it just no longer
   * decides what the student sees first.
   */
  const groups = useMemo(() => {
    const byLevel = new Map(LEVELS.map((l) => [l, []]));
    skills.forEach((s) => {
      const level = byLevel.has(s.level) ? s.level : 'Beginner';
      byLevel.get(level).push(s);
    });

    const progressOf = (s) => Number(s.progress) || 0;

    return [...LEVELS]
      .reverse()
      .map((level) => ({
        level,
        items: byLevel
          .get(level)
          .sort((a, b) => progressOf(b) - progressOf(a) || a.skillName.localeCompare(b.skillName))
      }))
      .filter((g) => g.items.length > 0)
      // Momentum first, then the ladder as a tie-break.
      //
      // Sorting on momentum alone is right while something is actually moving,
      // but every untouched group scores zero — so with most skills at 0% the
      // comparator returned 0 for every pair and the browser's sort left them
      // in whatever order they arrived. On screen that read "Beginner,
      // Advanced, Intermediate", which is not an order at all. Equal momentum
      // now falls back to the rung, highest first.
      .sort((a, b) => {
        const momentum =
          Math.max(...b.items.map(progressOf)) - Math.max(...a.items.map(progressOf));
        if (momentum !== 0) return momentum;
        // Up the ladder, not down it. Highest-rung-first put Advanced above
        // Intermediate, which is a real order but reads as a mistake — nobody
        // scans a skill ladder backwards.
        return LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level);
      });
  }, [skills]);

  const started = useMemo(() => skills.filter((s) => (Number(s.progress) || 0) > 0).length, [skills]);

  // The one honest headline: how close the nearest skill is to levelling up.
  const closest = useMemo(() => {
    const climbing = skills.filter((s) => nextLevel(s.level));
    if (!climbing.length) return null;
    return climbing.reduce((best, s) =>
      tasksToNextLevel(s.progress) < tasksToNextLevel(best.progress) ? s : best
    );
  }, [skills]);

  if (loading) return <SkeletonPage cards={4} />;

  const avgProgress = skills.length
    ? Math.round(skills.reduce((sum, sk) => sum + (Number(sk.progress) || 0), 0) / skills.length)
    : 0;

  return (
    <div className="fp-enter space-y-4">
      {/* ---- The skill map. Everything in the inset card is real: the skill
              closest to levelling up, how many tasks that is, and what one
              finished task is actually worth. ---- */}
      <section className="fp-journey-gradient relative overflow-hidden rounded-3xl p-6 text-white shadow-float sm:p-8">
        <div aria-hidden className="fp-stars pointer-events-none absolute inset-0" />
        <div
          aria-hidden
          className="fp-float pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-fuchsia-500/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] max-w-[380px] [mask-image:linear-gradient(to_right,transparent,black_26%)] md:block"
        >
          <SkillMapArt />
        </div>

        <div className="relative max-w-xl">
          <p className="text-[0.68rem] font-black tracking-[0.18em] text-journey-300 uppercase">
            Skill tracker
          </p>
          <h1 className="mt-2 text-3xl leading-tight font-black sm:text-4xl">
            Your skill map <span aria-hidden>🧠</span>
          </h1>
          <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-journey-100">
            Each skill you build today brings you closer to your dream career.
          </p>

          {closest && (
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-white/[0.12] p-4 ring-1 ring-white/15 ring-inset">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-amber-300">
                <Zap className="h-5 w-5 fill-amber-300/30" />
              </span>
              <div className="min-w-0 flex-1 basis-56">
                <p className="text-sm leading-snug font-bold">
                  {tasksToNextLevel(closest.progress)}{' '}
                  {tasksToNextLevel(closest.progress) === 1 ? 'task' : 'tasks'} until{' '}
                  <span className="text-amber-300">{closest.skillName}</span> reaches{' '}
                  {nextLevel(closest.level)}
                </p>
                <p className="mt-1 text-xs text-journey-200">
                  A finished task adds {PER_TASK}% to the skill it taught.
                </p>
              </div>
              <Link
                to="/career/planner"
                className="fp-press group inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-journey-600 to-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-journey-900/30 transition-all hover:from-journey-700 hover:to-indigo-700"
              >
                Today&apos;s task
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {skills.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No skills tracked yet"
          description="Your AI mentor creates a skill set when it generates your task plan. Head to the planner to get started."
          accent="violet"
          action={
            <Link to="/career/planner">
              <Button icon={Target}>Go to Planner</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* ---- Grouped by level, strongest first, with each skill's own
                  progress on its row. Level answers "how far have I come
                  overall", the bar answers "how close is this one" — two
                  different questions that used to share a single number. ---- */}
          <Card padded={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-100 px-4 py-3.5 sm:px-5">
              <p className="flex items-center gap-2 text-sm text-ink-500">
                <Sparkles className="h-4 w-4 shrink-0 text-journey-400" />
                <span>
                  <span className="font-bold text-ink-900">
                    {started} of {skills.length}
                  </span>{' '}
                  started. Finishing today&apos;s task moves whichever skill it teaches.
                </span>
              </p>

              <div
                role="group"
                aria-label="Skill layout"
                className="flex shrink-0 items-center gap-1 rounded-xl border border-line-200 bg-surface-50 p-1"
              >
                {[
                  ['list', 'List view', ListIcon],
                  ['grid', 'Grid view', LayoutGrid]
                ].map(([mode, label, Icon]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setView(mode)}
                    aria-pressed={view === mode}
                    className={`fp-press inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                      view === mode
                        ? 'bg-surface text-journey-700 shadow-sm ring-1 ring-journey-200'
                        : 'text-ink-500 hover:text-journey-700'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-line-100">
              {groups.map((group) => {
                const style = LEVEL_STYLES[group.level];
                return (
                  <section key={group.level}>
                    <div className="flex items-center gap-3 bg-surface-50/70 px-4 py-2.5 sm:px-5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ring-inset ${style.chip}`}
                      >
                        {group.level}
                      </span>
                      <span className="text-sm font-semibold text-ink-500">
                        {group.items.length} {group.items.length === 1 ? 'skill' : 'skills'}
                      </span>
                    </div>

                    {view === 'list' ? (
                      <ul className="divide-y divide-line-100">
                        {group.items.map((skill, i) => (
                          <SkillRow
                            key={skill._id}
                            skill={skill}
                            index={i}
                            highlight={closest?._id === skill._id}
                          />
                        ))}
                      </ul>
                    ) : (
                      <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                        {group.items.map((skill, i) => (
                          <SkillCard
                            key={skill._id}
                            skill={skill}
                            index={i}
                            highlight={closest?._id === skill._id}
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          </Card>

          <SkillsBanner percent={avgProgress} />
        </>
      )}
    </div>
  );
}
