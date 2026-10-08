/**
 * Per-student balances. Every number here is the sum of ledger rows and is
 * only ever moved with $inc alongside a WalletTransaction / RewardTransaction
 * in the same database transaction. Never write these fields directly.
 */
const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  currency: { type: String, default: 'INR' },
  available: { type: Number, default: 0 },
  pending: { type: Number, default: 0 },       // held for withdrawal requests
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  totalWithdrawn: { type: Number, default: 0 },
  // Lifetime credits by source, so the wallet can say "learning ₹50,
  // leaderboard ₹100, jobs ₹300" without summing the ledger each time.
  earnedBySource: { type: Map, of: Number, default: () => new Map() },
  // The part of `available` that may be spent but never withdrawn — what is
  // left of the starting credit. Feature charges use it up first; a
  // withdrawal may only take `available - spendOnly`.
  spendOnly: { type: Number, default: 0 },
  // Lifetime XP already turned into money. The student's XP balance is
  // user.xp - xpConverted; their level and rank keep using user.xp, so a
  // conversion never costs them a level.
  xpConverted: { type: Number, default: 0 },
  rewardPoints: { type: Number, default: 0 },
  rewardPointsEarned: { type: Number, default: 0 },
  rewardPointsRedeemed: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('RewardWallet', walletSchema, 'rewards_wallets');
