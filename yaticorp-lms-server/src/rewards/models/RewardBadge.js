/**
 * The badge catalogue, editable by administrators. Seeded from
 * config/constants.DEFAULT_BADGES on first use.
 */
const mongoose = require('mongoose');

const METRICS = ['lessons', 'quizzes', 'perfect_quizzes', 'courses', 'certificates', 'xp', 'longest_streak', 'current_streak', 'top10_weeks', 'level'];

const rewardBadgeSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true, match: [/^[a-z0-9_]+$/, 'key must be lowercase letters, digits and underscores'] },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  emoji: { type: String, default: '🎖️' },
  metric: { type: String, enum: METRICS, required: true },
  target: { type: Number, required: true, min: 1 },
  // Reward points paid once, when the badge unlocks. 0 = badge only.
  rewardPoints: { type: Number, default: 0, min: 0 },
  order: { type: Number, default: 100 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

rewardBadgeSchema.statics.METRICS = METRICS;

module.exports = mongoose.model('RewardBadge', rewardBadgeSchema, 'rewards_badges');
