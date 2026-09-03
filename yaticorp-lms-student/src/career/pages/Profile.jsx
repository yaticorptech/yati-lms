import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame, CheckCircle2, TrendingUp, Award, RotateCcw, GraduationCap,
  Compass, CalendarDays, MapPin, ArrowRight, Zap, Check, Lock, Flag
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Card, { CardHeader } from '../components/ui/Card';
import ProgressArt from '../components/progress/ProgressArt';
import SkillsArt from '../components/progress/SkillsArt';
import ProgressStats from '../components/progress/ProgressStats';
import { levelProgress, dayKey } from '../utils/progress';
import { phaseStates, journeyPercent, phaseTitle, parseChoices } from '../utils/roadmap';

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

/** One labelled fact in the band under the header. */
const Fact = ({ icon: Icon, label, value, detail }) => (
  <div className="min-w-0">
    <p className="flex items-center gap-1.5 text-[0.68rem] font-black tracking-[0.11em] text-ink-400 uppercase">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </p>
    <p className="mt-1 font-black break-words text-ink-900">{value || '—'}</p>
    {detail && <p className="mt-0.5 text-sm text-ink-500">{detail}</p>}
  </div>
);

/**
 * The roadmap as a slim track: where the student has been, where they stand,
 * and how much is left. Phase names are the real ones from the generated
 * roadmap — nothing here is a stock label.
 */
function RoadmapTrack({ phases, completedPhases, percent }) {
  const states = phaseStates(phases.length, completedPhases);
  const currentIndex = states.indexOf('current');

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[0.68rem] font-black tracking-[0.11em] text-ink-400 uppercase">
          <MapPin className="h-3.5 w-3.5" />
          Roadmap progress
        </p>
        <p className="text-sm font-black text-ink-900 tabular-nums">
          {currentIndex >= 0 ? `Phase ${currentIndex + 1} of ${phases.length}` : 'Every phase complete'}
          <span className="text-ink-400"> · {percent}%</span>
        </p>
      </div>

      {/* The nodes keep a fixed 5rem column so labels never clip, but the
          connectors take every remaining pixel — so four phases stretch to
          both edges instead of bunching at the left, and a long roadmap still
          scrolls rather than squeezing. */}
      <ol className="flex items-start overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {phases.map((phase, index) => {
          const state = states[index];
          const done = state === 'done';
          const current = state === 'current';
          const lead = parseChoices(phaseTitle(phase))?.lead || phaseTitle(phase);

          return (
            <li key={index} className={`flex items-start ${index > 0 ? 'min-w-24 flex-1' : ''}`}>
              {index > 0 && (
                <span
                  aria-hidden
                  className={`mt-[1.05rem] h-1 min-w-4 flex-1 rounded-full ${
                    states[index - 1] === 'done' ? 'bg-emerald-400' : 'bg-line-200'
                  }`}
                />
              )}
              <div className="flex w-20 shrink-0 flex-col items-center px-1 text-center">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    done
                      ? 'fp-done-gradient text-white'
                      : current
                        ? 'fp-journey-gradient text-white shadow-lg shadow-journey-600/30'
                        : 'bg-surface-100 text-ink-400 ring-1 ring-line-200 ring-inset'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : current ? index + 1 : <Lock className="h-3.5 w-3.5" />}
                </span>
                <span className={`mt-1.5 text-[0.68rem] font-black ${current ? 'text-ink-900' : 'text-ink-400'}`}>
                  Phase {index + 1}
                </span>
                <span
                  className="mt-0.5 w-full overflow-hidden text-[0.66rem] leading-tight text-ink-400 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                  title={lead}
                >
                  {lead}
                </span>
              </div>
            </li>
          );
        })}
        <li className="flex min-w-16 flex-1 items-start">
          <span aria-hidden className="mt-[1.05rem] h-1 min-w-4 flex-1 rounded-full bg-line-200" />
          <span className="mt-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white">
            <Flag className="h-4 w-4" />
          </span>
        </li>
      </ol>
    </div>
  );
}

const SKILL_CHIPS = [
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700'
];

/**
 * Skills, split the way the mockup splits them: the few being moved right now,
 * and the rest waiting. Both counts are real — a student with nothing started
 * sees an empty "in progress" column rather than an invented one.
 */
function SkillsPanel({ skills }) {
  const ordered = [...skills].sort((a, b) => (b.progress || 0) - (a.progress || 0));
  const started = ordered.filter((s) => (s.progress || 0) > 0);
  const untouched = ordered.filter((s) => !(s.progress || 0));
  const shownUntouched = untouched.slice(0, 4);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_auto]">
      <div className="min-w-0">
        <p className="text-[0.68rem] font-black tracking-[0.11em] text-ink-400 uppercase">
          In progress · <span className="tabular-nums">{started.length}</span>
        </p>
        {started.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">
            Nothing started yet — finishing a task moves the first bar.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {started.slice(0, 4).map((skill, i) => (
              <li key={i} className="flex items-start gap-3">
                {/* A tinted initial rather than an invented icon: a wrong
                    glyph beside "SQL" would say something untrue about it. */}
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${SKILL_CHIPS[i % SKILL_CHIPS.length]}`}
                >
                  {skill.skillName?.charAt(0)?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm font-bold break-words text-ink-900">
                    {skill.skillName}
                  </span>
                  {skill.level && (
                    <span className="rounded-md bg-journey-50 px-1.5 py-0.5 text-[0.62rem] font-black text-journey-700">
                      {skill.level}
                    </span>
                  )}
                  <span className="text-xs font-black text-ink-500 tabular-nums">{skill.progress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-100">
                  <div
                    className="fp-journey-gradient h-full rounded-full"
                    style={{ width: `${Math.min(100, skill.progress || 0)}%` }}
                  />
                </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[0.68rem] font-black tracking-[0.11em] text-ink-400 uppercase">
          Not started · <span className="tabular-nums">{untouched.length}</span>
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {shownUntouched.map((skill, i) => (
            <li
              key={i}
              className="rounded-lg bg-surface-50 px-2.5 py-1.5 text-xs font-semibold text-ink-600 ring-1 ring-line-200 ring-inset"
            >
              {skill.skillName}
            </li>
          ))}
          {untouched.length > shownUntouched.length && (
            <li className="px-1 py-1.5 text-xs font-black text-journey-700 tabular-nums">
              +{untouched.length - shownUntouched.length} more
            </li>
          )}
        </ul>
      </div>

      <div className="hidden shrink-0 self-center rounded-2xl bg-violet-50/70 p-2 lg:block">
        <SkillsArt className="h-44 w-52" />
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, loading } = useContext(AuthContext);
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  // How far along the roadmap itself is. This page reported days planned,
  // tasks done, skills and achievements — every measure of effort, and none of
  // distance. "Day 12 of your plan" does not tell a student whether they are
  // near the end of school or halfway through a master's.
  const [roadmap, setRoadmap] = useState(null);
  // Completion history, for the seven-day line and bars in the stat cards.
  // /profile/summary carries totals only, and a sparkline drawn from a total
  // would be a decoration rather than a reading.
  const [history, setHistory] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [redoingId, setRedoingId] = useState(null);

  // No signed-out redirect here. This page renders inside ProtectedRoute, which
  // already holds it back until there is a session.

  useEffect(() => {
    if (!user) return;

    api
      .get('/profile/summary')
      .then(({ data }) => setSummary(data))
      .catch(() => setSummary(null))
      .finally(() => setLoadingSummary(false));

    // Each on its own failure: a student with a summary but no roadmap keeps
    // the rest of the page.
    api.get('/roadmap').then(({ data }) => setRoadmap(data)).catch(() => setRoadmap(null));
    api.get('/tasks/history').then(({ data }) => setHistory(data || [])).catch(() => setHistory([]));
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
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-journey-500 border-t-transparent" />
      </div>
    );
  }

  const stats = summary?.stats;
  const goal = summary?.goal;
  const startedAt = describeStart(goal);
  const levelInfo = levelProgress(user.xp, user.level);
  const level = Math.max(1, Number(user.level) || 1);

  const phases = roadmap?.roadmapData?.educationRoadmap || [];
  const phaseStateList = phaseStates(phases.length, roadmap?.completedPhases);
  const phaseIndex = phaseStateList.indexOf('current');
  const journeyDone = journeyPercent(phases.length, roadmap?.completedPhases);
  const currentPhaseTitle = phaseIndex >= 0 ? phaseTitle(phases[phaseIndex]) : null;
  const currentPhaseLead = currentPhaseTitle
    ? parseChoices(currentPhaseTitle)?.lead || currentPhaseTitle
    : null;

  // Completions per day for the last seven days, counted from history.
  const today = new Date();
  const series = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const key = dayKey(d);
    return history.filter(
      (t) => t.status === 'Completed' && t.completedAt && dayKey(new Date(t.completedAt)) === key
    ).length;
  });

  // Distinct days a task was actually finished. daysPlanned counts how long
  // the plan has existed, which is a different thing — pairing it with the
  // completed total printed "13 tasks across 0 days".
  const activeDays = new Set(
    history
      .filter((t) => t.status === 'Completed' && t.completedAt)
      .map((t) => dayKey(new Date(t.completedAt)))
  ).size;

  return (
    <div className="fp-enter grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="min-w-0 space-y-5">
        {/* ---- Identity, level, and what it is all pointed at ----------- */}
        <Card padded={false} className="overflow-hidden">
          <div className="fp-journey-gradient relative p-5 text-white sm:p-6">
            <div aria-hidden className="fp-stars pointer-events-none absolute inset-0" />

            <div className="relative flex flex-wrap items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black ring-1 ring-white/25 ring-inset">
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl leading-tight font-black break-words sm:text-3xl">
                  {user.name}
                </h1>
                <p className="mt-0.5 text-sm break-all text-journey-200">{user.email}</p>
              </div>

              {/* Level, stated once, from the same helper every other surface
                  on the site reads. */}
              <div className="w-full shrink-0 rounded-2xl bg-white/12 p-3.5 ring-1 ring-white/20 ring-inset sm:w-56">
                <p className="flex items-center gap-1.5 text-xs font-black text-amber-200">
                  <Zap className="h-3.5 w-3.5" />
                  Level {level}
                </p>
                <p className="mt-1 text-sm font-black tabular-nums">
                  {levelInfo.xp} / {levelInfo.ceiling} XP
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400"
                    style={{ width: `${levelInfo.percent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[0.68rem] font-semibold text-journey-100 tabular-nums">
                  {levelInfo.remaining} XP to Level {levelInfo.nextLevel}
                </p>
              </div>
            </div>

            <ProgressArt
              aria-hidden
              className="pointer-events-none absolute -top-1 right-[16.5rem] hidden h-40 w-56 xl:block"
            />
          </div>

          {/* Where they started, where they are going, how long they have been
              at it — the three facts the header band exists to carry. */}
          <div className="grid gap-5 border-t border-line-200 p-5 sm:grid-cols-3">
            <Fact icon={GraduationCap} label="Starting from" value={startedAt.title} detail={startedAt.detail} />
            <Fact icon={Compass} label="Working towards" value={goal?.careerGoal} detail={goal?.dreamCompany} />
            <Fact
              icon={CalendarDays}
              label="Progress"
              value={stats ? `Day ${stats.daysPlanned}` : '—'}
              detail={stats ? 'of your plan' : null}
            />
          </div>

          {phases.length > 0 && (
            <div className="border-t border-line-200 p-5">
              <RoadmapTrack
                phases={phases}
                completedPhases={roadmap?.completedPhases}
                percent={journeyDone}
              />
              {currentPhaseLead && (
                <p className="mt-3 text-sm text-ink-500">
                  Currently on{' '}
                  <span className="font-black text-journey-700">{currentPhaseLead}</span>
                </p>
              )}
            </div>
          )}
        </Card>

        {loadingSummary && (
          <Card>
            <div className="h-24 animate-pulse rounded-xl bg-surface-100" />
          </Card>
        )}

        {summary && (
          <>
            {summary.skills?.length > 0 && (
              <Card>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <CardHeader
                    icon={TrendingUp}
                    title="Skills"
                    subtitle="Built up as you complete tasks"
                    accent="brand"
                  />
                  <Link
                    to="/career/skills"
                    className="group inline-flex shrink-0 items-center gap-1 text-xs font-black text-journey-700 hover:underline"
                  >
                    Open skills
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
                <SkillsPanel skills={summary.skills} />
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
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-white">
                        <Award className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-ink-900">{item.title}</p>
                        <p className="mt-0.5 text-sm text-ink-500">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card>
              <CardHeader
                icon={Flame}
                title="Still to do"
                subtitle="Tasks the day ran out on. Pick any back up whenever you're ready."
                accent="amber"
              />

              {summary.skippedTasks?.length === 0 ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-5 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
                  <p className="font-semibold text-ink-900">All caught up</p>
                  <p className="mt-0.5 text-sm text-ink-600">
                    You&apos;ve finished every task assigned to you so far.
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
          </>
        )}
      </div>

      {summary && <ProgressStats stats={stats} series={series} activeDays={activeDays} />}
    </div>
  );
}
