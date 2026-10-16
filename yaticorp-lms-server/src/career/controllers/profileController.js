const Task = require('../models/Task');
const Goal = require('../models/Goal');
const Roadmap = require('../models/Roadmap');
const SkillProgress = require('../models/SkillProgress');
const DailyPlan = require('../models/DailyPlan');
const Achievement = require('../models/Achievement');
const { startOfDay, addDays, toISODate, sweepMissedTasks } = require('../services/dailyPlanService');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

// A skipped task the student keeps missing is the signal worth surfacing, so
// the profile groups repeats rather than listing the same title over and over.
const SKIPPED_LIMIT = 30;

/**
 * Consecutive days ending today (or yesterday) with at least one completed task.
 *
 * Counted from completion dates rather than a stored counter: a stored streak
 * drifts the moment a task is reopened or the server misses a midnight tick.
 */
const calculateStreak = (completedDates) => {
  if (!completedDates.length) return 0;

  const days = new Set(completedDates.map((d) => startOfDay(d).getTime()));
  const today = startOfDay().getTime();
  const yesterday = startOfDay(addDays(new Date(), -1)).getTime();

  // Today not being done yet must not wipe a real streak — start from yesterday
  // in that case, and only call it zero once yesterday is missed too.
  let cursor = days.has(today) ? today : yesterday;
  if (!days.has(cursor)) return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = startOfDay(addDays(new Date(cursor), -1)).getTime();
  }
  return streak;
};

/**
 * The streak Career Path shows: the Rewards streak — +1 for any day with at
 * least one learning activity (finished tasks included), back to 1 after a
 * missed day — so this page, the profile and the header show one number.
 * The count from task completions above is the fallback for when an admin
 * has locked Rewards.
 */
const sharedStreak = async (userId, completedDates) => {
  try {
    const config = await require('../../rewards/services/configService').getConfig();
    if (config.enabled !== false) {
      const s = await require('../../rewards/services/streakService').summary(userId, config);
      if (typeof s?.current === 'number') return s.current;
    }
  } catch (error) {
    console.error('[career] rewards streak unavailable, using task history:', error.message);
  }
  // The dates may be handed over as a function, so a caller only loads them
  // when the fallback is actually needed.
  const dates = typeof completedDates === 'function' ? await completedDates() : completedDates;
  return calculateStreak(dates || []);
};

/**
 * Sweep a student's missed tasks at most once a platform day, for the
 * profile.
 *
 * Opening the profile is a read, and it used to write on every visit. The
 * sweep only has anything to do once a day has ended, so after the first
 * sweep of the day the rest find nothing — the planner's own read of today's
 * plan still sweeps every time, since it builds the day's prompt from the
 * result. Kept in memory: a restart only costs one extra sweep.
 */
const sweptOn = new Map();
const sweepOncePerDay = async (userId) => {
  const key = String(userId);
  const day = toISODate(new Date());
  if (sweptOn.get(key) === day) return;
  await sweepMissedTasks(userId);
  if (sweptOn.size > 50000) sweptOn.clear();
  sweptOn.set(key, day);
};

/**
 * Enough finished-task dates to count a streak from, newest first. Bounded:
 * only read when Rewards is locked, and a streak longer than this many tasks
 * is still told as one this long.
 */
const STREAK_HISTORY_LIMIT = 1000;
const recentCompletionDates = async (userId) =>
  (await Task.find({ userId, status: 'Completed', completedAt: { $ne: null } })
    .sort({ completedAt: -1 })
    .limit(STREAK_HISTORY_LIMIT)
    .select('completedAt')
    .lean()).map((t) => t.completedAt);

// @desc    Everything the profile page shows: goal, progress, streak, misses
// @route   GET /api/profile/summary
// @access  Private
const getProfileSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    // Keep the profile honest: without this, a task missed yesterday still
    // reads as Pending until the student happens to open the planner. Once a
    // day is enough (see sweepOncePerDay).
    await sweepOncePerDay(userId);

    // Titles already back on today's plan. A row stands for one piece of work
    // however many times it was missed, so once "Do it today" has put a copy
    // back the whole row is handled — listing it again would invite a second
    // copy of the same task onto the same day.
    const today = startOfDay();

    // Counted and grouped by the database rather than by loading every task
    // the student has ever had: this ran on every visit, and a student a year
    // in carried hundreds of tasks across the wire to make four numbers.
    const [goal, roadmap, skills, achievements, byStatus, plannedTitles, daysPlanned] = await Promise.all([
      Goal.findOne({ userId }),
      Roadmap.findOne({ userId }),
      SkillProgress.find({ userId }).sort({ skillName: 1 }),
      Achievement.find({ userId }).sort({ createdAt: -1 }).limit(10),
      Task.aggregate([{ $match: { userId } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      Task.distinct('title', { userId, status: 'Pending', assignedDate: { $gte: today } }),
      DailyPlan.countDocuments({ userId })
    ]);

    const count = (status) => byStatus.find((row) => row._id === status)?.n || 0;
    const completed = count('Completed');
    const skipped = count('Skipped');
    const pending = count('Pending');
    const total = byStatus.reduce((sum, row) => sum + row.n, 0);

    // Rate over *decided* tasks only. Counting today's still-open work as failure
    // would make the number sink every morning and recover every evening.
    const decided = completed + skipped;
    const completionRate = decided ? Math.round((completed / decided) * 100) : 0;

    // Group skipped by title so a task missed five times reads as one habit
    // with a count, which is the thing actually worth acting on. The row
    // carries the most recent miss, which is the one "Do it today" moves.
    const skippedTasks = (await Task.aggregate([
      { $match: { userId, status: 'Skipped', title: { $nin: plannedTitles } } },
      { $sort: { skippedAt: -1 } },
      {
        $group: {
          _id: '$title',
          taskId: { $first: '$_id' },
          description: { $first: '$description' },
          category: { $first: '$category' },
          // The skill finishing it would grow (taskCompletionService), for
          // what the mascot says beside this list.
          skill: { $first: '$skill' },
          assignedDate: { $first: '$assignedDate' },
          times: { $sum: 1 },
          lastSkippedAt: { $max: '$skippedAt' }
        }
      },
      { $sort: { times: -1, lastSkippedAt: -1 } },
      { $limit: SKIPPED_LIMIT }
    ])).map((row) => ({
      _id: row.taskId,
      title: row._id,
      description: row.description,
      category: row.category,
      skill: row.skill || null,
      times: row.times,
      lastSkippedAt: row.lastSkippedAt,
      assignedDate: row.assignedDate
    }));

    res.status(200).json({
      goal: goal
        ? {
            educationLevel: goal.educationLevel,
            careerGoal: goal.careerGoal,
            dreamCompany: goal.dreamCompany,
            currentClass: goal.currentClass,
            degree: goal.degree,
            specialization: goal.specialization,
            currentYear: goal.currentYear,
            currentJob: goal.currentJob
          }
        : null,
      currentStage: roadmap?.roadmapData?.currentStage || null,
      stats: {
        completed,
        skipped,
        pending,
        total,
        completionRate,
        streak: await sharedStreak(userId, () => recentCompletionDates(userId)),
        daysPlanned
      },
      skills,
      achievements,
      skippedTasks
    });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Put a skipped task back on today's plan
// @route   POST /api/profile/skipped/:id/redo
// @access  Private
const redoSkippedTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: 'Skipped'
    });
    if (!task) {
      return res.status(404).json({ message: 'Skipped task not found.' });
    }

    // The profile shows a task missed several times as one row, under the id
    // of one of those misses. If that work is already on today's plan (another
    // of its misses was redone, or a second tap raced the first), moving this
    // one too would put the same task on the day twice — so it is answered
    // with the copy already there. The other misses stay Skipped: they did
    // happen, and the skipped count and completion rate keep saying so; the
    // summary simply stops offering the row while it is planned.
    const alreadyPlanned = await Task.findOne({
      userId: req.user._id,
      title: task.title,
      status: 'Pending',
      assignedDate: { $gte: startOfDay() }
    });
    if (alreadyPlanned) {
      return res.status(200).json(alreadyPlanned);
    }

    // Moved to today rather than duplicated, so the history keeps one record of
    // this piece of work instead of one per attempt.
    task.status = 'Pending';
    task.skippedAt = undefined;
    // So clearing today's untouched work (an exam tomorrow, a new time
    // budget) knows this one is the student's history, not a fresh task.
    task.redoneAt = new Date();
    task.assignedDate = startOfDay();
    task.dueDate = addDays(startOfDay(), 1);
    await task.save();

    res.status(200).json(task);
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    The level ladder, and where the student stands on it
// @route   GET /api/profile/levels
// @access  Private
//
// The thresholds are an admin rule (Rewards → Level thresholds), so the
// student app reads them rather than keeping a copy that drifts the first time
// an admin edits the ladder. The rewards summary carries them too, but only
// while Rewards is switched on — XP and levels keep accruing either way, and
// the level ring in Career Path still needs to know how far the next one is.
const getLevels = async (req, res) => {
  try {
    const { getConfig, levelInfo } = require('../../rewards/services/configService');
    const config = await getConfig();
    res.status(200).json({
      thresholds: config.levelThresholds,
      ...levelInfo(Number(req.user.xp) || 0, config.levelThresholds)
    });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = {
  getProfileSummary,
  redoSkippedTask,
  getLevels,
  // todayController counts the streak the same way; without this export it
  // imported undefined and /career/today answered 500 on every page load.
  calculateStreak,
  sharedStreak
};
