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
  // Lifetime XP that was turned into money before XP stopped converting
  // (2026-10-26). Kept for the record; nothing reads or moves it now.
  xpConverted: { type: Number, default: 0 },
  rewardPoints: { type: Number, default: 0 },
  rewardPointsEarned: { type: Number, default: 0 },
  rewardPointsRedeemed: { type: Number, default: 0 }
}, { timestamps: true });

// Every change to a balance tells that student's open pages (services/walletEvents).
const announce = function announce(doc) {
  const userId = doc?.userId || this.getQuery?.()?.userId;
  require('../services/walletEvents').walletChanged(userId);
};
walletSchema.post('save', announce);
walletSchema.post('findOneAndUpdate', announce);
walletSchema.post('updateOne', announce);
walletSchema.post('updateMany', function announceMany() {
  const q = this.getQuery?.() || {};
  if (q.userId && typeof q.userId !== 'object') require('../services/walletEvents').walletChanged(q.userId);
});

module.exports = mongoose.model('RewardWallet', walletSchema, 'rewards_wallets');
