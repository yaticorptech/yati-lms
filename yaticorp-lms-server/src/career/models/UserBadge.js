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

module.exports = mongoose.model('CareerUserBadge', userBadgeSchema, 'career_user_badges');
