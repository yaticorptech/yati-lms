const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String, // e.g., 'system', 'achievement', 'reminder'
      default: 'system'
    },
    isRead: {
      type: Boolean,
      default: false
    },
    /**
     * Which feature release this notification announced, if any. The
     * per-user "already told" marker for featureReleases.js — one
     * notification per (user, key), so a refresh can never repeat one.
     */
    featureKey: {
      type: String,
      index: true
    },
    /** Where the bell should send the student. Relative to the app root. */
    link: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CareerNotification', notificationSchema, 'career_notifications');
