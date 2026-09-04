/**
 * Where everyone stood the last time the ranking job ran, so the board can
 * show ↑ / ↓ against something real rather than against the previous page load.
 */
const mongoose = require('mongoose');

const leaderboardSnapshotSchema = new mongoose.Schema({
  period: { type: String, enum: ['daily', 'weekly', 'monthly', 'all'], required: true },
  periodKey: { type: String, required: true },
  scope: { type: String, default: 'global' },
  ranks: [{ userId: { type: mongoose.Schema.Types.ObjectId }, rank: Number, xp: Number }],
  takenAt: { type: Date, default: Date.now }
}, { timestamps: true });

leaderboardSnapshotSchema.index({ period: 1, periodKey: 1, scope: 1, takenAt: -1 });

module.exports = mongoose.model('RewardLeaderboardSnapshot', leaderboardSnapshotSchema, 'rewards_leaderboard_snapshots');
