const Task = require('../models/Task');
const Goal = require('../models/Goal');
const Roadmap = require('../models/Roadmap');
const SkillProgress = require('../models/SkillProgress');
const DailyPlan = require('../models/DailyPlan');
const Achievement = require('../models/Achievement');
const { startOfDay, addDays, sweepMissedTasks } = require('../services/dailyPlanService');
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
  return calculateStreak(completedDates);
};

// @desc    Everything the profile page shows: goal, progress, streak, misses
// @route   GET /api/profile/summary
// @access  Private
const getProfileSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    // Keep the profile honest: without this, a task missed yesterday still
    // reads as Pending until the student happens to open the planner.
    await sweepMissedTasks(userId);

    const [goal, roadmap, skills, achievements, allTasks, daysPlanned] = await Promise.all([
      Goal.findOne({ userId }),
      Roadmap.findOne({ userId }),
      SkillProgress.find({ userId }).sort({ skillName: 1 }),
      Achievement.find({ userId }).sort({ createdAt: -1 }).limit(10),
      Task.find({ userId }).select('title description category status assignedDate completedAt skippedAt'),
      DailyPlan.countDocuments({ userId })
    ]);

    const completed = allTasks.filter((t) => t.status === 'Completed');
    const skipped = allTasks.filter((t) => t.status === 'Skipped');
    const pending = allTasks.filter((t) => t.status === 'Pending');

    // Titles already back on today's plan. A row stands for one piece of work
    // however many times it was missed, so once "Do it today" has put a copy
    // back the whole row is handled — listing it again would invite a second
    // copy of the same task onto the same day.
    const today = startOfDay();
    const plannedTitles = new Set(
      pending.filter((t) => t.assignedDate && t.assignedDate >= today).map((t) => t.title)
    );

    // Rate over *decided* tasks only. Counting today's still-open work as failure
    // would make the number sink every morning and recover every evening.
    const decided = completed.length + skipped.length;
    const completionRate = decided ? Math.round((completed.length / decided) * 100) : 0;

    // Group skipped by title so a task missed five times reads as one habit
    // with a count, which is the thing actually worth acting on.
    const byTitle = new Map();
    for (const task of skipped) {
      if (plannedTitles.has(task.title)) continue;
      const existing = byTitle.get(task.title);
      if (existing) {
        existing.times += 1;
        if (task.skippedAt > existing.lastSkippedAt) existing.lastSkippedAt = task.skippedAt;
      } else {
        byTitle.set(task.title, {
          _id: task._id,
          title: task.title,
          description: task.description,
          category: task.category,
          times: 1,
          lastSkippedAt: task.skippedAt,
          assignedDate: task.assignedDate
        });
      }
    }

    const skippedTasks = [...byTitle.values()]
      .sort((a, b) => b.times - a.times || new Date(b.lastSkippedAt) - new Date(a.lastSkippedAt))
      .slice(0, SKIPPED_LIMIT);

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
        completed: completed.length,
        skipped: skipped.length,
        pending: pending.length,
        total: allTasks.length,
        completionRate,
        streak: await sharedStreak(userId, completed.map((t) => t.completedAt).filter(Boolean)),
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
