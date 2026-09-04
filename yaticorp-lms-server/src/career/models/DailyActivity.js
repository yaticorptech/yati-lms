const mongoose = require('mongoose');

/**
 * Which small activity a student was given on a given day, and how it went.
 *
 * One row per student per day — enforced by the index below, so two tabs
 * opening the dashboard at once cannot hand out two different puzzles and
 * leave the student wondering which was "today's".
 *
 * The row is also the memory that stops repeats: choosing tomorrow's activity
 * means picking one whose id is not already here.
 */
const dailyActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // 'YYYY-MM-DD' in the student's own day, for the same reason CalendarEvent
    // stores one: a Date is an instant and slides across timezones, and "which
    // day was this" must not depend on where the server is running.
    day: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'day must be YYYY-MM-DD']
    },
    activityId: { type: String, required: true },
    band: { type: String, required: true },

    // Null until they answer. An unanswered row still counts as "seen", so a
    // puzzle skipped today is not handed straight back tomorrow.
    answeredAt: { type: Date },
    correct: { type: Boolean },
    chosen: { type: Number }
  },
  { timestamps: true }
);

// One activity per student per day.
dailyActivitySchema.index({ userId: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('CareerDailyActivity', dailyActivitySchema, 'career_daily_activities');
