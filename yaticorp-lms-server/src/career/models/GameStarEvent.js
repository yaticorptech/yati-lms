const mongoose = require('mongoose');

/**
 * One row for every time a student's best on a level went up, and by how
 * many stars. GameProgress holds the totals; this holds when they happened,
 * which is what a "this week" leaderboard needs.
 */
const gameStarEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gameId: { type: String, required: true },
    level: { type: Number, required: true },
    // Stars gained on this level by this improvement, 1…3.
    stars: { type: Number, required: true },
    // True when the level had never been cleared before — the event that
    // counts towards "levels cleared" in a window.
    first: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

gameStarEventSchema.index({ createdAt: 1, userId: 1 });

module.exports = mongoose.model('CareerGameStarEvent', gameStarEventSchema, 'career_game_star_events');
