/**
 * Money ledger. Append-only; a mistaken entry is corrected by a reversal row,
 * never edited away, so the history always explains the balance.
 */
const mongoose = require('mongoose');
const crypto = require('crypto');

const SOURCES = [
  'learning_reward',     // reward points from streaks/badges/campaigns, redeemed
  'leaderboard_reward',  // reward points from leaderboard finishes, redeemed
  'referral_reward',
  'job_earning',
  'purchase',            // spent inside the LMS
  'withdrawal',
  'withdrawal_refund',   // a rejected withdrawal returning to available
  'admin_adjustment'
];
const STATUSES = ['pending', 'completed', 'failed', 'cancelled'];

const walletTransactionSchema = new mongoose.Schema({
  // Human-readable id shown on receipts: WTX-<12 hex>.
  txnId: { type: String, required: true, unique: true, default: () => `WTX-${crypto.randomBytes(6).toString('hex').toUpperCase()}` },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  source: { type: String, enum: SOURCES, required: true },
  status: { type: String, enum: STATUSES, default: 'completed' },
  description: { type: String, default: '' },
  // Idempotency: the thing that caused this entry. A retried redemption or a
  // re-run payout job hits the unique index and stops.
  referenceKey: { type: String, default: null },
  balanceAfter: { type: Number, default: null },
  createdBy: { type: String, default: 'system' }, // 'system' | 'user' | admin id
  meta: { type: Object, default: {} }
}, { timestamps: true });

walletTransactionSchema.index({ userId: 1, referenceKey: 1 }, { unique: true, partialFilterExpression: { referenceKey: { $type: 'string' } } });
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ source: 1, status: 1, createdAt: -1 });
walletTransactionSchema.statics.SOURCES = SOURCES;
walletTransactionSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('RewardWalletTransaction', walletTransactionSchema, 'rewards_wallet_transactions');
