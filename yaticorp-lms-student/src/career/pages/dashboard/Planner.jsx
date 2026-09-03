import { useState, useEffect, useRef, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import {
  Check, Sparkles, Target, Lightbulb, CalendarCheck, PartyPopper,
  ListTodo, ChevronDown, GraduationCap, Clock3, Map, Play, Trophy, Plus, Zap,
  BookOpen, MonitorPlay, ArrowRight
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import AiBudgetNotice from '../../components/AiBudgetNotice';
import { useCelebrate } from '../../components/ui/Celebration';
import Button from '../../components/ui/Button';
import Card, { CardHeader } from '../../components/ui/Card';
import MissionArt from '../../components/plan/MissionArt';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton';
import TaskStudyPanel from '../../components/study/TaskStudyPanel';
import LessonProgress from '../../components/study/LessonProgress';

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
        kind: 'day',
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
  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-ink-500">Building today&apos;s plan…</p>
        <SkeletonList rows={5} />
      </div>
    );
  }

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
  const nextTaskId = tasks.find((t) => t.status !== 'Completed')?._id;
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
      <section className="fp-journey-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-float sm:p-6">
        <div aria-hidden className="fp-stars pointer-events-none absolute inset-0" />
        <div
          aria-hidden
          className="fp-float pointer-events-none absolute -top-16 -left-12 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl"
        />

        <div className="relative flex flex-wrap items-center gap-5">
          {tasks.length > 0 && (
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
              <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90" aria-hidden>
                <circle cx="36" cy="36" r="31" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="8" />
                <circle
                  cx="36"
                  cy="36"
                  r="31"
                  fill="none"
                  stroke={dayCleared ? '#34d399' : '#fbbf24'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(donePercent / 100) * 2 * Math.PI * 31} ${2 * Math.PI * 31}`}
                  className="transition-[stroke-dasharray] duration-700 ease-out"
                />
              </svg>
              <span className="absolute text-lg font-black tabular-nums">
                {completed}/{tasks.length}
              </span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-[0.7rem] font-black tracking-[0.11em] text-journey-200 uppercase">
              {TODAY_LABEL}
            </p>
            <h1 className="mt-1 text-2xl leading-tight font-black sm:text-3xl">
              {dayCleared ? "Today's mission complete" : "Today's mission"}
            </h1>
            <p className="mt-1.5 text-sm font-semibold text-journey-100">{missionLine}</p>

            {tasks.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-2.5 py-1 text-xs font-black ring-1 ring-white/20 ring-inset">
                  <Zap className="h-3.5 w-3.5 text-amber-300" />
                  <span className="tabular-nums">{completed * TASK_XP}</span> XP earned today
                </span>
                {remaining > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-2.5 py-1 text-xs font-black ring-1 ring-white/20 ring-inset">
                    <Trophy className="h-3.5 w-3.5 text-amber-300" />
                    <span className="tabular-nums">{remaining * TASK_XP}</span> XP still on the table
                  </span>
                )}
              </div>
            )}
          </div>

          <MissionArt cleared={dayCleared} className="hidden h-32 w-40 shrink-0 sm:block" />
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

      {plannerContext?.currentFocus?.length > 0 && (
        <Card className="animate-fade-in-up border-brand-100 bg-surface-50">
          <CardHeader icon={Target} title="Current Focus" subtitle="Where to put your energy right now" />
          <ul className="space-y-2.5">
            {plannerContext.currentFocus.map((focus, i) => (
              <li key={i} className="flex gap-3 text-ink-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                <span className="text-sm leading-relaxed">{focus}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card padded={false} className="animate-fade-in-up overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line-100 bg-surface-50/80 px-6 py-4">
          <CalendarCheck className="h-5 w-5 text-ink-500" />
          <div className="min-w-0">
            <h2 className="font-bold text-ink-900">
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
                : 'Some need a lesson first. Others you just tick off.'}
            </p>
          </div>
          {tasks.length > 0 && (
            <span className="ml-auto shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink-500 ring-1 ring-line-200">
              {completed} / {tasks.length} done
            </span>
          )}
        </div>

        {/* The day as a bar. The fraction beside the heading is the same fact,
            but a count has to be read and compared; a bar that is nearly full
            is the reason someone finishes the last one. Emerald the whole way,
            so clearing the day and the tick on each task speak the same
            colour. */}
        {tasks.length > 0 && (
          <div
            role="progressbar"
            aria-valuenow={Math.round((completed / tasks.length) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Today's progress"
            className="h-1 w-full bg-surface-100"
          >
            <div
              className="fp-done-gradient h-full transition-[width] duration-700 ease-out"
              style={{ width: `${(completed / tasks.length) * 100}%` }}
            />
          </div>
        )}

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
              const stepsShown = !done || openSteps.has(task._id);

              return (
                <li key={task._id} className={open ? 'bg-surface-50/40' : ''}>
                  <div
                    className={`group relative flex items-start gap-3.5 px-6 py-4 transition-colors ${
                      isNext
                        ? 'bg-journey-50/50'
                        : done
                          ? // Finished work steps back rather than competing with
                            // what is still to do. It stays legible — it is proof
                            // of progress — but it should not read as a call to
                            // action alongside the task that is.
                            'bg-surface-50/40'
                          : 'hover:bg-surface-50/80'
                    }`}
                  >
                    {/* The one task to start now gets a coloured spine and a
                        single sweep of light. Everything else on this page is
                        equally weighted, which is exactly the problem: a list
                        of five identical rows asks the student to choose
                        before they can begin. */}
                    {isNext && (
                      <>
                        <span
                          aria-hidden
                          className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-journey-500 to-indigo-600"
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
                          ? 'bg-emerald-50 text-emerald-600 ring-emerald-200'
                          : started
                            ? 'bg-blue-50 text-blue-600 ring-blue-200'
                            : isNext
                              ? 'bg-gradient-to-br from-journey-500 to-indigo-600 text-white ring-journey-300 shadow-sm shadow-journey-600/30'
                              : 'bg-surface-100 text-ink-400 ring-line-200'
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
                          <span aria-hidden>🎯</span>
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
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[0.68rem] font-bold text-emerald-700 ring-1 ring-emerald-100 ring-inset">
                            <Check className="h-3 w-3" strokeWidth={3} />
                            Done · +{TASK_XP} XP
                          </span>
                        ) : (
                          /* What finishing it is worth, on the row where the
                             work is. The same TASK_XP the header totals and the
                             server actually awards — so it is a promise rather
                             than an incentive made up for the page. */
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[0.68rem] font-black text-amber-700 ring-1 ring-amber-100 ring-inset">
                            <Zap className="h-3 w-3" />
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
                          {done && (
                            <button
                              type="button"
                              onClick={() => toggleSteps(task._id)}
                              aria-expanded={stepsShown}
                              className="mt-2 inline-flex items-center gap-1 rounded-lg text-xs font-bold text-ink-400 transition-colors hover:text-ink-700"
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
                                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-surface-100 text-[0.68rem] font-bold text-ink-500 tabular-nums">
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
                    {needsNothing ? (
                      <button
                        type="button"
                        onClick={() => handleManualToggle(task)}
                        disabled={ticking === task._id}
                        aria-pressed={done}
                        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 transition-all active:scale-[0.94] disabled:opacity-50 ${
                          done
                            ? 'bg-emerald-500 text-white ring-emerald-500 hover:bg-emerald-600'
                            : 'bg-surface text-ink-400 ring-line-300 hover:border-brand-400 hover:text-link hover:ring-brand-400'
                        }`}
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
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
                        className={`relative mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.96] ${
                          open
                            ? 'bg-brand-600 text-white shadow-sm'
                            : done
                              ? 'bg-surface-100 text-ink-500 hover:bg-surface-200'
                              : 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 hover:shadow-md'
                        }`}
                      >
                        <GraduationCap className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">
                          {open ? 'Close' : done ? 'Review' : started ? 'Continue' : 'Start'}
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Mounted only while open: each panel embeds a player and
                      fetches its own lesson. Never for a task that needs none. */}
                  {open && !needsNothing && (
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
          <div className="flex flex-col items-center gap-1.5 border-t border-line-100 bg-surface-50/60 px-6 py-5 text-center">
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              loading={addingTask}
              loadingText="Finding one for you…"
              onClick={handleAddAnother}
            >
              Generate another task
            </Button>
            <p className="text-xs text-ink-500">
              {allDone
                ? 'Finished early? Add one more for today.'
                : 'Only if you have the time — today’s plan is already set.'}
            </p>
          </div>
        )}
      </Card>

      {/* No "Learning Resources" card here. Courses and books are reference
          material for the whole path, not something to act on today — the
          lesson attached to each task is where today's learning happens. */}
      {plannerContext?.skillsToDevelop?.length > 0 && (
        <Card hover className="animate-fade-in-up">
          <CardHeader icon={Lightbulb} title="Skills to Develop" accent="amber" />
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {plannerContext.skillsToDevelop.map((skill, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg bg-surface-50 px-4 py-2.5 transition-colors hover:bg-surface-100"
              >
                <span className="text-sm font-medium text-ink-800">{skill.skillName}</span>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
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
