/**
 * The student's daily learning streak — stored, not recomputed, so the number
 * on the profile is the number the milestone was paid against.
 */
const mongoose = require('mongoose');

const streakSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  current: { type: Number, default: 0 },
  longest: { type: Number, default: 0 },
  // Last day ('YYYY-MM-DD') with a meaningful activity.
  lastActivityDay: { type: String, default: null },
  // First day of the current run. Part of every milestone claim key, so a
  // 7-day milestone can be earned again by a NEW run but never twice by the
  // same one.
  runStartDay: { type: String, default: null },
  // Recent active days for the calendar, newest last, capped at ~13 months.
  activeDays: { type: [String], default: [] },
  // "<days>:<runStartDay>" for every milestone already paid.
  claimedMilestones: { type: [String], default: [] },
  // Best weekly leaderboard finish, kept here because it is per-student
  // progress rather than a ledger entry. Drives the Top 10 badge.
  bestWeeklyRank: { type: Number, default: null },
  top10Weeks: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('RewardStreak', streakSchema, 'rewards_streaks');
