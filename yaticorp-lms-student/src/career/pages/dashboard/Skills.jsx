import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Target, Zap, Check } from 'lucide-react';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import { SkeletonPage } from '../../components/ui/Skeleton';

// The ladder every skill climbs, weakest first.
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

const LEVEL_STYLES = {
  Beginner: { chip: 'bg-surface-100 text-ink-600 ring-line-200', bar: 'bg-ink-400' },
  Intermediate: { chip: 'bg-brand-50 text-link-strong ring-brand-100', bar: 'bg-brand-500' },
  Advanced: { chip: 'bg-violet-50 text-violet-700 ring-violet-100', bar: 'bg-violet-500' },
  Expert: { chip: 'bg-amber-50 text-amber-700 ring-amber-100', bar: 'bg-amber-500' }
};

// What one finished task is worth, matching the server exactly. Every skill
// moves by this much, which is why the page talks about tasks rather than
// percentages — "four tasks away" is something a student can act on.
const PER_TASK = 5;

const tasksToNextLevel = (progress) => Math.ceil((100 - (Number(progress) || 0)) / PER_TASK);

const nextLevel = (level) => LEVELS[LEVELS.indexOf(level) + 1] || null;

/** One skill: what it is, where it sits, and how far to the next rung. */
function SkillRow({ skill }) {
  const style = LEVEL_STYLES[skill.level] || LEVEL_STYLES.Beginner;
  const progress = Math.max(0, Math.min(100, Number(skill.progress) || 0));
  const up = nextLevel(skill.level);
  const left = tasksToNextLevel(progress);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5">
      <span className="min-w-0 flex-1 basis-48 truncate font-semibold text-ink-900">
        {skill.skillName}
      </span>

      {/* The meter is deliberately slim and unlabelled. The number underneath it
          used to be the loudest thing on the card, and it is the same number on
          every skill — the sentence beside it is what the student can act on. */}
      <span className="flex min-w-0 flex-1 basis-40 items-center gap-3">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-100">
          <span
            className={`block h-full rounded-full ${style.bar} transition-[width] duration-700 ease-out`}
            style={{ width: `${Math.max(3, progress)}%` }}
          />
        </span>
      </span>

      <span className="shrink-0 text-sm text-ink-500 tabular-nums">
        {up ? (
          <>
            <span className="font-semibold text-ink-700">{left}</span>
            {left === 1 ? ' task to ' : ' tasks to '}
            <span className="font-medium">{up}</span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
            <Check className="h-3.5 w-3.5" />
            Top level
          </span>
        )}
      </span>
    </li>
  );
}

export default function Skills() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Grouped by level, strongest first. Level is the only thing that genuinely
  // differs between these — every finished task advances all of them by the
  // same amount, so four separate percentages were four copies of one number
  // dressed up as four measurements.
  const groups = useMemo(() => {
    const byLevel = new Map(LEVELS.map((l) => [l, []]));
    skills.forEach((s) => {
      const level = byLevel.has(s.level) ? s.level : 'Beginner';
      byLevel.get(level).push(s);
    });
    return [...LEVELS]
      .reverse()
      .map((level) => ({
        level,
        items: byLevel.get(level).sort((a, b) => a.skillName.localeCompare(b.skillName))
      }))
      .filter((g) => g.items.length > 0);
  }, [skills]);

  // The one honest headline: how close the nearest skill is to levelling up.
  const closest = useMemo(() => {
    const climbing = skills.filter((s) => nextLevel(s.level));
    if (!climbing.length) return null;
    return climbing.reduce((best, s) =>
      tasksToNextLevel(s.progress) < tasksToNextLevel(best.progress) ? s : best
    );
  }, [skills]);

  if (loading) return <SkeletonPage cards={4} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Skill Tracker"
        title="Your Skills"
        subtitle="Every task you finish moves all of these forward. Reach the end of a bar and the skill levels up."
      />

      {skills.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No skills tracked yet"
          description="Your AI mentor creates a skill set when it generates your task plan. Head to the planner to get started."
          action={
            <Link to="/career/planner">
              <Button icon={Target}>Go to Planner</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* One meter, not one per skill — because there is only one number
              behind them. It says what the next thing to happen is and what
              causes it, which the four identical bars never did. */}
          {closest && (
            <Card className="animate-fade-in-up border-brand-100 bg-surface-50">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-link shadow-sm">
                  <Zap className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1 basis-64">
                  <p className="font-bold text-ink-900">
                    {tasksToNextLevel(closest.progress)}{' '}
                    {tasksToNextLevel(closest.progress) === 1 ? 'task' : 'tasks'} until{' '}
                    <span className="text-link-strong">{closest.skillName}</span> reaches{' '}
                    {nextLevel(closest.level)}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-500">
                    Each finished task adds {PER_TASK}% to every skill you are tracking.
                  </p>
                </div>
                <Link to="/career/planner" className="shrink-0">
                  <Button size="sm">Today&apos;s task</Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Grouped by level. A student reads "I have two at Intermediate and
              two at Beginner" at a glance, which is the actual state of things
              — the old grid made them compare four identical percentages to
              work the same fact out. */}
          <div className="stagger space-y-5">
            {groups.map((group) => {
              const style = LEVEL_STYLES[group.level];
              return (
                <Card key={group.level} padded={false} className="overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-line-100 bg-surface-50/70 px-4 py-3 sm:px-5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${style.chip}`}
                    >
                      {group.level}
                    </span>
                    <span className="text-sm font-medium text-ink-500">
                      {group.items.length} {group.items.length === 1 ? 'skill' : 'skills'}
                    </span>
                  </div>
                  <ul className="divide-y divide-line-100">
                    {group.items.map((skill) => (
                      <SkillRow key={skill._id} skill={skill} />
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
