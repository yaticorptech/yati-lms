/**
 * The single, admin-edited rulebook for XP, levels, streaks, reward points and
 * the wallet. One document, created on first read (see services/configService).
 *
 * Nothing in the module hardcodes a number that lives here; every award reads
 * the live document, so an administrator changing "7-day streak = 100 points"
 * takes effect on the next milestone without a deploy.
 */
const mongoose = require('mongoose');
const C = require('../config/constants');

const milestoneSchema = new mongoose.Schema({
  days: { type: Number, required: true, min: 1 },
  rewardPoints: { type: Number, default: 0, min: 0 },
  xp: { type: Number, default: 0, min: 0 }
}, { _id: false });

const rankRewardSchema = new mongoose.Schema({
  rank: { type: Number, required: true, min: 1 },
  rewardPoints: { type: Number, default: 0, min: 0 }
}, { _id: false });

const rewardConfigSchema = new mongoose.Schema({
  // XP per activity type. Keys are ACTIVITY_TYPES; unknown keys are ignored.
  xpRules: { type: Map, of: Number, default: () => new Map(Object.entries(C.DEFAULT_XP_RULES)) },
  // Level n begins at levelThresholds[n-1]. Must start at 0 and rise.
  levelThresholds: { type: [Number], default: () => [...C.DEFAULT_LEVEL_THRESHOLDS] },
  streakMilestones: { type: [milestoneSchema], default: () => C.DEFAULT_STREAK_MILESTONES.map((m) => ({ ...m })) },
  leaderboardRewards: {
    weekly: { type: [rankRewardSchema], default: () => C.DEFAULT_LEADERBOARD_REWARDS.weekly.map((r) => ({ ...r })) },
    monthly: { type: [rankRewardSchema], default: () => [] }
  },
  conversion: {
    pointsPerUnit: { type: Number, default: C.DEFAULT_CONVERSION.pointsPerUnit, min: 1 },
    unitValue: { type: Number, default: C.DEFAULT_CONVERSION.unitValue, min: 0 },
    currency: { type: String, default: C.DEFAULT_CONVERSION.currency },
    minRedeemPoints: { type: Number, default: C.DEFAULT_CONVERSION.minRedeemPoints, min: 0 }
  },
  limits: {
    monthlyCashCap: { type: Number, default: C.DEFAULT_LIMITS.monthlyCashCap, min: 0 },
    minWithdrawal: { type: Number, default: C.DEFAULT_LIMITS.minWithdrawal, min: 0 },
    maxWithdrawal: { type: Number, default: C.DEFAULT_LIMITS.maxWithdrawal, min: 0 }
  },
  walletAccess: {
    allowedAccountTypes: { type: [String], enum: C.ACCOUNT_TYPES, default: () => [...C.DEFAULT_WALLET_ACCESS.allowedAccountTypes] }
  }
}, { timestamps: true });

module.exports = mongoose.model('RewardConfig', rewardConfigSchema, 'rewards_config');
