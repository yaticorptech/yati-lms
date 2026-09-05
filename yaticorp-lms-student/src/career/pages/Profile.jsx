import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame, CheckCircle2, TrendingUp, Award, RotateCcw, GraduationCap, Compass, CalendarDays, MapPin, ArrowRight, Zap, Check, Lock, Flag, Sparkles, Trophy
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
import { initialsOf, tilesFor } from '../utils/skills';
import { dailyBoost } from '../utils/motivation';
import useCountUp from '../../hooks/useCountUp';
import YatiLoader from '../../components/YatiLoader';
import useMinimumLoading from '../../hooks/useMinimumLoading';

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
/** The level as a ring filled towards the next one, with the number inside. */
function LevelRing({ level, percent }) {
  const size = 92;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, percent)) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-journey-100" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="#ffb800"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <span className="absolute inset-[12px] flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-journey-500 to-indigo-600 text-white shadow-lg shadow-journey-500/30">
        <span className="text-[0.52rem] font-black tracking-[0.14em] opacity-80 uppercase">Level</span>
        <span className="text-xl leading-none font-black tabular-nums">{level}</span>
      </span>
    </div>
  );
}

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
  const tiles = tilesFor(skills);

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
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-black text-white shadow-sm ${tiles.get(
                    skill.skillName
                  )}`}
                >
                  {initialsOf(skill.skillName)}
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
                    className="fp-fill h-full rounded-full bg-gradient-to-r from-journey-400 to-indigo-600"
                    style={{ width: `${Math.min(100, skill.progress || 0)}%`, animationDelay: `${i * 0.08}s` }}
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
  // Above the early return below: hooks must run on every render.
  const showLoader = useMinimumLoading(loading);
  const shownXp = useCountUp(Number(user?.xp) || 0, 1000);

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

  if (showLoader || !user) return <YatiLoader label="Loading your progress" />;

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
          <div className="relative overflow-hidden bg-gradient-to-r from-journey-50 via-surface to-amber-50/70 p-5 sm:p-6">
            <div
              aria-hidden
              className="fp-float pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-journey-200/40 blur-3xl"
            />
            <div
              aria-hidden
              className="fp-float-slow pointer-events-none absolute right-1/4 -bottom-24 h-56 w-56 rounded-full bg-pink-200/40 blur-3xl"
            />
            <ProgressArt
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-4 hidden h-40 w-56 -translate-y-1/2 xl:block"
            />

            <div className="relative flex flex-wrap items-center gap-5 xl:pr-60">
              <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-journey-500 to-indigo-600 text-2xl font-black text-white shadow-lg shadow-journey-500/30">
                {user.name?.charAt(0)?.toUpperCase() || '?'}
                <span className="absolute -right-1.5 -bottom-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-[0.6rem] font-black text-amber-950 ring-2 ring-surface">
                  {level}
                </span>
              </span>
              <div className="min-w-0 flex-1 basis-56">
                <p className="text-[0.68rem] font-black tracking-[0.16em] text-journey-600 uppercase">
                  My progress
                </p>
                <h1 className="mt-0.5 text-2xl leading-tight font-black break-words text-ink-900 sm:text-3xl">
                  {user.name}
                </h1>
                <p className="mt-0.5 text-sm break-all text-ink-500">{user.email}</p>
                <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-journey-100/60 px-2.5 py-1 text-xs font-bold text-journey-700">
                  <span aria-hidden>💪</span>
                  {dailyBoost()}
                </p>
              </div>

              {/* Level, stated once, from the same helper every other surface
                  on the site reads. */}
              <div className="flex w-full shrink-0 items-center gap-4 rounded-2xl bg-surface/90 p-3.5 shadow-card ring-1 ring-line-200/80 ring-inset backdrop-blur sm:w-auto">
                <LevelRing level={level} percent={levelInfo.percent} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-black text-amber-600">
                    <Zap className="h-3.5 w-3.5 fill-amber-200" />
                    {shownXp} XP
                  </p>
                  <p className="mt-0.5 text-sm font-black text-ink-900 tabular-nums">
                    {levelInfo.remaining} XP to Level {levelInfo.nextLevel}
                  </p>
                  <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-surface-100">
                    <div
                      className="fp-effort-gradient fp-stripes h-full rounded-full transition-[width] duration-1000 ease-out"
                      style={{ width: `${levelInfo.percent}%` }}
                    />
                  </div>
                  <Link
                    to="/career/planner"
                    className="group mt-2.5 inline-flex items-center gap-1 text-xs font-black text-journey-700 hover:underline"
                  >
                    Earn 10 XP now
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
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
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <CardHeader icon={Trophy} title="Achievements" subtitle="Moments that happened along the way" accent="pink" />
                  <Link
                    to="/career/badges"
                    className="group inline-flex shrink-0 items-center gap-1 text-xs font-black text-journey-700 hover:underline"
                  >
                    See all rewards
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {summary.achievements.map((item, i) => (
                    <li
                      key={item._id}
                      className="fp-lift animate-fade-in-up flex items-start gap-3 rounded-2xl bg-gradient-to-br from-fuchsia-50 to-pink-50 p-3.5 ring-1 ring-pink-200 ring-inset"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <span className="fp-reward-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md shadow-pink-500/30">
                        <Trophy className="h-5 w-5" />
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
