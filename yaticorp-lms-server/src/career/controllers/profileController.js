const Task = require('../models/Task');
const Goal = require('../models/Goal');
const Roadmap = require('../models/Roadmap');
const SkillProgress = require('../models/SkillProgress');
const DailyPlan = require('../models/DailyPlan');
const Achievement = require('../models/Achievement');
const { startOfDay, addDays, sweepMissedTasks } = require('../services/dailyPlanService');
const { errorBody: aiAwareBody } = require('../services/aiErrors');

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

    // Rate over *decided* tasks only. Counting today's still-open work as failure
    // would make the number sink every morning and recover every evening.
    const decided = completed.length + skipped.length;
    const completionRate = decided ? Math.round((completed.length / decided) * 100) : 0;

    // Group skipped by title so a task missed five times reads as one habit
    // with a count, which is the thing actually worth acting on.
    const byTitle = new Map();
    for (const task of skipped) {
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
        streak: calculateStreak(completed.map((t) => t.completedAt).filter(Boolean)),
        daysPlanned
      },
      skills,
      achievements,
      skippedTasks
    });
  } catch (error) {
    res.status(error.status || 500).json(aiAwareBody(error));
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

    // Moved to today rather than duplicated, so the history keeps one record of
    // this piece of work instead of one per attempt.
    task.status = 'Pending';
    task.skippedAt = undefined;
    task.assignedDate = startOfDay();
    task.dueDate = addDays(startOfDay(), 1);
    await task.save();

    res.status(200).json(task);
  } catch (error) {
    res.status(error.status || 500).json(aiAwareBody(error));
  }
};

module.exports = {
  getProfileSummary,
  redoSkippedTask
};
