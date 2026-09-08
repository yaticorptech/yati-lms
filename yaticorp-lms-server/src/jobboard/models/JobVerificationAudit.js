/** One row per verification event. Never an OTP or an Aadhaar number — codes and counts only. */
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: { type: String, required: true, index: true },
    fromState: { type: String, default: '' }, toState: { type: String, default: '' },
    provider: { type: String, default: '' }, ok: { type: Boolean, default: true }, detail: { type: String, default: '' },
    ip: { type: String, default: '' }, userAgent: { type: String, default: '' }
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ userId: 1, createdAt: -1 });
module.exports = mongoose.model('JobVerificationAudit', schema, 'jobboard_job_verification_audit');
