const mongoose = require('mongoose');

/**
 * Seconds of brain-game play per student per day, for the daily limit an
 * admin sets (Rewards → Reward rules → Brain games).
 *
 * Counted on the server from heartbeats the games page sends while a game is
 * open and the tab is visible; each heartbeat is clamped to the real time
 * since the last one, so a page cannot claim more time than passed — or less
 * by simply not reporting, since XP stops being paid once the day is used up.
 */
const gamePlayTimeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // 'YYYY-MM-DD' in the platform timezone.
    day: { type: String, required: true },
    seconds: { type: Number, default: 0 },
    lastBeatAt: { type: Date, default: null }
  },
  { timestamps: true }
);

gamePlayTimeSchema.index({ userId: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('CareerGamePlayTime', gamePlayTimeSchema, 'career_game_play_time');
