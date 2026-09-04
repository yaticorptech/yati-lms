import { useState, useEffect, useMemo, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { ArrowRight, CheckCircle2, Flame, Lock, Sparkles, Target, Trophy, Zap } from 'lucide-react';
import BuildSkillsBanner from '../../components/journey/BuildSkillsBanner';
import SkillRail from '../../components/progress/SkillRail';
import useCountUp from '../../../hooks/useCountUp';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import { SkeletonPage } from '../../components/ui/Skeleton';
import {
  LEVELS, PER_TASK, TASK_XP, initialsOf, nextLevel, progressOf, statusOf, tasksToNextLevel, tileFor, tilesFor
} from '../../utils/skills';
import { currentStreak } from '../../utils/progress';

/**
 * The Skills page.
 *
 * Left: the banner, then the tracker in three bands — what is moving, what
 * is mastered, and what is waiting. Right: a rail of the numbers the list
 * cannot carry.
 *
 * It used to be eleven identical rows, seven of them grey lines at 0% each
 * repeating "+10 XP", "No task today" and "20 tasks to Intermediate". That
 * reads as a list of things not done. The rule that every task pays the same
 * is now said once, in the header; a row only mentions today's task when
 * there is one; and the untouched skills sit in a compact grid instead of
 * pretending to be progress bars.
 */

// A ladder the student can read as a ladder: untouched grey, then learning
// blue, then the journey's violet, then the green this page uses everywhere
// for mastered.
const LEVEL_STYLES = {
  Beginner: { chip: 'bg-surface-100 text-ink-600 ring-line-200', bar: 'bg-gradient-to-r from-journey-400 to-journey-600' },
  Intermediate: { chip: 'bg-blue-50 text-blue-700 ring-blue-100', bar: 'bg-gradient-to-r from-blue-500 to-cyan-400' },
  Advanced: { chip: 'bg-journey-50 text-journey-700 ring-journey-100', bar: 'bg-gradient-to-r from-journey-500 to-indigo-500' },
  Expert: { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100', bar: 'fp-done-gradient' }
};

const levelOf = (s) => (LEVELS.includes(s.level) ? s.level : 'Beginner');

function Tile({ tile, name, className = 'h-11 w-11 text-sm' }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-black text-white shadow-sm ${className} ${tile}`}
    >
      {initialsOf(name)}
    </span>
  );
}

function LevelChip({ level, className = '' }) {
  return (
    <span
      className={`inline-block rounded-md px-1.5 py-0.5 text-[0.64rem] font-bold ring-1 ring-inset ${LEVEL_STYLES[level].chip} ${className}`}
    >
      {level}
    </span>
  );
}

/** One skill that is moving: the bar, the distance to the next rung, and today's task if there is one. */
function ActiveRow({ skill, task, tile, index, closest }) {
  const progress = progressOf(skill);
  // Bar and number driven by one hook so they land together. A CSS width
  // transition cannot do this: React paints the final width on the first frame,
  // leaving nothing to transition from.
  const width = useCountUp(progress, 900);
  const shown = useCountUp(progress, 900);
  const level = levelOf(skill);
  const up = nextLevel(level);
  const left = tasksToNextLevel(progress);

  return (
    <li
      className={`animate-fade-in-up rounded-2xl p-4 transition-colors ${
        closest ? 'bg-journey-50/60 ring-1 ring-journey-200' : 'hover:bg-surface-50/70'
      }`}
      style={{ animationDelay: `${0.04 + index * 0.06}s` }}
    >
      <div className="flex items-start gap-3.5">
        <Tile tile={tile} name={skill.skillName} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-bold text-ink-900">{skill.skillName}</p>
            <LevelChip level={level} />
            {closest && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[0.64rem] font-black text-amber-700 ring-1 ring-amber-100 ring-inset">
                <Flame className="h-3 w-3" />
                Closest to levelling up
              </span>
            )}
          </div>

          <div className="mt-2.5 flex items-center gap-3">
            <span
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${skill.skillName} progress`}
              className="block h-2.5 flex-1 overflow-hidden rounded-full bg-surface-100"
            >
              <span className={`block h-full rounded-full ${LEVEL_STYLES[level].bar}`} style={{ width: `${width}%` }} />
            </span>
            <span className="w-11 shrink-0 text-right text-sm font-black tabular-nums text-ink-900">{shown}%</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-xs font-semibold text-ink-500">
              {up ? (
                <>
                  <span className="font-black text-ink-700">{left}</span> more {left === 1 ? 'task' : 'tasks'} to reach{' '}
                  <span className="font-black text-journey-700">{up}</span>
                </>
              ) : (
                <span className="font-black text-amber-700">Top level reached 🏅</span>
              )}
            </p>
            {task && (
              <Link
                to="/career/planner"
                className="fp-press group inline-flex max-w-full items-center gap-2 rounded-xl bg-gradient-to-r from-journey-600 to-indigo-600 py-1.5 pr-3 pl-2.5 text-xs font-black text-white shadow-md shadow-journey-500/25 transition-all hover:from-journey-700 hover:to-indigo-700"
              >
                <Zap className="h-3.5 w-3.5 shrink-0 fill-amber-300 text-amber-300" />
                <span className="truncate">Today: {task.title}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/** A skill the student has finished. Green, quiet, and proud of it. */
function MasteredRow({ skill, tile, index }) {
  return (
    <li
      className="animate-fade-in-up flex items-center gap-3 rounded-2xl bg-emerald-50/60 p-3 ring-1 ring-emerald-100 ring-inset"
      style={{ animationDelay: `${0.04 + index * 0.05}s` }}
    >
      <Tile tile={tile} name={skill.skillName} className="h-10 w-10 text-xs" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-ink-900">{skill.skillName}</span>
        <LevelChip level={levelOf(skill)} className="mt-1" />
      </span>
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden />
    </li>
  );
}

/** A skill not yet started. Small on purpose: it is a door, not a debt. */
function WaitingCard({ skill, tile, task, index }) {
  return (
    <li
      className="animate-fade-in-up flex items-center gap-3 rounded-2xl border border-dashed border-line-300 bg-surface p-3 transition-colors hover:border-journey-300 hover:bg-journey-50/40"
      style={{ animationDelay: `${0.04 + index * 0.04}s` }}
    >
      <Tile tile={tile} name={skill.skillName} className="h-10 w-10 text-xs opacity-80" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm leading-snug font-bold text-ink-800">{skill.skillName}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <LevelChip level={levelOf(skill)} />
          {task ? (
            <Link to="/career/planner" className="text-[0.66rem] font-black text-journey-700 hover:underline">
              Starts today →
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 text-[0.66rem] font-semibold text-ink-400">
              <Lock className="h-2.5 w-2.5" />
              Not started
            </span>
          )}
        </span>
      </span>
    </li>
  );
}

function BandHeader({ icon: Icon, tone, title, count, hint }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="flex items-center gap-2 text-sm font-black text-ink-900">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-inset ${tone}`}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
        {title}
        <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs font-bold text-ink-500 tabular-nums">{count}</span>
      </p>
      {hint && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export default function Skills() {
  const { user } = useContext(AuthContext);
  const [skills, setSkills] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [badges, setBadges] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Tasks, badges and history are garnish on the skill list, so none of
        // them failing may take the list down with it. The streak spans days,
        // so it has to come from history — `/tasks` is today's plan only.
        const [skillRes, taskRes, badgeRes, historyRes] = await Promise.all([
          api.get('/skills'),
          api.get('/tasks').catch(() => null),
          api.get('/badges').catch(() => null),
          api.get('/tasks/history').catch(() => null)
        ]);
        setSkills(Array.isArray(skillRes.data) ? skillRes.data : []);
        const t = taskRes?.data;
        setTasks(Array.isArray(t) ? t : t?.tasks || []);
        setBadges(Array.isArray(badgeRes?.data) ? badgeRes.data : []);
        setHistory(Array.isArray(historyRes?.data) ? historyRes.data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Today's unfinished task for each skill, by the name the task names.
  const taskFor = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => {
      if (t.skill && t.status !== 'Completed' && !map.has(t.skill)) map.set(t.skill, t);
    });
    return map;
  }, [tasks]);

  const tiles = useMemo(() => tilesFor(skills), [skills]);

  // Level pills, only the rungs with something on them. "All" always shows.
  const pills = useMemo(
    () =>
      [
        { key: 'all', label: 'All', count: skills.length },
        ...LEVELS.map((l) => ({ key: l, label: l, count: skills.filter((s) => levelOf(s) === l).length }))
      ].filter((p) => p.key === 'all' || p.count > 0),
    [skills]
  );

  const visible = useMemo(
    () => skills.filter((s) => filter === 'all' || levelOf(s) === filter),
    [skills, filter]
  );

  // Three bands. Moving skills lead, furthest-along first; the rest sit in
  // rung order, then by name.
  const byName = (a, b) => String(a.skillName).localeCompare(String(b.skillName));
  const active = visible.filter((s) => statusOf(s) === 'active').sort((a, b) => progressOf(b) - progressOf(a) || byName(a, b));
  const mastered = visible.filter((s) => statusOf(s) === 'completed').sort(byName);
  const waiting = visible
    .filter((s) => statusOf(s) === 'pending')
    .sort((a, b) => LEVELS.indexOf(levelOf(a)) - LEVELS.indexOf(levelOf(b)) || byName(a, b));

  const started = skills.filter((s) => progressOf(s) > 0).length;
  const completed = skills.filter((s) => statusOf(s) === 'completed').length;
  const streak = currentStreak(history);

  // The one honest headline: the moving skill closest to levelling up.
  const closest = useMemo(() => {
    const climbing = skills.filter((s) => statusOf(s) === 'active' && nextLevel(levelOf(s)));
    if (!climbing.length) return null;
    return climbing.reduce((best, s) =>
      tasksToNextLevel(s.progress) < tasksToNextLevel(best.progress) ? s : best
    );
  }, [skills]);

  if (loading) return <SkeletonPage cards={4} />;

  return (
    <div className="fp-enter grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_296px]">
      <div className="min-w-0 space-y-4">
        <BuildSkillsBanner xp={user?.xp} completed={completed} streak={streak} />

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
          <Card padded={false} className="overflow-hidden">
            {/* ---- Header: the rule of the game, said once ---- */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-100 px-4 py-3.5 sm:px-5">
              <p className="flex items-center gap-2 text-sm text-ink-500">
                <Sparkles className="h-4 w-4 shrink-0 text-journey-400" />
                <span>
                  <span className="font-bold text-ink-900">
                    {started} of {skills.length}
                  </span>{' '}
                  started. Every finished task adds{' '}
                  <span className="font-bold text-journey-700">{PER_TASK}%</span> to the skill it teaches and pays{' '}
                  <span className="font-bold text-amber-600">+{TASK_XP} XP</span>.
                </span>
              </p>

              <div role="tablist" aria-label="Filter skills by level" className="flex flex-wrap gap-1.5">
                {pills.map((p) => {
                  const on = filter === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setFilter(p.key)}
                      className={`fp-press inline-flex min-h-7 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                        on
                          ? 'bg-journey-600 text-white shadow-md shadow-journey-500/25'
                          : 'bg-surface-50 text-ink-600 ring-1 ring-line-200 ring-inset hover:bg-surface-100 hover:text-ink-900'
                      }`}
                    >
                      {p.label}
                      <span className={`tabular-nums ${on ? 'text-white/80' : 'text-ink-400'}`}>{p.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6 p-4 sm:p-5">
              {/* ---- IN PROGRESS ---- */}
              {active.length > 0 && (
                <section>
                  <BandHeader
                    icon={Flame}
                    tone="bg-amber-50 text-amber-600 ring-amber-100"
                    title="In progress"
                    count={active.length}
                    hint="Keep the momentum — these move first."
                  />
                  <ul className="mt-3 space-y-1.5">
                    {active.map((skill, i) => (
                      <ActiveRow
                        key={skill._id || skill.skillName}
                        skill={skill}
                        task={taskFor.get(skill.skillName)}
                        tile={tiles.get(skill.skillName) || tileFor(skill.skillName)}
                        index={i}
                        closest={closest?._id === skill._id}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {/* ---- MASTERED ---- */}
              {mastered.length > 0 && (
                <section>
                  <BandHeader
                    icon={Trophy}
                    tone="bg-emerald-50 text-emerald-600 ring-emerald-100"
                    title="Mastered"
                    count={mastered.length}
                    hint="Done. These already count as experience."
                  />
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {mastered.map((skill, i) => (
                      <MasteredRow
                        key={skill._id || skill.skillName}
                        skill={skill}
                        tile={tiles.get(skill.skillName) || tileFor(skill.skillName)}
                        index={i}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {/* ---- WAITING ---- */}
              {waiting.length > 0 && (
                <section>
                  <BandHeader
                    icon={Target}
                    tone="bg-journey-50 text-journey-600 ring-journey-100"
                    title="Ready when you are"
                    count={waiting.length}
                    hint="One finished task is all it takes to get a skill moving."
                  />
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {waiting.map((skill, i) => (
                      <WaitingCard
                        key={skill._id || skill.skillName}
                        skill={skill}
                        task={taskFor.get(skill.skillName)}
                        tile={tiles.get(skill.skillName) || tileFor(skill.skillName)}
                        index={i}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {visible.length === 0 && (
                <p className="flex items-center gap-2 rounded-xl bg-surface-50 px-4 py-3 text-sm text-ink-500">
                  <Target className="h-4 w-4 shrink-0 text-journey-400" />
                  No {filter} skills yet.
                </p>
              )}
            </div>
          </Card>
        )}
      </div>

      <SkillRail skills={skills} user={user} badges={badges} />
    </div>
  );
}
