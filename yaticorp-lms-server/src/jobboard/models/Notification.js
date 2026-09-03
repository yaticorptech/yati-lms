const mongoose = require("mongoose");

/**
 * A job alert for one student — "4 new jobs match your Data Scientist search".
 *
 * Written by the daily alert run (services/alertService.js) and read by the
 * student app's notification bell, which merges this feed with announcements
 * and Career Path notifications. `link` carries the student back to the exact
 * search the alert is about, as /jobs query parameters.
 *
 * Rows expire after 30 days: a job alert is news, and month-old news in the
 * bell is worse than none.
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    link: { type: String, default: "/jobs" },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model("JobBoardNotification", notificationSchema, "jobboard_notifications");
