const Task = require('../models/Task');
const DailyPlan = require('../models/DailyPlan');
const Goal = require('../models/Goal');
const Roadmap = require('../models/Roadmap');
const User = require('../models/User');
const PlannerContext = require('../models/PlannerContext');
const CalendarEvent = require('../models/CalendarEvent');
const { generateDailyTasksFromAI } = require('./geminiService');

// How much history the day's prompt carries. Enough for the model to see the
// direction of travel without bloating the prompt with weeks of titles.
const HISTORY_LIMIT = 20;

// Below this there is no point generating anything — a five-minute task is
// busywork, and offering it reads as nagging.
const MIN_USEFUL_MINUTES = 15;

// Size of an extra task requested after the day's budget is already used up.
// Short on purpose: they have done their planned work, so this is a bonus round
// rather than a second day bolted onto the first.
const EXTRA_TASK_MINUTES = 30;

/**
 * Durations are free text from the model ('45 mins', '1 hour', '1.5 hours').
 * Parsed leniently: an unrecognised value is treated as 30 minutes rather than
 * zero, so a bad parse under-fills the day instead of overbooking it.
 */
const parseMinutes = (duration) => {
  if (!duration) return 30;

  const text = String(duration).toLowerCase();
  const hours = /([\d.]+)\s*(?:h|hr|hour)/.exec(text);
  const mins = /([\d.]+)\s*(?:m|min)/.exec(text);

  let total = 0;
  if (hours) total += parseFloat(hours[1]) * 60;
  if (mins) total += parseFloat(mins[1]);

  if (!total) {
    const bare = /([\d.]+)/.exec(text);
    total = bare ? parseFloat(bare[1]) : 30;
  }
  return Math.round(total) || 30;
};

/**
 * Cut a generated plan down to exactly one task.
 *
 * A day is one real task. Five items is a list that gets abandoned by day
 * three; one gets finished, and finishing is the whole mechanism this product
 * runs on.
 *
 * There used to be an exception: a second task when the first was a short one,
 * so a twenty-minute day did not read as empty. That is no
 * longer the plan's job — "Generate another task" now sits at the foot of the
 * list, so a student who finishes early asks for more rather than being handed
 * work they did not want. One is what the day opens with, always.
 *
 * The prompt asks for exactly this, but a prompt is a request, not a guarantee
 * — the model regularly returned three 45-minute tasks for a 60-minute day. So
 * the rule is enforced here as well, where it is arithmetic rather than
 * persuasion.
 *
 * The task is clamped to the budget if the model overran it, because an empty
 * plan is worse than a slightly optimistic one. The duration is normalised to
 * whole minutes, so what is stored is what was actually budgeted.
 */
const fitToBudget = (tasks, minutes) => {
  const first = tasks[0];
  if (!first) return { tasks: [], plannedMinutes: 0 };

  const cost = Math.min(parseMinutes(first.duration), minutes);
  return {
    tasks: [{ ...first, minutes: cost, duration: `${cost} mins` }],
    plannedMinutes: cost
  };
};

/** Local midnight for a date — the canonical stamp for "which day is this". */
const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Mark every task still Pending from a day before today as Skipped.
 *
 * This is what "skipped" means here: the day passed and the work was not done.
 * Runs on read rather than on a cron, so it is correct even if the server was
 * offline for a week — the sweep covers everything older than today regardless
 * of how long the gap was.
 *
 * @returns {Promise<number>} how many tasks were newly marked skipped
 */
const sweepMissedTasks = async (userId) => {
  const today = startOfDay();

  const result = await Task.updateMany(
    {
      userId,
      status: 'Pending',
      // Only tasks that were actually assigned to a past day. Tasks with no
      // assignedDate predate the daily plan and are left alone rather than
      // being retroactively declared missed.
      assignedDate: { $ne: null, $lt: today }
    },
    {
      $set: { status: 'Skipped', skippedAt: new Date() }
    }
  );

  return result.modifiedCount || 0;
};

/**
 * The titles the day's prompt needs so it does not repeat itself.
 * Skipped titles are deduplicated — the same task missed four times should read
 * as one idea the student keeps avoiding, not four separate failures.
 */
const buildHistory = async (userId) => {
  const [completed, skipped, dayCount] = await Promise.all([
    Task.find({ userId, status: 'Completed' }).sort({ completedAt: -1 }).limit(HISTORY_LIMIT).select('title'),
    Task.find({ userId, status: 'Skipped' }).sort({ skippedAt: -1 }).limit(HISTORY_LIMIT).select('title'),
    DailyPlan.countDocuments({ userId })
  ]);

  return {
    completed: completed.map((t) => t.title),
    skipped: [...new Set(skipped.map((t) => t.title))],
    dayNumber: dayCount + 1
  };
};

/**
 * The day as the student's calendar writes it: a square on a grid, in their own
 * local time. CalendarEvent stores 'YYYY-MM-DD' strings precisely so an exam
 * does not slide to the day before when read on a server running UTC.
 */
const toISODate = (date) => {
  const d = new Date(date);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
};

/**
 * Anything on the student's calendar marked as an exam, the day after this one.
 *
 * The evening before an exam belongs to the exam. Handing someone a new topic
 * to learn then is worse than handing them nothing: it competes with revision
 * for the few hours that matter most, and skipping it costs them their streak
 * for a day they spent exactly as they should have.
 */
const examsTomorrow = async (userId, today = startOfDay()) =>
  CalendarEvent.find({ userId, date: toISODate(addDays(today, 1)), type: 'Exam' })
    .select('title date')
    .limit(5)
    .lean();

/**
 * Ensure today's tasks exist, generating them once if they do not.
 *
 * Claim-first: the DailyPlan insert is attempted before any AI call, so a
 * duplicate-key error tells a losing racer to stand down instead of spending a
 * second Gemini call and writing a second copy of the day.
 *
 * @returns {Promise<{status: string, generated: number, message?: string}>}
 */
const ensureTodaysPlan = async (userId, budgetOverride) => {
  const today = startOfDay();

  // Tested before the claimed-day check below, so it covers a day whose plan
  // was already built when the exam was added to the calendar, and before the
  // Gemini call, so an exam eve costs nothing to generate.
  const exams = await examsTomorrow(userId, today);
  if (exams.length > 0) {
    return {
      status: 'exam-eve',
      generated: 0,
      timeBudgetMinutes: (await User.findById(userId).select('dailyTimeBudget'))?.dailyTimeBudget || 60,
      exams: exams.map((e) => e.title)
    };
  }

  // Already generated (or being generated by a request that arrived first).
  const existing = await DailyPlan.findOne({ userId, date: today });
  if (existing) {
    return {
      status: existing.status,
      generated: existing.taskCount,
      message: existing.error,
      timeBudgetMinutes: existing.timeBudgetMinutes
    };
  }

  // Today starts at whatever the student said a normal day looks like for them.
  // They are never asked up front — being interrogated before seeing anything is
  // its own kind of friction — they just adjust it if today is different.
  const user = await User.findById(userId).select('dailyTimeBudget');
  const minutes = budgetOverride || user?.dailyTimeBudget || 60;

  // A plan needs somewhere to go. Without these the student has not finished
  // onboarding, and the planner shows its "generate a roadmap first" state.
  const [goal, roadmap] = await Promise.all([
    Goal.findOne({ userId }),
    Roadmap.findOne({ userId })
  ]);
  if (!goal || !roadmap) {
    return { status: 'no-roadmap', generated: 0, timeBudgetMinutes: minutes };
  }

  // Claim the day. Losing this race is the normal outcome for concurrent
  // requests, not an error.
  let claim;
  try {
    claim = await DailyPlan.create({
      userId,
      date: today,
      status: 'generating',
      timeBudgetMinutes: minutes
    });
  } catch (error) {
    if (error.code === 11000) {
      return { status: 'generating', generated: 0, timeBudgetMinutes: minutes };
    }
    throw error;
  }

  try {
    const history = await buildHistory(userId);
    const aiData = await generateDailyTasksFromAI(goal, roadmap, history, minutes);

    const returned = (aiData.tasks || []).filter((t) => t.title);
    if (!returned.length) {
      throw new Error('The AI returned no tasks for today.');
    }

    // The budget is enforced here, not merely requested in the prompt.
    const { tasks, plannedMinutes } = fitToBudget(returned, minutes);
    if (tasks.length < returned.length) {
      console.warn(
        `Daily plan trimmed for user ${userId}: model returned ${returned.length} tasks, ` +
        `${plannedMinutes}/${minutes} min kept (${returned.length - tasks.length} dropped).`
      );
    }

    const created = await Task.insertMany(
      tasks.map((task) => ({
        userId,
        roadmapId: roadmap._id,
        title: task.title,
        description: task.description,
        category: task.category || 'Daily',
        duration: task.duration,
        // Falls back to 'video' when the model omits it, matching the schema
        // default — a missing field must not silently become "no lesson".
        learning: task.learning || 'video',
        // Only meaningful without a lesson; stored only when actually supplied
        // so a task with a lesson does not carry an empty array around.
        guidance: task.learning === 'none' && task.guidance?.length ? task.guidance : undefined,
        assignedDate: today,
        // Due at the end of the day it was assigned for.
        dueDate: addDays(today, 1),
        status: 'Pending'
      }))
    );

    // Today's headline focus, shown above the task list.
    if (aiData.focusForToday) {
      await PlannerContext.findOneAndUpdate(
        { userId },
        { $set: { currentFocus: [aiData.focusForToday] } },
        { upsert: true }
      );
    }

    claim.status = 'ready';
    claim.taskCount = created.length;
    await claim.save();

    return {
      status: 'ready',
      generated: created.length,
      timeBudgetMinutes: minutes,
      plannedMinutes
    };
  } catch (error) {
    // Record the failure but release the day, so the student can retry rather
    // than being locked out until midnight by one bad Gemini call.
    claim.status = 'failed';
    claim.error = error.message;
    await claim.save();
    await DailyPlan.deleteOne({ _id: claim._id });

    console.error('Daily plan generation failed:', error.message);
    // `code` distinguishes "the day's AI allowance is spent" from "generation
    // broke". Both leave the student's existing tasks readable — the plan
    // builder never throws past here — but only one of them is worth telling
    // them to come back tomorrow for, and only one is worth an operator's
    // attention.
    return { status: 'failed', generated: 0, message: error.message, code: error.code };
  }
};

/**
 * Add ONE more task to today, on request.
 *
 * The daily plan deliberately hands out a single task, because a list of five
 * is a list that gets abandoned. That rule is about what the student is *given*
 * — it was never meant to cap what they can ask for. Someone who has finished
 * today's task and wants to keep going should not have to wait until tomorrow.
 *
 * Sized to whatever is left of the day's budget. When the budget is already
 * spent the task is still generated — they asked for it — just at a modest
 * default rather than another full day's worth.
 *
 * @returns {Promise<{status: string, task?: object, overBudget?: boolean, message?: string}>}
 */
const addAnotherTask = async (userId) => {
  const today = startOfDay();
  const tomorrow = addDays(today, 1);

  // The day before an exam is kept clear, and asking for one by hand does not
  // change what tomorrow is.
  const exams = await examsTomorrow(userId, today);
  if (exams.length > 0) {
    return { status: 'exam-eve', exams: exams.map((e) => e.title) };
  }

  const [goal, roadmap] = await Promise.all([
    Goal.findOne({ userId }),
    Roadmap.findOne({ userId })
  ]);
  if (!goal || !roadmap) {
    return { status: 'no-roadmap' };
  }

  const todays = await Task.find({
    userId,
    assignedDate: { $gte: today, $lt: tomorrow }
  }).select('title duration');

  const [plan, user] = await Promise.all([
    DailyPlan.findOne({ userId, date: today }),
    User.findById(userId).select('dailyTimeBudget')
  ]);

  const budget = plan?.timeBudgetMinutes || user?.dailyTimeBudget || 60;
  const spent = todays.reduce((total, t) => total + parseMinutes(t.duration), 0);
  const room = Math.max(0, budget - spent);
  const overBudget = room < MIN_USEFUL_MINUTES;
  const window = overBudget ? EXTRA_TASK_MINUTES : room;

  const history = await buildHistory(userId);
  // Everything already on today's plan joins the do-not-repeat list. Without
  // this, "another task" cheerfully hands back the one they are looking at —
  // buildHistory only knows about completed and skipped work, so today's
  // still-pending task is invisible to it.
  history.completed = [...todays.map((t) => t.title), ...history.completed];

  const aiData = await generateDailyTasksFromAI(goal, roadmap, history, window);
  const returned = (aiData.tasks || []).filter((t) => t.title);
  if (!returned.length) {
    return { status: 'failed', message: 'The AI returned no task.' };
  }

  // Belt and braces: the prompt is told not to repeat, but a title already on
  // today's plan is the one failure that makes this button look broken. Prefer
  // the first genuinely new suggestion, and fall back to the first if the model
  // only offered repeats.
  const onPlan = new Set(todays.map((t) => t.title.trim().toLowerCase()));
  const pick = returned.find((t) => !onPlan.has(t.title.trim().toLowerCase())) || returned[0];

  const cost = Math.min(parseMinutes(pick.duration), window);
  const created = await Task.create({
    userId,
    roadmapId: roadmap._id,
    title: pick.title,
    description: pick.description,
    category: pick.category || 'Daily',
    duration: `${cost} mins`,
    learning: pick.learning || 'video',
    guidance: pick.learning === 'none' && pick.guidance?.length ? pick.guidance : undefined,
    assignedDate: today,
    dueDate: tomorrow,
    status: 'Pending'
  });

  // Keep the day's own count honest, so anything reading DailyPlan sees the
  // task that was just added.
  if (plan) {
    plan.taskCount = todays.length + 1;
    if (plan.status !== 'ready') plan.status = 'ready';
    await plan.save();
  }

  return { status: 'ready', task: created, overBudget };
};

/**
 * Reshape today's plan to a new time budget.
 *
 * Only *unstarted* work is replaced. Anything already completed stays exactly
 * where it is and its time is deducted from the new budget — telling someone
 * their finished work has been deleted because they got busy is the opposite of
 * what this feature is for.
 *
 * Shrinking to a budget already spent is not an error: the plan simply becomes
 * "you have done enough today", which is a legitimate answer.
 *
 * @param {number} minutes new budget for today
 * @param {boolean} remember also make this the student's normal-day default
 */
const setTodaysTimeBudget = async (userId, minutes, remember = false) => {
  const today = startOfDay();
  const tomorrow = addDays(today, 1);

  if (remember) {
    await User.findByIdAndUpdate(userId, { dailyTimeBudget: minutes });
  }

  const plan = await DailyPlan.findOne({ userId, date: today });
  if (!plan) {
    // No plan yet today — generating one straight at the new budget is both
    // cheaper and more accurate than building a default and rewriting it.
    return ensureTodaysPlan(userId, minutes);
  }

  plan.timeBudgetMinutes = minutes;
  await plan.save();

  const [goal, roadmap] = await Promise.all([
    Goal.findOne({ userId }),
    Roadmap.findOne({ userId })
  ]);
  if (!goal || !roadmap) {
    return { status: 'no-roadmap', generated: 0, timeBudgetMinutes: minutes };
  }

  const doneToday = await Task.find({
    userId,
    assignedDate: { $gte: today, $lt: tomorrow },
    status: 'Completed'
  }).select('title duration');

  const spent = doneToday.reduce((total, task) => total + parseMinutes(task.duration), 0);
  const remaining = minutes - spent;

  // Clear only what has not been started. Completed work is untouched.
  await Task.deleteMany({
    userId,
    assignedDate: { $gte: today, $lt: tomorrow },
    status: 'Pending'
  });

  if (remaining < MIN_USEFUL_MINUTES) {
    plan.taskCount = doneToday.length;
    plan.status = 'ready';
    await plan.save();
    return {
      status: 'ready',
      generated: 0,
      timeBudgetMinutes: minutes,
      alreadyDone: true
    };
  }

  try {
    const history = await buildHistory(userId);
    // Today's finished work joins the "do not repeat" list, so the smaller plan
    // continues from it rather than re-issuing it.
    history.completed = [...doneToday.map((t) => t.title), ...history.completed];

    const aiData = await generateDailyTasksFromAI(goal, roadmap, history, remaining);
    const returned = (aiData.tasks || []).filter((t) => t.title);

    // Fitted to what is LEFT of the budget, not the whole of it — time already
    // spent on completed work is not available again.
    const { tasks, plannedMinutes } = fitToBudget(returned, remaining);

    const created = await Task.insertMany(
      tasks.map((task) => ({
        userId,
        roadmapId: roadmap._id,
        title: task.title,
        description: task.description,
        category: task.category || 'Daily',
        duration: task.duration,
        // Falls back to 'video' when the model omits it, matching the schema
        // default — a missing field must not silently become "no lesson".
        learning: task.learning || 'video',
        // Only meaningful without a lesson; stored only when actually supplied
        // so a task with a lesson does not carry an empty array around.
        guidance: task.learning === 'none' && task.guidance?.length ? task.guidance : undefined,
        assignedDate: today,
        dueDate: tomorrow,
        status: 'Pending'
      }))
    );

    if (aiData.focusForToday) {
      await PlannerContext.findOneAndUpdate(
        { userId },
        { $set: { currentFocus: [aiData.focusForToday] } },
        { upsert: true }
      );
    }

    plan.taskCount = doneToday.length + created.length;
    plan.status = 'ready';
    await plan.save();

    return {
      status: 'ready',
      generated: created.length,
      timeBudgetMinutes: minutes,
      // Time already spent counts towards what today's plan asks of them.
      plannedMinutes: spent + plannedMinutes
    };
  } catch (error) {
    console.error('Time budget reshape failed:', error.message);
    return { status: 'failed', generated: 0, timeBudgetMinutes: minutes, message: error.message };
  }
};

module.exports = {
  toISODate,
  examsTomorrow,
  startOfDay,
  addDays,
  parseMinutes,
  fitToBudget,
  sweepMissedTasks,
  ensureTodaysPlan,
  setTodaysTimeBudget,
  addAnotherTask
};
