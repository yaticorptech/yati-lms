/**
 * One row per meaningful learning event, and the reason the same event can
 * never pay twice: the unique index below makes "lesson X completed by user Y"
 * a fact that can be inserted once. Streak, XP and badge logic all run only
 * when this insert succeeds.
 */
const mongoose = require('mongoose');
const { ACTIVITY_TYPES } = require('../config/constants');

const learningActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ACTIVITY_TYPES, required: true },
  // What the activity was about — a lesson id, quiz id, course id or task id.
  // Stored as a string because Course ids are strings while the rest are
  // ObjectIds.
  refId: { type: String, required: true },
  courseId: { type: String, default: null, index: true },
  // 'YYYY-MM-DD' in the platform timezone; the unit the streak counts in.
  day: { type: String, required: true, index: true },
  xpAwarded: { type: Number, default: 0 },
  meta: { type: Object, default: {} }
}, { timestamps: true });

learningActivitySchema.index({ userId: 1, type: 1, refId: 1 }, { unique: true });
learningActivitySchema.index({ userId: 1, day: 1 });

module.exports = mongoose.model('RewardLearningActivity', learningActivitySchema, 'rewards_learning_activities');
