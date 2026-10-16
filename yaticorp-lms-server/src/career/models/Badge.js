const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true
    },
    description: {
      type: String,
      required: true
    },
    // What the badge took under the ladder at the last sync. Informational
    // only: what earns a badge is worked out when it is checked, from `level`
    // and the admin's current ladder (gamificationService.badgeTargets).
    xpRequired: {
      type: Number,
      default: 0
    },
    // "Reach Level N" badges: the level. Its XP comes from the admin's ladder
    // (Rewards → Level thresholds), so the badge lands the moment the level
    // does, whatever the ladder says.
    level: {
      type: Number
    },
    // Badges earned by doing something rather than by XP: 'first_task' is a
    // Career Path task actually completed.
    rule: {
      type: String
    },
    icon: {
      type: String,
      default: 'Award'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CareerBadge', badgeSchema, 'career_badges');
