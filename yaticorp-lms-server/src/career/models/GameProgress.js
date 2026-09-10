const mongoose = require('mongoose');

/**
 * How far one student has climbed one brain game, and the stars they earned
 * on the way — the account-side copy of what levels.js keeps in the browser.
 *
 * One document per student per game. The browser is still the source of
 * truth while a level is being played; this is written when a level ends and
 * read when the games hub opens on a new device, so progress follows the
 * account rather than the machine. Merges only ever go up: a replay can never
 * lower a level or a star count, here or in the browser.
 */
const gameProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gameId: { type: String, required: true, trim: true },
    // Highest level reached (the one the student is on now), 1…90.
    level: { type: Number, default: 1, min: 1 },
    // Best stars per level, keyed by level number as a string: { "1": 3, "2": 2 }.
    stars: { type: Map, of: Number, default: {} },
    // Denormalised so the leaderboard is a sort, not a walk over every map.
    starTotal: { type: Number, default: 0 },
    cleared: { type: Number, default: 0 }
  },
  { timestamps: true }
);

gameProgressSchema.index({ userId: 1, gameId: 1 }, { unique: true });
gameProgressSchema.index({ starTotal: -1 });

module.exports = mongoose.model('CareerGameProgress', gameProgressSchema, 'career_game_progress');
