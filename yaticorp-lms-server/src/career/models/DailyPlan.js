const mongoose = require('mongoose');

/**
 * One record per user per day, marking that a plan for that day has been claimed.
 *
 * Exists to stop duplicate generation. Today's tasks are built lazily on the
 * first request of the day, and several requests can arrive at once — React
 * mounting two components, a second browser tab, a refresh mid-generation. Each
 * would otherwise spend a Gemini call and write its own copy of the day's tasks.
 *
 * The unique (userId, date) index makes claiming the day atomic: the first
 * insert wins and generates, the rest fail on duplicate key and simply read
 * what the winner produced.
 */
const dailyPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true
    },
    // Local midnight for the day this plan covers.
    date: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['generating', 'ready', 'failed'],
      default: 'generating'
    },
    // Minutes the student said they had for this particular day. Stored per day
    // rather than only on the user, because "I'm swamped today" is a statement
    // about today, not a permanent change to how much time they have.
    timeBudgetMinutes: {
      type: Number,
      default: 60
    },
    taskCount: {
      type: Number,
      default: 0
    },
    // Kept so a failed day can be explained in the UI rather than looking empty.
    error: String
  },
  {
    timestamps: true
  }
);

dailyPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('CareerDailyPlan', dailyPlanSchema, 'career_daily_plans');
