const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  method: {
    type: { type: String, enum: ['upi', 'bank'], required: true },
    upiId: { type: String, default: '' },
    accountName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifsc: { type: String, default: '' }
  },
  status: { type: String, enum: ['pending', 'approved', 'paid', 'rejected'], default: 'pending', index: true },
  // The debit that put the money on hold; flipped to completed/cancelled when
  // the request is paid or rejected.
  walletTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'RewardWalletTransaction' },
  adminNote: { type: String, default: '' },
  payoutReference: { type: String, default: '' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  processedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('RewardWithdrawalRequest', withdrawalRequestSchema, 'rewards_withdrawal_requests');
