/**
 * Something worth celebrating that happened to a student — a milestone, a
 * badge, a level, a payout — queued until the app has shown it. Rewards paid
 * by a background job (a leaderboard week closing) land here too, so the
 * celebration is not lost because nobody was looking at the time.
 */
const mongoose = require('mongoose');

const rewardEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['xp', 'level_up', 'streak_milestone', 'badge', 'reward_points', 'leaderboard_reward', 'wallet'], required: true },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  payload: { type: Object, default: {} },
  seenAt: { type: Date, default: null }
}, { timestamps: true });

rewardEventSchema.index({ userId: 1, seenAt: 1, createdAt: -1 });

module.exports = mongoose.model('RewardEvent', rewardEventSchema, 'rewards_events');
