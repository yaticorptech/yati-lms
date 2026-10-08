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
  // The Global Quiz: the score (%) that counts as a win (XP rule global_quiz_win).
  globalQuiz: {
    winScore: { type: Number, default: C.DEFAULT_GLOBAL_QUIZ.winScore, min: 0, max: 100 }
  },
  // Brain games: daily play limit and XP by stars (see DEFAULT_GAMES).
  games: {
    dailyMinutes: { type: Number, default: C.DEFAULT_GAMES.dailyMinutes, min: 0 },
    xpOneStar: { type: Number, default: C.DEFAULT_GAMES.xpOneStar, min: 0 },
    xpTwoStars: { type: Number, default: C.DEFAULT_GAMES.xpTwoStars, min: 0 },
    xpThreeStars: { type: Number, default: C.DEFAULT_GAMES.xpThreeStars, min: 0 }
  },
  // Opening balance each student is credited once (spend-only). 0 = none.
  // Changing it affects students who have not been credited yet.
  startingCredit: { type: Number, default: C.DEFAULT_STARTING_CREDIT, min: 0 },
  // Only students who registered on or after this moment get the starting
  // credit. Set automatically the first time a grant is considered, so every
  // account that existed before the credit was introduced is left out.
  startingCreditFrom: { type: Date, default: null },
  // ₹ (or the wallet currency) each feature costs. Keys are WALLET_ACTIONS; 0 = free.
  walletRules: { type: Map, of: Number, default: () => new Map(Object.entries(C.DEFAULT_WALLET_RULES)) },
  // Default rules the admin removed (the rest of a removed rule is simply
  // gone from its map). Kept so a removed default does not come back.
  rulesOff: {
    xp: { type: [String], default: () => [] },
    wallet: { type: [String], default: () => [] }
  },
  walletAccess: {
    allowedAccountTypes: { type: [String], enum: C.ACCOUNT_TYPES, default: () => [...C.DEFAULT_WALLET_ACCESS.allowedAccountTypes] }
  }
}, { timestamps: true });

module.exports = mongoose.model('RewardConfig', rewardConfigSchema, 'rewards_config');
