import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Target, Flame, CheckCircle2, Clock3, TrendingUp, Award,
  RotateCcw, Trophy, CalendarDays, GraduationCap, Building2, Compass
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Card, { CardHeader } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ProgressBar from '../components/ui/ProgressBar';
import StatCard from '../components/ui/StatCard';
import { levelProgress } from '../utils/progress';

// Title-casing these would produce "Mca" or "Qa Engineer", which reads worse
// than the lowercase original. Degrees and tech terms stay uppercase.
const ACRONYMS = new Set([
  'mca', 'bca', 'mba', 'bba', 'msc', 'bsc', 'mcom', 'bcom',
  'llb', 'llm', 'mbbs', 'phd', 'ms', 'ba', 'ma', 'be', 'me',
  'it', 'cs', 'cse', 'ece', 'qa', 'ui', 'ux', 'hr', 'ai', 'ml', 'sql', 'css',
  'html', 'js', 'php', 'api', 'ios', 'aws', 'seo'
]);

// Degrees people type without punctuation, where neither plain title-case nor
// full uppercase is right ("Btech" / "BTECH" instead of "B.Tech").
const SPECIAL = { btech: 'B.Tech', mtech: 'M.Tech', bdes: 'B.Des', mdes: 'M.Des' };

/**
 * Goals are typed by hand, so "developer" / "mca" / "ui/ux" arrive lowercase.
 *
 * Cased per punctuation-separated part rather than per word, so "b.tech" and
 * "ui/ux" resolve each side independently instead of shouting the whole token.
 */
const titleCase = (text) =>
  String(text || '')
    .trim()
    .split(/(\s+)/)
    .map((token) => {
      const bare = token.replace(/[^a-z0-9]/gi, '').toLowerCase();
      if (SPECIAL[bare]) return SPECIAL[bare];

      return token
        .split(/([^a-z0-9]+)/i)
        .map((part) => {
          if (!/[a-z0-9]/i.test(part)) return part; // punctuation, keep as-is
          if (ACRONYMS.has(part.toLowerCase())) return part.toUpperCase();
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join('');
    })
    .join('');

/**
 * Where the student started, described by the fields that matter for THEIR
 * level.
 *
 * Onboarding keeps every field it has ever collected, so a postgraduate can
 * still carry a stale `currentClass` from an earlier answer. Reading that first
 * printed "class 5 · 2nd" for an MCA student — so each level now reads only the
 * fields that belong to it.
 */
const describeStart = (goal) => {
  if (!goal) return { title: '', detail: null };
  const level = goal.educationLevel || '';

  if (level === 'Working Professional') {
    const years = Number(goal.experience);
    return {
      title: titleCase(goal.currentJob) || 'Working Professional',
      detail: years ? `${years} year${years === 1 ? '' : 's'} of experience` : level
    };
  }

  if (['Undergraduate', 'Postgraduate', 'Diploma'].includes(level)) {
    const course = [goal.degree, goal.specialization].filter(Boolean).map(titleCase).join(' · ');
    return {
      title: course || level,
      detail: [level, goal.currentYear].filter(Boolean).join(' · ')
    };
  }

  // School levels are the only ones where currentClass is meaningful.
  return { title: titleCase(goal.currentClass) || level, detail: goal.currentClass ? level : null };
};

/** One labelled fact in the header band. */
const Fact = ({ icon: Icon, label, value, detail, detailIcon: DetailIcon }) => (
  <div className="bg-surface p-5">
    <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-400 uppercase">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </p>
    <p className="mt-1.5 font-semibold text-ink-900">{value || '—'}</p>
    {detail && (
      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-500">
        {DetailIcon && <DetailIcon className="h-3.5 w-3.5 shrink-0" />}
        {detail}
      </p>
    )}
  </div>
);

export default function Profile() {
  const { user, loading } = useContext(AuthContext);
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [redoingId, setRedoingId] = useState(null);

  // No signed-out redirect here. This page renders inside ProtectedRoute, which
  // already holds it back until there is a session, so the old bounce to /login
  // was unreachable — and /login no longer exists to bounce to.

  useEffect(() => {
    if (!user) return;

    api
      .get('/profile/summary')
      .then(({ data }) => setSummary(data))
      .catch(() => setSummary(null))
      .finally(() => setLoadingSummary(false));
  }, [user]);

  const handleRedo = async (task) => {
    setRedoingId(task._id);
    try {
      await api.post(`/profile/skipped/${task._id}/redo`);
      // Drop it locally rather than refetching — the row is gone from the
      // skipped list the moment it moves back onto today's plan.
      setSummary((prev) => ({
        ...prev,
        skippedTasks: prev.skippedTasks.filter((t) => t._id !== task._id),
        stats: { ...prev.stats, skipped: Math.max(0, prev.stats.skipped - 1) }
      }));
      toast.success(`"${task.title}" is back on today's plan.`, 'Added back');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not move that task.');
    } finally {
      setRedoingId(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const stats = summary?.stats;
  const goal = summary?.goal;
  const startedAt = describeStart(goal);
  const levelInfo = levelProgress(user.xp, user.level);

  return (
    // No page padding here: this renders inside DashboardLayout, which already
    // supplies the max width and gutters.
    <div className="space-y-6">
      {/* Identity + the goal everything is pointed at */}
      <Card padded={false} className="overflow-hidden">
        {/* The same gradient and dot field as the streak tile and the roadmap
            hero. A flat brand-700 slab was the only header in the app that did
            not look like the others. */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-900 to-slate-900 p-6 text-white sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          />

          <div className="relative flex flex-wrap items-center gap-x-6 gap-y-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-3xl font-black ring-1 ring-white/25 ring-inset">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold sm:text-3xl">{user.name}</h1>
              <p className="mt-0.5 text-sm text-brand-200">{user.email}</p>
            </div>

            {/* Level and XP were two static chips restating the sidebar. Shown
                as progress instead, they answer the question a student actually
                has here: how far is the next one. */}
            <div className="w-full sm:w-64">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold">
                  <Trophy className="h-3.5 w-3.5 text-amber-300" />
                  Level {user.level ?? 1}
                </span>
                <span className="text-xs font-semibold text-brand-200 tabular-nums">
                  {levelInfo.into} / {levelInfo.span} XP
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400 transition-[width] duration-1000 ease-out"
                  style={{ width: `${levelInfo.percent}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-brand-200">
                {levelInfo.remaining > 0
                  ? `${levelInfo.remaining} XP to Level ${levelInfo.nextLevel}`
                  : `Level ${levelInfo.nextLevel} unlocked`}
              </p>
            </div>
          </div>
        </div>

        {goal && (
          <>
            {/* Three short facts of equal weight. The long "where you are"
                paragraph used to sit in the third column, so one cell ran to ten
                lines while the others ran to two — it now has its own row below. */}
            <div className="grid gap-px bg-surface-100 sm:grid-cols-3">
              <Fact icon={GraduationCap} label="Starting from" value={startedAt.title} detail={startedAt.detail} />
              <Fact icon={Target} label="Working towards" value={titleCase(goal.careerGoal)} detail={goal.dreamCompany ? titleCase(goal.dreamCompany) : null} detailIcon={Building2} />
              <Fact
                icon={CalendarDays}
                label="Progress"
                value={stats?.daysPlanned > 0 ? `Day ${stats.daysPlanned}` : 'Just started'}
                detail={stats?.daysPlanned > 0 ? 'of your plan' : 'Your plan begins today'}
              />
            </div>

            {summary?.currentStage && (
              <div className="border-t border-line-100 bg-surface-50/60 p-5 sm:px-6">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-400 uppercase">
                  <Compass className="h-3.5 w-3.5" />
                  Where you are now
                </p>
                <p className="max-w-3xl leading-relaxed text-ink-700">{summary.currentStage}</p>
              </div>
            )}
          </>
        )}
      </Card>

      {loadingSummary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      ) : !summary ? (
        <Card>
          <EmptyState
            icon={Target}
            title="No progress to show yet"
            description="Set your goal and generate a roadmap, and your daily plan and progress will appear here."
            action={
              <Link to="/career/roadmap">
                <Button size="sm">Go to Roadmap</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Flame}
              label="Day streak"
              value={stats.streak}
              accent="amber"
              hint={stats.streak > 0 ? 'Keep it alive today' : 'Finish a task to begin one'}
            />
            <StatCard
              icon={CheckCircle2}
              label="Tasks done"
              value={stats.completed}
              accent="emerald"
              hint={stats.daysPlanned > 0 ? `Across ${stats.daysPlanned} days` : 'Your first day'}
            />
            {/* Brand blue, not red. This is a backlog to pick from, not a
                failure record — colouring it like an error makes people avoid
                the page that is supposed to help them catch up. */}
            <StatCard
              icon={Clock3}
              label="Still to do"
              value={stats.skipped}
              accent="brand"
              hint={stats.skipped > 0 ? 'Pick any back up below' : 'Nothing outstanding'}
            />
            <StatCard
              icon={TrendingUp}
              label="Completion rate"
              value={stats.completionRate}
              suffix="%"
              accent="violet"
              fill={stats.completionRate}
              hint={`${stats.completed} of ${stats.completed + stats.skipped} finished`}
            />
          </div>

          {/* Skipped work — the accountability half of the plan. */}
          <Card>
            <CardHeader
              icon={Clock3}
              title="Still to do"
              subtitle="Tasks the day ran out on. Pick any back up whenever you're ready."
              accent="amber"
            />

            {summary.skippedTasks.length === 0 ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-5 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
                <p className="font-semibold text-ink-900">All caught up</p>
                <p className="mt-0.5 text-sm text-ink-600">
                  You've finished every task assigned to you so far.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line-100">
                {summary.skippedTasks.map((task) => (
                  <li key={task._id} className="flex flex-wrap items-start gap-4 py-3.5 first:pt-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-ink-900">{task.title}</h3>
                        {/* A repeat is a signal the task is too big, not a
                            demerit — stated plainly, without a red badge. */}
                        {task.times > 1 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                            came up {task.times} times
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-1 text-sm leading-relaxed text-ink-500">{task.description}</p>
                      )}
                      {task.lastSkippedAt && (
                        <p className="mt-1.5 text-xs text-ink-400">
                          Last on your plan {new Date(task.lastSkippedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={RotateCcw}
                      loading={redoingId === task._id}
                      loadingText="Adding…"
                      onClick={() => handleRedo(task)}
                    >
                      Do it today
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {summary.skills?.length > 0 && (
            <Card>
              <CardHeader icon={TrendingUp} title="Skills" subtitle="Built up as you complete tasks" accent="brand" />
              <div className="space-y-4">
                {summary.skills.map((skill) => (
                  <div key={skill._id}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink-800">{skill.skillName}</span>
                      <span className="rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-bold text-ink-600">
                        {skill.level}
                      </span>
                    </div>
                    <ProgressBar value={skill.progress || 0} tone="brand" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {summary.achievements?.length > 0 && (
            <Card>
              <CardHeader icon={Award} title="Achievements" accent="amber" />
              <ul className="grid gap-3 sm:grid-cols-2">
                {summary.achievements.map((item) => (
                  <li
                    key={item._id}
                    className="flex items-start gap-3 rounded-xl border border-line-200/80 bg-surface-50/60 p-3.5"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                      <Award className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-900">{item.title}</p>
                      <p className="mt-0.5 text-sm text-ink-500">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
