/**
 * Append-only XP ledger. User.xp is the running total; this is where it came
 * from, and what the daily/weekly/monthly leaderboards are summed over.
 */
const mongoose = require('mongoose');

const xpTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true },
  // 'lesson_complete', 'quiz_pass', 'streak', 'career', 'admin', ...
  source: { type: String, required: true },
  refId: { type: String, default: null },
  // Idempotency key. Sparse-unique per user so a retried request cannot pay
  // the same lesson twice, while sources without a natural key pass null.
  key: { type: String, default: null },
  courseId: { type: String, default: null, index: true },
  description: { type: String, default: '' },
  balanceAfter: { type: Number, default: null }
}, { timestamps: true });

xpTransactionSchema.index({ userId: 1, key: 1 }, { unique: true, partialFilterExpression: { key: { $type: 'string' } } });
xpTransactionSchema.index({ createdAt: 1, userId: 1 });

module.exports = mongoose.model('RewardXpTransaction', xpTransactionSchema, 'rewards_xp_transactions');
