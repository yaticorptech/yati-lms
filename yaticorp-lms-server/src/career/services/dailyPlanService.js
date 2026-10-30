const Task = require('../models/Task');
const DailyPlan = require('../models/DailyPlan');
const Goal = require('../models/Goal');
const Roadmap = require('../models/Roadmap');
const User = require('../models/User');
const PlannerContext = require('../models/PlannerContext');
const CalendarEvent = require('../models/CalendarEvent');
const TaskStudy = require('../models/TaskStudy');
const SkillProgress = require('../models/SkillProgress');
const { generateDailyTasksFromAI } = require('./geminiService');
const { AiBudgetError } = require('./aiQuota');

// How much history the day's prompt carries. Enough for the model to see the
// direction of travel without bloating the prompt with weeks of titles.
const HISTORY_LIMIT = 20;

// Below this there is no point generating anything — a five-minute task is
// busywork, and offering it reads as nagging.
const MIN_USEFUL_MINUTES = 15;

// How long a 'generating' claim may stand before it is treated as abandoned.
// A build is one Gemini call — well under a minute — so a claim older than this
// belongs to a request that died (a restart mid-call). Without the cut-off the
// planner, which now waits on a generating day, would wait until midnight.
const STALE_CLAIM_MS = 3 * 60 * 1000;

// How long a failed day waits before "Try again" may build it again. Long
// enough that a student hammering the button cannot turn one outage into a
// dozen AI calls; short enough that a real retry is never kept waiting.
const RETRY_COOLDOWN_MS = 30 * 1000;

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

/*
 * Career Path's day is the platform's day: Asia/Kolkata unless
 * REWARDS_TIMEZONE says otherwise — the same one the rewards streak, the
 * leaderboard and the monthly cap roll over on. These used to read the server
 * process's own clock, which only agreed with rewards on a machine set to IST;
 * on a server running UTC the plan turned over at 05:30 in the morning while
 * the streak turned over at midnight, so one evening's task could count for
 * the "wrong" day in one place and the right one in the other.
 *
 * Existing rows were stamped with the server's local midnight. On an IST
 * machine that IS the IST midnight these produce, and a UTC midnight still
 * falls inside the IST day it belongs to, so range queries over
 * [startOfDay, addDays(startOfDay, 1)) keep finding them either way.
 */
const platformDay = require('../../rewards/config/constants');

/** Midnight in the platform timezone — the canonical stamp for "which day is this". */
const startOfDay = (date = new Date()) => platformDay.startOfDay(platformDay.dayKey(new Date(date)));

/**
 * Move an instant by whole platform days. Shifted by the distance between the
 * two midnights rather than a flat 24 hours, so a platform zone with daylight
 * saving still lands a midnight on a midnight.
 */
const addDays = (date, days) => {
  const d = new Date(date);
  const key = platformDay.dayKey(d);
  const shift = platformDay.startOfDay(platformDay.addDays(key, days)) - platformDay.startOfDay(key);
  return new Date(d.getTime() + shift);
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
 * How many of yesterday's tasks ran out unfinished — read from the data.
 *
 * The planner's "N tasks moved to your backlog" used to show the count the
 * sweep above returned, but several requests sweep (the planner, the profile,
 * the app's own header), and whichever got there first took the number: the
 * planner nearly always saw 0. Yesterday's Skipped tasks are the same answer
 * on every request, all day. A task picked back up since — finished, or put
 * back on today — has stopped being Skipped and drops out of the count.
 */
const missedYesterday = async (userId, today = startOfDay()) =>
  Task.countDocuments({ userId, status: 'Skipped', assignedDate: { $gte: addDays(today, -1), $lt: today } });

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
 * The day as the student's calendar writes it: a square on a grid. CalendarEvent
 * stores 'YYYY-MM-DD' strings precisely so an exam does not slide to the day
 * before when read on a server running UTC — so the key is taken in the
 * platform timezone, never the server's.
 */
const toISODate = (date) => platformDay.dayKey(new Date(date));

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
 * The names of the skills this student is actually tracking.
 *
 * Handed to the generator so it tags each task with one of them rather than a
 * skill of its own invention — the tag is only useful if it matches a row that
 * exists.
 */
const trackedSkillNames = async (userId) => {
  const rows = await SkillProgress.find({ userId }).select('skillName').lean();
  return rows.map((r) => r.skillName);
};

/**
 * Keep a generated skill tag only when it names a real tracked skill.
 *
 * The same guard the roadmap applies to course ids: a model asked to copy from
 * a list will occasionally paraphrase, and a tag that matches nothing would
 * quietly credit no skill while looking like it credited one. Matched without
 * case sensitivity, then normalised to the stored spelling so completion can
 * compare names directly.
 */
const validSkillTag = (tag, tracked) => {
  if (!tag || typeof tag !== 'string') return undefined;
  const wanted = tag.trim().toLowerCase();
  return tracked.find((name) => name.toLowerCase() === wanted);
};

/**
 * Withdraw work already handed out for a day that has since become an exam eve
 * (or been reshaped to a new time budget).
 *
 * Refusing to *generate* is only half of it. An exam added at four in the
 * afternoon finds today's task already written and sitting in the planner, and
 * two things then go wrong: the student is still shown work on a day the app
 * says is clear, and tomorrow's sweep marks that untouched task Skipped —
 * costing them the streak for an evening they spent revising, which is exactly
 * what the clear day was for.
 *
 * Only UNTOUCHED Pending tasks are withdrawn. Kept, because deleting them
 * deletes something the student owns:
 *   • anything Completed — the XP and streak credit are theirs;
 *   • a task with a lesson built for it — the lesson was paid for (wallet
 *     rule) or at least cost an AI call, and may be half watched, half read or
 *     half passed. Deleting the task took the lesson, its progress and its
 *     quiz score with it, silently;
 *   • a task brought back from the backlog ("Do it today") — that moves the
 *     original Skipped record onto today, so deleting it erased the only copy
 *     of that piece of work from the student's history. Recognised by
 *     `redoneAt`, or for tasks moved before that stamp existed, by having been
 *     created before today.
 * Kept tasks stay on today's plan; if the day ends with them open, the sweep
 * moves them to the backlog like any other missed task, lesson intact.
 *
 * @returns {Promise<{cleared: number, kept: object[]}>} how many tasks were
 *   withdrawn, and the pending ones left in place
 */
const clearTodaysPendingWork = async (userId, today = startOfDay()) => {
  const tomorrow = addDays(today, 1);
  const pending = await Task.find({
    userId,
    assignedDate: { $gte: today, $lt: tomorrow },
    status: 'Pending'
  }).select('_id title duration createdAt redoneAt').lean();

  if (!pending.length) return { cleared: 0, kept: [] };

  const lessons = await TaskStudy.find({ userId, taskId: { $in: pending.map((t) => t._id) } })
    .select('taskId')
    .lean();
  const hasLesson = new Set(lessons.map((l) => String(l.taskId)));
  const keep = (task) =>
    hasLesson.has(String(task._id)) ||
    !!task.redoneAt ||
    (task.createdAt && new Date(task.createdAt) < today);

  const kept = pending.filter(keep);
  const ids = pending.filter((task) => !keep(task)).map((task) => task._id);
  // Still conditional on Pending, so a task finished in the moment between
  // the read above and this write is not deleted out from under its credit.
  if (ids.length) await Task.deleteMany({ _id: { $in: ids }, status: 'Pending' });

  return { cleared: ids.length, kept };
};

/**
 * What a failed build tells the student, and when it may be tried again.
 *
 * The student gets words, never the provider's error: "Failed to generate
 * today's plan: fetch failed" or a quota id is the operator's to read, in the
 * log. A spent allowance keeps its code and the moment it comes back, so the
 * planner can say so instead of offering a retry that can only fail the same
 * way; everything else may be retried after a short cooldown.
 */
const planFailure = (error) => {
  if (error instanceof AiBudgetError) {
    return { message: error.message, code: error.code, resetsAt: error.resetsAt, retryAfter: error.resetsAt };
  }
  const retryAfter = new Date(Date.now() + RETRY_COOLDOWN_MS);
  // A student's own key that Google refused, or no key at all: already
  // written for the student, and theirs to act on.
  if (error?.name === 'AiKeyError') return { message: error.message, code: null, resetsAt: null, retryAfter };
  return {
    message: "We couldn't build today's plan just now. Please try again in a few minutes.",
    code: null,
    resetsAt: null,
    retryAfter
  };
};

/** A failed day as ensureTodaysPlan reports it. */
const failedDay = (plan) => ({
  status: 'failed',
  generated: 0,
  message: plan.error,
  code: plan.code || null,
  resetsAt: plan.resetsAt || null,
  retryAfter: plan.retryAfter || null,
  timeBudgetMinutes: plan.timeBudgetMinutes
});

/**
 * Ensure today's tasks exist, generating them once if they do not.
 *
 * Claim-first: the DailyPlan insert is attempted before any AI call, so a
 * duplicate-key error tells a losing racer to stand down instead of spending a
 * second Gemini call and writing a second copy of the day.
 *
 * A day whose build failed stays failed until the student asks again —
 * `retry: true`, which only the planner's "Try again" sends — and not before
 * its cooldown (`retryAfter`) is over. Every other read just reports it.
 *
 * @returns {Promise<{status: string, generated: number, message?: string}>}
 */
const ensureTodaysPlan = async (userId, budgetOverride, { retry = false } = {}) => {
  const today = startOfDay();

  // Tested before the claimed-day check below, so it covers a day whose plan
  // was already built when the exam was added to the calendar, and before the
  // Gemini call, so an exam eve costs nothing to generate.
  const exams = await examsTomorrow(userId, today);
  if (exams.length > 0) {
    const { cleared } = await clearTodaysPendingWork(userId, today);
    return {
      status: 'exam-eve',
      generated: 0,
      cleared,
      timeBudgetMinutes: (await User.findById(userId).select('dailyTimeBudget'))?.dailyTimeBudget || 60,
      exams: exams.map((e) => e.title)
    };
  }

  // Already generated (or being generated by a request that arrived first).
  let existing = await DailyPlan.findOne({ userId, date: today });
  if (existing?.status === 'generating' && Date.now() - new Date(existing.updatedAt).getTime() > STALE_CLAIM_MS) {
    // Conditional on the same updatedAt, so only one request releases it and
    // a live build that just saved is never removed from under itself.
    await DailyPlan.deleteOne({ _id: existing._id, status: 'generating', updatedAt: existing.updatedAt });
    existing = null;
  }

  // A failed day is reported as failed — not rebuilt — unless this is an
  // explicit retry and its cooldown is over. It used to be deleted on failure,
  // so the Overview, the Skills page and the planner each started their own
  // AI call on the next visit and failed again, every visit, all day.
  let failed = null;
  if (existing?.status === 'failed') {
    const due = !existing.retryAfter || Date.now() >= new Date(existing.retryAfter).getTime();
    if (!retry || !due) return failedDay(existing);
    failed = existing;
    existing = null;
  }

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
  const minutes = budgetOverride || failed?.timeBudgetMinutes || user?.dailyTimeBudget || 60;

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
  // requests, not an error. A retried failed day is taken back the same way:
  // conditional on the same updatedAt, so two retries racing build it once.
  let claim;
  if (failed) {
    claim = await DailyPlan.findOneAndUpdate(
      { _id: failed._id, status: 'failed', updatedAt: failed.updatedAt },
      { $set: { status: 'generating', timeBudgetMinutes: minutes }, $unset: { error: 1, code: 1, resetsAt: 1, retryAfter: 1 } },
      { returnDocument: 'after' }
    );
    if (!claim) return { status: 'generating', generated: 0, timeBudgetMinutes: minutes };
  } else {
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
  }

  try {
    const history = await buildHistory(userId);
    const tracked = await trackedSkillNames(userId);
    const aiData = await generateDailyTasksFromAI(goal, roadmap, history, minutes, tracked);

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
        skill: validSkillTag(task.skill, tracked),
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
    // Record the failure and KEEP the day, failed. Deleting it (as this used
    // to) made the next read of today's plan — from any page — start another
    // AI call, so one bad spell burned the student's allowance on repeats of
    // the same failure. The planner's "Try again" asks for a rebuild, after
    // the cooldown; the student can always ask, they are just never asked
    // for them.
    const failure = planFailure(error);
    claim.status = 'failed';
    claim.error = failure.message;
    claim.code = failure.code || undefined;
    claim.resetsAt = failure.resetsAt || undefined;
    claim.retryAfter = failure.retryAfter;
    await claim.save();

    console.error('Daily plan generation failed:', error.message);
    // `code` distinguishes "the day's AI allowance is spent" from "generation
    // broke". Both leave the student's existing tasks readable — the plan
    // builder never throws past here — but only one of them is worth telling
    // them to come back later for, and only one is worth an operator's
    // attention.
    return { status: 'failed', generated: 0, timeBudgetMinutes: minutes, ...failure };
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
  // Not for the demo (presentation) cards, which can always ask for another.
  const exams = (await require('../../services/fullAccess').fullAccessForUserId(userId)) ? [] : await examsTomorrow(userId, today);
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

  const tracked = await trackedSkillNames(userId);
  const aiData = await generateDailyTasksFromAI(goal, roadmap, history, window, tracked);
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
    skill: validSkillTag(pick.skill, tracked),
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

  // Reshaping the day must not resurrect it. Below, an existing plan has its
  // pending work cleared and regenerated at the new size — on an exam eve that
  // would hand back the very task the clear day exists to withhold. The budget
  // itself is still remembered above, ready for the day after the exam.
  const exams = await examsTomorrow(userId, today);
  if (exams.length > 0) {
    const { cleared } = await clearTodaysPendingWork(userId, today);
    return {
      status: 'exam-eve',
      generated: 0,
      cleared,
      timeBudgetMinutes: minutes,
      exams: exams.map((e) => e.title)
    };
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

  // Clear only what has not been started. Completed work is untouched, and so
  // is a pending task with a lesson behind it or one brought back from the
  // backlog (see clearTodaysPendingWork) — those stay on today's plan and
  // their time counts as spent, like finished work.
  const { kept } = await clearTodaysPendingWork(userId, today);
  const onPlan = [...doneToday, ...kept];

  const spent = onPlan.reduce((total, task) => total + parseMinutes(task.duration), 0);
  const remaining = minutes - spent;

  if (remaining < MIN_USEFUL_MINUTES) {
    plan.taskCount = onPlan.length;
    plan.status = 'ready';
    await plan.save();
    return {
      status: 'ready',
      generated: 0,
      timeBudgetMinutes: minutes,
      // "You have done enough today" is only true with nothing left open.
      alreadyDone: kept.length === 0
    };
  }

  try {
    const history = await buildHistory(userId);
    // Today's finished (and kept) work joins the "do not repeat" list, so the
    // smaller plan continues from it rather than re-issuing it.
    history.completed = [...onPlan.map((t) => t.title), ...history.completed];

    const tracked = await trackedSkillNames(userId);
    const aiData = await generateDailyTasksFromAI(goal, roadmap, history, remaining, tracked);
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
        skill: validSkillTag(task.skill, tracked),
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

    plan.taskCount = onPlan.length + created.length;
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
    // Words for the student, as on a failed first build.
    return { status: 'failed', generated: 0, timeBudgetMinutes: minutes, ...planFailure(error) };
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
  missedYesterday,
  clearTodaysPendingWork,
  planFailure,
  ensureTodaysPlan,
  setTodaysTimeBudget,
  addAnotherTask
};
