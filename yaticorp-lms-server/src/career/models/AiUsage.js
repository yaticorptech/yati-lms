const mongoose = require('mongoose');

/**
 * One row per Gemini call Career Path makes.
 *
 * Two jobs. It enforces the per-student daily cap — without a record of what a
 * student has already spent there is nothing to cap against — and it is the
 * only way to answer "how close are we to the free tier today?" before the
 * answer arrives as a wall of failures during a class.
 *
 * Deliberately one row per call rather than a running counter: a counter tells
 * you a number, rows tell you which students, which features and at what time
 * of day, which is what you need to decide whether to raise the cap or the
 * budget.
 */
const aiUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
      // Not required: a call made outside a request (a background rebuild) is
      // still spend, and losing it from the total would make the total a lie.
    },

    // 'YYYY-MM-DD' in server-local time. Stored rather than derived so the cap
    // query is an index hit instead of a date range computed per request.
    day: {
      type: String,
      required: true,
      index: true
    },

    // Which feature spent it: roadmap, tasks, recommendations, mentor, lesson,
    // quiz, video-query. Free-form so a new generator does not need a migration.
    kind: {
      type: String,
      default: 'unknown'
    },

    model: { type: String },

    // Whether the call came back. Failures still count against a student's
    // daily cap — otherwise a broken prompt is an unlimited retry budget — but
    // they are tracked separately because a failed call does not consume the
    // provider's own quota.
    ok: { type: Boolean, default: true },

    // Milliseconds, for spotting a model that has become slow.
    ms: { type: Number }
  },
  { timestamps: true }
);

// The two questions asked on every generation: what has this student spent
// today, and what has everyone spent today.
aiUsageSchema.index({ userId: 1, day: 1 });

module.exports = mongoose.model('CareerAiUsage', aiUsageSchema, 'career_ai_usage');
