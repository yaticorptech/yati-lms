/**
 * Google Jobs part-time results for a place, kept for a few hours. Every
 * fetch is a metered request; a refresh of the page must not be one.
 */
const mongoose = require('mongoose');

const partTimeWebCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  place: { type: Object, default: {} },
  results: { type: [Object], default: [] },
  // Which local trade to ask about next; the broad question runs every time.
  rotation: { type: Number, default: 0 },
  // The wider area the last fetch had to fall back on, if any.
  widened: { type: String, default: '' },
  fetchedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Rows expire on their own after a day; the route treats anything older
// than a few hours as stale and refetches when the budget allows.
partTimeWebCacheSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

module.exports = mongoose.model('JobBoardPartTimeWebCache', partTimeWebCacheSchema, 'jobboard_parttime_web_cache');
