const mongoose = require('mongoose');

const rewardUserBadgeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  badgeKey: { type: String, required: true },
  unlockedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// A badge is unlocked once. Two concurrent evaluations race to this index and
// exactly one of them wins; the other sees a duplicate-key error and stops.
rewardUserBadgeSchema.index({ userId: 1, badgeKey: 1 }, { unique: true });

module.exports = mongoose.model('RewardUserBadge', rewardUserBadgeSchema, 'rewards_user_badges');
