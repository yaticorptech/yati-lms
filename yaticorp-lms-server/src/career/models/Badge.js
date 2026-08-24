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
    xpRequired: {
      type: Number,
      default: 0
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
