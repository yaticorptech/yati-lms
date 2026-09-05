/**
 * Reward-point ledger. Points are the redeemable currency, separate from XP.
 *
 * `claimKey` is what stops a reward being paid twice: every milestone,
 * badge, leaderboard finish or promotion names itself, and the unique index
 * refuses a second row with the same name for the same student.
 */
const mongoose = require('mongoose');

const SOURCES = ['streak_milestone', 'badge', 'leaderboard', 'referral', 'admin', 'campaign', 'redeem', 'reversal'];

const rewardTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  points: { type: Number, required: true },            // + earned, - redeemed
  source: { type: String, enum: SOURCES, required: true },
  claimKey: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['completed', 'reversed'], default: 'completed' },
  balanceAfter: { type: Number, default: null },
  // For earned rows: how many of these points have since been redeemed. Lets
  // a redemption say which source its money came from (oldest points first).
  redeemedPoints: { type: Number, default: 0 },
  meta: { type: Object, default: {} }
}, { timestamps: true });

rewardTransactionSchema.index({ userId: 1, claimKey: 1 }, { unique: true });
rewardTransactionSchema.index({ userId: 1, createdAt: 1 });
rewardTransactionSchema.statics.SOURCES = SOURCES;

module.exports = mongoose.model('RewardTransaction', rewardTransactionSchema, 'rewards_reward_transactions');
