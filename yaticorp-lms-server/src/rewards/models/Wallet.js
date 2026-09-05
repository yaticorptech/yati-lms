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
  rewardPoints: { type: Number, default: 0 },
  rewardPointsEarned: { type: Number, default: 0 },
  rewardPointsRedeemed: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('RewardWallet', walletSchema, 'rewards_wallets');
