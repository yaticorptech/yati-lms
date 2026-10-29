const mongoose = require('mongoose');

/**
 * Seconds of Group games play per student per day (2026-10-29): 30 minutes a day, apart from the solo
 * games' allowance (GamePlayTime). Counted the same way, from heartbeats the game page sends only while a
 * group game is being played and the tab is visible; leaving the game pauses it.
 */
const groupPlayTimeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // 'YYYY-MM-DD' in the platform timezone.
    day: { type: String, required: true },
    seconds: { type: Number, default: 0 },
    lastBeatAt: { type: Date, default: null }
  },
  { timestamps: true }
);

groupPlayTimeSchema.index({ userId: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('CareerGroupPlayTime', groupPlayTimeSchema, 'career_group_play_time');
