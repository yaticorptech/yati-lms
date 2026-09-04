/**
 * A once-only claim for a scheduled run ("pay out week W:2026-08-24"). The
 * interval fires far more often than the job should run, and a second server
 * instance fires it too; whoever inserts this row first does the work.
 */
const mongoose = require('mongoose');

const rewardJobRunSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  result: { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('RewardJobRun', rewardJobRunSchema, 'rewards_job_runs');
