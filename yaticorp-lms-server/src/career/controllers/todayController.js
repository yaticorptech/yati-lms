/**
 * @description What the student sees when they come back to the LMS.
 *
 * The dashboard's welcome panel asks one question — "what should I do now?" —
 * and Career Path already knows the answer, because the daily plan is written
 * from the student's own class and goal.
 *
 * READ ONLY, and deliberately so. `GET /api/career/tasks` builds the day's plan
 * when it is missing, which is a Gemini call and several seconds; hanging that
 * off the dashboard would make every first visit of the day slow and would
 * spend a student's daily AI allowance without them asking for anything. This
 * endpoint reports what already exists and, when nothing does, says so and
 * lets the planner — which has the loading states and the budget notices — do
 * the generating.
 */
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const Roadmap = require('../models/Roadmap');
const DailyPlan = require('../models/DailyPlan');
const { startOfDay, addDays } = require('../services/dailyPlanService');
const { calculateStreak } = require('./profileController');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

/** The label a phase shows on the roadmap. */
const phaseTitleOf = (phase, index) => phase?.phase || phase?.title || `Phase ${index + 1}`;

/**
 * How the student describes where they are studying — the words the panel
 * greets them with. "Class 10" is what a school student calls it; a
 * postgraduate says "MCA Computer Science, 2nd Year".
 */
const studyLine = (goal) => {
  if (!goal) return '';
  const bits = [goal.degree, goal.specialization].filter(Boolean).join(' ');
  return [goal.currentClass || bits || goal.currentJob, goal.currentYear]
    .filter(Boolean)
    .join(' · ');
};

// @desc    Today's one thing, for the dashboard welcome panel
// @route   GET /api/career/today
// @access  Private
const getToday = async (req, res) => {
  try {
    const userId = req.user._id;
    const goal = await Goal.findOne({ userId }).lean();

    // No goal means no class and no plan, so there is nothing honest to say.
    // The panel renders nothing rather than inventing an activity.
    if (!goal) return res.status(200).json({ eligible: false });

    const today = startOfDay();
    const [roadmap, plan, todaysTasks, completedDates] = await Promise.all([
      Roadmap.findOne({ userId }).select('roadmapData completedPhases').lean(),
      DailyPlan.findOne({ userId, date: today }).select('status').lean(),
      Task.find({ userId, assignedDate: { $gte: today, $lt: addDays(today, 1) } })
        .select('title description duration learning skill status')
        .lean(),
      Task.find({ userId, status: 'Completed' }).select('completedAt').lean()
    ]);

    const phases = roadmap?.roadmapData?.educationRoadmap || [];
    const done = (roadmap?.completedPhases || []).length;
    const current = phases[Math.min(done, Math.max(phases.length - 1, 0))];

    const pending = todaysTasks.filter((t) => t.status === 'Pending');
    const finished = todaysTasks.filter((t) => t.status === 'Completed');

    /**
     * Whether this student has been here before.
     *
     * A sign-in counter alone gets this wrong: the field was added today, so
     * every existing student reads as brand new on their next visit no matter
     * how long they have been using the site. So the counter is only one of
     * three signals, and any of them is enough — having onboarded on an earlier
     * day, or having ever finished a task, is proof of a previous visit that no
     * counter needs to have witnessed.
     *
     * Decided here rather than in the browser because the evidence lives here.
     */
    const onboardedEarlier = goal.createdAt ? new Date(goal.createdAt) < today : false;
    const returning =
      (req.user.loginCount || 0) > 1 || onboardedEarlier || completedDates.length > 0;

    res.status(200).json({
      eligible: true,
      returning,
      careerGoal: goal.careerGoal || '',
      studyLine: studyLine(goal),
      phase: current ? phaseTitleOf(current, Math.min(done, phases.length - 1)) : '',
      streak: calculateStreak(completedDates.map((t) => t.completedAt).filter(Boolean)),
      // Whether today has been planned at all. False means the student should
      // be sent to the planner to build it, not that anything is wrong.
      planReady: Boolean(plan),
      // The one thing to do next. Null once everything for today is finished —
      // which is a result worth showing, not an empty state.
      task: pending[0] || null,
      doneToday: finished.length,
      totalToday: todaysTasks.length
    });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = { getToday };
