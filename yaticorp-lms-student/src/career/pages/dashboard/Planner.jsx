import { useState, useEffect, useRef, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import {
  Check, Sparkles, Target, Award, CalendarCheck, PartyPopper,
  ListTodo, ChevronDown, GraduationCap, Clock3, Map, Play, Trophy, Plus, Zap,
  BookOpen, MonitorPlay, ArrowRight, Loader2, Lock
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import AiBudgetNotice from '../../components/AiBudgetNotice';
import { useCelebrate } from '../../components/ui/Celebration';
import Button from '../../components/ui/Button';
import Card, { CardHeader } from '../../components/ui/Card';
import Mascot from '../../components/mascot/Mascot';
import useMascotCycle, { PLAN_POSES, DONE_POSES } from '../../components/mascot/useMascotCycle';
import { levelProgress } from '../../utils/progress';
import EmptyState from '../../components/ui/EmptyState';
import TaskStudyPanel from '../../components/study/TaskStudyPanel';
import LessonProgress from '../../components/study/LessonProgress';
import YatiLoader from '../../../components/YatiLoader';
import useMinimumLoading from '../../../hooks/useMinimumLoading';

// What the server pays for a finished task, matching TASK_XP in
// taskCompletionService. Verified end to end: completing one moves the profile
// by exactly this much, so the figures in the header are a promise, not a
// guess.
const TASK_XP = 10;

const TODAY_LABEL = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long'
});


export default function Planner() {
  const { user, refresh } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [plannerContext, setPlannerContext] = useState(null);
  const [day, setDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  // Which task's tick is in flight, so only that one disables.
  const [ticking, setTicking] = useState(null);
  // Only one task's lesson is open at a time — two embedded players competing
  // for attention defeats the point of a focused daily plan.
  const [openTaskId, setOpenTaskId] = useState(null);
  // Finished tasks whose steps the student has asked to see again. Empty by
  // default: once a task is done its steps are a record, not an instruction.
  const [openSteps, setOpenSteps] = useState(() => new Set());

  const toggleSteps = (id) =>
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toast = useToast();
  const celebrate = useCelebrate();

  // Clearing the day is a once-per-day event. Without this guard, re-opening a
  // finished task and letting its gates re-report would throw the confetti
  // again for work that was already celebrated.
  const dayCelebratedRef = useRef(false);

  const fetchTasks = async () => {
    try {
      const { data } = await api.get('/tasks');
      if (Array.isArray(data)) {
        setTasks(data);
      } else {
        setTasks(data.tasks || []);
        setPlannerContext(data.context || null);
        setDay(data.day || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  /**
   * One more task for today, on request.
   *
   * The plan gives one task because a list of five gets abandoned — but that is
   * about what the student is handed, not a ceiling on what they can ask for.
   * Someone who finished early should be able to keep going today.
   */
  const handleAddAnother = async () => {
    // One more only once today's plan is cleared; the button is disabled
    // before then, this just makes sure a stray call cannot get past it.
    if (!allDone) return;
    setAddingTask(true);
    try {
      const { data } = await api.post('/tasks/another');
      await fetchTasks();
      // A cleared day can be cleared again — the celebration is owed a second
      // time if they finish the extra task too.
      dayCelebratedRef.current = false;
      toast.success(
        data.overBudget
          ? `"${data.task.title}" added — that is past your planned time for today.`
          : `"${data.task.title}" is on your plan.`,
        'One more task'
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate another task.');
    } finally {
      setAddingTask(false);
    }
  };

  /**
   * Tick a task off by hand.
   *
   * Only reachable for tasks with nothing to learn first. The server routes
   * this through the same completeTask path the lessons use, so a manual tick
   * and a finished lesson award identical XP.
   */
  const handleManualToggle = async (task) => {
    const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    setTicking(task._id);
    try {
      const { data } = await api.put(`/tasks/${task._id}`, { status: nextStatus });
      if (nextStatus === 'Completed') {
        await handleAutoCompleted(data, { byHand: true });
      } else {
        setTasks((prev) =>
          prev.map((t) => (t._id === task._id ? { ...t, status: 'Pending', completedAt: null } : t))
        );
        // Reopening a task means the day is no longer cleared, so the
        // celebration is owed again if they finish it a second time.
        dayCelebratedRef.current = false;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update that task.');
    } finally {
      setTicking(null);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/tasks/generate');
      await fetchTasks();
      // Singular: this endpoint now creates one task, like every other path.
      toast.success(
        data.tasks?.[0]?.title
          ? `"${data.tasks[0].title}" is on your plan.`
          : 'Your task is ready.',
        'Plan ready'
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate tasks.');
    } finally {
      setGenerating(false);
    }
  };

  /**
   * A lesson was built (or loaded) for a task, so it now completes itself —
   * drop its manual tick without waiting for a refetch.
   */
  const handleLessonReady = (taskId) => {
    setTasks((prev) => {
      // Returning the same array when nothing changed makes React bail out.
      // Rebuilding it every time would hand the panel a new `task` object on
      // each call, which re-creates its callbacks and restarts the notes
      // dwell timer — so the read gate could never elapse.
      //
      // The same reasoning is why gate progress is NOT streamed back into this
      // list while a panel is open: the open panel draws its own live stepper,
      // and pushing every ping through here would restart that timer again.
      if (!prev.some((t) => t._id === taskId && !t.hasLesson)) return prev;
      return prev.map((t) => (t._id === taskId ? { ...t, hasLesson: true } : t));
    });
  };

  /**
   * The lesson finished the task on its own — reflect it, and mark the moment.
   *
   * The server has already completed it and awarded XP, so this only mirrors
   * the new status; it must not fire another update or the task would be
   * written twice.
   */
  const handleAutoCompleted = async (completedTask, { xp = 0, byHand = false } = {}) => {
    // What the server actually gave, read back rather than assumed. Both the
    // lesson path and the manual tick come through here, so the reward — and
    // the level-up behind it — is worked out once and cannot drift between
    // the two ways a task can be finished.
    const xpBefore = Number(user?.xp) || 0;
    const levelBefore = Number(user?.level) || 1;
    const fresh = await refresh?.();
    const gained = xp || Math.max(0, (Number(fresh?.xp) || xpBefore) - xpBefore);
    const newLevel = Number(fresh?.level) || levelBefore;
    const leveledUp = newLevel > levelBefore;

    const after = tasks.map((t) =>
      t._id === completedTask._id
        ? { ...t, status: 'Completed', completedAt: completedTask.completedAt }
        : t
    );
    setTasks(after);

    const remaining = after.filter((t) => t.status !== 'Completed').length;
    const clearedTheDay = remaining === 0 && after.length > 0;

    // ⚡ The rarest thing that can happen here, so it takes precedence over
    // both the day-cleared and the single-task celebration. Crossing a level
    // used to pass in complete silence: the ring on the Overview simply read a
    // higher number the next time the student happened to look at it.
    if (leveledUp) {
      dayCelebratedRef.current = clearedTheDay || dayCelebratedRef.current;
      celebrate({
        kind: 'level',
        icon: Trophy,
        title: `Level ${newLevel}`,
        message:
          clearedTheDay
            ? `That task cleared today's plan and took you up a level.`
            : `That task took you over the line. You are Level ${newLevel}.`,
        xp: gained,
        progress: `Level ${levelBefore} → ${newLevel}`
      });
      return;
    }

    if (clearedTheDay && !dayCelebratedRef.current) {
      dayCelebratedRef.current = true;
      celebrate({
        kind: 'day',
        icon: Trophy,
        title: "That's the whole day",
        message: `Every task on today's plan is done. Come back tomorrow and the streak grows.`,
        xp: gained,
        progress: `${after.length} / ${after.length} done`
      });
    } else {
      celebrate({
        kind: 'task',
        title: 'Task complete',
        // A task ticked by hand had no lesson to finish, so it must not be
        // congratulated for finishing one.
        message: byHand
          ? 'Ticked off. That is one less thing on today.'
          : 'Lesson finished and every answer right — ticked off for you.',
        xp: gained,
        progress: `${after.length - remaining} / ${after.length} done today`
      });
    }
  };

  // Today's plan is built on the first request of the day, so the initial load
  // can carry a Gemini call. Say so rather than showing a bare spinner.
  const showLoader = useMinimumLoading(loading);
  // The whole day done: the mascot waves goodbye. Above the early return
  // below, because hooks must run on every render.
  const clearedNow = !loading && tasks.length > 0 && tasks.every((t) => t.status === 'Completed');
  const clearedRef = useRef(false);
  useEffect(() => {
    if (clearedNow && !clearedRef.current) {
      clearedRef.current = true;
      window.dispatchEvent(new CustomEvent('mascot:section-complete'));
    }
    if (!clearedNow) clearedRef.current = false;
  }, [clearedNow]);
  // Hooks stay above the loader return; the day's state is read from the
  // tasks directly since `dayCleared` is derived further down.
  const look = useMascotCycle(clearedNow ? DONE_POSES : PLAN_POSES);
  if (showLoader) return <YatiLoader label="Building today's plan" />;

  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const remaining = tasks.length - completed;
  const needsRoadmap = day?.status === 'no-roadmap';
  // Tomorrow is an exam, so today was deliberately left empty. Without this the
  // page would say "no tasks for today" and offer to generate one, which reads
  // as a fault and undoes the very thing the clear day is for.
  const examEve = day?.status === 'exam-eve';
  const exams = day?.exams || [];
  const allDone = tasks.length > 0 && remaining === 0;

  // The one task to pick up now. Marking it removes the smallest possible
  // decision between arriving on this page and starting work.
  const nextTask = tasks.find((t) => t.status !== 'Completed');
  const nextTaskId = nextTask?._id;
  // The one thing worth saying beside it: whether today's plan alone
  // would cross the next level. Everything else the hero used to carry —
  // streak, skill, a line of encouragement — is already said on the Overview.
  const level = levelProgress(user?.xp, user?.level);
  const canLevelToday = remaining > 0 && level.remaining <= remaining * TASK_XP;
  const donePercent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const dayCleared = tasks.length > 0 && remaining === 0;

  /* One honest line about where the day stands. It never claims progress that
     has not happened, and it never nags: the "not started" case offers the
     first task rather than pointing out that nothing is done. */
  const missionLine = examEve
    ? 'Revise, rest, and go in ready.'
    : tasks.length === 0
      ? "Your plan for today will appear here."
      : dayCleared
        ? "Every task done. That's the day cleared — enjoy the evening."
        : completed === 0
          ? `${tasks.length === 1 ? 'One task' : `${tasks.length} tasks`} today. Start at the top and the rest follows.`
          : `${completed} down, ${remaining} to go — you're ${donePercent}% through today.`;

  return (
    <div className="space-y-6">
      {/* No "Add More Tasks" button and no time picker on purpose. The plan is
          the plan: one right-sized day, generated for the student, with nothing
          to configure before they can start on it. */}
      {/* No subtitle. The date and the task are the page; explaining the
          one-task rule in a sentence above them only described what was
          already visible underneath. */}
      {/* The day, said as a state rather than a title. A student opening this
          page wants to know three things — what day it is, how much is left,
          and whether it is worth starting now. The ring answers the second and
          the line answers the third; both are read from the real task list, so
          neither can flatter a day that has not happened. */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-journey-100 via-surface to-pink-50 shadow-float ring-1 ring-journey-200/70 ring-inset">
        <div
          aria-hidden
          className="fp-float pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-journey-300/50 blur-3xl"
        />
        <div
          aria-hidden
          className="fp-float-slow pointer-events-none absolute right-1/3 -bottom-28 h-64 w-64 rounded-full bg-pink-300/45 blur-3xl"
        />
        <div
          aria-hidden
          className="fp-float-settle pointer-events-none absolute -top-16 right-[8%] h-48 w-48 rounded-full bg-amber-200/50 blur-3xl"
        />
        {/* A fine highlight along the top edge, so the card reads as lit
            from above rather than flat. */}
        <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
        {/* The mascot, purely decorative: it stands beside the mission and
            changes pose every few seconds so the eye keeps returning to the
            page. It points at nothing and says nothing — the tour and the
            speech live with the floating guide. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[30%] max-w-[300px] items-end justify-center pr-6 sm:flex"
        >
          <span className="fp-halo absolute bottom-6 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-journey-300/40 blur-2xl" />
          <span className="absolute bottom-3 left-1/2 h-8 w-40 -translate-x-1/2 rounded-full bg-blue-400/40 blur-xl" />
          <span className="fp-drift-icon absolute top-4 right-6 text-xl" style={{ animationDelay: '-1.2s' }}>✨</span>
          <span className="fp-drift-icon absolute top-10 left-4 text-lg" style={{ animationDelay: '-2.6s' }}>⭐</span>
          <span className="fp-drift-icon absolute bottom-16 right-2 text-base" style={{ animationDelay: '-3.8s' }}>⚡</span>
          <span className="fp-drift-icon absolute bottom-24 left-2 text-base" style={{ animationDelay: '-0.6s' }}>🔥</span>
          <Mascot key={look.pose} pose={look.pose} height={168} motion={look.motion} className="mc-pop relative" />
        </div>

        <div className="relative flex flex-wrap items-center gap-5 p-5 sm:p-6 sm:pr-[30%] md:min-h-[196px]">
          {tasks.length > 0 && (
            <div className="fp-breathe relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-surface/70 shadow-card ring-1 ring-white/80 sm:h-28 sm:w-28">
              <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90 sm:h-28 sm:w-28" aria-hidden>
                <defs>
                  <linearGradient id="fp-ring-grad" x1="0" y1="0" x2="1" y2="1">
                    {dayCleared ? (
                      <>
                        <stop offset="0%" stopColor="#19b96b" />
                        <stop offset="100%" stopColor="#1677ff" />
                      </>
                    ) : (
                      <>
                        <stop offset="0%" stopColor="#6c3bff" />
                        <stop offset="60%" stopColor="#c026d3" />
                        <stop offset="100%" stopColor="#ff6b22" />
                      </>
                    )}
                  </linearGradient>
                </defs>
                <circle cx="36" cy="36" r="30" fill="none" strokeWidth="8" className="stroke-journey-100" />
                <circle
                  cx="36"
                  cy="36"
                  r="30"
                  fill="none"
                  stroke="url(#fp-ring-grad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(donePercent / 100) * 2 * Math.PI * 30} ${2 * Math.PI * 30}`}
                  className="transition-[stroke-dasharray] duration-1000 ease-out"
                  style={{ filter: 'drop-shadow(0 0 6px rgb(108 59 255 / 0.45))' }}
                />
              </svg>
              <span className="absolute flex flex-col items-center leading-none">
                <span className="text-lg font-black tabular-nums text-ink-900 sm:text-2xl">
                  {completed}/{tasks.length}
                </span>
                <span className="mt-1 text-[0.6rem] font-black tracking-[0.14em] text-journey-600 uppercase">
                  {dayCleared ? 'cleared' : 'done'}
                </span>
              </span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-2.5 py-1 text-[0.68rem] font-black tracking-[0.16em] text-journey-700 uppercase shadow-sm ring-1 ring-journey-100 ring-inset">
              <CalendarCheck className="h-3.5 w-3.5 text-journey-500" aria-hidden />
              {TODAY_LABEL}
            </p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl leading-tight font-black tracking-tight sm:text-3xl md:text-4xl">
              <span className="fp-text-shimmer bg-gradient-to-r from-journey-700 via-brand-600 to-pink-600 bg-clip-text text-transparent">
                {dayCleared ? "Today's mission complete" : "Today's mission"}
              </span>
              <Sparkles className="fp-bob-soft h-6 w-6 shrink-0 text-amber-400" aria-hidden />
            </h1>
            <p className="mt-1.5 text-sm font-semibold text-ink-600 sm:text-[0.95rem]">{missionLine}</p>

            {tasks.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {nextTask && (
                  /* Names the task to pick up now. This used to be a button that
                     only scrolled to the row below — on any screen where the
                     row was already in view it did nothing, and it never opened
                     the task. The row's own Start button is the one action, so
                     the hero just says what it is. */
                  <span className="fp-beacon animate-pop-in inline-flex max-w-full items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 px-4 py-2 text-sm font-black text-white shadow-md">
                    <span aria-hidden className="fp-blink h-2 w-2 shrink-0 rounded-full bg-white" />
                    <Target className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="hidden shrink-0 text-[0.68rem] tracking-[0.14em] uppercase sm:inline">Up next</span>
                    <span className="line-clamp-2 min-w-0 font-bold">{nextTask.title}</span>
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800 shadow-card ring-1 ring-amber-200/80 ring-inset">
                  <Trophy className="fp-bob-soft h-3.5 w-3.5 text-amber-500" />
                  <span className="tabular-nums">
                    {completed * TASK_XP} XP earned
                    {remaining > 0 && <span className="text-ink-400"> · {remaining * TASK_XP} to go</span>}
                  </span>
                </span>

                {canLevelToday && (
                  <span className="animate-pop-in inline-flex items-center gap-1.5 rounded-full bg-journey-600 px-3 py-1.5 text-xs font-black text-white shadow-md shadow-journey-500/30">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    Level {level.nextLevel} is within reach today
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Informational, not a reprimand. Amber and plainly worded: the point is
          to offer the work back, not to open the day by telling someone off. */}
      {day?.skippedYesterday > 0 && (
        <Card className="animate-fade-in-up border-amber-100 bg-amber-50/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="font-semibold text-ink-900">
                  {day.skippedYesterday} {day.skippedYesterday === 1 ? 'task' : 'tasks'} moved to your
                  backlog
                </p>
                <p className="mt-0.5 text-sm text-ink-600">
                  Yesterday ran out before you got to {day.skippedYesterday === 1 ? 'it' : 'them'}.
                  Nothing is lost — pick {day.skippedYesterday === 1 ? 'it' : 'them'} back up whenever
                  you want.
                </p>
              </div>
            </div>
            <Link to="/career/profile">
              <Button variant="secondary" size="sm">See backlog</Button>
            </Link>
          </div>
        </Card>
      )}

      {examEve && (
        <Card className="animate-fade-in-up border-brand-100 bg-brand-50/50">
          <div className="flex items-start gap-3">
            <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <div>
              <p className="font-semibold text-ink-900">
                {exams.length === 1
                  ? `Tomorrow is your ${exams[0]}`
                  : 'You have exams tomorrow'}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-600">
                {exams.length > 1 && <span className="font-medium">{exams.join(' · ')}. </span>}
                Today has been left clear so the evening is yours to revise in. Nothing new to
                learn, nothing to tick off, and no streak to lose — your plan picks up again after
                the exam.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Two different things wearing the same status. A plan that failed
          because generation broke is worth a "Try again" button; one that
          failed because the day's AI allowance is spent is not — retrying can
          only fail the same way, and offering the button implies otherwise. */}
      {day?.status === 'failed' && day.code && (
        <AiBudgetNotice code={day.code} message={day.message} className="animate-fade-in-up" />
      )}

      {day?.status === 'failed' && !day.code && (
        <Card className="animate-fade-in-up border-amber-100 bg-amber-50/60">
          <p className="font-semibold text-ink-900">Today&apos;s plan could not be built</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">{day.message}</p>
          <Button className="mt-3" size="sm" variant="secondary" icon={Sparkles} onClick={fetchTasks}>
            Try again
          </Button>
        </Card>
      )}

      {/* No progress card. A percentage bar over a one-task day only ever reads
          0% or 100% — it is a scoreboard for a game with a single move, and it
          took the top of the page to say what the task row says by itself. The
          cleared-day note at the foot of the list still marks the finish. */}

      <Card padded={false} className="animate-fade-in-up overflow-hidden ring-1 ring-journey-100/60">
        <div className="flex flex-wrap items-center gap-3 border-b border-line-100 bg-gradient-to-r from-journey-50/70 via-surface to-surface px-4 py-4 sm:px-6">
          <span className="fp-journey-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md shadow-journey-500/30">
            <CalendarCheck className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h2 className="bg-gradient-to-r from-journey-700 to-brand-600 bg-clip-text text-lg font-black text-transparent">
              {examEve && tasks.length === 0
                ? 'Today is clear'
                : remaining === 0 && tasks.length > 0
                ? 'All done for today'
                : remaining === 1
                  ? 'One task to go'
                  : `${remaining} tasks to go`}
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {examEve && tasks.length === 0
                ? 'Revise, rest, and go in ready.'
                : plannerContext?.currentFocus?.[0] || 'Some need a lesson first. Others you just tick off.'}
            </p>
          </div>
          {tasks.length > 0 && (
            <span className="flex w-full shrink-0 items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-ink-600 shadow-sm ring-1 ring-line-200 sm:ml-auto sm:w-auto">
              <span aria-hidden className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-100">
                <span
                  className={`block h-full rounded-full transition-[width] duration-700 ease-out ${dayCleared ? 'fp-done-gradient' : 'fp-journey-gradient'}`}
                  style={{ width: `${donePercent}%` }}
                />
              </span>
              <span className="tabular-nums">{completed} / {tasks.length} done</span>
            </span>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="p-6">
            {examEve ? (
              <EmptyState
                icon={GraduationCap}
                title="No tasks the day before an exam"
                description="Your calendar says you sit an exam tomorrow, so today is yours. Revising what you already know beats starting something new the night before."
                action={
                  <Link to="/career/calendar">
                    <Button variant="secondary">See my calendar</Button>
                  </Link>
                }
              />
            ) : needsRoadmap ? (
              <EmptyState
                icon={Map}
                title="Set your goal first"
                description="Your daily plan is built from your roadmap. Tell us where you are now and what you're aiming for, and tasks will start arriving each day automatically."
                action={
                  <Link to="/career/roadmap">
                    <Button icon={Target}>Build my roadmap</Button>
                  </Link>
                }
              />
            ) : (
              <EmptyState
                icon={ListTodo}
                title="No tasks for today"
                description="Today's task is generated from your roadmap and what you've already finished."
                action={
                  <Button onClick={handleGenerate} loading={generating} loadingText="Generating..." icon={Sparkles}>
                    Generate today's task
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          /* One flat list. Every task here belongs to today, so grouping them
             under Daily/Weekly/Monthly headings only added labels to read. */
          <ul className="divide-y divide-line-100">
            {tasks.map((task, index) => {
              const done = task.status === 'Completed';
              const open = openTaskId === task._id;
              const isNext = task._id === nextTaskId && !open;
              const started = !done && task.lesson?.done > 0;
              // A task the AI judged needs no lesson at all. `hasLesson` guards
              // the case where one was somehow built anyway — the lesson wins,
              // because a half-finished lesson must stay finishable.
              const needsNothing = task.learning === 'none' && !task.hasLesson;
              // Open while there is still work in them; collapsed once ticked,
              // unless this student has reopened this one.
              // Open only on the task that is up next. Every pending task used
              // to unroll its full recipe, which is how four tasks became a
              // wall. The others keep their steps one click away.
              const stepsShown = (isNext && !done) || openSteps.has(task._id);

              return (
                <li
                  key={task._id}
                  style={{ animationDelay: `${0.1 + index * 0.07}s` }}
                  className={`animate-fade-in-up scroll-mt-28 ${open ? 'bg-surface-50/40' : ''}`}
                >
                  <div
                    className={`group relative flex flex-wrap items-start gap-3.5 px-4 py-4 transition-all sm:px-6 ${
                      isNext
                        ? 'mx-2 my-3 overflow-hidden rounded-2xl sm:mx-3 bg-gradient-to-r from-journey-50 via-surface to-pink-50/60 shadow-md shadow-journey-500/10 ring-1 ring-journey-200/80'
                        : done
                          ? // Finished work steps back rather than competing with
                            // what is still to do. It stays legible — it is proof
                            // of progress — but it should not read as a call to
                            // action alongside the task that is.
                            'bg-gradient-to-r from-emerald-50/70 to-surface'
                          : 'hover:bg-gradient-to-r hover:from-surface-50 hover:to-journey-50/40'
                    }`}
                  >
                    {/* A green spine on finished work, so the list reads as a
                        strip of colour — done, next, later — before a word of
                        it is read. */}
                    {done && (
                      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-emerald-400 to-teal-500" />
                    )}
                    {/* The one task to start now gets a coloured spine and a
                        single sweep of light. Everything else on this page is
                        equally weighted, which is exactly the problem: a list
                        of five identical rows asks the student to choose
                        before they can begin. */}
                    {isNext && (
                      <>
                        <span
                          aria-hidden
                          className="fp-spine-pulse absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-journey-500 to-indigo-600"
                        />
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 overflow-hidden"
                        >
                          {/* Reuses the skeleton's sheen token so the sweep is
                              bright on a light row and barely-there on a dark
                              one — a white/70 flash across a dark card reads as
                              a glitch rather than a highlight. */}
                          <span className="animate-sheen absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[var(--sheen)] to-transparent" />
                        </span>
                      </>
                    )}

                    {/* A status marker, not a checkbox. Every task is finished
                        by working through its lesson, so a tickable control
                        would offer something that is not the student's to do —
                        but a row with no left-hand anchor is a paragraph, and
                        three of them read as one block of text. This says where
                        the task stands and cannot be clicked. */}
                    <span
                      aria-hidden
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${
                        done
                          ? 'fp-done-gradient text-white ring-emerald-300 shadow-sm shadow-emerald-500/40'
                          : started
                            ? 'bg-blue-50 text-blue-600 ring-blue-200'
                            : isNext
                              ? 'fp-glow-violet bg-gradient-to-br from-journey-500 to-indigo-600 text-white ring-journey-300'
                              : 'border-2 border-dashed border-journey-300 bg-surface text-journey-600 ring-transparent'
                      }`}
                    >
                      {done ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      ) : isNext ? (
                        <Play className="h-3 w-3 fill-current" />
                      ) : (
                        <span className="text-[0.7rem] font-bold tabular-nums">{index + 1}</span>
                      )}
                    </span>

                    <div className="relative min-w-0 flex-1">
                      {isNext && (
                        <span className="mb-1.5 inline-flex items-center gap-1.5 text-[0.68rem] font-black tracking-[0.14em] text-journey-700 uppercase">
                          <span aria-hidden className="fp-blink h-2 w-2 rounded-full bg-journey-500" />
                          <Target className="h-3 w-3" aria-hidden />
                          {started ? 'Pick up where you left off' : 'Up next'}
                        </span>
                      )}

                      {/* Title and its state on one line. The Done badge used to
                          sit on a line of its own between the title and the
                          description, which split a finished task into three
                          stacked fragments. */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3
                          className={`font-semibold transition-all duration-200 ${
                            done ? 'text-ink-400 line-through' : 'text-ink-900'
                          }`}
                        >
                          {task.title}
                        </h3>

                        {done ? (
                          <span className="fp-done-gradient inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.68rem] font-black text-white shadow-sm shadow-emerald-500/30">
                            <Check className="h-3 w-3" strokeWidth={3} />
                            Done · +{TASK_XP} XP
                          </span>
                        ) : (
                          /* What finishing it is worth, on the row where the
                             work is. The same TASK_XP the header totals and the
                             server actually awards — so it is a promise rather
                             than an incentive made up for the page. */
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.68rem] font-black ${
                              isNext
                                ? 'fp-effort-gradient text-white shadow-sm shadow-orange-500/40'
                                : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100 ring-inset'
                            }`}
                          >
                            <Zap className={`h-3 w-3 ${isNext ? 'fp-bolt fill-white' : ''}`} />
                            +{TASK_XP} XP
                          </span>
                        )}

                        {/* Which way they chose to learn it. Only once a lesson
                            exists — before that there is nothing to describe. */}
                        {!done && task.lesson?.mode && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-surface-100 px-2 py-0.5 text-[0.68rem] font-semibold text-ink-500">
                            {task.lesson.mode === 'read' ? (
                              <>
                                <BookOpen className="h-3 w-3" />
                                Reading
                              </>
                            ) : (
                              <>
                                <MonitorPlay className="h-3 w-3" />
                                Video
                              </>
                            )}
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className={`mt-1 text-sm leading-relaxed ${done ? 'text-ink-400' : 'text-ink-500'}`}>
                          {task.description}
                        </p>
                      )}

                      {/* The steps, for a task with no lesson behind it. There
                          is no video, no notes and no quiz here — without this
                          the student gets a title and a tick and has to work
                          out the rest themselves. Shown inline rather than
                          behind a disclosure: it is short, and it IS the task.
                          Dimmed once done, because then it is a record rather
                          than an instruction. */}
                      {needsNothing && task.guidance?.length > 0 && (
                        <>
                          {/* Once the task is ticked the steps fold away, so a
                              finished day is a short list of what was done
                              rather than five open recipes for work that is
                              already over. They stay one click away, because
                              the steps are also the record of how it was done. */}
                          {(done || !isNext) && (
                            <button
                              type="button"
                              onClick={() => toggleSteps(task._id)}
                              aria-expanded={stepsShown}
                              className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-1 text-xs font-bold text-ink-500 ring-1 ring-line-200 ring-inset transition-all hover:bg-journey-50 hover:text-journey-700 hover:ring-journey-200"
                            >
                              {stepsShown
                                ? 'Hide steps'
                                : `Show ${task.guidance.length} ${task.guidance.length === 1 ? 'step' : 'steps'}`}
                              <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform ${stepsShown ? 'rotate-180' : ''}`}
                              />
                            </button>
                          )}

                          {stepsShown && (
                            <ol className={`mt-2.5 space-y-1.5 ${done ? 'opacity-60' : ''}`}>
                              {task.guidance.map((step, i) => (
                                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-600">
                                  <span
                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.68rem] font-black tabular-nums ${
                                      isNext && !done
                                        ? 'fp-journey-gradient text-white shadow-sm shadow-journey-500/30'
                                        : 'bg-surface-100 text-ink-500'
                                    }`}
                                  >
                                    {i + 1}
                                  </span>
                                  <span className="min-w-0">{step}</span>
                                </li>
                              ))}
                            </ol>
                          )}
                        </>
                      )}

                      {/* Where this task actually stands. No duration: an
                          estimate the student never agreed to reads as a
                          deadline, and "15 mins" beside a task that takes them
                          forty is discouraging rather than informative. The
                          budget still sizes the plan behind the scenes. */}
                      {task.lesson?.total > 0 && !done && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <LessonProgress lesson={task.lesson} />
                        </div>
                      )}

                      {/* This task is covered by a lesson in a course they own.
                          Offered above the AI lesson deliberately: a taught
                          course with a real instructor beats a generated
                          tutorial, and the student already paid for it. */}
                      {task.courseLesson && !done && (
                        <Link
                          to={`/learn/${task.courseLesson.courseId}`}
                          className="mt-2.5 inline-flex max-w-full items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-left transition-colors hover:border-brand-400"
                        >
                          <GraduationCap className="h-4 w-4 shrink-0 text-link" />
                          <span className="min-w-0">
                            <span className="block truncate text-[0.8rem] font-bold text-link-strong">
                              {task.courseLesson.lessonTitle}
                            </span>
                            <span className="block truncate text-[0.68rem] font-medium text-ink-500">
                              In your course · {task.courseLesson.courseTitle}
                            </span>
                          </span>
                          <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-link" />
                        </Link>
                      )}
                    </div>

                    {/* Nothing to learn first, so nothing to open. A task like
                        "push your code to GitHub" needs no tutorial — offering
                        to build one wastes the student's time on something they
                        already know how to do. It is ticked off by hand. */}
                    {/* A tick-only task can still be learned by video: the
                        lesson is built on request, and the manual tick stays
                        beside it for those who already know how. */}
                    {needsNothing && !done && (
                      <button
                        type="button"
                        onClick={() => setOpenTaskId(open ? null : task._id)}
                        aria-expanded={open}
                        className={`relative mt-0.5 inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all active:scale-[0.96] sm:w-auto sm:py-1.5 ${
                          open
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'bg-surface text-journey-700 ring-1 ring-journey-200 ring-inset hover:bg-journey-50'
                        }`}
                      >
                        <MonitorPlay className="h-3.5 w-3.5" />
                        <span>{open ? 'Close' : 'Watch a video'}</span>
                      </button>
                    )}
                    {needsNothing ? (
                      <button
                        type="button"
                        onClick={() => handleManualToggle(task)}
                        disabled={ticking === task._id}
                        aria-pressed={done}
                        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
                        className={`mt-0.5 inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full ring-1 transition-all active:scale-[0.94] disabled:opacity-50 ${
                          done
                            ? 'h-8 w-8 bg-emerald-500 text-white ring-emerald-500 hover:bg-emerald-600'
                            : isNext
                              ? 'fp-btn fp-btn-primary fp-glow-violet h-10 w-full bg-gradient-to-r from-journey-600 to-indigo-600 px-3.5 text-xs font-black text-white ring-transparent sm:h-9 sm:w-auto'
                              : 'h-8 w-8 bg-surface text-ink-400 ring-line-300 hover:text-link hover:ring-brand-400'
                        }`}
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
                        {!done && isNext && <span>Mark done</span>}
                      </button>
                    ) : (
                      /* The only route to finishing a task with a lesson, so it
                         is styled as the primary action while the task is still
                         open and recedes once it is done. The label names the
                         actual state — resuming a half-done lesson should not
                         read the same as opening one never touched. */
                      <button
                        type="button"
                        onClick={() => setOpenTaskId(open ? null : task._id)}
                        aria-expanded={open}
                        className={`relative mt-0.5 inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all active:scale-[0.96] sm:w-auto sm:py-1.5 ${
                          open
                            ? 'bg-brand-600 text-white shadow-sm'
                            : done
                              ? 'bg-surface-100 text-ink-500 hover:bg-surface-200'
                              : isNext
                                ? 'fp-btn fp-btn-primary fp-glow-violet bg-gradient-to-r from-journey-600 to-indigo-600 text-white'
                                : 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 hover:shadow-md'
                        }`}
                      >
                        <GraduationCap className="h-3.5 w-3.5" />
                        <span>{open ? 'Close' : done ? 'Review' : started ? 'Continue' : 'Start'}</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Mounted only while open: each panel embeds a player and
                      fetches its own lesson. */}
                  {open && (
                    <div className="animate-fade-in border-t border-line-100 bg-surface pt-6">
                      <TaskStudyPanel
                        task={task}
                        onCompleted={handleAutoCompleted}
                        onLessonReady={handleLessonReady}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* The end of a cleared day should look like an ending, not like the
            bottom of a list. */}
        {allDone && (
          <div className="animate-fade-in flex flex-col items-center gap-1 border-t border-emerald-100 bg-emerald-50/60 px-6 py-6 text-center">
            <PartyPopper className="mb-1 h-6 w-6 text-emerald-600" />
            <p className="font-bold text-ink-900">Today&apos;s plan is finished</p>
            <p className="max-w-sm text-sm text-ink-600">
              A new set of tasks is waiting tomorrow. Show up again and the streak keeps growing.
            </p>
          </div>
        )}

        {/* One more, for the days there is time for it.
            Quiet and at the foot of the list on purpose: the plan is still the
            plan, and this is a door rather than a prompt. Offering it up top
            would turn a one-task day into a suggestion to collect more. */}
        {tasks.length > 0 && !needsRoadmap && !examEve && (
          <div className="relative flex flex-col items-center gap-2 overflow-hidden border-t border-journey-100 bg-gradient-to-r from-journey-50 via-pink-50/60 to-amber-50 px-6 py-6 text-center">
            <span aria-hidden className="fp-drift-icon pointer-events-none absolute top-3 left-[12%] text-base" style={{ animationDelay: '-1.8s' }}>✨</span>
            <span aria-hidden className="fp-drift-icon pointer-events-none absolute right-[14%] bottom-4 text-sm" style={{ animationDelay: '-3.1s' }}>⭐</span>
            <span aria-hidden className="fp-drift-icon pointer-events-none absolute top-5 right-[28%] text-sm" style={{ animationDelay: '-0.7s' }}>🚀</span>
            {/* Unlocked only once every task for today is done. Until then it
                sits greyed with a lock, so the student can see the door but
                knows what opens it. The beacon animation runs only when it
                can actually be pressed. */}
            <button
              type="button"
              onClick={handleAddAnother}
              disabled={addingTask || !allDone}
              aria-busy={addingTask || undefined}
              aria-disabled={!allDone || undefined}
              title={allDone ? undefined : 'Finish today’s tasks first'}
              className={`group relative inline-flex min-h-11 items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-pink-500 to-journey-600 px-5 py-2.5 text-sm font-black text-white shadow-md ${
                allDone
                  ? 'fp-btn fp-btn-warm fp-beacon fp-sweep disabled:cursor-not-allowed disabled:opacity-70'
                  : // Locked: still in colour so it reads as a reward waiting,
                    // but dimmed, still, and with a lock — not a button that
                    // is merely broken.
                    'cursor-not-allowed opacity-80 shadow-pink-500/20 saturate-[.85]'
              }`}
            >
              {addingTask ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : allDone ? (
                <Sparkles className="fp-bolt h-4 w-4 fill-white/30" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {addingTask ? 'Finding one for you…' : 'Generate another task'}
              {!addingTask && allDone && <Plus className="fp-btn-arrow h-4 w-4" strokeWidth={3} />}
            </button>
            <p className="text-xs font-semibold text-ink-600">
              {allDone
                ? 'Finished early? Got time — add one more for today.'
                : `Finish ${remaining === 1 ? 'the last task' : `all ${remaining} tasks`} for today to unlock one more.`}
            </p>
          </div>
        )}
      </Card>

      {/* No "Learning Resources" card here. Courses and books are reference
          material for the whole path, not something to act on today — the
          lesson attached to each task is where today's learning happens. */}
      {plannerContext?.skillsToDevelop?.length > 0 && (
        <Card hover className="animate-fade-in-up">
          <CardHeader
            icon={Award}
            title="Skills to Develop"
            subtitle="What today's work is building towards"
            accent="amber"
          />
          <ul className="grid min-w-0 gap-2.5 sm:grid-cols-2">
            {plannerContext.skillsToDevelop.map((skill, i) => (
              <li
                key={i}
                className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-surface-50 px-4 py-2.5 ring-1 ring-line-100 ring-inset transition-colors hover:bg-surface-100"
              >
                {/* min-w-0 so a long name shrinks and wraps inside the row
                    instead of pushing the row out of the card. */}
                <span className="min-w-0 flex-1 text-sm font-semibold break-words text-ink-800">{skill.skillName}</span>
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                  {skill.level}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
