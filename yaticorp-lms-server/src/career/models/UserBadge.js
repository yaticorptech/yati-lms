const mongoose = require('mongoose');

const userBadgeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    badgeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'CareerBadge'
    }
  },
  {
    timestamps: true
  }
);

// One row per badge per student. Without it two XP awards landing together
// (a task completion and a game score in the same second) could both find no
// row and both insert one, and the badge then showed twice and notified twice.
//
// An existing database holding duplicates will refuse to build this index —
// run `node scripts/dedupeUserBadges.js --apply` first (dry run without the
// flag) to collapse them.
userBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });

module.exports = mongoose.model('CareerUserBadge', userBadgeSchema, 'career_user_badges');
