/**
 * @description What an administrator can see about Career Path.
 *
 * Career Path is a student-only feature and stays one — nothing here writes,
 * and no endpoint returns a named student's roadmap, tasks or mentor
 * conversation. What it answers is the two questions an operator actually has:
 * is anyone using this, and what are they aiming for.
 *
 * The second is the valuable one. A hundred students each telling the platform
 * exactly which career they want is the clearest signal available about which
 * course to build next, and until now it sat in a collection nobody could read.
 *
 * Guarded by the LMS's own `protectAdmin`, and living inside the career module
 * rather than in adminRoutes, so the dependency still points career → LMS and
 * never the reverse. See services/lmsContext.js for the same rule applied the
 * other way round.
 */
const Goal = require('../models/Goal');
const Roadmap = require('../models/Roadmap');
const Task = require('../models/Task');
const Chat = require('../models/Chat');
const MilestoneBadge = require('../models/MilestoneBadge');
const AiUsage = require('../models/AiUsage');
const { dayKey, PER_STUDENT, PER_SERVICE } = require('../services/aiQuota');
const { errorBody, statusFor } = require('../services/aiErrors');

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

// @desc    Adoption at a glance
// @route   GET /api/career/admin/overview
// @access  Admin
const getOverview = async (req, res) => {
  try {
    const weekAgo = daysAgo(7);
    const [
      onboarded, roadmaps, tasksTotal, tasksCompleted,
      activeThisWeek, mentorUsers, badges
    ] = await Promise.all([
      Goal.countDocuments(),
      Roadmap.countDocuments(),
      Task.countDocuments(),
      Task.countDocuments({ status: 'Completed' }),
      // "Active" means finished something, not merely opened the page — a
      // login count would flatter the number without meaning anything.
      Task.distinct('userId', { completedAt: { $gte: weekAgo } }),
      Chat.distinct('userId'),
      MilestoneBadge.countDocuments()
    ]);

    res.status(200).json({
      onboarded,
      roadmaps,
      tasks: { total: tasksTotal, completed: tasksCompleted },
      activeThisWeek: activeThisWeek.length,
      mentorUsers: mentorUsers.length,
      milestoneBadges: badges
    });
  } catch (error) {
    res.status(statusFor(error)).json(errorBody(error));
  }
};

// @desc    What students are aiming for — the course-planning signal
// @route   GET /api/career/admin/goals
// @access  Admin
const getGoalBreakdown = async (req, res) => {
  try {
    const [careers, levels, specialisations, states] = await Promise.all([
      Goal.aggregate([
        { $match: { careerGoal: { $nin: [null, ''] } } },
        // Grouped case-insensitively: students type these by hand, so "data
        // scientist" and "Data Scientist" are one career, not two.
        { $group: { _id: { $toLower: '$careerGoal' }, count: { $sum: 1 }, label: { $first: '$careerGoal' } } },
        { $sort: { count: -1 } },
        { $limit: 25 }
      ]),
      Goal.aggregate([
        { $match: { educationLevel: { $nin: [null, ''] } } },
        { $group: { _id: '$educationLevel', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Goal.aggregate([
        { $match: { specialization: { $nin: [null, ''] } } },
        { $group: { _id: { $toLower: '$specialization' }, count: { $sum: 1 }, label: { $first: '$specialization' } } },
        { $sort: { count: -1 } },
        { $limit: 15 }
      ]),
      Goal.aggregate([
        { $match: { state: { $nin: [null, ''] } } },
        { $group: { _id: '$state', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 }
      ])
    ]);

    const shape = (rows) => rows.map((r) => ({ name: r.label || r._id, count: r.count }));
    res.status(200).json({
      careers: shape(careers),
      educationLevels: shape(levels),
      specialisations: shape(specialisations),
      states: shape(states)
    });
  } catch (error) {
    res.status(statusFor(error)).json(errorBody(error));
  }
};

// @desc    Gemini spend, so the free tier is not discovered by running out
// @route   GET /api/career/admin/ai-usage
// @access  Admin
const getAiUsage = async (req, res) => {
  try {
    const today = dayKey();
    const since = daysAgo(13);

    const [todayTotal, todayFailed, byKind, byDay, topSpenders, cappedToday] = await Promise.all([
      AiUsage.countDocuments({ day: today }),
      AiUsage.countDocuments({ day: today, ok: false }),
      AiUsage.aggregate([
        { $match: { day: today } },
        { $group: { _id: '$kind', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AiUsage.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$day', count: { $sum: 1 }, failed: { $sum: { $cond: ['$ok', 0, 1] } } } },
        { $sort: { _id: 1 } }
      ]),
      AiUsage.aggregate([
        { $match: { day: today, userId: { $ne: null } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $project: {
          count: 1,
          name: { $ifNull: [{ $first: '$user.name' }, 'Unknown'] },
          cardNumber: { $ifNull: [{ $first: '$user.cardNumber' }, ''] }
        } }
      ]),
      // Students who have hit their personal cap today. The number that says
      // whether the cap is set too low.
      AiUsage.aggregate([
        { $match: { day: today, userId: { $ne: null } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $match: { count: { $gte: PER_STUDENT } } },
        { $count: 'n' }
      ])
    ]);

    res.status(200).json({
      today: { total: todayTotal, failed: todayFailed },
      byKind: byKind.map((r) => ({ kind: r._id || 'unknown', count: r.count })),
      byDay: byDay.map((r) => ({ day: r._id, count: r.count, failed: r.failed })),
      topSpenders: topSpenders.map((r) => ({ name: r.name, cardNumber: r.cardNumber, count: r.count })),
      studentsAtCap: cappedToday[0]?.n || 0,
      limits: { perStudent: PER_STUDENT, perService: PER_SERVICE || null }
    });
  } catch (error) {
    res.status(statusFor(error)).json(errorBody(error));
  }
};

module.exports = { getOverview, getGoalBreakdown, getAiUsage };
